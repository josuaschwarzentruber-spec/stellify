import express from "express";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

dotenv.config();

// ── Firebase Admin (fault-tolerant) ──────────────────────────────────────────
let dbAdmin: ReturnType<typeof getFirestore> | null = null;
let authAdmin: ReturnType<typeof getAdminAuth> | null = null;
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
  authAdmin = getAdminAuth();
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

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan("dev"));

// Restrict CORS to own domain only
const allowedOrigins = [
  process.env.SITE_URL || 'https://stellify.ch',
  'http://localhost:3000',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
  if (!authAdmin || !header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = await authAdmin.verifyIdToken(header.slice(7));
    (req as any).uid = decoded.uid;
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
    if (userId && planId && dbAdmin) {
      try {
        const isAnnual = session.metadata?.interval === 'year';
        // Renewal: extend from current expiry if still in the future
        const userDoc = await dbAdmin.collection("users").doc(userId).get();
        const currentExpiry = userDoc.exists ? userDoc.data()?.subscriptionExpiresAt : null;
        const baseDate = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
        const expiresAt = new Date(baseDate);
        if (isAnnual) expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        else expiresAt.setMonth(expiresAt.getMonth() + 1);
        await dbAdmin.collection("users").doc(userId).update({
          role: normaliseRole(planId),
          subscriptionInterval: isAnnual ? 'annual' : 'monthly',
          subscriptionExpiresAt: expiresAt.toISOString(),
          stripeCustomerId: session.customer || null,
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[WEBHOOK] Role updated to ${normaliseRole(planId)} for ${userId}, expires ${expiresAt.toISOString()}`);
        // Send confirmation email
        const userData = userDoc.data();
        if (userData?.email) {
          const emailUser = process.env.EMAIL_USER;
          const emailPass = process.env.EMAIL_PASS;
          if (emailUser && emailPass) {
            const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
            const planLabel = planId === 'ultimate' ? 'Ultimate' : 'Pro';
            const cycleLabel = isAnnual ? 'Jahres' : 'Monats';
            await transporter.sendMail({
              from: `"Stellify" <${emailUser}>`,
              to: userData.email,
              subject: `Willkommen im ${planLabel}-Plan — Dein Stellify-Abo ist aktiv`,
              text: `Hallo ${userData.firstName || 'Nutzer'},\n\nvielen Dank für dein ${cycleLabel}-Abonnement! Du hast jetzt Zugriff auf alle ${planLabel}-Funktionen bis zum ${expiresAt.toLocaleDateString('de-CH')}.\n\nViel Erfolg bei deiner Karriere!\nDas Stellify-Team`,
              html: buildEmailHtml(
                `Willkommen im ${planLabel}-Plan!`,
                [
                  `Hallo ${userData.firstName || 'Nutzer'},`,
                  `vielen Dank — dein ${cycleLabel}s-Abonnement ist jetzt aktiv. Du hast sofort vollen Zugriff auf alle <strong>${planLabel}-Funktionen</strong>.`,
                  `Dein Abo ist gültig bis zum <strong>${expiresAt.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Du findest das Ablaufdatum jederzeit in deinen Kontoeinstellungen.`,
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

  // Subscription expired — downgrade to free and send notification email
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    if (dbAdmin) {
      try {
        const snapshot = await dbAdmin.collection("users").where("stripeCustomerId", "==", sub.customer).limit(1).get();
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          await userDoc.ref.update({ role: 'client', updatedAt: FieldValue.serverTimestamp() });
          console.log(`[WEBHOOK] Downgraded ${userDoc.id} to free after subscription deletion`);
          if (userData.email) {
            const planType = userData.subscriptionInterval === 'annual' ? 'annual' : 'monthly';
            await sendRenewalReminder(userData.email, userData.firstName || 'Nutzer', planType, 0).catch(console.error);
          }
        }
      } catch (err) {
        console.error(`[WEBHOOK] subscription.deleted handler failed:`, err);
      }
    }
  }

  // Upcoming cancellation reminder (3 days before monthly, 14 days before annual)
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.cancel_at_period_end && dbAdmin) {
      try {
        const snapshot = await dbAdmin.collection("users").where("stripeCustomerId", "==", sub.customer).limit(1).get();
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          if (userData.email) {
            const periodEnd = new Date((sub as any).current_period_end * 1000);
            const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / 86400000);
            const planType = userData.subscriptionInterval === 'annual' ? 'annual' : 'monthly';
            const threshold = planType === 'annual' ? 14 : 3;
            if (daysLeft <= threshold) {
              await sendRenewalReminder(userData.email, userData.firstName || 'Nutzer', planType, daysLeft).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error(`[WEBHOOK] subscription.updated handler failed:`, err);
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());

// ── Gemini Chat ───────────────────────────────────────────────────────────────
app.post("/api/chat", aiLimiter, requireAuth, async (req, res) => {
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
app.post("/api/process-tool", aiLimiter, requireAuth, async (req, res) => {
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

// ── Live Lehrstellen (Yousty, lehrstellennachweis.ch, berufsberatung.ch) ──────
app.get("/api/lehrstellen", requireAuth, async (req, res) => {
  const { keyword = '', location = '', beruf = '' } = req.query as Record<string, string>;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: "Gemini API nicht konfiguriert" });
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `Suche auf yousty.ch, lehrstellennachweis.ch und berufsberatung.ch nach aktuellen Lehrstellen (Berufsausbildung EFZ/EBA) in der Schweiz.${beruf ? ` Beruf: ${beruf}.` : ''}${keyword ? ` Stichwort: ${keyword}.` : ''}${location ? ` Ort/Kanton: ${location}.` : ''} Gib exakt 12 echte aktuelle Lehrstellen zurück als reines JSON-Array ohne Markdown. Felder: id (eindeutig), title (Berufsbezeichnung z.B. "Kaufmann/Kauffrau EFZ"), company (Lehrbetrieb), location (Ort, Kanton), category (immer "Lehrstellen"), description (2 Sätze über die Ausbildung), url (echter Link zu yousty.ch oder lehrstellennachweis.ch), lehrjahr_start (z.B. "August 2025"), abschluss (z.B. "EFZ" oder "EBA"), ats_keywords (3 strings).`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
    });
    const jsonMatch = (response.text || '').match(/\[[\s\S]*\]/);
    if (jsonMatch) return res.json({ jobs: JSON.parse(jsonMatch[0]), live: true, source: 'yousty' });
    return res.json({ jobs: [], live: true, source: 'yousty' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Password Reset (custom branded email, no Firebase default) ────────────────
app.post("/api/send-password-reset", emailLimiter, express.json(), async (req, res) => {
  const { email, language } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  if (!emailUser || !emailPass) return res.status(500).json({ error: 'Email not configured' });
  if (!authAdmin) return res.status(500).json({ error: 'Auth not configured' });

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
    const resetLink = await authAdmin.generatePasswordResetLink(email, {
      url: `${siteUrl}/`,
    });
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
    if (err.code === 'auth/user-not-found' || err.errorInfo?.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'user-not-found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Welcome Email ─────────────────────────────────────────────────────────────
app.post("/api/send-welcome-email", emailLimiter, express.json(), async (req, res) => {
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
app.post("/api/send-test-email", emailLimiter, requireAuth, express.json(), async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const to = req.body?.to || emailUser || '';
  await handleTestEmail(to, res);
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
    const isAnnual = billingCycle === 'yearly';
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      metadata: { planId, billingCycle, interval: isAnnual ? 'year' : 'month' },
      // No auto-renewal: Stripe subscription will cancel at period end
      subscription_data: { metadata: { cancel_at_period_end: 'true' } } as any,
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
