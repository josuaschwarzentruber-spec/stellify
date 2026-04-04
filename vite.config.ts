import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}
const dbAdmin = getFirestore();

// Lazy initialization of Stripe
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is missing");
    stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" as any });
  }
  return stripe;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- MIDDLEWARE ---
  // Security headers (relaxed for development/iframe compatibility)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  
  // Request logging
  app.use(morgan("dev"));
  
  app.use(cors());
  
  // Use raw body for Stripe webhooks
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("[WEBHOOK] Missing signature or webhook secret");
      return res.status(400).send("Webhook Error: Missing signature or secret");
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const planId = session.metadata?.planId;

      if (userId && planId) {
        console.log(`[WEBHOOK] Payment successful for User: ${userId}, Plan: ${planId}`);
        try {
          await dbAdmin.collection("users").doc(userId).update({
            role: planId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[WEBHOOK] User role updated to ${planId}`);
        } catch (err) {
          console.error(`[WEBHOOK] Error updating user role: ${err}`);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // --- API ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Stellify Backend is running",
      timestamp: new Date().toISOString()
    });
  });

  // Mock CV Analysis Route
  app.post("/api/analyze-cv", (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const wordCount = text.split(/\s+/).length;
    const hasSwissKeywords = /schweiz|suisse|svizzera|ch|zürich|genf|bern|basel/i.test(text);
    
    res.json({
      success: true,
      metadata: {
        wordCount,
        hasSwissKeywords,
        analyzedAt: new Date().toISOString(),
        qualityScore: Math.floor(Math.random() * 40) + 60
      }
    });
  });

  // Mock Career Roadmap Route
  app.post("/api/generate-roadmap", (req, res) => {
    const { profile } = req.body;
    
    const roadmap = [
      "Profil-Optimierung für Schweizer ATS-Systeme",
      "Identifikation von Ziel-Unternehmen im Raum " + (profile?.location || "Zürich"),
      "Anpassung der Projekt-Beschreibungen auf Impact-Metriken",
      "Vorbereitung auf Schweizer Interview-Standards",
      "Netzwerk-Strategie für den verdeckten Stellenmarkt"
    ];

    res.json({
      success: true,
      roadmap,
      estimatedTime: "2-4 Wochen"
    });
  });

  // --- STRIPE PAYMENT ENDPOINT ---
  app.post("/api/create-checkout-session", async (req, res) => {
    const { planId, userId } = req.body;
    
    if (!planId || !userId) {
      return res.status(400).json({ error: "Missing planId or userId" });
    }

    try {
      const stripeClient = getStripe();
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      
      // Map planId to price IDs (these should be in .env in a real app)
      const priceMap: Record<string, string> = {
        'pro': process.env.STRIPE_PRICE_PRO || 'price_placeholder_pro',
        'ultimate': process.env.STRIPE_PRICE_ULTIMATE || 'price_placeholder_ultimate'
      };

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceMap[planId],
            quantity: 1,
          },
        ],
        mode: 'subscription',
        client_reference_id: userId,
        metadata: {
          planId: planId
        },
        success_url: `${appUrl}?session_id={CHECKOUT_SESSION_ID}&payment=success`,
        cancel_url: `${appUrl}?payment=cancel`,
      });

      res.json({
        success: true,
        checkoutUrl: session.url,
        message: "Stripe-Session erstellt."
      });
    } catch (err: any) {
      console.error(`[STRIPE] Error creating session: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- TEST/DEBUG ENDPOINT: SIMULATE SUCCESSFUL PAYMENT ---
  // In a real app, this would be triggered by a Stripe Webhook
  app.post("/api/test/simulate-success", async (req, res) => {
    const { userId, planId } = req.body;
    
    if (!userId) return res.status(400).json({ error: "No userId provided" });

    console.log(`[TEST] Simulating successful payment for User: ${userId}, New Plan: ${planId}`);
    
    try {
      await dbAdmin.collection("users").doc(userId).update({
        role: planId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        success: true,
        message: `Erfolg simuliert! Dein Account wurde im Backend als '${planId}' markiert.`,
        instruction: "Bitte lade die Seite neu, um die Änderungen zu sehen."
      });
    } catch (err: any) {
      console.error(`[TEST] Error simulating success: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- GLOBAL ERROR HANDLER ---
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[ERROR] ${err.stack}`);
    res.status(500).json({
      success: false,
      error: "Interner Server-Fehler",
      message: process.env.NODE_ENV === "development" ? err.message : "Etwas ist schiefgelaufen."
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`
    --------------------------------------------------
    STELLIFY - KI-Karriere-Copilot (PRO)
    Server läuft auf: http://localhost:${PORT}
    Modus: ${process.env.NODE_ENV || 'development'}
    Sicherheit: Helmet aktiv
    Logging: Morgan aktiv
    --------------------------------------------------
    `);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} ist bereits belegt. Bitte beende den Prozess oder verwende einen anderen Port.`);
    } else {
      console.error(`[ERROR] Server-Fehler: ${err.message}`);
    }
  });
}

startServer().catch((err) => {
  console.error("Fehler beim Starten des Servers:", err);
});
