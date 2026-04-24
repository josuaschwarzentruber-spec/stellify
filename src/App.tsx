/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { 
  TrendingUp,
  Globe,
  Play,
  Download,
  Settings,
  LogOut,
  Send,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Star,
  Menu,
  User as UserIcon,
  Lock,
  Mail,
  Sparkles,
  Search, Shield, FileText, AlertCircle, Info,
  Quote, Coins, Cpu, ShieldCheck, Target, Layout, Mic, GraduationCap, Rocket, Award, RefreshCw, Linkedin, Share2, Sun, Moon, ChevronDown,
  Plus, Trash2, Edit2, MoreVertical, Briefcase, MapPin, DollarSign, Calendar, Compass,
  Upload, FileUp, Copy, Eye, EyeOff, Lightbulb, Wrench, HelpCircle, Command, Activity,
  Headphones, Radio, ChevronLeft, BarChart3, CreditCard, Instagram, Image as ImageIcon
} from 'lucide-react';
import { supabase } from './supabase';
import { searchData, SearchItem } from './data/searchData';
import sampleJobs from './data/sampleJobs.json';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';

import Markdown from 'react-markdown';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PRO_MODEL = "gemini-2.5-pro";
const FLASH_MODEL = "gemini-2.5-flash";

// --- TYPES ---
interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  freeGenerationsUsed?: number;
  toolUses?: number;
  dailyToolUses?: number;
  lastDailyReset?: string;
  lastMonthlyReset?: string;
  searchUses?: number;
  cvContext?: string;
  role?: 'client' | 'admin' | 'pro' | 'unlimited';
  hasSeenTutorial?: boolean;
  subscriptionExpiresAt?: string;
  subscriptionInterval?: 'monthly' | 'annual';
  stripeCustomerId?: string;
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-12 text-center">
          <div className="max-w-md space-y-6">
            <h1 className="text-3xl font-serif text-[#004225]">Ein unerwarteter Fehler ist aufgetreten.</h1>
            <p className="text-sm text-[#5C5C58] font-light leading-relaxed">
              Bitte entschuldigen Sie die Unannehmlichkeit. Wir arbeiten bereits an einer Lösung.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#004225] text-white px-8 py-3 text-sm font-medium hover:bg-[#00331d] transition-all"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function handleDbError(error: unknown, operation: string, path: string | null) {
  console.error(`DB Error (non-fatal) [${operation}] ${path}:`, error instanceof Error ? error.message : String(error));
}

// --- LAZY COMPONENTS ---
const LazyVideo = ({ src, className, ...props }: any) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "200px" });

  return (
    <div ref={ref} className={className}>
      {isInView && (
        <video 
          src={src} 
          {...props} 
          className="w-full h-full object-cover opacity-30"
        />
      )}
    </div>
  );
};

// --- PROMO SEQUENCE COMPONENT ---
const PromoSequence = ({ onComplete, t, language }: { onComplete: () => void, t: any, language: string }) => {
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % totalSteps);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const isFR = language === 'FR';
  const isIT = language === 'IT';
  const isEN = language === 'EN';

  const steps = [
    {
      title: isFR ? "Précision à chaque ligne." : isIT ? "Precisione in ogni riga." : isEN ? "Precision in every line." : "Präzision in jeder Zeile.",
      subtitle: isFR ? "Votre co-pilote de carrière suisse." : isIT ? "Il tuo co-pilota di carriera svizzero." : isEN ? "Your Swiss Career Co-Pilot." : "Dein Schweizer Karriere-Copilot.",
      icon: <Target className="w-16 h-16 text-[#004225]" />,
      desc: isFR ? "Nous comprenons le marché suisse de l'emploi comme personne d'autre." : isIT ? "Capiamo il mercato del lavoro svizzero come nessun altro." : isEN ? "We understand the Swiss job market like no one else." : "Wir verstehen den Schweizer Arbeitsmarkt wie kein anderer."
    },
    {
      title: isFR ? "Optimisation de CV 2.0" : isIT ? "Ottimizzazione CV 2.0" : isEN ? "CV Optimisation 2.0" : "CV Optimierung 2.0",
      subtitle: isFR ? "Sécurisé ATS & design percutant." : isIT ? "ATS-sicuro & design potente." : isEN ? "ATS-proof & design-strong." : "ATS-sicher & Design-stark.",
      icon: <FileText className="w-16 h-16 text-[#004225]" />,
      desc: isFR ? "Votre CV ne sera pas seulement lu, il sera admiré." : isIT ? "Il tuo CV non sarà solo letto, sarà ammirato." : isEN ? "Your CV won't just be read — it will be admired." : "Dein Lebenslauf wird nicht nur gelesen, er wird bewundert."
    },
    {
      title: "Stella AI",
      subtitle: isFR ? "Votre conseillère personnelle." : isIT ? "La tua consulente personale." : isEN ? "Your personal advisor." : "Deine persönliche Beraterin.",
      icon: <Sparkles className="w-16 h-16 text-[#004225]" />,
      desc: isFR ? "Feedback en temps réel et stratégies pour votre succès." : isIT ? "Feedback in tempo reale e strategie per il tuo successo." : isEN ? "Real-time feedback and strategies for your success." : "Echtzeit-Feedback und Strategien für deinen Erfolg."
    },
    {
      title: isFR ? "Analyse salariale" : isIT ? "Analisi stipendio" : isEN ? "Salary Insights" : "Lohn-Check & Insights",
      subtitle: isFR ? "Sachez ce que vous valez." : isIT ? "Sai quanto vali." : isEN ? "Know your worth." : "Wisse, was du wert bist.",
      icon: <Coins className="w-16 h-16 text-[#004225]" />,
      desc: isFR ? "Des données transparentes pour votre prochaine négociation." : isIT ? "Dati trasparenti per la tua prossima negoziazione." : isEN ? "Transparent data for your next salary negotiation." : "Transparente Daten für deine nächste Verhandlung."
    },
    {
      title: isFR ? "Prêt pour la réussite ?" : isIT ? "Pronto per il successo?" : isEN ? "Ready for the next level?" : "Bereit für den Aufstieg?",
      subtitle: isFR ? "Stellify est votre partenaire." : isIT ? "Stellify è il tuo partner." : isEN ? "Stellify is your partner." : "Stellify ist dein Partner.",
      icon: <Rocket className="w-16 h-16 text-[#004225]" />,
      desc: isFR ? "Commencez maintenant et décrochez le job de vos rêves." : isIT ? "Inizia ora e ottieni il lavoro dei tuoi sogni." : isEN ? "Start now and land your dream job." : "Starte jetzt und sichere dir deinen Traumjob."
    }
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-12"
        >
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative shadow-[0_0_50px_rgba(0,66,37,0.3)]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {steps[step].icon}
              </motion.div>
              <div className="absolute inset-0 rounded-full border border-[#004225]/20 animate-ping" />
            </div>
          </div>

          <div className="space-y-6 bg-black/20 backdrop-blur-md p-8 md:p-16 border border-white/5 shadow-2xl">
            <motion.h2 
              className="text-5xl lg:text-7xl font-serif text-white leading-tight tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {steps[step].title}
            </motion.h2>
            <motion.p 
              className="text-2xl lg:text-3xl text-[#00C060] font-light italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {steps[step].subtitle}
            </motion.p>
            <motion.p 
              className="text-white/70 text-lg max-w-2xl mx-auto font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {steps[step].desc}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicators */}
      <div className="mt-24 flex gap-3 justify-center w-full">
        {steps.map((_, i) => (
          <div 
            key={i}
            className={`h-0.5 transition-all duration-500 rounded-full ${i === step ? 'w-12 bg-white' : 'w-4 bg-white/25'}`}
          />
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        onClick={onComplete}
        className="mt-16 px-12 py-5 bg-white text-black text-xs font-bold uppercase tracking-[0.3em] hover:bg-[#004225] hover:text-white transition-all"
      >
        Jetzt Starten
      </motion.button>
    </div>
  );
};

// --- ONBOARDING TUTORIAL COMPONENT ---
const OnboardingTutorial = ({ onComplete, t }: { onComplete: () => void, t: any }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: t.onboarding_welcome_title,
      desc: t.onboarding_welcome_desc,
      icon: <Sparkles className="w-12 h-12 text-[#004225]" />
    },
    {
      title: t.onboarding_cv_title,
      desc: t.onboarding_cv_desc,
      icon: <FileText className="w-12 h-12 text-[#004225]" />
    },
    {
      title: t.onboarding_chat_title,
      desc: t.onboarding_chat_desc,
      icon: <Send className="w-12 h-12 text-[#004225]" />
    },
    {
      title: t.onboarding_tools_title,
      desc: t.onboarding_tools_desc,
      icon: <Cpu className="w-12 h-12 text-[#004225]" />
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#1A1A18] w-full max-w-lg p-8 md:p-12 shadow-2xl border border-black/5 dark:border-white/5 relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#004225]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-12">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 transition-all duration-500 ${i <= step ? 'w-8 bg-[#004225]' : 'w-4 bg-black/10 dark:bg-white/10'}`} 
                />
              ))}
            </div>
            <button onClick={onComplete} className="text-[#6B6B66] dark:text-[#9A9A94] hover:text-black dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="w-20 h-20 bg-[#004225]/5 rounded-2xl flex items-center justify-center">
                {steps[step].icon}
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-serif text-[#1A1A18] dark:text-white">{steps[step].title}</h3>
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">
                  {steps[step].desc}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex justify-end">
            <button 
              onClick={nextStep}
              className="bg-[#004225] text-white px-8 py-3 text-sm font-medium hover:bg-[#00331d] transition-all flex items-center gap-2 group"
            >
              {step === steps.length - 1 ? t.onboarding_finish : t.onboarding_next}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- COOKIE CONSENT BANNER ---
const CookieBanner = ({ t, onAccept, onEssential, onPrivacyLink }: { t: any; onAccept: () => void; onEssential: () => void; onPrivacyLink: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 shadow-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-[#004225]/8 flex items-center justify-center text-[#004225] dark:text-[#00C060]">
          <Shield size={20} />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1A1A18] dark:text-[#FAFAF8] mb-1">
            {t.cookie_title}
          </p>
          <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] leading-relaxed">
            {t.cookie_desc}{' '}
            <button
              onClick={onPrivacyLink}
              className="text-[#004225] dark:text-[#00C060] underline underline-offset-2 hover:no-underline"
            >
              {t.cookie_privacy_link}
            </button>
          </p>
        </div>
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full md:w-auto">
          <button
            onClick={onEssential}
            className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-black/15 dark:border-white/15 text-[#4A4A45] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            {t.cookie_essential}
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-[#004225] text-white hover:bg-[#00331D] transition-all"
          >
            {t.cookie_accept}
          </button>
        </div>
      </div>
    </motion.div>
  </AnimatePresence>
);

// --- LEGAL PAGES COMPONENT ---
const LegalPages = ({ activeView, onBack, language }: { activeView: string; onBack: () => void; language: string }) => {
  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const isDE = language === 'DE';
  const isFR = language === 'FR';
  const isIT = language === 'IT';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-10">
      <h2 className="text-xl font-serif text-[#004225] dark:text-[#00A854] mb-4 pb-2 border-b border-[#004225]/10 dark:border-white/10">{title}</h2>
      <div className="space-y-3 text-sm text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">{children}</div>
    </div>
  );

  const placeholder = (text: string) => (
    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1 rounded font-mono text-xs">{text}</span>
  );

  return (
    <section className="px-6 lg:px-12 py-16 bg-[#FDFCFB] dark:bg-[#1A1A18] min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors mb-12"
        >
          <ArrowLeft size={14} /> {isDE ? 'Zurück' : isFR ? 'Retour' : isIT ? 'Indietro' : 'Back'}
        </button>

        {/* ======= DATENSCHUTZRICHTLINIE ======= */}
        {activeView === 'datenschutz' && (
          <article>
            <header className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-3">
                {isDE ? 'Rechtliches' : isFR ? 'Mentions légales' : isIT ? 'Note legali' : 'Legal'}
              </p>
              <h1 className="text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4">
                {isDE ? 'Datenschutzrichtlinie' : isFR ? 'Politique de confidentialité' : isIT ? 'Informativa sulla privacy' : 'Privacy Policy'}
              </h1>
              <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94]">
                {isDE ? `Stand: ${today} · Gilt für: stellify.ch` : isFR ? `Mis à jour le : ${today} · Applicable à : stellify.ch` : isIT ? `Aggiornato il: ${today} · Applicabile a: stellify.ch` : `Last updated: ${today} · Applies to: stellify.ch`}
              </p>
            </header>

            {isDE ? <>
              <Section title="1. Verantwortliche Person">
                <p>Verantwortlich für die Datenbearbeitung im Sinne des Schweizer Datenschutzgesetzes (DSG) und der Europäischen Datenschutz-Grundverordnung (DSGVO) ist:</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Postfach</p><p>6300 Zug, Schweiz</p><p>E-Mail: support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Erhobene Personendaten">
                <p>Wir erheben und bearbeiten folgende Kategorien von Personendaten:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Kontodaten:</strong> Vorname, E-Mail-Adresse (bei Registrierung)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">CV-Inhalt:</strong> Text deines hochgeladenen Lebenslaufs (nur zur KI-Verarbeitung, nicht dauerhaft gespeichert)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Nutzungsdaten:</strong> Anzahl Tool-Nutzungen, Chat-Anfragen, Datum des letzten Resets</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Zahlungsdaten:</strong> Werden ausschliesslich durch Stripe Inc. verarbeitet.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Technische Daten:</strong> Spracheinstellungen, Theme-Präferenz (lokal gespeichert)</li>
                </ul>
              </Section>
              <Section title="3. Zweck der Datenbearbeitung">
                <p>Wir bearbeiten deine Daten ausschliesslich zu folgenden Zwecken:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Bereitstellung und Verbesserung der Plattform-Funktionen</li>
                  <li>Authentifizierung und Kontoverwaltung</li>
                  <li>Abrechnung und Zahlungsabwicklung (via Stripe)</li>
                  <li>Einhaltung gesetzlicher Pflichten</li>
                  <li>KI-gestützte Karriereberatung (Verarbeitung des CV-Textes durch einen externen KI-Dienst)</li>
                </ul>
              </Section>
              <Section title="4. Rechtsgrundlage der Bearbeitung">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO / Art. 31 DSG):</strong> Kontodaten und Nutzungsdaten sind für die Bereitstellung des Dienstes notwendig.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):</strong> Für optionale Analyse-Cookies.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO):</strong> Sicherheit und Missbrauchsprävention.</li>
                </ul>
              </Section>
              <Section title="5. Weitergabe an Dritte">
                <p>Wir geben deine Daten nur an folgende Drittdienstleister weiter, die als Auftragsverarbeiter tätig sind:</p>
                <div className="mt-3 space-y-4">
                  {[['Authentifizierungsdienst (Google LLC)', 'Zweck: Authentifizierung, Datenbankhosting. Sitz: USA. Schutzinstrument: EU-Standardvertragsklauseln (SCCs).'],['KI-Dienst (Google LLC)', 'Zweck: KI-gestützte Verarbeitung von Nutzeranfragen und CV-Inhalten. Sitz: USA. Schutzinstrument: EU-Standardvertragsklauseln (SCCs). Eingabedaten werden nicht zum Training genutzt.'],['Stripe Inc.', 'Zweck: Zahlungsabwicklung. Sitz: USA. Stripe ist PCI-DSS-zertifiziert.'],['Cloud-Hosting-Anbieter (Vercel Inc.)', 'Zweck: Hosting der Web-Applikation. Sitz: USA. Schutzinstrument: EU-Standardvertragsklauseln.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookies und lokale Speicherung">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Notwendige Cookies (immer aktiv)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Supabase Auth Session Cookie – Authentifizierung</li><li>localStorage: <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code></li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Optionale Analyse-Cookies (nur mit Einwilligung)</p><p className="text-xs mt-1">Derzeit keine Analyse-Dienste von Drittanbietern aktiv.</p></div>
                </div>
              </Section>
              <Section title="7. Speicherdauer"><ul className="list-disc pl-5 space-y-2"><li>Kontodaten: bis zur Kontolöschung</li><li>CV-Text: nicht dauerhaft gespeichert</li><li>Zahlungsbelege: 10 Jahre (OR Art. 958f)</li><li>Nutzungsstatistiken: monatlich zurückgesetzt</li></ul></Section>
              <Section title="8. Deine Rechte">
                <p>Du hast nach Schweizer DSG und DSGVO folgende Rechte:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Auskunft, Berichtigung, Löschung, Datenportabilität, Widerspruch, Widerruf.</strong></li>
                  <li>Beschwerde beim EDÖB (edoeb.admin.ch)</li>
                </ul>
                <p className="mt-4">Kontakt: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Datensicherheit"><ul className="list-disc pl-5 space-y-2"><li>TLS/HTTPS-Verschlüsselung</li><li>Supabase Row Level Security (RLS)</li><li>Keine Klartextpasswörter</li><li>Zugriff nur für autorisierte Personen</li></ul></Section>
              <Section title="10. Änderungen dieser Richtlinie"><p>Wir behalten uns vor, diese Richtlinie jederzeit anzupassen. Bei wesentlichen Änderungen informieren wir per E-Mail.</p></Section>
            </> : isFR ? <>
              <Section title="1. Responsable du traitement">
                <p>Le responsable du traitement des données au sens de la loi suisse sur la protection des données (LPD) et du RGPD est :</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Case postale</p><p>6300 Zug, Suisse</p><p>E-mail : support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Données collectées">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données de compte :</strong> prénom, adresse e-mail</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Contenu du CV :</strong> texte de votre CV (traitement IA uniquement, non stocké de façon permanente)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données d'utilisation :</strong> nombre d'utilisations des outils, requêtes chat</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données de paiement :</strong> traitées exclusivement par Stripe Inc.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données techniques :</strong> paramètres de langue, préférence de thème (stockage local)</li>
                </ul>
              </Section>
              <Section title="3. Finalités du traitement">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Fourniture et amélioration des fonctionnalités de la plateforme</li>
                  <li>Authentification et gestion des comptes</li>
                  <li>Facturation et traitement des paiements (via Stripe)</li>
                  <li>Respect des obligations légales</li>
                  <li>Conseil de carrière assisté par IA (traitement du CV via un service IA externe)</li>
                </ul>
              </Section>
              <Section title="4. Base légale">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Exécution du contrat (Art. 6 al. 1 lit. b RGPD) :</strong> données nécessaires à la fourniture du service.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Consentement (Art. 6 al. 1 lit. a RGPD) :</strong> cookies d'analyse optionnels.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Intérêt légitime (Art. 6 al. 1 lit. f RGPD) :</strong> sécurité et prévention des abus.</li>
                </ul>
              </Section>
              <Section title="5. Transfert à des tiers">
                <p>Nous ne transmettons vos données qu'aux sous-traitants suivants :</p>
                <div className="mt-3 space-y-4">
                  {[['Service d\'authentification (Google LLC)', 'Finalité : authentification, hébergement de base de données. Siège : USA. Protection : clauses contractuelles types UE (CCT).'],['Service IA (Google LLC)', 'Finalité : traitement IA des requêtes et du contenu du CV. Siège : USA. Les données ne sont pas utilisées pour l\'entraînement.'],['Stripe Inc.', 'Finalité : traitement des paiements. Siège : USA. Stripe est certifié PCI-DSS.'],['Hébergeur cloud (Vercel Inc.)', 'Finalité : hébergement de l\'application web. Siège : USA. Protection : clauses contractuelles types UE.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookies et stockage local">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookies nécessaires (toujours actifs)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Cookie de session Supabase Auth</li><li>localStorage : <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code></li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookies d'analyse optionnels (avec consentement uniquement)</p><p className="text-xs mt-1">Aucun service d'analyse tiers actuellement actif.</p></div>
                </div>
              </Section>
              <Section title="7. Durée de conservation"><ul className="list-disc pl-5 space-y-2"><li>Données de compte : jusqu'à la suppression du compte</li><li>Contenu du CV : non stocké de façon permanente</li><li>Pièces comptables : 10 ans (droit suisse)</li><li>Statistiques d'utilisation : réinitialisées mensuellement</li></ul></Section>
              <Section title="8. Vos droits">
                <p>Vous disposez des droits suivants selon la LPD et le RGPD : accès, rectification, suppression, portabilité, opposition, retrait du consentement, réclamation auprès du PFPDT (edoeb.admin.ch).</p>
                <p className="mt-4">Contact : <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Sécurité des données"><ul className="list-disc pl-5 space-y-2"><li>Chiffrement TLS/HTTPS</li><li>Supabase Row Level Security (RLS)</li><li>Aucun mot de passe en clair</li><li>Accès réservé aux personnes autorisées</li></ul></Section>
              <Section title="10. Modifications"><p>Nous nous réservons le droit de modifier cette politique à tout moment. Les utilisateurs inscrits seront informés par e-mail en cas de changements importants.</p></Section>
            </> : isIT ? <>
              <Section title="1. Titolare del trattamento">
                <p>Il titolare del trattamento ai sensi della legge svizzera sulla protezione dei dati (LPD) e del GDPR è:</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Casella postale</p><p>6300 Zug, Svizzera</p><p>E-mail: support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Dati raccolti">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati account:</strong> nome, indirizzo e-mail</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Contenuto del CV:</strong> testo del CV (solo per elaborazione IA, non memorizzato permanentemente)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati di utilizzo:</strong> numero di utilizzi degli strumenti, richieste chat</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati di pagamento:</strong> elaborati esclusivamente da Stripe Inc.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati tecnici:</strong> impostazioni lingua, preferenza tema (memorizzati localmente)</li>
                </ul>
              </Section>
              <Section title="3. Finalità del trattamento">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Fornitura e miglioramento delle funzionalità della piattaforma</li>
                  <li>Autenticazione e gestione degli account</li>
                  <li>Fatturazione ed elaborazione dei pagamenti (via Stripe)</li>
                  <li>Rispetto degli obblighi legali</li>
                  <li>Consulenza di carriera assistita da IA (elaborazione del CV tramite un servizio IA esterno)</li>
                </ul>
              </Section>
              <Section title="4. Base giuridica">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Esecuzione del contratto (Art. 6 par. 1 lett. b GDPR):</strong> necessario per la fornitura del servizio.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Consenso (Art. 6 par. 1 lett. a GDPR):</strong> cookie analitici opzionali.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Interesse legittimo (Art. 6 par. 1 lett. f GDPR):</strong> sicurezza e prevenzione degli abusi.</li>
                </ul>
              </Section>
              <Section title="5. Trasferimento a terzi">
                <p>Trasferiamo i dati solo ai seguenti responsabili del trattamento:</p>
                <div className="mt-3 space-y-4">
                  {[['Servizio di autenticazione (Google LLC)', 'Finalità: autenticazione, hosting database. Sede: USA. Strumento di protezione: clausole contrattuali tipo UE (SCC).'],['Servizio IA (Google LLC)', 'Finalità: elaborazione IA delle richieste e del contenuto del CV. Sede: USA. I dati non vengono usati per il training.'],['Stripe Inc.', 'Finalità: elaborazione pagamenti. Sede: USA. Stripe è certificato PCI-DSS.'],['Provider hosting cloud (Vercel Inc.)', 'Finalità: hosting dell\'applicazione web. Sede: USA. Strumento: clausole contrattuali tipo UE.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookie e memorizzazione locale">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookie necessari (sempre attivi)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Cookie sessione Supabase Auth</li><li>localStorage: <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code></li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookie analitici opzionali (solo con consenso)</p><p className="text-xs mt-1">Nessun servizio di analisi di terze parti attualmente attivo.</p></div>
                </div>
              </Section>
              <Section title="7. Durata della conservazione"><ul className="list-disc pl-5 space-y-2"><li>Dati account: fino alla cancellazione dell'account</li><li>CV: non memorizzato permanentemente</li><li>Documenti contabili: 10 anni (diritto svizzero)</li><li>Statistiche di utilizzo: reimpostate mensilmente</li></ul></Section>
              <Section title="8. I tuoi diritti">
                <p>Hai i seguenti diritti ai sensi della LPD e del GDPR: accesso, rettifica, cancellazione, portabilità, opposizione, revoca del consenso, reclamo all'IFPDT (edoeb.admin.ch).</p>
                <p className="mt-4">Contatto: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Sicurezza dei dati"><ul className="list-disc pl-5 space-y-2"><li>Crittografia TLS/HTTPS</li><li>Supabase Row Level Security (RLS)</li><li>Nessuna password in chiaro</li><li>Accesso solo per persone autorizzate</li></ul></Section>
              <Section title="10. Modifiche"><p>Ci riserviamo il diritto di modificare questa informativa in qualsiasi momento. Gli utenti registrati saranno informati via e-mail in caso di modifiche sostanziali.</p></Section>
            </> : <>
              <Section title="1. Data Controller">
                <p>The controller responsible for data processing under Swiss data protection law (FADP) and the EU General Data Protection Regulation (GDPR) is:</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>P.O. Box</p><p>6300 Zug, Switzerland</p><p>Email: support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Personal Data Collected">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Account data:</strong> First name, email address (upon registration)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">CV content:</strong> Text of your uploaded resume (used for AI processing only, not permanently stored on our servers)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Usage data:</strong> Number of tool uses, chat requests, date of last reset</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Payment data:</strong> Processed exclusively by Stripe Inc. We do not receive full credit card data.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Technical data:</strong> Language settings, theme preference (stored locally in browser)</li>
                </ul>
              </Section>
              <Section title="3. Purposes of Processing">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Provision and improvement of platform features</li>
                  <li>Authentication and account management</li>
                  <li>Billing and payment processing (via Stripe)</li>
                  <li>Compliance with legal obligations</li>
                  <li>AI-powered career advice (processing of CV text via an external AI service)</li>
                </ul>
              </Section>
              <Section title="4. Legal Basis">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Contract performance (Art. 6(1)(b) GDPR):</strong> Account and usage data are necessary to provide the service.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Consent (Art. 6(1)(a) GDPR):</strong> Optional analytics cookies.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Legitimate interest (Art. 6(1)(f) GDPR):</strong> Security and abuse prevention.</li>
                </ul>
              </Section>
              <Section title="5. Third-Party Data Sharing">
                <p>We only share data with the following processors:</p>
                <div className="mt-3 space-y-4">
                  {[['Authentication Service (Google LLC)', 'Purpose: Authentication, database hosting. Location: USA. Safeguard: EU Standard Contractual Clauses (SCCs).'],['AI Service (Google LLC)', 'Purpose: AI processing of user requests and CV content. Location: USA. Input data is not used for model training.'],['Stripe Inc.', 'Purpose: Payment processing. Location: USA. Stripe is PCI-DSS certified.'],['Cloud Hosting Provider (Vercel Inc.)', 'Purpose: Web application hosting. Location: USA. Safeguard: EU Standard Contractual Clauses.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookies and Local Storage">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Necessary cookies (always active)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Supabase Auth Session Cookie – authentication</li><li>localStorage: <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code> – user preferences</li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Optional analytics cookies (consent required)</p><p className="text-xs mt-1">No third-party analytics services are currently active.</p></div>
                </div>
              </Section>
              <Section title="7. Retention Periods"><ul className="list-disc pl-5 space-y-2"><li>Account data: until account deletion</li><li>CV text: not permanently stored</li><li>Payment records: 10 years (Swiss accounting law)</li><li>Usage statistics: reset monthly</li></ul></Section>
              <Section title="8. Your Rights">
                <p>Under Swiss FADP and GDPR, you have the right to: access, rectification, erasure, data portability, objection, withdrawal of consent, and to lodge a complaint with the FDPIC (edoeb.admin.ch).</p>
                <p className="mt-4">Contact: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Data Security"><ul className="list-disc pl-5 space-y-2"><li>TLS/HTTPS encryption for all data transfers</li><li>Supabase Row Level Security (RLS) for database access control</li><li>No plaintext password storage (Supabase Authentication)</li><li>Production database access restricted to authorised personnel</li></ul></Section>
              <Section title="10. Changes to This Policy"><p>We reserve the right to update this Privacy Policy at any time. Registered users will be notified by email of material changes. The current version is always available on this page.</p></Section>
            </>}
          </article>
        )}

        {/* ======= IMPRESSUM ======= */}
        {activeView === 'impressum' && (
          <article>
            <header className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-3">
                {isDE ? 'Rechtliches' : isFR ? 'Mentions légales' : isIT ? 'Note legali' : 'Legal'}
              </p>
              <h1 className="text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4">
                {isDE ? 'Impressum' : isFR ? 'Mentions légales' : isIT ? 'Informazioni legali' : 'Legal Notice'}
              </h1>
              <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94]">{isDE ? `Stand: ${today}` : `${today}`}</p>
            </header>

            <Section title={isDE ? 'Betreiber und Verantwortlicher' : isFR ? 'Exploitant et responsable' : isIT ? 'Gestore e responsabile' : 'Operator & Controller'}>
              <div className="p-5 bg-[#F5F4F0] dark:bg-[#2A2A26] space-y-2 font-mono text-xs">
                <p className="text-base font-sans font-medium text-[#1A1A18] dark:text-[#FAFAF8]">JTSP</p>
                <p>{isDE ? 'Postfach' : isFR ? 'Case postale' : isIT ? 'Casella postale' : 'P.O. Box'}</p>
                <p>6300 Zug</p>
                <p>{isDE ? 'Schweiz' : isFR ? 'Suisse' : isIT ? 'Svizzera' : 'Switzerland'}</p>
              </div>
            </Section>

            <Section title={isDE ? 'Kontakt' : isFR ? 'Contact' : isIT ? 'Contatto' : 'Contact'}>
              <div className="p-5 bg-[#F5F4F0] dark:bg-[#2A2A26] space-y-2 text-sm">
                <p>E-Mail: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] dark:text-[#00A854] underline">support.stellify@gmail.com</a></p>
                <p>Website: stellify.ch</p>
              </div>
            </Section>

<Section title={isDE ? 'Haftungsausschluss' : isFR ? 'Clause de non-responsabilité' : isIT ? 'Esclusione di responsabilità' : 'Disclaimer'}>
              <p>{isDE ? 'Die Inhalte dieser Website werden mit grösstmöglicher Sorgfalt erstellt. Der Betreiber übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Inhalte. Die KI-generierten Texte dienen ausschliesslich als Hilfsmittel und ersetzen keine professionelle Rechts- oder Karriereberatung.' : isFR ? 'Les contenus de ce site sont créés avec le plus grand soin. L\'exploitant ne garantit cependant pas l\'exactitude, l\'exhaustivité et l\'actualité des contenus fournis. Les textes générés par IA servent uniquement d\'aide et ne remplacent pas un conseil professionnel juridique ou de carrière.' : isIT ? 'I contenuti di questo sito vengono creati con la massima cura. Tuttavia, il gestore non garantisce l\'accuratezza, la completezza e l\'attualità dei contenuti forniti. I testi generati dall\'IA servono esclusivamente come ausilio e non sostituiscono una consulenza professionale legale o di carriera.' : 'The contents of this website are created with the utmost care. However, the operator does not guarantee the accuracy, completeness or timeliness of the content provided. AI-generated texts serve solely as an aid and do not replace professional legal or career advice.'}</p>
            </Section>

            <Section title={isDE ? 'Urheberrecht' : isFR ? 'Droits d\'auteur' : isIT ? 'Diritto d\'autore' : 'Copyright'}>
              <p>{isDE ? 'Die auf dieser Website veröffentlichten Inhalte und Werke unterliegen dem Schweizer Urheberrecht. Jede Art von Vervielfältigung oder Verwendung bedarf der schriftlichen Genehmigung.' : isFR ? 'Les contenus et œuvres publiés sur ce site sont soumis au droit d\'auteur suisse. Toute reproduction ou utilisation requiert l\'autorisation écrite.' : isIT ? 'I contenuti e le opere pubblicati su questo sito sono soggetti al diritto d\'autore svizzero. Qualsiasi riproduzione o utilizzo richiede l\'autorizzazione scritta.' : 'The contents and works published on this website are subject to Swiss copyright law. Any reproduction or use requires written permission.'}</p>
            </Section>

            <Section title={isDE ? 'Anwendbares Recht' : isFR ? 'Droit applicable' : isIT ? 'Diritto applicabile' : 'Applicable Law'}>
              <p>{isDE ? 'Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist Zug, Schweiz.' : isFR ? 'Le droit suisse est exclusivement applicable. Le for juridique est Zoug, Suisse.' : isIT ? 'Si applica esclusivamente il diritto svizzero. Il foro competente è Zugo, Svizzera.' : 'Swiss law applies exclusively. Place of jurisdiction is Zug, Switzerland.'}</p>
            </Section>
          </article>
        )}

        {/* ======= AGB ======= */}
        {activeView === 'agb' && (
          <article>
            <header className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-3">
                {isDE ? 'Rechtliches' : isFR ? 'Mentions légales' : isIT ? 'Note legali' : 'Legal'}
              </p>
              <h1 className="text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4">
                {isDE ? 'Allgemeine Geschäftsbedingungen (AGB)' : isFR ? 'Conditions générales d\'utilisation (CGU)' : isIT ? 'Condizioni generali di utilizzo (CGU)' : 'Terms and Conditions'}
              </h1>
              <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94]">
                {isDE ? `Stand: ${today} · Anbieter: JTSP, Zug, Schweiz` : isFR ? `Mis à jour : ${today} · Fournisseur : JTSP, Zoug, Suisse` : isIT ? `Aggiornato: ${today} · Fornitore: JTSP, Zugo, Svizzera` : `Last updated: ${today} · Provider: JTSP, Zug, Switzerland`}
              </p>
            </header>

            {isDE ? <>
              <Section title="1. Vertragsgegenstand und Geltungsbereich">
                <p>Diese AGB gelten für alle Nutzungsverträge zwischen dem Anbieter JTSP (nachfolgend „Stellify") und registrierten Nutzern der Plattform stellify.ch.</p>
                <p className="mt-2">Stellify bietet eine KI-gestützte Karriereplattform mit Tools zur Lebenslaufoptimierung, Interview-Vorbereitung, Gehaltsanalyse und weiteren Karriere-Diensten an.</p>
              </Section>
              <Section title="2. Vertragsschluss und Kontoregistrierung">
                <p>Der Vertrag kommt durch die Nutzung der Plattform oder den Abschluss eines Abonnements zustande. Mit der Registrierung oder dem Abschluss eines Abonnements gilt die Zustimmung zu diesen AGB und der Datenschutzrichtlinie als erteilt.</p>
                <p className="mt-2">Die Nutzung ist ab einem Mindestalter von <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 Jahren</strong> gestattet. Personen unter 18 Jahren benötigen für den Abschluss eines kostenpflichtigen Abonnements die Zustimmung eines Erziehungsberechtigten. (Rechtliche Grundlage: OR Art. 19; das Mindestalter von 14 Jahren entspricht dem typischen Eintrittsalter für Berufslehren in der Schweiz.)</p>
              </Section>
              <Section title="3. Leistungsumfang und Tarife">
                <div className="mt-3 space-y-3">
                  {[['Gratis-Plan (kostenlos)', ['3× Tool-Nutzungen','3× Stella Chat-Anfragen','KI-Gehaltsrechner (Basisversion)','Schweizer Karriere-Standards']],['Pro-Plan (CHF 19.90/Mo. · CHF 199.–/Jahr)', ['50× Tool-Nutzungen/Monat','20× Aktionen/Tag','Zeugnis-Decoder, Interview-Coach, alle Pro-Tools','Prioritärer Support']],['Ultimate-Plan (CHF 39.90/Mo. · CHF 399.–/Jahr)', ['Unbegrenzte Nutzungen ♾️','Alle Pro-Features + exklusive Ultimate-Tools','Deep Analysis Modus','24/7 VIP-Support']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">Alle Preise in CHF, inkl. MwSt. Preisänderungen werden mindestens 30 Tage im Voraus angekündigt.</p>
              </Section>
              <Section title="4. Zahlung und Abrechnung"><p>Zahlung ausschliesslich via <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Abrechnung im Voraus, monatlich oder jährlich.</p></Section>
              <Section title="5. Widerrufsrecht"><p>Stellify bietet eine <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">7-Tage-Geld-zurück-Garantie</strong> für Erstkäufer. Anfragen an <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Laufzeit und Verlängerung">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Monatliches Abo:</strong> Gilt genau 1 Monat ab Kaufdatum. Es erfolgt <em>keine</em> automatische Verlängerung. Nach Ablauf wird das Konto automatisch auf den Gratis-Plan zurückgestuft. Drei Tage vor Ablauf erhält der Nutzer eine Erinnerungs-E-Mail mit der Möglichkeit zur Verlängerung.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Jährliches Abo:</strong> Gilt genau 12 Monate ab Kaufdatum. Es erfolgt <em>keine</em> automatische Verlängerung. Nach Ablauf wird das Konto automatisch auf den Gratis-Plan zurückgestuft. 14 Tage vor Ablauf erhält der Nutzer eine Erinnerungs-E-Mail.</li>
                  <li>Die Verlängerung erfolgt durch erneuten Kauf im Bereich Preise & Pläne.</li>
                </ul>
              </Section>
              <Section title="7. Nutzungsbeschränkungen"><ul className="list-disc pl-5 space-y-2"><li>Keine illegale Nutzung oder Täuschung Dritter</li><li>Kein Scraping / Bots</li><li>Keine Weitergabe von Zugangsdaten</li><li>Nutzer ist für die Richtigkeit von KI-Inhalten selbst verantwortlich</li></ul></Section>
              <Section title="8. Geistiges Eigentum"><p>Alle Rechte an Plattform, Code, Design und Marken liegen beim Betreiber. KI-generierte Inhalte dürfen vom Nutzer für eigene Bewerbungsunterlagen verwendet werden.</p></Section>
              <Section title="9. Haftungsbeschränkung"><p>Stellify haftet nur für vorsätzliche oder grob fahrlässige Schäden. Gesamthaftung begrenzt auf den in den letzten 12 Monaten bezahlten Betrag.</p></Section>
              <Section title="10. Verfügbarkeit"><p>Keine Garantie auf unterbrechungsfreie Verfügbarkeit. Ausfälle von Supabase, Stripe oder Google AI liegen ausserhalb unseres Einflussbereichs.</p></Section>
              <Section title="11. Änderungen"><p>Anpassungen mit 30 Tagen Frist. Wesentliche Änderungen per E-Mail. Fortgesetzte Nutzung gilt als Zustimmung.</p></Section>
              <Section title="12. Anwendbares Recht"><p>Ausschliesslich <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Schweizer Recht</strong>. Gerichtsstand: Zug, Schweiz.</p></Section>
              <Section title="13. Streitbeilegung"><p>Kontakt: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. EU-Schlichtung: <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </> : isFR ? <>
              <Section title="1. Objet et champ d'application"><p>Les présentes CGU régissent tous les contrats d'utilisation entre le fournisseur JTSP (ci-après «Stellify») et les utilisateurs inscrits de la plateforme stellify.ch. Stellify propose une plateforme de carrière assistée par IA.</p></Section>
              <Section title="2. Conclusion du contrat">
                <p>Le contrat est conclu par l'utilisation de la plateforme ou la souscription d'un abonnement. En s'inscrivant ou en souscrivant un abonnement, l'utilisateur accepte implicitement les présentes CGU et la politique de confidentialité.</p>
                <p className="mt-2">L'utilisation est autorisée dès l'âge de <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 ans</strong>. Les personnes mineures (moins de 18 ans) doivent obtenir le consentement d'un représentant légal pour souscrire un abonnement payant.</p>
              </Section>
              <Section title="3. Prestations et tarifs">
                <div className="mt-3 space-y-3">
                  {[['Plan Gratuit (gratuit)', ['3× utilisations d\'outil','3× requêtes Stella Chat','Calculateur de salaire IA (base)','Standards suisses']],['Plan Pro (CHF 19.90/mois · CHF 199.–/an)', ['50× utilisations d\'outils/mois','20× actions/jour','Décodeur de certificat, Coach entretien, tous les outils Pro','Support prioritaire']],['Plan Ultimate (CHF 39.90/mois · CHF 399.–/an)', ['Utilisations illimitées ♾️','Toutes les fonctionnalités Pro + outils Ultimate exclusifs','Mode analyse approfondie','Support VIP 24/7']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">Tous les prix en CHF, TVA incluse. Les modifications de prix sont annoncées 30 jours à l'avance.</p>
              </Section>
              <Section title="4. Paiement"><p>Paiement exclusivement via <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Facturation en avance, mensuelle ou annuelle.</p></Section>
              <Section title="5. Droit de rétractation"><p>Stellify offre une <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">garantie de remboursement de 7 jours</strong> pour les premiers acheteurs. Demandes à <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Durée et renouvellement">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abonnement mensuel :</strong> Valable exactement 1 mois à compter de la date d'achat. Aucun renouvellement automatique. À expiration, le compte revient automatiquement au plan gratuit. Un e-mail de rappel est envoyé 3 jours avant l'expiration.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abonnement annuel :</strong> Valable exactement 12 mois à compter de la date d'achat. Aucun renouvellement automatique. À expiration, le compte revient automatiquement au plan gratuit. Un e-mail de rappel est envoyé 14 jours avant l'expiration.</li>
                  <li>Le renouvellement s'effectue par un nouvel achat dans la section Tarifs & Plans.</li>
                </ul>
              </Section>
              <Section title="7. Restrictions d'utilisation"><ul className="list-disc pl-5 space-y-2"><li>Pas d'utilisation illégale ni de tromperie de tiers</li><li>Pas de scraping / bots</li><li>Pas de partage d'identifiants</li><li>L'utilisateur est responsable de l'exactitude des contenus IA</li></ul></Section>
              <Section title="8. Propriété intellectuelle"><p>Tous les droits sur la plateforme, le code, le design et les marques appartiennent à l'exploitant. Les contenus générés par IA peuvent être utilisés par l'utilisateur pour ses dossiers de candidature.</p></Section>
              <Section title="9. Limitation de responsabilité"><p>Stellify n'est responsable que des dommages causés intentionnellement ou par négligence grave. Responsabilité totale limitée aux montants payés au cours des 12 derniers mois.</p></Section>
              <Section title="10. Disponibilité"><p>Aucune garantie de disponibilité ininterrompue. Les pannes de Supabase, Stripe ou Google AI échappent à notre contrôle.</p></Section>
              <Section title="11. Modifications"><p>Modifications avec un préavis de 30 jours. Changements importants communiqués par e-mail.</p></Section>
              <Section title="12. Droit applicable"><p>Le <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">droit suisse</strong> s'applique exclusivement. For juridique : Zoug, Suisse.</p></Section>
              <Section title="13. Règlement des litiges"><p>Contact : <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. Plateforme de médiation UE : <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </> : isIT ? <>
              <Section title="1. Oggetto e ambito di applicazione"><p>Le presenti CGU disciplinano tutti i contratti d'uso tra il fornitore JTSP (di seguito «Stellify») e gli utenti registrati della piattaforma stellify.ch.</p></Section>
              <Section title="2. Conclusione del contratto">
                <p>Il contratto si conclude con l'utilizzo della piattaforma o la sottoscrizione di un abbonamento. Registrandosi o sottoscrivendo un abbonamento, l'utente accetta implicitamente le presenti CGU e l'informativa sulla privacy.</p>
                <p className="mt-2">L'utilizzo è consentito a partire dai <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 anni</strong>. I minorenni (sotto i 18 anni) necessitano del consenso di un rappresentante legale per sottoscrivere un abbonamento a pagamento.</p>
              </Section>
              <Section title="3. Prestazioni e tariffe">
                <div className="mt-3 space-y-3">
                  {[['Piano Gratuito (gratuito)', ['3× utilizzi strumento','3× richieste Stella Chat','Calcolatore stipendio IA (base)','Standard svizzeri']],['Piano Pro (CHF 19.90/mese · CHF 199.–/anno)', ['50× utilizzi strumenti/mese','20× azioni/giorno','Decodificatore certificato, Coach colloquio, tutti gli strumenti Pro','Supporto prioritario']],['Piano Ultimate (CHF 39.90/mese · CHF 399.–/anno)', ['Utilizzi illimitati ♾️','Tutte le funzionalità Pro + strumenti Ultimate esclusivi','Modalità analisi approfondita','Supporto VIP 24/7']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">Tutti i prezzi in CHF, IVA inclusa. Le modifiche dei prezzi vengono comunicate con 30 giorni di preavviso.</p>
              </Section>
              <Section title="4. Pagamento"><p>Pagamento esclusivamente tramite <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Fatturazione anticipata, mensile o annuale.</p></Section>
              <Section title="5. Diritto di recesso"><p>Stellify offre una <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">garanzia di rimborso di 7 giorni</strong> per i nuovi acquirenti. Richieste a <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Durata e rinnovo">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abbonamento mensile:</strong> Valido esattamente 1 mese dalla data di acquisto. Nessun rinnovo automatico. Alla scadenza, l'account torna automaticamente al piano gratuito. Un'e-mail di promemoria viene inviata 3 giorni prima della scadenza.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abbonamento annuale:</strong> Valido esattamente 12 mesi dalla data di acquisto. Nessun rinnovo automatico. Alla scadenza, l'account torna automaticamente al piano gratuito. Un'e-mail di promemoria viene inviata 14 giorni prima della scadenza.</li>
                  <li>Il rinnovo avviene tramite un nuovo acquisto nella sezione Prezzi & Piani.</li>
                </ul>
              </Section>
              <Section title="7. Restrizioni d'uso"><ul className="list-disc pl-5 space-y-2"><li>Nessun utilizzo illegale né inganno di terzi</li><li>Nessun scraping / bot</li><li>Nessuna condivisione di credenziali</li><li>L'utente è responsabile dell'accuratezza dei contenuti IA</li></ul></Section>
              <Section title="8. Proprietà intellettuale"><p>Tutti i diritti sulla piattaforma, il codice, il design e i marchi appartengono al gestore. I contenuti generati dall'IA possono essere utilizzati dall'utente per i propri documenti di candidatura.</p></Section>
              <Section title="9. Limitazione di responsabilità"><p>Stellify risponde solo per danni causati intenzionalmente o per colpa grave. Responsabilità totale limitata agli importi pagati negli ultimi 12 mesi.</p></Section>
              <Section title="10. Disponibilità"><p>Nessuna garanzia di disponibilità ininterrotta. I guasti di Supabase, Stripe o Google AI esulano dal nostro controllo.</p></Section>
              <Section title="11. Modifiche"><p>Modifiche con 30 giorni di preavviso. Cambiamenti sostanziali comunicati via e-mail.</p></Section>
              <Section title="12. Diritto applicabile"><p>Si applica esclusivamente il <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">diritto svizzero</strong>. Foro competente: Zugo, Svizzera.</p></Section>
              <Section title="13. Risoluzione delle controversie"><p>Contatto: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. Piattaforma di mediazione UE: <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </> : <>
              <Section title="1. Subject Matter and Scope"><p>These Terms govern all usage agreements between the provider JTSP (hereinafter "Stellify") and registered users of stellify.ch. Stellify offers an AI-powered career platform with CV optimisation, interview preparation, salary analysis and other career services.</p></Section>
              <Section title="2. Contract Formation">
                <p>The contract is formed upon using the platform or subscribing to a plan. By registering or subscribing, users implicitly accept these Terms and the Privacy Policy.</p>
                <p className="mt-2">Use is permitted from the age of <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 years</strong>. Users under 18 require parental or guardian consent to subscribe to a paid plan. (Legal basis: Swiss CO Art. 19; the minimum age of 14 reflects typical apprenticeship entry age in Switzerland.)</p>
              </Section>
              <Section title="3. Services and Pricing">
                <div className="mt-3 space-y-3">
                  {[['Free Plan (no cost)', ['3× tool uses','3× Stella Chat requests','AI Salary Calculator (basic)','Swiss career standards']],['Pro Plan (CHF 19.90/mo · CHF 199.–/yr)', ['50× tool uses/month','20× actions/day','Certificate Decoder, Interview Coach, all Pro tools','Priority support']],['Ultimate Plan (CHF 39.90/mo · CHF 399.–/yr)', ['Unlimited uses ♾️','All Pro features + exclusive Ultimate tools','Deep Analysis Mode','24/7 VIP Support']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">All prices in CHF, incl. VAT. Price changes announced at least 30 days in advance.</p>
              </Section>
              <Section title="4. Payment"><p>Payment exclusively via <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Billed in advance, monthly or annually.</p></Section>
              <Section title="5. Right of Withdrawal"><p>Stellify offers a <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">7-day money-back guarantee</strong> for first-time buyers. Requests to <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Duration and Renewal">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Monthly subscription:</strong> Valid for exactly 1 month from purchase date. No automatic renewal. After expiry, the account automatically reverts to the Free Plan. A reminder email is sent 3 days before expiry.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Annual subscription:</strong> Valid for exactly 12 months from purchase date. No automatic renewal. After expiry, the account automatically reverts to the Free Plan. A reminder email is sent 14 days before expiry.</li>
                  <li>To renew, simply purchase again in the Pricing &amp; Plans section.</li>
                </ul>
              </Section>
              <Section title="7. Usage Restrictions"><ul className="list-disc pl-5 space-y-2"><li>No illegal use or deception of third parties</li><li>No automated scraping or bots</li><li>No sharing of login credentials</li><li>Users are responsible for verifying the accuracy of AI-generated content</li></ul></Section>
              <Section title="8. Intellectual Property"><p>All rights to the platform, code, design and trademarks belong to the operator. AI-generated content may be used by the user for their own job applications.</p></Section>
              <Section title="9. Limitation of Liability"><p>Stellify is only liable for damages caused by wilful misconduct or gross negligence. Total liability is capped at the amount paid by the user in the last 12 months.</p></Section>
              <Section title="10. Availability"><p>No guarantee of uninterrupted availability. Outages of Supabase, Stripe or Google AI are outside our control.</p></Section>
              <Section title="11. Changes"><p>Changes to these Terms with 30 days' notice. Material changes communicated by email. Continued use constitutes acceptance.</p></Section>
              <Section title="12. Applicable Law"><p>Exclusively <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Swiss law</strong> applies. Place of jurisdiction: Zug, Switzerland.</p></Section>
              <Section title="13. Dispute Resolution"><p>Contact: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. EU dispute resolution: <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </>}
          </article>
        )}
      </div>
    </section>
  );
};

const Avatar = ({ name, color, src }: { name: string, color: string, src?: string }) => (
  <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-serif text-lg shadow-inner overflow-hidden`}>
    {src ? (
      <img src={src} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      name.charAt(0)
    )}
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <StellifyApp />
    </ErrorBoundary>
  );
}

// --- COMPONENTS ---
const CVDropzone = ({ onFileAccepted, isUploading, t, variant = 'dark', onClickOverride }: { onFileAccepted: (file: File) => void, isUploading: boolean, t: any, variant?: 'dark' | 'light', onClickOverride?: () => void }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    disabled: isUploading,
    noClick: !!onClickOverride,
  });

  if (variant === 'light') {
    return (
      <div
        {...getRootProps()}
        onClick={onClickOverride ?? getRootProps().onClick}
        className={`
          relative group cursor-pointer transition-all duration-300
          border-2 border-dashed rounded-sm p-6 text-center
          ${isDragActive
            ? 'border-[#004225] bg-[#004225]/8 scale-[1.01]'
            : 'border-[#004225]/30 hover:border-[#004225] bg-[#004225]/3 hover:bg-[#004225]/6'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#004225]/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-[#004225]/20 transition-colors">
            {isDragActive ? <FileUp size={22} className="text-[#004225] animate-bounce" /> : <Upload size={22} className="text-[#004225]" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">
              {isDragActive ? (t.drop_file_here || 'Datei hier ablegen …') : (t.upload_cv || 'Lebenslauf hochladen')}
            </p>
            <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] mt-0.5">
              PDF oder Word · Kostenlos & sicher analysieren lassen
            </p>
          </div>
          <div className="ml-auto text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/20 px-2 py-1 flex-shrink-0">
            PDF / Word
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        relative overflow-hidden group cursor-pointer transition-all duration-500
        border-2 border-dashed p-8 text-center
        ${isDragActive
          ? 'border-white/60 bg-white/10 scale-[1.02]'
          : 'border-white/20 hover:border-white/40 bg-white/5'
        }
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-4 relative z-10">
        <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto text-white group-hover:scale-110 transition-transform duration-500 shadow-sm">
          {isDragActive ? <FileUp size={32} className="animate-bounce" /> : <Upload size={32} />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-serif text-white">
            {isDragActive ? t.drop_file_here : t.drag_cv_here}
          </p>
          <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
            {t.pdf_only}
          </p>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/30" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/30" />
    </div>
  );
};

function StellifyApp() {
  // --- STATE ---
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const authEmailRef = useRef<HTMLInputElement>(null);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setTimeout(() => authEmailRef.current?.focus(), 100);
    }
  }, [isAuthModalOpen]);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('register');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isStellaOpen, setIsStellaOpen] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength += 1;
    if (pass.length >= 10) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    setPasswordStrength(strength);
  };
  const [applications, setApplications] = useState<any[]>([]);
  const [isAddingApp, setIsAddingApp] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [newApp, setNewApp] = useState({ company: '', position: '', status: 'Applied' as any, location: '', salary: '', notes: '' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [cvContext, setCvContext] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb'>('dashboard');
  const [generatedApp, setGeneratedApp] = useState<string | null>(null);
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [language, setLanguage] = useState<'DE' | 'FR' | 'IT' | 'EN'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');
      if (saved === 'DE' || saved === 'FR' || saved === 'IT' || saved === 'EN') return saved as any;
      
      // Browser language detection
      const browserLang = navigator.language.split('-')[0].toUpperCase();
      if (['DE', 'FR', 'IT', 'EN'].includes(browserLang)) return browserLang as any;
    }
    return 'DE';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    if (user) {
      supabase.from('users').update({ language }).eq('id', user.id).then(null, e => console.error("Error updating language in DB:", e));
    }
  }, [language, user]);

  // Minimum splash screen duration (3.2s for professional feel)
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 3200);
    return () => clearTimeout(timer);
  }, []);

  // Safety net: if auth hasn't resolved in 10s (e.g. network error), dismiss splash
  useEffect(() => {
    const timer = setTimeout(() => setIsAuthReady(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  // Detect OAuth errors returned in URL after redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error') || hashParams.get('error');
    const oauthDesc = params.get('error_description') || hashParams.get('error_description');
    if (oauthError) {
      console.error('OAuth callback error:', oauthError, oauthDesc);
      showToast(oauthDesc ? decodeURIComponent(oauthDesc.replace(/\+/g, ' ')) : oauthError, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Handle return from Stripe checkout – runs after splash so activeView isn't overwritten
  useEffect(() => {
    if (!splashDone) return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'pricing') {
      setActiveView('pricing');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('payment') === 'success' || params.get('session_id')) {
      setActiveView('pricing');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [splashDone]);

  useEffect(() => {
    if (activeView === 'pricing') setSubscriptionError('');
  }, [activeView]);

  // Browser history (back/forward button support)
  const navigate = (view: 'dashboard' | 'tools' | 'jobs' | 'datenschutz' | 'impressum' | 'agb') => {
    setActiveView(view);
    setActiveTool(null);
    window.history.pushState({ view }, '', `/${view === 'dashboard' ? '' : view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const view = e.state?.view as 'dashboard' | 'tools' | 'jobs' | 'datenschutz' | 'impressum' | 'agb' | undefined;
      if (view) {
        setActiveView(view);
        setActiveTool(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setActiveView('dashboard');
        setActiveTool(null);
      }
    };
    window.addEventListener('popstate', onPop);
    // Set initial history entry so first back-press works
    window.history.replaceState({ view: activeView }, '', window.location.pathname);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      // Default to light for better first-time experience
      return 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    if (user) {
      supabase.from('users').update({ theme }).eq('id', user.id).then(null, e => console.error("Error updating theme in DB:", e));
    }
  }, [theme, user]);
  
  // Tool Modal State
  const [activeTool, setActiveTool] = useState<any | null>(null);
  const [toolInput, setToolInput] = useState<any>({});
  const [toolResult, setToolResult] = useState<string | null>(null);
  const [toolResultEditable, setToolResultEditable] = useState<string>('');
  const [isEditingToolResult, setIsEditingToolResult] = useState(false);
  const [parsedSalaryResult, setParsedSalaryResult] = useState<any | null>(null);
  const [interviewSession, setInterviewSession] = useState<{
    questions: Array<{q: string; tip: string; model: string; mistakes: string}>;
    jobContext: string;
    currentQ: number;
    answers: string[];
    feedbacks: string[];
    isEvaluating: boolean;
    isRecording: boolean;
    isComplete: boolean;
  } | null>(null);
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'essential' | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cookieConsent');
      if (saved === 'accepted' || saved === 'essential') return saved;
    }
    return null;
  });
  const handleCookieAccept = (type: 'accepted' | 'essential') => {
    setCookieConsent(type);
    localStorage.setItem('cookieConsent', type);
  };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [toolStep, setToolStep] = useState(0); // For multi-step tools like Interview Sim
  const [toolHistory, setToolHistory] = useState<any[]>([]);
  
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobFilters, setJobFilters] = useState({ keyword: '', location: '', industry: '' });

  const handleJobClick = (jobId: string) => {
    const job = sampleJobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setIsJobModalOpen(true);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch { return null; }
  };
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getAuthToken();
    return fetch(url, {
      ...options,
      headers: { ...((options.headers as Record<string, string>) || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };

  // --- JOB BOARD COMPONENT ---
  const JobBoard = () => {
    const [liveJobs, setLiveJobs] = useState<any[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLiveResult, setIsLiveResult] = useState(false);
    const [liveSource, setLiveSource] = useState<'adzuna' | 'gemini' | null>(null);
    const [liveTotal, setLiveTotal] = useState<number | null>(null);

    const localFiltered = (sampleJobs as any[]).filter(job => {
      const kw = jobFilters.keyword.toLowerCase();
      const loc = jobFilters.location.toLowerCase();
      const ind = jobFilters.industry.toLowerCase();
      const jobDesc = ((language === 'EN' && job.description_en) || (language === 'FR' && job.description_fr) || (language === 'IT' && job.description_it) || job.description || '').toLowerCase();
      return (!kw || job.title.toLowerCase().includes(kw) || jobDesc.includes(kw) || job.ats_keywords?.some((k: string) => k.toLowerCase().includes(kw)))
        && (!loc || job.location.toLowerCase().includes(loc))
        && (!ind || job.category.toLowerCase().includes(ind));
    });

    const displayJobs = liveJobs !== null ? liveJobs : localFiltered;

    const handleLiveSearch = async () => {
      setIsSearching(true);
      setIsLiveResult(false);
      try {
        const params = new URLSearchParams();
        if (jobFilters.keyword) params.set('keyword', jobFilters.keyword);
        if (jobFilters.location) params.set('location', jobFilters.location);
        if (jobFilters.industry) params.set('category', jobFilters.industry);
        const token = await getAuthToken();
        const isLehrstellen = jobFilters.industry === 'Lehrstellen';
        const endpoint = isLehrstellen
          ? `/api/lehrstellen?keyword=${encodeURIComponent(jobFilters.keyword)}&location=${encodeURIComponent(jobFilters.location)}`
          : `/api/jobs?${params}`;
        const res = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await res.json();
        if (data.jobs && data.jobs.length > 0) {
          setLiveJobs(data.jobs);
          setIsLiveResult(true);
          setLiveSource(data.source || null);
          setLiveTotal(data.total || data.jobs.length);
        } else {
          setLiveJobs([]);
        }
      } catch {
        setLiveJobs(null);
      } finally {
        setIsSearching(false);
      }
    };

    const handleReset = () => {
      setLiveJobs(null);
      setIsLiveResult(false);
      setLiveSource(null);
      setLiveTotal(null);
      setJobFilters({ keyword: '', location: '', industry: '' });
    };

    const handleOpenJob = (url: string, job?: any) => {
      if (url && url !== '#' && url.startsWith('http')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (job) {
        const query = encodeURIComponent(`${job.title} ${job.company}`);
        const loc = encodeURIComponent('Schweiz');
        window.open(`https://ch.indeed.com/jobs?q=${query}&l=${loc}`, '_blank', 'noopener,noreferrer');
      }
    };

    return (
      <div className="space-y-8">
        {/* Lehrstellen banner */}
        <div className="flex gap-3">
          <button
            onClick={() => { setJobFilters({ keyword: '', location: '', industry: '' }); setLiveJobs(null); }}
            className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest border transition-all ${jobFilters.industry === '' || jobFilters.industry !== 'Lehrstellen' ? 'bg-[#004225] text-white border-[#004225]' : 'bg-transparent text-[#004225] dark:text-[#00A854] border-[#004225]/30 hover:border-[#004225]'}`}
          >
            {language === 'FR' ? 'Tous les emplois' : language === 'IT' ? 'Tutti i lavori' : language === 'EN' ? 'All Jobs' : 'Alle Stellen'}
          </button>
          <button
            onClick={() => { setJobFilters({ keyword: '', location: '', industry: 'Lehrstellen' }); setLiveJobs(null); }}
            className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${jobFilters.industry === 'Lehrstellen' ? 'bg-[#004225] text-white border-[#004225]' : 'bg-transparent text-[#004225] dark:text-[#00A854] border-[#004225]/30 hover:border-[#004225]'}`}
          >
            <GraduationCap size={14} />
            {language === 'FR' ? 'Apprentissages' : language === 'IT' ? 'Apprendistati' : language === 'EN' ? 'Apprenticeships' : 'Lehrstellen'}
          </button>
        </div>

        {/* Search bar */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] dark:text-[#5C5C58]">{t.filter_keyword}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94]" size={14} />
              <input
                type="text"
                placeholder={t.search_placeholder}
                className="w-full bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 p-2.5 pl-10 text-sm outline-none focus:border-[#004225]/20 transition-all dark:text-[#FAFAF8]"
                value={jobFilters.keyword}
                onChange={(e) => { setJobFilters({ ...jobFilters, keyword: e.target.value }); setLiveJobs(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLiveSearch()}
              />
            </div>
          </div>
          <div className="w-full md:w-44 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] dark:text-[#5C5C58]">{t.filter_location}</label>
            <input
              type="text"
              placeholder={language === 'FR' ? 'p.ex. Zurich' : language === 'IT' ? 'es. Zurigo' : language === 'EN' ? 'e.g. Zurich' : 'z.B. Zürich'}
              className="w-full bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 p-2.5 text-sm outline-none focus:border-[#004225]/20 transition-all dark:text-[#FAFAF8]"
              value={jobFilters.location}
              onChange={(e) => { setJobFilters({ ...jobFilters, location: e.target.value }); setLiveJobs(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLiveSearch()}
            />
          </div>
          <div className="w-full md:w-44 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] dark:text-[#5C5C58]">{t.filter_industry}</label>
            <select
              className="w-full bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 p-2.5 text-sm outline-none focus:border-[#004225]/20 transition-all dark:text-[#FAFAF8]"
              value={jobFilters.industry}
              onChange={(e) => { setJobFilters({ ...jobFilters, industry: e.target.value }); setLiveJobs(null); }}
            >
              <option value="">{t.filter_all}</option>
              <option value="IT">IT</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance">{language === 'FR' ? 'Finance' : language === 'IT' ? 'Finanza' : language === 'EN' ? 'Finance' : 'Finanzen'}</option>
              <option value="Banking">{language === 'FR' ? 'Banque' : language === 'IT' ? 'Banca' : language === 'EN' ? 'Banking' : 'Banking'}</option>
              <option value="Engineering">{language === 'FR' ? 'Ingénierie' : language === 'IT' ? 'Ingegneria' : language === 'EN' ? 'Engineering' : 'Ingenieurwesen'}</option>
              <option value="HR">{language === 'FR' ? 'RH' : language === 'IT' ? 'HR' : language === 'EN' ? 'HR' : 'HR'}</option>
              <option value="Healthcare">{language === 'FR' ? 'Santé' : language === 'IT' ? 'Sanità' : language === 'EN' ? 'Healthcare' : 'Gesundheitswesen'}</option>
              <option value="Pharma">{language === 'FR' ? 'Pharma' : language === 'IT' ? 'Farmaceutica' : language === 'EN' ? 'Pharma' : 'Pharma'}</option>
              <option value="Logistik">{language === 'FR' ? 'Logistique' : language === 'IT' ? 'Logistica' : language === 'EN' ? 'Logistics' : 'Logistik'}</option>
              <option value="Consulting">{language === 'FR' ? 'Conseil' : language === 'IT' ? 'Consulenza' : language === 'EN' ? 'Consulting' : 'Beratung'}</option>
              <option value="Legal">{language === 'FR' ? 'Droit' : language === 'IT' ? 'Diritto' : language === 'EN' ? 'Legal' : 'Recht'}</option>
              <option value="Education">{language === 'FR' ? 'Éducation' : language === 'IT' ? 'Istruzione' : language === 'EN' ? 'Education' : 'Bildung'}</option>
              <option value="RealEstate">{language === 'FR' ? 'Immobilier' : language === 'IT' ? 'Immobiliare' : language === 'EN' ? 'Real Estate' : 'Immobilien'}</option>
              <option value="Retail">{language === 'FR' ? 'Commerce' : language === 'IT' ? 'Commercio' : language === 'EN' ? 'Retail' : 'Handel'}</option>
              <option value="Hospitality">{language === 'FR' ? 'Hôtellerie' : language === 'IT' ? 'Ospitalità' : language === 'EN' ? 'Hospitality' : 'Gastgewerbe'}</option>
              <option value="Media">{language === 'FR' ? 'Médias' : language === 'IT' ? 'Media' : language === 'EN' ? 'Media' : 'Medien'}</option>
              <option value="Energy">{language === 'FR' ? 'Énergie' : language === 'IT' ? 'Energia' : language === 'EN' ? 'Energy' : 'Energie'}</option>
              <option value="PublicSector">{language === 'FR' ? 'Secteur public' : language === 'IT' ? 'Settore pubblico' : language === 'EN' ? 'Public Sector' : 'Öffentlicher Sektor'}</option>
              <option value="Transport">{language === 'FR' ? 'Transport' : language === 'IT' ? 'Trasporti' : language === 'EN' ? 'Transport' : 'Transport'}</option>
              <option value="NonProfit">{language === 'FR' ? 'ONG / Non-profit' : language === 'IT' ? 'ONG / Non-profit' : language === 'EN' ? 'NGO / Non-Profit' : 'NGO / Non-Profit'}</option>
              <option value="Lehrstellen">{language === 'FR' ? 'Apprentissages' : language === 'IT' ? 'Apprendistati' : language === 'EN' ? 'Apprenticeships' : 'Lehrstellen'}</option>
            </select>
          </div>
          {/* Live Search button */}
          <button
            onClick={handleLiveSearch}
            disabled={isSearching}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#003318] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {isSearching ? (
              <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> {language === 'FR' ? 'Recherche...' : language === 'IT' ? 'Ricerca...' : language === 'EN' ? 'Searching...' : 'Suche...'}</>
            ) : (
              <><Search size={13} /> {language === 'FR' ? 'Recherche IA' : language === 'IT' ? 'Ricerca IA' : language === 'EN' ? 'AI Search' : 'KI-Suche'}</>
            )}
          </button>
          {isLiveResult && (
            <button onClick={handleReset} className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors whitespace-nowrap">
              {language === 'FR' ? 'Réinitialiser' : language === 'IT' ? 'Reimposta' : language === 'EN' ? 'Reset' : 'Zurücksetzen'}
            </button>
          )}
        </div>

        {/* Live result badge */}
        {isLiveResult && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854] animate-pulse" />
              Live · {displayJobs.length} {language === 'FR' ? 'offres affichées' : language === 'IT' ? 'offerte mostrate' : language === 'EN' ? 'jobs shown' : 'Stellen angezeigt'}{liveTotal && liveTotal > displayJobs.length ? ` (${liveTotal.toLocaleString('de-CH')} total)` : ''}
            </div>
            {liveSource === 'adzuna' && (
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                via Adzuna API
              </span>
            )}
            {liveSource === 'gemini' && (
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                {language === 'FR' ? 'via Recherche IA' : language === 'IT' ? 'via Ricerca IA' : language === 'EN' ? 'via AI Search' : 'via KI-Suche'}
              </span>
            )}
          </div>
        )}
        {!isLiveResult && (
          <p className="text-[11px] text-[#9A9A94] dark:text-[#5C5C58]">
            {displayJobs.length} {language === 'FR' ? <>offres exemples · Cliquez sur <strong>Recherche IA</strong> pour des résultats en direct</> : language === 'IT' ? <>offerte esempio · Clicca su <strong>Ricerca IA</strong> per risultati live</> : language === 'EN' ? <>sample jobs · Click <strong>AI Search</strong> for live results</> : <>Muster-Stellen · Klicke <strong>KI-Suche</strong> für echte Live-Ergebnisse</>}
          </p>
        )}

        {/* Job cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {displayJobs.map((job, i) => (
              <motion.div
                key={job.id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                onClick={() => handleOpenJob(job.url, job)}
                className="bg-white dark:bg-[#2A2A26] p-6 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1 flex-1 pr-4">
                    <h3 className="text-lg font-serif group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors dark:text-[#FAFAF8] leading-snug">{job.title}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#9A9A94] dark:text-[#5C5C58]">{job.company}</p>
                  </div>
                  <div className="px-2 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 text-[#004225] dark:text-[#00A854] text-[9px] font-bold uppercase tracking-widest shrink-0">
                    {job.category}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6B6B66] dark:text-[#9A9A94] mb-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    {job.location}
                  </div>
                  {job.salary_min && (
                    <div className="flex items-center gap-1 text-[#004225] dark:text-[#00A854] font-medium">
                      CHF {Math.round(job.salary_min / 1000)}k{job.salary_max ? `–${Math.round(job.salary_max / 1000)}k` : '+'}
                    </div>
                  )}
                </div>
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] line-clamp-2 mb-6 font-light">{(language === 'EN' && job.description_en) || (language === 'FR' && job.description_fr) || (language === 'IT' && job.description_it) || job.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    {job.ats_keywords?.slice(0, 3).map((kw: string) => (
                      <span key={kw} className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-black/5 dark:bg-white/5 text-[#9A9A94] dark:text-[#5C5C58]">{kw}</span>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {t.tool_open} <ArrowRight size={12} />
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {displayJobs.length === 0 && !isSearching && (
          <div className="py-24 text-center space-y-4">
            <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-[#9A9A94]">
              <Search size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-serif dark:text-[#FAFAF8]">{t.search_no_results}</h3>
              <p className="text-sm text-[#9A9A94] font-light">{t.search_no_results_desc}</p>
            </div>
          </div>
        )}

        {/* External links */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] dark:text-[#5C5C58] mb-3">{language === 'FR' ? 'Rechercher d\'autres postes directement' : language === 'IT' ? 'Cerca altri posti direttamente' : language === 'EN' ? 'Search more jobs directly' : 'Weitere Stellen direkt suchen'}</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Jobs.ch', url: 'https://www.jobs.ch/de/vakanzen/' },
              { label: 'Indeed CH', url: 'https://ch.indeed.com/' },
              { label: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/search/?location=Switzerland' },
              { label: 'Jobup.ch', url: 'https://www.jobup.ch/de/jobs/' },
              { label: 'Yousty.ch', url: 'https://www.yousty.ch/de-CH/stellen' },
            ].map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] dark:text-[#9A9A94] hover:border-[#004225] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors flex items-center gap-1"
              >
                {label} <ArrowRight size={10} />
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [hasPromoOpened, setHasPromoOpened] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasPromoOpened) {
        setIsPromoOpen(true);
        setHasPromoOpened(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasPromoOpened]);
  useEffect(() => {
    const hasSeenPromo = localStorage.getItem('hasSeenPromo');
    if (!hasSeenPromo) {
      const timer = setTimeout(() => {
        setIsPromoOpen(true);
        localStorage.setItem('hasSeenPromo', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expiryBanner, setExpiryBanner] = useState<{ daysLeft: number; interval: 'monthly' | 'annual' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [showSwissNotice, setShowSwissNotice] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [linkedinProfile, setLinkedinProfile] = useState<any | null>(null);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [authError, setAuthError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkedinImageInputRef = useRef<HTMLInputElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const [isExtractingImage, setIsExtractingImage] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const processUserData = (rawData: any, supaUser: any) => {
      if (rawData?.language && rawData.language !== language) setLanguage(rawData.language);
      if (rawData?.theme && rawData.theme !== theme) setTheme(rawData.theme);

      const rawName = rawData?.first_name || supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Nutzer';
      const cleanName = rawName.replace(/\./g, ' ');
      const formattedName = cleanName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const sanitizedFirstName = formattedName === 'Gast' ? 'Nutzer' : formattedName;

      let effectiveRole = rawData?.role || 'client';
      const expiresAt = rawData?.subscription_expires_at ? new Date(rawData.subscription_expires_at) : null;
      const now = new Date();
      if (expiresAt && (effectiveRole === 'pro' || effectiveRole === 'unlimited')) {
        const msLeft = expiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / 86400000);
        if (msLeft <= 0) {
          effectiveRole = 'client';
          supabase.from('users').update({ role: 'client' }).eq('id', supaUser.id).then(null, console.error);
        } else {
          const threshold = rawData.subscription_interval === 'annual' ? 14 : 3;
          if (daysLeft <= threshold) setExpiryBanner({ daysLeft, interval: rawData.subscription_interval || 'monthly' });
          else setExpiryBanner(null);
        }
      }

      const newUser: UserData = {
        id: supaUser.id,
        email: supaUser.email || '',
        firstName: sanitizedFirstName,
        freeGenerationsUsed: rawData?.free_generations_used || 0,
        toolUses: rawData?.tool_uses || 0,
        dailyToolUses: rawData?.daily_tool_uses || 0,
        lastDailyReset: rawData?.last_daily_reset || null,
        lastMonthlyReset: rawData?.last_monthly_reset || null,
        cvContext: rawData?.cv_context || null,
        role: effectiveRole,
        hasSeenTutorial: rawData?.has_seen_tutorial || false,
        subscriptionExpiresAt: rawData?.subscription_expires_at || undefined,
        subscriptionInterval: rawData?.subscription_interval || undefined,
        stripeCustomerId: rawData?.stripe_customer_id || undefined,
        searchUses: rawData?.search_uses || 0,
      };
      setUser(newUser);

      if (rawData) {
        const today = new Date().toISOString().split('T')[0];
        if (rawData.last_daily_reset !== today) {
          supabase.from('users').update({ daily_tool_uses: 0, last_daily_reset: today }).eq('id', supaUser.id).then(null, console.error);
        }

        const currentMonth = new Date().toISOString().substring(0, 7);
        if ((effectiveRole === 'pro' || effectiveRole === 'unlimited') && rawData.last_monthly_reset !== currentMonth) {
          supabase.from('users').update({ tool_uses: 0, free_generations_used: 0, search_uses: 0, last_monthly_reset: currentMonth }).eq('id', supaUser.id).then(null, console.error);
        }

        if (!rawData.has_seen_tutorial) setIsTutorialOpen(true);
        if (rawData.cv_context) setCvContext(rawData.cv_context);
      }
    };

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }

      if (session?.user) {
        const supaUser = session.user;

        try {
          const { data: existingUser } = await supabase.from('users').select('id').eq('id', supaUser.id).single();
          if (!existingUser) {
            const rawName = supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Nutzer';
            const cleanName = rawName.replace(/\./g, ' ');
            const formattedName = cleanName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            const { error: insertError } = await supabase.from('users').insert({
              id: supaUser.id,
              email: supaUser.email || '',
              first_name: formattedName,
              role: 'client',
              free_generations_used: 0,
              tool_uses: 0,
              daily_tool_uses: 0,
              last_daily_reset: new Date().toISOString().split('T')[0],
              has_seen_tutorial: false,
              language,
              theme,
              cv_context: cvContext || null,
            });
            if (insertError) console.error('Error creating user profile:', insertError);
            if (event === 'SIGNED_IN' && supaUser.app_metadata?.provider !== 'email') {
              fetch('/api/send-welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: supaUser.email, firstName: formattedName, language }),
              }).then(null, console.error);
            }
          }
        } catch (e) {
          console.error('Error ensuring user exists:', e);
        }

        try {
          const { data: userData } = await supabase.from('users').select('*').eq('id', supaUser.id).single();
          processUserData(userData, supaUser);
        } catch (e) {
          console.error('Error loading user profile:', e);
          processUserData(null, supaUser);
        } finally {
          setIsAuthReady(true);
        }

        const userChannel = supabase
          .channel(`user-${supaUser.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${supaUser.id}` } as any, (payload: any) => {
            processUserData(payload.new, supaUser);
          })
          .subscribe();

        unsubscribeUser = () => { supabase.removeChannel(userChannel); };
      } else {
        // If INITIAL_SESSION fires with no session but OAuth tokens are already in
        // the URL hash, Supabase is still processing them — SIGNED_IN will follow
        // momentarily. Don't dismiss the splash or reset user state yet.
        if (event === 'INITIAL_SESSION' && window.location.hash.includes('access_token=')) return;
        setUser(null);
        setIsAuthReady(true);
      }
    });

    return () => {
      authSubscription.unsubscribe();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([{ role: 'ai', content: t.stella_greeting.replace('{name}', 'Nutzer') }]);
      return;
    }

    supabase.from('messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: true }).limit(50).then(({ data: msgs }) => {
      if (msgs && msgs.length > 0) {
        setMessages(msgs as Message[]);
      } else {
        setMessages([{ role: 'ai', content: t.stella_greeting.replace('{name}', user.firstName) }]);
      }
    });

    const msgChannel = supabase
      .channel(`messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` } as any, (payload: any) => {
        setMessages(prev => [...prev, { role: payload.new.role, content: payload.new.content }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [user]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (origin !== window.location.origin) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'linkedin') {
        const profile = event.data.profile;
        setLinkedinProfile(profile);
        
        // Update CV Context if it's empty
        if (!cvContext && profile.name) {
          const importedContext = `Name: ${profile.name}\nEmail: ${profile.email}\nLinkedIn Import: ${JSON.stringify(profile)}`;
          setCvContext(importedContext);
          
          // Save to Supabase if user is logged in
          if (user) {
            supabase.from('users').update({ cv_context: importedContext }).eq('id', user.id)
              .then(null, err => handleDbError(err, 'db', 'users'));
          }
        }
        
        const importMsg = language === 'FR'
          ? `Parfait ! J'ai importé ton profil LinkedIn (${profile.name}) avec succès. J'utilise maintenant ces informations pour rendre tes candidatures encore plus précises.`
          : language === 'IT'
          ? `Perfetto! Ho importato con successo il tuo profilo LinkedIn (${profile.name}). Userò ora queste informazioni per rendere le tue candidature ancora più precise.`
          : language === 'EN'
          ? `Perfect! I've successfully imported your LinkedIn profile (${profile.name}). I'll use this information to make your applications even more precise.`
          : `Perfekt! Ich habe dein LinkedIn-Profil (${profile.name}) erfolgreich importiert. Ich nutze diese Informationen nun, um deine Bewerbungen noch präziser zu gestalten.`;
        setMessages(prev => [...prev, { role: 'ai', content: importMsg }]);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [user, cvContext, language]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filteredSearchData = searchData.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const filteredTools = tools.filter(tool => 
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.desc.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(tool => ({
        id: tool.id,
        title: tool.title,
        content: tool.desc,
        category: 'Tool',
        type: 'tool'
      }));

      const filteredFaqs = faqs.filter(faq => 
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
      ).map((faq, index) => ({
        id: `faq-${index}`,
        title: faq.q,
        content: faq.a,
        category: 'FAQ',
        type: 'faq'
      }));

      const filteredJobs = sampleJobs.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(job => ({
        id: job.id,
        title: job.title,
        content: `${job.company} • ${job.location} • ${job.category}`,
        category: language === 'DE' ? 'Job' : 'Job',
        type: 'job'
      }));

      const userResult = user && (
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        'profil'.includes(searchQuery.toLowerCase()) ||
        'meine daten'.includes(searchQuery.toLowerCase()) ||
        'cv'.includes(searchQuery.toLowerCase()) ||
        'lebenslauf'.includes(searchQuery.toLowerCase())
      ) ? [{
        id: 'user-profile',
        title: `${user.firstName} (Dein Profil)`,
        content: language === 'DE' ? 'Verwalte deine persönlichen Daten, deinen Lebenslauf und deine Einstellungen.' : language === 'FR' ? 'Gérez vos données personnelles, votre CV et vos paramètres.' : language === 'IT' ? 'Gestisci i tuoi dati personali, il tuo CV e le tue impostazioni.' : 'Manage your personal data, your CV and your settings.',
        category: t.profile,
        type: 'profile'
      }] : [];

      const results = [...userResult, ...filteredSearchData, ...filteredTools, ...filteredFaqs, ...filteredJobs];
      setSearchResults(results);
      setSelectedSearchIndex(results.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    supabase.from('applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setApplications(data);
    });
    const appChannel = supabase.channel(`apps-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${user.id}` } as any, () => {
        supabase.from('applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setApplications(data); });
      })
      .subscribe();
    return () => { supabase.removeChannel(appChannel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('cv_analyses').select('data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data?.[0]) setLatestAnalysis(data[0].data);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('tool_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10).then(({ data }) => {
      if (data) setToolHistory(data);
    });
  }, [user]);

  const [careerRoadmap, setCareerRoadmap] = useState<string[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);
  const [salaryCalculations, setSalaryCalculations] = useState<any[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    if (!user) return;
    supabase.from('salary_calculations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data) setSalaryCalculations(data);
    });
  }, [user]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      } catch (e) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  const generateRoadmap = async () => {
    if (!cvContext || isGeneratingRoadmap) return;
    setIsGeneratingRoadmap(true);
    try {
      // Using backend API for initial roadmap structure
      const res = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { text: cvContext.substring(0, 500) } })
      });
      const data = await res.json();
      
      if (data.success) {
        setCareerRoadmap(data.roadmap.slice(0, 3));
      } else {
        // Fallback to backend AI if first endpoint fails
        const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
        const isPro = user?.role === 'pro' || isUnlimited;
        const model = isPro ? PRO_MODEL : FLASH_MODEL;
        const res2 = await authFetch('/api/process-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Basierend auf diesem CV: ${cvContext.substring(0, 1000)}, erstelle eine 3-stufige Karriere-Roadmap für den Schweizer Markt. Gib nur die 3 Schritte als nummerierte Liste zurück, kurz und präzise.`,
            model
          })
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2.error || 'Roadmap-Generierung fehlgeschlagen');
        const steps = (data2.text || '').split('\n').filter((s: string) => s.trim()).slice(0, 3);
        if (steps.length > 0) setCareerRoadmap(steps);
      }
    } catch (e) {
      console.error("Roadmap Error:", e);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  useEffect(() => {
    if (cvContext && careerRoadmap.length === 0) {
      generateRoadmap();
    }
  }, [cvContext]);

  useEffect(() => {
    if (cvContext && !latestAnalysis) {
      analyzeCV(cvContext);
    }
  }, [cvContext]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      setUploadProgress(Math.round((i / pdf.numPages) * 100));
    }

    return fullText;
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    setUploadProgress(50);
    const result = await mammoth.extractRawText({ arrayBuffer });
    setUploadProgress(100);
    return result.value;
  };

  const extractTextFromImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          const idToken = await getAuthToken();
          const r = await fetch('/api/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
            body: JSON.stringify({ base64, mimeType }),
          });
          if (!r.ok) throw new Error('Bildanalyse fehlgeschlagen');
          const data = await r.json();
          resolve(data.text || '');
        } catch (err) { reject(err); }
      };
      reader.readAsDataURL(file);
    });
  };

  const analyzeCV = async (text: string) => {
    try {
      const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
      const isPro = user?.role === 'pro' || isUnlimited;
      const model = isPro ? PRO_MODEL : FLASH_MODEL;

      const prompt = `Führe eine tiefgehende Analyse des folgenden Lebenslaufs für den Schweizer Arbeitsmarkt durch. CV: ${text.substring(0, 3000)}.

Antworte NUR mit einem validen JSON-Objekt ohne Markdown-Codeblock, mit exakt diesen Feldern:
{
  "keywords": ["keyword1", "keyword2", ...],
  "industryMatch": "Branchen-String",
  "improvements": ["punkt1", "punkt2", "punkt3"],
  "score": 75,
  "optimizedHighlights": ["highlight1", "highlight2", "highlight3"],
  "optimizedSummary": "Kurzprofil-Text"
}`;

      const res = await authFetch('/api/process-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'CV-Analyse fehlgeschlagen');
      const jsonMatch = (data.text || '').match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const analysisData = JSON.parse(jsonMatch[0]);
      setLatestAnalysis(analysisData);
      
      if (user) {
        await supabase.from('cv_analyses').insert({ user_id: user.id, data: analysisData });
      }
    } catch (e) {
      console.error("CV Analysis Error:", e);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    if (!user) {
      setAuthTab('register');
      setIsAuthModalOpen(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDocx(file);
      } else {
        text = `Inhalt von ${file.name}`;
        setUploadProgress(100);
      }
      
      setCvContext(text);
      
      // Trigger AI Analysis
      analyzeCV(text);
      
      // Call backend for metadata analysis
      try {
        await fetch('/api/analyze-cv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.substring(0, 1000) })
        });
      } catch (e) {
        console.warn("Backend analysis failed, continuing with frontend only.");
      }
      
      // Persist CV context if user is logged in
      if (user) {
        try {
          await supabase.from('users').update({ cv_context: text }).eq('id', user.id);
        } catch (error) {
          handleDbError(error, 'db', `users/${user.id}`);
        }
      }

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Ich habe dein CV "${file.name}" erfolgreich eingelesen. Ich habe den Inhalt analysiert und bin bereit, dir bei deinen Bewerbungen zu helfen!` 
      }]);
      
      if (!isStellaOpen) setIsStellaOpen(true);
    } catch (error) {
      console.error("PDF extraction error:", error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Entschuldigung, beim Einlesen deines CVs "${file.name}" ist ein Fehler aufgetreten. Bitte versuche es mit einer anderen Datei.` 
      }]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (password !== confirmPassword) {
          setAuthError(
            language === 'DE' ? 'Die Passwörter stimmen nicht überein.' :
            language === 'FR' ? 'Les mots de passe ne correspondent pas.' :
            language === 'IT' ? 'Le password non corrispondono.' :
            'Passwords do not match.'
          );
          setIsAuthLoading(false);
          return;
        }
        if (password.length < 6) {
          setAuthError(
            language === 'DE' ? 'Das Passwort muss mindestens 6 Zeichen haben.' :
            language === 'FR' ? 'Le mot de passe doit comporter au moins 6 caractères.' :
            language === 'IT' ? 'La password deve avere almeno 6 caratteri.' :
            'Password must be at least 6 characters.'
          );
          setIsAuthLoading(false);
          return;
        }
        const emailPrefix = email.split('@')[0] || 'Nutzer';
        const rawName = firstName === 'Gast' ? 'Nutzer' : (firstName || emailPrefix);
        const cleanName = rawName.replace(/\./g, ' ');
        const formattedName = cleanName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: formattedName } }
        });
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          await supabase.from('users').insert({
            id: signUpData.user.id,
            email: signUpData.user.email || '',
            first_name: formattedName,
            role: 'client',
            cv_context: cvContext || null,
            free_generations_used: 0,
          });
          fetch('/api/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: signUpData.user.email, firstName: formattedName, language }),
          }).then(null, console.error);
        }
      }
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
    } catch (err: any) {
      console.error("Auth Error:", err);
      const msg: string = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setAuthError(
          language === 'DE' ? 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.' :
          language === 'FR' ? 'Identifiants invalides. Veuillez vérifier votre e-mail et mot de passe.' :
          language === 'IT' ? 'Credenziali non valide. Verifica email e password.' :
          'Invalid credentials. Please check your email and password.'
        );
      } else if (msg.includes('User already registered') || msg.includes('already exists')) {
        setAuthError(
          language === 'DE' ? 'Diese E-Mail wird bereits verwendet. Bitte melde dich stattdessen an.' :
          language === 'FR' ? 'Cet e-mail est déjà utilisé. Veuillez vous connecter à la place.' :
          language === 'IT' ? 'Questa email è già in uso. Accedi invece.' :
          'This email is already in use. Please log in instead.'
        );
        if (authTab === 'register') setAuthTab('login');
      } else if (msg.includes('Password should be')) {
        setAuthError(
          language === 'DE' ? 'Das Passwort ist zu schwach (mind. 6 Zeichen)' :
          language === 'FR' ? 'Le mot de passe est trop faible' :
          language === 'IT' ? 'La password è troppo debole' :
          'The password is too weak'
        );
      } else {
        setAuthError(
          language === 'DE' ? 'Authentifizierung fehlgeschlagen' :
          language === 'FR' ? 'Échec de l\'authentification' :
          language === 'IT' ? 'Autenticazione fallita' :
          'Authentication failed'
        );
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError(
        language === 'DE' ? 'Bitte gib deine E-Mail-Adresse ein.' :
        language === 'FR' ? 'Veuillez entrer votre adresse e-mail.' :
        language === 'IT' ? 'Per favore inserisci il tuo indirizzo email.' :
        'Please enter your email address.'
      );
      return;
    }
    
    setIsAuthLoading(true);
    try {
      const res = await fetch('/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language }),
      });
      if (res.status === 429) {
        setAuthError(
          language === 'DE' ? 'Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.' :
          language === 'FR' ? 'Trop de tentatives. Veuillez attendre 15 minutes et réessayer.' :
          language === 'IT' ? 'Troppi tentativi. Attendi 15 minuti e riprova.' :
          'Too many attempts. Please wait 15 minutes and try again.'
        );
      } else if (res.status === 404) {
        // Email not registered → switch to register
        setAuthError(
          language === 'DE' ? 'Diese E-Mail-Adresse ist nicht registriert. Bitte erstelle zuerst ein Konto.' :
          language === 'FR' ? 'Cette adresse e-mail n\'est pas enregistrée. Veuillez d\'abord créer un compte.' :
          language === 'IT' ? 'Questo indirizzo email non è registrato. Crea prima un account.' :
          'This email address is not registered. Please create an account first.'
        );
        setTimeout(() => { setAuthTab('register'); setAuthError(''); }, 2000);
      } else {
        setAuthError(
          language === 'DE' ? 'E-Mail gesendet! Schaue in deinem Postfach nach dem Link zum Zurücksetzen deines Passworts.' :
          language === 'FR' ? 'E-mail envoyé ! Vérifiez votre boîte de réception pour le lien de réinitialisation.' :
          language === 'IT' ? 'Email inviata! Controlla la tua casella di posta per il link di reimpostazione.' :
          'Email sent! Check your inbox for the password reset link.'
        );
      }
    } catch (err: any) {
      console.error("Reset Error:", err);
      setAuthError(
        language === 'DE' ? 'Fehler beim Senden. Bitte versuche es erneut.' :
        language === 'FR' ? 'Erreur lors de l\'envoi. Veuillez réessayer.' :
        language === 'IT' ? 'Errore durante l\'invio. Riprova.' :
        'Error sending. Please try again.'
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLinkedInAuth = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error("LinkedIn Auth Error:", err);
      const errorMsg = language === 'DE' ? 'LinkedIn-Anmeldung fehlgeschlagen.' : language === 'FR' ? 'Échec de la connexion LinkedIn.' : language === 'IT' ? 'Accesso LinkedIn fallito.' : 'LinkedIn authentication failed.';
      setAuthError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      const errorMsg = language === 'DE' ? 'Google-Anmeldung fehlgeschlagen.' : language === 'FR' ? 'Échec de la connexion Google.' : language === 'IT' ? 'Accesso Google fallito.' : 'Google authentication failed.';
      setAuthError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    setDeleteError('');
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      await supabase.auth.signOut();
      setIsDeleteAccountOpen(false);
      setUser(null);
      showToast(
        language === 'DE' ? 'Konto erfolgreich gelöscht.' : language === 'FR' ? 'Compte supprimé avec succès.' : language === 'IT' ? 'Account eliminato con successo.' : 'Account deleted successfully.',
        'success'
      );
    } catch (err: any) {
      console.error('Delete account error:', err);
      setDeleteError(language === 'DE' ? 'Fehler beim Löschen. Bitte erneut versuchen.' : language === 'FR' ? 'Erreur lors de la suppression. Veuillez réessayer.' : language === 'IT' ? 'Errore durante la cancellazione. Riprovare.' : 'Error deleting account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    setIsSavingName(true);
    try {
      const cleanName = newName.trim().replace(/\./g, ' ');
      const formattedName = cleanName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      
      await supabase.from('users').update({ first_name: formattedName }).eq('id', user.id);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleLinkedInConnect = async () => {
    try {
      const res = await fetch('/api/auth/linkedin/url');
      if (!res.ok) throw new Error('Failed to get LinkedIn auth URL');
      const { url } = await res.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'linkedin_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      console.error('LinkedIn connect error:', err);
      showToast(t.linkedin_import_error, 'error');
    }
  };

  const addApplication = async () => {
    if (!user || !newApp.company || !newApp.position) return;
    try {
      await supabase.from('applications').insert({ ...newApp, user_id: user.id });
      setIsAddingApp(false);
      setNewApp({ company: '', position: '', status: 'Applied', location: '', salary: '', notes: '' });
    } catch (e) {
      handleDbError(e, 'db', `applications`);
    }
  };

  const updateApplication = async () => {
    if (!user || !editingApp || !editingApp.company || !editingApp.position) return;
    try {
      const { id, user_id, created_at, ...fields } = editingApp;
      await supabase.from('applications').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', editingApp.id).eq('user_id', user.id);
      setEditingApp(null);
    } catch (e) {
      handleDbError(e, 'db', `applications/${editingApp.id}`);
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string) => {
    if (!user) return;
    try {
      await supabase.from('applications').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', appId).eq('user_id', user.id);
    } catch (e) {
      handleDbError(e, 'db', `applications/${appId}`);
    }
  };

  const deleteApplication = async (appId: string) => {
    if (!user) return;
    try {
      await supabase.from('applications').delete().eq('id', appId).eq('user_id', user.id);
    } catch (e) {
      handleDbError(e, 'db', `applications/${appId}`);
    }
  };

  const sendMessage = async (overrideContent?: string) => {
    const userContent = overrideContent || input;
    if (!userContent.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', content: userContent };

    if (!user) {
      setMessages(prev => [
        ...prev,
        userMsg,
        { role: 'ai', content: 'Um Stella zu nutzen, musst du dich zuerst **kostenlos registrieren**. Klicke auf "Kostenlos starten" oben rechts – es dauert nur 30 Sekunden! 🚀' }
      ]);
      if (!overrideContent) setInput('');
      setAuthTab('register');
      setIsAuthModalOpen(true);
      return;
    } else {
      try {
        await supabase.from('messages').insert({ user_id: user.id, role: 'user', content: userContent });
      } catch (error) {
        handleDbError(error, 'db', 'messages');
      }
    }

    if (!overrideContent) setInput('');
    setIsTyping(true);

    // Check if the question is about Stellify or if user is Pro
    const isAboutStellify = /stellify|preis|abo|kosten|feature|tool|hilfe|support|wer|was ist/i.test(userContent);
    const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
    const isPro = user?.role === 'pro' || isUnlimited;

    // Limits: 
    // Free: 3 messages
    // Pro: 50 messages
    // Unlimited: Unlimited
    const messagesUsed = user?.freeGenerationsUsed || 0;
    const dailyUsage = user?.dailyToolUses || 0;
    
    const isLimitReached = (!isPro && messagesUsed >= 3) || (user?.role === 'pro' && !isUnlimited && messagesUsed >= 50);
    const isDailyLimitReached = user?.role === 'pro' && !isUnlimited && dailyUsage >= 20;

    if (!isAboutStellify && (isLimitReached || isDailyLimitReached)) {
      const limitMsg = isDailyLimitReached 
        ? t.tool_daily_limit_pro
        : (user?.role === 'pro' ? t.tool_limit_pro : t.tool_limit_free);
      
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: limitMsg }]);
      } else {
        try {
          await supabase.from('messages').insert({ user_id: user.id, role: 'ai', content: limitMsg });
        } catch (error) {
          handleDbError(error, 'db', 'messages');
        }
      }
      setIsTyping(false);
      return;
    }

    // Increment usage for non-unlimited users
    if (user && !isUnlimited) {
      try {
        await supabase.from('users').update({
          free_generations_used: (user.freeGenerationsUsed || 0) + 1,
          daily_tool_uses: (user.dailyToolUses || 0) + 1,
        }).eq('id', user.id);
      } catch (e) {
        console.error("Error incrementing message count:", e);
      }
    }

    try {
      const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
      const isPro = user?.role === 'pro' || isUnlimited;
      const model = isPro ? PRO_MODEL : FLASH_MODEL;

      const systemInstruction = `
        IDENTITY: You are Stella, the exclusive AI career expert from Stellify.
        TONE: Your style is "Rolex-inspired": Luxurious, timeless, precise, minimalistic, and absolutely trustworthy.
        You are not a "chatbot assistant", but a high-caliber career advisor for the Swiss market.

        PREMIUM EFFICIENCY:
        - CONCISE & ELITE: Be extremely precise. Every word must add value.
        - PROFESSIONALISM: Use a brief, high-end greeting if appropriate (e.g., "Grüezi ${user?.firstName || 'User'}", "Bonjour", "Buongiorno").
        - STRUCTURE: Use a sophisticated mix of concise paragraphs and bullet points (*) for maximum clarity.
        - SWISS PRECISION: Focus on facts and strategic advice. Avoid generic filler phrases.
        - MAX LENGTH: Aim for high impact in few words. Stay under 150 words unless the complexity of the query requires more depth.

        EXPERTISE:
        - Swiss Job Market: You know the differences between cantons (e.g., ZH vs. GE), industries (Pharma, Banking, SME), and salary benchmarks (Salarium).
        - Swiss Standards: You know that in Switzerland "ss" is used instead of "ß". You know the "work certificate code".
        - ATS Optimization: You know how Swiss recruiter software works.
        - Interview Preparation: You know exactly what Swiss recruiters ask and how to answer strategically.

        BEHAVIOR:
        - Be proactive: Offer the next logical step briefly.
        - Personalize: Use the context of the uploaded CV intensively.
        - PREMIUM GUIDANCE: When a user asks about advanced features (e.g., unlimited CV analyses, advanced job matching, interview coaching, salary tools, unlimited messages), ALWAYS mention that these are available in the Pro or Ultimate plan on Stellify. Guide them clearly to the pricing/plans section. Example: "This feature is available in the Pro plan — you can upgrade directly in the Stellify pricing section." Adapt to the user's language.

        LANGUAGE:
        - Respond in the user's selected language: ${language}.
        - If the language is German, use Swiss High German (no "ß", use "ss").

        USER TIER: ${user?.role === 'unlimited' ? 'Unlimited (Highest Priority/Elite)' : user?.role === 'pro' ? 'Pro (Premium)' : 'Gratis (Standard)'}.
        ${!isPro ? '- FREE USER: This user is on the free plan. When relevant, briefly and elegantly mention the benefits of upgrading to Pro or Ultimate. Do not be pushy — mention it naturally when it adds value.' : ''}

        CONTEXT:
        ${cvContext ? `The candidate has uploaded a CV: ${cvContext}.` : 'The candidate has not yet uploaded a CV. Politely encourage them to do so to receive personalized tips.'}
        Candidate: ${user?.firstName || 'User'}.
      `;

      const chatRes = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userContent,
          messages: messages.slice(-10).map((h: Message) => ({
            role: h.role === "ai" ? "model" : "user",
            parts: [{ text: h.content }]
          })),
          systemInstruction,
          model
        })
      });
      const chatData = await chatRes.json();
      if (chatRes.status === 429) throw new Error(chatData.error || 'rate limit');
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat failed');

      const reply = chatData.text || (language === 'DE' ? "Stella ist gerade nachdenklich. Bitte versuche es noch einmal." : language === 'FR' ? "Stella est en train de réfléchir. Veuillez réessayer." : language === 'IT' ? "Stella sta riflettendo. Si prega di riprovare." : "Stella is currently thoughtful. Please try again.");
      
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      } else {
        try {
          await supabase.from('messages').insert({ user_id: user.id, role: 'ai', content: reply });
        } catch (error) {
          handleDbError(error, 'db', 'messages');
        }
      }
    } catch (err: any) {
      console.error("Stella Chat Error:", err);
      const isOverloaded = err.message?.includes('overloaded') || err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('high demand');
      let errorMsg = isOverloaded
        ? (language === 'DE' ? 'Stella ist gerade sehr gefragt – bitte warte kurz und versuche es in 1–2 Minuten erneut.'
          : language === 'FR' ? 'Stella est très demandée en ce moment – réessaie dans 1–2 minutes.'
          : language === 'IT' ? 'Stella è molto richiesta in questo momento – riprova tra 1–2 minuti.'
          : 'Stella is very busy right now – please try again in 1–2 minutes.')
        : (language === 'DE' ? 'Stella hat gerade ein technisches Problem. Bitte versuche es später noch einmal.'
          : language === 'FR' ? 'Stella rencontre un problème technique. Veuillez réessayer plus tard.'
          : language === 'IT' ? 'Stella ha un problema tecnico. Si prega di riprovare più tardi.'
          : 'Stella is having a technical issue. Please try again later.');

      if (err.message?.includes('rate limit') || err.message?.includes('Too many') || err.message?.includes('Zu viele')) {
        errorMsg = language === 'DE'
          ? "Du hast zu viele Nachrichten gesendet. Bitte warte eine Minute und versuche es erneut."
          : language === 'FR' ? "Vous avez envoyé trop de messages. Veuillez attendre une minute et réessayer."
          : language === 'IT' ? "Hai inviato troppi messaggi. Attendi un minuto e riprova."
          : "You've sent too many messages. Please wait a minute and try again.";
      } else if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
        errorMsg = language === 'DE'
          ? "Stella hat ein Problem mit ihrem Zugangsschlüssel. Bitte kontaktiere den Support."
          : language === 'FR' ? "Stella a un problème avec sa clé d'accès. Veuillez contacter le support."
          : language === 'IT' ? "Stella ha un problema con la sua chiave di accesso. Si prega di contattare il supporto."
          : "Stella is having trouble with her API key. Please contact support.";
      } else if (err.message?.includes('quota') || err.message?.includes('429')) {
        errorMsg = language === 'DE'
          ? "Stella hat heute schon zu viele Anfragen beantwortet. Bitte versuche es morgen wieder oder upgrade dein Abo."
          : language === 'FR' ? "Stella a déjà répondu à trop de demandes aujourd'hui. Veuillez réessayer demain ou mettre à niveau votre abonnement."
          : language === 'IT' ? "Stella ha già risposto a troppe richieste oggi. Si prega di riprovare domani o aggiornare l'abbonamento."
          : "Stella has answered too many requests today. Please try again tomorrow or upgrade your subscription.";
      }
      
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      } else {
        try {
          await supabase.from('messages').insert({ user_id: user.id, role: 'ai', content: errorMsg });
        } catch (error) {
          handleDbError(error, 'db', 'messages');
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleToolClick = (toolId: string) => {
    if (!user) {
      setAuthTab('login');
      setIsAuthModalOpen(true);
      return;
    }

    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;

    setActiveView('dashboard');
    setActiveTool(tool);
    setToolInput({});
    setToolResult(null);
    setToolResultEditable('');
    setIsEditingToolResult(false);
  };

  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscription = async (plan: 'pro' | 'ultimate') => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setIsSubscribing(true);
    setSubscriptionError('');
    
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId: plan,
          billingCycle,
          successUrl: window.location.origin + '?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.origin + '?view=pricing'
        })
      });

      const data = await res.json().catch(() => ({ error: 'Server-Fehler' }));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout fehlgeschlagen');
      }
    } catch (e: any) {
      console.error("Subscription error:", e);
      const msg = e.message || '';
      // Always show the actual error so the user/admin can diagnose it
      const userMsg = msg.includes('test mode') || msg.includes('live mode')
        ? 'Stripe-Konfigurationsfehler: Bitte die Preise im richtigen Modus (Test/Live) erstellen.'
        : msg.includes('No such price') || msg.includes('price')
        ? 'Ungültige Preis-Konfiguration. Bitte Support kontaktieren.'
        : msg || 'Checkout konnte nicht gestartet werden.';
      setSubscriptionError(userMsg);
    } finally {
      setIsSubscribing(false);
    }
  };

  const processTool = async () => {
    if (!activeTool) return;
    
    setIsProcessingTool(true);
    setToolResult(null);
    setToolResultEditable('');
    setIsEditingToolResult(false);
    setParsedSalaryResult(null);

    const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
    const isPro = user?.role === 'pro' || isUnlimited;

    // Check if tool is ultimate-only
    if (activeTool.type === 'ultimate' && !isUnlimited) {
      setToolResult(
        language === 'DE'
          ? "Dieses exklusive Tool erfordert ein Ultimate-Abo für maximale Präzision und Tiefe. ✨"
          : language === 'FR' ? "Cet outil exclusif nécessite un abonnement Ultimate pour une précision et une profondeur maximales. ✨"
          : language === 'IT' ? "Questo strumento esclusivo richiede un abbonamento Ultimate per la massima precisione e profondità. ✨"
          : "This exclusive tool requires an Ultimate subscription for maximum precision and depth. ✨"
      );
      setIsProcessingTool(false);
      return;
    }

    // Tool Limits:
    // Free: 1 use
    // Pro: 50 uses
    // Unlimited: Unlimited
    const toolUses = user?.toolUses || 0;
    const dailyToolUses = user?.dailyToolUses || 0;
    const searchUses = user?.searchUses || 0;
    
    const isToolLimitReached = (!isPro && toolUses >= 3) || (user?.role === 'pro' && !isUnlimited && toolUses >= 50);
    const isDailyLimitReached = user?.role === 'pro' && !isUnlimited && dailyToolUses >= 20;

    if (isToolLimitReached || isDailyLimitReached) {
      if (isDailyLimitReached) {
        setToolResult(t.tool_daily_limit_pro);
      } else {
        setToolResult(
          user?.role === 'pro'
            ? t.tool_limit_pro
            : t.tool_limit_free
        );
      }
      setIsProcessingTool(false);
      return;
    }

    try {
      const model = isPro ? PRO_MODEL : FLASH_MODEL;

      let prompt = `
        LANGUAGE: Respond in ${language}. 
        If German, use Swiss High German (ss instead of ß).
        ${isUnlimited ? 'MODE: DEEP_ANALYSIS (Provide maximum detail, cross-reference Swiss market data, and offer high-end strategic advice).' : ''}
      `;
      let useSearch = false;

      // Check for search tools
      if (activeTool.id === 'job-search' || activeTool.id === 'lehrstellen') {
        // Enforce Search Limits
        if (user?.role === 'pro' && searchUses >= 10) {
          setToolResult(t.tool_limit_search_pro);
          setIsProcessingTool(false);
          return;
        }
        if (isUnlimited && searchUses >= 300) {
          setToolResult(t.tool_limit_search_fair_use);
          setIsProcessingTool(false);
          return;
        }
        useSearch = true;
      }

      switch (activeTool.id) {
        case 'cv-premium':
          prompt = `
            HANDLUNGSANWEISUNG: Führe ein vollständiges "Premium CV-Rewrite" durch.
            KONTEXT:
            - Name des Kandidaten: ${toolInput.firstName || ''} ${toolInput.lastName || ''}
            - Art der Bewerbung: ${toolInput.applicationType || 'Nicht angegeben'}
            - Dauer in aktueller Position: ${toolInput.duration || 'Nicht angegeben'}
            - Qualifikationen: ${toolInput.qualifications || 'Nicht angegeben'}
            - Aktueller CV-Text: ${toolInput.cvText || cvContext || 'Nicht vorhanden'}
            - Besondere Wünsche: ${toolInput.description || 'Keine'}

            DEINE ROLLE: Du bist ein Elite-Karrierecoach für den Schweizer Markt.

            OPTIMIERUNGS-STRATEGIE (SCHWEIZER PREMIUM):
            1. SPRACHLICHE PERFEKTION:
               - Konsequentes Schweizer Hochdeutsch (KEIN "ß", verwende "ss").
               - Präzise, sachliche und dennoch wirkungsvolle Wortwahl.
               - Entferne alle generischen Phrasen, Füllwörter und "AI-typischen" Floskeln.
            2. SCHWEIZER SPEZIFIKA:
               - Nutze Schweizer Fachterminologie (z.B. "Lehre", "Fachausweis", "Arbeitszeugnis").
               - Optimiere die Struktur für Schweizer Recruiter (Klarheit, Übersichtlichkeit).
            3. IMPACT & ERGEBNISSE:
               - Formuliere jede Station so um, dass der messbare Erfolg im Vordergrund steht.
               - Nutze starke, aktive Verben am Satzanfang.
            4. KEYWORD-INTEGRATION:
               - Bette branchenspezifische Schlüsselwörter (z.B. für Pharma, Banking, Tech) natürlich in den Text ein.

            AUSGABE: Schreibe den vollständig optimierten Lebenslauf als fliessenden, professionellen Text in klar getrennten Abschnitten (Persönliches, Profil, Berufserfahrung, Ausbildung, Skills).
            WICHTIG: Verwende KEINE Sternchen (*), KEINE Aufzählungszeichen (-, •) und KEINE Hashtags (#). Schreibe ausschliesslich in ganzen Sätzen und Absätzen.
            Füge am Ende eine kurze Sektion "Schweizer Premium-Check" hinzu.
          `;
          break;
        case 'career-roadmap':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle eine detaillierte, personalisierte Schweizer Karriere-Roadmap.
            KONTEXT:
            - Name: ${toolInput.firstName || ''} ${toolInput.lastName || ''}
            - Art der Bewerbung: ${toolInput.applicationType || 'Nicht angegeben'}
            - Dauer in aktueller Position: ${toolInput.duration || 'Nicht angegeben'}
            - Qualifikationen: ${toolInput.qualifications || 'Nicht angegeben'}
            - CV: ${cvContext || 'Nicht vorhanden'}
            - Karriereziel: ${toolInput.goal || 'Nicht spezifiziert'}
            - Besondere Wünsche: ${toolInput.description || 'Keine'}

            DEINE ROLLE: Du bist ein Senior Career Strategist für den Schweizer Markt.

            STRUKTUR DER ROADMAP:
            1. STATUS QUO ANALYSE: Wo steht der Nutzer aktuell im Vergleich zum Schweizer Marktstandard?
            2. WEITERBILDUNGS-PFAD (SCHWEIZ-SPEZIFISCH): Konkrete Schweizer Abschlüsse (CAS/DAS/MAS, Eidg. Fachausweise) und Institutionen (ZHAW, HSG, ETH, KV Business School).
            3. JOB-SUCH-STRATEGIE: Relevante Schweizer Jobportale und Empfehlungen für Headhunter.
            4. NETZWERK-BOOST: Konkrete Tipps für Networking in der Schweiz.
            5. ZEITPLAN: Ein realistischer 12-Monats-Plan.

            AUSGABE: Schreibe die Roadmap als fliessenden, motivierenden Text in klar benannten Abschnitten. Schweizer Hochdeutsch, kein "ß".
            WICHTIG: Verwende KEINE Sternchen (*), KEINE Aufzählungszeichen (-, •) und KEINE Hashtags (#). Schreibe ausschliesslich in ganzen Sätzen und Absätzen.
            Füge am Ende einen kurzen "Insider-Tipp" hinzu.
          `;
          break;
        case 'cv-optimizer':
          prompt = `
            HANDLUNGSANWEISUNG: Optimiere die CV-Sektion: ${toolInput.section}.
            KONTEXT: CV des Nutzers: ${cvContext}.
            
            DEINE ROLLE: Du bist ein Senior Recruiter für den Schweizer Markt (Zürich/Genf/Basel/Zug).
            
            ANALYSE-FOKUS (SCHWEIZER PREMIUM-STANDARD):
            1. SPRACHE & PRÄZISION: 
               - Verwende konsequent Schweizer Hochdeutsch (KEIN "ß", verwende "ss").
               - Eliminiere generische Phrasen und Floskeln.
               - Nutze eine präzise, sachliche und dennoch wirkungsvolle Sprache, die "Swiss Excellence" ausstrahlt.
            2. BRANCHENSPEZIFISCHE SCHLÜSSELWÖRTER:
               - Integriere Begriffe, die in Schweizer Unternehmen (z.B. Pharma, Banking, Tech, MEM-Industrie) hoch im Kurs stehen.
               - Achte auf lokale Bezeichnungen (z.B. "Lehre", "Weiterbildung", "Fachausweis", "Diplom").
               ${(toolInput.section || '').toLowerCase().includes('keyword') || (toolInput.section || '').toLowerCase().includes('schlüsselwörter') ? `
               - SPEZIAL-FOKUS KEYWORDS: Gruppiere Keywords in logische Kategorien (z.B. Fachkompetenz, Methodenkompetenz). Priorisiere Schweizer Standards wie HERMES (Projektmanagement) oder spezifische ISO-Normen.
               ` : ''}
            3. IMPACT-DRIVEN LANGUAGE (ERGEBNIS-FOKUS):
               - Ersetze passive Aufgabenbeschreibungen ("Verantwortlich für...") durch aktive Erfolge ("Steigerte...", "Optimierte...", "Lancierte...").
               - QUANTIFIZIERUNG: Füge Platzhalter für Zahlen ein (z.B. "um [X]% gesteigert", "Budget von [Betrag] CHF verwaltet").
               - "SO WHAT?"-FAKTOR: Erkläre den konkreten Mehrwert für das Unternehmen.
            4. SCHWEIZER CODES:
               - Harmonisiere die Formulierungen mit den Erwartungen aus Schweizer Arbeitszeugnissen (Professionalität, Zuverlässigkeit, Teamorientierung).
            
            AUSGABE-FORMAT:
            - 💎 PREMIUM-ANALYSE: Was ist die grösste Schwäche der aktuellen Sektion im Schweizer Kontext?
            - 🚀 OPTIMIERTER VORSCHLAG: Schreibe die Sektion komplett neu (hochkarätige Bulletpoints).
            - 🇨🇭 SCHWEIZER INSIDER-TIPP: Ein spezifischer Hinweis zu dieser Sektion für den lokalen Markt.
          `;
          break;
        case 'cv-gen':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle ein hochprofessionelles Schweizer Motivationsschreiben.
            KONTEXT:
            - Name des Kandidaten: ${toolInput.firstName || ''} ${toolInput.lastName || ''}
            - Art der Bewerbung: ${toolInput.applicationType || 'Allgemeine Bewerbung'}
            - Dauer in aktueller Position: ${toolInput.duration || 'Nicht angegeben'}
            - Qualifikationen: ${toolInput.qualifications || 'Nicht angegeben'}
            - CV des Kandidaten: ${cvContext || 'Nicht vorhanden'}
            - Stelleninserat/Zusatzinfos: ${toolInput.jobAd || 'Allgemeine Initiativbewerbung'}
            - Besondere Wünsche: ${toolInput.description || 'Keine'}

            ANFORDERUNGEN:
            - Sprache: Schweizer Hochdeutsch (KEIN "ß", verwende "ss").
            - Struktur: Absender, Empfänger, Ort/Datum, Betreff, Anrede, Einleitung, Hauptteil (Warum ich? Warum ihr?), Schluss, Grussformel.
            - Stil: Selbstbewusst, präzise, keine Floskeln wie "hiermit bewerbe ich mich".
            - Fokus: Hebe spezifische Erfolge hervor, die zum Inserat passen.
            WICHTIG: Verwende KEINE Sternchen (*), KEINE Aufzählungszeichen (-, •) und KEINE Hashtags (#). Schreibe als fliessenden Brieftext in ganzen Absätzen.
          `;
          break;
        case 'linkedin-job':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle ein vollständiges Application Package für LinkedIn.
            KONTEXT:
            - Name: ${toolInput.firstName || ''} ${toolInput.lastName || ''}
            - Art der Bewerbung: ${toolInput.applicationType || 'Nicht angegeben'}
            - Dauer in aktueller Position: ${toolInput.duration || 'Nicht angegeben'}
            - Qualifikationen: ${toolInput.qualifications || 'Nicht angegeben'}
            - Profil/CV: ${toolInput.linkedinProfile || cvContext || 'Nicht vorhanden'}
            - Stelleninserat: ${toolInput.jobAd || 'Nicht vorhanden'}
            - Besondere Wünsche: ${toolInput.description || 'Keine'}

            OUTPUT-STRUKTUR (als fliessender Text, keine Aufzählungspunkte):
            1. Motivationsschreiben (Schweizer Standard, kein ß) — vollständiger Brieftext.
            2. CV-Anpassungsvorschläge — als Fliesstext erklärt.
            3. Elevator Pitch für die LinkedIn-Recruiter-Nachricht — als fertiger Nachrichtentext.
            4. Die drei stärksten Argumente, warum der Kandidat perfekt passt — als Absätze formuliert.

            WICHTIG: Verwende KEINE Sternchen (*), KEINE Aufzählungszeichen (-, •) und KEINE Hashtags (#). Schreibe jeden Abschnitt als zusammenhängenden Fliesstext.
          `;
          break;
        case 'salary-calc':
          prompt = `
            HANDLUNGSANWEISUNG: Berechne den Marktwert in der Schweiz mit höchster Präzision.
            INPUT: Job: ${toolInput.jobTitle || 'Nicht angegeben'}, Branche: ${toolInput.industry || 'Nicht angegeben'}, Erfahrung: ${toolInput.experience || '0'} Jahre, Kanton: ${toolInput.canton || 'Schweiz'}.
            DEINE ROLLE: Du bist ein Experte für Schweizer Lohnstrukturen (BFS/Salarium-Standard).
            
            ANALYSE-KRITERIEN:
            1. REGIONALE UNTERSCHIEDE: Berücksichtige kantonale Lohnniveaus (z.B. Hochlohngebiete ZH/GE vs. GL/UR).
            2. BRANCHEN-SPEZIFIKA: Analysiere Lohnunterschiede zwischen Sektoren (z.B. Pharma/Banking vs. Gastronomie/Detailhandel).
            3. ERFAHRUNG & BILDUNG: Bewerte den Impact von Berufsjahren und Schweizer Abschlüssen (EFZ, HF, FH, Uni).
            4. SCHWEIZER STANDARDS: Inkludiere das 13. Monatsgehalt und gängige Bonusstrukturen.
            
            AUSGABE-FORMAT (JSON):
            {
              "jobTitle": "${toolInput.jobTitle || 'Nicht angegeben'}",
              "industry": "${toolInput.industry || 'Nicht angegeben'}",
              "experience": "${toolInput.experience || '0'}",
              "canton": "${toolInput.canton || 'Schweiz'}",
              "minSalary": 0,
              "maxSalary": 0,
              "medianSalary": 0,
              "insights": [
                "Regionale Marktanalyse für ${toolInput.canton || 'Schweiz'}",
                "Branchen-Benchmark für ${toolInput.industry || 'Ihre Branche'}",
                "Verhandlungstipp basierend auf ${toolInput.experience || '0'} Jahren Erfahrung"
              ]
            }
            Antworte NUR mit dem JSON-Objekt.
          `;
          break;
        case 'job-search':
          const keyword = (toolInput.keyword || '').toLowerCase();
          const loc = (toolInput.location || '').toLowerCase();
          const ind = (toolInput.industry || '').toLowerCase();
          
          const filteredJobs = (sampleJobs as any[]).filter(job => {
            const matchesKeyword = !keyword || 
              job.title.toLowerCase().includes(keyword) || 
              job.description.toLowerCase().includes(keyword) ||
              (job.ats_keywords && job.ats_keywords.some((k: string) => k.toLowerCase().includes(keyword)));
            const matchesLocation = !loc || job.location.toLowerCase().includes(loc);
            const matchesIndustry = !ind || job.category.toLowerCase().includes(ind);
            return matchesKeyword && matchesLocation && matchesIndustry;
          });

          if (filteredJobs.length > 0) {
            const jobList = filteredJobs.map(job => 
              `### ${job.title}\n**Firma:** ${job.company}\n**Standort:** ${job.location}\n**Bereich:** ${job.category}\n\n${job.description}\n\n**Anforderungen:** ${job.requirements}\n\n---`
            ).join('\n\n');
            
            prompt = `
              Der Nutzer sucht nach Jobs in der Schweiz.
              Hier sind die gefundenen Stellen aus unserer Datenbank:
              
              ${jobList}
              
              HANDLUNGSANWEISUNG:
              1. Präsentiere diese Stellen dem Nutzer auf ansprechende Weise.
              2. Analysiere kurz, welche dieser Stellen am besten zum Profil des Nutzers passt (CV: ${cvContext || 'Kein CV vorhanden'}).
              3. Gib Tipps für die Bewerbung bei diesen spezifischen Firmen.
              4. Falls weniger als 3 Stellen gefunden wurden, schlage vor, die Suchkriterien zu erweitern.
            `;
          } else {
            prompt = `
              Der Nutzer sucht nach Jobs in der Schweiz (Keyword: "${keyword}", Ort: "${loc}", Branche: "${ind}").
              Leider wurden in unserer Datenbank keine exakten Treffer gefunden.
              
              HANDLUNGSANWEISUNG:
              1. Informiere den Nutzer höflich, dass aktuell keine exakten Treffer in der Datenbank vorliegen.
              2. Gib allgemeine Tipps für die Jobsuche in der Schweiz für diesen Bereich ("${ind}") und diesen Ort ("${loc}").
              3. Nenne 3-4 grosse Arbeitgeber in dieser Region/Branche, bei denen der Nutzer direkt suchen könnte.
            `;
          }
          break;
        case 'ats-sim':
          prompt = `
            HANDLUNGSANWEISUNG: Führe eine tiefgehende "Premium ATS-Simulation" (Applicant Tracking System) durch.
            KONTEXT: CV: ${cvContext}. Inserat: ${toolInput.jobAd}.
            DEINE ROLLE: Du bist ein technischer Recruiter für einen Schweizer Grosskonzern.
            
            ANALYSE-FOKUS (SCHWEIZER STANDARD):
            1. MATCH-SCORE: Wie gut passt der CV auf das Inserat (0-100%)? Berücksichtige Schweizer Branchen-Benchmarks.
            2. KEYWORD-GAP: Welche essenziellen Schweizer Fachbegriffe und Kompetenzen aus dem Inserat fehlen im CV?
            3. FORMAT-CHECK: Ist das Layout für Schweizer ATS-Systeme (z.B. SuccessFactors, Workday) optimiert?
            4. SPRACH-CHECK: Entspricht die Sprache dem Schweizer Standard (ss statt ß)?
            
            OUTPUT:
            - 📊 ATS-SCORE: [0-100%]
            - 🔍 KEYWORD-ANALYSE: Liste fehlende Begriffe.
            - 🛠️ OPTIMIERUNGS-STRATEGIE: 3 konkrete, hochkarätige Sätze im Schweizer Stil, die den Match-Score sofort erhöhen.
            - 🇨🇭 SCHWEIZER RECRUITER-INSIGHT: Was würde ein Schweizer HR-Experte bei diesem Match denken?
          `;
          break;
        case 'zeugnis':
          prompt = `
            HANDLUNGSANWEISUNG: Führe eine tiefgehende "Premium-Entschlüsselung" des Schweizer Arbeitszeugnisses durch.
            TEXT: ${toolInput.certificateText}.

            DEINE ROLLE: Du bist ein Experte für Schweizer Arbeitsrecht und HR-Codierung.

            ANALYSE-STRUKTUR:
            1. GESAMTNOTE: Gib eine präzise Note von 1.0 bis 6.0 (Schweizer System).
            2. KLARTEXT-DECODER: Übersetze die wichtigsten Sätze in ihre wahre Bedeutung.
               - Beispiel: "Er war bemüht" -> "Er war erfolglos".
               - Analysiere spezifisch: Leistungsbeurteilung, Verhalten, Austrittsgrund, Schlussformulierung.
            3. VERSTECKTE BOTSCHAFTEN & NEGATIVE FORMULIERUNGEN:
               - Suche nach Auslassungen (was fehlt?), zweideutigen Adjektiven oder unüblichen Reihenfolgen.
               - Markiere kritische Punkte, die bei einem neuen Schweizer Arbeitgeber Fragen aufwerfen könnten.
            4. MARKT-POSITIONIERUNG (ERKLÄRUNG):
               - Erkläre dem Nutzer, wie dieses Zeugnis seine Chancen auf dem Schweizer Markt beeinflusst.
               - Warum ist dieses Wissen wichtig? (z.B. Vorbereitung auf Fragen im Interview, Recht auf Zeugnisberichtigung).
            5. HANDLUNGSEMPFEHLUNG: Konkrete Schritte zur Nachbesserung oder wie man Schwachstellen im Gespräch proaktiv anspricht.

            AUSGABE:
            Verwende Schweizer Hochdeutsch (kein "ß"). Sei direkt, präzise und professionell.
            Füge eine Sektion "🇨🇭 Strategischer Vorteil" hinzu, die erklärt, wie diese Analyse dem Nutzer hilft, seine Position im Markt zu verstehen.
          `;
          break;
        case 'interview': {
          const interviewTier = user?.role === 'unlimited' || user?.role === 'admin' ? 'unlimited' : user?.role === 'pro' ? 'pro' : 'free';
          const scoringGrid = interviewTier === 'unlimited'
            ? `
BEWERTUNGSRASTER (100% – Unlimited):
Bewerte den Kandidaten nach dem Interview in 8 Kategorien (je 0–100%):
1. Erstkontakt & Auftreten (10%)
2. Fachliche Kompetenz (20%)
3. Kommunikation & Klarheit (15%)
4. Problemlösungskompetenz (15%)
5. Kulturelle Passung / Soft Skills (10%)
6. Motivation & Eigeninitiative (10%)
7. Schweizer Markt-Kenntnisse (10%)
8. Gesprächsführung & Struktur (10%)
→ Berechne den Gesamtscore und gib eine detaillierte Analyse + konkrete Verbesserungsvorschläge pro Kategorie.`
            : interviewTier === 'pro'
            ? `
BEWERTUNGSRASTER (Pro – 5 Kategorien):
Bewerte in 5 Kategorien (je 0–100%):
1. Fachliche Kompetenz (25%)
2. Kommunikation & Auftreten (25%)
3. Motivation & Vorbereitung (20%)
4. Problemlösung (15%)
5. Schweizer Marktkenntnis (15%)
→ Gesamtscore + Kernempfehlungen pro Kategorie.`
            : `
BEWERTUNGSRASTER (Basis):
Bewerte in 3 Kategorien (je 0–100%):
1. Auftreten & Kommunikation (40%)
2. Fachliche Eignung (40%)
3. Motivation (20%)
→ Gesamtscore + 2 wichtigste Verbesserungshinweise.`;

          prompt = `
            HANDLUNGSANWEISUNG: Bereite ${toolInput.firstName || 'den Kandidaten'}${toolInput.lastName ? ' ' + toolInput.lastName : ''} auf ein professionelles Vorstellungsgespräch vor.
            POSITION: ${toolInput.jobTitle || 'Nicht angegeben'}.
            ART DER BEWERBUNG: ${toolInput.applicationType || 'Allgemeine Bewerbung'}.
            QUALIFIKATIONEN: ${toolInput.qualifications || 'Keine angegeben'}.
            FOKUS/WÜNSCHE: ${toolInput.description || 'Allgemeines Interview-Training'}.
            CV: ${cvContext || 'Kein CV hochgeladen – nutze allgemeine Schweizer Standards'}.
            SPRACHE: Schweizer Hochdeutsch (kein ß, verwende ss).

            AUFGABE: Erstelle 5 massgeschneiderte, anspruchsvolle Interviewfragen für Schweizer Unternehmen.
            Für jede Frage: die Frage selbst, was der Recruiter wissen will, optimale Antwortstrategie, Musterantwort auf Schweizer Hochdeutsch, häufige Fehler.

            ${scoringGrid}

            ABSCHLUSS: 3 konkrete Schweizer Interview-Tipps (Pünktlichkeit, Unterlagen, Kultur).
            WICHTIG: Schreibe als fliessenden, strukturierten Text ohne Sternchen oder Aufzählungszeichen.
          `;
          break;
        }
        case 'linkedin-posts':
          prompt = `
            HANDLUNGSANWEISUNG: Generiere 3 massgeschneiderte LinkedIn-Posts im Schweizer Stil.
            THEMA/FOKUS: ${toolInput.topic || 'Allgemeine Karriere in der Schweiz'}.
            KONTEXT: CV des Kandidaten: ${cvContext || 'Nicht vorhanden'}.
            ANFORDERUNGEN:
            - STIL: Professionell, authentisch, "Swiss Premium" (keine übertriebenen US-Marketing-Floskeln).
            - SPRACHE: Schweizer Hochdeutsch (KEIN "ß", verwende "ss").
            - STRUKTUR: 
              Post 1: Fachliche Expertise/Insight (Thought Leadership).
              Post 2: Persönlicher Meilenstein oder Learning (Storytelling).
              Post 3: Netzwerk-Fokus/Call-to-Action (Engagement).
            - DETAILS: Nutze branchenspezifische Begriffe aus dem Schweizer Markt (z.B. KMU, Kantone, spezifische Branchen-Events).
            - FORMAT: Inklusive passender Emojis (dezent) und 3-5 relevanter Hashtags (z.B. #KarriereSchweiz, #NetworkingCH).
            - VERBOTEN: Generische Phrasen wie "I am thrilled to announce...", "Exciting news...", "In today's fast-paced world...".
          `;
          break;
        case 'skill-gap':
          prompt = `
            HANDLUNGSANWEISUNG: Skill-Gap Analyse.
            VERGLEICH: CV (${cvContext || 'Kein CV vorhanden'}) vs. Ziel-Job (${toolInput.targetJob || 'Nicht angegeben'}).
            OUTPUT:
            - TOP 5 MISSING SKILLS: Welche harten und weichen Faktoren fehlen?
            - LERNPFAD: Konkrete Kurse (z.B. auf LinkedIn Learning, Coursera oder Schweizer Instituten wie ZHAW/HSG).
            - PROJEKT-IDEE: Wie kann der Kandidat diesen Skill ohne neuen Job beweisen?
          `;
          break;
        case 'lehrstellen':
          prompt = `
            Suche nach passenden Lehrstellen in der Schweiz für: "${toolInput.interest || 'Allgemeine Lehrstelle'}".
            Region: ${toolInput.location || 'Ganze Schweiz'}.
            Analysiere die Eignung basierend auf dem CV: ${cvContext || 'Kein CV vorhanden'}.
            Gib die Top 5 Resultate aus mit:
            - Lehrberuf & Firma
            - Standort
            - Link (falls verfügbar)
            - Warum das passen könnte.
          `;
          break;
        case 'berufseinstieg':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle einen Guide für den Berufseinstieg in der Schweiz.
            ABSCHLUSS: ${toolInput.education || 'Nicht angegeben'}.
            KONTEXT: CV: ${cvContext || 'Kein CV vorhanden'}.
            INHALT:
            - Die 3 wichtigsten Branchen für diesen Abschluss in der Schweiz.
            - Lohn-Erwartungen für Einsteiger.
            - Strategie für die erste Bewerbung (Fokus auf Potential statt Erfahrung).
          `;
          break;
        case 'erfahrung-plus':
          prompt = `
            HANDLUNGSANWEISUNG: Strategie für Ü50-Bewerber in der Schweiz.
            STÄRKE: ${toolInput.experience || 'Langjährige Berufserfahrung'}.
            KONTEXT: CV: ${cvContext || 'Kein CV vorhanden'}.
            INHALT:
            - Wie man "Seniorität" als "Stabilität und Mentoring" verkauft.
            - Umgang mit dem Thema "Lohnkosten" im Interview.
            - Optimierung des CVs (Fokus auf die letzten 10-15 Jahre).
          `;
          break;
        case 'wiedereinstieg':
          prompt = `
            HANDLUNGSANWEISUNG: Strategie für den Wiedereinstieg nach einer Pause.
            GRUND: ${toolInput.reason || 'Nicht spezifiziert'}.
            KONTEXT: CV: ${cvContext}.
            INHALT:
            - Wie man die Lücke im CV positiv umformuliert.
            - Argumente für die aktuelle Motivation und Einsatzbereitschaft.
            - Tipps für das Auffrischen des Netzwerks in der Schweiz.
          `;
          break;
        case 'karriere-checkup':
          prompt = `
            HANDLUNGSANWEISUNG: Karriere-Checkup.
            AKTUELLER JOB: ${toolInput.currentJob || 'Nicht angegeben'}.
            KONTEXT: CV: ${cvContext || 'Kein CV vorhanden'}.
            INHALT:
            - Aktueller Marktwert-Check.
            - Nächste logische Karriereschritte in der Schweiz.
            - Weiterbildungsempfehlungen (CAS/DAS/MAS).
          `;
          break;
        case 'matching':
          prompt = `
            HANDLUNGSANWEISUNG: Job-Matching Analyse.
            KONTEXT: CV: ${cvContext}.
            AUFGABE: Basierend auf dem CV, welche 5 Job-Profile in der Schweiz passen am besten?
            Gib für jedes Profil einen Fit-Score (0-100%) und eine kurze Begründung an.
          `;
          break;
        case 'cv-analysis':
          prompt = `
            HANDLUNGSANWEISUNG: Führe eine tiefgehende "Premium-Analyse" des Lebenslaufs für den Schweizer Arbeitsmarkt durch.
            KONTEXT: CV: ${cvContext}.
            DEINE ROLLE: Du bist ein Elite Career Consultant für den Schweizer Markt (Zürich, Genf, Basel, Zug).
            
            ANALYSE-PUNKTE (SCHWEIZER PREMIUM-STANDARD):
            1. SCHLÜSSELWÖRTER & KOMPETENZEN: 
               - Welche 10 wichtigsten branchenspezifischen Keywords (Hard & Soft Skills) sind im CV enthalten? 
               - Identifiziere fehlende Begriffe, die für Schweizer Top-Arbeitgeber (z.B. Nestlé, Novartis, UBS, ABB, Roche) essenziell sind.
               - FOKUS: Gib 3 konkrete Verbesserungsvorschläge speziell für den "Keywords/Skills"-Abschnitt an.
            2. SCHWEIZER BRANCHEN-FIT: Analysiere die Übereinstimmung mit Schweizer Branchennormen (z.B. Medtech, Fintech, Cleantech, Public Sector, MEM, Pharma, Uhrenindustrie). Bewerte die Passgenauigkeit für den lokalen Markt (0-100%).
            3. SPRACHLICHE PERFEKTION (SCHWEIZER HOCHDEUTSCH): Nenne 3 konkrete sprachliche Korrekturen. Prüfe auf:
               - KEIN "ß" (verwende konsequent "ss").
               - Präzision, Sachlichkeit und "Swiss Business Excellence" (keine Floskeln).
               - Lokale Fachbegriffe (z.B. "Lehre", "Fachausweis", "Arbeitszeugnis").
            4. STRATEGISCHE OPTIMIERUNG (SCHWEIZ-SPEZIFISCH): Nenne 3 konkrete Punkte zur Aufwertung. Prüfe explizit auf:
               - Sprachniveaus (GERS/CEFR Standard).
               - Arbeitsbewilligungs-Status (L, B, C Bewilligung).
               - Referenz-Management (Arbeitszeugnisse & Referenzpersonen).
               - Bildungs-Äquivalenz (Anerkennung ausländischer Diplome).
            5. SCORE: Gib einen "Swiss Market Readiness Score" von 0-100 an. Ein hoher Score bedeutet perfekte Ausrichtung auf Schweizer Präzision und lokale Normen.
            6. PREMIUM HIGHLIGHTS: Erstelle 3 hochkarätige, ergebnisorientierte Bulletpoints (Impact-driven), die den CV sofort aufwerten. Nutze aktive Verben und Schweizer Präzision.
            7. PREMIUM KURZPROFIL: Erstelle ein prägnantes, wirkungsvolles Kurzprofil (2-3 Sätze) für den CV-Header, das die Stärken für den Schweizer Markt hervorhebt.
            
            AUSGABE-FORMAT (JSON):
            {
              "keywords": ["..."],
              "keywordSuggestions": ["..."],
              "industryMatch": "...",
              "linguisticFixes": ["..."],
              "improvements": ["..."],
              "score": 0,
              "optimizedHighlights": ["..."],
              "optimizedSummary": "..."
            }
            Antworte NUR mit dem JSON-Objekt.
          `;
          break;
        case 'tracker':
          prompt = `
            HANDLUNGSANWEISUNG: Bewerbungs-Strategie für: ${toolInput.jobTitle}.
            KONTEXT: CV: ${cvContext}.
            AUFGABE: Erstelle einen konkreten Schlachtplan für diese Bewerbung.
            - Recherche-Tipps zum Unternehmen.
            - Wer könnte der Hiring Manager sein?
            - Spezifische Fragen für das erste Gespräch.
          `;
          break;
        case 'interview-live': {
          prompt = `
            HANDLUNGSANWEISUNG: Generiere 5 massgeschneiderte Interview-Fragen als JSON-Objekt.
            STELLE: ${toolInput.jobTitle}${toolInput.company ? ` bei ${toolInput.company}` : ' bei einem Schweizer Unternehmen'}.
            STELLENBESCHREIBUNG: ${toolInput.jobDesc || 'Keine Details angegeben – nutze branchenübliche Anforderungen.'}.
            CV: ${cvContext || 'Kein CV hochgeladen – nutze allgemeine Schweizer Standards.'}.
            SPRACHE: Schweizer Hochdeutsch (kein ß, verwende ss).

            AUSGABE-FORMAT (NUR JSON, absolut kein Text davor oder danach):
            {
              "jobContext": "${toolInput.jobTitle}${toolInput.company ? ` bei ${toolInput.company}` : ''}",
              "questions": [
                {
                  "q": "Frage 1 – präzise und realistisch, wie sie bei Schweizer Unternehmen gestellt wird",
                  "tip": "Was der Interviewer wirklich wissen will (1-2 Sätze)",
                  "model": "Optimale Antwort-Strategie (STAR wenn sinnvoll, konkret und kurz)",
                  "mistakes": "Häufige Fehler bei dieser Frage (1 Satz)"
                }
              ]
            }
            Erstelle GENAU 5 Fragen. Passe sie spezifisch an die Stelle und das CV an.
          `;
          break;
        }
        case 'salary-negotiation': {
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle einen präzisen Lohnverhandlungs-Leitfaden.
            STELLE: ${toolInput.jobTitle}.
            VERHANDLUNGSZIEL: ${toolInput.targetSalary || 'Nicht spezifiziert'}.
            CV: ${cvContext || 'Nicht vorhanden'}.
            SPRACHE: Schweizer Hochdeutsch (kein ß, verwende ss).

            DEINE ROLLE: Du bist ein Experte für Schweizer Lohnverhandlungen mit 15 Jahren Erfahrung in der Personalberatung.

            LEITFADEN-STRUKTUR:
            ## 🎯 Deine Marktpositionierung
            - Warum bin ich diesen Betrag wert? (Kurz & präzise mit Schweizer Kontext)

            ## 📊 Die richtige Einstiegsforderung
            - Empfohlener Einstiegsanker (ca. 10-15% über Ziel)
            - Begründung basierend auf Schweizer Marktdaten

            ## 💬 5 starke Argumente (Schweizer Stil)
            1-5 konkrete Argumente inkl. 13. Monatslohn, Weiterbildungsbudget, Flexibilität

            ## 🗣️ Formulierungen auf Schweizer Hochdeutsch
            - Einstiegssatz (selbstbewusst, nicht arrogant)
            - Bei Gegenfrage "Was verdienen Sie aktuell?"
            - Bei Einwand "Das liegt über unserem Budget"

            ## 🔄 Fallback-Strategie
            - Was tun, wenn das Gehalt nicht verhandelbar ist? (Benefits, Bonus, Home Office, Weiterbildung)

            ## 🇨🇭 Schweizer Besonderheiten
            - 13. Monatslohn: Wie einrechnen und einfordern
            - Kulturelle Dos & Don'ts in Schweizer Gehaltsverhandlungen
          `;
          break;
        }
        default:
          prompt = "Bitte hilf mir bei meiner Karriere.";
      }

      const toolRes = await authFetch('/api/process-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, useSearch, language })
      });
      const toolData = await toolRes.json();
      if (toolRes.status === 429) throw new Error(toolData.error || 'rate limit');
      if (!toolRes.ok) throw new Error(toolData.error || 'Tool processing failed');

      let resultText = toolData.text;
      const toolSources: string[] = toolData.sources || [];
      
      // Special handling for CV Analysis (JSON)
      if (activeTool.id === 'cv-analysis') {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysisData = JSON.parse(jsonMatch[0]);
            
            // Save to dedicated collection
            if (user) {
              await supabase.from('cv_analyses').insert({ user_id: user.id, data: analysisData });
            }

            // Format for display
            const cvLabels = language === 'FR' ? {
              keywords: 'Mots-clés principaux du CV',
              industry: 'Correspondance sectorielle (normes suisses)',
              linguistic: 'Optimisation linguistique',
              improvements: 'Potentiel d\'amélioration stratégique',
              highlights: 'Points forts optimisés du CV',
              summary: 'Proposition de profil court',
              noFixes: 'Aucune correction spécifique nécessaire.',
              noHighlights: 'Aucun point fort généré.',
              noSummary: 'Aucun profil court généré.',
              rawData: 'Données brutes (JSON)'
            } : language === 'IT' ? {
              keywords: 'Parole chiave principali nel CV',
              industry: 'Corrispondenza settoriale (standard svizzeri)',
              linguistic: 'Ottimizzazione linguistica',
              improvements: 'Potenziale di miglioramento strategico',
              highlights: 'Punti di forza ottimizzati del CV',
              summary: 'Proposta di profilo breve',
              noFixes: 'Nessuna correzione specifica necessaria.',
              noHighlights: 'Nessun punto di forza generato.',
              noSummary: 'Nessun profilo breve generato.',
              rawData: 'Dati grezzi (JSON)'
            } : language === 'EN' ? {
              keywords: 'Top CV Keywords',
              industry: 'Industry Match (Swiss Standards)',
              linguistic: 'Language Optimization',
              improvements: 'Strategic Improvement Potential',
              highlights: 'Optimized CV Highlights',
              summary: 'Summary Proposal',
              noFixes: 'No specific corrections needed.',
              noHighlights: 'No highlights generated.',
              noSummary: 'No summary generated.',
              rawData: 'Raw Data (JSON)'
            } : {
              keywords: 'Top Keywords im CV',
              industry: 'Branchen-Match (Schweizer Standards)',
              linguistic: 'Sprachliche Optimierung',
              improvements: 'Strategisches Verbesserungspotential',
              highlights: 'Optimierte CV-Highlights',
              summary: 'Kurzprofil-Vorschlag',
              noFixes: 'Keine spezifischen Korrekturen nötig.',
              noHighlights: 'Keine Highlights generiert.',
              noSummary: 'Kein Kurzprofil generiert.',
              rawData: 'Rohdaten (JSON)'
            };
            resultText = `
### 📊 Swiss Market Readiness Score: ${analysisData.score}/100

#### 🔑 ${cvLabels.keywords}:
${(analysisData.keywords || []).map((k: string) => `- ${k}`).join('\n')}

#### 🏢 ${cvLabels.industry}:
${analysisData.industryMatch}

#### 🗣️ ${cvLabels.linguistic}:
${analysisData.linguisticFixes?.map((f: string) => `- ${f}`).join('\n') || cvLabels.noFixes}

#### 🚀 ${cvLabels.improvements}:
${(analysisData.improvements || []).map((i: string) => `- ${i}`).join('\n')}

#### ✨ ${cvLabels.highlights}:
${analysisData.optimizedHighlights?.map((h: string) => `- ${h}`).join('\n') || cvLabels.noHighlights}

#### 📝 ${cvLabels.summary}:
${analysisData.optimizedSummary || cvLabels.noSummary}

---
#### 📄 ${cvLabels.rawData}:
\`\`\`json
${JSON.stringify(analysisData, null, 2)}
\`\`\`
            `;
          }
        } catch (e) {
          console.error("Error parsing CV analysis JSON:", e);
          setToolResult(resultText || 'Ein Fehler bei der Auswertung ist aufgetreten. Bitte versuche es erneut.');
        }
      }

      // Special handling for Salary Calculation (JSON)
      if (activeTool.id === 'salary-calc') {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const salaryData = JSON.parse(jsonMatch[0]);
            
            // Save to dedicated collection
            if (user) {
              await supabase.from('salary_calculations').insert({ user_id: user.id, data: salaryData });
            }
            
            setParsedSalaryResult(salaryData);
            
            // Format for display
            const salaryLabels = language === 'FR' ? {
              title: 'Analyse de la valeur marchande suisse',
              position: 'Poste', industry: 'Secteur', experience: 'Expérience', years: 'ans', canton: 'Canton',
              salaryHeader: 'Salaire annuel brut estimé (incl. 13e mois)',
              min: 'Minimum', median: 'Médiane', max: 'Maximum',
              insights: 'Insights stratégiques de négociation',
              disclaimer: 'Ces données sont basées sur des modèles IA et servent d\'orientation. Pour des valeurs définitives, nous recommandons Salarium.ch.'
            } : language === 'IT' ? {
              title: 'Analisi del valore di mercato svizzero',
              position: 'Posizione', industry: 'Settore', experience: 'Esperienza', years: 'anni', canton: 'Cantone',
              salaryHeader: 'Stipendio lordo annuale stimato (incl. 13° mese)',
              min: 'Minimo', median: 'Mediana', max: 'Massimo',
              insights: 'Insight strategici di negoziazione',
              disclaimer: 'Questi dati si basano su modelli IA e servono come orientamento. Per valori definitivi, consigliamo Salarium.ch.'
            } : language === 'EN' ? {
              title: 'Swiss Market Value Analysis',
              position: 'Position', industry: 'Industry', experience: 'Experience', years: 'years', canton: 'Canton',
              salaryHeader: 'Estimated Annual Gross Salary (incl. 13th month pay)',
              min: 'Minimum', median: 'Median', max: 'Maximum',
              insights: 'Strategic Negotiation Insights',
              disclaimer: 'This data is based on AI models and serves as guidance. For definitive values, we recommend Salarium.ch.'
            } : {
              title: 'Schweizer Marktwert-Analyse',
              position: 'Position', industry: 'Branche', experience: 'Erfahrung', years: 'Jahre', canton: 'Kanton',
              salaryHeader: 'Geschätztes Brutto-Jahresgehalt (inkl. 13. Monatslohn)',
              min: 'Minimum', median: 'Median', max: 'Maximum',
              insights: 'Strategische Verhandlungs-Insights',
              disclaimer: 'Diese Daten basieren auf KI-Modellen und dienen als Orientierungshilfe. Für verbindliche Werte empfehlen wir Salarium.ch.'
            };
            resultText = `
### 💰 ${salaryLabels.title}

**${salaryLabels.position}:** ${salaryData.jobTitle}
**${salaryLabels.industry}:** ${salaryData.industry}
**${salaryLabels.experience}:** ${salaryData.experience} ${salaryLabels.years}
**${salaryLabels.canton}:** ${salaryData.canton}

#### 📊 ${salaryLabels.salaryHeader}:
- **${salaryLabels.min}:** CHF ${(salaryData.minSalary || 0).toLocaleString('de-CH')}
- **${salaryLabels.median}:** CHF ${(salaryData.medianSalary || 0).toLocaleString('de-CH')}
- **${salaryLabels.max}:** CHF ${(salaryData.maxSalary || 0).toLocaleString('de-CH')}

#### 💡 ${salaryLabels.insights}:
${(salaryData.insights || []).map((i: string) => `- ${i}`).join('\n')}

---
*${salaryLabels.disclaimer}*
            `;
          }
        } catch (e) {
          console.error("Error parsing Salary calculation JSON:", e);
          setToolResult(resultText || 'Gehaltsberechnung konnte nicht ausgewertet werden. Bitte versuche es erneut.');
        }
      }
      
      // Handle Grounding Metadata for Search
      if (useSearch && toolSources.length > 0) {
        const sourcesLabel = language === 'FR' ? 'Sources' : language === 'IT' ? 'Fonti' : language === 'EN' ? 'Sources' : 'Quellen';
        resultText += `\n\n**${sourcesLabel}:**\n` + toolSources.map(s => `\n- ${s}`).join("");
      }

      // Special handling for interview-live (interactive session)
      if (activeTool.id === 'interview-live') {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.questions && Array.isArray(data.questions)) {
              setInterviewSession({
                questions: data.questions,
                jobContext: data.jobContext || toolInput.jobTitle || '',
                currentQ: 0,
                answers: [],
                feedbacks: [],
                isEvaluating: false,
                isRecording: false,
                isComplete: false,
              });
              setInterviewAnswer('');
              resultText = `__INTERVIEW_SESSION_STARTED__`;
            }
          }
        } catch (e) {
          console.error("Error parsing interview-live JSON:", e);
        }
      }

      setToolResult(resultText);
      setToolResultEditable(resultText);
      setIsEditingToolResult(false);

      // Save to history
      if (user) {
        try {
          await supabase.from('tool_results').insert({
            user_id: user.id,
            tool_id: activeTool.id,
            tool_title: activeTool.title,
            input: toolInput,
            result: resultText,
          });

          // Increment usage for non-unlimited users
          if (!isUnlimited) {
            await supabase.from('users').update({
              tool_uses: (user.toolUses || 0) + 1,
              daily_tool_uses: (user.dailyToolUses || 0) + 1,
              ...(useSearch ? { search_uses: (user.searchUses || 0) + 1 } : {}),
            }).eq('id', user.id);
          } else if (useSearch) {
            await supabase.from('users').update({ search_uses: (user.searchUses || 0) + 1 }).eq('id', user.id);
          }
        } catch (e) {
          handleDbError(e, 'db', `users/${user.id}`);
        }
      }

    } catch (e: any) {
      console.error("Tool processing error:", e);
      const isRateLimit = e?.message?.includes('rate limit') || e?.message?.includes('Too many') || e?.message?.includes('Zu viele');
      const isOverloaded = e?.message?.includes('overloaded') || e?.message?.includes('503') || e?.message?.includes('UNAVAILABLE') || e?.message?.includes('high demand');
      setToolResult(
        isRateLimit
          ? (language === 'DE' ? '⚠️ Du hast zu viele Anfragen gesendet. Bitte warte eine Minute und versuche es erneut.'
            : language === 'FR' ? '⚠️ Vous avez envoyé trop de demandes. Veuillez attendre une minute et réessayer.'
            : language === 'IT' ? '⚠️ Hai inviato troppe richieste. Attendi un minuto e riprova.'
            : '⚠️ Too many requests. Please wait a minute and try again.')
          : isOverloaded
          ? (language === 'DE' ? '⚠️ Die KI ist gerade sehr ausgelastet. Bitte warte 1–2 Minuten und versuche es erneut.'
            : language === 'FR' ? '⚠️ L\'IA est très sollicitée. Veuillez attendre 1–2 minutes et réessayer.'
            : language === 'IT' ? '⚠️ L\'IA è molto occupata. Attendi 1–2 minuti e riprova.'
            : '⚠️ AI is very busy right now. Please wait 1–2 minutes and try again.')
          : (language === 'DE' ? '⚠️ Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
            : language === 'FR' ? '⚠️ Une erreur est survenue. Veuillez réessayer.'
            : language === 'IT' ? '⚠️ Si è verificato un errore. Riprova.'
            : '⚠️ An error occurred. Please try again.')
      );
    } finally {
      setIsProcessingTool(false);
    }
  };

  const downloadAsPDF = () => {
    if (!toolResult || !activeTool) return;
    const doc = new jsPDF();
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;

    // Header bar
    doc.setFillColor(0, 66, 37);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("STELLIFY | SCHWEIZER KARRIERE-CO-PILOT", margin, 9);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('de-CH'), pageWidth - margin, 9, { align: 'right' });

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 66, 37);
    doc.text(activeTool.title, margin, 36);

    // Thin divider
    doc.setDrawColor(0, 66, 37);
    doc.setLineWidth(0.3);
    doc.line(margin, 40, pageWidth - margin, 40);

    let cursorY = 50;

    const addPage = () => {
      doc.addPage();
      doc.setFillColor(0, 66, 37);
      doc.rect(0, 0, pageWidth, 10, 'F');
      cursorY = 18;
    };

    const lines = toolResult.split('\n');
    lines.forEach((line) => {
      // Detect heading levels
      const h1 = line.match(/^#{1,2}\s+(.*)/);
      const h2 = line.match(/^#{3,4}\s+(.*)/);
      const bullet = line.match(/^[\*\-\+]\s+(.*)/);
      const numbered = line.match(/^(\d+)\.\s+(.*)/);
      // Strip inline markdown
      const clean = line
        .replace(/^#{1,6}\s+/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .trim();

      if (!clean) {
        cursorY += 3;
        return;
      }

      if (h1) {
        cursorY += 4;
        if (cursorY > pageHeight - margin) addPage();
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 66, 37);
        const wrapped = doc.splitTextToSize(clean, contentWidth);
        wrapped.forEach((l: string) => {
          if (cursorY > pageHeight - margin) addPage();
          doc.text(l, margin, cursorY);
          cursorY += 7;
        });
        doc.setDrawColor(0, 66, 37);
        doc.setLineWidth(0.2);
        doc.line(margin, cursorY, margin + contentWidth * 0.4, cursorY);
        cursorY += 5;
      } else if (h2) {
        cursorY += 3;
        if (cursorY > pageHeight - margin) addPage();
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        const wrapped = doc.splitTextToSize(clean, contentWidth);
        wrapped.forEach((l: string) => {
          if (cursorY > pageHeight - margin) addPage();
          doc.text(l, margin, cursorY);
          cursorY += 6;
        });
        cursorY += 2;
      } else if (bullet) {
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        const bulletText = bullet[1].replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
        const wrapped = doc.splitTextToSize('•  ' + bulletText, contentWidth - 6);
        wrapped.forEach((l: string, i: number) => {
          if (cursorY > pageHeight - margin) addPage();
          doc.text(l, margin + (i > 0 ? 6 : 0), cursorY);
          cursorY += 5.5;
        });
      } else if (numbered) {
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        const numText = numbered[2].replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
        const wrapped = doc.splitTextToSize(`${numbered[1]}.  ${numText}`, contentWidth - 6);
        wrapped.forEach((l: string, i: number) => {
          if (cursorY > pageHeight - margin) addPage();
          doc.text(l, margin + (i > 0 ? 8 : 0), cursorY);
          cursorY += 5.5;
        });
      } else {
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        const wrapped = doc.splitTextToSize(clean, contentWidth);
        wrapped.forEach((l: string) => {
          if (cursorY > pageHeight - margin) addPage();
          doc.text(l, margin, cursorY);
          cursorY += 5.5;
        });
      }
    });

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(`Seite ${i} von ${pageCount}  ·  Erstellt mit Stellify`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    doc.save(`stellify-${activeTool.id}.pdf`);
  };

  const downloadAsWord = () => {
    if (!toolResult || !activeTool) return;

    const mdToHtml = (text: string): string => {
      const lines = text.split('\n');
      let html = '';
      let inList = false;
      let inOrderedList = false;

      lines.forEach(line => {
        const h1 = line.match(/^#{1,2}\s+(.*)/);
        const h2 = line.match(/^#{3,4}\s+(.*)/);
        const bullet = line.match(/^[\*\-\+]\s+(.*)/);
        const numbered = line.match(/^(\d+)\.\s+(.*)/);
        const inline = (t: string) => t
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code>$1</code>');

        if (!line.trim()) {
          if (inList) { html += '</ul>'; inList = false; }
          if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
          return;
        }
        if (h1) {
          if (inList) { html += '</ul>'; inList = false; }
          html += `<h2>${inline(h1[1])}</h2>`;
        } else if (h2) {
          if (inList) { html += '</ul>'; inList = false; }
          html += `<h3>${inline(h2[1])}</h3>`;
        } else if (bullet) {
          if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
          if (!inList) { html += '<ul>'; inList = true; }
          html += `<li>${inline(bullet[1])}</li>`;
        } else if (numbered) {
          if (inList) { html += '</ul>'; inList = false; }
          if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
          html += `<li>${inline(numbered[2])}</li>`;
        } else {
          if (inList) { html += '</ul>'; inList = false; }
          if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
          html += `<p>${inline(line)}</p>`;
        }
      });
      if (inList) html += '</ul>';
      if (inOrderedList) html += '</ol>';
      return html;
    };

    const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <style>
    @page { size: A4; margin: 2.5cm 2.5cm 3cm 2.5cm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.6; color: #1A1A1A; }
    .doc-header { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #FDFCFB; background: #004225; padding: 6pt 0; margin: -2.5cm -2.5cm 2cm -2.5cm; padding-left: 2.5cm; text-transform: uppercase; letter-spacing: 1.5pt; }
    h1 { font-family: 'Times New Roman', Times, serif; color: #004225; font-size: 20pt; font-weight: bold; margin: 0 0 6pt 0; border-bottom: 0.5pt solid #004225; padding-bottom: 6pt; }
    h2 { font-family: 'Times New Roman', Times, serif; color: #004225; font-size: 14pt; font-weight: bold; margin: 16pt 0 4pt 0; }
    h3 { font-family: 'Times New Roman', Times, serif; color: #2A2A26; font-size: 12pt; font-weight: bold; margin: 12pt 0 3pt 0; }
    p { margin: 0 0 8pt 0; }
    ul { margin: 4pt 0 8pt 0; padding-left: 18pt; }
    ol { margin: 4pt 0 8pt 0; padding-left: 18pt; }
    li { margin-bottom: 3pt; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    code { font-family: Courier New, monospace; background: #F5F4F0; padding: 0 2pt; }
    .doc-footer { font-family: Arial, Helvetica, sans-serif; font-size: 7pt; color: #9A9A94; margin-top: 2cm; padding-top: 6pt; border-top: 0.5pt solid #E8E6E0; text-align: center; }
  </style>
</head>
<body>
  <div class="doc-header">Stellify &nbsp;|&nbsp; Schweizer Karriere-Co-Pilot</div>
  <h1>${activeTool.title}</h1>
  <div class="content">${mdToHtml(toolResult)}</div>
  <div class="doc-footer">Erstellt mit Stellify am ${new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; stellify.ch</div>
</body>
</html>`;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(docHtml);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = source;
    a.download = `stellify-${activeTool.id}.doc`;
    a.click();
    document.body.removeChild(a);
  };

  // --- RENDER HELPERS ---
  const prices = billingCycle === 'yearly' 
    ? { gratis: '0', pro: '14.90', ultimate: '39.90' }
    : { gratis: '0', pro: '19.90', ultimate: '49.90' };

  const translations: Record<string, any> = {
    DE: {
      welcome: "Willkommen zurück,",
      stella_greeting: "Grüezi, {name}! Ich bin Stella, deine KI-Karriere-Assistentin. Wie kann ich dir heute helfen?",
      drag_cv_here: "Lebenslauf (CV) hierher ziehen oder klicken",
      drop_file_here: "Datei hier loslassen",
      pdf_only: "PDF & Word akzeptiert",
      search_placeholder: "Jobs oder Tipps suchen...",
      search_popular: "Beliebte Suchen",
      search_quick: "Schnellzugriff",
      search_label: "Wonach suchst du heute?",
      apply_now: "Jetzt bewerben",
      job_location: "Standort",
      job_category: "Bereich",
      job_description: "Stellenbeschreibung",
      job_requirements: "Anforderungen",
      job_keywords: "ATS Keywords",
      search_results: "{count} Ergebnisse gefunden",
      search_no_results: "Keine Ergebnisse gefunden",
      search_no_results_desc: "Versuche es mit anderen Suchbegriffen oder Kategorien.",
      search_close: "ESC zum Schliessen",
      search_stella: "ENTER für Stella-Beratung",
      job_board_title: "Job-Börse",
      job_board_desc: "Entdecke aktuelle Stellenangebote, die perfekt zu deinem Profil passen.",
      filter_all: "Alle Branchen",
      filter_location: "Ort",
      filter_industry: "Branche",
      filter_keyword: "Stichwort",
      search_nav_profile: "Navigiere zu deinem Profil...",
      search_type_profile: "Dein Profil",
      search_type_tool: "Tools",
      search_type_job: "Offene Stellen",
      search_type_tip: "Karrieretipps",
      search_type_faq: "Häufige Fragen",
      stella_placeholder: "Frag Stella etwas...",
      stella_secure_data: "SSL-verschlüsselt · Sicher übertragen",
      hero_title: "Von Bewerbung bis Interview – dein KI-Karriere-Coach",
      hero_desc: "Stellify analysiert deinen Lebenslauf, optimiert deine Bewerbungsunterlagen und trainiert dich gezielt für das Vorstellungsgespräch – präzise, diskret und auf den Schweizer Markt zugeschnitten.",
      cta_free: "Kostenlos starten",
      upload_cv: "Lebenslauf (CV) hochladen",
      update_cv: "Lebenslauf (CV) aktualisieren",
      cv_info: "① CV hochladen → ② Stella analysiert dein Profil → ③ Bewerbung optimieren → ④ Interview meistern",
      dashboard: "Dashboard",
      tools: "Tools",
      pricing: "Preise",
      login: "Anmelden",
      register: "Registrieren",
      logout: "Abmelden",
      success_stories: "Erfolgsgeschichten",
      promo_spot: "Werbespot",
      features: "Features",
      how_it_works: "So funktioniert's",
      success_title: "Echte Menschen. Echte Erfolge.",
      success_desc: "Tausende Schweizer haben mit Stellify bereits ihren Traumjob gefunden. Hier sind einige ihrer Geschichten.",
      promo_title: "Erlebe die Zukunft der Karriere.",
      promo_play: "Spot abspielen",
      examples_title: "KI-Präzision in Aktion",
      examples_desc: "Sieh dir an, wie Stellify Standard-Texte in Schweizer Premium-Bewerbungen verwandelt.",
      ai_notice: "✨ Von Stella KI generiert • Bitte auf Richtigkeit prüfen",
      settings: "Einstellungen",
      profile: "Profil",
      subscription: "Abonnement",
      data_privacy: "Datenschutz",
      tools_title: "Profil einmal anlegen. Alle Tools nutzen.",
      tools_badge: "20+ Tools – Ein Abo",
      tools_view_all: "Alle Tools ansehen",
      market_title: "Warum jetzt. Warum Schweiz.",
      market_badge: "Marktpotenzial",
      pricing_title: "Einfache Preise. Volle Power.",
      pricing_monthly: "Monatlich",
      pricing_yearly: "Jährlich",
      pricing_save: "2 Monate gratis",
      pricing_gratis_desc: "Kostenlos loslegen – ohne Kreditkarte.",
      pricing_pro_desc: "Der Standard für ambitionierte Bewerber.",
      pricing_ultimate_desc: "Maximale Power für deine Karriere.",
      faq_title: "Häufig gestellte Fragen",
      footer_desc: "Stellify ist die führende KI-Plattform für Karriere-Optimierung in der Schweiz. Präzise, diskret und erfolgreich.",
      footer_legal: "Rechtliches",
      footer_contact: "Kontakt",
      auth_login: "Anmelden",
      auth_register: "Registrieren",
      auth_welcome: "Willkommen zurück",
      auth_create: "Konto erstellen",
      auth_precision: "Präzision für deine Karriere.",
      auth_first_name: "Vorname",
      auth_email: "E-Mail",
      auth_password: "Passwort",
      auth_forgot_password: "Passwort vergessen?",
      auth_reset_password_title: "Passwort zurücksetzen",
      auth_reset_password_desc: "Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.",
      auth_reset_password_btn: "Reset-Link senden",
      auth_back_to_login: "Zurück zum Login",
      auth_placeholder_name: "Max",
      auth_placeholder_email: "dein@email.ch",
      tool_no_cv: "⚠️ Kein Lebenslauf (CV) hochgeladen. Die KI nutzt allgemeine Informationen. Lade deinen Lebenslauf hoch für bessere Resultate.",
      tool_process: "Verarbeite...",
      tool_generate: "Generieren",
      tool_analyzing: "Stella analysiert...",
      tool_result: "Resultat",
      tool_download: "Download",
      tool_copy: "Kopieren",
      tool_copied: "Kopiert!",
      tool_empty_state: "Fülle die Felder aus und klicke auf \"Generieren\", um die KI-Analyse zu starten.",
      payment_title: "Bezahle wie du willst",
      payment_secure: "Sicher via Stripe verarbeitet.",
      how_badge: "Der Prozess",
      how_desc: "Von CV bis Vertragsunterschrift – Stellify begleitet dich durch jeden Schritt deiner Bewerbung.",
      how_1_t: "CV hochladen & analysieren",
      how_1_d: "Lade deinen Lebenslauf als PDF hoch. Stella liest ihn vollständig, erkennt deine Stärken und optimiert ihn nach Schweizer ATS-Standard – in Sekunden.",
      how_2_t: "Bewerbung perfektionieren",
      how_2_d: "Generiere massgeschneiderte Motivationsschreiben, optimiere jede CV-Sektion und simuliere den ATS-Check – alles in Schweizer Hochdeutsch.",
      how_3_t: "Interview bestehen",
      how_3_d: "Trainiere mit dem KI-Interview-Coach: echte Schweizer Fragen, dein persönliches Bewertungsraster und konkrete Formulierungsvorschläge für jede Situation.",
      faq_badge: "Häufige Fragen",
      faq_subtitle: "Alles was du wissen musst",
      faq_contact: "Noch Fragen?",
      cta_final_title: "Deine Karriere verdient deinen persönlichen Copilot.",
      cta_final_desc: "Kostenlos starten. 20+ Tools. Schweizer Standard. Kein Abo-Risiko.",
      cta_final_btn: "Jetzt kostenlos starten",
      settings_first_name: "Vorname",
      settings_email: "E-Mail",
      settings_status: "Status: Aktiv",
      settings_change_plan: "Plan ändern",
      settings_privacy_desc: "Deine Daten werden sicher in der Schweiz gespeichert. Du kannst jederzeit eine Kopie deiner Daten anfordern oder dein Konto löschen.",
      edit: "Bearbeiten",
      save: "Speichern",
      cancel: "Abbrechen",
      promo_presents: "Stellify präsentiert",
      promo_precision: "Präzision",
      promo_redefined: "neu definiert.",
      promo_desc: "In einem Markt, in dem jedes Detail zählt, ist Stellify dein unfairer Vorteil. Der erste KI-Karriere-Copilot, der für den Schweizer Standard entwickelt wurde.",
      promo_journey: "Starte deine Reise",
      faq_1_q: "Wie sicher sind meine Daten?",
      faq_1_a: "Deine Daten werden ausschliesslich auf Schweizer Servern verarbeitet und nach modernsten Standards verschlüsselt.",
      faq_2_q: "Wie funktioniert das Abonnement bei Stellify?",
      faq_2_a: "Bei Stellify gibt es keine automatische Verlängerung und keine Kündigung — du behältst jederzeit die volle Kontrolle. Du wählst einen monatlichen oder jährlichen Plan und erhältst sofort vollen Zugriff für genau diesen Zeitraum. Läuft das Abo ab, kehrt dein Konto automatisch zum kostenlosen Plan zurück — ganz ohne weiteres Zutun. Möchtest du weiter profitieren, schliesse einfach ein neues Abo ab. Dein Zugang verlängert sich dann nahtlos um einen weiteren Monat bzw. ein weiteres Jahr. Damit du rechtzeitig Bescheid weisst, schicken wir dir automatisch eine Erinnerungs-E-Mail vor Ablauf: Beim Monatsabo erhältst du diese E-Mail drei Tage vor dem Ablaufdatum, beim Jahresabo zwei Wochen vorher. Einen Planwechsel, etwa von Pro auf Ultimate, kannst du jederzeit nach Ablauf deines aktuellen Plans vornehmen. Dein genaues Ablaufdatum ist jederzeit in deinen Kontoeinstellungen sichtbar.",
      faq_3_q: "Wie viele Nutzungen sind in meinem Plan enthalten?",
      faq_3_a: "Der Gratis-Plan beinhaltet einmalig drei Tool-Nutzungen sowie drei Nachrichten im Stella-Chat — ideal, um die Plattform unverbindlich kennenzulernen. Diese Nutzungen werden nicht zurückgesetzt. Im Pro-Plan stehen dir monatlich fünfzig Tool-Nutzungen und täglich bis zu zwanzig Aktionen zur Verfügung. Der Ultimate-Plan bietet unbegrenzte Nutzung aller Funktionen ohne jede Einschränkung.",
      faq_4_q: "Funktioniert Stellify für alle Branchen?",
      faq_4_a: "Ja, unsere KI wurde auf dem gesamten Schweizer Arbeitsmarkt trainiert.",
      faq_5_q: "Welche Sprachen werden unterstützt?",
      faq_5_a: "Wir unterstützen Deutsch, Englisch, Französisch und Italienisch.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Einstellungen",
      nav_logout: "Abmelden",
      nav_login: "Anmelden",
      tool_limit_pro: "Du hast deine Nutzungen für diesen Monat aufgebraucht. Am 1. des nächsten Monats hast du wieder neue Versuche frei. Upgrade auf Ultimate für sofortigen, unbegrenzten Zugriff! 🚀",
      tool_limit_free: "Dieses Experten-Tool erfordert ein Pro- oder Unlimited-Abo. ✨",
      onboarding_welcome_title: "Willkommen bei Stellify",
      onboarding_welcome_desc: "Dein KI-Copilot für die Schweizer Karriere. Wir helfen dir, das Beste aus deinem Potenzial herauszuholen.",
      onboarding_cv_title: "Lade deinen CV hoch",
      onboarding_cv_desc: "Lade deinen Lebenslauf hoch, damit Stella dich und deine Erfahrungen besser versteht. So erhältst du personalisierte Tipps.",
      onboarding_chat_title: "Frag Stella",
      onboarding_chat_desc: "Nutze den Stella Chat für Karriereberatung, Interview-Vorbereitung oder um mehr über den Schweizer Arbeitsmarkt zu erfahren.",
      onboarding_tools_title: "Experten-Tools",
      onboarding_tools_desc: "Nutze unsere spezialisierten Tools für Gehaltschecks, ATS-Optimierung und Marktanalyse.",
      onboarding_next: "Weiter",
      onboarding_finish: "Loslegen",
      settings_rewatch_tutorial: "Tutorial erneut ansehen",
      nav_register: "Kostenlos starten",
      nav_greeting: "Grüezi",
      linkedin_connect: "LinkedIn verbinden",
      linkedin_connected: "LinkedIn verbunden",
      linkedin_share: "Auf LinkedIn teilen",
      linkedin_import_success: "Profil erfolgreich importiert!",
      linkedin_import_error: "Fehler beim Import.",
      dashboard_welcome: "Willkommen zurück,",
      dashboard_stat_plan: "Dein Plan",
      dashboard_usage_limit: "{used} von {total} Nutzungen",
      dashboard_usage_unlimited: "Unbegrenzte Nutzung",
      dashboard_usage_desc: "Tool-Nutzung",
      dashboard_chat_usage: "Stella Chat",
      dashboard_daily_usage: "Tageslimit",
      dashboard_reset_monthly: "Reset am 1. des Monats",
      dashboard_reset_daily: "Reset morgen",
      dashboard_stat_free_chat: "{used} / 3 Chat-Anfragen",
      dashboard_stat_free_tools: "{used} / 1 Tool-Nutzung",
      tool_daily_limit_pro: "Du hast dein Tageslimit erreicht. Morgen hast du wieder neue Versuche frei! 🚀",
      tool_limit_search_pro: "Dein Limit für Live-Suchen (10/Monat) ist erreicht. Nächsten Monat hast du wieder neue Suchen frei. Upgrade auf Ultimate für unbegrenzte Suche! 🚀",
      tool_limit_search_fair_use: "Du hast das Fair-Use-Limit für Live-Suchen erreicht. Bitte versuche es morgen wieder oder kontaktiere den Support.",
      dashboard_stat_pro: "Pro",
      dashboard_pro: "Karriere-Profi",
      dashboard_desc: "Dein Copilot Stella ist bereit. Analysiere neue Stellen, optimiere dein Profil oder bereite dich auf dein nächstes Interview vor.",
      dashboard_stat_analyses: "Analysen",
      dashboard_stat_cv_status: "Lebenslauf (CV)",
      dashboard_stat_ready: "Bereit",
      dashboard_stat_missing: "Fehlt",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_unlimited: "Unlimited",
      dashboard_stat_free: "Gratis",
      dashboard_cv_optimize: "Premium Optimierung",
      tracker_title: "Bewerbungs-Tracker",
      tracker_desc: "Verwalte deine Chancen",
      tracker_add: "Neu hinzufügen",
      tracker_company: "Firma",
      tracker_company_ph: "z.B. Google",
      tracker_position: "Position",
      tracker_position_ph: "z.B. Senior Designer",
      tracker_status: "Status",
      tracker_location: "Standort",
      tracker_location_ph: "z.B. Zürich",
      tracker_salary: "Gehaltsvorstellung",
      tracker_salary_ph: "z.B. 120'000 CHF",
      tracker_notes: "Notizen",
      tracker_notes_ph: "z.B. Kontaktperson: Hans Muster...",
      tracker_save: "Speichern",
      tracker_update: "Aktualisieren",
      tracker_cancel: "Abbrechen",
      tracker_wishlist: "Wunschliste",
      tracker_applied: "Beworben",
      tracker_interview: "Interview",
      tracker_offer: "Angebot",
      tracker_rejected: "Abgelehnt",
      tracker_notes_badge: "Notizen vorhanden",
      tracker_empty: "Leer",
      quick_tools: "Quick Tools",
      all_tools: "Alle Tools",
      recent_docs: "Deine letzten Dokumente",
      view_all: "Alle ansehen",
      time_just_now: "Gerade eben",
      stella_context_title: "Stella Context",
      stella_context_cv_ready: "CV analysiert",
      stella_context_no_cv: "Kein Lebenslauf hochgeladen",
      stella_context_focus: "Fokus-Bereiche",
      stella_roadmap: "Deine Roadmap",
      stella_roadmap_empty: "Lade deinen Lebenslauf hoch, um deine Roadmap zu sehen.",
      stella_insights: "Stella Insights",
      stella_market_score: "Market Score",
      stella_top_keywords: "Top Keywords",
      stella_best_match: "Bester Match",
      stella_ch_corrections: "Sprachliche Korrekturen (CH-Hochdeutsch)",
      stella_ch_tips: "Schweiz-Spezifische Tipps",
      stella_short_profile: "Optimiertes Kurzprofil",
      stella_highlights: "Optimierte Highlights",
      stella_name: "Stella – KI-Assistentin",
      stella_online: "Online – bereit zu helfen",
      stella_input_ph: "Schreibe Stella etwas...",
      tool_open: "Öffnen",
      docs_empty: "Noch keine Dokumente generiert. Starte mit einem Tool unten.",
      stella_raw_json: "Rohdaten (JSON) anzeigen",
      stella_full_analysis: "Vollständige Analyse",
      stella_insights_with_cv: "Stella hat dein Profil analysiert. Dein Fokus auf Präzision passt hervorragend zum Schweizer Markt. Nutze den CV-Analyse-Tool für einen Tiefen-Check.",
      stella_insights_no_cv: "Sobald du deinen Lebenslauf hochlädst, erstelle ich hier eine massgeschneiderte Analyse deiner Marktchancen.",
      salary_history: "Gehaltsverlauf",
      hero_precision: "Schweizer KI-Präzision",
      upload_analyzing: "Analysiere Dokumentenstruktur...",
      upload_done: "Lebenslauf erfolgreich analysiert. Stella ist bereit.",
      hero_success_rate: "Erfolgsquote",
      hero_more_interviews: "Mehr Interviews",
      tool_see_plans: "Pläne ansehen",
      tool_maybe_later: "Vielleicht später",
      tool_inputs: "Eingaben",
      tool_load_file: "Datei laden",
      salary_security_notice: "Deine Daten sind sicher: Stellify speichert keine persönlichen Gehaltsdaten. Die Berechnung erfolgt anonymisiert nach Schweizer Datenschutzstandards.",
      swiss_standard_notice_title: "Swiss Career Excellence",
      swiss_standard_notice_text: "Präzise auf den Schweizer Arbeitsmarkt ausgerichtet – von der Sprache bis zur Bewerbungsstruktur.",
      footer_rights: "Alle Rechte vorbehalten.",
      footer_privacy: "Datenschutz",
      footer_terms: "AGB",
      footer_imprint: "Impressum",
      cookie_title: "Datenschutz & Cookies",
      cookie_desc: "Wir verwenden notwendige Cookies für den Betrieb der Plattform sowie optionale Analyse-Cookies zur Verbesserung des Angebots. Deine Daten werden nach Schweizer DSG & DSGVO verarbeitet.",
      cookie_accept: "Alle akzeptieren",
      cookie_essential: "Nur Notwendige",
      cookie_privacy_link: "Datenschutzrichtlinie",
      close: "Schliessen",
      back: "Zurück",
      or_divider: "Oder",
      stat_members: "Mitglieder",
      hero_intro: "Dein persönlicher",
      badge_new: "NEU",
      tools_section_badge: "21 KI-Tools",
      tools_section_title: "Alles, was du für deine Karriere brauchst",
      tools_section_desc: "Von der CV-Analyse bis zur Lohnverhandlung – Stellify begleitet dich durch jeden Schritt.",
      tools_section_cta: "Alle 21 Tools ansehen →",
      testimonial_verified: "Verifiziert",
      cv_banner_title: "Lade deinen Lebenslauf hoch für personalisierte KI-Analysen",
      cv_banner_desc: "PDF oder Word · Kostenlos · Alle 21 Tools werden auf deinen Lebenslauf abgestimmt",
      cv_banner_btn: "Lebenslauf (CV) hochladen",
      cv_stat_upload: "Hochladen",
      testimonials: [
        { name: 'Lukas B.', role: 'Polymechaniker EFZ', city: 'Winterthur', quote: 'Nach meiner Ausbildung wusste ich nicht genau, wie ich meine Praxiserfahrungen am besten im CV verkaufe. Stellify half mir, meine Projekte präzise zu beschreiben. Jetzt habe ich einen tollen Job bei einem grossen Industrieunternehmen.' },
        { name: 'Sarah W.', role: 'HR-Fachfrau', city: 'Zürich', quote: 'Ich sehe täglich hunderte Bewerbungen. Der Zeugnis-Decoder von Stellify ist erschreckend präzise. Er hilft mir nicht nur privat, er gibt mir auch eine neue Perspektive auf den Schweizer Arbeitsmarkt.' },
        { name: 'Hans-Peter K.', role: 'Logistikleiter', city: 'Olten', quote: 'Mit über 50 nochmal neu anfangen war eine Herausforderung. Stellify hat meine jahrzehntelange Erfahrung in moderne, ATS-optimierte Sprache übersetzt. Das öffnete mir Türen, die ich schon für geschlossen hielt.' }
      ],
      interview_live_promo: "Übe dein nächstes Interview – per Text oder Mikrofon",
      remaining: "verbleibend",
      search_close_label: "Schliessen",
      search_open_selection: "Auswahl öffnen",
      search_stella_advice: "Stella-Beratung",
      premium_analysis_desc: "Tiefgehende Prüfung nach Schweizer Standards",
      salary_median_label: "Geschätzter Medianlohn (Brutto/Jahr)",
      salary_important_notice: "Wichtiger Hinweis",
      salary_disclaimer: "Diese Schätzung basiert auf aktuellen Markttrends und KI-Modellen für den Schweizer Arbeitsmarkt. Faktoren wie spezifische Zertifizierungen, Bonusvereinbarungen und individuelle Benefits können das tatsächliche Angebot beeinflussen.",
      generated_app_title: "Deine generierte Bewerbung",
      copy: "Kopieren",
      tool_how_to_use: "So nutzt du dieses Tool",
      tool_scroll_example: "Runterscrollen für Profi-Beispiel",
      tool_pro_example: "Profi-Beispiel",
      tool_unlimited_access: "Unlimited Zugang",
      tool_unlock_desc: "Schalte dieses Tool und alle Premium-Funktionen mit dem Unlimited-Plan frei.",
      tool_discover_unlimited: "Jetzt Unlimited entdecken",
      tool_fill_fields: "Fülle die Felder links aus",
      auth_terms_by_signing: "Mit der Anmeldung akzeptierst du unsere",
      auth_terms_and: "und",
      auth_terms_data_processing: "Deine Daten werden sicher in der Schweiz/EU verarbeitet.",
      auth_register_new: "→ Jetzt neu registrieren",
      auth_switch_to_login: "→ Zum Login wechseln",
      auth_reset_session: "Sitzung zurücksetzen",
      password_weak: "Schwach",
      password_medium: "Mittel",
      password_strong: "Stark",
      interview_complete: "🎉 Interview abgeschlossen!",
      interview_question_of: "Frage {current} von 5",
      interview_show_tip: "Insider-Tipp anzeigen",
      interview_feedback_prev: "✓ Feedback letzte Antwort",
      interview_your_answer: "Deine Antwort",
      interview_answer_placeholder: "Schreibe deine Antwort hier...",
      interview_mic_unavailable: "Mikrofon nicht verfügbar in diesem Browser.",
      interview_mic_answer: "Per Mikrofon antworten",
      interview_recording: "Aufnahme läuft...",
      interview_feedback_unavailable: "Feedback konnte nicht geladen werden.",
      interview_evaluating: "Stella bewertet...",
      interview_submit: "Antwort senden → Frage {n}/5",
      interview_show_model: "Musterantwort anzeigen",
      interview_common_mistake: "⚠ Häufiger Fehler: ",
      interview_complete_title: "Interview abgeschlossen",
      interview_complete_desc: "Alle 5 Fragen beantwortet. Hier dein Summary:",
      interview_new: "Neues Interview",
      interview_copy_summary: "Summary kopieren",
      settings_your_usage: "Deine Nutzung",
      settings_apps_tools: "Bewerbungen & Tools",
      settings_generations: "Generierungen",
      settings_actions_today: "Aktionen heute",
      settings_free_use: "Gratis-Nutzung",
      settings_requests: "Anfragen",
      settings_delete_account: "Konto löschen",
      app_initializing: "Wird initialisiert...",
      market_1_t: "Jobwechsel nehmen zu",
      market_1_d: "Durchschnittlich alle 3 Jahre wechseln Arbeitnehmer in der Schweiz ihren Job.",
      market_2_t: "Bewerbungen kosten Zeit",
      market_2_d: "Eine gute Bewerbung dauert 3-5 Stunden. Mit KI: 3 Minuten.",
      market_3_t: "KI wird akzeptiert",
      market_3_d: "78% der Schweizer Arbeitnehmer würden KI für Karrierehilfe nutzen.",
      market_4_t: "Kein gutes CH-Tool",
      market_4_d: "Keine Lösung versteht das Schweizer Zeugnis-System und ATS-Anforderungen.",
      security_badge: "Datenschutz & Sicherheit",
      security_title: "Deine Daten sind in der Schweiz sicher.",
      security_desc: "Wir nehmen Datenschutz ernst. Deine Dokumente werden nach Schweizer Standards verarbeitet und verschlüsselt gespeichert.",
      security_item_1_t: "Schweizer Server",
      security_item_1_d: "Alle Daten werden ausschliesslich in hochsicheren Rechenzentren in der Schweiz verarbeitet.",
      security_item_2_t: "Ende-zu-Ende Verschlüsselung",
      security_item_2_d: "Deine CVs und persönlichen Daten sind jederzeit verschlüsselt und für Dritte unzugänglich.",
      security_item_3_t: "DSGVO & DSG Konform",
      security_item_3_d: "Wir halten uns strikt an das Schweizer Datenschutzgesetz und die europäische DSGVO.",
      comparison_badge: "Warum Stellify?",
      comparison_title: "Der erste echte KI-Karriere-Copilot für die Schweiz.",
      comparison_subtitle: "Andere Tools machen eines. Stellify macht alles – und versteht den Schweizer Markt.",
      comparison_bad_title: "Standard KI / Andere Tools",
      comparison_bad_items: [
        "Leeres Chatfenster, du weisst nicht was eingeben",
        "Kein Schweizer Format/Standard (ss vs ß)",
        "Kein ATS-Check – du weisst nicht ob dein CV gelesen wird",
        "Kein Zeugnis-Decoder – Schweizer Code bleibt ein Rätsel",
        "Kein Job-Matching – du bewirbst dich ins Blaue",
        "5 verschiedene Apps, kein roter Faden"
      ],
      comparison_good_title: "Stellify KI-Copilot",
      comparison_good_items: [
        "Geführte Prozesse, Stella weiss was du brauchst",
        "100% Schweizer Standards (Arbeitszeugnis-Code)",
        "Echter ATS-Simulator für Schweizer Recruiter",
        "Präziser Zeugnis-Decoder (Geheimsprache)",
        "KI-Job-Matching mit Fit-Score",
        "Alles in einer Plattform, perfekt abgestimmt"
      ],
      why_stellify_points: [
        { title: "Schweizer Präzision", desc: "Wir beherrschen die Nuancen des Schweizer Marktes – von der korrekten Rechtschreibung bis hin zu kantonalen Besonderheiten.", icon: "Target" },
        { title: "Zeugnis-Code Entschlüsselt", desc: "Verstehe endlich, was wirklich in deinen Arbeitszeugnissen steht. Stella erkennt versteckte Botschaften sofort.", icon: "ShieldCheck" },
        { title: "Mehrsprachigkeit", desc: "Bewirb dich nahtlos auf Deutsch, Englisch, Französisch oder Italienisch – perfekt für den multilingualen Schweizer Markt.", icon: "Globe" },
        { title: "ATS-Optimierung", desc: "Unsere KI ist auf die Systeme grosser Schweizer Arbeitgeber trainiert, damit dein CV garantiert gelesen wird.", icon: "Cpu" },
        { title: "Lohn-Transparenz", desc: "Erhalte präzise Gehaltsprognosen basierend auf Schweizer Marktdaten für deine spezifische Region und Branche.", icon: "Coins" },
        { title: "Datenschutz 'Made in CH'", desc: "Deine sensiblen Daten verlassen die Schweiz nicht. Wir garantieren höchste Sicherheit nach Schweizer Standards.", icon: "Lock" }
      ],
      pricing_free_f: ["3× Bewerbung oder Tool-Nutzung", "3× Stella Chat Anfragen", "KI-Gehaltsrechner (Basis)", "Schweizer Standards"],
      pricing_pro_f: ["50× Bewerbungen / Nutzungen pro Monat", "20× Aktionen pro Tag", "Zeugnis-Decoder (Pro)", "Interview-Coach"],
      pricing_ultimate_f: ["Unlimitierte Bewerbungen ♾️", "Alle Pro-Features + Exklusive Tools", "Deep Analysis Modus (KI)", "24/7 VIP-Support"],
      pricing_cta_free: "Kostenlos starten",
      pricing_cta_pro: "Pro werden",
      pricing_cta_ultimate: "Ultimate wählen",
      pricing_recommended: "Empfohlen",
      value_title: "CHF 19.90 – lohnt sich das?",
      value_items: [
        "Ein Karriereberater kostet CHF 200–400 / Sitzung",
        "Zeugnis nicht verstanden = falscher Job",
        "Ein schlechter ATS-Score = CV wird nie gelesen",
        "Eine schlechte Bewerbung = verpasste Stelle",
        "Mit einer besseren Stelle amortisiert sich das Abo sofort",
        "Stellify spart dir 3–5 Std. pro Bewerbung"
      ],
      tools_data: {
        'cv-optimizer': { 
          title: 'CV-Optimierer', 
          desc: 'Analysiert deinen Lebenslauf auf Schweizer Standards & optimiert Formulierungen.', 
          input_label: 'Welche Sektion optimieren?', 
          input_placeholder: 'z.B. Berufserfahrung, Kurzprofil...',
          tutorial: 'Beispiel: Optimierung der Sektion "Berufserfahrung" für einen Projektleiter. Statt "Verantwortlich für Projekte" schreiben wir "Leitung von 5 cross-funktionalen Projekten mit einem Budget von CHF 500k, Steigerung der Effizienz um 20%".'
        },
        'salary-calc': { 
          title: 'KI-Gehaltsrechner CH', 
          desc: 'Branche, Erfahrung, Kanton – KI analysiert Marktlöhne & gibt dir Verhandlungsbasis.', 
          input_job: 'Job-Titel', 
          input_job_placeholder: 'z.B. Software Engineer',
          input_industry: 'Branche', 
          input_industry_placeholder: 'z.B. Banking',
          input_exp: 'Jahre Erfahrung', 
          input_exp_placeholder: 'z.B. 5',
          input_canton: 'Kanton',
          input_canton_placeholder: 'z.B. ZH',
          tutorial: 'Beispiel: Software Engineer im Banking (Zürich) mit 5 Jahren Erfahrung. Marktwert ca. CHF 125k - 145k inkl. Bonus.'
        },
        'cv-gen': { 
          title: 'Bewerbungen', 
          desc: 'Motivationsschreiben & Lebenslauf in 60 Sekunden, live generiert.', 
          input_label: 'Stelleninserat (optional)', 
          input_placeholder: 'Kopiere das Stelleninserat hierher...',
          tutorial: 'Beispiel: Motivationsschreiben für eine Stelle als Marketing Manager bei Nestlé. Fokus auf lokale Marktkenntnisse und messbare Erfolge in der Westschweiz.'
        },
        'ats-sim': { 
          title: 'ATS-Simulation', 
          desc: 'Prüft ob dein Lebenslauf durch Recruiter-Software kommt. Mit Score & Tipps.', 
          input_label: 'Stelleninserat (optional)', 
          input_placeholder: 'Kopiere das Inserat für einen Match-Check...',
          tutorial: 'Beispiel: Check eines CVs gegen ein Inserat von Roche. Analyse zeigt, dass Keywords wie "GMP-Compliance" oder "Stakeholder Management" fehlen.'
        },
        'zeugnis': { 
          title: 'Premium Zeugnis-Decoder', 
          desc: 'Entschlüsselt den geheimen Code Schweizer Arbeitszeugnisse. Erkennt versteckte negative Botschaften und bewertet deine Marktposition.', 
          input_label: 'Text des Arbeitszeugnisses', 
          input_placeholder: 'Kopiere den Text deines Zeugnisses hierher...',
          tutorial: 'Beispiel: "Er erledigte Aufgaben zu unserer vollen Zufriedenheit" klingt gut, ist aber im Schweizer Code nur eine Note 3-4. Wir übersetzen das in Klartext.'
        },
        'skill-gap': { 
          title: 'Skill-Gap Analyse', 
          desc: 'Vergleiche dein Profil mit deinem Traumjob und finde heraus, was dir noch fehlt.', 
          input_label: 'Ziel-Position', 
          input_placeholder: 'z.B. Senior Data Scientist',
          tutorial: 'Beispiel: Ziel "Senior Data Scientist". Analyse zeigt Lücken in "Cloud Architecture" und "Leadership Experience" im Vergleich zu Schweizer Top-Arbeitgebern.'
        },
        'cv-analysis': { 
          title: 'CV-Analyse', 
          desc: 'Tiefgehende Analyse deines Lebenslaufs auf Keywords, Branchen-Fit und Verbesserungspotential.',
          tutorial: 'Beispiel: Dein CV hat einen Swiss-Readiness Score von 75%. Wir empfehlen die Ergänzung deiner Arbeitsbewilligung (C-Bewilligung) und die GERS-Sprachniveaus.'
        },
        'tracker': { 
          title: 'Bewerbungs-Strategie', 
          desc: 'Erstelle einen massgeschneiderten Schlachtplan für deine nächste Bewerbung.', 
          input_label: 'Jobtitel / Firma', 
          input_placeholder: 'z.B. Senior Projektleiter bei Roche',
          tutorial: 'Beispiel: Schlachtplan für UBS. Schritt 1: Networking via LinkedIn. Schritt 2: CV-Anpassung auf "Wealth Management". Schritt 3: Vorbereitung auf Verhaltensfragen.'
        },
        'matching': { 
          title: 'Job-Matching', 
          desc: 'KI findet deine Top 5 passenden Stellenprofile mit Fit-Score.',
          tutorial: 'Beispiel: Basierend auf deinem Profil passen Stellen als "Business Analyst" im Versicherungswesen (Zürich) am besten (92% Fit).'
        },
        'interview': { 
          title: 'Interview-Coach', 
          desc: 'KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0-100.', 
          input_label: 'Position für das Interview', 
          input_placeholder: 'z.B. Marketing Manager',
          tutorial: 'Beispiel: Frage "Warum wollen Sie ausgerechnet in der Schweiz arbeiten?". Wir trainieren die Antwort: Fokus auf Stabilität, Innovation und deinen Beitrag zum Schweizer Standort.'
        },
        'lehrstellen': { 
          title: 'Lehrstellen-Finder', 
          desc: 'Finde die perfekte Lehrstelle in deiner Region. Mit KI-Check für deine Eignung.', 
          input_interest: 'Was interessiert dich?', 
          input_interest_placeholder: 'z.B. Informatik, KV, Technik...',
          input_location: 'Region',
          input_location_placeholder: 'z.B. Bern, Zürich, Basel...',
          tutorial: 'Beispiel: Suche nach Informatik-Lehrstellen in Bern. Wir prüfen, ob deine Schulnoten und Interessen zum Anforderungsprofil der Post oder SBB passen.'
        },
        'berufseinstieg': { 
          title: 'Berufseinstieg-Guide', 
          desc: 'Frisch aus der Lehre oder Studium? Wir zeigen dir, wie du deinen ersten "echten" Job findest.', 
          input_label: 'Was hast du abgeschlossen?', 
          input_placeholder: 'z.B. EFZ Informatik, Matura...',
          tutorial: 'Beispiel: Nach dem EFZ Informatik. Fokus auf das erste Junior-Jahr: Wie du dich von anderen Lehrabgängern abhebst.'
        },
        'erfahrung-plus': { 
          title: 'Erfahrung-Plus', 
          desc: 'Spezial-Tool für Ü50. Wir zeigen dir, wie du deine jahrzehntelange Erfahrung als unschlagbaren Vorteil verkaufst.', 
          input_label: 'Deine grösste Stärke', 
          input_placeholder: 'z.B. 20 Jahre Führungserfahrung im Bauwesen',
          tutorial: 'Beispiel: Wie du 25 Jahre Führungserfahrung nicht als "zu teuer", sondern als "sofortige Risikominimierung" für den Arbeitgeber verkaufst.'
        },
        'wiedereinstieg': { 
          title: 'Wiedereinstieg-Check', 
          desc: 'Längere Pause gemacht? Wir füllen die Lücke in deinem CV professionell und überzeugend.', 
          input_label: 'Grund der Pause (optional)', 
          input_placeholder: 'z.B. Elternzeit, Weiterbildung...',
          tutorial: 'Beispiel: Nach 2 Jahren Elternzeit. Wir formulieren die Pause als "Management von Familien-Logistik & Weiterbildung in Digital Marketing" um.'
        },
        'karriere-checkup': { 
          title: 'Karriere-Checkup', 
          desc: 'Du hast einen Job, willst aber mehr? Wir prüfen dein aktuelles Marktpotential.', 
          input_label: 'Aktueller Job', 
          input_placeholder: 'z.B. Projektleiter',
          tutorial: 'Beispiel: Du bist seit 4 Jahren Projektleiter. Wir prüfen, ob jetzt der richtige Zeitpunkt für den Schritt zum Senior oder Teamleiter ist.'
        },
        'linkedin-job': { 
          title: 'LinkedIn → Bewerbung', 
          desc: 'Profil + Stelleninserat → Motivationsschreiben, CV-Highlights & Top-Argumente.', 
          input_profile: 'LinkedIn Profil Text', 
          input_profile_placeholder: 'Kopiere dein LinkedIn-Profil ("Über mich" & Erfahrung)...',
          input_ad: 'Stelleninserat',
          input_ad_placeholder: 'Kopiere das Stelleninserat hierher...',
          tutorial: 'Beispiel: Dein LinkedIn-Profil + Inserat von Swisscom. Wir generieren die 3 stärksten Argumente, warum genau du der Match bist.'
        },
        'linkedin-posts': { 
          title: 'LinkedIn-Posts', 
          desc: '3 massgeschneiderte Posts im Schweizer Stil – keine Corporate-Floskeln.', 
          input_label: 'Thema oder Fokus', 
          input_placeholder: 'z.B. Neuer Job...',
          tutorial: 'Beispiel: Post über deinen neuen Job bei der Credit Suisse. Professionell, bescheiden und doch wirkungsvoll im Schweizer Stil.'
        },
        'cv-premium': { 
          title: 'Premium CV-Rewrite', 
          desc: 'Vollständige Optimierung deines Lebenslaufs auf Schweizer Premium-Standard (kein ß, Schweizer Präzision).', 
          input_label: 'Dein aktueller CV-Text', 
          input_placeholder: 'Kopiere hier deinen gesamten CV-Inhalt hinein...',
          tutorial: 'Beispiel: Komplette Neuerstellung. Wir entfernen das "ß", passen die Datumsformate an und optimieren das Layout auf Schweizer Eleganz.'
        },
        'career-roadmap': { 
          title: 'Karriere-Roadmap', 
          desc: 'Erstellt einen persönlichen Schlachtplan für deine Karriere in der Schweiz inkl. Weiterbildung & Jobs.', 
          input_label: 'Dein Karriereziel (optional)', 
          input_placeholder: 'z.B. CTO in einem Fintech',
          tutorial: 'Beispiel: Ziel "Head of IT". Roadmap: 1. Zertifizierung in ITIL. 2. Wechsel in eine Teamleiter-Rolle. 3. MBA an der HSG in 2 Jahren.'
        },
        'job-search': { 
          title: 'Job-Suche CH', 
          desc: 'Durchsuche aktuelle Stellenangebote in der Schweiz nach Keywords, Ort und Branche.', 
          input_keyword: 'Stichwort', 
          input_keyword_placeholder: 'z.B. Software Engineer, Marketing...',
          input_location: 'Ort',
          input_location_placeholder: 'z.B. Zürich, Bern, Genf...',
          input_industry: 'Branche',
          input_industry_placeholder: 'z.B. IT, Pharma, Banking...',
          tutorial: 'Beispiel: Suche nach "Projektleiter" in "Basel" im Bereich "Pharma". Wir zeigen dir passende Stellen aus unserer Datenbank.'
        },
        'interview-live': {
          title: 'Live Interview-Coach',
          desc: 'Übe dein Interview für eine spezifische Stelle live. Stella stellt massgeschneiderte Fragen – du antwortest per Text oder Mikrofon.',
          badge: 'NEU · LIVE',
          input_job: 'Stellenbezeichnung',
          input_job_placeholder: 'z.B. Senior UX Designer bei Digitec',
          input_company: 'Unternehmen (optional)',
          input_company_placeholder: 'z.B. Nestlé AG, Zürich',
          input_desc: 'Stellenbeschreibung (optional)',
          input_desc_placeholder: 'Füge die Stellenbeschreibung ein für noch gezieltere Fragen...',
          tutorial: 'Beispiel: Interview für "Product Manager" bei ABB. Stella stellt 5 echte Fragen inkl. Feedback zu Tonfall, STAR-Methode und Schweizer Marktkenntnis.'
        },
        'salary-negotiation': {
          title: 'Lohnverhandlungs-Coach',
          desc: 'Massgeschneiderter Leitfaden für deine Gehaltsverhandlung – Marktpositionierung, Argumente und Schweizer 13. Monatslohn-Strategie.',
          badge: 'Pro',
          input_label: 'Aktuelle / Ziel-Vergütung',
          input_placeholder: 'z.B. Ich möchte von 95k auf 115k CHF aufsteigen...',
          tutorial: 'Beispiel: Verhandlung bei der Zurich Insurance. Wir liefern 5 konkrete Argumente, die perfekte Einstiegsforderung und Reaktionen auf typische Einwände.'
        }
      }
    },
    FR: {
      welcome: "Bon retour,",
      stella_greeting: "Salut, {name}! Je suis Stella, votre assistante de carrière IA. Comment puis-je vous aider aujourd'hui?",
      drag_cv_here: "Glissez votre CV ici ou cliquez",
      drop_file_here: "Relâchez le fichier ici",
      pdf_only: "PDF & Word acceptés",
      search_placeholder: "Rechercher des jobs ou des conseils...",
      search_popular: "Recherches populaires",
      search_quick: "Accès rapide",
      search_label: "Que cherchez-vous aujourd'hui ?",
      apply_now: "Postuler maintenant",
      job_location: "Lieu",
      job_category: "Secteur",
      job_description: "Description du poste",
      job_requirements: "Exigences",
      job_keywords: "Mots-clés ATS",
      search_results: "{count} résultats trouvés",
      search_no_results: "Aucun résultat trouvé",
      search_no_results_desc: "Essayez d'autres termes de recherche ou catégories.",
      search_close: "ESC pour fermer",
      search_stella: "ENTER pour le conseil Stella",
      job_board_title: "Bourse à l'emploi",
      job_board_desc: "Découvrez les offres d'emploi actuelles qui correspondent parfaitement à votre profil.",
      filter_all: "Tous les secteurs",
      filter_location: "Lieu",
      filter_industry: "Secteur",
      filter_keyword: "Mot-clé",
      search_nav_profile: "Navigation vers votre profil...",
      search_type_profile: "Votre Profil",
      search_type_tool: "Outils",
      search_type_job: "Postes vacants",
      search_type_tip: "Conseils de carrière",
      search_type_faq: "Questions fréquentes",
      stella_placeholder: "Demandez quelque chose à Stella...",
      stella_secure_data: "Traitement sécurisé des données suisses",
      hero_title: "De la candidature à l'entretien – votre coach carrière IA",
      hero_desc: "Stellify analyse votre CV, optimise vos candidatures et vous prépare aux entretiens – précisément, discrètement, pour le marché suisse.",
      cta_free: "Tester gratuitement",
      upload_cv: "Télécharger CV (Lebenslauf)",
      update_cv: "Mettre à jour CV (Lebenslauf)",
      cv_info: "Un CV (Curriculum Vitae) est votre parcours professionnel. C'est le document le plus important de votre candidature.",
      dashboard: "Tableau de bord",
      tools: "Outils",
      pricing: "Tarifs",
      login: "Connexion",
      register: "S'inscrire",
      logout: "Déconnexion",
      success_stories: "Histoires de réussite",
      promo_spot: "Spot publicitaire",
      features: "Fonctionnalités",
      how_it_works: "Comment ça marche",
      success_title: "De vraies personnes. De vrais succès.",
      success_desc: "Des milliers de Suisses ont déjà trouvé l'emploi de leurs rêves avec Stellify. Voici quelques-unes de leurs histoires.",
      promo_title: "Découvrez l'avenir de votre carrière.",
      promo_play: "Lire le spot",
      examples_title: "La précision de l'IA en action",
      examples_desc: "Découvrez comment Stellify transforme des textes standards en candidatures suisses premium.",
      ai_notice: "✨ Généré par Stella IA • Veuillez vérifier l'exactitude",
      settings: "Paramètres",
      profile: "Profil",
      subscription: "Abonnement",
      data_privacy: "Confidentialité",
      tools_title: "Créez votre profil une fois. Utilisez tous les outils.",
      tools_badge: "20+ Outils – Un abonnement",
      tools_view_all: "Voir tous les outils",
      market_title: "Pourquoi maintenant. Pourquoi la Suisse.",
      market_badge: "Potentiel du marché",
      pricing_title: "Tarifs simples. Puissance totale.",
      pricing_monthly: "Mensuel",
      pricing_yearly: "Annuel",
      pricing_save: "2 mois gratuits",
      pricing_gratis_desc: "Commencez gratuitement – sans carte de crédit.",
      pricing_pro_desc: "Le standard pour les candidats ambitieux.",
      pricing_ultimate_desc: "Puissance maximale pour votre carrière.",
      faq_title: "Foire aux questions",
      footer_desc: "Stellify est la plateforme IA leader pour l'optimisation de carrière en Suisse. Précise, discrète et réussie.",
      footer_legal: "Mentions légales",
      footer_contact: "Contact",
      auth_login: "Se connecter",
      auth_register: "S'inscrire",
      auth_welcome: "Bon retour",
      auth_create: "Créer un compte",
      auth_precision: "La précision pour votre carrière.",
      auth_first_name: "Prénom",
      auth_email: "E-mail",
      auth_password: "Mot de passe",
      auth_forgot_password: "Mot de passe oublié ?",
      auth_reset_password_title: "Réinitialiser le mot de passe",
      auth_reset_password_desc: "Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
      auth_reset_password_btn: "Envoyer le lien",
      auth_back_to_login: "Retour à la connexion",
      auth_placeholder_name: "Max",
      auth_placeholder_email: "votre@email.ch",
      tool_no_cv: "⚠️ Aucun CV téléchargé. L'IA utilise des informations générales. Téléchargez votre CV pour de meilleurs résultats.",
      tool_process: "Traitement...",
      tool_generate: "Générer",
      tool_analyzing: "Stella analyse...",
      tool_result: "Résultat",
      tool_download: "Télécharger",
      tool_copy: "Copier",
      tool_copied: "Copié !",
      tool_empty_state: "Remplissez les champs et cliquez sur \"Générer\" pour lancer l'analyse IA.",
      payment_title: "Payez comme vous voulez",
      payment_secure: "Traitement sécurisé via Stripe.",
      how_badge: "Le processus",
      how_desc: "Du CV à la signature du contrat – Stellify vous accompagne à chaque étape de votre candidature.",
      how_1_t: "Télécharger & analyser le CV",
      how_1_d: "Téléchargez votre CV en PDF. Stella le lit entièrement, identifie vos points forts et l'optimise selon les standards ATS suisses.",
      how_2_t: "Perfectionner la candidature",
      how_2_d: "Générez des lettres de motivation sur mesure, optimisez chaque section du CV et simulez le contrôle ATS – en allemand suisse standard.",
      how_3_t: "Réussir l'entretien",
      how_3_d: "Entraînez-vous avec le coach d'entretien IA : questions réelles, grille d'évaluation personnalisée et suggestions de formulation concrètes.",
      faq_badge: "Questions fréquentes",
      faq_subtitle: "Tout ce que vous devez savoir",
      faq_contact: "Encore des questions ?",
      cta_final_title: "Votre carrière mérite votre copilote personnel.",
      cta_final_desc: "Démarrage gratuit. 20+ outils. Standard suisse. Sans risque d'abonnement.",
      cta_final_btn: "Démarrer gratuitement maintenant",
      settings_first_name: "Prénom",
      settings_email: "E-mail",
      settings_status: "Statut : Actif",
      settings_change_plan: "Changer de forfait",
      settings_privacy_desc: "Vos données sont stockées en toute sécurité en Suisse. Vous pouvez demander une copie de vos données ou supprimer votre compte à tout moment.",
      edit: "Modifier",
      save: "Enregistrer",
      cancel: "Annuler",
      promo_presents: "Stellify présente",
      promo_precision: "La précision",
      promo_redefined: "redéfinie.",
      promo_desc: "Dans un marché où chaque détail compte, Stellify est votre avantage injuste. Le premier copilote de carrière IA conçu pour le standard suisse.",
      promo_journey: "Commencez votre voyage",
      faq_1_q: "Mes données sont-elles en sécurité ?",
      faq_1_a: "Vos données sont traitées exclusivement sur des serveurs suisses et cryptées selon les normes les plus modernes.",
      faq_2_q: "Comment fonctionne l'abonnement Stellify ?",
      faq_2_a: "Chez Stellify, il n'y a ni renouvellement automatique ni résiliation à effectuer — vous gardez le contrôle total à tout moment. Vous choisissez un plan mensuel ou annuel et bénéficiez immédiatement d'un accès complet pour la durée exacte choisie. À l'expiration de l'abonnement, votre compte revient automatiquement au plan gratuit, sans aucune démarche de votre part. Si vous souhaitez continuer à profiter de Stellify, il vous suffit de souscrire un nouvel abonnement — votre accès sera prolongé d'un mois ou d'un an supplémentaire de manière transparente. Pour vous assurer de ne rien manquer, nous vous envoyons automatiquement un e-mail de rappel avant l'expiration : pour un abonnement mensuel, cet e-mail vous parviendra trois jours avant la date d'expiration ; pour un abonnement annuel, deux semaines avant. Un changement de plan, par exemple de Pro à Ultimate, est possible à tout moment après l'expiration de votre abonnement en cours. Votre date d'expiration exacte est toujours visible dans les paramètres de votre compte.",
      faq_3_q: "Combien d'utilisations sont incluses dans mon plan ?",
      faq_3_a: "Le plan Gratuit comprend une seule fois trois utilisations d'outils ainsi que trois messages dans le chat Stella — idéal pour découvrir la plateforme sans engagement. Ces utilisations ne sont pas réinitialisées. Le plan Pro offre cinquante utilisations d'outils par mois et jusqu'à vingt actions par jour. Le plan Ultimate propose une utilisation illimitée de toutes les fonctionnalités, sans aucune restriction.",
      faq_4_q: "Stellify fonctionne-t-il pour tous les secteurs ?",
      faq_4_a: "Oui, notre IA a été formée sur l'ensemble du marché du travail suisse.",
      faq_5_q: "Quelles langues sont prises en charge ?",
      faq_5_a: "Nous prenons en charge l'allemand, l'anglais, le français et l'italien.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Paramètres",
      nav_logout: "Déconnexion",
      nav_login: "Connexion",
      tool_limit_pro: "Vous avez utilisé toutes vos générations pour ce mois. Vous en aurez de nouvelles le 1er du mois prochain. Passez à Ultimate pour un accès illimité immédiat ! 🚀",
      tool_limit_free: "Cet outil expert nécessite un abonnement Pro ou Unlimited. ✨",
      onboarding_welcome_title: "Bienvenue sur Stellify",
      onboarding_welcome_desc: "Votre copilote IA pour votre carrière en Suisse. Nous vous aidons à tirer le meilleur parti de votre potentiel.",
      onboarding_cv_title: "Téléchargez votre CV",
      onboarding_cv_desc: "Téléchargez votre CV pour que Stella puisse mieux vous comprendre, vous et vos expériences. Vous recevrez ainsi des conseils personnalisés.",
      onboarding_chat_title: "Demandez à Stella",
      onboarding_chat_desc: "Utilisez le chat Stella pour des conseils de carrière, la préparation aux entretiens ou pour en savoir plus sur le marché du travail suisse.",
      onboarding_tools_title: "Outils d'experts",
      onboarding_tools_desc: "Utilisez nos outils spécialisés pour les vérifications de salaire, l'optimisation ATS et l'analyse du marché.",
      onboarding_next: "Suivant",
      onboarding_finish: "Commencer",
      settings_rewatch_tutorial: "Revoir le tutoriel",
      nav_register: "Démarrer gratuitement",
      nav_greeting: "Bonjour",
      linkedin_connect: "Connecter LinkedIn",
      linkedin_connected: "LinkedIn connecté",
      linkedin_share: "Partager sur LinkedIn",
      linkedin_import_success: "Profil importé avec succès !",
      linkedin_import_error: "Erreur lors de l'importation.",
      dashboard_welcome: "Bon retour,",
      dashboard_stat_plan: "Votre Plan",
      dashboard_usage_limit: "{used} sur {total} utilisations",
      dashboard_usage_unlimited: "Utilisation illimitée",
      dashboard_usage_desc: "Utilisation des outils",
      dashboard_chat_usage: "Stella Chat",
      dashboard_daily_usage: "Limite quotidienne",
      dashboard_reset_monthly: "Réinitialisation le 1er",
      dashboard_reset_daily: "Réinitialisation demain",
      dashboard_stat_free_chat: "{used} / 3 questions Chat",
      dashboard_stat_free_tools: "{used} / 1 utilisation Outil",
      tool_daily_limit_pro: "Vous avez atteint votre limite quotidienne. Vous en aurez de nouvelles demain ! 🚀",
      tool_limit_search_pro: "Votre limite de recherches en direct (10/mois) est atteinte. Vous en aurez de nouvelles le mois prochain. Passez à Ultimate pour une recherche illimitée ! 🚀",
      tool_limit_search_fair_use: "Vous avez atteint la limite d'utilisation équitable pour les recherches en direct. Veuillez réessayer demain ou contacter le support.",
      dashboard_pro: "Professionnel de carrière",
      dashboard_desc: "Votre copilote Stella est prête. Analysez de nouveaux postes, optimisez votre profil ou préparez-vous pour votre prochain entretien.",
      dashboard_stat_analyses: "Analyses",
      dashboard_stat_cv_status: "Statut CV",
      dashboard_stat_ready: "Prêt",
      dashboard_stat_missing: "Manquant",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Unlimited",
      dashboard_stat_free: "Gratuit",
      dashboard_cv_optimize: "Optimisation Premium",
      tracker_title: "Suivi des candidatures",
      tracker_desc: "Gérez vos opportunités",
      tracker_add: "Ajouter",
      tracker_company: "Entreprise",
      tracker_company_ph: "ex. Google",
      tracker_position: "Poste",
      tracker_position_ph: "ex. Designer Senior",
      tracker_status: "Statut",
      tracker_location: "Lieu",
      tracker_location_ph: "ex. Genève",
      tracker_salary: "Prétentions salariales",
      tracker_salary_ph: "ex. 120'000 CHF",
      tracker_notes: "Notes",
      tracker_notes_ph: "ex. Contact: Jean Dupont...",
      tracker_save: "Enregistrer",
      tracker_update: "Mettre à jour",
      tracker_cancel: "Annuler",
      tracker_wishlist: "Souhaité",
      tracker_applied: "Postulé",
      tracker_interview: "Entretien",
      tracker_offer: "Offre",
      tracker_rejected: "Refusé",
      tracker_notes_badge: "Notes disponibles",
      tracker_empty: "Vide",
      quick_tools: "Outils rapides",
      all_tools: "Tous les outils",
      recent_docs: "Vos derniers documents",
      view_all: "Voir tout",
      time_just_now: "À l'instant",
      stella_context_title: "Contexte Stella",
      stella_context_cv_ready: "CV analysé",
      stella_context_no_cv: "Aucun CV chargé",
      stella_context_focus: "Domaines ciblés",
      stella_roadmap: "Votre feuille de route",
      stella_roadmap_empty: "Chargez votre CV pour voir votre feuille de route.",
      stella_insights: "Insights Stella",
      stella_market_score: "Score marché",
      stella_top_keywords: "Mots-clés principaux",
      stella_best_match: "Meilleur match",
      stella_ch_corrections: "Corrections linguistiques (FR suisse)",
      stella_ch_tips: "Conseils spécifiques Suisse",
      stella_short_profile: "Profil court optimisé",
      stella_highlights: "Points forts optimisés",
      stella_name: "Stella – Assistante IA",
      stella_online: "En ligne – prête à aider",
      stella_input_ph: "Écrivez à Stella...",
      tool_open: "Ouvrir",
      docs_empty: "Aucun document généré pour l'instant. Commencez avec un outil ci-dessous.",
      stella_raw_json: "Afficher données brutes (JSON)",
      stella_full_analysis: "Analyse complète",
      stella_insights_with_cv: "Stella a analysé votre profil. Votre focus sur la précision correspond parfaitement au marché suisse. Utilisez l'outil d'analyse CV pour un bilan approfondi.",
      stella_insights_no_cv: "Dès que vous chargez votre CV, je crée ici une analyse personnalisée de vos chances sur le marché.",
      salary_history: "Historique salarial",
      hero_precision: "IA Suisse de précision",
      upload_analyzing: "Analyse de la structure du document...",
      upload_done: "CV analysé avec succès. Stella est prête.",
      hero_success_rate: "Taux de succès",
      hero_more_interviews: "Plus d'entretiens",
      tool_see_plans: "Voir les forfaits",
      tool_maybe_later: "Peut-être plus tard",
      tool_inputs: "Paramètres",
      tool_load_file: "Charger fichier",
      salary_security_notice: "Vos données sont en sécurité : Stellify ne stocke aucune donnée salariale personnelle. Le calcul est effectué de manière anonyme selon les normes suisses de protection des données.",
      swiss_standard_notice_title: "Excellence de Carrière Suisse",
      swiss_standard_notice_text: "Précisément aligné sur le marché du travail suisse – de la langue à la structure de candidature.",
      footer_rights: "Tous droits réservés.",
      footer_privacy: "Confidentialité",
      footer_terms: "CGV",
      footer_imprint: "Mentions légales",
      cookie_title: "Confidentialité & Cookies",
      cookie_desc: "Nous utilisons des cookies nécessaires au fonctionnement de la plateforme et des cookies d'analyse optionnels pour améliorer nos services. Vos données sont traitées conformément à la LPD suisse et au RGPD.",
      cookie_accept: "Tout accepter",
      cookie_essential: "Essentiels uniquement",
      cookie_privacy_link: "Politique de confidentialité",
      close: "Fermer",
      back: "Retour",
      or_divider: "Ou",
      stat_members: "Membres",
      hero_intro: "Votre",
      badge_new: "NOUVEAU",
      tools_section_badge: "21 Outils IA",
      tools_section_title: "Tout ce dont vous avez besoin pour votre carrière",
      tools_section_desc: "De l'analyse CV à la négociation salariale – Stellify vous guide à chaque étape.",
      tools_section_cta: "Voir les 21 outils →",
      testimonial_verified: "Vérifié",
      cv_banner_title: "Téléchargez votre CV pour des analyses IA personnalisées",
      cv_banner_desc: "PDF ou Word · Gratuit · Les 21 outils adaptés à votre CV",
      cv_banner_btn: "Télécharger le CV",
      cv_stat_upload: "Télécharger",
      testimonials: [
        { name: 'Lukas B.', role: 'Polyméchanicien CFC', city: 'Winterthur', quote: "Après mon apprentissage, je ne savais pas exactement comment mettre en valeur mon expérience pratique dans mon CV. Stellify m'a aidé à décrire mes projets avec précision. J'ai maintenant un excellent emploi dans une grande entreprise industrielle." },
        { name: 'Sarah W.', role: 'Spécialiste RH', city: 'Zurich', quote: "Je vois des centaines de candidatures chaque jour. Le décodeur de certificats de Stellify est terriblement précis. Il m'aide non seulement dans ma vie privée, mais me donne aussi une nouvelle perspective sur le marché du travail suisse." },
        { name: 'Hans-Peter K.', role: 'Chef de logistique', city: 'Olten', quote: "Recommencer à plus de 50 ans était un défi. Stellify a traduit mes nombreuses années d'expérience en un langage moderne et optimisé. Cela m'a ouvert des portes que je croyais déjà fermées." }
      ],
      interview_live_promo: "Entraînez-vous – par texte ou micro",
      remaining: "restants",
      search_close_label: "Fermer",
      search_open_selection: "Ouvrir la sélection",
      search_stella_advice: "Conseil Stella",
      premium_analysis_desc: "Examen approfondi selon les normes suisses",
      salary_median_label: "Salaire médian estimé (Brut/An)",
      salary_important_notice: "Remarque importante",
      salary_disclaimer: "Cette estimation est basée sur les tendances actuelles du marché et les modèles IA pour le marché du travail suisse. Des facteurs tels que des certifications spécifiques, des accords de bonus et des avantages individuels peuvent influencer l'offre réelle.",
      generated_app_title: "Votre candidature générée",
      copy: "Copier",
      tool_how_to_use: "Comment utiliser cet outil",
      tool_scroll_example: "Faites défiler pour l'exemple professionnel",
      tool_pro_example: "Exemple professionnel",
      tool_unlimited_access: "Accès Unlimited",
      tool_unlock_desc: "Débloquez cet outil et toutes les fonctionnalités premium avec le plan Unlimited.",
      tool_discover_unlimited: "Découvrir Unlimited maintenant",
      tool_fill_fields: "Remplissez les champs à gauche",
      auth_terms_by_signing: "En vous connectant, vous acceptez nos",
      auth_terms_and: "et",
      auth_terms_data_processing: "Vos données sont traitées en toute sécurité en Suisse/UE.",
      auth_register_new: "→ S'inscrire maintenant",
      auth_switch_to_login: "→ Passer à la connexion",
      auth_reset_session: "Réinitialiser la session",
      password_weak: "Faible",
      password_medium: "Moyen",
      password_strong: "Fort",
      interview_complete: "🎉 Entretien terminé !",
      interview_question_of: "Question {current} sur 5",
      interview_show_tip: "Voir le conseil",
      interview_feedback_prev: "✓ Feedback dernière réponse",
      interview_your_answer: "Votre réponse",
      interview_answer_placeholder: "Écrivez votre réponse ici...",
      interview_mic_unavailable: "Microphone non disponible dans ce navigateur.",
      interview_mic_answer: "Répondre par microphone",
      interview_recording: "Enregistrement...",
      interview_feedback_unavailable: "Feedback indisponible.",
      interview_evaluating: "Stella évalue...",
      interview_submit: "Envoyer → Question {n}/5",
      interview_show_model: "Voir la réponse modèle",
      interview_common_mistake: "⚠ Erreur courante : ",
      interview_complete_title: "Entretien terminé",
      interview_complete_desc: "5 questions répondues. Voici votre résumé :",
      interview_new: "Nouvel entretien",
      interview_copy_summary: "Copier le résumé",
      settings_your_usage: "Votre utilisation",
      settings_apps_tools: "Candidatures & Outils",
      settings_generations: "Générations",
      settings_actions_today: "Actions aujourd'hui",
      settings_free_use: "Utilisation gratuite",
      settings_requests: "Demandes",
      settings_delete_account: "Supprimer le compte",
      app_initializing: "Initialisation...",
      market_1_t: "Les changements d'emploi augmentent",
      market_1_d: "En moyenne, les salariés suisses changent d'emploi tous les 3 ans.",
      market_2_t: "Les candidatures prennent du temps",
      market_2_d: "Une bonne candidature prend 3 à 5 heures. Avec l'IA : 3 minutes.",
      market_3_t: "L'IA est acceptée",
      market_3_d: "78 % des salariés suisses utiliseraient l'IA pour les aider dans leur carrière.",
      market_4_t: "Pas de bon outil CH",
      market_4_d: "Aucune solution ne comprend le système de certificats suisse et les exigences ATS.",
      security_badge: "Confidentialité et sécurité",
      security_title: "Vos données sont en sécurité en Suisse.",
      security_desc: "Nous prenons la protection des données au sérieux. Vos documents sont traités selon les normes suisses et stockés de manière cryptée.",
      security_item_1_t: "Serveurs suisses",
      security_item_1_d: "Toutes les données sont traitées exclusivement dans des centres de données hautement sécurisés en Suisse.",
      security_item_2_t: "Cryptage de bout en bout",
      security_item_2_d: "Vos CV et données personnelles sont cryptés à tout moment et inaccessibles aux tiers.",
      security_item_3_t: "Conforme LPD et RGPD",
      security_item_3_d: "Nous respectons strictement la loi suisse sur la protection des données et le RGPD européen.",
      comparison_badge: "Pourquoi Stellify ?",
      comparison_title: "Le premier véritable copilote de carrière IA pour la Suisse.",
      comparison_subtitle: "D'autres outils font une chose. Stellify fait tout – et comprend le marché suisse.",
      comparison_bad_title: "IA standard / Autres outils",
      comparison_bad_items: [
        "Fenêtre de chat vide, vous ne savez pas quoi saisir",
        "Pas de format/standard suisse",
        "Pas de check ATS – vous ne savez pas si votre CV est lu",
        "Pas de décodeur de certificats – le code suisse reste un mystère",
        "Pas de job-matching – vous postulez au hasard",
        "5 applications différentes, pas de fil conducteur"
      ],
      comparison_good_title: "Copilote IA Stellify",
      comparison_good_items: [
        "Processus guidés, Stella sait ce dont vous avez besoin",
        "100% standards suisses (code des certificats de travail)",
        "Véritable simulateur ATS pour les recruteurs suisses",
        "Décodeur de certificats précis (langage secret)",
        "Job-matching IA avec score de correspondance",
        "Tout sur une seule plateforme, parfaitement coordonné"
      ],
      why_stellify_points: [
        { title: "Précision suisse", desc: "Nous maîtrisons les nuances du marché suisse – de l'orthographe correcte aux spécificités cantonales.", icon: "Target" },
        { title: "Code des certificats décodé", desc: "Comprenez enfin ce qui est réellement écrit dans vos certificats de travail. Stella détecte immédiatement les messages cachés.", icon: "ShieldCheck" },
        { title: "Multilinguisme", desc: "Postulez sans transition en allemand, anglais, français ou italien – parfait pour le marché suisse multilingue.", icon: "Globe" },
        { title: "Optimisation ATS", desc: "Notre IA est formée aux systèmes des grands employeurs suisses, garantissant que votre CV soit lu.", icon: "Cpu" },
        { title: "Transparence salariale", desc: "Obtenez des prévisions salariales précises basées sur les données du marché suisse pour votre région et secteur spécifiques.", icon: "Coins" },
        { title: "Protection des données 'Made in CH'", desc: "Vos données sensibles ne quittent pas la Suisse. Nous garantissons une sécurité maximale selon les normes suisses.", icon: "Lock" }
      ],
      pricing_free_f: ["3× candidatures ou utilisations d'outil", "3× demandes Stella Chat", "Calculateur de salaire IA (Base)", "Normes suisses"],
      pricing_pro_f: ["50× candidatures / utilisations par mois", "20× actions par jour", "Décodeur de certificats (Pro)", "Coach d'entretien"],
      pricing_ultimate_f: ["Candidatures illimitées ♾️", "Toutes les fonctions Pro", "Coach IA personnel", "Support VIP 24/7"],
      pricing_cta_free: "Démarrer gratuitement",
      pricing_cta_pro: "Devenir Pro",
      pricing_cta_ultimate: "Choisir Ultimate",
      pricing_recommended: "Recommandé",
      value_title: "CHF 19.90 – cela en vaut-il la peine ?",
      value_items: [
        "Un conseiller en carrière coûte CHF 200–400 / séance",
        "Certificat non compris = mauvais emploi",
        "Un mauvais score ATS = le CV n'est jamais lu",
        "Une mauvaise candidature = poste manqué",
        "Un meilleur poste rembourse l'abonnement immédiatement",
        "Stellify vous fait gagner 3–5 h par candidature"
      ],
      tools_data: {
        'cv-optimizer': { title: 'Optimiseur de CV', desc: 'Analyse votre CV selon les standards suisses et optimise la formulation.', input_label: 'Quelle section optimiser ?', input_placeholder: 'ex: Expérience professionnelle...' },
        'salary-calc': { title: 'Calculateur de salaire IA CH', desc: 'Secteur, expérience, canton – l\'IA analyse les salaires du marché.', input_job: 'Titre du poste', input_job_placeholder: 'ex: Ingénieur Logiciel', input_industry: 'Secteur', input_industry_placeholder: 'ex: Banque', input_exp: 'Années d\'expérience', input_exp_placeholder: 'ex: 5', input_canton: 'Canton', input_canton_placeholder: 'ex: GE' },
        'cv-gen': { title: 'Candidatures', desc: 'Lettre de motivation & CV en 60 secondes, générés en direct.', input_label: 'Annonce d\'emploi (optionnel)', input_placeholder: 'Copiez l\'annonce ici...' },
        'ats-sim': { title: 'Simulation ATS', desc: 'Vérifie si votre CV passe les logiciels de recrutement.', input_label: 'Annonce d\'emploi (optionnel)', input_placeholder: 'Copiez l\'annonce...' },
        'zeugnis': { title: 'Décodeur de certificat Premium', desc: 'Décode le code secret des certificats de travail suisses. Identifie les messages négatifs cachés et évalue votre position sur le marché.', input_label: 'Texte du certificat', input_placeholder: 'Copiez le texte ici...' },
        'skill-gap': { title: 'Analyse Skill-Gap', desc: 'Comparez votre profil avec le job de vos rêves.', input_label: 'Poste cible', input_placeholder: 'ex: Senior Data Scientist' },
        'cv-analysis': { title: 'Analyse CV', desc: 'Analyse approfondie de votre CV pour les mots-clés, l\'adéquation au secteur et le potentiel d\'amélioration.' },
        'tracker': { title: 'Stratégie de candidature', desc: 'Créez un plan de bataille sur mesure pour votre prochaine candidature.', input_label: 'Titre du poste / Entreprise', input_placeholder: 'ex. Chef de projet senior chez Roche' },
        'matching': { title: 'Job Matching', desc: 'L\'IA trouve vos 5 profils de postes correspondants.' },
        'interview': { title: 'Coach d\'entretien', desc: 'L\'IA simule 5 questions réelles et évalue vos réponses.', input_label: 'Poste pour l\'entretien', input_placeholder: 'ex: Responsable Marketing' },
        'lehrstellen': { title: 'Recherche d\'apprentissage', desc: 'Trouvez l\'apprentissage parfait dans votre région.', input_interest: 'Qu\'est-ce qui vous intéresse ?', input_interest_placeholder: 'ex: Informatique, Commerce...', input_location: 'Région', input_location_placeholder: 'ex: Genève, Lausanne...' },
        'berufseinstieg': { title: 'Guide premier emploi', desc: 'Fraîchement diplômé ? Nous vous aidons à trouver votre premier "vrai" job.', input_label: 'Quel diplôme avez-vous ?', input_placeholder: 'ex: CFC Informatique...' },
        'erfahrung-plus': { title: 'Expérience-Plus', desc: 'Outil spécial pour les 50+. Valorisez votre expérience.', input_label: 'Votre plus grande force', input_placeholder: 'ex: 20 ans d\'expérience de direction dans la construction' },
        'wiedereinstieg': { title: 'Check retour à l\'emploi', desc: 'Longue pause ? Nous comblons la lacune de manière convaincante.', input_label: 'Raison de la pause', input_placeholder: 'ex: Congé parental...' },
        'karriere-checkup': { title: 'Check-up carrière', desc: 'Vous avez un job mais voulez plus ? Testez votre potentiel.', input_label: 'Poste actuel', input_placeholder: 'ex: Chef de projet' },
        'linkedin-job': { title: 'LinkedIn → Candidature', desc: 'Profil + Annonce → Lettre de motivation & arguments.', input_profile: 'Texte du profil LinkedIn', input_profile_placeholder: 'Copiez votre profil LinkedIn (À propos & Expérience)...', input_ad: 'Annonce d\'emploi', input_ad_placeholder: 'Copiez l\'annonce ici...' },
        'linkedin-posts': { title: 'Posts LinkedIn', desc: '3 posts sur mesure dans le style suisse – pas de clichés corporate.', input_label: 'Sujet ou focus', input_placeholder: 'ex: Nouveau job...' },
        'cv-premium': { title: 'Réécriture CV Premium', desc: 'Optimisation complète de votre CV selon les standards premium suisses (précision suisse, pas de ß).', input_label: 'Votre texte de CV actuel', input_placeholder: 'Copiez ici tout le contenu de votre CV...' },
        'career-roadmap': { title: 'Feuille de route de carrière', desc: 'Crée un plan de bataille personnel pour votre carrière en Suisse, y compris la formation et les emplois.', input_label: 'Votre objectif de carrière (optionnel)', input_placeholder: 'ex: CTO dans une Fintech' },
        'job-search': { 
          title: 'Recherche d\'emploi CH', 
          desc: 'Recherchez des offres d\'emploi actuelles en Suisse par mots-clés, lieu et secteur.', 
          input_keyword: 'Mot-clé', 
          input_keyword_placeholder: 'ex: Ingénieur Logiciel, Marketing...',
          input_location: 'Lieu',
          input_location_placeholder: 'ex: Zurich, Berne, Genève...',
          input_industry: 'Secteur',
          input_industry_placeholder: 'ex: IT, Pharma, Banque...',
          tutorial: 'Exemple : Recherche de "Chef de projet" à "Bâle" dans le secteur "Pharma". Nous vous montrons les postes correspondants dans notre base de données.'
        },
        'interview-live': {
          title: 'Coach Entretien Live',
          desc: 'Entraînez-vous pour un entretien spécifique. Stella pose des questions ciblées – répondez par texte ou microphone.',
          badge: 'NOUVEAU · LIVE',
          input_job: 'Intitulé du poste',
          input_job_placeholder: 'ex: Senior UX Designer chez Digitec',
          input_company: 'Entreprise (optionnel)',
          input_company_placeholder: 'ex: Nestlé SA, Genève',
          input_desc: 'Description du poste (optionnel)',
          input_desc_placeholder: 'Collez la description pour des questions encore plus ciblées...',
          tutorial: 'Exemple : Entretien pour "Product Manager" chez ABB. Stella pose 5 vraies questions avec feedback sur le ton, la méthode STAR et la connaissance du marché suisse.'
        },
        'salary-negotiation': {
          title: 'Coach Négociation Salariale',
          desc: 'Guide sur mesure pour votre négociation salariale – positionnement marché, arguments et stratégie du 13e salaire suisse.',
          badge: 'Pro',
          input_label: 'Salaire actuel / cible',
          input_placeholder: 'ex: Je souhaite passer de 95k à 115k CHF...',
          tutorial: 'Exemple : Négociation chez Zurich Insurance. Nous fournissons 5 arguments concrets, la demande initiale idéale et les réponses aux objections typiques.'
        }
      }
    },
    IT: {
      welcome: "Bentornato,",
      stella_greeting: "Ciao, {name}! Sono Stella, la tua assistente di carriera AI. Come posso aiutarti oggi?",
      drag_cv_here: "Trascina il CV qui o clicca",
      drop_file_here: "Rilascia il file qui",
      pdf_only: "PDF & Word accettati",
      search_placeholder: "Cerca lavori o consigli...",
      search_popular: "Ricerche popolari",
      search_quick: "Accesso rapido",
      search_label: "Cosa stai cercando oggi?",
      apply_now: "Candidati ora",
      job_location: "Località",
      job_category: "Settore",
      job_description: "Descrizione del lavoro",
      job_requirements: "Requisiti",
      job_keywords: "Parole chiave ATS",
      search_results: "{count} risultati trovati",
      search_no_results: "Nessun risultato trovato",
      search_no_results_desc: "Prova altri termini di ricerca o categorie.",
      search_close: "ESC per chiudere",
      search_stella: "ENTER per la consulenza Stella",
      job_board_title: "Bacheca del lavoro",
      job_board_desc: "Scopri le attuali offerte di lavoro che corrispondono perfettamente al tuo profilo.",
      filter_all: "Tutti i settori",
      filter_location: "Località",
      filter_industry: "Settore",
      filter_keyword: "Parola chiave",
      search_nav_profile: "Navigazione verso il tuo profilo...",
      search_type_profile: "Il tuo Profilo",
      search_type_tool: "Strumenti",
      search_type_job: "Posizioni aperte",
      search_type_tip: "Consigli di carriera",
      search_type_faq: "Domande frequenti",
      stella_placeholder: "Chiedi qualcosa a Stella...",
      stella_secure_data: "Elaborazione sicura dei dati svizzeri",
      hero_title: "Dal CV al colloquio – il tuo coach carriera con IA",
      hero_desc: "Stellify analizza il tuo CV, ottimizza le tue candidature e ti prepara ai colloqui – con precisione, discrezione e focus sul mercato svizzero.",
      cta_free: "Prova gratuitamente",
      upload_cv: "Carica CV (Lebenslauf)",
      update_cv: "Aggiorna CV (Lebenslauf)",
      cv_info: "Un CV (Curriculum Vitae) è la tua storia professionale. È il documento più importante della tua candidatura.",
      dashboard: "Dashboard",
      tools: "Strumenti",
      pricing: "Prezzi",
      login: "Accedi",
      register: "Registrati",
      logout: "Disconnetti",
      success_stories: "Storie di successo",
      promo_spot: "Spot pubblicitario",
      features: "Caratteristiche",
      how_it_works: "Come funziona",
      success_title: "Persone reali. Successi reali.",
      success_desc: "Migliaia di svizzeri hanno già trovato il lavoro dei loro sogni con Stellify. Ecco alcune delle loro storie.",
      promo_title: "Scopri il futuro della tua carriera.",
      promo_play: "Riproduci spot",
      examples_title: "Precisione AI in azione",
      examples_desc: "Guarda come Stellify trasforma testi standard in candidature svizzere premium.",
      ai_notice: "✨ Generato da Stella AI • Si prega di verificare l'accuratezza",
      settings: "Impostazioni",
      profile: "Profilo",
      subscription: "Abbonamento",
      data_privacy: "Privacy",
      tools_title: "Crea il tuo profilo una volta. Usa tutti gli strumenti.",
      tools_badge: "20+ Strumenti – Un abbonamento",
      tools_view_all: "Vedi tutti gli strumenti",
      market_title: "Perché ora. Perché la Svizzera.",
      market_badge: "Potenziale di mercato",
      pricing_title: "Prezzi semplici. Massima potenza.",
      pricing_monthly: "Mensile",
      pricing_yearly: "Annuale",
      pricing_save: "2 mesi gratis",
      pricing_gratis_desc: "Inizia gratuitamente – senza carta di credito.",
      pricing_pro_desc: "Lo standard per i candidati ambiziosi.",
      pricing_ultimate_desc: "Massima potenza per la tua carriera.",
      faq_title: "Domande frequenti",
      footer_desc: "Stellify è la piattaforma AI leader per l'ottimizzazione della carriera in Svizzera. Precisa, discreta e di successo.",
      footer_legal: "Note legali",
      footer_contact: "Contatto",
      auth_login: "Accedi",
      auth_register: "Registrati",
      auth_welcome: "Bentornato",
      auth_create: "Crea un account",
      auth_precision: "Precisione per la tua carriera.",
      auth_first_name: "Nome",
      auth_email: "E-mail",
      auth_password: "Password",
      auth_forgot_password: "Password dimenticata?",
      auth_reset_password_title: "Reimposta password",
      auth_reset_password_desc: "Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la tua password.",
      auth_reset_password_btn: "Invia link di ripristino",
      auth_back_to_login: "Torna al login",
      auth_placeholder_name: "Mario",
      auth_placeholder_email: "tua@email.ch",
      tool_no_cv: "⚠️ Nessun CV caricato. L'IA utilizza informazioni generali. Carica il tuo CV per risultati migliori.",
      tool_process: "Elaborazione...",
      tool_generate: "Genera",
      tool_analyzing: "Stella sta analizzando...",
      tool_result: "Risultato",
      tool_download: "Scarica",
      tool_copy: "Copia",
      tool_copied: "Copiato!",
      tool_empty_state: "Compila i campi e clicca su \"Genera\" per avviare l'analisi AI.",
      payment_title: "Paga come vuoi",
      payment_secure: "Elaborazione sicura tramite Stripe.",
      how_badge: "Il processo",
      how_desc: "Dal CV alla firma del contratto – Stellify ti accompagna in ogni fase della tua candidatura.",
      how_1_t: "Carica & analizza il CV",
      how_1_d: "Carica il tuo CV in PDF. Stella lo legge completamente, individua i tuoi punti di forza e lo ottimizza secondo gli standard ATS svizzeri.",
      how_2_t: "Perfeziona la candidatura",
      how_2_d: "Genera lettere di motivazione su misura, ottimizza ogni sezione del CV e simula il controllo ATS – in tedesco svizzero standard.",
      how_3_t: "Supera il colloquio",
      how_3_d: "Allenati con il coach per colloqui IA: domande reali, griglia di valutazione personalizzata e suggerimenti concreti per ogni situazione.",
      faq_badge: "Domande frequenti",
      faq_subtitle: "Tutto quello che devi sapere",
      faq_contact: "Altre domande?",
      cta_final_title: "La tua carriera merita il tuo copilota personale.",
      cta_final_desc: "Inizia gratuitamente. 20+ strumenti. Standard svizzero. Nessun rischio di abbonamento.",
      cta_final_btn: "Inizia ora gratuitamente",
      settings_first_name: "Nome",
      settings_email: "E-mail",
      settings_status: "Stato: Attivo",
      settings_change_plan: "Cambia piano",
      settings_privacy_desc: "I tuoi dati sono archiviati in modo sicuro in Svizzera. Puoi richiedere una copia dei tuoi dati o eliminare il tuo account in qualsiasi momento.",
      edit: "Modifica",
      save: "Salva",
      cancel: "Annulla",
      promo_presents: "Stellify presenta",
      promo_precision: "Precisione",
      promo_redefined: "ridefinita.",
      promo_desc: "In un mercato dove ogni dettaglio conta, Stellify è il tuo vantaggio sleale. Il primo copilota di carriera AI costruito per lo standard svizzero.",
      promo_journey: "Inizia il tuo viaggio",
      faq_1_q: "Quanto sono sicuri i miei dati?",
      faq_1_a: "I tuoi dati sono elaborati esclusivamente su server svizzeri e crittografati secondo i più moderni standard.",
      faq_2_q: "Come funziona l'abbonamento Stellify?",
      faq_2_a: "Su Stellify non esistono né rinnovi automatici né disdette da effettuare — hai sempre il pieno controllo. Scegli un piano mensile o annuale e ottieni immediatamente l'accesso completo per esattamente quel periodo. Alla scadenza dell'abbonamento, il tuo account torna automaticamente al piano gratuito, senza alcuna azione da parte tua. Se desideri continuare a usufruire di Stellify, ti basta sottoscrivere un nuovo abbonamento — il tuo accesso verrà esteso senza interruzioni di un ulteriore mese o anno. Per farti trovare sempre preparato, ti inviamo automaticamente un'e-mail di promemoria prima della scadenza: per un abbonamento mensile, questa e-mail ti arriva tre giorni prima della data di scadenza; per un abbonamento annuale, due settimane prima. Un cambio di piano, ad esempio da Pro a Ultimate, è possibile in qualsiasi momento dopo la scadenza del tuo abbonamento attuale. La data di scadenza esatta è sempre visibile nelle impostazioni del tuo account.",
      faq_3_q: "Quante utilizzazioni sono incluse nel mio piano?",
      faq_3_a: "Il piano Gratuito include una volta sola tre utilizzi degli strumenti e tre messaggi nella chat Stella — ideale per scoprire la piattaforma senza impegno. Questi utilizzi non vengono ripristinati. Il piano Pro mette a disposizione cinquanta utilizzi degli strumenti al mese e fino a venti azioni al giorno. Il piano Ultimate offre un utilizzo illimitato di tutte le funzionalità, senza alcuna restrizione.",
      faq_4_q: "Stellify funziona per tutti i settori?",
      faq_4_a: "Sì, la nostra IA è stata addestrata su tutto il mercato del lavoro svizzero.",
      faq_5_q: "Quali lingue sono supportate?",
      faq_5_a: "Supportiamo tedesco, inglese, francese e italiano.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Impostazioni",
      nav_logout: "Disconnetti",
      nav_login: "Accedi",
      tool_limit_pro: "Hai esaurito i tuoi utilizzi per questo mese. Ne avrai di nuovi il 1° del mese prossimo. Passa a Ultimate per un accesso illimitato immediato! 🚀",
      tool_limit_free: "Questo strumento esperto richiede un abbonamento Pro o Unlimited. ✨",
      onboarding_welcome_title: "Benvenuti su Stellify",
      onboarding_welcome_desc: "Il tuo copilota AI per la tua carriera in Svizzera. Ti aiutiamo a sfruttare al meglio il tuo potenziale.",
      onboarding_cv_title: "Carica il tuo CV",
      onboarding_cv_desc: "Carica il tuo curriculum in modo che Stella possa capire meglio te e le tue esperienze. Riceverai così consigli personalizzati.",
      onboarding_chat_title: "Chiedi a Stella",
      onboarding_chat_desc: "Usa la chat di Stella per consigli di carriera, preparazione ai colloqui o per saperne di più sul mercato del lavoro svizzero.",
      onboarding_tools_title: "Strumenti esperti",
      onboarding_tools_desc: "Usa i nostri strumenti specializzati per controlli salariali, ottimizzazione ATS e analisi di mercato.",
      onboarding_next: "Avanti",
      onboarding_finish: "Inizia",
      settings_rewatch_tutorial: "Rivedi il tutorial",
      nav_register: "Inizia gratuitamente",
      nav_greeting: "Buongiorno",
      linkedin_connect: "Collega LinkedIn",
      linkedin_connected: "LinkedIn collegato",
      linkedin_share: "Condividi su LinkedIn",
      linkedin_import_success: "Profilo importato con successo!",
      linkedin_import_error: "Errore durante l'importazione.",
      dashboard_welcome: "Bentornato,",
      dashboard_stat_plan: "Il tuo Piano",
      dashboard_usage_limit: "{used} di {total} utilizzi",
      dashboard_usage_unlimited: "Utilizzo illimitato",
      dashboard_usage_desc: "Utilizzo strumenti",
      dashboard_chat_usage: "Stella Chat",
      dashboard_daily_usage: "Limite giornaliero",
      dashboard_reset_monthly: "Reset il 1° del mese",
      dashboard_reset_daily: "Reset domani",
      dashboard_stat_free_chat: "{used} / 3 domande Chat",
      dashboard_stat_free_tools: "{used} / 1 utilizzo Strumento",
      tool_daily_limit_pro: "Hai raggiunto il tuo limite giornaliero. Ne avrai di nuove domani! 🚀",
      tool_limit_search_pro: "Il tuo limite di ricerche dal vivo (10/mese) è stato raggiunto. Ne avrai di nuove il mese prossimo. Passa a Ultimate per ricerche illimitate! 🚀",
      tool_limit_search_fair_use: "Hai raggiunto il limite di utilizzo corretto per le ricerche dal vivo. Riprova domani o contatta il supporto.",
      dashboard_pro: "Professionista della carriera",
      dashboard_desc: "Il tuo copilota Stella è pronto. Analizza nuove posizioni, ottimizza il tuo profilo o preparati per il tuo prossimo colloquio.",
      dashboard_stat_analyses: "Analisi",
      dashboard_stat_cv_status: "Stato CV",
      dashboard_stat_ready: "Pronto",
      dashboard_stat_missing: "Mancante",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Unlimited",
      dashboard_stat_free: "Gratis",
      dashboard_cv_optimize: "Ottimizzazione Premium",
      tracker_title: "Tracker candidature",
      tracker_desc: "Gestisci le tue opportunità",
      tracker_add: "Aggiungi",
      tracker_company: "Azienda",
      tracker_company_ph: "es. Google",
      tracker_position: "Posizione",
      tracker_position_ph: "es. Designer Senior",
      tracker_status: "Stato",
      tracker_location: "Luogo",
      tracker_location_ph: "es. Zurigo",
      tracker_salary: "Aspettative salariali",
      tracker_salary_ph: "es. 120'000 CHF",
      tracker_notes: "Note",
      tracker_notes_ph: "es. Contatto: Mario Rossi...",
      tracker_save: "Salva",
      tracker_update: "Aggiorna",
      tracker_cancel: "Annulla",
      tracker_wishlist: "Desiderato",
      tracker_applied: "Candidato",
      tracker_interview: "Colloquio",
      tracker_offer: "Offerta",
      tracker_rejected: "Rifiutato",
      tracker_notes_badge: "Note disponibili",
      tracker_empty: "Vuoto",
      quick_tools: "Strumenti rapidi",
      all_tools: "Tutti gli strumenti",
      recent_docs: "I tuoi ultimi documenti",
      view_all: "Vedi tutti",
      time_just_now: "Proprio ora",
      stella_context_title: "Contesto Stella",
      stella_context_cv_ready: "CV analizzato",
      stella_context_no_cv: "Nessun CV caricato",
      stella_context_focus: "Aree di focus",
      stella_roadmap: "La tua roadmap",
      stella_roadmap_empty: "Carica il tuo CV per vedere la tua roadmap.",
      stella_insights: "Insights Stella",
      stella_market_score: "Punteggio mercato",
      stella_top_keywords: "Parole chiave principali",
      stella_best_match: "Miglior match",
      stella_ch_corrections: "Correzioni linguistiche (IT svizzero)",
      stella_ch_tips: "Consigli specifici per la Svizzera",
      stella_short_profile: "Profilo breve ottimizzato",
      stella_highlights: "Punti salienti ottimizzati",
      stella_name: "Stella – Assistente IA",
      stella_online: "Online – pronta ad aiutare",
      stella_input_ph: "Scrivi a Stella...",
      tool_open: "Apri",
      docs_empty: "Nessun documento generato ancora. Inizia con uno strumento qui sotto.",
      stella_raw_json: "Mostra dati grezzi (JSON)",
      stella_full_analysis: "Analisi completa",
      stella_insights_with_cv: "Stella ha analizzato il tuo profilo. La tua attenzione alla precisione si adatta perfettamente al mercato svizzero. Usa lo strumento di analisi CV per una verifica approfondita.",
      stella_insights_no_cv: "Non appena carichi il tuo CV, creo qui un'analisi personalizzata delle tue opportunità di mercato.",
      salary_history: "Cronologia stipendi",
      hero_precision: "IA Svizzera di Precisione",
      upload_analyzing: "Analisi della struttura del documento...",
      upload_done: "CV analizzato con successo. Stella è pronta.",
      hero_success_rate: "Tasso di successo",
      hero_more_interviews: "Più colloqui",
      tool_see_plans: "Vedi i piani",
      tool_maybe_later: "Forse più tardi",
      tool_inputs: "Parametri",
      tool_load_file: "Carica file",
      salary_security_notice: "I tuoi dati sono al sicuro: Stellify non memorizza alcun dato salariale personale. Il calcolo viene eseguito in modo anonimo secondo gli standard svizzeri di protezione dei dati.",
      swiss_standard_notice_title: "Eccellenza della Carriera Svizzera",
      swiss_standard_notice_text: "Precisamente allineato con il mercato del lavoro svizzero – dalla lingua alla struttura della candidatura.",
      footer_rights: "Tutti i diritti riservati.",
      footer_privacy: "Privacy",
      footer_terms: "CGU",
      footer_imprint: "Note legali",
      cookie_title: "Privacy & Cookie",
      cookie_desc: "Utilizziamo cookie necessari per il funzionamento della piattaforma e cookie analitici opzionali per migliorare i servizi. I tuoi dati sono trattati in conformità alla LPD svizzera e al GDPR.",
      cookie_accept: "Accetta tutto",
      cookie_essential: "Solo essenziali",
      cookie_privacy_link: "Informativa sulla privacy",
      close: "Chiudi",
      back: "Indietro",
      or_divider: "Oppure",
      stat_members: "Membri",
      hero_intro: "Il tuo",
      badge_new: "NUOVO",
      tools_section_badge: "21 Strumenti AI",
      tools_section_title: "Tutto ciò di cui hai bisogno per la tua carriera",
      tools_section_desc: "Dall'analisi del CV alla negoziazione salariale – Stellify ti guida in ogni fase.",
      tools_section_cta: "Vedi tutti i 21 strumenti →",
      testimonial_verified: "Verificato",
      cv_banner_title: "Carica il tuo CV per analisi AI personalizzate",
      cv_banner_desc: "PDF o Word · Gratuito · Tutti i 21 strumenti adattati al tuo CV",
      cv_banner_btn: "Carica CV",
      cv_stat_upload: "Carica",
      testimonials: [
        { name: 'Lukas B.', role: 'Polimeccanico AFC', city: 'Winterthur', quote: "Dopo il mio tirocinio, non sapevo esattamente come valorizzare la mia esperienza pratica nel CV. Stellify mi ha aiutato a descrivere i miei progetti con precisione. Ora ho un ottimo lavoro in una grande azienda industriale." },
        { name: 'Sarah W.', role: 'Specialista HR', city: 'Zurigo', quote: "Vedo centinaia di candidature ogni giorno. Il decodificatore di certificati di Stellify è terribilmente preciso. Non solo mi aiuta nella vita privata, ma mi dà anche una nuova prospettiva sul mercato del lavoro svizzero." },
        { name: 'Hans-Peter K.', role: 'Responsabile logistica', city: 'Olten', quote: "Ricominciare a oltre 50 anni era una sfida. Stellify ha tradotto i miei tanti anni di esperienza in un linguaggio moderno e ottimizzato per l'ATS. Questo mi ha aperto porte che pensavo già chiuse." }
      ],
      interview_live_promo: "Pratica il tuo colloquio – testo o microfono",
      remaining: "rimanenti",
      search_close_label: "Chiudi",
      search_open_selection: "Apri selezione",
      search_stella_advice: "Consulenza Stella",
      premium_analysis_desc: "Esame approfondito secondo gli standard svizzeri",
      salary_median_label: "Stipendio mediano stimato (Lordo/Anno)",
      salary_important_notice: "Nota importante",
      salary_disclaimer: "Questa stima è basata sulle tendenze attuali del mercato e sui modelli IA per il mercato del lavoro svizzero. Fattori come certificazioni specifiche, accordi sui bonus e benefici individuali possono influenzare l'offerta reale.",
      generated_app_title: "La tua candidatura generata",
      copy: "Copia",
      tool_how_to_use: "Come usare questo strumento",
      tool_scroll_example: "Scorri verso il basso per l'esempio professionale",
      tool_pro_example: "Esempio professionale",
      tool_unlimited_access: "Accesso Unlimited",
      tool_unlock_desc: "Sblocca questo strumento e tutte le funzionalità premium con il piano Unlimited.",
      tool_discover_unlimited: "Scopri Unlimited ora",
      tool_fill_fields: "Compila i campi a sinistra",
      auth_terms_by_signing: "Accedendo, accetti i nostri",
      auth_terms_and: "e",
      auth_terms_data_processing: "I tuoi dati vengono elaborati in modo sicuro in Svizzera/UE.",
      auth_register_new: "→ Registrati ora",
      auth_switch_to_login: "→ Passa al login",
      auth_reset_session: "Reimposta sessione",
      password_weak: "Debole",
      password_medium: "Medio",
      password_strong: "Forte",
      interview_complete: "🎉 Colloquio completato!",
      interview_question_of: "Domanda {current} di 5",
      interview_show_tip: "Mostra il suggerimento",
      interview_feedback_prev: "✓ Feedback ultima risposta",
      interview_your_answer: "La tua risposta",
      interview_answer_placeholder: "Scrivi la tua risposta qui...",
      interview_mic_unavailable: "Microfono non disponibile in questo browser.",
      interview_mic_answer: "Rispondi tramite microfono",
      interview_recording: "Registrazione in corso...",
      interview_feedback_unavailable: "Feedback non disponibile.",
      interview_evaluating: "Stella sta valutando...",
      interview_submit: "Invia → Domanda {n}/5",
      interview_show_model: "Mostra risposta modello",
      interview_common_mistake: "⚠ Errore comune: ",
      interview_complete_title: "Colloquio completato",
      interview_complete_desc: "Tutte le 5 domande risposte. Ecco il tuo riepilogo:",
      interview_new: "Nuovo colloquio",
      interview_copy_summary: "Copia riepilogo",
      settings_your_usage: "Il tuo utilizzo",
      settings_apps_tools: "Candidature & Strumenti",
      settings_generations: "Generazioni",
      settings_actions_today: "Azioni oggi",
      settings_free_use: "Utilizzo gratuito",
      settings_requests: "Richieste",
      settings_delete_account: "Elimina account",
      app_initializing: "Inizializzazione...",
      market_1_t: "I cambi di lavoro aumentano",
      market_1_d: "In media, i dipendenti svizzeri cambiano lavoro ogni 3 anni.",
      market_2_t: "Le candidature richiedono tempo",
      market_2_d: "Una buona candidatura richiede 3-5 ore. Con l'IA: 3 minuti.",
      market_3_t: "L'IA è accettata",
      market_3_d: "Il 78% dei dipendenti svizzeri utilizzerebbe l'IA per aiutarli nella loro carriera.",
      market_4_t: "Nessun buon strumento CH",
      market_4_d: "Nessuna soluzione comprende il sistema di certificati svizzero e i requisiti ATS.",
      security_badge: "Privacy e Sicurezza",
      security_title: "I tuoi dati sono al sicuro in Svizzera.",
      security_desc: "Prendiamo sul serio la protezione dei dati. I tuoi documenti sono elaborati secondo gli standard svizzeri e archiviati in modo crittografato.",
      security_item_1_t: "Server Svizzeri",
      security_item_1_d: "Tutti i dati sono elaborati esclusivamente in data center ad alta sicurezza in Svizzera.",
      security_item_2_t: "Crittografia End-to-End",
      security_item_2_d: "I tuoi CV e i dati personali sono crittografati in ogni momento e inaccessibili a terzi.",
      security_item_3_t: "Conforme LPD e GDPR",
      security_item_3_d: "Rispettiamo rigorosamente la legge svizzera sulla protezione dei dati e il GDPR europeo.",
      comparison_badge: "Perché Stellify?",
      comparison_title: "Il primo vero copilota di carriera AI per la Svizzera.",
      comparison_subtitle: "Altri strumenti fanno una cosa. Stellify fa tutto – e comprende il mercato svizzero.",
      comparison_bad_title: "AI Standard / Altri Strumenti",
      comparison_bad_items: [
        "Finestra di chat vuota, non sai cosa inserire",
        "Nessun formato/standard svizzero",
        "Nessun controllo ATS – non sai se il tuo CV viene letto",
        "Nessun decodificatore di certificati – il codice svizzero rimane un mistero",
        "No job-matching – ti candidi a caso",
        "5 app diverse, nessun filo conduttore"
      ],
      comparison_good_title: "Copilota AI Stellify",
      comparison_good_items: [
        "Processi guidati, Stella sa di cosa hai bisogno",
        "100% standard svizzeri (codice certificato di lavoro)",
        "Vero simulatore ATS per recruiter svizzeri",
        "Decodificatore di certificati preciso (linguaggio segreto)",
        "Job-matching AI con fit-score",
        "Tutto in un'unica piattaforma, perfettamente coordinato"
      ],
      why_stellify_points: [
        { title: "Precisione svizzera", desc: "Padroneggiamo le sfumature del mercato svizzero – dall'ortografia corretta alle specificità cantonali.", icon: "Target" },
        { title: "Codice dei certificati decodificato", desc: "Capisci finalmente cosa c'è scritto veramente nei tuoi certificati di lavoro. Stella rileva immediatamente i messaggi nascosti.", icon: "ShieldCheck" },
        { title: "Multilinguismo", desc: "Candidati senza problemi in tedesco, inglese, francese e italiano – perfetto per il mercato svizzero multilingue.", icon: "Globe" },
        { title: "Ottimizzazione ATS", desc: "La nostra IA è addestrata sui sistemi dei grandi datori di lavoro svizzeri, garantendo che il tuo CV venga letto.", icon: "Cpu" },
        { title: "Trasparenza salariale", desc: "Ottieni previsioni salariali precise basate sui dati del mercato svizzero per la tua regione e il tuo settore specifici.", icon: "Coins" },
        { title: "Protezione dei dati 'Made in CH'", desc: "I tuoi dati sensibili non lasciano la Svizzera. Garantiamo la massima sicurezza secondo gli standard svizzeri.", icon: "Lock" }
      ],
      pricing_free_f: ["3× candidature o utilizzi strumenti", "3× messaggi Stella Chat", "Calcolatore di stipendio AI (Base)", "Standard svizzeri"],
      pricing_pro_f: ["50× candidature / mese", "Decodificatore di certificati (Pro)", "Coach per colloqui", "Supporto prioritario"],
      pricing_ultimate_f: ["Candidature illimitate", "Tutte le funzioni Pro", "Coach AI personale", "Supporto VIP 24/7"],
      pricing_cta_free: "Inizia gratuitamente",
      pricing_cta_pro: "Diventa Pro",
      pricing_cta_ultimate: "Scegli Ultimate",
      pricing_recommended: "Consigliato",
      value_title: "CHF 19.90 – ne vale la pena?",
      value_items: [
        "Un consulente di carriera costa CHF 200–400 / sessione",
        "Certificato non compreso = lavoro sbagliato",
        "Un cattivo punteggio ATS = il CV non viene mai letto",
        "Una cattiva candidatura = posto mancato",
        "Con un posto migliore l'abbonamento si ripaga subito",
        "Stellify ti fa risparmiare 3–5 ore per candidatura"
      ],
      tools_data: {
        'cv-optimizer': { title: 'Ottimizzatore CV', desc: 'Analizza il tuo CV secondo gli standard svizzeri e ottimizza la formulazione.', input_label: 'Quale sezione ottimizzare?', input_placeholder: 'es. Esperienza professionale...' },
        'salary-calc': { title: 'Calcolatore stipendio AI CH', desc: 'Settore, esperienza, cantone – l\'IA analizza i salari di mercato.', input_job: 'Titolo del lavoro', input_job_placeholder: 'es: Ingegnere del Software', input_industry: 'Settore', input_industry_placeholder: 'es: Banche', input_exp: 'Anni di esperienza', input_exp_placeholder: 'es: 5', input_canton: 'Cantone', input_canton_placeholder: 'es: TI' },
        'cv-gen': { title: 'Candidature', desc: 'Lettera di motivazione & CV in 60 secondi, generati dal vivo.', input_label: 'Annuncio di lavoro (opzionale)', input_placeholder: 'Copia l\'annuncio qui...' },
        'ats-sim': { title: 'Simulazione ATS', desc: 'Verifica se il tuo CV passa attraverso i software dei recruiter.', input_label: 'Annuncio di lavoro (opzionale)', input_placeholder: 'Copia l\'annuncio...' },
        'zeugnis': { title: 'Decodificatore certificati Premium', desc: 'Decodifica il codice segreto dei certificati di lavoro svizzeri. Identifica messaggi negativi nascosti e valuta la tua posizione sul mercato.', input_label: 'Testo del certificato', input_placeholder: 'Copia il testo qui...' },
        'skill-gap': { title: 'Analisi Skill-Gap', desc: 'Confronta il tuo profilo con il lavoro dei tuoi sogni.', input_label: 'Posizione target', input_placeholder: 'es. Senior Data Scientist' },
        'cv-analysis': { title: 'Analisi CV', desc: 'Analisi approfondita del tuo CV per parole chiave, adattamento al settore e potenziale di miglioramento.' },
        'tracker': { title: 'Strategia di candidatura', desc: 'Crea un piano di battaglia su misura per la tua prossima candidatura.', input_label: 'Titolo del lavoro / Azienda', input_placeholder: 'es. Senior Project Manager presso Roche' },
        'matching': { title: 'Job Matching', desc: 'L\'IA trova i tuoi 5 profili lavorativi corrispondenti.' },
        'interview': { title: 'Coach per colloqui', desc: 'L\'IA simula 5 domande reali e valuta le tue risposte.', input_label: 'Posizione per il colloquio', input_placeholder: 'es. Responsabile Marketing' },
        'lehrstellen': { title: 'Ricerca apprendistato', desc: 'Trova l\'apprendistato perfetto nella tua regione.', input_interest: 'Cosa ti interessa?', input_interest_placeholder: 'es: Informatica, Commercio...', input_location: 'Regione', input_location_placeholder: 'es: Lugano, Bellinzona...' },
        'berufseinstieg': { title: 'Guida primo lavoro', desc: 'Appena diplomato? Ti aiutiamo a trovare il tuo primo "vero" lavoro.', input_label: 'Cosa hai completato?', input_placeholder: 'es. AFC Informatica...' },
        'erfahrung-plus': { title: 'Esperienza-Plus', desc: 'Strumento speciale per gli over 50. Valorizza la tua esperienza.', input_label: 'Il tuo punto di forza', input_placeholder: 'es: 20 anni di esperienza dirigenziale nell\'edilizia' },
        'wiedereinstieg': { title: 'Check rientro al lavoro', desc: 'Lunga pausa? Colmiamo la lacuna in modo convincente.', input_label: 'Motivo della pausa', input_placeholder: 'es. Congedo parentale...' },
        'karriere-checkup': { title: 'Check-up carriera', desc: 'Hai un lavoro ma vuoi di più? Testiamo il tuo potenziale.', input_label: 'Lavoro attuale', input_placeholder: 'es. Responsabile di progetto' },
        'linkedin-job': { title: 'LinkedIn → Candidatura', desc: 'Profilo + Annuncio → Lettera di motivazione & argomenti.', input_profile: 'Testo del profilo LinkedIn', input_profile_placeholder: 'Copia il tuo profilo LinkedIn (Informazioni & Esperienza)...', input_ad: 'Annuncio di lavoro', input_ad_placeholder: 'Copia l\'annuncio qui...' },
        'linkedin-posts': { title: 'Post LinkedIn', desc: '3 post su misura in stile svizzero – niente cliché aziendali.', input_label: 'Argomento o focus', input_placeholder: 'es. Nuovo lavoro...' },
        'cv-premium': { title: 'Riscrittura CV Premium', desc: 'Ottimizzazione completa del tuo CV secondo gli standard premium svizzeri (precisione svizzera, niente ß).', input_label: 'Il tuo testo attuale del CV', input_placeholder: 'Copia qui tutto il contenuto del tuo CV...' },
        'career-roadmap': { title: 'Tabella di marcia della carriera', desc: 'Crea un piano di battaglia personale per la tua carriera in Svizzera, inclusi formazione e lavoro.', input_label: 'Il tuo obiettivo di carriera (opzionale)', input_placeholder: 'es. CTO in una Fintech' },
        'job-search': { 
          title: 'Ricerca Lavoro CH', 
          desc: 'Cerca offerte di lavoro attuali in Svizzera per parole chiave, località e settore.', 
          input_keyword: 'Parola chiave', 
          input_keyword_placeholder: 'es: Ingegnere del Software, Marketing...',
          input_location: 'Località',
          input_location_placeholder: 'es: Zurigo, Berna, Ginevra...',
          input_industry: 'Settore',
          input_industry_placeholder: 'es: IT, Pharma, Banche...',
          tutorial: 'Esempio: Cerca "Project Manager" a "Basilea" nel settore "Pharma". Ti mostriamo le posizioni corrispondenti dal nostro database.'
        },
        'interview-live': {
          title: 'Coach Colloquio Live',
          desc: 'Esercitati per un colloquio specifico. Stella pone domande mirate – rispondi per testo o microfono.',
          badge: 'NUOVO · LIVE',
          input_job: 'Denominazione del posto',
          input_job_placeholder: 'es: Senior UX Designer da Digitec',
          input_company: 'Azienda (opzionale)',
          input_company_placeholder: 'es: Nestlé SA, Ginevra',
          input_desc: 'Descrizione del posto (opzionale)',
          input_desc_placeholder: 'Incolla la descrizione per domande ancora più mirate...',
          tutorial: 'Esempio: Colloquio per "Product Manager" da ABB. Stella pone 5 domande reali con feedback su tono, metodo STAR e conoscenza del mercato svizzero.'
        },
        'salary-negotiation': {
          title: 'Coach Trattativa Salariale',
          desc: 'Guida su misura per la trattativa salariale – posizionamento mercato, argomenti e strategia del 13° mese svizzero.',
          badge: 'Pro',
          input_label: 'Stipendio attuale / obiettivo',
          input_placeholder: 'es: Voglio passare da 95k a 115k CHF...',
          tutorial: 'Esempio: Trattativa da Zurich Insurance. Forniamo 5 argomenti concreti, la domanda iniziale ideale e le risposte alle obiezioni tipiche.'
        }
      }
    },
    EN: {
      welcome: "Welcome back,",
      stella_greeting: "Hello, {name}! I'm Stella, your AI career assistant. How can I help you today?",
      drag_cv_here: "Drag CV here or click",
      drop_file_here: "Drop file here",
      pdf_only: "PDF & Word accepted",
      search_placeholder: "Search jobs or tips...",
      search_popular: "Popular Searches",
      search_quick: "Quick Access",
      search_label: "What are you looking for today?",
      apply_now: "Apply Now",
      job_location: "Location",
      job_category: "Category",
      job_description: "Job Description",
      job_requirements: "Requirements",
      job_keywords: "ATS Keywords",
      search_results: "{count} results found",
      search_no_results: "No results found",
      search_no_results_desc: "Try other search terms or categories.",
      search_close: "ESC to close",
      search_stella: "ENTER for Stella advice",
      job_board_title: "Job Board",
      job_board_desc: "Discover current job openings that perfectly match your profile.",
      filter_all: "All Industries",
      filter_location: "Location",
      filter_industry: "Industry",
      filter_keyword: "Keyword",
      search_nav_profile: "Navigating to your profile...",
      search_type_profile: "Your Profile",
      search_type_tool: "Tools",
      search_type_job: "Open Positions",
      search_type_tip: "Career Tips",
      search_type_faq: "Common Questions",
      stella_placeholder: "Ask Stella something...",
      stella_secure_data: "Secure Swiss Data Processing",
      hero_title: "Ace Every Interview. Land Your Dream Job in Switzerland.",
      hero_desc: "Stellify prepares you for every stage of the Swiss application process – from CV analysis to interview coaching. AI-powered, precise, and tailored to the Swiss job market.",
      cta_free: "Test for free",
      upload_cv: "Upload CV (Resume)",
      update_cv: "Update CV (Resume)",
      cv_info: "A CV (Curriculum Vitae) is your professional history. It is the most important document in your application.",
      dashboard: "Dashboard",
      tools: "Tools",
      pricing: "Pricing",
      login: "Login",
      register: "Register",
      logout: "Logout",
      success_stories: "Success Stories",
      promo_spot: "Promotional Spot",
      features: "Features",
      how_it_works: "How it works",
      success_title: "Real People. Real Success.",
      success_desc: "Thousands of Swiss professionals have already found their dream job with Stellify. Here are some of their stories.",
      promo_title: "Experience the future of career.",
      promo_play: "Play Spot",
      examples_title: "AI Precision in Action",
      examples_desc: "See how Stellify transforms standard text into premium Swiss applications.",
      ai_notice: "✨ Generated by Stella AI • Please check for accuracy",
      settings: "Settings",
      profile: "Profile",
      subscription: "Subscription",
      data_privacy: "Privacy",
      tools_title: "Create profile once. Use all tools.",
      tools_badge: "20+ Tools – One subscription",
      tools_view_all: "View all tools",
      market_title: "Why now. Why Switzerland.",
      market_badge: "Market Potential",
      pricing_title: "Simple pricing. Full power.",
      pricing_monthly: "Monthly",
      pricing_yearly: "Yearly",
      pricing_save: "2 months free",
      pricing_gratis_desc: "Start for free – no credit card required.",
      pricing_pro_desc: "The standard for ambitious candidates.",
      pricing_ultimate_desc: "Maximum power for your career.",
      faq_title: "Frequently Asked Questions",
      footer_desc: "Stellify is the leading AI platform for career optimization in Switzerland. Precise, discreet, and successful.",
      footer_legal: "Legal",
      footer_contact: "Contact",
      auth_login: "Login",
      auth_register: "Register",
      auth_welcome: "Welcome back",
      auth_create: "Create account",
      auth_precision: "Precision for your career.",
      auth_first_name: "First Name",
      auth_email: "Email",
      auth_password: "Password",
      auth_forgot_password: "Forgot password?",
      auth_reset_password_title: "Reset Password",
      auth_reset_password_desc: "Enter your email address and we'll send you a link to reset your password.",
      auth_reset_password_btn: "Send reset link",
      auth_back_to_login: "Back to Login",
      auth_placeholder_name: "Max",
      auth_placeholder_email: "your@email.ch",
      tool_no_cv: "⚠️ No CV uploaded. The AI uses general information. Upload your CV for better results.",
      tool_process: "Processing...",
      tool_generate: "Generate",
      tool_analyzing: "Stella is analyzing...",
      tool_result: "Result",
      tool_download: "Download",
      tool_copy: "Copy",
      tool_copied: "Copied!",
      tool_empty_state: "Fill in the fields and click \"Generate\" to start the AI analysis.",
      payment_title: "Pay as you wish",
      payment_secure: "Securely processed via Stripe.",
      how_badge: "Your Path to Success",
      how_desc: "In three steps, Stellify prepares you perfectly for every stage of the Swiss application process.",
      how_1_t: "Upload & Analyze CV",
      how_1_d: "Upload your CV as a PDF. Stella identifies weaknesses, missing keywords, and optimization potential for Swiss recruiters in seconds.",
      how_2_t: "Perfect Your Application",
      how_2_d: "Optimize your CV, write tailored cover letters, and prepare for ATS systems of Swiss companies – with AI precision.",
      how_3_t: "Ace the Interview",
      how_3_d: "Train with realistic interview simulations, get immediate feedback, and learn exactly what Swiss employers look for.",
      faq_badge: "Frequently Asked Questions",
      faq_subtitle: "Everything you need to know",
      faq_contact: "Any questions?",
      cta_final_title: "Your career deserves your personal copilot.",
      cta_final_desc: "Start for free. 20+ tools. Swiss standard. No subscription risk.",
      cta_final_btn: "Start for free now",
      settings_first_name: "First Name",
      settings_email: "Email",
      settings_status: "Status: Active",
      settings_change_plan: "Change Plan",
      settings_privacy_desc: "Your data is securely stored in Switzerland. You can request a copy of your data or delete your account at any time.",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      promo_presents: "Stellify Presents",
      promo_precision: "Precision",
      promo_redefined: "Redefined.",
      promo_desc: "In a market where every detail counts, Stellify is your unfair advantage. The first AI career copilot built for the Swiss standard.",
      promo_journey: "Start Your Journey",
      faq_1_q: "How secure is my data?",
      faq_1_a: "Your data is processed exclusively on Swiss servers and encrypted according to the latest standards.",
      faq_2_q: "How does the Stellify subscription work?",
      faq_2_a: "At Stellify, there is no automatic renewal and no cancellation required — you retain full control at all times. You choose a monthly or annual plan and immediately gain full access for exactly that period. When your subscription expires, your account automatically reverts to the Free plan with no action needed on your part. If you'd like to keep enjoying Stellify, simply subscribe again — your access will seamlessly extend by another month or year. To make sure you're always informed in good time, we automatically send you a reminder email before your subscription ends: for a monthly subscription, this email arrives three days before the expiry date; for an annual subscription, two weeks before. A plan upgrade, for example from Pro to Ultimate, is available at any time once your current subscription has expired. Your exact expiry date is always visible in your account settings.",
      faq_3_q: "How many uses are included in my plan?",
      faq_3_a: "The Free plan includes three tool uses and three messages in the Stella chat — ideal for exploring the platform with no commitment. These uses are one-time only and do not reset. The Pro plan provides fifty tool uses per month and up to twenty actions per day. The Ultimate plan offers unlimited use of all features with no restrictions whatsoever.",
      faq_4_q: "Does Stellify work for all industries?",
      faq_4_a: "Yes, our AI has been trained on the entire Swiss job market.",
      faq_5_q: "Which languages are supported?",
      faq_5_a: "We support German, English, French, and Italian.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Settings",
      nav_logout: "Logout",
      nav_login: "Login",
      tool_limit_pro: "You have used up your generations for this month. You will get new ones on the 1st of next month. Upgrade to Ultimate for immediate, unlimited access! 🚀",
      tool_limit_free: "This expert tool requires a Pro or Unlimited subscription. ✨",
      onboarding_welcome_title: "Welcome to Stellify",
      onboarding_welcome_desc: "Your AI copilot for your Swiss career. We help you make the most of your potential.",
      onboarding_cv_title: "Upload your CV",
      onboarding_cv_desc: "Upload your resume so Stella can better understand you and your experiences. This way you get personalized tips.",
      onboarding_chat_title: "Ask Stella",
      onboarding_chat_desc: "Use Stella Chat for career advice, interview preparation or to learn more about the Swiss labor market.",
      onboarding_tools_title: "Expert Tools",
      onboarding_tools_desc: "Use our specialized tools for salary checks, ATS optimization and market analysis.",
      onboarding_next: "Next",
      onboarding_finish: "Get Started",
      settings_rewatch_tutorial: "Re-watch tutorial",
      nav_register: "Start for free",
      nav_greeting: "Hello",
      linkedin_connect: "Connect LinkedIn",
      linkedin_connected: "LinkedIn connected",
      linkedin_share: "Share on LinkedIn",
      linkedin_import_success: "Profile imported successfully!",
      linkedin_import_error: "Import error.",
      dashboard_welcome: "Welcome back,",
      dashboard_stat_plan: "Your Plan",
      dashboard_usage_limit: "{used} of {total} uses",
      dashboard_usage_unlimited: "Unlimited usage",
      dashboard_usage_desc: "Tool Usage",
      dashboard_chat_usage: "Stella Chat",
      dashboard_daily_usage: "Daily Limit",
      dashboard_reset_monthly: "Resets on the 1st",
      dashboard_reset_daily: "Resets tomorrow",
      dashboard_stat_free_chat: "{used} / 3 Chat requests",
      dashboard_stat_free_tools: "{used} / 1 Tool use",
      tool_daily_limit_pro: "You have reached your daily limit. You will have new attempts tomorrow! 🚀",
      tool_limit_search_pro: "Your live search limit (10/month) has been reached. You will get new searches next month. Upgrade to Ultimate for unlimited search! 🚀",
      tool_limit_search_fair_use: "You have reached the fair-use limit for live searches. Please try again tomorrow or contact support.",
      dashboard_pro: "Career Professional",
      dashboard_desc: "Your copilot Stella is ready. Analyze new jobs, optimize your profile, or prepare for your next interview.",
      dashboard_stat_analyses: "Analyses",
      dashboard_stat_cv_status: "Lebenslauf (CV)",
      dashboard_stat_ready: "Ready",
      dashboard_stat_missing: "Missing",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Unlimited",
      dashboard_stat_free: "Free",
      dashboard_cv_optimize: "Premium Optimization",
      tracker_title: "Application Tracker",
      tracker_desc: "Manage your opportunities",
      tracker_add: "Add new",
      tracker_company: "Company",
      tracker_company_ph: "e.g. Google",
      tracker_position: "Position",
      tracker_position_ph: "e.g. Senior Designer",
      tracker_status: "Status",
      tracker_location: "Location",
      tracker_location_ph: "e.g. Zurich",
      tracker_salary: "Salary expectation",
      tracker_salary_ph: "e.g. CHF 120,000",
      tracker_notes: "Notes",
      tracker_notes_ph: "e.g. Contact: John Smith...",
      tracker_save: "Save",
      tracker_update: "Update",
      tracker_cancel: "Cancel",
      tracker_wishlist: "Wishlist",
      tracker_applied: "Applied",
      tracker_interview: "Interview",
      tracker_offer: "Offer",
      tracker_rejected: "Rejected",
      tracker_notes_badge: "Notes available",
      tracker_empty: "Empty",
      quick_tools: "Quick Tools",
      all_tools: "All Tools",
      recent_docs: "Your Recent Documents",
      view_all: "View all",
      time_just_now: "Just now",
      stella_context_title: "Stella Context",
      stella_context_cv_ready: "CV analyzed",
      stella_context_no_cv: "No CV uploaded",
      stella_context_focus: "Focus Areas",
      stella_roadmap: "Your Roadmap",
      stella_roadmap_empty: "Upload your CV to see your roadmap.",
      stella_insights: "Stella Insights",
      stella_market_score: "Market Score",
      stella_top_keywords: "Top Keywords",
      stella_best_match: "Best Match",
      stella_ch_corrections: "Language Corrections (Swiss German)",
      stella_ch_tips: "Switzerland-Specific Tips",
      stella_short_profile: "Optimized Short Profile",
      stella_highlights: "Optimized Highlights",
      stella_name: "Stella – AI Assistant",
      stella_online: "Online – ready to help",
      stella_input_ph: "Write to Stella...",
      tool_open: "Open",
      docs_empty: "No documents generated yet. Start with a tool below.",
      stella_raw_json: "Show raw data (JSON)",
      stella_full_analysis: "Full Analysis",
      stella_insights_with_cv: "Stella has analysed your profile. Your focus on precision fits perfectly with the Swiss market. Use the CV Analysis tool for a deep-dive check.",
      stella_insights_no_cv: "Once you upload your CV, I'll create a tailored analysis of your market opportunities here.",
      salary_history: "Salary History",
      hero_precision: "Swiss AI Precision",
      upload_analyzing: "Analysing document structure...",
      upload_done: "CV successfully analysed. Stella is ready.",
      hero_success_rate: "Success rate",
      hero_more_interviews: "More interviews",
      tool_see_plans: "See plans",
      tool_maybe_later: "Maybe later",
      tool_inputs: "Inputs",
      tool_load_file: "Load file",
      salary_security_notice: "Your data is safe: Stellify does not store any personal salary data. The calculation is performed anonymously according to Swiss data protection standards.",
      swiss_standard_notice_title: "Swiss Career Excellence",
      swiss_standard_notice_text: "Precisely aligned with the Swiss job market – from language to application structure.",
      footer_rights: "All rights reserved.",
      footer_privacy: "Privacy",
      footer_terms: "Terms",
      footer_imprint: "Imprint",
      cookie_title: "Privacy & Cookies",
      cookie_desc: "We use necessary cookies to operate the platform and optional analytics cookies to improve our services. Your data is processed in accordance with the Swiss DSG and GDPR.",
      cookie_accept: "Accept all",
      cookie_essential: "Essential only",
      cookie_privacy_link: "Privacy policy",
      close: "Close",
      back: "Back",
      or_divider: "Or",
      stat_members: "Members",
      hero_intro: "Your Personal",
      badge_new: "NEW",
      tools_section_badge: "21 AI Tools",
      tools_section_title: "Everything you need for your career",
      tools_section_desc: "From CV analysis to salary negotiation – Stellify guides you every step of the way.",
      tools_section_cta: "View all 21 tools →",
      testimonial_verified: "Verified",
      cv_banner_title: "Upload your CV for personalised AI analyses",
      cv_banner_desc: "PDF or Word · Free · All 21 tools tailored to your CV",
      cv_banner_btn: "Upload CV",
      cv_stat_upload: "Upload",
      testimonials: [
        { name: 'Lukas B.', role: 'Polymechanic EFZ', city: 'Winterthur', quote: "After my apprenticeship, I didn't know exactly how to best sell my practical skills in my CV. Stellify helped me describe my projects precisely. Now I have a great job at a large industrial company." },
        { name: 'Sarah W.', role: 'HR Specialist', city: 'Zurich', quote: "I see hundreds of applications every day. Stellify's certificate decoder is frighteningly accurate. It not only helps me privately but also gives me a new perspective on the Swiss job market." },
        { name: 'Hans-Peter K.', role: 'Logistics Manager', city: 'Olten', quote: "Starting over at over 50 was a challenge. Stellify translated my many years of experience into modern, ATS-optimized language. This opened doors for me that I already thought were closed." }
      ],
      interview_live_promo: "Practice your next interview – text or microphone",
      remaining: "remaining",
      search_close_label: "Close",
      search_open_selection: "Open Selection",
      search_stella_advice: "Stella Advice",
      premium_analysis_desc: "Deep review according to Swiss standards",
      salary_median_label: "Estimated Median Salary (Gross/Year)",
      salary_important_notice: "Important Notice",
      salary_disclaimer: "This estimate is based on current market trends and AI models for the Swiss job market. Factors such as specific certifications, bonus agreements, and individual benefits may influence the actual offer.",
      generated_app_title: "Your Generated Application",
      copy: "Copy",
      tool_how_to_use: "How to use this tool",
      tool_scroll_example: "Scroll down for professional example",
      tool_pro_example: "Professional Example",
      tool_unlimited_access: "Unlimited Access",
      tool_unlock_desc: "Unlock this tool and all premium features with the Unlimited plan.",
      tool_discover_unlimited: "Discover Unlimited Now",
      tool_fill_fields: "Fill in the fields on the left",
      auth_terms_by_signing: "By signing in, you accept our",
      auth_terms_and: "and",
      auth_terms_data_processing: "Your data is securely processed in Switzerland/EU.",
      auth_register_new: "→ Register new account",
      auth_switch_to_login: "→ Switch to Login",
      auth_reset_session: "Reset Session",
      password_weak: "Weak",
      password_medium: "Medium",
      password_strong: "Strong",
      interview_complete: "🎉 Interview complete!",
      interview_question_of: "Question {current} of 5",
      interview_show_tip: "Show tip",
      interview_feedback_prev: "✓ Last answer feedback",
      interview_your_answer: "Your Answer",
      interview_answer_placeholder: "Write your answer here...",
      interview_mic_unavailable: "Microphone not available in this browser.",
      interview_mic_answer: "Answer by microphone",
      interview_recording: "Recording...",
      interview_feedback_unavailable: "Feedback unavailable.",
      interview_evaluating: "Stella is evaluating...",
      interview_submit: "Submit → Question {n}/5",
      interview_show_model: "Show model answer",
      interview_common_mistake: "⚠ Common mistake: ",
      interview_complete_title: "Interview Complete",
      interview_complete_desc: "All 5 questions answered. Your summary:",
      interview_new: "New Interview",
      interview_copy_summary: "Copy Summary",
      settings_your_usage: "Your Usage",
      settings_apps_tools: "Applications & Tools",
      settings_generations: "Generations",
      settings_actions_today: "Actions today",
      settings_free_use: "Free use",
      settings_requests: "Requests",
      settings_delete_account: "Delete Account",
      app_initializing: "Initializing...",
      market_1_t: "Job changes are increasing",
      market_1_d: "On average, Swiss employees change jobs every 3 years.",
      market_2_t: "Applications take time",
      market_2_d: "A good application takes 3-5 hours. With AI: 3 minutes.",
      market_3_t: "AI is accepted",
      market_3_d: "78% of Swiss employees would use AI for career help.",
      market_4_t: "No good CH tool",
      market_4_d: "No solution understands the Swiss certificate system and ATS requirements.",
      security_badge: "Data Privacy & Security",
      security_title: "Your data is safe in Switzerland.",
      security_desc: "We take data protection seriously. Your documents are processed according to Swiss standards and stored in encrypted form.",
      security_item_1_t: "Swiss Servers",
      security_item_1_d: "All data is processed exclusively in high-security data centers in Switzerland.",
      security_item_2_t: "End-to-End Encryption",
      security_item_2_d: "Your CVs and personal data are encrypted at all times and inaccessible to third parties.",
      security_item_3_t: "GDPR & FADP Compliant",
      security_item_3_d: "We strictly adhere to the Swiss Federal Act on Data Protection and the European GDPR.",
      comparison_badge: "Why Stellify?",
      comparison_title: "The first real AI career copilot for Switzerland.",
      comparison_subtitle: "Other tools do one thing. Stellify does everything – and understands the Swiss market.",
      comparison_bad_title: "Standard AI / Other Tools",
      comparison_bad_items: [
        "Empty chat window, you don't know what to enter",
        "No Swiss format/standard (ss vs ß)",
        "No ATS check – you don't know if your CV is read",
        "No certificate decoder – Swiss code remains a mystery",
        "No job matching – you apply blindly",
        "5 different apps, no common thread"
      ],
      comparison_good_title: "Stellify AI Copilot",
      comparison_good_items: [
        "Guided processes, Stella knows what you need",
        "100% Swiss standards (work certificate code)",
        "Real ATS simulator for Swiss recruiters",
        "Precise certificate decoder (secret language)",
        "AI job matching with fit score",
        "Everything in one platform, perfectly coordinated"
      ],
      why_stellify_points: [
        { title: "Swiss Precision", desc: "We master the nuances of the Swiss market – from correct spelling to cantonal specificities.", icon: "Target" },
        { title: "Certificate Code Decoded", desc: "Finally understand what is really written in your work certificates. Stella detects hidden messages immediately.", icon: "ShieldCheck" },
        { title: "Multilingualism", desc: "Apply seamlessly in German, English, French or Italian – perfect for the multilingual Swiss market.", icon: "Globe" },
        { title: "ATS Optimization", desc: "Our AI is trained on the systems of major Swiss employers, ensuring your CV is guaranteed to be read.", icon: "Cpu" },
        { title: "Salary Transparency", desc: "Get precise salary forecasts based on Swiss market data for your specific region and industry.", icon: "Coins" },
        { title: "Data Protection 'Made in CH'", desc: "Your sensitive data does not leave Switzerland. We guarantee maximum security according to Swiss standards.", icon: "Lock" }
      ],
      pricing_free_f: ["3× applications or tool uses", "3× Stella Chat messages", "AI Salary Calculator (Base)", "Swiss Standards"],
      pricing_pro_f: ["50× applications / month", "Certificate Decoder (Pro)", "Interview Coach", "Priority Support"],
      pricing_ultimate_f: ["Unlimited applications", "All Pro features + Exclusive Tools", "Deep Analysis Mode (AI)", "24/7 VIP Support"],
      pricing_cta_free: "Start for free",
      pricing_cta_pro: "Go Pro",
      pricing_cta_ultimate: "Choose Ultimate",
      pricing_recommended: "Recommended",
      value_title: "CHF 19.90 – is it worth it?",
      value_items: [
        "A career counselor costs CHF 200–400 / session",
        "Certificate not understood = wrong job",
        "A bad ATS score = CV is never read",
        "A bad application = missed position",
        "One better job offer covers the entire subscription cost",
        "Stellify saves you 3–5 hours per application"
      ],
      tools_data: {
        'cv-optimizer': { title: 'CV Optimizer', desc: 'Analyzes your CV for Swiss standards & optimizes wording.', input_label: 'Which section to optimize?', input_placeholder: 'e.g. Work experience...' },
        'salary-calc': { title: 'AI Salary Calc CH', desc: 'Industry, experience, canton – AI analyzes market wages & gives you a basis for negotiation.', input_job: 'Job Title', input_job_placeholder: 'e.g. Software Engineer', input_industry: 'Industry', input_industry_placeholder: 'e.g. Banking', input_exp: 'Years of Experience', input_exp_placeholder: 'e.g. 5', input_canton: 'Canton', input_canton_placeholder: 'e.g. ZH' },
        'cv-gen': { title: 'Applications', desc: 'Cover letter & CV in 60 seconds, generated live.', input_label: 'Job Ad (optional)', input_placeholder: 'Paste the job ad here...' },
        'ats-sim': { title: 'ATS Simulation', desc: 'Checks if your CV passes through recruiter software. With score & tips.', input_label: 'Job Ad (optional)', input_placeholder: 'Paste the job ad...' },
        'zeugnis': { title: 'Premium Certificate Decoder', desc: 'Decodes the secret code of Swiss work certificates. Identifies hidden negative messages and evaluates your market position.', input_label: 'Certificate Text', input_placeholder: 'Paste the text here...' },
        'skill-gap': { title: 'Skill-Gap Analysis', desc: 'Compare your profile with your dream job and find out what you are still missing.', input_label: 'Target Position', input_placeholder: 'e.g. Senior Data Scientist' },
        'cv-analysis': { title: 'CV Analysis', desc: 'Deep analysis of your CV for keywords, industry fit, and improvement potential.' },
        'tracker': { title: 'Application Strategy', desc: 'Create a tailored battle plan for your next application.', input_label: 'Job Title / Company', input_placeholder: 'e.g. Senior Project Manager at Roche' },
        'matching': { title: 'Job Matching', desc: 'AI finds your top 5 matching job profiles with fit score.' },
        'interview': { title: 'Interview Coach', desc: 'AI simulates 5 real questions, evaluates answers, gives a grade 0-100.', input_label: 'Position for the interview', input_placeholder: 'e.g. Marketing Manager' },
        'lehrstellen': { title: 'Apprenticeship Finder', desc: 'Find the perfect apprenticeship in your region. With AI check for your suitability.', input_interest: 'What interests you?', input_interest_placeholder: 'e.g. IT, Commerce, Tech...', input_location: 'Region', input_location_placeholder: 'e.g. Zurich, Bern, Basel...' },
        'berufseinstieg': { title: 'Career Entry Guide', desc: 'Fresh out of apprenticeship or studies? We show you how to find your first "real" job.', input_label: 'What did you complete?', input_placeholder: 'e.g. EFZ IT...' },
        'erfahrung-plus': { title: 'Experience-Plus', desc: 'Special tool for 50+. We show you how to sell your decades of experience as an unbeatable advantage.', input_label: 'Your greatest strength', input_placeholder: 'e.g. 20 years of leadership experience in construction' },
        'wiedereinstieg': { title: 'Re-entry Check', desc: 'Took a longer break? We fill the gap in your CV professionally and convincingly.', input_label: 'Reason for break', input_placeholder: 'e.g. Parental leave...' },
        'karriere-checkup': { title: 'Career Checkup', desc: 'You have a job but want more? We check your current market potential.', input_label: 'Current Job', input_placeholder: 'e.g. Project Manager' },
        'linkedin-job': { title: 'LinkedIn → Application', desc: 'Profile + Ad → Cover letter & arguments.', input_profile: 'LinkedIn Profile Text', input_profile_placeholder: 'Copy your LinkedIn profile (About & Experience)...', input_ad: 'Job Ad', input_ad_placeholder: 'Copy the job ad here...' },
        'linkedin-posts': { title: 'LinkedIn Posts', desc: '3 tailored posts in Swiss style.', input_label: 'Topic or focus', input_placeholder: 'e.g. New job...' },
        'cv-premium': { title: 'Premium CV Rewrite', desc: 'Full optimization of your resume to Swiss premium standards (no ß, Swiss precision).', input_label: 'Your current CV text', input_placeholder: 'Paste your entire CV content here...' },
        'career-roadmap': { title: 'Career Roadmap', desc: 'Creates a personal battle plan for your career in Switzerland including further education & jobs.', input_label: 'Your Career Goal (optional)', input_placeholder: 'e.g. CTO in a Fintech' },
        'job-search': { 
          title: 'Job Search CH', 
          desc: 'Search current job openings in Switzerland by keywords, location, and industry.', 
          input_keyword: 'Keyword', 
          input_keyword_placeholder: 'e.g. Software Engineer, Marketing...',
          input_location: 'Location',
          input_location_placeholder: 'e.g. Zurich, Bern, Geneva...',
          input_industry: 'Industry',
          input_industry_placeholder: 'e.g. IT, Pharma, Banking...',
          tutorial: 'Example: Search for "Project Manager" in "Basel" in the "Pharma" sector. We show you matching positions from our database.'
        },
        'interview-live': {
          title: 'Live Interview Coach',
          desc: 'Practice your interview for a specific role. Stella asks tailored questions – answer by text or microphone.',
          badge: 'NEW · LIVE',
          input_job: 'Job Title',
          input_job_placeholder: 'e.g. Senior UX Designer at Digitec',
          input_company: 'Company (optional)',
          input_company_placeholder: 'e.g. Nestlé AG, Zurich',
          input_desc: 'Job Description (optional)',
          input_desc_placeholder: 'Paste the job description for even more targeted questions...',
          tutorial: 'Example: Interview for "Product Manager" at ABB. Stella asks 5 real questions with feedback on tone, STAR method and Swiss market knowledge.'
        },
        'salary-negotiation': {
          title: 'Salary Negotiation Coach',
          desc: 'Tailored guide for your salary negotiation – market positioning, arguments and Swiss 13th month salary strategy.',
          badge: 'Pro',
          input_label: 'Current / Target Salary',
          input_placeholder: 'e.g. I want to go from 95k to 115k CHF...',
          tutorial: 'Example: Negotiation at Zurich Insurance. We provide 5 concrete arguments, the ideal opening demand and responses to typical objections.'
        }
      }
    }
  };

  const t = translations[language] || translations.DE;

  const tools = [
    {
      id: 'interview',
      title: t.tools_data['interview'].title,
      desc: t.tools_data['interview'].desc,
      icon: <Mic size={20} />,
      badge: 'Coach',
      type: 'gratis',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'jobTitle', label: t.tools_data['interview'].input_label, type: 'text', placeholder: t.tools_data['interview'].input_placeholder },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: '— Bitte wählen —', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'qualifications', label: 'Qualifikationen', type: 'textarea', placeholder: 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'description', label: 'Beschreibung / Wünsche', type: 'textarea', placeholder: 'Worauf soll das Interview-Training fokussieren?' },
      ]
    },
    {
      id: 'cv-analysis',
      title: t.tools_data['cv-analysis'].title,
      desc: t.tools_data['cv-analysis'].desc,
      icon: <Search size={20} />,
      badge: 'Deep Scan',
      type: 'pro',
      inputs: []
    },
    {
      id: 'cv-optimizer',
      title: t.tools_data['cv-optimizer'].title,
      desc: t.tools_data['cv-optimizer'].desc,
      icon: <FileText size={20} />,
      badge: 'Precision',
      type: 'pro',
      inputs: [{ key: 'section', label: t.tools_data['cv-optimizer'].input_label, type: 'text', placeholder: t.tools_data['cv-optimizer'].input_placeholder }]
    },
    {
      id: 'cv-premium',
      title: t.tools_data['cv-premium'].title,
      desc: t.tools_data['cv-premium'].desc,
      icon: <Sparkles size={20} />,
      badge: 'Premium',
      type: 'ultimate',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: '— Bitte wählen —', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'duration', label: 'Wie lange in dieser Position', type: 'text', placeholder: 'z.B. 3 Jahre' },
        { key: 'qualifications', label: 'Qualifikationen', type: 'textarea', placeholder: 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'cvText', label: t.tools_data['cv-premium'].input_label, type: 'textarea', placeholder: t.tools_data['cv-premium'].input_placeholder },
        { key: 'description', label: 'Beschreibung / Wünsche', type: 'textarea', placeholder: 'Was soll das Dokument beinhalten? Besondere Wünsche, Schwerpunkte...' },
      ]
    },
    {
      id: 'career-roadmap',
      title: t.tools_data['career-roadmap'].title,
      desc: t.tools_data['career-roadmap'].desc,
      icon: <Compass size={20} />,
      badge: 'Strategy',
      type: 'ultimate',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: '— Bitte wählen —', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'duration', label: 'Wie lange in dieser Position', type: 'text', placeholder: 'z.B. 3 Jahre' },
        { key: 'qualifications', label: 'Qualifikationen', type: 'textarea', placeholder: 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'goal', label: t.tools_data['career-roadmap'].input_label, type: 'text', placeholder: t.tools_data['career-roadmap'].input_placeholder },
        { key: 'description', label: 'Beschreibung / Wünsche', type: 'textarea', placeholder: 'Was soll das Dokument beinhalten? Besondere Wünsche, Schwerpunkte...' },
      ]
    },
    {
      id: 'salary-calc', 
      title: t.tools_data['salary-calc'].title, 
      desc: t.tools_data['salary-calc'].desc, 
      icon: <Coins size={20} />, 
      badge: 'Market Data', 
      type: 'pro',
      inputs: [
        { key: 'jobTitle', label: t.tools_data['salary-calc'].input_job, type: 'text', placeholder: t.tools_data['salary-calc'].input_job_placeholder },
        { key: 'industry', label: t.tools_data['salary-calc'].input_industry, type: 'text', placeholder: t.tools_data['salary-calc'].input_industry_placeholder },
        { key: 'experience', label: t.tools_data['salary-calc'].input_exp, type: 'number', placeholder: t.tools_data['salary-calc'].input_exp_placeholder },
        { key: 'canton', label: t.tools_data['salary-calc'].input_canton, type: 'text', placeholder: t.tools_data['salary-calc'].input_canton_placeholder }
      ] 
    },
    {
      id: 'cv-gen',
      title: t.tools_data['cv-gen'].title,
      desc: t.tools_data['cv-gen'].desc,
      icon: <Sparkles size={20} />,
      badge: '60s Gen',
      type: 'gratis',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: '— Bitte wählen —', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'duration', label: 'Wie lange in dieser Position', type: 'text', placeholder: 'z.B. 3 Jahre' },
        { key: 'qualifications', label: 'Qualifikationen', type: 'textarea', placeholder: 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'jobAd', label: t.tools_data['cv-gen'].input_label, type: 'textarea', placeholder: t.tools_data['cv-gen'].input_placeholder },
        { key: 'description', label: 'Beschreibung / Wünsche', type: 'textarea', placeholder: 'Was soll das Dokument beinhalten? Besondere Wünsche, Schwerpunkte...' },
      ]
    },
    { 
      id: 'ats-sim', 
      title: t.tools_data['ats-sim'].title, 
      desc: t.tools_data['ats-sim'].desc, 
      icon: <Cpu size={20} />, 
      badge: 'Simulator', 
      type: 'pro',
      inputs: [{ key: 'jobAd', label: t.tools_data['ats-sim'].input_label, type: 'textarea', placeholder: t.tools_data['ats-sim'].input_placeholder }] 
    },
    { 
      id: 'zeugnis', 
      title: t.tools_data['zeugnis'].title, 
      desc: t.tools_data['zeugnis'].desc, 
      icon: <ShieldCheck size={20} />, 
      badge: 'Decoder', 
      type: 'pro',
      inputs: [{ key: 'certificateText', label: t.tools_data['zeugnis'].input_label, type: 'textarea', placeholder: t.tools_data['zeugnis'].input_placeholder }] 
    },
    { 
      id: 'skill-gap', 
      title: t.tools_data['skill-gap'].title, 
      desc: t.tools_data['skill-gap'].desc, 
      icon: <Target size={20} />, 
      badge: 'Analysis', 
      type: 'pro',
      inputs: [{ key: 'targetJob', label: t.tools_data['skill-gap'].input_label, type: 'text', placeholder: t.tools_data['skill-gap'].input_placeholder }] 
    },
    {
      id: 'tracker', 
      title: t.tools_data['tracker'].title, 
      desc: t.tools_data['tracker'].desc, 
      icon: <Layout size={20} />, 
      badge: 'Strategy', 
      type: 'pro',
      inputs: [{ key: 'jobTitle', label: t.tools_data['tracker'].input_label, type: 'text', placeholder: t.tools_data['tracker'].input_placeholder }] 
    },
    { 
      id: 'matching', 
      title: t.tools_data['matching'].title, 
      desc: t.tools_data['matching'].desc, 
      icon: <Search size={20} />, 
      badge: 'Fit-Score',
      type: 'ultimate',
      inputs: []
    },
    {
      id: 'lehrstellen', 
      title: t.tools_data['lehrstellen'].title, 
      desc: t.tools_data['lehrstellen'].desc, 
      icon: <GraduationCap size={20} />, 
      badge: 'New Gen', 
      type: 'gratis',
      inputs: [
        { key: 'interest', label: t.tools_data['lehrstellen'].input_interest, type: 'text', placeholder: t.tools_data['lehrstellen'].input_interest_placeholder },
        { key: 'location', label: t.tools_data['lehrstellen'].input_location, type: 'text', placeholder: t.tools_data['lehrstellen'].input_location_placeholder }
      ] 
    },
    { 
      id: 'berufseinstieg', 
      title: t.tools_data['berufseinstieg'].title, 
      desc: t.tools_data['berufseinstieg'].desc, 
      icon: <Rocket size={20} />, 
      badge: 'First Job', 
      type: 'pro',
      inputs: [{ key: 'education', label: t.tools_data['berufseinstieg'].input_label, type: 'text', placeholder: t.tools_data['berufseinstieg'].input_placeholder }] 
    },
    { 
      id: 'erfahrung-plus', 
      title: t.tools_data['erfahrung-plus'].title, 
      desc: t.tools_data['erfahrung-plus'].desc, 
      icon: <Award size={20} />, 
      badge: 'Ü50 Special', 
      type: 'pro',
      inputs: [{ key: 'experience', label: t.tools_data['erfahrung-plus'].input_label, type: 'textarea', placeholder: t.tools_data['erfahrung-plus'].input_placeholder }] 
    },
    { 
      id: 'wiedereinstieg', 
      title: t.tools_data['wiedereinstieg'].title, 
      desc: t.tools_data['wiedereinstieg'].desc, 
      icon: <RefreshCw size={20} />, 
      badge: 'Comeback', 
      type: 'pro',
      inputs: [{ key: 'reason', label: t.tools_data['wiedereinstieg'].input_label, type: 'text', placeholder: t.tools_data['wiedereinstieg'].input_placeholder }] 
    },
    { 
      id: 'karriere-checkup', 
      title: t.tools_data['karriere-checkup'].title, 
      desc: t.tools_data['karriere-checkup'].desc, 
      icon: <TrendingUp size={20} />, 
      badge: 'Next Level', 
      type: 'pro',
      inputs: [{ key: 'currentJob', label: t.tools_data['karriere-checkup'].input_label, type: 'text', placeholder: t.tools_data['karriere-checkup'].input_placeholder }] 
    },
    {
      id: 'linkedin-job',
      title: t.tools_data['linkedin-job'].title,
      desc: t.tools_data['linkedin-job'].desc,
      icon: <Linkedin size={20} />,
      badge: 'Direct Match',
      type: 'pro',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: '— Bitte wählen —', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'duration', label: 'Wie lange in dieser Position', type: 'text', placeholder: 'z.B. 3 Jahre' },
        { key: 'qualifications', label: 'Qualifikationen', type: 'textarea', placeholder: 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'linkedinProfile', label: t.tools_data['linkedin-job'].input_profile, type: 'textarea', placeholder: t.tools_data['linkedin-job'].input_profile_placeholder },
        { key: 'jobAd', label: t.tools_data['linkedin-job'].input_ad, type: 'textarea', placeholder: t.tools_data['linkedin-job'].input_ad_placeholder },
        { key: 'description', label: 'Beschreibung / Wünsche', type: 'textarea', placeholder: 'Was soll das Dokument beinhalten? Besondere Wünsche, Schwerpunkte...' },
      ]
    },
    {
      id: 'linkedin-posts',
      title: t.tools_data['linkedin-posts'].title,
      desc: t.tools_data['linkedin-posts'].desc,
      icon: <Share2 size={20} />,
      badge: 'Personal Brand',
      type: 'pro',
      inputs: [{ key: 'topic', label: t.tools_data['linkedin-posts'].input_label, type: 'text', placeholder: t.tools_data['linkedin-posts'].input_placeholder }]
    },
    {
      id: 'interview-live',
      title: t.tools_data['interview-live'].title,
      desc: t.tools_data['interview-live'].desc,
      icon: <Headphones size={20} />,
      badge: t.tools_data['interview-live'].badge,
      type: 'pro',
      inputs: [
        { key: 'jobTitle', label: t.tools_data['interview-live'].input_job, type: 'text', placeholder: t.tools_data['interview-live'].input_job_placeholder },
        { key: 'company', label: t.tools_data['interview-live'].input_company, type: 'text', placeholder: t.tools_data['interview-live'].input_company_placeholder },
        { key: 'jobDesc', label: t.tools_data['interview-live'].input_desc, type: 'textarea', placeholder: t.tools_data['interview-live'].input_desc_placeholder }
      ]
    },
    {
      id: 'salary-negotiation',
      title: t.tools_data['salary-negotiation'].title,
      desc: t.tools_data['salary-negotiation'].desc,
      icon: <TrendingUp size={20} />,
      badge: t.tools_data['salary-negotiation'].badge,
      type: 'pro',
      inputs: [
        { key: 'jobTitle', label: t.tools_data['salary-calc'].input_job, type: 'text', placeholder: t.tools_data['salary-calc'].input_job_placeholder },
        { key: 'targetSalary', label: t.tools_data['salary-negotiation'].input_label, type: 'text', placeholder: t.tools_data['salary-negotiation'].input_placeholder }
      ]
    }
  ];

  const faqs = [
    { q: t.faq_1_q, a: t.faq_1_a },
    { q: t.faq_2_q, a: t.faq_2_a },
    { q: t.faq_3_q, a: t.faq_3_a },
    { q: t.faq_4_q, a: t.faq_4_a },
    { q: t.faq_5_q, a: t.faq_5_a },
  ];

  const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
  const isPro = user?.role === 'pro' || isUnlimited;
  const toolUses = user?.toolUses || 0;
  const dailyToolUses = user?.dailyToolUses || 0;
  const isToolLimitReached = (!isPro && toolUses >= 3) || (user?.role === 'pro' && !isUnlimited && toolUses >= 50);
  const isDailyLimitReached = user?.role === 'pro' && !isUnlimited && dailyToolUses >= 20;
  const isToolLocked = activeTool ? ((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) ||
                       (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) : false;

  if (!isAuthReady || !splashDone) {
    const features = ['CV-Analyse', 'Interview-Coach', 'Bewerbungsschreiben', 'Gehaltsrechner', 'CV Premium Rewrite', 'Zeugnis-Decoder', 'LinkedIn-Import', 'Karriere-Roadmap'];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0D0B] overflow-hidden relative select-none">

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#00A854 1px, transparent 1px), linear-gradient(90deg, #00A854 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Large pulsing glow – center */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 700, height: 700, background: 'radial-gradient(circle, rgba(0,66,37,0.4) 0%, transparent 65%)', top: '50%', left: '50%', x: '-50%', y: '-50%' }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Secondary orb – top right */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,168,84,0.12) 0%, transparent 70%)', top: '10%', right: '10%' }}
          animate={{ scale: [1.1, 0.85, 1.1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Tertiary orb – bottom left */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,66,37,0.2) 0%, transparent 70%)', bottom: '15%', left: '8%' }}
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Center content */}
        <div className="relative flex flex-col items-center gap-10 px-8 text-center">

          {/* Spark / icon above logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-14 h-14 rounded-2xl border border-[#004225]/60 bg-[#004225]/20 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[#00A854] text-2xl"
            >✦</motion.div>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-7xl md:text-8xl font-serif tracking-tight text-[#FAFAF8]"
          >
            Stell<span className="text-[#00A854]">ify</span>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-[11px] font-bold uppercase tracking-[0.5em] text-[#00A854]/60"
          >
            Swiss Career Excellence
          </motion.p>

          {/* Divider line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="w-48 h-px bg-gradient-to-r from-transparent via-[#00A854]/60 to-transparent origin-center"
          />

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {features.map((feat, i) => (
              <motion.span
                key={feat}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.2 + i * 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#00A854]/80 border border-[#004225]/40 rounded-full bg-[#004225]/10"
              >
                {feat}
              </motion.span>
            ))}
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
            className="w-56 h-px bg-[#004225]/20 rounded-full overflow-hidden relative"
          >
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#004225] to-[#00A854] rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 1.7, duration: 1.4, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Status text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.4 }}
            className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#FAFAF8]/20"
          >
            {t.app_initializing}
          </motion.p>
        </div>

        {/* Bottom badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-10 text-[9px] font-bold uppercase tracking-[0.3em] text-[#FAFAF8]/15"
        >
          Made in Switzerland
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#1A1A18] text-[#1A1A18] dark:text-[#FAFAF8] font-sans selection:bg-[#004225] selection:text-white transition-colors duration-300">
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-[#FDFCFB]/90 dark:bg-[#1A1A18]/90 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 lg:px-12 h-16 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-8">
          <button
            onClick={() => { if (user) navigate('dashboard'); else window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-2xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] hover:opacity-80 transition-opacity"
          >
            Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span>
          </button>
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <button
                  onClick={() => navigate('dashboard')}
                  className={`text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'text-[#004225] dark:text-[#00A854]' : 'text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]'}`}
                >
                  {t.dashboard}
                </button>
                <button
                  onClick={() => navigate('tools')}
                  className={`text-sm font-medium transition-colors ${activeView === 'tools' ? 'text-[#004225] dark:text-[#00A854]' : 'text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]'}`}
                >
                  {t.tools}
                </button>
                <button
                  onClick={() => navigate('jobs')}
                  className={`text-sm font-medium transition-colors ${activeView === 'jobs' ? 'text-[#004225] dark:text-[#00A854]' : 'text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]'}`}
                >
                  {t.search_type_job}
                </button>
                <button
                  onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-sm font-medium transition-colors text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854]"
                >
                  {t.pricing}
                </button>
              </>
            ) : (
              <>
                <a href="#features" className="text-sm font-medium text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors">{t.features}</a>
                <a href="#success" className="text-sm font-medium text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors">{t.success_stories}</a>
                <a href="#how" className="text-sm font-medium text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors">{t.how_it_works}</a>
                <a href="#pricing" className="text-sm font-medium text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors">{t.pricing}</a>
              </>
            )}
            <div className="relative border-l border-black/5 dark:border-white/5 pl-6" ref={langDropdownRef}>
              <button 
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-2 text-xs font-bold text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors uppercase tracking-widest"
              >
                <Globe size={14} />
                {language}
                <ChevronDown size={12} className={`transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isLangDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 shadow-xl z-50 overflow-hidden"
                  >
                    {['DE', 'EN', 'FR', 'IT'].map((lang) => (
                      <button 
                        key={lang}
                        onClick={() => {
                          setLanguage(lang as any);
                          setIsLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${
                          language === lang 
                            ? 'bg-[#004225] text-white' 
                            : 'text-[#5C5C58] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {lang === 'DE' ? 'Deutsch' : lang === 'EN' ? 'English' : lang === 'FR' ? 'Français' : 'Italiano'}
                        {language === lang && <CheckCircle2 size={10} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 bg-black/5 dark:bg-white/5 border border-transparent hover:border-[#004225]/20 hover:bg-white dark:hover:bg-[#2A2A26] pl-3 pr-3 py-2 text-sm font-light text-left transition-all rounded-lg group"
          >
            <Search size={15} className="text-[#9A9A94] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors shrink-0" />
            <span className="flex-1 text-[#9A9A94] dark:text-[#5C5C58] text-sm">{t.search_placeholder}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#5C5C58] dark:text-[#9A9A94] transition-all"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setIsStellaOpen(true)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors text-[#004225]"
            title={t.nav_stella_chat}
          >
            <Sparkles size={20} />
          </button>
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="lg:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <Search size={20} />
          </button>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors text-[#5C5C58]"
                title={t.nav_settings}
              >
                <Settings size={18} />
              </button>

              <span className="text-sm font-medium hidden sm:inline">{t.nav_greeting}, {user.firstName}</span>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                title={t.nav_logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                className="text-sm font-medium text-[#5C5C58] hover:text-[#1A1A18] transition-colors px-4 py-2"
              >
                {t.nav_login}
              </button>
              <button
                onClick={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
                className="relative bg-[#004225] text-white text-sm font-bold px-5 py-2.5 hover:bg-[#00331d] transition-all flex items-center gap-2 shadow-md shadow-[#004225]/30 uppercase tracking-wider"
              >
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00A854] rounded-full animate-ping opacity-75" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00A854] rounded-full" />
                {t.nav_register}
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* --- MOBILE MENU --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-16 bg-white border-b border-black/5 z-40 p-6 space-y-6 shadow-xl"
          >
            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  <button onClick={() => { navigate('dashboard'); setIsMenuOpen(false); }} className={`text-lg font-medium text-left ${activeView === 'dashboard' ? 'text-[#004225]' : ''}`}>{t.dashboard}</button>
                  <button onClick={() => { navigate('tools'); setIsMenuOpen(false); }} className={`text-lg font-medium text-left ${activeView === 'tools' ? 'text-[#004225]' : ''}`}>{t.tools}</button>
                  <button onClick={() => { navigate('jobs'); setIsMenuOpen(false); }} className={`text-lg font-medium text-left ${activeView === 'jobs' ? 'text-[#004225]' : ''}`}>{t.search_type_job}</button>
                  <button onClick={() => { setIsMenuOpen(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-lg font-medium text-left">{t.pricing}</button>
                </>
              ) : (
                <>
                  <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{t.features}</a>
                  <a href="#how" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{t.how_it_works}</a>
                  <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{t.pricing}</a>
                </>
              )}
            </div>
            <div className="pt-6 border-t border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] mb-4">Sprache / Langue / Lingua</p>
              <div className="flex flex-wrap gap-3">
                {['DE', 'FR', 'IT', 'EN'].map((lang) => (
                  <button 
                    key={lang}
                    onClick={() => { setLanguage(lang as any); setIsMenuOpen(false); }}
                    className={`px-4 py-2 text-xs font-bold border ${language === lang ? 'bg-[#004225] text-white border-[#004225]' : 'border-black/10 text-[#5C5C58] dark:text-[#9A9A94] dark:border-white/10'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LEGAL PAGES --- */}
      {(activeView === 'datenschutz' || activeView === 'impressum' || activeView === 'agb') && (
        <LegalPages activeView={activeView} onBack={() => navigate(user ? 'dashboard' : 'dashboard')} language={language} />
      )}

      {/* --- HERO SECTION / DASHBOARD --- */}
      {(activeView !== 'datenschutz' && activeView !== 'impressum' && activeView !== 'agb') && (user ? (
        <section className="px-6 lg:px-12 pt-12 pb-24 bg-[#FDFCFB] dark:bg-[#1A1A18]">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Main Dashboard Area */}
              <div className="lg:col-span-2 space-y-6">
                <header>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">
                    {t.dashboard_welcome} <span className="italic opacity-80">{user.firstName || t.dashboard_pro}</span>.
                  </h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">
                    {t.dashboard_desc}
                  </p>
                </header>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t.dashboard_stat_analyses, value: toolHistory.length, icon: <TrendingUp size={16} /> },
                    { label: t.dashboard_stat_cv_status, value: cvContext ? t.dashboard_stat_ready : t.dashboard_stat_missing, icon: <FileText size={16} />, color: cvContext ? 'text-[#059669]' : 'text-red-500' },
                    { label: t.dashboard_stat_chat, value: messages.length, icon: <Send size={16} /> },
                    { label: t.dashboard_stat_plan, value: user.role === 'unlimited' || user.role === 'admin' ? t.dashboard_stat_unlimited : (user.role === 'pro' ? t.dashboard_stat_pro : t.dashboard_stat_free), icon: <Star size={16} /> }
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.4 }}
                      className="p-5 md:p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 shadow-sm transition-colors flex flex-col h-full">
                      <div className="flex items-center gap-2 text-[#9A9A94] dark:text-[#5C5C58] text-[10px] font-bold uppercase tracking-widest mb-2">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className={`text-2xl font-serif ${stat.color || 'text-[#1A1A18] dark:text-[#FAFAF8]'}`}>{stat.value}</div>
                      
                      {(stat.label === t.dashboard_stat_plan && (user.role === 'pro' || user.role === 'client')) && (
                        <div className="mt-auto pt-4 space-y-3">
                          <div className="h-px bg-black/5 dark:bg-white/5 w-full" />
                          
                          <div className="space-y-3">
                            {user.role === 'pro' ? (
                              <>
                                {/* Monthly Usage */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.dashboard_usage_desc}</span>
                                    <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{user.toolUses || 0} / 50</span>
                                  </div>
                                  <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-[#004225] transition-all duration-700" 
                                      style={{ width: `${Math.min(((user.toolUses || 0) / 50) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <span className="text-[7px] text-[#004225] font-bold uppercase tracking-tighter opacity-60">{t.dashboard_reset_monthly}</span>
                                  </div>
                                </div>

                                {/* Daily Usage */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.dashboard_daily_usage}</span>
                                    <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{user.dailyToolUses || 0} / 20</span>
                                  </div>
                                  <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-[#004225] transition-all duration-700" 
                                      style={{ width: `${Math.min(100, Math.round(((user.dailyToolUses || 0) / 20) * 100))}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <span className="text-[7px] text-[#004225] font-bold uppercase tracking-tighter opacity-60">{t.dashboard_reset_daily}</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* Free User Usage */
                              <div className="space-y-4">
                                {/* Chat Usage */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.dashboard_chat_usage}</span>
                                    <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{user.freeGenerationsUsed || 0} / 3</span>
                                  </div>
                                  <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-[#004225] transition-all duration-700" 
                                      style={{ width: `${Math.min(100, Math.round(((user.freeGenerationsUsed || 0) / 3) * 100))}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Tool Usage */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.dashboard_usage_desc}</span>
                                    <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{user.toolUses || 0} / 3</span>
                                  </div>
                                  <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#004225] transition-all duration-700"
                                      style={{ width: `${Math.min(100, Math.round(((user.toolUses || 0) / 3) * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {stat.label === t.dashboard_stat_plan && (user.role === 'unlimited' || user.role === 'admin') && (
                        <div className="mt-4 text-[8px] font-bold uppercase tracking-widest text-[#004225]">
                          {t.dashboard_usage_unlimited} ✨
                        </div>
                      )}
                      {stat.label === t.dashboard_stat_cv_status && cvContext && (
                        <button
                          onClick={() => handleToolClick('cv-premium')}
                          className="mt-3 w-full py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={12} />
                          {t.dashboard_cv_optimize}
                        </button>
                      )}
                      {stat.label === t.dashboard_stat_cv_status && !cvContext && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-4 w-full group"
                        >
                          <div className="border border-dashed border-[#004225]/30 dark:border-[#00A854]/30 hover:border-[#004225] dark:hover:border-[#00A854] transition-all duration-200 p-3 flex flex-col items-center gap-2">
                            <div className="w-8 h-8 bg-[#004225]/8 dark:bg-[#00A854]/10 group-hover:bg-[#004225]/15 dark:group-hover:bg-[#00A854]/20 transition-all flex items-center justify-center">
                              <Upload size={14} className="text-[#004225] dark:text-[#00A854]" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">{t.cv_stat_upload}</span>
                          </div>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* TEST TOOLS (Only for Owner) */}
                {/* CV Upload Banner */}
                {!cvContext && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 bg-gradient-to-r from-[#004225]/8 to-[#00A854]/5 dark:from-[#004225]/20 dark:to-[#00A854]/10 border border-[#004225]/20 dark:border-[#00A854]/20 flex flex-col md:flex-row items-start md:items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-[#004225] flex items-center justify-center flex-shrink-0">
                      <FileUp size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">{t.cv_banner_title}</p>
                      <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] mt-0.5">{t.cv_banner_desc}</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0 px-6 py-2.5 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all flex items-center gap-2"
                    >
                      <Upload size={12} />
                      {t.cv_banner_btn}
                    </button>
                  </motion.div>
                )}

                {import.meta.env.DEV && user?.email === 'weare2bc@gmail.com' && (
                  <div className="p-6 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 space-y-4 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">
                      <Shield size={12} />
                      Developer Test Tools
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            await supabase.from('users').update({ role: 'pro' }).eq('id', user.id);
                            setMessages(prev => [...prev, { role: 'ai', content: 'Test-Upgrade: Du bist jetzt PRO-Nutzer! ✨' }]);
                          } catch (e) { console.error(e); }
                        }}
                        className="px-4 py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                      >
                        Set Pro Role
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await supabase.from('users').update({ role: 'client' }).eq('id', user.id);
                            setMessages(prev => [...prev, { role: 'ai', content: 'Test-Downgrade: Du bist wieder FREE-Nutzer.' }]);
                          } catch (e) { console.error(e); }
                        }}
                        className="px-4 py-2 border border-[#004225] text-[#004225] text-[10px] font-bold uppercase tracking-widest hover:bg-[#004225]/10 transition-all"
                      >
                        Reset to Free
                      </button>
                      <button 
                        onClick={() => {
                          setToolHistory([]);
                          setMessages([]);
                          setMessages([{ role: 'ai', content: 'Test-Reset: Chat und Verlauf geleert.' }]);
                        }}
                        className="px-4 py-2 border border-black/10 text-black/40 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all"
                      >
                        Clear History
                      </button>
                    </div>
                    <p className="text-[9px] text-[#004225]/60 italic font-light">Diese Tools sind nur für dich sichtbar, um den Flow zu testen.</p>
                  </div>
                )}

                {/* Job Tracker / Kanban Board */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <h2 className="text-xl font-serif">{t.tracker_title}</h2>
                      <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest font-medium">{t.tracker_desc}</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingApp(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all shadow-sm"
                    >
                      <Plus size={14} />
                      {t.tracker_add}
                    </button>
                  </div>

                  {isAddingApp && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white border border-[#004225]/20 shadow-xl space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_company}</label>
                          <input
                            type="text"
                            value={newApp.company}
                            onChange={(e) => setNewApp({...newApp, company: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                            placeholder={t.tracker_company_ph}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_position}</label>
                          <input
                            type="text"
                            value={newApp.position}
                            onChange={(e) => setNewApp({...newApp, position: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                            placeholder={t.tracker_position_ph}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_status}</label>
                          <select
                            value={newApp.status}
                            onChange={(e) => setNewApp({...newApp, status: e.target.value as any})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                          >
                            <option value="Wishlist">{t.tracker_wishlist}</option>
                            <option value="Applied">{t.tracker_applied}</option>
                            <option value="Interview">{t.tracker_interview}</option>
                            <option value="Offer">{t.tracker_offer}</option>
                            <option value="Rejected">{t.tracker_rejected}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_location}</label>
                          <input
                            type="text"
                            value={newApp.location}
                            onChange={(e) => setNewApp({...newApp, location: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                            placeholder={t.tracker_location_ph}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_salary}</label>
                          <input
                            type="text"
                            value={newApp.salary}
                            onChange={(e) => setNewApp({...newApp, salary: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                            placeholder={t.tracker_salary_ph}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_notes}</label>
                        <textarea
                          value={newApp.notes}
                          onChange={(e) => setNewApp({...newApp, notes: e.target.value})}
                          className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all min-h-[80px]"
                          placeholder={t.tracker_notes_ph}
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setIsAddingApp(false)}
                          className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] hover:bg-black/5 transition-all"
                        >
                          {t.tracker_cancel}
                        </button>
                        <button
                          onClick={addApplication}
                          className="px-8 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                        >
                          {t.tracker_save}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {editingApp && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white border border-[#004225]/20 shadow-xl space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_company}</label>
                          <input
                            type="text"
                            value={editingApp.company}
                            onChange={(e) => setEditingApp({...editingApp, company: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_position}</label>
                          <input
                            type="text"
                            value={editingApp.position}
                            onChange={(e) => setEditingApp({...editingApp, position: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_status}</label>
                          <select
                            value={editingApp.status}
                            onChange={(e) => setEditingApp({...editingApp, status: e.target.value as any})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                          >
                            <option value="Wishlist">{t.tracker_wishlist}</option>
                            <option value="Applied">{t.tracker_applied}</option>
                            <option value="Interview">{t.tracker_interview}</option>
                            <option value="Offer">{t.tracker_offer}</option>
                            <option value="Rejected">{t.tracker_rejected}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_location}</label>
                          <input
                            type="text"
                            value={editingApp.location}
                            onChange={(e) => setEditingApp({...editingApp, location: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_salary}</label>
                          <input
                            type="text"
                            value={editingApp.salary}
                            onChange={(e) => setEditingApp({...editingApp, salary: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_notes}</label>
                        <textarea
                          value={editingApp.notes}
                          onChange={(e) => setEditingApp({...editingApp, notes: e.target.value})}
                          className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all min-h-[80px]"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setEditingApp(null)}
                          className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] hover:bg-black/5 transition-all"
                        >
                          {t.tracker_cancel}
                        </button>
                        <button
                          onClick={updateApplication}
                          className="px-8 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                        >
                          {t.tracker_update}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'].map((status) => (
                      <div key={status} className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">
                            {status === 'Wishlist' ? t.tracker_wishlist :
                             status === 'Applied' ? t.tracker_applied :
                             status === 'Interview' ? t.tracker_interview :
                             status === 'Offer' ? t.tracker_offer : t.tracker_rejected}
                          </h3>
                          <span className="text-[10px] font-mono text-[#9A9A94] bg-black/5 px-2 py-0.5 rounded-full">
                            {applications.filter(a => a.status === status).length}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-[100px]">
                          {applications.filter(a => a.status === status).map((app) => (
                            <motion.div 
                              layoutId={app.id}
                              key={app.id}
                              className="p-4 bg-white border border-black/5 shadow-sm hover:border-[#004225]/20 transition-all group relative"
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <h4 className="text-xs font-bold text-[#1A1A18] truncate pr-4">{app.company}</h4>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                      onClick={() => setEditingApp(app)}
                                      className="p-1 text-[#004225]/60 hover:bg-[#004225]/5 transition-all"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      onClick={() => deleteApplication(app.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-[#6B6B66] font-light truncate">{app.position}</p>
                                {app.location && (
                                  <div className="flex items-center gap-1 text-[9px] text-[#9A9A94]">
                                    <MapPin size={10} />
                                    <span>{app.location}</span>
                                  </div>
                                )}
                                {app.salary && (
                                  <div className="flex items-center gap-1 text-[9px] text-[#004225]/60">
                                    <DollarSign size={10} />
                                    <span>{app.salary}</span>
                                  </div>
                                )}
                                {app.notes && (
                                  <div className="flex items-center gap-1 text-[9px] text-[#9A9A94] italic">
                                    <FileText size={10} />
                                    <span className="truncate max-w-[100px]">{t.tracker_notes_badge}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 pt-3 border-t border-black/5 flex justify-between items-center">
                                <div className="flex gap-1">
                                  {['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'].filter(s => s !== status).slice(0, 2).map(s => (
                                    <button 
                                      key={s}
                                      onClick={() => updateApplicationStatus(app.id, s)}
                                      className="text-[8px] font-bold uppercase tracking-tighter text-[#004225]/40 hover:text-[#004225] transition-colors"
                                    >
                                      → {s === 'Wishlist' ? 'W' : s === 'Applied' ? 'B' : s === 'Interview' ? 'I' : s === 'Offer' ? 'A' : 'X'}
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[8px] text-[#9A9A94] font-mono">
                                  {app.updatedAt?.toDate ? app.updatedAt.toDate().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }) : ''}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                          {applications.filter(a => a.status === status).length === 0 && (
                            <div className="h-20 border border-dashed border-black/5 flex items-center justify-center">
                              <span className="text-[9px] text-[#9A9A94] uppercase tracking-widest opacity-30">{t.tracker_empty}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Tools */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h2 className="text-xl font-serif">{t.quick_tools}</h2>
                    <button
                      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border-b border-[#004225]/20 pb-1"
                    >
                      {t.all_tools}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    {tools.slice(0, 6).map((tool, qi) => (
                      <motion.div
                        key={tool.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + qi * 0.06, duration: 0.35 }}
                        onClick={() => handleToolClick(tool.id)}
                        className="p-4 md:p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 transition-all group cursor-pointer flex flex-col items-center text-center space-y-3 md:space-y-4 shadow-sm"
                      >
                        <div className="w-10 h-10 bg-[#FDFCFB] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#FAFAF8] group-hover:bg-[#004225] group-hover:text-white transition-all relative">
                          {tool.icon}
                          {((tool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                            (tool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 flex items-center justify-center text-[#004225] shadow-sm">
                              <Lock size={8} />
                            </div>
                          )}
                        </div>
                        <h4 className="text-[11px] md:text-xs font-bold uppercase tracking-wider group-hover:text-[#004225] transition-colors line-clamp-2">{tool.title}</h4>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Interview Live CTA Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  onClick={() => handleToolClick('interview-live')}
                  className="relative overflow-hidden p-6 bg-[#004225] text-white cursor-pointer group hover:bg-[#00331d] transition-colors"
                >
                  <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px'}} />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 flex items-center justify-center shrink-0">
                        <Headphones size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5">{t.badge_new}</span>
                        </div>
                        <h3 className="text-base font-serif">{t.tools_data['interview-live']?.title || 'Live Interview Coach'}</h3>
                        <p className="text-xs text-white/60 font-light mt-0.5">{t.interview_live_promo}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>

                {/* Recent Activity / Documents */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h2 className="text-xl font-serif">{t.recent_docs}</h2>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border-b border-[#004225]/20 pb-1">{t.view_all}</button>
                  </div>
                  <div className="grid gap-4">
                    {toolHistory.length > 0 ? (
                      toolHistory.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-6 bg-white border border-black/5 hover:border-[#004225]/20 transition-all flex items-center justify-between group cursor-pointer"
                          onClick={() => {
                            const tool = tools.find(t => t.id === item.toolId);
                            if (tool) {
                              setActiveTool(tool);
                              setToolResult(item.result);
                              setToolInput(item.input);
                            }
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#FDFCFB] flex items-center justify-center text-[#004225]">
                              {tools.find(t => t.id === item.toolId)?.icon || <FileText size={20} />}
                            </div>
                            <div>
                              <h4 className="font-medium group-hover:text-[#004225] transition-colors">{tools.find(t => t.id === item.toolId)?.title || item.toolTitle}</h4>
                              <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('de-CH') : t.time_just_now}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-[#9A9A94] group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))
                    ) : (
                      <div className="p-12 bg-white border border-dashed border-black/10 text-center space-y-4">
                        <div className="w-12 h-12 bg-[#FDFCFB] flex items-center justify-center text-2xl mx-auto opacity-30">📄</div>
                        <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94] font-light">{t.docs_empty}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar / Stella Context */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-8 bg-[#004225] text-white space-y-6">
                  <h3 className="text-xl font-serif">{t.stella_context_title}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${cvContext ? 'bg-[#059669]' : 'bg-red-500'} animate-pulse`} />
                      <span className="text-xs font-light">{cvContext ? t.stella_context_cv_ready : t.stella_context_no_cv}</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-60">
                      <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-[#059669]' : backendStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Backend: {backendStatus}</span>
                    </div>
                    <CVDropzone 
                      onFileAccepted={processFile} 
                      isUploading={isUploading} 
                      t={t} 
                    />
                  </div>
                  {cvContext && (
                    <div className="pt-6 border-t border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">{t.stella_context_focus}</p>
                      <div className="flex flex-wrap gap-2">
                        {['Präzision', 'Schweizer Markt', 'ATS-Optimiert'].map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/5 text-[8px] font-bold uppercase tracking-widest border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border border-black/5 bg-white space-y-6">
                  <h3 className="text-lg font-serif">{t.stella_roadmap}</h3>
                  <div className="space-y-4">
                    {isGeneratingRoadmap ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-4 bg-black/5 animate-pulse rounded" />
                        ))}
                      </div>
                    ) : careerRoadmap.length > 0 ? (
                      careerRoadmap.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#004225]/10 flex items-center justify-center text-[10px] font-bold text-[#004225] shrink-0">{i + 1}</div>
                          <p className="text-xs text-[#5C5C58] font-light">{step.replace(/^\d+\.\s*/, '')}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] font-light italic">{t.stella_roadmap_empty}</p>
                    )}
                  </div>
                </div>

                <div className="p-8 border border-[#004225]/10 dark:border-[#FAFAF8]/10 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 space-y-6 transition-colors">
                  <h3 className="text-lg font-serif text-[#004225] dark:text-[#FAFAF8]">{t.stella_insights}</h3>
                  <div className="space-y-4">
                    {latestAnalysis ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_market_score}</span>
                          <span className="text-lg font-serif text-[#004225]">{latestAnalysis.score}/100</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_top_keywords}</p>
                          <div className="flex flex-wrap gap-1">
                            {latestAnalysis.keywords.slice(0, 5).map((k: string) => (
                              <span key={k} className="px-2 py-0.5 bg-[#004225]/10 text-[8px] font-medium text-[#004225]">{k}</span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_best_match}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-light text-[#004225]/80">{latestAnalysis.industryMatch}</p>
                            <span className="px-1 py-0.5 bg-[#004225]/5 border border-[#004225]/10 text-[6px] font-bold uppercase tracking-tighter text-[#004225]/60">NOGA Standard</span>
                          </div>
                        </div>
                        {latestAnalysis.linguisticFixes && latestAnalysis.linguisticFixes.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-[#004225]/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_ch_corrections}</p>
                            <ul className="space-y-1">
                              {latestAnalysis.linguisticFixes.map((fix: string, i: number) => (
                                <li key={i} className="text-[9px] font-light text-[#004225]/80 leading-tight flex gap-1.5 items-start">
                                  <span className="text-[#004225] mt-0.5">✓</span>
                                  {fix}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {latestAnalysis.improvements && latestAnalysis.improvements.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-[#004225]/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_ch_tips}</p>
                            <ul className="space-y-1">
                              {latestAnalysis.improvements.map((imp: string, i: number) => (
                                <li key={i} className="text-[9px] font-light text-[#004225]/80 leading-tight flex gap-1.5 items-start">
                                  <span className="text-[#004225] mt-0.5">→</span>
                                  {imp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {latestAnalysis.optimizedSummary && (
                          <div className="space-y-2 pt-2 border-t border-[#004225]/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_short_profile}</p>
                            <p className="text-[10px] font-light text-[#004225]/80 leading-relaxed italic">
                              "{latestAnalysis.optimizedSummary}"
                            </p>
                          </div>
                        )}
                        {latestAnalysis.optimizedHighlights && (
                          <div className="space-y-2 pt-2 border-t border-[#004225]/10">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{t.stella_highlights}</p>
                              <button 
                                onClick={() => {
                                  const text = latestAnalysis.optimizedHighlights.join('\n');
                                  navigator.clipboard.writeText(text);
                                }}
                                className="p-1 hover:bg-[#004225]/10 rounded transition-colors text-[#004225]/60"
                                title="Kopieren"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            <ul className="space-y-2">
                              {latestAnalysis.optimizedHighlights.map((h: string, i: number) => (
                                <li key={i} className="text-[10px] font-light text-[#004225]/80 leading-relaxed flex gap-2">
                                  <span className="text-[#004225] font-bold">•</span>
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="pt-4 border-t border-[#004225]/10">
                          <details className="group">
                            <summary className="text-[8px] font-bold uppercase tracking-widest text-[#004225]/40 cursor-pointer hover:text-[#004225]/60 transition-colors list-none flex items-center gap-1">
                              <span className="group-open:rotate-90 transition-transform">▶</span>
                              {t.stella_raw_json}
                            </summary>
                            <pre className="mt-2 p-2 bg-[#004225]/5 text-[8px] font-mono text-[#004225]/60 overflow-x-auto custom-scrollbar">
                              {JSON.stringify(latestAnalysis, null, 2)}
                            </pre>
                          </details>
                        </div>
                        <button 
                          onClick={() => handleToolClick('cv-analysis')}
                          className="w-full py-2 border border-[#004225]/20 text-[10px] font-bold uppercase tracking-widest text-[#004225] hover:bg-[#004225]/5 transition-all"
                        >
                          {t.stella_full_analysis}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[#004225]/70 dark:text-[#FAFAF8]/70 font-light leading-relaxed">
                        {cvContext ? t.stella_insights_with_cv : t.stella_insights_no_cv}
                      </p>
                    )}
                  </div>
                </div>

                {salaryCalculations.length > 0 && (
                  <div className="p-8 border border-black/5 bg-white space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-serif">{t.salary_history}</h3>
                      <Coins size={18} className="text-[#004225]/40" />
                    </div>
                    <div className="space-y-4">
                      {salaryCalculations.map((calc) => (
                        <div key={calc.id} className="p-4 bg-[#FDFCFB] border border-black/5 space-y-2 group hover:border-[#004225]/20 transition-all">
                          <div className="flex justify-between items-start">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A18] truncate pr-4">{calc.jobTitle}</h4>
                            <span className="text-[8px] font-mono text-[#9A9A94]">{calc.createdAt?.toDate ? calc.createdAt.toDate().toLocaleDateString('de-CH') : ''}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-[#6B6B66]">
                            <span>{calc.industry}</span>
                            <span className="w-1 h-1 rounded-full bg-black/10" />
                            <span>{calc.canton}</span>
                          </div>
                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-[10px] font-serif text-[#004225]">CHF {calc.medianSalary.toLocaleString('de-CH')}</span>
                            <div className="flex gap-1">
                              <span className="text-[8px] text-[#9A9A94]">Range:</span>
                              <span className="text-[8px] font-mono text-[#9A9A94]">{calc.minSalary / 1000}k - {calc.maxSalary / 1000}k</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {activeView === 'jobs' && (
              <div className="space-y-12">
                <header>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">
                    {t.job_board_title}
                  </h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">
                    {t.job_board_desc}
                  </p>
                </header>
                <JobBoard />
              </div>
            )}

            {activeView === 'tools' && (
              <div className="space-y-12">
                <header>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">
                    {t.tools}
                  </h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">
                    {t.dashboard_desc}
                  </p>
                </header>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tools.map((tool) => (
                    <motion.div 
                      key={tool.id}
                      whileHover={{ y: -5 }}
                      onClick={() => handleToolClick(tool.id)}
                      className="p-6 md:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 transition-all group cursor-pointer shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-[#FDFCFB] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#00A854] group-hover:bg-[#004225] group-hover:text-white transition-all relative z-0">
                          <span className="relative z-0 flex items-center justify-center">{tool.icon}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/10 px-2 py-1">{tool.badge}</span>
                        </div>
                      </div>
                      <h3 className="text-lg md:text-xl font-medium mb-3 text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tool.title}</h3>
                      <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed mb-6 line-clamp-3">{tool.desc}</p>
                      <button className="text-xs font-bold uppercase tracking-widest text-[#004225] flex items-center gap-2 group/btn">
                        {t.tool_open} <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="px-6 lg:px-12 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto transition-colors">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-xs font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#FDFCFB] animate-pulse" />
              {t.hero_precision}
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif leading-[1.1] tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">
              {t.hero_intro} <br />
              <span className="italic text-[#004225] dark:text-[#FAFAF8]">{t.hero_title.split(' ').pop()}</span>
            </h1>
            <p className="text-lg text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed max-w-lg">
              {t.hero_desc}
            </p>
            {language === 'DE' ? (
              <div className="flex flex-nowrap items-center gap-x-1 overflow-x-auto">
                {([
                  ['1', 'Lebenslauf (CV) hochladen'],
                  ['2', 'KI-Analyse'],
                  ['3', 'Bewerbung optimieren'],
                  ['4', 'Interview meistern'],
                ] as [string, string][]).map(([num, label], i, arr) => (
                  <React.Fragment key={num}>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="w-4 h-4 rounded-full bg-[#004225] dark:bg-[#00A854] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{num}</span>
                      <span className="text-[11px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] whitespace-nowrap">{label}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-[#9A9A94] text-[11px] select-none flex-shrink-0 px-0.5">→</span>}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light">{t.cv_info}</p>
            )}
            <div className="flex flex-col gap-5 w-full max-w-md">
              <CVDropzone
                onFileAccepted={processFile}
                isUploading={isUploading}
                t={t}
                variant="light"
                onClickOverride={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
              />

              {/* Primary CTA */}
              <button
                onClick={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
                className="w-full bg-[#004225] text-white px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all flex items-center justify-center gap-3 group shadow-lg shadow-[#004225]/20"
              >
                {t.cta_free}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 3-step funnel */}
              <div className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-[#004225] dark:text-[#00A854]">
                  <span className="w-4 h-4 bg-[#004225] dark:bg-[#00A854] text-white text-[8px] flex items-center justify-center rounded-full font-bold">1</span>
                  Gratis anmelden
                </span>
                <ArrowRight size={9} className="text-[#9A9A94]" />
                <span className="flex items-center gap-1.5 text-[#5C5C58] dark:text-[#9A9A94]">
                  <span className="w-4 h-4 bg-black/10 dark:bg-white/10 text-[#4A4A45] dark:text-[#FAFAF8] text-[8px] flex items-center justify-center rounded-full font-bold">2</span>
                  Plan wählen
                </span>
                <ArrowRight size={9} className="text-[#9A9A94]" />
                <span className="flex items-center gap-1.5 text-[#5C5C58] dark:text-[#9A9A94]">
                  <span className="w-4 h-4 bg-black/10 dark:bg-white/10 text-[#4A4A45] dark:text-[#FAFAF8] text-[8px] flex items-center justify-center rounded-full font-bold">3</span>
                  Karriere starten
                </span>
              </div>

              {/* Secondary links */}
              <div className="flex items-center justify-center gap-4 text-xs text-[#9A9A94]">
                <button
                  onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                  className="hover:text-[#004225] dark:hover:text-[#00A854] transition-colors"
                >
                  {t.nav_login}
                </button>
                <span className="w-px h-3 bg-black/10 dark:bg-white/10" />
                <a href="#pricing" className="hover:text-[#004225] dark:hover:text-[#00A854] transition-colors font-medium">
                  Ab CHF 19.90/Mo — Pläne ansehen →
                </a>
              </div>
            </div>

            {isUploading && (
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94]">
                  <span>{t.upload_analyzing}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#004225] dark:bg-[#FDFCFB]"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {cvContext && !isUploading && (
              <div className="flex items-center gap-2 text-[#059669] text-xs font-medium">
                <CheckCircle2 size={14} />
                <span>{t.upload_done}</span>
              </div>
            )}
            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-12">
              <div>
                <span className="block text-3xl font-serif text-[#004225] dark:text-[#00A854]">CH</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">Swiss Made</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">89%</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">{t.hero_success_rate}</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">3×</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">{t.hero_more_interviews}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 p-8 shadow-2xl relative z-10 transition-colors">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-black/5 dark:border-white/5">
                <div className="w-12 h-12 bg-[#004225] flex items-center justify-center text-white font-serif text-xl">S</div>
                <div>
                  <h3 className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{t.stella_name}</h3>
                  <p className="text-xs text-[#059669] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    {t.stella_online}
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="bg-[#FDFCFB] dark:bg-[#2A2A26] p-4 text-sm font-light leading-relaxed max-w-[85%] text-[#1A1A18] dark:text-[#FAFAF8]">
                  Grüezi! Dein CV ist analysiert. Für das Interview bei der UBS solltest du auf die Frage "Warum UBS?" vorbereitet sein – ich zeige dir die optimale Antwort.
                </div>
                <div className="bg-[#004225] text-white p-4 text-sm font-light leading-relaxed max-w-[85%] ml-auto">
                  Super! Welche Fragen kommen noch? Und wie antworte ich am besten?
                </div>
                <div className="bg-[#FDFCFB] dark:bg-[#2A2A26] p-4 text-sm font-light leading-relaxed max-w-[85%] text-[#1A1A18] dark:text-[#FAFAF8]">
                  Starte den Interview-Coach – du erhältst 5 echte Fragen mit Musterantworten und deinem persönlichen Score.
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 px-4 flex items-center text-xs text-[#9A9A94] dark:text-[#5C5C58]">
                  {t.stella_input_ph}
                </div>
                <div className="w-10 h-10 bg-[#004225] flex items-center justify-center text-white">
                  <Send size={16} />
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 -z-10" />
          </motion.div>
        </section>
      ))}

      {/* --- MARKETING SECTIONS + FOOTER (hidden on legal pages) --- */}
      {activeView !== 'datenschutz' && activeView !== 'impressum' && activeView !== 'agb' && <>

      {/* --- TOOLS SHOWCASE SECTION --- */}
      <section className="px-6 lg:px-12 py-20 bg-[#FDFCFB] dark:bg-[#111110] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 text-[#004225] dark:text-[#FAFAF8] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.tools_section_badge}
            </div>
            <h2 className="text-3xl lg:text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-3">
              {t.tools_section_title}
            </h2>
            <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl mx-auto">
              {t.tools_section_desc}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {([
              { id: 'cv-analysis', icon: <Search size={18} />, pro: false },
              { id: 'interview', icon: <Mic size={18} />, pro: false },
              { id: 'cv-gen', icon: <FileText size={18} />, pro: false },
              { id: 'salary-calc', icon: <Coins size={18} />, pro: false },
              { id: 'cv-premium', icon: <Sparkles size={18} />, pro: true },
              { id: 'zeugnis', icon: <Shield size={18} />, pro: true },
              { id: 'linkedin-job', icon: <Linkedin size={18} />, pro: false },
              { id: 'career-roadmap', icon: <Compass size={18} />, pro: false },
            ] as { id: string; icon: React.ReactNode; pro: boolean }[]).map((tool, i) => (
              <div
                key={i}
                onClick={() => user ? handleToolClick(tool.id) : (setAuthTab('register'), setIsAuthModalOpen(true))}
                className="bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 p-5 hover:border-[#004225]/40 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 bg-[#004225]/8 dark:bg-[#FDFCFB]/8 flex items-center justify-center text-[#004225] dark:text-[#FAFAF8] group-hover:bg-[#004225] group-hover:text-white transition-colors">
                    {tool.icon}
                  </div>
                  {tool.pro && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#004225] dark:text-[#00A854] border border-[#004225]/20 dark:border-[#00A854]/30 px-1.5 py-0.5">Pro</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8] mb-1">{t.tools_data[tool.id]?.title}</p>
                <p className="text-xs text-[#9A9A94] font-light leading-relaxed">{t.tools_data[tool.id]?.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => user ? setActiveView('tools') : (setAuthTab('register'), setIsAuthModalOpen(true))}
              className="text-sm text-[#004225] dark:text-[#00A854] font-medium hover:underline underline-offset-4 transition-all"
            >
              {t.tools_section_cta}
            </button>
          </div>
        </div>
      </section>

      {/* --- WHY STELLIFY SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.comparison_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.comparison_title}</h2>
            <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light mt-4 max-w-2xl mx-auto">{t.comparison_subtitle}</p>
          </div>

          {/* Sales Arguments Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
            {t.why_stellify_points.map((point: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 dark:hover:border-[#FAFAF8]/20 transition-all group"
              >
                <div className="w-12 h-12 bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 flex items-center justify-center text-[#004225] dark:text-[#FAFAF8] mb-6 group-hover:scale-110 transition-transform">
                  {point.icon === 'Target' && <Target size={24} />}
                  {point.icon === 'ShieldCheck' && <ShieldCheck size={24} />}
                  {point.icon === 'Globe' && <Globe size={24} />}
                  {point.icon === 'Cpu' && <Cpu size={24} />}
                  {point.icon === 'Coins' && <Coins size={24} />}
                  {point.icon === 'Lock' && <Lock size={24} />}
                </div>
                <h3 className="text-xl font-serif mb-3 text-[#1A1A18] dark:text-[#FAFAF8]">{point.title}</h3>
                <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">
                  {point.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 border border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/5">
              <h3 className="text-lg font-medium text-red-900 dark:text-red-400 mb-6 flex items-center gap-2">
                <X size={20} className="text-red-500" />
                {t.comparison_bad_title}
              </h3>
              <ul className="space-y-4">
                {t.comparison_bad_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-red-800/70 dark:text-red-400/70 font-light">
                    <X size={14} className="text-red-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 border border-[#004225]/10 dark:border-[#FAFAF8]/10 bg-[#004225]/5 dark:bg-[#FDFCFB]/5">
              <h3 className="text-lg font-medium text-[#004225] dark:text-[#FAFAF8] mb-6 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#004225] dark:text-[#FAFAF8]" />
                {t.comparison_good_title}
              </h3>
              <ul className="space-y-4">
                {t.comparison_good_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-[#004225]/70 dark:text-[#FAFAF8]/70 font-light">
                    <CheckCircle2 size={14} className="text-[#004225] dark:text-[#FAFAF8] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- DATA SECURITY SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-[10px] font-bold tracking-widest uppercase mb-4">
                {t.security_badge}
              </div>
              <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-6 text-[#1A1A18] dark:text-[#FAFAF8]">{t.security_title}</h2>
              <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light text-lg leading-relaxed mb-8">
                {t.security_desc}
              </p>
              <div className="space-y-6">
                {[
                  { title: t.security_item_1_t, desc: t.security_item_1_d, icon: <Globe size={20} /> },
                  { title: t.security_item_2_t, desc: t.security_item_2_d, icon: <Lock size={20} /> },
                  { title: t.security_item_3_t, desc: t.security_item_3_d, icon: <Shield size={20} /> }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 flex items-center justify-center text-[#004225] dark:text-[#00A854] shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 text-[#1A1A18] dark:text-[#FAFAF8]">{item.title}</h4>
                      <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-[#004225]/5 border border-[#004225]/10 flex items-center justify-center p-12">
                <div className="w-full h-full border border-[#004225]/20 flex flex-col items-center justify-center space-y-6 bg-white dark:bg-[#1A1A18] shadow-2xl p-8">
                  <Shield size={64} className="text-[#004225]" />
                  <div className="text-center space-y-2">
                    <p className="text-xl font-serif">Swiss Data Safe</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">Certified Security Standards</p>
                  </div>
                  <div className="w-full pt-6 border-t border-black/5 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-lg font-serif">256</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">Bit AES</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-serif">CH</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">Hosting</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-serif">SSL</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">Secure</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative dots */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#004225]/10 -z-10" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#004225]/10 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* --- PROMO SPOT SECTION --- */}
      <section className="px-6 lg:px-12 py-32 bg-[#004225] text-white overflow-hidden relative">
        <div className="absolute inset-0">
          {/* 1. Base Mesh Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#004225] via-[#005a32] to-[#002e1a]" />
          
          {/* 2. Noise Texture */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
          
          {/* 3. Technical Grid Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          {/* 4. Animated Glows */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-[#FDFCFB] rounded-full blur-[140px]" 
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-[#FDFCFB] rounded-full blur-[160px]" 
          />

          {/* 5. Scanline Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div 
              animate={{ translateY: ['-100%', '100%'] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="w-full h-1/2 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-20"
            />
          </div>

          {/* 6. Artistic Career Journey Sketch - Professional Blueprint Style */}
          <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="sketchy-ultra" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
                </filter>
                <radialGradient id="fade-mask-pro" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="1" />
                  <stop offset="60%" stopColor="white" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
                <mask id="sketch-mask-pro">
                  <rect width="1000" height="1000" fill="url(#fade-mask-pro)" />
                </mask>
              </defs>
              <g mask="url(#sketch-mask-pro)" filter="url(#sketchy-ultra)" stroke="white" fill="none" strokeLinecap="round">
                {/* Main Career Trajectory - Elegant Curves */}
                <g strokeWidth="3" opacity="0.7">
                  <path d="M100,850 C250,800 350,850 500,700 S650,300 900,150" strokeDasharray="25,15" />
                  <path d="M105,855 C255,805 355,855 505,705 S655,305 905,155" opacity="0.2" strokeWidth="1" />
                </g>

                {/* Nodes / Milestones - Geometric & Professional */}
                <g strokeWidth="2.5">
                  <circle cx="100" cy="850" r="16" />
                  <circle cx="100" cy="850" r="6" fill="white" />
                  
                  <rect x="490" y="690" width="24" height="24" transform="rotate(45 500 700)" />
                  <circle cx="650" cy="450" r="12" />
                  
                  <path d="M885,135 L915,150 L885,165 Z" fill="white" />
                  <circle cx="900" cy="150" r="40" strokeDasharray="10,10" />
                </g>

                {/* Technical Callouts / Annotations */}
                <g opacity="0.5" strokeWidth="1.2">
                  <path d="M100,890 L500,890" strokeDasharray="3,6" />
                  <path d="M100,885 L100,895 M500,885 L500,895" />
                  
                  <path d="M940,150 L940,450" strokeDasharray="3,6" />
                  <path d="M935,150 L945,150 M935,450 L945,450" />
                  
                  {/* Abstract UI Elements Sketch */}
                  <rect x="150" y="250" width="160" height="100" rx="8" strokeDasharray="12,6" />
                  <line x1="170" y1="275" x2="270" y2="275" />
                  <line x1="170" y1="295" x2="240" y2="295" />
                  <circle cx="280" cy="320" r="14" />
                  
                  <rect x="720" y="620" width="120" height="140" rx="6" strokeDasharray="8,16" />
                  <path d="M735,650 L825,650 M735,675 L825,675 M735,700 L795,700" opacity="0.4" />
                </g>

                {/* Floating Particles / Data Points */}
                {[...Array(12)].map((_, i) => (
                  <circle 
                    key={`p-${i}`}
                    cx={100 + Math.random() * 800} 
                    cy={100 + Math.random() * 800} 
                    r={2 + Math.random() * 3} 
                    opacity={0.3 + Math.random() * 0.4}
                    fill="white"
                  />
                ))}
              </g>
            </svg>
          </div>

          <LazyVideo 
            src="https://player.vimeo.com/external/370337605.sd.mp4?s=55d55b05a3f628a6e2e56218a4a20e74e0f5a9f6&profile_id=164&oauth2_token_id=57447761" 
            autoPlay 
            muted 
            loop 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#004225] via-[#004225]/95 to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">{t.promo_spot}</span>
              <h2 className="text-5xl lg:text-7xl font-serif tracking-tight max-w-4xl mx-auto leading-[1.1]">
                {t.promo_title}
              </h2>
            </div>
            
            <button 
              onClick={() => setIsPromoOpen(true)}
              className="group flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-white text-[#004225] rounded-full flex items-center justify-center relative transition-transform duration-500 group-hover:scale-110">
                <Play size={36} fill="currentColor" className="ml-1" />
                <div className="absolute inset-0 rounded-full border border-white animate-ping opacity-20" />
                <div className="absolute -inset-4 rounded-full border border-white/10 scale-90 group-hover:scale-100 transition-transform duration-700" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 group-hover:text-white transition-colors">
                {t.promo_play}
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- EXAMPLES SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4">{t.examples_title}</h2>
            <p className="text-[#5C5C58] font-light max-w-2xl mx-auto">{t.examples_desc}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {[
              {
                title: language === 'DE' ? 'Standard-Anschreiben' : language === 'FR' ? 'Lettre de motivation standard' : language === 'IT' ? 'Lettera di candidatura standard' : 'Standard Cover Letter',
                before: language === 'DE' ? 'Ich interessiere mich für die Stelle als Projektleiter. Ich habe viel Erfahrung und bin motiviert.' : language === 'FR' ? 'Je suis intéressé par le poste de chef de projet. J\'ai beaucoup d\'expérience et je suis motivé.' : language === 'IT' ? 'Sono interessato alla posizione di project manager. Ho molta esperienza e sono motivato.' : 'I am interested in the project manager position. I have a lot of experience and I am motivated.',
                after: language === 'DE' ? 'Mit meiner fundierten Expertise in der Leitung komplexer Infrastrukturprojekte im Raum Zürich bringe ich die nötige Präzision und das Schweizer Qualitätsbewusstsein mit, um Ihre ambitionierten Ziele bei der [Firma] nachhaltig zu unterstützen.' : language === 'FR' ? 'Avec mon expertise approfondie dans la direction de projets d\'infrastructure complexes dans la région de Zurich, j\'apporte la précision nécessaire et la conscience de la qualité suisse pour soutenir durablement vos objectifs ambitieux chez [Entreprise].' : language === 'IT' ? 'Con la mia profonda esperienza nella direzione di complessi progetti infrastrutturali nell\'area di Zurigo, porto la precisione necessaria e la consapevolezza della qualità svizzera per supportare in modo sostenibile i tuoi obiettivi ambiziosi presso [Azienda].' : 'With my deep expertise in leading complex infrastructure projects in the Zurich area, I bring the necessary precision and Swiss quality awareness to sustainably support your ambitious goals at [Company].',
                tag: 'Precision'
              },
              {
                title: language === 'DE' ? 'Lebenslauf-Highlight' : language === 'FR' ? 'Point fort du CV' : language === 'IT' ? 'Punto di forza del CV' : 'CV Highlight',
                before: language === 'DE' ? 'Verantwortlich für das Team und die Budgetplanung.' : language === 'FR' ? 'Responsable de l\'équipe et de la planification budgétaire.' : language === 'IT' ? 'Responsabile del team e della pianificazione del budget.' : 'Responsible for the team and budget planning.',
                after: language === 'DE' ? 'Strategische Führung eines interdisziplinären Teams von 12 Spezialisten; Optimierung der Budgeteffizienz um 15% durch Einführung eines Lean-Management-Prozesses nach Schweizer Standards.' : language === 'FR' ? 'Direction stratégique d\'une équipe interdisciplinaire de 12 spécialistes ; optimisation de l\'efficacité budgétaire de 15% grâce à l\'introduction d\'un processus de gestion lean selon les normes suisses.' : language === 'IT' ? 'Direzione strategica di un team interdisciplinare di 12 specialisti; ottimizzazione dell\'efficienza del budget del 15% attraverso l\'introduzione di un processo di gestione lean secondo gli standard svizzeri.' : 'Strategic leadership of an interdisciplinary team of 12 specialists; optimization of budget efficiency by 15% through the introduction of a lean management process according to Swiss standards.',
                tag: 'Impact'
              }
            ].map((ex, i) => (
              <div key={i} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{ex.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] bg-[#004225]/5 px-2 py-1">{ex.tag}</span>
                </div>
                <div className="grid gap-4">
                  <div className="p-6 bg-[#FDFCFB] border border-black/5 relative">
                    <span className="absolute -top-2 -left-2 px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold uppercase tracking-widest">Standard</span>
                    <p className="text-sm text-[#9A9A94] italic">"{ex.before}"</p>
                  </div>
                  <div className="p-6 bg-[#004225]/5 border border-[#004225]/20 relative">
                    <span className="absolute -top-2 -left-2 px-2 py-0.5 bg-[#004225] text-white text-[8px] font-bold uppercase tracking-widest">Stellify AI</span>
                    <p className="text-sm text-[#004225] font-medium leading-relaxed">"{ex.after}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SUCCESS STORIES SECTION --- */}
      <section id="success" className="px-6 lg:px-12 py-24 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">{t.success_title}</h2>
            <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-2xl mx-auto">{t.success_desc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(t.testimonials as { name: string; role: string; city: string; quote: string }[]).map((story, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 shadow-xl rounded-2xl space-y-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Quote size={48} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar name={story.name} color={i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-rose-500' : 'bg-amber-500'} src={[
                      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'
                    ][i]} />
                    <div className="absolute -bottom-1 -right-1 bg-[#004225] text-white rounded-full p-0.5 border-2 border-white">
                      <CheckCircle2 size={10} />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A18] dark:text-[#FAFAF8]">{story.name}</h4>
                    <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest font-medium">{story.role}</p>
                    <p className="text-[9px] text-[#004225] font-bold uppercase tracking-widest">{story.city}</p>
                  </div>
                </div>
                <p className="text-sm text-[#5C5C58] font-light italic leading-relaxed relative z-10">"{story.quote}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className="text-[#004225]" fill="currentColor" />)}
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#004225]/40">{t.testimonial_verified}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TOOLS GRID --- */}
      <section id="features" className="px-6 lg:px-12 py-24 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
                {t.tools_badge}
              </div>
              <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.tools_title}</h2>
            </div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hidden md:block text-sm font-medium text-[#004225] dark:text-[#00A854] border-b border-[#004225] dark:border-[#00A854] pb-1 hover:opacity-70 transition-opacity"
            >{t.tools_view_all}</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <motion.div 
                key={tool.id}
                whileHover={{ y: -5 }}
                onClick={() => handleToolClick(tool.id)}
                className="p-6 md:p-8 bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 dark:hover:border-[#004225]/40 transition-all group cursor-pointer shadow-sm"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-[#FDFCFB] dark:bg-[#2A2A26] flex items-center justify-center text-[#004225] dark:text-[#00A854] group-hover:bg-[#004225] group-hover:text-white transition-all relative z-0">
                    <span className="relative z-0 flex items-center justify-center">{tool.icon}</span>
                    {((tool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                      (tool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/10 flex items-center justify-center text-[#004225] dark:text-[#00A854] shadow-sm z-10">
                        <Lock size={10} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/10 px-2 py-1">{tool.badge}</span>
                    {tool.type === 'ultimate' && (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-100">Ultimate</span>
                    )}
                    {tool.type === 'pro' && (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 border border-blue-100">Pro</span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg md:text-xl font-medium mb-3 text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tool.title}</h3>
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed mb-6 line-clamp-3">{tool.desc}</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToolClick(tool.id);
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-[#004225] flex items-center gap-2 group/btn"
                >
                  {isGeneratingApp && tool.id === 'cv-gen' ? (language === 'DE' ? 'Wird generiert...' : language === 'FR' ? 'En cours...' : language === 'IT' ? 'Generazione...' : 'Generating...') : t.tool_open}
                  <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- MARKET POTENTIAL --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.market_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.market_title}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: t.market_1_t, desc: t.market_1_d, icon: <TrendingUp size={22} /> },
              { title: t.market_2_t, desc: t.market_2_d, icon: <Activity size={22} /> },
              { title: t.market_3_t, desc: t.market_3_d, icon: <Cpu size={22} /> },
              { title: t.market_4_t, desc: t.market_4_d, icon: <Shield size={22} /> }
            ].map((item, i) => (
              <div key={i} className="p-8 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 transition-colors">
                <div className="w-10 h-10 bg-[#004225]/8 dark:bg-[#004225]/20 flex items-center justify-center text-[#004225] dark:text-[#00A854] mb-6">
                  {item.icon}
                </div>
                <h4 className="font-medium mb-3 text-[#1A1A18] dark:text-[#FAFAF8]">{item.title}</h4>
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="px-6 lg:px-12 py-24 bg-[#1A1A18] text-white relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070" 
            alt="Pricing Background"
            className="w-full h-full object-cover opacity-10 grayscale mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A18] via-[#1A1A18]/90 to-[#1A1A18]" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/40 text-[10px] font-bold tracking-widest uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
              Live Payment System
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-8">{t.pricing_title}</h2>
            
            {subscriptionError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-red-400 mt-0.5 shrink-0 text-base">⚠️</span>
                  <div className="min-w-0">
                    <p className="text-red-300 text-sm font-semibold">Zahlung konnte nicht verarbeitet werden</p>
                    <p className="text-red-400/80 text-xs mt-1 break-words">{subscriptionError}</p>
                    <p className="text-red-400/60 text-xs mt-1.5">Hilfe: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support.stellify@gmail.com&su=Stellify+Support+Anfrage&body=Hallo+Support-Team," target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300">support.stellify@gmail.com</a></p>
                  </div>
                </div>
                <button onClick={() => setSubscriptionError('')} className="text-red-400/60 hover:text-red-400 shrink-0 mt-0.5">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 text-xs font-medium rounded-full transition-all ${billingCycle === 'monthly' ? 'bg-white text-black' : 'text-white/60 hover:text-white/80'}`}
                >
                  {t.pricing_monthly}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2 text-xs font-medium rounded-full transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white text-black' : 'text-white/60 hover:text-white/80'}`}
                >
                  {t.pricing_yearly}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-black/10 text-black' : 'bg-white/15 text-white'}`}>
                    −17%
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-white/40 font-light">
                {billingCycle === 'monthly'
                  ? (language === 'DE' ? '→ Jährlich wählen und 2 Monate gratis sparen' : language === 'FR' ? '→ Choisir annuel et économiser 2 mois' : language === 'IT' ? '→ Scegli annuale e risparmia 2 mesi' : '→ Choose yearly and save 2 months')
                  : (language === 'DE' ? '✓ Jahresabo aktiv – du sparst 2 Monate' : language === 'FR' ? '✓ Abonnement annuel – vous économisez 2 mois' : language === 'IT' ? '✓ Abbonamento annuale – risparmi 2 mesi' : '✓ Annual plan active – you save 2 months')}
              </p>
            </div>
          </div>

          {/* TRUST BAR */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Shield size={13} className="text-white/40" />
              <span>{language === 'DE' ? '7-Tage Geld-zurück-Garantie' : language === 'FR' ? 'Garantie 7 jours' : language === 'IT' ? 'Garanzia 7 giorni' : '7-day money-back guarantee'}</span>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Lock size={13} className="text-white/40" />
              <span>SSL-gesichert · 256-bit</span>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <CreditCard size={13} className="text-white/40" />
              <span>{language === 'DE' ? 'Sichere Zahlung via Stripe' : language === 'FR' ? 'Paiement sécurisé via Stripe' : language === 'IT' ? 'Pagamento sicuro via Stripe' : 'Secure payment via Stripe'}</span>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <CheckCircle2 size={13} className="text-white/40" />
              <span>{language === 'DE' ? 'Keine automatische Verlängerung' : language === 'FR' ? 'Pas de renouvellement automatique' : language === 'IT' ? 'Nessun rinnovo automatico' : 'No automatic renewal'}</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* GRATIS */}
            <div className="p-10 bg-white/5 border border-white/10 flex flex-col">
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 letter-spacing-widest">Gratis</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF 0</span>
                  <span className="text-white/70 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                <p className="text-xs text-white/70 mt-2 font-light">{t.pricing_gratis_desc}</p>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {t.pricing_free_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-light text-white/70">
                    <CheckCircle2 size={14} className="text-white/30 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => user ? setActiveView('dashboard') : (setAuthTab('register'), setIsAuthModalOpen(true))}
                className="w-full py-4 border border-white/20 hover:bg-white hover:text-black transition-all text-sm font-medium"
              >{user ? t.dashboard : t.pricing_cta_free}</button>
            </div>

            {/* PRO */}
            <div className="p-10 bg-[#004225]/10 border-2 border-[#004225] relative flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">{t.pricing_recommended}</div>
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Pro</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF {prices.pro}</span>
                  <span className="text-white/70 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-semibold">−17%</span>
                    <span className="text-white/70 text-xs">· CHF 178.80/{language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year'}</span>
                  </div>
                )}
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {t.pricing_pro_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-white">
                    <CheckCircle2 size={14} className="text-white/50 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleSubscription('pro')}
                disabled={isSubscribing}
                className="w-full py-4 bg-[#004225] hover:bg-[#00331d] transition-all text-sm font-medium disabled:opacity-50"
              >
                {isSubscribing ? '...' : t.pricing_cta_pro}
              </button>
            </div>

            {/* ULTIMATE */}
            <div className="p-10 bg-white/5 border border-white/10 flex flex-col">
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Ultimate ♾️</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF {prices.ultimate}</span>
                  <span className="text-white/70 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-semibold">−20%</span>
                    <span className="text-white/60 text-xs">· CHF 478.80/{language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year'}</span>
                  </div>
                )}
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {t.pricing_ultimate_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-light text-white/70">
                    <CheckCircle2 size={14} className="text-[#D4AF37]" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleSubscription('ultimate')}
                disabled={isSubscribing}
                className="w-full py-4 border border-white/20 hover:bg-white hover:text-black transition-all text-sm font-medium disabled:opacity-50"
              >
                {isSubscribing ? '...' : t.pricing_cta_ultimate}
              </button>
            </div>
          </div>

          {/* VALUE BOX */}
          <div className="max-w-3xl mx-auto p-8 border border-[#004225]/30 bg-[#004225]/5 rounded-none mb-16">
            <h3 className="text-xl font-serif mb-6 text-center">{t.value_title}</h3>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
              {t.value_items.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm text-white/60 font-light">
                  <CheckCircle2 size={14} className="text-[#004225] mt-1 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* PAYMENT METHODS */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.payment_title}</p>
              <div className="h-[1px] w-12 bg-white/10" />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded">
                <Lock size={10} className="text-[#004225]" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">Stripe Secure</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              {['Twint', 'Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay', 'SEPA', 'PostFinance', 'Klarna'].map(p => (
                <div key={p} className="px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest">{p}</div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 mt-6">{t.payment_secure}</p>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how" className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.how_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.how_it_works}</h2>
            <p className="text-[#4A4A45] dark:text-[#9A9A94] font-light mt-4 max-w-2xl mx-auto">
              {t.how_desc}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: t.how_1_t, desc: t.how_1_d },
              { step: '02', title: t.how_2_t, desc: t.how_2_d },
              { step: '03', title: t.how_3_t, desc: t.how_3_d }
            ].map((item, i) => (
              <div key={i} className="relative p-8 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 group hover:border-[#004225]/30 dark:hover:border-[#004225]/40 transition-all">
                <div className="text-5xl font-serif text-[#004225]/10 dark:text-[#004225]/20 mb-6 group-hover:text-[#004225]/20 dark:group-hover:text-[#004225]/40 transition-all">{item.step}</div>
                <h3 className="text-xl font-medium mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">{item.title}</h3>
                <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.faq_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.faq_subtitle}</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group border-b border-black/5 dark:border-white/5 pb-4">
                <summary className="flex justify-between items-center cursor-pointer list-none py-4">
                  <span className="text-lg font-medium text-[#1A1A18] dark:text-[#FAFAF8] group-open:text-[#004225] dark:group-open:text-[#00A854] transition-colors">{faq.q}</span>
                  <span className="text-2xl font-light text-[#1A1A18] dark:text-[#FAFAF8] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed pb-4">{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-sm text-[#9A9A94] font-light">
              {t.faq_contact} <a href="mailto:support.stellify@gmail.com" className="text-[#004225] font-medium border-b border-[#004225]/20">support.stellify@gmail.com</a>
            </p>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="px-6 lg:px-12 py-32 bg-[#004225] text-white text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-5xl lg:text-7xl font-serif tracking-tight leading-tight">{t.cta_final_title}</h2>
          <p className="text-white/60 font-light text-lg">{t.cta_final_desc}</p>
          <button
            onClick={() => user ? setActiveView('dashboard') : setIsAuthModalOpen(true)}
            className="bg-white text-[#004225] px-10 py-5 text-xl font-medium hover:bg-[#FDFCFB] transition-all inline-flex items-center gap-3 group"
          >
            {user ? t.dashboard : t.cta_final_btn}
            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* --- SUBSCRIPTION EXPIRY BANNER --- */}
      <AnimatePresence>
        {expiryBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-[900] bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertCircle size={16} className="shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-wider">
                {expiryBanner.daysLeft <= 0
                  ? (language === 'DE' ? 'Dein Abonnement ist abgelaufen. Jetzt verlängern.' : language === 'FR' ? 'Votre abonnement a expiré. Renouvelez maintenant.' : language === 'IT' ? 'Il tuo abbonamento è scaduto. Rinnova ora.' : 'Your subscription has expired. Renew now.')
                  : expiryBanner.daysLeft === 1
                    ? (language === 'DE' ? 'Dein Abo läuft morgen ab — jetzt verlängern!' : language === 'FR' ? 'Votre abonnement expire demain — renouvelez maintenant !' : language === 'IT' ? 'Il tuo abbonamento scade domani — rinnova ora!' : 'Your subscription expires tomorrow — renew now!')
                    : (language === 'DE' ? `Dein Abo läuft in ${expiryBanner.daysLeft} Tagen ab.` : language === 'FR' ? `Votre abonnement expire dans ${expiryBanner.daysLeft} jours.` : language === 'IT' ? `Il tuo abbonamento scade tra ${expiryBanner.daysLeft} giorni.` : `Your subscription expires in ${expiryBanner.daysLeft} days.`)
                }
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setActiveView('pricing'); setExpiryBanner(null); }}
                className="text-[10px] font-bold uppercase tracking-wider underline hover:no-underline"
              >
                {language === 'DE' ? 'Verlängern' : language === 'FR' ? 'Renouveler' : language === 'IT' ? 'Rinnova' : 'Renew'}
              </button>
              <button onClick={() => setExpiryBanner(null)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOAST NOTIFICATION --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-12 left-1/2 z-[1000] px-6 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3"
          >
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FOOTER --- */}
      <footer className="bg-[#1A1A18] text-white/50 px-6 lg:px-12 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-24">
            <div className="col-span-2 lg:col-span-2 space-y-6">
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-2xl font-serif tracking-tight text-white">
                Stell<span className="text-[#00A854]">ify</span>
              </a>
              <p className="text-sm font-light leading-relaxed max-w-xs">
                {t.footer_desc}
              </p>
              <div className="flex gap-3">
                <a href="https://www.linkedin.com/company/112954395" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/5 flex items-center justify-center text-white/40 hover:text-[#0A66C2] hover:bg-white/10 transition-colors">
                  <Linkedin size={16} />
                </a>
                <a href="https://www.instagram.com/stellify.ch/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/5 flex items-center justify-center text-white/40 hover:text-[#E1306C] hover:bg-white/10 transition-colors">
                  <Instagram size={16} />
                </a>
                <a href="https://www.tiktok.com/@stellify.ch" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.73a4.85 4.85 0 01-1.01-.04z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">{t.features}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'cv-optimizer') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">CV Optimizer</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'ats-sim') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">ATS Simulator</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'salary-calc') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">Salary Check</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'interview') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">Interview Coach</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">Company</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><a href="#success" className="hover:text-white transition-colors">{t.success_stories}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t.pricing}</a></li>
                <li><a href="mailto:support.stellify@gmail.com" className="hover:text-white transition-colors">{t.footer_contact}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">{t.footer_legal}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><button onClick={() => navigate('datenschutz')} className="hover:text-white transition-colors text-left">{t.footer_privacy}</button></li>
                <li><button onClick={() => navigate('agb')} className="hover:text-white transition-colors text-left">{t.footer_terms}</button></li>
                <li><button onClick={() => navigate('impressum')} className="hover:text-white transition-colors text-left">{t.footer_imprint}</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Stellify AI. {t.footer_rights}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#004225]" />
                Swiss Made
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#004225]" />
                Secure Data
              </div>
            </div>
          </div>
        </div>
      </footer>

      </> /* end marketing sections */}

      {/* Mobile Back-to-Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 left-6 z-50 md:hidden w-11 h-11 bg-[#004225] text-white flex items-center justify-center shadow-lg rounded-full"
        aria-label="Nach oben"
      >
        <ArrowLeft size={18} className="-rotate-90" />
      </button>

      {/* --- SEARCH OVERLAY --- */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[150] flex items-start justify-center pt-24 px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-[#1A1A18] w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden transition-colors"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center gap-4 dark:bg-[#2A2A26]">
                <Search className="text-[#004225] dark:text-[#FAFAF8]" size={20} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder={t.search_label}
                  className="flex-1 text-xl font-serif outline-none bg-transparent text-[#1A1A18] dark:text-[#FAFAF8]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedSearchIndex(prev => {
                        if (searchResults.length === 0) return -1;
                        return Math.min(prev + 1, searchResults.length - 1);
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedSearchIndex(prev => {
                        if (searchResults.length === 0) return -1;
                        return Math.max(prev - 1, 0);
                      });
                    } else if (e.key === 'Enter') {
                      // If a result is selected via arrow keys, navigate to it
                      const idx = selectedSearchIndex >= 0 ? selectedSearchIndex : (searchResults.length > 0 ? 0 : -1);
                      if (idx >= 0 && searchResults[idx]) {
                        const result = searchResults[idx];
                        if (result.type === 'profile') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          showToast(t.search_nav_profile);
                        } else if (result.type === 'tool') {
                          handleToolClick(result.id);
                        } else if (result.type === 'job') {
                          handleJobClick(result.id);
                        } else if (result.link) {
                          window.location.hash = result.link;
                        }
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      } else if (searchQuery.trim().length > 0) {
                        // No results → ask Stella
                        setIsStellaOpen(true);
                        setIsSearchOpen(false);
                        sendMessage(searchQuery);
                        setSearchQuery('');
                      }
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                    }
                  }}
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]">
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4 custom-scrollbar">
                {searchQuery.length < 2 ? (
                  <div className="py-8 px-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-4">{t.search_popular}</h5>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {['Software', 'Zürich', 'Lohn', 'CV Tipps', 'Interview'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSearchQuery(tag)}
                          className="px-3 py-1.5 bg-black/5 dark:bg-white/5 text-[11px] font-medium text-[#5C5C58] dark:text-[#FAFAF8] hover:bg-[#004225] hover:text-white transition-all rounded-md"
                        >
                          {tag}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate('jobs');
                          setJobFilters({ keyword: '', location: '', industry: 'Lehrstellen' });
                        }}
                        className="px-3 py-1.5 bg-[#004225] text-white text-[11px] font-bold hover:bg-[#00331d] transition-all rounded-md flex items-center gap-1.5"
                      >
                        🎓 Lehrstellen
                      </button>
                    </div>

                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-4">{t.search_quick}</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'cv-premium', title: t.tools_data['cv-premium'].title, icon: <Sparkles size={14} /> },
                        { id: 'salary-calc', title: t.tools_data['salary-calc'].title, icon: <Coins size={14} /> },
                        { id: 'interview', title: t.tools_data['interview'].title, icon: <Mic size={14} /> },
                        { id: 'cv-analysis', title: t.tools_data['cv-analysis'].title, icon: <Search size={14} /> }
                      ].map(action => (
                        <button
                          key={action.id}
                          onClick={() => {
                            handleToolClick(action.id);
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 hover:bg-[#004225]/5 dark:hover:bg-[#004225]/20 border border-transparent hover:border-[#004225]/20 transition-all rounded-lg text-left group"
                        >
                          <div className="w-8 h-8 bg-white dark:bg-black/20 flex items-center justify-center rounded-full text-[#004225] group-hover:scale-110 transition-transform">
                            {action.icon}
                          </div>
                          <span className="text-sm font-medium">{action.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-6 py-2">
                    {['profile', 'tool', 'job', 'tip', 'faq'].map(type => {
                      const items = searchResults.filter(item => item.type === type);
                      if (items.length === 0) return null;
                      return (
                        <div key={type} className="space-y-2">
                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] px-2 flex items-center gap-2">
                            {type === 'profile' && <UserIcon size={10} />}
                            {type === 'tool' && <Wrench size={10} />}
                            {type === 'job' && <Briefcase size={10} />}
                            {type === 'tip' && <Lightbulb size={10} />}
                            {type === 'faq' && <HelpCircle size={10} />}
                            {type === 'profile' ? t.search_type_profile : type === 'tool' ? t.search_type_tool : type === 'job' ? t.search_type_job : type === 'tip' ? t.search_type_tip : t.search_type_faq}
                          </h5>
                          <div className="grid gap-1">
                            {items.map((result, i) => {
                              const globalIndex = searchResults.indexOf(result);
                              const isSelected = globalIndex === selectedSearchIndex;
                              return (
                                <div 
                                  key={i}
                                  onClick={() => {
                                    if (result.type === 'profile') {
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                      showToast(t.search_nav_profile);
                                    } else if (result.type === 'tool') {
                                      handleToolClick(result.id);
                                    } else if (result.type === 'job') {
                                      handleJobClick(result.id);
                                    } else if (result.link) {
                                      window.location.hash = result.link;
                                    }
                                    setIsSearchOpen(false);
                                  }}
                                  className={`p-3 transition-all cursor-pointer group rounded-lg border-2 ${
                                    isSelected 
                                      ? 'bg-[#004225]/10 border-[#004225] dark:bg-[#004225]/30 dark:border-[#FAFAF8]/30 shadow-md' 
                                      : 'hover:bg-[#FDFCFB] dark:hover:bg-white/5 border-transparent hover:border-black/5 dark:hover:border-white/5'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-2">
                                      <h4 className={`text-sm font-bold transition-colors ${isSelected ? 'text-[#004225] dark:text-[#FAFAF8]' : 'group-hover:text-[#004225]'}`}>{result.title}</h4>
                                      {isSelected && (
                                        <span className="text-[8px] bg-[#004225] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">
                                          Enter
                                        </span>
                                      )}
                                    </div>
                                    {result.location && (
                                      <span className="text-[10px] text-[#9A9A94] flex items-center gap-1">
                                        <MapPin size={10} />
                                        {result.location}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light line-clamp-1">{result.content}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <Search size={24} className="text-[#9A9A94]" />
                    </div>
                    <div>
                      <p className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">{t.search_no_results}</p>
                      <p className="text-xs text-[#9A9A94] font-light">{t.search_no_results_desc}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#FDFCFB] dark:bg-[#2A2A26] border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                  {t.search_results.replace('{count}', searchResults.length.toString())}
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                    <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[8px]">ESC</span>
                    {t.search_close_label}
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${selectedSearchIndex >= 0 ? 'text-[#004225] dark:text-[#FAFAF8]' : 'text-[#9A9A94]'}`}>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] transition-colors ${selectedSearchIndex >= 0 ? 'bg-[#004225] text-white' : 'bg-black/5 dark:bg-white/10'}`}>ENTER</span>
                    {selectedSearchIndex >= 0
                      ? t.search_open_selection
                      : t.search_stella_advice
                    }
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- STELLA CHAT WINDOW --- */}
      <AnimatePresence>
        {isStellaOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[450px] h-[700px] max-w-[90vw] max-h-[80vh] bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 shadow-2xl z-[100] flex flex-col transition-colors"
          >
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#2A2A26]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#004225] flex items-center justify-center text-white font-serif">S</div>
                <div>
                  <h3 className="text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Stella</h3>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-[#059669] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#059669] animate-pulse" />
                      Online
                    </p>
                    {user?.role === 'pro' && (
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-[#004225] text-white text-[7px] font-bold uppercase tracking-widest rounded-sm">Pro</span>
                        <div className="w-8 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#004225]" 
                            style={{ width: `${Math.min(100, Math.round(((user?.dailyToolUses || 0) / 20) * 100))}%` }} 
                          />
                        </div>
                        <span className="text-[8px] font-bold text-[#9A9A94] uppercase tracking-tighter">
                          {Math.min(100, Math.round(((user?.dailyToolUses || 0) / 20) * 100))}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsStellaOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#004225]/5 dark:bg-[#FDFCFB]/5 p-3 border-b border-[#004225]/10 dark:border-[#FAFAF8]/10 flex items-center gap-3">
              <Shield size={14} className="text-[#004225] dark:text-[#FAFAF8]" />
              <p className="text-[10px] text-[#004225] dark:text-[#FAFAF8] font-medium uppercase tracking-widest">
                {t.stella_secure_data}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCFB]/50 dark:bg-[#1A1A18]/50 transition-colors">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 text-sm font-light leading-relaxed relative group ${
                    m.role === 'user' ? 'bg-[#004225] text-white' : 'bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-[#1A1A18] dark:text-[#FAFAF8]'
                  }`}>
                    {m.content}
                    {m.role === 'ai' && (
                      <div className="absolute -bottom-5 left-0 text-[8px] text-[#9A9A94] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {t.ai_notice}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-black/5 p-4 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#9A9A94] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#9A9A94] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-[#9A9A94] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#1A1A18]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={t.stella_placeholder}
                  className="flex-1 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 px-4 py-2 text-sm font-light outline-none focus:border-[#004225]/30 dark:focus:border-[#FAFAF8]/30 transition-all text-[#1A1A18] dark:text-[#FAFAF8]"
                />
                <button 
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 bg-[#004225] text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- STELLA FAB --- */}
      <button 
        onClick={() => setIsStellaOpen(prev => !prev)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#004225] text-white shadow-2xl flex items-center justify-center z-[100] group"
      >
        <div className="absolute inset-0 bg-[#004225] animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
        <span className="relative font-serif text-xl">S</span>
      </button>

      {/* --- TOOL MODAL --- */}
      <AnimatePresence>
        {activeTool && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-white dark:bg-[#1A1A18] w-full sm:max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors sm:rounded-none"
            >
              <div className="p-3 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#2A2A26] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-[#004225] text-white flex items-center justify-center">
                    {activeTool.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] truncate leading-tight">{activeTool.title}</h3>
                    <p className="text-[9px] sm:text-[10px] text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-widest font-bold opacity-80">{activeTool.badge}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTool(null); setParsedSalaryResult(null); setInterviewSession(null); setInterviewAnswer(''); }} className="p-2 shrink-0 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
                {/* Inputs */}
                <div className={`w-full lg:w-[340px] lg:shrink-0 p-4 sm:p-6 bg-[#FDFCFB] dark:bg-[#2A2A26] border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5 transition-colors relative overflow-y-auto max-h-[45vh] lg:max-h-none`}>
                  {((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                    (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-md flex flex-col items-center justify-start pt-12 p-8 text-center">
                      <div className="w-12 h-12 bg-[#004225]/10 flex items-center justify-center text-[#004225] mb-4 rounded-full shrink-0">
                        <Lock size={24} />
                      </div>
                      <h3 className="text-lg font-serif mb-2">
                        {activeTool.type === 'ultimate'
                          ? (language === 'FR' ? 'Outil Ultimate' : language === 'IT' ? 'Strumento Ultimate' : language === 'EN' ? 'Ultimate Tool' : 'Ultimate-Tool')
                          : (language === 'FR' ? 'Outil Pro' : language === 'IT' ? 'Strumento Pro' : language === 'EN' ? 'Pro Tool' : 'Pro-Tool')}
                      </h3>
                      <p className="text-[10px] text-[#5C5C58] font-light max-w-xs mb-4 leading-relaxed">
                        {activeTool.type === 'ultimate'
                          ? (language === 'FR' ? 'Cet outil fait partie de notre plan Ultimate. Obtenez un accès complet à toutes les fonctionnalités Stellify.'
                            : language === 'IT' ? 'Questo strumento fa parte del nostro piano Ultimate. Ottieni accesso completo a tutte le funzionalità di Stellify.'
                            : language === 'EN' ? 'This tool is part of our Ultimate plan. Get full access to all Stellify features.'
                            : 'Dieses Tool ist Teil unseres Ultimate-Pakets. Erhalte vollen Zugriff auf alle Stellify-Funktionen.')
                          : (language === 'FR' ? 'Cet outil fait partie de notre plan Pro. Accédez à plus de 20 outils de carrière.'
                            : language === 'IT' ? 'Questo strumento fa parte del nostro piano Pro. Accedi a oltre 20 strumenti di carriera.'
                            : language === 'EN' ? 'This tool is part of our Pro plan. Get access to 20+ career tools.'
                            : 'Dieses Tool ist Teil unseres Pro-Pakets. Erhalte Zugriff auf alle 20+ Karriere-Tools.')}
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-[200px]">
                        <button 
                          onClick={() => {
                            setActiveTool(null);
                            setParsedSalaryResult(null);
                            const pricingSection = document.getElementById('pricing');
                            pricingSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331D] transition-all"
                        >
                          {t.tool_see_plans}
                        </button>
                        <button
                          onClick={() => { setActiveTool(null); setParsedSalaryResult(null); setInterviewSession(null); setInterviewAnswer(''); }}
                          className="w-full py-3 border border-black/10 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all"
                        >
                          {t.tool_maybe_later}
                        </button>
                      </div>
                    </div>
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-[#004225] dark:text-[#FAFAF8]">{t.tool_inputs}</h4>
                  <div className="space-y-4">
                    {activeTool.inputs.map((input: any) => (
                      <div key={input.key}>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{input.label}</label>
                          <div className="flex items-center gap-3">
                            {input.key === 'linkedinProfile' && (
                              <button
                                onClick={() => linkedinImageInputRef.current?.click()}
                                disabled={isExtractingImage}
                                className="text-[10px] font-bold text-[#0A66C2] flex items-center gap-1 hover:underline disabled:opacity-50"
                              >
                                {isExtractingImage ? <RefreshCw size={10} className="animate-spin" /> : <ImageIcon size={10} />}
                                {isExtractingImage ? 'Wird analysiert...' : 'Screenshot'}
                              </button>
                            )}
                            {input.type === 'textarea' && (
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[10px] font-bold text-[#004225] dark:text-[#FAFAF8] flex items-center gap-1 hover:underline"
                              >
                                <FileText size={10} />
                                {t.tool_load_file}
                              </button>
                            )}
                          </div>
                        </div>
                        {input.type === 'textarea' ? (
                          <textarea
                            className="w-full p-4 bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#004225] dark:focus:border-[#FAFAF8] transition-all min-h-[120px] font-light text-[#1A1A18] dark:text-[#FAFAF8]"
                            placeholder={input.placeholder}
                            value={toolInput[input.key] || ''}
                            onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                          />
                        ) : input.type === 'select' ? (
                          <div>
                            <input
                              type="text"
                              list={`datalist-${input.key}`}
                              autoComplete="off"
                              className="w-full p-4 bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#004225] dark:focus:border-[#FAFAF8] transition-all font-light text-[#1A1A18] dark:text-[#FAFAF8]"
                              placeholder={input.placeholder}
                              value={toolInput[input.key] || ''}
                              onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                            />
                            <datalist id={`datalist-${input.key}`}>
                              {input.options?.map((opt: string) => (
                                <option key={opt} value={opt} />
                              ))}
                            </datalist>
                            <p className="mt-1.5 text-[10px] text-[#004225] dark:text-[#00A854] flex items-center gap-1.5 font-medium">
                              <span>✎</span>
                              Vorschläge wählen <span className="text-[#9A9A94] dark:text-[#5C5C58] font-normal">oder eigenen Text eintippen</span>
                            </p>
                          </div>
                        ) : (
                          <input
                            type={input.type}
                            className="w-full p-4 bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#004225] dark:focus:border-[#FAFAF8] transition-all font-light text-[#1A1A18] dark:text-[#FAFAF8]"
                            placeholder={input.placeholder}
                            value={toolInput[input.key] || ''}
                            onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                    {activeTool.id === 'salary-calc' && (
                      <div className="p-4 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 flex items-start gap-3">
                        <ShieldCheck size={16} className="text-[#004225] dark:text-[#FAFAF8] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed italic">
                          {t.salary_security_notice}
                        </p>
                      </div>
                    )}
                    {!cvContext && activeTool.id !== 'salary-calc' && activeTool.id !== 'zeugnis' && activeTool.id !== 'job-search' && (
                      <div className="p-4 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 text-[10px] text-[#004225] dark:text-[#FAFAF8] leading-relaxed">
                        {t.tool_no_cv}
                      </div>
                    )}

                    <div className="space-y-2">
                      <button 
                        onClick={processTool}
                        disabled={isProcessingTool || isToolLocked || isToolLimitReached || isDailyLimitReached}
                        className="w-full py-4 bg-[#004225] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#004225]/10"
                      >
                        {isProcessingTool ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t.tool_process}
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            {t.tool_generate}
                          </>
                        )}
                      </button>

                      {user && user.role !== 'unlimited' && user.role !== 'admin' && (
                        <div className="flex justify-between items-center px-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[#004225] rounded-full animate-pulse shadow-[0_0_8px_rgba(0,66,37,0.4)]" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5C5C58] dark:text-[#9A9A94]">
                              {user.role === 'pro'
                                ? `${50 - (user.toolUses || 0)} ${t.remaining}`
                                : `${3 - (user.toolUses || 0)} ${t.remaining}`
                              }
                            </span>
                          </div>
                          {user.role === 'pro' && (
                            <span className="text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8] opacity-60">
                              {t.dashboard_reset_monthly}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 p-4 sm:p-6 bg-white dark:bg-[#1A1A18] relative transition-colors overflow-y-auto custom-scrollbar min-h-[200px]">
                  {/* INTERACTIVE INTERVIEW SESSION */}
                  {activeTool.id === 'interview-live' && interviewSession && !isProcessingTool ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#004225] text-white flex items-center justify-center">
                            <Headphones size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">{interviewSession.questions[0] && !interviewSession.isComplete ? `${interviewSession.jobContext || toolInput.jobTitle}` : t.interview_complete}</h4>
                            <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest">{t.interview_question_of.replace('{current}', String(Math.min(interviewSession.currentQ + 1, 5)))}</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="flex gap-1">
                          {interviewSession.questions.map((_, i) => (
                            <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${i < interviewSession.answers.length ? 'bg-[#059669]' : i === interviewSession.currentQ && !interviewSession.isComplete ? 'bg-[#004225]' : 'bg-black/10 dark:bg-white/10'}`} />
                          ))}
                        </div>
                      </div>

                      {!interviewSession.isComplete ? (
                        <>
                          {/* Current Question */}
                          <div className="p-6 bg-[#004225] text-white space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{interviewSession.currentQ + 1}</div>
                              <p className="text-base font-light leading-relaxed">{interviewSession.questions[interviewSession.currentQ]?.q}</p>
                            </div>
                            <details className="group cursor-pointer">
                              <summary className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors list-none flex items-center gap-1 select-none">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                {t.interview_show_tip}
                              </summary>
                              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                <p className="text-xs text-white/70 font-light">{interviewSession.questions[interviewSession.currentQ]?.tip}</p>
                              </div>
                            </details>
                          </div>

                          {/* Previous answer feedback */}
                          {interviewSession.currentQ > 0 && interviewSession.feedbacks[interviewSession.currentQ - 1] && (
                            <div className="p-4 bg-[#059669]/5 border border-[#059669]/20 space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#059669]">{t.interview_feedback_prev}</p>
                              <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light">{interviewSession.feedbacks[interviewSession.currentQ - 1]}</p>
                            </div>
                          )}

                          {/* Answer Input */}
                          <div className="space-y-3 flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">
                              {t.interview_your_answer}
                            </label>
                            <div className="relative">
                              <textarea
                                value={interviewAnswer}
                                onChange={(e) => setInterviewAnswer(e.target.value)}
                                placeholder={t.interview_answer_placeholder}
                                className="w-full p-4 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#004225] transition-all min-h-[120px] font-light text-[#1A1A18] dark:text-[#FAFAF8] resize-none pr-14"
                              />
                              <button
                                onClick={() => {
                                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                                  if (!SpeechRecognition) { alert(t.interview_mic_unavailable); return; }
                                  const recognition = new SpeechRecognition();
                                  recognition.lang = language === 'DE' ? 'de-CH' : language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : 'en-US';
                                  recognition.interimResults = false;
                                  recognition.onresult = (event: any) => {
                                    const transcript = event.results[0][0].transcript;
                                    setInterviewAnswer(prev => prev ? prev + ' ' + transcript : transcript);
                                    setInterviewSession(prev => prev ? { ...prev, isRecording: false } : null);
                                  };
                                  recognition.onerror = () => setInterviewSession(prev => prev ? { ...prev, isRecording: false } : null);
                                  recognition.onend = () => setInterviewSession(prev => prev ? { ...prev, isRecording: false } : null);
                                  setInterviewSession(prev => prev ? { ...prev, isRecording: true } : null);
                                  recognition.start();
                                }}
                                className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${interviewSession.isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#004225]/10 hover:bg-[#004225]/20 text-[#004225] dark:text-[#FAFAF8]'}`}
                                title={t.interview_mic_answer}
                              >
                                <Mic size={14} />
                              </button>
                            </div>
                            {interviewSession.isRecording && (
                              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                                <Radio size={10} /> {t.interview_recording}
                              </p>
                            )}
                          </div>

                          {/* Submit Button */}
                          <button
                            disabled={!interviewAnswer.trim() || interviewSession.isEvaluating}
                            onClick={async () => {
                              if (!interviewAnswer.trim()) return;
                              setInterviewSession(prev => prev ? { ...prev, isEvaluating: true } : null);
                              const q = interviewSession.questions[interviewSession.currentQ];
                              let feedback = '';
                              try {
                                const evalRes = await authFetch('/api/process-tool', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    prompt: `Bewerte diese Interview-Antwort kurz (2-3 Sätze) auf Schweizer Hochdeutsch.\nFrage: "${q.q}"\nAntwort: "${interviewAnswer}"\nMusterantwort-Framework: "${q.model}"\nGib CONCRETES, kurzes Feedback: Was war gut? Was fehlt? Eine direkte Verbesserung.`,
                                    model: FLASH_MODEL
                                  })
                                });
                                const evalData = await evalRes.json();
                                feedback = evalData.text || '';
                              } catch {
                                feedback = t.interview_feedback_unavailable;
                              }
                              const newAnswers = [...interviewSession.answers, interviewAnswer];
                              const newFeedbacks = [...interviewSession.feedbacks, feedback];
                              const nextQ = interviewSession.currentQ + 1;
                              const isComplete = nextQ >= interviewSession.questions.length;
                              setInterviewSession(prev => prev ? {
                                ...prev,
                                answers: newAnswers,
                                feedbacks: newFeedbacks,
                                currentQ: nextQ,
                                isEvaluating: false,
                                isComplete,
                              } : null);
                              setInterviewAnswer('');
                            }}
                            className="w-full py-4 bg-[#004225] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {interviewSession.isEvaluating ? (
                              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.interview_evaluating}</>
                            ) : (
                              <>{t.interview_submit.replace('{n}', String(interviewSession.currentQ + 1))}</>
                            )}
                          </button>
                          {/* Model answer toggle */}
                          <details className="group">
                            <summary className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/50 cursor-pointer hover:text-[#004225] transition-colors list-none flex items-center gap-1 select-none">
                              <span className="group-open:rotate-90 transition-transform">▶</span>
                              {t.interview_show_model}
                            </summary>
                            <div className="mt-2 p-4 bg-[#004225]/5 border border-[#004225]/10 space-y-2">
                              <p className="text-xs font-light text-[#004225]/80 leading-relaxed">{interviewSession.questions[interviewSession.currentQ]?.model}</p>
                              <p className="text-[10px] text-red-600/70 font-light italic">{t.interview_common_mistake}{interviewSession.questions[interviewSession.currentQ]?.mistakes}</p>
                            </div>
                          </details>
                        </>
                      ) : (
                        /* COMPLETED STATE */
                        <div className="space-y-6 py-4">
                          <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-[#004225] text-white flex items-center justify-center mx-auto text-3xl">🎯</div>
                            <h3 className="text-2xl font-serif">{t.interview_complete_title}</h3>
                            <p className="text-sm text-[#6B6B66] font-light">{t.interview_complete_desc}</p>
                          </div>
                          <div className="space-y-4">
                            {interviewSession.questions.map((q, i) => (
                              <div key={i} className="border border-black/5 dark:border-white/5 p-4 space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="w-5 h-5 bg-[#004225] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                  <p className="text-xs font-medium">{q.q}</p>
                                </div>
                                {interviewSession.answers[i] && (
                                  <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light pl-7 italic">"{interviewSession.answers[i]}"</p>
                                )}
                                {interviewSession.feedbacks[i] && (
                                  <div className="pl-7 p-2 bg-[#059669]/5 border-l-2 border-[#059669]/30">
                                    <p className="text-[10px] text-[#059669] font-medium">{interviewSession.feedbacks[i]}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setInterviewSession(null);
                                setInterviewAnswer('');
                                setToolResult(null);
                              }}
                              className="flex-1 py-3 border border-[#004225]/20 text-[10px] font-bold uppercase tracking-widest text-[#004225] hover:bg-[#004225]/5 transition-all"
                            >
                              {t.interview_new}
                            </button>
                            <button
                              onClick={() => {
                                const summary = interviewSession.questions.map((q, i) => `Q${i+1}: ${q.q}\nAntwort: ${interviewSession.answers[i] || '-'}\nFeedback: ${interviewSession.feedbacks[i] || '-'}`).join('\n\n');
                                navigator.clipboard.writeText(summary);
                                showToast(t.tool_copied);
                              }}
                              className="flex-1 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all flex items-center justify-center gap-2"
                            >
                              <Copy size={12} />
                              {t.interview_copy_summary}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : isProcessingTool ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-sm z-10">
                      <div className="w-12 h-12 border-4 border-[#004225]/10 dark:border-[#FAFAF8]/10 border-t-[#004225] dark:border-t-[#FAFAF8] rounded-full animate-spin mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">{t.tool_analyzing}</p>
                    </div>
                  ) : toolResult ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225]">{t.tool_result}</h4>
                        <div className="flex gap-3">
                          <button 
                            onClick={downloadAsPDF}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] transition-colors flex items-center gap-1"
                          >
                            <FileText size={12} />
                            PDF
                          </button>
                          <button 
                            onClick={downloadAsWord}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] transition-colors flex items-center gap-1"
                          >
                            <FileUp size={12} />
                            Word
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(toolResult);
                              showToast(t.tool_copied);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] transition-colors"
                          >
                            {t.tool_copy}
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto font-serif text-lg leading-relaxed pr-4 custom-scrollbar markdown-body relative group">
                        {(activeTool.id === 'cv-premium' || activeTool.id === 'career-roadmap' || activeTool.id === 'zeugnis') && (
                          <div className="mb-8 p-4 bg-[#004225]/5 border border-[#004225]/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#004225] text-white flex items-center justify-center rounded-full shadow-lg">
                                <Sparkles size={16} />
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                                  {activeTool.id === 'cv-premium' ? 'Swiss Premium Standard' : 
                                   activeTool.id === 'career-roadmap' ? 'Swiss Career Strategy' : 
                                   'Premium Zeugnis-Decoder'}
                                </h5>
                                <p className="text-[9px] text-[#004225]/70 font-light">
                                  {activeTool.id === 'cv-premium' ? 'Optimiert für Schweizer Präzision & Diskretion' : 
                                   activeTool.id === 'career-roadmap' ? 'Strategischer Fahrplan für den Schweizer Markt' :
                                   'Entschlüsselung versteckter Botschaften & Codes'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-[#004225] text-white text-[8px] font-bold uppercase tracking-widest rounded-sm">
                              <ShieldCheck size={10} />
                              Verified
                            </div>
                          </div>
                        )}
                        {(activeTool.id === 'cv-analysis' || activeTool.id === 'ats-sim') && (
                          <div className="mb-8 p-4 bg-[#004225]/5 border border-[#004225]/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#004225] text-white flex items-center justify-center rounded-full shadow-lg">
                                <Target size={16} />
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#004225]">Premium Analysis</h5>
                                <p className="text-[9px] text-[#004225]/70 font-light">{t.premium_analysis_desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-[#004225] text-white text-[8px] font-bold uppercase tracking-widest rounded-sm">
                              <ShieldCheck size={10} />
                              Verified
                            </div>
                          </div>
                        )}
                        {activeTool.id === 'salary-calc' && parsedSalaryResult ? (
                          <div className="space-y-12 py-8">
                            <div className="text-center space-y-4">
                              <h3 className="text-3xl font-serif text-[#004225]">CHF {parsedSalaryResult.medianSalary.toLocaleString('de-CH')}</h3>
                              <p className="text-xs font-bold uppercase tracking-widest text-[#9A9A94]">{t.salary_median_label}</p>
                            </div>
                            
                            <div className="space-y-6">
                              <div className="relative h-4 bg-black/5 rounded-full overflow-hidden">
                                <div 
                                  className="absolute top-0 bottom-0 bg-[#004225] opacity-20"
                                  style={{ 
                                    left: `${(parsedSalaryResult.minSalary / parsedSalaryResult.maxSalary) * 100}%`,
                                    right: `${100 - ((parsedSalaryResult.maxSalary / parsedSalaryResult.maxSalary) * 100)}%`
                                  }}
                                />
                                <div 
                                  className="absolute top-0 bottom-0 w-1 bg-[#004225] shadow-[0_0_10px_rgba(0,66,37,0.5)]"
                                  style={{ left: `${(parsedSalaryResult.medianSalary / (parsedSalaryResult.maxSalary * 1.1)) * 100}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                                <span>Min: CHF {parsedSalaryResult.minSalary.toLocaleString('de-CH')}</span>
                                <span>Max: CHF {parsedSalaryResult.maxSalary.toLocaleString('de-CH')}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-black/5">
                              {parsedSalaryResult.insights.map((insight: string, i: number) => (
                                <div key={i} className="p-4 bg-[#FDFCFB] border border-black/5 space-y-2">
                                  <div className="w-6 h-6 bg-[#004225]/10 rounded-full flex items-center justify-center text-[#004225]">
                                    {i === 0 ? <MapPin size={12} /> : i === 1 ? <Briefcase size={12} /> : <TrendingUp size={12} />}
                                  </div>
                                  <p className="text-[10px] font-light leading-relaxed text-[#5C5C58]">{insight}</p>
                                </div>
                              ))}
                            </div>

                            <div className="p-6 bg-[#004225]/5 border border-[#004225]/10 space-y-3">
                              <div className="flex items-center gap-2 text-[#004225]">
                                <Info size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{t.salary_important_notice}</span>
                              </div>
                              <p className="text-[10px] font-light leading-relaxed text-[#004225]/80">
                                {t.salary_disclaimer}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  if (isEditingToolResult) {
                                    setToolResult(toolResultEditable);
                                  }
                                  setIsEditingToolResult(!isEditingToolResult);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[#4A4A45] dark:text-[#9A9A94]"
                              >
                                {isEditingToolResult ? <><CheckCircle2 size={11} /> Speichern</> : <><FileText size={11} /> Bearbeiten</>}
                              </button>
                              {isEditingToolResult && (
                                <button
                                  onClick={() => { setToolResultEditable(toolResult || ''); setIsEditingToolResult(false); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[#4A4A45] dark:text-[#9A9A94]"
                                >
                                  Abbrechen
                                </button>
                              )}
                            </div>
                            {isEditingToolResult ? (
                              <textarea
                                className="w-full min-h-[400px] p-4 bg-white dark:bg-[#1A1A18] border border-[#004225]/30 dark:border-[#FAFAF8]/20 text-sm font-light text-[#1A1A18] dark:text-[#FAFAF8] focus:outline-none focus:border-[#004225] transition-all leading-relaxed resize-y"
                                value={toolResultEditable}
                                onChange={(e) => setToolResultEditable(e.target.value)}
                              />
                            ) : (
                              <Markdown>{toolResult}</Markdown>
                            )}
                          </div>
                        )}
                        <div className="absolute bottom-4 right-4 text-[8px] text-[#9A9A94] font-bold uppercase tracking-widest opacity-40">
                          {t.ai_notice}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-start pt-6 pb-12 text-center space-y-6 max-w-md mx-auto">
                      <div className="w-16 h-16 bg-[#FDFCFB] dark:bg-[#2A2A26] flex items-center justify-center text-[#004225] dark:text-[#FAFAF8] rounded-full shrink-0">
                        <Lightbulb size={32} />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-lg font-serif">{t.tool_how_to_use}</h4>
                        <p className="text-xs text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed">
                          {activeTool.desc}
                        </p>
                        {t.tools_data[activeTool.id]?.tutorial && activeTool.desc.length > 140 && (
                          <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] animate-pulse">
                            <ChevronDown size={12} />
                            <span>{t.tool_scroll_example}</span>
                          </div>
                        )}
                      </div>
                      
                      {t.tools_data[activeTool.id]?.tutorial && (
                        <div className="w-full p-6 bg-[#004225]/5 border border-[#004225]/10 space-y-3 text-left">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                            <Award size={14} />
                            <span>{t.tool_pro_example}</span>
                          </div>
                          <p className="text-xs text-[#1A1A18] dark:text-[#FAFAF8] font-light leading-relaxed italic">
                            "{t.tools_data[activeTool.id].tutorial}"
                          </p>
                        </div>
                      )}

                      {((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                        (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                        <div className="w-full p-6 bg-amber-50 border border-amber-100 space-y-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-amber-900">
                            <Sparkles size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t.tool_unlimited_access}</span>
                          </div>
                          <p className="text-[10px] text-amber-800 leading-relaxed">
                            {t.tool_unlock_desc}
                          </p>
                          <button 
                            onClick={() => {
                              setActiveTool(null);
                              const pricingSection = document.getElementById('pricing');
                              pricingSection?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="w-full py-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-amber-700 transition-all"
                          >
                            {t.tool_discover_unlimited}
                          </button>
                        </div>
                      )}

                      <div className="pt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                        <ArrowLeft size={12} />
                        <span>{t.tool_fill_fields}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- JOB DETAIL MODAL --- */}
      <AnimatePresence>
        {isJobModalOpen && selectedJob && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A18] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#2A2A26]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#004225] text-white flex items-center justify-center rounded-full">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] leading-tight">{selectedJob.title}</h3>
                    <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] font-bold uppercase tracking-widest">{selectedJob.company}</p>
                  </div>
                </div>
                <button onClick={() => setIsJobModalOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.job_location}</p>
                    <p className="text-sm font-medium flex items-center gap-2 dark:text-[#FAFAF8]">
                      <MapPin size={14} className="text-[#004225] dark:text-[#FAFAF8]" />
                      {selectedJob.location}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.job_category}</p>
                    <p className="text-sm font-medium flex items-center gap-2 dark:text-[#FAFAF8]">
                      <Compass size={14} className="text-[#004225] dark:text-[#FAFAF8]" />
                      {selectedJob.category}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">{t.job_description}</h4>
                  <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] leading-relaxed font-light">
                    {(language === 'EN' && selectedJob.description_en) || (language === 'FR' && selectedJob.description_fr) || (language === 'IT' && selectedJob.description_it) || selectedJob.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">{t.job_requirements}</h4>
                  <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] leading-relaxed font-light">
                    {selectedJob.requirements}
                  </p>
                </div>

                {selectedJob.ats_keywords && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">{t.job_keywords}</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.ats_keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-[#004225]/5 dark:bg-white/5 text-[#004225] dark:text-[#FAFAF8] text-[10px] font-medium rounded border border-[#004225]/10 dark:border-white/10">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-4 bg-[#FDFCFB] dark:bg-[#2A2A26]">
                <button 
                  onClick={() => {
                    setIsJobModalOpen(false);
                    handleToolClick('ats-sim');
                    setToolInput({ ...toolInput, jobAd: `${selectedJob.title} bei ${selectedJob.company}\n\n${selectedJob.description}\n\n${selectedJob.requirements}` });
                  }}
                  className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-[#004225] dark:border-[#FAFAF8] text-[#004225] dark:text-[#FAFAF8] hover:bg-[#004225] dark:hover:bg-[#FDFCFB] hover:text-white dark:hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2"
                >
                  <Target size={14} />
                  ATS Check
                </button>
                <button 
                  onClick={() => {
                    setIsJobModalOpen(false);
                    handleToolClick('cv-gen');
                    setToolInput({ ...toolInput, jobAd: `${selectedJob.title} bei ${selectedJob.company}\n\n${selectedJob.description}\n\n${selectedJob.requirements}` });
                  }}
                  className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest bg-[#004225] text-white hover:bg-[#00331d] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} />
                  {t.apply_now}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- GENERATED APP MODAL --- */}
      <AnimatePresence>
        {generatedApp && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FDFCFB]">
                <h3 className="text-xl font-serif">{t.generated_app_title}</h3>
                <button onClick={() => setGeneratedApp(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                {generatedApp}
              </div>
              <div className="p-6 border-t border-black/5 flex justify-end gap-4 bg-[#FDFCFB]">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedApp);
                    showToast(t.tool_copied);
                  }}
                  className="px-6 py-3 text-sm font-medium border border-black/10 hover:bg-black/5 transition-all"
                >
                  {t.tool_copy}
                </button>
                <button
                  onClick={() => setGeneratedApp(null)}
                  className="px-6 py-3 text-sm font-medium bg-[#004225] text-white hover:bg-[#00331d] transition-all"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SWISS STANDARD BADGE --- */}
      <AnimatePresence>
        {showSwissNotice && (
          <div className="fixed bottom-6 left-6 z-[100] hidden md:block">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-md border border-[#004225]/10 dark:border-[#FAFAF8]/10 p-3 shadow-xl flex items-center gap-3 group hover:border-[#004225]/30 transition-all cursor-default relative pr-8"
            >
              <button 
                onClick={() => setShowSwissNotice(false)}
                className="absolute top-1 right-1 p-1 text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors"
              >
                <X size={10} />
              </button>
              <div className="w-8 h-8 bg-[#004225] text-white flex items-center justify-center text-[10px] font-bold">
                CH
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">
                  {t.swiss_standard_notice_title}
                </p>
                <p className="text-[9px] text-[#4A4A45] dark:text-[#9A9A94] font-light max-w-[180px] leading-tight mt-0.5">
                  {t.swiss_standard_notice_text}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- AUTH MODAL --- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAuthModalOpen(false); setConfirmPassword(''); setAuthError(''); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1A1A18] text-[#1A1A18] dark:text-[#FAFAF8] w-full max-w-md p-10 relative z-20 shadow-2xl"
            >
              <button
                onClick={() => { setIsAuthModalOpen(false); setConfirmPassword(''); setAuthError(''); }}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]"
              >
                <X size={20} />
              </button>
              
              {/* Language selector */}
              <div className="flex justify-center gap-1 mb-6">
                {(['DE','FR','IT','EN'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => { setLanguage(lang); localStorage.setItem('language', lang); }}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${language === lang ? 'bg-[#004225] text-white' : 'text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="text-center mb-8">
                <span className="text-2xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span></span>
                <h3 className="text-xl font-medium mt-4">
                  {authTab === 'login' ? t.auth_welcome : authTab === 'register' ? t.auth_create : t.auth_reset_password_title}
                </h3>
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light mt-2">
                  {authTab === 'forgot' ? t.auth_reset_password_desc : t.auth_precision}
                </p>
              </div>

              {authTab !== 'forgot' && (
                <div className="flex bg-[#FDFCFB] dark:bg-[#2A2A26] p-1 mb-8">
                  <button 
                    onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    className={`flex-1 py-2 text-xs font-medium transition-all ${authTab === 'login' ? 'bg-white dark:bg-[#1A1A18] shadow-sm text-[#1A1A18] dark:text-[#FAFAF8]' : 'text-[#9A9A94]'}`}
                  >
                    {t.auth_login}
                  </button>
                  <button 
                    onClick={() => { setAuthTab('register'); setAuthError(''); }}
                    className={`flex-1 py-2 text-xs font-medium transition-all ${authTab === 'register' ? 'bg-white dark:bg-[#1A1A18] shadow-sm text-[#1A1A18] dark:text-[#FAFAF8]' : 'text-[#9A9A94]'}`}
                  >
                    {t.auth_register}
                  </button>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); if (authTab === 'forgot') handleForgotPassword(); else handleAuth(e); }} className="space-y-4">
                {authTab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.auth_first_name}</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A45] dark:text-[#9A9A94]" size={16} />
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-10 pr-4 py-3 text-sm font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none focus:border-[#004225] dark:focus:border-[#00A854] transition-all"
                        placeholder={t.auth_placeholder_name}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.auth_email}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A45] dark:text-[#9A9A94]" size={16} />
                    <input 
                      type="email" 
                      required
                      ref={authEmailRef}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-10 pr-4 py-3 text-sm font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none focus:border-[#004225] dark:focus:border-[#00A854] transition-all"
                      placeholder={t.auth_placeholder_email}
                    />
                  </div>
                </div>
                {authTab !== 'forgot' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.auth_password}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A45] dark:text-[#9A9A94]" size={16} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (authTab === 'register') checkPasswordStrength(e.target.value);
                        }}
                        className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-10 pr-10 py-3 text-sm font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none focus:border-[#004225] dark:focus:border-[#00A854] transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {authTab === 'register' && password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div 
                              key={level}
                              className={`flex-1 rounded-full transition-colors ${
                                passwordStrength >= level 
                                  ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 4 ? 'bg-yellow-400' : 'bg-green-500')
                                  : 'bg-black/5 dark:bg-white/5'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[9px] text-[#9A9A94] uppercase tracking-wider">
                          {passwordStrength <= 2 ? t.password_weak :
                           passwordStrength <= 4 ? t.password_medium :
                           t.password_strong}
                        </p>
                      </div>
                    )}
                    {authTab === 'login' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setAuthTab('forgot'); setAuthError(''); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                        >
                          {t.auth_forgot_password}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {authTab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">
                      {language === 'FR' ? 'Confirmer le mot de passe' : language === 'IT' ? 'Conferma password' : language === 'EN' ? 'Confirm password' : 'Passwort bestätigen'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A45] dark:text-[#9A9A94]" size={16} />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-white dark:bg-[#2A2A26] border pl-10 pr-4 py-3 text-sm font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none transition-all ${
                          confirmPassword && confirmPassword !== password
                            ? 'border-red-400 focus:border-red-400'
                            : confirmPassword && confirmPassword === password
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-black/10 dark:border-white/10 focus:border-[#004225] dark:focus:border-[#00A854]'
                        }`}
                        placeholder="••••••••"
                      />
                      {confirmPassword && (
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${confirmPassword === password ? 'text-green-500' : 'text-red-400'}`}>
                          {confirmPassword === password ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-[9px] text-red-400 uppercase tracking-wider">
                        {language === 'FR' ? 'Les mots de passe ne correspondent pas' : language === 'IT' ? 'Le password non corrispondono' : language === 'EN' ? 'Passwords do not match' : 'Passwörter stimmen nicht überein'}
                      </p>
                    )}
                  </div>
                )}

                {authError && (
                  <div className="space-y-2">
                    <p className={`text-xs text-center ${
                      authError.includes('gesendet') || authError.includes('sent') || authError.includes('E-Mail gesendet') || authError.includes('envoyé') || authError.includes('inviata')
                        ? 'text-green-500' : 'text-red-500'
                    }`}>{authError}</p>
                    {/* Wrong password → show reset button */}
                    {(authError.includes('Falsches Passwort') || authError.includes('incorrect') || authError.includes('errata') || authError.includes('Wrong password')) && authTab === 'login' && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => { setAuthTab('forgot'); setAuthError(''); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                        >
                          {t.auth_forgot_password}
                        </button>
                      </div>
                    )}
                    {/* Email already in use → switch to login */}
                    {(authError.includes('bereits verwendet') || authError.includes('déjà utilisé') || authError.includes('già in uso') || authError.includes('already in use')) && authTab === 'register' && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => { setAuthTab('login'); setAuthError(''); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                        >
                          {t.auth_switch_to_login}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-[#004225] text-white py-4 text-sm font-medium hover:bg-[#00331d] transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    authTab === 'login' ? t.auth_login : authTab === 'register' ? t.auth_create : t.auth_reset_password_btn
                  )}
                </button>

                {authTab === 'forgot' && (
                  <div className="flex justify-center mt-4">
                    <button 
                      type="button"
                      onClick={() => { setAuthTab('login'); setAuthError(''); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors"
                    >
                      {t.auth_back_to_login}
                    </button>
                  </div>
                )}

                {authTab !== 'forgot' && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-black/10 dark:border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                        <span className="bg-white dark:bg-[#1A1A18] px-2 text-[#9A9A94]">{t.or_divider}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isAuthLoading}
                      className="w-full border border-black/10 dark:border-white/10 py-3 text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {language === 'DE' ? 'Mit Google anmelden' :
                       language === 'FR' ? 'Se connecter avec Google' :
                       language === 'IT' ? 'Accedi con Google' :
                       'Sign in with Google'}
                    </button>

                    <button
                      type="button"
                      onClick={handleLinkedInAuth}
                      disabled={isAuthLoading}
                      className="w-full border border-black/10 dark:border-white/10 py-3 text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-3"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="2" fill="#0A66C2"/>
                        <path d="M7 9H5v10h2V9zm-1-1.5A1.25 1.25 0 1 0 6 5a1.25 1.25 0 0 0 0 2.5zM19 13.2c0-2.3-1.1-4.2-3.4-4.2a3.2 3.2 0 0 0-2.6 1.3V9H11v10h2v-5.4c0-1.4.7-2.3 1.9-2.3 1.1 0 1.6.8 1.6 2.2V19h2v-5.8z" fill="white"/>
                      </svg>
                      {language === 'DE' ? 'Mit LinkedIn anmelden' :
                       language === 'FR' ? 'Se connecter avec LinkedIn' :
                       language === 'IT' ? 'Accedi con LinkedIn' :
                       'Sign in with LinkedIn'}
                    </button>
                  </>
                )}


                <p className="text-[10px] text-center text-[#9A9A94] mt-6 leading-relaxed">
                  {t.auth_terms_by_signing}{' '}
                  <span className="underline cursor-pointer">{t.footer_terms}</span>
                  {' '}{t.auth_terms_and}{' '}
                  <span className="underline cursor-pointer">{t.footer_privacy}</span>.{' '}
                  {t.auth_terms_data_processing}
                </p>

                <div className="mt-8 pt-4 border-t border-black/5 flex justify-center">
                  <button 
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.localStorage.clear();
                      window.location.reload();
                    }}
                    className="text-[9px] uppercase tracking-widest text-[#9A9A94] hover:text-[#004225] transition-colors"
                  >
                    {t.auth_reset_session}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELETE ACCOUNT MODAL --- */}
      <AnimatePresence>
        {isDeleteAccountOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteAccountOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-[#1A1A18] w-full max-w-sm p-8 relative z-20 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-serif dark:text-[#FAFAF8]">
                  {language === 'DE' ? 'Konto löschen' : language === 'FR' ? 'Supprimer le compte' : language === 'IT' ? 'Elimina account' : 'Delete Account'}
                </h3>
                <p className="text-xs text-[#9A9A94] mt-2 leading-relaxed">
                  {language === 'DE' ? 'Diese Aktion ist unwiderruflich. Alle deine Daten werden dauerhaft gelöscht.' : language === 'FR' ? 'Cette action est irréversible. Toutes vos données seront définitivement supprimées.' : language === 'IT' ? 'Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati definitivamente.' : 'This action is irreversible. All your data will be permanently deleted.'}
                </p>
              </div>
              {user && (
                <div className="space-y-1.5 mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">
                    {language === 'DE' ? 'Passwort zur Bestätigung' : language === 'FR' ? 'Mot de passe pour confirmer' : language === 'IT' ? 'Password per confermare' : 'Password to confirm'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94]" size={15} />
                    <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-red-400 transition-all dark:text-[#FAFAF8]" placeholder="••••••••" />
                  </div>
                </div>
              )}
              {deleteError && <p className="text-xs text-red-500 text-center mb-3">{deleteError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteAccountOpen(false)} className="flex-1 py-2.5 border border-black/10 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-[#5C5C58] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  {language === 'DE' ? 'Abbrechen' : language === 'FR' ? 'Annuler' : language === 'IT' ? 'Annulla' : 'Cancel'}
                </button>
                <button onClick={handleDeleteAccount} disabled={isDeletingAccount} className="flex-1 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {isDeletingAccount ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />{language === 'DE' ? 'Löschen...' : language === 'FR' ? 'Suppression...' : language === 'IT' ? 'Elimina...' : 'Deleting...'}</> : (language === 'DE' ? 'Konto löschen' : language === 'FR' ? 'Supprimer' : language === 'IT' ? 'Elimina' : 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SETTINGS MODAL --- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FDFCFB]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#004225] text-white flex items-center justify-center">
                    <Settings size={20} />
                  </div>
                  <h3 className="text-xl font-serif">{t.settings}</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-8 overflow-y-auto">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] border-b border-black/5 pb-2">{t.profile}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94]">{t.settings_first_name}</label>
                      {isEditingName ? (
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 bg-[#FDFCFB] border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#004225]/30"
                            autoFocus
                          />
                          <button 
                            onClick={handleUpdateName}
                            disabled={isSavingName}
                            className="bg-[#004225] text-white px-3 py-2 text-xs font-medium hover:bg-[#00331d] disabled:opacity-50"
                          >
                            {isSavingName ? '...' : 'OK'}
                          </button>
                          <button 
                            onClick={() => setIsEditingName(false)}
                            className="text-[#9A9A94] hover:text-black p-2"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <p className="text-sm font-medium">{user?.firstName}</p>
                          <button 
                            onClick={() => {
                              setNewName(user?.firstName || '');
                              setIsEditingName(true);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#004225] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {t.edit || 'Bearbeiten'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94]">{t.settings_email}</label>
                      <p className="text-sm font-medium text-[#6B6B66] dark:text-[#9A9A94]">{user?.email}</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsTutorialOpen(true);
                      }}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] hover:underline"
                    >
                      <Sparkles size={12} />
                      {t.settings_rewatch_tutorial || 'Tutorial erneut ansehen'}
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] border-b border-black/5 pb-2">{t.subscription}</h4>
                  <div className="p-4 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium dark:text-[#FAFAF8]">{user?.role === 'pro' ? 'Stellify Pro' : user?.role === 'unlimited' ? 'Stellify Ultimate' : 'Stellify Gratis'}</p>
                      {user?.subscriptionExpiresAt && (user?.role === 'pro' || user?.role === 'unlimited') ? (
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-0.5">
                          {language === 'DE' ? 'Gültig bis' : language === 'FR' ? 'Valide jusqu\'au' : language === 'IT' ? 'Valido fino al' : 'Valid until'}{' '}
                          <span className="font-semibold text-[#004225] dark:text-[#00A854]">
                            {new Date(user.subscriptionExpiresAt).toLocaleDateString(language === 'DE' ? 'de-CH' : language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-widest">{t.settings_status}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border border-[#004225]/20 px-3 py-1.5 hover:bg-[#004225] hover:text-white transition-all"
                    >
                      {t.settings_change_plan}
                    </button>
                  </div>

                  {/* Detailed Usage in Settings */}
                  {(user?.role === 'pro' || user?.role === 'client') && (
                    <div className="p-6 bg-[#FDFCFB] border border-black/5 space-y-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                        <Activity size={14} />
                        <span>{t.settings_your_usage}</span>
                      </div>
                      
                      <div className="space-y-6">
                        {user.role === 'pro' ? (
                          <>
                            {/* Monthly Usage */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">{t.settings_apps_tools}</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.toolUses || 0} / 50 {t.settings_generations}</p>
                                </div>
                                <span className="text-xs font-serif text-[#004225]">{Math.round(((user.toolUses || 0) / 50) * 100)}%</span>
                              </div>
                              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#004225] transition-all duration-700" 
                                  style={{ width: `${Math.min(((user.toolUses || 0) / 50) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Daily Usage */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">{t.dashboard_daily_usage}</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.dailyToolUses || 0} / 20 {t.settings_actions_today}</p>
                                </div>
                                <span className="text-xs font-serif text-[#004225]">{Math.min(100, Math.round(((user.dailyToolUses || 0) / 20) * 100))}%</span>
                              </div>
                              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#004225] transition-all duration-700" 
                                  style={{ width: `${Math.min(100, Math.round(((user.dailyToolUses || 0) / 20) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Free User Usage */
                          <div className="space-y-6">
                            {/* Tools/Applications */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">{t.settings_apps_tools}</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.toolUses || 0} / 3 {t.settings_free_use}</p>
                                </div>
                                <span className="text-xs font-serif text-[#004225]">{Math.min(100, Math.round(((user.toolUses || 0) / 3) * 100))}%</span>
                              </div>
                              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#004225] transition-all duration-700"
                                  style={{ width: `${Math.min(100, Math.round(((user.toolUses || 0) / 3) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* Stella Chat */}
                            <div className="space-y-2 pt-4 border-t border-black/5">
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">Stella Chat</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.freeGenerationsUsed || 0} / 3 {t.settings_requests}</p>
                                </div>
                                <span className="text-xs font-serif text-[#004225]">{Math.min(100, Math.round(((user.freeGenerationsUsed || 0) / 3) * 100))}%</span>
                              </div>
                              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#004225] transition-all duration-700" 
                                  style={{ width: `${Math.min(100, Math.round(((user.freeGenerationsUsed || 0) / 3) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {user?.role === 'unlimited' && (
                    <div className="p-4 bg-[#004225]/5 border border-[#004225]/10 flex items-center gap-3">
                      <Sparkles size={16} className="text-[#004225]" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]">{t.dashboard_usage_unlimited}</p>
                    </div>
                  )}

                  {/* Admin Debug Section */}
                  {(import.meta.env.DEV && user?.email === 'weare2bc@gmail.com') && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-amber-900">
                        <Shield size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Admin Debug Tools</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!user?.id) return;
                            try {
                              await supabase.from('users').update({ role: 'client' }).eq('id', user.id);
                              window.location.reload();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest bg-gray-600 text-white px-2 py-1 hover:bg-gray-700 transition-colors"
                        >
                          Simulate Free
                        </button>
                        <button
                          onClick={async () => {
                            if (!user?.id) return;
                            try {
                              await supabase.from('users').update({ role: 'pro' }).eq('id', user.id);
                              window.location.reload();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest bg-amber-600 text-white px-2 py-1 hover:bg-amber-700 transition-colors"
                        >
                          Simulate Pro
                        </button>
                        <button
                          onClick={async () => {
                            if (!user?.id) return;
                            try {
                              await supabase.from('users').update({ role: 'unlimited' }).eq('id', user.id);
                              window.location.reload();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest bg-amber-900 text-white px-2 py-1 hover:bg-amber-950 transition-colors"
                        >
                          Simulate Unlimited
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] border-b border-black/5 pb-2">{t.data_privacy}</h4>
                  <p className="text-xs text-[#5C5C58] font-light leading-relaxed">
                    {t.settings_privacy_desc}
                  </p>
                  <button onClick={() => { setIsDeleteAccountOpen(true); setDeletePassword(''); setDeleteError(''); }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">{t.settings_delete_account}</button>
                </section>
              </div>
              <div className="p-6 border-t border-black/5 bg-[#FDFCFB] flex justify-end">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-[#004225] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPromoOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/98 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#004225]"
            >
              {/* Background Image with Overlay */}
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2070" 
                  alt="Background"
                  className="w-full h-full object-cover opacity-20 mix-blend-overlay grayscale"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#004225]/95 via-[#004225]/80 to-[#004225]" />
                
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#004225] blur-[120px] opacity-30" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#004225] blur-[120px] opacity-30" />
                </div>
              </div>

              {/* Close Button - More prominent */}
              <button 
                onClick={() => setIsPromoOpen(false)}
                className="absolute top-12 right-12 z-[600] text-white/60 hover:text-white transition-all flex items-center gap-3 group"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity">{t.close}</span>
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/60 transition-colors bg-black/20 backdrop-blur-sm">
                  <X size={24} />
                </div>
              </button>

              {/* Animated Promo Content */}
              <div className="max-w-5xl w-full px-6 relative z-10">
                <PromoSequence onComplete={() => setIsPromoOpen(false)} t={t} language={language} />
              </div>

              {/* Background Ambient Effects */}
              <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-gradient-to-tr from-[#004225]/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,66,37,0.2)_0%,transparent_70%)]" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTutorialOpen && (
          <OnboardingTutorial
            t={t}
            onComplete={async () => {
              setIsTutorialOpen(false);
              if (user?.id) {
                try {
                  await supabase.from('users').update({ has_seen_tutorial: true }).eq('id', user.id);
                } catch (e) {
                  console.error("Error updating tutorial status:", e);
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Cookie Consent Banner */}
      {cookieConsent === null && (
        <CookieBanner
          t={t}
          onAccept={() => handleCookieAccept('accepted')}
          onEssential={() => handleCookieAccept('essential')}
          onPrivacyLink={() => { handleCookieAccept('essential'); navigate('datenschutz'); }}
        />
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />
      <input
        type="file"
        ref={linkedinImageInputRef}
        className="hidden"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = '';
          setIsExtractingImage(true);
          try {
            const extracted = await extractTextFromImage(file);
            setToolInput((prev: any) => ({ ...prev, linkedinProfile: extracted }));
          } catch {
            alert('Screenshot konnte nicht analysiert werden. Bitte Text manuell einfügen.');
          } finally {
            setIsExtractingImage(false);
          }
        }}
      />
    </div>
  );
}
