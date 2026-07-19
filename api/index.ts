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
import { Resend } from "resend";
import { createHash } from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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

// Save a file to Firebase Storage, trying every plausible bucket name: the
// configured one plus both Firebase naming schemes (newer projects get
// <id>.firebasestorage.app, older ones <id>.appspot.com). Remembers the first
// bucket that works so later uploads skip the probing.
let resolvedStorageBucket: string | undefined;
async function saveToStorage(adminStorage: ReturnType<typeof getStorage>, path: string, buffer: Buffer, contentType: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const candidates = [...new Set([
    resolvedStorageBucket,
    process.env.FIREBASE_STORAGE_BUCKET,
    projectId ? `${projectId}.firebasestorage.app` : undefined,
    projectId ? `${projectId}.appspot.com` : undefined,
  ].filter(Boolean))] as string[];
  let lastErr: any = null;
  for (const name of candidates) {
    try {
      const file = adminStorage.bucket(name).file(path);
      await file.save(buffer, { contentType });
      const [url] = await file.getSignedUrl({ action: 'read', expires: '01-01-2100' });
      resolvedStorageBucket = name;
      return { url, bucket: name };
    } catch (err: any) {
      lastErr = err;
      if (!/bucket does not exist|notFound|404/i.test(err?.message || '')) throw err;
    }
  }
  throw lastErr || new Error('Kein Storage-Bucket gefunden');
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
// ── Email shell (i18n + dark-mode) ────────────────────────────────────────────
const EMAIL_SHELL_COPY: Record<string, { contact: string; disclaimer: string; htmlLang: string }> = {
  DE: {
    contact: 'Bei Fragen erreichst du uns unter',
    disclaimer: 'Du erhältst diese E-Mail, weil du bei Stellify ein Konto hast.',
    htmlLang: 'de',
  },
  FR: {
    contact: 'Pour toute question, écris-nous à',
    disclaimer: 'Tu reçois cet e-mail parce que tu as un compte Stellify.',
    htmlLang: 'fr',
  },
  IT: {
    contact: 'Per domande, scrivici a',
    disclaimer: 'Ricevi questa email perché hai un account Stellify.',
    htmlLang: 'it',
  },
  EN: {
    contact: 'Questions? Reach us at',
    disclaimer: 'You\'re receiving this email because you have a Stellify account.',
    htmlLang: 'en',
  },
};

function buildEmailHtml(title: string, bodyLines: string[], ctaText: string, ctaUrl: string, language: string = 'DE') {
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  const supportAddr = process.env.EMAIL_REPLY_TO || REPLY_TO_DEFAULT;
  const lang = (language || 'DE').toUpperCase();
  const shell = EMAIL_SHELL_COPY[lang] || EMAIL_SHELL_COPY.DE;
  // Hosted brand image (Gmail / Outlook reliably render <img>, inline SVG is filtered)
  const brandImage = `<img src="${siteUrl}/email-brand.png?v=3" alt="Stellify" width="160" height="40" style="display:block;border:0;outline:none;text-decoration:none;height:40px;width:160px;"/>`;
  return `<!DOCTYPE html>
<html lang="${shell.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-bg     { background:#1A1A18 !important; }
      .email-card   { background:#23231F !important; border-color:#3A3A35 !important; }
      .email-title  { color:#FAFAF8 !important; }
      .email-body   { color:#C8C8C2 !important; }
      .email-muted  { color:#9A9A94 !important; }
      .email-link   { color:#4E9E74 !important; }
      .email-footer { border-color:#3A3A35 !important; }
      .email-cta    { background:#0a5233 !important; color:#FDFCFB !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:#F5F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A18;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background:#F5F4F0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="email-card" style="background:#FDFCFB;border:1px solid #E8E6E0;max-width:560px;width:100%;">
        <!-- Header — Stellify forest gradient with a bright-green hairline,
             the same tones as the dark sections on stellify.ch -->
        <tr>
          <td style="background:#004225;background-image:linear-gradient(135deg,#00331d 0%,#004225 55%,#0a5233 100%);padding:26px 32px;border-bottom:2px solid #0a5233;">
            ${brandImage}
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <h1 class="email-title" style="margin:0 0 20px;font-size:22px;font-weight:600;color:#1A1A18;line-height:1.3;font-family:Georgia,'Times New Roman',serif;">${title}</h1>
            ${bodyLines.map(l => `<p class="email-body" style="margin:0 0 16px;font-size:15px;color:#4A4A45;line-height:1.65;">${l}</p>`).join('')}
            <div style="margin:32px 0 8px;">
              <a href="${ctaUrl}" class="email-cta" style="display:inline-block;background:#004225;background-image:linear-gradient(135deg,#00331d 0%,#004225 55%,#0a5233 100%);color:#FDFCFB;text-decoration:none;font-size:13px;font-weight:700;padding:14px 28px;letter-spacing:1px;text-transform:uppercase;">${ctaText}</a>
            </div>
            <p class="email-muted" style="margin:24px 0 0;font-size:13px;color:#9A9A94;line-height:1.6;">${shell.contact} <a href="mailto:${supportAddr}" class="email-link" style="color:#004225;">${supportAddr}</a></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td class="email-footer" style="padding:20px 32px;border-top:1px solid #E8E6E0;">
            <p class="email-muted" style="margin:0;font-size:11px;color:#9A9A94;line-height:1.6;">© ${new Date().getFullYear()} Stellify · Luzern, Schweiz · <a href="https://stellify.ch" class="email-muted" style="color:#9A9A94;text-decoration:none;">stellify.ch</a></p>
          </td>
        </tr>
      </table>
      <p class="email-muted" style="margin:16px 0 0;font-size:11px;color:#9A9A94;">${shell.disclaimer}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Unified email sender — Resend preferred, Gmail fallback ──────────────────
// RESEND_API_KEY (preferred) + EMAIL_FROM (default "Stellify <noreply@stellify.ch>")
// EMAIL_REPLY_TO (default support.stellify@gmail.com) — where replies should land.
// Falls back to nodemailer + EMAIL_USER / EMAIL_PASS for legacy Gmail setups.
const REPLY_TO_DEFAULT = 'support.stellify@gmail.com';
let resendClient: Resend | null = null;
async function sendEmail(opts: { to: string; subject: string; html: string; text?: string; replyTo?: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const replyTo = opts.replyTo || process.env.EMAIL_REPLY_TO || REPLY_TO_DEFAULT;
  if (resendKey) {
    if (!resendClient) resendClient = new Resend(resendKey);
    const from = process.env.EMAIL_FROM || 'Stellify <noreply@stellify.ch>';
    try {
      const r = await resendClient.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo,
      });
      if ((r as any).error) {
        console.error('[EMAIL] Resend error:', (r as any).error);
        // Fall through to Gmail fallback
      } else {
        console.log(`[EMAIL] Sent via Resend to ${opts.to} (id: ${(r as any).data?.id || 'unknown'})`);
        return true;
      }
    } catch (err) {
      console.error('[EMAIL] Resend threw:', err);
      // Fall through to Gmail fallback
    }
  }

  // Fallback: Gmail
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.warn('[EMAIL] No mail provider configured (RESEND_API_KEY or EMAIL_USER/EMAIL_PASS) — email skipped.');
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({
      from: `"Stellify" <${emailUser}>`,
      replyTo,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ''),
      html: opts.html,
    });
    console.log(`[EMAIL] Sent via Gmail to ${opts.to}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Gmail send failed:', err);
    return false;
  }
}

type Lang = 'DE' | 'FR' | 'IT' | 'EN';
const RENEWAL_COPY: Record<Lang, {
  upcoming: (name: string, days: number, cycle: 'monthly' | 'annual') => { subject: string; title: string; lines: string[]; cta: string };
  expired:  (name: string, cycle: 'monthly' | 'annual') => { subject: string; title: string; lines: string[]; cta: string };
  signoff: string;
}> = {
  DE: {
    upcoming: (n, d, c) => {
      const cycle = c === 'annual' ? 'Jahres' : 'Monats';
      const next = c === 'annual' ? 'Jahr' : 'Monat';
      return {
        subject: `Dein Stellify-Abo läuft in ${d} Tag${d === 1 ? '' : 'en'} ab`,
        title: `Dein ${cycle}sabo läuft bald ab`,
        lines: [
          `Hallo ${n},`,
          `dein ${cycle}s-Abonnement bei Stellify läuft in <strong>${d} Tag${d === 1 ? '' : 'en'}</strong> ab. Danach wird dein Konto automatisch auf den kostenlosen Plan umgestellt, ohne dass du etwas tun musst.`,
          `Möchtest du weiterhin alle Funktionen nutzen? Verlängere jetzt dein Abonnement und dein Zugang verlängert sich nahtlos um einen weiteren ${next}.`,
        ],
        cta: 'Jetzt verlängern',
      };
    },
    expired: (n, c) => {
      const cycle = c === 'annual' ? 'Jahres' : 'Monats';
      return {
        subject: 'Dein Stellify-Abo ist abgelaufen',
        title: 'Dein Abonnement ist abgelaufen',
        lines: [
          `Hallo ${n},`,
          `dein ${cycle}s-Abonnement bei Stellify ist abgelaufen. Dein Konto wurde automatisch auf den kostenlosen Plan umgestellt.`,
          `Du kannst jederzeit ein neues Abonnement abschliessen und sofort wieder vollen Zugriff auf alle Funktionen erhalten.`,
        ],
        cta: 'Neues Abo abschliessen',
      };
    },
    signoff: 'Das Stellify-Team',
  },
  FR: {
    upcoming: (n, d, c) => {
      const cycle = c === 'annual' ? 'annuel' : 'mensuel';
      const next  = c === 'annual' ? 'an' : 'mois';
      return {
        subject: `Ton abonnement Stellify expire dans ${d} jour${d === 1 ? '' : 's'}`,
        title: `Ton abonnement ${cycle} expire bientôt`,
        lines: [
          `Bonjour ${n},`,
          `ton abonnement ${cycle} Stellify expire dans <strong>${d} jour${d === 1 ? '' : 's'}</strong>. Ton compte passera automatiquement au plan gratuit, sans action de ta part.`,
          `Tu souhaites garder toutes les fonctionnalités? Renouvelle maintenant et ton accès se prolonge d'un ${next} supplémentaire.`,
        ],
        cta: 'Renouveler maintenant',
      };
    },
    expired: (n, c) => {
      const cycle = c === 'annual' ? 'annuel' : 'mensuel';
      return {
        subject: 'Ton abonnement Stellify a expiré',
        title: 'Ton abonnement a expiré',
        lines: [
          `Bonjour ${n},`,
          `ton abonnement ${cycle} Stellify a expiré. Ton compte est passé automatiquement au plan gratuit.`,
          `Tu peux souscrire à un nouvel abonnement à tout moment et retrouver immédiatement l'accès complet.`,
        ],
        cta: 'Reprendre un abonnement',
      };
    },
    signoff: 'L\'équipe Stellify',
  },
  IT: {
    upcoming: (n, d, c) => {
      const cycle = c === 'annual' ? 'annuale' : 'mensile';
      const next  = c === 'annual' ? 'anno' : 'mese';
      return {
        subject: `Il tuo abbonamento Stellify scade tra ${d} giorn${d === 1 ? 'o' : 'i'}`,
        title: `Il tuo abbonamento ${cycle} sta per scadere`,
        lines: [
          `Ciao ${n},`,
          `il tuo abbonamento ${cycle} a Stellify scade tra <strong>${d} giorn${d === 1 ? 'o' : 'i'}</strong>. Il tuo account passerà automaticamente al piano gratuito, senza alcuna azione necessaria.`,
          `Vuoi continuare a usare tutte le funzioni? Rinnova ora e l'accesso si estende di un altro ${next}.`,
        ],
        cta: 'Rinnova ora',
      };
    },
    expired: (n, c) => {
      const cycle = c === 'annual' ? 'annuale' : 'mensile';
      return {
        subject: 'Il tuo abbonamento Stellify è scaduto',
        title: 'Il tuo abbonamento è scaduto',
        lines: [
          `Ciao ${n},`,
          `il tuo abbonamento ${cycle} a Stellify è scaduto. Il tuo account è passato automaticamente al piano gratuito.`,
          `Puoi sottoscrivere un nuovo abbonamento in qualsiasi momento e riavere subito l'accesso completo.`,
        ],
        cta: 'Sottoscrivi di nuovo',
      };
    },
    signoff: 'Il team Stellify',
  },
  EN: {
    upcoming: (n, d, c) => {
      const cycle = c === 'annual' ? 'annual' : 'monthly';
      const next  = c === 'annual' ? 'year' : 'month';
      return {
        subject: `Your Stellify subscription expires in ${d} day${d === 1 ? '' : 's'}`,
        title: `Your ${cycle} plan is about to expire`,
        lines: [
          `Hello ${n},`,
          `your ${cycle} Stellify subscription expires in <strong>${d} day${d === 1 ? '' : 's'}</strong>. Your account will automatically switch to the free plan, no action needed from you.`,
          `Want to keep all features? Renew now and your access extends seamlessly for another ${next}.`,
        ],
        cta: 'Renew now',
      };
    },
    expired: (n, c) => {
      const cycle = c === 'annual' ? 'annual' : 'monthly';
      return {
        subject: 'Your Stellify subscription has expired',
        title: 'Your subscription has expired',
        lines: [
          `Hello ${n},`,
          `your ${cycle} Stellify subscription has expired. Your account was automatically switched to the free plan.`,
          `You can start a new subscription anytime and regain full access instantly.`,
        ],
        cta: 'Start new subscription',
      };
    },
    signoff: 'The Stellify team',
  },
};

