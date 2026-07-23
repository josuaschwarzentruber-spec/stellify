/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { track as vaTrack } from '@vercel/analytics';
import { useDropzone } from 'react-dropzone';
import {
  DndContext, useSensor, useSensors, PointerSensor, TouchSensor, KeyboardSensor,
  useDraggable, useDroppable, DragOverlay, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
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
  ArrowUp,
  ChevronRight,
  CheckCircle2,
  Check,
  Star,
  Menu,
  User as UserIcon,
  Lock,
  Mail,
  Sparkles,
  Search, Shield, FileText, AlertCircle, Info,
  Quote, Coins, Cpu, ShieldCheck, Target, Layout, Mic, Rocket, Award, RefreshCw, Linkedin, Share2, Sun, Moon, ChevronDown,
  Plus, Trash2, Edit2, MoreVertical, Briefcase, MapPin, DollarSign, Calendar, Compass,
  Upload, FileUp, Copy, Eye, EyeOff, Lightbulb, Wrench, HelpCircle, Command, Activity,
  Headphones, Radio, ChevronLeft, BarChart3, CreditCard, Instagram, Image as ImageIcon,
  Pause, Volume2, VolumeX, Link2,
  Archive, ArchiveRestore, LayoutGrid, List as ListIcon,
  Clock, Monitor, Bell
} from 'lucide-react';
import { auth, db } from './firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as firebaseSignOut, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider,
  reauthenticateWithCredential, EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { searchData, SearchItem } from './data/searchData';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
/** Typewriter effect: the text writes itself character by character with a
    blinking caret when it first scrolls into view — watching the AI write,
    live. Restarts on language change, respects reduced motion. */
const TypeText = ({ text, speed = 14, startDelay = 0 }: { text: string; speed?: number; startDelay?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    setN(0);
    setStarted(false);
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      setStarted(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timer = setTimeout(() => setStarted(true), startDelay);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [text, startDelay]);
  useEffect(() => {
    if (!started || n >= text.length) return;
    const id = setTimeout(() => setN(v => v + 1), speed);
    return () => clearTimeout(id);
  }, [started, n, text, speed]);
  const done = n >= text.length;
  return (
    <span ref={ref}>
      {text.slice(0, n)}
      {started && !done && <span aria-hidden="true" className="inline-block w-[2px] h-[1em] align-middle bg-[#00A854] animate-pulse ml-0.5" />}
    </span>
  );
};

/** Self-playing product demo: a scripted mini app window in which the
    Bewerbungs-Generator visibly does its job — the job URL types itself,
    the button clicks, the fields fill, the letter writes, the PDF pops.
    Driven by one clock, loops forever, pauses off-screen, and shows the
    finished state for reduced-motion users. Sharper than any video,
    loads instantly, speaks all four languages. */
const LiveDemo = ({ language }: { language: string }) => {
  const L = (de: string, fr: string, it: string, en: string) =>
    language === 'FR' ? fr : language === 'IT' ? it : language === 'EN' ? en : de;
  const URL_TEXT = 'https://www.jobs.ch/stellen/marketing-manager-nestle';
  const LETTER = L(
    'mit grossem Interesse bewerbe ich mich als Marketing Manager bei Nestlé. Seit drei Jahren verantworte ich die Markenstrategie eines Schweizer Unternehmens und habe die Bekanntheit um 28 Prozent gesteigert.',
    "C'est avec grand intérêt que je postule comme Marketing Manager chez Nestlé. Depuis trois ans, je dirige la stratégie de marque d'une entreprise suisse et j'ai augmenté la notoriété de 28 pour cent.",
    "con grande interesse mi candido come Marketing Manager presso Nestlé. Da tre anni guido la strategia di marca di un'azienda svizzera e ho aumentato la notorietà del 28 per cento.",
    'I am applying with great interest as Marketing Manager at Nestlé. For three years I have led the brand strategy of a Swiss company and grew awareness by 28 percent.'
  );
  const CYCLE = 15000;
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (reduced) { setT(CYCLE - 1); return; }
    const el = ref.current;
    if (!el) return;
    let raf = 0; let last = 0; let running = false;
    const loop = (now: number) => {
      if (!running) return;
      if (last) setT(prev => (prev + (now - last)) % CYCLE);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, [reduced]);

  // Timeline (ms): url types 600-3200 · click 3400 · reading 3600-5000 ·
  // fields 5200/5600/6000 · letter 6600-11400 · done 11800 · hold to 15000
  const urlChars = Math.max(0, Math.min(URL_TEXT.length, Math.floor((t - 600) / 26)));
  const clicked = t > 3400;
  const reading = t > 3600 && t < 5000;
  const fieldOn = (i: number) => t > 5200 + i * 400;
  const letterChars = Math.max(0, Math.min(LETTER.length, Math.floor((t - 6600) / 24)));
  const done = t > 11800;
  const caret = <span aria-hidden="true" className="inline-block w-[2px] h-[1em] align-middle bg-[#00A854] animate-pulse ml-0.5" />;

  const fields = [
    [L('Firma', 'Entreprise', 'Azienda', 'Company'), 'Nestlé Suisse SA'],
    ['Position', 'Marketing Manager'],
    [L('Ort', 'Lieu', 'Luogo', 'Location'), 'Vevey VD'],
  ] as [string, string][];

  return (
    <div ref={ref} className="relative max-w-3xl mx-auto">
      <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/40 bg-white dark:bg-[#1F1F1C]">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F4F3F0] dark:bg-[#2A2A26] border-b border-black/6 dark:border-white/6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E8837B]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#E8C57B]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#7BC98F]" />
          <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A9A94]">
            {L('Bewerbungs-Generator · Live', 'Générateur · Live', 'Generatore · Live', 'Application Builder · Live')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#00A854]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A854] animate-pulse" />
            Demo
          </span>
        </div>

        <div className="p-5 sm:p-7 space-y-4">
          {/* 1 · URL import row */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A9A94] mb-1.5">
              {L('Stelle per Link laden', "Charger l'offre par lien", 'Carica annuncio da link', 'Load job by link')}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-[11px] sm:text-xs font-mono text-[#1A1A18] dark:text-[#EBEBEB] truncate">
                {URL_TEXT.slice(0, urlChars)}{urlChars > 0 && urlChars < URL_TEXT.length && caret}
              </div>
              <div className={`shrink-0 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition-all ${clicked ? 'bg-[#00331d] scale-95' : 'bg-[#004225]'}`}>
                {reading
                  ? <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{L('Liest …', 'Lit …', 'Legge …', 'Reading …')}</span>
                  : L('Laden', 'Charger', 'Carica', 'Load')}
              </div>
            </div>
          </div>

          {/* 2 · Extracted fields */}
          <div className="grid grid-cols-3 gap-2">
            {fields.map(([label, value], i) => (
              <div key={label} className={`px-3 py-2 bg-[#FDFCFB] dark:bg-[#1A1A18] border transition-all duration-500 ${fieldOn(i) ? 'border-[#00A854]/50 opacity-100 translate-y-0' : 'border-black/10 dark:border-white/10 opacity-40 translate-y-1'}`}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{label}</p>
                <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] truncate min-h-[1.2em]">{fieldOn(i) ? value : ''}</p>
              </div>
            ))}
          </div>

          {/* 3 · Letter writes itself */}
          <div className="bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A9A94]">
                {L('Anschreiben', 'Lettre de motivation', 'Lettera di motivazione', 'Cover letter')}
              </p>
              {t > 6200 && !done && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#00A854] inline-flex items-center gap-1.5">
                  <Sparkles size={10} />
                  {L('Stella schreibt …', 'Stella écrit …', 'Stella scrive …', 'Stella is writing …')}
                </span>
              )}
            </div>
            <p className="font-serif text-[12px] sm:text-[13px] leading-relaxed text-[#26261F] dark:text-[#D5D5CF] min-h-[1.4em]">
              {letterChars > 0 ? L('Sehr geehrte Damen und Herren,', 'Madame, Monsieur,', 'Gentili Signore e Signori,', 'Dear Sir or Madam,') : ''}
            </p>
            <p className="font-serif text-[12px] sm:text-[13px] leading-relaxed text-[#26261F] dark:text-[#D5D5CF] min-h-[5.2em] sm:min-h-[4em]">
              {LETTER.slice(0, letterChars)}{letterChars > 0 && letterChars < LETTER.length && caret}
            </p>
          </div>

          {/* 4 · Done row */}
          <div className={`flex items-center justify-between transition-all duration-500 ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/25 dark:border-[#00A854]/40 px-2.5 py-1.5 rounded"><Download size={11} />PDF</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/25 dark:border-[#00A854]/40 px-2.5 py-1.5 rounded"><Download size={11} />Word</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#00A854]">
              <CheckCircle2 size={13} />
              {L('Fertig. Bereit zum Versand.', 'Terminé. Prêt à envoyer.', 'Fatto. Pronto da inviare.', 'Done. Ready to send.')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Self-playing demo for the strategy tool: the target role types itself,
    Generieren clicks, and the three-step battle plan writes in sequence.
    Same clock pattern as LiveDemo: loops, pauses off-screen, reduced-motion
    shows the finished state. */
const StrategyDemo = ({ language }: { language: string }) => {
  const L = (de: string, fr: string, it: string, en: string) =>
    language === 'FR' ? fr : language === 'IT' ? it : language === 'EN' ? en : de;
  const INPUT = L('Projektleiter bei Roche, Basel', 'Chef de projet chez Roche, Bâle', 'Project manager presso Roche, Basilea', 'Project lead at Roche, Basel');
  const STEPS = [
    L('Lebenslauf auf «Projektleitung Pharma» zuspitzen', 'Adapter le CV à «Gestion de projet Pharma»', 'Adattare il CV a «Gestione progetti Pharma»', 'Sharpen the CV for "Pharma project lead"'),
    L('Kontakt zur Fachabteilung über LinkedIn aufbauen', 'Créer le contact avec le département via LinkedIn', 'Creare il contatto con il reparto via LinkedIn', 'Build contact with the department via LinkedIn'),
    L('Antworten auf die 3 häufigsten Fragen vorbereiten', 'Préparer les réponses aux 3 questions les plus fréquentes', 'Preparare le risposte alle 3 domande più frequenti', 'Prepare answers to the 3 most common questions'),
  ];
  const CYCLE = 14000;
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (reduced) { setT(CYCLE - 1); return; }
    const el = ref.current;
    if (!el) return;
    let raf = 0; let last = 0; let running = false;
    const loop = (now: number) => {
      if (!running) return;
      if (last) setT(prev => (prev + (now - last)) % CYCLE);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, [reduced]);

  // Timeline: input types 500-2600 · click 2800 · planning 3000-4200 ·
  // steps type 4400/6600/8800 (2s each) · done 11200 · hold to 14000
  const inChars = Math.max(0, Math.min(INPUT.length, Math.floor((t - 500) / 34)));
  const clicked = t > 2800;
  const planning = t > 3000 && t < 4200;
  const stepChars = (i: number) => Math.max(0, Math.min(STEPS[i].length, Math.floor((t - (4400 + i * 2200)) / 22)));
  const done = t > 11200;
  const caret = <span aria-hidden="true" className="inline-block w-[2px] h-[1em] align-middle bg-[#00A854] animate-pulse ml-0.5" />;

  return (
    <div ref={ref} className="relative max-w-3xl mx-auto">
      <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/40 bg-white dark:bg-[#1F1F1C]">
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F4F3F0] dark:bg-[#2A2A26] border-b border-black/6 dark:border-white/6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E8837B]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#E8C57B]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#7BC98F]" />
          <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A9A94]">
            {L('Bewerbungs-Tracker · Live', 'Suivi · Live', 'Tracker · Live', 'Tracker · Live')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#00A854]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A854] animate-pulse" />
            Demo
          </span>
        </div>
        <div className="p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A9A94] mb-1.5">
              {L('Jobtitel / Firma', 'Poste / Entreprise', 'Posizione / Azienda', 'Job title / Company')}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-[11px] sm:text-xs text-[#1A1A18] dark:text-[#EBEBEB] truncate">
                {INPUT.slice(0, inChars)}{inChars > 0 && inChars < INPUT.length && caret}
              </div>
              <div className={`shrink-0 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition-all ${clicked ? 'bg-[#00331d] scale-95' : 'bg-[#004225]'}`}>
                {planning
                  ? <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{L('Plant …', 'Planifie …', 'Pianifica …', 'Planning …')}</span>
                  : L('Generieren', 'Générer', 'Genera', 'Generate')}
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {STEPS.map((step, i) => {
              const chars = stepChars(i);
              const active = chars > 0;
              return (
                <div key={i} className={`flex items-start gap-3 bg-[#FDFCFB] dark:bg-[#1A1A18] border rounded-sm p-3.5 transition-all duration-500 ${active ? 'border-[#00A854]/40 opacity-100' : 'border-black/10 dark:border-white/10 opacity-45'}`}>
                  <span className={`shrink-0 w-7 h-7 rounded-full text-white text-[12px] font-bold flex items-center justify-center transition-colors ${active ? 'bg-[#004225] dark:bg-[#00A854]' : 'bg-black/20 dark:bg-white/20'}`}>{i + 1}</span>
                  <p className="text-[12px] sm:text-[13px] text-[#1A1A18] dark:text-[#EBEBEB] leading-snug pt-1 min-h-[1.4em]">
                    {step.slice(0, chars)}{chars > 0 && chars < step.length && caret}
                  </p>
                </div>
              );
            })}
          </div>
          <div className={`flex items-center justify-end transition-all duration-500 ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#00A854]">
              <CheckCircle2 size={13} />
              {L('Dein Plan steht.', 'Ton plan est prêt.', 'Il tuo piano è pronto.', 'Your plan is ready.')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Animated count-up for stat numbers. Counts from 0 to the target the
    first time it scrolls into view — the small "alive" touch that makes
    static facts feel engineered. Respects reduced motion. */
const CountUp = ({ to, duration = 1400 }: { to: number; duration?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{val}</span>;
};
const ApplicationGenerator = lazy(() => import('./components/ApplicationGenerator'));

// --- LAZY-LOADED HEAVY COMPONENTS ---
const PromoVideoModal = lazy(() => import('./components/PromoVideoModal'));
const PromoSequence = lazy(() => import('./components/PromoSequence'));
const LegalPages = lazy(() => import('./components/LegalPages'));
const GuidePages = lazy(() => import('./components/GuidePages'));

declare global {
  interface Window {
    stellifyReady?: () => void;
  }
}

// gemini-2.0-flash: best free-tier quota (1500/day) + still high quality.
// Avoids the tiny free limits of 2.5-pro/2.5-flash. The backend keeps the
// 2.5 models as last-resort fallback. Revisit if a paid key is added.
const PRO_MODEL = "gemini-2.0-flash";
const FLASH_MODEL = "gemini-2.0-flash";

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
  avatarId?: string;
  newsletterOptIn?: boolean;
}

// --- UPGRADE PROMPT ---
// A convincing, premium modal shown when a free user runs out of tries
// ('quota') or the daily free ceiling is reached ('daily'). Turns a hard
// stop into a warm invitation to upgrade, with the value and the plans.
const UpgradePrompt = ({ reason, language, onClose, onPricing, subOverride }: { reason: 'quota' | 'daily' | 'feature'; language: string; onClose: () => void; onPricing: () => void; subOverride?: string }) => {
  const L = (de: string, fr: string, it: string, en: string) =>
    language === 'FR' ? fr : language === 'IT' ? it : language === 'EN' ? en : de;
  const headline = reason === 'daily'
    ? L('Heute besonders gefragt', 'Très demandé aujourd\'hui', 'Molto richiesto oggi', 'In high demand today')
    : reason === 'feature'
    ? L('Word-Export ist eine Pro-Funktion', 'L\'export Word est une fonction Pro', 'L\'esportazione Word è una funzione Pro', 'Word export is a Pro feature')
    : L('Deine 3 Gratis-Bewerbungen sind erstellt', 'Tes 3 candidatures gratuites sont créées', 'Le tue 3 candidature gratuite sono create', 'Your 3 free applications are done');
  const sub = subOverride ? subOverride : reason === 'daily'
    ? L('Die kostenlosen Generierungen sind für heute ausgeschöpft. Mit Pro geht es sofort weiter, ganz ohne Wartezeit.',
        'Les générations gratuites sont épuisées pour aujourd\'hui. Avec Pro, tu continues tout de suite, sans attendre.',
        'Le generazioni gratuite sono esaurite per oggi. Con Pro continui subito, senza attese.',
        'Today\'s free generations are used up. With Pro you continue right away, no waiting.')
    : reason === 'feature'
    ? L('Als PDF geht es gratis. Mit Pro lädst du deine Bewerbung zusätzlich als Word-Datei herunter und schaltest alle Designs frei. Deine Gratis-Generierungen bleiben dir erhalten.',
        'En PDF, c\'est gratuit. Avec Pro, tu télécharges aussi ta candidature en Word et débloques tous les designs. Tes générations gratuites restent disponibles.',
        'In PDF è gratis. Con Pro scarichi la candidatura anche in Word e sblocchi tutti i design. Le tue generazioni gratuite restano disponibili.',
        'PDF is free. With Pro you also download your application as Word and unlock all designs. Your free generations stay untouched.')
    : L('Du hast gesehen, wie gut Stella schreibt. Hol dir Pro und erstelle so viele Bewerbungen, wie du brauchst.',
        'Tu as vu comme Stella écrit bien. Passe à Pro et crée autant de candidatures que nécessaire.',
        'Hai visto quanto bene scrive Stella. Passa a Pro e crea tutte le candidature che ti servono.',
        'You have seen how well Stella writes. Get Pro and create as many applications as you need.');
  const benefits = language === 'FR' ? ['30 générations IA par mois', 'Tous les designs standard', 'Import par lien et réutilisation du CV', 'Export PDF et Word']
    : language === 'IT' ? ['30 generazioni IA al mese', 'Tutti i design standard', 'Import da link e riuso del CV', 'Esportazione PDF e Word']
    : language === 'EN' ? ['30 AI generations per month', 'All standard designs', 'Link import and CV reuse', 'PDF and Word export']
    : ['30 KI-Generierungen pro Monat', 'Alle Standard-Designs', 'Stelle per Link laden und Lebenslauf nutzen', 'PDF- und Word-Export'];
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-[#1A1A18] rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Forest header with the brand star */}
        <div className="relative px-8 pt-8 pb-7 text-center text-white overflow-hidden" style={{ background: 'linear-gradient(135deg,#00331d 0%,#004225 55%,#0a5233 100%)' }}>
          <div aria-hidden="true" className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-[#00A854]/25 blur-3xl" />
          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2.5L17 10.5L25.5 14L17 17L14 25.5L11 17L2.5 14L11 10.5Z" fill="#6FCF97"/></svg>
            </div>
            <h3 className="text-2xl font-serif leading-tight">{headline}</h3>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-3.5 right-3.5 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/25 border border-white/20 text-white/85 hover:text-white hover:bg-black/40 transition-all" aria-label="Schliessen">
          <X size={16} />
        </button>

        <div className="px-8 py-7">
          <p className="text-[15px] text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed text-center mb-6">{sub}</p>
          <div className="space-y-2.5 mb-7">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-[#1A1A18] dark:text-[#FAFAF8] font-light">
                <CheckCircle2 size={16} className="text-[#004225] dark:text-[#00A854] shrink-0" />
                {b}
              </div>
            ))}
          </div>
          {/* Price anchor */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-[11px] text-[#9A9A94] uppercase tracking-widest font-bold">Pro</span>
            <span className="font-serif text-2xl text-[#004225] dark:text-[#00A854]">CHF 9.90</span>
            <span className="text-[11px] text-[#9A9A94]">{L('/Monat', '/mois', '/mese', '/month')}</span>
          </div>
          <button
            onClick={onPricing}
            className="w-full py-4 text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:opacity-95"
            style={{ background: 'linear-gradient(135deg,#00331d 0%,#004225 55%,#0a5233 100%)' }}
          >
            {L('Pläne ansehen', 'Voir les plans', 'Vedi i piani', 'See the plans')}
          </button>
          <button onClick={onClose} className="w-full mt-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#9A9A94] hover:text-[#5C5C58] dark:hover:text-[#9A9A94] transition-colors">
            {reason === 'daily' ? L('Morgen wieder', 'Revenir demain', 'Torna domani', 'Come back tomorrow') : L('Vielleicht später', 'Peut-être plus tard', 'Forse più tardi', 'Maybe later')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null, errorInfo: null, recovering: false };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) {
    // Surface the actual error so it shows up in browser logs and any monitoring
    try {
      console.error('[Stellify] Uncaught render error:', error, errorInfo);
      // Best-effort: avoid loops by limiting writes
      const key = '__stellify_last_error';
      const payload = JSON.stringify({
        message: String(error?.message || error),
        stack: String(error?.stack || ''),
        componentStack: String(errorInfo?.componentStack || ''),
        time: new Date().toISOString(),
        url: window.location.href,
      });
      localStorage.setItem(key, payload);
    } catch { /* swallow logging errors */ }
    // Tell the server what broke on the visitor's device — without this we
    // only ever see screenshots, never the actual error.
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: String(error?.message || error).slice(0, 500),
          stack: String(error?.stack || '').slice(0, 1500),
          url: window.location.href.slice(0, 300),
          ua: navigator.userAgent.slice(0, 200),
        }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* never let reporting throw */ }
    // Self-heal FIRST: one silent reload per session fixes the usual causes
    // (stale deploy, interrupted chunk, flaky mobile network) before any
    // visitor ever sees the error screen.
    try {
      if (sessionStorage.getItem('stellify_eb_recover') !== '1') {
        sessionStorage.setItem('stellify_eb_recover', '1');
        (this as any).setState({ recovering: true });
        window.location.reload();
        return;
      }
    } catch { /* fall through to the error screen */ }
    (this as any).setState({ errorInfo });
  }
  render() {
    if ((this as any).state.recovering) return null;
    if ((this as any).state.hasError) {
      const lang = (() => { try { return localStorage.getItem('language') || 'DE'; } catch { return 'DE'; } })();
      const title = lang === 'FR' ? 'Une erreur inattendue s\'est produite.' : lang === 'IT' ? 'Si è verificato un errore imprevisto.' : lang === 'EN' ? 'An unexpected error has occurred.' : 'Ein unerwarteter Fehler ist aufgetreten.';
      const desc = lang === 'FR' ? 'Toutes nos excuses. Réessaie ou retourne à la page d\'accueil.' : lang === 'IT' ? 'Ci scusiamo. Riprova o torna alla pagina iniziale.' : lang === 'EN' ? 'We apologise. Please try again or go back to the homepage.' : 'Bitte entschuldige. Versuche es erneut oder gehe zurück zur Startseite.';
      const btn = lang === 'FR' ? 'Recharger la page' : lang === 'IT' ? 'Ricarica la pagina' : lang === 'EN' ? 'Reload page' : 'Seite neu laden';
      const home = lang === 'FR' ? 'Accueil' : lang === 'IT' ? 'Home' : lang === 'EN' ? 'Home' : 'Startseite';
      const supportLabel = lang === 'FR' ? 'Contacter le support' : lang === 'IT' ? 'Contatta il supporto' : lang === 'EN' ? 'Contact support' : 'Support kontaktieren';
      const errMsg = (() => {
        try { return String((this as any).state.error?.message || ''); } catch { return ''; }
      })();
      const showDetails = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] dark:bg-[#1A1A18] p-6 sm:p-12 text-center">
          <div className="max-w-md space-y-6">
            <svg width="48" height="48" viewBox="0 0 32 32" className="mx-auto text-[#004225] dark:text-[#00A854]" aria-hidden="true">
              <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
            </svg>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#004225] dark:text-[#00A854]">{title}</h1>
            <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">{desc}</p>
            {showDetails && errMsg && (
              <pre className="text-[10px] text-left bg-black/5 dark:bg-white/5 p-3 overflow-auto max-h-32 font-mono text-[#5C5C58] dark:text-[#9A9A94]">{errMsg}</pre>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-[#004225] text-white px-8 py-3 text-sm font-medium hover:bg-[#00331d] transition-all"
              >
                {btn}
              </button>
              <a
                href="/"
                className="border border-[#004225]/30 text-[#004225] dark:border-[#00A854]/40 dark:text-[#00A854] px-8 py-3 text-sm font-medium hover:bg-[#004225]/5 transition-all"
              >
                {home}
              </a>
            </div>
            <a
              href="mailto:support.stellify@gmail.com?subject=Stellify%20Error"
              className="block text-xs text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors mt-4"
            >
              {supportLabel} →
            </a>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// A/B test for the hero subline. Assigned once per browser, persisted, and
// written onto the user doc at registration so conversion per variant can be
// compared straight in Firestore (counts are comparable at a 50/50 split).
// Google blocks OAuth inside embedded in-app browsers (Instagram, TikTok,
// Facebook, Snapchat and friends) with a 403 disallowed_useragent. Detect
// those so the sign-in page can explain it instead of dead-ending people.
function isInAppBrowser(): boolean {
  try {
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Snapchat|Line\/|MicroMessenger|GSA\/|LinkedInApp|; wv\)/i.test(ua);
  } catch { return false; }
}

function getHeroVariant(): 'a' | 'b' {
  try {
    let v = localStorage.getItem('stellify_hero_variant');
    if (v !== 'a' && v !== 'b') {
      v = Math.random() < 0.5 ? 'a' : 'b';
      localStorage.setItem('stellify_hero_variant', v);
    }
    return v as 'a' | 'b';
  } catch { return 'a'; }
}

function handleDbError(error: unknown, operation: string, path: string | null) {
  console.error(`DB Error (non-fatal) [${operation}] ${path}:`, error instanceof Error ? error.message : String(error));
}

// --- LAZY COMPONENTS ---
const PROMO_VIDEO_URL: string = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PROMO_VIDEO_URL) || "";

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
      className="fixed bottom-0 left-0 right-0 z-[200] p-3 sm:p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 shadow-2xl p-4 sm:p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
        {/* Icon — hidden on tiny screens to save space */}
        <div className="hidden sm:flex flex-shrink-0 w-10 h-10 bg-[#004225]/8 items-center justify-center text-[#004225] dark:text-[#00C060]">
          <Shield size={20} />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#1A1A18] dark:text-[#FAFAF8] mb-1">
            {t.cookie_title}
          </p>
          <p className="text-[11px] sm:text-xs text-[#6B6B66] dark:text-[#9A9A94] leading-relaxed">
            {t.cookie_desc}{' '}
            <button
              onClick={onPrivacyLink}
              className="text-[#004225] dark:text-[#00C060] underline underline-offset-2 hover:no-underline"
            >
              {t.cookie_privacy_link}
            </button>
          </p>
        </div>
        {/* Buttons — grid on mobile so both buttons fit on one row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 flex-shrink-0 w-full md:w-auto">
          <button
            onClick={onEssential}
            className="px-3 sm:px-4 py-3 sm:py-2.5 text-[10px] font-bold uppercase tracking-widest border border-black/15 dark:border-white/15 text-[#4A4A45] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 transition-all min-h-[44px]"
          >
            {t.cookie_essential}
          </button>
          <button
            onClick={onAccept}
            className="px-4 sm:px-6 py-3 sm:py-2.5 text-[10px] font-bold uppercase tracking-widest bg-[#004225] text-white hover:bg-[#00331D] transition-all min-h-[44px]"
          >
            {t.cookie_accept}
          </button>
        </div>
      </div>
    </motion.div>
  </AnimatePresence>
);


// Capitalise the first letter of a typed entry (Firma / Position / Ort) so
// "googel" becomes "Googel" without touching the rest of what the user typed.
const capFirst = (s: string) => {
  const t = (s || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

// Gentle desktop hint — mobile only. Stellify works fully on the phone; on a
// computer the form and the live preview simply sit side by side, which is a
// genuinely useful thing to know. Positive wording, no nag.
const DesktopTip = ({ language, className = '' }: { language: string; className?: string }) => (
  <div className={`lg:hidden ${className}`}>
    <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-[#004225]/12 dark:border-[#00A854]/20 bg-gradient-to-br from-[#004225]/[0.06] via-[#004225]/[0.03] to-[#00A854]/[0.02]">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1A1A18] shadow-sm border border-[#004225]/10 dark:border-[#00A854]/20 flex items-center justify-center text-[#004225] dark:text-[#00A854] shrink-0">
        <Monitor size={16} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#004225] dark:text-[#00A854] mb-1">
          {language === 'FR' ? 'Astuce' : language === 'IT' ? 'Suggerimento' : language === 'EN' ? 'Tip' : 'Tipp'}
        </p>
        <p className="text-[12.5px] text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">
          {language === 'FR' ? "Sur un ordinateur, tu vois le formulaire et l'aperçu de ta candidature côte à côte, c'est encore plus confortable."
            : language === 'IT' ? "Sul computer vedi il modulo e l'anteprima della candidatura fianco a fianco, ancora più comodo."
            : language === 'EN' ? 'On a computer you see the form and the live preview of your application side by side, even more comfortable.'
            : 'Auf dem Computer siehst du das Formular und die Vorschau deiner Bewerbung direkt nebeneinander, das arbeitet sich noch angenehmer.'}
        </p>
      </div>
    </div>
  </div>
);

const Avatar = ({ name, color, src }: { name: string, color: string, src?: string }) => (
  <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-serif text-lg shadow-inner overflow-hidden`}>
    {src ? (
      <img src={src} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      name.charAt(0)
    )}
  </div>
);

// ── Preset avatars ────────────────────────────────────────────────────────────
// Users pick an illustrated avatar instead of uploading a photo — no storage,
// no moderation, no privacy questions. Drawn inline so they load instantly.
type AvatarPresetDef = {
  id: string;
  bg: string;        // circle background
  skin: string;
  hair: string;      // hair colour
  style: 'short' | 'side' | 'long' | 'bun' | 'curly' | 'buzz';
  suit: string;
  glasses?: boolean;
  beard?: boolean;
};

// Name + trait shown in the picker when an avatar is hovered or selected.
// Kept next to the presets (not in the big i18n tables) so avatar data stays
// in one place.
const AVATAR_MEANINGS: Record<string, Record<'DE' | 'FR' | 'IT' | 'EN', { name: string; desc: string }>> = {
  aria:    { DE: { name: 'Aria',    desc: 'Die Kreative. Findet Wege, die andere übersehen.' },        FR: { name: 'Aria',    desc: 'La créative. Trouve des chemins que les autres ne voient pas.' },      IT: { name: 'Aria',    desc: 'La creativa. Trova strade che gli altri non vedono.' },            EN: { name: 'Aria',    desc: 'The creative. Finds paths others overlook.' } },
  luca:    { DE: { name: 'Luca',    desc: 'Der Macher. Redet nicht lange, liefert.' },                  FR: { name: 'Luca',    desc: "L'homme d'action. Peu de mots, des résultats." },                      IT: { name: 'Luca',    desc: "L'uomo del fare. Poche parole, risultati." },                      EN: { name: 'Luca',    desc: 'The doer. Less talk, more results.' } },
  mira:    { DE: { name: 'Mira',    desc: 'Die Strategin. Denkt zwei Schritte voraus.' },               FR: { name: 'Mira',    desc: 'La stratège. Toujours deux coups en avance.' },                        IT: { name: 'Mira',    desc: 'La stratega. Pensa sempre due mosse avanti.' },                    EN: { name: 'Mira',    desc: 'The strategist. Always two steps ahead.' } },
  jon:     { DE: { name: 'Jon',     desc: 'Der Analytiker. Zahlen, Fakten, klare Sicht.' },             FR: { name: 'Jon',     desc: "L'analyste. Chiffres, faits, vision claire." },                        IT: { name: 'Jon',     desc: "L'analista. Numeri, fatti, visione chiara." },                     EN: { name: 'Jon',     desc: 'The analyst. Numbers, facts, clear view.' } },
  noa:     { DE: { name: 'Noa',     desc: 'Die Visionärin. Sieht das grosse Ganze.' },                  FR: { name: 'Noa',     desc: 'La visionnaire. Voit la grande image.' },                              IT: { name: 'Noa',     desc: 'La visionaria. Vede il quadro completo.' },                        EN: { name: 'Noa',     desc: 'The visionary. Sees the big picture.' } },
  elias:   { DE: { name: 'Elias',   desc: 'Der Ruhepol. Bleibt gelassen, wenn es zählt.' },             FR: { name: 'Elias',   desc: 'Le calme. Serein quand ça compte.' },                                  IT: { name: 'Elias',   desc: 'La calma. Sereno quando conta.' },                                 EN: { name: 'Elias',   desc: 'The calm one. Steady when it matters.' } },
  lena:    { DE: { name: 'Lena',    desc: 'Die Energie. Bringt Schwung in jedes Team.' },               FR: { name: 'Lena',    desc: "L'énergie. Dynamise chaque équipe." },                                 IT: { name: 'Lena',    desc: "L'energia. Dà slancio a ogni team." },                             EN: { name: 'Lena',    desc: 'The energy. Lifts every team.' } },
  samu:    { DE: { name: 'Samu',    desc: 'Der Mentor. Erfahrung, auf die man baut.' },                 FR: { name: 'Samu',    desc: 'Le mentor. Une expérience sur laquelle compter.' },                    IT: { name: 'Samu',    desc: 'Il mentore. Esperienza su cui contare.' },                         EN: { name: 'Samu',    desc: 'The mentor. Experience you can build on.' } },
  ivy:     { DE: { name: 'Ivy',     desc: 'Die Perfektionistin. Details machen den Unterschied.' },     FR: { name: 'Ivy',     desc: 'La perfectionniste. Les détails font la différence.' },                IT: { name: 'Ivy',     desc: 'La perfezionista. I dettagli fanno la differenza.' },              EN: { name: 'Ivy',     desc: 'The perfectionist. Details make the difference.' } },
  timo:    { DE: { name: 'Timo',    desc: 'Der Optimist. Sieht in jeder Absage eine Chance.' },         FR: { name: 'Timo',    desc: "L'optimiste. Chaque refus est une chance." },                          IT: { name: 'Timo',    desc: "L'ottimista. Ogni rifiuto è una chance." },                        EN: { name: 'Timo',    desc: 'The optimist. Every no hides a yes.' } },
  sofia:   { DE: { name: 'Sofia',   desc: 'Die Souveräne. Ruhe und Klarheit im Auftritt.' },            FR: { name: 'Sofia',   desc: 'La souveraine. Calme et clarté en toute situation.' },                 IT: { name: 'Sofia',   desc: 'La sicura. Calma e chiarezza in ogni situazione.' },               EN: { name: 'Sofia',   desc: 'The composed one. Calm and clarity in every room.' } },
  finn:    { DE: { name: 'Finn',    desc: 'Der Aufsteiger. Am Anfang, aber nicht mehr lange.' },        FR: { name: 'Finn',    desc: "L'étoile montante. Au début, mais plus pour longtemps." },             IT: { name: 'Finn',    desc: "L'emergente. All'inizio, ma non per molto." },                     EN: { name: 'Finn',    desc: 'The riser. At the start, but not for long.' } },
  stella:  { DE: { name: 'Stella',  desc: 'Der Stern von Stellify. Für alle, die hoch hinauswollen.' }, FR: { name: 'Stella',  desc: "L'étoile de Stellify. Pour celles et ceux qui visent haut." },         IT: { name: 'Stella',  desc: 'La stella di Stellify. Per chi punta in alto.' },                  EN: { name: 'Stella',  desc: 'The Stellify star. For everyone aiming high.' } },
  rocket:  { DE: { name: 'Rakete',  desc: 'Der Durchstarter. Karriere mit Schub.' },                    FR: { name: 'Fusée',   desc: 'Le décollage. Une carrière propulsée.' },                              IT: { name: 'Razzo',   desc: 'Il decollo. Carriera con la spinta giusta.' },                     EN: { name: 'Rocket',  desc: 'The launcher. A career with thrust.' } },
  berg:    { DE: { name: 'Gipfel',  desc: 'Die Beständigkeit. Schritt für Schritt nach oben.' },        FR: { name: 'Sommet',  desc: 'La constance. Pas à pas vers le haut.' },                              IT: { name: 'Vetta',   desc: 'La costanza. Passo dopo passo verso la cima.' },                   EN: { name: 'Summit',  desc: 'The steady climb. Step by step to the top.' } },
  pokal:   { DE: { name: 'Pokal',   desc: 'Der Champion. Erfolge sind kein Zufall.' },                  FR: { name: 'Trophée', desc: 'Le champion. Le succès n’est pas un hasard.' },                   IT: { name: 'Trofeo',  desc: 'Il campione. Il successo non è un caso.' },                        EN: { name: 'Trophy',  desc: 'The champion. Success is no accident.' } },
  ziel:    { DE: { name: 'Ziel',    desc: 'Die Zielstrebige. Fokus auf den Punkt, der zählt.' },        FR: { name: 'Cible',   desc: 'La détermination. Le focus sur ce qui compte.' },                      IT: { name: 'Bersaglio', desc: 'La determinazione. Focus su ciò che conta.' },                   EN: { name: 'Target',  desc: 'The focused one. Eyes on what counts.' } },
  idee:    { DE: { name: 'Idee',    desc: 'Der Ideengeber. Immer einen Einfall voraus.' },              FR: { name: 'Idée',    desc: "L'inventif. Toujours une idée d'avance." },                            IT: { name: 'Idea',    desc: "L'inventivo. Sempre un'idea avanti." },                            EN: { name: 'Idea',    desc: 'The idea machine. Always one thought ahead.' } },
  koffer:  { DE: { name: 'Koffer',  desc: 'Die Professionalität. Bereit für den nächsten Termin.' },    FR: { name: 'Mallette', desc: 'Le professionnalisme. Prêt pour le prochain rendez-vous.' },          IT: { name: 'Valigetta', desc: 'La professionalità. Pronto per il prossimo appuntamento.' },     EN: { name: 'Briefcase', desc: 'The professional. Ready for the next meeting.' } },
  kompass: { DE: { name: 'Kompass', desc: 'Der Kursfinder. Kennt die Richtung, auch im Sturm.' },       FR: { name: 'Boussole', desc: 'Le cap. Garde la direction, même dans la tempête.' },                 IT: { name: 'Bussola', desc: 'La rotta. Conosce la direzione anche nella tempesta.' },           EN: { name: 'Compass', desc: 'The navigator. Knows the way, even in a storm.' } },
};

const AVATAR_PRESETS: AvatarPresetDef[] = [
  { id: 'aria',   bg: '#DCE9E2', skin: '#F4C89C', hair: '#5B4630', style: 'long',  suit: '#14352A' },
  { id: 'luca',   bg: '#EFE7D8', skin: '#E8B98A', hair: '#2C2C2A', style: 'short', suit: '#37413D' },
  { id: 'mira',   bg: '#E2E9F0', skin: '#B97B4C', hair: '#1F1D1B', style: 'bun',   suit: '#14352A' },
  { id: 'jon',    bg: '#EAE4F0', skin: '#F4C89C', hair: '#A67C48', style: 'side',  suit: '#14352A', glasses: true },
  { id: 'noa',    bg: '#F0E4E0', skin: '#D9A06B', hair: '#2C2C2A', style: 'curly', suit: '#37413D' },
  { id: 'elias',  bg: '#DBEDE4', skin: '#8A5A3B', hair: '#1F1D1B', style: 'buzz',  suit: '#14352A', beard: true },
  { id: 'lena',   bg: '#F0EBDD', skin: '#F1BE93', hair: '#B4552D', style: 'long',  suit: '#37413D', glasses: true },
  { id: 'samu',   bg: '#E4EEF0', skin: '#EFC49B', hair: '#8A8A88', style: 'short', suit: '#14352A', beard: true },
  { id: 'ivy',    bg: '#E9E4D6', skin: '#C98F5B', hair: '#5B4630', style: 'bun',   suit: '#37413D', glasses: true },
  { id: 'timo',   bg: '#DFE9E4', skin: '#F4C89C', hair: '#2C2C2A', style: 'curly', suit: '#14352A' },
  { id: 'sofia',  bg: '#EEE6EC', skin: '#E2AF7F', hair: '#1F1D1B', style: 'long',  suit: '#14352A' },
  { id: 'finn',   bg: '#E6EDDC', skin: '#F1BE93', hair: '#A67C48', style: 'buzz',  suit: '#37413D' },
];

// Symbol avatars — Stella (the Stellify star) and career-themed icons for
// everyone who prefers no face at all.
const SYMBOL_AVATARS: { id: string; bg: string; node: React.ReactNode }[] = [
  { id: 'stella', bg: '#0B2E21', node: <>
    <path d="M50 16 Q55 42 80 52 Q56 56 48 84 Q45 58 20 46 Q46 42 50 16 Z" fill="#2BC98C" />
    <circle cx="69" cy="28" r="2.5" fill="#EAF7F0" opacity="0.9" />
    <circle cx="30" cy="66" r="1.8" fill="#EAF7F0" opacity="0.6" />
  </> },
  { id: 'rocket', bg: '#E2E9F0', node: <>
    <path d="M50 16 Q63 32 63 54 L37 54 Q37 32 50 16 Z" fill="#1F4D3A" />
    <circle cx="50" cy="38" r="6" fill="#EAF7F0" />
    <circle cx="50" cy="38" r="3.2" fill="#9FC5B4" />
    <path d="M37 54 L27 68 L39 62 Z" fill="#14352A" />
    <path d="M63 54 L73 68 L61 62 Z" fill="#14352A" />
    <path d="M44 60 Q50 80 56 60 Q53 66 50 66 Q47 66 44 60 Z" fill="#F2B23E" />
  </> },
  { id: 'berg', bg: '#EAF0E4', node: <>
    <circle cx="72" cy="26" r="6" fill="#F2B23E" />
    <path d="M12 78 L42 30 L60 58 L70 44 L90 78 Z" fill="#3E5C4E" />
    <path d="M42 30 L49 41 L44 45 L38 40 Z" fill="#F5F7F4" />
    <path d="M70 44 L75 52 L71 55 L66 51 Z" fill="#F5F7F4" />
  </> },
  { id: 'pokal', bg: '#F0EBDD', node: <>
    <path d="M34 26 L66 26 L63 50 Q50 62 37 50 Z" fill="#D9A93C" />
    <path d="M34 30 Q22 32 30 44 Q34 48 38 48" stroke="#B98A2E" strokeWidth="3.5" fill="none" />
    <path d="M66 30 Q78 32 70 44 Q66 48 62 48" stroke="#B98A2E" strokeWidth="3.5" fill="none" />
    <rect x="46" y="56" width="8" height="10" fill="#B98A2E" />
    <rect x="36" y="66" width="28" height="7" rx="2" fill="#8A6A20" />
    <path d="M50 32 L52 37 L57 38 L52 40 L50 45 L48 40 L43 38 L48 37 Z" fill="#F7EFD8" />
  </> },
  { id: 'ziel', bg: '#E4EEF0', node: <>
    <circle cx="50" cy="50" r="24" fill="#14352A" />
    <circle cx="50" cy="50" r="17" fill="#F5F5F2" />
    <circle cx="50" cy="50" r="10" fill="#2BAE7E" />
    <circle cx="50" cy="50" r="3.5" fill="#14352A" />
    <path d="M50 50 L72 28" stroke="#C0392B" strokeWidth="3" strokeLinecap="round" />
    <path d="M72 28 L74 18 L78 26 L86 28 L76 32 Z" fill="#C0392B" />
  </> },
  { id: 'idee', bg: '#F0EBD8', node: <>
    <circle cx="50" cy="42" r="16" fill="#F2C94C" />
    <path d="M44 55 Q50 60 56 55 L55 62 L45 62 Z" fill="#E5B93C" />
    <rect x="44" y="62" width="12" height="4" rx="2" fill="#8A8A88" />
    <rect x="45" y="67" width="10" height="3.5" rx="1.75" fill="#8A8A88" />
    <path d="M50 18 L50 12 M68 24 L72 20 M32 24 L28 20 M74 42 L80 42 M26 42 L20 42" stroke="#D9A93C" strokeWidth="2.5" strokeLinecap="round" />
  </> },
  { id: 'koffer', bg: '#DFE9E4', node: <>
    <rect x="27" y="38" width="46" height="32" rx="4" fill="#14352A" />
    <path d="M42 38 L42 30 Q42 28 44 28 L56 28 Q58 28 58 30 L58 38" stroke="#14352A" strokeWidth="4" fill="none" />
    <rect x="27" y="50" width="46" height="3" fill="#0B241A" />
    <rect x="45" y="48" width="10" height="8" rx="1.5" fill="#D9A93C" />
  </> },
  { id: 'kompass', bg: '#EAE4F0', node: <>
    <circle cx="50" cy="50" r="22" fill="#F5F5F2" stroke="#14352A" strokeWidth="2.5" />
    <path d="M50 32 L56 50 L44 50 Z" fill="#C0392B" />
    <path d="M44 50 L56 50 L50 68 Z" fill="#14352A" />
    <circle cx="50" cy="50" r="2.6" fill="#F5F5F2" />
  </> },
];

const PresetAvatar = ({ id, className }: { id: string; className?: string }) => {
  const sym = SYMBOL_AVATARS.find(a => a.id === id);
  if (sym) return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={sym.bg} />
      <clipPath id={`avs-${sym.id}`}><circle cx="50" cy="50" r="50" /></clipPath>
      <g clipPath={`url(#avs-${sym.id})`}>{sym.node}</g>
    </svg>
  );
  const p = AVATAR_PRESETS.find(a => a.id === id);
  if (!p) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={p.bg} />
      <clipPath id={`av-${p.id}`}><circle cx="50" cy="50" r="50" /></clipPath>
      <g clipPath={`url(#av-${p.id})`}>
        {/* long hair sits behind the shoulders */}
        {p.style === 'long' && <path d="M28 40 Q26 78 32 92 L68 92 Q74 78 72 40 Q71 22 50 22 Q29 22 28 40 Z" fill={p.hair} />}
        {/* torso */}
        <path d="M22 100 Q24 74 50 74 Q76 74 78 100 Z" fill={p.suit} />
        {/* neck */}
        <rect x="44" y="58" width="12" height="14" rx="5" fill={p.skin} />
        {/* head */}
        <circle cx="50" cy="44" r="19" fill={p.skin} />
        {/* hair styles */}
        {p.style === 'short' && <path d="M31 44 Q29 24 50 24 Q71 24 69 44 Q69 36 62 33 Q52 29 42 33 Q31 36 31 44 Z" fill={p.hair} />}
        {p.style === 'side' && <path d="M31 45 Q29 23 52 24 Q72 25 69 45 Q66 33 56 34 Q44 26 36 37 Q32 40 31 45 Z" fill={p.hair} />}
        {p.style === 'long' && <path d="M31 46 Q29 23 50 23 Q71 23 69 46 Q68 34 60 32 Q50 28 40 32 Q32 34 31 46 Z" fill={p.hair} />}
        {p.style === 'bun' && <>
          <circle cx="50" cy="20" r="8" fill={p.hair} />
          <path d="M31 44 Q29 24 50 24 Q71 24 69 44 Q68 34 60 32 Q50 28 40 32 Q32 34 31 44 Z" fill={p.hair} />
        </>}
        {p.style === 'curly' && <>
          <circle cx="36" cy="33" r="8" fill={p.hair} />
          <circle cx="46" cy="27" r="9" fill={p.hair} />
          <circle cx="57" cy="27" r="9" fill={p.hair} />
          <circle cx="65" cy="34" r="8" fill={p.hair} />
        </>}
        {p.style === 'buzz' && <path d="M32 40 Q32 26 50 26 Q68 26 68 40 Q60 32 50 32 Q40 32 32 40 Z" fill={p.hair} />}
        {/* beard */}
        {p.beard && <path d="M36 48 Q38 62 50 62 Q62 62 64 48 Q62 58 50 58 Q38 58 36 48 Z" fill={p.hair} opacity="0.9" />}
        {/* eyes */}
        <circle cx="43" cy="45" r="2.1" fill="#2A2622" />
        <circle cx="57" cy="45" r="2.1" fill="#2A2622" />
        {/* glasses */}
        {p.glasses && <g stroke="#2A2622" strokeWidth="1.6" fill="none" opacity="0.85">
          <circle cx="43" cy="45" r="5.5" />
          <circle cx="57" cy="45" r="5.5" />
          <path d="M48.5 45 L51.5 45" />
        </g>}
        {/* smile */}
        <path d="M45 53 Q50 57 55 53" stroke="#2A2622" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
};

// Small icon button with a custom tooltip that appears below the icon on hover/focus.
function CardActionButton({ onClick, label, icon, className }: { onClick: () => void; label: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className="relative group/btn">
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`p-1.5 rounded transition-all ${className || ''}`}
      >
        {icon}
      </button>
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-[#1A1A18] text-white text-[10px] font-medium uppercase tracking-wider whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-20">
        {label}
      </span>
    </div>
  );
}

// Sortable table row — drag handle on the left, rest of the row stays clickable.
// Status → readable colors in BOTH themes. The old single dark-green tone
// disappeared on the dark background and made the whole row look broken.
function statusSelectClasses(status: string): string {
  switch (status) {
    case 'Interview': return 'text-[#B8862F] dark:text-[#D4A852] border-[#D4A852]/50';
    case 'Offer': return 'text-[#004225] dark:text-[#00A854] border-[#004225]/35 dark:border-[#00A854]/45';
    case 'Rejected': return 'text-[#B0413E] dark:text-[#E08585] border-[#C0504D]/40';
    case 'Wishlist': return 'text-[#4A4A45] dark:text-[#B5B5AF] border-black/15 dark:border-white/20';
    default: return 'text-[#1A1A18] dark:text-[#EBEBEB] border-black/15 dark:border-white/25'; // Applied
  }
}

// Company monogram — a company entry without a logo looked like nothing, so
// the first letter becomes a small logo-style tile.
function CompanyMonogram({ name, size = 'w-7 h-7 text-[11px]' }: { name?: string; size?: string }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={`${size} shrink-0 rounded-md bg-[#004225]/[0.08] dark:bg-[#00A854]/15 border border-[#004225]/15 dark:border-[#00A854]/25 text-[#004225] dark:text-[#00A854] flex items-center justify-center font-bold font-serif`} aria-hidden="true">
      {letter}
    </span>
  );
}

// Inline-editable table cell — the whole tracker list is editable in place,
// no pencil needed. While viewing it is plain text that WRAPS (so long
// company names are never cut off); a tap turns it into a field. Saves on
// blur or Enter, reverts on Escape. `format` lets a raw stored value (e.g. a
// salary) display nicely while it isn't being edited.
function EditableCell({ value, onSave, placeholder, className, ariaLabel, inputMode, format, singleLine }: any) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState<string>(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!editing) setVal(value ?? ''); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); }
        }}
        onBlur={() => {
          setEditing(false);
          const trimmed = val.trim();
          if ((value ?? '') !== trimmed) onSave(trimmed);
        }}
        className={`w-full bg-white dark:bg-[#1A1A18] border border-[#004225]/50 dark:border-[#00A854]/50 rounded px-1.5 py-1 -ml-1.5 focus:outline-none ${className || ''}`}
      />
    );
  }
  // View mode: a full-width text button. `singleLine` keeps it on one line and
  // ends a too-long value with an ellipsis (the full text is one tap away in
  // edit mode); otherwise the value wraps.
  const shown = format && val ? format(val) : val;
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      title={typeof shown === 'string' ? shown : undefined}
      className={`block w-full text-left px-1.5 py-1 -ml-1.5 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-text leading-snug ${singleLine ? 'truncate md:overflow-visible md:whitespace-normal md:break-words' : 'break-words'} ${className || ''}`}
    >
      {shown || <span className="opacity-40 font-normal">{placeholder || '–'}</span>}
    </button>
  );
}

function SortableAppRow({ app, t, language, statusLabel, salaryFmt, onEdit, onArchive, onDelete, onStatusChange, onCreateApplication, onToggleFavorite, onFieldSave }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style: React.CSSProperties = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? 'rgba(0,66,37,0.04)' : undefined,
  };
  // Nudge when an open application has had no movement for two weeks —
  // the moment a short follow-up call or mail pays off most.
  const updatedDate = app.updated_at ? new Date(app.updated_at) : (app.updatedAt?.toDate ? app.updatedAt.toDate() : null);
  const staleDays = updatedDate ? Math.floor((Date.now() - updatedDate.getTime()) / 86400000) : 0;
  const isStale = !app.archived && staleDays >= 14 && (app.status === 'Wishlist' || app.status === 'Applied' || app.status === 'Interview');
  return (
    <tr ref={setNodeRef} style={style} className={`border-b border-black/5 dark:border-white/5 hover:bg-[#FAFAF8] dark:hover:bg-[#1A1A18] transition-colors ${app.archived ? 'opacity-60' : ''}`}>
      <td className="pl-2 pr-1 py-3 w-8 hidden sm:table-cell">
        <button
          {...attributes}
          {...listeners}
          aria-label={language === 'FR' ? 'Réorganiser' : language === 'IT' ? 'Riordina' : language === 'EN' ? 'Reorder' : 'Sortieren'}
          title={language === 'FR' ? 'Glisser pour déplacer' : language === 'IT' ? 'Trascina per riordinare' : language === 'EN' ? 'Drag to reorder' : 'Zum Verschieben ziehen'}
          className="text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] cursor-grab active:cursor-grabbing touch-none p-1 -m-1"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="3" r="1" /><circle cx="9" cy="3" r="1" />
            <circle cx="3" cy="6" r="1" /><circle cx="9" cy="6" r="1" />
            <circle cx="3" cy="9" r="1" /><circle cx="9" cy="9" r="1" />
          </svg>
        </button>
      </td>
      <td className="px-3 sm:px-4 py-3 font-bold text-[#1A1A18] dark:text-[#FAFAF8] w-full md:w-auto max-w-0 md:max-w-none">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <CompanyMonogram name={app.company} size="w-6 h-6 text-[10px] sm:w-7 sm:h-7 sm:text-[11px]" />
          <div className="min-w-0 flex-1">
            {onFieldSave ? (
              <EditableCell singleLine value={capFirst(app.company)} onSave={(v: string) => onFieldSave(app.id, 'company', v)} placeholder={t.tracker_col_company} ariaLabel={t.tracker_col_company} className="text-[13px] sm:text-sm font-bold text-[#1A1A18] dark:text-[#FAFAF8]" />
            ) : (
              <span className="block truncate text-[13px] sm:text-sm">{capFirst(app.company)}</span>
            )}
            {/* On mobile the position has no column of its own, so it sits
                on a second line under the company name, also single-line. */}
            <div className="md:hidden">
              {onFieldSave ? (
                <EditableCell singleLine value={capFirst(app.position)} onSave={(v: string) => onFieldSave(app.id, 'position', v)} placeholder={t.tracker_col_position} ariaLabel={t.tracker_col_position} className="text-[12px] font-normal text-[#5C5C58] dark:text-[#9A9A94]" />
              ) : (
                <span className="block truncate text-[12px] font-normal text-[#5C5C58] dark:text-[#9A9A94]">{capFirst(app.position)}</span>
              )}
            </div>
          </div>
          {app.favorite && <Star size={11} className="shrink-0 text-[#D4A852] fill-[#D4A852]" aria-hidden="true" />}
        </div>
      </td>
      <td className="px-4 py-3 text-[#5C5C58] dark:text-[#B5B5AF] hidden md:table-cell">
        {onFieldSave ? (
          <EditableCell value={capFirst(app.position)} onSave={(v: string) => onFieldSave(app.id, 'position', v)} ariaLabel={t.tracker_col_position} className="text-[#5C5C58] dark:text-[#B5B5AF]" />
        ) : capFirst(app.position)}
      </td>
      <td className="px-2 sm:px-4 py-3">
        <select
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value)}
          className={`text-[11px] font-medium bg-white dark:bg-[#1A1A18] border rounded-sm hover:border-[#004225]/60 dark:hover:border-[#00A854]/60 focus:outline-none px-1.5 sm:px-2 py-1 cursor-pointer transition-all ${statusSelectClasses(app.status)}`}
        >
          <option value="Wishlist">{t.tracker_wishlist}</option>
          <option value="Applied">{t.tracker_applied}</option>
          <option value="Interview">{t.tracker_interview}</option>
          <option value="Offer">{t.tracker_offer}</option>
          <option value="Rejected">{t.tracker_rejected}</option>
        </select>
      </td>
      <td className="px-4 py-3 text-[#5C5C58] dark:text-[#9A9A94] hidden md:table-cell">
        {onFieldSave ? (
          <EditableCell value={capFirst(app.location)} onSave={(v: string) => onFieldSave(app.id, 'location', v)} placeholder={language === 'FR' ? 'Lieu' : language === 'IT' ? 'Luogo' : language === 'EN' ? 'Location' : 'Ort'} ariaLabel={t.tracker_col_location} className="text-[#5C5C58] dark:text-[#9A9A94]" />
        ) : (app.location ? capFirst(app.location) : '-')}
      </td>
      <td className="px-4 py-3 text-[#5C5C58] dark:text-[#9A9A94] hidden md:table-cell">
        {onFieldSave ? (
          <EditableCell value={app.salary ? String(app.salary) : ''} onSave={(v: string) => onFieldSave(app.id, 'salary', v)} placeholder="CHF" inputMode="numeric" ariaLabel={t.tracker_col_salary} className="text-[#5C5C58] dark:text-[#9A9A94] tabular-nums" format={(raw: string) => { const num = raw.replace(/[^\d.]/g, ''); if (!num) return raw; const n = parseFloat(num); return isNaN(n) ? raw : `CHF ${n.toLocaleString('de-CH', { maximumFractionDigits: 0 })}`; }} />
        ) : (salaryFmt || '-')}
      </td>
      <td className="px-4 py-3 text-[#9A9A94] font-mono text-xs hidden lg:table-cell">
        <span className="inline-flex items-center gap-2">
          {updatedDate ? updatedDate.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
          {isStale && (
            <span
              title={language === 'FR' ? `Aucun mouvement depuis ${staleDays} jours, le bon moment pour relancer` : language === 'IT' ? `Nessun movimento da ${staleDays} giorni, il momento giusto per un sollecito` : language === 'EN' ? `No movement for ${staleDays} days, time to follow up` : `Seit ${staleDays} Tagen keine Bewegung, Zeit zum Nachfassen`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#D4A852]/15 text-[#B8862F] dark:text-[#D4A852] text-[9px] font-bold uppercase tracking-wider"
            >
              <span className="w-1 h-1 rounded-full bg-[#D4A852]" />
              {staleDays}d
            </span>
          )}
        </span>
      </td>
      <td className="px-2 sm:px-4 py-3">
        <div className="flex gap-0.5 sm:gap-1 justify-end">
          {onToggleFavorite && (
            <button onClick={() => onToggleFavorite(app.id, !app.favorite)} title={app.favorite ? (language === 'FR' ? 'Retirer des favoris' : language === 'IT' ? 'Rimuovi dai preferiti' : language === 'EN' ? 'Remove from favorites' : 'Favorit entfernen') : (language === 'FR' ? 'Marquer comme favori' : language === 'IT' ? 'Segna come preferito' : language === 'EN' ? 'Mark as favorite' : 'Als Favorit markieren')} className={`p-1.5 rounded transition-all ${app.favorite ? 'text-[#D4A852] hover:bg-[#D4A852]/10' : 'text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#D4A852]'}`}><Star size={13} className={app.favorite ? 'fill-[#D4A852]' : ''} /></button>
          )}
          {/* Stella-create and archive are desktop-only to keep the mobile row
              airy; both stay reachable via the edit dialog / desktop. */}
          {onCreateApplication && (
            <button onClick={() => onCreateApplication(app)} title={language === 'FR' ? 'Créer la candidature avec Stella' : language === 'IT' ? 'Crea la candidatura con Stella' : language === 'EN' ? 'Create the application with Stella' : 'Bewerbung mit Stella erstellen'} className="hidden sm:inline-flex p-1.5 text-[#004225]/70 dark:text-[#00A854]/80 hover:bg-[#004225]/10 dark:hover:bg-[#00A854]/10 hover:text-[#004225] dark:hover:text-[#00A854] rounded transition-all"><Sparkles size={13} /></button>
          )}
          <button onClick={() => onEdit(app)} title={language === 'FR' ? 'Modifier' : language === 'IT' ? 'Modifica' : language === 'EN' ? 'Edit' : 'Bearbeiten'} className="p-1.5 text-[#5C5C58] dark:text-[#B5B5AF] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] rounded transition-all"><Edit2 size={13} /></button>
          <button onClick={() => onArchive(app.id, !app.archived)} title={app.archived ? t.tracker_unarchive : t.tracker_archive} className="hidden sm:inline-flex p-1.5 text-[#5C5C58] dark:text-[#B5B5AF] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] rounded transition-all">{app.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button>
          <button onClick={() => onDelete(app.id)} title={language === 'FR' ? 'Supprimer' : language === 'IT' ? 'Elimina' : language === 'EN' ? 'Delete' : 'Löschen'} className="p-1.5 text-red-500/80 dark:text-[#E08585]/80 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-[#E08585] rounded transition-all"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  );
}

// Cross-platform draggable card (desktop, mobile, iPad) via @dnd-kit
function DraggableAppCard({ app, t, language, onEdit, onDelete, onArchive, onStatusChange, onToggleFavorite, isDragging }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: app.id });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, touchAction: 'none' }
    : { touchAction: 'manipulation' };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 hover:border-[#004225]/35 dark:hover:border-[#00A854]/35 hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing overflow-hidden rounded-sm ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Accent rail on the left — subtle status hint */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#004225] dark:bg-[#00A854] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div
        className="absolute top-2 right-2 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onToggleFavorite && (
          <CardActionButton
            onClick={() => onToggleFavorite(app.id, !app.favorite)}
            label={app.favorite ? (language === 'FR' ? 'Retirer des favoris' : language === 'IT' ? 'Rimuovi dai preferiti' : language === 'EN' ? 'Remove from favorites' : 'Favorit entfernen') : (language === 'FR' ? 'Marquer comme favori' : language === 'IT' ? 'Segna come preferito' : language === 'EN' ? 'Mark as favorite' : 'Als Favorit markieren')}
            className={app.favorite ? 'text-[#D4A852] hover:bg-[#D4A852]/10' : 'text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#D4A852]'}
            icon={<Star size={12} className={app.favorite ? 'fill-[#D4A852]' : ''} />}
          />
        )}
        <CardActionButton
          onClick={() => onEdit(app)}
          label={language === 'FR' ? 'Modifier' : language === 'IT' ? 'Modifica' : language === 'EN' ? 'Edit' : 'Bearbeiten'}
          className="text-[#004225]/60 dark:text-[#00A854]/70 hover:bg-[#004225]/10 hover:text-[#004225] dark:hover:text-[#00A854]"
          icon={<Edit2 size={12} />}
        />
        <CardActionButton
          onClick={() => onArchive(app.id, !app.archived)}
          label={app.archived ? t.tracker_unarchive : t.tracker_archive}
          className="text-[#5C5C58] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]"
          icon={app.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
        />
        <CardActionButton
          onClick={() => onDelete(app.id)}
          label={language === 'FR' ? 'Supprimer' : language === 'IT' ? 'Elimina' : language === 'EN' ? 'Delete' : 'Löschen'}
          className="text-red-500 dark:text-[#E08585] hover:bg-red-50 dark:hover:bg-red-500/10"
          icon={<Trash2 size={12} />}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 group-hover:pr-20 transition-all">
          <CompanyMonogram name={app.company} size="w-6 h-6 text-[10px]" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A94] truncate" title={app.company}>{capFirst(app.company)}</p>
          {app.favorite && <Star size={10} className="shrink-0 text-[#D4A852] fill-[#D4A852]" aria-hidden="true" />}
        </div>
        <p className="text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] leading-snug truncate" title={app.position}>{capFirst(app.position)}</p>
        {app.location && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B66] dark:text-[#9A9A94]">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{capFirst(app.location)}</span>
          </div>
        )}
        {app.salary && (() => {
          const num = String(app.salary).replace(/[^\d.]/g, '');
          if (!num) return null;
          const n = parseFloat(num);
          if (isNaN(n)) return null;
          // Compact form: >=10k → "120k", smaller keeps full notation
          const formatted = n >= 10000
            ? `${Math.round(n / 1000).toLocaleString('de-CH')}k`
            : n.toLocaleString('de-CH', { maximumFractionDigits: 0 });
          return (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#004225] dark:text-[#00A854] bg-[#004225]/[0.06] dark:bg-[#00A854]/10 px-2 py-1 rounded-sm">
              <span className="text-[9px] font-bold tracking-widest">CHF</span>
              <span>{formatted}</span>
            </div>
          );
        })()}
        {app.reminder_at && (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const due = new Date(app.reminder_at);
          const isOverdue = due < today;
          const isToday = due.getTime() === today.getTime();
          const dateStr = due.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return (
            <div className={`flex items-center gap-1.5 text-[10px] font-medium ${isOverdue ? 'text-red-600 dark:text-[#E08585]' : isToday ? 'text-[#D4AF37]' : 'text-[#004225]'}`}>
              <Calendar size={10} />
              <span className="truncate">
                {isOverdue ? `${t.tracker_reminder_short} ${dateStr} (${t.tracker_reminder_overdue})`
                  : isToday ? t.tracker_reminder_due
                  : `${t.tracker_reminder_short} ${dateStr}`}
              </span>
            </div>
          );
        })()}
        {app.notes && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#9A9A94] dark:text-[#6B6B66] italic">
            <FileText size={10} />
            <span className="truncate">{t.tracker_notes_badge}</span>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <div className="relative flex-1 min-w-0">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">
            {language === 'FR' ? 'Statut' : language === 'IT' ? 'Stato' : language === 'EN' ? 'Status' : 'Status'}
          </label>
          <select
            value={app.status}
            onChange={(e) => onStatusChange(app.id, e.target.value)}
            className="w-full text-[11px] font-medium text-[#004225] dark:text-[#00A854] bg-white dark:bg-[#2A2A26] border border-[#004225]/20 dark:border-[#00A854]/30 hover:border-[#004225]/50 dark:hover:border-[#00A854]/60 focus:border-[#004225] dark:focus:border-[#00A854] focus:outline-none px-2.5 py-1.5 pr-7 cursor-pointer transition-all appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%23004225' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
          >
            <option value="Wishlist">{t.tracker_wishlist}</option>
            <option value="Applied">{t.tracker_applied}</option>
            <option value="Interview">{t.tracker_interview}</option>
            <option value="Offer">{t.tracker_offer}</option>
            <option value="Rejected">{t.tracker_rejected}</option>
          </select>
        </div>
        {(app.updatedAt?.toDate || app.updated_at) && (
          <span className="text-[9px] text-[#9A9A94] font-mono shrink-0 self-end pb-1.5">
            {(app.updatedAt?.toDate ? app.updatedAt.toDate() : new Date(app.updated_at)).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

function DroppableStatusColumn({ status, t, language, applications, activeId, onEdit, onDelete, onArchive, onStatusChange, onToggleFavorite }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  // Favorites first within each column, the rest keeps its existing order.
  const filtered = applications
    .filter((a: any) => a.status === status)
    .sort((a: any, b: any) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  return (
    <div className="space-y-4 sm:min-w-[260px] lg:min-w-0 sm:flex-shrink-0 sm:snap-start sm:w-[260px] lg:w-auto">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">
          {status === 'Wishlist' ? t.tracker_wishlist :
           status === 'Applied' ? t.tracker_applied :
           status === 'Interview' ? t.tracker_interview :
           status === 'Offer' ? t.tracker_offer : t.tracker_rejected}
        </h3>
        <span className="text-[10px] font-mono text-[#9A9A94] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
          {filtered.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[120px] transition-all rounded-md p-1.5 ${isOver && activeId ? 'bg-[#004225]/5 border-2 border-dashed border-[#004225]/40' : 'border-2 border-transparent bg-black/[0.015] dark:bg-white/[0.02]'}`}
      >
        {filtered.map((app: any) => (
          <DraggableAppCard
            key={app.id}
            app={app}
            t={t}
            language={language}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
            onStatusChange={onStatusChange}
            onToggleFavorite={onToggleFavorite}
            isDragging={activeId === app.id}
          />
        ))}
        {filtered.length === 0 && (
          <div className="h-20 border border-dashed border-black/5 flex items-center justify-center">
            <span className="text-[9px] text-[#9A9A94] uppercase tracking-widest opacity-30">{t.tracker_empty}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    window.stellifyReady?.();
    // Surface unhandled promise rejections (Firebase/Supabase/fetch fails) into the console
    // without taking the whole app down. Local-only log; no remote reporting yet.
    const onRejection = (e: PromiseRejectionEvent) => {
      console.error('[Stellify] Unhandled promise rejection:', e.reason);
    };
    const onError = (e: ErrorEvent) => {
      console.error('[Stellify] Window error:', e.message, e.error);
    };
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);
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
              {t.cv_upload_hint || 'PDF oder Word · Kostenlos & sicher analysieren lassen'}
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

  // Auth modal: ESC closes, body scroll locked while open, autofocus email input
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAuthModalOpen(false);
        setConfirmPassword('');
        setAuthError('');
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus first input shortly after mount (after framer-motion animation kicks in)
    const focusTimer = setTimeout(() => {
      authEmailRef.current?.focus();
    }, 150);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
    };
  }, [isAuthModalOpen]);
  const authEmailRef = useRef<HTMLInputElement>(null);
  const justLoggedIn = useRef(false);
  // True once the saved theme/language from the profile has been applied
  // for the current login — prevents the live profile listener from
  // fighting the user's own theme toggle.
  const profilePrefsApplied = useRef(false);
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
  // Active drag id — drives ghost overlay and source-card opacity. @dnd-kit handles
  // pointer, touch and keyboard so the tracker works on laptop, mobile and iPad.
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [newApp, setNewApp] = useState({ company: '', position: '', status: 'Applied' as any, location: '', salary: '', notes: '', reminder_at: '' });
  const [trackerSearch, setTrackerSearch] = useState('');
  // Kanban view was removed per user feedback — tracker only renders the
  // table now (with drag-to-reorder).
  const [showArchived, setShowArchived] = useState(false);
  // Main view list — affected only by the archive toggle.
  const viewApplications = useMemo(
    // Favorites pin to the top; within each group the stable sort keeps the
    // existing (manual/date) order untouched.
    () => applications
      .filter((a) => showArchived || !a.archived)
      .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)),
    [applications, showArchived],
  );
  // Search hits — feed the dropdown under the search input. Scans every
  // field (including archived) so users always find what they're looking for.
  const searchMatches = useMemo(() => {
    const q = trackerSearch.trim().toLowerCase();
    if (!q) return [] as any[];
    return applications.filter((a) =>
      [a.company, a.position, a.location, a.notes, a.salary, a.status]
        .some((v) => v && String(v).toLowerCase().includes(q)),
    );
  }, [applications, trackerSearch]);
  const archivedCount = useMemo(() => applications.filter((a) => a.archived).length, [applications]);
  // Headline numbers for the tracker. Stats are computed from active
  // (non-archived) applications so they reflect the live pipeline.
  const trackerStats = useMemo(() => {
    const active = applications.filter((a) => !a.archived);
    const byStatus = (s: string) => active.filter((a) => a.status === s).length;
    const wishlist = byStatus('Wishlist');
    const applied = byStatus('Applied');
    const interview = byStatus('Interview');
    const offer = byStatus('Offer');
    const rejected = byStatus('Rejected');
    const responded = applied + interview + offer + rejected; // exclude Wishlist
    const interviewRate = responded > 0 ? Math.round(((interview + offer) / responded) * 100) : 0;
    const offerRate = responded > 0 ? Math.round((offer / responded) * 100) : 0;
    const salaries = active
      .map((a) => parseFloat(String(a.salary || '').replace(/[^\d.]/g, '')))
      .filter((n) => !isNaN(n) && n > 0);
    const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
    // Actionable extras for the pipeline card: due follow-ups (an explicit
    // reminder that is due, or an application sitting in "Applied" for 7+
    // days without movement) and this week's activity.
    const nowMs = Date.now();
    const dayMs = 86400000;
    const dueFollowUps = active
      .map((a) => {
        if (a.reminder_at) {
          const days = Math.floor((nowMs - new Date(a.reminder_at).getTime()) / dayMs);
          if (days >= 0) return { company: a.company as string, kind: 'reminder' as const, days };
        }
        if (a.status === 'Applied') {
          const ref = new Date(a.updated_at || a.created_at || 0).getTime();
          const days = ref > 0 ? Math.floor((nowMs - ref) / dayMs) : 0;
          if (days >= 7) return { company: a.company as string, kind: 'stale' as const, days };
        }
        return null;
      })
      .filter((x): x is { company: string; kind: 'reminder' | 'stale'; days: number } => x !== null)
      .sort((x, y) => y.days - x.days)
      .slice(0, 2);
    const weekNew = active.filter((a) => {
      const c = new Date(a.created_at || 0).getTime();
      return c > 0 && nowMs - c <= 7 * dayMs;
    }).length;
    return {
      total: active.length,
      inProcess: wishlist + applied + interview,
      wishlist,
      applied,
      interview,
      offer,
      rejected,
      interviewRate,
      offerRate,
      avgSalary,
      salaryCount: salaries.length,
      dueFollowUps,
      weekNew,
    };
  }, [applications]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Remember the billing cycle across the Stripe round-trip (checkout is a full
  // redirect, so React state would otherwise reset to 'monthly'). Now a visitor
  // who picked yearly, went to Stripe and came back lands on yearly again.
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stellify_billing_cycle');
      if (saved === 'yearly' || saved === 'monthly') return saved;
    }
    return 'monthly';
  });
  useEffect(() => {
    try { localStorage.setItem('stellify_billing_cycle', billingCycle); } catch { /* ignore */ }
  }, [billingCycle]);
  // Stella chat is hidden from the UI (kept in code, reversible). Set to true
  // to re-enable the launcher entry points across the app.
  const STELLA_CHAT_ENABLED = false;

  // YouTube video IDs — single source of truth for every video shown across
  // the app. Setting a value here flips the matching UI on (▶ button on the
  // landing hero, ▶ Tutorial chip on a tool, Welcome modal after sign-up).
  // Leave `null` to hide. Use the YouTube video ID only (the part after
  // "watch?v=" or "youtu.be/"), NOT the full URL.
  const videoLibrary: { master: string | null; welcome: string | null; tools: Record<string, string | null> } = {
    master:  null, // shown in the landing hero ("▶ Stellify in 90 Sek.")
    welcome: null, // shown once after first sign-in
    tools: {
      'bewerbungs-gen':     null,
      'cv-gen':             null,
      'cv-analysis':        null,
      'cv-optimizer':       null,
      'cv-premium':         null,
      'matching':           null,
      'interview':          null,
      'interview-live':     null,
      'salary-negotiation': null,
      'ats-sim':            null,
      'career-roadmap':     null,
      'skill-gap':          null,
      'tracker':            null,
    },
  };
  const getToolVideo = (toolId: string): string | null => videoLibrary.tools[toolId] ?? null;
  const [cvContext, setCvContext] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [avatarHover, setAvatarHover] = useState<string | null>(null);
  // Admin newsletter composer state
  const [nlSubject, setNlSubject] = useState('');
  const [nlMessage, setNlMessage] = useState('');
  const [nlSending, setNlSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'tracker' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb' | 'about' | 'ratgeber'>('dashboard');
  // Open guide article (/ratgeber/<slug>); null shows the guide overview.
  const [guideSlug, setGuideSlug] = useState<string | null>(null);
  const [generatedApp, setGeneratedApp] = useState<string | null>(null);
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [language, setLanguage] = useState<'DE' | 'FR' | 'IT' | 'EN'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');
      if (saved === 'DE' || saved === 'FR' || saved === 'IT' || saved === 'EN') return saved as any;
      
      // Swiss-first: this is a .ch product, so German is the default. Only the
      // other Swiss national languages auto-switch. An English browser (which is
      // what Googlebot always is, plus many Swiss users on an English OS) must NOT
      // flip the whole site to English — that made Google index the English title.
      // English stays one click away in the menu and is remembered once chosen.
      const browserLang = navigator.language.split('-')[0].toUpperCase();
      if (browserLang === 'FR' || browserLang === 'IT') return browserLang as any;
    }
    return 'DE';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    if (user) {
      updateDoc(doc(db, 'users', user.id), { language }).catch(e => console.error("Error updating language in DB:", e));
    }
  }, [language, user]);

  // Safety net: if auth hasn't resolved in 2s (e.g. network error), dismiss splash
  useEffect(() => {
    const timer = setTimeout(() => setIsAuthReady(true), 2000);
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

  // Handle return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const paymentSuccess = params.get('payment') === 'success' || !!params.get('session_id');
    const onPricingPath = window.location.pathname.replace(/\/+$/, '') === '/pricing';
    if (viewParam === 'pricing' || paymentSuccess || onPricingPath) {
      setActiveView('pricing');
      window.history.replaceState({ view: 'pricing' }, '', '/pricing');
      // Scroll to the pricing section once it's mounted AND the splash overlay
      // is gone (it sets body overflow:hidden which swallows scroll attempts).
      // Retries cover the splash duration after a full reload, e.g. when the
      // user comes back from Stripe via the browser back button.
      let attempts = 0;
      const tryScroll = () => {
        attempts++;
        const splashing = document.body.classList.contains('stellify-splashing');
        const el = document.getElementById('pricing');
        if (!splashing && el) {
          el.scrollIntoView({ behavior: 'auto' });
          const r = el.getBoundingClientRect();
          if (r.top > -300 && r.top < 500) return; // in view → done
        }
        if (attempts < 40) setTimeout(tryScroll, 250);
      };
      setTimeout(tryScroll, 250);
    }
    if (paymentSuccess) {
      setTimeout(() => {
        showToast(
          language === 'FR' ? 'Paiement réussi ! Ton abonnement est actif.'
          : language === 'IT' ? 'Pagamento riuscito! Il tuo abbonamento è attivo.'
          : language === 'EN' ? 'Payment successful! Your subscription is active.'
          : 'Zahlung erfolgreich! Dein Abo ist aktiv.',
          'success'
        );
      }, 600);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'pricing') setSubscriptionError('');
  }, [activeView]);

  // Browser history (back/forward button support)
  const navigate = (view: 'dashboard' | 'profile' | 'tracker' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb' | 'about' | 'ratgeber') => {
    const prev = activeView;
    // Remember where we left the previous view, but ONLY so the browser BACK
    // button can return there (handled in the popstate listener). A forward
    // click on a nav/footer link must always open the new page at the top —
    // landing at the footer of a fresh page (e.g. clicking "Über uns" from the
    // footer) is disorienting.
    try {
      sessionStorage.setItem('stellify_return_spot', JSON.stringify({ view: prev, y: window.scrollY }));
    } catch { /* ignore */ }
    setActiveView(view);
    setActiveTool(null);
    setGuideSlug(null);
    window.history.pushState({ view }, '', `/${view === 'dashboard' ? '' : view}`);
    if (view === 'pricing') {
      // Show the plans right away — the one intentional exception to top.
      setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else {
      // Jump to the top now and again after the (possibly lazy) page mounts,
      // so the scroll reliably sticks instead of keeping the old position.
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 60);
    }
  };

  // Open a single guide article under its own URL (/ratgeber/<slug>) —
  // one indexable page per guide.
  const openGuide = (slug: string) => {
    setActiveView('ratgeber');
    setActiveTool(null);
    setGuideSlug(slug);
    window.history.pushState({ view: 'ratgeber', guideSlug: slug }, '', `/ratgeber/${slug}`);
    window.scrollTo(0, 0);
  };

  // Preload the legal/about chunk once the app is idle so the first click
  // on Über uns / AGB / Datenschutz opens instantly instead of flashing a
  // blank frame while the module downloads.
  useEffect(() => {
    const id = window.setTimeout(() => { import('./components/LegalPages').catch(() => {}); import('./components/GuidePages').catch(() => {}); }, 2500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    // We control scroll ourselves (top on forward navigation, saved spot on
    // back). Tell the browser not to also try to restore scroll, or the two
    // fight and the page can land in the wrong place.
    try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; } catch { /* ignore */ }
    type RouteView = 'dashboard' | 'profile' | 'tracker' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb' | 'about' | 'ratgeber';
    const validViews: RouteView[] = ['dashboard', 'profile', 'tracker', 'tools', 'jobs', 'pricing', 'datenschutz', 'impressum', 'agb', 'about', 'ratgeber'];
    const viewFromPath = (path: string): RouteView | null => {
      const slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
      if (!slug) return 'dashboard';
      // Backwards-compat: /ueber-uns still routes to about
      if (slug === 'ueber-uns') return 'about';
      // Guide articles live under /ratgeber/<slug>
      if (slug.startsWith('ratgeber/')) return 'ratgeber';
      return (validViews as string[]).includes(slug) ? (slug as RouteView) : null;
    };
    const guideSlugFromPath = (path: string): string | null => {
      const slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
      return slug.startsWith('ratgeber/') ? decodeURIComponent(slug.slice('ratgeber/'.length)) : null;
    };

    const onPop = (e: PopStateEvent) => {
      const view = (e.state?.view as RouteView | undefined) ?? viewFromPath(window.location.pathname);
      if (view) {
        setActiveView(view);
        setActiveTool(null);
        setGuideSlug((e.state?.guideSlug as string | undefined) ?? guideSlugFromPath(window.location.pathname));
        // The browser back button honours the same return spot as in-app
        // navigation: landing back on the view you left restores the exact
        // scroll position (e.g. the footer you clicked Preise from).
        let returnY: number | null = null;
        try {
          const raw = sessionStorage.getItem('stellify_return_spot');
          if (raw) {
            const spot = JSON.parse(raw) as { view?: string; y?: number };
            if (spot.view === view && typeof spot.y === 'number') returnY = spot.y;
          }
        } catch { /* ignore */ }
        if (returnY !== null) {
          const y = returnY;
          setTimeout(() => window.scrollTo({ top: y }), 60);
        } else if (view === 'pricing') {
          setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'auto' }), 100);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        setActiveView('dashboard');
        setActiveTool(null);
      }
    };
    window.addEventListener('popstate', onPop);
    // Preserve OAuth callback params/hash so Supabase can finish session extraction.
    const hasOAuthCallbackData =
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('refresh_token=') ||
      window.location.search.includes('code=');
    if (!hasOAuthCallbackData) {
      // Parse initial path so direct links (e.g. /about) land on the right view
      const initial = viewFromPath(window.location.pathname);
      if (initial && initial !== activeView) {
        setActiveView(initial);
      }
      const initialGuide = guideSlugFromPath(window.location.pathname);
      if (initialGuide) setGuideSlug(initialGuide);
      const target = initial ?? activeView;
      window.history.replaceState(
        { view: target, guideSlug: initialGuide || undefined },
        '',
        initialGuide ? `/ratgeber/${initialGuide}` : (target === 'dashboard' ? '/' : `/${target}`),
      );
    }
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
      updateDoc(doc(db, 'users', user.id), { theme }).catch(e => console.error("Error updating theme in DB:", e));
    }
  }, [theme, user]);
  
  // Tool Modal State
  const [activeTool, setActiveTool] = useState<any | null>(null);
  // Prefill for the generator when it is opened from a tracker row
  // ("Bewerbung mit Stella erstellen"): company + position travel along.
  const [generatorPrefill, setGeneratorPrefill] = useState<{ company?: string; position?: string } | null>(null);
  // When a saved application is opened from the dashboard, the generator mounts
  // straight into that document so the customer can edit it. Cleared whenever
  // the generator is not the active tool, so a normal open starts blank.
  const [generatorInitialDocId, setGeneratorInitialDocId] = useState<string | null>(null);
  useEffect(() => { if (!activeTool) setGeneratorPrefill(null); }, [activeTool]);
  // "So funktioniert's" explainer inside the tool modal (question mark).
  const [showToolHelp, setShowToolHelp] = useState(false);
  // "?" help for the tracker — same pattern as the tools' help overlay.
  const [showTrackerHelp, setShowTrackerHelp] = useState(false);

  // Lock the page behind while a tool is open. Without this, iOS Safari
  // often scrolls the BACKGROUND instead of the modal content.
  useEffect(() => {
    if (activeTool) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [activeTool]);
  // Which tool's example is shown in the Tools-section header preview card.
  const [headerExampleTool, setHeaderExampleTool] = useState<string>('bewerbungs-gen');
  // Width (px) of the tool modal's left input column — draggable on desktop.
  const [toolInputW, setToolInputW] = useState<number>(500);
  const [isDesktopView, setIsDesktopView] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktopView(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const startToolResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = toolInputW;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(760, Math.max(300, startW + (ev.clientX - startX)));
      setToolInputW(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Browser tab title — "Stellify - <current page>" so the open tab is always
  // identifiable. Localised; the active tool name wins when a tool is open,
  // otherwise the view name.
  useEffect(() => {
    const map: Record<string, Record<string, string>> = {
      dashboard:   { DE: 'Dashboard', FR: 'Tableau de bord', IT: 'Dashboard', EN: 'Dashboard' },
      profile:     { DE: 'Profil', FR: 'Profil', IT: 'Profilo', EN: 'Profile' },
      tools:       { DE: 'Tools', FR: 'Outils', IT: 'Strumenti', EN: 'Tools' },
      jobs:        { DE: 'Offene Stellen', FR: 'Offres', IT: 'Offerte', EN: 'Jobs' },
      pricing:     { DE: 'Preise', FR: 'Tarifs', IT: 'Prezzi', EN: 'Pricing' },
      about:       { DE: 'Über uns', FR: 'À propos', IT: 'Chi siamo', EN: 'About' },
      datenschutz: { DE: 'Datenschutz', FR: 'Confidentialité', IT: 'Privacy', EN: 'Privacy' },
      impressum:   { DE: 'Impressum', FR: 'Mentions légales', IT: 'Note legali', EN: 'Imprint' },
      agb:         { DE: 'AGB', FR: 'CGV', IT: 'Termini', EN: 'Terms' },
    };
    const tagline = language === 'FR' ? "L'assistant de carrière IA suisse"
      : language === 'IT' ? "L'assistente di carriera AI svizzero"
      : language === 'EN' ? 'The Swiss AI career assistant'
      : 'Der Schweizer KI-Karriereassistent';
    // Logged-out landing page (the marketing "/" that Google indexes) must NOT
    // be titled "Dashboard" — that word means nothing to a searcher. Give it the
    // keyword-rich marketing title instead, matching the static <title>.
    const landingTitle = language === 'FR' ? 'Stellify | Le générateur de candidatures IA pour la Suisse'
      : language === 'IT' ? 'Stellify | Il generatore di candidature IA per la Svizzera'
      : language === 'EN' ? 'Stellify | The Swiss AI job-application tool'
      : 'Stellify | Die Bewerbungs-KI für die Schweiz';
    if (!user && activeView === 'dashboard' && !activeTool) {
      document.title = landingTitle;
    } else {
      const page = activeTool?.title || map[activeView]?.[language] || map[activeView]?.EN || '';
      document.title = page ? `Stellify - ${page}` : `Stellify - ${tagline}`;
    }
  }, [activeView, activeTool, language, user]);

  // Canonical + og:url follow the current page. The static tags in
  // index.html point at the homepage, which told Google that /pricing and
  // every guide article were mere duplicates of / — with this, each page
  // declares its own address and becomes indexable in its own right.
  useEffect(() => {
    const path = guideSlug
      ? `/ratgeber/${guideSlug}`
      : (activeView === 'dashboard' ? '/' : `/${activeView}`);
    const url = `https://stellify.ch${path}`;
    try {
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
    } catch { /* metadata updates must never break the app */ }
  }, [activeView, guideSlug]);

  const [toolInput, setToolInput] = useState<any>({});
  const [toolResult, setToolResult] = useState<string | null>(null);
  const [toolResultEditable, setToolResultEditable] = useState<string>('');
  const [isEditingToolResult, setIsEditingToolResult] = useState(false);
  const [parsedSalaryResult, setParsedSalaryResult] = useState<any | null>(null);
  const [parsedInterviewResult, setParsedInterviewResult] = useState<any | null>(null);
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [toolStep, setToolStep] = useState(0); // For multi-step tools like Interview Sim
  const [toolHistory, setToolHistory] = useState<any[]>([]);
  
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      // forceRefresh=true ensures we never send an expired token
      return await currentUser.getIdToken(true);
    } catch { return null; }
  };
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getAuthToken();
    return fetch(url, {
      ...options,
      headers: { ...((options.headers as Record<string, string>) || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLoginWelcome, setShowLoginWelcome] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  // ▶ Video modals — master (landing hero), tool tutorials, welcome
  const [videoModal, setVideoModal] = useState<{ id: string; title: string } | null>(null);
  const [welcomeVideoSeen, setWelcomeVideoSeen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('stellify_welcome_video_seen') === '1';
  });
  const [isPromoVideoOpen, setIsPromoVideoOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Back-to-top button only appears once there is something to scroll back up
  // to, so it never floats over the top of a page.
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Closing the tool overlay returns the page to EXACTLY where it was when
  // the tool was opened: footer browsers land back at the footer links,
  // top-of-page users back at the top. If closing also navigated to another
  // view (e.g. upgrade → pricing), that navigation owns the scroll instead.
  const prevActiveToolRef = useRef<any>(null);
  const toolOpenSpotRef = useRef<{ y: number; view: string } | null>(null);
  useEffect(() => {
    if (!prevActiveToolRef.current && activeTool) {
      toolOpenSpotRef.current = { y: window.scrollY, view: activeView };
    } else if (prevActiveToolRef.current && !activeTool) {
      const spot = toolOpenSpotRef.current;
      if (spot && spot.view === activeView) {
        window.scrollTo({ top: spot.y, behavior: 'auto' });
      }
      toolOpenSpotRef.current = null;
    }
    prevActiveToolRef.current = activeTool;
  }, [activeTool, activeView]);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Convincing upgrade modal: 'quota' = free tries used up, 'daily' = daily cap hit.
  const [upgradePrompt, setUpgradePrompt] = useState<{ reason: 'quota' | 'daily' | 'feature'; message?: string } | null>(null);
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

  useEffect(() => {
    if (showLoginWelcome) {
      const timer = setTimeout(() => setShowLoginWelcome(false), 5500);
      return () => clearTimeout(timer);
    }
  }, [showLoginWelcome]);
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

  const isTransientFirestoreError = (error: unknown) => {
    const code = (error as { code?: string } | null)?.code || '';
    const message = error instanceof Error ? error.message : String(error || '');
    return code === 'unavailable' || code === 'failed-precondition' || message.toLowerCase().includes('client is offline');
  };

  // --- EFFECTS ---
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const processUserData = (rawData: any, firebaseUser: FirebaseUser) => {
      // Apply saved theme/language ONCE per login. The profile listener
      // fires on every write — including our own theme save — and a cached
      // snapshot could carry the OLD theme, snapping the toggle back for a
      // beat (light → dark → light). After the first sync, the user's
      // click is the boss and the profile only stores it.
      if (!profilePrefsApplied.current && rawData) {
        if (rawData.language && rawData.language !== language) setLanguage(rawData.language);
        if (rawData.theme && rawData.theme !== theme) setTheme(rawData.theme);
        profilePrefsApplied.current = true;
      }

      const rawName = rawData?.first_name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nutzer';
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
          updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'client' }).catch(console.error);
        } else {
          const threshold = rawData.subscription_interval === 'annual' ? 14 : 3;
          if (daysLeft <= threshold) setExpiryBanner({ daysLeft, interval: rawData.subscription_interval || 'monthly' });
          else setExpiryBanner(null);
        }
      }

      const newUser: UserData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
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
        avatarId: rawData?.avatar_id || undefined,
        newsletterOptIn: rawData?.newsletter !== false,
      };
      setUser(newUser);

      if (rawData) {
        const today = new Date().toISOString().split('T')[0];
        if (rawData.last_daily_reset !== today) {
          updateDoc(doc(db, 'users', firebaseUser.uid), { daily_tool_uses: 0, last_daily_reset: today }).catch(console.error);
        }

        // Monthly subscriptions get their quota reset by the Stripe renewal
        // webhook (exactly on the billing day). Annual subscriptions have no
        // monthly invoice, so their monthly quota resets per calendar month.
        const currentMonth = new Date().toISOString().substring(0, 7);
        if ((effectiveRole === 'pro' || effectiveRole === 'unlimited') && rawData.subscription_interval === 'annual' && rawData.last_monthly_reset !== currentMonth) {
          updateDoc(doc(db, 'users', firebaseUser.uid), { tool_uses: 0, free_generations_used: 0, search_uses: 0, last_monthly_reset: currentMonth }).catch(console.error);
        }

        if (!rawData.has_seen_tutorial) setIsTutorialOpen(true);
        if (rawData.cv_context) setCvContext(rawData.cv_context);
      }
    };

    getRedirectResult(auth).catch(() => {});

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }

      if (firebaseUser) {
        // Show app immediately with basic auth data — Firestore loads in background
        processUserData(null, firebaseUser);
        setIsAuthReady(true);

        const userRef = doc(db, 'users', firebaseUser.uid);

        try {
          const userSnap = await getDoc(userRef);
          // "Willkommen zurück" only for RETURNING users (profile already
          // exists). Fresh registrations — including Google first-timers and
          // deleted-then-recreated accounts — get the onboarding tour
          // instead, not a welcome-back.
          if (justLoggedIn.current) {
            justLoggedIn.current = false;
            if (userSnap.exists()) setTimeout(() => setShowLoginWelcome(true), 700);
          }
          if (!userSnap.exists()) {
            const rawName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nutzer';
            const cleanName = rawName.replace(/\./g, ' ');
            const formattedName = cleanName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            const newData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              first_name: formattedName,
              role: 'client',
              created_at: new Date().toISOString(),
              ab_hero: getHeroVariant(),
              newsletter: true,
              free_generations_used: 0,
              tool_uses: 0,
              daily_tool_uses: 0,
              last_daily_reset: new Date().toISOString().split('T')[0],
              has_seen_tutorial: false,
              language,
              theme,
              cv_context: cvContext || null,
            };
            setDoc(userRef, newData).then(() => {
              const isOAuth = firebaseUser.providerData.some(p => p.providerId !== 'password');
              if (isOAuth) {
                fetch('/api/send-welcome-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: firebaseUser.email, firstName: formattedName, language }),
                }).then(null, console.error);
              }
            }).catch(console.error);
            processUserData(newData, firebaseUser);
          } else {
            processUserData(userSnap.data(), firebaseUser);
          }
        } catch (e) {
          if (isTransientFirestoreError(e)) {
            console.warn('Firestore profile load temporarily unavailable; continuing with auth-only session.');
          } else {
            console.error('Error loading user profile:', e);
          }
        }

        unsubscribeUser = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) processUserData(snap.data(), firebaseUser);
          },
          (error) => {
            if (isTransientFirestoreError(error)) {
              console.warn('Firestore profile listener temporarily unavailable; will recover automatically once the connection returns.');
            } else {
              console.error('Error subscribing to user profile:', error);
            }
          }
        );
      } else {
        setUser(null);
        setIsAuthReady(true);
        // Next login syncs the saved prefs once again.
        profilePrefsApplied.current = false;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([{ role: 'ai', content: t.stella_greeting.replace('{name}', 'Nutzer') }]);
      return;
    }

    const msgsQuery = query(
      collection(db, 'messages'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'asc'),
      limit(50)
    );
    getDocs(msgsQuery).then((snap) => {
      const msgs = snap.docs.map(d => d.data() as Message);
      if (msgs.length > 0) {
        setMessages(msgs);
      } else {
        setMessages([{ role: 'ai', content: t.stella_greeting.replace('{name}', user.firstName) }]);
      }
    });
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
            updateDoc(doc(db, 'users', user.id), { cv_context: importedContext }).catch(console.error);
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

  // Keyword-to-tool mapping for semantic tool discovery.
  // Only the strategy-enabled tools (see ENABLED_TOOL_IDS) — removed tools
  // are not in the `tools` array, so any stale entries here would be inert,
  // but keeping the map honest avoids confusion.
  const toolKeywordMap: Record<string, string[]> = {
    'bewerbungs-gen': ['bewerbung', 'bewerbung erstellen', 'bewerbung schreiben', 'anschreiben', 'motivationsschreiben', 'application', 'cover letter', 'candidature', 'lettre de motivation', 'generator', 'dokument', 'pdf', 'word'],
    'cv-gen': ['erstellen', 'generieren', 'schreiben', 'write', 'cv erstell', 'lebenslauf erstell', 'cv schreib', 'anschreiben'],
    'cv-analysis': ['cv', 'lebenslauf', 'analyse', 'scan', 'prüfen', 'analysieren', 'resume', 'analyse cv', 'check cv'],
    'cv-optimizer': ['optimieren', 'optimize', 'verbessern', 'improve', 'abschnitt', 'section', 'lebenslauf optimieren'],
    'cv-premium': ['premium', 'professionell', 'professional', 'design cv', 'rewrite'],
    'matching': ['stellen', 'jobs', 'stelle', 'arbeit', 'matching', 'passend', 'stellenanalyse', 'stellenanzeige', 'offene stellen', 'job analyse', 'stellenangebot'],
    'tracker': ['tracker', 'status', 'verfolgen', 'übersicht', 'bewerbungen verwalten', 'kanban', 'strategie', 'plan', 'schlachtplan'],
  };

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.toLowerCase();

      // Match tools by keyword map (semantic discovery)
      const keywordMatchedIds = new Set<string>();
      Object.entries(toolKeywordMap).forEach(([toolId, keywords]) => {
        if (keywords.some(kw => q.includes(kw) || kw.includes(q))) {
          keywordMatchedIds.add(toolId);
        }
      });

      // Match tools by title/desc + keyword map — tools are primary results
      const filteredTools = tools.filter(tool =>
        tool.title.toLowerCase().includes(q) ||
        tool.desc.toLowerCase().includes(q) ||
        keywordMatchedIds.has(tool.id)
      ).map(tool => ({
        id: tool.id,
        title: tool.title,
        content: tool.desc,
        category: 'Tool',
        type: 'tool',
        badge: tool.badge,
        toolType: tool.type,
      }));

      // Secondary: Career tips from searchData
      const filteredSearchData = searchData.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );

      // Secondary: FAQs
      const filteredFaqs = faqs.filter(faq =>
        faq.q.toLowerCase().includes(q) ||
        faq.a.toLowerCase().includes(q)
      ).map((faq, index) => ({
        id: `faq-${index}`,
        title: faq.q,
        content: faq.a,
        category: 'FAQ',
        type: 'faq'
      }));

      const userResult = user && (
        user.firstName.toLowerCase().includes(q) ||
        'profil'.includes(q) ||
        'meine daten'.includes(q) ||
        'cv'.includes(q) ||
        'lebenslauf'.includes(q)
      ) ? [{
        id: 'user-profile',
        title: `${user.firstName} (Dein Profil)`,
        content: language === 'DE' ? 'Verwalte deine persönlichen Daten, deinen Lebenslauf und deine Einstellungen.' : language === 'FR' ? 'Gérez vos données personnelles, votre CV et vos paramètres.' : language === 'IT' ? 'Gestisci i tuoi dati personali, il tuo CV e le tue impostazioni.' : 'Manage your personal data, your CV and your settings.',
        category: t.profile,
        type: 'profile'
      }] : [];

      // Pages (Über uns, AGB, Datenschutz, Impressum, Preise) — always discoverable
      const pages = [
        { view: 'about',       keys: ['über uns','about','geschichte','story','team','founder','gründer'], title: language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns', content: language === 'FR' ? 'Notre histoire, le fondateur et le sens du nom Stellify.' : language === 'IT' ? 'La nostra storia, il fondatore e il significato del nome Stellify.' : language === 'EN' ? 'Our story, the founder and the meaning behind the name Stellify.' : 'Unsere Geschichte, der Gründer und die Bedeutung des Namens Stellify.' },
        { view: 'pricing',     keys: ['preis','pricing','abo','plan','kosten','tarif','prezzo','prix'], title: t.pricing, content: language === 'FR' ? 'Plans Gratuit, Pro et Karriere+.' : language === 'IT' ? 'Piani Gratuito, Pro e Karriere+.' : language === 'EN' ? 'Free, Pro and Karriere+ plans.' : 'Gratis-, Pro- und Karriere+-Plan.' },
        { view: 'datenschutz', keys: ['datenschutz','privacy','dsgvo','dsg','privacidad','vie privée'], title: language === 'FR' ? 'Politique de confidentialité' : language === 'IT' ? 'Informativa sulla privacy' : language === 'EN' ? 'Privacy Policy' : 'Datenschutz', content: language === 'FR' ? 'Comment nous traitons tes données personnelles selon LPD et RGPD.' : language === 'IT' ? 'Come trattiamo i tuoi dati personali secondo LPD e GDPR.' : language === 'EN' ? 'How we process your personal data under Swiss DPA and GDPR.' : 'Wie wir deine persönlichen Daten gemäss DSG und DSGVO bearbeiten.' },
        { view: 'agb',         keys: ['agb','terms','bedingungen','widerruf','kündigung'], title: language === 'FR' ? 'CGV' : language === 'IT' ? 'Termini' : language === 'EN' ? 'Terms' : 'AGB', content: language === 'FR' ? 'Conditions générales, paiement et droit de rétractation.' : language === 'IT' ? 'Condizioni generali, pagamento e diritto di recesso.' : language === 'EN' ? 'Terms, payment and right of withdrawal.' : 'Geschäftsbedingungen, Zahlung und Widerrufsrecht.' },
        { view: 'impressum',   keys: ['impressum','kontakt','contact','imprint','jtsp','luzern','firma'], title: language === 'FR' ? 'Mentions légales' : language === 'IT' ? 'Informazioni legali' : language === 'EN' ? 'Imprint' : 'Impressum', content: language === 'FR' ? "Coordonnées de l'exploitant et juridiction." : language === 'IT' ? 'Dati del gestore e giurisdizione.' : language === 'EN' ? 'Operator details and jurisdiction.' : 'Betreiber-Angaben und Gerichtsstand.' },
      ];
      const filteredPages = pages
        .filter(p => p.keys.some(k => k.includes(q)) || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
        .map(p => ({ id: p.view, title: p.title, content: p.content, category: language === 'FR' ? 'Page' : language === 'IT' ? 'Pagina' : language === 'EN' ? 'Page' : 'Seite', type: 'page', view: p.view }));

      // Tools first (discovery-first), then tips, then FAQs, plus pages — no direct job listings
      const results = [...userResult, ...filteredTools, ...filteredPages, ...filteredSearchData, ...filteredFaqs];
      setSearchResults(results);
      setSelectedSearchIndex(results.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    // Sort client-side to avoid requiring a Firestore composite index
    const appsQuery = query(
      collection(db, 'applications'),
      where('user_id', '==', user.id)
    );
    const unsubApps = onSnapshot(
      appsQuery,
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort: rows with a manual sort_index win (ascending), then the rest
        // newest-first by created_at. Lets the table view persist drag order
        // while new apps still appear at the top by default.
        docs.sort((a, b) => {
          const ai = typeof a.sort_index === 'number';
          const bi = typeof b.sort_index === 'number';
          if (ai && bi) return a.sort_index - b.sort_index;
          if (ai) return -1;
          if (bi) return 1;
          return (b.created_at || '').localeCompare(a.created_at || '');
        });
        setApplications(docs);
      },
      (err) => {
        console.error('[applications] snapshot error:', err);
        showToast(`Bewerbungen konnten nicht geladen werden: ${err?.message || 'unknown'}`, 'error');
      }
    );
    return () => unsubApps();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'cv_analyses'), where('user_id', '==', user.id), orderBy('created_at', 'desc'), limit(1)))
      .then(snap => { if (snap.docs[0]) setLatestAnalysis(snap.docs[0].data().data); });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'tool_results'), where('user_id', '==', user.id), orderBy('created_at', 'desc'), limit(10)))
      .then(snap => { if (!snap.empty) setToolHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
  }, [user]);

  // Starter checklist, step 2: "created" must mean a REAL saved application
  // document — usage counters can survive account re-creation (free-quota
  // ledger) and would tick the step off for someone who did nothing yet.
  const [hasGeneratedApp, setHasGeneratedApp] = useState(false);
  // Saved applications for the dashboard "Deine letzten Dokumente" list. Live,
  // so a freshly saved application appears without a reload. This is the same
  // collection the generator writes to (generated_applications) — the earlier
  // bug was that the dashboard only ever read tool_results, so saved
  // applications never showed up here.
  const [savedApplications, setSavedApplications] = useState<any[]>([]);
  useEffect(() => {
    if (!user) { setHasGeneratedApp(false); setSavedApplications([]); return; }
    // Filter only by user_id (an automatic single-field index) and sort in the
    // browser — this never depends on a composite index, so the list can never
    // silently stay empty because an index is missing.
    const unsub = onSnapshot(
      query(collection(db, 'generated_applications'), where('user_id', '==', user.id), limit(50)),
      snap => {
        const docs = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
          .slice(0, 10);
        setSavedApplications(docs);
        setHasGeneratedApp(snap.size > 0);
      },
      () => { /* offline: leave list empty, step stays open */ }
    );
    return () => unsub();
  }, [user]);
  // A normal open of the generator starts blank; only a click on a saved
  // document (which sets the id right before opening) carries a doc in.
  useEffect(() => {
    if (activeTool?.id !== 'bewerbungs-gen') setGeneratorInitialDocId(null);
  }, [activeTool]);

  const [careerRoadmap, setCareerRoadmap] = useState<string[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);
  const [salaryCalculations, setSalaryCalculations] = useState<any[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'salary_calculations'), where('user_id', '==', user.id), orderBy('created_at', 'desc'), limit(5)))
      .then(snap => { if (!snap.empty) setSalaryCalculations(snap.docs.map(d => d.data())); });
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

  // Report the assigned hero variant to Vercel Analytics (no-op until Web
  // Analytics is enabled in the Vercel dashboard).
  useEffect(() => {
    try { vaTrack('hero_variant', { variant: getHeroVariant() }); } catch { /* ignore */ }
  }, []);

  // Exit intent on the pricing view — one gentle second-chance nudge per
  // session for visitors without a paid plan, desktop only (mouse leaving
  // through the top of the viewport).
  const [showExitIntent, setShowExitIntent] = useState(false);
  useEffect(() => {
    if (activeView !== 'pricing') return;
    // Only logged-OUT visitors: the popup invites you to "register for 3 free
    // applications, no credit card". Showing that to someone already registered
    // (especially one who has used their free quota) is contradictory.
    if (user) return;
    try { if (sessionStorage.getItem('stellify_exit_intent') === '1') return; } catch { /* ignore */ }
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 0) return;
      try {
        if (sessionStorage.getItem('stellify_exit_intent') === '1') return;
        sessionStorage.setItem('stellify_exit_intent', '1');
      } catch { /* ignore */ }
      setShowExitIntent(true);
    };
    document.addEventListener('mouseout', onOut);
    return () => document.removeEventListener('mouseout', onOut);
  }, [activeView, user]);

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
    const pdfjsLib = await import('pdfjs-dist');
    // pdfjs-dist v5 ships the worker as an ESM module (.mjs). Bundle it via
    // Vite's ?url import so we don't depend on an external CDN or a stale
    // URL shape (the previous '.js' URL silently 404'd, which is what made
    // every PDF upload fail with "konnte nicht gelesen werden").
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
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
    const { default: mammoth } = await import('mammoth');
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
      if (!res.ok) throw new Error(data.error || 'Lebenslauf-Analyse fehlgeschlagen');
      const jsonMatch = (data.text || '').match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const analysisData = JSON.parse(jsonMatch[0]);
      setLatestAnalysis(analysisData);
      
      if (user) {
        await addDoc(collection(db, 'cv_analyses'), { user_id: user.id, data: analysisData, created_at: new Date().toISOString() });
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

      // Scanned/image-only PDFs extract to (near-)empty text. Storing that
      // silently would make every tool behave as if a CV existed while the
      // AI has nothing to work with — tell the user honestly instead.
      if (file.type === 'application/pdf' && text.trim().length < 40) {
        throw new Error('scanned-pdf');
      }

      setCvContext(text);

      // Trigger AI Analysis (frontend, no auth needed for basic analysis)
      analyzeCV(text);

      // Upload file to Supabase Storage + backend metadata analysis (parallel)
      const token = await getAuthToken();
      await Promise.allSettled([
        // Store actual file in Supabase Storage via backend
        (async () => {
          try {
            // Skip storage for oversized files: base64 grows ~4/3 and Vercel
            // rejects request bodies over ~4.5 MB, so 3 MB is the safe file
            // ceiling. Text extraction above already succeeded, so the
            // product keeps working in text-only mode.
            if (file.size > 3 * 1024 * 1024) { console.warn('CV > 3 MB, storing text only.'); return; }
            const arrayBuffer = await file.arrayBuffer();
            // Chunked conversion: spreading a whole PDF into String.fromCharCode
            // blows the call stack for files > ~64 KB (i.e. every real CV).
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            const CHUNK = 0x8000;
            for (let i = 0; i < bytes.length; i += CHUNK) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
            }
            const base64 = btoa(binary);
            await fetch('/api/upload-cv', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ base64, fileName: file.name, mimeType: file.type }),
            });
          } catch (e) { console.warn("CV file upload failed, text-only mode."); }
        })(),
        // Backend metadata analysis
        (async () => {
          try {
            await fetch('/api/analyze-cv', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ text: text.substring(0, 1000) }),
            });
          } catch (e) { console.warn("Backend CV analysis failed."); }
        })(),
        // Persist CV text in DB
        updateDoc(doc(db, 'users', user.id), { cv_context: text }).catch(e => handleDbError(e, 'db', `users/${user.id}`)),
      ]);

      if (STELLA_CHAT_ENABLED) {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: language === 'FR' ? `J'ai bien lu ton CV "${file.name}". J'ai analysé le contenu et suis prêt à t'aider dans tes candidatures !` : language === 'IT' ? `Ho letto con successo il tuo CV "${file.name}". Ho analizzato il contenuto e sono pronto ad aiutarti con le tue candidature!` : language === 'EN' ? `I've successfully read your CV "${file.name}". I've analysed the content and am ready to help you with your applications!` : `Ich habe deinen Lebenslauf "${file.name}" erfolgreich eingelesen. Ich habe den Inhalt analysiert und bin bereit, dir bei deinen Bewerbungen zu helfen!`
        }]);
        if (!isStellaOpen) setIsStellaOpen(true);
      } else {
        showToast(
          language === 'FR' ? `CV "${file.name}" importé avec succès`
            : language === 'IT' ? `CV "${file.name}" importato con successo`
            : language === 'EN' ? `CV "${file.name}" imported successfully`
            : `Lebenslauf "${file.name}" erfolgreich importiert`
        );
      }
    } catch (error) {
      console.error("PDF extraction error:", error);
      if (STELLA_CHAT_ENABLED) {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: language === 'FR' ? `Désolé, une erreur s'est produite lors de la lecture de ton CV "${file.name}". Essaie avec un autre fichier.` : language === 'IT' ? `Scusa, si è verificato un errore durante la lettura del tuo CV "${file.name}". Prova con un altro file.` : language === 'EN' ? `Sorry, an error occurred while reading your CV "${file.name}". Please try with a different file.` : `Entschuldigung, beim Einlesen deines Lebenslaufs "${file.name}" ist ein Fehler aufgetreten. Bitte versuche es mit einer anderen Datei.`
        }]);
      } else {
        showToast(
          language === 'FR' ? `Impossible de lire "${file.name}". Essaie un autre fichier.`
            : language === 'IT' ? `Impossibile leggere "${file.name}". Prova un altro file.`
            : language === 'EN' ? `Couldn't read "${file.name}". Please try a different file.`
            : `"${file.name}" konnte nicht gelesen werden. Bitte versuche eine andere Datei.`,
          'error'
        );
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Preset avatar selection — writes the chosen id straight to the user doc.
  const handleSelectAvatar = async (id: string | null) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { avatar_id: id });
      setUser({ ...user, avatarId: id ?? undefined });
      showToast(language === 'FR' ? 'Avatar mis à jour' : language === 'IT' ? 'Avatar aggiornato' : language === 'EN' ? 'Avatar updated' : 'Avatar aktualisiert');
    } catch (err) {
      console.error('Avatar select error:', err);
      showToast(language === 'FR' ? 'Enregistrement échoué' : language === 'IT' ? 'Salvataggio fallito' : language === 'EN' ? 'Could not save' : 'Speichern fehlgeschlagen', 'error');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authTab === 'login') {
        justLoggedIn.current = true;
        await signInWithEmailAndPassword(auth, email, password);
      } else {
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

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUid = userCredential.user.uid;
        await setDoc(doc(db, 'users', newUid), {
          id: newUid,
          email: userCredential.user.email || '',
          first_name: formattedName,
          role: 'client',
          created_at: new Date().toISOString(),
          ab_hero: getHeroVariant(),
          newsletter: true,
          cv_context: cvContext || null,
          free_generations_used: 0,
          tool_uses: 0,
          daily_tool_uses: 0,
          last_daily_reset: new Date().toISOString().split('T')[0],
          has_seen_tutorial: false,
          language,
          theme,
        });
        fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userCredential.user.email, firstName: formattedName, language }),
        }).then(null, console.error);
      }
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
    } catch (err: any) {
      console.error("Auth Error:", err);
      const code: string = err.code || '';
      const msg: string = err.message || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential' || msg.includes('Invalid login credentials')) {
        setAuthError(
          language === 'DE' ? 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.' :
          language === 'FR' ? 'Identifiants invalides. Veuillez vérifier votre e-mail et mot de passe.' :
          language === 'IT' ? 'Credenziali non valide. Verifica email e password.' :
          'Invalid credentials. Please check your email and password.'
        );
      } else if (code === 'auth/email-already-in-use' || msg.includes('already exists')) {
        setAuthError(
          language === 'DE' ? 'Diese E-Mail wird bereits verwendet. Bitte melde dich stattdessen an.' :
          language === 'FR' ? 'Cet e-mail est déjà utilisé. Veuillez vous connecter à la place.' :
          language === 'IT' ? 'Questa email è già in uso. Accedi invece.' :
          'This email is already in use. Please log in instead.'
        );
        if (authTab === 'register') setAuthTab('login');
      } else if (code === 'auth/weak-password' || msg.includes('Password should be')) {
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

  const handleGoogleAuth = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    // Firebase can take 10-30s to reject signInWithPopup after the user closes
    // the Google window, so the spinner would keep turning. Detect the cancel
    // ourselves: the moment our window regains focus (the popup is gone), give a
    // short grace for a real sign-in to land, then stop the spinner if it hasn't.
    let settled = false;
    const onFocus = () => {
      window.setTimeout(() => { if (!settled) setIsAuthLoading(false); }, 1200);
    };
    window.addEventListener('focus', onFocus, { once: true });
    try {
      justLoggedIn.current = true;
      await signInWithPopup(auth, new GoogleAuthProvider());
      settled = true;
      setIsAuthModalOpen(false);
    } catch (err: any) {
      settled = true;
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google Auth Error:', err);
        const msg = language === 'DE' ? 'Google-Anmeldung fehlgeschlagen.' : language === 'FR' ? 'Échec de la connexion Google.' : language === 'IT' ? 'Accesso Google fallito.' : 'Google authentication failed.';
        setAuthError(msg);
        showToast(msg, 'error');
      }
    } finally {
      settled = true;
      window.removeEventListener('focus', onFocus);
      setIsAuthLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteError('');
    // Password users must prove it is really them; the field used to be
    // decorative. Google users have no password — their live Google
    // session is the proof, so they skip this step.
    const fbUser = auth.currentUser;
    const usesPassword = !!fbUser?.providerData.some(p => p.providerId === 'password');
    if (usesPassword && !deletePassword) {
      setDeleteError(language === 'DE' ? 'Bitte gib dein Passwort ein.' : language === 'FR' ? 'Veuillez saisir votre mot de passe.' : language === 'IT' ? 'Inserisci la tua password.' : 'Please enter your password.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      if (usesPassword && fbUser) {
        try {
          await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email || user.email, deletePassword));
        } catch (reauthErr: any) {
          const c = reauthErr?.code || '';
          setDeleteError(
            c === 'auth/wrong-password' || c === 'auth/invalid-credential'
              ? (language === 'DE' ? 'Falsches Passwort.' : language === 'FR' ? 'Mot de passe incorrect.' : language === 'IT' ? 'Password errata.' : 'Wrong password.')
              : (language === 'DE' ? 'Bestätigung fehlgeschlagen. Bitte erneut versuchen.' : language === 'FR' ? 'Échec de la confirmation. Veuillez réessayer.' : language === 'IT' ? 'Conferma non riuscita. Riprova.' : 'Confirmation failed. Please try again.')
          );
          setIsDeletingAccount(false);
          return;
        }
      }
      const token = await getAuthToken();
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      await firebaseSignOut(auth);
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
      
      await updateDoc(doc(db, 'users', user.id), { first_name: formattedName });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
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
    if (!user) {
      showToast(language === 'FR' ? 'Veuillez vous connecter' : language === 'IT' ? 'Effettua il login' : language === 'EN' ? 'Please log in' : 'Bitte melde dich an', 'error');
      return;
    }
    if (!newApp.company?.trim() || !newApp.position?.trim()) {
      showToast(language === 'FR' ? "Entreprise et poste sont obligatoires" : language === 'IT' ? 'Azienda e posizione sono obbligatorie' : language === 'EN' ? 'Company and position are required' : 'Firma und Position sind Pflichtfelder', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'applications'), { ...newApp, company: capFirst(newApp.company), position: capFirst(newApp.position), location: capFirst(newApp.location), user_id: user.id, created_at: new Date().toISOString() });
      setIsAddingApp(false);
      setNewApp({ company: '', position: '', status: 'Applied', location: '', salary: '', notes: '', reminder_at: '' });
      showToast(language === 'FR' ? 'Candidature ajoutée' : language === 'IT' ? 'Candidatura aggiunta' : language === 'EN' ? 'Application added' : 'Bewerbung hinzugefügt', 'success');
    } catch (e: any) {
      handleDbError(e, 'db', `applications`);
      const msg = e?.code === 'permission-denied'
        ? (language === 'FR' ? "Accès refusé. Vérifie que tu es connecté." : language === 'IT' ? 'Accesso negato. Verifica di aver eseguito il login.' : language === 'EN' ? 'Access denied. Please make sure you are logged in.' : 'Zugriff verweigert. Bitte stelle sicher dass du angemeldet bist.')
        : (language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`);
      showToast(msg, 'error');
    }
  };

  const updateApplication = async () => {
    if (!user || !editingApp) return;
    if (!editingApp.company?.trim() || !editingApp.position?.trim()) {
      showToast(language === 'FR' ? "Entreprise et poste sont obligatoires" : language === 'IT' ? 'Azienda e posizione sono obbligatorie' : language === 'EN' ? 'Company and position are required' : 'Firma und Position sind Pflichtfelder', 'error');
      return;
    }
    try {
      const { id, user_id, created_at, ...fields } = editingApp;
      await updateDoc(doc(db, 'applications', editingApp.id), { ...fields, company: capFirst(fields.company), position: capFirst(fields.position), location: capFirst(fields.location), updated_at: new Date().toISOString() });
      setEditingApp(null);
      showToast(language === 'FR' ? 'Modifications enregistrées' : language === 'IT' ? 'Modifiche salvate' : language === 'EN' ? 'Changes saved' : 'Änderungen gespeichert', 'success');
    } catch (e: any) {
      handleDbError(e, 'db', `applications/${editingApp.id}`);
      showToast(language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`, 'error');
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'applications', appId), { status: newStatus, updated_at: new Date().toISOString() });
    } catch (e: any) {
      handleDbError(e, 'db', `applications/${appId}`);
      showToast(language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`, 'error');
    }
  };

  // Inline edit of a single tracker field (company/position/location/salary)
  // straight from the list, no edit dialog. Text fields get capFirst so the
  // list stays consistent with rows created via the form.
  const updateApplicationField = async (appId: string, field: string, rawValue: string) => {
    if (!user) return;
    const value = (field === 'company' || field === 'position' || field === 'location') ? capFirst(rawValue) : rawValue;
    try {
      await updateDoc(doc(db, 'applications', appId), { [field]: value, updated_at: new Date().toISOString() });
    } catch (e: any) {
      handleDbError(e, 'db', `applications/${appId}`);
      showToast(language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`, 'error');
    }
  };

  // Favorite pin — deliberately does NOT touch updated_at, since starring is
  // not real movement in the application and must not reset the stale nudge.
  const toggleApplicationFavorite = async (appId: string, favorite: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'applications', appId), { favorite });
    } catch (e: any) {
      handleDbError(e, 'db', `applications/${appId}`);
      showToast(language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`, 'error');
    }
  };

  // Persist a new manual order: every row gets a sort_index matching its
  // position in `orderedIds`. Optimistically reorder the local state so the
  // drag feels instant; revert if Firestore fails.
  const updateApplicationOrder = async (orderedIds: string[]) => {
    if (!user) return;
    const indexById = new Map(orderedIds.map((id, i) => [id, i]));
    const prev = applications;
    setApplications((curr) => [...curr].sort((a, b) => {
      const ai = indexById.has(a.id) ? indexById.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = indexById.has(b.id) ? indexById.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    }));
    try {
      await Promise.all(orderedIds.map((id, i) =>
        updateDoc(doc(db, 'applications', id), { sort_index: i })
      ));
    } catch (e: any) {
      setApplications(prev);
      handleDbError(e, 'db', 'applications/order');
      showToast(language === 'FR' ? 'Réorganisation échouée' : language === 'IT' ? 'Riordino fallito' : language === 'EN' ? 'Reorder failed' : 'Sortierung fehlgeschlagen', 'error');
    }
  };

  const deleteApplication = async (appId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'applications', appId));
      showToast(language === 'FR' ? 'Candidature supprimée' : language === 'IT' ? 'Candidatura eliminata' : language === 'EN' ? 'Application deleted' : 'Bewerbung gelöscht', 'success');
    } catch (e: any) {
      handleDbError(e, 'db', `applications/${appId}`);
      showToast(language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`, 'error');
    }
  };

  const exportApplicationsCsv = () => {
    const headers = [
      t.tracker_company,
      t.tracker_position,
      t.tracker_col_status,
      t.tracker_location,
      t.tracker_salary,
      t.tracker_reminder,
      t.tracker_notes,
      t.tracker_col_updated,
      'Archiviert',
    ];
    const statusLabel = (s: string) => s === 'Wishlist' ? t.tracker_wishlist
      : s === 'Applied' ? t.tracker_applied
      : s === 'Interview' ? t.tracker_interview
      : s === 'Offer' ? t.tracker_offer
      : t.tracker_rejected;
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = applications.map((a) => [
      a.company || '',
      a.position || '',
      statusLabel(a.status || ''),
      a.location || '',
      a.salary || '',
      a.reminder_at || '',
      a.notes || '',
      a.created_at ? new Date(a.created_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      a.archived ? 'Ja' : 'Nein',
    ].map(escape).join(','));
    const csv = '﻿' + [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bewerbungen-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const setApplicationArchived = async (appId: string, archived: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'applications', appId), { archived, updated_at: new Date().toISOString() });
      showToast(
        archived
          ? (language === 'FR' ? 'Archivée' : language === 'IT' ? 'Archiviata' : language === 'EN' ? 'Archived' : 'Archiviert')
          : (language === 'FR' ? 'Restaurée' : language === 'IT' ? 'Ripristinata' : language === 'EN' ? 'Restored' : 'Wiederhergestellt'),
        'success',
      );
    } catch (e: any) {
      handleDbError(e, 'db', `applications/${appId}`);
      showToast(language === 'FR' ? `Erreur: ${e?.message || 'inconnue'}` : language === 'IT' ? `Errore: ${e?.message || 'sconosciuto'}` : language === 'EN' ? `Error: ${e?.message || 'unknown'}` : `Fehler: ${e?.message || 'unbekannt'}`, 'error');
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
        { role: 'ai', content: language === 'FR' ? 'Pour utiliser Stella, tu dois d\'abord **t\'inscrire gratuitement**. Clique sur "Commencer gratuitement" en haut à droite, ça ne prend que 30 secondes !' : language === 'IT' ? 'Per usare Stella, devi prima **registrarti gratuitamente**. Clicca su "Inizia gratuitamente" in alto a destra, ci vogliono solo 30 secondi!' : language === 'EN' ? 'To use Stella, you must first **register for free**. Click on "Start for free" at the top right, it only takes 30 seconds!' : 'Um Stella zu nutzen, musst du dich zuerst **kostenlos registrieren**. Klicke auf "Kostenlos starten" oben rechts, es dauert nur 30 Sekunden!' }
      ]);
      if (!overrideContent) setInput('');
      setAuthTab('register');
      setIsAuthModalOpen(true);
      return;
    } else {
      setMessages(prev => [...prev, userMsg]);
      addDoc(collection(db, 'messages'), { user_id: user.id, role: 'user', content: userContent, created_at: new Date().toISOString() }).catch(console.error);
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
      
      setMessages(prev => [...prev, { role: 'ai', content: limitMsg }]);
      if (user) {
        addDoc(collection(db, 'messages'), { user_id: user.id, role: 'ai', content: limitMsg, created_at: new Date().toISOString() }).catch(console.error);
      }
      setIsTyping(false);
      return;
    }

    // Increment usage for non-unlimited users
    if (user && !isUnlimited) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          free_generations_used: (user.freeGenerationsUsed || 0) + 1,
          daily_tool_uses: (user.dailyToolUses || 0) + 1,
        });
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
        - PREMIUM GUIDANCE: When a user asks about advanced features (e.g., unlimited CV analyses, advanced job matching, interview coaching, salary tools, unlimited messages), ALWAYS mention that these are available in the Pro or Karriere+ plan on Stellify. Guide them clearly to the pricing/plans section. Example: "This feature is available in the Pro plan, you can upgrade directly in the Stellify pricing section." Adapt to the user's language.

        LANGUAGE:
        - Respond in the user's selected language: ${language}.
        - If the language is German, use Swiss High German (no "ß", use "ss").

        USER TIER: ${user?.role === 'unlimited' ? 'Unlimited (Highest Priority/Elite)' : user?.role === 'pro' ? 'Pro (Premium)' : 'Gratis (Standard)'}.
        ${!isPro ? '- FREE USER: This user is on the free plan. When relevant, briefly and elegantly mention the benefits of upgrading to Pro or Karriere+. Do not be pushy, mention it naturally when it adds value.' : ''}

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
      
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      if (user) {
        addDoc(collection(db, 'messages'), { user_id: user.id, role: 'ai', content: reply, created_at: new Date().toISOString() }).catch(console.error);
      }
    } catch (err: any) {
      console.error("Stella Chat Error:", err);
      const isOverloaded = err.message?.includes('overloaded') || err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('high demand');
      let errorMsg = isOverloaded
        ? (language === 'DE' ? 'Stella ist gerade sehr gefragt, bitte warte kurz und versuche es in 1 bis 2 Minuten erneut.'
          : language === 'FR' ? 'Stella est très demandée en ce moment, réessaie dans 1 à 2 minutes.'
          : language === 'IT' ? 'Stella è molto richiesta in questo momento, riprova tra 1 a 2 minuti.'
          : 'Stella is very busy right now, please try again in 1 to 2 minutes.')
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
      
      setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      if (user) {
        addDoc(collection(db, 'messages'), { user_id: user.id, role: 'ai', content: errorMsg, created_at: new Date().toISOString() }).catch(console.error);
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

    // The strategy card IS the tracker — open the real board instead of a
    // separate AI overlay, so there is exactly one tracker experience.
    if (toolId === 'tracker') {
      navigate('tracker');
      return;
    }

    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;

    // Don't force the underlying view to 'dashboard' — the tool opens as a
    // fixed full-screen overlay, so changing the view only means the user
    // lands on the dashboard (not where they were) when they close it.
    // Leaving activeView untouched returns them exactly where they opened it.
    setActiveTool(tool);
    setShowToolHelp(false);
    setToolInput({});
    setToolResult(null);
    setToolResultEditable('');
    setIsEditingToolResult(false);
  };

  /** Compact, per-tool example shown in the Tools-section header preview.
      `score` drives the progress ring (null = no ring, just a list).
      `L` holds localized [context-label, ...result-lines]. Kept lean , 
      one example per tool, switches when the user hovers/clicks a chip. */
  const getHeaderExample = (id: string): { score: number | null; L: string[] } => {
    const lang = (language === 'FR' || language === 'IT' || language === 'EN') ? language : 'DE';
    const pick = (de: string[], fr: string[], it: string[], en: string[]) =>
      lang === 'FR' ? fr : lang === 'IT' ? it : lang === 'EN' ? en : de;
    const M: Record<string, { score: number | null; L: string[] }> = {
      'bewerbungs-gen': { score: 92, L: pick(
        ['Bewerbungs-Scanner · Marketing Manager · Nestlé', 'Anschreiben geschrieben, 4 Absätze', 'Lebenslauf verbessert · 12 wichtige Wörter getroffen', 'Fertig als PDF und Word'],
        ['Score ATS · Marketing Manager · Nestlé', 'Lettre générée, 4 paragraphes', 'CV optimisé · 12 mots-clés', 'Prêt en PDF et Word'],
        ['Punteggio ATS · Marketing Manager · Nestlé', 'Lettera generata, 4 paragrafi', 'CV ottimizzato · 12 parole chiave', 'Pronto in PDF e Word'],
        ['ATS score · Marketing Manager · Nestlé', 'Cover letter generated, 4 paragraphs', 'CV optimised · 12 keywords matched', 'Ready as PDF and Word']) },
      'cv-gen': { score: 90, L: pick(
        ['Bewerbung · 60 Sekunden', 'Motivationsschreiben fertig', 'Lebenslauf-Highlights gesetzt', 'Schweizer Hochdeutsch, kein ß'],
        ['Candidature · 60 secondes', 'Lettre de motivation prête', 'Points forts du CV définis', 'Allemand suisse correct'],
        ['Candidatura · 60 secondi', 'Lettera di motivazione pronta', 'Punti forti del CV definiti', 'Tedesco svizzero corretto'],
        ['Application · 60 seconds', 'Cover letter ready', 'CV highlights set', 'Swiss German, no ß']) },
      'ats-sim': { score: 82, L: pick(
        ['Bewerbungs-Scanner · gegen Inserat', '7 von 10 Wörtern getroffen', 'Wird von der Bewerbungs-Software gelesen', 'Fehlt noch: SAP, Buchhaltung'],
        ['Test ATS · contre l\'annonce', 'Correspondance 7 sur 10', 'Format lu par SuccessFactors', 'Manque : SAP S/4HANA, IFRS'],
        ['Test ATS · contro l\'annuncio', 'Corrispondenza 7 su 10', 'Formato letto da SuccessFactors', 'Manca: SAP S/4HANA, IFRS'],
        ['ATS check · against the ad', 'Match on 7 of 10 terms', 'Read by SuccessFactors', 'Missing: SAP S/4HANA, IFRS']) },
      'cv-analysis': { score: 76, L: pick(
        ['Bewertung · Banking · Zürich', 'Wichtige Wörter: Kennzahlen · Berichte · Excel', 'Passt zur Branche', 'Tipp: Power BI ergänzen'],
        ['Score marché · Banking · Zurich', 'Mots-clés : KPI · Reporting · Excel', 'Adéquation secteur détectée', 'Conseil : ajouter Power BI'],
        ['Punteggio mercato · Banking · Zurigo', 'Parole chiave: KPI · Reporting · Excel', 'Affinità settore rilevata', 'Consiglio: aggiungere Power BI'],
        ['Market score · Banking · Zurich', 'Keywords: KPI · Reporting · Excel', 'Industry fit detected', 'Tip: add Power BI']) },
      'cv-optimizer': { score: 91, L: pick(
        ['Verbessert · Berufserfahrung', 'Aktive Sätze statt Passiv', 'Erfolge mit Zahlen (+18% Umsatz)', 'Wird von Bewerbungs-Software gelesen'],
        ['Optimisé · expérience', 'Verbes actifs', 'Succès quantifiés (+18% CA)', 'Conforme ATS'],
        ['Ottimizzato · esperienza', 'Verbi attivi', 'Successi quantificati (+18%)', 'Conforme ATS'],
        ['Optimised · experience', 'Active verbs', 'Quantified wins (+18% revenue)', 'ATS-compliant']) },
      'cv-premium': { score: 95, L: pick(
        ['Premium-Rewrite · komplett', 'Layout auf Schweizer Standard', 'Datumsformate angepasst, kein ß', 'Kurzprofil neu geschrieben'],
        ['Réécriture premium', 'Mise en page standard suisse', 'Dates adaptées', 'Profil réécrit'],
        ['Riscrittura premium', 'Layout standard svizzero', 'Date adattate', 'Profilo riscritto'],
        ['Premium rewrite', 'Swiss-standard layout', 'Date formats fixed', 'Summary rewritten']) },
      'skill-gap': { score: null, L: pick(
        ['Skill-Gap · Ziel: Senior Data Scientist', 'Power BI · in 64% der Stellen verlangt', 'SQL · Pflicht bei Konzernen', 'Englisch C1 · in 8 von 10 Inseraten'],
        ['Écart · Senior Data Scientist', 'Power BI · 64% des postes', 'SQL · requis grands groupes', 'Anglais C1 · 8 sur 10'],
        ['Gap · Senior Data Scientist', 'Power BI · 64% delle posizioni', 'SQL · richiesto nei gruppi', 'Inglese C1 · 8 su 10'],
        ['Gap · Senior Data Scientist', 'Power BI · 64% of roles', 'SQL · required at large firms', 'English C1 · 8 of 10 ads']) },
      'career-roadmap': { score: null, L: pick(
        ['Roadmap · Ziel: Head of IT', '1. ITIL-Zertifizierung', '2. Wechsel in Teamleiter-Rolle', '3. MBA an der HSG in 2 Jahren'],
        ['Feuille de route · Head of IT', '1. Certification ITIL', '2. Rôle de chef d\'équipe', '3. MBA HSG en 2 ans'],
        ['Roadmap · Head of IT', '1. Certificazione ITIL', '2. Ruolo team leader', '3. MBA HSG in 2 anni'],
        ['Roadmap · Head of IT', '1. ITIL certification', '2. Move to team lead', '3. HSG MBA in 2 years']) },
      'interview': { score: null, L: pick(
        ['Interview-Coach · 5 Fragen', '„Warum gerade in der Schweiz?"', 'Antwort nach STAR-Methode', 'Bewertung 0 bis 100 mit Tipps'],
        ['Coach entretien · 5 questions', '« Pourquoi la Suisse ? »', 'Réponse méthode STAR', 'Note 0 à 100 avec conseils'],
        ['Coach colloquio · 5 domande', '« Perché la Svizzera? »', 'Risposta metodo STAR', 'Voto 0 a 100 con consigli'],
        ['Interview coach · 5 questions', '"Why Switzerland?"', 'Answer via STAR method', 'Score 0 to 100 with tips']) },
      'interview-live': { score: null, L: pick(
        ['Live-Interview · Product Manager', 'Massgeschneiderte Fragen zur Stelle', 'Antwort per Text oder Mikrofon', 'Feedback zu Tonfall & Inhalt'],
        ['Entretien live · Product Manager', 'Questions sur mesure', 'Réponse texte ou micro', 'Feedback ton & contenu'],
        ['Colloquio live · Product Manager', 'Domande su misura', 'Risposta testo o microfono', 'Feedback tono & contenuto'],
        ['Live interview · Product Manager', 'Tailored questions', 'Answer by text or mic', 'Feedback on tone & content']) },
      'salary-negotiation': { score: null, L: pick(
        ['Lohnverhandlung · Banking ZH', 'Marktwert: CHF 118\'000', '5 konkrete Argumente', '13. Monatslohn-Strategie'],
        ['Négociation · Banking ZH', 'Valeur marché : CHF 118\'000', '5 arguments concrets', 'Stratégie 13e salaire'],
        ['Trattativa · Banking ZH', 'Valore mercato: CHF 118\'000', '5 argomenti concreti', 'Strategia 13ª mensilità'],
        ['Salary talk · Banking ZH', 'Market value: CHF 118,000', '5 concrete arguments', '13th-salary strategy']) },
      'matching': { score: null, L: pick(
        ['Passende Stellen · Top 3', '92% · Datenanalyst/in · UBS', '87% · Leiter Datenanalyse · Swiss Re', '81% · Leiter Berichtswesen · PostFinance'],
        ['Postes adaptés · Top 3', '92% · Datenanalyst/in · UBS', '87% · Leiter Datenanalyse · Swiss Re', '81% · Leiter Berichtswesen · PostFinance'],
        ['Posizioni adatte · Top 3', '92% · Datenanalyst/in · UBS', '87% · Leiter Datenanalyse · Swiss Re', '81% · Leiter Berichtswesen · PostFinance'],
        ['Matching roles · Top 3', '92% · Datenanalyst/in · UBS', '87% · Leiter Datenanalyse · Swiss Re', '81% · Leiter Berichtswesen · PostFinance']) },
      'tracker': { score: null, L: pick(
        ['Bewerbungs-Tracker · live', '20 Bewerbungen im Überblick', '5 im Interview', '2 Angebote'],
        ['Suivi candidatures · live', '20 candidatures en vue', '5 en entretien', '2 offres'],
        ['Tracker candidature · live', '20 candidature in vista', '5 in colloquio', '2 offerte'],
        ['Application tracker · live', '20 applications in view', '5 in interview', '2 offers']) },
    };
    return M[id] || M['bewerbungs-gen'];
  };

  // Display order on the Tools page — best / headline tool first, down to
  // the supporting ones. Anything not listed falls to the end.
  const TOOL_PRIORITY = [
    'bewerbungs-gen', 'cv-gen', 'ats-sim', 'cv-analysis', 'cv-optimizer',
    'cv-premium', 'interview', 'interview-live', 'salary-negotiation',
    'skill-gap', 'matching', 'career-roadmap', 'tracker',
  ];
  /** Rich, practice-near visual example per tool — a miniature of what the
      tool actually produces, with realistic Swiss data. Falls back to the
      compact getHeaderExample list for any tool without a bespoke visual. */
  const renderToolExample = (tool: any): React.ReactNode => {
    const id = tool.id;
    const exLabel = language === 'FR' ? 'Exemple' : language === 'IT' ? 'Esempio' : language === 'EN' ? 'Example' : 'Beispiel';
    const Ring = ({ score, label, sub }: { score: number; label: string; sub: string }) => (
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(0,66,37,0.10)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#004225" strokeWidth="3" strokeDasharray={`${score} 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-serif text-[#004225] dark:text-[#00A854]">{score}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{label}</p>
          <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8] truncate">{sub}</p>
        </div>
      </div>
    );
    const KeyChip = ({ label, ok }: { label: string; ok: boolean }) => (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${ok ? 'bg-[#004225]/8 dark:bg-[#00A854]/12 text-[#004225] dark:text-[#00A854]' : 'bg-red-500/8 text-red-600 dark:text-red-400'}`}>
        {ok ? <CheckCircle2 size={10} /> : <X size={10} />}{label}
      </span>
    );
    const Bar = ({ label, pct, value }: { label: string; pct: number; value: string }) => (
      <div>
        <div className="flex justify-between text-[10px] mb-1"><span className="text-[#4A4A45] dark:text-[#9A9A94] font-medium">{label}</span><span className="text-[#004225] dark:text-[#00A854] font-bold">{value}</span></div>
        <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden"><div className="h-full bg-[#004225] dark:bg-[#00A854] rounded-full" style={{ width: `${pct}%` }} /></div>
      </div>
    );

    if (id === 'bewerbungs-gen' || id === 'cv-gen') {
      return (
        <div className="w-full space-y-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-sm px-2 py-1.5 min-w-0">
            <Link2 size={10} className="text-[#9A9A94] shrink-0" />
            <span className="flex-1 min-w-0 text-[9px] font-medium text-[#5C5C58] dark:text-[#9A9A94] truncate">jobs.ch/stellen/marketing-manager-nestle</span>
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/12 px-1.5 py-0.5 rounded">
              <CheckCircle2 size={8} />{language === 'FR' ? 'Importé' : language === 'IT' ? 'Importato' : language === 'EN' ? 'Imported' : 'Importiert'}
            </span>
          </div>
          <div className="bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-sm shadow-sm overflow-hidden">
            <div className="bg-[#004225] px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-white text-[10px] font-serif font-bold truncate">{previewIdentity.name}</span>
              <span className="text-[#6FCF97] text-[8px] font-bold uppercase tracking-widest shrink-0">Marketing Manager</span>
            </div>
            <div className="p-3 space-y-1.5">
              {/* Photo sits inside the document, top right — like a real Swiss application. */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 pt-0.5">
                  <p className="text-[9px] font-bold text-[#004225] dark:text-[#00A854]">Bewerbung als Marketing Manager · Nestlé</p>
                  <p className="text-[8.5px] text-[#26261F] dark:text-[#B5B5AF]">Sehr geehrte Damen und Herren,</p>
                </div>
                <span className="shrink-0 w-10 h-10 rounded-sm overflow-hidden border border-black/10 dark:border-white/15 shadow-sm" style={{ backgroundColor: AVATAR_PRESETS.find(p => p.id === previewAvatarId)?.bg }}>
                  <PresetAvatar id={previewAvatarId} className="w-full h-full" />
                </span>
              </div>
              <p className="text-[8.5px] text-[#26261F] dark:text-[#B5B5AF] leading-relaxed min-h-[3em]"><TypeText text="mit grossem Interesse bewerbe ich mich als Marketing Manager bei Nestlé. Seit drei Jahren verantworte ich die Markenstrategie eines Schweizer Konsumgüterherstellers und habe die Markenbekanntheit um 28 Prozent gesteigert." speed={18} /></p>
              <p className="text-[8.5px] text-[#26261F] dark:text-[#B5B5AF] leading-relaxed">In meiner aktuellen Rolle führe ich ein Team von vier Personen, verantworte ein Jahresbudget von CHF 800 000 und habe zuletzt eine Kampagne umgesetzt, die den Onlineumsatz innerhalb eines Jahres um 35 Prozent erhöht hat. Die Zusammenarbeit mit Agenturen, Handelspartnern und internen Stakeholdern gehört dabei zu meinem Alltag.</p>
              <p className="text-[8.5px] text-[#26261F] dark:text-[#B5B5AF] leading-relaxed">Nestlé begeistert mich, weil Sie Markenführung mit echter Konsumentennähe verbinden. Genau diese Kombination aus Strategie und Umsetzung ist meine Stärke, und ich freue mich darauf, sie in Ihr Team einzubringen.</p>
              <p className="text-[8.5px] text-[#26261F] dark:text-[#B5B5AF] leading-relaxed">Gerne überzeuge ich Sie in einem persönlichen Gespräch.</p>
              <p className="text-[8.5px] text-[#26261F] dark:text-[#B5B5AF]">Freundliche Grüsse<br /><span className="font-semibold">{previewIdentity.name}</span></p>
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/25 dark:border-[#00A854]/40 px-1.5 py-0.5 rounded"><Download size={8} />PDF</span>
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/25 dark:border-[#00A854]/40 px-1.5 py-0.5 rounded"><Download size={8} />Word</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-white bg-[#004225] dark:bg-[#00A854] px-1.5 py-0.5 rounded"><CheckCircle2 size={8} />{language === 'FR' ? 'Prêt à envoyer' : language === 'IT' ? 'Pronto per l\'invio' : language === 'EN' ? 'Ready to send' : 'Versandbereit'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2 py-1 rounded-full"><Clock size={9} />{language === 'FR' ? '60 secondes' : language === 'IT' ? '60 secondi' : language === 'EN' ? '60 seconds' : '60 Sekunden'}</span>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2 py-1 rounded-full"><CheckCircle2 size={9} />{language === 'FR' ? 'Standard suisse' : language === 'IT' ? 'Standard svizzero' : language === 'EN' ? 'Swiss standard' : 'Schweizer Standard'}</span>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2 py-1 rounded-full"><FileText size={9} />{language === 'FR' ? 'CV repris automatiquement' : language === 'IT' ? 'CV ripreso automaticamente' : language === 'EN' ? 'CV applied automatically' : 'Lebenslauf automatisch übernommen'}</span>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2 py-1 rounded-full"><ImageIcon size={9} />{language === 'FR' ? 'Photo intégrée' : language === 'IT' ? 'Foto inserita' : language === 'EN' ? 'Photo placed' : 'Foto eingefügt'}</span>
          </div>
        </div>
      );
    }
    if (id === 'ats-sim') {
      return (
        <div className="w-full space-y-3">
          <Ring score={82} label={language === 'EN' ? 'CV scanner · vs. job ad' : 'Bewerbungs-Scanner · gegen Inserat'} sub={language === 'EN' ? '7 of 10 words found' : '7 von 10 Wörtern gefunden'} />
          <div className="flex flex-wrap gap-1.5">
            <KeyChip label="Kennzahlen" ok /><KeyChip label="Berichte" ok /><KeyChip label="Teamführung" ok /><KeyChip label="SAP fehlt" ok={false} /><KeyChip label="Buchhaltung" ok={false} />
          </div>
        </div>
      );
    }
    if (id === 'cv-analysis') {
      return (
        <div className="w-full space-y-3">
          <Ring score={76} label={language === 'EN' ? 'Rating · Banking · Zurich' : 'Bewertung · Banking · Zürich'} sub="Business Analyst" />
          <div className="flex flex-wrap gap-1.5"><KeyChip label="Kennzahlen" ok /><KeyChip label="Berichte" ok /><KeyChip label="Excel" ok /><KeyChip label="Power BI fehlt" ok={false} /></div>
        </div>
      );
    }
    if (id === 'cv-optimizer' || id === 'cv-premium') {
      return (
        <div className="w-full space-y-2.5">
          <Ring score={id === 'cv-premium' ? 95 : 91} label={language === 'EN' ? 'Optimised' : 'Optimiert'} sub={language === 'EN' ? 'Experience section' : 'Berufserfahrung'} />
          <div className="text-[10px] space-y-1.5">
            <p className="text-[#9A9A94] line-through">Verantwortlich für Projekte</p>
            <p className="flex gap-1.5 text-[#004225] dark:text-[#00A854] font-medium"><ArrowRight size={11} className="shrink-0 mt-0.5" />Leitung von 5 Projekten · Budget CHF 500k · +20% Effizienz</p>
          </div>
        </div>
      );
    }
    if (id === 'interview' || id === 'interview-live') {
      return (
        <div className="w-full bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-sm p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">{language === 'EN' ? 'Question 1 / 5' : 'Frage 1 / 5'}</span>
            {id === 'interview-live' && <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]"><Mic size={9} />Live</span>}
          </div>
          <p className="text-[11px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] leading-snug min-h-[2.4em]"><TypeText text="„Erzählen Sie von einem Projekt mit einer schwierigen Entscheidung." speed={18} /></p>
          <div className="pt-2 border-t border-black/8 dark:border-white/8">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-1">Stella-Tipp</p>
            <p className="text-[9.5px] italic text-[#5C5C58] dark:text-[#9A9A94] leading-relaxed min-h-[1.4em]"><TypeText text="STAR: Situation, Aufgabe, Aktion, Resultat. Erfolg beziffern." speed={18} startDelay={1400} /></p>
          </div>
        </div>
      );
    }
    if (id === 'salary-negotiation') {
      return (
        <div className="w-full bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-sm p-3.5 space-y-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">Median · Banking · Zürich · 5 J.</p>
            <p className="text-2xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">CHF 118'000<span className="text-[10px] text-[#9A9A94]"> /Jahr</span></p>
          </div>
          <div>
            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1"><span>CHF 95k</span><span>CHF 145k</span></div>
            <div className="h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full relative overflow-hidden"><div className="absolute inset-y-0 left-[15%] right-[20%] bg-[#004225] dark:bg-[#00A854] rounded-full" /></div>
          </div>
          <p className="text-[9.5px] text-[#4A4A45] dark:text-[#9A9A94]">+ 13. Monatslohn · 5 bis 10% Bonus realistisch</p>
        </div>
      );
    }
    if (id === 'skill-gap') {
      return (
        <div className="w-full space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{language === 'EN' ? 'Target: Senior Data Scientist' : 'Ziel: Senior Data Scientist'}</p>
          <Bar label="Power BI" pct={36} value={language === 'EN' ? 'gap' : 'Lücke'} />
          <Bar label="SQL" pct={70} value="OK" />
          <Bar label="English C1" pct={88} value="OK" />
        </div>
      );
    }
    if (id === 'matching') {
      return (
        <div className="w-full space-y-2">
          {[{ m: 92, t: 'Datenanalyst/in', c: 'UBS · Zürich' }, { m: 87, t: 'Leiter Datenanalyse', c: 'Swiss Re · Zürich' }, { m: 81, t: 'Leiter Berichtswesen', c: 'PostFinance · Bern' }].map((x, i) => (
            <div key={i} className="flex items-center gap-3 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-sm p-2">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#004225]/10 dark:bg-[#00A854]/15 flex items-center justify-center text-[#004225] dark:text-[#00A854] font-bold text-[11px]">{x.m}%</div>
              <div className="min-w-0"><p className="text-[11px] font-semibold text-[#1A1A18] dark:text-[#FAFAF8] truncate">{x.t}</p><p className="text-[9px] text-[#9A9A94] truncate">{x.c}</p></div>
            </div>
          ))}
        </div>
      );
    }
    if (id === 'career-roadmap') {
      return (
        <div className="w-full space-y-0">
          {[{ n: 'Heute', t: 'ITIL-Zertifizierung starten' }, { n: '6 Mt.', t: 'Wechsel in Teamleiter-Rolle' }, { n: '2 J.', t: 'MBA an der HSG · Head of IT' }].map((s, i, arr) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 shrink-0 rounded-full bg-[#004225] dark:bg-[#00A854] text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</div>
                {i < arr.length - 1 && <div className="w-px flex-1 bg-[#004225]/25 dark:bg-[#00A854]/30 my-0.5" />}
              </div>
              <div className="pb-3"><p className="text-[9px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">{s.n}</p><p className="text-[11px] text-[#1A1A18] dark:text-[#FAFAF8] min-h-[1.3em]"><TypeText text={s.t} speed={18} startDelay={i * 900} /></p></div>
            </div>
          ))}
        </div>
      );
    }
    if (id === 'tracker') {
      const cols = [
        { l: language === 'FR' ? 'Envoyées' : language === 'IT' ? 'Inviate' : language === 'EN' ? 'Applied' : 'Beworben', c: '#9A9A94', items: ['Roche', 'PostFinance'] },
        { l: 'Interview', c: '#D4A852', items: ['Swisscom'] },
        { l: language === 'FR' ? 'Offre' : language === 'IT' ? 'Offerta' : language === 'EN' ? 'Offer' : 'Angebot', c: '#004225', items: ['Nestlé'] },
      ];
      // Numbers add up to what the columns below actually show
      // (2 applied + 1 interview + 1 offer), anything else reads as a bug.
      const stats = [
        { n: '4', l: language === 'FR' ? 'Candidatures' : language === 'IT' ? 'Candidature' : language === 'EN' ? 'Applications' : 'Bewerbungen' },
        { n: '1', l: 'Interview' },
        { n: '1', l: language === 'FR' ? 'Offre' : language === 'IT' ? 'Offerta' : language === 'EN' ? 'Offer' : 'Angebot' },
      ];
      return (
        <div className="w-full space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s, i) => (
              <div key={i} className="bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-sm px-2 py-1.5 text-center">
                <p className="text-base font-serif text-[#004225] dark:text-[#00A854] leading-none">{s.n}</p>
                <p className="text-[7.5px] font-bold uppercase tracking-widest text-[#9A9A94] mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="w-full grid grid-cols-3 gap-2">
            {cols.map((col, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: col.c }}>{col.l}</p>
                {col.items.map((it, j) => (
                  <div key={j} className="bg-white dark:bg-[#2A2A26] border-l-2 px-1.5 py-1 text-[9px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] shadow-sm" style={{ borderLeftColor: col.c }}>{it}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-[#004225]/6 dark:bg-[#00A854]/10 border border-[#004225]/20 dark:border-[#00A854]/25 rounded-sm px-2 py-1.5">
            <Bell size={10} className="text-[#004225] dark:text-[#00A854] shrink-0" />
            <p className="text-[9px] font-medium text-[#004225] dark:text-[#00A854]">{language === 'FR' ? 'Relancer: Swisscom · dans 3 jours' : language === 'IT' ? 'Follow-up: Swisscom · tra 3 giorni' : language === 'EN' ? 'Follow up: Swisscom · in 3 days' : 'Nachfassen: Swisscom · in 3 Tagen'}</p>
          </div>
        </div>
      );
    }

    // Fallback: compact list from getHeaderExample
    const ex = getHeaderExample(id); const [context, ...lines] = ex.L;
    return (
      <div className="w-full space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{context}</p>
        <ul className="space-y-1.5 text-xs text-[#4A4A45] dark:text-[#9A9A94]">
          {lines.map((line, i) => <li key={i} className="flex gap-2"><CheckCircle2 size={12} className="text-[#004225] dark:text-[#00A854] shrink-0 mt-0.5" />{line}</li>)}
        </ul>
        <span className="sr-only">{exLabel}</span>
      </div>
    );
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
      // authFetch attaches the Firebase token — the server derives the user
      // from it (the account to upgrade must never come from the body).
      const res = await authFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan,
          billingCycle,
          successUrl: window.location.origin + '/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.origin + '/pricing'
        })
      });

      const data = await res.json().catch(() => ({ error: 'Server-Fehler' }));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.upgraded) {
        // Existing subscription was switched in place — no checkout needed.
        showToast(language === 'FR' ? 'Plan mis à jour. Bienvenue !' : language === 'IT' ? 'Piano aggiornato. Benvenuto!' : language === 'EN' ? 'Plan updated. Welcome!' : 'Plan aktualisiert. Willkommen!');
        setTimeout(() => { window.location.href = window.location.origin + '/dashboard'; }, 1200);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout fehlgeschlagen');
      }
    } catch (e: any) {
      console.error("Subscription error:", e);
      const msg = e.message || '';
      // The raw error is logged above for us to diagnose. A customer must
      // never see an internal code or config wording — only a calm, human
      // message. The one exception is the legitimate "plan already active".
      const userMsg = msg.includes('bereits aktiv')
        ? 'Dieser Plan ist bereits aktiv.'
        : language === 'FR' ? "Le paiement n'est pas possible pour le moment. Merci de réessayer dans quelques minutes."
        : language === 'IT' ? 'Il pagamento non è possibile al momento. Riprova tra qualche minuto.'
        : language === 'EN' ? 'Payment is not possible right now. Please try again in a few minutes.'
        : 'Die Bezahlung ist gerade nicht möglich. Bitte versuche es in ein paar Minuten noch einmal.';
      setSubscriptionError(userMsg);
    } finally {
      setIsSubscribing(false);
    }
  };

  /**
   * Realistic Swiss demo inputs per tool. Used by the "Mit Beispiel
   * ausprobieren" CTA on the empty state — fills the form and triggers
   * processTool() so new users instantly see live AI output instead of
   * just a mock preview. Keys MUST match each tool's `inputs[].key`.
   */
  const TOOL_EXAMPLES: Record<string, Record<string, string>> = {
    'cv-optimizer':       { section: 'Berufserfahrung als Projektleiter' },
    'cv-analysis':        { cvText: 'Anna Müller, 32 Jahre, Zürich.\nBerufserfahrung: Senior Business Analyst bei UBS (2020 bis heute), Business Analyst bei Credit Suisse (2017 bis 2020).\nAusbildung: BSc Wirtschaftsinformatik HSLU, CAS Data Analytics HSG.\nSprachen: Deutsch (Muttersprache), Englisch (C1), Französisch (B2).\nSkills: SQL, Excel, Power BI, Tableau, Stakeholder Management, agile Projektleitung.' },
    'cv-premium':         { firstName: 'Anna', lastName: 'Müller', applicationType: 'Bewerbung / Vorstellung', duration: '5 Jahre', qualifications: 'BSc Wirtschaftsinformatik HSLU, CAS Data Analytics HSG, SQL, Power BI', cvText: 'Anna Müller, 32, Zürich. 5 Jahre Erfahrung als Business Analyst im Banking.', description: 'Vollständige Optimierung auf Schweizer Premium-Standard.' },
    'cv-gen':             { firstName: 'Anna', lastName: 'Müller', applicationType: 'Bewerbung / Vorstellung', duration: '5 Jahre', qualifications: 'BSc Wirtschaftsinformatik HSLU, CAS Data Analytics HSG, SQL, Power BI', jobAd: 'Senior Business Analyst (m/w/d), Zürich, Banking. Wir suchen eine analytische Persönlichkeit mit SQL- und BI-Erfahrung für ein Datenstrategie-Team.', description: 'Motiviertes, knappes Anschreiben mit Fokus auf Schweizer Banking-Erfahrung.' },
    'ats-sim':            { jobAd: 'Senior Business Analyst (m/w/d), Zürich, Banking. Anforderungen: 5+ Jahre Erfahrung im Banking, exzellente SQL- und Power-BI-Kenntnisse, Erfahrung mit Stakeholder Management und agilen Methoden, Deutsch verhandlungssicher, Englisch C1.' },
    'skill-gap':          { targetJob: 'Senior Data Scientist bei Roche, Basel' },
    'tracker':            { jobTitle: 'Senior Projektleiterin bei Roche, Basel' },
    'career-roadmap':     { firstName: 'Anna', lastName: 'Müller', applicationType: 'Bewerbung / Vorstellung', duration: '5 Jahre', qualifications: 'BSc Wirtschaftsinformatik HSLU, Power BI, SQL', goal: 'Head of Business Intelligence in 5 Jahren', description: 'Konkrete Roadmap mit Weiterbildungen für den Schweizer Markt.' },
    'interview':          { firstName: 'Anna', lastName: 'Müller', jobTitle: 'Product Manager bei ABB, Zürich', applicationType: 'Bewerbung / Vorstellung', qualifications: 'BSc Wirtschaftsinformatik, 5 Jahre Projektleitung', description: 'Fokus auf STAR-Methode und Schweizer Marktkenntnis.' },
    'interview-live':     { jobTitle: 'Senior UX Designer', company: 'Digitec Galaxus AG, Zürich', jobDesc: 'Wir suchen einen erfahrenen UX Designer für die Optimierung unserer E-Commerce-Plattform. Erfahrung mit Figma, User Research und A/B-Testing erforderlich.' },
    'salary-negotiation': { jobTitle: 'Senior Business Analyst, Banking, Zürich, 5 J. Erfahrung', targetSalary: 'Von CHF 95k auf CHF 115k inkl. 13. Monatsgehalt' },
  };
  const hasExampleFor = (id?: string) => !!(id && TOOL_EXAMPLES[id]);
  // Two-phase trigger: setToolInput is a setState, so processTool would
  // still see the previous closure if we called it synchronously. Instead
  // flip a flag that an effect picks up on the next render — by then the
  // re-rendered processTool reads the freshly populated input.
  const [pendingExampleRun, setPendingExampleRun] = useState(false);
  const runExample = () => {
    if (!activeTool || !TOOL_EXAMPLES[activeTool.id]) return;
    setToolInput(TOOL_EXAMPLES[activeTool.id]);
    setPendingExampleRun(true);
  };
  useEffect(() => {
    if (!pendingExampleRun) return;
    setPendingExampleRun(false);
    processTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExampleRun]);

  const processTool = async () => {
    if (!activeTool) return;

    setIsProcessingTool(true);
    setToolResult(null);
    setToolResultEditable('');
    setIsEditingToolResult(false);
    setParsedSalaryResult(null);
    setParsedInterviewResult(null);

    const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
    const isPro = user?.role === 'pro' || isUnlimited;

    // Check if tool is ultimate-only
    if (activeTool.type === 'ultimate' && !isUnlimited) {
      setToolResult(
        language === 'DE'
          ? "Dieses exklusive Tool erfordert ein Karriere+-Abo für maximale Präzision und Tiefe."
          : language === 'FR' ? "Cet outil exclusif nécessite un abonnement Karriere+ pour une précision et une profondeur maximales."
          : language === 'IT' ? "Questo strumento esclusivo richiede un abbonamento Karriere+ per la massima precisione e profondità."
          : "This exclusive tool requires a Karriere+ subscription for maximum precision and depth."
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
    
    // Limits must match server QUOTA (api/index.ts) and the pricing copy.
    // Generierungen pro Monat: Free 3 lifetime · Pro 30 · Karriere+ 100.
    // No daily cap any more — monthly + per-minute fair-use only.
    const isToolLimitReached = (!isPro && toolUses >= 3)
      || (user?.role === 'pro' && !isUnlimited && toolUses >= 30)
      || (user?.role === 'unlimited' && toolUses >= 100);

    if (isToolLimitReached) {
      setToolResult(user?.role === 'pro' ? t.tool_limit_pro : t.tool_limit_free);
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
      if (activeTool.id === 'job-search') {
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
            KONTEXT: CV des Nutzers: ${cvContext || 'Kein Lebenslauf hochgeladen, arbeite ausschliesslich mit dem oben angegebenen Abschnitt und allgemeinen Schweizer CV-Standards.'}.
            
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
            1. Motivationsschreiben (Schweizer Standard, kein ß): vollständiger Brieftext.
            2. CV-Anpassungsvorschläge: als Fliesstext erklärt.
            3. Elevator Pitch für die LinkedIn-Recruiter-Nachricht: als fertiger Nachrichtentext.
            4. Die drei stärksten Argumente, warum der Kandidat perfekt passt: als Absätze formuliert.

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
        case 'ats-sim':
          prompt = `
            HANDLUNGSANWEISUNG: Führe eine tiefgehende "Premium ATS-Simulation" (Applicant Tracking System) durch.
            KONTEXT: CV: ${cvContext || 'Kein Lebenslauf hochgeladen, bewerte nur das Inserat und gib allgemeine ATS-Optimierungen nach Schweizer Standard.'}. Inserat: ${toolInput.jobAd}.
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

            DEINE ROLLE: Du bist Experte für Schweizer Arbeitsrecht (OR Art. 330a) und HR-Codierung mit 20 Jahren Erfahrung.

            SCHWEIZER ZEUGNIS-CODE (Referenz):
            Note 6 (sehr gut): "stets zu unserer vollsten Zufriedenheit" / "ausserordentlich" / "überaus"
            Note 5 (gut): "zu unserer vollen Zufriedenheit" / "sehr" / "hervorragend"
            Note 4 (befriedigend): "zu unserer Zufriedenheit" / "gut" (ACHTUNG: "gut" allein = Durchschnitt!)
            Note 3 (genügend): "im Grossen und Ganzen zu unserer Zufriedenheit" / "bemüht"
            Note 2 (schlecht): "hat versucht" / fehlende Schlussformel / keine Adjektive
            NEGATIV-CODES: "bemüht" = kaum Erfolg; "erledigt" ohne Zusatz = Minimalleistung; "ruhiges Wesen" = passiv; "kollegiales Umfeld geschätzt" = soziale Schwierigkeiten; fehlendes "wir bedauern" = kein Bedauern; fehlendes "jederzeit" = eingeschränkte Empfehlung

            ANALYSE-STRUKTUR:
            1. GESAMTNOTE (1.0 bis 6.0): Bewertung mit Begründung basierend auf dem Zeugnis-Code.
            2. SATZ-FÜR-SATZ DECODER: Jeder relevante Satz im Klartext, was bedeutet er wirklich?
            3. VERSTECKTE BOTSCHAFTEN: Auslassungen, negative Codes, unübliche Reihenfolgen, fehlende Standardformeln.
            4. KRITISCHE PUNKTE: Was bemerkt ein neuer Schweizer Arbeitgeber sofort?
            5. MARKT-POSITIONIERUNG: Konkrete Auswirkungen auf die Chancen im Schweizer Arbeitsmarkt.
            6. HANDLUNGSEMPFEHLUNG:
               - Recht auf Zeugnisberichtigung (OR Art. 330a): Welche Sätze sind anfechtbar?
               - Konkrete Formulierungsvorschläge für eine Nachbesserung.
               - Wie man Schwachstellen im Interview proaktiv adressiert.

            AUSGABE: Schweizer Hochdeutsch (kein "ß"). Direkt, präzise, professionell.
            Sektion "🇨🇭 Strategischer Vorteil": Konkrete nächste Schritte für den Nutzer.
          `;
          break;
        case 'interview': {
          const interviewTier = user?.role === 'unlimited' || user?.role === 'admin' ? 'unlimited' : user?.role === 'pro' ? 'pro' : 'free';
          const scoringGrid = interviewTier === 'unlimited'
            ? `
BEWERTUNGSRASTER (100%, Unlimited):
Bewerte den Kandidaten nach dem Interview in 8 Kategorien (je 0 bis 100%):
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
BEWERTUNGSRASTER (Pro, 5 Kategorien):
Bewerte in 5 Kategorien (je 0 bis 100%):
1. Fachliche Kompetenz (25%)
2. Kommunikation & Auftreten (25%)
3. Motivation & Vorbereitung (20%)
4. Problemlösung (15%)
5. Schweizer Marktkenntnis (15%)
→ Gesamtscore + Kernempfehlungen pro Kategorie.`
            : `
BEWERTUNGSRASTER (Basis):
Bewerte in 3 Kategorien (je 0 bis 100%):
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
            CV: ${cvContext || 'Kein CV hochgeladen, nutze allgemeine Schweizer Standards'}.
            SPRACHE: Schweizer Hochdeutsch (kein ß, verwende ss).

            AUFGABE: Erstelle eine massgeschneiderte Interview-Vorbereitung für Schweizer Unternehmen.

            ${scoringGrid}

            ANTWORTFORMAT: Antworte AUSSCHLIESSLICH mit gültigem JSON (keine Markdown-Codeblöcke, kein Text davor/danach):
            {
              "title": "Interview-Vorbereitung",
              "subtitle": "<kurze Zusammenfassung Qualifikation · Zielposition, max 90 Zeichen>",
              "tags": ["<3-5 zentrale Themen, je 1-3 Wörter>"],
              "stats": { "questions": <Anzahl Fragen als Zahl>, "topics": <Anzahl Kernthemen als Zahl>, "match": <Eignungs-Score 0-100 als Zahl> },
              "elevatorPitch": "<überzeugender Elevator Pitch in 3-4 Sätzen auf Schweizer Hochdeutsch, Ich-Form>",
              "questions": [
                { "question": "<anspruchsvolle Interviewfrage in Anführungszeichen>", "answer": "<optimale Musterantwort auf Schweizer Hochdeutsch, 2-4 Sätze>" }
              ],
              "tips": ["<5-6 konkrete Coaching-Tipps: Zahlen nennen, Gehaltsgespräch, Körpersprache, Gegenfragen, Schweizer Kultur>"]
            }
            Erstelle 5-7 Fragen. Alle Texte auf Schweizer Hochdeutsch (kein ß, verwende ss). Kein Markdown, nur reines JSON.
          `;
          break;
        }
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
            KONTEXT: CV: ${cvContext || 'Kein Lebenslauf hochgeladen, arbeite mit dem angegebenen Grund und allgemeinen Schweizer Wiedereinstiegs-Strategien.'}.
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
            KONTEXT: CV: ${toolInput.cvText || cvContext || 'Kein Lebenslauf vorhanden, bitte den Nutzer höflich, seinen Lebenslauf hochzuladen oder einzufügen, und gib solange allgemeine Schweizer Job-Profile.'}.
            AUFGABE: Basierend auf dem CV, welche 5 Job-Profile in der Schweiz passen am besten?
            Gib für jedes Profil einen Fit-Score (0-100%) und eine kurze Begründung an.
          `;
          break;
        case 'cv-analysis':
          prompt = `
            HANDLUNGSANWEISUNG: Führe eine tiefgehende "Premium-Analyse" des Lebenslaufs für den Schweizer Arbeitsmarkt durch.
            KONTEXT: CV: ${toolInput.cvText || cvContext || 'Kein Lebenslauf vorhanden, bitte den Nutzer höflich, seinen Lebenslauf hochzuladen oder einzufügen.'}.
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
            KONTEXT: CV: ${cvContext || 'Kein Lebenslauf hochgeladen, nutze den angegebenen Jobtitel und allgemeine Schweizer Bewerbungsstrategien.'}.
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
            STELLENBESCHREIBUNG: ${toolInput.jobDesc || 'Keine Details angegeben, nutze branchenübliche Anforderungen.'}.
            CV: ${cvContext || 'Kein CV hochgeladen, nutze allgemeine Schweizer Standards.'}.
            SPRACHE: Schweizer Hochdeutsch (kein ß, verwende ss).

            AUSGABE-FORMAT (NUR JSON, absolut kein Text davor oder danach):
            {
              "jobContext": "${toolInput.jobTitle}${toolInput.company ? ` bei ${toolInput.company}` : ''}",
              "questions": [
                {
                  "q": "Frage 1, präzise und realistisch, wie sie bei Schweizer Unternehmen gestellt wird",
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
            HANDLUNGSANWEISUNG: Erstelle einen präzisen, umsetzbaren Lohnverhandlungs-Leitfaden für die Schweiz.
            STELLE: ${toolInput.jobTitle}.
            VERHANDLUNGSZIEL: ${toolInput.targetSalary || 'Nicht spezifiziert'}.
            CV: ${cvContext || 'Nicht vorhanden'}.

            DEINE ROLLE: Du bist Senior Partner einer Schweizer Personalberatung (wie Michael Page, Hays, Adecco CH) mit 20 Jahren Verhandlungserfahrung.

            LEITFADEN-STRUKTUR:

            ## 🎯 Deine Marktpositionierung
            - Warum genau dieser Betrag? (Belegt mit Schweizer Marktdaten: BFS Lohnstrukturerhebung, Salarium)
            - Branchen-Multiplikatoren: Tech +15-20%, Banking +15-25%, traditionell +8-12%, NGO/Öffentlich +5-8%

            ## 📊 Einstiegsanker (Taktik)
            - Konkreter Einstiegswert (10-15% über Ziel, branchenabhängig)
            - Timing: Wann das Thema ansprechen? (Erst nach mündlichem Angebot, NICHT vorher)
            - Formulierung: "Basierend auf meiner Erfahrung und dem Schweizer Marktdurchschnitt für diese Position erwarte ich ein Jahresgehalt von CHF [X]."

            ## 💬 5 konkrete Argumente (mit Formulierungen)
            Für jedes Argument: Argument + genaue Formulierung auf Schweizer Hochdeutsch
            1. Nachweisbare Leistung (Zahlen, Resultate aus CV)
            2. Marktgerechter Lohn (Salarium-Referenz)
            3. 13. Monatslohn: "Ich rechne den 13. Monatslohn im Jahresgehalt ein, das entspricht CHF [X]/Monat."
            4. Spezifische Kompetenz / Marktknappheit
            5. Langfristige Wertschöpfung für das Unternehmen

            ## 🗣️ Einwand-Antworten (wörtliche Formulierungen)
            - Bei "Was verdienen Sie aktuell?": "Ich möchte mich auf das konzentrieren, was diese Position wert ist. Meine Erwartung liegt bei CHF [X]."
            - Bei "Das liegt über unserem Budget": "Ich verstehe. Können wir über eine Leistungskomponente (Bonus) oder einen früheren Review nach 6 Monaten sprechen?"
            - Bei "Wir müssen intern schauen": "Gerne. Bis wann kann ich mit einer Rückmeldung rechnen?"

            ## 🔄 Fallback-Strategie (wenn Gehalt fix ist)
            Priorisierte Alternativen: 1. Signing Bonus, 2. Leistungsbonus, 3. Weiterbildungsbudget (CHF 3'000-8'000/Jahr), 4. zusätzliche Ferientage, 5. Home Office Regelung, 6. frühzeitiger Lohnreview

            ## 🇨🇭 Schweizer Besonderheiten
            - 13. Monatslohn: Branchenstandard CH, im Jahresgehalt einrechnen (Bruttogehalt × 13/12 = Monatslohn)
            - Quellensteuer: Bei B/L-Ausweis kann Verhandlungsspielraum eingeschränkt sein
            - Kultureller Code: Direkt, sachlich, faktenbasiert, keine amerikanische Überschwänglichkeit
            - DO: Zahlen nennen, ruhig bleiben, Gegenvorschlag machen
            - DON'T: Druck machen, emotionale Argumente, Vergleiche mit Kollegen

            AUSGABE: Fliessender Text, professionell, keine Aufzählungszeichen ausser in den Formulierungsabschnitten.
          `;
          break;
        }
        default:
          prompt = language === 'FR' ? "Aide-moi dans ma carrière." : language === 'IT' ? "Aiutami nella mia carriera." : language === 'EN' ? "Please help me with my career." : "Bitte hilf mir bei meiner Karriere.";
      }

      const toolRes = await authFetch('/api/process-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, useSearch, language })
      });
      const toolData = await toolRes.json();
      if (toolRes.status === 429) throw new Error(toolData.error || 'rate limit');
      // Free quota used up: show the server's clear message in the result
      // panel instead of a generic failure, so the user knows what to do.
      if (toolRes.status === 402) {
        setIsProcessingTool(false);
        setUpgradePrompt({ reason: 'quota' });
        return;
      }
      if (toolRes.status === 503 && toolData.upgrade) {
        setIsProcessingTool(false);
        setUpgradePrompt({ reason: 'daily' });
        return;
      }
      if (!toolRes.ok) throw new Error(toolData.error || 'Tool processing failed');

      let resultText = toolData.text;
      const toolSources: string[] = toolData.sources || [];
      
      // Special handling for CV Analysis (JSON)
      if (activeTool.id === 'cv-analysis') {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysisData = JSON.parse(jsonMatch[0]);
            
            if (user) {
              await addDoc(collection(db, 'cv_analyses'), { user_id: user.id, data: analysisData, created_at: new Date().toISOString() });
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
          setToolResult(resultText || (language === 'FR' ? 'Une erreur s\'est produite lors de l\'analyse. Veuillez réessayer.' : language === 'IT' ? 'Si è verificato un errore durante l\'analisi. Riprova.' : language === 'EN' ? 'An error occurred during analysis. Please try again.' : 'Ein Fehler bei der Auswertung ist aufgetreten. Bitte versuche es erneut.'));
        }
      }

      // Special handling for Salary Calculation (JSON)
      if (activeTool.id === 'salary-calc') {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const salaryData = JSON.parse(jsonMatch[0]);
            
            if (user) {
              await addDoc(collection(db, 'salary_calculations'), { user_id: user.id, data: salaryData, created_at: new Date().toISOString() });
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
          setToolResult(resultText || (language === 'FR' ? 'Le calcul de salaire n\'a pas pu être traité. Veuillez réessayer.' : language === 'IT' ? 'Il calcolo dello stipendio non ha potuto essere elaborato. Riprova.' : language === 'EN' ? 'Salary calculation could not be processed. Please try again.' : 'Gehaltsberechnung konnte nicht ausgewertet werden. Bitte versuche es erneut.'));
        }
      }

      // Special handling for Interview-Coach (structured JSON → premium card)
      if (activeTool.id === 'interview') {
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const iv = JSON.parse(jsonMatch[0]);
            if (iv && (iv.questions || iv.elevatorPitch)) {
              setParsedInterviewResult(iv);
              if (user) {
                await addDoc(collection(db, 'tool_results'), { user_id: user.id, tool: 'interview', data: iv, created_at: new Date().toISOString() }).catch(() => {});
              }
              // Plain-text fallback for copy/PDF/export
              resultText = [
                iv.title || 'Interview-Vorbereitung',
                iv.subtitle ? iv.subtitle : '',
                '',
                'ELEVATOR PITCH',
                iv.elevatorPitch || '',
                '',
                'TYPISCHE FRAGEN & MUSTERANTWORTEN',
                ...(iv.questions || []).flatMap((q: any) => [q.question, q.answer, '']),
                'COACHING-TIPPS',
                ...(iv.tips || []).map((tp: string) => `- ${tp}`),
                '',
                'Generiert von Stellify Swiss AI',
              ].filter(Boolean).join('\n');
            }
          }
        } catch (e) {
          console.error("Error parsing Interview JSON:", e);
          // Leave resultText as-is → falls back to markdown render
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
          await addDoc(collection(db, 'tool_results'), {
            user_id: user.id,
            tool_id: activeTool.id,
            tool_title: activeTool.title,
            input: toolInput,
            result: resultText,
            created_at: new Date().toISOString(),
          });

          if (!isUnlimited) {
            await updateDoc(doc(db, 'users', user.id), {
              tool_uses: (user.toolUses || 0) + 1,
              daily_tool_uses: (user.dailyToolUses || 0) + 1,
              ...(useSearch ? { search_uses: (user.searchUses || 0) + 1 } : {}),
            });
          } else if (useSearch) {
            await updateDoc(doc(db, 'users', user.id), { search_uses: (user.searchUses || 0) + 1 });
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
          ? (language === 'DE' ? '⚠️ Die KI ist gerade sehr ausgelastet. Bitte warte 1 bis 2 Minuten und versuche es erneut.'
            : language === 'FR' ? '⚠️ L\'IA est très sollicitée. Veuillez attendre 1 à 2 minutes et réessayer.'
            : language === 'IT' ? '⚠️ L\'IA è molto occupata. Attendi 1 a 2 minuti e riprova.'
            : '⚠️ AI is very busy right now. Please wait 1 to 2 minutes and try again.')
          : (language === 'DE' ? '⚠️ Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
            : language === 'FR' ? '⚠️ Une erreur est survenue. Veuillez réessayer.'
            : language === 'IT' ? '⚠️ Si è verificato un errore. Riprova.'
            : '⚠️ An error occurred. Please try again.')
      );
    } finally {
      setIsProcessingTool(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!toolResult || !activeTool) return;
    const { jsPDF } = await import('jspdf');
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
    doc.text(new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }), pageWidth - margin, 9, { align: 'right' });

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
  <div class="doc-header">Stellify &nbsp;|&nbsp; ${language === 'FR' ? 'Co-Pilote carrière suisse' : language === 'IT' ? 'Co-Pilota carriera svizzero' : language === 'EN' ? 'Swiss Career Co-Pilot' : 'Schweizer Karriere-Co-Pilot'}</div>
  <h1>${activeTool.title}</h1>
  <div class="content">${mdToHtml(toolResult)}</div>
  <div class="doc-footer">${language === 'FR' ? 'Créé avec Stellify le' : language === 'IT' ? 'Creato con Stellify il' : language === 'EN' ? 'Created with Stellify on' : 'Erstellt mit Stellify am'} ${new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; stellify.ch</div>
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
  // Pricing model: monthly shows the per-month price; yearly shows the ANNUAL
  // TOTAL as the headline (legally cleaner under Swiss PBV than a /mo figure
  // you don't actually charge monthly). Stripe products must match these:
  //   Pro: CHF 9.90/mo · CHF 89/yr   |   Karriere+: CHF 19.90/mo · CHF 179/yr
  const planPricing = {
    // Round amounts shown without cents (Pro yearly 89, Karriere+ yearly 179);
    // the small monthly prices (9.90 / 19.90) keep their rappen.
    // Savings vs. monthly: 89 / (9.90×12) ≈ 25%, 179 / (19.90×12) ≈ 25%.
    pro:      { monthly: '9.90', yearly: '89', save: '25%' },
    ultimate: { monthly: '19.90', yearly: '179', save: '25%' },
  };
  const prices = billingCycle === 'yearly'
    ? { gratis: '0', pro: planPricing.pro.yearly, ultimate: planPricing.ultimate.yearly }
    : { gratis: '0', pro: planPricing.pro.monthly, ultimate: planPricing.ultimate.monthly };

  const translations: Record<string, any> = {
    DE: {
      welcome: "Willkommen zurück,",
      welcome_modal_subtitle: "Was möchtest du heute erreichen?",
      welcome_modal_quickstart: "Schnellstart",
      welcome_modal_dismiss: "Weiter zum Dashboard",
      search_label_tool: "Tools & Möglichkeiten entdecken...",
      stella_greeting: "Grüezi, {name}! Ich bin Stella, deine KI-Karriere-Assistentin. Wie kann ich dir heute helfen?",
      drag_cv_here: "Lebenslauf hierher ziehen oder klicken",
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
      job_keywords: "Wichtige Schlagworte",
      search_results: "{count} Ergebnisse gefunden",
      search_no_results: "Keine Ergebnisse gefunden",
      search_no_results_desc: "Versuche es mit anderen Suchbegriffen oder Kategorien.",
      search_close: "ESC zum Schliessen",
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
      hero_title: "Dein persönlicher KI-Karriereassistent",
      hero_desc: "Füge den Link eines Stelleninserats ein und erhalte in 60 Sekunden eine vollständige, versandbereite Bewerbung. Präzise, diskret und auf den Schweizer Arbeitsmarkt zugeschnitten.",
      cta_free: "Kostenlos starten",
      upload_cv: "Lebenslauf hochladen",
      update_cv: "Lebenslauf aktualisieren",
      cv_info: "① Lebenslauf hochladen → ② Inserat-Link einfügen → ③ Bewerbung in 60 Sekunden → ④ Im Tracker verfolgen",
      dashboard: "Dashboard",
      profile_nav: "Konto",
      tracker_nav: "Tracker",
      tracker_page_title: "Bewerbungs-Tracker",
      tracker_page_desc: "Alle Bewerbungen, synchron mit dem Dashboard. Sortiere per Drag & Drop, ändere Status oder archiviere.",
      tracker_page_kicker: "Dein Pipeline-Überblick",
      profile_title: "Mein Konto",
      profile_desc: "Dein Profil, dein Lebenslauf, dein Abo und alle Einstellungen an einem Ort.",
      profile_kicker: "Dein Bereich",
      dashboard_kicker: "Dein Arbeitsbereich",
      profile_account: "Konto",
      profile_account_name: "Name",
      profile_account_email: "E-Mail",
      profile_account_plan: "Aktiver Plan",
      profile_account_member_since: "Mitglied seit",
      profile_apps_overview: "Bewerbungs-Übersicht",
      profile_open_tracker: "Zum Tracker",
      profile_stat_interviews: "Interviews",
      profile_stat_offers: "Angebote",
      profile_stat_rejected: "Abgesagt",
      profile_recent_apps: "Letzte Bewerbungen",
      profile_activity: "Letzte Tool-Nutzung",
      profile_open_tools: "Zu den Tools",
      profile_photo: "Avatar",
      profile_photo_hint: "Wähle deinen Avatar. Er erscheint oben in der Navigation und in deinem Profil.",
      profile_avatar_initial: "Dein Anfangsbuchstabe",
      profile_avatar_pick_hint: "Fahre über einen Avatar, um seine Bedeutung zu sehen.",
      tools: "Tools",
      pricing: "Preise",
      login: "Anmelden",
      register: "Registrieren",
      logout: "Abmelden",
      success_stories: "Erfolgsgeschichten",
      nav_swiss: "Schweiz",
      promo_spot: "Werbespot",
      features: "Features",
      how_it_works: "So funktioniert's",
      success_title: "Echte Menschen. Echte Erfolge.",
      success_desc: "Tausende Schweizer haben mit Stellify bereits ihren Traumjob gefunden. Hier sind einige ihrer Geschichten.",
      promo_title: "Erlebe die Zukunft der Karriere.",
      promo_play: "Spot abspielen",
      examples_title: "KI-Präzision in Aktion",
      examples_desc: "Sieh dir an, wie Stellify Standard-Texte in Schweizer Premium-Bewerbungen verwandelt.",
      ai_notice: "Von Stella KI generiert. Inhalt vor Verwendung prüfen. Eigenverantwortung (AGB §9a).",
      settings: "Einstellungen",
      profile: "Profil",
      subscription: "Abonnement",
      data_privacy: "Datenschutz",
      tools_title: "Dein Werkzeug für jede Bewerbung.",
      tools_gen_f1: "Anschreiben, Lebenslauf und E-Mail in 60 Sekunden",
      tools_gen_f2: "Schweizer Standard, zugeschnitten aufs Stelleninserat",
      tools_gen_f3: "Export als PDF und Word, sofort versandbereit",
      tools_tracker_f1: "Alle Bewerbungen in einer klaren Pipeline",
      tools_tracker_f2: "Erinnerungen fürs Nachfassen zur richtigen Zeit",
      tools_tracker_f3: "Statistiken, die zeigen, was funktioniert",
      tools_cta_title: "Überzeug dich selbst. Die ersten 3 Bewerbungen aus dem Generator sind geschenkt.",
      tools_cta_sub: "Der Bewerbungs-Tracker ist komplett kostenlos, für immer. Zum Ausprobieren brauchst du kein Abo. Danach ab CHF 9.90 pro Monat.",
      tools_cta_btn: "Jetzt gratis testen",
      tools_cta_btn2: "Pläne ansehen",
      tools_badge: "Karriere-Tools",
      tools_view_all: "Alle Tools ansehen",
      market_title: "Warum jetzt. Warum Schweiz.",
      market_badge: "Marktpotenzial",
      pricing_title: "Einfache Preise. Volle Power.",
      pricing_monthly: "Monatlich",
      pricing_yearly: "Jährlich",
      pricing_save: "bis zu 3 Monate gratis",
      plan_free_subtitle: "Zum Kennenlernen. Ohne Verpflichtung.",
      plan_pro_subtitle: "Für Studierende, Berufseinsteiger und Gelegenheitsbewerber",
      plan_ultimate_subtitle: "Für aktive Stellensuchende und Karrierewechsler",
      pricing_gratis_desc: "Kostenlos loslegen, ohne Kreditkarte.",
      pricing_pro_desc: "Der Standard für ambitionierte Bewerber.",
      pricing_ultimate_desc: "Maximale Power für deine Karriere.",
      faq_title: "Häufig gestellte Fragen",
      footer_desc: "Stellify ist die Bewerbungs-KI für die Schweiz. Professionelle Bewerbungen in wenigen Minuten.",
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
      tool_no_cv: "Hinweis: Kein Lebenslauf hochgeladen. Die KI arbeitet mit allgemeinen Informationen. Lade deinen Lebenslauf hoch für persönlichere Resultate.",
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
      how_desc: "Vom Lebenslauf bis zur Zusage: Stellify begleitet dich durch jeden Schritt deiner Bewerbung.",
      how_1_t: "Lebenslauf hochladen",
      how_1_d: "Lade deinen Lebenslauf als PDF hoch. Stella liest ihn vollständig und nutzt deine Stärken für jede massgeschneiderte Bewerbung, in Sekunden.",
      how_2_t: "Bewerbung generieren",
      how_2_d: "Design wählen, Stelleninserat einfügen, fertig: In 60 Sekunden stehen Anschreiben, Lebenslauf und E-Mail in Schweizer Hochdeutsch bereit, als PDF oder Word.",
      how_3_t: "Überblick behalten & Zusage holen",
      how_3_d: "Verfolge jede Bewerbung im kostenlosen Tracker: klare Pipeline, Erinnerungen fürs Nachfassen und Statistiken, die zeigen, was funktioniert.",
      faq_badge: "Häufige Fragen",
      faq_subtitle: "Alles was du wissen musst",
      faq_contact: "Noch Fragen?",
      cta_final_title: "Deine Karriere verdient deinen persönlichen Copilot.",
      cta_final_desc: "Kostenlos starten. Schweizer Standard. Kein Abo-Risiko.",
      cta_final_btn: "Jetzt kostenlos starten",
      settings_first_name: "Vorname",
      settings_email: "E-Mail",
      settings_status: "Status: Aktiv",
      settings_change_plan: "Plan ändern",
      settings_manage_sub: "Abo verwalten & kündigen",
      settings_privacy_desc: "Deine Daten werden nach Schweizer Datenschutzgesetz (DSG) und DSGVO verarbeitet. Du kannst jederzeit eine Kopie deiner Daten anfordern oder dein Konto löschen.",
      edit: "Bearbeiten",
      save: "Speichern",
      cancel: "Abbrechen",
      promo_presents: "Stellify präsentiert",
      promo_precision: "Präzision",
      promo_redefined: "neu definiert.",
      promo_desc: "In einem Markt, in dem jedes Detail zählt, ist Stellify dein unfairer Vorteil. Der erste KI-Karriere-Copilot, der für den Schweizer Standard entwickelt wurde.",
      promo_journey: "Starte deine Reise",
      faq_1_q: "Wie sicher sind meine Daten?",
      faq_1_a: "Deine Daten werden nach Schweizer Datenschutzgesetz (DSG) und DSGVO verarbeitet und verschlüsselt übertragen. Du kannst dein Konto und alle Daten jederzeit selbst löschen. Details zu allen Dienstleistern findest du in der Datenschutzerklärung.",
      faq_2_q: "Wie funktioniert das Abonnement bei Stellify?",
      faq_2_a: "Du wählst einen monatlichen oder jährlichen Plan und erhältst sofort vollen Zugriff. Das Abo verlängert sich automatisch, damit dein Zugang nie unterbrochen wird. Du kannst es aber jederzeit mit einem Klick kündigen: in den Kontoeinstellungen unter Abo verwalten. Nach der Kündigung behältst du den vollen Zugriff bis zum Ende der bezahlten Laufzeit, danach wechselt dein Konto automatisch zum Gratis-Plan. Ein Upgrade, etwa von Pro auf Karriere+, ist jederzeit sofort möglich.",
      faq_3_q: "Wie viele Nutzungen sind in meinem Plan enthalten?",
      faq_3_a: "Eine Generierung entspricht einer erstellten Bewerbung mit KI. Der Gratis-Plan beinhaltet 3 Generierungen, ideal zum unverbindlichen Kennenlernen. Der Pro-Plan bietet 30 Generierungen pro Monat, den Stellen-Import per Link und alle Standard-Designs. Karriere+ erweitert das auf 100 Generierungen pro Monat und schaltet zusätzlich die exklusiven Premium-Designs frei. Die genauen Limits sind transparent auf der Preisseite und in den AGB aufgeführt.",
      faq_4_q: "Funktioniert Stellify für alle Branchen?",
      faq_4_a: "Ja, unsere KI wurde auf dem gesamten Schweizer Arbeitsmarkt trainiert.",
      faq_5_q: "Welche Sprachen werden unterstützt?",
      faq_5_a: "Wir unterstützen Deutsch, Englisch, Französisch und Italienisch.",
      faq_6_q: "Warum Stellify statt einer normalen Chat-KI?",
      faq_6_a: "Ein Chat gibt dir Text, den du selbst formatieren, prüfen und zusammenbauen musst. Stellify liefert das fertige Resultat: Du fügst das Stelleninserat per Link ein, dein Lebenslauf und dein Foto werden automatisch übernommen, und in 60 Sekunden hältst du ein versandbereites Dokument im Schweizer Standard in der Hand, als PDF und Word, im Design deiner Wahl. Dazu behält der kostenlose Tracker alle deine Bewerbungen, Fristen und Erinnerungen im Blick. Das ist der Unterschied zwischen einem Werkzeug und einem Textfenster.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Einstellungen",
      nav_logout: "Abmelden",
      nav_login: "Anmelden",
      tool_limit_pro: "Du hast deine 30 Generierungen für diesen Monat aufgebraucht. Am 1. des nächsten Monats hast du wieder neue Versuche frei. Upgrade auf Karriere+ für 100 Generierungen pro Monat plus Premium-Funktionen.",
      tool_limit_free: "Dieses Experten-Tool erfordert ein Pro- oder Karriere+-Abo.",
      onboarding_welcome_title: "Willkommen bei Stellify",
      onboarding_welcome_desc: "Dein KI-Copilot für die Schweizer Karriere. Wir helfen dir, das Beste aus deinem Potenzial herauszuholen.",
      onboarding_cv_title: "Lade deinen Lebenslauf hoch",
      onboarding_cv_desc: "Lade deinen Lebenslauf hoch, damit Stella dich und deine Erfahrungen besser versteht. So erhältst du personalisierte Tipps.",
      onboarding_chat_title: "Stella im Hintergrund",
      onboarding_chat_desc: "Stella ist die KI, die in jedem Tool im Hintergrund arbeitet. sie schreibt deine Bewerbung, optimiert deinen Lebenslauf und bereitet dich auf Vorstellungsgespräche vor. Du musst sie nicht erst fragen, sie ist immer da.",
      onboarding_tools_title: "Deine zwei Tools",
      onboarding_tools_desc: "Der Bewerbungs-Generator erstellt deine komplette Bewerbung als PDF und Word. Der Bewerbungs-Tracker behält alle deine Bewerbungen im Blick.",
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
      dashboard_usage_unlimited: "Premium-Nutzung mit 100 Generierungen pro Monat",
      plan_overview_title: "Dein Plan im Überblick",
      plan_what_included: "In deinem Plan enthalten",
      plan_what_upgrade: "Mit Upgrade bekommst du",
      plan_upgrade_cta: "Plan upgraden",
      plan_reset_info: "Limits werden automatisch zurückgesetzt, täglich um 0 Uhr, monatlich am 1.",
      plan_resets_lifetime: "Limits bleiben bestehen. Upgrade jederzeit möglich.",
      plan_free_f1: "3 KI-Generierungen zum Ausprobieren", plan_free_f2: "Bewerbungs-Übersicht & Status", plan_free_f3: "Bewerbungen speichern & bearbeiten", plan_free_f4: "PDF-Export", plan_free_f5: "Mehrsprachig (DE/FR/IT/EN)",
      plan_pro_f1: "30 KI-Generierungen pro Monat", plan_pro_f2: "Massgeschneiderte Bewerbungen mit KI", plan_pro_f3: "Stelle per Link laden & Lebenslauf nutzen", plan_pro_f4: "Alle Standard-Designs", plan_pro_f5: "PDF- & Word-Export",
      plan_unlim_f1: "Volle KI-Power: 100 Generierungen pro Monat", plan_unlim_f2: "Alle exklusiven Premium-Designs", plan_unlim_f3: "Alle Vorteile aus Pro", plan_unlim_f4: "Persönlicher E-Mail-Support", plan_unlim_f5: "Für Vielbewerber und Berufswechsel",
      dashboard_usage_desc: "Tool-Nutzung",
      dashboard_chat_usage: "Stella Anfragen",
      dashboard_daily_usage: "Tageslimit",
      dashboard_reset_monthly: "Reset am 1. des Monats",
      dashboard_reset_daily: "Reset morgen",
      dashboard_stat_free_chat: "{used} / 3 Chat-Anfragen",
      dashboard_stat_free_tools: "{used} / 1 Tool-Nutzung",
      tool_daily_limit_pro: "Du hast dein Tageslimit erreicht. Morgen stehen dir wieder Versuche zur Verfügung.",
      tool_limit_search_pro: "Dein Limit für Live-Suchen (10/Monat) ist erreicht. Nächsten Monat hast du wieder neue Suchen frei. Upgrade auf Karriere+ für 300 Live-Suchen pro Monat.",
      tool_limit_search_fair_use: "Du hast das Fair-Use-Limit für Live-Suchen erreicht. Bitte versuche es morgen wieder oder kontaktiere den Support.",
      dashboard_stat_pro: "Pro",
      dashboard_pro: "Karriere-Profi",
      dashboard_desc: "Erstelle in 60 Sekunden eine neue Bewerbung oder behalte deine laufenden Bewerbungen im Tracker im Blick.",
      dashboard_stat_analyses: "Analysen",
      dashboard_stat_cv_status: "Lebenslauf",
      dashboard_stat_ready: "Bereit",
      dashboard_stat_missing: "Fehlt",
      dashboard_stat_applications: "Bewerbungen",
      dashboard_stat_unlimited: "Karriere+",
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
      tracker_notes_ph: "z.B. Bonus, Geschäftsauto, Kontaktperson, nächster Schritt…",
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
      tracker_search_ph: "Suche Firma, Position, Ort…",
      tracker_view_kanban: "Kanban",
      tracker_view_table: "Tabelle",
      tracker_show_archived: "Archiv anzeigen",
      tracker_hide_archived: "Archiv ausblenden",
      tracker_archive: "Archivieren",
      tracker_unarchive: "Wiederherstellen",
      tracker_no_results: "Keine Bewerbungen gefunden",
      tracker_col_company: "Firma",
      tracker_col_position: "Position",
      tracker_col_status: "Status",
      tracker_col_location: "Ort",
      tracker_col_salary: "Gehalt",
      tracker_col_updated: "Aktualisiert",
      tracker_col_actions: "",
      stat_total: "Gesamt",
      stat_in_process: "noch offen",
      stat_interviews: "Interviews",
      stat_offers: "Angebote",
      stat_avg_salary: "Ø Gehalt",
      stat_rate: "Quote",
      stat_based_on: "von",
      stat_no_data: "-",
      tracker_reminder: "Erinnerung am",
      tracker_reminder_due: "Heute fällig",
      tracker_reminder_overdue: "überfällig",
      tracker_reminder_short: "Erinnerung",
      tracker_export_csv: "CSV-Export",
      transparency_badge: "Transparenz",
      transparency_title: "Was geht. und was nicht",
      transparency_sub: "Damit du genau weisst woran du bist. Alle Limits beziehen sich auf KI-Anfragen (Tools + Chat).",
      tr_can_title: "Das kannst du", tr_cannot_title: "Das geht nicht",
      tr_can_1: "Alle Tools auf jedem Plan ausprobieren",
      tr_can_2: "Bewerbungen erstellen, speichern und als PDF oder Word exportieren",
      tr_can_3: "Auf Deutsch, Französisch, Italienisch und Englisch arbeiten",
      tr_can_4: "Schweizer Lohnbänder, Standards und Arbeitsmarkt-Kontext nutzen",
      tr_can_5: "Jederzeit Plan wechseln, kündigen oder pausieren. keine Bindung",
      tr_cannot_1: "Stellify ersetzt keinen Anwalt oder Steuerberater. KI-Inhalte immer prüfen",
      tr_cannot_2: "Keine Garantie auf Stellenangebote. wir sind ein Werkzeug, kein Vermittler",
      tr_cannot_3: "Keine Verarbeitung sensibler Daten (z.B. Gesundheits-, Religions-, Sozialhilfe-Daten)",
      tr_cannot_4: "Keine Massenbewerbungen oder Automatisierung gegen unsere AGB",
      tr_limits_title: "Konkrete KI-Limits pro Plan",
      tr_lim_free_label: "Gratis", tr_lim_free_v: "3 Generierungen lebenslang · alle Tools zum Testen",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "30 Generierungen pro Monat · alle Kern-Tools · Dokumentenspeicherung",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "100 Generierungen pro Monat · ATS Premium · erweiterter Interview Coach · Premium-Vorlagen",
      tr_reset_info: "Die monatlichen Generierungs-Limits werden jeweils am 1. des Monats zurückgesetzt (Europe/Zurich).",
      tr_fair_use: "Stellify nutzt einen Fair-Use-Schutz von max. 15 (Pro) bzw. 30 (Karriere+) Anfragen pro Minute, um Missbrauch zu verhindern.",
      quick_tools: "Quick Tools",
      all_tools: "Alle Tools",
      recent_docs: "Deine letzten Dokumente",
      view_all: "Alle ansehen",
      time_just_now: "Gerade eben",
      stella_context_title: "Stella Context",
      stella_context_cv_ready: "Lebenslauf analysiert",
      stella_context_no_cv: "Kein Lebenslauf hochgeladen",
      stella_context_focus: "Fokus-Bereiche",
      stella_roadmap: "Deine Roadmap",
      stella_roadmap_empty: "Lade deinen Lebenslauf hoch, um deine Roadmap zu sehen.",
      stella_insights: "Stella Insights",
      stella_market_score: "Markt-Bewertung",
      stella_top_keywords: "Wichtigste Schlagworte",
      stella_best_match: "Beste Übereinstimmung",
      stella_ch_corrections: "Sprachliche Korrekturen (CH-Hochdeutsch)",
      stella_ch_tips: "Schweiz-Spezifische Tipps",
      stella_short_profile: "Optimiertes Kurzprofil",
      stella_highlights: "Optimierte Highlights",
      stella_name: "Stella, KI-Assistentin",
      stella_online: "Online, bereit zu helfen",
      stella_input_ph: "Schreibe Stella etwas...",
      tool_open: "Öffnen",
      docs_empty: "Noch keine Dokumente generiert. Starte mit einem Tool unten.",
      stella_raw_json: "Rohdaten (JSON) anzeigen",
      stella_full_analysis: "Vollständige Analyse",
      stella_insights_with_cv: "Stella hat dein Profil analysiert. Dein Fokus auf Präzision passt hervorragend zum Schweizer Markt. Nutze die Lebenslauf-Analyse für einen tieferen Check.",
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
      tool_cv_optional_label: "Lebenslauf (optional, falls keiner hochgeladen)",
      tool_cv_optional_ph: "Füge deinen Lebenslauf hier ein oder lade eine Datei, oder lass es leer für allgemeine Tipps.",
      tool_load_file: "Datei laden",
      salary_security_notice: "Deine Daten sind sicher: Stellify speichert keine persönlichen Gehaltsdaten. Die Berechnung erfolgt anonymisiert nach Schweizer Datenschutzstandards.",
      swiss_standard_notice_title: "Swiss Career Excellence",
      swiss_standard_notice_text: "Präzise auf den Schweizer Arbeitsmarkt ausgerichtet, von der Sprache bis zur Bewerbungsstruktur.",
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
      hero_accent: "KI-Karriereassistent",
      badge_new: "NEU",
      tools_section_badge: "KI-Karriere-Tools",
      tools_section_title: "Alles, was du für deine Karriere brauchst",
      tools_section_desc: "Von der Lebenslauf-Analyse bis zur Lohnverhandlung: Stellify begleitet dich durch jeden Schritt.",
      tools_section_cta: "Alle Tools ansehen →",
      testimonial_verified: "Verifiziert",
      cv_banner_title: "Lade deinen Lebenslauf hoch für personalisierte KI-Analysen",
      cv_banner_desc: "PDF oder Word · Kostenlos · Alle Tools werden auf deinen Lebenslauf abgestimmt",
      cv_upload_hint: "PDF oder Word · Kostenlos & sicher analysieren lassen",
      cv_banner_btn: "Lebenslauf hochladen",
      cv_stat_upload: "Hochladen",
      testimonials: [
        { name: 'Lukas B.', role: 'Polymechaniker EFZ', city: 'Winterthur', quote: 'Nach meiner Ausbildung wusste ich nicht genau, wie ich meine Praxiserfahrungen im Lebenslauf am besten darstelle. Stellify half mir, meine Projekte präzise zu beschreiben. Jetzt habe ich einen tollen Job bei einem grossen Industrieunternehmen.' },
        { name: 'Sarah W.', role: 'HR-Fachfrau', city: 'Zürich', quote: 'Ich sehe täglich hunderte Bewerbungen. Der Zeugnis-Decoder von Stellify ist erschreckend präzise. Er hilft mir nicht nur privat, er gibt mir auch eine neue Perspektive auf den Schweizer Arbeitsmarkt.' },
        { name: 'Hans-Peter K.', role: 'Logistikleiter', city: 'Olten', quote: 'Mit über 50 nochmal neu anfangen war eine Herausforderung. Stellify hat meine jahrzehntelange Erfahrung in moderne, ATS-optimierte Sprache übersetzt. Das öffnete mir Türen, die ich schon für geschlossen hielt.' }
      ],
      interview_live_promo: "Übe dein nächstes Interview, per Text oder Mikrofon",
      remaining: "verbleibend",
      search_close_label: "Schliessen",
      search_open_selection: "Auswahl öffnen",
      premium_analysis_desc: "Tiefgehende Prüfung nach Schweizer Standards",
      salary_median_label: "Geschätzter Medianlohn (Brutto/Jahr)",
      salary_important_notice: "Wichtiger Hinweis",
      salary_disclaimer: "Diese Schätzung basiert auf aktuellen Markttrends und KI-Modellen für den Schweizer Arbeitsmarkt. Faktoren wie spezifische Zertifizierungen, Bonusvereinbarungen und individuelle Benefits können das tatsächliche Angebot beeinflussen.",
      generated_app_title: "Deine generierte Bewerbung",
      copy: "Kopieren",
      tool_how_to_use: "So nutzt du dieses Tool",
      tool_scroll_example: "Runterscrollen für Profi-Beispiel",
      tool_pro_example: "Profi-Beispiel",
      tool_try_example: "Mit Beispiel ausprobieren",
      tool_try_example_sub: "Wir füllen die Felder mit realistischen Schweizer Daten und starten die KI.",
      tool_unlimited_access: "Karriere+-Zugang",
      tool_unlock_desc: "Schalte dieses Tool und alle Premium-Funktionen mit Karriere+ frei.",
      tool_discover_unlimited: "Jetzt Karriere+ entdecken",
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
      interview_complete: "Interview abgeschlossen.",
      interview_question_of: "Frage {current} von 5",
      interview_show_tip: "Insider-Tipp anzeigen",
      interview_feedback_prev: "Feedback letzte Antwort",
      interview_your_answer: "Deine Antwort",
      interview_answer_placeholder: "Schreibe deine Antwort hier...",
      interview_mic_unavailable: "Mikrofon nicht verfügbar in diesem Browser.",
      interview_mic_answer: "Per Mikrofon antworten",
      interview_recording: "Aufnahme läuft...",
      interview_feedback_unavailable: "Feedback konnte nicht geladen werden.",
      interview_evaluating: "Stella bewertet...",
      interview_submit: "Antwort senden → Frage {n}/5",
      interview_show_model: "Musterantwort anzeigen",
      interview_common_mistake: "Häufiger Fehler: ",
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
      market_4_d: "Keine Lösung versteht das Schweizer Zeugnis-System und die Anforderungen der Bewerbungs-Scanner.",
      security_badge: "Datenschutz & Sicherheit",
      security_title: "Deine Daten sind in der Schweiz sicher.",
      security_desc: "Wir nehmen Datenschutz ernst. Deine Dokumente werden nach Schweizer Standards verarbeitet und verschlüsselt gespeichert.",
      security_item_1_t: "Schweizer Server",
      security_item_1_d: "Alle Daten werden ausschliesslich in hochsicheren Rechenzentren in der Schweiz verarbeitet.",
      security_item_2_t: "Ende-zu-Ende Verschlüsselung",
      security_item_2_d: "Deine Lebensläufe und persönlichen Daten sind jederzeit verschlüsselt und für Dritte unzugänglich.",
      security_item_3_t: "DSGVO & DSG Konform",
      security_item_3_d: "Wir halten uns strikt an das Schweizer Datenschutzgesetz und die europäische DSGVO.",
      comparison_badge: "Warum Stellify?",
      comparison_title: "Der erste echte KI-Karriere-Copilot für die Schweiz.",
      comparison_subtitle: "Andere Anbieter machen eines. Stellify macht alles und versteht den Schweizer Markt.",
      comparison_bad_title: "Standard-KI / Andere Anbieter",
      comparison_bad_items: [
        "Leeres Chatfenster, du weisst nicht, was du eingeben sollst",
        "Kein Schweizer Format/Standard (ss vs ß)",
        "Kein Lebenslauf-Check: du weisst nicht, ob dein Lebenslauf überhaupt gelesen wird",
        "Kein Zeugnis-Decoder: Schweizer Code bleibt ein Rätsel",
        "Keine Stellenvorschläge: du bewirbst dich ins Blaue",
        "5 verschiedene Apps, kein roter Faden"
      ],
      comparison_good_title: "Stellify KI-Copilot",
      comparison_good_items: [
        "Geführte Prozesse, Stella weiss was du brauchst",
        "100% Schweizer Standards (Arbeitszeugnis-Code)",
        "Echter Recruiter-Scanner-Test für die Schweiz",
        "Präziser Zeugnis-Decoder (Geheimsprache)",
        "KI-Jobsuche mit Übereinstimmungs-Bewertung",
        "Alles in einer Plattform, perfekt abgestimmt"
      ],
      why_stellify_points: [
        { title: "Schweizer Präzision", desc: "Wir kennen den Schweizer Arbeitsmarkt im Detail. Von der korrekten Rechtschreibung bis zu kantonalen Besonderheiten.", icon: "Target" },
        { title: "Stelle per Link laden", desc: "Füge den Link der Stellenanzeige ein und Stella füllt Firma, Position und Anforderungen automatisch aus.", icon: "Cpu" },
        { title: "Vier Sprachen", desc: "Bewirb dich auf Deutsch, Englisch, Französisch oder Italienisch. Perfekt für den mehrsprachigen Schweizer Markt.", icon: "Globe" },
        { title: "Dein Lebenslauf, automatisch genutzt", desc: "Einmal hochladen, und Stella verwendet deinen Lebenslauf in jeder Bewerbung. Kein doppeltes Eintippen.", icon: "ShieldCheck" },
        { title: "Sechs Designs plus dein eigenes", desc: "Professionelle Layouts nach Schweizer Standard, als PDF und Word. Bereit zum Versand in Minuten.", icon: "Coins" },
        { title: "Datenschutz nach Schweizer Recht", desc: "Deine Daten werden nach Schweizer Datenschutzgesetz und DSGVO verarbeitet, verschlüsselt übertragen und sind jederzeit von dir löschbar.", icon: "Lock" }
      ],
      pricing_free_f: ["3 Bewerbungen zum Ausprobieren", "Bewerbungs-Übersicht & Status", "Speichern & bearbeiten", "Keine Kreditkarte nötig"],
      pricing_pro_f: ["30 KI-Generierungen pro Monat", "Massgeschneiderte Bewerbungen mit KI", "Stelle per Link laden & Lebenslauf nutzen", "Alle Standard-Designs", "PDF- & Word-Export"],
      pricing_ultimate_f: ["Alles aus Pro, plus:", "Volle KI-Power: 100 Generierungen pro Monat", "Alle exklusiven Premium-Designs", "Persönlicher E-Mail-Support", "Für Vielbewerber und Berufswechsel"],
      pricing_cta_free: "Kostenlos starten",
      pricing_cta_pro: "Pro werden",
      pricing_cta_ultimate: "Karriere+ wählen",
      pricing_recommended: "Empfohlen",
      pricing_popular: "Beliebteste Wahl",
      value_title: "Was Stellify dir spart",
      value_items: [
        { icon: "Coins", title: "CHF 200 bis 400", desc: "kostet eine einzige Karriereberatung. Stellify Pro kostet weniger als CHF 20 pro Monat." },
        { icon: "Clock", title: "3 bis 5 Stunden", desc: "sparst du pro Bewerbung. Mehr Zeit für die Stellen, die wirklich zählen." },
        { icon: "Target", title: "Mehr Einladungen", desc: "Eine Bewerbung, die genau zur Stelle passt, fällt positiv auf." },
        { icon: "TrendingUp", title: "Zahlt sich schnell aus", desc: "Schon eine einzige Zusage bringt dir viel mehr, als das Abo kostet." }
      ],
      tools_data: {
        'cv-optimizer': {
          title: 'Lebenslauf-Optimierer',
          desc: 'Analysiert deinen Lebenslauf auf Schweizer Standards & optimiert Formulierungen.', 
          input_label: 'Welche Sektion optimieren?', 
          input_placeholder: 'z.B. Berufserfahrung, Kurzprofil...',
          tutorial: 'Beispiel: Optimierung der Sektion "Berufserfahrung" für einen Projektleiter. Statt "Verantwortlich für Projekte" schreiben wir "Leitung von 5 cross-funktionalen Projekten mit einem Budget von CHF 500k, Steigerung der Effizienz um 20%".'
        },
        'salary-calc': { 
          title: 'KI-Gehaltsrechner CH', 
          desc: 'Branche, Erfahrung, Kanton: KI analysiert Marktlöhne & gibt dir Verhandlungsbasis.',
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
        'bewerbungs-gen': { title: 'Bewerbungs-Generator', desc: 'Design wählen, Daten eingeben, fertige Bewerbung als Dokument.', input_label: '', input_placeholder: '' },
        'cv-gen': { 
          title: 'Bewerbungen', 
          desc: 'Motivationsschreiben & Lebenslauf in 60 Sekunden, live generiert.', 
          input_label: 'Stelleninserat (optional)', 
          input_placeholder: 'Kopiere das Stelleninserat hierher...',
          tutorial: 'Beispiel: Motivationsschreiben für eine Stelle als Marketing Manager bei Nestlé. Fokus auf lokale Marktkenntnisse und messbare Erfolge in der Westschweiz.'
        },
        'ats-sim': { 
          title: 'Bewerbungs-Scanner-Test',
          desc: 'Prüft, ob dein Lebenslauf durch die automatische Bewerbungs-Software der Firmen kommt. Mit Bewertung & Tipps.',
          input_label: 'Stelleninserat (optional)',
          input_placeholder: 'Kopiere das Inserat für eine Übereinstimmungs-Prüfung...',
          tutorial: 'Beispiel: Prüfung deines Lebenslaufs gegen ein Inserat von Roche. Die Analyse zeigt, dass Schlagworte wie "GMP-Compliance" oder "Stakeholder Management" fehlen.'
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
          title: 'Lebenslauf-Analyse',
          desc: 'Genaue Prüfung deines Lebenslaufs: wichtige Wörter, Passung zur Branche und was du noch besser machen kannst.',
          tutorial: 'Beispiel: Dein Lebenslauf hat eine Schweiz-Bereitschaft von 75%. Wir empfehlen die Ergänzung deiner Arbeitsbewilligung (C-Bewilligung) und die GERS-Sprachniveaus.'
        },
        'tracker': {
          title: 'Bewerbungs-Tracker',
          desc: 'Alle Bewerbungen in einer Pipeline, mit Erinnerungen und Statistiken. Dauerhaft gratis.',
          input_label: 'Jobtitel / Firma', 
          input_placeholder: 'z.B. Senior Projektleiter bei Roche',
          tutorial: 'Beispiel: Schlachtplan für UBS. Schritt 1: Networking via LinkedIn. Schritt 2: Lebenslauf-Anpassung auf "Wealth Management". Schritt 3: Vorbereitung auf Verhaltensfragen.'
        },
        'matching': {
          title: 'Passende Stellen finden',
          desc: 'KI findet deine Top 5 passenden Stellenprofile mit Übereinstimmungs-Bewertung.',
          tutorial: 'Beispiel: Basierend auf deinem Profil passen Stellen als "Business Analyst" im Versicherungswesen (Zürich) am besten (92% Übereinstimmung).'
        },
        'interview': { 
          title: 'Interview-Coach', 
          desc: 'KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0-100.', 
          input_label: 'Position für das Interview', 
          input_placeholder: 'z.B. Marketing Manager',
          tutorial: 'Beispiel: Frage "Warum wollen Sie ausgerechnet in der Schweiz arbeiten?". Wir trainieren die Antwort: Fokus auf Stabilität, Innovation und deinen Beitrag zum Schweizer Standort.'
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
          desc: 'Längere Pause gemacht? Wir füllen die Lücke in deinem Lebenslauf professionell und überzeugend.',
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
          desc: 'Profil + Stelleninserat → Anschreiben, Lebenslauf-Highlights & Top-Argumente.',
          input_profile: 'LinkedIn Profil Text', 
          input_profile_placeholder: 'Kopiere dein LinkedIn-Profil ("Über mich" & Erfahrung)...',
          input_ad: 'Stelleninserat',
          input_ad_placeholder: 'Kopiere das Stelleninserat hierher...',
          tutorial: 'Beispiel: Dein LinkedIn-Profil + Inserat von Swisscom. Wir generieren die 3 stärksten Argumente, warum genau du der Match bist.'
        },
        'cv-premium': {
          title: 'Premium Lebenslauf-Rewrite',
          desc: 'Vollständige Optimierung deines Lebenslaufs auf Schweizer Premium-Standard (kein ß, Schweizer Präzision).', 
          input_label: 'Dein aktueller Lebenslauf-Text',
          input_placeholder: 'Kopiere hier deinen gesamten Lebenslauf hierein...',
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
          desc: 'Übe dein Interview für eine spezifische Stelle live. Stella stellt massgeschneiderte Fragen, du antwortest per Text oder Mikrofon.',
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
          desc: 'Massgeschneiderter Leitfaden für deine Gehaltsverhandlung: Marktpositionierung, Argumente und Schweizer 13. Monatslohn-Strategie.',
          badge: 'Pro',
          input_label: 'Aktuelle / Ziel-Vergütung',
          input_placeholder: 'z.B. Ich möchte von 95k auf 115k CHF aufsteigen...',
          tutorial: 'Beispiel: Verhandlung bei der Zurich Insurance. Wir liefern 5 konkrete Argumente, die perfekte Einstiegsforderung und Reaktionen auf typische Einwände.'
        },
      }
    },
    FR: {
      welcome: "Bon retour,",
      welcome_modal_subtitle: "Que veux-tu accomplir aujourd'hui ?",
      welcome_modal_quickstart: "Démarrage rapide",
      welcome_modal_dismiss: "Aller au tableau de bord",
      search_label_tool: "Découvrir les outils & possibilités...",
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
      hero_title: "Ton assistant carrière IA personnel",
      hero_desc: "Colle le lien d'une annonce et reçois en 60 secondes une candidature complète, prête à envoyer. Précis, discret et adapté au marché du travail suisse.",
      cta_free: "Tester gratuitement",
      upload_cv: "Télécharger ton CV",
      update_cv: "Mettre à jour CV (Lebenslauf)",
      cv_info: "Un CV (Curriculum Vitae) est votre parcours professionnel. C'est le document le plus important de votre candidature.",
      dashboard: "Tableau de bord",
      profile_nav: "Compte",
      tracker_nav: "Tracker",
      tracker_page_title: "Suivi des candidatures",
      tracker_page_desc: "Toutes tes candidatures, synchronisées avec le tableau de bord. Trie par glisser-déposer, change de statut ou archive.",
      tracker_page_kicker: "Ton aperçu de pipeline",
      profile_title: "Mon compte",
      profile_desc: "Ton profil, ton CV, ton abonnement et tous les réglages au même endroit.",
      profile_kicker: "Ton espace",
      dashboard_kicker: "Ton espace de travail",
      profile_account: "Compte",
      profile_account_name: "Nom",
      profile_account_email: "E-mail",
      profile_account_plan: "Abonnement actif",
      profile_account_member_since: "Membre depuis",
      profile_apps_overview: "Vue d'ensemble candidatures",
      profile_open_tracker: "Ouvrir le tracker",
      profile_stat_interviews: "Entretiens",
      profile_stat_offers: "Offres",
      profile_stat_rejected: "Refusées",
      profile_recent_apps: "Dernières candidatures",
      profile_activity: "Activité récente",
      profile_open_tools: "Voir les outils",
      profile_photo: "Avatar",
      profile_photo_hint: "Choisis ton avatar. Il apparaît dans la navigation et sur ton profil.",
      profile_avatar_initial: "Ton initiale",
      profile_avatar_pick_hint: "Survole un avatar pour découvrir sa signification.",
      tools: "Outils",
      pricing: "Tarifs",
      login: "Connexion",
      register: "S'inscrire",
      logout: "Déconnexion",
      success_stories: "Histoires de réussite",
      nav_swiss: "Suisse",
      promo_spot: "Spot publicitaire",
      features: "Fonctionnalités",
      how_it_works: "Comment ça marche",
      success_title: "De vraies personnes. De vrais succès.",
      success_desc: "Des milliers de Suisses ont déjà trouvé l'emploi de leurs rêves avec Stellify. Voici quelques-unes de leurs histoires.",
      promo_title: "Découvrez l'avenir de votre carrière.",
      promo_play: "Lire le spot",
      examples_title: "La précision de l'IA en action",
      examples_desc: "Découvrez comment Stellify transforme des textes standards en candidatures suisses premium.",
      ai_notice: "Généré par Stella IA. À vérifier avant utilisation. Responsabilité utilisateur (CGV §9a).",
      settings: "Paramètres",
      profile: "Profil",
      subscription: "Abonnement",
      data_privacy: "Confidentialité",
      tools_title: "Ton outil pour chaque candidature.",
      tools_gen_f1: "Lettre, CV et e-mail en 60 secondes",
      tools_gen_f2: "Standard suisse, adapté à l'annonce",
      tools_gen_f3: "Export PDF et Word, prêt à envoyer",
      tools_tracker_f1: "Toutes tes candidatures dans un pipeline clair",
      tools_tracker_f2: "Rappels de relance au bon moment",
      tools_tracker_f3: "Des statistiques qui montrent ce qui marche",
      tools_cta_title: "Convaincs-toi. Les 3 premières candidatures du générateur sont offertes.",
      tools_cta_sub: "Le suivi des candidatures est entièrement gratuit, pour toujours. Aucun abonnement pour essayer. Ensuite dès CHF 9.90 par mois.",
      tools_cta_btn: "Essayer gratuitement",
      tools_cta_btn2: "Voir les plans",
      tools_badge: "Outils de carrière",
      tools_view_all: "Voir tous les outils",
      market_title: "Pourquoi maintenant. Pourquoi la Suisse.",
      market_badge: "Potentiel du marché",
      pricing_title: "Tarifs simples. Puissance totale.",
      pricing_monthly: "Mensuel",
      pricing_yearly: "Annuel",
      pricing_save: "2 mois gratuits",
      plan_free_subtitle: "Pour découvrir. Sans engagement.",
      plan_pro_subtitle: "Pour étudiants, débutants et candidats occasionnels",
      plan_ultimate_subtitle: "Pour les candidats actifs et reconversions de carrière",
      pricing_gratis_desc: "Commencez gratuitement, sans carte de crédit.",
      pricing_pro_desc: "Le standard pour les candidats ambitieux.",
      pricing_ultimate_desc: "Puissance maximale pour votre carrière.",
      faq_title: "Foire aux questions",
      footer_desc: "Stellify est l'IA de candidature pour la Suisse. Des candidatures professionnelles en quelques minutes.",
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
      tool_no_cv: "Aucun CV téléchargé. L'IA utilise des informations générales. Téléchargez votre CV pour de meilleurs résultats.",
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
      how_desc: "Du CV à la signature du contrat : Stellify vous accompagne à chaque étape de votre candidature.",
      how_1_t: "Télécharger le CV",
      how_1_d: "Télécharge ton CV en PDF. Stella le lit entièrement et utilise tes points forts pour chaque candidature sur mesure, en quelques secondes.",
      how_2_t: "Générer la candidature",
      how_2_d: "Choisis un design, colle l'annonce, c'est prêt : en 60 secondes, lettre, CV et e-mail sont prêts, en PDF ou Word.",
      how_3_t: "Garder la vue d'ensemble",
      how_3_d: "Suis chaque candidature dans le tracker gratuit : pipeline claire, rappels de relance et statistiques qui montrent ce qui marche.",
      faq_badge: "Questions fréquentes",
      faq_subtitle: "Tout ce que vous devez savoir",
      faq_contact: "Encore des questions ?",
      cta_final_title: "Votre carrière mérite votre copilote personnel.",
      cta_final_desc: "Démarrage gratuit. Standard suisse. Sans risque d'abonnement.",
      cta_final_btn: "Démarrer gratuitement maintenant",
      settings_first_name: "Prénom",
      settings_email: "E-mail",
      settings_status: "Statut : Actif",
      settings_change_plan: "Changer de forfait",
      settings_manage_sub: "Gérer et résilier l'abonnement",
      settings_privacy_desc: "Vos données sont traitées conformément à la loi suisse sur la protection des données (LPD) et au RGPD. Vous pouvez demander une copie de vos données ou supprimer votre compte à tout moment.",
      edit: "Modifier",
      save: "Enregistrer",
      cancel: "Annuler",
      promo_presents: "Stellify présente",
      promo_precision: "La précision",
      promo_redefined: "redéfinie.",
      promo_desc: "Dans un marché où chaque détail compte, Stellify est votre avantage injuste. Le premier copilote de carrière IA conçu pour le standard suisse.",
      promo_journey: "Commencez votre voyage",
      faq_1_q: "Mes données sont-elles en sécurité ?",
      faq_1_a: "Vos données sont traitées conformément à la loi suisse sur la protection des données (LPD) et au RGPD, avec transmission chiffrée. Vous pouvez supprimer votre compte et toutes vos données à tout moment. Les détails sur tous les prestataires figurent dans la déclaration de confidentialité.",
      faq_2_q: "Comment fonctionne l'abonnement Stellify ?",
      faq_2_a: "Vous choisissez un plan mensuel ou annuel et bénéficiez immédiatement d'un accès complet. L'abonnement se renouvelle automatiquement pour que votre accès ne soit jamais interrompu. Vous pouvez toutefois le résilier à tout moment en un clic, dans les paramètres du compte sous Gérer l'abonnement. Après la résiliation, vous conservez l'accès complet jusqu'à la fin de la période payée, puis votre compte passe automatiquement au plan gratuit. Un upgrade, par exemple de Pro à Karriere+, est possible immédiatement à tout moment.",
      faq_3_q: "Combien d'utilisations sont incluses dans mon plan ?",
      faq_3_a: "Une génération correspond à une candidature créée avec l'IA. Le plan Gratuit comprend 3 générations, idéal pour découvrir sans engagement. Le plan Pro offre 30 générations par mois, l'import d'offres par lien et tous les designs standard. Karriere+ étend cela à 100 générations par mois et débloque en plus les designs Premium exclusifs. Les limites exactes figurent sur la page Tarifs et dans nos CGV.",
      faq_4_q: "Stellify fonctionne-t-il pour tous les secteurs ?",
      faq_4_a: "Oui, notre IA a été formée sur l'ensemble du marché du travail suisse.",
      faq_5_q: "Quelles langues sont prises en charge ?",
      faq_5_a: "Nous prenons en charge l'allemand, l'anglais, le français et l'italien.",
      faq_6_q: "Pourquoi Stellify plutôt qu'une simple IA de chat ?",
      faq_6_a: "Un chat te donne du texte que tu dois formater, vérifier et assembler toi-même. Stellify livre le résultat fini : tu colles le lien de l'annonce, ton CV et ta photo sont repris automatiquement, et en 60 secondes tu tiens un document prêt à envoyer au standard suisse, en PDF et Word, dans le design de ton choix. En plus, le tracker gratuit garde toutes tes candidatures, échéances et rappels sous contrôle. C'est la différence entre un outil et une fenêtre de texte.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Paramètres",
      nav_logout: "Déconnexion",
      nav_login: "Connexion",
      tool_limit_pro: "Tu as utilisé tes 30 générations ce mois-ci. De nouvelles seront disponibles le 1er du mois prochain. Passe à Karriere+ pour 100 générations par mois plus des fonctions Premium.",
      tool_limit_free: "Cet outil expert nécessite un abonnement Pro ou Karriere+.",
      onboarding_welcome_title: "Bienvenue sur Stellify",
      onboarding_welcome_desc: "Votre copilote IA pour votre carrière en Suisse. Nous vous aidons à tirer le meilleur parti de votre potentiel.",
      onboarding_cv_title: "Téléchargez votre CV",
      onboarding_cv_desc: "Téléchargez votre CV pour que Stella puisse mieux vous comprendre, vous et vos expériences. Vous recevrez ainsi des conseils personnalisés.",
      onboarding_chat_title: "Stella en arrière-plan",
      onboarding_chat_desc: "Stella est l'IA qui travaille en arrière-plan de chaque outil. elle rédige tes candidatures, optimise ton CV et te prépare aux entretiens. Pas besoin de la solliciter, elle est toujours présente.",
      onboarding_tools_title: "Tes deux outils",
      onboarding_tools_desc: "Le Générateur de candidatures crée ta candidature complète en PDF et Word. Le Suivi des candidatures garde toutes tes candidatures en vue.",
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
      dashboard_usage_unlimited: "Utilisation Premium avec 100 générations par mois",
      plan_overview_title: "Aperçu de ton plan",
      plan_what_included: "Inclus dans ton plan",
      plan_what_upgrade: "Avec un upgrade, tu obtiens",
      plan_upgrade_cta: "Améliorer mon plan",
      plan_reset_info: "Limites réinitialisées automatiquement, chaque jour à 0h, chaque mois le 1er.",
      plan_resets_lifetime: "Limites à vie. Upgrade possible à tout moment.",
      plan_free_f1: "3 générations IA pour essayer", plan_free_f2: "Aperçu & statut des candidatures", plan_free_f3: "Enregistrer & modifier les candidatures", plan_free_f4: "Export PDF", plan_free_f5: "Multilingue (DE/FR/IT/EN)",
      plan_pro_f1: "30 générations IA par mois", plan_pro_f2: "Candidatures sur mesure avec l'IA", plan_pro_f3: "Charger l'offre par lien & utiliser le CV", plan_pro_f4: "Tous les designs standard", plan_pro_f5: "Export PDF & Word",
      plan_unlim_f1: "Pleine puissance IA : 100 générations par mois", plan_unlim_f2: "Tous les designs Premium exclusifs", plan_unlim_f3: "Tous les avantages de Pro", plan_unlim_f4: "Support e-mail personnel", plan_unlim_f5: "Pour candidatures fréquentes et reconversions",
      dashboard_usage_desc: "Utilisation des outils",
      dashboard_chat_usage: "Requêtes Stella",
      dashboard_daily_usage: "Limite quotidienne",
      dashboard_reset_monthly: "Réinitialisation le 1er",
      dashboard_reset_daily: "Réinitialisation demain",
      dashboard_stat_free_chat: "{used} / 3 questions Chat",
      dashboard_stat_free_tools: "{used} / 1 utilisation Outil",
      tool_daily_limit_pro: "Vous avez atteint votre limite quotidienne. De nouvelles tentatives seront disponibles demain.",
      tool_limit_search_pro: "Votre limite de recherches en direct (10/mois) est atteinte. Vous en aurez de nouvelles le mois prochain. Passe à Karriere+ pour 300 recherches en direct par mois.",
      tool_limit_search_fair_use: "Vous avez atteint la limite d'utilisation équitable pour les recherches en direct. Veuillez réessayer demain ou contacter le support.",
      dashboard_pro: "Professionnel de carrière",
      dashboard_desc: "Crée une nouvelle candidature en 60 secondes ou garde un œil sur tes candidatures dans le tracker.",
      dashboard_stat_analyses: "Analyses",
      dashboard_stat_cv_status: "Statut CV",
      dashboard_stat_ready: "Prêt",
      dashboard_stat_missing: "Manquant",
      dashboard_stat_applications: "Candidatures",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Karriere+",
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
      tracker_notes_ph: "ex. bonus, voiture de fonction, personne de contact, prochaine étape…",
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
      tracker_search_ph: "Rechercher entreprise, poste, lieu…",
      tracker_view_kanban: "Kanban",
      tracker_view_table: "Tableau",
      tracker_show_archived: "Afficher les archives",
      tracker_hide_archived: "Masquer les archives",
      tracker_archive: "Archiver",
      tracker_unarchive: "Restaurer",
      tracker_no_results: "Aucune candidature trouvée",
      tracker_col_company: "Entreprise",
      tracker_col_position: "Poste",
      tracker_col_status: "Statut",
      tracker_col_location: "Lieu",
      tracker_col_salary: "Salaire",
      tracker_col_updated: "Mis à jour",
      tracker_col_actions: "",
      stat_total: "Total",
      stat_in_process: "encore en cours",
      stat_interviews: "Entretiens",
      stat_offers: "Offres",
      stat_avg_salary: "Salaire moy.",
      stat_rate: "Taux",
      stat_based_on: "sur",
      stat_no_data: "-",
      tracker_reminder: "Relance le",
      tracker_reminder_due: "À faire aujourd'hui",
      tracker_reminder_overdue: "en retard",
      tracker_reminder_short: "Relance",
      tracker_export_csv: "Export CSV",
      transparency_badge: "Transparence",
      transparency_title: "Ce qui est possible. et ce qui ne l'est pas",
      transparency_sub: "Pour que tu saches exactement à quoi t'attendre. Toutes les limites concernent les requêtes IA (outils + chat).",
      tr_can_title: "Ce que tu peux faire", tr_cannot_title: "Ce qui n'est pas possible",
      tr_can_1: "Essayer tous les outils sur n'importe quel plan",
      tr_can_2: "Créer des candidatures, les sauvegarder et exporter en PDF ou Word",
      tr_can_3: "Travailler en allemand, français, italien et anglais",
      tr_can_4: "Utiliser les fourchettes salariales, normes et contexte du marché suisse",
      tr_can_5: "Changer de plan, résilier ou suspendre à tout moment. sans engagement",
      tr_cannot_1: "Stellify ne remplace pas un avocat ou un fiscaliste. vérifie toujours le contenu IA",
      tr_cannot_2: "Aucune garantie d'offre d'emploi. nous sommes un outil, pas un intermédiaire",
      tr_cannot_3: "Pas de traitement de données sensibles (santé, religion, aide sociale, …)",
      tr_cannot_4: "Pas de candidatures de masse ni d'automatisation contre nos CGV",
      tr_limits_title: "Limites IA concrètes par plan",
      tr_lim_free_label: "Gratuit", tr_lim_free_v: "3 générations à vie · tous les outils à essayer",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "30 générations par mois · tous les outils essentiels · stockage des documents",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "100 générations par mois · ATS Premium · coach d'entretien avancé · modèles Premium",
      tr_reset_info: "Les limites mensuelles de générations sont réinitialisées le 1er du mois (Europe/Zurich).",
      tr_fair_use: "Stellify applique une protection 'fair use' de max. 15 (Pro) ou 30 (Karriere+) requêtes par minute pour éviter les abus.",
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
      stella_name: "Stella, assistante IA",
      stella_online: "En ligne, prête à aider",
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
      tool_cv_optional_label: "CV (optionnel, si aucun n'est téléchargé)",
      tool_cv_optional_ph: "Colle ton CV ici ou télécharge un fichier, ou laisse vide pour des conseils généraux.",
      tool_load_file: "Charger fichier",
      salary_security_notice: "Vos données sont en sécurité : Stellify ne stocke aucune donnée salariale personnelle. Le calcul est effectué de manière anonyme selon les normes suisses de protection des données.",
      swiss_standard_notice_title: "Excellence de Carrière Suisse",
      swiss_standard_notice_text: "Précisément aligné sur le marché du travail suisse, de la langue à la structure de candidature.",
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
      hero_accent: "assistant carrière IA",
      badge_new: "NOUVEAU",
      tools_section_badge: "Outils IA carrière",
      tools_section_title: "Tout ce dont vous avez besoin pour votre carrière",
      tools_section_desc: "De l'analyse CV à la négociation salariale : Stellify vous guide à chaque étape.",
      tools_section_cta: "Voir tous les outils →",
      testimonial_verified: "Vérifié",
      cv_banner_title: "Téléchargez votre CV pour des analyses IA personnalisées",
      cv_banner_desc: "PDF ou Word · Gratuit · Tous les outils adaptés à votre CV",
      cv_upload_hint: "PDF ou Word · Analyse gratuite et sécurisée",
      cv_banner_btn: "Télécharger le CV",
      cv_stat_upload: "Télécharger",
      testimonials: [
        { name: 'Lukas B.', role: 'Polyméchanicien CFC', city: 'Winterthur', quote: "Après mon apprentissage, je ne savais pas exactement comment mettre en valeur mon expérience pratique dans mon CV. Stellify m'a aidé à décrire mes projets avec précision. J'ai maintenant un excellent emploi dans une grande entreprise industrielle." },
        { name: 'Sarah W.', role: 'Spécialiste RH', city: 'Zurich', quote: "Je vois des centaines de candidatures chaque jour. Le décodeur de certificats de Stellify est terriblement précis. Il m'aide non seulement dans ma vie privée, mais me donne aussi une nouvelle perspective sur le marché du travail suisse." },
        { name: 'Hans-Peter K.', role: 'Chef de logistique', city: 'Olten', quote: "Recommencer à plus de 50 ans était un défi. Stellify a traduit mes nombreuses années d'expérience en un langage moderne et optimisé. Cela m'a ouvert des portes que je croyais déjà fermées." }
      ],
      interview_live_promo: "Entraînez-vous, par texte ou micro",
      remaining: "restants",
      search_close_label: "Fermer",
      search_open_selection: "Ouvrir la sélection",
      premium_analysis_desc: "Examen approfondi selon les normes suisses",
      salary_median_label: "Salaire médian estimé (Brut/An)",
      salary_important_notice: "Remarque importante",
      salary_disclaimer: "Cette estimation est basée sur les tendances actuelles du marché et les modèles IA pour le marché du travail suisse. Des facteurs tels que des certifications spécifiques, des accords de bonus et des avantages individuels peuvent influencer l'offre réelle.",
      generated_app_title: "Votre candidature générée",
      copy: "Copier",
      tool_how_to_use: "Comment utiliser cet outil",
      tool_scroll_example: "Faites défiler pour l'exemple professionnel",
      tool_pro_example: "Exemple professionnel",
      tool_try_example: "Essayer avec un exemple",
      tool_try_example_sub: "Nous remplissons les champs avec des données suisses réalistes et lançons l'IA.",
      tool_unlimited_access: "Accès Karriere+",
      tool_unlock_desc: "Débloque cet outil et toutes les fonctions premium avec Karriere+.",
      tool_discover_unlimited: "Découvrir Karriere+ maintenant",
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
      interview_complete: "Entretien terminé.",
      interview_question_of: "Question {current} sur 5",
      interview_show_tip: "Voir le conseil",
      interview_feedback_prev: "Feedback dernière réponse",
      interview_your_answer: "Votre réponse",
      interview_answer_placeholder: "Écrivez votre réponse ici...",
      interview_mic_unavailable: "Microphone non disponible dans ce navigateur.",
      interview_mic_answer: "Répondre par microphone",
      interview_recording: "Enregistrement...",
      interview_feedback_unavailable: "Feedback indisponible.",
      interview_evaluating: "Stella évalue...",
      interview_submit: "Envoyer → Question {n}/5",
      interview_show_model: "Voir la réponse modèle",
      interview_common_mistake: "Erreur courante : ",
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
      comparison_subtitle: "D'autres outils font une chose. Stellify fait tout et comprend le marché suisse.",
      comparison_bad_title: "IA standard / Autres outils",
      comparison_bad_items: [
        "Fenêtre de chat vide, vous ne savez pas quoi saisir",
        "Pas de format/standard suisse",
        "Pas de check ATS : vous ne savez pas si votre CV est lu",
        "Pas de décodeur de certificats : le code suisse reste un mystère",
        "Pas de job-matching : vous postulez au hasard",
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
        { title: "Précision suisse", desc: "Nous connaissons le marché du travail suisse en détail. De l'orthographe correcte aux spécificités cantonales.", icon: "Target" },
        { title: "Charger l'offre par lien", desc: "Colle le lien de l'annonce et Stella remplit automatiquement l'entreprise, le poste et les exigences.", icon: "Cpu" },
        { title: "Quatre langues", desc: "Postule en allemand, anglais, français ou italien. Parfait pour le marché suisse multilingue.", icon: "Globe" },
        { title: "Ton CV, utilisé automatiquement", desc: "Télécharge-le une fois et Stella l'utilise dans chaque candidature. Plus de double saisie.", icon: "ShieldCheck" },
        { title: "Six designs plus le tien", desc: "Des mises en page professionnelles au standard suisse, en PDF et Word. Prêt à envoyer en quelques minutes.", icon: "Coins" },
        { title: "Protection des données selon le droit suisse", desc: "Vos données sont traitées selon la LPD suisse et le RGPD, transmises de manière chiffrée et supprimables par vous à tout moment.", icon: "Lock" }
      ],
      pricing_free_f: ["3 candidatures à essayer", "Aperçu & statut des candidatures", "Enregistrer & modifier", "Sans carte de crédit"],
      pricing_pro_f: ["30 générations IA par mois", "Candidatures sur mesure avec l'IA", "Charger l'offre par lien & utiliser le CV", "Tous les designs standard", "Export PDF & Word"],
      pricing_ultimate_f: ["Tout de Pro, plus :", "Pleine puissance IA : 100 générations par mois", "Tous les designs Premium exclusifs", "Support e-mail personnel", "Pour candidatures fréquentes et reconversions"],
      pricing_cta_free: "Démarrer gratuitement",
      pricing_cta_pro: "Devenir Pro",
      pricing_cta_ultimate: "Choisir Karriere+",
      pricing_recommended: "Recommandé",
      pricing_popular: "Choix le plus populaire",
      value_title: "Ce que Stellify te fait économiser",
      value_items: [
        { icon: "Coins", title: "CHF 200 à 400", desc: "coûte une seule séance de coaching. Stellify Pro coûte moins de CHF 20 par mois." },
        { icon: "Clock", title: "3 à 5 heures", desc: "gagnées par candidature. Plus de temps pour les postes qui comptent vraiment." },
        { icon: "Target", title: "Plus d'invitations", desc: "Une candidature qui correspond exactement au poste se démarque." },
        { icon: "TrendingUp", title: "Vite gagnant", desc: "Une seule réponse positive te rapporte bien plus que le prix de l'abonnement." }
      ],
      tools_data: {
        'cv-optimizer': { title: 'Optimiseur de CV', desc: 'Analyse votre CV selon les standards suisses et optimise la formulation.', input_label: 'Quelle section optimiser ?', input_placeholder: 'ex: Expérience professionnelle...' },
        'salary-calc': { title: 'Calculateur de salaire IA CH', desc: 'Secteur, expérience, canton : l\'IA analyse les salaires du marché.', input_job: 'Titre du poste', input_job_placeholder: 'ex: Ingénieur Logiciel', input_industry: 'Secteur', input_industry_placeholder: 'ex: Banque', input_exp: 'Années d\'expérience', input_exp_placeholder: 'ex: 5', input_canton: 'Canton', input_canton_placeholder: 'ex: GE' },
        'bewerbungs-gen': { title: 'Générateur de candidature', desc: 'Choisis un design, saisis tes données, obtiens un document fini.', input_label: '', input_placeholder: '' },
        'cv-gen': { title: 'Candidatures', desc: 'Lettre de motivation & CV en 60 secondes, générés en direct.', input_label: 'Annonce d\'emploi (optionnel)', input_placeholder: 'Copiez l\'annonce ici...' },
        'ats-sim': { title: 'Simulation ATS', desc: 'Vérifie si votre CV passe les logiciels de recrutement.', input_label: 'Annonce d\'emploi (optionnel)', input_placeholder: 'Copiez l\'annonce...' },
        'zeugnis': { title: 'Décodeur de certificat Premium', desc: 'Décode le code secret des certificats de travail suisses. Identifie les messages négatifs cachés et évalue votre position sur le marché.', input_label: 'Texte du certificat', input_placeholder: 'Copiez le texte ici...' },
        'skill-gap': { title: 'Analyse Skill-Gap', desc: 'Comparez votre profil avec le job de vos rêves.', input_label: 'Poste cible', input_placeholder: 'ex: Senior Data Scientist' },
        'cv-analysis': { title: 'Analyse CV', desc: 'Analyse approfondie de votre CV pour les mots-clés, l\'adéquation au secteur et le potentiel d\'amélioration.' },
        'tracker': { title: 'Suivi des candidatures', desc: 'Toutes tes candidatures dans un pipeline, avec rappels et statistiques. Gratuit pour toujours.', input_label: 'Titre du poste / Entreprise', input_placeholder: 'ex. Chef de projet senior chez Roche' },
        'matching': { title: 'Job Matching', desc: 'L\'IA trouve vos 5 profils de postes correspondants.' },
        'interview': { title: 'Coach d\'entretien', desc: 'L\'IA simule 5 questions réelles et évalue vos réponses.', input_label: 'Poste pour l\'entretien', input_placeholder: 'ex: Responsable Marketing' },
        'berufseinstieg': { title: 'Guide premier emploi', desc: 'Fraîchement diplômé ? Nous vous aidons à trouver votre premier "vrai" job.', input_label: 'Quel diplôme avez-vous ?', input_placeholder: 'ex: CFC Informatique...' },
        'erfahrung-plus': { title: 'Expérience-Plus', desc: 'Outil spécial pour les 50+. Valorisez votre expérience.', input_label: 'Votre plus grande force', input_placeholder: 'ex: 20 ans d\'expérience de direction dans la construction' },
        'wiedereinstieg': { title: 'Check retour à l\'emploi', desc: 'Longue pause ? Nous comblons la lacune de manière convaincante.', input_label: 'Raison de la pause', input_placeholder: 'ex: Congé parental...' },
        'karriere-checkup': { title: 'Check-up carrière', desc: 'Vous avez un job mais voulez plus ? Testez votre potentiel.', input_label: 'Poste actuel', input_placeholder: 'ex: Chef de projet' },
        'linkedin-job': { title: 'LinkedIn → Candidature', desc: 'Profil + Annonce → Lettre de motivation & arguments.', input_profile: 'Texte du profil LinkedIn', input_profile_placeholder: 'Copiez votre profil LinkedIn (À propos & Expérience)...', input_ad: 'Annonce d\'emploi', input_ad_placeholder: 'Copiez l\'annonce ici...' },
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
          desc: 'Entraînez-vous pour un entretien spécifique. Stella pose des questions ciblées, répondez par texte ou microphone.',
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
          desc: 'Guide sur mesure pour votre négociation salariale : positionnement marché, arguments et stratégie du 13e salaire suisse.',
          badge: 'Pro',
          input_label: 'Salaire actuel / cible',
          input_placeholder: 'ex: Je souhaite passer de 95k à 115k CHF...',
          tutorial: 'Exemple : Négociation chez Zurich Insurance. Nous fournissons 5 arguments concrets, la demande initiale idéale et les réponses aux objections typiques.'
        },
      }
    },
    IT: {
      welcome: "Bentornato,",
      welcome_modal_subtitle: "Cosa vuoi raggiungere oggi?",
      welcome_modal_quickstart: "Avvio rapido",
      welcome_modal_dismiss: "Vai alla dashboard",
      search_label_tool: "Scopri strumenti & possibilità...",
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
      hero_title: "Il tuo assistente di carriera IA personale",
      hero_desc: "Incolla il link di un annuncio e ricevi in 60 secondi una candidatura completa, pronta per l'invio. Preciso, discreto e calibrato sul mercato del lavoro svizzero.",
      cta_free: "Prova gratuitamente",
      upload_cv: "Carica il tuo CV",
      update_cv: "Aggiorna CV (Lebenslauf)",
      cv_info: "Un CV (Curriculum Vitae) è la tua storia professionale. È il documento più importante della tua candidatura.",
      dashboard: "Dashboard",
      profile_nav: "Account",
      tracker_nav: "Tracker",
      tracker_page_title: "Tracker candidature",
      tracker_page_desc: "Tutte le tue candidature, sincronizzate con la dashboard. Riordina con trascinamento, cambia stato o archivia.",
      tracker_page_kicker: "La tua panoramica della pipeline",
      profile_title: "Il mio account",
      profile_desc: "Il tuo profilo, il tuo CV, il tuo abbonamento e tutte le impostazioni in un unico posto.",
      profile_kicker: "Il tuo spazio",
      dashboard_kicker: "La tua area di lavoro",
      profile_account: "Account",
      profile_account_name: "Nome",
      profile_account_email: "E-mail",
      profile_account_plan: "Piano attivo",
      profile_account_member_since: "Membro dal",
      profile_apps_overview: "Panoramica candidature",
      profile_open_tracker: "Apri il tracker",
      profile_stat_interviews: "Colloqui",
      profile_stat_offers: "Offerte",
      profile_stat_rejected: "Rifiutate",
      profile_recent_apps: "Ultime candidature",
      profile_activity: "Attività recente",
      profile_open_tools: "Vai agli strumenti",
      profile_photo: "Avatar",
      profile_photo_hint: "Scegli il tuo avatar. Appare nella navigazione e nel tuo profilo.",
      profile_avatar_initial: "La tua iniziale",
      profile_avatar_pick_hint: "Passa sopra un avatar per scoprirne il significato.",
      tools: "Strumenti",
      pricing: "Prezzi",
      login: "Accedi",
      register: "Registrati",
      logout: "Disconnetti",
      success_stories: "Storie di successo",
      nav_swiss: "Svizzera",
      promo_spot: "Spot pubblicitario",
      features: "Caratteristiche",
      how_it_works: "Come funziona",
      success_title: "Persone reali. Successi reali.",
      success_desc: "Migliaia di svizzeri hanno già trovato il lavoro dei loro sogni con Stellify. Ecco alcune delle loro storie.",
      promo_title: "Scopri il futuro della tua carriera.",
      promo_play: "Riproduci spot",
      examples_title: "Precisione AI in azione",
      examples_desc: "Guarda come Stellify trasforma testi standard in candidature svizzere premium.",
      ai_notice: "Generato da Stella AI. Verificare prima dell'uso. Responsabilità utente (Condizioni §9a).",
      settings: "Impostazioni",
      profile: "Profilo",
      subscription: "Abbonamento",
      data_privacy: "Privacy",
      tools_title: "Lo strumento per ogni candidatura.",
      tools_gen_f1: "Lettera, CV ed e-mail in 60 secondi",
      tools_gen_f2: "Standard svizzero, su misura per l'annuncio",
      tools_gen_f3: "Export PDF e Word, pronto per l'invio",
      tools_tracker_f1: "Tutte le candidature in una pipeline chiara",
      tools_tracker_f2: "Promemoria per il follow-up al momento giusto",
      tools_tracker_f3: "Statistiche che mostrano cosa funziona",
      tools_cta_title: "Convinciti. Le prime 3 candidature del generatore sono in regalo.",
      tools_cta_sub: "Il tracker delle candidature è completamente gratuito, per sempre. Nessun abbonamento per provare. Poi da CHF 9.90 al mese.",
      tools_cta_btn: "Prova gratis",
      tools_cta_btn2: "Vedi i piani",
      tools_badge: "Strumenti di carriera",
      tools_view_all: "Vedi tutti gli strumenti",
      market_title: "Perché ora. Perché la Svizzera.",
      market_badge: "Potenziale di mercato",
      pricing_title: "Prezzi semplici. Massima potenza.",
      pricing_monthly: "Mensile",
      pricing_yearly: "Annuale",
      pricing_save: "2 mesi gratis",
      plan_free_subtitle: "Per conoscere la piattaforma. Senza impegno.",
      plan_pro_subtitle: "Per studenti, neolaureati e candidati occasionali",
      plan_ultimate_subtitle: "Per candidati attivi e cambi di carriera",
      pricing_gratis_desc: "Inizia gratuitamente, senza carta di credito.",
      pricing_pro_desc: "Lo standard per i candidati ambiziosi.",
      pricing_ultimate_desc: "Massima potenza per la tua carriera.",
      faq_title: "Domande frequenti",
      footer_desc: "Stellify è l'IA per le candidature in Svizzera. Candidature professionali in pochi minuti.",
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
      tool_no_cv: "Nessun CV caricato. L'IA utilizza informazioni generali. Carica il tuo CV per risultati migliori.",
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
      how_desc: "Dal CV alla firma del contratto: Stellify ti accompagna in ogni fase della tua candidatura.",
      how_1_t: "Carica il CV",
      how_1_d: "Carica il tuo CV in PDF. Stella lo legge completamente e usa i tuoi punti di forza per ogni candidatura su misura, in pochi secondi.",
      how_2_t: "Genera la candidatura",
      how_2_d: "Scegli un design, incolla l'annuncio, fatto: in 60 secondi lettera, CV ed e-mail sono pronti, in PDF o Word.",
      how_3_t: "Mantieni la visione d'insieme",
      how_3_d: "Segui ogni candidatura nel tracker gratuito: pipeline chiara, promemoria per il follow-up e statistiche che mostrano cosa funziona.",
      faq_badge: "Domande frequenti",
      faq_subtitle: "Tutto quello che devi sapere",
      faq_contact: "Altre domande?",
      cta_final_title: "La tua carriera merita il tuo copilota personale.",
      cta_final_desc: "Inizia gratuitamente. Standard svizzero. Nessun rischio di abbonamento.",
      cta_final_btn: "Inizia ora gratuitamente",
      settings_first_name: "Nome",
      settings_email: "E-mail",
      settings_status: "Stato: Attivo",
      settings_change_plan: "Cambia piano",
      settings_manage_sub: "Gestisci e disdici l'abbonamento",
      settings_privacy_desc: "I tuoi dati sono trattati secondo la legge svizzera sulla protezione dei dati (LPD) e il GDPR. Puoi richiedere una copia dei tuoi dati o eliminare il tuo account in qualsiasi momento.",
      edit: "Modifica",
      save: "Salva",
      cancel: "Annulla",
      promo_presents: "Stellify presenta",
      promo_precision: "Precisione",
      promo_redefined: "ridefinita.",
      promo_desc: "In un mercato dove ogni dettaglio conta, Stellify è il tuo vantaggio sleale. Il primo copilota di carriera AI costruito per lo standard svizzero.",
      promo_journey: "Inizia il tuo viaggio",
      faq_1_q: "Quanto sono sicuri i miei dati?",
      faq_1_a: "I tuoi dati sono trattati secondo la legge svizzera sulla protezione dei dati (LPD) e il GDPR, con trasmissione crittografata. Puoi eliminare il tuo account e tutti i dati in qualsiasi momento. I dettagli su tutti i fornitori sono nella dichiarazione sulla privacy.",
      faq_2_q: "Come funziona l'abbonamento Stellify?",
      faq_2_a: "Scegli un piano mensile o annuale e ottieni subito l'accesso completo. L'abbonamento si rinnova automaticamente, così il tuo accesso non si interrompe mai. Puoi però disdirlo in qualsiasi momento con un clic, nelle impostazioni del conto sotto Gestisci abbonamento. Dopo la disdetta mantieni l'accesso completo fino alla fine del periodo pagato, poi il tuo account passa automaticamente al piano gratuito. Un upgrade, ad esempio da Pro a Karriere+, è possibile subito in qualsiasi momento.",
      faq_3_q: "Quante utilizzazioni sono incluse nel mio piano?",
      faq_3_a: "Una generazione corrisponde a una candidatura creata con l'IA. Il piano Gratuito include 3 generazioni, ideale per provare senza impegno. Il piano Pro offre 30 generazioni al mese, l'import di annunci da link e tutti i design standard. Karriere+ estende a 100 generazioni al mese e sblocca inoltre i design Premium esclusivi. I limiti esatti sono indicati sulla pagina Prezzi e nelle nostre Condizioni.",
      faq_4_q: "Stellify funziona per tutti i settori?",
      faq_4_a: "Sì, la nostra IA è stata addestrata su tutto il mercato del lavoro svizzero.",
      faq_5_q: "Quali lingue sono supportate?",
      faq_5_a: "Supportiamo tedesco, inglese, francese e italiano.",
      faq_6_q: "Perché Stellify invece di una semplice chat IA?",
      faq_6_a: "Una chat ti dà testo che devi formattare, controllare e assemblare da solo. Stellify consegna il risultato finito: incolli il link dell'annuncio, il tuo CV e la tua foto vengono ripresi automaticamente, e in 60 secondi hai un documento pronto per l'invio secondo lo standard svizzero, in PDF e Word, nel design che preferisci. In più il tracker gratuito tiene sotto controllo tutte le candidature, le scadenze e i promemoria. Questa è la differenza tra uno strumento e una finestra di testo.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Impostazioni",
      nav_logout: "Disconnetti",
      nav_login: "Accedi",
      tool_limit_pro: "Hai utilizzato le tue 30 generazioni per questo mese. Il 1° del prossimo mese avrai nuovi tentativi. Passa a Karriere+ per 100 generazioni al mese più funzioni Premium.",
      tool_limit_free: "Questo strumento esperto richiede un abbonamento Pro o Karriere+.",
      onboarding_welcome_title: "Benvenuti su Stellify",
      onboarding_welcome_desc: "Il tuo copilota AI per la tua carriera in Svizzera. Ti aiutiamo a sfruttare al meglio il tuo potenziale.",
      onboarding_cv_title: "Carica il tuo CV",
      onboarding_cv_desc: "Carica il tuo curriculum in modo che Stella possa capire meglio te e le tue esperienze. Riceverai così consigli personalizzati.",
      onboarding_chat_title: "Stella in background",
      onboarding_chat_desc: "Stella è l'IA che lavora in background in ogni strumento. scrive le tue candidature, ottimizza il tuo CV e ti prepara ai colloqui. Non devi chiederle nulla, è sempre presente.",
      onboarding_tools_title: "I tuoi due strumenti",
      onboarding_tools_desc: "Il Generatore di candidature crea la tua candidatura completa in PDF e Word. Il Tracker candidature tiene d'occhio tutte le tue candidature.",
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
      dashboard_usage_unlimited: "Utilizzo Premium con 100 generazioni al mese",
      plan_overview_title: "Il tuo piano in sintesi",
      plan_what_included: "Incluso nel tuo piano",
      plan_what_upgrade: "Con un upgrade ottieni",
      plan_upgrade_cta: "Aggiorna piano",
      plan_reset_info: "Limiti reimpostati automaticamente, ogni giorno alle 0:00, ogni mese il 1°.",
      plan_resets_lifetime: "Limiti a vita. Upgrade possibile in qualsiasi momento.",
      plan_free_f1: "3 generazioni IA da provare", plan_free_f2: "Panoramica & stato delle candidature", plan_free_f3: "Salva & modifica le candidature", plan_free_f4: "Esportazione PDF", plan_free_f5: "Multilingua (DE/FR/IT/EN)",
      plan_pro_f1: "30 generazioni IA al mese", plan_pro_f2: "Candidature su misura con l'IA", plan_pro_f3: "Carica l'annuncio da link & usa il CV", plan_pro_f4: "Tutti i design standard", plan_pro_f5: "Esportazione PDF & Word",
      plan_unlim_f1: "Piena potenza IA: 100 generazioni al mese", plan_unlim_f2: "Tutti i design Premium esclusivi", plan_unlim_f3: "Tutti i vantaggi di Pro", plan_unlim_f4: "Supporto e-mail personale", plan_unlim_f5: "Per chi si candida spesso o cambia carriera",
      dashboard_usage_desc: "Utilizzo strumenti",
      dashboard_chat_usage: "Richieste Stella",
      dashboard_daily_usage: "Limite giornaliero",
      dashboard_reset_monthly: "Reset il 1° del mese",
      dashboard_reset_daily: "Reset domani",
      dashboard_stat_free_chat: "{used} / 3 domande Chat",
      dashboard_stat_free_tools: "{used} / 1 utilizzo Strumento",
      tool_daily_limit_pro: "Hai raggiunto il tuo limite giornaliero. Nuovi tentativi saranno disponibili domani.",
      tool_limit_search_pro: "Il tuo limite di ricerche dal vivo (10/mese) è raggiunto. Il prossimo mese avrai nuove ricerche libere. Passa a Karriere+ per 300 ricerche dal vivo al mese.",
      tool_limit_search_fair_use: "Hai raggiunto il limite di utilizzo corretto per le ricerche dal vivo. Riprova domani o contatta il supporto.",
      dashboard_pro: "Professionista della carriera",
      dashboard_desc: "Crea una nuova candidatura in 60 secondi o tieni d'occhio le tue candidature nel tracker.",
      dashboard_stat_analyses: "Analisi",
      dashboard_stat_cv_status: "Stato CV",
      dashboard_stat_ready: "Pronto",
      dashboard_stat_missing: "Mancante",
      dashboard_stat_applications: "Candidature",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Karriere+",
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
      tracker_notes_ph: "es. bonus, auto aziendale, persona di contatto, prossimo passo…",
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
      tracker_search_ph: "Cerca azienda, posizione, luogo…",
      tracker_view_kanban: "Kanban",
      tracker_view_table: "Tabella",
      tracker_show_archived: "Mostra archivio",
      tracker_hide_archived: "Nascondi archivio",
      tracker_archive: "Archivia",
      tracker_unarchive: "Ripristina",
      tracker_no_results: "Nessuna candidatura trovata",
      tracker_col_company: "Azienda",
      tracker_col_position: "Posizione",
      tracker_col_status: "Stato",
      tracker_col_location: "Luogo",
      tracker_col_salary: "Stipendio",
      tracker_col_updated: "Aggiornato",
      tracker_col_actions: "",
      stat_total: "Totale",
      stat_in_process: "ancora in corso",
      stat_interviews: "Colloqui",
      stat_offers: "Offerte",
      stat_avg_salary: "Stipendio medio",
      stat_rate: "Tasso",
      stat_based_on: "su",
      stat_no_data: "-",
      tracker_reminder: "Ricontatta il",
      tracker_reminder_due: "Da fare oggi",
      tracker_reminder_overdue: "scaduto",
      tracker_reminder_short: "Ricontatta",
      tracker_export_csv: "Esporta CSV",
      transparency_badge: "Trasparenza",
      transparency_title: "Cosa è possibile. e cosa no",
      transparency_sub: "Per sapere esattamente cosa aspettarsi. Tutti i limiti riguardano le richieste IA (strumenti + chat).",
      tr_can_title: "Cosa puoi fare", tr_cannot_title: "Cosa non è possibile",
      tr_can_1: "Provare tutti gli strumenti su qualsiasi piano",
      tr_can_2: "Creare candidature, salvarle ed esportarle in PDF o Word",
      tr_can_3: "Lavorare in tedesco, francese, italiano e inglese",
      tr_can_4: "Usare fasce salariali, standard e contesto del mercato svizzero",
      tr_can_5: "Cambiare piano, disdire o sospendere in qualsiasi momento. nessun vincolo",
      tr_cannot_1: "Stellify non sostituisce avvocato o commercialista. verifica sempre i contenuti IA",
      tr_cannot_2: "Nessuna garanzia di offerte di lavoro. siamo uno strumento, non un intermediario",
      tr_cannot_3: "Nessun trattamento di dati sensibili (salute, religione, assistenza sociale)",
      tr_cannot_4: "Nessuna candidatura di massa o automazione contro le nostre condizioni",
      tr_limits_title: "Limiti IA concreti per piano",
      tr_lim_free_label: "Gratuito", tr_lim_free_v: "3 generazioni a vita · tutti gli strumenti da provare",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "30 generazioni al mese · tutti gli strumenti essenziali · archiviazione documenti",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "100 generazioni al mese · ATS Premium · coach colloqui avanzato · modelli Premium",
      tr_reset_info: "I limiti mensili di generazioni vengono reimpostati il 1° del mese (Europe/Zurich).",
      tr_fair_use: "Stellify applica una protezione 'fair use' di max. 15 (Pro) o 30 (Karriere+) richieste al minuto per evitare abusi.",
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
      stella_name: "Stella, assistente IA",
      stella_online: "Online, pronta ad aiutare",
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
      tool_cv_optional_label: "CV (opzionale, se non caricato)",
      tool_cv_optional_ph: "Incolla il tuo CV qui o carica un file, o lascia vuoto per consigli generali.",
      tool_load_file: "Carica file",
      salary_security_notice: "I tuoi dati sono al sicuro: Stellify non memorizza alcun dato salariale personale. Il calcolo viene eseguito in modo anonimo secondo gli standard svizzeri di protezione dei dati.",
      swiss_standard_notice_title: "Eccellenza della Carriera Svizzera",
      swiss_standard_notice_text: "Precisamente allineato con il mercato del lavoro svizzero, dalla lingua alla struttura della candidatura.",
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
      hero_accent: "assistente di carriera IA",
      badge_new: "NUOVO",
      tools_section_badge: "Strumenti IA carriera",
      tools_section_title: "Tutto ciò di cui hai bisogno per la tua carriera",
      tools_section_desc: "Dall'analisi del CV alla negoziazione salariale: Stellify ti guida in ogni fase.",
      tools_section_cta: "Vedi tutti gli strumenti →",
      testimonial_verified: "Verificato",
      cv_banner_title: "Carica il tuo CV per analisi AI personalizzate",
      cv_banner_desc: "PDF o Word · Gratuito · Tutti gli strumenti adattati al tuo CV",
      cv_upload_hint: "PDF o Word · Analisi gratuita e sicura",
      cv_banner_btn: "Carica CV",
      cv_stat_upload: "Carica",
      testimonials: [
        { name: 'Lukas B.', role: 'Polimeccanico AFC', city: 'Winterthur', quote: "Dopo il mio tirocinio, non sapevo esattamente come valorizzare la mia esperienza pratica nel CV. Stellify mi ha aiutato a descrivere i miei progetti con precisione. Ora ho un ottimo lavoro in una grande azienda industriale." },
        { name: 'Sarah W.', role: 'Specialista HR', city: 'Zurigo', quote: "Vedo centinaia di candidature ogni giorno. Il decodificatore di certificati di Stellify è terribilmente preciso. Non solo mi aiuta nella vita privata, ma mi dà anche una nuova prospettiva sul mercato del lavoro svizzero." },
        { name: 'Hans-Peter K.', role: 'Responsabile logistica', city: 'Olten', quote: "Ricominciare a oltre 50 anni era una sfida. Stellify ha tradotto i miei tanti anni di esperienza in un linguaggio moderno e ottimizzato per l'ATS. Questo mi ha aperto porte che pensavo già chiuse." }
      ],
      interview_live_promo: "Pratica il tuo colloquio, testo o microfono",
      remaining: "rimanenti",
      search_close_label: "Chiudi",
      search_open_selection: "Apri selezione",
      premium_analysis_desc: "Esame approfondito secondo gli standard svizzeri",
      salary_median_label: "Stipendio mediano stimato (Lordo/Anno)",
      salary_important_notice: "Nota importante",
      salary_disclaimer: "Questa stima è basata sulle tendenze attuali del mercato e sui modelli IA per il mercato del lavoro svizzero. Fattori come certificazioni specifiche, accordi sui bonus e benefici individuali possono influenzare l'offerta reale.",
      generated_app_title: "La tua candidatura generata",
      copy: "Copia",
      tool_how_to_use: "Come usare questo strumento",
      tool_scroll_example: "Scorri verso il basso per l'esempio professionale",
      tool_pro_example: "Esempio professionale",
      tool_try_example: "Prova con un esempio",
      tool_try_example_sub: "Compiliamo i campi con dati svizzeri realistici e avviamo l'IA.",
      tool_unlimited_access: "Accesso Karriere+",
      tool_unlock_desc: "Sblocca questo strumento e tutte le funzioni premium con Karriere+.",
      tool_discover_unlimited: "Scopri Karriere+ ora",
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
      interview_complete: "Colloquio completato.",
      interview_question_of: "Domanda {current} di 5",
      interview_show_tip: "Mostra il suggerimento",
      interview_feedback_prev: "Feedback ultima risposta",
      interview_your_answer: "La tua risposta",
      interview_answer_placeholder: "Scrivi la tua risposta qui...",
      interview_mic_unavailable: "Microfono non disponibile in questo browser.",
      interview_mic_answer: "Rispondi tramite microfono",
      interview_recording: "Registrazione in corso...",
      interview_feedback_unavailable: "Feedback non disponibile.",
      interview_evaluating: "Stella sta valutando...",
      interview_submit: "Invia → Domanda {n}/5",
      interview_show_model: "Mostra risposta modello",
      interview_common_mistake: "Errore comune: ",
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
      comparison_subtitle: "Altri strumenti fanno una cosa. Stellify fa tutto e comprende il mercato svizzero.",
      comparison_bad_title: "AI Standard / Altri Strumenti",
      comparison_bad_items: [
        "Finestra di chat vuota, non sai cosa inserire",
        "Nessun formato/standard svizzero",
        "Nessun controllo ATS: non sai se il tuo CV viene letto",
        "Nessun decodificatore di certificati: il codice svizzero rimane un mistero",
        "No job-matching: ti candidi a caso",
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
        { title: "Precisione svizzera", desc: "Conosciamo il mercato del lavoro svizzero nel dettaglio. Dall'ortografia corretta alle particolarità cantonali.", icon: "Target" },
        { title: "Carica l'annuncio da link", desc: "Incolla il link dell'annuncio e Stella compila automaticamente azienda, posizione e requisiti.", icon: "Cpu" },
        { title: "Quattro lingue", desc: "Candidati in tedesco, inglese, francese o italiano. Perfetto per il mercato svizzero multilingue.", icon: "Globe" },
        { title: "Il tuo CV, usato automaticamente", desc: "Caricalo una volta e Stella lo usa in ogni candidatura. Niente doppi inserimenti.", icon: "ShieldCheck" },
        { title: "Sei design più il tuo", desc: "Layout professionali secondo lo standard svizzero, in PDF e Word. Pronto da inviare in pochi minuti.", icon: "Coins" },
        { title: "Protezione dei dati secondo il diritto svizzero", desc: "I tuoi dati sono trattati secondo la LPD svizzera e il GDPR, trasmessi in modo crittografato ed eliminabili da te in qualsiasi momento.", icon: "Lock" }
      ],
      pricing_free_f: ["3 candidature da provare", "Panoramica & stato delle candidature", "Salva & modifica", "Nessuna carta di credito"],
      pricing_pro_f: ["30 generazioni IA al mese", "Candidature su misura con l'IA", "Carica l'annuncio da link & usa il CV", "Tutti i design standard", "Esportazione PDF & Word"],
      pricing_ultimate_f: ["Tutto di Pro, più:", "Piena potenza IA: 100 generazioni al mese", "Tutti i design Premium esclusivi", "Supporto e-mail personale", "Per chi si candida spesso o cambia carriera"],
      pricing_cta_free: "Inizia gratuitamente",
      pricing_cta_pro: "Diventa Pro",
      pricing_cta_ultimate: "Scegli Karriere+",
      pricing_recommended: "Consigliato",
      pricing_popular: "Scelta più popolare",
      value_title: "Cosa ti fa risparmiare Stellify",
      value_items: [
        { icon: "Coins", title: "CHF 200 a 400", desc: "costa una sola consulenza di carriera. Stellify Pro costa meno di CHF 20 al mese." },
        { icon: "Clock", title: "3 a 5 ore", desc: "risparmiate per candidatura. Più tempo per i posti che contano davvero." },
        { icon: "Target", title: "Più inviti", desc: "Una candidatura che corrisponde esattamente al posto si fa notare." },
        { icon: "TrendingUp", title: "Si ripaga subito", desc: "Una sola risposta positiva vale molto più del costo dell'abbonamento." }
      ],
      tools_data: {
        'cv-optimizer': { title: 'Ottimizzatore CV', desc: 'Analizza il tuo CV secondo gli standard svizzeri e ottimizza la formulazione.', input_label: 'Quale sezione ottimizzare?', input_placeholder: 'es. Esperienza professionale...' },
        'salary-calc': { title: 'Calcolatore stipendio AI CH', desc: 'Settore, esperienza, cantone: l\'IA analizza i salari di mercato.', input_job: 'Titolo del lavoro', input_job_placeholder: 'es: Ingegnere del Software', input_industry: 'Settore', input_industry_placeholder: 'es: Banche', input_exp: 'Anni di esperienza', input_exp_placeholder: 'es: 5', input_canton: 'Cantone', input_canton_placeholder: 'es: TI' },
        'bewerbungs-gen': { title: 'Generatore di candidatura', desc: 'Scegli un design, inserisci i dati, ottieni un documento finito.', input_label: '', input_placeholder: '' },
        'cv-gen': { title: 'Candidature', desc: 'Lettera di motivazione & CV in 60 secondi, generati dal vivo.', input_label: 'Annuncio di lavoro (opzionale)', input_placeholder: 'Copia l\'annuncio qui...' },
        'ats-sim': { title: 'Simulazione ATS', desc: 'Verifica se il tuo CV passa attraverso i software dei recruiter.', input_label: 'Annuncio di lavoro (opzionale)', input_placeholder: 'Copia l\'annuncio...' },
        'zeugnis': { title: 'Decodificatore certificati Premium', desc: 'Decodifica il codice segreto dei certificati di lavoro svizzeri. Identifica messaggi negativi nascosti e valuta la tua posizione sul mercato.', input_label: 'Testo del certificato', input_placeholder: 'Copia il testo qui...' },
        'skill-gap': { title: 'Analisi Skill-Gap', desc: 'Confronta il tuo profilo con il lavoro dei tuoi sogni.', input_label: 'Posizione target', input_placeholder: 'es. Senior Data Scientist' },
        'cv-analysis': { title: 'Analisi CV', desc: 'Analisi approfondita del tuo CV per parole chiave, adattamento al settore e potenziale di miglioramento.' },
        'tracker': { title: 'Tracker candidature', desc: 'Tutte le candidature in una pipeline, con promemoria e statistiche. Gratuito per sempre.', input_label: 'Titolo del lavoro / Azienda', input_placeholder: 'es. Senior Project Manager presso Roche' },
        'matching': { title: 'Job Matching', desc: 'L\'IA trova i tuoi 5 profili lavorativi corrispondenti.' },
        'interview': { title: 'Coach per colloqui', desc: 'L\'IA simula 5 domande reali e valuta le tue risposte.', input_label: 'Posizione per il colloquio', input_placeholder: 'es. Responsabile Marketing' },
        'berufseinstieg': { title: 'Guida primo lavoro', desc: 'Appena diplomato? Ti aiutiamo a trovare il tuo primo "vero" lavoro.', input_label: 'Cosa hai completato?', input_placeholder: 'es. AFC Informatica...' },
        'erfahrung-plus': { title: 'Esperienza-Plus', desc: 'Strumento speciale per gli over 50. Valorizza la tua esperienza.', input_label: 'Il tuo punto di forza', input_placeholder: 'es: 20 anni di esperienza dirigenziale nell\'edilizia' },
        'wiedereinstieg': { title: 'Check rientro al lavoro', desc: 'Lunga pausa? Colmiamo la lacuna in modo convincente.', input_label: 'Motivo della pausa', input_placeholder: 'es. Congedo parentale...' },
        'karriere-checkup': { title: 'Check-up carriera', desc: 'Hai un lavoro ma vuoi di più? Testiamo il tuo potenziale.', input_label: 'Lavoro attuale', input_placeholder: 'es. Responsabile di progetto' },
        'linkedin-job': { title: 'LinkedIn → Candidatura', desc: 'Profilo + Annuncio → Lettera di motivazione & argomenti.', input_profile: 'Testo del profilo LinkedIn', input_profile_placeholder: 'Copia il tuo profilo LinkedIn (Informazioni & Esperienza)...', input_ad: 'Annuncio di lavoro', input_ad_placeholder: 'Copia l\'annuncio qui...' },
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
          desc: 'Esercitati per un colloquio specifico. Stella pone domande mirate, rispondi per testo o microfono.',
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
          desc: 'Guida su misura per la trattativa salariale: posizionamento mercato, argomenti e strategia del 13° mese svizzero.',
          badge: 'Pro',
          input_label: 'Stipendio attuale / obiettivo',
          input_placeholder: 'es: Voglio passare da 95k a 115k CHF...',
          tutorial: 'Esempio: Trattativa da Zurich Insurance. Forniamo 5 argomenti concreti, la domanda iniziale ideale e le risposte alle obiezioni tipiche.'
        },
      }
    },
    EN: {
      welcome: "Welcome back,",
      welcome_modal_subtitle: "What do you want to achieve today?",
      welcome_modal_quickstart: "Quick Start",
      welcome_modal_dismiss: "Go to Dashboard",
      search_label_tool: "Discover tools & opportunities...",
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
      hero_title: "Your personal AI career assistant",
      hero_desc: "Paste a job-ad link and get a complete, ready-to-send application in 60 seconds. Precise, discreet and tuned to the Swiss job market.",
      cta_free: "Test for free",
      upload_cv: "Upload CV (Resume)",
      update_cv: "Update CV (Resume)",
      cv_info: "A CV (Curriculum Vitae) is your professional history. It is the most important document in your application.",
      dashboard: "Dashboard",
      profile_nav: "Account",
      tracker_nav: "Tracker",
      tracker_page_title: "Application Tracker",
      tracker_page_desc: "Every application, synced with your dashboard. Drag to reorder, change status, or archive.",
      tracker_page_kicker: "Your pipeline overview",
      profile_title: "My account",
      profile_desc: "Your profile, your CV, your subscription and all settings in one place.",
      profile_kicker: "Your space",
      dashboard_kicker: "Your workspace",
      profile_account: "Account",
      profile_account_name: "Name",
      profile_account_email: "Email",
      profile_account_plan: "Active plan",
      profile_account_member_since: "Member since",
      profile_apps_overview: "Applications overview",
      profile_open_tracker: "Open tracker",
      profile_stat_interviews: "Interviews",
      profile_stat_offers: "Offers",
      profile_stat_rejected: "Rejected",
      profile_recent_apps: "Recent applications",
      profile_activity: "Recent activity",
      profile_open_tools: "View tools",
      profile_photo: "Avatar",
      profile_photo_hint: "Pick your avatar. It shows in the navigation and on your profile.",
      profile_avatar_initial: "Your initial",
      profile_avatar_pick_hint: "Hover over an avatar to see its meaning.",
      tools: "Tools",
      pricing: "Pricing",
      login: "Login",
      register: "Register",
      logout: "Logout",
      success_stories: "Success Stories",
      nav_swiss: "Switzerland",
      promo_spot: "Promotional Spot",
      features: "Features",
      how_it_works: "How it works",
      success_title: "Real People. Real Success.",
      success_desc: "Thousands of Swiss professionals have already found their dream job with Stellify. Here are some of their stories.",
      promo_title: "Experience the future of career.",
      promo_play: "Play Spot",
      examples_title: "AI Precision in Action",
      examples_desc: "See how Stellify transforms standard text into premium Swiss applications.",
      ai_notice: "Generated by Stella AI. Verify before use. Your responsibility (Terms §9a).",
      settings: "Settings",
      profile: "Profile",
      subscription: "Subscription",
      data_privacy: "Privacy",
      tools_title: "Your toolkit for every application.",
      tools_gen_f1: "Cover letter, CV and email in 60 seconds",
      tools_gen_f2: "Swiss standard, tailored to the job ad",
      tools_gen_f3: "PDF and Word export, ready to send",
      tools_tracker_f1: "Every application in one clear pipeline",
      tools_tracker_f2: "Follow-up reminders at the right moment",
      tools_tracker_f3: "Statistics that show what works",
      tools_cta_title: "See for yourself. Your first 3 generator applications are on us.",
      tools_cta_sub: "The application tracker is completely free, forever. No subscription needed to try. Then from CHF 9.90 per month.",
      tools_cta_btn: "Try for free",
      tools_cta_btn2: "See plans",
      tools_badge: "Career Tools",
      tools_view_all: "View all tools",
      market_title: "Why now. Why Switzerland.",
      market_badge: "Market Potential",
      pricing_title: "Simple pricing. Full power.",
      pricing_monthly: "Monthly",
      pricing_yearly: "Yearly",
      pricing_save: "2 months free",
      plan_free_subtitle: "Try Stellify. No commitment.",
      plan_pro_subtitle: "For students, early-career and occasional applicants",
      plan_ultimate_subtitle: "For active job seekers and career changers",
      pricing_gratis_desc: "Start for free, no credit card required.",
      pricing_pro_desc: "The standard for ambitious candidates.",
      pricing_ultimate_desc: "Maximum power for your career.",
      faq_title: "Frequently Asked Questions",
      footer_desc: "Stellify is the application AI for Switzerland. Professional applications in minutes.",
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
      tool_no_cv: "No CV uploaded. The AI uses general information. Upload your CV for better results.",
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
      how_1_t: "Upload your CV",
      how_1_d: "Upload your CV as a PDF. Stella reads it fully and uses your strengths for every tailored application, in seconds.",
      how_2_t: "Generate the application",
      how_2_d: "Pick a design, paste the job ad, done: in 60 seconds your cover letter, CV and email are ready, as PDF or Word.",
      how_3_t: "Keep the overview",
      how_3_d: "Track every application in the free tracker: a clear pipeline, follow-up reminders and statistics that show what works.",
      faq_badge: "Frequently Asked Questions",
      faq_subtitle: "Everything you need to know",
      faq_contact: "Any questions?",
      cta_final_title: "Your career deserves your personal copilot.",
      cta_final_desc: "Start for free. Swiss standard. No subscription risk.",
      cta_final_btn: "Start for free now",
      settings_first_name: "First Name",
      settings_email: "Email",
      settings_status: "Status: Active",
      settings_change_plan: "Change Plan",
      settings_manage_sub: "Manage & cancel subscription",
      settings_privacy_desc: "Your data is processed in accordance with the Swiss Data Protection Act (DPA) and GDPR. You can request a copy of your data or delete your account at any time.",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      promo_presents: "Stellify Presents",
      promo_precision: "Precision",
      promo_redefined: "Redefined.",
      promo_desc: "In a market where every detail counts, Stellify is your unfair advantage. The first AI career copilot built for the Swiss standard.",
      promo_journey: "Start Your Journey",
      faq_1_q: "How secure is my data?",
      faq_1_a: "Your data is processed in accordance with the Swiss Data Protection Act (DPA) and GDPR, with encrypted transmission. You can delete your account and all data yourself at any time. Details on all providers are in the privacy policy.",
      faq_2_q: "How does the Stellify subscription work?",
      faq_2_a: "You choose a monthly or annual plan and get full access immediately. The subscription renews automatically so your access is never interrupted. You can cancel at any time with one click, in your account settings under Manage subscription. After cancelling you keep full access until the end of the paid period, then your account switches to the Free plan automatically. An upgrade, for example from Pro to Karriere+, is possible immediately at any time.",
      faq_3_q: "How many uses are included in my plan?",
      faq_3_a: "One generation equals one application created with AI. The Free plan includes 3 generations, ideal to explore with no commitment. The Pro plan offers 30 generations per month, job import by link and all standard designs. Karriere+ extends this to 100 generations per month and additionally unlocks the exclusive Premium designs. The exact limits are shown transparently on the Pricing page and in our Terms.",
      faq_4_q: "Does Stellify work for all industries?",
      faq_4_a: "Yes, our AI has been trained on the entire Swiss job market.",
      faq_5_q: "Which languages are supported?",
      faq_5_a: "We support German, English, French, and Italian.",
      faq_6_q: "Why Stellify instead of a plain chat AI?",
      faq_6_a: "A chat gives you text you still have to format, check and assemble yourself. Stellify delivers the finished result: paste the job-ad link, your CV and photo are applied automatically, and in 60 seconds you hold a ready-to-send document in Swiss standard, as PDF and Word, in the design of your choice. On top, the free tracker keeps every application, deadline and reminder in view. That is the difference between a tool and a text box.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Settings",
      nav_logout: "Logout",
      nav_login: "Login",
      tool_limit_pro: "You've used your 30 generations for this month. New ones arrive on the 1st of next month. Upgrade to Karriere+ for 100 generations per month plus Premium features.",
      tool_limit_free: "This expert tool requires a Pro or Karriere+ subscription.",
      onboarding_welcome_title: "Welcome to Stellify",
      onboarding_welcome_desc: "Your AI copilot for your Swiss career. We help you make the most of your potential.",
      onboarding_cv_title: "Upload your CV",
      onboarding_cv_desc: "Upload your resume so Stella can better understand you and your experiences. This way you get personalized tips.",
      onboarding_chat_title: "Stella in the background",
      onboarding_chat_desc: "Stella is the AI working in the background of every tool. she writes your applications, optimises your CV and prepares you for interviews. You don't have to ask her, she's always there.",
      onboarding_tools_title: "Your two tools",
      onboarding_tools_desc: "The Application Generator creates your full application as PDF and Word. The Application Tracker keeps every application in view.",
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
      dashboard_usage_unlimited: "Premium usage with 100 generations per month",
      plan_overview_title: "Your plan at a glance",
      plan_what_included: "Included in your plan",
      plan_what_upgrade: "Upgrade and unlock",
      plan_upgrade_cta: "Upgrade plan",
      plan_reset_info: "Limits reset automatically, daily at midnight, monthly on the 1st.",
      plan_resets_lifetime: "Lifetime limits. Upgrade anytime.",
      plan_free_f1: "3 AI generations to try", plan_free_f2: "Application overview & status", plan_free_f3: "Save & edit applications", plan_free_f4: "PDF export", plan_free_f5: "Multilingual (DE/FR/IT/EN)",
      plan_pro_f1: "30 AI generations per month", plan_pro_f2: "Tailored applications with AI", plan_pro_f3: "Load job by link & use your CV", plan_pro_f4: "All standard designs", plan_pro_f5: "PDF & Word export",
      plan_unlim_f1: "Full AI power: 100 generations per month", plan_unlim_f2: "All exclusive Premium designs", plan_unlim_f3: "Everything in Pro", plan_unlim_f4: "Personal email support", plan_unlim_f5: "For frequent applicants and career changers",
      dashboard_usage_desc: "Tool Usage",
      dashboard_chat_usage: "Stella requests",
      dashboard_daily_usage: "Daily Limit",
      dashboard_reset_monthly: "Resets on the 1st",
      dashboard_reset_daily: "Resets tomorrow",
      dashboard_stat_free_chat: "{used} / 3 Chat requests",
      dashboard_stat_free_tools: "{used} / 1 Tool use",
      tool_daily_limit_pro: "You have reached your daily limit. New attempts will be available tomorrow.",
      tool_limit_search_pro: "Your live search limit (10/month) has been reached. You will get new searches next month. Upgrade to Karriere+ for 300 live searches per month.",
      tool_limit_search_fair_use: "You have reached the fair-use limit for live searches. Please try again tomorrow or contact support.",
      dashboard_pro: "Career Professional",
      dashboard_desc: "Create a new application in 60 seconds or keep an eye on your applications in the tracker.",
      dashboard_stat_analyses: "Analyses",
      dashboard_stat_cv_status: "CV (Resume)",
      dashboard_stat_ready: "Ready",
      dashboard_stat_missing: "Missing",
      dashboard_stat_applications: "Applications",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Karriere+",
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
      tracker_notes_ph: "e.g. bonus, company car, contact person, next step…",
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
      tracker_search_ph: "Search company, role, location…",
      tracker_view_kanban: "Kanban",
      tracker_view_table: "Table",
      tracker_show_archived: "Show archive",
      tracker_hide_archived: "Hide archive",
      tracker_archive: "Archive",
      tracker_unarchive: "Restore",
      tracker_no_results: "No applications found",
      tracker_col_company: "Company",
      tracker_col_position: "Role",
      tracker_col_status: "Status",
      tracker_col_location: "Location",
      tracker_col_salary: "Salary",
      tracker_col_updated: "Updated",
      tracker_col_actions: "",
      stat_total: "Total",
      stat_in_process: "still open",
      stat_interviews: "Interviews",
      stat_offers: "Offers",
      stat_avg_salary: "Avg. salary",
      stat_rate: "rate",
      stat_based_on: "of",
      stat_no_data: "-",
      tracker_reminder: "Follow up on",
      tracker_reminder_due: "Due today",
      tracker_reminder_overdue: "overdue",
      tracker_reminder_short: "Follow-up",
      tracker_export_csv: "Export CSV",
      transparency_badge: "Transparency",
      transparency_title: "What you can do. and what you can't",
      transparency_sub: "So you know exactly where you stand. All limits cover AI requests (tools + chat).",
      tr_can_title: "What you can do", tr_cannot_title: "What's not possible",
      tr_can_1: "Try every tool on any plan",
      tr_can_2: "Create applications, save them and export as PDF or Word",
      tr_can_3: "Work in German, French, Italian and English",
      tr_can_4: "Use Swiss salary ranges, standards and labour-market context",
      tr_can_5: "Switch plans, cancel or pause anytime. no lock-in",
      tr_cannot_1: "Stellify doesn't replace a lawyer or tax advisor. always check AI output",
      tr_cannot_2: "No guarantee of job offers. we're a tool, not an agency",
      tr_cannot_3: "No processing of sensitive data (health, religion, social-benefit data)",
      tr_cannot_4: "No mass applications or automation against our terms",
      tr_limits_title: "Concrete AI limits by plan",
      tr_lim_free_label: "Free", tr_lim_free_v: "3 lifetime generations · all tools to try",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "30 generations per month · all core tools · document storage",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "100 generations per month · ATS Premium · advanced Interview Coach · Premium templates",
      tr_reset_info: "The monthly generation limits reset on the 1st of each month (Europe/Zurich).",
      tr_fair_use: "Stellify applies a fair-use limit of max. 15 (Pro) or 30 (Karriere+) requests per minute to prevent abuse.",
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
      stella_name: "Stella, AI Assistant",
      stella_online: "Online, ready to help",
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
      tool_cv_optional_label: "CV (optional, if none uploaded)",
      tool_cv_optional_ph: "Paste your CV here or upload a file, or leave empty for general tips.",
      tool_load_file: "Load file",
      salary_security_notice: "Your data is safe: Stellify does not store any personal salary data. The calculation is performed anonymously according to Swiss data protection standards.",
      swiss_standard_notice_title: "Swiss Career Excellence",
      swiss_standard_notice_text: "Precisely aligned with the Swiss job market, from language to application structure.",
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
      hero_accent: "AI career assistant",
      badge_new: "NEW",
      tools_section_badge: "AI Career Tools",
      tools_section_title: "Everything you need for your career",
      tools_section_desc: "From CV analysis to salary negotiation: Stellify guides you every step of the way.",
      tools_section_cta: "View all tools →",
      testimonial_verified: "Verified",
      cv_banner_title: "Upload your CV for personalised AI analyses",
      cv_banner_desc: "PDF or Word · Free · All tools tailored to your CV",
      cv_upload_hint: "PDF or Word · Free & secure analysis",
      cv_banner_btn: "Upload CV",
      cv_stat_upload: "Upload",
      testimonials: [
        { name: 'Lukas B.', role: 'Polymechanic EFZ', city: 'Winterthur', quote: "After my apprenticeship, I didn't know exactly how to best sell my practical skills in my CV. Stellify helped me describe my projects precisely. Now I have a great job at a large industrial company." },
        { name: 'Sarah W.', role: 'HR Specialist', city: 'Zurich', quote: "I see hundreds of applications every day. Stellify's certificate decoder is frighteningly accurate. It not only helps me privately but also gives me a new perspective on the Swiss job market." },
        { name: 'Hans-Peter K.', role: 'Logistics Manager', city: 'Olten', quote: "Starting over at over 50 was a challenge. Stellify translated my many years of experience into modern, ATS-optimized language. This opened doors for me that I already thought were closed." }
      ],
      interview_live_promo: "Practice your next interview, text or microphone",
      remaining: "remaining",
      search_close_label: "Close",
      search_open_selection: "Open Selection",
      premium_analysis_desc: "Deep review according to Swiss standards",
      salary_median_label: "Estimated Median Salary (Gross/Year)",
      salary_important_notice: "Important Notice",
      salary_disclaimer: "This estimate is based on current market trends and AI models for the Swiss job market. Factors such as specific certifications, bonus agreements, and individual benefits may influence the actual offer.",
      generated_app_title: "Your Generated Application",
      copy: "Copy",
      tool_how_to_use: "How to use this tool",
      tool_scroll_example: "Scroll down for professional example",
      tool_pro_example: "Professional Example",
      tool_try_example: "Try with example",
      tool_try_example_sub: "We fill the fields with realistic Swiss data and run the AI.",
      tool_unlimited_access: "Karriere+ Access",
      tool_unlock_desc: "Unlock this tool and all premium features with Karriere+.",
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
      interview_complete: "Interview complete.",
      interview_question_of: "Question {current} of 5",
      interview_show_tip: "Show tip",
      interview_feedback_prev: "Last answer feedback",
      interview_your_answer: "Your Answer",
      interview_answer_placeholder: "Write your answer here...",
      interview_mic_unavailable: "Microphone not available in this browser.",
      interview_mic_answer: "Answer by microphone",
      interview_recording: "Recording...",
      interview_feedback_unavailable: "Feedback unavailable.",
      interview_evaluating: "Stella is evaluating...",
      interview_submit: "Submit → Question {n}/5",
      interview_show_model: "Show model answer",
      interview_common_mistake: "Common mistake: ",
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
      comparison_subtitle: "Other tools do one thing. Stellify does everything and understands the Swiss market.",
      comparison_bad_title: "Standard AI / Other Tools",
      comparison_bad_items: [
        "Empty chat window, you don't know what to enter",
        "No Swiss format/standard (ss vs ß)",
        "No ATS check: you don't know if your CV is read",
        "No certificate decoder: Swiss code remains a mystery",
        "No job matching: you apply blindly",
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
        { title: "Swiss Precision", desc: "We know the Swiss job market in detail. From correct spelling to cantonal specifics.", icon: "Target" },
        { title: "Load the job by link", desc: "Paste the job posting link and Stella fills in the company, position and requirements automatically.", icon: "Cpu" },
        { title: "Four languages", desc: "Apply in German, English, French or Italian. Perfect for the multilingual Swiss market.", icon: "Globe" },
        { title: "Your CV, used automatically", desc: "Upload it once and Stella uses it in every application. No more double typing.", icon: "ShieldCheck" },
        { title: "Six designs plus your own", desc: "Professional layouts to the Swiss standard, as PDF and Word. Ready to send in minutes.", icon: "Coins" },
        { title: "Data protection under Swiss law", desc: "Your data is processed under the Swiss DPA and GDPR, transmitted encrypted and deletable by you at any time.", icon: "Lock" }
      ],
      pricing_free_f: ["3 applications to try", "Application overview & status", "Save & edit", "No credit card required"],
      pricing_pro_f: ["30 AI generations per month", "Tailored applications with AI", "Load job by link & use your CV", "All standard designs", "PDF & Word export"],
      pricing_ultimate_f: ["Everything in Pro, plus:", "Full AI power: 100 generations per month", "All exclusive Premium designs", "Personal email support", "For frequent applicants and career changers"],
      pricing_cta_free: "Start for free",
      pricing_cta_pro: "Go Pro",
      pricing_cta_ultimate: "Choose Karriere+",
      pricing_recommended: "Recommended",
      pricing_popular: "Most Popular",
      value_title: "What Stellify saves you",
      value_items: [
        { icon: "Coins", title: "CHF 200 to 400", desc: "is the price of a single career coaching session. Stellify Pro is under CHF 20 per month." },
        { icon: "Clock", title: "3 to 5 hours", desc: "saved per application. More time for the roles that really matter." },
        { icon: "Target", title: "More invitations", desc: "An application that truly fits the role stands out." },
        { icon: "TrendingUp", title: "Pays for itself fast", desc: "A single yes is worth far more than the subscription costs." }
      ],
      tools_data: {
        'cv-optimizer': { title: 'CV Optimizer', desc: 'Analyzes your CV for Swiss standards & optimizes wording.', input_label: 'Which section to optimize?', input_placeholder: 'e.g. Work experience...' },
        'salary-calc': { title: 'AI Salary Calc CH', desc: 'Industry, experience, canton: AI analyzes market wages & gives you a basis for negotiation.', input_job: 'Job Title', input_job_placeholder: 'e.g. Software Engineer', input_industry: 'Industry', input_industry_placeholder: 'e.g. Banking', input_exp: 'Years of Experience', input_exp_placeholder: 'e.g. 5', input_canton: 'Canton', input_canton_placeholder: 'e.g. ZH' },
        'bewerbungs-gen': { title: 'Application Builder', desc: 'Pick a design, enter your details, get a finished document.', input_label: '', input_placeholder: '' },
        'cv-gen': { title: 'Applications', desc: 'Cover letter & CV in 60 seconds, generated live.', input_label: 'Job Ad (optional)', input_placeholder: 'Paste the job ad here...' },
        'ats-sim': { title: 'ATS Simulation', desc: 'Checks if your CV passes through recruiter software. With score & tips.', input_label: 'Job Ad (optional)', input_placeholder: 'Paste the job ad...' },
        'zeugnis': { title: 'Premium Certificate Decoder', desc: 'Decodes the secret code of Swiss work certificates. Identifies hidden negative messages and evaluates your market position.', input_label: 'Certificate Text', input_placeholder: 'Paste the text here...' },
        'skill-gap': { title: 'Skill-Gap Analysis', desc: 'Compare your profile with your dream job and find out what you are still missing.', input_label: 'Target Position', input_placeholder: 'e.g. Senior Data Scientist' },
        'cv-analysis': { title: 'CV Analysis', desc: 'Deep analysis of your CV for keywords, industry fit, and improvement potential.' },
        'tracker': { title: 'Application Tracker', desc: 'Every application in one pipeline, with reminders and statistics. Free forever.', input_label: 'Job Title / Company', input_placeholder: 'e.g. Senior Project Manager at Roche' },
        'matching': { title: 'Job Matching', desc: 'AI finds your top 5 matching job profiles with fit score.' },
        'interview': { title: 'Interview Coach', desc: 'AI simulates 5 real questions, evaluates answers, gives a grade 0-100.', input_label: 'Position for the interview', input_placeholder: 'e.g. Marketing Manager' },
        'berufseinstieg': { title: 'Career Entry Guide', desc: 'Fresh out of apprenticeship or studies? We show you how to find your first "real" job.', input_label: 'What did you complete?', input_placeholder: 'e.g. EFZ IT...' },
        'erfahrung-plus': { title: 'Experience-Plus', desc: 'Special tool for 50+. We show you how to sell your decades of experience as an unbeatable advantage.', input_label: 'Your greatest strength', input_placeholder: 'e.g. 20 years of leadership experience in construction' },
        'wiedereinstieg': { title: 'Re-entry Check', desc: 'Took a longer break? We fill the gap in your CV professionally and convincingly.', input_label: 'Reason for break', input_placeholder: 'e.g. Parental leave...' },
        'karriere-checkup': { title: 'Career Checkup', desc: 'You have a job but want more? We check your current market potential.', input_label: 'Current Job', input_placeholder: 'e.g. Project Manager' },
        'linkedin-job': { title: 'LinkedIn → Application', desc: 'Profile + Ad → Cover letter & arguments.', input_profile: 'LinkedIn Profile Text', input_profile_placeholder: 'Copy your LinkedIn profile (About & Experience)...', input_ad: 'Job Ad', input_ad_placeholder: 'Copy the job ad here...' },
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
          desc: 'Practice your interview for a specific role. Stella asks tailored questions, answer by text or microphone.',
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
          desc: 'Tailored guide for your salary negotiation: market positioning, arguments and Swiss 13th month salary strategy.',
          badge: 'Pro',
          input_label: 'Current / Target Salary',
          input_placeholder: 'e.g. I want to go from 95k to 115k CHF...',
          tutorial: 'Example: Negotiation at Zurich Insurance. We provide 5 concrete arguments, the ideal opening demand and responses to typical objections.'
        },
      }
    }
  };

  const t = translations[language] || translations.DE;

  const allTools = [
    {
      id: 'bewerbungs-gen',
      title: t.tools_data['bewerbungs-gen'].title,
      desc: t.tools_data['bewerbungs-gen'].desc,
      icon: <FileText size={20} />,
      badge: language === 'FR' ? 'Complet' : language === 'IT' ? 'Completo' : language === 'EN' ? 'Complete' : 'Komplett',
      type: 'gratis',
      inputs: []
    },
    {
      id: 'interview',
      title: t.tools_data['interview'].title,
      desc: t.tools_data['interview'].desc,
      icon: <Mic size={20} />,
      badge: 'Üben',
      type: 'gratis',
      inputs: [
        { key: 'firstName', label: language === 'FR' ? 'Prénom' : language === 'IT' ? 'Nome' : language === 'EN' ? 'First name' : 'Vorname', type: 'text', placeholder: language === 'FR' ? 'ex. Anna' : language === 'IT' ? 'es. Anna' : language === 'EN' ? 'e.g. Anna' : 'z.B. Anna' },
        { key: 'lastName', label: language === 'FR' ? 'Nom de famille' : language === 'IT' ? 'Cognome' : language === 'EN' ? 'Last name' : 'Nachname', type: 'text', placeholder: language === 'FR' ? 'ex. Müller' : language === 'IT' ? 'es. Müller' : language === 'EN' ? 'e.g. Müller' : 'z.B. Müller' },
        { key: 'jobTitle', label: t.tools_data['interview'].input_label, type: 'text', placeholder: t.tools_data['interview'].input_placeholder },
        { key: 'applicationType', label: language === 'FR' ? 'Type de candidature' : language === 'IT' ? 'Tipo di candidatura' : language === 'EN' ? 'Application type' : 'Art der Bewerbung', type: 'select', placeholder: language === 'FR' ? 'Veuillez sélectionner' : language === 'IT' ? 'Seleziona' : language === 'EN' ? 'Please select' : 'Bitte wählen', options: language === 'FR' ? ['Candidature / Présentation', 'Apprentissage', 'Reconversion', 'Travailleur qualifié'] : language === 'IT' ? ['Candidatura / Presentazione', 'Apprendistato', 'Riconversione', 'Lavoratore qualificato'] : language === 'EN' ? ['Application / Introduction', 'Apprenticeship', 'Career change', 'Skilled worker'] : ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'qualifications', label: language === 'FR' ? 'Qualifications' : language === 'IT' ? 'Qualifiche' : language === 'EN' ? 'Qualifications' : 'Qualifikationen', type: 'textarea', placeholder: language === 'FR' ? 'ex. CFC commerce, CAS Marketing, langues...' : language === 'IT' ? 'es. AFC commercio, CAS Marketing, lingue...' : language === 'EN' ? 'e.g. commercial apprenticeship, CAS Marketing, languages...' : 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'description', label: language === 'FR' ? 'Description / Souhaits' : language === 'IT' ? 'Descrizione / Desideri' : language === 'EN' ? 'Description / Wishes' : 'Beschreibung / Wünsche', type: 'textarea', placeholder: language === 'FR' ? 'Sur quoi l\'entraînement d\'entretien doit-il se concentrer ?' : language === 'IT' ? 'Su cosa dovrebbe concentrarsi la simulazione del colloquio?' : language === 'EN' ? 'What should the interview training focus on?' : 'Worauf soll das Interview-Training fokussieren?' },
      ]
    },
    {
      id: 'cv-analysis',
      title: t.tools_data['cv-analysis'].title,
      desc: t.tools_data['cv-analysis'].desc,
      icon: <Search size={20} />,
      badge: 'Prüfung',
      type: 'pro',
      inputs: cvContext ? [] : [{ key: 'cvText', label: t.tool_cv_optional_label, type: 'textarea', placeholder: t.tool_cv_optional_ph }]
    },
    {
      id: 'cv-optimizer',
      title: t.tools_data['cv-optimizer'].title,
      desc: t.tools_data['cv-optimizer'].desc,
      icon: <FileText size={20} />,
      badge: 'Verbessern',
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
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: 'Bitte wählen', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
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
      badge: 'Plan',
      type: 'ultimate',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: 'Bitte wählen', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
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
      badge: 'Marktlohn',
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
      badge: 'Schnell',
      type: 'gratis',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: 'Bitte wählen', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
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
      badge: 'Test',
      type: 'pro',
      inputs: [{ key: 'jobAd', label: t.tools_data['ats-sim'].input_label, type: 'textarea', placeholder: t.tools_data['ats-sim'].input_placeholder }] 
    },
    { 
      id: 'zeugnis', 
      title: t.tools_data['zeugnis'].title, 
      desc: t.tools_data['zeugnis'].desc, 
      icon: <ShieldCheck size={20} />,
      badge: 'Übersetzen',
      type: 'pro',
      inputs: [{ key: 'certificateText', label: t.tools_data['zeugnis'].input_label, type: 'textarea', placeholder: t.tools_data['zeugnis'].input_placeholder }] 
    },
    { 
      id: 'skill-gap', 
      title: t.tools_data['skill-gap'].title, 
      desc: t.tools_data['skill-gap'].desc, 
      icon: <Target size={20} />,
      badge: 'Vergleich',
      type: 'pro',
      inputs: [{ key: 'targetJob', label: t.tools_data['skill-gap'].input_label, type: 'text', placeholder: t.tools_data['skill-gap'].input_placeholder }] 
    },
    {
      id: 'tracker',
      title: t.tools_data['tracker'].title,
      desc: t.tools_data['tracker'].desc,
      icon: <Layout size={20} />,
      badge: 'Gratis',
      // gratis: matches the "Gratis" badge in the welcome modal, and free
      // usage is already bounded by the 3-generation lifetime quota anyway.
      type: 'gratis',
      inputs: [{ key: 'jobTitle', label: t.tools_data['tracker'].input_label, type: 'text', placeholder: t.tools_data['tracker'].input_placeholder }]
    },
    { 
      id: 'matching',
      title: t.tools_data['matching'].title,
      desc: t.tools_data['matching'].desc,
      icon: <Search size={20} />,
      badge: 'Passend',
      type: 'ultimate',
      inputs: cvContext ? [] : [{ key: 'cvText', label: t.tool_cv_optional_label, type: 'textarea', placeholder: t.tool_cv_optional_ph }]
    },
    {
      id: 'berufseinstieg',
      title: t.tools_data['berufseinstieg'].title, 
      desc: t.tools_data['berufseinstieg'].desc, 
      icon: <Rocket size={20} />,
      badge: 'Erster Job',
      type: 'pro',
      inputs: [{ key: 'education', label: t.tools_data['berufseinstieg'].input_label, type: 'text', placeholder: t.tools_data['berufseinstieg'].input_placeholder }] 
    },
    { 
      id: 'erfahrung-plus', 
      title: t.tools_data['erfahrung-plus'].title, 
      desc: t.tools_data['erfahrung-plus'].desc, 
      icon: <Award size={20} />,
      badge: 'Ab 50',
      type: 'pro',
      inputs: [{ key: 'experience', label: t.tools_data['erfahrung-plus'].input_label, type: 'textarea', placeholder: t.tools_data['erfahrung-plus'].input_placeholder }] 
    },
    { 
      id: 'wiedereinstieg', 
      title: t.tools_data['wiedereinstieg'].title, 
      desc: t.tools_data['wiedereinstieg'].desc, 
      icon: <RefreshCw size={20} />,
      badge: 'Zurück in den Job',
      type: 'pro',
      inputs: [{ key: 'reason', label: t.tools_data['wiedereinstieg'].input_label, type: 'text', placeholder: t.tools_data['wiedereinstieg'].input_placeholder }] 
    },
    { 
      id: 'karriere-checkup', 
      title: t.tools_data['karriere-checkup'].title, 
      desc: t.tools_data['karriere-checkup'].desc, 
      icon: <TrendingUp size={20} />,
      badge: 'Aufstieg',
      type: 'pro',
      inputs: [{ key: 'currentJob', label: t.tools_data['karriere-checkup'].input_label, type: 'text', placeholder: t.tools_data['karriere-checkup'].input_placeholder }] 
    },
    {
      id: 'linkedin-job',
      title: t.tools_data['linkedin-job'].title,
      desc: t.tools_data['linkedin-job'].desc,
      icon: <Linkedin size={20} />,
      badge: 'Passend',
      type: 'pro',
      inputs: [
        { key: 'firstName', label: 'Vorname', type: 'text', placeholder: 'z.B. Anna' },
        { key: 'lastName', label: 'Nachname', type: 'text', placeholder: 'z.B. Müller' },
        { key: 'applicationType', label: 'Art der Bewerbung', type: 'select', placeholder: 'Bitte wählen', options: ['Bewerbung / Vorstellung', 'Lehrstelle', 'Quereinstieg', 'Qualifizierter Arbeiter'] },
        { key: 'duration', label: 'Wie lange in dieser Position', type: 'text', placeholder: 'z.B. 3 Jahre' },
        { key: 'qualifications', label: 'Qualifikationen', type: 'textarea', placeholder: 'z.B. EFZ Kaufmann, CAS Marketing, Sprachkenntnisse...' },
        { key: 'linkedinProfile', label: t.tools_data['linkedin-job'].input_profile, type: 'textarea', placeholder: t.tools_data['linkedin-job'].input_profile_placeholder },
        { key: 'jobAd', label: t.tools_data['linkedin-job'].input_ad, type: 'textarea', placeholder: t.tools_data['linkedin-job'].input_ad_placeholder },
        { key: 'description', label: 'Beschreibung / Wünsche', type: 'textarea', placeholder: 'Was soll das Dokument beinhalten? Besondere Wünsche, Schwerpunkte...' },
      ]
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
    },
  ];

  // V1 LAUNCH FOCUS — one core job: professional, job-tailored AI
  // applications (bewerbungs-gen). The free application tracker stays.
  // Every other tool is kept in code above (reversible) but hidden so the
  // product stays focused. Re-add ids here to bring a tool back later.
  const ENABLED_TOOL_IDS = new Set([
    'bewerbungs-gen', 'tracker',
  ]);
  const tools = allTools.filter(tl => ENABLED_TOOL_IDS.has(tl.id));

  const faqs = [
    { q: t.faq_6_q, a: t.faq_6_a },
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
  const isToolLimitReached = (!isPro && toolUses >= 3)
    || (user?.role === 'pro' && !isUnlimited && toolUses >= 30)
    || (user?.role === 'unlimited' && toolUses >= 100);
  const isDailyLimitReached = false;

  /* ── Demo identity for landing/empty-state previews ─────────────────────
     When the visitor is logged in we use their own first name (and try to
     pluck a last name from the email if it's the classic firstname.lastname
     format, same conservative heuristic the Bewerbungs-Generator uses).
     Falls back to a Swiss sample name. The tracker preview deliberately
     keeps company names ("Roche", "Nestlé"), those aren't applicant names. */
  const previewIdentity = (() => {
    const firstName = user?.firstName?.trim();
    if (!firstName) return { name: 'Anna Müller', emailMask: 'anna.mueller@…' };
    // Personalise the preview with the first name the user gave — but NEVER
    // guess a surname from the e-mail. Inventing a name a customer did not
    // enter is not acceptable.
    const email = user?.email || '';
    const emailMask = email.length > 26 ? email.slice(0, 23) + '…' : email;
    return { name: firstName, emailMask };
  })();
  // Illustrated portrait for the example documents: the user's own avatar if
  // it is one of the face presets, otherwise a fixed sample face. Never a
  // real photo, always instantly recognisable as an illustration.
  const previewAvatarId = AVATAR_PRESETS.some(p => p.id === user?.avatarId) ? (user!.avatarId as string) : 'aria';
  const isToolLocked = activeTool ? ((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) ||
                       (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) : false;

  // Shared tracker section — rendered on the dashboard AND on the dedicated
  // /tracker page. Both views read the same `applications` state, kept in
  // sync by the Firestore onSnapshot listener — naturally synchronised.
  const trackerSection = (
                <div className="space-y-6">
                  {/* Stack on phones so the title, the ? and the Neu button
                      never fight for space in one cramped row. */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">{t.tracker_title}</h2>
                        <button
                          onClick={() => setShowTrackerHelp(true)}
                          aria-label={language === 'FR' ? 'Comment ça marche ?' : language === 'IT' ? 'Come funziona?' : language === 'EN' ? 'How does it work?' : 'Wie funktioniert das?'}
                          title={language === 'FR' ? 'Comment ça marche ?' : language === 'IT' ? 'Come funziona?' : language === 'EN' ? 'How does it work?' : 'Wie funktioniert das?'}
                          className="p-1 rounded-full text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] hover:bg-[#004225]/8 dark:hover:bg-[#00A854]/10 transition-all shrink-0"
                        >
                          <HelpCircle size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest font-medium">{t.tracker_desc}</p>
                    </div>
                    <button
                      onClick={() => setIsAddingApp(true)}
                      className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all shadow-sm"
                    >
                      <Plus size={14} />
                      {t.tracker_add}
                    </button>
                  </div>

                  {/* Tracker help — same "?" pattern as the tools */}
                  {showTrackerHelp && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
                      <div onClick={() => setShowTrackerHelp(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                      <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-md bg-white dark:bg-[#1A1A18] p-8 shadow-2xl">
                        <button onClick={() => setShowTrackerHelp(false)} className="absolute top-4 right-4 p-2 text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all" aria-label="Schliessen">
                          <X size={16} />
                        </button>
                        <h3 className="text-2xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-1">{t.tracker_title}</h3>
                        <p className="text-xs text-[#9A9A94] mb-6">
                          {language === 'FR' ? 'Toutes tes candidatures, un seul endroit.' : language === 'IT' ? 'Tutte le tue candidature, in un solo posto.' : language === 'EN' ? 'All your applications, one place.' : 'Alle deine Bewerbungen an einem Ort.'}
                        </p>
                        <div className="space-y-5 max-h-[55vh] overflow-y-auto custom-scrollbar pr-2">
                          {(language === 'FR' ? [
                            { icon: 'plus', title: 'Ajouter', text: 'Clique sur Nouveau et saisis entreprise, poste, lieu et salaire. Chaque candidature devient une ligne.' },
                            { icon: 'status', title: 'Suivre le statut', text: "Change le statut directement dans la ligne : Liste de souhaits, Postulé, Entretien, Offre, Refusée. La pipeline en haut se met à jour toute seule." },
                            { icon: 'sparkles', title: 'Créer la candidature', text: "L'étoile dans la ligne ouvre le générateur, entreprise et poste sont déjà remplis. Stella écrit la lettre." },
                            { icon: 'gold', title: 'Le badge doré', text: "Si une candidature ouverte n'a pas bougé depuis 14 jours, un badge doré apparaît à côté de la date, par exemple 21d = 21 jours sans mouvement. C'est le signal de relancer par mail ou téléphone. Dès que tu changes quelque chose, il disparaît." },
                            { icon: 'archive', title: 'Archiver & exporter', text: "L'icône boîte archive les candidatures terminées, la flèche exporte tout en fichier CSV pour Excel." },
                          ] : language === 'IT' ? [
                            { icon: 'plus', title: 'Aggiungere', text: 'Clicca su Nuovo e inserisci azienda, posizione, luogo e stipendio. Ogni candidatura diventa una riga.' },
                            { icon: 'status', title: 'Seguire lo stato', text: 'Cambia lo stato direttamente nella riga: Lista desideri, Inviato, Colloquio, Offerta, Rifiutata. La pipeline in alto si aggiorna da sola.' },
                            { icon: 'sparkles', title: 'Creare la candidatura', text: 'La stellina nella riga apre il generatore con azienda e posizione già compilate. Stella scrive la lettera.' },
                            { icon: 'gold', title: 'Il badge dorato', text: 'Se una candidatura aperta non si muove da 14 giorni, accanto alla data appare un badge dorato, per esempio 21d = 21 giorni senza movimento. È il segnale per un sollecito via mail o telefono. Appena cambi qualcosa, sparisce.' },
                            { icon: 'archive', title: 'Archiviare & esportare', text: "L'icona scatola archivia le candidature concluse, la freccia esporta tutto in CSV per Excel." },
                          ] : language === 'EN' ? [
                            { icon: 'plus', title: 'Add', text: 'Click New and enter company, position, location and salary. Every application becomes one row.' },
                            { icon: 'status', title: 'Track the status', text: 'Change the status right in the row: Wishlist, Applied, Interview, Offer, Rejected. The pipeline on top updates by itself.' },
                            { icon: 'sparkles', title: 'Create the application', text: 'The sparkle in the row opens the generator with company and position prefilled. Stella writes the letter.' },
                            { icon: 'gold', title: 'The gold badge', text: 'If an open application has not moved for 14 days, a gold badge appears next to the date, for example 21d = 21 days without movement. That is your signal to follow up by mail or phone. As soon as you change anything, it disappears.' },
                            { icon: 'archive', title: 'Archive & export', text: 'The box icon archives finished applications, the arrow exports everything as a CSV file for Excel.' },
                          ] : [
                            { icon: 'plus', title: 'Hinzufügen', text: 'Klicke auf Neu und trage Firma, Position, Ort und Gehalt ein. Jede Bewerbung wird eine Zeile.' },
                            { icon: 'status', title: 'Status verfolgen', text: 'Ändere den Status direkt in der Zeile: Wunschliste, Beworben, Interview, Angebot, Abgelehnt. Die Pipeline oben zählt automatisch mit.' },
                            { icon: 'sparkles', title: 'Bewerbung erstellen', text: 'Das Funkeln in der Zeile öffnet den Generator, Firma und Position sind schon eingetragen. Stella schreibt das Anschreiben.' },
                            { icon: 'gold', title: 'Das goldene Abzeichen', text: 'Wenn sich eine offene Bewerbung 14 Tage lang nicht bewegt, erscheint neben dem Datum ein goldenes Abzeichen, zum Beispiel 21d = seit 21 Tagen keine Bewegung. Das ist dein Signal, per Mail oder Telefon nachzufassen. Sobald du etwas änderst, verschwindet es.' },
                            { icon: 'archive', title: 'Archivieren & exportieren', text: 'Das Kisten-Symbol archiviert erledigte Bewerbungen, der Pfeil exportiert alles als CSV-Datei für Excel.' },
                          ]).map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${item.icon === 'gold' ? 'bg-[#D4A852]/15 text-[#B8862F] dark:text-[#D4A852]' : 'bg-[#004225]/8 dark:bg-[#00A854]/12 text-[#004225] dark:text-[#00A854]'}`}>
                                {item.icon === 'plus' && <Plus size={15} />}
                                {item.icon === 'status' && <Layout size={15} />}
                                {item.icon === 'sparkles' && <Sparkles size={15} />}
                                {item.icon === 'gold' && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4A852]" />d
                                  </span>
                                )}
                                {item.icon === 'archive' && <Archive size={15} />}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">{item.title}</p>
                                <p className="text-[13px] text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed mt-0.5">{item.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowTrackerHelp(false)}
                          className="mt-7 w-full py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
                        >
                          {language === 'FR' ? 'Compris' : language === 'IT' ? 'Capito' : language === 'EN' ? 'Got it' : 'Verstanden'}
                        </button>
                      </motion.div>
                    </div>
                  )}

                  {applications.length > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94] pointer-events-none z-10" />
                        <input
                          type="text"
                          value={trackerSearch}
                          onChange={(e) => setTrackerSearch(e.target.value)}
                          placeholder={t.tracker_search_ph}
                          className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
                        />
                        {trackerSearch && (
                          <button
                            onClick={() => setTrackerSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#9A9A94] hover:text-[#1A1A18] rounded z-10"
                            aria-label="clear"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {trackerSearch.trim() && (
                          <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 shadow-xl max-h-80 overflow-y-auto">
                            {searchMatches.length === 0 ? (
                              <div className="px-4 py-6 text-center text-sm text-[#6B6B66] dark:text-[#9A9A94]">
                                {t.tracker_no_results}
                              </div>
                            ) : (
                              <>
                                <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-[#9A9A94] border-b border-black/5 dark:border-white/5 bg-[#FAFAF8] dark:bg-[#1A1A18]">
                                  {searchMatches.length} {searchMatches.length === 1 ? (language === 'FR' ? 'résultat' : language === 'IT' ? 'risultato' : language === 'EN' ? 'result' : 'Treffer') : (language === 'FR' ? 'résultats' : language === 'IT' ? 'risultati' : language === 'EN' ? 'results' : 'Treffer')}
                                </div>
                                {searchMatches.map((app) => {
                                  const statusLabel = app.status === 'Wishlist' ? t.tracker_wishlist :
                                    app.status === 'Applied' ? t.tracker_applied :
                                    app.status === 'Interview' ? t.tracker_interview :
                                    app.status === 'Offer' ? t.tracker_offer : t.tracker_rejected;
                                  return (
                                    <button
                                      key={app.id}
                                      onClick={() => { setEditingApp(app); setTrackerSearch(''); }}
                                      className="w-full text-left px-4 py-3 hover:bg-[#FAFAF8] dark:hover:bg-[#1A1A18] border-b border-black/5 dark:border-white/5 last:border-b-0 transition-all flex items-center gap-3"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-sm text-[#1A1A18] dark:text-[#FAFAF8] truncate">{app.company}</span>
                                          {app.archived && <Archive size={11} className="text-[#9A9A94] shrink-0" />}
                                        </div>
                                        <div className="text-xs text-[#5C5C58] dark:text-[#9A9A94] truncate">
                                          {app.position}
                                          {app.location && <span className="text-[#9A9A94]"> · {app.location}</span>}
                                          {app.salary && <span className="text-[#004225] font-medium"> · CHF {(() => {
                                            const n = parseFloat(String(app.salary).replace(/[^\d.]/g, ''));
                                            return isNaN(n) ? app.salary : n.toLocaleString('de-CH', { maximumFractionDigits: 0 });
                                          })()}</span>}
                                        </div>
                                      </div>
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#004225] bg-[#004225]/8 px-2 py-1 shrink-0">{statusLabel}</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {archivedCount > 0 && (
                          <button
                            onClick={() => setShowArchived((v) => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${showArchived ? 'bg-[#004225] text-white border-[#004225]' : 'bg-white dark:bg-[#2A2A26] text-[#5C5C58] dark:text-[#9A9A94] border-black/10 dark:border-white/10 hover:bg-black/5'}`}
                          >
                            {showArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                            <span className="hidden sm:inline">{showArchived ? t.tracker_hide_archived : t.tracker_show_archived}</span>
                            <span className="font-mono text-[9px] opacity-70">({archivedCount})</span>
                          </button>
                        )}
                        <button
                          onClick={exportApplicationsCsv}
                          title={t.tracker_export_csv}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border bg-white dark:bg-[#2A2A26] text-[#5C5C58] dark:text-[#9A9A94] border-black/10 dark:border-white/10 hover:bg-black/5 transition-all"
                        >
                          <Download size={12} />
                          <span className="hidden sm:inline">{t.tracker_export_csv}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {trackerStats.total > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Gesamt — number + stacked pipeline bar so the mix of
                          statuses is visible at a glance, not just a count. */}
                      <div className="p-5 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 transition-all hover:shadow-md hover:border-black/15 dark:hover:border-white/15">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">
                          <Send size={11} className="text-[#004225] dark:text-[#00A854]" />
                          {t.stat_total}
                        </div>
                        <p className="text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mt-2 leading-none"><CountUp to={trackerStats.total} /></p>
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-2">{trackerStats.inProcess} {t.stat_in_process}</p>
                        <div className="mt-3 flex h-1.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/5" aria-hidden="true">
                          {[
                            { v: trackerStats.wishlist, c: '#9A9A94' },
                            { v: trackerStats.applied, c: '#5C5C58' },
                            { v: trackerStats.interview, c: '#D4A852' },
                            { v: trackerStats.offer, c: '#00A854' },
                            { v: trackerStats.rejected, c: '#B91C1C' },
                          ].filter(s => s.v > 0).map((s, i) => (
                            <div key={i} style={{ width: `${(s.v / trackerStats.total) * 100}%`, background: s.c }} className="h-full" />
                          ))}
                        </div>
                      </div>
                      {/* Interviews — plain count, gold accent. No percentage:
                          the quota mixed stages and read wrong next to the
                          raw count. */}
                      <div className="p-5 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 transition-all hover:shadow-md hover:border-black/15 dark:hover:border-white/15 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.stat_interviews}</p>
                          <p className="text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mt-2 leading-none"><CountUp to={trackerStats.interview} /></p>
                          <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-2 leading-snug">
                            {language === 'FR' ? 'En phase d\'entretien' : language === 'IT' ? 'In fase di colloquio' : language === 'EN' ? 'In the interview stage' : 'Aktuell in der Interview-Phase'}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#D4A852]/12 flex items-center justify-center shrink-0" aria-hidden="true">
                          <Mic size={20} className="text-[#D4A852]" />
                        </div>
                      </div>
                      {/* Angebote — plain count, brand green */}
                      <div className="p-5 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 transition-all hover:shadow-md hover:border-black/15 dark:hover:border-white/15 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.stat_offers}</p>
                          <p className="text-3xl font-serif text-[#004225] dark:text-[#00A854] mt-2 leading-none"><CountUp to={trackerStats.offer} /></p>
                          <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-2 leading-snug">
                            {language === 'FR' ? 'Offres sur la table' : language === 'IT' ? 'Offerte sul tavolo' : language === 'EN' ? 'Offers on the table' : 'Angebote auf dem Tisch'}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#004225]/10 dark:bg-[#00A854]/12 flex items-center justify-center shrink-0" aria-hidden="true">
                          <Award size={20} className="text-[#004225] dark:text-[#00A854]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {isAddingApp && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white dark:bg-[#2A2A26] border border-[#004225]/20 dark:border-[#00A854]/25 shadow-xl space-y-4 transition-colors"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_reminder}</label>
                          <input
                            type="date"
                            value={newApp.reminder_at}
                            onChange={(e) => setNewApp({...newApp, reminder_at: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all"
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
                      className="p-6 bg-white dark:bg-[#2A2A26] border border-[#004225]/20 dark:border-[#00A854]/25 shadow-xl space-y-4 transition-colors"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">{t.tracker_reminder}</label>
                          <input
                            type="date"
                            value={editingApp.reminder_at || ''}
                            onChange={(e) => setEditingApp({...editingApp, reminder_at: e.target.value})}
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

                    {applications.length === 0 ? (
                      /* Friendly empty state instead of a bare table with only
                         headers — invites the very first entry. */
                      <div className="bg-white dark:bg-[#2A2A26] border border-dashed border-black/15 dark:border-white/15 rounded-lg px-6 py-14 text-center">
                        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#004225]/8 dark:bg-[#00A854]/15 flex items-center justify-center text-[#004225] dark:text-[#00A854]">
                          <Layout size={22} />
                        </div>
                        <h3 className="font-serif text-xl text-[#1A1A18] dark:text-[#FAFAF8] mb-2">
                          {language === 'FR' ? 'Ton suivi est encore vide' : language === 'IT' ? 'Il tuo tracker è ancora vuoto' : language === 'EN' ? 'Your tracker is still empty' : 'Dein Tracker ist noch leer'}
                        </h3>
                        <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-md mx-auto mb-6 leading-relaxed">
                          {language === 'FR' ? 'Ajoute une première candidature, même une déjà envoyée. Tu gardes tout en vue, avec statut et rappels. Gratuit pour toujours.'
                            : language === 'IT' ? 'Aggiungi una prima candidatura, anche già inviata. Tieni tutto in vista, con stato e promemoria. Gratis per sempre.'
                            : language === 'EN' ? 'Add a first application, even one already sent. Keep everything in view, with status and reminders. Free forever.'
                            : 'Trag eine erste Bewerbung ein, auch eine schon versendete. Du behältst alles im Blick, mit Status und Erinnerungen. Dauerhaft gratis.'}
                        </p>
                        <button
                          onClick={() => setIsAddingApp(true)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
                        >
                          <Plus size={14} />
                          {language === 'FR' ? 'Première candidature' : language === 'IT' ? 'Prima candidatura' : language === 'EN' ? 'First application' : 'Erste Bewerbung eintragen'}
                        </button>
                      </div>
                    ) : (
                    <DndContext
                      sensors={dndSensors}
                      onDragEnd={(event: DragEndEvent) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        const ids = viewApplications.map((a: any) => a.id);
                        const from = ids.indexOf(String(active.id));
                        const to = ids.indexOf(String(over.id));
                        if (from < 0 || to < 0) return;
                        const next = arrayMove(ids, from, to);
                        updateApplicationOrder(next);
                      }}
                    >
                      <div className="overflow-x-auto bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10">
                        <table className="w-full text-sm">
                          <thead className="bg-[#FAFAF8] dark:bg-[#1A1A18] border-b border-black/10 dark:border-white/10">
                            <tr>
                              <th className="px-2 py-3 w-8 hidden sm:table-cell"></th>
                              <th className="text-left px-3 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.tracker_col_company}</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden md:table-cell">{t.tracker_col_position}</th>
                              <th className="text-left px-2 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.tracker_col_status}</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden md:table-cell">{t.tracker_col_location}</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden md:table-cell">{t.tracker_col_salary}</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden lg:table-cell">{t.tracker_col_updated}</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <SortableContext items={viewApplications.map((a: any) => a.id)} strategy={verticalListSortingStrategy}>
                            <tbody>
                              {viewApplications.map((app: any) => {
                                const statusLabel = app.status === 'Wishlist' ? t.tracker_wishlist :
                                  app.status === 'Applied' ? t.tracker_applied :
                                  app.status === 'Interview' ? t.tracker_interview :
                                  app.status === 'Offer' ? t.tracker_offer : t.tracker_rejected;
                                const salaryFmt = (() => {
                                  if (!app.salary) return '';
                                  const num = String(app.salary).replace(/[^\d.]/g, '');
                                  if (!num) return app.salary;
                                  const n = parseFloat(num);
                                  if (isNaN(n)) return app.salary;
                                  return `CHF ${n.toLocaleString('de-CH', { maximumFractionDigits: 0 })}`;
                                })();
                                return (
                                  <SortableAppRow
                                    key={app.id}
                                    app={app}
                                    t={t}
                                    language={language}
                                    statusLabel={statusLabel}
                                    salaryFmt={salaryFmt}
                                    onEdit={setEditingApp}
                                    onArchive={setApplicationArchived}
                                    onDelete={deleteApplication}
                                    onStatusChange={updateApplicationStatus}
                                    onToggleFavorite={toggleApplicationFavorite}
                                    onFieldSave={updateApplicationField}
                                    onCreateApplication={(a: any) => {
                                      setGeneratorPrefill({ company: a.company || '', position: a.position || '' });
                                      handleToolClick('bewerbungs-gen');
                                    }}
                                  />
                                );
                              })}
                            </tbody>
                          </SortableContext>
                        </table>
                      </div>
                    </DndContext>
                    )}
                </div>
  );

  // Pipeline funnel — visual snapshot of the user's application flow.
  // Rendered on the Dashboard (clickable, jumps to /tracker) and on the
  // Tracker page (non-clickable, since the user is already there).
  const renderPipelineFunnel = (clickable: boolean) => {
    const cols = [
      { key: 'wishlist',  label: language === 'FR' ? 'Liste de souhaits' : language === 'IT' ? 'Lista desideri' : language === 'EN' ? 'Wishlist' : 'Wunschliste', value: trackerStats.wishlist, accent: '#9A9A94', tint: 'bg-[#9A9A94]' },
      { key: 'applied',   label: language === 'FR' ? 'Postulé' : language === 'IT' ? 'Inviato' : language === 'EN' ? 'Applied' : 'Beworben', value: trackerStats.applied, accent: '#5C5C58', tint: 'bg-[#5C5C58]' },
      { key: 'interview', label: 'Interview', value: trackerStats.interview, accent: '#D4A852', tint: 'bg-[#D4A852]' },
      { key: 'offer',     label: language === 'FR' ? 'Offre' : language === 'IT' ? 'Offerta' : language === 'EN' ? 'Offer' : 'Angebot', value: trackerStats.offer, accent: '#004225', tint: 'bg-[#004225] dark:bg-[#00A854]' },
      { key: 'rejected',  label: language === 'FR' ? 'Refusée' : language === 'IT' ? 'Rifiutata' : language === 'EN' ? 'Rejected' : 'Abgelehnt', value: trackerStats.rejected, accent: '#C0504D', tint: 'bg-[#C0504D]' },
    ];
    const max = Math.max(1, ...cols.map(c => c.value));
    const empty = trackerStats.total === 0;
    const kickerText = language === 'FR' ? 'Ta pipeline en un coup d\'œil' : language === 'IT' ? 'La tua pipeline a colpo d\'occhio' : language === 'EN' ? 'Your pipeline at a glance' : 'Deine Pipeline auf einen Blick';
    const emptyText = language === 'FR' ? 'Pas encore de candidature. Ajoute la première ci-dessous.' : language === 'IT' ? 'Nessuna candidatura ancora. Aggiungi la prima qui sotto.' : language === 'EN' ? 'No applications yet. Add your first one below.' : 'Noch keine Bewerbung. Trag deine erste unten ein.';
    // Percentages need volume to mean anything — with a handful of entries
    // they contradict the columns (2 offers imply interviews the Interview
    // column never shows). Below 6 answered applications we state plain
    // counts; the rates appear once the sample carries them.
    const responded = trackerStats.applied + trackerStats.interview + trackerStats.offer + trackerStats.rejected;
    const summaryParts: string[] = [
      language === 'FR' ? `${trackerStats.total} dans la pipeline`
        : language === 'IT' ? `${trackerStats.total} in pipeline`
        : language === 'EN' ? `${trackerStats.total} in pipeline`
        : `${trackerStats.total} in der Pipeline`,
    ];
    if (responded >= 6) {
      summaryParts.push(
        language === 'FR' ? `${trackerStats.interviewRate}% entretiens` : language === 'IT' ? `${trackerStats.interviewRate}% colloqui` : language === 'EN' ? `${trackerStats.interviewRate}% interview rate` : `${trackerStats.interviewRate}% Interview-Quote`,
        language === 'FR' ? `${trackerStats.offerRate}% offres` : language === 'IT' ? `${trackerStats.offerRate}% offerte` : language === 'EN' ? `${trackerStats.offerRate}% offer rate` : `${trackerStats.offerRate}% Erfolgsquote`,
      );
    } else {
      if (trackerStats.interview > 0) {
        summaryParts.push(
          language === 'FR' ? `${trackerStats.interview} entretien${trackerStats.interview > 1 ? 's' : ''}`
            : language === 'IT' ? `${trackerStats.interview} colloqui${trackerStats.interview === 1 ? 'o' : ''}`
            : language === 'EN' ? `${trackerStats.interview} interview${trackerStats.interview > 1 ? 's' : ''}`
            : `${trackerStats.interview} Interview${trackerStats.interview > 1 ? 's' : ''}`,
        );
      }
      if (trackerStats.offer > 0) {
        summaryParts.push(
          language === 'FR' ? `${trackerStats.offer} offre${trackerStats.offer > 1 ? 's' : ''} reçue${trackerStats.offer > 1 ? 's' : ''}`
            : language === 'IT' ? `${trackerStats.offer} offert${trackerStats.offer > 1 ? 'e' : 'a'} ricevut${trackerStats.offer > 1 ? 'e' : 'a'}`
            : language === 'EN' ? `${trackerStats.offer} offer${trackerStats.offer > 1 ? 's' : ''} received`
            : `${trackerStats.offer} Angebot${trackerStats.offer > 1 ? 'e' : ''} erhalten`,
        );
      }
    }
    const summary = summaryParts.join(' · ');
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        onClick={clickable ? () => navigate('tracker') : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('tracker'); } } : undefined}
        className={`p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 transition-all ${clickable ? 'cursor-pointer hover:border-[#004225]/30 dark:hover:border-[#00A854]/40 hover:shadow-md focus:outline-none focus:border-[#004225]/50 dark:focus:border-[#00A854]/60' : ''}`}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94]">{kickerText}</p>
          {clickable && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854]">
              {language === 'FR' ? 'Ouvrir' : language === 'IT' ? 'Apri' : language === 'EN' ? 'Open' : 'Öffnen'}
              <ArrowRight size={11} />
            </span>
          )}
        </div>
        {/* Five stages, always on one row. Stacked (number over label) on
            phones so nothing gets cut off, side by side from sm up. */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-4">
          {cols.map((c) => {
            const pct = empty ? 0 : Math.round((c.value / max) * 100);
            return (
              <div key={c.key} className="space-y-1.5 sm:space-y-2 min-w-0">
                {/* Number above its label in every viewport — a right-aligned
                    number visually attaches to the NEXT column on laptops. */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xl sm:text-2xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] leading-none">{c.value}</span>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider sm:tracking-widest truncate leading-tight" style={{ color: c.accent }}>{c.label}</span>
                </div>
                <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className={`h-full ${c.tint}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {/* Due follow-ups: turns the passive overview into a to-do — an
            explicit reminder that is due, or 7+ days in "Applied" without
            movement. Max two, stalest first. */}
        {!empty && trackerStats.dueFollowUps.length > 0 && (
          <div className="mt-5 space-y-2">
            {trackerStats.dueFollowUps.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#004225]/6 dark:bg-[#00A854]/10 border border-[#004225]/20 dark:border-[#00A854]/25 rounded-sm px-3 py-2">
                <Bell size={12} className="text-[#004225] dark:text-[#00A854] shrink-0" />
                <p className="text-[11px] font-medium text-[#004225] dark:text-[#00A854] truncate">
                  {f.kind === 'reminder'
                    ? (language === 'FR' ? `Rappel échu: ${f.company}` : language === 'IT' ? `Promemoria scaduto: ${f.company}` : language === 'EN' ? `Reminder due: ${f.company}` : `Erinnerung fällig: ${f.company}`)
                    : (language === 'FR' ? `Relancer ${f.company} · sans réponse depuis ${f.days} jours` : language === 'IT' ? `Follow-up ${f.company} · senza risposta da ${f.days} giorni` : language === 'EN' ? `Follow up with ${f.company} · no reply for ${f.days} days` : `Nachfassen bei ${f.company} · seit ${f.days} Tagen keine Antwort`)}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">
            {empty ? emptyText : summary}
            {!empty && trackerStats.weekNew > 0 && (
              <span className="text-[#004225] dark:text-[#00A854] font-medium">
                {language === 'FR' ? ` · Cette semaine: ${trackerStats.weekNew} ${trackerStats.weekNew === 1 ? 'nouvelle candidature' : 'nouvelles candidatures'}`
                  : language === 'IT' ? ` · Questa settimana: ${trackerStats.weekNew} ${trackerStats.weekNew === 1 ? 'nuova candidatura' : 'nuove candidature'}`
                  : language === 'EN' ? ` · This week: ${trackerStats.weekNew} new ${trackerStats.weekNew === 1 ? 'application' : 'applications'}`
                  : ` · Diese Woche: ${trackerStats.weekNew} neue ${trackerStats.weekNew === 1 ? 'Bewerbung' : 'Bewerbungen'}`}
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 shrink-0">
            {user && (() => {
              const planName = (user.role === 'unlimited' || user.role === 'admin') ? 'Karriere+' : user.role === 'pro' ? 'Pro' : 'Gratis';
              return (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('profile'); }}
                  title={t.subscription}
                  className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2.5 py-1.5 rounded-full hover:bg-[#004225]/12 dark:hover:bg-[#00A854]/20 transition-colors"
                >
                  <Star size={10} />
                  {t.subscription}: {planName}
                </button>
              );
            })()}
            <button
              onClick={(e) => { e.stopPropagation(); setIsAddingApp(true); }}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] hover:underline shrink-0"
            >
              + {t.tracker_add}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#1A1A18] text-[#1A1A18] dark:text-[#FAFAF8] font-sans selection:bg-[#004225] selection:text-white transition-colors duration-300">
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-[#FDFCFB]/90 dark:bg-[#1A1A18]/90 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-3 transition-colors duration-300">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <button
            onClick={() => {
              const onLegal = activeView === 'datenschutz' || activeView === 'impressum' || activeView === 'agb' || activeView === 'about';
              if (user) navigate('dashboard');
              else if (onLegal) navigate('dashboard');
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-lg sm:text-2xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] hover:opacity-80 transition-opacity shrink-0 inline-flex items-center gap-1.5 sm:gap-2 min-w-0"
          >
            <svg width="20" height="20" viewBox="0 0 32 32" className="text-[#004225] dark:text-[#00A854] shrink-0" aria-hidden="true">
              <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
            </svg>
            <span>Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span></span>
          </button>
          <div className="hidden xl:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 rounded-full p-1">
            {user ? (
              <>
                <button
                  onClick={() => navigate('dashboard')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'dashboard' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.dashboard}
                </button>
                <button
                  onClick={() => navigate('tracker')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'tracker' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.tracker_nav}
                </button>
                <button
                  onClick={() => navigate('tools')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'tools' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.tools}
                </button>
                <button
                  onClick={() => navigate('pricing')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'pricing' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.pricing}
                </button>
                <button
                  onClick={() => navigate('jobs')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'jobs' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.search_type_job}
                    {/* Animated "coming soon" pill — the job board is not
                        live yet; the tab itself says so before the click. */}
                    <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full bg-[#D4A852]/15 text-[#B8862F] dark:text-[#D4A852] text-[8px] font-bold uppercase tracking-widest">
                      <span className="relative flex w-1.5 h-1.5" aria-hidden="true">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4A852] opacity-60" />
                        <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-[#D4A852]" />
                      </span>
                      {language === 'FR' ? 'Bientôt' : language === 'IT' ? 'Presto' : language === 'EN' ? 'Soon' : 'Bald'}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => navigate('profile')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'profile' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.profile_nav}
                </button>
                <button
                  onClick={() => navigate('about')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'about' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns'}
                </button>
              </>
            ) : (
              <>
                {(() => {
                  const onLegal = activeView === 'datenschutz' || activeView === 'impressum' || activeView === 'agb' || activeView === 'about';
                  const goToAnchor = (id: string) => {
                    const linkClass = "px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5 transition-all whitespace-nowrap";
                    return linkClass;
                  };
                  const handleAnchor = (id: string) => (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (onLegal) {
                      navigate('dashboard');
                      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
                    } else {
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  };
                  return <>
                    <a href="#tools" onClick={handleAnchor('tools')} className={goToAnchor('tools')}>{t.tools}</a>
                    <a href="#pricing" onClick={handleAnchor('pricing')} className={goToAnchor('pricing')}>{t.pricing}</a>
                    <a href="#features" onClick={handleAnchor('features')} className={goToAnchor('features')}>{t.features}</a>
                    {/* Über uns scrolls to the story section like every other
                        header item — consistent one-page flow for visitors.
                        The full story page stays reachable from the section. */}
                    <a href="#story" onClick={handleAnchor('story')} className={goToAnchor('story')}>
                      {language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns'}
                    </a>
                  </>;
                })()}
              </>
            )}
            </div>
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/10 transition-all uppercase tracking-widest"
              >
                <svg width="13" height="13" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/></svg>
                {language}
                <ChevronDown size={11} className={`transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
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

        {/* Spacer that lets nav breathe at wider screens */}
        <div className="flex-1 hidden xl:block"></div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#5C5C58] dark:text-[#9A9A94] transition-all"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          {STELLA_CHAT_ENABLED && (
          <button
            onClick={() => setIsStellaOpen(true)}
            className="p-2.5 sm:p-2 hover:bg-black/5 rounded-full transition-colors text-[#004225]"
            title={t.nav_stella_chat}
          >
            <Sparkles size={20} />
          </button>
          )}
          {/* Global search removed by design: with two tools and six nav
              items it only duplicated the navigation and added a surface
              that could disappoint. The overlay code stays dormant below;
              re-adding this trigger brings it back. */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="xl:hidden p-2.5 sm:p-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94]"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('profile')}
                className="p-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94]"
                title={t.nav_settings}
              >
                <Settings size={16} />
              </button>

              <button
                onClick={() => {
                  // The avatar button has its own job: it jumps straight to
                  // the avatar picker, while the gear opens the account top.
                  navigate('profile');
                  setTimeout(() => document.getElementById('avatar-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
                }}
                title={language === 'FR' ? 'Choisir ton avatar' : language === 'IT' ? 'Scegli il tuo avatar' : language === 'EN' ? 'Choose your avatar' : 'Avatar auswählen'}
                className="shrink-0 w-8 h-8 rounded-full overflow-hidden border border-black/10 dark:border-white/10 hover:ring-2 hover:ring-[#004225]/30 dark:hover:ring-[#00A854]/40 transition-all"
              >
                {user.avatarId ? (
                  <PresetAvatar id={user.avatarId} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-[#004225]/8 dark:bg-[#00A854]/15 flex items-center justify-center text-[11px] font-serif font-medium text-[#004225] dark:text-[#00A854]">
                    {(user.firstName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              <span className="text-[13px] font-medium hidden lg:inline text-[#5C5C58] dark:text-[#9A9A94]">{t.nav_greeting}, {user.firstName}</span>
              <button
                onClick={handleLogout}
                className="p-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94]"
                title={t.nav_logout}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                className="hidden sm:inline-flex text-[13px] font-medium text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-full transition-all px-4 py-2.5"
              >
                {t.nav_login}
              </button>
              <motion.button
                onClick={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="relative bg-[#004225] text-white text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 hover:bg-[#00331d] hover:shadow-lg transition-colors flex items-center gap-1.5 sm:gap-2 shadow-md shadow-[#004225]/30 uppercase tracking-wider group whitespace-nowrap shrink-0"
              >
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00A854] rounded-full animate-ping opacity-75" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00A854] rounded-full" />
                <span className="hidden sm:inline">{t.nav_register}</span>
                <span className="sm:hidden">{language === 'FR' ? 'Démarrer' : language === 'IT' ? 'Inizia' : language === 'EN' ? 'Start' : 'Start'}</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </>
          )}
        </div>
      </nav>

      {/* --- MOBILE MENU --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
          {/* Tap anywhere outside the menu to close it and return to the page. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
            className="xl:hidden fixed inset-0 top-16 bg-black/20 dark:bg-black/40 z-30"
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="xl:hidden fixed inset-x-0 top-16 bg-white dark:bg-[#1A1A18] border-b border-black/8 dark:border-white/8 z-40 p-4 sm:p-6 space-y-5 shadow-xl"
          >
            <div className="flex flex-col gap-2">
              {user ? (
                <>
                  <button onClick={() => { navigate('dashboard'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'dashboard' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.dashboard}</button>
                  <button onClick={() => { navigate('tracker'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'tracker' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.tracker_nav}</button>
                  <button onClick={() => { navigate('tools'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'tools' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.tools}</button>
                  <button onClick={() => { navigate('pricing'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'pricing' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.pricing}</button>
                  <button onClick={() => { navigate('jobs'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'jobs' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    <span className="inline-flex items-center gap-2">
                      {t.search_type_job}
                      <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full bg-[#D4A852]/15 text-[#B8862F] dark:text-[#D4A852] text-[9px] font-bold uppercase tracking-widest">
                        <span className="relative flex w-1.5 h-1.5" aria-hidden="true">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4A852] opacity-60" />
                          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-[#D4A852]" />
                        </span>
                        {language === 'FR' ? 'Bientôt' : language === 'IT' ? 'Presto' : language === 'EN' ? 'Soon' : 'Bald'}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => { navigate('profile'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'profile' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.profile_nav}</button>
                  <button onClick={() => { navigate('about'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'about' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns'}</button>
                </>
              ) : (
                <>
                  {/* Anchor links work as scroll-targets ON the landing page; from
                      any other view we route to the dashboard first, then scroll. */}
                  {(() => {
                    const onLanding = activeView === 'dashboard';
                    const goAnchor = (id: string) => (e: React.MouseEvent) => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      if (id === 'pricing') { navigate('pricing'); return; }
                      if (!onLanding) {
                        navigate('dashboard');
                        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
                      } else {
                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                      }
                    };
                    const cls = "px-4 py-3 text-base font-medium rounded-full text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left";
                    return <>
                      <a href="#tools" onClick={goAnchor('tools')} className={cls}>{t.tools}</a>
                      <button onClick={() => { navigate('pricing'); setIsMenuOpen(false); }} className={cls}>{t.pricing}</button>
                      <a href="#features" onClick={goAnchor('features')} className={cls}>{t.features}</a>
                      <a href="#story" onClick={goAnchor('story')} className={cls}>{language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns'}</a>
                    </>;
                  })()}
                </>
              )}
            </div>
            <div className="pt-6 border-t border-black/8 dark:border-white/8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] mb-3">Sprache / Langue / Lingua</p>
              <div className="flex flex-wrap gap-2">
                {['DE', 'EN', 'FR', 'IT'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang as any); setIsMenuOpen(false); }}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-colors ${language === lang ? 'bg-[#004225] text-white' : 'bg-black/[0.04] dark:bg-white/[0.04] text-[#5C5C58] dark:text-[#9A9A94] hover:bg-black/[0.08] dark:hover:bg-white/[0.08]'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- LEGAL PAGES + ABOUT --- */}
      {(activeView === 'datenschutz' || activeView === 'impressum' || activeView === 'agb' || activeView === 'about') && (
        <Suspense fallback={
          /* Branded loading beat instead of a blank frame while the chunk
             downloads — the blank flash read as a bug when opening Über uns. */
          <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] dark:bg-[#1A1A18]">
            <svg width="30" height="30" viewBox="0 0 28 28" className="animate-pulse" aria-hidden="true">
              <path d="M14 2.5L17 10.5L25.5 14L17 17L14 25.5L11 17L2.5 14L11 10.5Z" fill="#00A854"/>
            </svg>
          </div>
        }>
          <LegalPages activeView={activeView} onBack={() => navigate(user ? 'dashboard' : 'dashboard')} language={language} />
        </Suspense>
      )}

      {activeView === 'ratgeber' && (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] dark:bg-[#1A1A18]">
            <svg width="30" height="30" viewBox="0 0 28 28" className="animate-pulse" aria-hidden="true">
              <path d="M14 2.5L17 10.5L25.5 14L17 17L14 25.5L11 17L2.5 14L11 10.5Z" fill="#00A854"/>
            </svg>
          </div>
        }>
          <GuidePages
            onBack={() => navigate('dashboard')}
            onOpenTool={() => { if (user) { const tl = tools.find((x: any) => x.id === 'bewerbungs-gen'); if (tl) setActiveTool(tl); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }}
            language={language}
            slug={guideSlug}
            onOpenArticle={openGuide}
            onBackToList={() => navigate('ratgeber')}
          />
        </Suspense>
      )}

      {/* --- HERO SECTION / DASHBOARD --- */}
      {(activeView !== 'datenschutz' && activeView !== 'impressum' && activeView !== 'agb' && activeView !== 'about' && activeView !== 'ratgeber') && ((user && (activeView === 'dashboard' || activeView === 'profile' || activeView === 'tracker' || activeView === 'tools' || activeView === 'jobs')) || !user) && (user && (activeView === 'dashboard' || activeView === 'profile' || activeView === 'tracker' || activeView === 'tools' || activeView === 'jobs') ? (
        <section className="px-6 lg:px-12 pt-12 pb-24 bg-[#FDFCFB] dark:bg-[#1A1A18]">
          <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto">
            {activeView === 'dashboard' && (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                <header>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854]" />
                    {t.dashboard_kicker}
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">
                    {t.dashboard_welcome} <span className="italic opacity-80">{user.firstName || t.dashboard_pro}</span>.
                  </h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">
                    {t.dashboard_desc}
                  </p>
                </header>

                <DesktopTip language={language} className="mb-2" />

                {/* Quick access: the two tools, front and centre. The
                    dashboard's job is orientation — open a tool in one
                    click instead of scrolling to find it. */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#004225] dark:text-[#00A854] mb-3">
                    {language === 'FR' ? 'Tes outils' : language === 'IT' ? 'I tuoi strumenti' : language === 'EN' ? 'Your tools' : 'Deine Tools'}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className="group text-left p-6 bg-[#004225] text-white hover:bg-[#00331d] transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-white/10 flex items-center justify-center">{tool.icon}</div>
                          <ArrowRight size={16} className="opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                        </div>
                        <p className="font-serif text-lg leading-tight">{tool.title}</p>
                        <p className="text-xs text-white/60 font-light mt-1 line-clamp-2">{tool.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Stats — every tile says what its number MEANS.
                    "Bewerbungen 3" alone read like used-up attempts; it is
                    the count of applications saved in the tracker, so the
                    tile now explains itself and links there. */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {([
                    {
                      label: t.dashboard_stat_analyses, value: toolHistory.length, icon: <TrendingUp size={15} />, num: true,
                      sub: language === 'FR' ? 'Résultats IA créés' : language === 'IT' ? 'Risultati IA creati' : language === 'EN' ? 'AI results created' : 'Erstellte KI-Ergebnisse',
                    },
                    { label: t.dashboard_stat_cv_status, value: cvContext ? t.dashboard_stat_ready : t.dashboard_stat_missing, icon: <FileText size={15} />, color: cvContext ? 'text-[#059669]' : 'text-red-500 dark:text-[#E08585]' },
                    {
                      label: 'Tracker', value: trackerStats?.total ?? 0, icon: <Layout size={15} />, num: true,
                      sub: (() => {
                        const open = trackerStats?.inProcess ?? 0;
                        if (open > 0) {
                          return language === 'FR' ? `Tout en vue · ${open} encore ouverte${open > 1 ? 's' : ''}`
                            : language === 'IT' ? `Tutto sotto controllo · ${open} ancora apert${open > 1 ? 'e' : 'a'}`
                            : language === 'EN' ? `All in view · ${open} still open`
                            : `Alles im Blick · ${open} noch offen`;
                        }
                        return language === 'FR' ? 'Tout en vue · toutes clôturées'
                          : language === 'IT' ? 'Tutto sotto controllo · tutte concluse'
                          : language === 'EN' ? 'All in view · all wrapped up'
                          : 'Alles im Blick · alle abgeschlossen';
                      })(),
                      action: { label: language === 'FR' ? 'Ouvrir' : language === 'IT' ? 'Apri' : language === 'EN' ? 'Open' : 'Öffnen', onClick: () => navigate('tracker') },
                    },
                    {
                      label: t.dashboard_stat_plan, value: user.role === 'unlimited' || user.role === 'admin' ? t.dashboard_stat_unlimited : (user.role === 'pro' ? t.dashboard_stat_pro : t.dashboard_stat_free), icon: <Star size={15} />,
                      // Dashboard shows status only — managing the plan lives
                      // in the profile, one click away.
                      action: (user.role === 'pro' || user.role === 'unlimited' || user.role === 'admin')
                        ? { label: language === 'FR' ? 'Gérer' : language === 'IT' ? 'Gestisci' : language === 'EN' ? 'Manage' : 'Verwalten', onClick: () => navigate('profile') }
                        : undefined,
                    }
                  ] as any[]).map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.4 }}
                      className="p-5 md:p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md hover:border-black/10 dark:hover:border-white/10 transition-all flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-[#004225]/8 dark:bg-[#00A854]/12 flex items-center justify-center text-[#004225] dark:text-[#00A854] shrink-0" aria-hidden="true">
                          {stat.icon}
                        </div>
                        <span className="text-[#9A9A94] dark:text-[#5C5C58] text-[10px] font-bold uppercase tracking-widest leading-tight">{stat.label}</span>
                      </div>
                      <div className={`text-3xl font-serif ${stat.color || 'text-[#1A1A18] dark:text-[#FAFAF8]'}`}>
                        {stat.num ? <CountUp to={stat.value as number} /> : stat.value}
                      </div>
                      {stat.sub && (
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-1.5 leading-snug">{stat.sub}</p>
                      )}
                      {stat.action && (
                        <button
                          onClick={stat.action.onClick}
                          className="mt-3 self-start inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] hover:gap-2.5 transition-all"
                        >
                          {stat.action.label}
                          <ArrowRight size={11} />
                        </button>
                      )}

                      {/* One quota display for every plan: bar, used/total and
                          how many generations are LEFT — the number people
                          actually want to know. Karriere+ gets a counter too
                          (it used to show only a static premium line). */}
                      {stat.label === t.dashboard_stat_plan && (() => {
                        const limit = (user.role === 'unlimited' || user.role === 'admin') ? 100 : user.role === 'pro' ? 30 : 3;
                        const used = Math.min(user.toolUses || 0, limit);
                        const left = limit - used;
                        const paid = user.role === 'pro' || user.role === 'unlimited' || user.role === 'admin';
                        return (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.dashboard_usage_desc}</span>
                              <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{used} / {limit}</span>
                            </div>
                            <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#004225] dark:bg-[#00A854] transition-all duration-700"
                                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                              />
                            </div>
                            <p className="text-[9px] font-medium text-[#004225] dark:text-[#00A854]">
                              {left} {t.remaining}
                              {paid && (() => {
                                // Say only what is certainly true for THIS account:
                                // monthly with a known billing date → that date;
                                // annual → calendar-month reset; anything else
                                // (e.g. manually granted plans) → no claim at all.
                                const dateLocale = language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH';
                                if (user.subscriptionInterval === 'monthly' && user.subscriptionExpiresAt) {
                                  const d = new Date(user.subscriptionExpiresAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
                                  return <span className="text-[#9A9A94] font-light"> · {language === 'FR' ? `${limit} nouvelles le ${d}` : language === 'IT' ? `${limit} nuove il ${d}` : language === 'EN' ? `${limit} new on ${d}` : `${limit} neue am ${d}`}</span>;
                                }
                                if (user.subscriptionInterval === 'annual') {
                                  return <span className="text-[#9A9A94] font-light"> · {language === 'FR' ? `${limit} nouvelles chaque 1er du mois` : language === 'IT' ? `${limit} nuove ogni 1° del mese` : language === 'EN' ? `${limit} new on the 1st of each month` : `${limit} neue jeweils am 1. des Monats`}</span>;
                                }
                                return null;
                              })()}
                            </p>
                            {!paid && (
                              <button
                                onClick={() => navigate('pricing')}
                                className="mt-3 w-full py-2 border border-[#004225]/20 dark:border-[#00A854]/30 text-[9px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] hover:bg-[#004225] hover:text-white dark:hover:bg-[#00A854] dark:hover:text-[#1A1A18] transition-all"
                              >
                                {language === 'FR' ? 'Découvrir Karriere+' : language === 'IT' ? 'Scopri Karriere+' : language === 'EN' ? 'Discover Karriere+' : 'Karriere+ entdecken'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      {stat.label === t.dashboard_stat_cv_status && cvContext && (
                        <button
                          onClick={() => handleToolClick('bewerbungs-gen')}
                          className="mt-3 w-full py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={12} />
                          {t.tools_data['bewerbungs-gen']?.title || 'Bewerbung erstellen'}
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

                <div className="mb-6">{renderPipelineFunnel(true)}</div>

                {user?.email === 'support.stellify@gmail.com' && (
                  <div className="mb-10 p-6 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 space-y-4 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">
                      <Shield size={12} />
                      Admin Tools
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'users', user.id), { role: 'pro' });
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
                            await updateDoc(doc(db, 'users', user.id), { role: 'unlimited' });
                            setMessages(prev => [...prev, { role: 'ai', content: 'Test-Upgrade: Du bist jetzt UNLIMITED-Nutzer! 🚀' }]);
                          } catch (e) { console.error(e); }
                        }}
                        className="px-4 py-2 bg-[#6FCF97] text-[#004225] text-[10px] font-bold uppercase tracking-widest hover:bg-[#5BBE85] transition-all"
                      >
                        Set Unlimited Role
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'users', user.id), { role: 'client' });
                            setMessages(prev => [...prev, { role: 'ai', content: 'Test-Downgrade: Du bist wieder FREE-Nutzer.' }]);
                          } catch (e) { console.error(e); }
                        }}
                        className="px-4 py-2 border border-[#004225] text-[#004225] text-[10px] font-bold uppercase tracking-widest hover:bg-[#004225]/10 transition-all"
                      >
                        Reset to Free
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await authFetch('/api/send-test-email', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ to: user.email, language }),
                            });
                            const text = await res.text();
                            let data: any = null;
                            try { data = JSON.parse(text); } catch { /* not JSON */ }
                            if (res.ok && data?.success !== false) {
                              const provider = data?.provider || data?.via || 'mail';
                              showToast(`Test-Mail via ${provider} an ${user.email} verschickt`, 'success');
                            } else {
                              const msg = data?.error || data?.message || text.slice(0, 120) || res.statusText;
                              showToast(`Fehler (${res.status}): ${msg}`, 'error');
                            }
                          } catch (e: any) {
                            showToast(`Netzwerkfehler: ${e?.message || 'unbekannt'}`, 'error');
                          }
                        }}
                        className="px-4 py-2 border border-[#004225] text-[#004225] text-[10px] font-bold uppercase tracking-widest hover:bg-[#004225]/10 transition-all flex items-center gap-2"
                      >
                        <Mail size={12} />
                        Send Test Email
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

                </div>
              <div className="lg:col-span-1 space-y-6">
              <div className="space-y-6">
                {/* Upgrade card — free users only. Keeps the price visible on
                    the dashboard (the path to purchase must never be more
                    than one click away) without showing paying customers
                    marketing they already acted on. */}
                {user.role === 'client' && (
                  <div className="p-8 border border-[#004225]/15 dark:border-[#00A854]/25 bg-white dark:bg-[#2A2A26] space-y-5 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">
                      <Star size={12} />
                      {language === 'FR' ? 'Passer au niveau supérieur' : language === 'IT' ? 'Fai il salto di qualità' : language === 'EN' ? 'Take the next step' : 'Mehr aus Stellify holen'}
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">Pro</p>
                          <p className="text-[11px] text-[#6B6B66] dark:text-[#9A9A94] font-light">{t.plan_pro_f1}</p>
                        </div>
                        <p className="font-serif text-lg text-[#004225] dark:text-[#00A854] whitespace-nowrap">CHF 9.90<span className="text-[10px] text-[#9A9A94]">/Mo.</span></p>
                      </div>
                      <div className="h-px bg-black/5 dark:bg-white/5" />
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">Karriere+</p>
                          <p className="text-[11px] text-[#6B6B66] dark:text-[#9A9A94] font-light">{t.plan_unlim_f2}</p>
                        </div>
                        <p className="font-serif text-lg text-[#004225] dark:text-[#00A854] whitespace-nowrap">CHF 19.90<span className="text-[10px] text-[#9A9A94]">/Mo.</span></p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('pricing')}
                      className="w-full py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all flex items-center justify-center gap-2"
                    >
                      {language === 'FR' ? 'Comparer les plans' : language === 'IT' ? 'Confronta i piani' : language === 'EN' ? 'Compare plans' : 'Pläne vergleichen'}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
                <div className="p-8 bg-[#004225] text-white space-y-6">
                  <h3 className="text-xl font-serif">{t.stella_context_title}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${cvContext ? 'bg-[#059669]' : 'bg-red-500 dark:bg-[#C96A6A]'} animate-pulse`} />
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
                        {['Präzision', 'Schweizer Markt', 'Massgeschneidert'].map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/5 text-[8px] font-bold uppercase tracking-widest border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border border-black/5 dark:border-white/5 bg-white dark:bg-[#2A2A26] space-y-6 transition-colors">
                  <h3 className="text-lg font-serif text-[#1A1A18] dark:text-[#FAFAF8]">{t.stella_roadmap}</h3>
                  <div className="space-y-4">
                    {isGeneratingRoadmap ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-4 bg-black/5 dark:bg-white/5 animate-pulse rounded" />
                        ))}
                      </div>
                    ) : careerRoadmap.length > 0 ? (
                      careerRoadmap.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#004225]/10 dark:bg-[#00A854]/15 flex items-center justify-center text-[10px] font-bold text-[#004225] dark:text-[#00A854] shrink-0">{i + 1}</div>
                          <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light">{step.replace(/^\d+\.\s*/, '')}</p>
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
                  <div className="p-8 border border-black/5 dark:border-white/5 bg-white dark:bg-[#2A2A26] space-y-6 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-serif text-[#1A1A18] dark:text-[#FAFAF8]">{t.salary_history}</h3>
                      <Coins size={18} className="text-[#004225]/40" />
                    </div>
                    <div className="space-y-4">
                      {salaryCalculations.map((calc) => (
                        <div key={calc.id} className="p-4 bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 space-y-2 group hover:border-[#004225]/20 dark:hover:border-[#00A854]/30 transition-all">
                          <div className="flex justify-between items-start">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A18] dark:text-[#FAFAF8] truncate pr-4">{calc.jobTitle}</h4>
                            <span className="text-[8px] font-mono text-[#9A9A94]">{calc.createdAt?.toDate ? calc.createdAt.toDate().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-[#6B6B66] dark:text-[#9A9A94]">
                            <span>{calc.industry}</span>
                            <span className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                            <span>{calc.canton}</span>
                          </div>
                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-[10px] font-serif text-[#004225] dark:text-[#00A854]">CHF {calc.medianSalary.toLocaleString('de-CH')}</span>
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
              </div>

              <div className="space-y-6 mt-12 lg:mt-16">
                {/* Job Tracker / Kanban Board — clear separation from the grid
                    above so the title never sticks to the Stella Insights card. */}
                {trackerSection}

                {/* Quick Tools */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h2 className="text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">{t.quick_tools}</h2>
                    <button
                      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border-b border-[#004225]/20 pb-1"
                    >
                      {t.all_tools}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    {[
                      ...tools.filter(tl => tl.id === 'bewerbungs-gen'),
                      ...tools.filter(tl => tl.id !== 'bewerbungs-gen').slice(0, 5),
                    ].map((tool, qi) => (
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
                        <h4 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors line-clamp-2">{tool.title}</h4>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Headline-tool CTA banner: the Bewerbungs-Generator with
                    the job-URL import (the actual new feature). */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  onClick={() => handleToolClick('bewerbungs-gen')}
                  className="relative overflow-hidden p-6 bg-[#004225] text-white cursor-pointer group hover:bg-[#00331d] transition-colors"
                >
                  <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px'}} />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 flex items-center justify-center shrink-0">
                        <Link2 size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5">{t.badge_new}</span>
                        </div>
                        <h3 className="text-base font-serif">{t.tools_data['bewerbungs-gen']?.title || 'Bewerbungs-Generator'}</h3>
                        <p className="text-xs text-white/60 font-light mt-0.5">
                          {language === 'FR' ? "Colle le lien de l'offre, Stella remplit tout automatiquement."
                            : language === 'IT' ? "Incolla il link dell'annuncio, Stella compila tutto automaticamente."
                            : language === 'EN' ? 'Paste the job link and Stella fills in everything automatically.'
                            : 'Stellenlink einfügen, Stella füllt alles automatisch aus.'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>

                {/* Recent Activity / Documents */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h2 className="text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">{t.recent_docs}</h2>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border-b border-[#004225]/20 pb-1">{t.view_all}</button>
                  </div>
                  <div className="grid gap-4">
                    {(savedApplications.length > 0 || toolHistory.length > 0) ? (
                      <>
                      {/* Saved applications from the generator — clicking one
                          reopens it in the generator, ready to edit and re-save. */}
                      {savedApplications.map((app) => (
                        <div
                          key={app.id}
                          className="p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 dark:hover:border-[#00A854]/30 transition-all flex items-center justify-between group cursor-pointer"
                          onClick={() => {
                            setGeneratorInitialDocId(app.id);
                            const tool = tools.find(t => t.id === 'bewerbungs-gen');
                            if (tool) setActiveTool(tool);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#FDFCFB] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#00A854]">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className="font-medium text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{app.title || (language === 'FR' ? 'Candidature' : language === 'IT' ? 'Candidatura' : language === 'EN' ? 'Application' : 'Bewerbung')}</h4>
                              <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest">
                                {app.updated_at ? new Date(app.updated_at).toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : t.time_just_now}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-[#9A9A94] group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))}
                      {toolHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 dark:hover:border-[#00A854]/30 transition-all flex items-center justify-between group cursor-pointer"
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
                            <div className="w-10 h-10 bg-[#FDFCFB] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#00A854]">
                              {tools.find(t => t.id === item.toolId)?.icon || <FileText size={20} />}
                            </div>
                            <div>
                              <h4 className="font-medium text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tools.find(t => t.id === item.toolId)?.title || item.toolTitle}</h4>
                              <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : t.time_just_now}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-[#9A9A94] group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))}
                      </>
                    ) : (
                      <div className="p-12 bg-white dark:bg-[#2A2A26] border border-dashed border-black/10 dark:border-white/10 text-center space-y-4 transition-colors">
                        <div className="w-12 h-12 bg-[#FDFCFB] dark:bg-[#1A1A18] flex items-center justify-center text-2xl mx-auto opacity-30">📄</div>
                        <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94] font-light">{t.docs_empty}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </>
            )}

            {activeView === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                <header className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854]" />
                    {t.profile_kicker}
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">{t.profile_title}</h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">{t.profile_desc}</p>
                </header>

                {/* First steps — a calm, always-available mini guide. Lives in
                    the account settings instead of the dashboard: no progress
                    logic, no checkmarks, nothing that can look broken. */}
                <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94]">
                    {language === 'FR' ? 'Premiers pas' : language === 'IT' ? 'Primi passi' : language === 'EN' ? 'First steps' : 'Erste Schritte'}
                  </p>
                  <p className="text-sm text-[#26261F] dark:text-[#C8C8C2] font-light leading-relaxed">
                    {language === 'FR' ? 'Comment tirer le meilleur de Stellify:'
                      : language === 'IT' ? 'Come ottenere il massimo da Stellify:'
                      : language === 'EN' ? 'How to get the most out of Stellify:'
                      : 'So holst du am meisten aus Stellify heraus:'}
                  </p>
                  <div className="divide-y divide-black/5 dark:divide-white/8">
                    {[
                      {
                        label: language === 'FR' ? 'Télécharge ton CV' : language === 'IT' ? 'Carica il tuo CV' : language === 'EN' ? 'Upload your CV' : 'Lade deinen Lebenslauf hoch',
                        hint: language === 'FR' ? "Stella l'utilise pour chaque candidature" : language === 'IT' ? 'Stella lo usa per ogni candidatura' : language === 'EN' ? 'Stella uses it for every application' : 'Stella nutzt ihn für jede Bewerbung',
                        action: () => fileInputRef.current?.click(),
                      },
                      {
                        label: language === 'FR' ? 'Ouvre le générateur de candidatures' : language === 'IT' ? 'Apri il generatore di candidature' : language === 'EN' ? 'Open the application generator' : 'Öffne den Bewerbungs-Generator',
                        hint: language === 'FR' ? "D'une annonce à une candidature prête, en 60 secondes" : language === 'IT' ? 'Da un annuncio a una candidatura pronta, in 60 secondi' : language === 'EN' ? 'From a job ad to a ready application, in 60 seconds' : 'Aus einem Inserat eine fertige Bewerbung, in 60 Sekunden',
                        action: () => handleToolClick('bewerbungs-gen'),
                      },
                      {
                        label: language === 'FR' ? 'Ouvre le suivi des candidatures' : language === 'IT' ? 'Apri il tracker delle candidature' : language === 'EN' ? 'Open the application tracker' : 'Öffne den Bewerbungs-Tracker',
                        hint: language === 'FR' ? 'Toutes tes candidatures en vue, gratuit pour toujours' : language === 'IT' ? 'Tutte le candidature sotto controllo, gratis per sempre' : language === 'EN' ? 'Every application in view, free forever' : 'Alle Bewerbungen im Blick, dauerhaft gratis',
                        action: () => navigate('tracker'),
                      },
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={s.action}
                        className="group w-full flex items-center gap-3.5 py-3 text-left cursor-pointer"
                      >
                        <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center border border-[#004225]/25 dark:border-[#00A854]/35 text-[#004225] dark:text-[#00A854] text-[11px] font-bold group-hover:bg-[#004225] group-hover:text-white dark:group-hover:bg-[#00A854] transition-colors">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] leading-snug">{s.label}</span>
                          <span className="block text-[11px] text-[#9A9A94] font-light mt-0.5">{s.hint}</span>
                        </span>
                        <ArrowRight size={15} className="shrink-0 text-[#9A9A94] group-hover:text-[#004225] dark:group-hover:text-[#00A854] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                  {/* Replay the intro tutorial anytime — it only showed once
                      on first login before this. */}
                  <button
                    onClick={() => setIsTutorialOpen(true)}
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] hover:underline"
                  >
                    <RefreshCw size={12} />
                    {language === 'FR' ? 'Revoir le tutoriel' : language === 'IT' ? 'Rivedi il tutorial' : language === 'EN' ? 'Watch the tutorial again' : 'Tutorial nochmals ansehen'}
                  </button>
                </div>

                {/* Avatar picker */}
                <div id="avatar-section" className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 scroll-mt-24">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94] mb-5">{t.profile_photo}</p>
                  <div className="flex items-center gap-5 sm:gap-6 mb-6">
                    <div className="shrink-0">
                      {user.avatarId ? (
                        <PresetAvatar id={user.avatarId} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-black/10 dark:border-white/10" />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#004225]/8 dark:bg-[#00A854]/15 flex items-center justify-center text-2xl sm:text-3xl font-serif text-[#004225] dark:text-[#00A854]">
                          {(user.firstName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">{t.profile_photo_hint}</p>
                  </div>
                  <div className="flex flex-wrap gap-3" onMouseLeave={() => setAvatarHover(null)}>
                    <button
                      onClick={() => handleSelectAvatar(null)}
                      title={t.profile_avatar_initial}
                      onMouseEnter={() => setAvatarHover(null)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#004225]/8 dark:bg-[#00A854]/15 flex items-center justify-center text-lg font-serif text-[#004225] dark:text-[#00A854] transition-all ${!user.avatarId ? 'ring-2 ring-[#004225] dark:ring-[#00A854] ring-offset-2 dark:ring-offset-[#2A2A26]' : 'hover:ring-2 hover:ring-[#004225]/30 dark:hover:ring-[#00A854]/40'}`}
                    >
                      {(user.firstName || '?').charAt(0).toUpperCase()}
                    </button>
                    {[...AVATAR_PRESETS, ...SYMBOL_AVATARS].map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectAvatar(p.id)}
                        onMouseEnter={() => setAvatarHover(p.id)}
                        title={AVATAR_MEANINGS[p.id]?.[language]?.name}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden transition-all ${user.avatarId === p.id ? 'ring-2 ring-[#004225] dark:ring-[#00A854] ring-offset-2 dark:ring-offset-[#2A2A26]' : 'hover:ring-2 hover:ring-[#004225]/30 dark:hover:ring-[#00A854]/40 hover:scale-105'}`}
                      >
                        <PresetAvatar id={p.id} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const shownId = avatarHover ?? user.avatarId;
                    const m = shownId ? AVATAR_MEANINGS[shownId]?.[language] : undefined;
                    return (
                      <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 min-h-[40px] flex items-center gap-3">
                        {m ? (
                          <>
                            <PresetAvatar id={shownId!} className="w-8 h-8 rounded-full shrink-0" />
                            <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light">
                              <span className="font-bold uppercase tracking-widest text-[10px] text-[#004225] dark:text-[#00A854] mr-2">{m.name}</span>
                              {m.desc}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-[#9A9A94] font-light italic">{t.profile_avatar_pick_hint}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Account / personal data */}
                <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94] mb-5">{t.profile_account}</p>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.profile_account_name}</p>
                      {isEditingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 min-w-0 bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 px-3 py-2 text-sm outline-none focus:border-[#004225]/30"
                            autoFocus
                          />
                          <button
                            onClick={handleUpdateName}
                            disabled={isSavingName}
                            className="bg-[#004225] text-white px-3 py-2 text-xs font-medium hover:bg-[#00331d] disabled:opacity-50"
                          >
                            {isSavingName ? '...' : 'OK'}
                          </button>
                          <button onClick={() => setIsEditingName(false)} className="text-[#9A9A94] hover:text-black dark:hover:text-white p-2">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8]">{user.firstName || '-'}</p>
                          <button
                            onClick={() => { setNewName(user.firstName || ''); setIsEditingName(true); }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                          >
                            {t.edit || 'Bearbeiten'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.profile_account_email}</p>
                      <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8] truncate" title={user.email}>{user.email}</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => setIsTutorialOpen(true)}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                    >
                      <Sparkles size={12} />
                      {t.settings_rewatch_tutorial || 'Tutorial erneut ansehen'}
                    </button>
                  </div>
                </div>

                {/* Subscription — moved here from the old settings popup */}
                <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94] mb-1">{t.subscription}</p>
                  <div className="p-4 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium dark:text-[#FAFAF8]">{user?.role === 'pro' ? 'Stellify Pro' : user?.role === 'unlimited' ? 'Stellify Karriere+' : 'Stellify Gratis'}</p>
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
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={() => navigate('pricing')}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border border-[#004225]/20 px-3 py-1.5 hover:bg-[#004225] hover:text-white transition-all"
                      >
                        {t.settings_change_plan}
                      </button>
                      {(user?.role === 'pro' || user?.role === 'unlimited') && (
                        <button
                          onClick={async () => {
                            try {
                              const r = await authFetch('/api/create-portal-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                              const d = await r.json();
                              if (d.url) window.location.href = d.url;
                              else showToast(d.error || 'Fehler', 'error');
                            } catch { showToast('Verbindung fehlgeschlagen', 'error'); }
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] border border-black/10 dark:border-white/10 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                        >
                          {t.settings_manage_sub}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Plan overview — visible to every plan, lists what's
                      included and (for Free/Pro) what an upgrade unlocks. */}
                  {(() => {
                    const isUnlim = user?.role === 'unlimited' || user?.role === 'admin';
                    const isProPlan = user?.role === 'pro';
                    const planFeatures: string[] = isUnlim
                      ? [t.plan_unlim_f1, t.plan_unlim_f2, t.plan_unlim_f3, t.plan_unlim_f4, t.plan_unlim_f5]
                      : isProPlan
                      ? [t.plan_pro_f1, t.plan_pro_f2, t.plan_pro_f3, t.plan_pro_f4, t.plan_pro_f5]
                      : [t.plan_free_f1, t.plan_free_f2, t.plan_free_f3, t.plan_free_f4, t.plan_free_f5];
                    const upgradeFeatures: string[] | null = isUnlim ? null
                      : isProPlan ? [t.plan_unlim_f1, t.plan_unlim_f2, t.plan_unlim_f4, t.plan_unlim_f5]
                      : [t.plan_pro_f1, t.plan_pro_f2, t.plan_pro_f3, t.plan_pro_f5];
                    return (
                      <div className="p-5 bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 space-y-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">
                          <Star size={12} />
                          <span>{t.plan_overview_title}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] mb-2.5">{t.plan_what_included}</p>
                          <ul className="space-y-1.5">
                            {planFeatures.map((f, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[#1A1A18] dark:text-[#FAFAF8] font-light">
                                <CheckCircle2 size={13} className="text-[#004225] dark:text-[#00A854] shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {upgradeFeatures && (
                          <div className="pt-4 border-t border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] mb-2.5">{t.plan_what_upgrade}</p>
                            <ul className="space-y-1.5 mb-4">
                              {upgradeFeatures.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light">
                                  <Sparkles size={12} className="text-[#004225] dark:text-[#00A854] shrink-0 mt-0.5" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                            <button
                              onClick={() => navigate('pricing')}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                            >
                              <Sparkles size={12} />{t.plan_upgrade_cta}
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-[#9A9A94] dark:text-[#6B6B66] italic leading-relaxed pt-1 border-t border-black/5 dark:border-white/5">
                          {isProPlan ? t.plan_reset_info : isUnlim ? t.dashboard_usage_unlimited : t.plan_resets_lifetime}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Detailed Usage in Settings — one dynamic block for every
                      plan (Free 3 · Pro 30 · Karriere+ 100). Shows how many
                      generations are LEFT instead of a percent figure. */}
                  {user && (() => {
                    const limit = (user.role === 'unlimited' || user.role === 'admin') ? 100 : user.role === 'pro' ? 30 : 3;
                    const used = Math.min(user.toolUses || 0, limit);
                    return (
                      <div className="p-6 bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">
                          <Activity size={14} />
                          <span>{t.settings_your_usage}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.settings_apps_tools}</p>
                              <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{used} / {limit} {user.role === 'client' ? t.settings_free_use : t.settings_generations}</p>
                            </div>
                            <span className="text-xs font-serif text-[#004225] dark:text-[#00A854]">{limit - used} {t.remaining}</span>
                          </div>
                          <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#004225] dark:bg-[#00A854] transition-all duration-700"
                              style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {user?.role === 'unlimited' && (
                    <div className="p-4 bg-[#004225]/5 border border-[#004225]/10 flex items-center gap-3">
                      <Sparkles size={16} className="text-[#004225]" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]">{t.dashboard_usage_unlimited}</p>
                    </div>
                  )}

                  {/* Admin Debug Section */}
                  {(import.meta.env.DEV && user?.email === 'support.stellify@gmail.com') && (
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
                              await updateDoc(doc(db, 'users', user.id), { role: 'client' });
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
                              await updateDoc(doc(db, 'users', user.id), { role: 'pro' });
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
                              await updateDoc(doc(db, 'users', user.id), { role: 'unlimited' });
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
                
                </div>

                {/* Privacy & account deletion — moved here from the old settings popup */}
                <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94] mb-1">{t.data_privacy}</p>
                  {/* Newsletter opt-out — on by default, one tap to change.
                      Free accounts only: paying customers receive no
                      marketing mails at all. */}
                  {user.role === 'client' && (
                  <div className="flex items-center justify-between gap-4 p-4 bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/5 dark:border-white/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Abo-Letter</p>
                      <p className="text-[11px] text-[#9A9A94] font-light mt-0.5">
                        {language === 'FR' ? 'De temps en temps des avantages et offres sur les plans Stellify par e-mail. Uniquement pour les comptes gratuits. Désactivable à tout moment.'
                          : language === 'IT' ? 'Di tanto in tanto vantaggi e offerte sui piani Stellify via e-mail. Solo per gli account gratuiti. Disattivabile in ogni momento.'
                          : language === 'EN' ? 'Occasional perks and offers on the Stellify plans by email. Free accounts only. Switch off anytime.'
                          : 'Ab und zu Vorteile und Angebote rund um die Stellify-Pläne per E-Mail. Nur für Gratis-Konten. Jederzeit abschaltbar.'}
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={user.newsletterOptIn !== false}
                      onClick={async () => {
                        const next = !(user.newsletterOptIn !== false);
                        try {
                          await updateDoc(doc(db, 'users', user.id), { newsletter: next });
                          setUser({ ...user, newsletterOptIn: next });
                          showToast(next
                            ? (language === 'FR' ? 'Abo-Letter activé' : language === 'IT' ? 'Abo-Letter attivato' : language === 'EN' ? 'Abo-Letter on' : 'Abo-Letter aktiviert')
                            : (language === 'FR' ? 'Abo-Letter désactivé' : language === 'IT' ? 'Abo-Letter disattivato' : language === 'EN' ? 'Abo-Letter off' : 'Abo-Letter abgeschaltet'));
                        } catch { showToast('Fehler', 'error'); }
                      }}
                      className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${user.newsletterOptIn !== false ? 'bg-[#004225] dark:bg-[#00A854]' : 'bg-black/15 dark:bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${user.newsletterOptIn !== false ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  )}
                  <p className="text-xs text-[#5C5C58] font-light leading-relaxed">
                    {t.settings_privacy_desc}
                  </p>
                  <button onClick={() => { setIsDeleteAccountOpen(true); setDeletePassword(''); setDeleteError(''); }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 dark:text-[#E08585] hover:text-red-700 dark:hover:text-[#F0A6A6] transition-colors">{t.settings_delete_account}</button>

                </div>


                {/* Contact — the same help offer the public guides show, so
                    logged-in users also know how to reach us. Mail first,
                    Instagram second. */}
                <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94]">
                    {language === 'FR' ? 'Une question ?' : language === 'IT' ? 'Una domanda?' : language === 'EN' ? 'Questions?' : 'Fragen oder Anliegen?'}
                  </p>
                  <p className="text-sm text-[#26261F] dark:text-[#C8C8C2] font-light leading-relaxed">
                    {language === 'FR' ? 'Écris-nous, nous répondons personnellement et rapidement:'
                      : language === 'IT' ? 'Scrivici, rispondiamo personalmente e rapidamente:'
                      : language === 'EN' ? 'Write to us, we answer personally and quickly:'
                      : 'Schreib uns, wir antworten persönlich und schnell:'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <a href="mailto:support.stellify@gmail.com" className="inline-flex items-center gap-2 text-sm font-medium text-[#004225] dark:text-[#00A854] hover:underline">
                      <Mail size={14} /> support.stellify@gmail.com
                    </a>
                    <a href="https://www.instagram.com/stellify.ch/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[#26261F] dark:text-[#C8C8C2] hover:text-[#E1306C] dark:hover:text-[#E1306C] transition-colors">
                      <Instagram size={14} /> @stellify.ch
                    </a>
                  </div>
                </div>

                {/* Admin only: send a newsletter to the chosen audience */}
                {user.email === 'support.stellify@gmail.com' && (
                  <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-[#D4A852]/40 space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8860B] mb-1">Abo-Letter an Gratis-Nutzer versenden (nur für dich sichtbar)</p>
                    {/* Ready-made letters — one click fills subject and text,
                        everything stays editable before sending. */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          n: 'Warum Pro sich lohnt',
                          s: 'Deine nächste Bewerbung in 60 Sekunden, so oft du willst',
                          m: 'Hallo\n\nDeine 3 Gratis-Bewerbungen haben dir gezeigt, wie Stellify arbeitet. Mit Pro machst du daraus deinen Standard: 30 Generierungen pro Monat, der Stellen-Import per Link und alle Designs, für CHF 9.90 pro Monat.\n\nWenn du gerade aktiv auf Stellensuche bist, ist das der günstigste Karriere-Beschleuniger, den du finden wirst.',
                        },
                        {
                          n: 'Tipp + sanfter Hinweis',
                          s: 'Der Trick mit dem Stellen-Link',
                          m: 'Hallo\n\nKennst du schon den schnellsten Weg zur fertigen Bewerbung? Kopiere einfach den Link eines Stelleninserats in den Generator, Stellify liest die Stelle und schreibt die Bewerbung passgenau darauf.\n\nMit dem Pro-Plan nutzt du das bis zu 30 Mal pro Monat.',
                        },
                        {
                          n: 'Karriere+ für Vielbewerber',
                          s: 'Für alle, die es ernst meinen: Karriere+',
                          m: 'Hallo\n\nWenn du dich gerade auf mehrere Stellen gleichzeitig bewirbst, ist Karriere+ für dich gebaut: 100 Generierungen pro Monat, alle exklusiven Premium-Designs und persönlicher E-Mail-Support.\n\nDein Bewerbungs-Tracker bleibt wie immer gratis dazu.',
                        },
                      ].map((tpl) => (
                        <button
                          key={tpl.n}
                          onClick={() => { setNlSubject(tpl.s); setNlMessage(tpl.m.replace(/\\n/g, String.fromCharCode(10))); }}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-[#D4A852]/40 text-[#B8860B] hover:bg-[#D4A852]/10 transition-all"
                        >
                          {tpl.n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={nlSubject}
                      onChange={(e) => setNlSubject(e.target.value)}
                      placeholder="Betreff, z.B. Neu bei Stellify: ..."
                      className="w-full bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm outline-none focus:border-[#004225]/40"
                    />
                    <textarea
                      value={nlMessage}
                      onChange={(e) => setNlMessage(e.target.value)}
                      rows={6}
                      placeholder={'Nachricht. Leerzeile = neuer Absatz.\n\nDer Abmelde-Hinweis wird automatisch angehängt.'}
                      className="w-full bg-[#FDFCFB] dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm outline-none focus:border-[#004225]/40 resize-y"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        disabled={nlSending || !nlSubject.trim() || !nlMessage.trim()}
                        onClick={async () => {
                          if (!window.confirm(`Newsletter "${nlSubject}" wirklich an die Zielgruppe senden?`)) return;
                          setNlSending(true);
                          try {
                            const r = await authFetch('/api/admin/send-newsletter', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ subject: nlSubject.trim(), message: nlMessage.trim() }),
                            });
                            const d = await r.json();
                            if (!r.ok) throw new Error(d.error || 'Fehler');
                            if (d.sent > 400) {
                              showToast(`Newsletter an ${d.sent} Empfänger gesendet. Achtung: Nahe am Gmail-Tageslimit (~500). Zeit für einen Versanddienst, melde dich bei Claude.`, 'error');
                            } else {
                              showToast(`Newsletter an ${d.sent} Empfänger gesendet`);
                            }
                            setNlSubject(''); setNlMessage('');
                          } catch (e: any) { showToast(e.message || 'Versand fehlgeschlagen', 'error'); }
                          finally { setNlSending(false); }
                        }}
                        className="px-6 py-2.5 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all disabled:opacity-50"
                      >
                        {nlSending ? 'Wird gesendet…' : 'Jetzt senden'}
                      </button>
                      <button
                        disabled={nlSending || !nlSubject.trim() || !nlMessage.trim()}
                        onClick={async () => {
                          setNlSending(true);
                          try {
                            const r = await authFetch('/api/admin/send-newsletter', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ subject: nlSubject.trim(), message: nlMessage.trim(), testOnly: true }),
                            });
                            const d = await r.json();
                            if (!r.ok) throw new Error(d.error || 'Fehler');
                            showToast('Test-Mail an support.stellify@gmail.com gesendet');
                          } catch (e: any) { showToast(e.message || 'Test fehlgeschlagen', 'error'); }
                          finally { setNlSending(false); }
                        }}
                        className="px-5 py-2.5 border border-[#004225]/25 text-[#004225] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#004225]/5 transition-all disabled:opacity-50"
                      >
                        Test an mich
                      </button>
                    </div>
                    <p className="text-[10px] text-[#9A9A94] font-light">Geht ausschliesslich an Gratis-Nutzer mit eingeschaltetem Abo-Letter. Zahlende Kunden erhalten nie Werbe-Mails. Jede Mail enthält automatisch den Hinweis, wie man abbestellt.</p>
                  </div>
                )}

                {/* Tool activity */}
                <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94]">{t.profile_activity}</p>
                    <button onClick={() => navigate('tools')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] hover:underline">{t.profile_open_tools}</button>
                  </div>
                  {toolHistory.length > 0 ? (
                    <div className="space-y-1">
                      {toolHistory.slice(0, 6).map((item: any, i: number) => {
                        const tool = tools.find(tl => tl.id === item.toolId);
                        return (
                          <button
                            key={i}
                            onClick={() => tool && handleToolClick(tool.id)}
                            className="w-full flex items-center justify-between gap-4 py-2.5 border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group text-left px-1"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 shrink-0 bg-[#004225]/8 dark:bg-[#00A854]/15 text-[#004225] dark:text-[#00A854] flex items-center justify-center">
                                {tool?.icon || <Wrench size={14} />}
                              </div>
                              <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8] truncate group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tool?.title || item.toolTitle}</p>
                            </div>
                            <span className="text-[10px] font-mono text-[#9A9A94] shrink-0">
                              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9A9A94] font-light italic py-6">{language === 'FR' ? "Aucune activité pour l'instant. Lance ton premier outil." : language === 'IT' ? 'Nessuna attività ancora. Avvia il tuo primo strumento.' : language === 'EN' ? 'No activity yet. Run your first tool.' : 'Noch keine Aktivität. Starte dein erstes Tool.'}</p>
                  )}
                </div>
              </div>

              {/* Right column — CV upload + status */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-8 bg-[#004225] text-white space-y-6">
                  <h3 className="text-xl font-serif">{t.stella_context_title}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${cvContext ? 'bg-[#059669]' : 'bg-red-500 dark:bg-[#C96A6A]'} animate-pulse`} />
                      <span className="text-xs font-light">{cvContext ? t.stella_context_cv_ready : t.stella_context_no_cv}</span>
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
                        {['Präzision', 'Schweizer Markt', 'Massgeschneidert'].map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/5 text-[8px] font-bold uppercase tracking-widest border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {activeView === 'tracker' && (
              <div className="space-y-8">
                <header className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854]" />
                    {t.tracker_page_kicker}
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">{t.tracker_page_title}</h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-2xl leading-relaxed">{t.tracker_page_desc}</p>
                  {/* Prominent help entry — the tiny grey ? next to the lower
                      section title was easy to miss. */}
                  <button
                    onClick={() => setShowTrackerHelp(true)}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 border border-[#004225]/25 dark:border-[#00A854]/35 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] text-[#004225] dark:text-[#00A854] hover:bg-[#004225] hover:text-white dark:hover:bg-[#00A854] dark:hover:text-[#1A1A18] transition-all"
                  >
                    <HelpCircle size={14} />
                    {language === 'FR' ? 'Comment ça marche ?' : language === 'IT' ? 'Come funziona?' : language === 'EN' ? 'How does it work?' : 'Wie funktioniert das?'}
                  </button>
                </header>
                {renderPipelineFunnel(false)}
                {trackerSection}
              </div>
            )}

            {activeView === 'jobs' && (
              <div className="space-y-10 max-w-4xl">
                <header>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854] animate-pulse" />
                    {language === 'FR' ? 'Bientôt disponible' : language === 'IT' ? 'Presto disponibile' : language === 'EN' ? 'Coming soon' : 'Folgt bald'}
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">
                    {language === 'FR' ? 'La bourse de l\'emploi arrive' : language === 'IT' ? 'La bacheca offerte sta arrivando' : language === 'EN' ? 'The job board is on its way' : 'Die Stellenbörse kommt bald'}
                  </h1>
                  <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-2xl leading-relaxed">
                    {language === 'FR'
                      ? 'Bientôt, tu pourras postuler directement via Stellify : un clic t\'amène à l\'offre de l\'entreprise. Nous construisons un réseau d\'employeurs suisses, étape par étape.'
                      : language === 'IT'
                      ? 'Presto potrai candidarti direttamente tramite Stellify: un clic ti porta all\'offerta dell\'azienda. Stiamo costruendo una rete di datori di lavoro svizzeri, passo dopo passo.'
                      : language === 'EN'
                      ? 'Soon you\'ll apply directly through Stellify: one click takes you to the company\'s posting. We\'re building a network of Swiss employers, step by step.'
                      : 'Bald kannst du dich direkt über Stellify bewerben: Ein Klick bringt dich zur Stelle des Unternehmens. Wir bauen Schritt für Schritt ein Netzwerk Schweizer Arbeitgeber auf.'}
                  </p>
                </header>

                {/* For companies — the B2B hook */}
                <div className="p-7 sm:p-8 bg-[#004225] text-white relative overflow-hidden rounded-sm">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#00A854]/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6FCF97] mb-3">
                      {language === 'FR' ? 'Pour les entreprises' : language === 'IT' ? 'Per le aziende' : language === 'EN' ? 'For companies' : 'Für Unternehmen'}
                    </p>
                    <h2 className="text-2xl font-serif mb-3 leading-snug">
                      {language === 'FR' ? 'Présentez vos postes à des candidats qualifiés' : language === 'IT' ? 'Mostra le tue posizioni a candidati qualificati' : language === 'EN' ? 'Put your roles in front of qualified candidates' : 'Zeige deine Stellen qualifizierten Kandidaten'}
                    </h2>
                    <p className="text-sm text-white/70 font-light leading-relaxed max-w-xl mb-6">
                      {language === 'FR'
                        ? 'Tes offres apparaissent directement là où les candidats préparent leur dossier avec l\'IA. Ils postulent chez toi en un clic. Écris-nous pour faire partie des premiers employeurs.'
                        : language === 'IT'
                        ? 'Le tue offerte appaiono dove i candidati preparano la candidatura con l\'IA. Si candidano da te con un clic. Scrivici per essere tra i primi datori di lavoro.'
                        : language === 'EN'
                        ? 'Your openings appear right where candidates craft their applications with AI. They apply to you in one click. Get in touch to be among the first employers.'
                        : 'Deine Stellen erscheinen genau dort, wo Kandidaten ihre Bewerbung mit KI erstellen. Sie bewerben sich mit einem Klick bei dir. Melde dich, um zu den ersten Arbeitgebern zu gehören.'}
                    </p>
                    <a
                      href={`mailto:support.stellify@gmail.com?subject=${encodeURIComponent(language === 'FR' ? 'Entreprise. publier des postes sur Stellify' : language === 'IT' ? 'Azienda. pubblicare posizioni su Stellify' : language === 'EN' ? 'Company. list roles on Stellify' : 'Unternehmen. Stellen auf Stellify ausschreiben')}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#004225] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#FAFAF8] transition-all"
                    >
                      {language === 'FR' ? 'Nous contacter' : language === 'IT' ? 'Contattaci' : language === 'EN' ? 'Get in touch' : 'Kontakt aufnehmen'}
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>

                {/* While they wait — point job seekers to the tools that exist now */}
                <div className="border border-black/8 dark:border-white/10 p-6 sm:p-7 rounded-sm">
                  <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8] font-medium mb-1">
                    {language === 'FR' ? 'En attendant' : language === 'IT' ? 'Nel frattempo' : language === 'EN' ? 'In the meantime' : 'In der Zwischenzeit'}
                  </p>
                  <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light mb-5 max-w-xl leading-relaxed">
                    {language === 'FR' ? 'Prépare des candidatures parfaites avec nos outils IA. prêt dès qu\'un poste t\'intéresse.' : language === 'IT' ? 'Prepara candidature perfette con i nostri strumenti IA. pronto appena trovi una posizione.' : language === 'EN' ? 'Get perfect applications ready with our AI tools. so you\'re set the moment a role catches your eye.' : 'Bereite mit unseren KI-Tools perfekte Bewerbungen vor. damit du bereit bist, sobald dich eine Stelle interessiert.'}
                  </p>
                  <button
                    onClick={() => navigate('tools')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
                  >
                    {language === 'FR' ? 'Voir les outils' : language === 'IT' ? 'Vedi gli strumenti' : language === 'EN' ? 'Explore the tools' : 'Zu den Tools'}
                    <ArrowRight size={14} />
                  </button>
                </div>
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
                {/* Each tool sits next to its own rich, practice-near example.
                    Ordered best/headline tool first (TOOL_PRIORITY). */}
                <div className="space-y-5">
                  {[...tools].sort((a: any, b: any) => {
                    const ia = TOOL_PRIORITY.indexOf(a.id); const ib = TOOL_PRIORITY.indexOf(b.id);
                    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                  }).map((tool: any, idx: number) => (
                    <motion.div
                      key={tool.id}
                      whileHover={{ y: -3 }}
                      onClick={() => handleToolClick(tool.id)}
                      className="grid sm:grid-cols-2 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 transition-all group cursor-pointer shadow-sm overflow-hidden"
                    >
                      {/* Left — the tool */}
                      <div className="p-6 md:p-8 flex flex-col min-w-0">
                        <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#FDFCFB] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#00A854] group-hover:bg-[#004225] group-hover:text-white transition-all">
                              {tool.icon}
                            </div>
                            {idx === 0 && (
                              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white bg-[#004225] dark:bg-[#00A854] px-1.5 py-0.5 rounded-sm">Top</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/10 px-2 py-1">{tool.badge}</span>
                        </div>
                        <h3 className="text-lg md:text-xl font-medium mb-2 text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tool.title}</h3>
                        <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed mb-4 line-clamp-3">{tool.desc}</p>
                        <ul className="space-y-1.5 mb-5">
                          {(tool.id === 'bewerbungs-gen'
                            ? [t.tools_gen_f1, t.tools_gen_f2, t.tools_gen_f3]
                            : tool.id === 'tracker'
                            ? [t.tools_tracker_f1, t.tools_tracker_f2, t.tools_tracker_f3]
                            : []
                          ).map((f: string, fi: number) => (
                            <li key={fi} className="flex items-start gap-2 text-xs text-[#4A4A45] dark:text-[#9A9A94]">
                              <CheckCircle2 size={13} className="text-[#004225] dark:text-[#00A854] shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button className="mt-auto text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] flex items-center gap-2 group/btn">
                          {t.tool_open} <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                      {/* Right — that tool's rich example, framed as a mini
                          app window so every example reads as a real result. */}
                      <div className="p-5 md:p-7 bg-[#F4F3F0] dark:bg-[#161613] border-t sm:border-t-0 sm:border-l border-black/5 dark:border-white/5 flex flex-col justify-center min-w-0">
                        <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/30 bg-[#FDFCFB] dark:bg-[#1F1F1C]">
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#2A2A26] border-b border-black/6 dark:border-white/6">
                            <span className="w-2 h-2 rounded-full bg-[#E8837B]" />
                            <span className="w-2 h-2 rounded-full bg-[#E8C57B]" />
                            <span className="w-2 h-2 rounded-full bg-[#7BC98F]" />
                            <span className="ml-2 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#9A9A94] truncate">
                              {tool.title} · {language === 'FR' ? 'Exemple' : language === 'IT' ? 'Esempio' : language === 'EN' ? 'Example' : 'Beispiel'}
                            </span>
                          </div>
                          <div className="p-4 sm:p-5">
                            {renderToolExample(tool)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {/* Conversion strip — only for users without a paid plan. */}
                {user?.role !== 'pro' && user?.role !== 'unlimited' && user?.role !== 'admin' && (
                  <div className="relative overflow-hidden p-7 sm:p-10 text-white" style={{ background: 'linear-gradient(135deg, #00331d 0%, #004225 55%, #0a5233 100%)' }}>
                    <svg viewBox="0 0 100 100" className="absolute -right-6 -top-6 w-40 h-40 opacity-[0.12]" aria-hidden="true">
                      <path d="M50 16 Q55 42 80 52 Q56 56 48 84 Q45 58 20 46 Q46 42 50 16 Z" fill="#6FCF97" />
                    </svg>
                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 sm:justify-between">
                      <div className="max-w-xl">
                        <h3 className="text-xl sm:text-2xl font-serif mb-2">{t.tools_cta_title}</h3>
                        <p className="text-sm text-white/75 font-light">{t.tools_cta_sub}</p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                        <button
                          onClick={() => handleToolClick('bewerbungs-gen')}
                          className="px-6 py-3 bg-white text-[#004225] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#E8F3EC] transition-colors"
                        >
                          {t.tools_cta_btn}
                        </button>
                        <button
                          onClick={() => navigate('pricing')}
                          className="px-6 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 hover:text-white border border-white/25 hover:border-white/50 transition-colors"
                        >
                          {t.tools_cta_btn2}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="relative px-4 sm:px-6 lg:px-12 py-14 sm:py-16 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-7xl 2xl:max-w-[1500px] mx-auto transition-colors overflow-hidden">
          {/* Premium ambient backdrop — slow aurora + subtle drift, matches splash */}
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.55] dark:opacity-30"
                 style={{
                   background: 'radial-gradient(circle, rgba(0,168,84,0.18) 0%, rgba(0,168,84,0.06) 35%, transparent 70%)',
                   filter: 'blur(60px)',
                   animation: 'stellifyHeroDriftA 18s ease-in-out infinite',
                 }} />
            <div className="absolute bottom-[-25%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-[0.45] dark:opacity-25"
                 style={{
                   background: 'radial-gradient(circle, rgba(108,240,161,0.16) 0%, rgba(0,168,84,0.05) 40%, transparent 70%)',
                   filter: 'blur(60px)',
                   animation: 'stellifyHeroDriftB 22s ease-in-out infinite',
                 }} />
            <style>{`
              @keyframes stellifyHeroDriftA {
                0%,100% { transform: translate(0,0) scale(1); }
                50%     { transform: translate(3%, -2%) scale(1.06); }
              }
              @keyframes stellifyHeroDriftB {
                0%,100% { transform: translate(0,0) scale(1); }
                50%     { transform: translate(-3%, 2%) scale(1.08); }
              }
              @media (prefers-reduced-motion: reduce) {
                [data-hero-aurora] { animation: none !important; }
              }
            `}</style>
          </div>
<motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8 min-w-0"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-xs font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#FDFCFB] animate-pulse" />
              {t.hero_precision}
            </div>
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-serif leading-[1.05] tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] text-balance">
              {t.hero_intro} <br />
              <span className="italic text-[#004225] dark:text-[#FAFAF8]">{t.hero_accent || t.hero_title.split(' ').pop()}</span>
            </h1>
            <p className="text-base sm:text-lg text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed max-w-lg">
              {getHeroVariant() === 'b'
                ? (language === 'FR' ? "La candidature qui te mène à l'entretien : prête en 60 secondes, au standard suisse, avec ton CV et ta photo."
                  : language === 'IT' ? 'La candidatura che ti porta al colloquio: pronta in 60 secondi, secondo lo standard svizzero, con il tuo CV e la tua foto.'
                  : language === 'EN' ? 'The application that gets you the interview: ready in 60 seconds, Swiss standard, with your CV and photo.'
                  : 'Die Bewerbung, die dich zum Interview bringt: in 60 Sekunden fertig, im Schweizer Standard, mit deinem Lebenslauf und Foto.')
                : t.hero_desc}
            </p>
            {/* The real four-step journey, identical in every language —
                the hero must only promise what V1 actually delivers. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {((language === 'FR' ? [
                ['1', 'CV'],
                ['2', "Lien de l'annonce"],
                ['3', 'Candidature en 60 s'],
                ['4', 'Tracker'],
              ] : language === 'IT' ? [
                ['1', 'CV'],
                ['2', 'Link annuncio'],
                ['3', 'Candidatura in 60 s'],
                ['4', 'Tracker'],
              ] : language === 'EN' ? [
                ['1', 'CV'],
                ['2', 'Job-ad link'],
                ['3', 'Application in 60 s'],
                ['4', 'Tracker'],
              ] : [
                ['1', 'Lebenslauf'],
                ['2', 'Inserat-Link'],
                ['3', 'Bewerbung in 60 Sek.'],
                ['4', 'Tracker'],
              ]) as [string, string][]).map(([num, label], i, arr) => (
                <React.Fragment key={num}>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="w-4 h-4 rounded-full bg-[#004225] dark:bg-[#00A854] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{num}</span>
                    <span className="text-[11px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] whitespace-nowrap">{label}</span>
                  </div>
                  {i < arr.length - 1 && <span className="text-[#9A9A94] text-[11px] select-none flex-shrink-0 px-0.5 hidden sm:inline">→</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="flex flex-col gap-5 w-full max-w-md">
              <CVDropzone
                onFileAccepted={processFile}
                isUploading={isUploading}
                t={t}
                variant="light"
                onClickOverride={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
              />

              {/* Reassure that nothing is required — a cold visitor should not
                  feel they must have a CV or a job link ready to begin. */}
              <p className="-mt-2 text-[11px] text-[#6B6B66] dark:text-[#9A9A94] font-light">
                {language === 'FR' ? "Optionnel : ça marche aussi sans CV et sans lien d'annonce, tu peux tout saisir à la main."
                  : language === 'IT' ? "Facoltativo: funziona anche senza CV e senza link dell'annuncio, puoi inserire tutto a mano."
                  : language === 'EN' ? 'Optional: it also works without a CV and without a job link, you can enter everything by hand.'
                  : 'Optional: geht auch ganz ohne Lebenslauf und ohne Inserat-Link, du kannst alles auch von Hand eingeben.'}
              </p>

              {/* Primary CTA — Premium glow */}
              <motion.button
                onClick={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="relative w-full bg-gradient-to-br from-[#004225] via-[#00592F] to-[#003820] text-white px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 group shadow-xl shadow-[#004225]/30 hover:shadow-2xl hover:shadow-[#004225]/50 overflow-hidden"
              >
                {/* Subtle inner shine on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
                {/* Soft outer glow ring */}
                <span className="absolute -inset-0.5 bg-gradient-to-br from-[#00A854]/0 via-[#00A854]/40 to-[#00A854]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" style={{ zIndex: -1 }} />
                <span className="relative">{t.cta_free}</span>
                <ArrowRight size={18} className="relative group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {/* ▶ Watch master video — only visible if a video ID is set */}
              {videoLibrary.master && (
                <button
                  onClick={() => setVideoModal({ id: videoLibrary.master!, title: language === 'FR' ? 'Stellify en 90 secondes' : language === 'IT' ? 'Stellify in 90 secondi' : language === 'EN' ? 'Stellify in 90 seconds' : 'Stellify in 90 Sekunden' })}
                  className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.25em] text-[#004225] dark:text-[#00A854] hover:gap-3 transition-all group"
                >
                  <span className="w-9 h-9 rounded-full border border-[#004225]/30 dark:border-[#00A854]/40 bg-[#004225]/5 dark:bg-[#00A854]/10 flex items-center justify-center group-hover:bg-[#004225] dark:group-hover:bg-[#00A854] group-hover:border-[#004225] dark:group-hover:border-[#00A854] transition-colors">
                    <Play size={12} className="fill-current group-hover:text-white dark:group-hover:text-[#1A1A18] ml-0.5" />
                  </span>
                  {language === 'FR' ? 'Stellify en 90 sec.'
                    : language === 'IT' ? 'Stellify in 90 sec.'
                    : language === 'EN' ? 'Stellify in 90 sec.'
                    : 'Stellify in 90 Sek.'}
                </button>
              )}

              {/* 3-step funnel */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
                className="hidden sm:flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] sm:text-[9px] font-bold uppercase tracking-widest"
              >
                <motion.span
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
                  className="flex items-center gap-1.5 text-[#004225] dark:text-[#00A854]"
                >
                  <span className="w-5 h-5 sm:w-4 sm:h-4 bg-[#004225] dark:bg-[#00A854] text-white text-[10px] sm:text-[8px] flex items-center justify-center rounded-full font-bold">1</span>
                  {language === 'FR' ? 'Inscription gratuite' : language === 'IT' ? 'Registrati gratis' : language === 'EN' ? 'Sign up free' : 'Gratis anmelden'}
                </motion.span>
                <motion.span variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3 } } }}>
                  <ArrowRight size={11} className="text-[#9A9A94] sm:hidden" />
                  <ArrowRight size={9} className="text-[#9A9A94] hidden sm:inline" />
                </motion.span>
                <motion.span
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
                  className="flex items-center gap-1.5 text-[#5C5C58] dark:text-[#9A9A94]"
                >
                  <span className="w-5 h-5 sm:w-4 sm:h-4 bg-black/10 dark:bg-white/10 text-[#4A4A45] dark:text-[#FAFAF8] text-[10px] sm:text-[8px] flex items-center justify-center rounded-full font-bold">2</span>
                  {language === 'FR' ? 'Choisir un plan' : language === 'IT' ? 'Scegli un piano' : language === 'EN' ? 'Pick a plan' : 'Plan wählen'}
                </motion.span>
                <motion.span variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3 } } }}>
                  <ArrowRight size={11} className="text-[#9A9A94] sm:hidden" />
                  <ArrowRight size={9} className="text-[#9A9A94] hidden sm:inline" />
                </motion.span>
                <motion.span
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
                  className="flex items-center gap-1.5 text-[#5C5C58] dark:text-[#9A9A94]"
                >
                  <span className="w-5 h-5 sm:w-4 sm:h-4 bg-black/10 dark:bg-white/10 text-[#4A4A45] dark:text-[#FAFAF8] text-[10px] sm:text-[8px] flex items-center justify-center rounded-full font-bold">3</span>
                  {language === 'FR' ? 'Lancer ta carrière' : language === 'IT' ? 'Lancia la carriera' : language === 'EN' ? 'Launch career' : 'Karriere starten'}
                </motion.span>
              </motion.div>

              {/* Risk reversal right under the primary CTA — the two doubts
                  that cost sign-ups: does it cost something, is it a trap. */}
              <p className="text-center text-[11px] text-[#9A9A94] font-light -mt-1">
                {language === 'FR' ? 'Sans carte de crédit · 3 candidatures offertes · données selon le droit suisse'
                  : language === 'IT' ? 'Senza carta di credito · 3 candidature in regalo · dati secondo il diritto svizzero'
                  : language === 'EN' ? 'No credit card · 3 applications on us · data under Swiss law'
                  : 'Keine Kreditkarte nötig · 3 Bewerbungen geschenkt · Daten nach Schweizer Recht'}
              </p>

              {/* Secondary links */}
              <div className="flex items-center justify-center gap-4 text-xs text-[#9A9A94]">
                <button
                  onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                  className="hover:text-[#004225] dark:hover:text-[#00A854] transition-colors"
                >
                  {t.nav_login}
                </button>
                <span className="w-px h-3 bg-black/10 dark:bg-white/10" />
                <button onClick={() => navigate('pricing')} className="hover:text-[#004225] dark:hover:text-[#00A854] transition-colors font-medium">
                  {language === 'FR' ? 'Dès CHF 9.90/mois, voir les plans →' : language === 'IT' ? 'Da CHF 9.90/mese, vedi i piani →' : language === 'EN' ? 'From CHF 9.90/mo, see plans →' : 'Ab CHF 9.90/Mo, Pläne ansehen →'}
                </button>
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
            {/* Honest, verifiable facts only. Invented success percentages
                would expose us the moment anyone asks for the source. */}
            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-12">
              <div>
                <span className="block text-3xl font-serif text-[#004225] dark:text-[#00A854]">CH</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">Swiss Made</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]"><CountUp to={4} duration={1000} /></span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">{language === 'FR' ? 'Langues' : language === 'IT' ? 'Lingue' : language === 'EN' ? 'Languages' : 'Sprachen'}</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]"><CountUp to={60} duration={1400} /><span className="text-xl">s</span></span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">{language === 'FR' ? 'Jusqu\'à la candidature' : language === 'IT' ? 'Alla candidatura' : language === 'EN' ? 'To your application' : 'Zur fertigen Bewerbung'}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative hidden lg:block"
          >
            {/* Application document preview — the core product in action.
                Hidden on mobile: the big showcase right below carries the
                proof there, and three letter mocks on one phone screen
                overwhelmed the page. */}
            <div className="bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 shadow-2xl relative z-10 transition-colors overflow-hidden">
              {/* Branded header band */}
              <div className="bg-[#004225] px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true" className="text-[#6FCF97]">
                    <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                  </svg>
                  <span className="text-white font-serif text-sm tracking-tight">Stell<span className="text-[#6FCF97]">ify</span></span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#6FCF97] border border-[#6FCF97]/30 px-1.5 py-0.5">
                    {language === 'FR' ? 'Candidature' : language === 'IT' ? 'Candidatura' : language === 'EN' ? 'Application' : 'Bewerbung'}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#6FCF97]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6FCF97] animate-pulse" />
                  {language === 'FR' ? 'Généré' : language === 'IT' ? 'Generato' : language === 'EN' ? 'Generated' : 'Fertig'}
                </span>
              </div>

              {/* Document body */}
              <div className="px-7 py-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-[68px] rounded-sm overflow-hidden shrink-0 border border-black/10 dark:border-white/15 flex items-end justify-center" style={{ backgroundColor: '#DCE9E2' }}>
                    <PresetAvatar id={previewAvatarId} className="w-[130%] h-auto -mb-[15%]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-[#1A1A18] dark:text-[#FAFAF8] leading-tight">{previewIdentity.name}</p>
                    <p className="text-[10px] text-[#004225] dark:text-[#6FCF97] font-semibold mt-0.5">Marketing Manager</p>
                    <p className="text-[10px] text-[#9A9A94] mt-0.5 truncate">Bahnhofstrasse 12 · 8001 Zürich · {previewIdentity.emailMask}</p>
                  </div>
                </div>

                <div className="my-5 h-px bg-black/8 dark:bg-white/8" />

                <p className="text-[10px] text-[#9A9A94] mb-2.5">13. Juni 2026</p>
                <p className="text-[12px] font-bold text-[#004225] dark:text-[#6FCF97] mb-3">
                  {language === 'FR' ? 'Candidature : Marketing Manager · UBS'
                    : language === 'IT' ? 'Candidatura: Marketing Manager · UBS'
                    : language === 'EN' ? 'Application: Marketing Manager · UBS'
                    : 'Bewerbung als Marketing Manager · UBS'}
                </p>
                <p className="text-[12px] text-[#1A1A18] dark:text-[#EBEBEB] mb-3">
                  {language === 'FR' ? 'Madame, Monsieur,' : language === 'IT' ? 'Gentili Signore e Signori,' : language === 'EN' ? 'Dear Sir or Madam,' : 'Sehr geehrte Damen und Herren,'}
                </p>
                {/* Letter body — real readable paragraphs, exactly like the
                    finished export. Grey skeleton bars looked like a draft,
                    not like the end result. */}
                <div className="space-y-2 mb-4 text-[10.5px] text-[#26261F] dark:text-[#D5D5CF] leading-[1.7]">
                  <p>
                    {language === 'FR'
                      ? "C'est avec grand intérêt que je postule au poste de Marketing Manager chez UBS. Ces trois dernières années, j'ai dirigé la stratégie de marque d'un prestataire financier suisse et renforcé la fidélité des clients de manière mesurable."
                      : language === 'IT'
                      ? 'Con grande interesse mi candido come Marketing Manager presso UBS. Negli ultimi tre anni ho guidato la strategia di marca di un fornitore di servizi finanziari svizzero, rafforzando in modo misurabile la fedeltà dei clienti.'
                      : language === 'EN'
                      ? 'I am applying with great interest for the Marketing Manager position at UBS. Over the past three years I have led the brand strategy of a Swiss financial services provider and measurably strengthened client loyalty.'
                      : 'mit grossem Interesse bewerbe ich mich als Marketing Manager bei der UBS. In den letzten drei Jahren habe ich die Markenstrategie eines Schweizer Finanzdienstleisters geführt und die Kundenbindung messbar gestärkt.'}
                  </p>
                  <p>
                    {language === 'FR'
                      ? 'Mon point fort est d\'allier une réflexion analytique à une gestion de marque créative. Grâce à mon trilinguisme (allemand, français, anglais) et à mon expérience des campagnes DACH, je corresponds précisément à vos exigences.'
                      : language === 'IT'
                      ? 'Il mio punto di forza è unire pensiero analitico e gestione creativa del marchio. Grazie al mio trilinguismo (tedesco, francese, inglese) e all\'esperienza in campagne DACH, corrispondo esattamente ai vostri requisiti.'
                      : language === 'EN'
                      ? 'My strength lies in combining analytical thinking with creative brand management. With my trilingual fluency (German, French, English) and DACH campaign experience, I match your requirements precisely.'
                      : 'Meine Stärke liegt in der Verbindung von analytischem Denken und kreativer Markenführung. Mit meiner Dreisprachigkeit (Deutsch, Französisch, Englisch) und meiner Erfahrung mit DACH-Kampagnen passe ich genau zu Ihren Anforderungen.'}
                  </p>
                  <p>
                    {language === 'FR'
                      ? "L'alliance de précision suisse et d'envergure internationale m'attire particulièrement. Je me réjouis de vous convaincre lors d'un entretien personnel."
                      : language === 'IT'
                      ? 'La combinazione di precisione svizzera e respiro internazionale mi attrae particolarmente. Sarei felice di presentarmi in un colloquio personale.'
                      : language === 'EN'
                      ? 'The blend of Swiss precision and international reach appeals to me greatly. I would be delighted to tell you more in a personal interview.'
                      : 'Die Verbindung von Schweizer Präzision und internationaler Ausrichtung reizt mich besonders. Gerne überzeuge ich Sie in einem persönlichen Gespräch.'}
                  </p>
                </div>
                <p className="text-[12px] text-[#1A1A18] dark:text-[#EBEBEB]">
                  {language === 'FR' ? 'Meilleures salutations' : language === 'IT' ? 'Cordiali saluti' : language === 'EN' ? 'Kind regards' : 'Freundliche Grüsse'}
                </p>
                <p className="font-serif text-[13px] text-[#1A1A18] dark:text-[#FAFAF8] mt-1">{previewIdentity.name}</p>
              </div>

              {/* Export footer */}
              <div className="border-t border-black/8 dark:border-white/8 px-6 py-3 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#2A2A26]">
                <span className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] font-light">
                  {language === 'FR' ? 'Créé en quelques minutes' : language === 'IT' ? 'Creato in pochi minuti' : language === 'EN' ? 'Created in minutes' : 'In wenigen Minuten erstellt'}
                </span>
                <div className="flex items-center gap-2">
                  {['PDF', 'WORD'].map(fmt => (
                    <span key={fmt} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#6FCF97] border border-[#004225]/20 dark:border-[#6FCF97]/30 px-2 py-1">
                      <Download size={9} />{fmt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 -z-10" />
          </motion.div>
        </section>
      ))}

      {/* --- MARKETING / OVERVIEW SECTIONS ---
           Shown for visitors (landing) and on the Preise page (pricing
           only). The logged-in Dashboard stays a focused app view: tools,
           stats and pipeline, without the marketing site repeating below.
           Hidden on profile / tools / jobs and on legal + about pages. */}
      {(!user || activeView === 'pricing') && activeView !== 'datenschutz' && activeView !== 'impressum' && activeView !== 'agb' && activeView !== 'about' && activeView !== 'ratgeber' && <>

      {/* --- BEWERBUNGS-GENERATOR SHOWCASE (hero feature, mirrors the tracker
           showcase below but flipped so the document preview reads left→right). */}
      {(!user || activeView === 'dashboard') && (
      <section className="px-6 lg:px-12 py-12 lg:py-20 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* A4 preview of a finished application — what the generator outputs.
              Real paragraph text (not gray skeleton lines) so visitors can
              actually read what comes out of the tool. Uses the logged-in
              user's name + email when available, otherwise a Swiss sample. */}
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto max-w-[520px]">
              <div className="absolute -top-3 -left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#004225] dark:bg-[#00A854] text-white text-[9px] font-bold tracking-[0.25em] uppercase shadow-md">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                {language === 'FR' ? 'Aperçu' : language === 'IT' ? 'Anteprima' : language === 'EN' ? 'Preview' : 'Vorschau'}
              </div>
              {/* Drop the fixed 1:1.414 A4 ratio — it forced 200-300px of
                  white space below the cover letter because the green
                  sidebar (photo + skills + languages) is the tall side. Now
                  the card height = max(left, right) and the Beilagen footer
                  on the right is pushed to the bottom via mt-auto, so both
                  columns end together. */}
              <div className="bg-white border border-black/10 dark:border-white/15 shadow-2xl shadow-black/15 dark:shadow-black/40 overflow-hidden">
                <div className="flex text-[#26261F]">
                  <div className="w-[36%] bg-[#004225] text-white p-5 sm:p-6 flex flex-col">
                    {/* Same illustrated portrait as every other example —
                        one consistent sample person across the whole site. */}
                    <div className="aspect-[4/5] w-full rounded-sm overflow-hidden border border-white/25 mb-4 flex items-end justify-center" style={{ backgroundColor: '#DCE9E2' }}>
                      <PresetAvatar id={previewAvatarId} className="w-[130%] h-auto -mb-[15%]" />
                    </div>
                    <p className="font-serif text-[15px] sm:text-[18px] font-bold leading-tight break-words hyphens-auto">{previewIdentity.name}</p>
                    <p className="text-[9px] sm:text-[11px] opacity-75 mt-1">Marketing Manager</p>
                    <div className="border-t border-white/25 mt-4 pt-3 text-[9px] sm:text-[10.5px] leading-[1.9] opacity-90 space-y-0.5">
                      <p>Bahnhofstrasse 12</p>
                      <p>8001 Zürich</p>
                      <p>+41 79 123 45 67</p>
                      <p className="break-all">{previewIdentity.emailMask}</p>
                    </div>
                    <div className="hidden sm:block mt-4 text-[9px] sm:text-[10.5px] leading-[1.8] opacity-85">
                      <p className="font-bold uppercase tracking-[1.5px] text-[8.5px] sm:text-[10px] opacity-100 mb-1.5">
                        {language === 'FR' ? 'Compétences' : language === 'IT' ? 'Competenze' : language === 'EN' ? 'Skills' : 'Fähigkeiten'}
                      </p>
                      {language === 'FR' ? (<>
                        <p>Stratégie de marque</p>
                        <p>Relation client · Réseaux sociaux</p>
                        <p>Analyse · Publicité</p>
                      </>) : language === 'IT' ? (<>
                        <p>Strategia di marca</p>
                        <p>Assistenza clienti · Social media</p>
                        <p>Analisi · Pubblicità</p>
                      </>) : language === 'EN' ? (<>
                        <p>Brand strategy</p>
                        <p>Client relations · Social media</p>
                        <p>Analytics · Advertising</p>
                      </>) : (<>
                        <p>Markenstrategie</p>
                        <p>Kundenbetreuung · Soziale Medien</p>
                        <p>Auswertung · Werbung</p>
                      </>)}
                    </div>
                    <div className="hidden sm:block mt-4 text-[9px] sm:text-[10.5px] leading-[1.8] opacity-85">
                      <p className="font-bold uppercase tracking-[1.5px] text-[8.5px] sm:text-[10px] opacity-100 mb-1.5">
                        {language === 'FR' ? 'Langues' : language === 'IT' ? 'Lingue' : language === 'EN' ? 'Languages' : 'Sprachen'}
                      </p>
                      <p>DE · {language === 'FR' ? 'Langue maternelle' : language === 'IT' ? 'Madrelingua' : language === 'EN' ? 'Native' : 'Muttersprache'}</p>
                      <p>FR · C1 · EN · C1</p>
                    </div>
                  </div>
                  <div className="flex-1 p-5 sm:p-7 font-serif flex flex-col">
                    <p className="text-[10px] sm:text-[12px] text-[#6B6B66]">14. Mai 2026</p>
                    <p className="text-[13px] sm:text-[15px] font-bold text-[#004225] mt-2.5 mb-3 leading-snug">
                      {language === 'FR' ? 'Candidature au poste de Marketing Manager · Nestlé'
                        : language === 'IT' ? 'Candidatura come Marketing Manager · Nestlé'
                        : language === 'EN' ? 'Application: Marketing Manager · Nestlé'
                        : 'Bewerbung als Marketing Manager · Nestlé'}
                    </p>
                    <p className="text-[11px] sm:text-[13px] mb-2.5">
                      {language === 'FR' ? 'Madame, Monsieur,' : language === 'IT' ? 'Gentili Signore e Signori,' : language === 'EN' ? 'Dear Sir or Madam,' : 'Sehr geehrte Damen und Herren,'}
                    </p>
                    <div className="text-[11px] sm:text-[13px] leading-[1.75] text-[#26261F] space-y-2.5">
                      <p>
                        {language === 'FR'
                          ? "C'est avec grand intérêt que je postule au poste de Marketing Manager chez Nestlé. Votre approche de durabilité et de marques locales correspond exactement à ce que je veux faire avancer."
                          : language === 'IT'
                          ? "Con grande interesse mi candido per la posizione di Marketing Manager presso Nestlé. Il vostro approccio alla sostenibilità e ai marchi locali è esattamente ciò che voglio promuovere."
                          : language === 'EN'
                          ? 'I am applying with great enthusiasm for the position of Marketing Manager at Nestlé. Your approach to sustainability and local brands is exactly the direction I want to help drive forward.'
                          : 'mit grossem Interesse bewerbe ich mich für die Position als Marketing Manager bei Nestlé. Ihre Strategie für nachhaltige Marken und den Schweizer Markt entspricht exakt dem, was ich vorantreiben möchte.'}
                      </p>
                      <p>
                        {language === 'FR'
                          ? "Depuis trois ans, je dirige la stratégie de marque d'un grand acteur suisse des biens de consommation. J'ai augmenté la notoriété de la marque de 28% avec un budget de 1,2 MCHF et lancé deux nouveaux produits sur les marchés DACH."
                          : language === 'IT'
                          ? "Da tre anni guido la strategia di marca di un importante operatore svizzero dei beni di consumo. Ho aumentato la notorietà del marchio del 28% con un budget di 1,2 milioni di CHF e lanciato due nuovi prodotti sui mercati DACH."
                          : language === 'EN'
                          ? 'For three years I have led the brand strategy of a major Swiss consumer goods player. I grew brand awareness by 28% on a CHF 1.2 m budget and launched two new products across the DACH markets.'
                          : 'Seit drei Jahren verantworte ich die Markenstrategie eines führenden Schweizer Konsumgüterherstellers. Mit einem Budget von CHF 1,2 Mio. steigerte ich die Markenbekanntheit um 28% und lancierte zwei Neuprodukte in der DACH-Region.'}
                      </p>
                      <p className="hidden sm:block">
                        {language === 'FR'
                          ? "Nestlé m'attire pour la combinaison entre racines suisses et portée internationale : un environnement où les décisions locales déterminent la voix d'une marque mondiale. C'est exactement ce dont je veux assumer la responsabilité."
                          : language === 'IT'
                          ? "Nestlé mi attrae per la combinazione tra radici svizzere e portata internazionale: un ambiente in cui le decisioni locali plasmano la voce di un marchio globale. È esattamente ciò di cui voglio assumermi la responsabilità."
                          : language === 'EN'
                          ? 'What draws me to Nestlé is the blend of Swiss roots and global reach, an environment where local decisions shape the voice of a worldwide brand. That is exactly the responsibility I want to take on.'
                          : 'An Nestlé reizt mich die Kombination aus Schweizer Wurzeln und globaler Reichweite, ein Umfeld, in dem lokale Entscheidungen die Stimme einer weltweit gehörten Marke prägen. Genau diese Verantwortung möchte ich übernehmen.'}
                      </p>
                      <p className="hidden sm:block">
                        {language === 'FR'
                          ? "Ma combinaison entre rigueur analytique, trilinguisme (DE/FR/EN) et expérience des campagnes DACH correspond aux exigences de votre offre. Je me réjouis d'en discuter en personne."
                          : language === 'IT'
                          ? "La mia combinazione di rigore analitico, trilinguismo (DE/FR/EN) ed esperienza nelle campagne DACH corrisponde ai vostri requisiti. Sarei lieto di approfondire in un colloquio personale."
                          : language === 'EN'
                          ? 'My mix of analytical rigour, trilingual fluency (DE/FR/EN) and DACH campaign experience fits your requirements. I would welcome the chance to discuss this in person.'
                          : 'Meine Kombination aus analytischer Stärke, Dreisprachigkeit (DE/FR/EN) und Erfahrung mit DACH-Kampagnen passt zu Ihren Anforderungen. Auf ein persönliches Gespräch freue ich mich.'}
                      </p>
                    </div>
                    <p className="text-[11px] sm:text-[13px] mt-3 mb-0.5">
                      {language === 'FR' ? 'Meilleures salutations' : language === 'IT' ? 'Cordiali saluti' : language === 'EN' ? 'Kind regards' : 'Freundliche Grüsse'}
                    </p>
                    <p className="text-[11px] sm:text-[13px] font-bold">{previewIdentity.name}</p>
                    {/* Beilagen footer — pushed to the bottom so both columns
                        end at the same line, no dangling whitespace below. */}
                    <div className="mt-auto pt-4 border-t border-[#26261F]/10 text-[8px] sm:text-[9.5px] text-[#6B6B66] leading-[1.6]">
                      <p className="font-bold uppercase tracking-[1.5px] mb-0.5">
                        {language === 'FR' ? 'Annexes' : language === 'IT' ? 'Allegati' : language === 'EN' ? 'Enclosures' : 'Beilagen'}
                      </p>
                      <p>
                        {language === 'FR' ? 'CV · Certificats de travail · Diplômes · Référence'
                          : language === 'IT' ? 'CV · Certificati di lavoro · Diplomi · Referenze'
                          : language === 'EN' ? 'CV · References · Diplomas · Recommendation'
                          : 'Lebenslauf · Arbeitszeugnisse · Diplome · Referenzen'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating mini "PDF · DOCX" chip */}
              <div className="absolute -bottom-3 -right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#1A1A18] border border-[#004225]/25 dark:border-[#00A854]/40 text-[#004225] dark:text-[#00A854] text-[9px] font-bold tracking-[0.2em] uppercase shadow-md">
                <Download size={10} />
                PDF · Word
              </div>
            </div>
          </div>
          {/* Right: copy + CTA */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
              <Sparkles size={11} />
              {language === 'FR' ? 'Outil principal' : language === 'IT' ? 'Strumento principale' : language === 'EN' ? 'Headline tool' : 'Haupt-Tool'}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] mb-4 leading-[1.1]">
              {language === 'FR' ? 'Ta candidature complète. En moins de 60 secondes.'
                : language === 'IT' ? 'La tua candidatura completa. In meno di 60 secondi.'
                : language === 'EN' ? 'A complete application. In under 60 seconds.'
                : 'Deine ganze Bewerbung. In unter 60 Sekunden.'}
            </h2>
            <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed mb-6 max-w-lg">
              {language === 'FR'
                ? 'Design, lien de l\'offre, et Stella écrit lettre et profil sur mesure. Presque rien à faire : modèles et suggestions, tu ne remplis que les blancs. Le tout pour une fraction du prix des grandes IA.'
                : language === 'IT'
                ? 'Design, link dell\'annuncio, e Stella scrive lettera e profilo su misura. Quasi nulla da fare: modelli e suggerimenti, riempi solo gli spazi. Il tutto a una frazione del prezzo delle grandi IA.'
                : language === 'EN'
                ? 'Design, job link, and Stella writes the matching letter and profile. Almost nothing to do: templates and suggestions, you just fill the gaps. All for a fraction of what big AI tools cost.'
                : 'Design, Stellen-Link, und Stella schreibt Anschreiben und Profil auf dich zugeschnitten. Kaum Aufwand: Vorlagen und Vorschläge, du füllst nur die Lücken. Und das für einen Bruchteil der Kosten grosser KI-Tools.'}
            </p>
            <ul className="space-y-2.5 mb-8">
              {[
                language === 'FR' ? ['En moins de 60 secondes, prête à envoyer en PDF', 'Pas seulement la lettre : profil court, compétences et 10 questions d\'entretien pour te préparer, inclus', 'Presque rien à faire : modèles et suggestions, tu remplis les blancs', '6 designs originaux + ton propre design', 'Import par lien et ton CV repris automatiquement', 'Une fraction du prix des grandes IA']
                : language === 'IT' ? ['In meno di 60 secondi, pronta da inviare in PDF', 'Non solo la lettera: profilo breve, competenze e 10 domande da colloquio per prepararti, inclusi', 'Quasi nulla da fare: modelli e suggerimenti, riempi gli spazi', '6 design originali + il tuo design', 'Import da link e il tuo CV ripreso in automatico', 'Una frazione del prezzo delle grandi IA']
                : language === 'EN' ? ['Ready in under 60 seconds, send-ready as PDF', 'Not just the letter: short profile, skills and 10 interview questions to prepare, all included', 'Almost nothing to do: templates and suggestions, you fill the gaps', '6 original designs + your own custom design', 'Link import and your CV reused automatically', 'A fraction of what big AI tools cost']
                : ['In unter 60 Sekunden fertig, versandbereit als PDF', 'Nicht nur der Brief: Kurzprofil, Skills und 10 Interview-Fragen zur Vorbereitung inklusive', 'Kaum Aufwand: Vorlagen und Vorschläge, du füllst nur die Lücken', '6 originale Designs + dein eigenes Custom-Design', 'Stellen-Import per Link und dein Lebenslauf automatisch übernommen', 'Ein Bruchteil der Kosten grosser KI-Tools']
              ][0].map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-[#1A1A18] dark:text-[#FAFAF8] font-light">
                  <CheckCircle2 size={16} className="shrink-0 text-[#004225] dark:text-[#00A854] mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                if (user) {
                  const tool = tools.find((tl: any) => tl.id === 'bewerbungs-gen') || null;
                  if (tool) setActiveTool(tool);
                } else {
                  setAuthTab('register');
                  setIsAuthModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
            >
              {language === 'FR' ? 'Ouvrir le générateur' : language === 'IT' ? 'Apri il generatore' : language === 'EN' ? 'Open the generator' : 'Generator öffnen'}
              <ArrowRight size={14} />
            </button>

            {/* Complete Swiss application-dossier checklist. Pflicht /
                Häufig verlangt / Optional so visitors know exactly what's
                covered. Foto is flagged as optional per Swiss best practice. */}
            {(() => {
              const groups = language === 'FR' ? [
                { title: 'Obligatoire', tone: 'primary', items: ['CV (données personnelles, expérience, formation, langues, IT)', 'Lettre de motivation (pourquoi toi, pourquoi cette entreprise)'] },
                { title: 'Souvent demandé', tone: 'neutral', items: ['Certificats de travail (actuel + précédents)', 'Diplômes & certificats (CFC, études, CAS/MAS)'] },
                { title: 'Optionnel', tone: 'muted', items: ['Photo professionnelle (peut être insérée librement)', 'Références (2 à 3 personnes ou « sur demande »)', 'Portfolio (design, IT, marketing, gestion de projet)'] },
              ] : language === 'IT' ? [
                { title: 'Obbligatorio', tone: 'primary', items: ['CV (dati personali, esperienza, formazione, lingue, IT)', 'Lettera di motivazione (perché te, perché questa azienda)'] },
                { title: 'Spesso richiesto', tone: 'neutral', items: ['Certificati di lavoro (attuale + precedenti)', 'Diplomi & certificati (AFC, studi, CAS/MAS)'] },
                { title: 'Opzionale', tone: 'muted', items: ['Foto professionale (inseribile liberamente)', 'Referenze (2 a 3 persone o « su richiesta »)', 'Portfolio (design, IT, marketing, project management)'] },
              ] : language === 'EN' ? [
                { title: 'Required', tone: 'primary', items: ['CV (personal info, experience, education, languages, IT)', 'Cover letter (why you, why this company)'] },
                { title: 'Often expected', tone: 'neutral', items: ['Work references (current + previous)', 'Diplomas & certificates (apprenticeship, degree, CAS/MAS)'] },
                { title: 'Optional', tone: 'muted', items: ['Professional photo (you can drop yours in)', 'Personal references (2 to 3 contacts or "on request")', 'Portfolio (design, IT, marketing, project management)'] },
              ] : [
                { title: 'Pflicht', tone: 'primary', items: ['Lebenslauf (Persönliches, Erfahrung, Ausbildung, Sprachen, IT)', 'Motivationsschreiben (warum du, warum diese Firma)'] },
                { title: 'Häufig verlangt', tone: 'neutral', items: ['Arbeitszeugnisse (aktuell + frühere)', 'Diplome & Zertifikate (Berufsabschluss, Studium, CAS/MAS)'] },
                { title: 'Optional', tone: 'muted', items: ['Foto (kannst du ganz einfach selbst einfügen)', 'Referenzen (2 bis 3 Personen oder „auf Anfrage")', 'Portfolio (Design, IT, Marketing, Projektleitung)'] },
              ];
              const heading = language === 'FR' ? 'Dossier complet, tout ce que la candidature suisse exige'
                : language === 'IT' ? 'Dossier completo, tutto ciò che la candidatura svizzera richiede'
                : language === 'EN' ? 'Complete dossier, everything a Swiss application needs'
                : 'Komplettes Dossier, alles was eine Schweizer Bewerbung braucht';
              return (
                <div className="hidden lg:block mt-10 max-w-lg">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#004225] dark:text-[#00A854] mb-3">{heading}</p>
                  <div className="space-y-3.5">
                    {groups.map((g, i) => (
                      <div key={i} className="border-l-2 pl-3.5" style={{ borderLeftColor: g.tone === 'primary' ? '#004225' : g.tone === 'neutral' ? 'rgba(0,66,37,0.45)' : 'rgba(0,66,37,0.22)' }}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${g.tone === 'primary' ? 'text-[#004225] dark:text-[#00A854]' : g.tone === 'neutral' ? 'text-[#4A4A45] dark:text-[#9A9A94]' : 'text-[#6B6B66] dark:text-[#7A7A75]'}`}>{g.title}</p>
                        <ul className="space-y-1">
                          {g.items.map((it, j) => (
                            <li key={j} className="flex gap-2 text-[12px] text-[#1A1A18] dark:text-[#EBEBEB] font-light leading-snug">
                              <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-[#004225] dark:text-[#00A854]" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>
      )}

      {/* --- TRACKER SHOWCASE --- */}
      {(!user || activeView === 'dashboard') && (
      <section className="px-6 lg:px-12 py-12 lg:py-20 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854]" />
              {language === 'FR' ? 'Inclus · Gratuit' : language === 'IT' ? 'Incluso · Gratis' : language === 'EN' ? 'Included · Free' : 'Inklusive · Gratis'}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] mb-4 leading-[1.1]">
              {language === 'FR' ? 'Garde toutes tes candidatures sous contrôle.'
                : language === 'IT' ? 'Tieni tutte le candidature sotto controllo.'
                : language === 'EN' ? 'Every application, in one clear view.'
                : 'Alle Bewerbungen im Blick. Immer.'}
            </h2>
            <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed mb-8 max-w-lg">
              {language === 'FR'
                ? 'Une vue d\'ensemble simple : Postulé, Entretien, Offre. Glisse les cartes, ajoute des notes, et Stellify calcule en direct ton taux d\'entretiens et de succès. Inclus dans chaque plan, même le Gratuit.'
                : language === 'IT'
                ? 'Una panoramica semplice: Inviato, Colloquio, Offerta. Trascina le carte, aggiungi note, e Stellify calcola in tempo reale il tuo tasso di colloqui e di successo. Incluso in ogni piano, anche quello Gratuito.'
                : language === 'EN'
                ? 'A simple overview: Applied, Interview, Offer. Drag the cards, add notes, and Stellify computes your interview and offer rate live. Included on every plan, Free included.'
                : 'Eine einfache Übersicht: Beworben, Interview, Angebot. Karten verschieben, Notizen hinzufügen, und Stellify rechnet Interview- und Erfolgsquote live aus. In jedem Plan dabei, auch im Gratis-Plan.'}
            </p>
            <button
              onClick={() => user ? navigate('dashboard') : setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
            >
              {language === 'FR' ? 'Ouvrir le tracker' : language === 'IT' ? 'Apri il tracker' : language === 'EN' ? 'Open the tracker' : 'Tracker öffnen'}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mini-Kanban Preview + live stats strip (folded in from the old
              standalone pipeline section, one tracker section, not two). */}
          <div className="space-y-4">
            <div className="bg-[#FDFCFB] dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 p-5 sm:p-6 shadow-sm">
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: language === 'FR' ? 'Postulé' : language === 'IT' ? 'Inviato' : language === 'EN' ? 'Applied' : 'Beworben',
                    count: 4,
                    color: '#9A9A94',
                    cards: [
                      { company: 'Roche', title: 'Data Analyst' },
                      { company: 'PostFinance', title: language === 'FR' ? 'UX Designer' : 'UX Designer' },
                    ]
                  },
                  {
                    label: language === 'FR' ? 'Entretien' : language === 'IT' ? 'Colloquio' : language === 'EN' ? 'Interview' : 'Interview',
                    count: 2,
                    color: '#D4A852',
                    cards: [
                      { company: 'Swisscom', title: language === 'FR' ? 'Product Manager' : language === 'IT' ? 'Product Manager' : 'Product Manager' },
                    ]
                  },
                  {
                    label: language === 'FR' ? 'Offre' : language === 'IT' ? 'Offerta' : language === 'EN' ? 'Offer' : 'Angebot',
                    count: 1,
                    color: '#004225',
                    cards: [
                      { company: 'Nestlé', title: 'Marketing Lead', salary: 'CHF 120k' },
                    ]
                  },
                ].map((col, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: col.color }}>{col.label}</span>
                      <span className="text-[9px] font-bold text-[#9A9A94]">{col.count}</span>
                    </div>
                    {col.cards.map((card, j) => (
                      <div key={j} className="bg-white dark:bg-[#1A1A18] border-l-2 p-2.5 shadow-sm" style={{ borderLeftColor: col.color }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A94] truncate">{card.company}</p>
                        <p className="text-xs font-medium text-[#1A1A18] dark:text-[#FAFAF8] truncate mt-0.5">{card.title}</p>
                        {(card as any).salary && (
                          <p className="text-[10px] text-[#004225] dark:text-[#00A854] font-bold mt-1">{(card as any).salary}</p>
                        )}
                      </div>
                    ))}
                    <div className="border border-dashed border-black/10 dark:border-white/10 h-8 flex items-center justify-center">
                      <span className="text-[#9A9A94] text-base leading-none">+</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Live stats strip */}
            <div className="bg-white dark:bg-[#1A1A18] border border-black/8 dark:border-white/8 shadow-sm grid grid-cols-3 divide-x divide-black/5 dark:divide-white/5">
              {[
                { value: '20', color: 'text-[#1A1A18] dark:text-[#FAFAF8]', label: language === 'FR' ? 'Candidatures' : language === 'IT' ? 'Candidature' : language === 'EN' ? 'Applications' : 'Bewerbungen' },
                { value: '5', color: 'text-[#D4A852]', label: language === 'FR' ? 'En entretien' : language === 'IT' ? 'In colloquio' : language === 'EN' ? 'In interview' : 'Im Interview' },
                { value: '2', color: 'text-[#004225] dark:text-[#00A854]', label: language === 'FR' ? 'Offres' : language === 'IT' ? 'Offerte' : language === 'EN' ? 'Offers' : 'Angebote' },
              ].map((stat, i) => (
                <div key={i} className="py-4 px-2 text-center">
                  <p className={`text-2xl sm:text-3xl font-serif leading-none ${stat.color}`}>{stat.value}</p>
                  <p className="text-[8.5px] font-bold uppercase tracking-widest text-[#9A9A94] mt-1.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[9px] font-mono uppercase tracking-widest text-[#9A9A94]">
              {language === 'FR' ? 'Exemple, tes chiffres se calculent automatiquement'
                : language === 'IT' ? 'Esempio, i tuoi numeri si calcolano automaticamente'
                : language === 'EN' ? 'Example, your numbers compute automatically'
                : 'Beispiel, deine Zahlen rechnen sich automatisch'}
            </p>
          </div>
        </div>
      </section>
      )}
      {/* --- TOOLS QUICK START --- Two large product cards, each with a big
           readable example inside a mini app window. Replaces the old thin
           multi-tool grid; sits after both showcases as the action step. */}
      {(!user || activeView === 'dashboard') && (
      <section id="tools" className="px-6 lg:px-12 py-12 lg:py-20 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#004225] dark:text-[#00A854] mb-3">{t.tools_badge}</p>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.tools_title}</h2>
            <p className="mt-4 text-[#5C5C58] dark:text-[#9A9A94] font-light">
              {language === 'FR' ? 'Deux outils, un objectif: ton prochain poste. Choisis et commence directement.'
                : language === 'IT' ? 'Due strumenti, un obiettivo: il tuo prossimo posto. Scegli e inizia subito.'
                : language === 'EN' ? 'Two tools, one goal: your next job. Pick one and start right away.'
                : 'Zwei Werkzeuge, ein Ziel: deine nächste Stelle. Wähle eines und leg direkt los.'}
            </p>
          </div>

          <DesktopTip language={language} className="max-w-md mx-auto mb-8" />

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {tools.map((tool: any) => (
              <motion.div
                key={tool.id}
                whileHover={{ y: -4 }}
                onClick={() => handleToolClick(tool.id)}
                className="group relative cursor-pointer bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 hover:border-[#004225]/25 dark:hover:border-[#00A854]/40 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col"
              >
                {/* Light sweep across the card on hover — quiet, premium */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                  <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-[500%] transition-transform duration-1000 ease-out" />
                </span>
                {/* Card head */}
                <div className="p-7 md:p-8 pb-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 shrink-0 bg-[#FDFCFB] dark:bg-[#2A2A26] flex items-center justify-center text-[#004225] dark:text-[#00A854] group-hover:bg-[#004225] group-hover:text-white transition-all">
                      {tool.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl md:text-2xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tool.title}</h3>
                      <p className="text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light mt-1 leading-relaxed">{tool.desc}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/10 px-2 py-1">{tool.badge}</span>
                </div>

                {/* Big example in a mini app window */}
                <div className="px-7 md:px-8">
                  <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-md bg-[#FDFCFB] dark:bg-[#1F1F1C]">
                    <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#F4F3F0] dark:bg-[#2A2A26] border-b border-black/6 dark:border-white/6">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E8837B]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E8C57B]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7BC98F]" />
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A9A94] truncate">
                        {tool.title} · {language === 'FR' ? 'Exemple' : language === 'IT' ? 'Esempio' : language === 'EN' ? 'Example' : 'Beispiel'}
                      </span>
                    </div>
                    <div className="p-5 md:p-6">
                      {tool.id === 'bewerbungs-gen' ? (
                        <div className="space-y-2.5">
                          {/* Step 1: the pasted job-ad link, already imported */}
                          <div className="flex items-center gap-2 bg-white dark:bg-[#26261F] border border-black/8 dark:border-white/8 rounded-sm px-3 py-2 min-w-0">
                            <Link2 size={12} className="text-[#9A9A94] shrink-0" />
                            <span className="flex-1 min-w-0 text-[11px] font-medium text-[#5C5C58] dark:text-[#9A9A94] truncate">jobs.ch/stellen/marketing-manager-nestle</span>
                            <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/12 px-1.5 py-0.5 rounded">
                              <CheckCircle2 size={9} />{language === 'FR' ? 'Importé' : language === 'IT' ? 'Importato' : language === 'EN' ? 'Imported' : 'Importiert'}
                            </span>
                          </div>
                          {/* Step 2: CV and photo picked up automatically */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2 py-1 rounded-full">
                              <FileText size={10} />{language === 'FR' ? 'CV repris automatiquement' : language === 'IT' ? 'CV ripreso automaticamente' : language === 'EN' ? 'CV applied automatically' : 'Lebenslauf automatisch übernommen'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-[#004225] dark:text-[#00A854] bg-[#004225]/6 dark:bg-[#00A854]/10 px-2 py-1 rounded-full">
                              <ImageIcon size={10} />{language === 'FR' ? 'Photo intégrée' : language === 'IT' ? 'Foto inserita' : language === 'EN' ? 'Photo placed' : 'Foto eingefügt'}
                            </span>
                          </div>
                          {/* Step 3: the finished document */}
                        <div className="bg-white dark:bg-[#26261F] border border-black/8 dark:border-white/8 rounded-sm shadow-sm overflow-hidden">
                          <div className="bg-[#004225] px-4 py-3 flex items-center justify-between gap-3">
                            <span className="text-white text-sm font-serif font-bold truncate">{previewIdentity.name}</span>
                            <span className="text-[#6FCF97] text-[10px] font-bold uppercase tracking-widest shrink-0">Marketing Manager</span>
                          </div>
                          <div className="p-4 md:p-5 space-y-2.5">
                            {/* Photo inside the document, top right — like a real Swiss application. */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2.5 min-w-0 pt-0.5">
                                <p className="text-[13px] font-bold text-[#004225] dark:text-[#00A854]">
                                  {language === 'FR' ? 'Candidature: Marketing Manager · Nestlé' : language === 'IT' ? 'Candidatura: Marketing Manager · Nestlé' : language === 'EN' ? 'Application: Marketing Manager · Nestlé' : 'Bewerbung als Marketing Manager · Nestlé'}
                                </p>
                                <p className="text-[13px] text-[#26261F] dark:text-[#D5D5CF]">
                                  {language === 'FR' ? 'Madame, Monsieur,' : language === 'IT' ? 'Gentili Signore e Signori,' : language === 'EN' ? 'Dear Sir or Madam,' : 'Sehr geehrte Damen und Herren,'}
                                </p>
                              </div>
                              <span className="shrink-0 w-14 h-14 rounded-sm overflow-hidden border border-black/10 dark:border-white/15 shadow-sm" style={{ backgroundColor: AVATAR_PRESETS.find(p => p.id === previewAvatarId)?.bg }}>
                                <PresetAvatar id={previewAvatarId} className="w-full h-full" />
                              </span>
                            </div>
                            <p className="text-[13px] text-[#26261F] dark:text-[#D5D5CF] leading-relaxed min-h-[4.5em]">
                              <TypeText
                                speed={16}
                                text={language === 'FR' ? "C'est avec grand intérêt que je postule au poste de Marketing Manager chez Nestlé. Depuis trois ans, je dirige la stratégie de marque d'un fabricant suisse de biens de consommation et j'ai augmenté la notoriété de la marque de 28 pour cent."
                                  : language === 'IT' ? 'con grande interesse mi candido come Marketing Manager presso Nestlé. Da tre anni guido la strategia di marca di un produttore svizzero di beni di consumo e ho aumentato la notorietà del marchio del 28 per cento.'
                                  : language === 'EN' ? 'I am applying with great interest for the Marketing Manager position at Nestlé. For three years I have led the brand strategy of a Swiss consumer goods company and increased brand awareness by 28 percent.'
                                  : 'mit grossem Interesse bewerbe ich mich als Marketing Manager bei Nestlé. Seit drei Jahren verantworte ich die Markenstrategie eines Schweizer Konsumgüterherstellers und habe die Markenbekanntheit um 28 Prozent gesteigert.'}
                              />
                            </p>
                            <div className="flex items-center gap-2 pt-1.5">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/25 dark:border-[#00A854]/40 px-2.5 py-1 rounded"><Download size={11} />PDF</span>
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] border border-[#004225]/25 dark:border-[#00A854]/40 px-2.5 py-1 rounded"><Download size={11} />Word</span>
                              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]"><CheckCircle2 size={12} className="text-[#004225] dark:text-[#00A854]" />{language === 'FR' ? 'Prêt' : language === 'IT' ? 'Pronto' : language === 'EN' ? 'Ready' : 'Fertig'}</span>
                            </div>
                          </div>
                        </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2.5">
                            {[
                              { n: '4', l: language === 'FR' ? 'Candidatures' : language === 'IT' ? 'Candidature' : language === 'EN' ? 'Applications' : 'Bewerbungen' },
                              { n: '1', l: 'Interview' },
                              { n: '1', l: language === 'FR' ? 'Offre' : language === 'IT' ? 'Offerta' : language === 'EN' ? 'Offer' : 'Angebot' },
                            ].map((s, i) => (
                              <div key={i} className="bg-white dark:bg-[#26261F] border border-black/8 dark:border-white/8 rounded-sm px-2 py-2.5 text-center">
                                <p className="text-xl font-serif text-[#004225] dark:text-[#00A854] leading-none">{s.n}</p>
                                <p className="text-[8.5px] font-bold uppercase tracking-widest text-[#9A9A94] mt-1">{s.l}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2.5">
                            {[
                              { l: language === 'FR' ? 'Envoyées' : language === 'IT' ? 'Inviate' : language === 'EN' ? 'Applied' : 'Beworben', c: '#9A9A94', items: ['Roche', 'PostFinance'] },
                              { l: 'Interview', c: '#D4A852', items: ['Swisscom'] },
                              { l: language === 'FR' ? 'Offre' : language === 'IT' ? 'Offerta' : language === 'EN' ? 'Offer' : 'Angebot', c: '#004225', items: ['Nestlé'] },
                            ].map((col, i) => (
                              <div key={i} className="space-y-1.5">
                                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: col.c }}>{col.l}</p>
                                {col.items.map((it, j) => (
                                  <div key={j} className="bg-white dark:bg-[#26261F] border-l-2 px-2 py-1.5 text-[11px] font-medium text-[#1A1A18] dark:text-[#EBEBEB] shadow-sm" style={{ borderLeftColor: col.c }}>{it}</div>
                                ))}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 bg-[#004225]/6 dark:bg-[#00A854]/10 border border-[#004225]/20 dark:border-[#00A854]/25 rounded-sm px-3 py-2">
                            <Bell size={12} className="text-[#004225] dark:text-[#00A854] shrink-0" />
                            <p className="text-[11px] font-medium text-[#004225] dark:text-[#00A854]">{language === 'FR' ? 'Relancer: Swisscom · dans 3 jours' : language === 'IT' ? 'Follow-up: Swisscom · tra 3 giorni' : language === 'EN' ? 'Follow up: Swisscom · in 3 days' : 'Nachfassen: Swisscom · in 3 Tagen'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA row */}
                <div className="p-7 md:p-8 pt-6 mt-auto flex items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(tool.id === 'bewerbungs-gen'
                      ? (language === 'FR' ? ['Import par lien', 'Photo', 'PDF & Word'] : language === 'IT' ? ['Import da link', 'Foto', 'PDF & Word'] : language === 'EN' ? ['Link import', 'Photo', 'PDF & Word'] : ['Link-Import', 'Foto', 'PDF & Word'])
                      : (language === 'FR' ? ['Pipeline', 'Rappels', 'Statistiques'] : language === 'IT' ? ['Pipeline', 'Promemoria', 'Statistiche'] : language === 'EN' ? ['Pipeline', 'Reminders', 'Statistics'] : ['Pipeline', 'Erinnerungen', 'Statistiken'])
                    ).map((chip: string) => (
                      <span key={chip} className="text-[10px] font-medium text-[#5C5C58] dark:text-[#9A9A94] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-1 rounded">{chip}</span>
                    ))}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">
                    {t.tool_open}
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}
      {/* --- STELLIFY VS CHAT AI --- The one big advantage, spelled out:
           a chat gives you text, Stellify hands you the finished
           application. Honest, concrete, side by side. */}
      {(!user || activeView === 'dashboard') && (
      <section className="px-6 lg:px-12 py-12 lg:py-20 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#004225] dark:text-[#00A854] mb-3">
              {language === 'FR' ? 'La grande différence' : language === 'IT' ? 'La grande differenza' : language === 'EN' ? 'The big difference' : 'Der grosse Unterschied'}
            </p>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">
              {language === 'FR' ? 'Pourquoi pas une simple IA de chat ?' : language === 'IT' ? 'Perché non una semplice chat IA?' : language === 'EN' ? 'Why not just a chat AI?' : 'Warum nicht einfach eine Chat-KI?'}
            </h2>
            <p className="mt-4 text-lg text-[#5C5C58] dark:text-[#9A9A94] font-light">
              {language === 'FR' ? 'Un chat te donne du texte. Stellify te donne la candidature finie.'
                : language === 'IT' ? 'Una chat ti dà testo. Stellify ti dà la candidatura finita.'
                : language === 'EN' ? 'A chat gives you text. Stellify hands you the finished application.'
                : 'Ein Chat gibt dir Text. Stellify gibt dir die fertige Bewerbung.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Chat AI — the manual way */}
            <div className="p-7 sm:p-9 bg-[#F4F3F0] dark:bg-[#22221F] border border-black/5 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9A9A94] mb-1">{language === "FR" ? "IA de chat classique" : language === "IT" ? "Chat IA classica" : language === "EN" ? "Classic chat AI" : "Herkömmliche Chat-KI"}</p>
              <p className="text-xl font-serif text-[#5C5C58] dark:text-[#9A9A94] mb-6">
                {language === 'FR' ? 'De bons textes. Ensuite, ton travail commence.' : language === 'IT' ? 'Buoni testi. Poi inizia il tuo lavoro.' : language === 'EN' ? 'Good text. Then your work begins.' : 'Gute Texte. Danach beginnt deine Arbeit.'}
              </p>
              <ul className="space-y-3.5">
                {(language === 'FR' ? [
                  'Écrire les prompts, copier le texte, tout formater toi-même dans Word',
                  'Réexpliquer ton CV et ta photo à chaque nouvelle candidature',
                  'Pas de standard suisse automatique, les tournures sonnent souvent allemandes',
                  'Pas de document fini : pas de design, pas d\'export PDF et Word',
                  'Aucune vue d\'ensemble : candidatures, délais et relances restent dans ta tête',
                ] : language === 'IT' ? [
                  'Scrivere i prompt, copiare il testo, formattare tutto da solo in Word',
                  'Rispiegare CV e foto a ogni nuova candidatura',
                  'Nessuno standard svizzero automatico, le formule suonano spesso tedesche',
                  'Nessun documento finito: niente design, niente export PDF e Word',
                  'Nessuna panoramica: candidature, scadenze e follow-up restano nella tua testa',
                ] : language === 'EN' ? [
                  'Write prompts, copy text, format everything yourself in Word',
                  'Re-explain your CV and photo for every single application',
                  'No automatic Swiss standard, phrasing often sounds German',
                  'No finished document: no design, no PDF and Word export',
                  'No overview: applications, deadlines and follow-ups stay in your head',
                ] : [
                  'Prompts schreiben, Text kopieren, alles selbst in Word formatieren',
                  'Lebenslauf und Foto bei jeder Bewerbung neu erklären',
                  'Kein Schweizer Standard: ß statt ss, deutsche Floskeln',
                  'Kein fertiges Dokument: kein Design, kein PDF- und Word-Export',
                  'Keine Übersicht: Bewerbungen, Fristen und Nachfassen bleiben im Kopf',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">
                    <span className="shrink-0 mt-[9px] w-3 h-[1.5px] bg-[#9A9A94]/70 rounded-full" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Stellify — the finished result */}
            <div className="relative p-7 sm:p-9 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #00331d 0%, #004225 55%, #0a5233 100%)' }}>
              <svg viewBox="0 0 100 100" className="absolute -right-4 -top-4 w-32 h-32 opacity-[0.14]" aria-hidden="true">
                <path d="M50 16 Q55 42 80 52 Q56 56 48 84 Q45 58 20 46 Q46 42 50 16 Z" fill="#6FCF97" />
              </svg>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6FCF97] mb-1">Stellify</p>
              <p className="text-xl font-serif mb-6">
                {language === 'FR' ? 'Le résultat fini, prêt à envoyer' : language === 'IT' ? 'Il risultato finito, pronto per l\'invio' : language === 'EN' ? 'The finished result, ready to send' : 'Das fertige Resultat, versandbereit'}
              </p>
              <ul className="space-y-3.5">
                {(language === 'FR' ? [
                  'Colle le lien de l\'annonce, Stellify lit l\'offre automatiquement',
                  'CV et photo enregistrés une fois, repris dans chaque candidature',
                  'Suisse d\'office : orthographe, ton et normes correctes',
                  'Document fini en 60 secondes : design au choix, PDF et Word',
                  'Tracker gratuit inclus : pipeline, rappels et statistiques',
                ] : language === 'IT' ? [
                  'Incolla il link dell\'annuncio, Stellify lo legge automaticamente',
                  'CV e foto salvati una volta, ripresi in ogni candidatura',
                  'Svizzero di serie: ortografia, tono e standard corretti',
                  'Documento finito in 60 secondi: design a scelta, PDF e Word',
                  'Tracker gratuito incluso: pipeline, promemoria e statistiche',
                ] : language === 'EN' ? [
                  'Paste the job-ad link, Stellify reads the posting automatically',
                  'CV and photo saved once, applied to every application',
                  'Swiss by default: correct spelling, tone and standards',
                  'Finished document in 60 seconds: your design, PDF and Word',
                  'Free tracker included: pipeline, reminders and statistics',
                ] : [
                  'Link vom Inserat einfügen, Stellify liest die Stelle automatisch',
                  'Lebenslauf und Foto einmal hinterlegt, in jeder Bewerbung drin',
                  'Schweizer Standard ab Werk: Rechtschreibung, Ton und Normen',
                  'Fertiges Dokument in 60 Sekunden: Wunschdesign, PDF und Word',
                  'Gratis Tracker inklusive: Pipeline, Erinnerungen und Statistiken',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-light leading-relaxed">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-[#6FCF97]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { if (user) { handleToolClick('bewerbungs-gen'); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }}
                className="mt-8 w-full sm:w-auto px-8 py-3.5 bg-white text-[#004225] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#E8F3EC] transition-colors"
              >
                {language === 'FR' ? 'Essayer gratuitement, 3 candidatures offertes' : language === 'IT' ? 'Prova gratis, 3 candidature in regalo' : language === 'EN' ? 'Try for free, 3 applications on us' : 'Gratis testen, 3 Bewerbungen geschenkt'}
              </button>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-[#9A9A94] font-light max-w-2xl mx-auto">
            {language === 'FR' ? 'D\'ailleurs : Stellify utilise elle-même l\'IA la plus moderne. La différence, c\'est tout ce qu\'il y a autour.'
              : language === 'IT' ? 'Tra l\'altro: anche Stellify usa l\'IA più moderna. La differenza è tutto ciò che c\'è intorno.'
              : language === 'EN' ? 'By the way: Stellify runs on state-of-the-art AI itself. The difference is everything around it.'
              : 'Übrigens: Stellify nutzt selbst modernste KI. Der Unterschied ist alles rundherum.'}
          </p>
        </div>
      </section>
      )}
      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="px-6 lg:px-12 py-12 lg:py-20 bg-[#0a1410] text-white relative overflow-hidden">
        {/* Premium aurora gradient backdrop — slow, subtle, brand-aligned */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1d12] via-[#0a1410] to-[#030806]" />
          {/* Forest aurora blob top-left */}
          <div
            className="absolute top-[-20%] left-[-15%] w-[70vw] h-[70vw] rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(0,168,84,0.22) 0%, rgba(0,168,84,0.06) 35%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'stellifyPricingDriftA 22s ease-in-out infinite',
            }}
          />
          {/* Subtle gold accent blob bottom-right (very low opacity, premium feel) */}
          <div
            className="absolute bottom-[-25%] right-[-15%] w-[60vw] h-[60vw] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(0,168,84,0.04) 40%, transparent 70%)',
              filter: 'blur(90px)',
              animation: 'stellifyPricingDriftB 28s ease-in-out infinite',
            }}
          />
          {/* Soft dot grid for swiss precision feel */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <style>{`
            @keyframes stellifyPricingDriftA { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(3%, 2%) scale(1.08);} }
            @keyframes stellifyPricingDriftB { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-3%, -2%) scale(1.1);} }
            @keyframes stellifyPricingSweep { 0%, 55% { left: -40%; } 90%, 100% { left: 130%; } }
            @media (prefers-reduced-motion: reduce) {
              section#pricing [style*="stellifyPricingDrift"] { animation: none !important; }
              section#pricing [style*="stellifyPricingSweep"] { animation: none !important; display: none; }
            }
          `}</style>
        </div>
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            {/* Opening: staged reveal — kicker, headline, value promise.
                Sells before it lists. The old "Live Payment System" badge
                was tech jargon, not an argument to buy. */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.p
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#6FCF97] mb-4"
              >
                {language === 'FR' ? 'Tarifs' : language === 'IT' ? 'Prezzi' : language === 'EN' ? 'Pricing' : 'Preise'}
              </motion.p>
              <motion.h2
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } } }}
                className="text-4xl lg:text-6xl font-serif tracking-tight mb-5"
              >
                {t.pricing_title}
              </motion.h2>
              <motion.p
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                className="text-white/60 font-light max-w-xl mx-auto mb-8 leading-relaxed"
              >
                {language === 'FR'
                  ? "Commence gratuitement avec 3 générations. Passe au niveau supérieur quand tu es prêt. Résiliable à tout moment."
                  : language === 'IT'
                  ? 'Inizia gratis con 3 generazioni. Fai il salto quando sei pronto. Disdicibile in ogni momento.'
                  : language === 'EN'
                  ? 'Start free with 3 generations. Upgrade when you are ready. Cancel anytime.'
                  : 'Starte gratis mit 3 Generierungen. Hol dir mehr, wenn du bereit bist. Jederzeit kündbar.'}
              </motion.p>
            </motion.div>

            {subscriptionError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-red-400 mt-0.5 shrink-0 text-base">⚠️</span>
                  <div className="min-w-0">
                    <p className="text-red-300 text-sm font-semibold">{language === 'FR' ? "Le paiement n'a pas pu être traité" : language === 'IT' ? 'Il pagamento non è andato a buon fine' : language === 'EN' ? 'Payment could not be processed' : 'Zahlung konnte nicht verarbeitet werden'}</p>
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
                    {language === 'FR' ? "jusqu'à −25%" : language === 'IT' ? 'fino a −25%' : language === 'EN' ? 'up to −25%' : 'bis −25%'}
                  </span>
                </button>
              </div>
              <motion.p
                key={billingCycle}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[11px] text-white/40 font-light"
              >
                {billingCycle === 'monthly'
                  ? (language === 'DE' ? 'Jährlich wählen und bis zu 3 Monate gratis sparen' : language === 'FR' ? 'Choisir annuel et économiser jusqu\'à 3 mois' : language === 'IT' ? 'Scegli annuale e risparmia fino a 3 mesi' : 'Choose yearly and save up to 3 months')
                  : (language === 'DE' ? 'Jahresabo aktiv, du sparst 2 Monate' : language === 'FR' ? 'Abonnement annuel, vous économisez 2 mois' : language === 'IT' ? 'Abbonamento annuale, risparmi 2 mesi' : 'Annual plan active, you save 2 months')}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10"
          >
            {/* GRATIS — Glassmorphism */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="group relative p-10 bg-white/[0.04] backdrop-blur-xl border border-white/10 flex flex-col transition-all hover:bg-white/[0.06] hover:border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />
              <div className="relative mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Gratis</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF 0</span>
                  <span className="text-white/70 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                <p className="text-xs text-white/70 mt-2 font-light">{t.plan_free_subtitle}</p>
              </div>
              <motion.ul variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }} className="relative space-y-4 mb-12 flex-1">
                {t.pricing_free_f.map((f: string, i: number) => (
                  <motion.li key={i} variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } } }} className="flex items-center gap-3 text-sm font-light text-white/70">
                    <CheckCircle2 size={14} className="text-white/30 shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <button
                onClick={() => user ? navigate('dashboard') : (setAuthTab('register'), setIsAuthModalOpen(true))}
                className="relative w-full py-4 border border-white/20 hover:bg-white hover:text-black transition-all text-sm font-medium min-h-[52px]"
              >{user ? t.dashboard : t.pricing_cta_free}</button>
            </motion.div>

            {/* PRO — Calm glass with green accent */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="group relative p-10 bg-white/[0.04] backdrop-blur-xl border border-[#00A854]/25 flex flex-col transition-all hover:bg-white/[0.06] hover:border-[#00A854]/40 overflow-hidden"
            >
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00A854]/[0.08] rounded-full blur-3xl pointer-events-none" />

              <div className="relative mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">Pro</span>
                <p className="text-xs text-white/60 mt-2 font-light leading-relaxed">{t.plan_pro_subtitle}</p>
                <div className="flex items-baseline gap-1 mt-4">
                  <motion.span
                    key={`pro-${billingCycle}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="text-4xl font-serif text-white"
                  >CHF {prices.pro}</motion.span>
                  <span className="text-white/70 text-sm">/{billingCycle === 'yearly' ? (language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year') : (language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.')}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-semibold">−{planPricing.pro.save}</span>
                  </div>
                )}
              </div>
              <motion.ul variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }} className="relative space-y-4 mb-12 flex-1">
                {t.pricing_pro_f.map((f: string, i: number) => (
                  <motion.li key={i} variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } } }} className="flex items-center gap-3 text-sm font-light text-white/80">
                    <CheckCircle2 size={14} className="text-[#6FCF97] shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <button
                onClick={() => handleSubscription('pro')}
                disabled={isSubscribing}
                className="relative w-full py-4 border border-[#00A854]/40 text-white hover:bg-[#00A854]/10 hover:border-[#00A854] transition-all text-[11px] font-bold uppercase tracking-[0.25em] disabled:opacity-50 min-h-[52px]"
              >
                {isSubscribing ? '...' : t.pricing_cta_pro}
              </button>
            </motion.div>

            {/* KARRIERE+ — Featured / most popular plan */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="group relative p-10 bg-[#004225]/20 backdrop-blur-xl border border-[#00A854]/50 flex flex-col overflow-hidden lg:scale-[1.04] lg:-my-2 z-10"
              style={{ boxShadow: '0 0 0 1px rgba(0,168,84,0.25) inset, 0 30px 70px -20px rgba(0,66,37,0.7)' }}
            >
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00A854]/25 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#D4AF37]/[0.10] rounded-full blur-3xl pointer-events-none" />
              {/* Periodic light sweep — the same premium touch as the tool
                  cards, draws the eye to the featured plan. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                style={{ animation: 'stellifyPricingSweep 7s ease-in-out infinite' }}
              />

              {/* Most-popular badge — in-flow at the top of the card. The old
                  floating version sat above the card edge and was clipped
                  invisible by overflow-hidden. */}
              <div className="relative flex justify-center -mt-3 mb-5">
                <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[#004225] to-[#00592F] text-white text-[10px] font-bold uppercase tracking-[0.3em] px-5 py-1.5 rounded-full border border-[#D4AF37]/40 shadow-lg shadow-[#004225]/40 whitespace-nowrap">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                  {t.pricing_popular}
                </span>
              </div>
              <div className="relative mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6FCF97]">Karriere+</span>
                <p className="text-xs text-white/70 mt-2 font-light leading-relaxed">{t.plan_ultimate_subtitle}</p>
                <div className="flex items-baseline gap-1 mt-4">
                  <motion.span
                    key={`ult-${billingCycle}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="text-4xl font-serif text-white"
                  >CHF {prices.ultimate}</motion.span>
                  <span className="text-white/70 text-sm">/{billingCycle === 'yearly' ? (language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year') : (language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.')}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-semibold">−{planPricing.ultimate.save}</span>
                  </div>
                )}
              </div>
              <motion.ul variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }} className="relative space-y-4 mb-12 flex-1">
                {t.pricing_ultimate_f.map((f: string, i: number) => (
                  <motion.li key={i} variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } } }} className="flex items-center gap-3 text-sm font-medium text-white">
                    <CheckCircle2 size={14} className="text-[#6FCF97] shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
              <button
                onClick={() => handleSubscription('ultimate')}
                disabled={isSubscribing}
                className="relative w-full py-4 bg-white text-[#004225] hover:bg-[#FAFAF8] shadow-xl shadow-black/30 transition-all text-[11px] font-bold uppercase tracking-[0.25em] disabled:opacity-50 min-h-[52px] group-hover:shadow-2xl"
              >
                {isSubscribing ? '...' : t.pricing_cta_ultimate}
              </button>
            </motion.div>
          </motion.div>

          {/* TRUST BAR — directly under the plan cards, where the buying
              decision happens. Answers the last doubts at the moment they
              come up. */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 mb-14 sm:mb-16"
          >
            {[
              { icon: <ShieldCheck size={13} className="text-white/40" />, label: language === 'FR' ? 'Protection des données suisse' : language === 'IT' ? 'Protezione dati svizzera' : language === 'EN' ? 'Swiss data protection' : 'Datenschutz nach Schweizer Standard' },
              { icon: <Lock size={13} className="text-white/40" />, label: language === 'FR' ? 'Transmission chiffrée' : language === 'IT' ? 'Trasmissione crittografata' : language === 'EN' ? 'Encrypted transfer' : 'Verschlüsselte Übertragung' },
              { icon: <CreditCard size={13} className="text-white/40" />, label: language === 'DE' ? 'Sichere Zahlung via Stripe' : language === 'FR' ? 'Paiement sécurisé via Stripe' : language === 'IT' ? 'Pagamento sicuro via Stripe' : 'Secure payment via Stripe' },
              { icon: <CheckCircle2 size={13} className="text-white/40" />, label: language === 'FR' ? 'Résiliable à tout moment' : language === 'IT' ? 'Disdicibile in ogni momento' : language === 'EN' ? 'Cancel anytime' : 'Jederzeit kündbar' },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
                className="flex items-center gap-2 text-white/50 text-xs"
              >
                {item.icon}
                <span>{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Friendly support line — reassures at the buying moment without
              planting doubt: a confident "we are here for you", never a warning
              that errors can happen. */}
          <p className="text-center text-white/45 text-xs -mt-10 mb-14">
            {language === 'FR' ? 'Des questions ou un souci ? Nous sommes vite là pour toi : '
              : language === 'IT' ? 'Domande o problemi? Siamo subito qui per te: '
              : language === 'EN' ? "Questions or problems? We're here for you fast: "
              : 'Fragen oder Probleme? Wir sind schnell für dich da: '}
            <a href="mailto:support.stellify@gmail.com" className="underline hover:text-white/70 transition-colors">support.stellify@gmail.com</a>
          </p>

          {/* VALUE BOX */}
          <div className="max-w-5xl mx-auto mb-16">
            <h3 className="text-2xl lg:text-3xl font-serif text-center text-white mb-10 tracking-tight">{t.value_title}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
              {t.value_items.map((item: any, i: number) => {
                const Icon = item.icon === 'Coins' ? Coins
                  : item.icon === 'Clock' ? Clock
                  : item.icon === 'Target' ? Target
                  : TrendingUp;
                return (
                  <div key={i} className="bg-[#0a1410] p-7 hover:bg-[#0c1813] transition-colors">
                    <div className="w-9 h-9 flex items-center justify-center bg-[#004225] text-white mb-5">
                      <Icon size={16} />
                    </div>
                    <p className="text-lg font-serif text-white leading-tight mb-2">{item.title}</p>
                    <p className="text-xs text-white/55 font-light leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
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
            {/* Only methods that actually work for automatic subscriptions.
                TWINT, PostFinance and Klarna do not support recurring billing
                in Stripe, so showing them here would mislead. */}
            <div className="flex flex-wrap justify-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              {['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay'].map(p => (
                <div key={p} className="px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest">{p}</div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 mt-6">{t.payment_secure}</p>
          </div>
        </div>
      </section>
      {/* --- RATGEBER TEASER --- Free Swiss career guides, surfaced on the
           landing page so the knowledge section actually gets found. */}
      {(!user || activeView === 'dashboard') && (
      <section className="px-6 lg:px-12 py-12 lg:py-20 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#004225] dark:text-[#00A854] mb-3">
                {language === 'FR' ? 'Guide gratuit' : language === 'IT' ? 'Guida gratuita' : language === 'EN' ? 'Free guides' : 'Gratis Ratgeber'}
              </p>
              <h2 className="text-3xl lg:text-4xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">
                {language === 'FR' ? 'Le savoir-faire suisse de la candidature' : language === 'IT' ? 'Il know-how svizzero della candidatura' : language === 'EN' ? 'Swiss application know-how' : 'Schweizer Bewerbungswissen'}
              </h2>
              <p className="mt-3 text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">
                {language === 'FR' ? 'Quatre guides détaillés, écrits pour le marché suisse. Sans inscription, sans frais.'
                  : language === 'IT' ? 'Quattro guide dettagliate, scritte per il mercato svizzero. Senza registrazione, gratis.'
                  : language === 'EN' ? 'Four in-depth guides, written for the Swiss market. No sign-up, no cost.'
                  : 'Vier ausführliche Leitfäden, geschrieben für den Schweizer Markt. Ohne Anmeldung, ohne Kosten.'}
              </p>
            </div>
            <button
              onClick={() => navigate('ratgeber')}
              className="shrink-0 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] hover:gap-3 transition-all"
            >
              {language === 'FR' ? 'Tous les guides' : language === 'IT' ? 'Tutte le guide' : language === 'EN' ? 'All guides' : 'Alle Ratgeber'}
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(language === 'FR' ? [
              { icon: <FileText size={18} />, title: 'Postuler en Suisse : le guide complet' },
              { icon: <Layout size={18} />, title: 'CV au standard suisse : structure, ordre, photo' },
              { icon: <Edit2 size={18} />, title: 'Lettre de motivation : structure et formulations' },
              { icon: <Coins size={18} />, title: 'Négocier son salaire en Suisse' },
            ] : language === 'IT' ? [
              { icon: <FileText size={18} />, title: 'Candidarsi in Svizzera: la guida completa' },
              { icon: <Layout size={18} />, title: 'CV secondo lo standard svizzero' },
              { icon: <Edit2 size={18} />, title: 'Lettera di motivazione: struttura e formulazioni' },
              { icon: <Coins size={18} />, title: 'Negoziare lo stipendio in Svizzera' },
            ] : language === 'EN' ? [
              { icon: <FileText size={18} />, title: 'Applying in Switzerland: the complete guide' },
              { icon: <Layout size={18} />, title: 'CV to the Swiss standard: structure and photo' },
              { icon: <Edit2 size={18} />, title: 'Cover letter: structure and wording' },
              { icon: <Coins size={18} />, title: 'Negotiating salary in Switzerland' },
            ] : [
              { icon: <FileText size={18} />, title: 'Bewerbung schreiben in der Schweiz: der komplette Leitfaden' },
              { icon: <Layout size={18} />, title: 'Lebenslauf nach Schweizer Standard: Aufbau, Reihenfolge, Foto' },
              { icon: <Edit2 size={18} />, title: 'Motivationsschreiben: Aufbau, Formulierungen, typische Fehler' },
              { icon: <Coins size={18} />, title: 'Lohn verhandeln in der Schweiz: Vorbereitung und Timing' },
            ]).map((g, i) => (
              <button
                key={i}
                onClick={() => openGuide(['bewerbung-schreiben-schweiz', 'lebenslauf-schweizer-standard', 'motivationsschreiben', 'lohn-verhandeln-schweiz'][i])}
                className="group text-left p-6 bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 hover:border-[#004225]/25 dark:hover:border-[#00A854]/40 hover:shadow-lg transition-all flex flex-col gap-4"
              >
                <span className="w-10 h-10 bg-[#004225]/8 dark:bg-[#00A854]/12 text-[#004225] dark:text-[#00A854] flex items-center justify-center group-hover:bg-[#004225] group-hover:text-white transition-all">
                  {g.icon}
                </span>
                <span className="text-sm font-medium leading-snug text-[#1A1A18] dark:text-[#FAFAF8] flex-1">{g.title}</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854]">
                  {language === 'FR' ? 'Lire' : language === 'IT' ? 'Leggi' : language === 'EN' ? 'Read' : 'Lesen'}
                  <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
      )}
      {/* --- FAQ SECTION --- */}
      {(!user || activeView === 'dashboard') && (
      <section className="px-6 lg:px-12 py-12 lg:py-20 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-3xl mx-auto">
          <div className="text-left mb-10 lg:mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#004225] text-white flex items-center justify-center text-base font-serif">?</div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#004225] dark:text-[#00A854]">{t.faq_badge}</p>
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
                <p className="text-[15px] text-[#26261F] dark:text-[#C8C8C2] leading-relaxed pb-4">{faq.a}</p>
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
      )}
      {/* --- FINAL CTA --- */}
      {(!user || activeView === 'dashboard') && (
      <section className="px-6 lg:px-12 py-16 lg:py-24 bg-[#004225] text-white text-center relative overflow-hidden">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 0.1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), transparent 60%)' }}
        />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          className="max-w-4xl mx-auto space-y-8 relative"
        >
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } } }}
            className="text-5xl lg:text-7xl font-serif tracking-tight leading-tight"
          >
            {t.cta_final_title}
          </motion.h2>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
            className="text-white/60 font-light text-lg"
          >
            {t.cta_final_desc}
          </motion.p>
          <motion.button
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
            whileHover={{ y: -3 }}
            whileTap={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={() => user ? navigate('dashboard') : setIsAuthModalOpen(true)}
            className="bg-white text-[#004225] px-10 py-5 text-xl font-medium hover:bg-[#FDFCFB] shadow-2xl shadow-black/30 transition-colors inline-flex items-center gap-3 group"
          >
            {user ? t.dashboard : t.cta_final_btn}
            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </section>
      )}

      </> /* end marketing sections */}

      {/* --- SUBSCRIPTION EXPIRY BANNER (always rendered) --- */}
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
                    ? (language === 'DE' ? 'Dein Abo läuft morgen ab, jetzt verlängern!' : language === 'FR' ? 'Votre abonnement expire demain, renouvelez maintenant !' : language === 'IT' ? 'Il tuo abbonamento scade domani, rinnova ora!' : 'Your subscription expires tomorrow, renew now!')
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

      {/* --- UPGRADE PROMPT --- */}
      <AnimatePresence>
        {upgradePrompt && (
          <UpgradePrompt
            reason={upgradePrompt.reason}
            subOverride={upgradePrompt.message}
            language={language}
            onClose={() => setUpgradePrompt(null)}
            onPricing={() => { setUpgradePrompt(null); setActiveTool(null); navigate('pricing'); }}
          />
        )}
      </AnimatePresence>

      {/* --- TOAST NOTIFICATION ---
           A clean pill: white card, a coloured icon chip, message in normal
           case. Springs up from the bottom, works in light and dark. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%', scale: 0.92 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 16, x: '-50%', scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-8 left-1/2 z-[1000] max-w-[90vw] flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full bg-white dark:bg-[#23231F] border border-black/5 dark:border-white/10 shadow-xl shadow-black/15"
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-[#004225] dark:bg-[#00A854]' : 'bg-red-500 dark:bg-[#C96A6A]'} text-white`}>
              {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            </span>
            <span className="text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] leading-snug">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- VIDEO MODAL (YouTube nocookie embed, lazy-mounted) --- */}
      <AnimatePresence>
        {videoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setVideoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl bg-[#0a1410] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 bg-[#0a1410] border-b border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/80">{videoModal.title}</p>
                <button
                  onClick={() => setVideoModal(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoModal.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={videoModal.title}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- WELCOME VIDEO (auto-opens once after first sign-in if a video is set) --- */}
      <AnimatePresence>
        {user && !welcomeVideoSeen && videoLibrary.welcome && !videoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[395] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl bg-[#0a1410] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/80">
                  {language === 'FR' ? 'Bienvenue chez Stellify'
                    : language === 'IT' ? 'Benvenuto su Stellify'
                    : language === 'EN' ? 'Welcome to Stellify'
                    : 'Willkommen bei Stellify'}
                </p>
                <button
                  onClick={() => { localStorage.setItem('stellify_welcome_video_seen','1'); setWelcomeVideoSeen(true); }}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white border border-white/20 rounded-full px-3 py-1 transition-colors"
                >
                  {language === 'FR' ? 'Passer' : language === 'IT' ? 'Salta' : language === 'EN' ? 'Skip' : 'Überspringen'}
                </button>
              </div>
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoLibrary.welcome}?autoplay=1&rel=0&modestbranding=1`}
                  title="Welcome to Stellify"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => {}}
                />
              </div>
              <div className="px-5 py-3 bg-[#0a1410] border-t border-white/10 text-center">
                <button
                  onClick={() => { localStorage.setItem('stellify_welcome_video_seen','1'); setWelcomeVideoSeen(true); }}
                  className="text-[11px] font-bold uppercase tracking-[0.25em] text-white px-5 py-2 bg-[#004225] hover:bg-[#00331d] transition-colors"
                >
                  {language === 'FR' ? "C'est parti" : language === 'IT' ? 'Iniziamo' : language === 'EN' ? "Let's start" : "Los geht's"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FOOTER (always visible — also on legal pages) --- */}
      <footer className="bg-[#1A1A18] text-white/50 px-6 lg:px-12 py-24 border-t border-white/5">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12 mb-16 lg:mb-24">
            <div className="sm:col-span-2 lg:col-span-2 space-y-6">
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-2xl font-serif tracking-tight text-white inline-flex items-center gap-2.5">
                <svg width="22" height="22" viewBox="0 0 32 32" className="text-[#00A854] shrink-0" aria-hidden="true">
                  <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                </svg>
                <span>Stell<span className="text-[#00A854]">ify</span></span>
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
                <li><button onClick={() => handleToolClick('bewerbungs-gen')} className="hover:text-white transition-colors text-left">{t.tools_data['bewerbungs-gen'].title}</button></li>
                <li><button onClick={() => handleToolClick('tracker')} className="hover:text-white transition-colors text-left">{t.tools_data['tracker'].title}</button></li>
                <li><button onClick={() => navigate('pricing')} className="hover:text-white transition-colors text-left">{t.nav_pricing || (language === 'FR' ? 'Prix' : language === 'IT' ? 'Prezzi' : language === 'EN' ? 'Pricing' : 'Preise')}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">{language === 'DE' ? 'Unternehmen' : language === 'FR' ? 'Entreprise' : language === 'IT' ? 'Azienda' : 'Company'}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><button onClick={() => navigate('about')} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Über uns' : language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : 'About'}</button></li>
                <li><button onClick={() => navigate('ratgeber')} className="hover:text-white transition-colors text-left">{language === 'FR' ? 'Guides' : language === 'IT' ? 'Guide' : language === 'EN' ? 'Guides' : 'Ratgeber'}</button></li>
                <li><button onClick={() => navigate('pricing')} className="hover:text-white transition-colors text-left">{t.pricing}</button></li>
                <li><a href={`mailto:support.stellify@gmail.com?subject=${language === 'FR' ? 'Proposition%20de%20partenariat' : language === 'IT' ? 'Proposta%20di%20collaborazione' : language === 'EN' ? 'Partnership%20Inquiry' : 'Kooperationsanfrage'}`} className="hover:text-white transition-colors">
                  {language === 'DE' ? 'Kooperationen' : language === 'FR' ? 'Partenariats' : language === 'IT' ? 'Collaborazioni' : 'Partnerships'}
                </a></li>
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

      {/* Mobile Back-to-Top Button — only after scrolling down, arrow points
          up. Small and translucent so it never hides the content below it. */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 left-4 z-50 md:hidden w-9 h-9 bg-[#004225]/70 backdrop-blur-sm text-white flex items-center justify-center shadow-md rounded-full active:bg-[#004225]"
          aria-label="Nach oben"
        >
          <ArrowLeft size={15} className="rotate-90" />
        </button>
      )}

      {/* --- LOGIN WELCOME MODAL --- */}
      <AnimatePresence>
        {showLoginWelcome && user && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginWelcome(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-[#1A1A18] shadow-2xl overflow-hidden"
            >
              {/* Progress bar auto-dismiss */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5.5, ease: 'linear' }}
                className="absolute top-0 left-0 h-0.5 bg-[#004225]"
              />

              {/* Header — the avatar pops in like the Netflix profile moment */}
              <div className="px-8 pt-10 pb-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-5 min-w-0">
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
                      className="shrink-0"
                    >
                      {user.avatarId ? (
                        <PresetAvatar id={user.avatarId} className="w-16 h-16 rounded-2xl border border-black/10 dark:border-white/10 shadow-md" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-[#004225]/8 dark:bg-[#00A854]/15 flex items-center justify-center text-2xl font-serif text-[#004225] dark:text-[#00A854] border border-black/10 dark:border-white/10 shadow-md">
                          {(user.firstName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] mb-2">
                        {t.welcome}
                      </p>
                      <h2 className="text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] leading-tight truncate">
                        {user.firstName}
                      </h2>
                      <p className="mt-1 text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light">
                        {t.welcome_modal_subtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLoginWelcome(false)}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94] mt-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tool suggestions */}
              <div className="px-8 py-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A9A94] mb-4">
                  {t.welcome_modal_quickstart}
                </p>
                <div className="space-y-2">
                  {([
                        { id: 'bewerbungs-gen', icon: <FileText size={16} />, badge: 'Gratis' },
                        { id: 'tracker', icon: <Layout size={16} />, badge: 'Gratis' },
                  ]).map((item) => {
                    const tool = tools.find(tl => tl.id === item.id);
                    if (!tool) return null;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { handleToolClick(item.id); setShowLoginWelcome(false); }}
                        className="w-full flex items-center gap-4 p-4 bg-black/3 dark:bg-white/3 hover:bg-[#004225]/5 dark:hover:bg-[#004225]/20 border border-transparent hover:border-[#004225]/20 transition-all group text-left"
                      >
                        <div className="w-9 h-9 bg-[#004225]/8 dark:bg-[#004225]/20 flex items-center justify-center text-[#004225] dark:text-[#00C060] flex-shrink-0 group-hover:scale-110 transition-transform rounded-sm">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00C060] transition-colors">
                              {tool.title}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                              item.badge === 'Gratis' ? 'bg-[#004225]/10 text-[#004225]' :
                              item.badge === 'Pro' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                              'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light mt-0.5 line-clamp-1">
                            {tool.desc}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-[#9A9A94] group-hover:text-[#004225] dark:group-hover:text-[#00C060] transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 pb-8">
                <button
                  onClick={() => setShowLoginWelcome(false)}
                  className="w-full py-3 bg-[#004225] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-colors"
                >
                  {t.welcome_modal_dismiss}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  id="stellify-search-input"
                  type="text"
                  placeholder={t.search_label_tool || t.search_label}
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
                        } else if (result.type === 'page') {
                          navigate(result.view);
                        } else if (result.link) {
                          window.location.hash = result.link;
                        }
                        setIsSearchOpen(false);
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
                      {/* Only searches that lead somewhere in V1 — the old
                          chips (Stellensuche, Lohn, Interview, Karriereplan)
                          pointed at disabled tools and returned nothing. */}
                      {[
                        { label: language === 'FR' ? 'Créer une candidature' : language === 'IT' ? 'Creare una candidatura' : language === 'EN' ? 'Create an application' : 'Bewerbung erstellen', query: language === 'FR' ? 'candidature' : language === 'IT' ? 'candidature' : language === 'EN' ? 'application' : 'bewerbung' },
                        { label: language === 'FR' ? 'Suivi des candidatures' : language === 'IT' ? 'Tracker candidature' : language === 'EN' ? 'Application tracker' : 'Bewerbungs-Tracker', query: 'tracker' },
                        { label: language === 'FR' ? 'Prix & abonnement' : language === 'IT' ? 'Prezzi & abbonamento' : language === 'EN' ? 'Pricing & plan' : 'Preise & Abo', query: language === 'FR' ? 'prix' : language === 'IT' ? 'prezzo' : language === 'EN' ? 'pricing' : 'preise' },
                        { label: language === 'FR' ? 'À propos de Stellify' : language === 'IT' ? 'Su Stellify' : language === 'EN' ? 'About Stellify' : 'Über Stellify', query: language === 'DE' ? 'über uns' : 'about' },
                      ].map(tag => (
                        <button
                          key={tag.query}
                          onClick={() => {
                            setSearchQuery(tag.query);
                            // Return focus to the input so Enter runs the
                            // search — after the click it sat on the chip
                            // and Enter re-clicked the chip instead.
                            setTimeout(() => document.getElementById('stellify-search-input')?.focus(), 0);
                          }}
                          className="px-3 py-1.5 bg-black/5 dark:bg-white/5 text-[11px] font-medium text-[#5C5C58] dark:text-[#FAFAF8] hover:bg-[#004225] hover:text-white transition-all rounded-md"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>

                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-4">{t.search_quick}</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'bewerbungs-gen', title: t.tools_data['bewerbungs-gen'].title, icon: <FileText size={14} />, badge: 'Gratis' },
                        { id: 'tracker', title: t.tools_data['tracker'].title, icon: <Layout size={14} />, badge: 'Gratis' },
                      ].map(action => (
                        <button
                          key={action.id}
                          onClick={() => {
                            handleToolClick(action.id);
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 hover:bg-[#004225]/5 dark:hover:bg-[#004225]/20 border border-transparent hover:border-[#004225]/20 transition-all rounded-lg text-left group"
                        >
                          <div className="w-8 h-8 bg-white dark:bg-black/20 flex items-center justify-center rounded-full text-[#004225] group-hover:scale-110 transition-transform flex-shrink-0">
                            {action.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{action.title}</div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${
                              action.badge === 'Gratis' ? 'text-[#004225]' :
                              action.badge === 'Pro' ? 'text-blue-600 dark:text-blue-400' :
                              'text-amber-600 dark:text-amber-400'
                            }`}>{action.badge}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-6 py-2">
                    {['profile', 'tool', 'tip', 'faq'].map(type => {
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
                            {type === 'page' && <Globe size={10} />}
                            {type === 'profile' ? t.search_type_profile : type === 'tool' ? t.search_type_tool : type === 'job' ? t.search_type_job : type === 'tip' ? t.search_type_tip : type === 'page' ? (language === 'FR' ? 'Pages' : language === 'IT' ? 'Pagine' : language === 'EN' ? 'Pages' : 'Seiten') : t.search_type_faq}
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
                                    } else if (result.type === 'page') {
                                      navigate(result.view);
                                    } else if (result.link) {
                                      window.location.hash = result.link;
                                    }
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className={`p-3 transition-all cursor-pointer group rounded-lg border-2 ${
                                    isSelected 
                                      ? 'bg-[#004225]/10 border-[#004225] dark:bg-[#004225]/30 dark:border-[#FAFAF8]/30 shadow-md' 
                                      : 'hover:bg-[#FDFCFB] dark:hover:bg-white/5 border-transparent hover:border-black/5 dark:hover:border-white/5'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className={`text-sm font-bold transition-colors ${isSelected ? 'text-[#004225] dark:text-[#FAFAF8]' : 'group-hover:text-[#004225]'}`}>{result.title}</h4>
                                      {result.type === 'tool' && result.badge && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-[#004225]/8 text-[#004225] dark:bg-[#004225]/30 dark:text-[#00C060]">
                                          {result.badge}
                                        </span>
                                      )}
                                      {result.type === 'tool' && result.toolType && (
                                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                          result.toolType === 'gratis' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                          result.toolType === 'pro' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                          'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        }`}>
                                          {result.toolType === 'gratis' ? 'Gratis' : result.toolType === 'pro' ? 'Pro' : 'Karriere+'}
                                        </span>
                                      )}
                                      {isSelected && (
                                        <span className="text-[8px] bg-[#004225] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">
                                          Enter
                                        </span>
                                      )}
                                    </div>
                                    {result.type === 'tool' && (
                                      <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-[#004225]' : 'text-[#9A9A94] group-hover:text-[#004225]'}`} />
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
                  {searchQuery.trim().length < 2
                    ? ''
                    : t.search_results.replace('{count}', searchResults.length.toString())}
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                    <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[8px]">ESC</span>
                    {t.search_close_label}
                  </div>
                  {selectedSearchIndex >= 0 && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-[#004225] text-white">ENTER</span>
                      {t.search_open_selection}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- STELLA CHAT WINDOW --- */}
      <AnimatePresence>
        {isStellaOpen && STELLA_CHAT_ENABLED && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsStellaOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99] xl:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isStellaOpen && STELLA_CHAT_ENABLED && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 xl:bottom-24 right-4 xl:right-6 left-4 xl:left-auto w-auto xl:w-[440px] 2xl:w-[460px] max-w-[calc(100vw-2rem)] xl:max-w-[90vw] h-[calc(100vh-7rem)] xl:h-[680px] 2xl:h-[720px] xl:max-h-[80vh] bg-white dark:bg-[#1A1A18] border border-black/5 dark:border-white/5 shadow-2xl z-[100] flex flex-col transition-colors"
          >
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#2A2A26]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#004225] flex items-center justify-center text-white">
                  <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                  </svg>
                </div>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#FDFCFB]/50 dark:bg-[#1A1A18]/50 transition-colors">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'user' ? (
                    <div className="max-w-[82%] px-4 py-3 bg-[#004225] text-white text-sm font-light leading-relaxed shadow-sm">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] group relative">
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#004225] via-[#00A854]/60 to-transparent rounded-full" />
                      <div className="pl-4 pr-4 pt-3 pb-3 bg-gradient-to-br from-white to-[#F2F8F5] dark:from-[#1E2B23] dark:to-[#1A1A18] border border-[#004225]/10 dark:border-[#004225]/20 shadow-[0_2px_20px_-6px_rgba(0,66,37,0.12)]">
                        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#004225]/10 dark:border-[#004225]/20">
                          <div className="w-4 h-4 rounded-full bg-[#004225] flex items-center justify-center flex-shrink-0 shadow-sm">
                            <svg width="9" height="9" viewBox="0 0 32 32" aria-hidden="true" className="text-white">
                              <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                            </svg>
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#004225] dark:text-[#00A854]">Stella AI</span>
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#059669] shadow-[0_0_6px_rgba(5,150,105,0.5)]" />
                        </div>
                        <p className="text-sm font-light leading-relaxed text-[#1A1A18] dark:text-[#FAFAF8] whitespace-pre-wrap">{m.content}</p>
                        <div className="mt-2 text-[8px] text-[#9A9A94] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.ai_notice}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#004225] via-[#00A854]/60 to-transparent rounded-full" />
                    <div className="pl-4 pr-5 py-3 bg-gradient-to-br from-white to-[#F2F8F5] dark:from-[#1E2B23] dark:to-[#1A1A18] border border-[#004225]/10 dark:border-[#004225]/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#004225]/50 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#004225]/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-[#004225]/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
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
      {STELLA_CHAT_ENABLED && (
      <button
        onClick={() => setIsStellaOpen(prev => !prev)}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-14 h-14 bg-[#004225] text-white shadow-2xl flex items-center justify-center z-[100] group"
      >
        <div className="absolute inset-0 bg-[#004225] animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true" className="relative">
          <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
        </svg>
      </button>
      )}

      {/* --- TOOL MODAL ---
           Default tools open as a focused mid-size modal. The Bewerbungs-
           Generator opens as a full-screen experience because the design-
           gallery + multi-step form needs the whole canvas. */}
      <AnimatePresence>
        {activeTool && (() => {
          // Every tool now opens full-screen, matching the Bewerbungs-Generator
          // pattern. More room for input + result + example panels.
          return (
          <div className="fixed inset-0 z-[300] flex justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-white dark:bg-[#1A1A18] overflow-hidden flex flex-col shadow-2xl transition-colors w-full h-full sm:rounded-none"
            >
              <div className="p-4 sm:p-6 border-b border-black/8 dark:border-white/8 flex items-center justify-between gap-4 bg-[#FDFCFB] dark:bg-[#2A2A26] shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 bg-[#004225] text-white flex items-center justify-center shadow-md">
                    {activeTool.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] truncate leading-tight">{activeTool.title}</h3>
                    <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-widest font-bold mt-0.5 opacity-80">{activeTool.badge}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* How-does-it-work: opens a small explainer with the live
                      demo (generator) or the three steps for this tool. */}
                  <button
                    onClick={() => setShowToolHelp(true)}
                    aria-label={language === 'FR' ? 'Comment ça marche' : language === 'IT' ? 'Come funziona' : language === 'EN' ? 'How it works' : 'So funktioniert es'}
                    title={language === 'FR' ? 'Comment ça marche ?' : language === 'IT' ? 'Come funziona?' : language === 'EN' ? 'How does it work?' : 'Wie funktioniert das?'}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#004225] dark:text-[#00A854]"
                  >
                    <HelpCircle size={20} />
                  </button>
                  <button onClick={() => { setActiveTool(null); setShowToolHelp(false); setParsedSalaryResult(null); setParsedInterviewResult(null); setInterviewSession(null); setInterviewAnswer(''); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]">
                    <X size={20} />
                  </button>
                </div>

                {/* Help overlay: So funktioniert's */}
                <AnimatePresence>
                  {showToolHelp && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" onClick={() => setShowToolHelp(false)}>
                      <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#FDFCFB] dark:bg-[#1A1A18] w-full max-w-2xl max-h-[92dvh] overflow-y-auto custom-scrollbar shadow-2xl border border-black/10 dark:border-white/10 rounded-xl"
                      >
                        <div className="p-5 border-b border-black/8 dark:border-white/8 flex items-center justify-between sticky top-0 bg-[#FDFCFB] dark:bg-[#1A1A18] z-10">
                          <div className="flex items-center gap-2.5">
                            <HelpCircle size={16} className="text-[#004225] dark:text-[#00A854]" />
                            <h4 className="font-serif text-lg text-[#1A1A18] dark:text-[#FAFAF8]">
                              {language === 'FR' ? 'Comment ça marche' : language === 'IT' ? 'Come funziona' : language === 'EN' ? 'How it works' : 'So funktioniert es'}
                            </h4>
                          </div>
                          <button onClick={() => setShowToolHelp(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[#9A9A94]"><X size={16} /></button>
                        </div>
                        <div className="p-5 sm:p-6 space-y-6">
                          {activeTool.id === 'bewerbungs-gen' ? (
                            <LiveDemo language={language} />
                          ) : (
                            <>
                            <StrategyDemo language={language} />
                            <div className="space-y-3">
                              {(language === 'FR' ? [
                                'Saisis le poste ou l\'entreprise qui t\'intéresse.',
                                'Clique sur Générer. Stella crée ton plan personnel.',
                                'Suis les étapes et adapte-les à ta situation.',
                              ] : language === 'IT' ? [
                                'Inserisci la posizione o l\'azienda che ti interessa.',
                                'Clicca su Genera. Stella crea il tuo piano personale.',
                                'Segui i passi e adattali alla tua situazione.',
                              ] : language === 'EN' ? [
                                'Enter the role or company you are aiming for.',
                                'Click Generate. Stella creates your personal plan.',
                                'Follow the steps and adapt them to your situation.',
                              ] : [
                                'Gib die Stelle oder Firma ein, die dich interessiert.',
                                'Klicke auf Generieren. Stella erstellt deinen persönlichen Plan.',
                                'Folge den Schritten und passe sie an deine Situation an.',
                              ]).map((step, i) => (
                                <div key={i} className="flex items-start gap-3 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-lg p-4">
                                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#004225] dark:bg-[#00A854] text-white text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                                  <p className="text-sm text-[#1A1A18] dark:text-[#EBEBEB] leading-relaxed pt-0.5">{step}</p>
                                </div>
                              ))}
                            </div>
                            </>
                          )}
                          {t.tools_data[activeTool.id]?.tutorial && (
                            <div className="p-4 bg-[#004225]/[0.04] dark:bg-[#00A854]/[0.06] border-l-2 border-[#004225] dark:border-[#00A854] rounded-r-lg">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#004225] dark:text-[#00A854] mb-1.5"><Award size={11} />{t.tool_pro_example}</p>
                              <p className="text-[13px] text-[#1A1A18] dark:text-[#FAFAF8] font-light leading-relaxed">
                                {String(t.tools_data[activeTool.id].tutorial).replace(/^(Beispiel|Exemple|Esempio|Example)\s*[:：]\s*/i, '').replace(/^["„«»“”']+|["„«»“”']+$/g, '').trim()}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => setShowToolHelp(false)}
                            className="w-full py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
                          >
                            {language === 'FR' ? 'Compris, c\'est parti' : language === 'IT' ? 'Capito, iniziamo' : language === 'EN' ? 'Got it, let\'s go' : 'Verstanden, los geht\'s'}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden ios-scroll flex flex-col lg:flex-row relative">
                {/* Bewerbungs-Generator: full-custom flow overlays the generic two-panel UI */}
                {activeTool.id === 'bewerbungs-gen' && (
                  <div className="absolute inset-0 z-40 flex flex-col bg-[#FDFCFB] dark:bg-[#1A1A18]">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#004225] border-t-transparent rounded-full animate-spin" /></div>}>
                      <ApplicationGenerator
                        language={language}
                        user={user}
                        profile={user ? { firstName: user.firstName, email: user.email } : null}
                        initialTarget={generatorPrefill}
                        initialDocId={generatorInitialDocId}
                        onAddToTracker={async ({ company, position }) => {
                          if (!user) return false;
                          const co = capFirst(company.trim());
                          const po = capFirst(position.trim());
                          // Skip if the same company+position is already tracked,
                          // so repeated exports don't create duplicates.
                          const exists = applications.some((a: any) =>
                            String(a.company || '').trim().toLowerCase() === co.toLowerCase() &&
                            String(a.position || '').trim().toLowerCase() === po.toLowerCase());
                          if (exists) return false;
                          try {
                            await addDoc(collection(db, 'applications'), {
                              company: co, position: po, status: 'Applied', location: '', salary: '', notes: '',
                              reminder_at: '', user_id: user.id, created_at: new Date().toISOString(),
                            });
                            return true;
                          } catch (e: any) {
                            handleDbError(e, 'db', 'applications');
                            return false;
                          }
                        }}
                        cvContext={cvContext}
                        locked={isToolLocked}
                        onUpgrade={(reason?: 'quota' | 'daily' | 'feature', message?: string) => setUpgradePrompt({ reason: reason || 'quota', message })}
                        showToast={showToast}
                        authFetch={authFetch}
                        onUploadCv={processFile}
                        usage={{
                          toolUses: user?.toolUses || 0,
                          dailyToolUses: user?.dailyToolUses || 0,
                          isPro: user?.role === 'pro' || user?.role === 'unlimited' || user?.role === 'admin',
                          isUnlimited: user?.role === 'unlimited' || user?.role === 'admin',
                        }}
                        recordUsage={async ({ input, result }) => {
                          if (!user) return;
                          // Same bookkeeping as handleProcessTool: history + visible counters
                          await addDoc(collection(db, 'tool_results'), {
                            user_id: user.id,
                            tool_id: 'bewerbungs-gen',
                            tool_title: t.tools_data['bewerbungs-gen'].title,
                            input,
                            result,
                            created_at: new Date().toISOString(),
                          }).catch(console.error);
                          const isUnl = user.role === 'unlimited' || user.role === 'admin';
                          if (!isUnl) {
                            await updateDoc(doc(db, 'users', user.id), {
                              tool_uses: (user.toolUses || 0) + 1,
                              daily_tool_uses: (user.dailyToolUses || 0) + 1,
                            }).catch(console.error);
                          }
                        }}
                      />
                    </Suspense>
                  </div>
                )}
                {/* Inputs — width is draggable on desktop via the handle below */}
                <div
                  style={isDesktopView ? { width: toolInputW } : undefined}
                  className={`w-full lg:shrink-0 p-4 sm:p-6 bg-[#FDFCFB] dark:bg-[#2A2A26] border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5 transition-colors relative lg:min-h-0 lg:overflow-y-auto ios-scroll`}
                >
                  {((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                    (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-md flex flex-col items-center justify-start pt-12 p-8 text-center">
                      <div className="w-12 h-12 bg-[#004225]/10 flex items-center justify-center text-[#004225] mb-4 rounded-full shrink-0">
                        <Lock size={24} />
                      </div>
                      <h3 className="text-lg font-serif mb-2">
                        {activeTool.type === 'ultimate'
                          ? (language === 'FR' ? 'Outil Karriere+' : language === 'IT' ? 'Strumento Karriere+' : language === 'EN' ? 'Karriere+ Tool' : 'Karriere+ Tool')
                          : (language === 'FR' ? 'Outil Pro' : language === 'IT' ? 'Strumento Pro' : language === 'EN' ? 'Pro Tool' : 'Pro-Tool')}
                      </h3>
                      <p className="text-[10px] text-[#5C5C58] font-light max-w-xs mb-4 leading-relaxed">
                        {activeTool.type === 'ultimate'
                          ? (language === 'FR' ? 'Cet outil fait partie du plan Karriere+. Débloque les fonctions premium et l\'analyse approfondie.'
                            : language === 'IT' ? 'Questo strumento fa parte del piano Karriere+. Sblocca le funzioni premium e l\'analisi approfondita.'
                            : language === 'EN' ? 'This tool is part of the Karriere+ plan. Unlock premium features and deep analysis.'
                            : 'Dieses Tool ist Teil von Karriere+. Schalte Premium-Funktionen und die Deep-Analyse frei.')
                          : (language === 'FR' ? 'Cet outil fait partie du plan Pro. Accède à tous les outils de carrière.'
                            : language === 'IT' ? 'Questo strumento fa parte del piano Pro. Accedi a tutti gli strumenti di carriera.'
                            : language === 'EN' ? 'This tool is part of the Pro plan. Get access to all career tools.'
                            : 'Dieses Tool ist Teil des Pro-Pakets. Erhalte Zugriff auf alle Karriere-Tools.')}
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-[200px]">
                        <button
                          onClick={() => {
                            setActiveTool(null);
                            setParsedSalaryResult(null);
                            setParsedInterviewResult(null);
                            navigate('pricing');
                          }}
                          className="w-full py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331D] transition-all"
                        >
                          {t.tool_see_plans}
                        </button>
                        <button
                          onClick={() => { setActiveTool(null); setParsedSalaryResult(null); setParsedInterviewResult(null); setInterviewSession(null); setInterviewAnswer(''); }}
                          className="w-full py-3 border border-black/10 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all"
                        >
                          {t.tool_maybe_later}
                        </button>
                      </div>
                    </div>
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-[#004225] dark:text-[#FAFAF8]">{t.tool_inputs}</h4>
                  <div className="space-y-4">
                    {activeTool.inputs.map((input: any, inputIdx: number) => (
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
                            autoFocus={isDesktopView && inputIdx === 0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isProcessingTool && !isToolLocked && !isToolLimitReached && !isDailyLimitReached) {
                                e.preventDefault();
                                processTool();
                              }
                            }}
                            className="w-full p-4 bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#004225] dark:focus:border-[#FAFAF8] transition-all font-light text-[#1A1A18] dark:text-[#FAFAF8]"
                            placeholder={input.placeholder}
                            value={toolInput[input.key] || ''}
                            onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                    {/* Strategy tool: tappable Swiss examples fill the single
                        field in one click — the fastest path to a first
                        result, and they show what a good input looks like. */}
                    {activeTool.id === 'tracker' && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94] mb-2">
                          {language === 'FR' ? 'Exemples à taper' : language === 'IT' ? 'Esempi da toccare' : language === 'EN' ? 'Tap an example' : 'Beispiele zum Antippen'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(language === 'FR'
                            ? ['Chef de projet chez Roche, Bâle', 'Infirmière au CHUV, Lausanne', 'Employé de commerce dans une banque, Genève']
                            : language === 'IT'
                            ? ['Project manager presso Roche, Basilea', 'Infermiera all\'ospedale cantonale, Lugano', 'Impiegato di commercio in banca, Bellinzona']
                            : language === 'EN'
                            ? ['Project lead at Roche, Basel', 'Nurse at the University Hospital, Zurich', 'Commercial apprentice at a bank, Bern']
                            : ['Projektleiter bei Roche, Basel', 'Pflegefachfrau am Unispital, Zürich', 'KV-Abgänger bei einer Bank, Bern']
                          ).map((ex) => (
                            <button
                              key={ex}
                              onClick={() => setToolInput({ ...toolInput, jobTitle: ex })}
                              className="px-3 py-1.5 text-[11px] font-light border border-black/10 dark:border-white/10 rounded-full text-[#4A4A45] dark:text-[#9A9A94] hover:border-[#004225] hover:text-[#004225] dark:hover:border-[#00A854] dark:hover:text-[#00A854] hover:bg-[#004225]/[0.04] transition-all"
                            >
                              {ex}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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

                      {user && (
                        <div className="flex justify-between items-center px-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[#004225] rounded-full animate-pulse shadow-[0_0_8px_rgba(0,66,37,0.4)]" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5C5C58] dark:text-[#9A9A94]">
                              {(user.role === 'unlimited' || user.role === 'admin')
                                ? `${Math.max(0, 100 - (user.toolUses || 0))} ${t.remaining}`
                                : user.role === 'pro'
                                ? `${Math.max(0, 30 - (user.toolUses || 0))} ${t.remaining}`
                                : `${Math.max(0, 3 - (user.toolUses || 0))} ${t.remaining}`
                              }
                            </span>
                          </div>
                          {(user.role === 'pro' || user.role === 'unlimited' || user.role === 'admin') && (
                            <span className="text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8] opacity-60">
                              {t.dashboard_reset_monthly}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Draggable divider — desktop only. Drag left/right to
                    resize the input column. */}
                <div
                  onMouseDown={startToolResize}
                  role="separator"
                  aria-orientation="vertical"
                  title="Breite ziehen"
                  className="hidden lg:flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent hover:bg-[#004225]/15 dark:hover:bg-[#00A854]/20 active:bg-[#004225]/30 transition-colors group/resize"
                >
                  <span className="w-0.5 h-8 rounded-full bg-transparent group-hover/resize:bg-[#004225] dark:group-hover/resize:bg-[#00A854] transition-colors" />
                </div>

                {/* Results */}
                <div className="flex-1 p-4 sm:p-6 bg-white dark:bg-[#1A1A18] relative transition-colors lg:min-h-0 lg:overflow-y-auto custom-scrollbar ios-scroll min-h-[200px]">
                  {/* INTERACTIVE INTERVIEW SESSION */}
                  {activeTool.id === 'interview-live' && interviewSession && !isProcessingTool ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-4 flex-wrap pb-5 border-b border-black/8 dark:border-white/8">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 bg-[#004225] text-white flex items-center justify-center shadow-md shrink-0">
                            <Headphones size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[15px] font-semibold text-[#1A1A18] dark:text-[#FAFAF8] leading-tight truncate">{interviewSession.questions[0] && !interviewSession.isComplete ? `${interviewSession.jobContext || toolInput.jobTitle}` : t.interview_complete}</h4>
                            <p className="text-[11px] text-[#9A9A94] font-light mt-0.5 uppercase tracking-widest">{t.interview_question_of.replace('{current}', String(Math.min(interviewSession.currentQ + 1, 5)))}</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="flex gap-1 shrink-0">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#1A1A18]/90 backdrop-blur-md z-10">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[#004225]/20 dark:bg-[#6FCF97]/20 blur-2xl animate-pulse" />
                        <motion.div
                          className="relative w-14 h-14 border-2 border-[#004225]/20 dark:border-[#6FCF97]/20 border-t-[#004225] dark:border-t-[#6FCF97] rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles size={18} className="text-[#004225] dark:text-[#6FCF97]" />
                        </div>
                      </div>
                      <motion.p
                        key={Math.floor(Date.now() / 2400) % 4}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#004225] dark:text-[#6FCF97]"
                      >
                        {t.tool_analyzing}
                      </motion.p>
                      <p className="mt-2 text-[9px] text-[#9A9A94] font-light max-w-xs text-center px-4">
                        {language === 'EN' ? 'Stella is consulting Swiss market data and applying recruiter standards' : language === 'FR' ? 'Stella consulte les données du marché suisse et applique les standards recruteurs' : language === 'IT' ? 'Stella consulta i dati del mercato svizzero e applica gli standard dei recruiter' : 'Stella prüft Schweizer Marktdaten und wendet Recruiter-Standards an'}
                      </p>
                    </div>
                  ) : toolResult ? (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                      className="h-full flex flex-col"
                    >
                      {/* ── Premium Result Header (hidden for interview card — it has its own) ── */}
                      {!(activeTool.id === 'interview' && parsedInterviewResult) && (
                      <div className="flex flex-col gap-5 mb-6 pb-5 border-b border-black/8 dark:border-white/8">
                        {/* Title row */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 bg-[#004225] text-white flex items-center justify-center shadow-md shrink-0">
                              {activeTool.icon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[15px] font-semibold text-[#1A1A18] dark:text-[#FAFAF8] leading-tight truncate">{activeTool.title}</h4>
                              <p className="text-[11px] text-[#9A9A94] font-light mt-0.5">Stella · {new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#004225]/70 dark:text-[#6FCF97]/70 shrink-0">
                            <ShieldCheck size={11} />
                            AI-verified
                          </div>
                        </div>
                        {/* Action bar */}
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            onClick={downloadAsPDF}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] hover:bg-[#004225]/5 dark:text-[#9A9A94] dark:hover:text-[#FAFAF8] dark:hover:bg-white/5 transition-colors"
                          >
                            <FileText size={12} />
                            PDF
                          </button>
                          <button
                            onClick={downloadAsWord}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] hover:bg-[#004225]/5 dark:text-[#9A9A94] dark:hover:text-[#FAFAF8] dark:hover:bg-white/5 transition-colors"
                          >
                            <FileUp size={12} />
                            Word
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(toolResult); showToast(t.tool_copy); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] hover:bg-[#004225]/5 dark:text-[#9A9A94] dark:hover:text-[#FAFAF8] dark:hover:bg-white/5 transition-colors"
                          >
                            <Copy size={12} />
                            {t.tool_copy}
                          </button>
                          <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-2 shrink-0" aria-hidden="true" />
                          <button
                            onClick={() => { if (isEditingToolResult) setToolResult(toolResultEditable); setIsEditingToolResult(!isEditingToolResult); }}
                            className="flex items-center gap-1.5 px-5 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#004225] text-white hover:bg-[#00331d] shadow-sm hover:shadow-md transition-all"
                          >
                            {isEditingToolResult ? <><CheckCircle2 size={12} /> OK</> : <><FileText size={12} /> {language === 'FR' ? 'Modifier' : language === 'IT' ? 'Modifica' : language === 'EN' ? 'Edit' : 'Bearbeiten'}</>}
                          </button>
                        </div>
                      </div>
                      )}

                      {/* ── Result Content ── */}
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {isEditingToolResult ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full min-h-[400px] p-4 bg-white dark:bg-[#1A1A18] border border-[#004225]/30 text-sm font-light text-[#1A1A18] dark:text-[#FAFAF8] focus:outline-none focus:border-[#004225] transition-all leading-relaxed resize-y"
                              value={toolResultEditable}
                              onChange={(e) => setToolResultEditable(e.target.value)}
                            />
                            <button onClick={() => { setToolResultEditable(toolResult || ''); setIsEditingToolResult(false); }} className="text-[9px] text-[#9A9A94] hover:text-[#004225] transition-colors">
                              {language === 'FR' ? 'Annuler' : language === 'IT' ? 'Annulla' : language === 'EN' ? 'Cancel' : 'Abbrechen'}
                            </button>
                          </div>
                        ) : activeTool.id === 'interview' && parsedInterviewResult ? (
                          /* ── Interview-Coach Premium Card ── */
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                            className="bg-white dark:bg-[#1A1A18] border border-[#004225]/15 dark:border-white/10 overflow-hidden shadow-xl"
                          >
                            {/* Header */}
                            <div className="relative overflow-hidden bg-[#004225] px-6 sm:px-7 pt-7 pb-6">
                              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/[0.04]" />
                              <div className="absolute -bottom-16 right-16 w-36 h-36 rounded-full bg-white/[0.03]" />
                              <div className="relative">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.4, delay: 0.1 }}
                                  className="inline-flex items-center gap-1.5 bg-white/[0.12] border border-white/20 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/85 mb-3.5"
                                >
                                  <ShieldCheck size={11} />
                                  AI-Verified · Stellify Swiss AI
                                </motion.div>
                                <h3 className="text-xl sm:text-2xl font-serif text-white tracking-tight leading-tight mb-1">{parsedInterviewResult.title || 'Interview-Vorbereitung'}</h3>
                                {parsedInterviewResult.subtitle && (
                                  <p className="text-[13px] text-white/60 font-light">{parsedInterviewResult.subtitle}</p>
                                )}
                                {Array.isArray(parsedInterviewResult.tags) && parsedInterviewResult.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-4">
                                    {parsedInterviewResult.tags.map((tag: string, i: number) => (
                                      <span key={i} className="bg-white/10 border border-white/[0.18] rounded-md px-2.5 py-1 text-[11px] text-white/80">{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Score row */}
                            {parsedInterviewResult.stats && (
                              <div className="grid grid-cols-3 gap-px bg-black/8 dark:bg-white/10 border-b border-black/8 dark:border-white/10">
                                {[
                                  { n: parsedInterviewResult.stats.questions, l: language === 'EN' ? 'Questions' : language === 'FR' ? 'Questions' : language === 'IT' ? 'Domande' : 'Fragen' },
                                  { n: parsedInterviewResult.stats.topics, l: language === 'EN' ? 'Key topics' : language === 'FR' ? 'Thèmes clés' : language === 'IT' ? 'Temi chiave' : 'Kernthemen' },
                                  { n: parsedInterviewResult.stats.match != null ? `${parsedInterviewResult.stats.match}%` : '-', l: language === 'EN' ? 'Match' : language === 'IT' ? 'Affinità' : language === 'FR' ? 'Affinité' : 'Match', accent: true },
                                ].map((s, i) => (
                                  <div key={i} className="bg-white dark:bg-[#1A1A18] py-3.5 text-center">
                                    <div className={`text-xl font-semibold leading-none ${s.accent ? 'text-[#2a7a4a] dark:text-[#6FCF97]' : 'text-[#004225] dark:text-[#FAFAF8]'}`}>{s.n ?? '-'}</div>
                                    <div className="text-[10px] text-[#8a9e8d] dark:text-[#9A9A94] mt-1 uppercase tracking-wide">{s.l}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Body */}
                            <div className="px-5 sm:px-6 py-6 flex flex-col gap-6">
                              {/* Elevator Pitch */}
                              {parsedInterviewResult.elevatorPitch && (
                                <motion.div
                                  initial={{ opacity: 0, y: 14 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.45, delay: 0.15 }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-[#004225]/8 dark:bg-[#6FCF97]/10 flex items-center justify-center shrink-0">
                                      <UserIcon size={14} className="text-[#004225] dark:text-[#6FCF97]" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[#004225] dark:text-[#6FCF97]">Elevator Pitch</span>
                                  </div>
                                  <div className="relative bg-[#004225]/[0.04] dark:bg-[#6FCF97]/[0.06] rounded-lg p-4 pl-7">
                                    <span className="absolute top-0 left-2.5 text-5xl font-serif text-[#004225]/15 leading-none select-none">&ldquo;</span>
                                    <p className="relative text-[13px] italic leading-relaxed text-[#2a4a30] dark:text-[#CDE8D5]">{parsedInterviewResult.elevatorPitch}</p>
                                  </div>
                                </motion.div>
                              )}

                              {/* Questions */}
                              {Array.isArray(parsedInterviewResult.questions) && parsedInterviewResult.questions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 14 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.45, delay: 0.25 }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-[#004225]/8 dark:bg-[#6FCF97]/10 flex items-center justify-center shrink-0">
                                      <HelpCircle size={14} className="text-[#004225] dark:text-[#6FCF97]" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[#004225] dark:text-[#6FCF97]">
                                      {language === 'EN' ? 'Typical questions & model answers' : language === 'FR' ? 'Questions typiques & réponses modèles' : language === 'IT' ? 'Domande tipiche & risposte modello' : 'Typische Fragen & Musterantworten'}
                                    </span>
                                  </div>
                                  <div className="space-y-2.5">
                                    {parsedInterviewResult.questions.map((q: any, i: number) => (
                                      <div key={i} className="bg-[#004225]/[0.03] dark:bg-white/[0.03] rounded-lg border-l-[3px] border-[#004225] p-3.5">
                                        <p className="text-[13px] font-semibold text-[#111] dark:text-[#FAFAF8] leading-snug mb-2">{q.question}</p>
                                        <p className="text-[12.5px] text-[#4a6050] dark:text-[#9FBCA8] leading-relaxed">{q.answer}</p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}

                              {/* Tips */}
                              {Array.isArray(parsedInterviewResult.tips) && parsedInterviewResult.tips.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 14 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.45, delay: 0.35 }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-[#004225]/8 dark:bg-[#6FCF97]/10 flex items-center justify-center shrink-0">
                                      <Lightbulb size={14} className="text-[#004225] dark:text-[#6FCF97]" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[#004225] dark:text-[#6FCF97]">
                                      {language === 'EN' ? 'Coaching tips' : language === 'FR' ? 'Conseils de coaching' : language === 'IT' ? 'Consigli di coaching' : 'Coaching-Tipps'}
                                    </span>
                                  </div>
                                  <div>
                                    {parsedInterviewResult.tips.map((tip: string, i: number) => (
                                      <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-[#004225]/8 dark:border-white/8 last:border-b-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#6FCF97] shrink-0 mt-1.5" />
                                        <p className="text-[12.5px] text-[#4a6050] dark:text-[#9FBCA8] leading-relaxed">{tip}</p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 sm:px-6 py-3.5 border-t border-[#004225]/10 dark:border-white/8 bg-[#004225]/[0.03] dark:bg-white/[0.02] flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => { navigator.clipboard.writeText(toolResult); showToast(t.tool_copy); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-md border border-[#004225]/20 text-[#004225] dark:text-[#6FCF97] dark:border-white/15 hover:bg-[#004225]/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <Copy size={12} /> {t.tool_copy}
                              </button>
                              <button
                                onClick={downloadAsPDF}
                                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-md border border-[#004225]/20 text-[#004225] dark:text-[#6FCF97] dark:border-white/15 hover:bg-[#004225]/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <FileText size={12} /> PDF
                              </button>
                              <div className="flex-1" />
                              <span className="text-[11px] text-[#b0c2b3] dark:text-[#5C5C58]">Stella · {new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                              <button
                                onClick={() => { setToolResultEditable(toolResult); setIsEditingToolResult(true); }}
                                className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold rounded-md bg-[#004225] text-white hover:bg-[#00331d] shadow-sm transition-colors"
                              >
                                <FileText size={12} /> {language === 'FR' ? 'Modifier' : language === 'IT' ? 'Modifica' : language === 'EN' ? 'Edit' : 'Bearbeiten'}
                              </button>
                            </div>
                          </motion.div>
                        ) : activeTool.id === 'salary-calc' && parsedSalaryResult ? (
                          /* ── Salary Result ── */
                          <div className="space-y-8 py-4">
                            <div className="relative overflow-hidden bg-[#004225] p-8 text-center space-y-3">
                              <div className="absolute inset-0 opacity-5" style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'12px 12px'}} />
                              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#6FCF97]">{t.salary_median_label}</p>
                              <h3 className="text-5xl font-serif text-white tracking-tight">CHF {parsedSalaryResult.medianSalary.toLocaleString('de-CH')}</h3>
                              <p className="text-[10px] text-white/50 font-light">{parsedSalaryResult.jobTitle} · {parsedSalaryResult.canton}</p>
                            </div>
                            <div className="space-y-3 px-1">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-2">
                                <span>Min</span><span>Median</span><span>Max</span>
                              </div>
                              <div className="relative h-3 bg-black/8 dark:bg-white/8 rounded-full overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#004225]/30 via-[#004225] to-[#004225]/30" style={{left:`${(parsedSalaryResult.minSalary/(parsedSalaryResult.maxSalary*1.1))*100}%`,right:`${100-(parsedSalaryResult.maxSalary/(parsedSalaryResult.maxSalary*1.1))*100}%`}} />
                                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{left:`${(parsedSalaryResult.medianSalary/(parsedSalaryResult.maxSalary*1.1))*100}%`}} />
                              </div>
                              <div className="flex justify-between text-[11px] font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">
                                <span>CHF {parsedSalaryResult.minSalary.toLocaleString('de-CH')}</span>
                                <span className="text-[#004225] dark:text-[#6FCF97]">CHF {parsedSalaryResult.medianSalary.toLocaleString('de-CH')}</span>
                                <span>CHF {parsedSalaryResult.maxSalary.toLocaleString('de-CH')}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {parsedSalaryResult.insights.map((insight: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-[#004225]/4 dark:bg-[#004225]/10 border-l-2 border-[#004225]">
                                  <div className="w-7 h-7 bg-[#004225] text-white flex items-center justify-center shrink-0">
                                    {i === 0 ? <MapPin size={13} /> : i === 1 ? <Briefcase size={13} /> : <TrendingUp size={13} />}
                                  </div>
                                  <p className="text-[11px] font-light leading-relaxed text-[#1A1A18] dark:text-[#FAFAF8] pt-0.5">{insight}</p>
                                </div>
                              ))}
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 flex items-start gap-2">
                              <Info size={14} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                              <p className="text-[10px] font-light leading-relaxed text-amber-800 dark:text-amber-300">{t.salary_disclaimer}</p>
                            </div>
                          </div>
                        ) : (
                          /* ── Premium Markdown Result ── */
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="space-y-0 relative"
                          >
                            {/* Subtle ambient glow */}
                            <div
                              aria-hidden="true"
                              className="absolute -top-8 left-1/2 -translate-x-1/2 w-[60%] h-32 bg-[#004225]/4 dark:bg-[#6FCF97]/5 blur-3xl pointer-events-none"
                            />
                            {/* Tool-specific banner */}
                            {(activeTool.id === 'cv-premium' || activeTool.id === 'career-roadmap' || activeTool.id === 'cv-gen' || activeTool.id === 'zeugnis' || activeTool.id === 'cv-optimizer' || activeTool.id === 'linkedin-job') && (
                              <div className="mb-6 flex items-center gap-3 p-3.5 bg-gradient-to-r from-[#004225]/8 to-transparent border-l-4 border-[#004225]">
                                <Sparkles size={14} className="text-[#004225] shrink-0" />
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#004225]">
                                    {activeTool.id === 'cv-premium' ? 'Swiss Premium CV Standard'
                                      : activeTool.id === 'career-roadmap' ? 'Swiss Career Strategy'
                                      : activeTool.id === 'zeugnis' ? (language === 'FR' ? 'Certificat de travail · Code suisse' : language === 'IT' ? 'Certificato di lavoro · Codice svizzero' : language === 'EN' ? 'Reference Letter · Swiss Code' : 'Arbeitszeugnis · Schweizer Code')
                                      : activeTool.id === 'cv-gen' ? (language === 'FR' ? 'Lettre de motivation · Format suisse' : language === 'IT' ? 'Lettera di motivazione · Formato svizzero' : language === 'EN' ? 'Cover Letter · Swiss Format' : 'Bewerbungsschreiben · Swiss Format')
                                      : activeTool.id === 'cv-optimizer' ? 'CV Precision Optimizer'
                                      : 'LinkedIn Application Package'}
                                  </p>
                                  <p className="text-[8px] text-[#004225]/60 font-light mt-0.5">
                                    {language === 'EN' ? 'Generated for the Swiss job market · Please review before use' : language === 'FR' ? 'Généré pour le marché suisse · À vérifier avant utilisation' : language === 'IT' ? 'Generato per il mercato svizzero · Verificare prima dell\'uso' : 'Für Schweizer Markt generiert · Bitte vor Verwendung prüfen'}
                                  </p>
                                </div>
                              </div>
                            )}
                            {(activeTool.id === 'cv-analysis' || activeTool.id === 'ats-sim') && (
                              <div className="mb-6 flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/10 border-l-4 border-blue-600">
                                <Target size={14} className="text-blue-600 shrink-0" />
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">Swiss Market Deep Analysis</p>
                                  <p className="text-[8px] text-blue-600/60 font-light mt-0.5">{t.premium_analysis_desc}</p>
                                </div>
                              </div>
                            )}
                            {/* Rendered markdown with premium styling */}
                            <div className="[&>*:first-child]:mt-0">
                              <Markdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({children}) => (
                                    <div className="flex items-center gap-2 mt-7 mb-4 pb-2 border-b-2 border-[#004225]/15">
                                      <div className="w-1 h-5 bg-[#004225] shrink-0" />
                                      <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#6FCF97] m-0">{children}</h2>
                                    </div>
                                  ),
                                  h2: ({children}) => (
                                    <div className="flex items-center gap-2 mt-6 mb-3">
                                      <div className="w-1 h-4 bg-[#004225]/50 shrink-0" />
                                      <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#004225] dark:text-[#6FCF97] m-0">{children}</h3>
                                    </div>
                                  ),
                                  h3: ({children}) => (
                                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#4A4A45] dark:text-[#CACAC4] mt-4 mb-2">{children}</h4>
                                  ),
                                  p: ({children}) => (
                                    <p className="text-[14px] leading-[1.8] text-[#1A1A18] dark:text-[#EBEBEB] font-light mb-3">{children}</p>
                                  ),
                                  li: ({children}) => (
                                    <li className="flex items-start gap-2 mb-2 list-none">
                                      <span className="mt-[7px] w-1.5 h-1.5 bg-[#004225] dark:bg-[#6FCF97] rounded-full shrink-0" />
                                      <span className="text-[13px] leading-relaxed text-[#1A1A18] dark:text-[#EBEBEB] font-light">{children}</span>
                                    </li>
                                  ),
                                  ul: ({children}) => <ul className="my-3 pl-0 space-y-1">{children}</ul>,
                                  ol: ({children}) => <ol className="my-3 pl-0 space-y-1 [counter-reset:item]">{children}</ol>,
                                  strong: ({children}) => <strong className="font-semibold text-[#004225] dark:text-[#6FCF97]">{children}</strong>,
                                  hr: () => <hr className="border-0 border-t border-[#004225]/10 my-6" />,
                                  blockquote: ({children}) => (
                                    <div className="border-l-4 border-[#004225] pl-4 py-1 my-4 bg-[#004225]/4 dark:bg-[#004225]/10">
                                      <div className="text-[13px] font-light italic text-[#1A1A18] dark:text-[#EBEBEB] leading-relaxed">{children}</div>
                                    </div>
                                  ),
                                  code: ({children}) => (
                                    <code className="bg-[#004225]/8 dark:bg-[#004225]/20 text-[#004225] dark:text-[#6FCF97] px-1.5 py-0.5 text-[12px] font-mono rounded-sm">{children}</code>
                                  ),
                                  table: ({children}) => (
                                    <div className="my-5 overflow-x-auto -mx-1 px-1">
                                      <table className="w-full border-collapse text-[13px]">{children}</table>
                                    </div>
                                  ),
                                  thead: ({children}) => (
                                    <thead className="bg-[#004225] text-white dark:bg-[#00331d]">{children}</thead>
                                  ),
                                  th: ({children}) => (
                                    <th className="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap first:pl-4 last:pr-4">{children}</th>
                                  ),
                                  tbody: ({children}) => (
                                    <tbody className="divide-y divide-black/5 dark:divide-white/8">{children}</tbody>
                                  ),
                                  tr: ({children}) => (
                                    <tr className="even:bg-[#004225]/[0.03] dark:even:bg-white/[0.02] hover:bg-[#004225]/[0.06] dark:hover:bg-white/[0.04] transition-colors">{children}</tr>
                                  ),
                                  td: ({children}) => (
                                    <td className="px-3.5 py-2.5 text-[13px] font-light text-[#1A1A18] dark:text-[#EBEBEB] align-top first:pl-4 last:pr-4">{children}</td>
                                  ),
                                  a: ({children, href}) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#004225] dark:text-[#6FCF97] font-medium underline decoration-[#004225]/25 dark:decoration-[#6FCF97]/25 underline-offset-2 hover:decoration-[#004225] dark:hover:decoration-[#6FCF97] transition-colors">{children}</a>
                                  ),
                                }}
                              >{toolResult}</Markdown>
                            </div>
                            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                              <p className="text-[8px] text-[#9A9A94] font-bold uppercase tracking-widest">{t.ai_notice}</p>
                              <div className="flex items-center gap-1 text-[8px] text-[#9A9A94]">
                                <ShieldCheck size={9} />
                                <span>Stellify · Swiss AI</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-start pt-4 pb-12 space-y-6 max-w-2xl mx-auto w-full">
                      {/* Compact intro: the tool speaks for itself; the full
                          explanation with the animated demo lives behind the
                          question mark (top right) and the button below. */}
                      <div className="text-center space-y-4 max-w-md pt-6">
                        <div className="mx-auto w-14 h-14 bg-[#004225]/8 dark:bg-[#00A854]/12 rounded-full flex items-center justify-center text-[#004225] dark:text-[#00A854]">
                          {activeTool.icon}
                        </div>
                        <h4 className="text-lg font-serif text-[#1A1A18] dark:text-[#FAFAF8]">{activeTool.title}</h4>
                        <p className="text-xs text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed">{activeTool.desc}</p>
                        <button
                          onClick={() => setShowToolHelp(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-[#004225]/25 dark:border-[#00A854]/40 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:bg-[#004225]/5 dark:hover:bg-[#00A854]/10 transition-all rounded-full"
                        >
                          <HelpCircle size={13} />
                          {language === 'FR' ? 'Comment ça marche ?' : language === 'IT' ? 'Come funziona?' : language === 'EN' ? 'How does it work?' : 'Wie funktioniert das?'}
                        </button>
                      </div>

                      {hasExampleFor(activeTool.id) && !isProcessingTool && (
                        <button
                          onClick={runExample}
                          className="group w-full p-5 bg-[#004225] hover:bg-[#00331d] dark:bg-[#00A854] dark:hover:bg-[#00964a] text-white rounded-lg transition-all text-left flex items-center gap-4 shadow-md hover:shadow-lg"
                        >
                          <span className="shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles size={18} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[11px] font-bold uppercase tracking-[0.15em]">{t.tool_try_example}</span>
                            <span className="block text-[11px] text-white/75 font-light mt-0.5 leading-snug">{t.tool_try_example_sub}</span>
                          </span>
                          <ChevronRight size={18} className="shrink-0 opacity-75 group-hover:translate-x-1 transition-transform" />
                        </button>
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
                            onClick={() => { setActiveTool(null); navigate('pricing'); }}
                            className="w-full py-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-amber-700 transition-all"
                          >
                            {t.tool_discover_unlimited}
                          </button>
                        </div>
                      )}

                      {/* Direction hint matches the actual layout: fields sit
                          ABOVE on phones/tablets (stacked), LEFT on laptops. */}
                      <div className="pt-4 hidden lg:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                        <ArrowLeft size={12} />
                        <span>{t.tool_fill_fields}</span>
                      </div>
                      <div className="pt-4 flex lg:hidden items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                        <ArrowUp size={12} />
                        <span>{language === 'FR' ? 'Remplis les champs ci-dessus' : language === 'IT' ? 'Compila i campi qui sopra' : language === 'EN' ? 'Fill in the fields above' : 'Fülle die Felder oben aus'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {/* --- GENERATED APP MODAL --- */}
      <AnimatePresence>
        {generatedApp && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl max-h-[88dvh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-black/8 flex items-center justify-between gap-4 bg-[#FDFCFB]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 shrink-0 bg-[#004225] text-white flex items-center justify-center shadow-md">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-serif text-[#1A1A18] leading-tight truncate">{t.generated_app_title}</h3>
                    <p className="text-[10px] text-[#9A9A94] font-light mt-0.5">Stella · {new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                </div>
                <button onClick={() => setGeneratedApp(null)} className="p-2 shrink-0 hover:bg-black/5 rounded-full transition-colors text-[#5C5C58] hover:text-[#1A1A18]">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                {generatedApp}
              </div>
              <div className="p-5 border-t border-black/8 flex items-center justify-end gap-1 flex-wrap bg-[#FDFCFB]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedApp);
                    showToast(t.tool_copied);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] hover:bg-[#004225]/5 transition-colors"
                >
                  <Copy size={12} />
                  {t.tool_copy}
                </button>
                <div className="w-px h-5 bg-black/10 mx-2 shrink-0" aria-hidden="true" />
                <button
                  onClick={() => setGeneratedApp(null)}
                  className="flex items-center gap-1.5 px-5 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#004225] text-white hover:bg-[#00331d] shadow-sm hover:shadow-md transition-all"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EXIT INTENT (pricing) --- */}
      <AnimatePresence>
        {showExitIntent && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm" onClick={() => setShowExitIntent(false)}>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden text-white shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #00331d 0%, #004225 55%, #0a5233 100%)' }}
            >
              <svg viewBox="0 0 100 100" className="absolute -left-6 -bottom-6 w-32 h-32 opacity-[0.12]" aria-hidden="true">
                <path d="M50 16 Q55 42 80 52 Q56 56 48 84 Q45 58 20 46 Q46 42 50 16 Z" fill="#6FCF97" />
              </svg>
              <button
                onClick={() => setShowExitIntent(false)}
                className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/25 border border-white/20 text-white/85 hover:text-white hover:bg-black/40 transition-all"
                aria-label={language === 'FR' ? 'Fermer' : language === 'IT' ? 'Chiudi' : language === 'EN' ? 'Close' : 'Schliessen'}
              >
                <X size={16} />
              </button>
              <div className="relative p-7 sm:p-9">
                <h3 className="text-2xl font-serif mb-3">
                  {language === 'FR' ? 'Encore en train de réfléchir ?' : language === 'IT' ? 'Ci stai ancora pensando?' : language === 'EN' ? 'Still thinking it over?' : 'Noch am Überlegen?'}
                </h3>
                <p className="text-sm text-white/80 font-light leading-relaxed mb-6">
                  {language === 'FR' ? 'Commence gratuitement et décide plus tard. 3 candidatures offertes, sans carte de crédit.'
                    : language === 'IT' ? 'Inizia gratis e decidi dopo. 3 candidature in regalo, senza carta di credito.'
                    : language === 'EN' ? 'Start free and decide later. 3 applications on us, no credit card.'
                    : 'Starte gratis und entscheide später. 3 Bewerbungen geschenkt, keine Kreditkarte nötig.'}
                </p>
                <button
                  onClick={() => {
                    setShowExitIntent(false);
                    if (user) { handleToolClick('bewerbungs-gen'); }
                    else { setAuthTab('register'); setIsAuthModalOpen(true); }
                  }}
                  className="w-full py-3.5 bg-white text-[#004225] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#E8F3EC] transition-colors"
                >
                  {language === 'FR' ? 'Commencer gratuitement' : language === 'IT' ? 'Inizia gratis' : language === 'EN' ? 'Start for free' : 'Gratis starten'}
                </button>
                <button
                  onClick={() => setShowExitIntent(false)}
                  className="w-full mt-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors"
                >
                  {language === 'FR' ? 'Continuer à regarder' : language === 'IT' ? 'Continua a guardare' : language === 'EN' ? 'Keep browsing' : 'Weiter schauen'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* --- AUTH MODAL --- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            /* No opacity fade-in: a translucent full-page overlay let the
               landing shine through mid-animation (ghosted double image).
               The page appears solid instantly; only the card animates. */
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-[200] overflow-y-auto custom-scrollbar bg-[#FDFCFB] dark:bg-[#1A1A18]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            {/* Quiet aurora backdrop — the sign-in is a full page now, so it
                gets the same premium ambience as the landing hero. */}
            <div className="pointer-events-none fixed inset-0" aria-hidden="true">
              <div className="absolute top-[-25%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.5] dark:opacity-25"
                   style={{ background: 'radial-gradient(circle, rgba(0,168,84,0.16) 0%, rgba(0,168,84,0.05) 35%, transparent 70%)', filter: 'blur(60px)' }} />
              <div className="absolute bottom-[-30%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-[0.4] dark:opacity-20"
                   style={{ background: 'radial-gradient(circle, rgba(108,240,161,0.14) 0%, rgba(0,168,84,0.05) 40%, transparent 70%)', filter: 'blur(60px)' }} />
            </div>
            <div className="relative min-h-full flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12">
              {/* Brand mark above the card — this is a page, not a popup */}
              <div className="flex items-center gap-2.5 mb-7 text-[#1A1A18] dark:text-[#FAFAF8]">
                <svg width="30" height="30" viewBox="0 0 32 32" className="text-[#004225] dark:text-[#00A854]" aria-hidden="true">
                  <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                </svg>
                <span className="text-3xl sm:text-4xl font-serif tracking-tight">Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span></span>
              </div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="
                relative w-full sm:max-w-md
                bg-white dark:bg-[#22221F] text-[#1A1A18] dark:text-[#FAFAF8]
                shadow-xl border border-black/8 dark:border-white/8
                px-5 pt-6 sm:p-8 md:p-10
                pb-[max(1.5rem,env(safe-area-inset-bottom))]
              "
            >
              <button
                onClick={() => { setIsAuthModalOpen(false); setConfirmPassword(''); setAuthError(''); }}
                aria-label={language === 'FR' ? 'Fermer' : language === 'IT' ? 'Chiudi' : language === 'EN' ? 'Close' : 'Schliessen'}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]"
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
                <h3 id="auth-modal-title" className="text-xl font-medium mt-2">
                  {authTab === 'login'
                    ? (language === 'FR' ? 'Bon retour chez Stellify' : language === 'IT' ? 'Bentornato su Stellify' : language === 'EN' ? 'Welcome back to Stellify' : 'Willkommen zurück bei Stellify')
                    : authTab === 'register'
                    ? (language === 'FR' ? 'Créez votre accès premium' : language === 'IT' ? 'Crea il tuo accesso premium' : language === 'EN' ? 'Create your premium access' : 'Erstelle deinen Premium-Zugang')
                    : t.auth_reset_password_title}
                </h3>
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light mt-2">
                  {authTab === 'forgot'
                    ? t.auth_reset_password_desc
                    : authTab === 'login'
                    ? (language === 'FR'
                      ? 'Connectez-vous et reprenez votre prochaine candidature exactement là où vous vous êtes arrêté.'
                      : language === 'IT'
                      ? 'Accedi e riprendi la tua prossima candidatura esattamente da dove avevi lasciato.'
                      : language === 'EN'
                      ? 'Sign in and continue your next application exactly where you left off.'
                      : 'Melde dich an und setze deine nächste Bewerbung genau dort fort, wo du aufgehört hast.')
                    : (language === 'FR'
                      ? 'Créez votre compte et transformez votre CV en candidature suisse de haut niveau.'
                      : language === 'IT'
                      ? 'Crea il tuo account e trasforma il tuo CV in una candidatura svizzera di alto livello.'
                      : language === 'EN'
                      ? 'Create your account and turn your CV into a Swiss-grade application.'
                      : 'Erstelle dein Konto und verwandle deinen Lebenslauf in eine Bewerbung auf Schweizer Spitzenniveau.')}
                </p>
              </div>

              {authTab !== 'forgot' && (
                <div className="relative flex bg-[#FDFCFB] dark:bg-[#2A2A26] p-1 mb-8 border border-black/8 dark:border-white/8">
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute top-1 bottom-1 bg-white dark:bg-[#1A1A18] shadow-sm pointer-events-none"
                    style={{
                      left: authTab === 'login' ? '0.25rem' : '50%',
                      right: authTab === 'login' ? '50%' : '0.25rem',
                    }}
                    aria-hidden="true"
                  />
                  <button
                    onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    className={`relative z-10 flex-1 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${authTab === 'login' ? 'text-[#004225] dark:text-[#6FCF97]' : 'text-[#9A9A94] hover:text-[#5C5C58] dark:hover:text-[#FAFAF8]'}`}
                  >
                    {t.auth_login}
                  </button>
                  <button
                    onClick={() => { setAuthTab('register'); setAuthError(''); }}
                    className={`relative z-10 flex-1 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${authTab === 'register' ? 'text-[#004225] dark:text-[#6FCF97]' : 'text-[#9A9A94] hover:text-[#5C5C58] dark:hover:text-[#FAFAF8]'}`}
                  >
                    {t.auth_register}
                  </button>
                </div>
              )}

              <motion.form
                key={authTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onSubmit={(e) => { e.preventDefault(); if (authTab === 'forgot') handleForgotPassword(); else handleAuth(e); }}
                className="space-y-4"
              >
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
                        className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-10 pr-4 py-3.5 text-base font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none focus:border-[#004225] dark:focus:border-[#00A854] transition-all min-h-[48px]"
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
                        className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-10 pr-12 py-3.5 text-base font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none focus:border-[#004225] dark:focus:border-[#00A854] transition-all min-h-[48px]"
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
                  className="w-full bg-[#004225] text-white py-4 min-h-[52px] text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-[#00331d] shadow-md hover:shadow-lg shadow-[#004225]/25 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isAuthLoading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    authTab === 'login' ? t.auth_login : authTab === 'register' ? t.auth_create : t.auth_reset_password_btn
                  )}
                </button>

                {authTab === 'register' && (
                  <p className="text-center text-[11px] text-[#9A9A94] font-light mt-3">
                    {language === 'FR' ? 'Gratuit · sans carte de crédit · 3 candidatures offertes'
                      : language === 'IT' ? 'Gratis · senza carta di credito · 3 candidature in regalo'
                      : language === 'EN' ? 'Free · no credit card · 3 applications on us'
                      : 'Kostenlos · keine Kreditkarte nötig · 3 Bewerbungen geschenkt'}
                  </p>
                )}

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
                      className="w-full border border-black/15 dark:border-white/15 py-3.5 min-h-[52px] text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/25 dark:hover:border-white/25 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
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

                    {isInAppBrowser() && (
                      <div className="flex items-start gap-2.5 p-3 bg-[#004225]/6 dark:bg-[#00A854]/10 border border-[#004225]/20 dark:border-[#00A854]/25">
                        <Info size={14} className="shrink-0 mt-0.5 text-[#004225] dark:text-[#00A854]" />
                        <p className="text-[11px] text-[#4A4A45] dark:text-[#B5B5AF] font-light leading-relaxed">
                          {language === 'FR' ? "Tu as ouvert cette page depuis une autre app, par exemple Instagram ou TikTok. Le bouton Google n'y fonctionne pas, c'est Google qui le bloque. Le plus simple: inscris-toi ici par e-mail, ça marche parfaitement. Ou ouvre stellify.ch dans ton navigateur habituel."
                            : language === 'IT' ? "Hai aperto questa pagina da un'altra app, per esempio Instagram o TikTok. Il pulsante Google qui non funziona, è Google a bloccarlo. La via più semplice: registrati qui via e-mail, funziona perfettamente. Oppure apri stellify.ch nel tuo browser abituale."
                            : language === 'EN' ? 'You opened this page from another app, for example Instagram or TikTok. The Google button does not work there, Google itself blocks it. Easiest fix: sign up right here with your email, it works perfectly. Or open stellify.ch in your usual browser.'
                            : 'Du hast diese Seite über eine andere App geöffnet, zum Beispiel über Instagram oder TikTok. Der Google-Knopf funktioniert hier nicht, das blockiert Google selbst. Am einfachsten: Registriere dich gleich hier per E-Mail, das klappt einwandfrei. Oder öffne stellify.ch in deinem normalen Browser.'}
                        </p>
                      </div>
                    )}

                  </>
                )}


                <p className="text-[10px] text-center text-[#9A9A94] mt-6 leading-relaxed">
                  {t.auth_terms_by_signing}{' '}
                  <span className="underline cursor-pointer">{t.footer_terms}</span>
                  {' '}{t.auth_terms_and}{' '}
                  <span className="underline cursor-pointer">{t.footer_privacy}</span>.{' '}
                  {t.auth_terms_data_processing}
                </p>

              </motion.form>
            </motion.div>
            </div>
          </motion.div>
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
              {user && (auth.currentUser?.providerData.some(p => p.providerId === 'password') ? (
                <div className="space-y-1.5 mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">
                    {language === 'DE' ? 'Passwort zur Bestätigung' : language === 'FR' ? 'Mot de passe pour confirmer' : language === 'IT' ? 'Password per confermare' : 'Password to confirm'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94]" size={15} />
                    <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-red-400 transition-all dark:text-[#FAFAF8]" placeholder="••••••••" />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-[#9A9A94] text-center mb-4">
                  {language === 'DE' ? 'Du bist mit Google angemeldet, dein aktives Google-Login gilt als Bestätigung.' : language === 'FR' ? 'Tu es connecté avec Google, ta session Google active sert de confirmation.' : language === 'IT' ? 'Sei connesso con Google, la tua sessione Google attiva vale come conferma.' : 'You are signed in with Google; your active Google session counts as confirmation.'}
                </p>
              ))}
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
      </AnimatePresence>
      <AnimatePresence>
        {isPromoOpen && (
          <motion.div
            className="fixed inset-0 z-[500] overflow-hidden"
            style={{ background: '#03080A' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Suspense fallback={null}>
              <PromoSequence onComplete={() => setIsPromoOpen(false)} t={t} language={language} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPromoVideoOpen && PROMO_VIDEO_URL && (
          <Suspense fallback={null}>
            <PromoVideoModal
              src={PROMO_VIDEO_URL}
              language={language}
              onClose={() => setIsPromoVideoOpen(false)}
              onError={() => { setIsPromoVideoOpen(false); setIsPromoOpen(true); }}
            />
          </Suspense>
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
                  await updateDoc(doc(db, 'users', user.id), { has_seen_tutorial: true });
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
            alert(language === 'FR' ? 'La capture d\'écran n\'a pas pu être analysée. Veuillez saisir le texte manuellement.' : language === 'IT' ? 'Lo screenshot non ha potuto essere analizzato. Inserisci il testo manualmente.' : language === 'EN' ? 'Screenshot could not be analysed. Please enter text manually.' : 'Screenshot konnte nicht analysiert werden. Bitte Text manuell einfügen.');
          } finally {
            setIsExtractingImage(false);
          }
        }}
      />
    </div>
  );
}
