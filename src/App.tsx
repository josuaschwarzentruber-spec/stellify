/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext, useSensor, useSensors, PointerSensor, TouchSensor, KeyboardSensor,
  useDraggable, useDroppable, DragOverlay, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
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
  Quote, Coins, Cpu, ShieldCheck, Target, Layout, Mic, Rocket, Award, RefreshCw, Linkedin, Share2, Sun, Moon, ChevronDown,
  Plus, Trash2, Edit2, MoreVertical, Briefcase, MapPin, DollarSign, Calendar, Compass,
  Upload, FileUp, Copy, Eye, EyeOff, Lightbulb, Wrench, HelpCircle, Command, Activity,
  Headphones, Radio, ChevronLeft, BarChart3, CreditCard, Instagram, Image as ImageIcon,
  Pause, Volume2, VolumeX,
  Archive, ArchiveRestore, LayoutGrid, List as ListIcon,
  Clock
} from 'lucide-react';
import { auth, db } from './firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as firebaseSignOut, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { searchData, SearchItem } from './data/searchData';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FounderPortrait from './components/FounderPortrait';
const ApplicationGenerator = lazy(() => import('./components/ApplicationGenerator'));

// --- LAZY-LOADED HEAVY COMPONENTS ---
const PromoVideoModal = lazy(() => import('./components/PromoVideoModal'));
const PromoSequence = lazy(() => import('./components/PromoSequence'));
const LegalPages = lazy(() => import('./components/LegalPages'));

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
  avatar_url?: string;
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null, errorInfo: null };
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
    (this as any).setState({ errorInfo });
  }
  render() {
    if ((this as any).state.hasError) {
      const lang = (() => { try { return localStorage.getItem('language') || 'DE'; } catch { return 'DE'; } })();
      const title = lang === 'FR' ? 'Une erreur inattendue s\'est produite.' : lang === 'IT' ? 'Si è verificato un errore imprevisto.' : lang === 'EN' ? 'An unexpected error has occurred.' : 'Ein unerwarteter Fehler ist aufgetreten.';
      const desc = lang === 'FR' ? 'Wir arbeiten daran. Versuche es bitte erneut oder gehe zurück zur Startseite.' : lang === 'IT' ? 'Ci scusiamo. Riprova o torna alla pagina iniziale.' : lang === 'EN' ? 'We apologise. Please try again or go back to the homepage.' : 'Bitte entschuldige. Versuche es erneut oder gehe zurück zur Startseite.';
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
              href="mailto:support@stellify.ch?subject=Stellify%20Error"
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


const Avatar = ({ name, color, src }: { name: string, color: string, src?: string }) => (
  <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-serif text-lg shadow-inner overflow-hidden`}>
    {src ? (
      <img src={src} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      name.charAt(0)
    )}
  </div>
);

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

// Cross-platform draggable card (desktop, mobile, iPad) via @dnd-kit
function DraggableAppCard({ app, t, language, onEdit, onDelete, onArchive, onStatusChange, isDragging }: any) {
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
          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          icon={<Trash2 size={12} />}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A94] truncate group-hover:pr-20 transition-all" title={app.company}>{app.company}</p>
        <p className="text-sm font-medium text-[#1A1A18] dark:text-[#FAFAF8] leading-snug truncate" title={app.position}>{app.position}</p>
        {app.location && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B66] dark:text-[#9A9A94]">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{app.location}</span>
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
          const dateStr = due.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
          return (
            <div className={`flex items-center gap-1.5 text-[10px] font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-[#D4AF37]' : 'text-[#004225]'}`}>
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
            className="w-full text-[11px] font-medium text-[#004225] bg-white border border-[#004225]/20 hover:border-[#004225]/50 focus:border-[#004225] focus:outline-none px-2.5 py-1.5 pr-7 cursor-pointer transition-all appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%23004225' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
          >
            <option value="Wishlist">{t.tracker_wishlist}</option>
            <option value="Applied">{t.tracker_applied}</option>
            <option value="Interview">{t.tracker_interview}</option>
            <option value="Offer">{t.tracker_offer}</option>
            <option value="Rejected">{t.tracker_rejected}</option>
          </select>
        </div>
        {app.updatedAt?.toDate && (
          <span className="text-[9px] text-[#9A9A94] font-mono shrink-0 self-end pb-1.5">
            {app.updatedAt.toDate().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

function DroppableStatusColumn({ status, t, language, applications, activeId, onEdit, onDelete, onArchive, onStatusChange }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const filtered = applications.filter((a: any) => a.status === status);
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
  const [trackerView, setTrackerView] = useState<'kanban' | 'table'>('kanban');
  const [showArchived, setShowArchived] = useState(false);
  // Main view list — affected only by the archive toggle.
  const viewApplications = useMemo(
    () => applications.filter((a) => showArchived || !a.archived),
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
    return {
      total: active.length,
      inProcess: wishlist + applied + interview,
      interview,
      offer,
      interviewRate,
      offerRate,
      avgSalary,
      salaryCount: salaries.length,
    };
  }, [applications]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  // Stella chat is hidden from the UI (kept in code, reversible). Set to true
  // to re-enable the launcher entry points across the app.
  const STELLA_CHAT_ENABLED = false;
  const [cvContext, setCvContext] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isAvatarDragOver, setIsAvatarDragOver] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb' | 'about'>('dashboard');
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
  const navigate = (view: 'dashboard' | 'profile' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb' | 'about') => {
    setActiveView(view);
    setActiveTool(null);
    window.history.pushState({ view }, '', `/${view === 'dashboard' ? '' : view}`);
    if (view === 'pricing') {
      // Wait one tick for the section to mount, then smooth-scroll
      setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    type RouteView = 'dashboard' | 'profile' | 'tools' | 'jobs' | 'pricing' | 'datenschutz' | 'impressum' | 'agb' | 'about';
    const validViews: RouteView[] = ['dashboard', 'profile', 'tools', 'jobs', 'pricing', 'datenschutz', 'impressum', 'agb', 'about'];
    const viewFromPath = (path: string): RouteView | null => {
      const slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
      if (!slug) return 'dashboard';
      // Backwards-compat: /ueber-uns still routes to about
      if (slug === 'ueber-uns') return 'about';
      return (validViews as string[]).includes(slug) ? (slug as RouteView) : null;
    };

    const onPop = (e: PopStateEvent) => {
      const view = (e.state?.view as RouteView | undefined) ?? viewFromPath(window.location.pathname);
      if (view) {
        setActiveView(view);
        setActiveTool(null);
        if (view === 'pricing') {
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
      const target = initial ?? activeView;
      window.history.replaceState({ view: target }, '', target === 'dashboard' ? '/' : `/${target}`);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  const [isPromoVideoOpen, setIsPromoVideoOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

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
      if (rawData?.language && rawData.language !== language) setLanguage(rawData.language);
      if (rawData?.theme && rawData.theme !== theme) setTheme(rawData.theme);

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
      };
      setUser(newUser);

      if (rawData) {
        const today = new Date().toISOString().split('T')[0];
        if (rawData.last_daily_reset !== today) {
          updateDoc(doc(db, 'users', firebaseUser.uid), { daily_tool_uses: 0, last_daily_reset: today }).catch(console.error);
        }

        const currentMonth = new Date().toISOString().substring(0, 7);
        if ((effectiveRole === 'pro' || effectiveRole === 'unlimited') && rawData.last_monthly_reset !== currentMonth) {
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
        if (justLoggedIn.current) {
          justLoggedIn.current = false;
          setTimeout(() => setShowLoginWelcome(true), 700);
        }

        const userRef = doc(db, 'users', firebaseUser.uid);

        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const rawName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nutzer';
            const cleanName = rawName.replace(/\./g, ' ');
            const formattedName = cleanName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            const newData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
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
    'interview': ['interview', 'vorstellungsgespräch', 'vorbereitung', 'training', 'coaching', 'gespräch', 'fragen'],
    'interview-live': ['live interview', 'live coach', 'simulation', 'echtes interview', 'interview üben', 'mock interview'],
    'salary-negotiation': ['lohn', 'gehalt', 'salary', 'verhandeln', 'gehaltsverhandlung', 'gehaltsgespräch', 'negotiation', 'vergütung', 'lohnverhandlung'],
    'ats-sim': ['ats', 'bewerbungssystem', 'keywords', 'algorithmus', 'tracking system', 'ats analyse'],
    'skill-gap': ['skills', 'fähigkeiten', 'gap', 'lücke', 'kompetenzen', 'qualifikationen', 'weiterbildung', 'skill gap'],
    'career-roadmap': ['karriere', 'career', 'roadmap', 'plan', 'strategie', 'ziel', 'goal', 'zukunft', 'karriereanalyse'],
    'tracker': ['tracker', 'status', 'verfolgen', 'übersicht', 'bewerbungen verwalten', 'kanban'],
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
        { view: 'pricing',     keys: ['preis','pricing','abo','plan','kosten','tarif','prezzo','prix'], title: t.pricing, content: language === 'FR' ? 'Plans Gratuit, Pro et Karriere+. Sans renouvellement automatique.' : language === 'IT' ? 'Piani Gratuito, Pro e Karriere+. Senza rinnovo automatico.' : language === 'EN' ? 'Free, Pro and Karriere+ plans. No auto-renewal.' : 'Gratis-, Pro- und Karriere+-Plan. Ohne automatische Verlängerung.' },
        { view: 'datenschutz', keys: ['datenschutz','privacy','dsgvo','dsg','privacidad','vie privée'], title: language === 'FR' ? 'Politique de confidentialité' : language === 'IT' ? 'Informativa sulla privacy' : language === 'EN' ? 'Privacy Policy' : 'Datenschutz', content: language === 'FR' ? 'Comment nous traitons tes données personnelles selon LPD et RGPD.' : language === 'IT' ? 'Come trattiamo i tuoi dati personali secondo LPD e GDPR.' : language === 'EN' ? 'How we process your personal data under Swiss DPA and GDPR.' : 'Wie wir deine persönlichen Daten gemäss DSG und DSGVO bearbeiten.' },
        { view: 'agb',         keys: ['agb','terms','bedingungen','widerruf','kündigung'], title: language === 'FR' ? 'CGV' : language === 'IT' ? 'Termini' : language === 'EN' ? 'Terms' : 'AGB', content: language === 'FR' ? 'Conditions générales, paiement et droit de rétractation.' : language === 'IT' ? 'Condizioni generali, pagamento e diritto di recesso.' : language === 'EN' ? 'Terms, payment and right of withdrawal.' : 'Geschäftsbedingungen, Zahlung und Widerrufsrecht.' },
        { view: 'impressum',   keys: ['impressum','kontakt','contact','imprint','jtsp','zug','firma'], title: language === 'FR' ? 'Mentions légales' : language === 'IT' ? 'Informazioni legali' : language === 'EN' ? 'Imprint' : 'Impressum', content: language === 'FR' ? "Coordonnées de l'exploitant et juridiction." : language === 'IT' ? 'Dati del gestore e giurisdizione.' : language === 'EN' ? 'Operator details and jurisdiction.' : 'Betreiber-Angaben und Gerichtsstand.' },
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
        // Sort newest first based on created_at (string ISO date)
        docs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
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
      
      setCvContext(text);

      // Trigger AI Analysis (frontend, no auth needed for basic analysis)
      analyzeCV(text);

      // Upload file to Supabase Storage + backend metadata analysis (parallel)
      const token = await getAuthToken();
      await Promise.allSettled([
        // Store actual file in Supabase Storage via backend
        (async () => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
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

  // Square-crop + resize to 512×512 JPEG before sending. Smaller payload
  // means faster upload, cheaper Gemini moderation, and avatars that
  // render crisply at every size we use them at (header, profile card).
  const resizeImageForAvatar = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const TARGET = 512;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = TARGET;
        canvas.height = TARGET;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas-Kontext nicht verfügbar')); return; }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET, TARGET);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden')); };
      img.src = url;
    });
  };

  const processAvatarFile = async (file: File) => {
    if (!file || !user) return;
    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) {
      showToast(language === 'FR' ? 'Format non supporté (JPG, PNG, WEBP)' : language === 'IT' ? 'Formato non supportato (JPG, PNG, WEBP)' : language === 'EN' ? 'Unsupported format (JPG, PNG, WEBP)' : 'Format nicht unterstützt (JPG, PNG, WEBP)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(language === 'FR' ? "L'image dépasse 10 Mo" : language === 'IT' ? "L'immagine supera 10 MB" : language === 'EN' ? 'Image exceeds 10 MB' : 'Bild grösser als 10 MB', 'error');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const { base64, mimeType } = await resizeImageForAvatar(file);
      const token = await getAuthToken();
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || (language === 'FR' ? 'Upload refusé' : language === 'IT' ? 'Upload rifiutato' : language === 'EN' ? 'Upload rejected' : 'Upload abgelehnt'), 'error');
        return;
      }
      setUser({ ...user, avatar_url: data.url });
      showToast(language === 'FR' ? 'Photo de profil mise à jour' : language === 'IT' ? 'Foto profilo aggiornata' : language === 'EN' ? 'Profile photo updated' : 'Profilbild aktualisiert');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      showToast(err?.message || (language === 'FR' ? 'Erreur lors du téléversement' : language === 'IT' ? 'Errore durante il caricamento' : language === 'EN' ? 'Upload error' : 'Upload-Fehler'), 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await processAvatarFile(file);
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/upload-avatar', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || (language === 'FR' ? 'Suppression échouée' : language === 'IT' ? 'Eliminazione fallita' : language === 'EN' ? 'Removal failed' : 'Entfernen fehlgeschlagen'), 'error');
        return;
      }
      setUser({ ...user, avatar_url: undefined });
      showToast(language === 'FR' ? 'Photo de profil supprimée' : language === 'IT' ? 'Foto profilo rimossa' : language === 'EN' ? 'Profile photo removed' : 'Profilbild entfernt');
    } catch (err: any) {
      console.error('Avatar remove error:', err);
      showToast(err?.message || 'Fehler', 'error');
    } finally {
      setIsUploadingAvatar(false);
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

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUid = userCredential.user.uid;
        await setDoc(doc(db, 'users', newUid), {
          id: newUid,
          email: userCredential.user.email || '',
          first_name: formattedName,
          role: 'client',
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
    try {
      justLoggedIn.current = true;
      await signInWithPopup(auth, new GoogleAuthProvider());
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google Auth Error:', err);
        const msg = language === 'DE' ? 'Google-Anmeldung fehlgeschlagen.' : language === 'FR' ? 'Échec de la connexion Google.' : language === 'IT' ? 'Accesso Google fallito.' : 'Google authentication failed.';
        setAuthError(msg);
        showToast(msg, 'error');
      }
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
      await addDoc(collection(db, 'applications'), { ...newApp, user_id: user.id, created_at: new Date().toISOString() });
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
      await updateDoc(doc(db, 'applications', editingApp.id), { ...fields, updated_at: new Date().toISOString() });
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
      a.created_at ? new Date(a.created_at).toLocaleDateString('de-CH') : '',
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
        ? (language === 'DE' ? 'Stella ist gerade sehr gefragt, bitte warte kurz und versuche es in 1–2 Minuten erneut.'
          : language === 'FR' ? 'Stella est très demandée en ce moment, réessaie dans 1–2 minutes.'
          : language === 'IT' ? 'Stella è molto richiesta in questo momento, riprova tra 1–2 minuti.'
          : 'Stella is very busy right now, please try again in 1–2 minutes.')
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
          successUrl: window.location.origin + '/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.origin + '/pricing'
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
    // Generierungen pro Monat: Free 3 lifetime · Pro 50 · Karriere+ 150.
    // No daily cap any more — monthly + per-minute fair-use only.
    const isToolLimitReached = (!isPro && toolUses >= 3)
      || (user?.role === 'pro' && !isUnlimited && toolUses >= 50)
      || (user?.role === 'unlimited' && toolUses >= 150);

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

            DEINE ROLLE: Du bist Experte für Schweizer Arbeitsrecht (OR Art. 330a) und HR-Codierung mit 20 Jahren Erfahrung.

            SCHWEIZER ZEUGNIS-CODE (Referenz):
            Note 6 (sehr gut): "stets zu unserer vollsten Zufriedenheit" / "ausserordentlich" / "überaus"
            Note 5 (gut): "zu unserer vollen Zufriedenheit" / "sehr" / "hervorragend"
            Note 4 (befriedigend): "zu unserer Zufriedenheit" / "gut" (ACHTUNG: "gut" allein = Durchschnitt!)
            Note 3 (genügend): "im Grossen und Ganzen zu unserer Zufriedenheit" / "bemüht"
            Note 2 (schlecht): "hat versucht" / fehlende Schlussformel / keine Adjektive
            NEGATIV-CODES: "bemüht" = kaum Erfolg; "erledigt" ohne Zusatz = Minimalleistung; "ruhiges Wesen" = passiv; "kollegiales Umfeld geschätzt" = soziale Schwierigkeiten; fehlendes "wir bedauern" = kein Bedauern; fehlendes "jederzeit" = eingeschränkte Empfehlung

            ANALYSE-STRUKTUR:
            1. GESAMTNOTE (1.0–6.0): Bewertung mit Begründung basierend auf dem Zeugnis-Code.
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
BEWERTUNGSRASTER (Pro, 5 Kategorien):
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
            3. 13. Monatslohn: "Ich rechne den 13. Monatslohn im Jahresgehalt ein – das entspricht CHF [X]/Monat."
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
            - Kultureller Code: Direkt, sachlich, faktenbasiert – keine amerikanische Überschwänglichkeit
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
  //   Pro: CHF 19.90/mo · CHF 190/yr   |   Karriere+: CHF 39.90/mo · CHF 349/yr
  const planPricing = {
    // Round amounts shown without cents (Pro yearly 190, Karriere+ yearly 349);
    // the small monthly prices (19.90 / 39.90) keep their rappen.
    // Savings vs. monthly: 190 / (19.90×12) = 20.4% → 20%, 349 / (39.90×12) = 27.1% → 27%.
    pro:      { monthly: '19.90', yearly: '190', save: '20%' },
    ultimate: { monthly: '39.90', yearly: '349', save: '27%' },
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
      hero_desc: "Erstelle professionelle Bewerbungen, optimiere deinen Lebenslauf und bereite dich erfolgreich auf Vorstellungsgespräche vor. Präzise, diskret und auf den Schweizer Arbeitsmarkt zugeschnitten.",
      cta_free: "Kostenlos starten",
      upload_cv: "Lebenslauf hochladen",
      update_cv: "Lebenslauf aktualisieren",
      cv_info: "① Lebenslauf hochladen → ② Stella analysiert dein Profil → ③ Bewerbung optimieren → ④ Interview meistern",
      dashboard: "Dashboard",
      profile_nav: "Profil",
      profile_title: "Dein Profil",
      profile_desc: "Verwalte deinen Lebenslauf, deine Roadmap und Stellas Wissen über dich an einem Ort.",
      profile_kicker: "Über dich",
      dashboard_kicker: "Dein Arbeitsbereich",
      profile_account: "Konto",
      profile_account_name: "Name",
      profile_account_email: "E-Mail",
      profile_account_plan: "Aktiver Plan",
      profile_account_member_since: "Mitglied seit",
      profile_photo: "Profilbild",
      profile_photo_hint: "JPG, PNG oder WEBP. Hier ablegen oder klicken. Bilder werden vor dem Speichern automatisch geprüft.",
      profile_photo_change: "Bild ändern",
      profile_photo_upload: "Bild hochladen",
      profile_photo_uploading: "Wird geprüft…",
      profile_photo_remove: "Entfernen",
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
      ai_notice: "Von Stella KI generiert. Inhalt vor Verwendung prüfen. Eigenverantwortung (AGB §9a).",
      settings: "Einstellungen",
      profile: "Profil",
      subscription: "Abonnement",
      data_privacy: "Datenschutz",
      tools_title: "Dein Werkzeug für jede Bewerbung.",
      tools_badge: "Karriere-Tools",
      tools_view_all: "Alle Tools ansehen",
      market_title: "Warum jetzt. Warum Schweiz.",
      market_badge: "Marktpotenzial",
      pricing_title: "Einfache Preise. Volle Power.",
      pricing_monthly: "Monatlich",
      pricing_yearly: "Jährlich",
      pricing_save: "2 Monate gratis",
      plan_free_subtitle: "Zum Kennenlernen. Ohne Verpflichtung.",
      plan_pro_subtitle: "Für Studierende, Berufseinsteiger und Gelegenheitsbewerber",
      plan_ultimate_subtitle: "Für aktive Stellensuchende und Karrierewechsler",
      pricing_gratis_desc: "Kostenlos loslegen, ohne Kreditkarte.",
      pricing_pro_desc: "Der Standard für ambitionierte Bewerber.",
      pricing_ultimate_desc: "Maximale Power für deine Karriere.",
      faq_title: "Häufig gestellte Fragen",
      footer_desc: "Stellify ist die Bewerbungs-KI für die Schweiz. Professionelle Bewerbungen in 5 Minuten, plus alle Tools für deine Karriere.",
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
      how_desc: "Vom Lebenslauf bis zur Vertragsunterschrift: Stellify begleitet dich durch jeden Schritt deiner Bewerbung.",
      how_1_t: "Lebenslauf hochladen & analysieren",
      how_1_d: "Lade deinen Lebenslauf als PDF hoch. Stella liest ihn vollständig, erkennt deine Stärken und optimiert ihn auf Schweizer Niveau, in Sekunden.",
      how_2_t: "Bewerbung perfektionieren",
      how_2_d: "Generiere massgeschneiderte Motivationsschreiben, optimiere jeden Lebenslauf-Abschnitt und prüfe, ob Recruiter-Software deinen Lebenslauf findet, alles in Schweizer Hochdeutsch.",
      how_3_t: "Interview bestehen",
      how_3_d: "Trainiere mit dem KI-Interview-Coach: echte Schweizer Fragen, dein persönliches Bewertungsraster und konkrete Formulierungsvorschläge für jede Situation.",
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
      faq_2_a: "Bei Stellify gibt es keine automatische Verlängerung und keine Kündigung. Du behältst jederzeit die volle Kontrolle. Du wählst einen monatlichen oder jährlichen Plan und erhältst sofort vollen Zugriff für genau diesen Zeitraum. Läuft das Abo ab, kehrt dein Konto automatisch zum kostenlosen Plan zurück, ganz ohne weiteres Zutun. Möchtest du weiter profitieren, schliesse einfach ein neues Abo ab. Dein Zugang verlängert sich dann nahtlos um einen weiteren Monat bzw. ein weiteres Jahr. Damit du rechtzeitig Bescheid weisst, schicken wir dir automatisch eine Erinnerungs-E-Mail vor Ablauf: Beim Monatsabo erhältst du diese E-Mail drei Tage vor dem Ablaufdatum, beim Jahresabo zwei Wochen vorher. Einen Planwechsel, etwa von Pro auf Karriere+, kannst du jederzeit nach Ablauf deines aktuellen Plans vornehmen. Dein genaues Ablaufdatum ist jederzeit in deinen Kontoeinstellungen sichtbar.",
      faq_3_q: "Wie viele Nutzungen sind in meinem Plan enthalten?",
      faq_3_a: "Eine Generierung entspricht einer Tool-Nutzung — also einer erstellten Bewerbung, einem Motivationsschreiben, einer Lebenslaufanalyse, einer Stellenanalyse oder einem Interviewtraining. Der Gratis-Plan beinhaltet 3 Generierungen lebenslang, ideal zum unverbindlichen Kennenlernen. Der Pro-Plan bietet 50 Generierungen pro Monat mit allen Kern-Funktionen. Karriere+ erweitert das auf 150 Generierungen pro Monat und schaltet zusätzlich ATS Premium-Analyse, erweiterten Interview Coach, Karriere- und Skill-Gap-Analyse, Premium-Vorlagen und priorisierte KI-Verarbeitung frei. Die genauen Limits sind transparent auf der Preisseite und in den AGB aufgeführt.",
      faq_4_q: "Funktioniert Stellify für alle Branchen?",
      faq_4_a: "Ja, unsere KI wurde auf dem gesamten Schweizer Arbeitsmarkt trainiert.",
      faq_5_q: "Welche Sprachen werden unterstützt?",
      faq_5_a: "Wir unterstützen Deutsch, Englisch, Französisch und Italienisch.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Einstellungen",
      nav_logout: "Abmelden",
      nav_login: "Anmelden",
      tool_limit_pro: "Du hast deine 50 Generierungen für diesen Monat aufgebraucht. Am 1. des nächsten Monats hast du wieder neue Versuche frei. Upgrade auf Karriere+ für 150 Generierungen pro Monat plus Premium-Funktionen.",
      tool_limit_free: "Dieses Experten-Tool erfordert ein Pro- oder Karriere+-Abo.",
      onboarding_welcome_title: "Willkommen bei Stellify",
      onboarding_welcome_desc: "Dein KI-Copilot für die Schweizer Karriere. Wir helfen dir, das Beste aus deinem Potenzial herauszuholen.",
      onboarding_cv_title: "Lade deinen Lebenslauf hoch",
      onboarding_cv_desc: "Lade deinen Lebenslauf hoch, damit Stella dich und deine Erfahrungen besser versteht. So erhältst du personalisierte Tipps.",
      onboarding_chat_title: "Stella im Hintergrund",
      onboarding_chat_desc: "Stella ist die KI, die in jedem Tool im Hintergrund arbeitet — sie schreibt deine Bewerbung, optimiert deinen Lebenslauf und bereitet dich auf Vorstellungsgespräche vor. Du musst sie nicht erst fragen, sie ist immer da.",
      onboarding_tools_title: "Experten-Tools",
      onboarding_tools_desc: "Nutze unsere spezialisierten Tools für Gehaltschecks, Lebenslauf-Prüfung und Marktanalyse.",
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
      dashboard_usage_unlimited: "Premium-Nutzung ohne tägliche Limits",
      plan_overview_title: "Dein Plan im Überblick",
      plan_what_included: "In deinem Plan enthalten",
      plan_what_upgrade: "Mit Upgrade bekommst du",
      plan_upgrade_cta: "Plan upgraden",
      plan_reset_info: "Limits werden automatisch zurückgesetzt, täglich um 0 Uhr, monatlich am 1.",
      plan_resets_lifetime: "Limits bleiben bestehen. Upgrade jederzeit möglich.",
      plan_free_f1: "Alle Tools zum Testen", plan_free_f2: "3 Generierungen lebenslang", plan_free_f3: "Bewerbung, Lebenslauf & Interview testen", plan_free_f4: "Bewerbungs-Tracker", plan_free_f5: "Mehrsprachig (DE/FR/IT/EN)",
      plan_pro_f1: "50 Generierungen pro Monat", plan_pro_f2: "Bewerbung & Motivationsschreiben", plan_pro_f3: "Lebenslauf optimieren & Stellenanalyse", plan_pro_f4: "Interview Coach", plan_pro_f5: "Dokumentenspeicherung + prioritärer Support",
      plan_unlim_f1: "150 Generierungen pro Monat", plan_unlim_f2: "ATS Premium-Analyse & Skill-Gap", plan_unlim_f3: "Erweiterter Interview Coach & Karriereanalyse", plan_unlim_f4: "Premium-Vorlagen & priorisierte KI-Verarbeitung", plan_unlim_f5: "Früher Zugang zu neuen Funktionen + VIP-Support",
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
      dashboard_desc: "Stella hat alles bereit. Erstelle eine neue Bewerbung, optimiere deinen Lebenslauf oder bereite dich auf dein nächstes Vorstellungsgespräch vor.",
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
      stat_in_process: "im Prozess",
      stat_interviews: "Interviews",
      stat_offers: "Angebote",
      stat_avg_salary: "Ø Gehalt",
      stat_rate: "Quote",
      stat_based_on: "von",
      stat_no_data: "–",
      tracker_reminder: "Erinnerung am",
      tracker_reminder_due: "Heute fällig",
      tracker_reminder_overdue: "überfällig",
      tracker_reminder_short: "Erinnerung",
      tracker_export_csv: "CSV-Export",
      transparency_badge: "Transparenz",
      transparency_title: "Was geht — und was nicht",
      transparency_sub: "Damit du genau weisst woran du bist. Alle Limits beziehen sich auf KI-Anfragen (Tools + Chat).",
      tr_can_title: "Das kannst du", tr_cannot_title: "Das geht nicht",
      tr_can_1: "Alle Tools auf jedem Plan ausprobieren",
      tr_can_2: "Bewerbungen erstellen, speichern und als PDF oder Word exportieren",
      tr_can_3: "Auf Deutsch, Französisch, Italienisch und Englisch arbeiten",
      tr_can_4: "Schweizer Lohnbänder, Standards und Arbeitsmarkt-Kontext nutzen",
      tr_can_5: "Jederzeit Plan wechseln, kündigen oder pausieren — keine Bindung",
      tr_cannot_1: "Stellify ersetzt keinen Anwalt oder Steuerberater — KI-Inhalte immer prüfen",
      tr_cannot_2: "Keine Garantie auf Stellenangebote — wir sind ein Werkzeug, kein Vermittler",
      tr_cannot_3: "Keine Verarbeitung sensibler Daten (z.B. Gesundheits-, Religions-, Sozialhilfe-Daten)",
      tr_cannot_4: "Keine Massenbewerbungen oder Automatisierung gegen unsere AGB",
      tr_limits_title: "Konkrete KI-Limits pro Plan",
      tr_lim_free_label: "Gratis", tr_lim_free_v: "3 Generierungen lebenslang · alle Tools zum Testen",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "50 Generierungen pro Monat · alle Kern-Tools · Dokumentenspeicherung",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "150 Generierungen pro Monat · ATS Premium · erweiterter Interview Coach · Premium-Vorlagen",
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
        { title: "Arbeitszeugnis verstehen", desc: "Verstehe endlich, was wirklich in deinen Arbeitszeugnissen steht. Stella erkennt versteckte Botschaften sofort.", icon: "ShieldCheck" },
        { title: "Vier Sprachen", desc: "Bewirb dich auf Deutsch, Englisch, Französisch oder Italienisch. Perfekt für den mehrsprachigen Schweizer Markt.", icon: "Globe" },
        { title: "Bewerbungs-Scanner-Optimierung", desc: "Unsere KI ist auf die Systeme grosser Schweizer Arbeitgeber trainiert, damit dein Lebenslauf garantiert gelesen wird.", icon: "Cpu" },
        { title: "Lohn-Transparenz", desc: "Erhalte präzise Gehaltsprognosen basierend auf Schweizer Marktdaten für deine spezifische Region und Branche.", icon: "Coins" },
        { title: "Datenschutz aus der Schweiz", desc: "Deine sensiblen Daten verlassen die Schweiz nicht. Wir garantieren höchste Sicherheit nach Schweizer Standards.", icon: "Lock" }
      ],
      pricing_free_f: ["3 Generierungen (lebenslang)", "Bewerbung, Lebenslauf & Interview testen", "Alle Funktionen zum Ausprobieren", "Keine Kreditkarte nötig"],
      pricing_pro_f: ["50 Generierungen pro Monat", "Bewerbung & Motivationsschreiben", "Lebenslauf optimieren & Stellenanalyse", "Interview Coach", "Dokumentenspeicherung"],
      pricing_ultimate_f: ["Alles aus Pro, plus:", "150 Generierungen pro Monat", "ATS Premium-Analyse & Skill-Gap", "Erweiterter Interview Coach & Karriereanalyse", "Premium-Vorlagen & priorisierte KI", "Früher Zugang zu neuen Funktionen"],
      pricing_cta_free: "Kostenlos starten",
      pricing_cta_pro: "Pro werden",
      pricing_cta_ultimate: "Karriere+ wählen",
      pricing_recommended: "Empfohlen",
      pricing_popular: "Beliebteste Wahl",
      value_title: "Was Stellify dir spart",
      value_items: [
        { icon: "Coins", title: "CHF 200 bis 400", desc: "kostet eine einzige Karriereberatung. Stellify deckt das ganze Jahr ab." },
        { icon: "Clock", title: "3 bis 5 Stunden", desc: "weniger Arbeit pro Bewerbung. Mehr Zeit für die Stellen, die zählen." },
        { icon: "Target", title: "Mehr Einladungen", desc: "Ein optimierter Lebenslauf kommt durch jeden ATS-Filter." },
        { icon: "TrendingUp", title: "Schnell amortisiert", desc: "Eine bessere Stelle bezahlt das Abo vielfach zurück." }
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
          desc: 'Prüft, ob dein Lebenslauf durch automatische Recruiter-Software kommt. Mit Bewertung & Tipps.',
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
          desc: 'Tiefgehende Analyse deines Lebenslaufs auf Keywords, Branchen-Fit und Verbesserungspotential.',
          tutorial: 'Beispiel: Dein Lebenslauf hat eine Schweiz-Bereitschaft von 75%. Wir empfehlen die Ergänzung deiner Arbeitsbewilligung (C-Bewilligung) und die GERS-Sprachniveaus.'
        },
        'tracker': { 
          title: 'Bewerbungs-Strategie', 
          desc: 'Erstelle einen massgeschneiderten Schlachtplan für deine nächste Bewerbung.', 
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
      hero_desc: "Crée des candidatures professionnelles, optimise ton CV et prépare-toi efficacement aux entretiens. Précis, discret et adapté au marché du travail suisse.",
      cta_free: "Tester gratuitement",
      upload_cv: "Télécharger ton CV",
      update_cv: "Mettre à jour CV (Lebenslauf)",
      cv_info: "Un CV (Curriculum Vitae) est votre parcours professionnel. C'est le document le plus important de votre candidature.",
      dashboard: "Tableau de bord",
      profile_nav: "Profil",
      profile_title: "Ton profil",
      profile_desc: "Gère ton CV, ta roadmap et ce que Stella sait de toi au même endroit.",
      profile_kicker: "À ton sujet",
      dashboard_kicker: "Ton espace de travail",
      profile_account: "Compte",
      profile_account_name: "Nom",
      profile_account_email: "E-mail",
      profile_account_plan: "Abonnement actif",
      profile_account_member_since: "Membre depuis",
      profile_photo: "Photo de profil",
      profile_photo_hint: "JPG, PNG ou WEBP. Glisse ici ou clique. Vérifié automatiquement avant l'enregistrement.",
      profile_photo_change: "Changer l'image",
      profile_photo_upload: "Téléverser une image",
      profile_photo_uploading: "Vérification…",
      profile_photo_remove: "Retirer",
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
      ai_notice: "Généré par Stella IA. À vérifier avant utilisation. Responsabilité utilisateur (CGV §9a).",
      settings: "Paramètres",
      profile: "Profil",
      subscription: "Abonnement",
      data_privacy: "Confidentialité",
      tools_title: "Ton outil pour chaque candidature.",
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
      footer_desc: "Stellify est l'IA de candidature pour la Suisse. Candidatures professionnelles en 5 minutes, plus 20 outils carrière.",
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
      how_1_t: "Télécharger & analyser le CV",
      how_1_d: "Téléchargez votre CV en PDF. Stella le lit entièrement, identifie vos points forts et l'optimise selon les standards ATS suisses.",
      how_2_t: "Perfectionner la candidature",
      how_2_d: "Générez des lettres de motivation sur mesure, optimisez chaque section du CV et simulez le contrôle ATS, en allemand suisse standard.",
      how_3_t: "Réussir l'entretien",
      how_3_d: "Entraînez-vous avec le coach d'entretien IA : questions réelles, grille d'évaluation personnalisée et suggestions de formulation concrètes.",
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
      faq_2_a: "Chez Stellify, il n'y a ni renouvellement automatique ni résiliation à effectuer : vous gardez le contrôle total à tout moment. Vous choisissez un plan mensuel ou annuel et bénéficiez immédiatement d'un accès complet pour la durée exacte choisie. À l'expiration de l'abonnement, votre compte revient automatiquement au plan gratuit, sans aucune démarche de votre part. Si vous souhaitez continuer à profiter de Stellify, il vous suffit de souscrire un nouvel abonnement. Votre accès sera prolongé d'un mois ou d'un an supplémentaire de manière transparente. Pour vous assurer de ne rien manquer, nous vous envoyons automatiquement un e-mail de rappel avant l'expiration : pour un abonnement mensuel, cet e-mail vous parviendra trois jours avant la date d'expiration ; pour un abonnement annuel, deux semaines avant. Un changement de plan, par exemple de Pro à Karriere+, est possible à tout moment après l'expiration de votre abonnement en cours. Votre date d'expiration exacte est toujours visible dans les paramètres de votre compte.",
      faq_3_q: "Combien d'utilisations sont incluses dans mon plan ?",
      faq_3_a: "Une génération correspond à une utilisation d'outil — une candidature, une lettre de motivation, une analyse de CV, une analyse d'offre ou un entraînement d'entretien. Le plan Gratuit comprend 3 générations à vie, idéal pour découvrir sans engagement. Le plan Pro offre 50 générations par mois avec toutes les fonctions essentielles. Karriere+ étend cela à 150 générations par mois et débloque en plus l'analyse ATS Premium, le coach d'entretien avancé, l'analyse de carrière et Skill-Gap, les modèles Premium et le traitement IA prioritaire. Les limites exactes figurent sur la page Tarifs et dans nos CGV.",
      faq_4_q: "Stellify fonctionne-t-il pour tous les secteurs ?",
      faq_4_a: "Oui, notre IA a été formée sur l'ensemble du marché du travail suisse.",
      faq_5_q: "Quelles langues sont prises en charge ?",
      faq_5_a: "Nous prenons en charge l'allemand, l'anglais, le français et l'italien.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Paramètres",
      nav_logout: "Déconnexion",
      nav_login: "Connexion",
      tool_limit_pro: "Tu as utilisé tes 50 générations ce mois-ci. De nouvelles seront disponibles le 1er du mois prochain. Passe à Karriere+ pour 150 générations par mois plus des fonctions Premium.",
      tool_limit_free: "Cet outil expert nécessite un abonnement Pro ou Karriere+.",
      onboarding_welcome_title: "Bienvenue sur Stellify",
      onboarding_welcome_desc: "Votre copilote IA pour votre carrière en Suisse. Nous vous aidons à tirer le meilleur parti de votre potentiel.",
      onboarding_cv_title: "Téléchargez votre CV",
      onboarding_cv_desc: "Téléchargez votre CV pour que Stella puisse mieux vous comprendre, vous et vos expériences. Vous recevrez ainsi des conseils personnalisés.",
      onboarding_chat_title: "Stella en arrière-plan",
      onboarding_chat_desc: "Stella est l'IA qui travaille en arrière-plan de chaque outil — elle rédige tes candidatures, optimise ton CV et te prépare aux entretiens. Pas besoin de la solliciter, elle est toujours présente.",
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
      dashboard_usage_unlimited: "Utilisation Premium sans limites quotidiennes",
      plan_overview_title: "Aperçu de ton plan",
      plan_what_included: "Inclus dans ton plan",
      plan_what_upgrade: "Avec un upgrade, tu obtiens",
      plan_upgrade_cta: "Améliorer mon plan",
      plan_reset_info: "Limites réinitialisées automatiquement, chaque jour à 0h, chaque mois le 1er.",
      plan_resets_lifetime: "Limites à vie. Upgrade possible à tout moment.",
      plan_free_f1: "Tous les outils à essayer", plan_free_f2: "3 générations à vie", plan_free_f3: "Tester candidature, CV & entretien", plan_free_f4: "Suivi des candidatures", plan_free_f5: "Multilingue (DE/FR/IT/EN)",
      plan_pro_f1: "50 générations par mois", plan_pro_f2: "Candidature & lettre de motivation", plan_pro_f3: "Optimisation du CV & analyse d'offre", plan_pro_f4: "Coach d'entretien", plan_pro_f5: "Stockage des documents + support prioritaire",
      plan_unlim_f1: "150 générations par mois", plan_unlim_f2: "Analyse ATS Premium & Skill-Gap", plan_unlim_f3: "Coach d'entretien avancé & analyse carrière", plan_unlim_f4: "Modèles Premium & traitement IA prioritaire", plan_unlim_f5: "Accès anticipé aux nouveautés + support VIP",
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
      dashboard_desc: "Stella a tout préparé. Crée une nouvelle candidature, optimise ton CV ou prépare-toi pour ton prochain entretien.",
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
      stat_in_process: "en cours",
      stat_interviews: "Entretiens",
      stat_offers: "Offres",
      stat_avg_salary: "Salaire moy.",
      stat_rate: "Taux",
      stat_based_on: "sur",
      stat_no_data: "–",
      tracker_reminder: "Relance le",
      tracker_reminder_due: "À faire aujourd'hui",
      tracker_reminder_overdue: "en retard",
      tracker_reminder_short: "Relance",
      tracker_export_csv: "Export CSV",
      transparency_badge: "Transparence",
      transparency_title: "Ce qui est possible — et ce qui ne l'est pas",
      transparency_sub: "Pour que tu saches exactement à quoi t'attendre. Toutes les limites concernent les requêtes IA (outils + chat).",
      tr_can_title: "Ce que tu peux faire", tr_cannot_title: "Ce qui n'est pas possible",
      tr_can_1: "Essayer tous les outils sur n'importe quel plan",
      tr_can_2: "Créer des candidatures, les sauvegarder et exporter en PDF ou Word",
      tr_can_3: "Travailler en allemand, français, italien et anglais",
      tr_can_4: "Utiliser les fourchettes salariales, normes et contexte du marché suisse",
      tr_can_5: "Changer de plan, résilier ou suspendre à tout moment — sans engagement",
      tr_cannot_1: "Stellify ne remplace pas un avocat ou un fiscaliste — vérifie toujours le contenu IA",
      tr_cannot_2: "Aucune garantie d'offre d'emploi — nous sommes un outil, pas un intermédiaire",
      tr_cannot_3: "Pas de traitement de données sensibles (santé, religion, aide sociale, …)",
      tr_cannot_4: "Pas de candidatures de masse ni d'automatisation contre nos CGV",
      tr_limits_title: "Limites IA concrètes par plan",
      tr_lim_free_label: "Gratuit", tr_lim_free_v: "3 générations à vie · tous les outils à essayer",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "50 générations par mois · tous les outils essentiels · stockage des documents",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "150 générations par mois · ATS Premium · coach d'entretien avancé · modèles Premium",
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
        { title: "Précision suisse", desc: "Nous connaissons le marché du travail suisse dans le détail. De l'orthographe correcte aux particularités cantonales.", icon: "Target" },
        { title: "Code des certificats décodé", desc: "Comprenez enfin ce qui est réellement écrit dans vos certificats de travail. Stella détecte immédiatement les messages cachés.", icon: "ShieldCheck" },
        { title: "Multilinguisme", desc: "Postulez sans transition en allemand, anglais, français ou italien, parfait pour le marché suisse multilingue.", icon: "Globe" },
        { title: "Optimisation ATS", desc: "Notre IA est formée aux systèmes des grands employeurs suisses, garantissant que votre CV soit lu.", icon: "Cpu" },
        { title: "Transparence salariale", desc: "Obtenez des prévisions salariales précises basées sur les données du marché suisse pour votre région et secteur spécifiques.", icon: "Coins" },
        { title: "Protection des données 'Made in CH'", desc: "Vos données sensibles ne quittent pas la Suisse. Nous garantissons une sécurité maximale selon les normes suisses.", icon: "Lock" }
      ],
      pricing_free_f: ["3 générations (à vie)", "Tester candidature, CV & entretien", "Toutes les fonctions pour essayer", "Sans carte de crédit"],
      pricing_pro_f: ["50 générations par mois", "Candidature & lettre de motivation", "Optimisation du CV & analyse d'offre", "Coach d'entretien", "Stockage des documents"],
      pricing_ultimate_f: ["Tout de Pro, plus :", "150 générations par mois", "Analyse ATS Premium & Skill-Gap", "Coach d'entretien avancé & analyse carrière", "Modèles Premium & IA prioritaire", "Accès anticipé aux nouveautés"],
      pricing_cta_free: "Démarrer gratuitement",
      pricing_cta_pro: "Devenir Pro",
      pricing_cta_ultimate: "Choisir Karriere+",
      pricing_recommended: "Recommandé",
      pricing_popular: "Choix le plus populaire",
      value_title: "Ce que Stellify te fait économiser",
      value_items: [
        { icon: "Coins", title: "CHF 200 à 400", desc: "coûte une seule séance de coaching. Stellify couvre toute l'année." },
        { icon: "Clock", title: "3 à 5 heures", desc: "de travail en moins par candidature. Plus de temps pour les bons postes." },
        { icon: "Target", title: "Plus d'entretiens", desc: "Un CV optimisé passe chaque filtre ATS." },
        { icon: "TrendingUp", title: "Vite rentabilisé", desc: "Un meilleur poste rembourse l'abonnement plusieurs fois." }
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
        'tracker': { title: 'Stratégie de candidature', desc: 'Créez un plan de bataille sur mesure pour votre prochaine candidature.', input_label: 'Titre du poste / Entreprise', input_placeholder: 'ex. Chef de projet senior chez Roche' },
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
      hero_desc: "Crea candidature professionali, ottimizza il tuo CV e preparati con successo ai colloqui. Preciso, discreto e calibrato sul mercato del lavoro svizzero.",
      cta_free: "Prova gratuitamente",
      upload_cv: "Carica il tuo CV",
      update_cv: "Aggiorna CV (Lebenslauf)",
      cv_info: "Un CV (Curriculum Vitae) è la tua storia professionale. È il documento più importante della tua candidatura.",
      dashboard: "Dashboard",
      profile_nav: "Profilo",
      profile_title: "Il tuo profilo",
      profile_desc: "Gestisci il tuo CV, la tua roadmap e ciò che Stella sa di te in un unico posto.",
      profile_kicker: "Su di te",
      dashboard_kicker: "La tua area di lavoro",
      profile_account: "Account",
      profile_account_name: "Nome",
      profile_account_email: "E-mail",
      profile_account_plan: "Piano attivo",
      profile_account_member_since: "Membro dal",
      profile_photo: "Foto profilo",
      profile_photo_hint: "JPG, PNG o WEBP. Trascina qui o clicca. Controllato automaticamente prima del salvataggio.",
      profile_photo_change: "Cambia immagine",
      profile_photo_upload: "Carica immagine",
      profile_photo_uploading: "Verifica in corso…",
      profile_photo_remove: "Rimuovi",
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
      ai_notice: "Generato da Stella AI. Verificare prima dell'uso. Responsabilità utente (Condizioni §9a).",
      settings: "Impostazioni",
      profile: "Profilo",
      subscription: "Abbonamento",
      data_privacy: "Privacy",
      tools_title: "Lo strumento per ogni candidatura.",
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
      footer_desc: "Stellify è l'IA per le candidature in Svizzera. Candidature professionali in 5 minuti, più 20 strumenti carriera.",
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
      how_1_t: "Carica & analizza il CV",
      how_1_d: "Carica il tuo CV in PDF. Stella lo legge completamente, individua i tuoi punti di forza e lo ottimizza secondo gli standard ATS svizzeri.",
      how_2_t: "Perfeziona la candidatura",
      how_2_d: "Genera lettere di motivazione su misura, ottimizza ogni sezione del CV e simula il controllo ATS, in tedesco svizzero standard.",
      how_3_t: "Supera il colloquio",
      how_3_d: "Allenati con il coach per colloqui IA: domande reali, griglia di valutazione personalizzata e suggerimenti concreti per ogni situazione.",
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
      faq_2_a: "Su Stellify non esistono né rinnovi automatici né disdette da effettuare: hai sempre il pieno controllo. Scegli un piano mensile o annuale e ottieni immediatamente l'accesso completo per esattamente quel periodo. Alla scadenza dell'abbonamento, il tuo account torna automaticamente al piano gratuito, senza alcuna azione da parte tua. Se desideri continuare a usufruire di Stellify, ti basta sottoscrivere un nuovo abbonamento. Il tuo accesso verrà esteso senza interruzioni di un ulteriore mese o anno. Per farti trovare sempre preparato, ti inviamo automaticamente un'e-mail di promemoria prima della scadenza: per un abbonamento mensile, questa e-mail ti arriva tre giorni prima della data di scadenza; per un abbonamento annuale, due settimane prima. Un cambio di piano, ad esempio da Pro a Karriere+, è possibile in qualsiasi momento dopo la scadenza del tuo abbonamento attuale. La data di scadenza esatta è sempre visibile nelle impostazioni del tuo account.",
      faq_3_q: "Quante utilizzazioni sono incluse nel mio piano?",
      faq_3_a: "Una generazione corrisponde a un utilizzo di strumento — una candidatura, una lettera di motivazione, un'analisi del CV, un'analisi dell'annuncio o un allenamento al colloquio. Il piano Gratuito include 3 generazioni a vita, ideale per provare senza impegno. Il piano Pro offre 50 generazioni al mese con tutte le funzioni essenziali. Karriere+ estende a 150 generazioni al mese e sblocca inoltre l'analisi ATS Premium, il coach colloqui avanzato, l'analisi di carriera e Skill-Gap, i modelli Premium e l'elaborazione IA prioritaria. I limiti esatti sono indicati sulla pagina Prezzi e nelle nostre Condizioni.",
      faq_4_q: "Stellify funziona per tutti i settori?",
      faq_4_a: "Sì, la nostra IA è stata addestrata su tutto il mercato del lavoro svizzero.",
      faq_5_q: "Quali lingue sono supportate?",
      faq_5_a: "Supportiamo tedesco, inglese, francese e italiano.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Impostazioni",
      nav_logout: "Disconnetti",
      nav_login: "Accedi",
      tool_limit_pro: "Hai utilizzato le tue 50 generazioni per questo mese. Il 1° del prossimo mese avrai nuovi tentativi. Passa a Karriere+ per 150 generazioni al mese più funzioni Premium.",
      tool_limit_free: "Questo strumento esperto richiede un abbonamento Pro o Karriere+.",
      onboarding_welcome_title: "Benvenuti su Stellify",
      onboarding_welcome_desc: "Il tuo copilota AI per la tua carriera in Svizzera. Ti aiutiamo a sfruttare al meglio il tuo potenziale.",
      onboarding_cv_title: "Carica il tuo CV",
      onboarding_cv_desc: "Carica il tuo curriculum in modo che Stella possa capire meglio te e le tue esperienze. Riceverai così consigli personalizzati.",
      onboarding_chat_title: "Stella in background",
      onboarding_chat_desc: "Stella è l'IA che lavora in background in ogni strumento — scrive le tue candidature, ottimizza il tuo CV e ti prepara ai colloqui. Non devi chiederle nulla, è sempre presente.",
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
      dashboard_usage_unlimited: "Utilizzo Premium senza limiti quotidiani",
      plan_overview_title: "Il tuo piano in sintesi",
      plan_what_included: "Incluso nel tuo piano",
      plan_what_upgrade: "Con un upgrade ottieni",
      plan_upgrade_cta: "Aggiorna piano",
      plan_reset_info: "Limiti reimpostati automaticamente, ogni giorno alle 0:00, ogni mese il 1°.",
      plan_resets_lifetime: "Limiti a vita. Upgrade possibile in qualsiasi momento.",
      plan_free_f1: "Tutti gli strumenti da provare", plan_free_f2: "3 generazioni a vita", plan_free_f3: "Prova candidatura, CV e colloquio", plan_free_f4: "Tracker candidature", plan_free_f5: "Multilingua (DE/FR/IT/EN)",
      plan_pro_f1: "50 generazioni al mese", plan_pro_f2: "Candidatura & lettera di motivazione", plan_pro_f3: "Ottimizzazione CV & analisi annuncio", plan_pro_f4: "Coach per colloqui", plan_pro_f5: "Archiviazione documenti + supporto prioritario",
      plan_unlim_f1: "150 generazioni al mese", plan_unlim_f2: "Analisi ATS Premium & Skill-Gap", plan_unlim_f3: "Coach colloqui avanzato & analisi carriera", plan_unlim_f4: "Modelli Premium & elaborazione IA prioritaria", plan_unlim_f5: "Accesso anticipato alle novità + supporto VIP",
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
      dashboard_desc: "Stella ha tutto pronto. Crea una nuova candidatura, ottimizza il tuo CV o preparati per il tuo prossimo colloquio.",
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
      stat_in_process: "in corso",
      stat_interviews: "Colloqui",
      stat_offers: "Offerte",
      stat_avg_salary: "Stipendio medio",
      stat_rate: "Tasso",
      stat_based_on: "su",
      stat_no_data: "–",
      tracker_reminder: "Ricontatta il",
      tracker_reminder_due: "Da fare oggi",
      tracker_reminder_overdue: "scaduto",
      tracker_reminder_short: "Ricontatta",
      tracker_export_csv: "Esporta CSV",
      transparency_badge: "Trasparenza",
      transparency_title: "Cosa è possibile — e cosa no",
      transparency_sub: "Per sapere esattamente cosa aspettarsi. Tutti i limiti riguardano le richieste IA (strumenti + chat).",
      tr_can_title: "Cosa puoi fare", tr_cannot_title: "Cosa non è possibile",
      tr_can_1: "Provare tutti gli strumenti su qualsiasi piano",
      tr_can_2: "Creare candidature, salvarle ed esportarle in PDF o Word",
      tr_can_3: "Lavorare in tedesco, francese, italiano e inglese",
      tr_can_4: "Usare fasce salariali, standard e contesto del mercato svizzero",
      tr_can_5: "Cambiare piano, disdire o sospendere in qualsiasi momento — nessun vincolo",
      tr_cannot_1: "Stellify non sostituisce avvocato o commercialista — verifica sempre i contenuti IA",
      tr_cannot_2: "Nessuna garanzia di offerte di lavoro — siamo uno strumento, non un intermediario",
      tr_cannot_3: "Nessun trattamento di dati sensibili (salute, religione, assistenza sociale)",
      tr_cannot_4: "Nessuna candidatura di massa o automazione contro le nostre condizioni",
      tr_limits_title: "Limiti IA concreti per piano",
      tr_lim_free_label: "Gratuito", tr_lim_free_v: "3 generazioni a vita · tutti gli strumenti da provare",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "50 generazioni al mese · tutti gli strumenti essenziali · archiviazione documenti",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "150 generazioni al mese · ATS Premium · coach colloqui avanzato · modelli Premium",
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
        { title: "Precisione svizzera", desc: "Conosciamo il mercato del lavoro svizzero nei dettagli. Dall'ortografia corretta alle particolarità cantonali.", icon: "Target" },
        { title: "Codice dei certificati decodificato", desc: "Capisci finalmente cosa c'è scritto veramente nei tuoi certificati di lavoro. Stella rileva immediatamente i messaggi nascosti.", icon: "ShieldCheck" },
        { title: "Multilinguismo", desc: "Candidati senza problemi in tedesco, inglese, francese e italiano, perfetto per il mercato svizzero multilingue.", icon: "Globe" },
        { title: "Ottimizzazione ATS", desc: "La nostra IA è addestrata sui sistemi dei grandi datori di lavoro svizzeri, garantendo che il tuo CV venga letto.", icon: "Cpu" },
        { title: "Trasparenza salariale", desc: "Ottieni previsioni salariali precise basate sui dati del mercato svizzero per la tua regione e il tuo settore specifici.", icon: "Coins" },
        { title: "Protezione dei dati 'Made in CH'", desc: "I tuoi dati sensibili non lasciano la Svizzera. Garantiamo la massima sicurezza secondo gli standard svizzeri.", icon: "Lock" }
      ],
      pricing_free_f: ["3 generazioni (a vita)", "Prova candidatura, CV e colloquio", "Tutte le funzioni da provare", "Nessuna carta di credito"],
      pricing_pro_f: ["50 generazioni al mese", "Candidatura & lettera di motivazione", "Ottimizzazione CV & analisi annuncio", "Coach per colloqui", "Archiviazione documenti"],
      pricing_ultimate_f: ["Tutto di Pro, più:", "150 generazioni al mese", "Analisi ATS Premium & Skill-Gap", "Coach colloqui avanzato & analisi carriera", "Modelli Premium & IA prioritaria", "Accesso anticipato alle novità"],
      pricing_cta_free: "Inizia gratuitamente",
      pricing_cta_pro: "Diventa Pro",
      pricing_cta_ultimate: "Scegli Karriere+",
      pricing_recommended: "Consigliato",
      pricing_popular: "Scelta più popolare",
      value_title: "Cosa ti fa risparmiare Stellify",
      value_items: [
        { icon: "Coins", title: "CHF 200 a 400", desc: "costa una sola sessione di coaching. Stellify copre tutto l'anno." },
        { icon: "Clock", title: "3 a 5 ore", desc: "di lavoro in meno per candidatura. Più tempo per i posti che contano." },
        { icon: "Target", title: "Più colloqui", desc: "Un CV ottimizzato supera ogni filtro ATS." },
        { icon: "TrendingUp", title: "Si ripaga in fretta", desc: "Un lavoro migliore restituisce l'abbonamento molte volte." }
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
        'tracker': { title: 'Strategia di candidatura', desc: 'Crea un piano di battaglia su misura per la tua prossima candidatura.', input_label: 'Titolo del lavoro / Azienda', input_placeholder: 'es. Senior Project Manager presso Roche' },
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
      hero_desc: "Create professional applications, optimise your CV and prepare successfully for interviews. Precise, discreet and tuned to the Swiss job market.",
      cta_free: "Test for free",
      upload_cv: "Upload CV (Resume)",
      update_cv: "Update CV (Resume)",
      cv_info: "A CV (Curriculum Vitae) is your professional history. It is the most important document in your application.",
      dashboard: "Dashboard",
      profile_nav: "Profile",
      profile_title: "Your profile",
      profile_desc: "Manage your CV, your roadmap and what Stella knows about you in one place.",
      profile_kicker: "About you",
      dashboard_kicker: "Your workspace",
      profile_account: "Account",
      profile_account_name: "Name",
      profile_account_email: "Email",
      profile_account_plan: "Active plan",
      profile_account_member_since: "Member since",
      profile_photo: "Profile photo",
      profile_photo_hint: "JPG, PNG or WEBP. Drop here or click. Reviewed automatically before saving.",
      profile_photo_change: "Change photo",
      profile_photo_upload: "Upload photo",
      profile_photo_uploading: "Checking…",
      profile_photo_remove: "Remove",
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
      ai_notice: "Generated by Stella AI. Verify before use. Your responsibility (Terms §9a).",
      settings: "Settings",
      profile: "Profile",
      subscription: "Subscription",
      data_privacy: "Privacy",
      tools_title: "Your toolkit for every application.",
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
      footer_desc: "Stellify is the application AI for Switzerland. Professional applications in 5 minutes, plus a full suite of career tools.",
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
      how_1_t: "Upload & Analyze CV",
      how_1_d: "Upload your CV as a PDF. Stella identifies weaknesses, missing keywords, and optimization potential for Swiss recruiters in seconds.",
      how_2_t: "Perfect Your Application",
      how_2_d: "Optimize your CV, write tailored cover letters, and prepare for ATS systems of Swiss companies, with AI precision.",
      how_3_t: "Ace the Interview",
      how_3_d: "Train with realistic interview simulations, get immediate feedback, and learn exactly what Swiss employers look for.",
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
      faq_2_a: "At Stellify, there is no automatic renewal and no cancellation required: you retain full control at all times. You choose a monthly or annual plan and immediately gain full access for exactly that period. When your subscription expires, your account automatically reverts to the Free plan with no action needed on your part. If you'd like to keep enjoying Stellify, simply subscribe again. Your access will seamlessly extend by another month or year. To make sure you're always informed in good time, we automatically send you a reminder email before your subscription ends: for a monthly subscription, this email arrives three days before the expiry date; for an annual subscription, two weeks before. A plan upgrade, for example from Pro to Karriere+, is available at any time once your current subscription has expired. Your exact expiry date is always visible in your account settings.",
      faq_3_q: "How many uses are included in my plan?",
      faq_3_a: "One generation equals one tool use — a created application, a cover letter, a CV analysis, a job analysis or an interview training. The Free plan includes 3 lifetime generations, ideal to explore with no commitment. The Pro plan offers 50 generations per month with all core features. Karriere+ extends this to 150 generations per month and additionally unlocks ATS Premium analysis, the advanced Interview Coach, career and Skill-Gap analysis, Premium templates and prioritised AI processing. The exact limits are shown transparently on the Pricing page and in our Terms.",
      faq_4_q: "Does Stellify work for all industries?",
      faq_4_a: "Yes, our AI has been trained on the entire Swiss job market.",
      faq_5_q: "Which languages are supported?",
      faq_5_a: "We support German, English, French, and Italian.",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Settings",
      nav_logout: "Logout",
      nav_login: "Login",
      tool_limit_pro: "You've used your 50 generations for this month. New ones arrive on the 1st of next month. Upgrade to Karriere+ for 150 generations per month plus Premium features.",
      tool_limit_free: "This expert tool requires a Pro or Karriere+ subscription.",
      onboarding_welcome_title: "Welcome to Stellify",
      onboarding_welcome_desc: "Your AI copilot for your Swiss career. We help you make the most of your potential.",
      onboarding_cv_title: "Upload your CV",
      onboarding_cv_desc: "Upload your resume so Stella can better understand you and your experiences. This way you get personalized tips.",
      onboarding_chat_title: "Stella in the background",
      onboarding_chat_desc: "Stella is the AI working in the background of every tool — she writes your applications, optimises your CV and prepares you for interviews. You don't have to ask her, she's always there.",
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
      dashboard_usage_unlimited: "Premium usage without everyday limits",
      plan_overview_title: "Your plan at a glance",
      plan_what_included: "Included in your plan",
      plan_what_upgrade: "Upgrade and unlock",
      plan_upgrade_cta: "Upgrade plan",
      plan_reset_info: "Limits reset automatically, daily at midnight, monthly on the 1st.",
      plan_resets_lifetime: "Lifetime limits. Upgrade anytime.",
      plan_free_f1: "All tools to try", plan_free_f2: "3 lifetime generations", plan_free_f3: "Try application, CV & interview", plan_free_f4: "Application tracker", plan_free_f5: "Multilingual (DE/FR/IT/EN)",
      plan_pro_f1: "50 generations per month", plan_pro_f2: "Application & cover letter", plan_pro_f3: "CV optimisation & job analysis", plan_pro_f4: "Interview Coach", plan_pro_f5: "Document storage + priority support",
      plan_unlim_f1: "150 generations per month", plan_unlim_f2: "ATS Premium analysis & Skill-Gap", plan_unlim_f3: "Advanced Interview Coach & career analysis", plan_unlim_f4: "Premium templates & prioritised AI processing", plan_unlim_f5: "Early access to new features + VIP support",
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
      dashboard_desc: "Stella has everything ready. Create a new application, optimise your CV, or prepare for your next interview.",
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
      stat_in_process: "in process",
      stat_interviews: "Interviews",
      stat_offers: "Offers",
      stat_avg_salary: "Avg. salary",
      stat_rate: "rate",
      stat_based_on: "of",
      stat_no_data: "–",
      tracker_reminder: "Follow up on",
      tracker_reminder_due: "Due today",
      tracker_reminder_overdue: "overdue",
      tracker_reminder_short: "Follow-up",
      tracker_export_csv: "Export CSV",
      transparency_badge: "Transparency",
      transparency_title: "What you can do — and what you can't",
      transparency_sub: "So you know exactly where you stand. All limits cover AI requests (tools + chat).",
      tr_can_title: "What you can do", tr_cannot_title: "What's not possible",
      tr_can_1: "Try every tool on any plan",
      tr_can_2: "Create applications, save them and export as PDF or Word",
      tr_can_3: "Work in German, French, Italian and English",
      tr_can_4: "Use Swiss salary ranges, standards and labour-market context",
      tr_can_5: "Switch plans, cancel or pause anytime — no lock-in",
      tr_cannot_1: "Stellify doesn't replace a lawyer or tax advisor — always check AI output",
      tr_cannot_2: "No guarantee of job offers — we're a tool, not an agency",
      tr_cannot_3: "No processing of sensitive data (health, religion, social-benefit data)",
      tr_cannot_4: "No mass applications or automation against our terms",
      tr_limits_title: "Concrete AI limits by plan",
      tr_lim_free_label: "Free", tr_lim_free_v: "3 lifetime generations · all tools to try",
      tr_lim_pro_label: "Pro", tr_lim_pro_v: "50 generations per month · all core tools · document storage",
      tr_lim_unlim_label: "Karriere+", tr_lim_unlim_v: "150 generations per month · ATS Premium · advanced Interview Coach · Premium templates",
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
        { title: "Certificate Code Decoded", desc: "Finally understand what is really written in your work certificates. Stella detects hidden messages immediately.", icon: "ShieldCheck" },
        { title: "Multilingualism", desc: "Apply seamlessly in German, English, French or Italian, perfect for the multilingual Swiss market.", icon: "Globe" },
        { title: "ATS Optimization", desc: "Our AI is trained on the systems of major Swiss employers, ensuring your CV is guaranteed to be read.", icon: "Cpu" },
        { title: "Salary Transparency", desc: "Get precise salary forecasts based on Swiss market data for your specific region and industry.", icon: "Coins" },
        { title: "Data Protection 'Made in CH'", desc: "Your sensitive data does not leave Switzerland. We guarantee maximum security according to Swiss standards.", icon: "Lock" }
      ],
      pricing_free_f: ["3 generations (lifetime)", "Try application, CV & interview", "All features to explore", "No credit card required"],
      pricing_pro_f: ["50 generations per month", "Application & cover letter", "CV optimisation & job analysis", "Interview Coach", "Document storage"],
      pricing_ultimate_f: ["Everything in Pro, plus:", "150 generations per month", "ATS Premium analysis & Skill-Gap", "Advanced Interview Coach & career analysis", "Premium templates & prioritised AI", "Early access to new features"],
      pricing_cta_free: "Start for free",
      pricing_cta_pro: "Go Pro",
      pricing_cta_ultimate: "Choose Karriere+",
      pricing_recommended: "Recommended",
      pricing_popular: "Most Popular",
      value_title: "What Stellify saves you",
      value_items: [
        { icon: "Coins", title: "CHF 200 to 400", desc: "for a single coaching session. Stellify covers the whole year." },
        { icon: "Clock", title: "3 to 5 hours", desc: "of work per application. More time for the roles that matter." },
        { icon: "Target", title: "More interviews", desc: "An optimized CV gets through every ATS filter." },
        { icon: "TrendingUp", title: "Pays off quickly", desc: "A better job repays the subscription many times over." }
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
        'tracker': { title: 'Application Strategy', desc: 'Create a tailored battle plan for your next application.', input_label: 'Job Title / Company', input_placeholder: 'e.g. Senior Project Manager at Roche' },
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
      badge: 'Studio',
      type: 'gratis',
      inputs: []
    },
    {
      id: 'interview',
      title: t.tools_data['interview'].title,
      desc: t.tools_data['interview'].desc,
      icon: <Mic size={20} />,
      badge: 'Coach',
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
      badge: 'Strategy',
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

  // Strategy-aligned toolset. Tools not named in the launch strategy are kept
  // in code above (reversible) but hidden by filtering them out here.
  const ENABLED_TOOL_IDS = new Set([
    'bewerbungs-gen', 'cv-gen', 'cv-optimizer', 'cv-analysis', 'cv-premium',
    'matching', 'interview', 'interview-live', 'salary-negotiation',
    'ats-sim', 'career-roadmap', 'skill-gap', 'tracker',
  ]);
  const tools = allTools.filter(tl => ENABLED_TOOL_IDS.has(tl.id));

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
  const isToolLimitReached = (!isPro && toolUses >= 3)
    || (user?.role === 'pro' && !isUnlimited && toolUses >= 50)
    || (user?.role === 'unlimited' && toolUses >= 150);
  const isDailyLimitReached = false;
  const isToolLocked = activeTool ? ((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) ||
                       (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) : false;


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
                  onClick={() => navigate('profile')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'profile' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.profile_nav}
                </button>
                <button
                  onClick={() => navigate('tools')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'tools' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.tools}
                </button>
                <button
                  onClick={() => navigate('jobs')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'jobs' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.search_type_job}
                </button>
                <button
                  onClick={() => navigate('pricing')}
                  className={`px-2.5 lg:px-3 xl:px-4 py-1.5 text-[12px] xl:text-[13px] font-medium rounded-full transition-all whitespace-nowrap ${activeView === 'pricing' ? 'bg-white dark:bg-[#1A1A18] text-[#004225] dark:text-[#6FCF97] shadow-sm' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  {t.pricing}
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
                    <a href="#features" onClick={handleAnchor('features')} className={goToAnchor('features')}>{t.features}</a>
                    <a href="#success" onClick={handleAnchor('success')} className={`${goToAnchor('success')} hidden xl:inline-flex`}>{t.success_stories}</a>
                    <a href="#how" onClick={handleAnchor('how')} className={goToAnchor('how')}>{t.how_it_works}</a>
                    <a href="#pricing" onClick={handleAnchor('pricing')} className={goToAnchor('pricing')}>{t.pricing}</a>
                    <button onClick={() => navigate('about')} className={`${goToAnchor('about')} ${activeView === 'about' ? 'text-[#004225] dark:text-[#00A854]' : ''}`}>
                      {language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns'}
                    </button>
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
                <Globe size={13} />
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
          <button
            onClick={() => setIsSearchOpen(true)}
            aria-label={t.search_placeholder}
            title={t.search_placeholder}
            className="hidden sm:inline-flex p-2.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="xl:hidden p-2.5 sm:p-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94]"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94]"
                title={t.nav_settings}
              >
                <Settings size={16} />
              </button>

              <button
                onClick={() => navigate('profile')}
                title={t.profile_nav}
                className="shrink-0 w-8 h-8 rounded-full overflow-hidden border border-black/10 dark:border-white/10 hover:ring-2 hover:ring-[#004225]/30 dark:hover:ring-[#00A854]/40 transition-all"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
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
                  <button onClick={() => { navigate('profile'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'profile' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.profile_nav}</button>
                  <button onClick={() => { navigate('tools'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'tools' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.tools}</button>
                  <button onClick={() => { navigate('jobs'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'jobs' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.search_type_job}</button>
                  <button onClick={() => { navigate('pricing'); setIsMenuOpen(false); }} className={`px-4 py-3 text-base font-medium text-left rounded-full transition-colors ${activeView === 'pricing' ? 'bg-[#004225]/10 text-[#004225] dark:text-[#6FCF97]' : 'text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5'}`}>{t.pricing}</button>
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
                      <a href="#features" onClick={goAnchor('features')} className={cls}>{t.features}</a>
                      <a href="#how" onClick={goAnchor('how')} className={cls}>{t.how_it_works}</a>
                      <button onClick={() => { navigate('pricing'); setIsMenuOpen(false); }} className={cls}>{t.pricing}</button>
                    </>;
                  })()}
                  <button onClick={() => { navigate('about'); setIsMenuOpen(false); }} className="px-4 py-3 text-base font-medium rounded-full text-left text-[#1A1A18] dark:text-[#FAFAF8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">{language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : language === 'EN' ? 'About' : 'Über uns'}</button>
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
        )}
      </AnimatePresence>

      {/* --- LEGAL PAGES + ABOUT --- */}
      {(activeView === 'datenschutz' || activeView === 'impressum' || activeView === 'agb' || activeView === 'about') && (
        <Suspense fallback={null}>
          <LegalPages activeView={activeView} onBack={() => navigate(user ? 'dashboard' : 'dashboard')} language={language} />
        </Suspense>
      )}

      {/* --- HERO SECTION / DASHBOARD --- */}
      {(activeView !== 'datenschutz' && activeView !== 'impressum' && activeView !== 'agb' && activeView !== 'about') && (user ? (
        <section className="px-6 lg:px-12 pt-12 pb-24 bg-[#FDFCFB] dark:bg-[#1A1A18]">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <div className="space-y-6">
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

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t.dashboard_stat_analyses, value: toolHistory.length, icon: <TrendingUp size={16} /> },
                    { label: t.dashboard_stat_cv_status, value: cvContext ? t.dashboard_stat_ready : t.dashboard_stat_missing, icon: <FileText size={16} />, color: cvContext ? 'text-[#059669]' : 'text-red-500' },
                    { label: t.dashboard_stat_applications, value: trackerStats?.total ?? 0, icon: <Send size={16} /> },
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
                        <div className="mt-3">
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

                              </>
                            ) : (
                              /* Free User Usage — one canonical "Tool-Nutzung" counter
                                 (freeGenerationsUsed and toolUses are incremented in
                                 lockstep; showing both was confusing on the live tile). */
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.dashboard_usage_desc}</span>
                                <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{user.toolUses || 0} / 3</span>
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

                {user?.email === 'support.stellify@gmail.com' && (
                  <div className="p-6 bg-[#004225]/5 dark:bg-[#FDFCFB]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 space-y-4 transition-colors">
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
                        <div className="inline-flex border border-black/10 bg-white dark:bg-[#2A2A26] dark:border-white/10">
                          <button
                            onClick={() => setTrackerView('kanban')}
                            title={t.tracker_view_kanban}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${trackerView === 'kanban' ? 'bg-[#004225] text-white' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:bg-black/5'}`}
                          >
                            <LayoutGrid size={12} />
                            <span className="hidden sm:inline">{t.tracker_view_kanban}</span>
                          </button>
                          <button
                            onClick={() => setTrackerView('table')}
                            title={t.tracker_view_table}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${trackerView === 'table' ? 'bg-[#004225] text-white' : 'text-[#5C5C58] dark:text-[#9A9A94] hover:bg-black/5'}`}
                          >
                            <ListIcon size={12} />
                            <span className="hidden sm:inline">{t.tracker_view_table}</span>
                          </button>
                        </div>
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
                      <div className="p-4 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.stat_total}</p>
                        <p className="text-2xl xl:text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mt-1 leading-none">{trackerStats.total}</p>
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-2">{trackerStats.inProcess} {t.stat_in_process}</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.stat_interviews}</p>
                        <p className="text-2xl xl:text-3xl font-serif text-[#004225] dark:text-[#00A854] mt-1 leading-none">{trackerStats.interview}</p>
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-2">{trackerStats.interviewRate}% {t.stat_rate}</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.stat_offers}</p>
                        <p className="text-2xl xl:text-3xl font-serif text-[#004225] dark:text-[#00A854] mt-1 leading-none">{trackerStats.offer}</p>
                        <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] mt-2">{trackerStats.offerRate}% {t.stat_rate}</p>
                      </div>
                    </div>
                  )}

                  {isAddingApp && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white border border-[#004225]/20 shadow-xl space-y-4"
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
                      className="p-6 bg-white border border-[#004225]/20 shadow-xl space-y-4"
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

                  {trackerView === 'kanban' ? (
                    <DndContext
                      sensors={dndSensors}
                      onDragStart={(event: DragStartEvent) => setDraggedAppId(String(event.active.id))}
                      onDragEnd={(event: DragEndEvent) => {
                        setDraggedAppId(null);
                        const { active, over } = event;
                        if (!over) return;
                        const newStatus = String(over.id);
                        const dragged = applications.find((a) => a.id === active.id);
                        if (dragged && dragged.status !== newStatus) {
                          updateApplicationStatus(String(active.id), newStatus);
                        }
                      }}
                      onDragCancel={() => setDraggedAppId(null)}
                    >
                      <div className="space-y-4 sm:space-y-0 sm:flex sm:gap-4 sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:-mx-4 sm:px-4 sm:pb-2 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:mx-0 lg:px-0 [&>*]:sm:scroll-mt-4 tracker-scroll">
                        {['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'].map((status) => (
                          <DroppableStatusColumn
                            key={status}
                            status={status}
                            t={t}
                            language={language}
                            applications={viewApplications}
                            activeId={draggedAppId}
                            onEdit={setEditingApp}
                            onDelete={deleteApplication}
                            onArchive={setApplicationArchived}
                            onStatusChange={updateApplicationStatus}
                          />
                        ))}
                      </div>
                      <DragOverlay dropAnimation={null}>
                        {draggedAppId ? (() => {
                          const a = applications.find((x) => x.id === draggedAppId);
                          if (!a) return null;
                          return (
                            <div className="p-4 bg-white border border-[#004225]/40 shadow-2xl rotate-2 cursor-grabbing pointer-events-none">
                              <h4 className="text-sm font-bold text-[#1A1A18] leading-tight">{a.company}</h4>
                              <p className="text-xs text-[#5C5C58] mt-1">{a.position}</p>
                            </div>
                          );
                        })() : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="overflow-x-auto bg-white dark:bg-[#2A2A26] border border-black/10 dark:border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-[#FAFAF8] dark:bg-[#1A1A18] border-b border-black/10 dark:border-white/10">
                          <tr>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.tracker_col_company}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.tracker_col_position}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{t.tracker_col_status}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden md:table-cell">{t.tracker_col_location}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden md:table-cell">{t.tracker_col_salary}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94] hidden lg:table-cell">{t.tracker_col_updated}</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewApplications.map((app) => {
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
                              <tr key={app.id} className={`border-b border-black/5 dark:border-white/5 hover:bg-[#FAFAF8] dark:hover:bg-[#1A1A18] transition-all ${app.archived ? 'opacity-60' : ''}`}>
                                <td className="px-4 py-3 font-bold text-[#1A1A18] dark:text-[#FAFAF8]">{app.company}</td>
                                <td className="px-4 py-3 text-[#5C5C58] dark:text-[#9A9A94]">{app.position}</td>
                                <td className="px-4 py-3">
                                  <select
                                    value={app.status}
                                    onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                    className="text-[11px] font-medium text-[#004225] bg-transparent border border-[#004225]/20 hover:border-[#004225]/50 focus:border-[#004225] focus:outline-none px-2 py-1 cursor-pointer transition-all"
                                  >
                                    <option value="Wishlist">{t.tracker_wishlist}</option>
                                    <option value="Applied">{t.tracker_applied}</option>
                                    <option value="Interview">{t.tracker_interview}</option>
                                    <option value="Offer">{t.tracker_offer}</option>
                                    <option value="Rejected">{t.tracker_rejected}</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-[#5C5C58] dark:text-[#9A9A94] hidden md:table-cell">{app.location || '–'}</td>
                                <td className="px-4 py-3 text-[#5C5C58] dark:text-[#9A9A94] hidden md:table-cell">{salaryFmt || '–'}</td>
                                <td className="px-4 py-3 text-[#9A9A94] font-mono text-xs hidden lg:table-cell">
                                  {app.updatedAt?.toDate ? app.updatedAt.toDate().toLocaleDateString('de-CH') : '–'}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      onClick={() => setEditingApp(app)}
                                      title={language === 'FR' ? 'Modifier' : language === 'IT' ? 'Modifica' : language === 'EN' ? 'Edit' : 'Bearbeiten'}
                                      className="p-1.5 text-[#004225]/60 hover:bg-[#004225]/10 hover:text-[#004225] rounded transition-all"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => setApplicationArchived(app.id, !app.archived)}
                                      title={app.archived ? t.tracker_unarchive : t.tracker_archive}
                                      className="p-1.5 text-[#5C5C58] hover:bg-black/5 hover:text-[#1A1A18] rounded transition-all"
                                    >
                                      {app.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                                    </button>
                                    <button
                                      onClick={() => deleteApplication(app.id)}
                                      title={language === 'FR' ? 'Supprimer' : language === 'IT' ? 'Elimina' : language === 'EN' ? 'Delete' : 'Löschen'}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
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
            )}

            {activeView === 'profile' && (
            <div className="space-y-8 max-w-3xl">
              <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#00A854]/10 border border-[#004225]/15 dark:border-[#00A854]/25 rounded-full text-[#004225] dark:text-[#00A854] text-[10px] font-bold tracking-widest uppercase mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854]" />
                  {t.profile_kicker}
                </div>
                <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4 text-[#1A1A18] dark:text-[#FAFAF8]">{t.profile_title}</h1>
                <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xl">{t.profile_desc}</p>
              </header>

              {/* Profile photo */}
              <div
                onDragOver={(e) => { e.preventDefault(); if (!isUploadingAvatar) setIsAvatarDragOver(true); }}
                onDragLeave={() => setIsAvatarDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsAvatarDragOver(false);
                  if (isUploadingAvatar) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) processAvatarFile(file);
                }}
                className={`p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border-2 ${isAvatarDragOver ? 'border-[#004225] dark:border-[#00A854] bg-[#004225]/5 dark:bg-[#00A854]/10' : 'border-black/5 dark:border-white/5'} transition-colors`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94] mb-5">{t.profile_photo}</p>
                <div className="flex items-center gap-5 sm:gap-6">
                  <div className="relative shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-black/10 dark:border-white/10" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#004225]/8 dark:bg-[#00A854]/15 flex items-center justify-center text-2xl sm:text-3xl font-serif text-[#004225] dark:text-[#00A854]">
                        {(user.firstName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed">{t.profile_photo_hint}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Upload size={12} />
                        {isUploadingAvatar ? t.profile_photo_uploading : (user.avatar_url ? t.profile_photo_change : t.profile_photo_upload)}
                      </button>
                      {user.avatar_url && !isUploadingAvatar && (
                        <button
                          onClick={handleAvatarRemove}
                          className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5C5C58] dark:text-[#9A9A94] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                          {t.profile_photo_remove}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account / personal data */}
              <div className="p-6 sm:p-8 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A94] mb-5">{t.profile_account}</p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.profile_account_name}</p>
                    <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8]">{user.firstName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.profile_account_email}</p>
                    <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8] truncate" title={user.email}>{user.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.profile_account_plan}</p>
                    <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8]">
                      {user.role === 'unlimited' ? 'Karriere+' : user.role === 'pro' ? 'Pro' : user.role === 'admin' ? 'Admin' : (language === 'FR' ? 'Gratuit' : language === 'IT' ? 'Gratuito' : language === 'EN' ? 'Free' : 'Gratis')}
                    </p>
                  </div>
                  <div className="flex items-end justify-start sm:justify-end">
                    <button
                      onClick={() => navigate('pricing')}
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] dark:text-[#00A854] border-b border-[#004225]/30 dark:border-[#00A854]/30 hover:border-[#004225] dark:hover:border-[#00A854] pb-0.5 transition-all"
                    >
                      {language === 'FR' ? 'Plan gérer' : language === 'IT' ? 'Gestisci piano' : language === 'EN' ? 'Manage plan' : 'Plan verwalten'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
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
                      href={`mailto:support@stellify.ch?subject=${encodeURIComponent(language === 'FR' ? 'Entreprise — publier des postes sur Stellify' : language === 'IT' ? 'Azienda — pubblicare posizioni su Stellify' : language === 'EN' ? 'Company — list roles on Stellify' : 'Unternehmen — Stellen auf Stellify ausschreiben')}`}
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
                    {language === 'FR' ? 'Prépare des candidatures parfaites avec nos outils IA — prêt dès qu\'un poste t\'intéresse.' : language === 'IT' ? 'Prepara candidature perfette con i nostri strumenti IA — pronto appena trovi una posizione.' : language === 'EN' ? 'Get perfect applications ready with our AI tools — so you\'re set the moment a role catches your eye.' : 'Bereite mit unseren KI-Tools perfekte Bewerbungen vor — damit du bereit bist, sobald dich eine Stelle interessiert.'}
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
        <section className="relative px-4 sm:px-6 lg:px-12 py-16 sm:py-20 lg:py-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-7xl mx-auto transition-colors overflow-hidden">
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
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-6xl xl:text-7xl font-serif leading-[1.05] tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] text-balance">
              {t.hero_intro} <br />
              <span className="italic text-[#004225] dark:text-[#FAFAF8]">{t.hero_accent || t.hero_title.split(' ').pop()}</span>
            </h1>
            <p className="text-base sm:text-lg text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed max-w-lg">
              {t.hero_desc}
            </p>
            {language === 'DE' ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                {([
                  ['1', 'Lebenslauf hochladen'],
                  ['2', 'KI-Analyse'],
                  ['3', 'Bewerbung optimieren'],
                  ['4', 'Interview meistern'],
                ] as [string, string][]).map(([num, label], i, arr) => (
                  <React.Fragment key={num}>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="w-4 h-4 rounded-full bg-[#004225] dark:bg-[#00A854] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{num}</span>
                      <span className="text-[11px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] whitespace-nowrap">{label}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-[#9A9A94] text-[11px] select-none flex-shrink-0 px-0.5 hidden sm:inline">→</span>}
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

              {/* 3-step funnel */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
                className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] sm:text-[9px] font-bold uppercase tracking-widest"
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
                  {language === 'FR' ? 'Dès CHF 19.90/mois, voir les plans →' : language === 'IT' ? 'Da CHF 19.90/mese, vedi i piani →' : language === 'EN' ? 'From CHF 19.90/mo, see plans →' : 'Ab CHF 19.90/Mo, Pläne ansehen →'}
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
            {/* Application document preview — the core product in action */}
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
                <p className="font-serif text-lg text-[#1A1A18] dark:text-[#FAFAF8] leading-tight">Anna Müller</p>
                <p className="text-[10px] text-[#9A9A94] mt-0.5">Bahnhofstrasse 12 · 8001 Zürich · anna.mueller@mail.ch</p>

                <div className="my-5 h-px bg-black/8 dark:bg-white/8" />

                <p className="text-[10px] text-[#9A9A94] mb-2.5">13. Juni 2026</p>
                <p className="text-[12px] font-bold text-[#004225] dark:text-[#6FCF97] mb-3">
                  {language === 'FR' ? 'Candidature : Marketing Manager · UBS'
                    : language === 'IT' ? 'Candidatura: Marketing Manager · UBS'
                    : language === 'EN' ? 'Application: Marketing Manager · UBS'
                    : 'Bewerbung als Marketing Managerin · UBS'}
                </p>
                <p className="text-[12px] text-[#1A1A18] dark:text-[#EBEBEB] mb-3">
                  {language === 'FR' ? 'Madame, Monsieur,' : language === 'IT' ? 'Gentili Signore e Signori,' : language === 'EN' ? 'Dear Sir or Madam,' : 'Sehr geehrte Damen und Herren,'}
                </p>
                {/* Letter body — typeset text lines */}
                <div className="space-y-1.5 mb-4">
                  {['97%','100%','94%','99%','88%'].map((w, i) => (
                    <div key={i} style={{ width: w }} className="h-[7px] rounded-sm bg-[#1A1A18]/[0.08] dark:bg-white/[0.08]" />
                  ))}
                </div>
                <p className="text-[12px] text-[#1A1A18] dark:text-[#EBEBEB]">
                  {language === 'FR' ? 'Meilleures salutations' : language === 'IT' ? 'Cordiali saluti' : language === 'EN' ? 'Kind regards' : 'Freundliche Grüsse'}
                </p>
                <p className="font-serif text-[13px] text-[#1A1A18] dark:text-[#FAFAF8] mt-1">Anna Müller</p>
              </div>

              {/* Export footer */}
              <div className="border-t border-black/8 dark:border-white/8 px-6 py-3 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#2A2A26]">
                <span className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] font-light">
                  {language === 'FR' ? 'Créé en 5 minutes' : language === 'IT' ? 'Creato in 5 minuti' : language === 'EN' ? 'Created in 5 minutes' : 'In 5 Minuten erstellt'}
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

      {/* --- MARKETING SECTIONS (hidden on legal pages) --- */}
      {activeView !== 'datenschutz' && activeView !== 'impressum' && activeView !== 'agb' && activeView !== 'about' && <>

      {/* --- TOOLS GRID --- */}
      <section id="tools" className="px-6 lg:px-12 py-24 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div className="flex items-start gap-5">
              <span className="text-5xl lg:text-6xl font-serif text-[#004225]/15 dark:text-[#00A854]/20 leading-none select-none">01</span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#004225] dark:text-[#00A854] mb-2">{t.tools_badge}</p>
                <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.tools_title}</h2>
              </div>
            </div>
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
      {/* --- TRACKER SHOWCASE --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
                ? 'Une vue d\'ensemble simple : Postulé, Entretien, Offre. Glisse les cartes, ajoute des notes, ne rate plus jamais un suivi. Disponible dans chaque plan. Y compris le plan Gratuit.'
                : language === 'IT'
                ? 'Una panoramica semplice: Inviato, Colloquio, Offerta. Trascina le carte, aggiungi note, non perdere mai un follow-up. Disponibile in ogni piano. Anche in quello Gratuito.'
                : language === 'EN'
                ? 'A simple overview: Applied, Interview, Offer. Drag the cards, add notes, never miss a follow-up. Available on every plan. Free plan included.'
                : 'Eine einfache Übersicht: Beworben, Interview, Angebot. Karten verschieben, Notizen hinzufügen, nie wieder ein Follow-up verpassen. In jedem Plan dabei. Auch im Gratis-Plan.'}
            </p>
            <button
              onClick={() => user ? navigate('dashboard') : setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#00331d] transition-all"
            >
              {language === 'FR' ? 'Ouvrir le tracker' : language === 'IT' ? 'Apri il tracker' : language === 'EN' ? 'Open the tracker' : 'Tracker öffnen'}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mini-Kanban Preview */}
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
        </div>
      </section>
      {/* --- WHY STELLIFY SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-[#004225]/30 dark:bg-[#FAFAF8]/20" />
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#004225] dark:text-[#FAFAF8]">{t.comparison_badge}</span>
              <div className="h-px w-12 bg-[#004225]/30 dark:bg-[#FAFAF8]/20" />
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

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="p-6 sm:p-8 border border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/5">
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
      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="px-6 lg:px-12 py-24 bg-[#0a1410] text-white relative overflow-hidden">
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
            @media (prefers-reduced-motion: reduce) {
              section#pricing [style*="stellifyPricingDrift"] { animation: none !important; }
            }
          `}</style>
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
                    <p className="text-red-400/60 text-xs mt-1.5">Hilfe: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support@stellify.ch&su=Stellify+Support+Anfrage&body=Hallo+Support-Team," target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300">support@stellify.ch</a></p>
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
                    bis −25%
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-white/40 font-light">
                {billingCycle === 'monthly'
                  ? (language === 'DE' ? '→ Jährlich wählen und 2 Monate gratis sparen' : language === 'FR' ? '→ Choisir annuel et économiser 2 mois' : language === 'IT' ? '→ Scegli annuale e risparmia 2 mesi' : '→ Choose yearly and save 2 months')
                  : (language === 'DE' ? '✓ Jahresabo aktiv, du sparst 2 Monate' : language === 'FR' ? '✓ Abonnement annuel, vous économisez 2 mois' : language === 'IT' ? '✓ Abbonamento annuale, risparmi 2 mesi' : '✓ Annual plan active, you save 2 months')}
              </p>
            </div>
          </div>

          {/* TRUST BAR */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 mb-8 sm:mb-10"
          >
            {[
              { icon: <Shield size={13} className="text-white/40" />, label: language === 'DE' ? '7-Tage Geld-zurück-Garantie' : language === 'FR' ? 'Garantie 7 jours' : language === 'IT' ? 'Garanzia 7 giorni' : '7-day money-back guarantee' },
              { icon: <Lock size={13} className="text-white/40" />, label: 'SSL-gesichert · 256-bit' },
              { icon: <CreditCard size={13} className="text-white/40" />, label: language === 'DE' ? 'Sichere Zahlung via Stripe' : language === 'FR' ? 'Paiement sécurisé via Stripe' : language === 'IT' ? 'Pagamento sicuro via Stripe' : 'Secure payment via Stripe' },
              { icon: <CheckCircle2 size={13} className="text-white/40" />, label: language === 'DE' ? 'Keine automatische Verlängerung' : language === 'FR' ? 'Pas de renouvellement automatique' : language === 'IT' ? 'Nessun rinnovo automatico' : 'No automatic renewal' },
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

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16"
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
              <ul className="relative space-y-4 mb-12 flex-1">
                {t.pricing_free_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-light text-white/70">
                    <CheckCircle2 size={14} className="text-white/30 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => user ? setActiveView('dashboard') : (setAuthTab('register'), setIsAuthModalOpen(true))}
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
                  <span className="text-4xl font-serif text-white">CHF {prices.pro}</span>
                  <span className="text-white/70 text-sm">/{billingCycle === 'yearly' ? (language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year') : (language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.')}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-semibold">−{planPricing.pro.save}</span>
                  </div>
                )}
              </div>
              <ul className="relative space-y-4 mb-12 flex-1">
                {t.pricing_pro_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-light text-white/80">
                    <CheckCircle2 size={14} className="text-[#6FCF97] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
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

              {/* Most-popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2 bg-gradient-to-r from-[#004225] to-[#00592F] text-white text-[10px] font-bold uppercase tracking-[0.3em] px-5 py-1.5 rounded-full border border-[#D4AF37]/40 shadow-lg shadow-[#004225]/40 whitespace-nowrap">
                <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                {t.pricing_popular}
              </div>
              <div className="relative mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6FCF97]">Karriere+</span>
                <p className="text-xs text-white/70 mt-2 font-light leading-relaxed">{t.plan_ultimate_subtitle}</p>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif text-white">CHF {prices.ultimate}</span>
                  <span className="text-white/70 text-sm">/{billingCycle === 'yearly' ? (language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year') : (language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.')}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-semibold">−{planPricing.ultimate.save}</span>
                  </div>
                )}
              </div>
              <ul className="relative space-y-4 mb-12 flex-1">
                {t.pricing_ultimate_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-white">
                    <CheckCircle2 size={14} className="text-[#6FCF97] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscription('ultimate')}
                disabled={isSubscribing}
                className="relative w-full py-4 bg-white text-[#004225] hover:bg-[#FAFAF8] shadow-xl shadow-black/30 transition-all text-[11px] font-bold uppercase tracking-[0.25em] disabled:opacity-50 min-h-[52px] group-hover:shadow-2xl"
              >
                {isSubscribing ? '...' : t.pricing_cta_ultimate}
              </button>
            </motion.div>
          </motion.div>

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
            <div className="flex flex-wrap justify-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              {['Twint', 'Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay', 'SEPA', 'PostFinance', 'Klarna'].map(p => (
                <div key={p} className="px-4 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest">{p}</div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 mt-6">{t.payment_secure}</p>
          </div>
        </div>
      </section>
      {/* --- ABOUT / BRAND STORY PREVIEW --- */}
      <section className="px-6 lg:px-12 py-24 bg-[#FDFCFB] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left — wordmark + etymology */}
            <div className="lg:col-span-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#004225] dark:text-[#00A854] mb-6">
                {language === 'FR' ? 'Notre histoire' : language === 'IT' ? 'La nostra storia' : language === 'EN' ? 'Our Story' : 'Unsere Geschichte'}
              </p>
              <p className="font-serif text-6xl md:text-7xl text-[#1A1A18] dark:text-[#FAFAF8] leading-[0.95] tracking-tight mb-10" style={{paddingBottom: '.08em'}}>
                Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span>
              </p>
              <div className="space-y-4">
                <div>
                  <p className="font-serif text-2xl text-[#004225] dark:text-[#00A854] leading-none mb-1">Stell<span className="opacity-30">·</span></p>
                  <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">
                    {language === 'FR' ? "Du mot allemand Stellen. Trouve ton poste."
                      : language === 'IT' ? 'Dal tedesco Stellen. Trova la tua posizione.'
                      : language === 'EN' ? 'From the German Stellen. Find your position.'
                      : 'Vom deutschen Stellen. Finde deine Position.'}
                  </p>
                </div>
                <div>
                  <p className="font-serif text-2xl text-[#004225] dark:text-[#00A854] leading-none mb-1"><span className="opacity-30">·</span>ify</p>
                  <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">
                    {language === 'FR' ? 'Du latin stellificare. Deviens une étoile.'
                      : language === 'IT' ? 'Dal latino stellificare. Diventa una stella.'
                      : language === 'EN' ? 'From the Latin stellificare. Become a star.'
                      : 'Vom lateinischen stellificare. Werde zum Stern.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right — founder portrait + quote + CTA */}
            <div className="lg:col-span-7">
              <div className="flex flex-col sm:flex-row gap-10 sm:gap-12 items-start mb-10">
                <FounderPortrait language={language} />
                <div className="border-l-2 border-[#004225]/25 dark:border-[#00A854]/40 pl-8 lg:pl-10 flex-1 min-w-0">
                  <blockquote className="font-serif italic text-2xl md:text-3xl text-[#1A1A18] dark:text-[#FAFAF8] leading-snug">
                    «{language === 'FR' ? "J'aurais aimé avoir moi-même un outil comme Stellify. Un outil qui comprenne vraiment le marché du travail suisse."
                      : language === 'IT' ? 'Avrei voluto avere io stesso uno strumento come Stellify. Uno strumento che capisca davvero il mercato del lavoro svizzero.'
                      : language === 'EN' ? "I wish I'd had a tool like Stellify myself, back then. One that truly understands the Swiss job market."
                      : 'Ich hätte mir früher selbst ein Werkzeug wie Stellify gewünscht. Eines, das den Schweizer Arbeitsmarkt wirklich versteht.'}»
                  </blockquote>
                </div>
              </div>

              <button
                onClick={() => navigate('about')}
                className="group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.25em] text-[#004225] dark:text-[#00A854] hover:gap-4 transition-all"
              >
                {language === 'FR' ? 'Lire notre histoire' : language === 'IT' ? 'Leggi la nostra storia' : language === 'EN' ? 'Read our story' : 'Unsere Geschichte lesen'}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* --- FAQ SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors">
        <div className="max-w-3xl mx-auto">
          <div className="text-left mb-16">
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
                <p className="text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed pb-4">{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-sm text-[#9A9A94] font-light">
              {t.faq_contact} <a href="mailto:support@stellify.ch" className="text-[#004225] font-medium border-b border-[#004225]/20">support@stellify.ch</a>
            </p>
          </div>
        </div>
      </section>
      {/* --- FINAL CTA --- */}
      <section className="px-6 lg:px-12 py-32 bg-[#004225] text-white text-center relative overflow-hidden">
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

      </> /* end marketing sections */}

      {/* --- FOOTER (always visible — also on legal pages) --- */}
      <footer className="bg-[#1A1A18] text-white/50 px-6 lg:px-12 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
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
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'cv-optimizer') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Lebenslauf-Optimierer' : 'CV Optimizer'}</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'ats-sim') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Lebenslauf-Check' : 'CV Check'}</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'salary-calc') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Gehaltsrechner' : language === 'FR' ? 'Calculateur salaire' : language === 'IT' ? 'Calcolo stipendio' : 'Salary Check'}</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'interview') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Interview-Coach' : language === 'FR' ? 'Coach entretien' : language === 'IT' ? 'Coach colloquio' : 'Interview Coach'}</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'zeugnis') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Zeugnis-Decoder' : language === 'FR' ? 'Décodeur certificat' : language === 'IT' ? 'Decoder certificato' : 'Certificate Decoder'}</button></li>
                <li><button onClick={() => { if (user) { setActiveTool(tools.find((t:any) => t.id === 'career-roadmap') || null); } else { setAuthTab('register'); setIsAuthModalOpen(true); } }} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Karriere-Roadmap' : language === 'FR' ? 'Feuille de route carrière' : language === 'IT' ? 'Roadmap carriera' : 'Career Roadmap'}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">{language === 'DE' ? 'Unternehmen' : language === 'FR' ? 'Entreprise' : language === 'IT' ? 'Azienda' : 'Company'}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><button onClick={() => navigate('about')} className="hover:text-white transition-colors text-left">{language === 'DE' ? 'Über uns' : language === 'FR' ? 'À propos' : language === 'IT' ? 'Chi siamo' : 'About'}</button></li>
                <li><a href="#success" className="hover:text-white transition-colors">{t.success_stories}</a></li>
                <li><button onClick={() => navigate('pricing')} className="hover:text-white transition-colors text-left">{t.pricing}</button></li>
                <li><a href={`mailto:support@stellify.ch?subject=${language === 'FR' ? 'Proposition%20de%20partenariat' : language === 'IT' ? 'Proposta%20di%20collaborazione' : language === 'EN' ? 'Partnership%20Inquiry' : 'Kooperationsanfrage'}`} className="hover:text-white transition-colors">
                  {language === 'DE' ? 'Kooperationen' : language === 'FR' ? 'Partenariats' : language === 'IT' ? 'Collaborazioni' : 'Partnerships'}
                </a></li>
                <li><a href="mailto:support@stellify.ch" className="hover:text-white transition-colors">{t.footer_contact}</a></li>
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

      {/* Mobile Back-to-Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 left-6 z-50 md:hidden w-11 h-11 bg-[#004225] text-white flex items-center justify-center shadow-lg rounded-full"
        aria-label="Nach oben"
      >
        <ArrowLeft size={18} className="-rotate-90" />
      </button>

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

              {/* Header */}
              <div className="px-8 pt-10 pb-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#004225] mb-2">
                      {t.welcome}
                    </p>
                    <h2 className="text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] leading-tight">
                      {user.firstName}
                    </h2>
                    <p className="mt-1 text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light">
                      {t.welcome_modal_subtitle}
                    </p>
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
                  {(user.role === 'unlimited'
                    ? [
                        { id: 'career-roadmap', icon: <Compass size={16} />, badge: 'Karriere+' },
                        { id: 'cv-premium', icon: <Sparkles size={16} />, badge: 'Karriere+' },
                        { id: 'matching', icon: <Search size={16} />, badge: 'Karriere+' },
                      ]
                    : user.role === 'pro'
                    ? [
                        { id: 'cv-analysis', icon: <Search size={16} />, badge: 'Pro' },
                        { id: 'matching', icon: <Search size={16} />, badge: 'Pro' },
                        { id: 'skill-gap', icon: <Target size={16} />, badge: 'Pro' },
                      ]
                    : user.cvContext
                    ? [
                        { id: 'cv-analysis', icon: <Search size={16} />, badge: 'Pro' },
                        { id: 'interview', icon: <Mic size={16} />, badge: 'Gratis' },
                        { id: 'matching', icon: <Search size={16} />, badge: 'Pro' },
                      ]
                    : [
                        { id: 'cv-gen', icon: <Sparkles size={16} />, badge: 'Gratis' },
                        { id: 'interview', icon: <Mic size={16} />, badge: 'Gratis' },
                        { id: 'matching', icon: <Search size={16} />, badge: 'Pro' },
                      ]
                  ).map((item) => {
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
                      {[
                        { label: language === 'FR' ? 'CV & Curriculum' : language === 'IT' ? 'CV & Curriculum' : language === 'EN' ? 'CV & Resume' : 'Lebenslauf & CV', query: 'lebenslauf' },
                        { label: language === 'FR' ? 'Recherche d\'emploi' : language === 'IT' ? 'Ricerca lavoro' : language === 'EN' ? 'Job Search' : 'Stellensuche', query: 'stellen' },
                        { label: language === 'FR' ? 'Salaire' : language === 'IT' ? 'Stipendio' : language === 'EN' ? 'Salary' : 'Lohn & Gehalt', query: 'lohn' },
                        { label: language === 'FR' ? 'Entretien' : language === 'IT' ? 'Colloquio' : language === 'EN' ? 'Interview' : 'Interview', query: 'interview' },
                        { label: language === 'FR' ? 'Plan de carrière' : language === 'IT' ? 'Piano carriera' : language === 'EN' ? 'Career Plan' : 'Karriereplan', query: 'karriere' },
                      ].map(tag => (
                        <button
                          key={tag.query}
                          onClick={() => setSearchQuery(tag.query)}
                          className="px-3 py-1.5 bg-black/5 dark:bg-white/5 text-[11px] font-medium text-[#5C5C58] dark:text-[#FAFAF8] hover:bg-[#004225] hover:text-white transition-all rounded-md"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>

                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-4">{t.search_quick}</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'cv-gen', title: t.tools_data['cv-gen'].title, icon: <Sparkles size={14} />, badge: 'Gratis' },
                        { id: 'cv-optimizer', title: t.tools_data['cv-optimizer'].title, icon: <FileText size={14} />, badge: 'Pro' },
                        { id: 'interview', title: t.tools_data['interview'].title, icon: <Mic size={14} />, badge: 'Gratis' },
                        { id: 'matching', title: t.tools_data['matching'].title, icon: <Search size={14} />, badge: 'Karriere+' }
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
                                          {result.toolType === 'gratis' ? 'Free' : result.toolType === 'pro' ? 'Pro' : 'Ultimate'}
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
                <button onClick={() => { setActiveTool(null); setParsedSalaryResult(null); setParsedInterviewResult(null); setInterviewSession(null); setInterviewAnswer(''); }} className="p-2 shrink-0 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#5C5C58] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
                {/* Bewerbungs-Generator: full-custom flow overlays the generic two-panel UI */}
                {activeTool.id === 'bewerbungs-gen' && (
                  <div className="absolute inset-0 z-40 flex flex-col bg-[#FDFCFB] dark:bg-[#1A1A18]">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#004225] border-t-transparent rounded-full animate-spin" /></div>}>
                      <ApplicationGenerator
                        language={language}
                        user={user}
                        locked={isToolLocked}
                        onUpgrade={() => { setActiveTool(null); navigate('pricing'); }}
                        showToast={showToast}
                        authFetch={authFetch}
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
                              <p className="text-[11px] text-[#9A9A94] font-light mt-0.5">Stella · {new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH')}</p>
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
                                  { n: parsedInterviewResult.stats.match != null ? `${parsedInterviewResult.stats.match}%` : '–', l: language === 'EN' ? 'Match' : language === 'IT' ? 'Affinità' : language === 'FR' ? 'Affinité' : 'Match', accent: true },
                                ].map((s, i) => (
                                  <div key={i} className="bg-white dark:bg-[#1A1A18] py-3.5 text-center">
                                    <div className={`text-xl font-semibold leading-none ${s.accent ? 'text-[#2a7a4a] dark:text-[#6FCF97]' : 'text-[#004225] dark:text-[#FAFAF8]'}`}>{s.n ?? '–'}</div>
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
                              <span className="text-[11px] text-[#b0c2b3] dark:text-[#5C5C58]">Stella · {new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH')}</span>
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
                            onClick={() => { setActiveTool(null); navigate('pricing'); }}
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
              <div className="p-6 border-b border-black/8 flex items-center justify-between gap-4 bg-[#FDFCFB]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 shrink-0 bg-[#004225] text-white flex items-center justify-center shadow-md">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-serif text-[#1A1A18] leading-tight truncate">{t.generated_app_title}</h3>
                    <p className="text-[10px] text-[#9A9A94] font-light mt-0.5">Stella · {new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH')}</p>
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

      {/* --- AUTH MODAL --- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => { setIsAuthModalOpen(false); setConfirmPassword(''); setAuthError(''); }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-10"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="
                relative z-20 w-full sm:max-w-md
                bg-white dark:bg-[#1A1A18] text-[#1A1A18] dark:text-[#FAFAF8]
                shadow-2xl border border-black/10 dark:border-white/10
                overflow-y-auto custom-scrollbar
                /* Mobile: bottom-sheet style, fills width, max 90vh, respects safe area */
                rounded-t-2xl sm:rounded-none
                max-h-[92vh] sm:max-h-[calc(100vh-3rem)]
                px-5 pt-6 sm:p-8 md:p-10
                pb-[max(1.5rem,env(safe-area-inset-bottom))]
                /* Soft glass tint on backdrop */
                backdrop-blur-2xl
              "
              style={{
                // iOS Safari: dynamic viewport unit (`100dvh`) where supported
                ['--auth-modal-min' as any]: 'auto',
              }}
            >
              {/* Mobile-only grab handle for the bottom-sheet feel */}
              <div className="sm:hidden flex justify-center mb-3 -mt-1" aria-hidden="true">
                <span className="block w-10 h-1 rounded-full bg-black/15 dark:bg-white/15" />
              </div>
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
                <span className="text-2xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] inline-flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 32 32" className="text-[#004225] dark:text-[#00A854] shrink-0" aria-hidden="true">
                    <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                  </svg>
                  <span>Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span></span>
                </span>
                <h3 id="auth-modal-title" className="text-xl font-medium mt-4">
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
                        className={`w-full bg-white dark:bg-[#2A2A26] border pl-10 pr-10 py-3.5 text-base font-light text-[#1A1A18] dark:text-[#FAFAF8] placeholder:text-[#9A9A94] dark:placeholder:text-[#5C5C58] outline-none transition-all min-h-[48px] ${
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
                  className="w-full bg-[#004225] text-white py-4 min-h-[52px] text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-[#00331d] shadow-md hover:shadow-lg shadow-[#004225]/25 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
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
                    <button
                      onClick={() => { setIsSettingsOpen(false); navigate('pricing'); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border border-[#004225]/20 px-3 py-1.5 hover:bg-[#004225] hover:text-white transition-all"
                    >
                      {t.settings_change_plan}
                    </button>
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
                      : isProPlan ? [t.plan_unlim_f2, t.plan_unlim_f3, t.plan_unlim_f4, t.plan_unlim_f5]
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
                              onClick={() => { setIsSettingsOpen(false); navigate('pricing'); }}
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
        ref={avatarInputRef}
        className="hidden"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleAvatarUpload}
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