async function sendRenewalReminder(to: string, firstName: string, planType: 'monthly' | 'annual', daysLeft: number, language: string = 'DE') {
  const lang = ((language || 'DE').toUpperCase() as Lang);
  const copy = RENEWAL_COPY[lang] || RENEWAL_COPY.DE;
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  const c = daysLeft > 0 ? copy.upcoming(firstName, daysLeft, planType) : copy.expired(firstName, planType);

  await sendEmail({
    to,
    subject: c.subject,
    html: buildEmailHtml(c.title, c.lines, c.cta, `${siteUrl}/?view=pricing`, lang),
    text: c.lines.join('\n\n').replace(/<[^>]+>/g, '') + `\n\n${c.cta}: ${siteUrl}/?view=pricing\n\n${copy.signoff}`,
  });
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

// Client-side crash reports — the app's error boundary posts here so we can
// SEE what broke on a visitor's device instead of guessing from screenshots.
// Public on purpose (crashes can hit logged-out visitors); the general rate
// limiter above already bounds abuse, payload is capped and sanitised.
app.post('/api/client-error', express.json({ limit: '8kb' }), async (req, res) => {
  try {
    const b = (req.body || {}) as Record<string, unknown>;
    const esc = (v: unknown, n: number) => String(v ?? '').slice(0, n).replace(/</g, '&lt;');
    const message = esc(b.message, 500);
    const url = esc(b.url, 300);
    const ua = esc(b.ua, 200);
    const stack = esc(b.stack, 1500);
    console.error('[CLIENT ERROR]', message, '| url:', url, '| ua:', ua, '| stack:', stack);
    alertOwnerOncePerDay(
      'client_error',
      '🟠 Stellify: Ein Besucher hat die Fehlerseite gesehen',
      `<p>Bei einem Besucher ist die App abgestürzt und die Fehlerseite erschien (die Seite lädt sich einmal automatisch neu, bevor sie sichtbar wird).</p>
       <p><b>Fehler:</b> ${message || 'unbekannt'}</p>
       <p><b>Seite:</b> ${url}</p>
       <p><b>Browser:</b> ${ua}</p>
       <p>Alle weiteren Fälle von heute stehen in den Vercel-Logs unter "CLIENT ERROR".</p>`
    ).catch(() => {});
  } catch { /* reporting must never fail loudly */ }
  res.json({ ok: true });
});

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
        // Prefer the exact period end from the subscription Stripe just
        // created; only fall back to arithmetic if it cannot be fetched.
        let expiresAt: Date | null = null;
        if (session.subscription) {
          try {
            const sub = await getStripe().subscriptions.retrieve(String(session.subscription));
            const periodEnd = (sub as any).current_period_end as number | undefined;
            if (periodEnd) expiresAt = new Date(periodEnd * 1000);
          } catch (e: any) {
            console.error('[WEBHOOK] could not fetch subscription period end:', e.message);
          }
        }
        if (!expiresAt) {
          const currentExpiry = existingUser?.subscription_expires_at;
          const baseDate = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
          expiresAt = new Date(baseDate);
          if (isAnnual) expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          else expiresAt.setMonth(expiresAt.getMonth() + 1);
        }
        await adminDb.collection('users').doc(userId).update({
          role: normaliseRole(planId),
          subscription_interval: isAnnual ? 'annual' : 'monthly',
          subscription_expires_at: expiresAt.toISOString(),
          stripe_customer_id: session.customer || null,
          // The paid period starts now — the visible monthly counter starts
          // at zero so the customer gets the full quota from day one.
          tool_uses: 0,
          search_uses: 0,
        });
        console.log(`[WEBHOOK] Role updated to ${normaliseRole(planId)} for ${userId}, expires ${expiresAt.toISOString()}`);
        if (existingUser?.email) {
          const planLabel = planId === 'ultimate' ? 'Karriere+' : 'Pro';
          const userLang = ((existingUser?.language || 'DE') as string).toUpperCase() as Lang;
          const localeMap: Record<Lang, string> = { DE: 'de-CH', FR: 'fr-CH', IT: 'it-CH', EN: 'en-GB' };
          const dateStr = expiresAt.toLocaleDateString(localeMap[userLang] || 'de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
          const firstName = existingUser.first_name || (userLang === 'DE' ? 'Nutzer' : userLang === 'FR' ? 'utilisateur' : userLang === 'IT' ? 'utente' : 'there');
          const genCount = planId === 'ultimate' ? '150' : '50';
          const planPerks: Record<Lang, string> = {
            DE: planId === 'ultimate'
              ? `Dir stehen jetzt <strong>${genCount} Generierungen pro Monat</strong>, alle exklusiven Premium-Designs und der persönliche E-Mail-Support offen.`
              : `Dir stehen jetzt <strong>${genCount} Generierungen pro Monat</strong>, der Stellen-Import per Link und alle Standard-Designs offen.`,
            FR: planId === 'ultimate'
              ? `Tu disposes maintenant de <strong>${genCount} générations par mois</strong>, de tous les designs Premium exclusifs et du support e-mail personnel.`
              : `Tu disposes maintenant de <strong>${genCount} générations par mois</strong>, de l'import d'annonces par lien et de tous les designs standard.`,
            IT: planId === 'ultimate'
              ? `Ora hai a disposizione <strong>${genCount} generazioni al mese</strong>, tutti i design Premium esclusivi e il supporto e-mail personale.`
              : `Ora hai a disposizione <strong>${genCount} generazioni al mese</strong>, l'import degli annunci da link e tutti i design standard.`,
            EN: planId === 'ultimate'
              ? `You now have <strong>${genCount} generations per month</strong>, every exclusive premium design and personal email support.`
              : `You now have <strong>${genCount} generations per month</strong>, job-ad import by link and every standard design.`,
          };
          const planWelcome: Record<Lang, { subject: string; title: string; lines: string[]; cta: string; signoff: string }> = {
            DE: {
              subject: `Willkommen im ${planLabel}-Plan, dein Stellify-Abo ist aktiv`,
              title:   `Willkommen im ${planLabel}-Plan`,
              lines: [
                `Hallo ${firstName},`,
                `danke für dein Vertrauen. Dein ${isAnnual ? 'Jahres' : 'Monats'}-Abonnement ist ab sofort aktiv.`,
                planPerks.DE,
                `Dein Abo verlängert sich automatisch und ist bis zum <strong>${dateStr}</strong> bezahlt. Verwalten oder kündigen kannst du es jederzeit mit einem Klick in deinem Profil unter <strong>Abo verwalten</strong>.`,
                `Ein Tipp für den Start: Lade deinen Lebenslauf hoch und füge einfach den Link eines Stelleninserats ein, den Rest übernimmt Stellify.`,
                `Wenn du Fragen hast oder etwas nicht rund läuft, antworte einfach auf diese E-Mail oder schreib an support.stellify@gmail.com. Wir melden uns persönlich.`,
              ],
              cta: 'Zum Dashboard',
              signoff: 'Das Stellify-Team',
            },
            FR: {
              subject: `Bienvenue dans le plan ${planLabel}, ton abonnement Stellify est actif`,
              title:   `Bienvenue dans le plan ${planLabel}`,
              lines: [
                `Bonjour ${firstName},`,
                `merci pour ta confiance. Ton abonnement ${isAnnual ? 'annuel' : 'mensuel'} est actif dès maintenant.`,
                planPerks.FR,
                `Ton abonnement se renouvelle automatiquement et est payé jusqu'au <strong>${dateStr}</strong>. Tu peux le gérer ou le résilier à tout moment en un clic dans ton profil sous <strong>Gérer l'abonnement</strong>.`,
                `Un conseil pour commencer : télécharge ton CV et colle simplement le lien d'une annonce, Stellify s'occupe du reste.`,
                `Si tu as des questions, réponds simplement à cet e-mail ou écris à support.stellify@gmail.com. Nous répondons personnellement.`,
              ],
              cta: 'Vers le tableau de bord',
              signoff: 'L\'équipe Stellify',
            },
            IT: {
              subject: `Benvenuto nel piano ${planLabel}, il tuo abbonamento Stellify è attivo`,
              title:   `Benvenuto nel piano ${planLabel}`,
              lines: [
                `Ciao ${firstName},`,
                `grazie per la tua fiducia. Il tuo abbonamento ${isAnnual ? 'annuale' : 'mensile'} è attivo da subito.`,
                planPerks.IT,
                `Il tuo abbonamento si rinnova automaticamente ed è pagato fino al <strong>${dateStr}</strong>. Puoi gestirlo o disdirlo in ogni momento con un clic nel tuo profilo sotto <strong>Gestisci abbonamento</strong>.`,
                `Un consiglio per iniziare: carica il tuo CV e incolla semplicemente il link di un annuncio, al resto pensa Stellify.`,
                `Se hai domande, rispondi semplicemente a questa e-mail o scrivi a support.stellify@gmail.com. Rispondiamo personalmente.`,
              ],
              cta: 'Vai alla dashboard',
              signoff: 'Il team Stellify',
            },
            EN: {
              subject: `Welcome to the ${planLabel} plan, your Stellify subscription is active`,
              title:   `Welcome to the ${planLabel} plan`,
              lines: [
                `Hello ${firstName},`,
                `thank you for your trust. Your ${isAnnual ? 'annual' : 'monthly'} subscription is active right away.`,
                planPerks.EN,
                `Your subscription renews automatically and is paid until <strong>${dateStr}</strong>. You can manage or cancel it any time with one click in your profile under <strong>Manage subscription</strong>.`,
                `A tip to get started: upload your CV and simply paste the link of a job ad, Stellify handles the rest.`,
                `If you have questions, just reply to this email or write to support.stellify@gmail.com. We answer personally.`,
              ],
              cta: 'Open dashboard',
              signoff: 'The Stellify team',
            },
          };
          const copy = planWelcome[userLang] || planWelcome.DE;
          await sendEmail({
            to: existingUser.email,
            subject: copy.subject,
            html: buildEmailHtml(copy.title, copy.lines, copy.cta, (process.env.SITE_URL || 'https://stellify.ch') + '/', userLang),
            text: `${copy.lines.join('\n\n').replace(/<[^>]+>/g, '')}\n\n${copy.signoff}`,
          }).catch(console.error);
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
        // Plan changes (Pro→Ultimate) replace the subscription: Stripe fires
        // a 'deleted' for the OLD sub while the NEW one is active. Blindly
        // downgrading here would strip a paying customer of access. Only
        // downgrade when no paid period is still running.
        const expiresAt = u.subscription_expires_at ? new Date(u.subscription_expires_at).getTime() : 0;
        if (expiresAt > Date.now()) {
          console.log(`[WEBHOOK] subscription.deleted for ${u.id} ignored — paid period active until ${u.subscription_expires_at} (likely plan change)`);
        } else {
          await adminDb.collection('users').doc(u.id).update({ role: 'client' });
          console.log(`[WEBHOOK] Downgraded ${u.id} to free after subscription deletion`);
          if (u.email) {
            const planType = u.subscription_interval === 'annual' ? 'annual' : 'monthly';
            await sendRenewalReminder(u.email, u.first_name || 'Nutzer', planType, 0, u.language || 'DE').catch(console.error);
          }
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
              await sendRenewalReminder(u.email, u.first_name || 'Nutzer', planType, daysLeft, u.language || 'DE').catch(console.error);
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
          // Stripe knows the exact next billing date (incl. month-end
          // quirks like Jan 31 -> Feb 28) — never compute it ourselves.
          const periodEnd = (sub as any).current_period_end as number | undefined;
          const expiresAt = periodEnd ? new Date(periodEnd * 1000) : (() => {
            const d = new Date();
            if (isAnnual) d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
            return d;
          })();
          await userDoc.ref.update({
            subscription_expires_at: expiresAt.toISOString(),
            // A new billing period starts now — the monthly quota starts
            // fresh with it (annual plans reset per calendar month instead).
            ...(isAnnual ? {} : { tool_uses: 0, search_uses: 0 }),
          });
          console.log(`[WEBHOOK] Renewed ${userDoc.id} until ${expiresAt.toISOString()}`);
        }
      } catch (err) {
        console.error(`[WEBHOOK] invoice.payment_succeeded handler failed:`, err);
      }
    }
  }

  // Payment failure — keep access but warn the user so they can update their card
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    if (invoice.subscription) {
      try {
        const { adminDb } = getAdminServices();
        const sub = await getStripe().subscriptions.retrieve(invoice.subscription as string);
        const customerId = sub.customer as string;
        const usersSnap = await adminDb.collection('users').where('stripe_customer_id', '==', customerId).limit(1).get();
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const u = userDoc.data() as any;
          const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
          if (u.email) {
            await sendEmail({
              to: u.email,
              subject: 'Stellify, deine Zahlung ist fehlgeschlagen',
              html: buildEmailHtml(
                'Zahlung fehlgeschlagen',
                [
                  `Hallo ${u.first_name || 'Nutzer'},`,
                  `wir konnten deine letzte Zahlung für dein Stellify-Abo nicht einziehen. Häufige Gründe sind eine abgelaufene Karte oder ein unzureichendes Guthaben.`,
                  `Bitte aktualisiere deine Zahlungsmethode in den nächsten Tagen, damit dein Zugang ohne Unterbrechung bestehen bleibt.`,
                ],
                'Zahlungsmethode aktualisieren',
                `${siteUrl}/?view=pricing`
              ),
              text: `Hallo ${u.first_name || 'Nutzer'},\n\ndeine Zahlung für dein Stellify-Abo ist fehlgeschlagen. Bitte aktualisiere deine Zahlungsmethode unter ${siteUrl}/?view=pricing\n\nDas Stellify-Team`,
            }).catch(console.error);
          }
          console.log(`[WEBHOOK] payment_failed notice sent to ${userDoc.id}`);
        }
      } catch (err) {
        console.error(`[WEBHOOK] invoice.payment_failed handler failed:`, err);
      }
    }
  }

  // First-time subscription creation (separate from checkout.session.completed for completeness)
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    try {
      const { adminDb } = getAdminServices();
      const customerId = sub.customer as string;
      const usersSnap = await adminDb.collection('users').where('stripe_customer_id', '==', customerId).limit(1).get();
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        // checkout.session.completed already set the role, just log here for auditability
        console.log(`[WEBHOOK] subscription.created for user ${userDoc.id}, status: ${sub.status}`);
      }
    } catch (err) {
      console.error(`[WEBHOOK] subscription.created handler failed:`, err);
    }
  }

  res.json({ received: true });
});

