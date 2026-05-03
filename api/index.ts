import express from "express";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

dotenv.config();

// ── Firebase Admin ────────────────────────────────────────────────────────────
function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

function getAdminServices() {
  ensureFirebaseAdmin();
  // Allow targeting a non-default Firestore database (e.g. when Firebase
  // creates an "ai-studio-<id>" database instead of "(default)").
  const dbId = process.env.FIREBASE_DATABASE_ID;
  return {
    adminAuth: getAdminAuth(),
    adminDb: dbId ? getFirestore(dbId) : getFirestore(),
    adminStorage: getStorage(),
  };
}

// ── Stripe (lazy) ────────────────────────────────────────────────────────────
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });
  }
  return stripe;
};

function normaliseRole(planId: string): string {
  if (planId === 'ultimate') return 'unlimited';
  return planId;
}

// ── Email Helper ──────────────────────────────────────────────────────────────
function buildEmailHtml(title: string, bodyLines: string[], ctaText: string, ctaUrl: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FDFCFB;border:1px solid #E8E6E0;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#004225;padding:28px 40px;">
            <span style="font-family:Georgia,serif;font-size:24px;color:#FDFCFB;letter-spacing:-0.5px;">Stell<span style="color:#6FCF97;">ify</span></span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1A1A18;line-height:1.3;">${title}</h1>
            ${bodyLines.map(l => `<p style="margin:0 0 16px;font-size:15px;color:#4A4A45;line-height:1.6;">${l}</p>`).join('')}
            <div style="margin:32px 0;">
              <a href="${ctaUrl}" style="display:inline-block;background:#004225;color:#FDFCFB;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;letter-spacing:0.3px;">${ctaText}</a>
            </div>
            <p style="margin:0;font-size:13px;color:#9A9A94;">Bei Fragen erreichst du uns unter <a href="mailto:support.stellify@gmail.com" style="color:#004225;">support.stellify@gmail.com</a></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #E8E6E0;">
            <p style="margin:0;font-size:12px;color:#9A9A94;">© ${new Date().getFullYear()} Stellify · Zug, Schweiz · <a href="https://stellify.ch" style="color:#9A9A94;">stellify.ch</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendRenewalReminder(to: string, firstName: string, planType: 'monthly' | 'annual', daysLeft: number) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.warn('[EMAIL] EMAIL_USER / EMAIL_PASS not set — skipping email.');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  });
  const isAnnual = planType === 'annual';
  const cycleLabel = isAnnual ? 'Jahres' : 'Monats';
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';

  let subject: string;
  let title: string;
  let bodyLines: string[];
  let ctaText: string;

  if (daysLeft > 0) {
    subject = `Dein Stellify-Abo läuft in ${daysLeft} Tag${daysLeft === 1 ? '' : 'en'} ab`;
    title = `Dein ${cycleLabel}sabo läuft bald ab`;
    bodyLines = [
      `Hallo ${firstName},`,
      `dein ${cycleLabel}s-Abonnement bei Stellify läuft in <strong>${daysLeft} Tag${daysLeft === 1 ? '' : 'en'}</strong> ab. Danach wird dein Konto automatisch auf den kostenlosen Plan umgestellt — ohne dass du etwas tun musst.`,
      `Möchtest du weiterhin alle Funktionen nutzen? Verlängere jetzt einfach dein Abonnement — dein Zugang verlängert sich nahtlos um einen weiteren ${isAnnual ? 'Jahr' : 'Monat'}.`,
    ];
    ctaText = 'Jetzt verlängern';
  } else {
    subject = 'Dein Stellify-Abo ist abgelaufen';
    title = 'Dein Abonnement ist abgelaufen';
    bodyLines = [
      `Hallo ${firstName},`,
      `dein ${cycleLabel}s-Abonnement bei Stellify ist abgelaufen. Dein Konto wurde automatisch auf den kostenlosen Plan umgestellt.`,
      `Du kannst jederzeit ein neues Abonnement abschliessen und sofort wieder vollen Zugriff auf alle Funktionen erhalten.`,
    ];
    ctaText = 'Neues Abo abschliessen';
  }

  await transporter.sendMail({
    from: `"Stellify" <${emailUser}>`,
    to,
    subject,
    text: bodyLines.join('\n\n') + `\n\n${ctaText}: ${siteUrl}/?view=pricing\n\nDas Stellify-Team`,
    html: buildEmailHtml(title, bodyLines, ctaText, `${siteUrl}/?view=pricing`),
  });
  console.log(`[EMAIL] Renewal reminder sent to ${to}`);
}

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();

// Vercel sits behind a proxy → trust X-Forwarded-* headers (fixes rate-limit warning)
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan("dev"));

// Restrict CORS to own domain (apex + www) plus Vercel-Preview-Deployments
const allowedOrigins = [
  process.env.SITE_URL || 'https://stellify.ch',
  'https://stellify.ch',
  'https://www.stellify.ch',
  'http://localhost:3000',
  'http://localhost:5173',
].map((o) => o.replace(/\/$/, ''));
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized) || vercelPreviewRegex.test(normalized)) {
      return callback(null, true);
    }
    console.warn('[CORS BLOCKED]', normalized);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiters
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Du hast zu viele Anfragen gesendet. Bitte warte eine Minute und versuche es erneut.', retryAfter: 60 },
});
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.', retryAfter: 900 },
});
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte 15 Minuten und versuche es erneut.', retryAfter: 900 },
});
app.use(generalLimiter);

