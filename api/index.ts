import express from "express";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import Stripe from "stripe";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// ── Firebase Admin (fault-tolerant) ──────────────────────────────────────────
let dbAdmin: ReturnType<typeof getFirestore> | null = null;
try {
  if (!getApps().length) {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      initializeApp();
    }
  }
  dbAdmin = getFirestore();
} catch (e: any) {
  console.error('[FIREBASE ADMIN] Init failed:', e.message);
}

// ── Stripe (lazy) ────────────────────────────────────────────────────────────
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt");
    stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
  }
  return stripe;
};

function normaliseRole(planId: string): string {
  if (planId === 'ultimate') return 'unlimited';
  return planId;
}

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan("dev"));
app.use(cors());

// ── Stripe Webhook (raw body) ─────────────────────────────────────────────────
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return res.status(400).send("Webhook Error: Missing signature or secret");
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const planId = session.metadata?.planId;
    if (userId && planId && dbAdmin) {
      try {
        await dbAdmin.collection("users").doc(userId).update({
          role: normaliseRole(planId),
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[WEBHOOK] Role updated to ${normaliseRole(planId)} for ${userId}`);
      } catch (err) {
        console.error(`[WEBHOOK] Firestore update failed:`, err);
      }
    }
  }
  res.json({ received: true });
});

app.use(express.json());

// ── Gemini Chat ───────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, userContent, systemInstruction, model } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY fehlt" });
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = messages?.length
      ? [...messages, { role: "user", parts: [{ text: userContent }] }]
      : [{ role: "user", parts: [{ text: userContent }] }];
    const response = await ai.models.generateContent({
      model: model || "gemini-2.0-flash",
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("[CHAT ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

// ── Gemini Tool ───────────────────────────────────────────────────────────────
app.post("/api/process-tool", async (req, res) => {
  const { prompt, model, useSearch, language } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY fehlt" });

  const langInstructions: Record<string, string> = {
    DE: "Du bist ein Schweizer Karriere-Experte. Antworte auf Schweizer Hochdeutsch (kein ß). Antworte präzise und professionell.",
    FR: "Tu es un expert en carrière suisse. Réponds en français suisse. Sois précis et professionnel.",
    IT: "Sei un esperto di carriera svizzero. Rispondi in italiano svizzero. Sii preciso e professionale.",
    EN: "You are a Swiss career expert. Respond in English. Be precise and professional.",
  };
  const systemInstruction = langInstructions[language] || langInstructions.DE;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model || "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
        tools: useSearch ? [{ googleSearch: {} }] : undefined
      }
    });
    let sources: string[] = [];
    if (useSearch) {
      const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      sources = chunks.filter((c: any) => c.web?.uri).map((c: any) => `[${c.web.title || c.web.uri}](${c.web.uri})`);
    }
    res.json({ text: response.text, sources });
  } catch (error: any) {
    console.error("[TOOL ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

// ── Live Job Search ───────────────────────────────────────────────────────────
app.get("/api/jobs", async (req, res) => {
  const { keyword = '', location = '', category = '', page = '1' } = req.query as Record<string, string>;
  const adzunaAppId  = process.env.ADZUNA_APP_ID;
  const adzunaAppKey = process.env.ADZUNA_APP_KEY;

  if (adzunaAppId && adzunaAppKey) {
    try {
      const categoryMap: Record<string, string> = {
        IT: 'it-jobs', Marketing: 'marketing-jobs', Finance: 'finance-jobs',
        Banking: 'finance-jobs', Engineering: 'engineering-jobs',
        HR: 'hr-jobs', Healthcare: 'healthcare-nursing-jobs',
        Pharma: 'scientific-qa-jobs', Logistik: 'logistics-warehouse-jobs',
      };
      const params = new URLSearchParams({
        app_id: adzunaAppId,
        app_key: adzunaAppKey,
        results_per_page: '12',
        content_type: 'application/json',
      });
      if (keyword)  params.set('what', keyword);
      if (location) params.set('where', location);
      const catSlug = category ? categoryMap[category] : '';
      const catPath = catSlug ? `/${catSlug}` : '';
      const url = `https://api.adzuna.com/v1/api/jobs/ch/search/${page}${catPath}?${params}`;
      const adzRes = await fetch(url);
      if (!adzRes.ok) throw new Error(`Adzuna HTTP ${adzRes.status}`);
      const adzData = await adzRes.json() as any;
      const jobs = (adzData.results || []).map((r: any) => ({
        id: r.id, title: r.title,
        company: r.company?.display_name || 'Unbekannte Firma',
        location: r.location?.display_name || 'Schweiz',
        category: r.category?.label?.replace(' Jobs', '') || category || 'Sonstiges',
        description: r.description?.replace(/<[^>]*>/g, '').slice(0, 220) + '…' || '',
        url: r.redirect_url,
        ats_keywords: (r.description || '').match(/\b[A-Z][a-zA-Z+#.]{2,}\b/g)?.slice(0, 5) || [],
        salary_min: r.salary_min, salary_max: r.salary_max,
      }));
      return res.json({ jobs, live: true, source: 'adzuna', total: adzData.count || jobs.length });
    } catch (err: any) {
      console.error('[ADZUNA ERROR]', err.message);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: "Keine Job-API konfiguriert" });
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `Suche nach aktuellen Stellenangeboten in der Schweiz. Suchbegriff: ${keyword || 'alle Berufe'}, Branche: ${category || 'alle'}, Ort: ${location || 'ganze Schweiz'}. Gib exakt 10 echte aktuelle Stellenangebote zurück als reines JSON-Array ohne Markdown. Felder: id, title, company, location, category, description (2 Sätze), url (echter Link), ats_keywords (3 strings).`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
    });
    const jsonMatch = (response.text || '').match(/\[[\s\S]*\]/);
    if (jsonMatch) return res.json({ jobs: JSON.parse(jsonMatch[0]), live: true, source: 'gemini' });
    return res.json({ jobs: [], live: true, source: 'gemini' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Stripe Debug ──────────────────────────────────────────────────────────────
app.get("/api/stripe-debug", async (_req, res) => {
  const key = process.env.STRIPE_SECRET_KEY || '';
  const mode = key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : 'missing';
  const prices = {
    pro_monthly:      process.env.STRIPE_PRICE_PRO_MONTHLY      || '(hardcoded) price_1TIrQNHEswF7knZxM65zPbFJ',
    pro_yearly:       process.env.STRIPE_PRICE_PRO_YEARLY       || '(hardcoded) price_1TIrRqHEswF7knZxlkJaQa2H',
    ultimate_monthly: process.env.STRIPE_PRICE_ULTIMATE_MONTHLY || '(hardcoded) price_1TIrSSHEswF7knZxcHQnDDGt',
    ultimate_yearly:  process.env.STRIPE_PRICE_ULTIMATE_YEARLY  || '(hardcoded) price_1TIrT7HEswF7knZxSTFWGFB2',
  };
  let stripeStatus = 'not tested';
  let stripeError = null;
  if (mode !== 'missing') {
    try {
      const s = getStripe();
      const firstPrice = Object.values(prices)[0].replace('(hardcoded) ', '');
      await s.prices.retrieve(firstPrice);
      stripeStatus = 'ok';
    } catch (e: any) {
      stripeStatus = 'error';
      stripeError = e.message;
    }
  }
  res.json({
    mode, prices, stripeStatus, stripeError,
    firebaseAdmin: dbAdmin ? 'initialized' : 'not initialized',
  });
});

// ── Stripe Checkout ───────────────────────────────────────────────────────────
app.post("/api/create-checkout-session", async (req, res) => {
  const { planId, billingCycle, userId, successUrl, cancelUrl } = req.body;
  if (!planId || !userId || !billingCycle) {
    return res.status(400).json({ error: "Missing planId, userId or billingCycle" });
  }
  try {
    const stripeClient = getStripe();
    const priceMap: Record<string, string | undefined> = {
      'pro_monthly':      process.env.STRIPE_PRICE_PRO_MONTHLY      || 'price_1TIrQNHEswF7knZxM65zPbFJ',
      'pro_yearly':       process.env.STRIPE_PRICE_PRO_YEARLY       || 'price_1TIrRqHEswF7knZxlkJaQa2H',
      'ultimate_monthly': process.env.STRIPE_PRICE_ULTIMATE_MONTHLY || 'price_1TIrSSHEswF7knZxcHQnDDGt',
      'ultimate_yearly':  process.env.STRIPE_PRICE_ULTIMATE_YEARLY  || 'price_1TIrT7HEswF7knZxSTFWGFB2',
    };
    const priceKey = `${planId}_${billingCycle}`;
    const priceId  = priceMap[priceKey];
    if (!priceId) {
      return res.status(400).json({ error: `Kein Preis für ${priceKey} konfiguriert` });
    }
    const key = process.env.STRIPE_SECRET_KEY || '';
    console.log(`[STRIPE] Mode: ${key.startsWith('sk_live_') ? 'LIVE' : 'TEST'}, Plan: ${priceKey}, Price: ${priceId}`);
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      metadata: { planId, billingCycle },
      success_url: successUrl || `${req.headers.origin}?payment=success`,
      cancel_url:  cancelUrl  || `${req.headers.origin}?payment=cancel`,
    });
    res.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error(`[STRIPE] ${err.message}`);
    const hint = err.message?.includes('test mode')
      ? 'Live-Key verwendet, aber Preis-IDs sind im Test-Modus erstellt. Bitte Live-Preise in Stripe erstellen und Env-Variablen in Vercel setzen.'
      : err.message?.includes('live mode')
      ? 'Test-Key verwendet, aber Preis-IDs sind im Live-Modus. Bitte Keys angleichen.'
      : err.message;
    res.status(500).json({ success: false, error: hint });
  }
});

// ── Simulate payment (test) ───────────────────────────────────────────────────
app.post("/api/test/simulate-success", async (req, res) => {
  const { userId, planId } = req.body;
  if (!userId) return res.status(400).json({ error: "No userId" });
  if (!dbAdmin) return res.status(503).json({ error: "Firebase Admin nicht konfiguriert" });
  try {
    await dbAdmin.collection("users").doc(userId).update({
      role: normaliseRole(planId),
      updatedAt: FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: `Role gesetzt auf '${normaliseRole(planId)}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── LinkedIn OAuth ────────────────────────────────────────────────────────────
app.get("/api/auth/linkedin/url", (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const origin = req.headers.origin || 'http://localhost:3000';
  if (!clientId) return res.status(500).json({ error: "LINKEDIN_CLIENT_ID fehlt" });
  const params = new URLSearchParams({
    response_type: "code", client_id: clientId,
    redirect_uri: `${origin}/api/auth/linkedin/callback`,
    state: "state", scope: "openid profile email",
  });
  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params}` });
});

app.get("/api/auth/linkedin/callback", async (req, res) => {
  const { code, error, error_description } = req.query;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const origin = req.headers.origin || 'http://localhost:3000';
  if (error) return res.status(400).send(`LinkedIn Error: ${error_description || error}`);
  if (!code) return res.status(400).send("No code");
  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code", code: code as string,
        client_id: clientId!, client_secret: clientSecret!,
        redirect_uri: `${origin}/api/auth/linkedin/callback`,
      }),
    });
    const { access_token } = await tokenRes.json();
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profileData = await profileRes.json();
    res.send(`<html><body><script>window.opener?.postMessage({type:'OAUTH_AUTH_SUCCESS',provider:'linkedin',profile:${JSON.stringify(profileData)}},'*');setTimeout(()=>window.close(),2000);</script><p>Verbunden! Fenster schliesst sich...</p></body></html>`);
  } catch (err: any) {
    res.status(500).send(`Auth failed: ${err.message}`);
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: "Interner Serverfehler" });
});

// ── Export for Vercel ─────────────────────────────────────────────────────────
export default app;