// Body limit raised from the 100 KB default: CV/photo uploads arrive as
// base64 JSON (a 3 MB PDF is ~4 MB encoded). Vercel caps request bodies at
// ~4.5 MB anyway, so 4.5mb is the practical ceiling, not a DoS risk.
app.use(express.json({ limit: '4.5mb' }));

// ── Gemini retry helper ───────────────────────────────────────────────────────
// Order matters: models with the highest FREE-tier quota come first so the app
// stays reliable without a paid key. gemini-2.0-flash = 1500 req/day free;
// 2.5-pro/2.5-flash have very low free limits and are kept as last resort.
const PRO_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro'];
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
      // Out of credits → privately alert the owner to top up (once/day).
      if (r.status === 402 || /insufficient\s*balance/i.test(body)) {
        alertOwnerOncePerDay(
          'empty_balance',
          '🔴 Stellify: DeepSeek-Guthaben aufgebraucht, bitte aufladen',
          `<p>Dein DeepSeek-Guthaben ist <b>leer</b>. Die KI läuft gerade über die Ersatz-Lösung (Google Gemini) weiter, aber bitte lade bald auf:</p>
           <p><a href="https://platform.deepseek.com/top_up">platform.deepseek.com/top_up</a></p>`
        ).catch(() => {});
      }
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
// Free users get 3 lifetime tries — then upgrade is required.
// Pro/Unlimited get generous monthly allowances with per-minute throttling.
// Plan limits — must stay in sync with what we tell users on the Pricing
// page, in Settings ("Dein Plan im Überblick"), the transparency section
// on the landing page and the dashboard tile. Adjusting any of these
// requires updating those copy strings too.
// One "generation" = one tool/AI request. Monthly is the headline limit;
// perDay equals perMonth (no separate daily friction — matches the clean
// "X Generierungen pro Monat" messaging), perMin is abuse protection only.
const QUOTA = {
  client:    { lifetime: 3 },
  pro:       { perMin: 15, perDay: 50,  perMonth: 50 },
  unlimited: { perMin: 30, perDay: 150, perMonth: 150 },
} as const;