// Firebase token verification middleware
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { adminAuth } = getAdminServices();
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    (req as any).uid = decoded.uid;
    (req as any).userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

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
    if (userId && planId) {
      try {
        const { adminDb } = getAdminServices();
        const isAnnual = session.metadata?.interval === 'year';
        const userSnap = await adminDb.collection('users').doc(userId).get();
        const existingUser = userSnap.data();
        const currentExpiry = existingUser?.subscription_expires_at;
        const baseDate = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
        const expiresAt = new Date(baseDate);
        if (isAnnual) expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        else expiresAt.setMonth(expiresAt.getMonth() + 1);
        await adminDb.collection('users').doc(userId).update({
          role: normaliseRole(planId),
          subscription_interval: isAnnual ? 'annual' : 'monthly',
          subscription_expires_at: expiresAt.toISOString(),
          stripe_customer_id: session.customer || null,
        });
        console.log(`[WEBHOOK] Role updated to ${normaliseRole(planId)} for ${userId}, expires ${expiresAt.toISOString()}`);
        if (existingUser?.email) {
          const emailUser = process.env.EMAIL_USER;
          const emailPass = process.env.EMAIL_PASS;
          if (emailUser && emailPass) {
            const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
            const planLabel = planId === 'ultimate' ? 'Ultimate' : 'Pro';
            const cycleLabel = isAnnual ? 'Jahres' : 'Monats';
            await transporter.sendMail({
              from: `"Stellify" <${emailUser}>`,
              to: existingUser.email,
              subject: `Willkommen im ${planLabel}-Plan — Dein Stellify-Abo ist aktiv`,
              text: `Hallo ${existingUser.first_name || 'Nutzer'},\n\nvielen Dank für dein ${cycleLabel}-Abonnement!\n\nDas Stellify-Team`,
              html: buildEmailHtml(
                `Willkommen im ${planLabel}-Plan!`,
                [
                  `Hallo ${existingUser.first_name || 'Nutzer'},`,
                  `vielen Dank — dein ${cycleLabel}s-Abonnement ist jetzt aktiv.`,
                  `Dein Abo ist gültig bis zum <strong>${expiresAt.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`,
                ],
                'Zum Dashboard',
                (process.env.SITE_URL || 'https://stellify.ch') + '/'
              ),
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error(`[WEBHOOK] Firestore update failed:`, err);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    try {
      const { adminDb } = getAdminServices();
      const usersSnap = await adminDb.collection('users').where('stripe_customer_id', '==', sub.customer as string).limit(1).get();
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (users?.length) {
        const u = users[0] as any;
        await adminDb.collection('users').doc(u.id).update({ role: 'client' });
        console.log(`[WEBHOOK] Downgraded ${u.id} to free after subscription deletion`);
        if (u.email) {
          const planType = u.subscription_interval === 'annual' ? 'annual' : 'monthly';
          await sendRenewalReminder(u.email, u.first_name || 'Nutzer', planType, 0).catch(console.error);
        }
      }
    } catch (err) {
      console.error(`[WEBHOOK] subscription.deleted handler failed:`, err);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.cancel_at_period_end) {
      try {
        const { adminDb } = getAdminServices();
        const usersSnap2 = await adminDb.collection('users').where('stripe_customer_id', '==', sub.customer as string).limit(1).get();
        const users = usersSnap2.docs.map(d => d.data());
        if (users?.length) {
          const u = users[0] as any;
          if (u.email) {
            const periodEnd = new Date((sub as any).current_period_end * 1000);
            const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / 86400000);
            const planType = u.subscription_interval === 'annual' ? 'annual' : 'monthly';
            const threshold = planType === 'annual' ? 14 : 3;
            if (daysLeft <= threshold) {
              await sendRenewalReminder(u.email, u.first_name || 'Nutzer', planType, daysLeft).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error(`[WEBHOOK] subscription.updated handler failed:`, err);
      }
    }
  }

  // Auto-renew: extend subscription_expires_at on every successful invoice
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as any;
    if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
      try {
        const { adminDb } = getAdminServices();
        const sub = await getStripe().subscriptions.retrieve(invoice.subscription as string);
        const customerId = sub.customer as string;
        const usersSnap = await adminDb.collection('users').where('stripe_customer_id', '==', customerId).limit(1).get();
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const u = userDoc.data() as any;
          const isAnnual = u.subscription_interval === 'annual';
          const expiresAt = new Date();
          if (isAnnual) expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          else expiresAt.setMonth(expiresAt.getMonth() + 1);
          await userDoc.ref.update({ subscription_expires_at: expiresAt.toISOString() });
          console.log(`[WEBHOOK] Renewed ${userDoc.id} until ${expiresAt.toISOString()}`);
        }
      } catch (err) {
        console.error(`[WEBHOOK] invoice.payment_succeeded handler failed:`, err);
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());

// ── Gemini retry helper ───────────────────────────────────────────────────────
const PRO_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
const MAX_INPUT_CHARS = 32000;   // ~8k tokens
const MAX_OUTPUT_TOKENS = 2000;  // soft cap (Gemini config)

// ── DeepSeek (OpenAI-kompatibel) ──────────────────────────────────────────────
const DEEPSEEK_API_URL = (process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com').replace(/\/$/, '') + '/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_TIMEOUT_MS = 30_000;

type ChatHistoryMsg = { role?: string; parts?: Array<{ text?: string }>; content?: string };

function geminiHistoryToOpenAI(messages?: ChatHistoryMsg[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(messages)) return [];
  return messages.map((m) => {
    const role = m.role === 'model' || m.role === 'assistant' ? 'assistant' as const : 'user' as const;
    const content = typeof m.content === 'string'
      ? m.content
      : (m.parts || []).map((p) => p?.text || '').join('');
    return { role, content };
  }).filter((m) => m.content);
}

async function deepseekChat(opts: {
  systemInstruction?: string;
  history?: ChatHistoryMsg[];
  userContent: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY fehlt');

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.systemInstruction) messages.push({ role: 'system', content: opts.systemInstruction });
  messages.push(...geminiHistoryToOpenAI(opts.history));
  messages.push({ role: 'user', content: clampInput(opts.userContent) });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEEPSEEK_TIMEOUT_MS);
  try {
    const r = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`DeepSeek HTTP ${r.status}: ${body.slice(0, 200)}`);
    }
    const data: any = await r.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('DeepSeek EMPTY_RESPONSE');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Try DeepSeek first, fall back to Gemini for plain text generation.
// (Bild-/Vision- und Google-Search-Endpoints umgehen diesen Helper bewusst.)
async function generateText(opts: {
  systemInstruction?: string;
  history?: ChatHistoryMsg[];
  userContent: string;
  temperature?: number;
  maxOutputTokens?: number;
  preferredGeminiModel?: string;
}): Promise<{ text: string; provider: 'deepseek' | 'gemini' }> {
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const text = await deepseekChat(opts);
      return { text, provider: 'deepseek' };
    } catch (err: any) {
      console.warn('[DEEPSEEK→GEMINI fallback]', (err?.message || err).toString().slice(0, 200));
    }
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Weder DEEPSEEK_API_KEY noch GEMINI_API_KEY ist gesetzt');
  const ai = new GoogleGenAI({ apiKey });
  const userText = clampInput(opts.userContent);
  const contents = (opts.history?.length)
    ? [...opts.history, { role: 'user', parts: [{ text: userText }] }]
    : [{ role: 'user', parts: [{ text: userText }] }];
  const response = await geminiWithRetry((mdl) =>
    ai.models.generateContent({
      model: mdl,
      contents,
      config: {
        systemInstruction: opts.systemInstruction,
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      },
    })
  , 3, opts.preferredGeminiModel);
  return { text: response.text ?? '', provider: 'gemini' };
}

function clampInput(text: string): string {
  return text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
}

function safeGetText(result: any): string | null {
  if (!result) return null;
  try {
    const txt = result.text;
    if (typeof txt === 'string') return txt;
    const parts = result.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      return parts.filter((p: any) => p.text).map((p: any) => p.text).join('') || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function geminiWithRetry(fn: (model: string) => Promise<any>, maxAttempts = 4, preferredModel?: string): Promise<any> {
  const modelsToTry = preferredModel
    ? [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)]
    : FALLBACK_MODELS;
  const attempts = Math.min(maxAttempts, modelsToTry.length);
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    const model = modelsToTry[i];
    try {
      const result = await fn(model);
      const text = safeGetText(result);
      if (text === null || text === undefined) throw new Error('EMPTY_RESPONSE');
      return { ...result, text };
    } catch (err: any) {
      lastError = err;
      const msg = (err.message || '') + (err.status ? ` [${err.status}]` : '');
      console.warn(`[GEMINI] model=${model} attempt=${i + 1} error=${msg.slice(0, 200)}`);
      if (i < attempts - 1) {
        const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')
          || msg.includes('INTERNAL') || msg.includes('EMPTY_RESPONSE') || msg.includes('429')
          || msg.includes('quota') || msg.includes('overload') || msg.includes('Resource exhausted')
          || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('timeout') || msg.includes('network');
        if (isRetryable) await new Promise(r => setTimeout(r, (i + 1) * 2000));
        else await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

// ── AI Quota / Rate-Limit Enforcement ────────────────────────────────────────
// Limits per role. Free users get 3 lifetime tries — then upgrade is required.
const QUOTA = {
  client:    { lifetime: 3 },
  pro:       { perMin: 5,  perDay: 20, perMonth: 80 },
  unlimited: { perMin: 10, perDay: 50, perMonth: 200 },
} as const;

const GLOBAL_DAILY_CALL_CAP = 200; // safety net: ~$3.60/day worst case

// In-memory per-user minute counters (resets on server restart, fine for short windows)
const minuteCounters = new Map<string, { count: number; resetAt: number }>();
function bumpMinute(uid: string): number {
  const now = Date.now();
  const cur = minuteCounters.get(uid);
  if (!cur || cur.resetAt < now) {
    minuteCounters.set(uid, { count: 1, resetAt: now + 60_000 });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function monthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function checkGlobalBudget(adminDb: FirebaseFirestore.Firestore): Promise<boolean> {
  const ref = adminDb.collection('system').doc('budget');
  const snap = await ref.get();
  const data = snap.data();
  const today = todayKey();
  if (!data || data.cost_today_date !== today) {
    await ref.set({ cost_today_date: today, calls_today: 0 }, { merge: true });
    return true;
  }
  return (data.calls_today || 0) < GLOBAL_DAILY_CALL_CAP;
}

async function incrementGlobalBudget(adminDb: FirebaseFirestore.Firestore) {
  const ref = adminDb.collection('system').doc('budget');
  const today = todayKey();
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.cost_today_date !== today) {
      tx.set(ref, { cost_today_date: today, calls_today: 1 });
    } else {
      tx.update(ref, { calls_today: (data.calls_today || 0) + 1 });
    }
  });
}

const enforceAIQuota = async (req: Request, res: Response, next: NextFunction) => {
  const uid = (req as any).uid as string | undefined;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { adminDb } = getAdminServices();

    // Global cap check (last line of defence)
    const ok = await checkGlobalBudget(adminDb);
    if (!ok) {
      return res.status(503).json({ error: 'Stellify ist heute stark ausgelastet. Bitte versuche es morgen erneut.' });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const u = userSnap.data() || {};
    const role = (u.role as string) || 'client';

    if (role === 'client') {
      const used = u.ai_calls_lifetime || 0;
      if (used >= QUOTA.client.lifetime) {
        return res.status(402).json({
          error: 'Du hast deine 3 kostenlosen Versuche aufgebraucht. Upgrade auf Pro oder Ultimate für weitere KI-Anfragen.',
          upgrade: true,
          remaining: 0,
        });
      }
    } else if (role === 'pro' || role === 'unlimited') {
      const limits = role === 'pro' ? QUOTA.pro : QUOTA.unlimited;

      // Minute (in-memory)
      const minuteCount = bumpMinute(uid);
      if (minuteCount > limits.perMin) {
        return res.status(429).json({
          error: `Limit erreicht: max. ${limits.perMin} Anfragen pro Minute. Bitte kurz warten.`,
          retryAfter: 60,
        });
      }

      // Daily (Firestore)
      const today = todayKey();
      const dayCount = u.ai_calls_today_date === today ? (u.ai_calls_today || 0) : 0;
      if (dayCount >= limits.perDay) {
        return res.status(429).json({
          error: `Tägliches Limit erreicht (${limits.perDay} Anfragen). Reset um Mitternacht.`,
          retryAfter: 86400,
        });
      }

      // Monthly (Firestore)
      const month = monthKey();
      const monthCount = u.ai_calls_month_key === month ? (u.ai_calls_month || 0) : 0;
      if (monthCount >= limits.perMonth) {
        return res.status(429).json({
          error: `Monatliches Limit erreicht (${limits.perMonth} Anfragen). Reset zum Monatsbeginn.`,
          retryAfter: 86400 * 7,
        });
      }
    } else {
      return res.status(403).json({ error: 'Unbekannte Rolle' });
    }

    (req as any).quotaRole = role;
    (req as any).quotaUserRef = userRef;
    (req as any).quotaUserData = u;
    next();
  } catch (err: any) {
    console.error('[QUOTA ERROR]', err.message);
    res.status(500).json({ error: 'Quota-Prüfung fehlgeschlagen' });
  }
};

// Call after a successful AI response to increment counters
async function recordAIUsage(req: Request) {
  const role = (req as any).quotaRole as string;
  const userRef = (req as any).quotaUserRef as FirebaseFirestore.DocumentReference;
  const u = (req as any).quotaUserData as any;
  if (!userRef) return;
  try {
    const { adminDb } = getAdminServices();
    if (role === 'client') {
      await userRef.update({ ai_calls_lifetime: (u.ai_calls_lifetime || 0) + 1 });
    } else {
      const today = todayKey();
      const month = monthKey();
      const newDay = u.ai_calls_today_date === today ? (u.ai_calls_today || 0) + 1 : 1;
      const newMonth = u.ai_calls_month_key === month ? (u.ai_calls_month || 0) + 1 : 1;
      await userRef.update({
        ai_calls_today: newDay,
        ai_calls_today_date: today,
        ai_calls_month: newMonth,
        ai_calls_month_key: month,
      });
    }
    await incrementGlobalBudget(adminDb);
  } catch (err: any) {
    console.error('[USAGE RECORD]', err.message);
  }
}


// ── Chat (DeepSeek primär, Gemini Fallback) ───────────────────────────────────
app.post("/api/chat", aiLimiter, requireAuth, enforceAIQuota, async (req, res) => {
  const { messages, userContent, systemInstruction, model } = req.body;
  try {
    const { text, provider } = await generateText({
      systemInstruction,
      history: messages,
      userContent: typeof userContent === 'string' ? userContent : '',
      temperature: 0.7,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      preferredGeminiModel: model,
    });
    await recordAIUsage(req);
    res.json({ text, provider });
  } catch (error: any) {
    console.error("[CHAT ERROR]", error.message);
    const msg = (error.message || '') + (error.status ? ` [status=${error.status}]` : '');
    const isOverloaded = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')
      || msg.includes('overload') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Resource exhausted');
    const isQuotaError = msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    res.status(isOverloaded || isQuotaError ? 503 : 500).json({ error: isOverloaded || isQuotaError ? 'overloaded' : msg });
  }
});

// ── Tool (DeepSeek primär; Gemini wenn Google-Search nötig) ───────────────────
app.post("/api/process-tool", aiLimiter, requireAuth, enforceAIQuota, async (req, res) => {
  const { prompt, model, useSearch, language } = req.body;

  const langInstructions: Record<string, string> = {
    DE: `Du bist Stellify – ein Elite-Karriereberater mit 20 Jahren Erfahrung auf dem Schweizer Arbeitsmarkt (Zürich, Genf, Basel, Zug, Bern). Du kennst die Strukturen der grössten Schweizer Arbeitgeber (Nestlé, Novartis, UBS, Credit Suisse, Roche, ABB, Zurich Insurance, Swiss Re, Glencore, Richemont) sowie den KMU-Sektor. SPRACHE: Schweizer Hochdeutsch (KEIN "ß", immer "ss"). Ton: präzise, direkt, professionell – wie ein Schweizer HR-Direktor. QUALITÄT: Deine Antworten sind konkret, umsetzbar und auf höchstem Niveau. Keine Floskeln, keine leeren Phrasen.`,
    FR: `Tu es Stellify – un conseiller en carrière d'élite avec 20 ans d'expérience sur le marché du travail suisse (Genève, Lausanne, Berne, Bâle, Zurich). Tu maîtrises les structures des grands employeurs suisses (Nestlé, Novartis, UBS, Roche, ABB, Zurich Insurance, SGS, Lonza) ainsi que les PME. LANGUE: Français suisse, précis et professionnel. Ton: direct, concret, au niveau d'un directeur RH suisse. QUALITÉ: Tes réponses sont précises, actionnables et au plus haut niveau. Pas de généralités ni de phrases creuses.`,
    IT: `Sei Stellify – un consulente di carriera d'élite con 20 anni di esperienza nel mercato del lavoro svizzero (Zurigo, Ginevra, Basilea, Lugano, Berna). Conosci le strutture dei maggiori datori di lavoro svizzeri (Nestlé, Novartis, UBS, Roche, ABB, Zurich Insurance, Lonza) e il settore PMI. LINGUA: Italiano svizzero, preciso e professionale. Tono: diretto, concreto, al livello di un direttore HR svizzero. QUALITÀ: Le tue risposte sono concrete, attuabili e del massimo livello. Niente generalità né frasi vuote.`,
    EN: `You are Stellify – an elite career advisor with 20 years of experience in the Swiss job market (Zurich, Geneva, Basel, Zug, Berne). You know the structures of Switzerland's largest employers (Nestlé, Novartis, UBS, Roche, ABB, Zurich Insurance, Swiss Re, Glencore, Richemont) and the SME sector. LANGUAGE: Professional British/Swiss English. Tone: precise, direct, professional – like a Swiss HR Director. QUALITY: Your answers are concrete, actionable and of the highest standard. No generic advice or empty phrases.`,
  };
  const systemInstruction = langInstructions[language] || langInstructions.DE;

  try {
    // Mit Google-Suche → Gemini ist Pflicht (DeepSeek hat kein Grounding)
    if (useSearch) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY fehlt" });
      const ai = new GoogleGenAI({ apiKey });
      const userText = clampInput(typeof prompt === 'string' ? prompt : '');
      const response = await geminiWithRetry((mdl) =>
        ai.models.generateContent({
          model: mdl,
          contents: userText,
          config: { systemInstruction, temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS, tools: [{ googleSearch: {} }] }
        })
      , 3, model);
      const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: string[] = chunks.filter((c: any) => c.web?.uri).map((c: any) => `[${c.web.title || c.web.uri}](${c.web.uri})`);
      await recordAIUsage(req);
      return res.json({ text: response.text, sources, provider: 'gemini' });
    }

    // Sonst: DeepSeek primär, Gemini Fallback
    const { text, provider } = await generateText({
      systemInstruction,
      userContent: typeof prompt === 'string' ? prompt : '',
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      preferredGeminiModel: model,
    });
    await recordAIUsage(req);
    res.json({ text, sources: [], provider });
  } catch (error: any) {
    console.error("[TOOL ERROR]", error.message);
    const msg = (error.message || '') + (error.status ? ` [status=${error.status}]` : '');
    const isOverloaded = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')
      || msg.includes('overload') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Resource exhausted')
      || msg.includes('quota') || msg.includes('429');
    res.status(isOverloaded ? 503 : 500).json({ error: isOverloaded ? 'overloaded' : msg });
  }
});

// ── LinkedIn Screenshot / Image Text Extraction ───────────────────────────────
app.post("/api/extract-image", aiLimiter, requireAuth, enforceAIQuota, async (req, res) => {
  const { base64, mimeType } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY fehlt" });
  if (!base64) return res.status(400).json({ error: "base64 fehlt" });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await geminiWithRetry((mdl) =>
      ai.models.generateContent({
        model: mdl,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } },
            { text: 'Extrahiere alle sichtbaren Textinformationen aus diesem LinkedIn-Profil-Screenshot. Gib Name, Berufsbezeichnung, Unternehmen, Ausbildung, Fähigkeiten und alle anderen relevanten Karriereinformationen als strukturierten Text zurück. Nur den extrahierten Text, keine Erklärungen.' }
          ]
        }],
        config: { temperature: 0.1, maxOutputTokens: 1500 }
      })
    , 3, PRO_MODEL);
    await recordAIUsage(req);
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("[IMAGE EXTRACT ERROR]", error.message);
    res.status(500).json({ error: error.message || 'Bildanalyse fehlgeschlagen' });
  }
});

// ── Live Job Search ───────────────────────────────────────────────────────────
app.get("/api/jobs", requireAuth, async (req, res) => {
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
  if (!geminiKey) return res.json({ jobs: [], live: false, source: 'none' });
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

// ── Password Reset (custom branded email) ────────────────────────────────────
app.post("/api/send-password-reset", emailLimiter, async (req, res) => {
  const { email, language } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  if (!emailUser || !emailPass) return res.status(500).json({ error: 'Email not configured' });

  const lang = language || 'DE';
  const resetCopy: Record<string, { subject: string; title: string; lines: string[]; cta: string }> = {
    DE: {
      subject: 'Stellify – Passwort zurücksetzen',
      title: 'Passwort zurücksetzen',
      lines: ['Hallo,', 'du hast eine Anfrage gestellt, dein Passwort bei Stellify zurückzusetzen.', 'Klicke auf den Button unten um ein neues Passwort festzulegen. Der Link ist <strong>1 Stunde gültig</strong>.', 'Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren.'],
      cta: 'Passwort jetzt zurücksetzen',
    },
    FR: {
      subject: 'Stellify – Réinitialiser votre mot de passe',
      title: 'Réinitialiser votre mot de passe',
      lines: ['Bonjour,', 'vous avez demandé la réinitialisation de votre mot de passe Stellify.', 'Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Le lien est valable <strong>1 heure</strong>.', 'Si vous n\'avez pas fait cette demande, ignorez simplement cet e-mail.'],
      cta: 'Réinitialiser maintenant',
    },
    IT: {
      subject: 'Stellify – Reimposta la tua password',
      title: 'Reimposta la password',
      lines: ['Ciao,', 'hai richiesto il reset della password di Stellify.', 'Clicca sul pulsante qui sotto per impostare una nuova password. Il link è valido per <strong>1 ora</strong>.', 'Se non hai fatto questa richiesta, ignora semplicemente questa email.'],
      cta: 'Reimposta ora',
    },
    EN: {
      subject: 'Stellify – Reset your password',
      title: 'Reset your password',
      lines: ['Hello,', 'you requested a password reset for your Stellify account.', 'Click the button below to set a new password. The link is valid for <strong>1 hour</strong>.', 'If you did not request this, you can safely ignore this email.'],
      cta: 'Reset password now',
    },
  };
  const copy = resetCopy[lang] || resetCopy['DE'];

  try {
    let resetLink: string;
    try {
      const { adminAuth } = getAdminServices();
      resetLink = await adminAuth.generatePasswordResetLink(email, { url: `${siteUrl}/` });
    } catch (linkError: any) {
      if (linkError.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'user-not-found' });
      }
      throw linkError;
    }
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({
      from: `"Stellify" <${emailUser}>`,
      to: email,
      subject: copy.subject,
      html: buildEmailHtml(copy.title, copy.lines, copy.cta, resetLink),
    });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[AUTH] Password reset failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Account ────────────────────────────────────────────────────────────
app.post("/api/delete-account", requireAuth, async (req, res) => {
  const uid = (req as any).uid;
  try {
    const { adminAuth, adminDb } = getAdminServices();
    await adminDb.collection('users').doc(uid).delete();
    await adminAuth.deleteUser(uid);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[DELETE ACCOUNT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Welcome Email ─────────────────────────────────────────────────────────────
app.post("/api/send-welcome-email", emailLimiter, async (req, res) => {
  const { email, firstName, language } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  if (!emailUser || !emailPass) return res.json({ ok: true });
  const name = firstName || '';
  const lang = language || 'DE';
  const welcomeCopy: Record<string, { subject: string; title: string; lines: string[]; cta: string }> = {
    DE: {
      subject: 'Willkommen bei Stellify – Dein KI-Karriere-Co-Pilot',
      title: `Willkommen bei Stellify, ${name}!`,
      lines: [`Hallo ${name},`, 'dein Konto wurde erfolgreich erstellt. Wir freuen uns, dich als Teil der Stellify-Community begrüssen zu dürfen.', 'Mit dem <strong>kostenlosen Plan</strong> kannst du sofort loslegen: Analysiere deinen Lebenslauf, bereite dich auf Interviews vor und finde passende Stellen in der Schweiz.', 'Wann immer du bereit bist, kannst du auf einen Pro- oder Ultimate-Plan upgraden.'],
      cta: 'Jetzt loslegen',
    },
    FR: {
      subject: 'Bienvenue sur Stellify – Ton co-pilote carrière IA',
      title: `Bienvenue sur Stellify, ${name}!`,
      lines: [`Bonjour ${name},`, 'ton compte a été créé avec succès. Nous sommes ravis de t\'accueillir dans la communauté Stellify.', 'Avec le <strong>plan gratuit</strong>, tu peux démarrer immédiatement: analyse ton CV, prépare-toi aux entretiens et trouve des emplois en Suisse.', 'Quand tu es prêt à aller plus loin, tu peux passer au plan Pro ou Ultimate.'],
      cta: 'Commencer maintenant',
    },
    IT: {
      subject: 'Benvenuto su Stellify – Il tuo co-pilota carriera AI',
      title: `Benvenuto su Stellify, ${name}!`,
      lines: [`Ciao ${name},`, 'il tuo account è stato creato con successo. Siamo felici di averti nella comunità Stellify.', 'Con il <strong>piano gratuito</strong> puoi iniziare subito: analizza il tuo CV, preparati ai colloqui e trova lavoro in Svizzera.', 'Quando sei pronto per fare di più, puoi passare al piano Pro o Ultimate.'],
      cta: 'Inizia ora',
    },
    EN: {
      subject: 'Welcome to Stellify – Your AI Career Co-Pilot',
      title: `Welcome to Stellify, ${name}!`,
      lines: [`Hello ${name},`, 'your account has been successfully created. We\'re thrilled to have you as part of the Stellify community.', 'With the <strong>free plan</strong> you can start right away: analyse your CV, prepare for interviews and find jobs in Switzerland.', 'Whenever you\'re ready to do more, you can upgrade to a Pro or Ultimate plan.'],
      cta: 'Get started now',
    },
  };
  const copy = welcomeCopy[lang] || welcomeCopy['DE'];
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({
      from: `"Stellify" <${emailUser}>`,
      to: email,
      subject: copy.subject,
      html: buildEmailHtml(copy.title, copy.lines, copy.cta, `${siteUrl}/`),
    });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[AUTH] Welcome email failed:', err.message);
    res.json({ ok: true });
  }
});

// ── Test Email ────────────────────────────────────────────────────────────────
async function handleTestEmail(to: string, res: any) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    return res.status(500).json({ error: 'EMAIL_USER / EMAIL_PASS not configured' });
  }
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({
      from: `"Stellify" <${emailUser}>`,
      to,
      subject: 'Stellify – Test-E-Mail',
      text: `Hallo,\n\ndies ist eine Test-E-Mail von Stellify um zu bestätigen dass der E-Mail-Versand korrekt konfiguriert ist.\n\nDas Stellify-Team`,
    });
    console.log(`[EMAIL] Test email sent to ${to}`);
    res.json({ ok: true, sentTo: to });
  } catch (err: any) {
    console.error('[EMAIL] Test email failed:', err.message);
    res.status(500).json({ error: err.message });
  }
}
app.get("/api/send-test-email", async (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.query.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });
  const emailUser = process.env.EMAIL_USER;
  const to = (req.query.to as string) || emailUser || '';
  await handleTestEmail(to, res);
});
app.post("/api/send-test-email", emailLimiter, requireAuth, async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const to = req.body?.to || emailUser || '';
  await handleTestEmail(to, res);
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


// ── Stripe Checkout ───────────────────────────────────────────────────────────
app.post("/api/create-checkout-session", express.json(), async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const mode = stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
  try {
    const { planId, billingCycle, userId, successUrl, cancelUrl } = req.body || {};

    if (!planId || !userId || !billingCycle) {
      res.status(400).json({ error: "Fehlende Parameter: planId, userId oder billingCycle" });
      return;
    }
    if (!stripeKey) {
      res.status(500).json({ error: "STRIPE_SECRET_KEY nicht gesetzt" });
      return;
    }

    const priceId: string | undefined = ({
      'pro_monthly':      process.env.STRIPE_PRICE_PRO_MONTHLY,
      'pro_yearly':       process.env.STRIPE_PRICE_PRO_YEARLY,
      'ultimate_monthly': process.env.STRIPE_PRICE_ULTIMATE_MONTHLY,
      'ultimate_yearly':  process.env.STRIPE_PRICE_ULTIMATE_YEARLY,
    } as Record<string, string | undefined>)[`${planId}_${billingCycle}`];

    if (!priceId) {
      res.status(400).json({ error: `Preis-ID für "${planId}_${billingCycle}" nicht in Vercel konfiguriert` });
      return;
    }

    console.log(`[STRIPE] mode=${mode} plan=${planId}_${billingCycle} price=${priceId}`);
    const stripeClient = getStripe();
    const isAnnual = billingCycle === 'yearly';
    const origin = String(req.headers.origin || process.env.SITE_URL || 'https://stellify.ch');

    const session = await stripeClient.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      metadata: { planId, billingCycle, interval: isAnnual ? 'year' : 'month' },
      subscription_data: { metadata: { planId, billingCycle } },
      success_url: successUrl || `${origin}?payment=success`,
      cancel_url:  cancelUrl  || `${origin}?view=pricing`,
    });

    res.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error(`[STRIPE ERROR] mode=${mode} type=${err.type} code=${err.code} msg=${err.message}`);
    res.status(500).json({ success: false, error: `[${mode}] ${err.message || 'Unbekannter Stripe-Fehler'}` });
  }
});


