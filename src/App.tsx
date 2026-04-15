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
  Upload, FileUp, Copy, Eye, EyeOff, Lightbulb, Wrench, HelpCircle, Command, Activity
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc,
  getDoc, 
  serverTimestamp,
  increment,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { searchData, SearchItem } from './data/searchData';
import sampleJobs from './data/sampleJobs.json';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

import Markdown from 'react-markdown';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PRO_MODEL = "gemini-2.5-pro";
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
  searchUses?: number;
  cvContext?: string;
  role?: 'client' | 'admin' | 'pro' | 'unlimited';
  hasSeenTutorial?: boolean;
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
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-12 text-center">
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

// --- FIRESTORE ERROR HANDLING ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}


function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error (non-fatal):', JSON.stringify(errInfo));
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
const PromoSequence = ({ onComplete, t }: { onComplete: () => void, t: any }) => {
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % totalSteps);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      title: "Präzision in jeder Zeile.",
      subtitle: "Dein Schweizer Karriere-Copilot.",
      icon: <Target className="w-16 h-16 text-[#004225]" />,
      desc: "Wir verstehen den Schweizer Arbeitsmarkt wie kein anderer."
    },
    {
      title: "CV Optimierung 2.0",
      subtitle: "ATS-sicher & Design-stark.",
      icon: <FileText className="w-16 h-16 text-[#004225]" />,
      desc: "Dein Lebenslauf wird nicht nur gelesen, er wird bewundert."
    },
    {
      title: "Stella AI",
      subtitle: "Deine persönliche Beraterin.",
      icon: <Sparkles className="w-16 h-16 text-[#004225]" />,
      desc: "Echtzeit-Feedback und Strategien für deinen Erfolg."
    },
    {
      title: "Lohn-Check & Insights",
      subtitle: "Wisse, was du wert bist.",
      icon: <Coins className="w-16 h-16 text-[#004225]" />,
      desc: "Transparente Daten für deine nächste Verhandlung."
    },
    {
      title: "Bereit für den Aufstieg?",
      subtitle: "Stellify ist dein Partner.",
      icon: <Rocket className="w-16 h-16 text-[#004225]" />,
      desc: "Starte jetzt und sichere dir deinen Traumjob."
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
      <div className="mt-24 flex gap-3">
        {steps.map((_, i) => (
          <div 
            key={i}
            className={`h-1 transition-all duration-500 rounded-full ${i === step ? 'w-12 bg-[#004225]' : 'w-4 bg-white/10'}`}
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
const CVDropzone = ({ onFileAccepted, isUploading, t }: { onFileAccepted: (file: File) => void, isUploading: boolean, t: any }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        relative overflow-hidden group cursor-pointer transition-all duration-500
        border-2 border-dashed p-8 text-center
        ${isDragActive 
          ? 'border-[#004225] bg-[#004225]/5 scale-[1.02]' 
          : 'border-black/10 dark:border-white/10 hover:border-[#004225]/30 dark:hover:border-[#FAFAF8]/30 bg-white/5'
        }
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-4 relative z-10">
        <div className="w-16 h-16 bg-[#FAFAF8] dark:bg-[#1A1A18] rounded-full flex items-center justify-center mx-auto text-[#004225] dark:text-[#FAFAF8] group-hover:scale-110 transition-transform duration-500 shadow-sm">
          {isDragActive ? <FileUp size={32} className="animate-bounce" /> : <Upload size={32} />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-serif text-[#1A1A18] dark:text-[#FAFAF8]">
            {isDragActive ? t.drop_file_here : t.drag_cv_here}
          </p>
          <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-widest font-bold">
            {t.pdf_only}
          </p>
        </div>
      </div>
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#004225]/20" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#004225]/20" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#004225]/20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#004225]/20" />
    </div>
  );
};

function StellifyApp() {
  // --- STATE ---
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const authEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setTimeout(() => authEmailRef.current?.focus(), 100);
    }
  }, [isAuthModalOpen]);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
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
  const [activeView, setActiveView] = useState<'dashboard' | 'tools' | 'jobs' | 'pricing'>('dashboard');
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

  // Minimum splash screen duration (3.2s for professional feel)
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 3200);
    return () => clearTimeout(timer);
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
  const [parsedSalaryResult, setParsedSalaryResult] = useState<any | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [toolStep, setToolStep] = useState(0); // For multi-step tools like Interview Sim
  const [toolHistory, setToolHistory] = useState<any[]>([]);
  
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const handleJobClick = (jobId: string) => {
    const job = sampleJobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setIsJobModalOpen(true);
    }
  };

  // --- JOB BOARD COMPONENT ---
  const JobBoard = () => {
    const [jobFilters, setJobFilters] = useState({ keyword: '', location: '', industry: '' });
    const [liveJobs, setLiveJobs] = useState<any[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLiveResult, setIsLiveResult] = useState(false);
    const [liveSource, setLiveSource] = useState<'adzuna' | 'gemini' | null>(null);
    const [liveTotal, setLiveTotal] = useState<number | null>(null);

    const localFiltered = (sampleJobs as any[]).filter(job => {
      const kw = jobFilters.keyword.toLowerCase();
      const loc = jobFilters.location.toLowerCase();
      const ind = jobFilters.industry.toLowerCase();
      return (!kw || job.title.toLowerCase().includes(kw) || job.description.toLowerCase().includes(kw) || job.ats_keywords?.some((k: string) => k.toLowerCase().includes(kw)))
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
        const res = await fetch(`/api/jobs?${params}`);
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

    const handleOpenJob = (url: string) => {
      if (url && url !== '#') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    return (
      <div className="space-y-8">
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
              placeholder="z.B. Zürich"
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
              <option value="Finance">Finance</option>
              <option value="Pharma">Pharma</option>
              <option value="Banking">Banking</option>
              <option value="Engineering">Engineering</option>
              <option value="HR">HR</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Logistik">Logistik</option>
            </select>
          </div>
          {/* Live Search button */}
          <button
            onClick={handleLiveSearch}
            disabled={isSearching}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#003318] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {isSearching ? (
              <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Suche...</>
            ) : (
              <><Search size={13} /> KI-Suche</>
            )}
          </button>
          {isLiveResult && (
            <button onClick={handleReset} className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8] transition-colors whitespace-nowrap">
              Zurücksetzen
            </button>
          )}
        </div>

        {/* Live result badge */}
        {isLiveResult && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#00A854] animate-pulse" />
              Live · {displayJobs.length} Stellen angezeigt{liveTotal && liveTotal > displayJobs.length ? ` (${liveTotal.toLocaleString('de-CH')} total)` : ''}
            </div>
            {liveSource === 'adzuna' && (
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                via Adzuna API
              </span>
            )}
            {liveSource === 'gemini' && (
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                via KI-Suche
              </span>
            )}
          </div>
        )}
        {!isLiveResult && (
          <p className="text-[11px] text-[#9A9A94] dark:text-[#5C5C58]">
            {displayJobs.length} Muster-Stellen · Klicke <strong>KI-Suche</strong> für echte Live-Ergebnisse
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
                onClick={() => handleOpenJob(job.url)}
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
                <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] line-clamp-2 mb-6 font-light">{job.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    {job.ats_keywords?.slice(0, 3).map((kw: string) => (
                      <span key={kw} className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-black/5 dark:bg-white/5 text-[#9A9A94] dark:text-[#5C5C58]">{kw}</span>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Öffnen <ArrowRight size={12} />
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] dark:text-[#5C5C58] mb-3">Weitere Stellen direkt suchen</p>
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
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    // Test connection to Firestore
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      } catch (error: any) {
        if (error?.message?.includes('the client is offline') || error?.code === 'permission-denied') {
          console.warn("Firestore connection test: Expected or minor issue", error.message);
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listener if it exists
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let isFirstFetch = true;
        
        // Initial check and creation if needed
        try {
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            const rawName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nutzer';
            const cleanName = rawName.replace(/\./g, ' ');
            const formattedName = cleanName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: formattedName,
              role: 'client',
              createdAt: serverTimestamp(),
              freeGenerationsUsed: 0,
              toolUses: 0,
              dailyToolUses: 0,
              lastDailyReset: new Date().toISOString().split('T')[0],
              hasSeenTutorial: false,
              language: language,
              theme: theme,
              cvContext: cvContext || null
            });
          }
        } catch (e) {
          console.error("Error ensuring user document exists:", e);
        }

        // Real-time listener for user data
        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            
            // Sync language and theme if they exist in DB
            if (userData.language && userData.language !== language) {
              setLanguage(userData.language);
            }
            if (userData.theme && userData.theme !== theme) {
              setTheme(userData.theme);
            }

            const rawName = userData.firstName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nutzer';
            const cleanName = rawName.replace(/\./g, ' ');
            const formattedName = cleanName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            const sanitizedFirstName = formattedName === 'Gast' ? 'Nutzer' : formattedName;
            
            const newUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: sanitizedFirstName,
              freeGenerationsUsed: userData.freeGenerationsUsed || 0,
              toolUses: userData.toolUses || 0,
              dailyToolUses: userData.dailyToolUses || 0,
              lastDailyReset: userData.lastDailyReset || null,
              cvContext: userData.cvContext || null,
              role: userData.role || 'client',
              hasSeenTutorial: userData.hasSeenTutorial || false
            };
            setUser(newUser);

            // Daily Reset Logic
            const today = new Date().toISOString().split('T')[0];
            if (userData.lastDailyReset !== today) {
              updateDoc(userDocRef, {
                dailyToolUses: 0,
                lastDailyReset: today
              }).catch(e => console.error("Daily reset error:", e));
            }
            
            if (!userData.hasSeenTutorial) {
              setIsTutorialOpen(true);
            }

            if (userData.cvContext) {
              setCvContext(userData.cvContext);
            }
          }
          if (isFirstFetch) {
            setIsAuthReady(true);
            isFirstFetch = false;
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          if (isFirstFetch) {
            setIsAuthReady(true);
            isFirstFetch = false;
          }
        });
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

    const q = query(
      collection(db, 'users', user.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({ role: data.role, content: data.content });
      });
      
      if (msgs.length > 0) {
        setMessages(msgs);
      } else {
        setMessages([{ role: 'ai', content: t.stella_greeting.replace('{name}', user.firstName) }]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.id}/messages`);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
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
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'linkedin') {
        const profile = event.data.profile;
        setLinkedinProfile(profile);
        
        // Update CV Context if it's empty
        if (!cvContext && profile.name) {
          const importedContext = `Name: ${profile.name}\nEmail: ${profile.email}\nLinkedIn Import: ${JSON.stringify(profile)}`;
          setCvContext(importedContext);
          
          // Save to Firestore if user is logged in
          if (user) {
            setDoc(doc(db, 'users', user.id), { cvContext: importedContext }, { merge: true })
              .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`));
          }
        }
        
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: `Perfekt! Ich habe dein LinkedIn-Profil (${profile.name}) erfolgreich importiert. Ich nutze diese Informationen nun, um deine Bewerbungen noch präziser zu gestalten.` 
        }]);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [user, cvContext]);

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
        content: language === 'DE' ? 'Verwalte deine persönlichen Daten, deinen Lebenslauf und deine Einstellungen.' : 'Manage your personal data, your CV and your settings.',
        category: language === 'DE' ? 'Profil' : 'Profile',
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
    if (user) {
      const q = query(
        collection(db, 'users', user.id, 'applications'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const apps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setApplications(apps);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.id}/applications`);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.id, 'cv_analyses'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setLatestAnalysis(snapshot.docs[0].data());
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.id, 'toolResults'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setToolHistory(history);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.id}/toolResults`);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const [careerRoadmap, setCareerRoadmap] = useState<string[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);
  const [salaryCalculations, setSalaryCalculations] = useState<any[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.id, 'salary_calculations'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const calcs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setSalaryCalculations(calcs);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.id}/salary_calculations`);
      });
      return () => unsubscribe();
    }
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
        // Fallback to AI if backend fails
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          console.warn("GEMINI_API_KEY is missing.");
          return;
        }
        const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
        const isPro = user?.role === 'pro' || isUnlimited;
        const model = isPro ? PRO_MODEL : FLASH_MODEL;
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: `Basierend auf diesem CV: ${cvContext}, erstelle eine 3-stufige Karriere-Roadmap für den Schweizer Markt.`,
          config: {
            systemInstruction: "Du bist ein Schweizer Karriere-Experte. Gib nur die 3 Schritte als Liste zurück, kurz und präzise. Nutze Schweizer Hochdeutsch (kein ß).",
            temperature: 0.4
          }
        });
        const steps = response.text.split('\n').filter(s => s.trim()).slice(0, 3);
        setCareerRoadmap(steps);
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

  const analyzeCV = async (text: string) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return;
      const ai = new GoogleGenAI({ apiKey });
      
      const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
      const isPro = user?.role === 'pro' || isUnlimited;
      const model = isPro ? PRO_MODEL : FLASH_MODEL;
      
      const response = await ai.models.generateContent({
        model: model,
        contents: `Führe eine tiefgehende Analyse und Optimierung des Lebenslaufs für den Schweizer Arbeitsmarkt durch. KONTEXT: CV: ${text}.`,
        config: {
          systemInstruction: `
            Du bist ein Senior Career Consultant für den Schweizer Markt (Zürich, Genf, Basel, Zug).
            Führe eine Analyse basierend auf Schweizer Standards durch.
            Prüfe auf: Sprachniveaus (GERS), Arbeitsbewilligungen (L, B, C), Referenzen, Foto-Standards und Bildungs-Äquivalenz.
            Nutze Schweizer Hochdeutsch (kein ß).
          `,
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 wichtigste Keywords" },
              industryMatch: { type: Type.STRING, description: "3 Schweizer Branchen mit besten Chancen" },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 konkrete Optimierungspunkte" },
              score: { type: Type.NUMBER, description: "Swiss Market Readiness Score 0-100" },
              optimizedHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 impact-driven Bulletpoints" },
              optimizedSummary: { type: Type.STRING, description: "Kurzprofil für den CV-Header" }
            },
            required: ["keywords", "industryMatch", "improvements", "score", "optimizedHighlights", "optimizedSummary"]
          }
        }
      });

      const analysisData = JSON.parse(response.text);
      setLatestAnalysis(analysisData);
      
      if (user) {
        await addDoc(collection(db, 'users', user.id, 'cv_analyses'), {
          ...analysisData,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("CV Analysis Error:", e);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        // Fallback for non-PDF files (just a placeholder for now)
        text = `Inhalt von ${file.name} (Text-Extraktion nur für PDF implementiert)`;
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
          await setDoc(doc(db, 'users', user.id), { cvContext: text }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
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
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Store additional user data in Firestore
        const emailPrefix = firebaseUser.email?.split('@')[0] || 'Nutzer';
        const rawName = firstName === 'Gast' ? 'Nutzer' : (firstName || firebaseUser.displayName || emailPrefix);
        const cleanName = rawName.replace(/\./g, ' ');
        const formattedName = cleanName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: formattedName,
          role: 'client',
          createdAt: serverTimestamp(),
          cvContext: cvContext || null, // Persist local CV context if it exists
          freeGenerationsUsed: 0
        });
      }
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
      setFirstName('');
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError(
          language === 'DE' ? 'Anmeldedaten ungültig. Falls du noch kein Konto in diesem neuen System hast, registriere dich bitte neu.' :
          'Invalid credentials. If you don\'t have an account in this new system yet, please register a new account.'
        );
        // If they were trying to login, maybe they need to register
        if (authTab === 'login') {
          setAuthTab('register');
        }
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError(
          language === 'DE' ? 'Diese E-Mail wird bereits verwendet. Bitte melde dich stattdessen an.' :
          'This email is already in use. Please log in instead.'
        );
        // If they were trying to register, they should login
        if (authTab === 'register') {
          setAuthTab('login');
        }
      } else if (err.code === 'auth/weak-password') {
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
      await sendPasswordResetEmail(auth, email);
      setAuthError(
        language === 'DE' ? 'Passwort-Reset-E-Mail wurde gesendet!' :
        language === 'FR' ? 'E-mail de réinitialisation envoyé !' :
        language === 'IT' ? 'Email di ripristino inviata!' :
        'Password reset email sent!'
      );
    } catch (err: any) {
      console.error("Reset Error:", err);
      setAuthError(
        language === 'DE' ? 'Fehler beim Senden der Reset-E-Mail.' :
        'Error sending reset email.'
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setIsAuthModalOpen(false);
        showToast(language === 'DE' ? 'Erfolgreich mit Google angemeldet!' : 'Successfully signed in with Google!', 'success');
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      let errorMsg = language === 'DE' ? 'Google-Anmeldung fehlgeschlagen.' : 'Google authentication failed.';
      if (err.code === 'auth/unauthorized-domain') {
        errorMsg = language === 'DE' ? 'Diese Domain ist nicht für Google Login autorisiert.' : 'This domain is not authorized for Google Login.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMsg = language === 'DE' ? 'Das Popup wurde blockiert. Bitte erlaube Popups.' : 'Popup was blocked. Please allow popups.';
      }
      setAuthError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    setIsSavingName(true);
    try {
      const cleanName = newName.trim().replace(/\./g, ' ');
      const formattedName = cleanName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      
      await updateDoc(doc(db, 'users', user.id), {
        firstName: formattedName
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
      await addDoc(collection(db, 'users', user.id, 'applications'), {
        ...newApp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddingApp(false);
      setNewApp({ company: '', position: '', status: 'Applied', location: '', salary: '', notes: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.id}/applications`);
    }
  };

  const updateApplication = async () => {
    if (!user || !editingApp || !editingApp.company || !editingApp.position) return;
    try {
      await updateDoc(doc(db, 'users', user.id, 'applications', editingApp.id), {
        ...editingApp,
        updatedAt: serverTimestamp()
      });
      setEditingApp(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}/applications/${editingApp.id}`);
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id, 'applications', appId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}/applications/${appId}`);
    }
  };

  const deleteApplication = async (appId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.id, 'applications', appId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.id}/applications/${appId}`);
    }
  };

  const sendMessage = async (overrideContent?: string) => {
    const userContent = overrideContent || input;
    if (!userContent.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', content: userContent };
    
    // If not logged in, just update local state
    if (!user) {
      setMessages(prev => [...prev, userMsg]);
    } else {
      try {
        await addDoc(collection(db, 'users', user.id, 'messages'), {
          role: 'user',
          content: userContent,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.id}/messages`);
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
          await addDoc(collection(db, 'users', user.id, 'messages'), {
            role: 'ai',
            content: limitMsg,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.id}/messages`);
        }
      }
      setIsTyping(false);
      return;
    }

    // Increment usage for non-unlimited users
    if (user && !isUnlimited) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { 
          freeGenerationsUsed: increment(1),
          dailyToolUses: increment(1)
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

        LANGUAGE:
        - Respond in the user's selected language: ${language}.
        - If the language is German, use Swiss High German (no "ß", use "ss").

        USER TIER: ${user?.role === 'unlimited' ? 'Unlimited (Highest Priority/Elite)' : user?.role === 'pro' ? 'Pro (Premium)' : 'Gratis (Standard)'}.

        CONTEXT:
        ${cvContext ? `The candidate has uploaded a CV: ${cvContext}.` : 'The candidate has not yet uploaded a CV. Politely encourage them to do so to receive personalized tips.'}
        Candidate: ${user?.firstName || 'User'}.
      `;

      const chatRes = await fetch('/api/chat', {
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
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat failed');

      const reply = chatData.text || (language === 'DE' ? "Stella ist gerade nachdenklich. Bitte versuche es noch einmal." : "Stella is currently thoughtful. Please try again.");
      
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      } else {
        try {
          await addDoc(collection(db, 'users', user.id, 'messages'), {
            role: 'ai',
            content: reply,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.id}/messages`);
        }
      }
    } catch (err: any) {
      console.error("Stella Chat Error:", err);
      let errorMsg = language === 'DE' 
        ? `Stella ist gerade beschäftigt (Fehler: ${err.message || 'Unbekannt'}). Bitte versuche es später noch einmal.` 
        : `Stella is busy right now (Error: ${err.message || 'Unknown'}). Please try again later.`;
      
      if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
        errorMsg = language === 'DE'
          ? "Stella hat ein Problem mit ihrem Zugangsschlüssel. Bitte kontaktiere den Support."
          : "Stella is having trouble with her API key. Please contact support.";
      } else if (err.message?.includes('quota') || err.message?.includes('429')) {
        errorMsg = language === 'DE'
          ? "Stella hat heute schon zu viele Anfragen beantwortet. Bitte versuche es morgen wieder oder upgrade dein Abo."
          : "Stella has answered too many requests today. Please try again tomorrow or upgrade your subscription.";
      }
      
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      } else {
        try {
          await addDoc(collection(db, 'users', user.id, 'messages'), {
            role: 'ai',
            content: errorMsg,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.id}/messages`);
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

    setActiveTool(tool);
    setToolInput({});
    setToolResult(null);
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
          cancelUrl: window.location.origin
        })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (e: any) {
      console.error("Subscription error:", e);
      const msg = e.message || '';
      // Always show the actual error so the user/admin can diagnose it
      setSubscriptionError(`⚠️ ${msg || 'Checkout fehlgeschlagen.'} – support.stellify@gmail.com`
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  const processTool = async () => {
    if (!activeTool) return;
    
    setIsProcessingTool(true);
    setToolResult(null);
    setParsedSalaryResult(null);

    const isUnlimited = user?.role === 'unlimited' || user?.role === 'admin';
    const isPro = user?.role === 'pro' || isUnlimited;

    // Check if tool is ultimate-only
    if (activeTool.type === 'ultimate' && !isUnlimited) {
      setToolResult(
        language === 'DE' 
          ? "Dieses exklusive Tool erfordert ein Ultimate-Abo für maximale Präzision und Tiefe. ✨" 
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
    
    const isToolLimitReached = (!isPro && toolUses >= 1) || (user?.role === 'pro' && !isUnlimited && toolUses >= 50);
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
            KONTEXT: Aktueller CV-Text: ${toolInput.cvText || cvContext}.
            
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
            
            AUSGABE:
            Gib den vollständig optimierten Text des Lebenslaufs zurück, unterteilt in die klassischen Sektionen (Persönliches, Profil, Berufserfahrung, Ausbildung, Skills).
            Füge am Ende eine Sektion "🇨🇭 Schweizer Premium-Check" hinzu, in der du kurz erklärst, warum diese Version nun perfekt für den Schweizer Markt ist.
          `;
          break;
        case 'career-roadmap':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle eine detaillierte, personalisierte "Schweizer Karriere-Roadmap".
            KONTEXT: 
            - CV des Nutzers: ${cvContext || 'Nicht vorhanden'}.
            - Karriereziel: ${toolInput.goal || 'Nicht spezifiziert'}.

            DEINE ROLLE: Du bist ein Senior Career Strategist für den Schweizer Markt.

            STRUKTUR DER ROADMAP:
            1. STATUS QUO ANALYSE: Wo steht der Nutzer aktuell im Vergleich zum Schweizer Marktstandard?
            2. WEITERBILDUNGS-PFAD (SCHWEIZ-SPEZIFISCH):
               - Schlage konkrete Schweizer Abschlüsse vor (z.B. CAS/DAS/MAS an Fachhochschulen/Unis, Eidg. Fachausweise, Diplome).
               - Nenne relevante Institutionen (z.B. ZHAW, HSG, ETH, KV Business School).
            3. JOB-SUCH-STRATEGIE:
               - Welche Schweizer Jobportale sind am relevantesten (z.B. Jobs.ch, LinkedIn, NZZ Jobs, spezialisierte Portale)?
               - Empfehlungen für Headhunter/Personalvermittler in der Schweiz.
            4. NETZWERK-BOOST: Konkrete Tipps für das Networking in der Schweiz (Events, Verbände).
            5. ZEITPLAN: Ein realistischer 12-Monats-Plan.

            AUSGABE:
            Verwende eine motivierende, professionelle Sprache (Schweizer Hochdeutsch, kein "ß").
            Füge am Ende eine Sektion "🇨🇭 Insider-Tipp" hinzu.
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
               ${toolInput.section.toLowerCase().includes('keyword') || toolInput.section.toLowerCase().includes('schlüsselwörter') ? `
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
            - CV des Kandidaten: ${cvContext || 'Nicht vorhanden'}
            - Stelleninserat/Zusatzinfos: ${toolInput.jobAd || 'Allgemeine Initiativbewerbung'}
            ANFORDERUNGEN:
            - Sprache: Schweizer Hochdeutsch (KEIN "ß", verwende "ss").
            - Struktur: Absender, Empfänger, Ort/Datum, Betreff, Anrede, Einleitung, Hauptteil (Warum ich? Warum ihr?), Schluss, Grussformel.
            - Stil: Selbstbewusst, präzise, keine Floskeln wie "hiermit bewerbe ich mich".
            - Fokus: Hebe spezifische Erfolge hervor, die zum Inserat passen.
          `;
          break;
        case 'linkedin-job':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle ein "Application Package" für LinkedIn.
            KONTEXT:
            - Profil/CV: ${toolInput.linkedinProfile || cvContext || 'Nicht vorhanden'}
            - Stelleninserat: ${toolInput.jobAd}
            OUTPUT-STRUKTUR:
            1. Motivationsschreiben (Schweizer Standard, kein ß).
            2. CV-Anpassungsvorschläge (Welche Keywords fehlen?).
            3. "Elevator Pitch" für die Nachricht an den Recruiter auf LinkedIn.
            4. Die 3 stärksten Argumente, warum der Kandidat perfekt passt.
          `;
          break;
        case 'salary-calc':
          prompt = `
            HANDLUNGSANWEISUNG: Berechne den Marktwert in der Schweiz mit höchster Präzision.
            INPUT: Job: ${toolInput.jobTitle}, Branche: ${toolInput.industry}, Erfahrung: ${toolInput.experience} Jahre, Kanton: ${toolInput.canton}.
            DEINE ROLLE: Du bist ein Experte für Schweizer Lohnstrukturen (BFS/Salarium-Standard).
            
            ANALYSE-KRITERIEN:
            1. REGIONALE UNTERSCHIEDE: Berücksichtige kantonale Lohnniveaus (z.B. Hochlohngebiete ZH/GE vs. GL/UR).
            2. BRANCHEN-SPEZIFIKA: Analysiere Lohnunterschiede zwischen Sektoren (z.B. Pharma/Banking vs. Gastronomie/Detailhandel).
            3. ERFAHRUNG & BILDUNG: Bewerte den Impact von Berufsjahren und Schweizer Abschlüssen (EFZ, HF, FH, Uni).
            4. SCHWEIZER STANDARDS: Inkludiere das 13. Monatsgehalt und gängige Bonusstrukturen.
            
            AUSGABE-FORMAT (JSON):
            {
              "jobTitle": "${toolInput.jobTitle}",
              "industry": "${toolInput.industry}",
              "experience": "${toolInput.experience}",
              "canton": "${toolInput.canton}",
              "minSalary": 0,
              "maxSalary": 0,
              "medianSalary": 0,
              "insights": [
                "Regionale Marktanalyse für ${toolInput.canton}",
                "Branchen-Benchmark für ${toolInput.industry}",
                "Verhandlungstipp basierend auf ${toolInput.experience} Jahren Erfahrung"
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
            HANDLUNGSANWEISUNG: Simuliere ein professionelles Vorstellungsgespräch für die Position: ${toolInput.jobTitle}.
            KONTEXT: CV des Kandidaten: ${cvContext || 'Kein CV hochgeladen – nutze allgemeine Schweizer Standards'}.
            SPRACHE: Schweizer Hochdeutsch (kein ß, verwende ss).

            MODUS: Erstelle 5 hochrelevante, anspruchsvolle Fragen, die typischerweise bei Schweizer Unternehmen (Banken, Pharma, KMU, Versicherungen) gestellt werden.

            FÜR JEDE FRAGE:
            1. Die Frage selbst (klar und präzise formuliert)
            2. Was der Recruiter wirklich wissen will (Hintergrund)
            3. Optimale Antwort-Strategie (STAR-Methode wenn sinnvoll)
            4. Konkreter Formulierungsvorschlag (Musterantwort in Schweizer Hochdeutsch)
            5. Häufige Fehler, die Kandidaten bei dieser Frage machen

            ${scoringGrid}

            ABSCHLUSS: Gib 3 konkrete Tipps speziell für ein Interview in der Schweiz (Pünktlichkeit, Unterlagen, Kultur etc.).
          `;
          break;
        }
        case 'linkedin-posts':
          prompt = `
            HANDLUNGSANWEISUNG: Generiere 3 massgeschneiderte LinkedIn-Posts im Schweizer Stil.
            THEMA/FOKUS: ${toolInput.topic}.
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
            VERGLEICH: CV (${cvContext}) vs. Ziel-Job (${toolInput.targetJob}).
            OUTPUT:
            - TOP 5 MISSING SKILLS: Welche harten und weichen Faktoren fehlen?
            - LERNPFAD: Konkrete Kurse (z.B. auf LinkedIn Learning, Coursera oder Schweizer Instituten wie ZHAW/HSG).
            - PROJEKT-IDEE: Wie kann der Kandidat diesen Skill ohne neuen Job beweisen?
          `;
          break;
        case 'lehrstellen':
          prompt = `
            Suche nach passenden Lehrstellen in der Schweiz für: "${toolInput.interest}".
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
            ABSCHLUSS: ${toolInput.education}.
            KONTEXT: CV: ${cvContext}.
            INHALT:
            - Die 3 wichtigsten Branchen für diesen Abschluss in der Schweiz.
            - Lohn-Erwartungen für Einsteiger.
            - Strategie für die erste Bewerbung (Fokus auf Potential statt Erfahrung).
          `;
          break;
        case 'erfahrung-plus':
          prompt = `
            HANDLUNGSANWEISUNG: Strategie für Ü50-Bewerber in der Schweiz.
            STÄRKE: ${toolInput.experience}.
            KONTEXT: CV: ${cvContext}.
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
            AKTUELLER JOB: ${toolInput.currentJob}.
            KONTEXT: CV: ${cvContext}.
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
        default:
          prompt = "Bitte hilf mir bei meiner Karriere.";
      }

      const toolRes = await fetch('/api/process-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, useSearch })
      });
      const toolData = await toolRes.json();
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
              await addDoc(collection(db, 'users', user.id, 'cv_analyses'), {
                ...analysisData,
                createdAt: serverTimestamp()
              });
            }
            
            // Format for display
            resultText = `
### 📊 Swiss Market Readiness Score: ${analysisData.score}/100

#### 🔑 Top Keywords im CV:
${analysisData.keywords.map((k: string) => `- ${k}`).join('\n')}

#### 🏢 Branchen-Match (Schweizer Standards):
${analysisData.industryMatch}

#### 🗣️ Sprachliche Optimierung (Schweizer Hochdeutsch):
${analysisData.linguisticFixes?.map((f: string) => `- ${f}`).join('\n') || 'Keine spezifischen Korrekturen nötig.'}

#### 🚀 Strategisches Verbesserungspotential:
${analysisData.improvements.map((i: string) => `- ${i}`).join('\n')}

#### ✨ Optimierte CV-Highlights:
${analysisData.optimizedHighlights?.map((h: string) => `- ${h}`).join('\n') || 'Keine Highlights generiert.'}

#### 📝 Kurzprofil-Vorschlag:
${analysisData.optimizedSummary || 'Kein Kurzprofil generiert.'}

---
#### 📄 Rohdaten (JSON):
\`\`\`json
${JSON.stringify(analysisData, null, 2)}
\`\`\`
            `;
          }
        } catch (e) {
          console.error("Error parsing CV analysis JSON:", e);
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
              await addDoc(collection(db, 'users', user.id, 'salary_calculations'), {
                ...salaryData,
                createdAt: serverTimestamp()
              });
            }
            
            setParsedSalaryResult(salaryData);
            
            // Format for display
            resultText = `
### 💰 Schweizer Marktwert-Analyse

**Position:** ${salaryData.jobTitle}
**Branche:** ${salaryData.industry}
**Erfahrung:** ${salaryData.experience} Jahre
**Kanton:** ${salaryData.canton}

#### 📊 Geschätztes Brutto-Jahresgehalt (inkl. 13. Monatslohn):
- **Minimum:** CHF ${salaryData.minSalary.toLocaleString('de-CH')}
- **Median:** CHF ${salaryData.medianSalary.toLocaleString('de-CH')}
- **Maximum:** CHF ${salaryData.maxSalary.toLocaleString('de-CH')}

#### 💡 Strategische Verhandlungs-Insights:
${salaryData.insights.map((i: string) => `- ${i}`).join('\n')}

---
*Hinweis: Diese Daten basieren auf KI-Modellen und dienen als Orientierungshilfe. Für verbindliche Werte empfehlen wir Salarium.ch.*
            `;
          }
        } catch (e) {
          console.error("Error parsing Salary calculation JSON:", e);
        }
      }
      
      // Handle Grounding Metadata for Search
      if (useSearch && toolSources.length > 0) {
        resultText += "\n\n**Quellen:**\n" + toolSources.map(s => `\n- ${s}`).join("");
      }

      setToolResult(resultText);

      // Save to history
      if (user) {
        try {
          await addDoc(collection(db, 'users', user.id, 'toolResults'), {
            toolId: activeTool.id,
            toolTitle: activeTool.title,
            input: toolInput,
            result: resultText,
            createdAt: serverTimestamp()
          });
          
          // Increment usage for non-unlimited users
          if (!isUnlimited) {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { 
              toolUses: increment(1),
              dailyToolUses: increment(1)
            });
          }

          // Increment search usage if search was used
          if (useSearch) {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { searchUses: increment(1) });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.id}`);
        }
      }

    } catch (e: any) {
      console.error("Tool processing error:", e);
      setToolResult(
        language === 'DE' ? '⚠️ KI-Fehler: ' + (e?.message || 'Unbekannter Fehler') :
        language === 'FR' ? '⚠️ Erreur IA: ' + (e?.message || 'Erreur inconnue') :
        language === 'IT' ? '⚠️ Errore AI: ' + (e?.message || 'Errore sconosciuto') :
        '⚠️ AI Error: ' + (e?.message || 'Unknown error')
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
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("STELLIFY | SCHWEIZER KARRIERE-CO-PILOT", margin, 15);
    doc.text(new Date().toLocaleDateString('de-CH'), pageWidth - margin - 20, 15);
    
    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 66, 37); // #004225
    doc.text(activeTool.title.toUpperCase(), margin, 30);
    
    // Content
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    
    const splitText = doc.splitTextToSize(toolResult, pageWidth - margin * 2);
    let cursorY = 45;
    const lineHeight = 7;
    
    splitText.forEach((line: string) => {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Seite ${i} von ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }
    
    doc.save(`stellify-${activeTool.id}.pdf`);
  };

  const downloadAsWord = () => {
    if (!toolResult || !activeTool) return;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
          h1 { color: #004225; font-size: 18pt; margin-bottom: 20pt; border-bottom: 1pt solid #eee; padding-bottom: 10pt; }
          .header { font-family: Arial, sans-serif; font-size: 8pt; color: #666; margin-bottom: 30pt; text-transform: uppercase; letter-spacing: 1pt; }
          .footer { font-family: Arial, sans-serif; font-size: 8pt; color: #999; margin-top: 50pt; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">Stellify | Schweizer Karriere-Co-Pilot</div>
        <h1>${activeTool.title}</h1>
        <div class="content">
          ${toolResult.replace(/\n/g, '<br>')}
        </div>
        <div class="footer">Generiert von Stellify am ${new Date().toLocaleDateString('de-CH')}</div>
      </body>
      </html>`;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `stellify-${activeTool.id}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  // --- RENDER HELPERS ---
  const prices = billingCycle === 'yearly' 
    ? { gratis: '0', pro: '14.90', ultimate: '39.90' }
    : { gratis: '0', pro: '19.90', ultimate: '49.90' };

  const translations: Record<string, any> = {
    DE: {
      welcome: "Willkommen zurück,",
      stella_greeting: "Grüezi, {name}! Ich bin Stella, deine KI-Karriere-Assistentin. Wie kann ich dir heute helfen?",
      drag_cv_here: "CV hierher ziehen oder klicken",
      drop_file_here: "Datei hier loslassen",
      pdf_only: "Nur PDF-Dateien akzeptiert",
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
      stella_secure_data: "Sichere Schweizer Datenverarbeitung",
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
      tool_no_cv: "⚠️ Kein CV hochgeladen. Die KI nutzt allgemeine Informationen. Lade dein CV hoch für bessere Resultate.",
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
      cta_final_desc: "Kostenlos starten. 20+ Tools. Schweizer Standard. Jederzeit kündbar.",
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
      faq_2_q: "Kann ich jederzeit kündigen?",
      faq_2_a: "Ja, Stellify ist jederzeit kündbar. Bei monatlicher Zahlung zum Ende des Monats.",
      faq_3_q: "Wie viele Generierungen habe ich?",
      faq_3_a: "Im Gratis-Plan hast du eine Generierung. Im Pro-Plan sind es 50 pro Monat.",
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
      dashboard_stat_cv_status: "CV Status",
      dashboard_stat_ready: "Bereit",
      dashboard_stat_missing: "Fehlt",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_unlimited: "Unlimited",
      dashboard_stat_free: "Gratis",
      dashboard_cv_optimize: "Premium Optimierung",
      salary_security_notice: "Deine Daten sind sicher: Stellify speichert keine persönlichen Gehaltsdaten. Die Berechnung erfolgt anonymisiert nach Schweizer Datenschutzstandards.",
      swiss_standard_notice_title: "Swiss Career Excellence",
      swiss_standard_notice_text: "Präzise abgestimmt auf die spezifischen Anforderungen und kulturellen Nuancen des Schweizer Arbeitsmarktes.",
      footer_rights: "Alle Rechte vorbehalten.",
      footer_privacy: "Datenschutz",
      footer_terms: "AGB",
      footer_imprint: "Impressum",
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
      pricing_free_f: ["1× Bewerbung oder Tool-Nutzung", "3× Stella Chat Anfragen", "KI-Gehaltsrechner (Basis)", "Schweizer Standards"],
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
        "1 erfolgreiche Bewerbung = Abo hat sich gerechnet",
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
        }
      }
    },
    FR: {
      welcome: "Bon retour,",
      stella_greeting: "Salut, {name}! Je suis Stella, votre assistante de carrière IA. Comment puis-je vous aider aujourd'hui?",
      drag_cv_here: "Glissez votre CV ici ou cliquez",
      drop_file_here: "Relâchez le fichier ici",
      pdf_only: "Seuls les fichiers PDF sont acceptés",
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
      cta_final_desc: "Démarrage gratuit. 20+ outils. Standard suisse. Annulable à tout moment.",
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
      faq_2_q: "Puis-je annuler à tout moment ?",
      faq_2_a: "Oui, Stellify peut être annulé à tout moment. Avec un paiement mensuel à la fin du mois.",
      faq_3_q: "Combien de générations ai-je ?",
      faq_3_a: "Dans le plan gratuit, vous avez une génération. Dans le plan Pro, il y en a 50 par mois.",
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
      salary_security_notice: "Vos données sont en sécurité : Stellify ne stocke aucune donnée salariale personnelle. Le calcul est effectué de manière anonyme selon les normes suisses de protection des données.",
      swiss_standard_notice_title: "Excellence de Carrière Suisse",
      swiss_standard_notice_text: "Précisément adapté aux exigences spécifiques et aux nuances culturelles du marché du travail suisse.",
      footer_rights: "Tous droits réservés.",
      footer_privacy: "Confidentialité",
      footer_terms: "CGV",
      footer_imprint: "Mentions légales",
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
      pricing_free_f: ["1× candidature ou utilisation d'outil", "3× demandes Stella Chat", "Calculateur de salaire IA (Base)", "Normes suisses"],
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
        "1 candidature réussie = l'abonnement est rentabilisé",
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
        }
      }
    },
    IT: {
      welcome: "Bentornato,",
      stella_greeting: "Ciao, {name}! Sono Stella, la tua assistente di carriera AI. Come posso aiutarti oggi?",
      drag_cv_here: "Trascina il CV qui o clicca",
      drop_file_here: "Rilascia il file qui",
      pdf_only: "Sono accettati solo file PDF",
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
      cta_final_desc: "Inizia gratuitamente. 20+ strumenti. Standard svizzero. Annullabile in qualsiasi momento.",
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
      faq_2_q: "Posso annullare in qualsiasi momento?",
      faq_2_a: "Sì, Stellify può essere annullato in qualsiasi momento. Con pagamento mensile alla fine del mese.",
      faq_3_q: "Quante generazioni ho?",
      faq_3_a: "Nel piano gratuito, hai una generazione. Nel piano Pro, ce ne sono 50 al mese.",
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
      salary_security_notice: "I tuoi dati sono al sicuro: Stellify non memorizza alcun dato salariale personale. Il calcolo viene eseguito in modo anonimo secondo gli standard svizzeri di protezione dei dati.",
      swiss_standard_notice_title: "Eccellenza della Carriera Svizzera",
      swiss_standard_notice_text: "Precisamente adattato ai requisiti specifici e alle sfumature culturali del mercato del lavoro svizzero.",
      footer_rights: "Tutti i diritti riservati.",
      footer_privacy: "Privacy",
      footer_terms: "CGU",
      footer_imprint: "Note legali",
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
      pricing_free_f: ["Crea 1× candidatura", "Calcolatore di stipendio AI (Base)", "Stella Chat (Limitato)", "Standard svizzeri"],
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
        "1 candidatura di successo = l'abbonamento è ripagato",
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
        }
      }
    },
    EN: {
      welcome: "Welcome back,",
      stella_greeting: "Hello, {name}! I'm Stella, your AI career assistant. How can I help you today?",
      drag_cv_here: "Drag CV here or click",
      drop_file_here: "Drop file here",
      pdf_only: "Only PDF files accepted",
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
      cta_final_desc: "Start for free. 20+ tools. Swiss standard. Cancel anytime.",
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
      faq_2_q: "Can I cancel at any time?",
      faq_2_a: "Yes, Stellify can be cancelled at any time. With monthly payment at the end of the month.",
      faq_3_q: "How many generations do I have?",
      faq_3_a: "In the free plan, you have one generation. In the Pro plan, there are 50 per month.",
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
      dashboard_stat_cv_status: "CV Status",
      dashboard_stat_ready: "Ready",
      dashboard_stat_missing: "Missing",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_pro: "Pro",
      dashboard_stat_unlimited: "Unlimited",
      dashboard_stat_free: "Free",
      dashboard_cv_optimize: "Premium Optimization",
      salary_security_notice: "Your data is safe: Stellify does not store any personal salary data. The calculation is performed anonymously according to Swiss data protection standards.",
      swiss_standard_notice_title: "Swiss Career Excellence",
      swiss_standard_notice_text: "Precisely tailored to the specific requirements and cultural nuances of the Swiss job market.",
      footer_rights: "All rights reserved.",
      footer_privacy: "Privacy",
      footer_terms: "Terms",
      footer_imprint: "Imprint",
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
      pricing_free_f: ["Create 1× application", "AI Salary Calculator (Base)", "Stella Chat (Limited)", "Swiss Standards"],
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
        "1 successful application = subscription paid off",
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
      inputs: [{ key: 'jobTitle', label: t.tools_data['interview'].input_label, type: 'text', placeholder: t.tools_data['interview'].input_placeholder }]
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
      inputs: [{ key: 'cvText', label: t.tools_data['cv-premium'].input_label, type: 'textarea', placeholder: t.tools_data['cv-premium'].input_placeholder }] 
    },
    { 
      id: 'career-roadmap', 
      title: t.tools_data['career-roadmap'].title, 
      desc: t.tools_data['career-roadmap'].desc, 
      icon: <Compass size={20} />, 
      badge: 'Strategy', 
      type: 'ultimate',
      inputs: [{ key: 'goal', label: t.tools_data['career-roadmap'].input_label, type: 'text', placeholder: t.tools_data['career-roadmap'].input_placeholder }] 
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
      inputs: [{ key: 'jobAd', label: t.tools_data['cv-gen'].input_label, type: 'textarea', placeholder: t.tools_data['cv-gen'].input_placeholder }] 
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
        { key: 'linkedinProfile', label: t.tools_data['linkedin-job'].input_profile, type: 'textarea', placeholder: t.tools_data['linkedin-job'].input_profile_placeholder },
        { key: 'jobAd', label: t.tools_data['linkedin-job'].input_ad, type: 'textarea', placeholder: t.tools_data['linkedin-job'].input_ad_placeholder }
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
    const features = ['CV-Analyse', 'Interview-Coach', 'KI-Karriere-Copilot'];
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
            {language === 'DE' ? 'Wird initialisiert...' : language === 'FR' ? 'Initialisation...' : language === 'IT' ? 'Inizializzazione...' : 'Initializing...'}
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
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#1A1A18] text-[#1A1A18] dark:text-[#FAFAF8] font-sans selection:bg-[#004225] selection:text-white transition-colors duration-300">
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/90 dark:bg-[#1A1A18]/90 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 lg:px-12 h-16 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-8">
          <button
            onClick={() => { setActiveTool(null); if (user) setActiveView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-2xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8] hover:opacity-80 transition-opacity"
          >
            Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span>
          </button>
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <button
                  onClick={() => { setActiveView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'text-[#004225] dark:text-[#00A854]' : 'text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]'}`}
                >
                  {t.dashboard}
                </button>
                <button
                  onClick={() => { setActiveView('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`text-sm font-medium transition-colors ${activeView === 'tools' ? 'text-[#004225] dark:text-[#00A854]' : 'text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#1A1A18] dark:hover:text-[#FAFAF8]'}`}
                >
                  {t.tools}
                </button>
                <button
                  onClick={() => { setActiveView('jobs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
            <span className="text-[10px] font-bold text-[#9A9A94] dark:text-[#5C5C58] px-1.5 py-0.5 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded shrink-0">⌘K</span>
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
                className="bg-[#004225] text-white text-sm font-medium px-5 py-2.5 rounded-none hover:bg-[#00331d] transition-all flex items-center gap-2"
              >
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
                  <button onClick={() => { setActiveView('dashboard'); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`text-lg font-medium text-left ${activeView === 'dashboard' ? 'text-[#004225]' : ''}`}>{t.dashboard}</button>
                  <button onClick={() => { setActiveView('tools'); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`text-lg font-medium text-left ${activeView === 'tools' ? 'text-[#004225]' : ''}`}>{t.tools}</button>
                  <button onClick={() => { setActiveView('jobs'); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`text-lg font-medium text-left ${activeView === 'jobs' ? 'text-[#004225]' : ''}`}>{t.search_type_job}</button>
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

      {/* --- HERO SECTION / DASHBOARD --- */}
      {user ? (
        <section className="px-6 lg:px-12 pt-12 pb-24 bg-[#FAFAF8] dark:bg-[#1A1A18]">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <div className="flex flex-col lg:flex-row gap-12">
              {/* Main Dashboard Area */}
              <div className="flex-1 space-y-12">
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
                    <div key={i} className="p-5 md:p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 shadow-sm transition-colors flex flex-col h-full">
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
                                    <span className="text-[10px] font-serif text-[#004225] dark:text-[#FAFAF8]">{user.toolUses || 0} / 1</span>
                                  </div>
                                  <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-[#004225] transition-all duration-700" 
                                      style={{ width: `${Math.min(100, Math.round(((user.toolUses || 0) / 1) * 100))}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <span className="text-[7px] text-[#004225] font-bold uppercase tracking-tighter opacity-60">{t.dashboard_reset_monthly}</span>
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
                    </div>
                  ))}
                </div>

                {/* TEST TOOLS (Only for Owner) */}
                {import.meta.env.DEV && user?.email === 'weare2bc@gmail.com' && (
                  <div className="p-6 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 space-y-4 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8]">
                      <Shield size={12} />
                      Developer Test Tools
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            await setDoc(doc(db, 'users', user.id), { role: 'pro' }, { merge: true });
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
                            await setDoc(doc(db, 'users', user.id), { role: 'client' }, { merge: true });
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
                      <h2 className="text-xl font-serif">Bewerbungs-Tracker</h2>
                      <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest font-medium">Verwalte deine Chancen</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingApp(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all shadow-sm"
                    >
                      <Plus size={14} />
                      Neu hinzufügen
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
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Firma</label>
                          <input 
                            type="text" 
                            value={newApp.company}
                            onChange={(e) => setNewApp({...newApp, company: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                            placeholder="z.B. Google"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Position</label>
                          <input 
                            type="text" 
                            value={newApp.position}
                            onChange={(e) => setNewApp({...newApp, position: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                            placeholder="z.B. Senior Designer"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Status</label>
                          <select 
                            value={newApp.status}
                            onChange={(e) => setNewApp({...newApp, status: e.target.value as any})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                          >
                            <option value="Wishlist">Wunschliste</option>
                            <option value="Applied">Beworben</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Angebot</option>
                            <option value="Rejected">Abgelehnt</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Standort</label>
                          <input 
                            type="text" 
                            value={newApp.location}
                            onChange={(e) => setNewApp({...newApp, location: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                            placeholder="z.B. Zürich"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Gehaltsvorstellung</label>
                          <input 
                            type="text" 
                            value={newApp.salary}
                            onChange={(e) => setNewApp({...newApp, salary: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                            placeholder="z.B. 120'000 CHF"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Notizen</label>
                        <textarea 
                          value={newApp.notes}
                          onChange={(e) => setNewApp({...newApp, notes: e.target.value})}
                          className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all min-h-[80px]"
                          placeholder="z.B. Kontaktperson: Hans Muster, Tel: 079..."
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button 
                          onClick={() => setIsAddingApp(false)}
                          className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] hover:bg-black/5 transition-all"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={addApplication}
                          className="px-8 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                        >
                          Speichern
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
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Firma</label>
                          <input 
                            type="text" 
                            value={editingApp.company}
                            onChange={(e) => setEditingApp({...editingApp, company: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Position</label>
                          <input 
                            type="text" 
                            value={editingApp.position}
                            onChange={(e) => setEditingApp({...editingApp, position: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Status</label>
                          <select 
                            value={editingApp.status}
                            onChange={(e) => setEditingApp({...editingApp, status: e.target.value as any})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                          >
                            <option value="Wishlist">Wunschliste</option>
                            <option value="Applied">Beworben</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Angebot</option>
                            <option value="Rejected">Abgelehnt</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Standort</label>
                          <input 
                            type="text" 
                            value={editingApp.location}
                            onChange={(e) => setEditingApp({...editingApp, location: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Gehaltsvorstellung</label>
                          <input 
                            type="text" 
                            value={editingApp.salary}
                            onChange={(e) => setEditingApp({...editingApp, salary: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">Notizen</label>
                        <textarea 
                          value={editingApp.notes}
                          onChange={(e) => setEditingApp({...editingApp, notes: e.target.value})}
                          className="w-full px-4 py-3 bg-[#FAFAF8] border border-black/5 text-sm focus:border-[#004225] outline-none transition-all min-h-[80px]"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button 
                          onClick={() => setEditingApp(null)}
                          className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] hover:bg-black/5 transition-all"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={updateApplication}
                          className="px-8 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                        >
                          Aktualisieren
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'].map((status) => (
                      <div key={status} className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A45]">
                            {status === 'Wishlist' ? 'Wunschliste' : 
                             status === 'Applied' ? 'Beworben' : 
                             status === 'Interview' ? 'Interview' : 
                             status === 'Offer' ? 'Angebot' : 'Abgelehnt'}
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
                                    <span className="truncate max-w-[100px]">Notizen vorhanden</span>
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
                              <span className="text-[9px] text-[#9A9A94] uppercase tracking-widest opacity-30">Leer</span>
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
                    <h2 className="text-xl font-serif">Quick Tools</h2>
                    <button 
                      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border-b border-[#004225]/20 pb-1"
                    >
                      Alle Tools
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    {tools.slice(0, 6).map((tool) => (
                      <div 
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className="p-4 md:p-6 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 transition-all group cursor-pointer flex flex-col items-center text-center space-y-3 md:space-y-4 shadow-sm"
                      >
                        <div className="w-10 h-10 bg-[#FAFAF8] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#FAFAF8] group-hover:bg-[#004225] group-hover:text-white transition-all relative">
                          {tool.icon}
                          {((tool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                            (tool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 flex items-center justify-center text-[#004225] shadow-sm">
                              <Lock size={8} />
                            </div>
                          )}
                        </div>
                        <h4 className="text-[11px] md:text-xs font-bold uppercase tracking-wider group-hover:text-[#004225] transition-colors line-clamp-2">{tool.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity / Documents */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h2 className="text-xl font-serif">Deine letzten Dokumente</h2>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[#004225] border-b border-[#004225]/20 pb-1">Alle ansehen</button>
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
                            <div className="w-10 h-10 bg-[#FAFAF8] flex items-center justify-center text-[#004225]">
                              {tools.find(t => t.id === item.toolId)?.icon || <FileText size={20} />}
                            </div>
                            <div>
                              <h4 className="font-medium group-hover:text-[#004225] transition-colors">{item.toolTitle}</h4>
                              <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('de-CH') : 'Gerade eben'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-[#9A9A94] group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))
                    ) : (
                      <div className="p-12 bg-white border border-dashed border-black/10 text-center space-y-4">
                        <div className="w-12 h-12 bg-[#FAFAF8] flex items-center justify-center text-2xl mx-auto opacity-30">📄</div>
                        <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94] font-light">Noch keine Dokumente generiert. Starte mit einem Tool unten.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar / Stella Context */}
              <div className="w-full lg:w-80 space-y-8">
                <div className="p-8 bg-[#004225] text-white space-y-6">
                  <h3 className="text-xl font-serif">Stella Context</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${cvContext ? 'bg-[#059669]' : 'bg-red-500'} animate-pulse`} />
                      <span className="text-xs font-light">{cvContext ? 'CV analysiert' : 'Kein CV hochgeladen'}</span>
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
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Fokus-Bereiche</p>
                      <div className="flex flex-wrap gap-2">
                        {['Präzision', 'Schweizer Markt', 'ATS-Optimiert'].map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/5 text-[8px] font-bold uppercase tracking-widest border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border border-black/5 bg-white space-y-6">
                  <h3 className="text-lg font-serif">Deine Roadmap</h3>
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
                      <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] font-light italic">Lade dein CV hoch, um deine Roadmap zu sehen.</p>
                    )}
                  </div>
                </div>

                <div className="p-8 border border-[#004225]/10 dark:border-[#FAFAF8]/10 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 space-y-6 transition-colors">
                  <h3 className="text-lg font-serif text-[#004225] dark:text-[#FAFAF8]">Stella Insights</h3>
                  <div className="space-y-4">
                    {latestAnalysis ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Market Score</span>
                          <span className="text-lg font-serif text-[#004225]">{latestAnalysis.score}/100</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Top Keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {latestAnalysis.keywords.slice(0, 5).map((k: string) => (
                              <span key={k} className="px-2 py-0.5 bg-[#004225]/10 text-[8px] font-medium text-[#004225]">{k}</span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Bester Match</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-light text-[#004225]/80">{latestAnalysis.industryMatch}</p>
                            <span className="px-1 py-0.5 bg-[#004225]/5 border border-[#004225]/10 text-[6px] font-bold uppercase tracking-tighter text-[#004225]/60">NOGA Standard</span>
                          </div>
                        </div>
                        {latestAnalysis.linguisticFixes && latestAnalysis.linguisticFixes.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-[#004225]/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Sprachliche Korrekturen (CH-Hochdeutsch)</p>
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Schweiz-Spezifische Tipps</p>
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Optimiertes Kurzprofil</p>
                            <p className="text-[10px] font-light text-[#004225]/80 leading-relaxed italic">
                              "{latestAnalysis.optimizedSummary}"
                            </p>
                          </div>
                        )}
                        {latestAnalysis.optimizedHighlights && (
                          <div className="space-y-2 pt-2 border-t border-[#004225]/10">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">Optimierte Highlights</p>
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
                              Rohdaten (JSON) anzeigen
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
                          Vollständige Analyse
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[#004225]/70 dark:text-[#FAFAF8]/70 font-light leading-relaxed">
                        {cvContext 
                          ? "Stella hat dein Profil analysiert. Dein Fokus auf Präzision passt hervorragend zum Schweizer Markt. Nutze den CV-Analyse-Tool für einen Tiefen-Check."
                          : "Sobald du dein CV hochlädst, erstelle ich hier eine massgeschneiderte Analyse deiner Marktchancen."}
                      </p>
                    )}
                  </div>
                </div>

                {salaryCalculations.length > 0 && (
                  <div className="p-8 border border-black/5 bg-white space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-serif">Gehaltsverlauf</h3>
                      <Coins size={18} className="text-[#004225]/40" />
                    </div>
                    <div className="space-y-4">
                      {salaryCalculations.map((calc) => (
                        <div key={calc.id} className="p-4 bg-[#FAFAF8] border border-black/5 space-y-2 group hover:border-[#004225]/20 transition-all">
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
                        <div className="w-12 h-12 bg-[#FAFAF8] dark:bg-[#1A1A18] flex items-center justify-center text-[#004225] dark:text-[#00A854] group-hover:bg-[#004225] group-hover:text-white transition-all relative z-0">
                          <span className="relative z-0 flex items-center justify-center">{tool.icon}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] bg-[#004225]/8 dark:bg-[#00A854]/10 px-2 py-1">{tool.badge}</span>
                        </div>
                      </div>
                      <h3 className="text-lg md:text-xl font-medium mb-3 text-[#1A1A18] dark:text-[#FAFAF8] group-hover:text-[#004225] dark:group-hover:text-[#00A854] transition-colors">{tool.title}</h3>
                      <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed mb-6 line-clamp-3">{tool.desc}</p>
                      <button className="text-xs font-bold uppercase tracking-widest text-[#004225] flex items-center gap-2 group/btn">
                        Öffnen <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-xs font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004225] dark:bg-[#FAFAF8] animate-pulse" />
              Schweizer KI-Präzision
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif leading-[1.1] tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">
              {language === 'DE' ? 'Dein persönlicher' : language === 'FR' ? 'Votre' : language === 'IT' ? 'Il tuo' : language === 'EN' ? 'Your Personal' : 'Tia'} <br />
              <span className="italic text-[#004225] dark:text-[#FAFAF8]">{t.hero_title.split(' ').pop()}</span>
            </h1>
            <p className="text-lg text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed max-w-lg">
              {t.hero_desc}
            </p>
            <div className="p-4 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border-l-4 border-[#004225] dark:border-[#FAFAF8] text-sm text-[#5C5C58] dark:text-[#9A9A94] font-light italic">
              {t.cv_info}
            </div>
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
              <div className="w-full">
                <CVDropzone 
                  onFileAccepted={processFile} 
                  isUploading={isUploading} 
                  t={t} 
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex-1 w-full bg-[#004225] text-white px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all flex items-center justify-center gap-3 group"
                >
                  {t.cta_free}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={handleLinkedInConnect}
                  className={`flex-1 w-full px-8 py-4 text-sm font-bold uppercase tracking-widest border border-black/10 dark:border-white/10 text-[#1A1A18] dark:text-[#FAFAF8] hover:border-[#0077b5] dark:hover:border-[#0077b5] hover:text-[#0077b5] dark:hover:text-[#0077b5] transition-all flex items-center justify-center gap-3 ${linkedinProfile ? 'bg-[#0077b5]/5 border-[#0077b5]/20 text-[#0077b5]' : ''}`}
                >
                  {linkedinProfile ? t.linkedin_connected : t.linkedin_connect}
                  <Linkedin size={18} />
                </button>
              </div>
            </div>

            {isUploading && (
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94]">
                  <span>Analysiere Dokumentenstruktur...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#004225] dark:bg-[#FAFAF8]"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {cvContext && !isUploading && (
              <div className="flex items-center gap-2 text-[#059669] text-xs font-medium">
                <CheckCircle2 size={14} />
                <span>Lebenslauf erfolgreich analysiert. Stella ist bereit.</span>
              </div>
            )}
            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex gap-12">
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">4'200+</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">{language === 'DE' ? 'Mitglieder' : language === 'FR' ? 'Membres' : language === 'IT' ? 'Membri' : 'Members'}</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">89%</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">Erfolgsquote</span>
              </div>
              <div>
                <span className="block text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8]">3×</span>
                <span className="text-xs text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-wider">Mehr Interviews</span>
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
                  <h3 className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Stella – KI-Assistentin</h3>
                  <p className="text-xs text-[#059669] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    Online – bereit zu helfen
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="bg-[#FAFAF8] dark:bg-[#2A2A26] p-4 text-sm font-light leading-relaxed max-w-[85%] text-[#1A1A18] dark:text-[#FAFAF8]">
                  Grüezi! Dein CV ist analysiert. Für das Interview bei der UBS solltest du auf die Frage "Warum UBS?" vorbereitet sein – ich zeige dir die optimale Antwort.
                </div>
                <div className="bg-[#004225] text-white p-4 text-sm font-light leading-relaxed max-w-[85%] ml-auto">
                  Super! Welche Fragen kommen noch? Und wie antworte ich am besten?
                </div>
                <div className="bg-[#FAFAF8] dark:bg-[#2A2A26] p-4 text-sm font-light leading-relaxed max-w-[85%] text-[#1A1A18] dark:text-[#FAFAF8]">
                  Starte den Interview-Coach – du erhältst 5 echte Fragen mit Musterantworten und deinem persönlichen Score.
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-[#FAFAF8] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 px-4 flex items-center text-xs text-[#9A9A94] dark:text-[#5C5C58]">
                  Schreibe Stella etwas...
                </div>
                <div className="w-10 h-10 bg-[#004225] flex items-center justify-center text-white">
                  <Send size={16} />
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 -z-10" />
          </motion.div>
        </section>
      )}

      {/* --- WHY STELLIFY SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white dark:bg-[#1A1A18] transition-colors" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-[10px] font-bold tracking-widest uppercase mb-4">
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
                className="p-8 bg-[#FAFAF8] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 hover:border-[#004225]/20 dark:hover:border-[#FAFAF8]/20 transition-all group"
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
            <div className="p-8 border border-[#004225]/10 dark:border-[#FAFAF8]/10 bg-[#004225]/5 dark:bg-[#FAFAF8]/5">
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
      <section className="px-6 lg:px-12 py-24 bg-[#FAFAF8] dark:bg-[#2A2A26] transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border border-[#004225]/10 dark:border-[#FAFAF8]/10 rounded-full text-[#004225] dark:text-[#FAFAF8] text-[10px] font-bold tracking-widest uppercase mb-4">
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
                    <div className="w-10 h-10 bg-white border border-black/5 flex items-center justify-center text-[#004225] shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">{item.title}</h4>
                      <p className="text-sm text-[#5C5C58] font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-[#004225]/5 border border-[#004225]/10 flex items-center justify-center p-12">
                <div className="w-full h-full border border-[#004225]/20 flex flex-col items-center justify-center space-y-6 bg-white shadow-2xl p-8">
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
            className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-[#FAFAF8] rounded-full blur-[140px]" 
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-[#FAFAF8] rounded-full blur-[160px]" 
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
                title: language === 'DE' ? 'Standard-Anschreiben' : 'Standard Cover Letter',
                before: language === 'DE' ? 'Ich interessiere mich für die Stelle als Projektleiter. Ich habe viel Erfahrung und bin motiviert.' : 'I am interested in the project manager position. I have a lot of experience and I am motivated.',
                after: language === 'DE' ? 'Mit meiner fundierten Expertise in der Leitung komplexer Infrastrukturprojekte im Raum Zürich bringe ich die nötige Präzision und das Schweizer Qualitätsbewusstsein mit, um Ihre ambitionierten Ziele bei der [Firma] nachhaltig zu unterstützen.' : 'With my deep expertise in leading complex infrastructure projects in the Zurich area, I bring the necessary precision and Swiss quality awareness to sustainably support your ambitious goals at [Company].',
                tag: 'Precision'
              },
              {
                title: language === 'DE' ? 'Lebenslauf-Highlight' : 'CV Highlight',
                before: language === 'DE' ? 'Verantwortlich für das Team und die Budgetplanung.' : 'Responsible for the team and budget planning.',
                after: language === 'DE' ? 'Strategische Führung eines interdisziplinären Teams von 12 Spezialisten; Optimierung der Budgeteffizienz um 15% durch Einführung eines Lean-Management-Prozesses nach Schweizer Standards.' : 'Strategic leadership of an interdisciplinary team of 12 specialists; optimization of budget efficiency by 15% through the introduction of a lean management process according to Swiss standards.',
                tag: 'Impact'
              }
            ].map((ex, i) => (
              <div key={i} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{ex.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225] bg-[#004225]/5 px-2 py-1">{ex.tag}</span>
                </div>
                <div className="grid gap-4">
                  <div className="p-6 bg-[#FAFAF8] border border-black/5 relative">
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
      <section id="success" className="px-6 lg:px-12 py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4">{t.success_title}</h2>
            <p className="text-[#5C5C58] font-light max-w-2xl mx-auto">{t.success_desc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                name: 'Lukas B.', 
                role: 'Polymechaniker EFZ', 
                city: 'Winterthur', 
                quote: language === 'DE' ? 'Nach meiner Lehre wusste ich nicht genau, wie ich meine praktischen Fähigkeiten im CV am besten verkaufe. Stellify hat mir geholfen, meine Projekte präzise zu beschreiben. Jetzt habe ich eine super Stelle bei einem grossen Industrieunternehmen.' : 
                       language === 'FR' ? 'Après mon apprentissage, je ne savais pas exactement comment mettre en avant mes compétences pratiques dans mon CV. Stellify m\'a aidé à décrire mes projets avec précision. J\'ai maintenant un super poste dans une grande entreprise industrielle.' :
                       language === 'IT' ? 'Dopo il mio apprendistato, non sapevo esattamente come vendere al meglio le mie abilità pratiche nel mio CV. Stellify mi ha aiutato a descrivere i miei progetti con precisione. Ora ho un ottimo posto in una grande azienda industriale.' :
                       'After my apprenticeship, I didn\'t know exactly how to best sell my practical skills in my CV. Stellify helped me describe my projects precisely. Now I have a great job at a large industrial company.', 
                img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200' 
              },
              { 
                name: 'Sarah W.', 
                role: 'HR-Fachfrau', 
                city: 'Zürich', 
                quote: language === 'DE' ? 'Ich sehe täglich hunderte Bewerbungen. Der Zeugnis-Decoder von Stellify ist erschreckend genau. Er hilft mir nicht nur privat, sondern gibt mir auch eine neue Perspektive auf die Nuancen im Schweizer Arbeitsmarkt.' : 
                       language === 'FR' ? 'Je vois des centaines de candidatures chaque jour. Le décodeur de certificats de Stellify est d\'une précision redoutable. Il m\'aide non seulement à titre privé, mais me donne aussi une nouvelle perspective sur les nuances du marché du travail suisse.' :
                       language === 'IT' ? 'Vedo centinaia di candidature ogni giorno. Il decodificatore di certificati di Stellify è incredibilmente preciso. Mi aiuta non solo privatamente, ma mi dà anche una nuova prospettiva sulle sfumature del mercato del lavoro svizzero.' :
                       'I see hundreds of applications every day. Stellify\'s certificate decoder is frighteningly accurate. It not only helps me privately but also gives me a new perspective on the nuances of the Swiss job market.', 
                img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200' 
              },
              { 
                name: 'Hans-Peter K.', 
                role: 'Logistikleiter', 
                city: 'Olten', 
                quote: language === 'DE' ? 'Mit über 50 nochmals neu anzufangen war eine Herausforderung. Stellify hat meine langjährige Erfahrung in moderne, ATS-optimierte Sprache übersetzt. Das hat mir Türen geöffnet, die ich schon für verschlossen hielt.' : 
                       language === 'FR' ? 'Recommencer à plus de 50 ans était un défi. Stellify a traduit ma longue expérience dans un langage moderne et optimisé pour les ATS. Cela m\'a ouvert des portes que je pensais déjà fermées.' :
                       language === 'IT' ? 'Ricominciare a più di 50 anni è stata una sfida. Stellify ha tradotto la mia lunga esperienza in un linguaggio moderno e ottimizzato per l\'ATS. Questo mi ha aperto porte che pensavo fossero già chiuse.' :
                       'Starting over at over 50 was a challenge. Stellify translated my many years of experience into modern, ATS-optimized language. This opened doors for me that I already thought were closed.', 
                img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' 
              }
            ].map((story, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white border border-black/5 shadow-xl rounded-2xl space-y-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Quote size={48} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar name={story.name} color={i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-rose-500' : 'bg-amber-500'} src={story.img} />
                    <div className="absolute -bottom-1 -right-1 bg-[#004225] text-white rounded-full p-0.5 border-2 border-white">
                      <CheckCircle2 size={10} />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A18]">{story.name}</h4>
                    <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest font-medium">{story.role}</p>
                    <p className="text-[9px] text-[#004225] font-bold uppercase tracking-widest">{story.city}</p>
                  </div>
                </div>
                <p className="text-sm text-[#5C5C58] font-light italic leading-relaxed relative z-10">"{story.quote}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className="text-[#004225]" fill="currentColor" />)}
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#004225]/40">Verifiziert</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TOOLS GRID --- */}
      <section id="features" className="px-6 lg:px-12 py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
                {t.tools_badge}
              </div>
              <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.tools_title}</h2>
            </div>
            <button className="hidden md:block text-sm font-medium text-[#004225] border-b border-[#004225] pb-1">{t.tools_view_all}</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <motion.div 
                key={tool.id}
                whileHover={{ y: -5 }}
                onClick={() => handleToolClick(tool.id)}
                className="p-6 md:p-8 bg-white border border-black/5 hover:border-[#004225]/20 transition-all group cursor-pointer shadow-sm"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-[#FAFAF8] dark:bg-[#2A2A26] flex items-center justify-center text-[#004225] dark:text-[#00A854] group-hover:bg-[#004225] group-hover:text-white transition-all relative z-0">
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
                  {isGeneratingApp && tool.id === 'cv-gen' ? 'Wird generiert...' : 'Öffnen'}
                  <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- MARKET POTENTIAL --- */}
      <section className="px-6 lg:px-12 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.market_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.market_title}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: t.market_1_t, desc: t.market_1_d, icon: '📈' },
              { title: t.market_2_t, desc: t.market_2_d, icon: '⏰' },
              { title: t.market_3_t, desc: t.market_3_d, icon: '🤖' },
              { title: t.market_4_t, desc: t.market_4_d, icon: '🇨🇭' }
            ].map((item, i) => (
              <div key={i} className="p-8 bg-[#FAFAF8] border border-black/5">
                <div className="text-3xl mb-6">{item.icon}</div>
                <h4 className="font-medium mb-3">{item.title}</h4>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/10 border border-[#004225]/20 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004225] animate-pulse" />
              Live Payment System
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-8">{t.pricing_title}</h2>
            
            {subscriptionError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-shake">
                {subscriptionError}
              </div>
            )}

            <div className="inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 text-xs font-medium rounded-full transition-all ${billingCycle === 'monthly' ? 'bg-white text-black' : 'text-white/60'}`}
              >
                {t.pricing_monthly}
              </button>
              <button 
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 text-xs font-medium rounded-full transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-[#004225] text-white' : 'text-white/60'}`}
              >
                {t.pricing_yearly} 🎁
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{t.pricing_save}</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* GRATIS */}
            <div className="p-10 bg-white/5 border border-white/10 flex flex-col">
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Gratis</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF 0</span>
                  <span className="text-white/70 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                <p className="text-xs text-white/70 mt-2 font-light">{t.pricing_gratis_desc}</p>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {t.pricing_free_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-light text-white/70">
                    <CheckCircle2 size={14} className="text-[#004225]" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 border border-white/20 hover:bg-white hover:text-black transition-all text-sm font-medium">{t.pricing_cta_free}</button>
            </div>

            {/* PRO */}
            <div className="p-10 bg-[#004225]/10 border-2 border-[#004225] relative flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">{t.pricing_recommended}</div>
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225]">Pro</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF {prices.pro}</span>
                  <span className="text-white/70 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                {billingCycle === 'yearly' && <p className="text-[10px] text-[#004225] mt-1 font-bold">CHF {prices.pro}/Mo. • {language === 'DE' ? 'spare 25%' : language === 'FR' ? 'économisez 25%' : language === 'IT' ? 'risparmia 25%' : 'save 25%'} • CHF 178.80/{language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year'}</p>}
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {t.pricing_pro_f.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-white">
                    <CheckCircle2 size={14} className="text-[#004225]" />
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
                {billingCycle === 'yearly' && <p className="text-[10px] text-white/70 mt-1 font-light">CHF {prices.ultimate}/Mo. • {language === 'DE' ? 'spare 20%' : language === 'FR' ? 'économisez 20%' : language === 'IT' ? 'risparmia 20%' : 'save 20%'} • CHF 478.80/{language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year'}</p>}
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
      <section id="how" className="px-6 lg:px-12 py-24 bg-white">
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
              <div key={i} className="relative p-8 bg-[#FAFAF8] border border-black/5 group hover:border-[#004225]/30 transition-all">
                <div className="text-5xl font-serif text-[#004225]/10 mb-6 group-hover:text-[#004225]/20 transition-all">{item.step}</div>
                <h3 className="text-xl font-medium mb-4">{item.title}</h3>
                <p className="text-sm text-[#5C5C58] font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.faq_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight text-[#1A1A18] dark:text-[#FAFAF8]">{t.faq_subtitle}</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group border-b border-black/5 pb-4">
                <summary className="flex justify-between items-center cursor-pointer list-none py-4">
                  <span className="text-lg font-medium group-open:text-[#004225] transition-colors">{faq.q}</span>
                  <span className="text-2xl font-light group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-[#5C5C58] font-light leading-relaxed pb-4">{faq.a}</p>
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
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-white text-[#004225] px-10 py-5 text-xl font-medium hover:bg-[#FAFAF8] transition-all inline-flex items-center gap-3 group"
          >
            {t.cta_final_btn}
            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

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
              <a href="#" className="text-2xl font-serif tracking-tight text-white">
                Stell<span className="text-[#00A854]">ify</span>
              </a>
              <p className="text-sm font-light leading-relaxed max-w-xs">
                {t.footer_desc}
              </p>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-white/5 flex items-center justify-center text-white/40 hover:text-[#004225] transition-colors cursor-pointer">
                  <Globe size={16} />
                </div>
                <div className="w-8 h-8 bg-white/5 flex items-center justify-center text-white/40 hover:text-[#004225] transition-colors cursor-pointer">
                  <Shield size={16} />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">{t.features}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><a href="#" className="hover:text-white transition-colors">CV Optimizer</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ATS Simulator</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Salary Check</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Interview Coach</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">Company</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><a href="#success" className="hover:text-white transition-colors">{t.success_stories}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t.pricing}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footer_contact}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-6">{t.footer_legal}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><a href="#" className="hover:text-white transition-colors">{t.footer_privacy}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footer_terms}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footer_imprint}</a></li>
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
                                      : 'hover:bg-[#FAFAF8] dark:hover:bg-white/5 border-transparent hover:border-black/5 dark:hover:border-white/5'
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

              <div className="p-4 bg-[#FAFAF8] dark:bg-[#2A2A26] border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                  {t.search_results.replace('{count}', searchResults.length.toString())}
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                    <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[8px]">ESC</span>
                    {language === 'DE' ? 'Schliessen' : 'Close'}
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${selectedSearchIndex >= 0 ? 'text-[#004225] dark:text-[#FAFAF8]' : 'text-[#9A9A94]'}`}>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] transition-colors ${selectedSearchIndex >= 0 ? 'bg-[#004225] text-white' : 'bg-black/5 dark:bg-white/10'}`}>ENTER</span>
                    {selectedSearchIndex >= 0 
                      ? (language === 'DE' ? 'Auswahl öffnen' : 'Open Selection')
                      : (language === 'DE' ? 'Stella-Beratung' : 'Stella Advice')
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
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FAFAF8] dark:bg-[#2A2A26]">
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

            <div className="bg-[#004225]/5 dark:bg-[#FAFAF8]/5 p-3 border-b border-[#004225]/10 dark:border-[#FAFAF8]/10 flex items-center gap-3">
              <Shield size={14} className="text-[#004225] dark:text-[#FAFAF8]" />
              <p className="text-[10px] text-[#004225] dark:text-[#FAFAF8] font-medium uppercase tracking-widest">
                {t.stella_secure_data}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAF8]/50 dark:bg-[#1A1A18]/50 transition-colors">
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
                  className="flex-1 bg-[#FAFAF8] dark:bg-[#2A2A26] border border-black/5 dark:border-white/5 px-4 py-2 text-sm font-light outline-none focus:border-[#004225]/30 dark:focus:border-[#FAFAF8]/30 transition-all text-[#1A1A18] dark:text-[#FAFAF8]"
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A18] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors"
            >
              <div className="p-4 md:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FAFAF8] dark:bg-[#2A2A26]">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 shrink-0 bg-[#004225] text-white flex items-center justify-center">
                    {activeTool.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] truncate leading-tight">{activeTool.title}</h3>
                    <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-widest font-bold opacity-80">{activeTool.badge}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTool(null); setParsedSalaryResult(null); }} className="p-2 shrink-0 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row relative">
                {/* Inputs */}
                <div className={`w-full lg:w-1/3 p-6 md:p-8 bg-[#FAFAF8] dark:bg-[#2A2A26] border-r border-black/5 dark:border-white/5 transition-colors relative`}>
                  {((activeTool.type === 'pro' && (!user?.role || user.role === 'client')) || 
                    (activeTool.type === 'ultimate' && (!user?.role || user.role === 'client' || user.role === 'pro'))) && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-md flex flex-col items-center justify-start pt-12 p-8 text-center">
                      <div className="w-12 h-12 bg-[#004225]/10 flex items-center justify-center text-[#004225] mb-4 rounded-full shrink-0">
                        <Lock size={24} />
                      </div>
                      <h3 className="text-lg font-serif mb-2">
                        {activeTool.type === 'ultimate' ? 'Ultimate-Tool' : 'Pro-Tool'}
                      </h3>
                      <p className="text-[10px] text-[#5C5C58] font-light max-w-xs mb-4 leading-relaxed">
                        {activeTool.type === 'ultimate' 
                          ? 'Dieses Tool ist Teil unseres Ultimate-Pakets. Erhalte vollen Zugriff auf alle Stellify-Funktionen.'
                          : 'Dieses Tool ist Teil unseres Pro-Pakets. Erhalte Zugriff auf alle 20+ Karriere-Tools.'}
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
                          Pläne ansehen
                        </button>
                        <button 
                          onClick={() => { setActiveTool(null); setParsedSalaryResult(null); }}
                          className="w-full py-3 border border-black/10 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all"
                        >
                          Vielleicht später
                        </button>
                      </div>
                    </div>
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-[#004225] dark:text-[#FAFAF8]">Eingaben</h4>
                  <div className="space-y-4">
                    {activeTool.inputs.map((input: any) => (
                      <div key={input.key}>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]">{input.label}</label>
                          {input.type === 'textarea' && (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[10px] font-bold text-[#004225] dark:text-[#FAFAF8] flex items-center gap-1 hover:underline"
                            >
                              <FileText size={10} />
                              Datei laden
                            </button>
                          )}
                        </div>
                        {input.type === 'textarea' ? (
                          <textarea 
                            className="w-full p-4 bg-white dark:bg-[#1A1A18] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#004225] dark:focus:border-[#FAFAF8] transition-all min-h-[120px] font-light text-[#1A1A18] dark:text-[#FAFAF8]"
                            placeholder={input.placeholder}
                            value={toolInput[input.key] || ''}
                            onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                          />
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
                      <div className="p-4 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 flex items-start gap-3">
                        <ShieldCheck size={16} className="text-[#004225] dark:text-[#FAFAF8] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed italic">
                          {t.salary_security_notice}
                        </p>
                      </div>
                    )}
                    {!cvContext && activeTool.id !== 'salary-calc' && activeTool.id !== 'zeugnis' && activeTool.id !== 'job-search' && (
                      <div className="p-4 bg-[#004225]/5 dark:bg-[#FAFAF8]/5 border border-[#004225]/20 dark:border-[#FAFAF8]/20 text-[10px] text-[#004225] dark:text-[#FAFAF8] leading-relaxed">
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
                                ? `${50 - (user.toolUses || 0)} ${language === 'DE' ? 'verbleibend' : 'remaining'}`
                                : `${1 - (user.toolUses || 0)} ${language === 'DE' ? 'verbleibend' : 'remaining'}`
                              }
                            </span>
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#FAFAF8] opacity-60">
                            {t.dashboard_reset_monthly}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 p-8 bg-white dark:bg-[#1A1A18] relative transition-colors overflow-y-auto custom-scrollbar">
                  {isProcessingTool ? (
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
                      <div className="flex-1 overflow-y-auto font-serif text-lg leading-relaxed whitespace-pre-wrap pr-4 custom-scrollbar markdown-body relative group">
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
                                <p className="text-[9px] text-[#004225]/70 font-light">Tiefgehende Prüfung nach Schweizer Standards</p>
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
                              <p className="text-xs font-bold uppercase tracking-widest text-[#9A9A94]">Geschätzter Medianlohn (Brutto/Jahr)</p>
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
                                <div key={i} className="p-4 bg-[#FAFAF8] border border-black/5 space-y-2">
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
                                <span className="text-[10px] font-bold uppercase tracking-widest">Wichtiger Hinweis</span>
                              </div>
                              <p className="text-[10px] font-light leading-relaxed text-[#004225]/80">
                                Diese Schätzung basiert auf aktuellen Markttrends und KI-Modellen für den Schweizer Arbeitsmarkt. 
                                Faktoren wie spezifische Zertifizierungen, Bonusvereinbarungen und individuelle Benefits können das tatsächliche Angebot beeinflussen.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Markdown>{toolResult}</Markdown>
                        )}
                        <div className="absolute bottom-4 right-4 text-[8px] text-[#9A9A94] font-bold uppercase tracking-widest opacity-40">
                          {t.ai_notice}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-start pt-6 pb-12 text-center space-y-6 max-w-md mx-auto">
                      <div className="w-16 h-16 bg-[#FAFAF8] dark:bg-[#2A2A26] flex items-center justify-center text-[#004225] dark:text-[#FAFAF8] rounded-full shrink-0">
                        <Lightbulb size={32} />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-lg font-serif">{language === 'DE' ? 'So nutzt du dieses Tool' : 'How to use this tool'}</h4>
                        <p className="text-xs text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed">
                          {activeTool.desc}
                        </p>
                        {t.tools_data[activeTool.id]?.tutorial && activeTool.desc.length > 140 && (
                          <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225] animate-pulse">
                            <ChevronDown size={12} />
                            <span>{language === 'DE' ? 'Runterscrollen für Profi-Beispiel' : 'Scroll down for professional example'}</span>
                          </div>
                        )}
                      </div>
                      
                      {t.tools_data[activeTool.id]?.tutorial && (
                        <div className="w-full p-6 bg-[#004225]/5 border border-[#004225]/10 space-y-3 text-left">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                            <Award size={14} />
                            <span>{language === 'DE' ? 'Profi-Beispiel' : 'Professional Example'}</span>
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
                            <span className="text-[10px] font-bold uppercase tracking-widest">Unlimited Zugang</span>
                          </div>
                          <p className="text-[10px] text-amber-800 leading-relaxed">
                            {language === 'DE' 
                              ? 'Schalte dieses Tool und alle Premium-Funktionen mit dem Unlimited-Plan frei.' 
                              : 'Unlock this tool and all premium features with the Unlimited plan.'}
                          </p>
                          <button 
                            onClick={() => {
                              setActiveTool(null);
                              const pricingSection = document.getElementById('pricing');
                              pricingSection?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="w-full py-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-amber-700 transition-all"
                          >
                            {language === 'DE' ? 'Jetzt Unlimited entdecken' : 'Discover Unlimited Now'}
                          </button>
                        </div>
                      )}

                      <div className="pt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                        <ArrowLeft size={12} />
                        <span>{language === 'DE' ? 'Fülle die Felder links aus' : 'Fill in the fields on the left'}</span>
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
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#FAFAF8] dark:bg-[#2A2A26]">
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
                    {selectedJob.description}
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
              <div className="p-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-4 bg-[#FAFAF8] dark:bg-[#2A2A26]">
                <button 
                  onClick={() => {
                    setIsJobModalOpen(false);
                    handleToolClick('ats-sim');
                    setToolInput({ ...toolInput, jobAd: `${selectedJob.title} bei ${selectedJob.company}\n\n${selectedJob.description}\n\n${selectedJob.requirements}` });
                  }}
                  className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-[#004225] dark:border-[#FAFAF8] text-[#004225] dark:text-[#FAFAF8] hover:bg-[#004225] dark:hover:bg-[#FAFAF8] hover:text-white dark:hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2"
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
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FAFAF8]">
                <h3 className="text-xl font-serif">Deine generierte Bewerbung</h3>
                <button onClick={() => setGeneratedApp(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                {generatedApp}
              </div>
              <div className="p-6 border-t border-black/5 flex justify-end gap-4 bg-[#FAFAF8]">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedApp);
                    showToast(language === 'DE' ? "In die Zwischenablage kopiert!" : "Copied to clipboard!");
                  }}
                  className="px-6 py-3 text-sm font-medium border border-black/10 hover:bg-black/5 transition-all"
                >
                  Kopieren
                </button>
                <button 
                  onClick={() => setGeneratedApp(null)}
                  className="px-6 py-3 text-sm font-medium bg-[#004225] text-white hover:bg-[#00331d] transition-all"
                >
                  Schliessen
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
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1A1A18] text-[#1A1A18] dark:text-[#FAFAF8] w-full max-w-md p-10 relative z-20 shadow-2xl"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#1A1A18] dark:text-[#FAFAF8]"
              >
                <X size={20} />
              </button>
              
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
                <div className="flex bg-[#FAFAF8] dark:bg-[#2A2A26] p-1 mb-8">
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
                          {passwordStrength <= 2 ? (language === 'DE' ? 'Schwach' : 'Weak') : 
                           passwordStrength <= 4 ? (language === 'DE' ? 'Mittel' : 'Medium') : 
                           (language === 'DE' ? 'Stark' : 'Strong')}
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
                    <p className={`text-xs text-center ${authError.includes('gesendet') || authError.includes('sent') ? 'text-green-500' : 'text-red-500'}`}>{authError}</p>
                    {(authError.includes('registriere dich bitte neu') || authError.includes('register a new account')) && authTab === 'login' && (
                      <div className="flex justify-center">
                        <button 
                          type="button"
                          onClick={() => { setAuthTab('register'); setAuthError(''); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                        >
                          {language === 'DE' ? '→ Jetzt neu registrieren' : '→ Register new account'}
                        </button>
                      </div>
                    )}
                    {(authError.includes('melde dich stattdessen an') || authError.includes('log in instead')) && authTab === 'register' && (
                      <div className="flex justify-center">
                        <button 
                          type="button"
                          onClick={() => { setAuthTab('login'); setAuthError(''); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                        >
                          {language === 'DE' ? '→ Zum Login wechseln' : '→ Switch to Login'}
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
                        <span className="bg-white dark:bg-[#1A1A18] px-2 text-[#9A9A94]">Oder</span>
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
                  </>
                )}

                {authTab === 'forgot' && (
                  <div className="flex justify-center mt-4">
                    <button 
                      type="button"
                      onClick={() => { setAuthTab('login'); setAuthError(''); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] hover:underline"
                    >
                      {language === 'DE' ? '← Zurück zum Login' : '← Back to Login'}
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-center text-[#9A9A94] mt-6 leading-relaxed">
                  Mit der Anmeldung akzeptierst du unsere <span className="underline cursor-pointer">AGB</span> und <span className="underline cursor-pointer">Datenschutzerklärung</span>. Deine Daten werden sicher in der Schweiz/EU verarbeitet.
                </p>

                <div className="mt-8 pt-4 border-t border-black/5 flex justify-center">
                  <button 
                    type="button"
                    onClick={async () => {
                      await auth.signOut();
                      window.localStorage.clear();
                      window.location.reload();
                    }}
                    className="text-[9px] uppercase tracking-widest text-[#9A9A94] hover:text-[#004225] transition-colors"
                  >
                    {language === 'DE' ? 'Sitzung zurücksetzen' : 'Reset Session'}
                  </button>
                </div>
              </form>
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
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FAFAF8]">
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
                            className="flex-1 bg-[#FAFAF8] border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#004225]/30"
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
                  <div className="p-4 bg-[#FAFAF8] border border-black/5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{user?.role === 'pro' ? 'Stellify Pro' : user?.role === 'unlimited' ? 'Stellify Unlimited' : 'Stellify Gratis'}</p>
                      <p className="text-[10px] text-[#6B6B66] dark:text-[#9A9A94] uppercase tracking-widest">{t.settings_status}</p>
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
                    <div className="p-6 bg-[#FAFAF8] border border-black/5 space-y-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
                        <Activity size={14} />
                        <span>{language === 'DE' ? 'Deine Nutzung' : 'Your Usage'}</span>
                      </div>
                      
                      <div className="space-y-6">
                        {user.role === 'pro' ? (
                          <>
                            {/* Monthly Usage */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">{language === 'DE' ? 'Bewerbungen & Tools' : 'Applications & Tools'}</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.toolUses || 0} / 50 {language === 'DE' ? 'Generierungen' : 'Generations'}</p>
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
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.dailyToolUses || 0} / 20 {language === 'DE' ? 'Aktionen heute' : 'Actions today'}</p>
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
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">{language === 'DE' ? 'Bewerbungen & Tools' : 'Applications & Tools'}</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.toolUses || 0} / 1 {language === 'DE' ? 'Gratis-Nutzung' : 'Free use'}</p>
                                </div>
                                <span className="text-xs font-serif text-[#004225]">{Math.min(100, Math.round(((user.toolUses || 0) / 1) * 100))}%</span>
                              </div>
                              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#004225] transition-all duration-700" 
                                  style={{ width: `${Math.min(100, Math.round(((user.toolUses || 0) / 1) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* Stella Chat */}
                            <div className="space-y-2 pt-4 border-t border-black/5">
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#1A1A18]">Stella Chat</p>
                                  <p className="text-[9px] text-[#9A9A94] uppercase tracking-widest">{user.freeGenerationsUsed || 0} / 3 {language === 'DE' ? 'Anfragen' : 'Requests'}</p>
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
                  <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">{t.settings_delete_account}</button>
                </section>
              </div>
              <div className="p-6 border-t border-black/5 bg-[#FAFAF8] flex justify-end">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-[#004225] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                >
                  {language === 'DE' ? 'Schliessen' : 'Close'}
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
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity">Schliessen</span>
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/60 transition-colors bg-black/20 backdrop-blur-sm">
                  <X size={24} />
                </div>
              </button>

              {/* Animated Promo Content */}
              <div className="max-w-5xl w-full px-6 relative z-10">
                <PromoSequence onComplete={() => setIsPromoOpen(false)} t={t} />
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
                  await updateDoc(doc(db, 'users', user.id), { hasSeenTutorial: true });
                } catch (e) {
                  console.error("Error updating tutorial status:", e);
                }
              }
            }} 
          />
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />
    </div>
  );
}