// Hard daily ceiling on ALL AI calls combined (across every user) — the
// last line of defence against runaway cost (bug, abuse, DDoS). This is a
// TOTAL, not a per-user limit; each user's own plan quota is enforced
// separately in enforceAIQuota. Default 1500/day ≈ $22/day worst case:
// high enough that real customers never hit it, low enough to cap an
// attack. Override with the Vercel env GLOBAL_DAILY_CALL_CAP if needed.
const GLOBAL_DAILY_CALL_CAP = Math.max(50, Number(process.env.GLOBAL_DAILY_CALL_CAP) || 700);

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

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const u = userSnap.data() || {};
    let role = (u.role as string) || 'client';

    // Authoritative expiry check on EVERY AI request. Webhooks can be
    // missed (and the plan-change guard in subscription.deleted can skip a
    // legitimate downgrade), so the server must never honour a paid role
    // whose paid period is over. 24h grace absorbs renewal webhooks that
    // are still in flight at the period boundary, so a paying customer is
    // never blocked by clock skew.
    if ((role === 'pro' || role === 'unlimited') && u.subscription_expires_at) {
      const exp = new Date(u.subscription_expires_at).getTime();
      if (isFinite(exp) && exp + 24 * 3600 * 1000 < Date.now()) {
        role = 'client';
        userRef.update({ role: 'client' }).catch(() => {});
        console.log(`[QUOTA] ${uid} paid period expired ${u.subscription_expires_at} — treated as free`);
      }
    }

    if (role === 'client') {
      // Global daily cap protects the DeepSeek wallet from a free-tier surge
      // (e.g. the site goes viral): it applies to FREE users only. Paying
      // customers are never blocked by it — they have paid and are already
      // bounded by their own per-plan limits below. So a flood of free
      // sign-ups can cost at most GLOBAL_DAILY_CALL_CAP calls per day, and
      // it can never lock a subscriber out of what they paid for.
      const budgetOk = await checkGlobalBudget(adminDb);
      if (!budgetOk) {
        alertOwnerOncePerDay(
          'global_cap',
          '🟠 Stellify: Tageslimit der kostenlosen KI-Anfragen erreicht',
          `<p>Das gemeinsame Tageslimit von <b>${GLOBAL_DAILY_CALL_CAP}</b> kostenlosen KI-Anfragen wurde heute erreicht.</p>
           <p>Zahlende Kunden sind davon nicht betroffen, sie arbeiten normal weiter. Nur Gratis-Nutzer pausieren bis morgen.</p>
           <p>Das ist entweder sehr hohe (gute!) Nutzung, dann kannst du das Limit erhöhen (Vercel: <code>GLOBAL_DAILY_CALL_CAP</code>) und ggf. DeepSeek aufladen, oder ein Hinweis auf ungewöhnliche Nutzung, die du kurz prüfen solltest.</p>`
        ).catch(() => {});
        return res.status(503).json({
          error: 'Die kostenlosen Generierungen sind für heute stark gefragt. Bitte versuche es morgen erneut, oder hol dir Pro für sofortigen Zugang ohne Wartezeit.',
          retryAfter: 3600,
          upgrade: true,
        });
      }
      let used = u.ai_calls_lifetime || 0;
      // The free lifetime quota survives account deletion: a ledger keyed by
      // the e-mail fingerprint remembers consumed free calls, so
      // delete-and-re-register does not grant 3 fresh generations forever.
      const email = String(u.email || '').trim().toLowerCase();
      if (email && used < QUOTA.client.lifetime) {
        try {
          const ledgerRef = adminDb.collection('free_quota_ledger').doc(createHash('sha256').update(email).digest('hex'));
          const ledgerSnap = await ledgerRef.get();
          const carried = (ledgerSnap.data() || {}).used || 0;
          if (carried > used) {
            used = carried;
            // Keep the in-memory copy consistent so recordAIUsage counts on
            // from the carried value, and sync the visible counters so the
            // dashboard matches reality.
            u.ai_calls_lifetime = carried;
            userRef.update({ ai_calls_lifetime: carried, tool_uses: carried }).catch(() => {});
          }
        } catch (e: any) {
          console.error('[QUOTA] ledger read failed:', e.message);
        }
      }
      if (used >= QUOTA.client.lifetime) {
        return res.status(402).json({
          error: 'Die 3 kostenlosen Generierungen dieser E-Mail-Adresse sind aufgebraucht. Das Gratis-Kontingent gilt pro E-Mail-Adresse und bleibt auch nach dem Löschen eines Kontos verbraucht. Mit Pro erstellst du sofort weiter.',
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
  // Cheap, throttled: checks the DeepSeek balance at most once a day and
  // emails you if it's getting low. Fire-and-forget so it never slows a call.
  checkDeepSeekBalanceDaily().catch(() => {});
}

// ── Owner alerts (private — emailed to you, never shown on the website) ───────
// Set OWNER_ALERT_EMAIL in Vercel to your address. Optional:
// DEEPSEEK_LOW_BALANCE_USD (default 10) — the balance below which you get a
// heads-up email so you can top up before it runs out.
const OWNER_ALERT_EMAIL = process.env.OWNER_ALERT_EMAIL || 'support.stellify@gmail.com';
const DEEPSEEK_LOW_BALANCE_USD = Number(process.env.DEEPSEEK_LOW_BALANCE_USD) || 10;

// Email the owner at most once per calendar day per `key` (avoids spam).
async function alertOwnerOncePerDay(key: string, subject: string, html: string) {
  if (!OWNER_ALERT_EMAIL) return;
  try {
    const { adminDb } = getAdminServices();
    const ref = adminDb.collection('system').doc('alerts');
    const today = todayKey();
    const fresh = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      if (data[`${key}_date`] === today) return false; // already sent today
      tx.set(ref, { [`${key}_date`]: today }, { merge: true });
      return true;
    });
    if (!fresh) return;
    await sendEmail({ to: OWNER_ALERT_EMAIL, subject, html });
    console.log(`[OWNER ALERT] sent "${key}" to ${OWNER_ALERT_EMAIL}`);
  } catch (err: any) {
    console.error('[OWNER ALERT]', err.message);
  }
}

// Once a day, read the DeepSeek account balance and email you if it's low.
async function checkDeepSeekBalanceDaily() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || !OWNER_ALERT_EMAIL) return;
  try {
    const { adminDb } = getAdminServices();
    const ref = adminDb.collection('system').doc('alerts');
    const today = todayKey();
    const due = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      if (data.balance_checked_date === today) return false; // checked already today
      tx.set(ref, { balance_checked_date: today }, { merge: true });
      return true;
    });
    if (!due) return;
    const base = (process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com').replace(/\/$/, '');
    const r = await fetch(`${base}/user/balance`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!r.ok) return;
    const data: any = await r.json();
    const info = data?.balance_infos?.[0];
    const total = Number(info?.total_balance ?? NaN);
    if (!isFinite(total)) return;
    if (total < DEEPSEEK_LOW_BALANCE_USD) {
      await alertOwnerOncePerDay(
        'low_balance',
        `🟠 Stellify: DeepSeek-Guthaben niedrig (${info.currency || 'USD'} ${total.toFixed(2)})`,
        `<p>Dein DeepSeek-Guthaben ist auf <b>${info.currency || 'USD'} ${total.toFixed(2)}</b> gesunken.</p>
         <p>Bitte bald aufladen, damit die KI-Werkzeuge ohne Unterbruch weiterlaufen:</p>
         <p><a href="https://platform.deepseek.com/top_up">platform.deepseek.com/top_up</a></p>`
      );
    }
  } catch (err: any) {
    console.error('[BALANCE CHECK]', err.message);
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
  // Many tool briefings are written in German regardless of UI language.
  // This suffix makes sure the OUTPUT (incl. all headings) is in the user's language.
  const langEnforce: Record<string, string> = {
    DE: '',
    FR: ` IMPORTANT: La consigne ci-dessous peut être rédigée en allemand — ta réponse ENTIÈRE (y compris TOUS les titres de section) doit être en français. Traduis les titres de section allemands en français.`,
    IT: ` IMPORTANTE: Il briefing qui sotto può essere in tedesco — la tua INTERA risposta (compresi TUTTI i titoli di sezione) deve essere in italiano. Traduci i titoli di sezione tedeschi in italiano.`,
    EN: ` IMPORTANT: The briefing below may be written in German — your ENTIRE answer (including ALL section headings) must be in English. Translate any German section headings into English.`,
  };
  const systemInstruction = (langInstructions[language] || langInstructions.DE) + (langEnforce[language] || '');

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

// ── Job posting fetch from a URL ──────────────────────────────────────────────
// Takes a job-listing URL (Yousty, jobs.ch, a company careers page, anywhere),
// fetches it server-side (browsers can't, CORS), strips it to readable text and
// asks DeepSeek to extract structured fields. Pure DeepSeek — no Gemini needed.
// SSRF-guarded: only public http/https hosts, no localhost / private ranges.
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // IPv4 private / loopback / link-local ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  return false;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(nav|header|footer|svg|form|aside)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .trim();
}