// ── CV Analysis (DeepSeek primär, Gemini Fallback) ───────────────────────────
app.post("/api/analyze-cv", aiLimiter, requireAuth, enforceAIQuota, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text fehlt" });

  try {
    const userPrompt = `Analysiere diesen Lebenslauf für den Schweizer Arbeitsmarkt und antworte NUR mit einem validen JSON-Objekt ohne Markdown:
{
  "keywords": ["keyword1", "keyword2"],
  "industryMatch": "Branche",
  "score": 75,
  "improvements": ["punkt1", "punkt2", "punkt3"]
}

CV: ${String(text).substring(0, 2000)}`;

    const { text: responseText } = await generateText({
      userContent: userPrompt,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    const jsonMatch = (responseText || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await recordAIUsage(req);
      return res.json({ success: true, metadata: {} });
    }
    const metadata = JSON.parse(jsonMatch[0]);

    const uid = (req as any).uid;
    if (uid) {
      const { adminDb } = getAdminServices();
      await adminDb.collection('cv_analyses').add({ user_id: uid, data: metadata, created_at: new Date().toISOString() }).catch(console.error);
    }

    await recordAIUsage(req);
    res.json({ success: true, metadata });
  } catch (error: any) {
    console.error("[ANALYZE CV ERROR]", error.message);
    res.status(500).json({ error: error.message || 'CV-Analyse fehlgeschlagen' });
  }
});

// ── Career Roadmap (DeepSeek primär, Gemini Fallback) ────────────────────────
app.post("/api/generate-roadmap", aiLimiter, requireAuth, enforceAIQuota, async (req, res) => {
  const { profile } = req.body;
  if (!profile?.text) return res.status(400).json({ error: "profile.text fehlt" });

  try {
    const userPrompt = `Basierend auf diesem CV, erstelle eine 3-stufige Karriere-Roadmap für den Schweizer Arbeitsmarkt.
Antworte NUR mit einem validen JSON-Array ohne Markdown:
["Schritt 1: ...", "Schritt 2: ...", "Schritt 3: ..."]

CV: ${String(profile.text).substring(0, 1000)}`;

    const { text: responseText } = await generateText({
      userContent: userPrompt,
      temperature: 0.4,
      maxOutputTokens: 600,
    });

    const jsonMatch = (responseText || '').match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      await recordAIUsage(req);
      return res.json({ success: false, roadmap: [] });
    }
    const roadmap = JSON.parse(jsonMatch[0]);

    await recordAIUsage(req);
    res.json({ success: true, roadmap: Array.isArray(roadmap) ? roadmap.slice(0, 3) : [] });
  } catch (error: any) {
    console.error("[ROADMAP ERROR]", error.message);
    res.status(500).json({ success: false, error: error.message || 'Roadmap-Generierung fehlgeschlagen' });
  }
});

