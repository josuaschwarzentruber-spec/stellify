import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}
const dbAdmin = getFirestore();

function normaliseRole(planId: string): string {
  if (planId === 'ultimate') return 'unlimited';
  return planId;
}

// Lazy initialization of Stripe
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is missing");
    stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
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
            role: normaliseRole(planId),
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log(`[WEBHOOK] User role updated to ${normaliseRole(planId)}`);
        } catch (err) {
          console.error(`[WEBHOOK] Error updating user role: ${err}`);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // --- GEMINI PROXY ---
  app.post("/api/chat", async (req, res) => {
    const { messages, userContent, systemInstruction, model } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing on server" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Build contents with history if provided
      const contents = (messages && messages.length > 0)
        ? [...messages, { role: "user", parts: [{ text: userContent }] }]
        : [{ role: "user", parts: [{ text: userContent }] }];

      const response = await ai.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[GEMINI CHAT ERROR]", error);
      res.status(500).json({ error: error.message || "Stella is currently busy" });
    }
  });

  app.post("/api/process-tool", async (req, res) => {
    const { prompt, model, useSearch } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing on server" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "Du bist ein Schweizer Karriere-Experte. Nutze Schweizer Hochdeutsch (kein ß). Antworte präzise und professionell.",
          temperature: 0.4,
          tools: useSearch ? [{ googleSearch: {} }] : undefined
        }
      });

      // Extract grounding sources if search was used
      let sources: string[] = [];
      if (useSearch) {
        const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        sources = chunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => `[${c.web.title || c.web.uri}](${c.web.uri})`);
      }

      res.json({ text: response.text, sources });
    } catch (error: any) {
      console.error("[GEMINI TOOL ERROR]", error);
      res.status(500).json({ error: error.message || "Tool processing failed" });
    }
  });

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
    const { planId, billingCycle, userId, successUrl, cancelUrl } = req.body;

    if (!planId || !userId || !billingCycle) {
      return res.status(400).json({ error: "Missing planId, userId or billingCycle" });
    }

    try {
      const stripeClient = getStripe();
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      // Map planId and billingCycle to price IDs
      // Hardcoded fallbacks for Ultimate; Pro requires env vars
      const priceMap: Record<string, string | undefined> = {
        'pro_monthly': process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_1TIrQNHEswF7knZxM65zPbFJ',
        'pro_yearly': process.env.STRIPE_PRICE_PRO_YEARLY || 'price_1TIrRqHEswF7knZxlkJaQa2H',
        'ultimate_monthly': process.env.STRIPE_PRICE_ULTIMATE_MONTHLY || 'price_1TIrSSHEswF7knZxcHQnDDGt',
        'ultimate_yearly': process.env.STRIPE_PRICE_ULTIMATE_YEARLY || 'price_1TIrT7HEswF7knZxSTFWGFB2'
      };

      const priceKey = `${planId}_${billingCycle}`;
      const priceId = priceMap[priceKey];

      if (!priceId) {
        console.error(`[STRIPE] No Price ID found for ${priceKey}`);
        return res.status(400).json({
          success: false,
          error: `Stripe-Konfiguration fehlt: Bitte setze die Umgebungsvariable STRIPE_PRICE_${planId.toUpperCase()}_${billingCycle.toUpperCase()} in Vercel.`
        });
      }

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        client_reference_id: userId,
        metadata: { planId, billingCycle },
        success_url: successUrl || `${appUrl}?session_id={CHECKOUT_SESSION_ID}&payment=success`,
        cancel_url: cancelUrl || `${appUrl}?payment=cancel`,
      });

      res.json({ success: true, url: session.url });
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
        role: normaliseRole(planId),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      res.json({
        success: true,
        message: `Erfolg simuliert! Dein Account wurde im Backend als '${normaliseRole(planId)}' markiert.`,
        instruction: "Bitte lade die Seite neu, um die Änderungen zu sehen."
      });
    } catch (err: any) {
      console.error(`[TEST] Error simulating success: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- LINKEDIN OAUTH ---
  app.get("/api/auth/linkedin/url", (req, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

    if (!clientId) {
      return res.status(500).json({ error: "LINKEDIN_CLIENT_ID is missing" });
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: "random_state_string", // In production, use a secure random string and verify it
      scope: "openid profile email",
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get("/api/auth/linkedin/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

    if (error) {
      return res.status(400).send(`LinkedIn Auth Error: ${error_description || error}`);
    }

    if (!code) {
      return res.status(400).send("No authorization code provided");
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token exchange failed: ${JSON.stringify(errorData)}`);
      }

      const { access_token } = await tokenResponse.json();

      // 2. Fetch user profile data
      const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to fetch LinkedIn profile");
      }

      const profileData = await profileResponse.json();

      // 3. Send success message and data back to the opener window
      // In a real app, you might save this to the user's document in Firestore
      res.send(`
        <html>
          <head>
            <title>LinkedIn Auth Success</title>
            <style>
              body { font-family: sans-serif; display: flex; flex-direction: column; items-center; justify-content: center; height: 100vh; margin: 0; background: #f3f2ef; }
              .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
              h1 { color: #004225; margin-top: 0; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Erfolgreich verbunden!</h1>
              <p>Dein LinkedIn-Profil wurde verknüpft. Dieses Fenster schliesst sich gleich...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'linkedin',
                  profile: ${JSON.stringify(profileData)}
                }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error(`[LINKEDIN] Auth error: ${err.message}`);
      res.status(500).send(`Authentication failed: ${err.message}`);
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

  return app;
}

const appPromise = startServer();

export default async (req: Request, res: Response) => {
  const app = await appPromise;
  return app(req, res);
};