app.post("/api/fetch-job", aiLimiter, requireAuth, async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL fehlt' });

  let parsed: URL;
  try { parsed = new URL(url.trim()); } catch { return res.status(400).json({ error: 'Ungültige URL' }); }
  if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ error: 'Nur http/https erlaubt' });
  if (isPrivateHost(parsed.hostname)) return res.status(400).json({ error: 'Diese Adresse ist nicht erlaubt' });

  // LinkedIn serves a login wall to non-authenticated server-side fetches
  // (HTTP 999 or an empty shell). We still try — sometimes the public
  // /jobs/view/ page renders — but when it fails we return a tailored hint
  // instead of the generic "page unreachable".
  const isLinkedIn = /(^|\.)linkedin\.com$/i.test(parsed.hostname);
  const linkedInHint = 'LinkedIn schützt Stelleninserate teils vor automatischem Laden. Öffne die Anzeige, kopiere den Text und füge ihn unten manuell ein, oder nutze einen Yousty-/jobs.ch-Link.';

  // This endpoint makes a DeepSeek call. It deliberately does NOT consume a
  // generation from the user's plan (importing a job is a helper step, not
  // the product), but it must not be a free unlimited AI hole either:
  //  1. global daily ceiling (same as every AI route)
  //  2. per-user daily cap of 15 imports — plenty for real use, ends abuse.
  try {
    const { adminDb } = getAdminServices();
    if (!(await checkGlobalBudget(adminDb))) {
      return res.status(503).json({ error: 'Kurze Pause, bitte in ein paar Stunden erneut versuchen.', needsManual: true });
    }
    const uid = (req as any).uid as string;
    const userRef = adminDb.collection('users').doc(uid);
    const snap = await userRef.get();
    const u = snap.data() || {};
    const today = todayKey();
    const used = u.fetchjob_today_date === today ? (u.fetchjob_today || 0) : 0;
    if (used >= 15) {
      return res.status(429).json({
        error: 'Tageslimit für Stellen-Importe erreicht (15). Füge den Text der Anzeige unten manuell ein.',
        needsManual: true,
      });
    }
    await userRef.set({ fetchjob_today: used + 1, fetchjob_today_date: today }, { merge: true });
  } catch { /* if the guard itself fails, fall through — don't block the user */ }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    let html = '';
    try {
      const r = await fetch(parsed.toString(), {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'de-CH,de;q=0.9,en;q=0.8',
        },
      });
      if (!r.ok) {
        clearTimeout(timer);
        return res.status(422).json({
          error: isLinkedIn ? linkedInHint : `Seite nicht erreichbar (${r.status})`,
          needsManual: true,
        });
      }
      html = await r.text();
    } finally { clearTimeout(timer); }

    const text = htmlToText(html).slice(0, 7000);
    if (text.length < 120) {
      return res.status(422).json({
        error: isLinkedIn ? linkedInHint : 'Konnte den Stelleninhalt nicht lesen. Bitte Text manuell einfügen.',
        needsManual: true,
      });
    }

    const { text: aiText } = await generateText({
      systemInstruction: 'Du extrahierst Stellenanzeigen-Daten und antwortest AUSSCHLIESSLICH mit kompaktem JSON, ohne Markdown.',
      userContent: `Hier ist der Textinhalt einer Stellenanzeige-Webseite. Extrahiere die relevanten Felder.\n\nText:\n"""${text}"""\n\nAntworte NUR mit diesem JSON (leere Felder als ""):\n{"company":"Firmenname","position":"Stellenbezeichnung","location":"Ort/Kanton","requirements":"Die wichtigsten Anforderungen und Aufgaben in 4-8 stichpunktartigen Zeilen, mit Zeilenumbrüchen getrennt"}`,
      temperature: 0.1,
      maxOutputTokens: 900,
    });

    // Count this AI call toward the global daily ceiling.
    try { await incrementGlobalBudget(getAdminServices().adminDb); } catch { /* non-fatal */ }

    const match = aiText.match(/\{[\s\S]*\}/);
    let data: any = {};
    if (match) { try { data = JSON.parse(match[0]); } catch { /* keep empty */ } }

    res.json({
      success: true,
      company: typeof data.company === 'string' ? data.company : '',
      position: typeof data.position === 'string' ? data.position : '',
      location: typeof data.location === 'string' ? data.location : '',
      requirements: typeof data.requirements === 'string' ? data.requirements : '',
      sourceUrl: parsed.toString(),
    });
  } catch (error: any) {
    const aborted = error?.name === 'AbortError';
    console.error('[FETCH-JOB ERROR]', (error?.message || error)?.toString().slice(0, 160));
    res.status(aborted ? 504 : 502).json({
      error: aborted ? 'Zeitüberschreitung beim Laden der Seite' : 'Seite konnte nicht geladen werden. Bitte Text manuell einfügen.',
      needsManual: true,
    });
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
      subject: 'Stellify, Passwort zurücksetzen',
      title: 'Passwort zurücksetzen',
      lines: ['Hallo,', 'du hast eine Anfrage gestellt, dein Passwort bei Stellify zurückzusetzen.', 'Klicke auf den Button unten um ein neues Passwort festzulegen. Der Link ist <strong>1 Stunde gültig</strong>.', 'Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren.'],
      cta: 'Passwort jetzt zurücksetzen',
    },
    FR: {
      subject: 'Stellify, réinitialiser votre mot de passe',
      title: 'Réinitialiser votre mot de passe',
      lines: ['Bonjour,', 'vous avez demandé la réinitialisation de votre mot de passe Stellify.', 'Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Le lien est valable <strong>1 heure</strong>.', 'Si vous n\'avez pas fait cette demande, ignorez simplement cet e-mail.'],
      cta: 'Réinitialiser maintenant',
    },
    IT: {
      subject: 'Stellify, reimposta la tua password',
      title: 'Reimposta la password',
      lines: ['Ciao,', 'hai richiesto il reset della password di Stellify.', 'Clicca sul pulsante qui sotto per impostare una nuova password. Il link è valido per <strong>1 ora</strong>.', 'Se non hai fatto questa richiesta, ignora semplicemente questa email.'],
      cta: 'Reimposta ora',
    },
    EN: {
      subject: 'Stellify, reset your password',
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
    await sendEmail({
      to: email,
      subject: copy.subject,
      html: buildEmailHtml(copy.title, copy.lines, copy.cta, resetLink, lang),
      text: copy.lines.join('\n\n').replace(/<[^>]+>/g, '') + `\n\n${copy.cta}: ${resetLink}\n\nDas Stellify-Team`,
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
    // Read the profile BEFORE deleting it — we need the Stripe customer id.
    const snap = await adminDb.collection('users').doc(uid).get();
    const profile = snap.data() || {};
    const customerId = profile.stripe_customer_id as string | undefined;
    // Remember consumed FREE generations under the e-mail fingerprint so a
    // re-registration with the same address cannot restart at 3 free calls.
    // Only the counter survives — no name, no CV, no personal content.
    try {
      const email = String(profile.email || (await adminAuth.getUser(uid)).email || '').trim().toLowerCase();
      const usedFree = Math.max(profile.ai_calls_lifetime || 0, profile.tool_uses || 0);
      if (email && usedFree > 0) {
        const ledgerRef = adminDb.collection('free_quota_ledger').doc(createHash('sha256').update(email).digest('hex'));
        const existing = ((await ledgerRef.get()).data() || {}).used || 0;
        await ledgerRef.set({ used: Math.max(existing, usedFree), updated_at: new Date().toISOString() });
      }
    } catch (e: any) {
      console.error('[DELETE ACCOUNT] quota ledger write failed:', e.message);
    }
    // Stop billing first: deleting the account must never leave a running
    // subscription silently charging a card nobody can manage anymore.
    if (customerId) {
      try {
        const subs = await getStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
        for (const s of subs.data) {
          if (s.status !== 'canceled' && s.status !== 'incomplete_expired') {
            await getStripe().subscriptions.cancel(s.id);
          }
        }
      } catch (e: any) {
        // Deletion still proceeds — but leave a loud trace for follow-up.
        console.error('[DELETE ACCOUNT] Stripe cancel failed for', customerId, e.message);
      }
    }
    // The tracker entries are personal data (companies, salaries) and fall
    // under the right to erasure — they go with the account.
    try {
      const apps = await adminDb.collection('applications').where('user_id', '==', uid).get();
      if (!apps.empty) {
        const batch = adminDb.batch();
        apps.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e: any) {
      console.error('[DELETE ACCOUNT] applications cleanup failed:', e.message);
    }
    // Uploaded files (CV, legacy avatars) are erased too — both for the
    // right to erasure and so deleted accounts never leave storage behind.
    try {
      const { adminStorage } = getAdminServices();
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const buckets = [...new Set([
        process.env.FIREBASE_STORAGE_BUCKET,
        projectId ? `${projectId}.firebasestorage.app` : undefined,
        projectId ? `${projectId}.appspot.com` : undefined,
      ].filter(Boolean))] as string[];
      for (const name of buckets) {
        for (const prefix of [`cv-files/${uid}/`, `avatars/${uid}/`]) {
          await adminStorage.bucket(name).deleteFiles({ prefix }).catch(() => {});
        }
      }
    } catch (e: any) {
      console.error('[DELETE ACCOUNT] storage cleanup failed:', e.message);
    }
    // Confirmation e-mail BEFORE the auth user is gone (we need the address).
    // Sent best-effort; a mail failure must never block the deletion.
    try {
      const email = String(profile.email || (await adminAuth.getUser(uid)).email || '').trim();
      const nm = (profile.first_name as string) || '';
      const lang = ((profile.language as string) || 'DE').toUpperCase();
      const dc: Record<string, { subject: string; title: string; lines: string[]; cta: string }> = {
        DE: { subject: 'Dein Stellify-Konto wurde gelöscht', title: 'Konto gelöscht', lines: [`Hallo ${nm},`, 'dein Stellify-Konto und alle damit verbundenen Daten wurden dauerhaft gelöscht. Ein allfälliges Abo wurde gekündigt, es wird nichts mehr abgebucht.', 'Es tut uns leid, dich gehen zu sehen. Du bist jederzeit willkommen zurück, ein neues Konto ist in einer Minute erstellt.'], cta: 'Zurück zu Stellify' },
        FR: { subject: 'Ton compte Stellify a été supprimé', title: 'Compte supprimé', lines: [`Bonjour ${nm},`, 'ton compte Stellify et toutes les données associées ont été supprimés définitivement. Tout abonnement éventuel a été résilié, plus aucun prélèvement ne sera effectué.', 'Nous sommes désolés de te voir partir. Tu es le/la bienvenu(e) à tout moment, un nouveau compte se crée en une minute.'], cta: 'Retour sur Stellify' },
        IT: { subject: 'Il tuo account Stellify è stato eliminato', title: 'Account eliminato', lines: [`Ciao ${nm},`, 'il tuo account Stellify e tutti i dati associati sono stati eliminati definitivamente. Un eventuale abbonamento è stato disdetto, non verrà più addebitato nulla.', 'Ci dispiace vederti andare. Sei sempre il benvenuto, un nuovo account si crea in un minuto.'], cta: 'Torna su Stellify' },
        EN: { subject: 'Your Stellify account has been deleted', title: 'Account deleted', lines: [`Hello ${nm},`, 'your Stellify account and all associated data have been permanently deleted. Any subscription has been cancelled and nothing further will be charged.', 'We are sorry to see you go. You are welcome back any time, a new account takes a minute to create.'], cta: 'Back to Stellify' },
      };
      const copy = dc[lang] || dc.DE;
      if (email) {
        await sendEmail({
          to: email,
          subject: copy.subject,
          html: buildEmailHtml(copy.title, copy.lines, copy.cta, (process.env.SITE_URL || 'https://stellify.ch') + '/', lang),
          text: copy.lines.join('\n\n').replace(/<[^>]+>/g, '') + '\n\nStellify',
        }).catch(() => {});
      }
    } catch (e: any) {
      console.error('[DELETE ACCOUNT] confirmation email failed:', e.message);
    }
    await adminDb.collection('users').doc(uid).delete();
    await adminAuth.deleteUser(uid);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[DELETE ACCOUNT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Onboarding email series (Vercel Cron, daily) ────────────────────────────
// Three gentle touches in the first week: day 1 a tip, day 3 the example,
// day 7 a soft upgrade nudge (skipped for paying users). Every mail is sent
// once, tracked by a flag on the user document.
function onboardingCopy(day: 1 | 3 | 7, name: string, lang: Lang) {
  const n = name || (lang === 'DE' ? 'du' : lang === 'FR' ? 'toi' : lang === 'IT' ? 'tu' : 'there');
  const site = process.env.SITE_URL || 'https://stellify.ch';
  const C: Record<number, Record<Lang, { subject: string; title: string; lines: string[]; cta: string; url: string }>> = {
    1: {
      DE: { subject: 'Der eine Tipp, der Stellify magisch macht', title: `Ein Tipp für dich, ${name || 'Willkommen'}`, lines: [`Hallo ${n},`, 'der schnellste Weg zur perfekten Bewerbung: Lade einmal deinen <strong>Lebenslauf</strong> hoch und füge dann einfach den <strong>Link eines Stelleninserats</strong> ein. Stellify liest die Stelle, nutzt deine Stärken und baut daraus in 60 Sekunden ein versandbereites Dokument.', 'Deine 3 Gratis-Bewerbungen warten auf dich.'], cta: 'Jetzt ausprobieren', url: site + '/' },
      FR: { subject: "L'astuce qui rend Stellify magique", title: `Une astuce pour toi`, lines: [`Bonjour ${n},`, "le chemin le plus rapide vers la candidature parfaite : télécharge une fois ton <strong>CV</strong>, puis colle simplement le <strong>lien d'une annonce</strong>. Stellify lit l'offre, utilise tes points forts et crée en 60 secondes un document prêt à envoyer.", 'Tes 3 candidatures gratuites t\'attendent.'], cta: 'Essayer maintenant', url: site + '/' },
      IT: { subject: 'Il consiglio che rende Stellify magico', title: 'Un consiglio per te', lines: [`Ciao ${n},`, 'la via più rapida alla candidatura perfetta: carica una volta il tuo <strong>CV</strong> e poi incolla semplicemente il <strong>link di un annuncio</strong>. Stellify legge l\'offerta, usa i tuoi punti di forza e crea in 60 secondi un documento pronto per l\'invio.', 'Le tue 3 candidature gratuite ti aspettano.'], cta: 'Prova ora', url: site + '/' },
      EN: { subject: 'The one tip that makes Stellify magic', title: 'A tip for you', lines: [`Hello ${n},`, 'the fastest way to a perfect application: upload your <strong>CV</strong> once, then simply paste the <strong>link of a job ad</strong>. Stellify reads the posting, uses your strengths and builds a ready-to-send document in 60 seconds.', 'Your 3 free applications are waiting.'], cta: 'Try it now', url: site + '/' },
    },
    3: {
      DE: { subject: 'Sieh dir an, was Stellify aus einer Bewerbung macht', title: 'Dein Beispiel wartet', lines: [`Hallo ${n},`, 'noch nicht dazu gekommen? Im Generator gibt es den Knopf <strong>„Mit Beispiel ausprobieren"</strong>: ein Klick, und du siehst eine komplette Schweizer Bewerbung mit Foto, fertig formatiert als PDF und Word. Ganz ohne eigene Daten.', 'Und im kostenlosen <strong>Ratgeber</strong> findest du vier Leitfäden, vom Lebenslauf bis zur Lohnverhandlung.'], cta: 'Beispiel ansehen', url: site + '/tools' },
      FR: { subject: 'Regarde ce que Stellify fait d\'une candidature', title: 'Ton exemple t\'attend', lines: [`Bonjour ${n},`, 'pas encore eu le temps ? Dans le générateur, le bouton <strong>« Essayer avec un exemple »</strong> te montre en un clic une candidature suisse complète avec photo, formatée en PDF et Word. Sans aucune donnée personnelle.', 'Et le <strong>guide gratuit</strong> contient quatre dossiers, du CV à la négociation salariale.'], cta: 'Voir l\'exemple', url: site + '/tools' },
      IT: { subject: 'Guarda cosa fa Stellify con una candidatura', title: 'Il tuo esempio ti aspetta', lines: [`Ciao ${n},`, 'non hai ancora avuto tempo? Nel generatore il pulsante <strong>«Prova con un esempio»</strong> ti mostra con un clic una candidatura svizzera completa con foto, formattata in PDF e Word. Senza dati personali.', 'E nella <strong>guida gratuita</strong> trovi quattro dossier, dal CV alla negoziazione dello stipendio.'], cta: 'Vedi l\'esempio', url: site + '/tools' },
      EN: { subject: 'See what Stellify makes of an application', title: 'Your example is waiting', lines: [`Hello ${n},`, 'not had time yet? In the generator, the <strong>"Try with example"</strong> button shows you a complete Swiss application with photo in one click, formatted as PDF and Word. No personal data needed.', 'And the free <strong>guides</strong> cover everything from the CV to salary negotiation.'], cta: 'See the example', url: site + '/tools' },
    },
    7: {
      DE: { subject: 'Deine 3 Gratis-Bewerbungen waren erst der Anfang', title: 'Bereit für mehr?', lines: [`Hallo ${n},`, 'eine Woche Stellify! Wenn du gerade aktiv am Bewerben bist: Mit <strong>Pro</strong> bekommst du 50 Generierungen pro Monat, den Stellen-Import per Link und alle Standard-Designs, für <strong>CHF 19.90 pro Monat</strong>.', 'Der Bewerbungs-Tracker bleibt für dich sowieso für immer gratis.', 'Das war die letzte Mail unserer kleinen Starthilfe. Danach hörst du von uns nur noch bei wichtigen Konto-Themen.'], cta: 'Pläne ansehen', url: site + '/pricing' },
      FR: { subject: 'Tes 3 candidatures gratuites n\'étaient que le début', title: 'Prêt pour la suite ?', lines: [`Bonjour ${n},`, 'une semaine avec Stellify ! Si tu postules activement : avec <strong>Pro</strong>, tu obtiens 50 générations par mois, l\'import d\'annonces par lien et tous les designs standard, pour <strong>CHF 19.90 par mois</strong>.', 'Le tracker de candidatures reste gratuit pour toujours.', 'C\'était le dernier e-mail de notre petit coup de pouce. Ensuite, tu n\'entendras parler de nous que pour des sujets importants liés à ton compte.'], cta: 'Voir les plans', url: site + '/pricing' },
      IT: { subject: 'Le tue 3 candidature gratuite erano solo l\'inizio', title: 'Pronto per di più?', lines: [`Ciao ${n},`, 'una settimana con Stellify! Se ti stai candidando attivamente: con <strong>Pro</strong> ottieni 50 generazioni al mese, l\'import degli annunci da link e tutti i design standard, per <strong>CHF 19.90 al mese</strong>.', 'Il tracker delle candidature resta gratuito per sempre.', 'Questa era l\'ultima e-mail del nostro piccolo aiuto iniziale. Poi ci sentirai solo per temi importanti del tuo account.'], cta: 'Vedi i piani', url: site + '/pricing' },
      EN: { subject: 'Your 3 free applications were just the start', title: 'Ready for more?', lines: [`Hello ${n},`, 'one week with Stellify! If you are actively applying: <strong>Pro</strong> gives you 50 generations per month, job-ad import by link and every standard design, for <strong>CHF 19.90 per month</strong>.', 'The application tracker stays free for you forever.', 'This was the last mail of our little starter series. After this you will only hear from us about important account matters.'], cta: 'See plans', url: site + '/pricing' },
    },
  };
  return C[day][lang] || C[day].DE;
}

// ── Admin newsletter ─────────────────────────────────────────────────────────
// Sends a hand-written newsletter to every account whose newsletter switch is
// on (default), optionally filtered to free or paying users. Owner-only.
app.post("/api/admin/send-newsletter", express.json(), requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid as string;
    const { adminAuth, adminDb } = getAdminServices();
    const requester = await adminAuth.getUser(uid);
    if ((requester.email || '').toLowerCase() !== 'support.stellify@gmail.com') {
      return res.status(403).json({ error: 'Nur der Inhaber darf Newsletter versenden.' });
    }
    const { subject, message, testOnly } = req.body as { subject?: string; message?: string; testOnly?: boolean };
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Betreff und Nachricht erforderlich.' });
    }
    const lines = message.trim().split(/\n{2,}/).map(s => s.replace(/\n/g, '<br />'));
    const optOut: Record<Lang, string> = {
      DE: 'Du erhältst diese Mail, weil der Abo-Letter in deinem Stellify-Profil aktiviert ist. Abschalten kannst du ihn jederzeit dort unter Datenschutz.',
      FR: "Tu reçois cet e-mail parce que l'Abo-Letter est activé dans ton profil Stellify. Tu peux le désactiver à tout moment sous Confidentialité.",
      IT: "Ricevi questa e-mail perché l'Abo-Letter è attivato nel tuo profilo Stellify. Puoi disattivarlo in ogni momento sotto Privacy.",
      EN: 'You receive this mail because the Abo-Letter is switched on in your Stellify profile. You can switch it off there anytime under privacy.',
    };
    const site = process.env.SITE_URL || 'https://stellify.ch';
    const lines0 = message.trim().split(/\n{2,}/).map(s => s.replace(/\n/g, '<br />'));
    // Test run: deliver the exact letter only to the owner mailbox.
    if (testOnly) {
      await sendEmail({
        to: 'support.stellify@gmail.com',
        subject: `[TEST] ${subject.trim()}`,
        html: buildEmailHtml(subject.trim(), [...lines0, `<span style="font-size:12px;color:#8a8a85">${optOut.DE}</span>`], 'Zu Stellify', site + '/', 'DE'),
        text: message.trim(),
      });
      return res.json({ ok: true, sent: 1, test: true });
    }
    const snap = await adminDb.collection('users').limit(2000).get();
    let sent = 0;
    for (const d of snap.docs) {
      const u = d.data() as any;
      if (!u.email || u.newsletter === false) continue;
      // Newsletters go to FREE users only — paying customers never receive
      // marketing mail of any kind.
      if (u.role !== 'client') continue;
      const lang = (['DE','FR','IT','EN'].includes(String(u.language || '').toUpperCase()) ? String(u.language).toUpperCase() : 'DE') as Lang;
      await sendEmail({
        to: u.email,
        subject: subject.trim(),
        html: buildEmailHtml(subject.trim(), [...lines, `<span style="font-size:12px;color:#8a8a85">${optOut[lang]}</span>`], 'Zu Stellify', site + '/', lang),
        text: message.trim() + '\n\n' + optOut[lang].replace(/<[^>]+>/g, ''),
      }).catch((e) => console.error('[NEWSLETTER] send failed for', u.email, e.message));
      sent++;
    }
    console.log(`[NEWSLETTER] "${subject.trim()}" sent to ${sent} free-plan recipients`);
    res.json({ ok: true, sent });
  } catch (e: any) {
    console.error('[NEWSLETTER]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/cron/onboarding", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { adminDb } = getAdminServices();
    const dayMs = 86400000;
    const now = Date.now();
    const stages = [
      { day: 1 as const, flag: 'ob_mail_1' },
      { day: 3 as const, flag: 'ob_mail_3' },
      { day: 7 as const, flag: 'ob_mail_7' },
    ];
    let sent = 0;
    for (const st of stages) {
      // Window is generously wide (2 days) so a missed cron run cannot skip
      // anyone; the per-user flag guarantees single delivery anyway.
      const startIso = new Date(now - (st.day + 2) * dayMs).toISOString();
      const endIso = new Date(now - st.day * dayMs).toISOString();
      const snap = await adminDb.collection('users')
        .where('created_at', '>=', startIso)
        .where('created_at', '<=', endIso)
        .limit(300)
        .get();
      for (const d of snap.docs) {
        const u = d.data() as any;
        if (!u.email || u[st.flag]) continue;
        if (u.newsletter === false) continue;
        if (st.day === 7 && u.role !== 'client') continue;
        const lang = (String(u.language || 'DE').toUpperCase() as Lang);
        const copy = onboardingCopy(st.day, u.first_name || '', ['DE','FR','IT','EN'].includes(lang) ? lang : 'DE');
        await sendEmail({
          to: u.email,
          subject: copy.subject,
          html: buildEmailHtml(copy.title, copy.lines, copy.cta, copy.url, lang),
          text: copy.lines.join('\n\n').replace(/<[^>]+>/g, '') + '\n\nStellify',
        }).catch((e) => console.error('[CRON ONBOARDING] send failed:', e.message));
        await d.ref.update({ [st.flag]: true });
        sent++;
      }
    }

    // ── Follow-up reminders from the tracker ────────────────────────────
    // Users set a reminder date on an application; until now it was only
    // visible when they happened to open the site. This mails the reminder
    // on its due day. Service mail tied to a date the user chose, so it is
    // sent regardless of the Abo-Letter setting. reminder_mailed_for stores
    // the date that was mailed — editing the date re-arms the reminder.
    let reminders = 0;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const windowStart = new Date(now - 3 * dayMs).toISOString().slice(0, 10);
      const appsSnap = await adminDb.collection('applications')
        .where('reminder_at', '>=', windowStart)
        .where('reminder_at', '<=', today)
        .limit(300)
        .get();
      const userCache = new Map<string, any>();
      for (const d of appsSnap.docs) {
        const a = d.data() as any;
        if (!a.user_id || a.archived) continue;
        if (a.reminder_mailed_for === a.reminder_at) continue;
        let u = userCache.get(a.user_id);
        if (u === undefined) {
          const uDoc = await adminDb.collection('users').doc(a.user_id).get();
          u = uDoc.exists ? uDoc.data() : null;
          userCache.set(a.user_id, u);
        }
        if (!u || !u.email) continue;
        const lang = (['DE','FR','IT','EN'].includes(String(u.language || '').toUpperCase()) ? String(u.language).toUpperCase() : 'DE') as Lang;
        const company = String(a.company || '').trim() || (lang === 'FR' ? 'ton entreprise' : lang === 'IT' ? 'la tua azienda' : lang === 'EN' ? 'your company' : 'deiner Firma');
        const position = String(a.position || '').trim();
        const rCopy = {
          DE: { subject: `Erinnerung: Nachfassen bei ${company}`, title: 'Zeit zum Nachfassen', lines: [`Hallo ${u.first_name || ''},`.trim() + ',', `du wolltest heute bei <strong>${company}</strong>${position ? ` (${position})` : ''} nachfassen. Ein kurzes, freundliches Mail oder ein Anruf zeigt echtes Interesse und hebt dich von anderen ab.`, 'Den aktuellen Stand findest du in deinem Bewerbungs-Tracker.'], cta: 'Tracker öffnen' },
          FR: { subject: `Rappel: relancer ${company}`, title: 'Le moment de relancer', lines: [`Bonjour ${u.first_name || ''},`.trim() + ',', `tu voulais relancer <strong>${company}</strong>${position ? ` (${position})` : ''} aujourd'hui. Un court message ou un appel montre un vrai intérêt.`, 'Tu trouves l\'état actuel dans ton suivi des candidatures.'], cta: 'Ouvrir le suivi' },
          IT: { subject: `Promemoria: follow-up con ${company}`, title: 'È il momento del follow-up', lines: [`Ciao ${u.first_name || ''},`.trim() + ',', `volevi fare un follow-up con <strong>${company}</strong>${position ? ` (${position})` : ''} oggi. Un breve messaggio o una chiamata dimostra vero interesse.`, 'Trovi lo stato attuale nel tuo tracker delle candidature.'], cta: 'Apri il tracker' },
          EN: { subject: `Reminder: follow up with ${company}`, title: 'Time to follow up', lines: [`Hello ${u.first_name || ''},`.trim() + ',', `you wanted to follow up with <strong>${company}</strong>${position ? ` (${position})` : ''} today. A short, friendly email or call shows real interest.`, 'You can find the current status in your application tracker.'], cta: 'Open tracker' },
        }[lang];
        await sendEmail({
          to: u.email,
          subject: rCopy.subject,
          html: buildEmailHtml(rCopy.title, rCopy.lines, rCopy.cta, `${process.env.SITE_URL || 'https://stellify.ch'}/`, lang),
          text: rCopy.lines.join('\n\n').replace(/<[^>]+>/g, '') + '\n\nStellify',
        }).catch((e) => console.error('[CRON REMINDER] send failed:', e.message));
        await d.ref.update({ reminder_mailed_for: a.reminder_at });
        reminders++;
      }
    } catch (e: any) {
      // Reminders must never break the onboarding part of the cron.
      console.error('[CRON REMINDER]', e.message);
    }

    console.log(`[CRON ONBOARDING] sent ${sent} mails, ${reminders} follow-up reminders`);
    res.json({ ok: true, sent, reminders });
  } catch (e: any) {
    console.error('[CRON ONBOARDING]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Welcome Email ─────────────────────────────────────────────────────────────
app.post("/api/send-welcome-email", emailLimiter, async (req, res) => {
  const { email, firstName, language } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  const name = firstName || '';
  const lang = language || 'DE';
  const welcomeCopy: Record<string, { subject: string; title: string; lines: string[]; cta: string }> = {
    DE: {
      subject: 'Willkommen bei Stellify, deine KI-Bewerbung für die Schweiz',
      title: `Willkommen bei Stellify, ${name}!`,
      lines: [`Hallo ${name},`, 'dein Konto ist erstellt. Schön, dass du da bist.', 'Mit dem <strong>Gratis-Plan</strong> hast du <strong>3 Generierungen</strong>, um Stellify auszuprobieren: Erstelle mit dem <strong>Bewerbungs-Generator</strong> eine vollständige, auf die Stelle zugeschnittene Bewerbung als PDF und Word. Der <strong>Bewerbungs-Tracker</strong> ist dauerhaft gratis und behält alle deine Bewerbungen im Blick.', 'Lade deinen Lebenslauf hoch, damit alles noch persönlicher wird. Wann immer du mehr brauchst, wechselst du zu Pro oder Karriere+.'],
      cta: 'Jetzt loslegen',
    },
    FR: {
      subject: 'Bienvenue sur Stellify, ton IA de candidature pour la Suisse',
      title: `Bienvenue sur Stellify, ${name}!`,
      lines: [`Bonjour ${name},`, 'ton compte est créé. Ravis de t\'accueillir.', 'Avec le <strong>plan gratuit</strong>, tu as <strong>3 générations</strong> pour essayer Stellify : crée une candidature complète et sur mesure en PDF et Word avec le <strong>Générateur de candidatures</strong>. Le <strong>Suivi des candidatures</strong> est gratuit pour toujours et garde toutes tes candidatures en vue.', 'Télécharge ton CV pour un résultat encore plus personnel. Quand tu en as besoin, passe à Pro ou Karriere+.'],
      cta: 'Commencer maintenant',
    },
    IT: {
      subject: 'Benvenuto su Stellify, la tua IA di candidatura per la Svizzera',
      title: `Benvenuto su Stellify, ${name}!`,
      lines: [`Ciao ${name},`, 'il tuo account è stato creato. Felici di averti qui.', 'Con il <strong>piano gratuito</strong> hai <strong>3 generazioni</strong> per provare Stellify: crea una candidatura completa e su misura in PDF e Word con il <strong>Generatore di candidature</strong>. Il <strong>Tracker candidature</strong> è gratuito per sempre e tiene d\'occhio tutte le tue candidature.', 'Carica il tuo CV per un risultato ancora più personale. Quando ti serve, passa a Pro o Karriere+.'],
      cta: 'Inizia ora',
    },
    EN: {
      subject: 'Welcome to Stellify, your application AI for Switzerland',
      title: `Welcome to Stellify, ${name}!`,
      lines: [`Hello ${name},`, 'your account is ready. Great to have you.', 'On the <strong>free plan</strong> you have <strong>3 generations</strong> to try Stellify: create a complete, job-tailored application as PDF and Word with the <strong>Application Generator</strong>. The <strong>Application Tracker</strong> is free forever and keeps every application in view.', 'Upload your CV to make everything even more personal. Whenever you need more, switch to Pro or Karriere+.'],
      cta: 'Get started now',
    },
  };
  const copy = welcomeCopy[lang] || welcomeCopy['DE'];
  try {
    await sendEmail({
      to: email,
      subject: copy.subject,
      html: buildEmailHtml(copy.title, copy.lines, copy.cta, `${siteUrl}/`, lang),
      text: copy.lines.join('\n\n').replace(/<[^>]+>/g, '') + `\n\n${copy.cta}: ${siteUrl}/\n\nDas Stellify-Team`,
    });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[AUTH] Welcome email failed:', err.message);
    // Don't fail registration if email sending fails
    res.json({ ok: true });
  }
});

// ── Test Email ────────────────────────────────────────────────────────────────
const TEST_EMAIL_COPY: Record<string, { subject: string; title: string; lines: string[]; cta: string; signoff: string }> = {
  DE: {
    subject: 'Stellify, Test-E-Mail',
    title: 'Test-E-Mail',
    lines: ['Hallo,', 'dies ist eine Test-E-Mail von Stellify, um zu bestätigen dass der E-Mail-Versand korrekt konfiguriert ist.'],
    cta: 'Zur Website',
    signoff: 'Das Stellify-Team',
  },
  FR: {
    subject: 'Stellify, e-mail de test',
    title: 'E-mail de test',
    lines: ['Bonjour,', 'ceci est un e-mail de test de Stellify pour confirmer que l\'envoi d\'e-mails est correctement configuré.'],
    cta: 'Vers le site',
    signoff: 'L\'équipe Stellify',
  },
  IT: {
    subject: 'Stellify, email di test',
    title: 'Email di test',
    lines: ['Ciao,', 'questa è un\'email di test da Stellify per confermare che l\'invio di email è configurato correttamente.'],
    cta: 'Vai al sito',
    signoff: 'Il team Stellify',
  },
  EN: {
    subject: 'Stellify, test email',
    title: 'Test email',
    lines: ['Hello,', 'this is a test email from Stellify to confirm that email delivery is correctly configured.'],
    cta: 'Open website',
    signoff: 'The Stellify team',
  },
};

async function handleTestEmail(to: string, language: string, res: any) {
  if (!to) return res.status(400).json({ error: 'Missing "to" address' });
  const copy = TEST_EMAIL_COPY[language] || TEST_EMAIL_COPY['DE'];
  try {
    const ok = await sendEmail({
      to,
      subject: copy.subject,
      html: buildEmailHtml(
        copy.title,
        copy.lines,
        copy.cta,
        process.env.SITE_URL || 'https://stellify.ch',
        language
      ),
      text: `${copy.lines.join('\n\n')}\n\n${copy.signoff}`,
    });
    if (!ok) return res.status(500).json({ error: 'No email provider configured' });
    res.json({ ok: true, sentTo: to, provider: process.env.RESEND_API_KEY ? 'resend' : 'gmail', language });
  } catch (err: any) {
    console.error('[EMAIL] Test email failed:', err.message);
    res.status(500).json({ error: err.message });
  }
}
app.get("/api/send-test-email", async (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.query.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });
  const to = (req.query.to as string) || process.env.EMAIL_USER || '';
  const lang = ((req.query.language as string) || 'DE').toUpperCase();
  await handleTestEmail(to, lang, res);
});
app.post("/api/send-test-email", emailLimiter, requireAuth, async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const to = req.body?.to || emailUser || '';
  const lang = (req.body?.language || 'DE').toString().toUpperCase();
  await handleTestEmail(to, lang, res);
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


// ── Stripe Checkout ───────────────────────────────────────────────────────────
app.post("/api/create-checkout-session", express.json(), requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const mode = stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
  try {
    const { planId, billingCycle, successUrl, cancelUrl } = req.body || {};
    // Derive the user from the verified Firebase token — never from the body.
    // (client_reference_id decides which account the webhook upgrades, so a
    // body-supplied id would let a caller attach a payment to any account.)
    const userId = (req as any).uid as string;

    if (!planId || !userId || !billingCycle) {
      res.status(400).json({ error: "Fehlende Parameter: planId oder billingCycle" });
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

    // Guard against double subscriptions: if the user already has a running
    // subscription, a second checkout would bill them twice. Instead we swap
    // the price on the EXISTING subscription (up- or downgrade with
    // proration) and never create a parallel one.
    try {
      const { adminDb } = getAdminServices();
      const userSnap = await adminDb.collection('users').doc(userId).get();
      const customerId = (userSnap.data() || {}).stripe_customer_id as string | undefined;
      if (customerId) {
        const subs = await stripeClient.subscriptions.list({ customer: customerId, status: 'active', limit: 5 });
        const active = subs.data[0];
        if (active) {
          const item = active.items.data[0];
          if (item?.price?.id === priceId) {
            return res.status(400).json({ error: 'Dieser Plan ist bereits aktiv.' });
          }
          const updated = await stripeClient.subscriptions.update(active.id, {
            items: [{ id: item.id, price: priceId }],
            proration_behavior: 'always_invoice',
            cancel_at_period_end: false,
            metadata: { planId, billingCycle },
          });
          const periodEnd = (updated as any).current_period_end as number | undefined;
          await adminDb.collection('users').doc(userId).update({
            role: normaliseRole(planId),
            subscription_interval: isAnnual ? 'annual' : 'monthly',
            ...(periodEnd ? { subscription_expires_at: new Date(periodEnd * 1000).toISOString() } : {}),
          });
          console.log(`[STRIPE] plan switched in place for ${userId}: ${item?.price?.id} -> ${priceId}`);
          return res.json({ success: true, upgraded: true, planId });
        }
      }
    } catch (guardErr: any) {
      // If the guard itself fails we must NOT fall through to a second
      // subscription — that is the exact bug this exists to prevent.
      console.error('[STRIPE] double-subscription guard failed:', guardErr.message);
      return res.status(500).json({ error: 'Planwechsel momentan nicht möglich. Bitte versuch es später erneut.' });
    }

    // Premium positioning: no discount / promo-code field at checkout.
    // (An optional STRIPE_LAUNCH_COUPON can still auto-apply a coupon if
    // ever set, but nothing is shown to the customer by default.)
    const launchCoupon = (process.env.STRIPE_LAUNCH_COUPON || '').trim();
    const promoConfig = launchCoupon ? { discounts: [{ coupon: launchCoupon }] } : {};

    const session = await stripeClient.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      metadata: { planId, billingCycle, interval: isAnnual ? 'year' : 'month' },
      subscription_data: { metadata: { planId, billingCycle } },
      ...promoConfig,
      success_url: successUrl || `${origin}?payment=success`,
      cancel_url:  cancelUrl  || `${origin}?view=pricing`,
    });

    res.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error(`[STRIPE ERROR] mode=${mode} type=${err.type} code=${err.code} msg=${err.message}`);
    res.status(500).json({ success: false, error: `[${mode}] ${err.message || 'Unbekannter Stripe-Fehler'}` });
  }
});

// ── Stripe Billing Portal ─────────────────────────────────────────────────────
// Lets a subscriber manage or cancel their subscription themselves. This is
// what makes the "Jederzeit kündbar" promise on the pricing page true.
app.post("/api/create-portal-session", express.json(), requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid as string;
    const { adminDb } = getAdminServices();
    const snap = await adminDb.collection('users').doc(uid).get();
    const customerId = (snap.data() || {}).stripe_customer_id as string | undefined;
    if (!customerId) {
      return res.status(404).json({ error: 'Kein aktives Abo gefunden.' });
    }
    const origin = String(req.headers.origin || process.env.SITE_URL || 'https://stellify.ch');
    const stripeClient = getStripe();
    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });
    res.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error('[STRIPE PORTAL]', err.message);
    res.status(500).json({ error: 'Abo-Verwaltung konnte nicht geöffnet werden. Bitte kontaktiere den Support.' });
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
    // The client has its own fallback path and only checks `success` — a
    // 200 keeps this optional feature out of the 5xx error metrics.
    res.json({ success: false, roadmap: [] });
  }
});