// ── CV File Storage (Firebase Storage) ───────────────────────────────────────
app.post("/api/upload-cv", aiLimiter, requireAuth, async (req, res) => {
  const { base64, fileName, mimeType } = req.body;
  const uid = (req as any).uid;
  if (!base64 || !fileName) return res.status(400).json({ error: "base64 und fileName erforderlich" });

  try {
    const { adminDb, adminStorage } = getAdminServices();
    const buffer = Buffer.from(base64, 'base64');
    const safeName = `cv-files/${uid}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(safeName);
    await file.save(buffer, { contentType: mimeType || 'application/octet-stream' });

    const [url] = await file.getSignedUrl({ action: 'read', expires: '01-01-2100' });

    await adminDb.collection('users').doc(uid).update({ cv_file_path: safeName }).catch(console.error);

    res.json({ success: true, path: safeName, url });
  } catch (error: any) {
    console.error("[CV UPLOAD ERROR]", error);
    res.status(500).json({ error: error.message || 'Upload fehlgeschlagen' });
  }
});

// ── LinkedIn Profile Import OAuth (separate from Supabase login) ──────────────
// Generates a random state token per request to prevent CSRF
const linkedInStates = new Map<string, number>();

app.get("/api/auth/linkedin/url", (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const proto = ((req.headers['x-forwarded-proto'] as string) || 'https').split(',')[0].trim();
  const host = req.get('host') || 'localhost:3000';
  const origin = `${proto}://${host}`;
  if (!clientId) return res.status(500).json({ error: "LINKEDIN_CLIENT_ID fehlt" });

  const state = require('crypto').randomBytes(16).toString('hex');
  linkedInStates.set(state, Date.now());
  // Purge states older than 10 minutes
  for (const [k, t] of linkedInStates) { if (Date.now() - t > 600_000) linkedInStates.delete(k); }

  const params = new URLSearchParams({
    response_type: "code", client_id: clientId,
    redirect_uri: `${origin}/api/auth/linkedin/callback`,
    state, scope: "openid profile email",
  });
  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params}` });
});

app.get("/api/auth/linkedin/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const proto = ((req.headers['x-forwarded-proto'] as string) || req.protocol).split(',')[0].trim();
  const host = req.get('host') || 'localhost:3000';
  const origin = `${proto}://${host}`;

  if (error) return res.status(400).send(`LinkedIn Error: ${error_description || error}`);
  if (!code) return res.status(400).send("No code");
  if (!state || !linkedInStates.has(state as string)) {
    return res.status(400).send("Invalid or expired state. Please try again.");
  }
  linkedInStates.delete(state as string);

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
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Token-Austausch fehlgeschlagen');
    }

    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) throw new Error('Profil konnte nicht geladen werden');
    const profileData = await profileRes.json();

    res.send(`<html><body><script>
      try { window.opener?.postMessage({type:'OAUTH_AUTH_SUCCESS',provider:'linkedin',profile:${JSON.stringify(profileData)}},${JSON.stringify(origin)}); } catch(e){}
      setTimeout(()=>window.close(),1000);
    </script><p>Verbunden! Fenster schliesst sich...</p></body></html>`);
  } catch (err: any) {
    console.error('[LINKEDIN CALLBACK ERROR]', err.message);
    res.status(500).send(`<html><body><p>Fehler: ${err.message}</p><button onclick="window.close()">Schliessen</button></body></html>`);
  }
});

// ── HR Job Application Email ─────────────────────────────────────────────────
app.post("/api/send-job-email", emailLimiter, requireAuth, async (req, res) => {
  const { to, subject, body, fromName } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject und body sind erforderlich' });

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) return res.status(500).json({ error: 'E-Mail nicht konfiguriert' });

  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  const htmlBody = body
    .split('\n')
    .map((line: string) => line.trim() ? `<p style="margin:0 0 14px;font-size:15px;color:#1A1A18;line-height:1.7;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<br/>')
    .join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFCFB;border:1px solid #E8E6E0;max-width:600px;width:100%;">
        <tr><td style="background:#004225;padding:24px 40px;">
          <span style="font-family:Georgia,serif;font-size:22px;color:#FDFCFB;letter-spacing:-0.5px;">Stell<span style="color:#6FCF97;">ify</span></span>
          <span style="font-size:11px;color:#6FCF97;margin-left:16px;font-family:Helvetica,Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">Bewerbung</span>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          ${htmlBody}
        </td></tr>
        <tr><td style="padding:16px 40px 28px;border-top:1px solid #E8E6E0;">
          <p style="margin:0;font-size:11px;color:#9A9A94;">Erstellt mit <a href="${siteUrl}" style="color:#004225;text-decoration:none;">Stellify</a> – Schweizer KI-Karriere-Plattform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({
      from: `"${fromName || 'Stellify Bewerbung'}" <${emailUser}>`,
      replyTo: fromName ? undefined : emailUser,
      to,
      subject,
      text: body,
      html,
    });
    console.log(`[JOB EMAIL] Sent to ${to}`);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[JOB EMAIL ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: "Interner Serverfehler" });
});

// ── Export for Vercel ─────────────────────────────────────────────────────────
export default app;