// ── CV File Storage (Firebase Storage) ───────────────────────────────────────
// Tight upload limiter: CV changes are rare, so 10 per 15 minutes is plenty
// for humans and useless for storage-abuse scripts.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
app.post("/api/upload-cv", uploadLimiter, requireAuth, async (req, res) => {
  const { base64, fileName, mimeType } = req.body;
  const uid = (req as any).uid;
  if (!base64 || !fileName) return res.status(400).json({ error: "base64 und fileName erforderlich" });
  // Only document types a CV can be — anything else is refused.
  const allowed = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]);
  if (mimeType && !allowed.has(String(mimeType))) {
    return res.status(400).json({ error: 'Nur PDF, Word oder Text' });
  }
  if ((base64.length * 3) / 4 > 8 * 1024 * 1024) {
    return res.status(413).json({ error: 'Datei ist grösser als 8 MB' });
  }

  try {
    const { adminDb, adminStorage } = getAdminServices();
    const buffer = Buffer.from(base64, 'base64');
    const safeName = `cv-files/${uid}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // One CV per user: remember the old path, then replace it. Without this
    // every upload would pile another file onto storage forever.
    const prevPath = ((await adminDb.collection('users').doc(uid).get()).data() || {}).cv_file_path as string | undefined;

    const { url, bucket } = await saveToStorage(adminStorage, safeName, buffer, mimeType || 'application/octet-stream');

    await adminDb.collection('users').doc(uid).update({ cv_file_path: safeName }).catch(console.error);
    if (prevPath && prevPath !== safeName) {
      adminStorage.bucket(bucket).file(prevPath).delete().catch(() => {});
    }

    res.json({ success: true, path: safeName, url });
  } catch (error: any) {
    console.error("[CV UPLOAD ERROR]", error);
    res.status(500).json({ error: 'Der Upload ist im Moment nicht möglich. Bitte versuch es später erneut.' });
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
  const { to, subject, body, fromName, language } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject und body sind erforderlich' });

  const lang = ((language || 'DE') as string).toUpperCase() as Lang;
  const jobCopy: Record<Lang, { badge: string; tagline: string; defaultFromName: string; htmlLang: string }> = {
    DE: { badge: 'Bewerbung', tagline: 'Erstellt mit',                defaultFromName: 'Stellify Bewerbung',   htmlLang: 'de' },
    FR: { badge: 'Candidature', tagline: 'Créé avec',                  defaultFromName: 'Stellify Candidature',  htmlLang: 'fr' },
    IT: { badge: 'Candidatura', tagline: 'Creato con',                 defaultFromName: 'Stellify Candidatura',  htmlLang: 'it' },
    EN: { badge: 'Application', tagline: 'Created with',               defaultFromName: 'Stellify Application',  htmlLang: 'en' },
  };
  const taglineSuffix: Record<Lang, string> = {
    DE: '· Schweizer KI-Karriere-Plattform',
    FR: '· la plateforme suisse de carrière par IA',
    IT: '· la piattaforma svizzera di carriera AI',
    EN: '· the Swiss AI career platform',
  };
  const copy = jobCopy[lang] || jobCopy.DE;
  const siteUrl = process.env.SITE_URL || 'https://stellify.ch';
  const htmlBody = body
    .split('\n')
    .map((line: string) => line.trim() ? `<p style="margin:0 0 14px;font-size:15px;color:#1A1A18;line-height:1.7;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<br/>')
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .jm-bg     { background:#1A1A18 !important; }
      .jm-card   { background:#23231F !important; border-color:#3A3A35 !important; }
      .jm-text   { color:#FAFAF8 !important; }
      .jm-muted  { color:#9A9A94 !important; }
      .jm-footer { border-color:#3A3A35 !important; }
      .jm-link   { color:#6FCF97 !important; }
    }
  </style>
</head>
<body class="jm-bg" style="margin:0;padding:0;background:#F5F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" class="jm-bg" style="background:#F5F4F0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" class="jm-card" style="background:#FDFCFB;border:1px solid #E8E6E0;max-width:600px;width:100%;">
        <tr><td style="background:#004225;padding:24px 40px;">
          <span style="font-family:Georgia,serif;font-size:22px;color:#FDFCFB;letter-spacing:-0.5px;">Stell<span style="color:#6FCF97;">ify</span></span>
          <span style="font-size:11px;color:#6FCF97;margin-left:16px;font-family:Helvetica,Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">${copy.badge}</span>
        </td></tr>
        <tr><td class="jm-text" style="padding:40px 40px 32px;color:#1A1A18;">
          ${htmlBody}
        </td></tr>
        <tr><td class="jm-footer" style="padding:16px 40px 28px;border-top:1px solid #E8E6E0;">
          <p class="jm-muted" style="margin:0;font-size:11px;color:#9A9A94;">${copy.tagline} <a href="${siteUrl}" class="jm-link" style="color:#004225;text-decoration:none;">Stellify</a> ${taglineSuffix[lang]}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@stellify.ch';
    const ok = await sendEmail({
      to,
      subject,
      html,
      text: body,
    });
    if (!ok) return res.status(500).json({ error: 'No email provider configured' });
    console.log(`[JOB EMAIL] Sent to ${to} (from=${fromName || copy.defaultFromName}, via=${fromAddress})`);
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
