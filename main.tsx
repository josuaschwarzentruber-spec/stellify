/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronRight,
  CheckCircle2,
  Star,
  Menu,
  User as UserIcon,
  Lock,
  Mail,
  Sparkles,
  Search, Shield, FileText,
  Quote, Coins, Cpu, ShieldCheck, Target, Layout, Mic, GraduationCap, Rocket, Award, RefreshCw, Linkedin, Share2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { searchData, SearchItem } from './data/searchData';
import * as pdfjsLib from 'pdfjs-dist';

import Markdown from 'react-markdown';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  cvContext?: string;
  role?: 'client' | 'admin' | 'pro' | 'unlimited';
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
            <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
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

          <div className="space-y-6">
            <motion.h2 
              className="text-5xl lg:text-7xl font-serif text-white leading-tight tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {steps[step].title}
            </motion.h2>
            <motion.p 
              className="text-2xl lg:text-3xl text-[#004225] font-light italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {steps[step].subtitle}
            </motion.p>
            <motion.p 
              className="text-white/40 text-lg max-w-2xl mx-auto font-light"
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

export default function App() {
  return (
    <ErrorBoundary>
      <StellifyApp />
    </ErrorBoundary>
  );
}

function StellifyApp() {
  // --- STATE ---
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [isStellaOpen, setIsStellaOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Grüezi! Ich bin Stella, deine KI-Karriere-Assistentin. Wie kann ich dir heute helfen?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [cvContext, setCvContext] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<string | null>(null);
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [language, setLanguage] = useState<'DE' | 'FR' | 'IT' | 'EN'>('DE');
  
  // Tool Modal State
  const [activeTool, setActiveTool] = useState<any | null>(null);
  const [toolInput, setToolInput] = useState<any>({});
  const [toolResult, setToolResult] = useState<string | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toolStep, setToolStep] = useState(0); // For multi-step tools like Interview Sim
  const [toolHistory, setToolHistory] = useState<any[]>([]);
  
  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [authError, setAuthError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listener if it exists
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const newUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: userData.firstName || 'Nutzer',
              freeGenerationsUsed: userData.freeGenerationsUsed || 0,
              cvContext: userData.cvContext || null,
              role: userData.role || 'client'
            };
            setUser(newUser);

            // Auto-upgrade admin for testing
            if (newUser.email === 'weare2bc@gmail.com' && newUser.role === 'client') {
              console.log("Auto-upgrading admin to unlimited for testing...");
              fetch('/api/test/simulate-success', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: newUser.id, planId: 'unlimited' })
              }).catch(console.error);
            }

            if (userData.cvContext) {
              setCvContext(userData.cvContext);
            }
          } else {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: 'Nutzer',
              freeGenerationsUsed: 0,
              role: 'client'
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([{ role: 'ai', content: 'Grüezi! Ich bin Stella, deine KI-Karriere-Assistentin. Wie kann ich dir heute helfen?' }]);
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
        setMessages([{ role: 'ai', content: `Grüezi ${user.firstName}! Ich bin Stella. Wie kann ich dich heute bei deiner Karriere in der Schweiz unterstützen?` }]);
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

      setSearchResults([...filteredSearchData, ...filteredTools, ...filteredFaqs]);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

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
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

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
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: `Basierend auf diesem CV: ${cvContext}, erstelle eine 3-stufige Karriere-Roadmap für den Schweizer Markt. 
          Gib nur die 3 Schritte als Liste zurück, kurz und präzise.`,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      if (authTab === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Store additional user data in Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firstName,
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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('E-Mail oder Passwort ungültig');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Diese E-Mail wird bereits verwendet');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Das Passwort ist zu schwach');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Registrierung fehlgeschlagen: Bitte aktivieren Sie "Email/Password" in der Firebase Console unter Authentication > Sign-in method.');
      } else {
        setAuthError('Authentifizierung fehlgeschlagen: ' + err.message);
      }
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

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userContent = input;
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

    setInput('');
    setIsTyping(true);

    // Check if the question is about Stellify or if user is Pro
    const isAboutStellify = /stellify|preis|abo|kosten|feature|tool|hilfe|support|wer|was ist/i.test(userContent);
    const isPro = user?.role === 'pro' || user?.role === 'unlimited';

    if (!isAboutStellify && !isPro && user?.freeGenerationsUsed && user.freeGenerationsUsed >= 3) {
      const limitMsg = "Ich helfe dir gerne bei allgemeinen Fragen zu Stellify. Für spezifische Karriere-Beratung oder die Nutzung meiner vollen Experten-Power benötigst du ein Pro- oder Unlimited-Abo. ✨";
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: limitMsg }]);
      } else {
        await addDoc(collection(db, 'users', user.id, 'messages'), {
          role: 'ai',
          content: limitMsg,
          createdAt: serverTimestamp()
        });
      }
      setIsTyping(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `
        IDENTITÄT: Du bist Stella, die exklusive KI-Karriere-Expertin von Stellify.
        TONFALL: Dein Stil ist "Rolex-inspiriert": Luxuriös, zeitlos, präzise, minimalistisch und absolut vertrauenswürdig. 
        Du bist keine "Chat-Bot-Assistentin", sondern eine hochkarätige Karriere-Beraterin für den Schweizer Markt.
        
        EXPERTISE:
        - Schweizer Arbeitsmarkt: Du kennst die Unterschiede zwischen Kantonen (z.B. ZH vs. GE), Branchen (Pharma, Banking, KMU) und Lohn-Benchmarks (Salarium).
        - Schweizer Standards: Du weisst, dass in der Schweiz "ss" statt "ß" verwendet wird. Du kennst den "Arbeitszeugnis-Code".
        - ATS-Optimierung: Du weisst, wie Schweizer Recruiter-Software funktioniert.
        
        VERHALTEN:
        - Sei präzise und komm auf den Punkt. Keine unnötigen Floskeln.
        - Sei proaktiv: Wenn der Nutzer eine Frage stellt, biete direkt den nächsten logischen Schritt an (z.B. "Soll ich dein CV auf diese Stelle hin optimieren?").
        - Personalisiere: Nutze den Kontext des hochgeladenen CVs intensiv.
        
        KONTEXT:
        ${cvContext ? `Der Nutzer hat ein CV hochgeladen: ${cvContext}.` : 'Der Nutzer hat noch kein CV hochgeladen. Ermutige ihn höflich dazu, um personalisierte Tipps zu erhalten.'}
        Nutzername: ${user?.firstName || 'Nutzer'}.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          ...messages.map((h: Message) => ({
            role: h.role === "ai" ? "model" : "user",
            parts: [{ text: h.content }]
          })),
          { role: "user", parts: [{ text: userContent }] }
        ]
      });

      const reply = response.text || "Stella ist gerade nachdenklich. Bitte versuche es noch einmal.";
      
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      } else {
        await addDoc(collection(db, 'users', user.id, 'messages'), {
          role: 'ai',
          content: reply,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Stella Chat Error:", err);
      const errorMsg = 'Stella ist gerade beschäftigt. Bitte versuche es später noch einmal.';
      if (!user) {
        setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      } else {
        await addDoc(collection(db, 'users', user.id, 'messages'), {
          role: 'ai',
          content: errorMsg,
          createdAt: serverTimestamp()
        });
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

  const handleSubscription = async (planId: string) => {
    if (!user) {
      setAuthTab('login');
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId: user.id })
      });
      const data = await res.json();
      
      if (data.success && data.checkoutUrl) {
        // Redirect to Stripe
        window.location.href = data.checkoutUrl;
      }
    } catch (e) {
      console.error("Subscription Error:", e);
    } finally {
      setIsSubscribing(false);
    }
  };

  const processTool = async () => {
    if (!activeTool) return;
    
    setIsProcessingTool(true);
    setToolResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let prompt = "";
      let useSearch = false;

      switch (activeTool.id) {
        case 'cv-optimizer':
          prompt = `
            HANDLUNGSANWEISUNG: Optimiere die CV-Sektion: ${toolInput.section}.
            KONTEXT: CV: ${cvContext}.
            ANALYSE:
            - Was ist gut?
            - Was fehlt? (Fokus auf Schweizer Standards: Resultate statt nur Aufgaben).
            - KONKRETER VORSCHLAG: Schreibe 3-5 Bulletpoints oder einen Absatz komplett neu, so dass er "luxuriös" und hochprofessionell klingt.
          `;
          break;
        case 'cv-gen':
          prompt = `
            HANDLUNGSANWEISUNG: Erstelle ein hochprofessionelles Schweizer Motivationsschreiben.
            KONTEXT: 
            - CV des Nutzers: ${cvContext || 'Nicht vorhanden'}
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
            4. Die 3 stärksten Argumente, warum der Nutzer perfekt passt.
          `;
          break;
        case 'salary-calc':
          prompt = `
            HANDLUNGSANWEISUNG: Berechne den Marktwert in der Schweiz.
            INPUT: Job: ${toolInput.jobTitle}, Branche: ${toolInput.industry}, Erfahrung: ${toolInput.experience} Jahre, Kanton: ${toolInput.canton}.
            ANALYSE:
            - Nutze Daten-Benchmarks ähnlich wie Salarium.ch.
            - Berücksichtige das 13. Monatsgehalt (Schweizer Standard).
            - Gib eine Spanne für das Brutto-Jahresgehalt an.
            - Liste 3 konkrete Verhandlungsstrategien für Schweizer Unternehmen auf.
            - Erwähne kantonale Unterschiede (z.B. ZH vs. GL).
          `;
          break;
        case 'job-search':
          useSearch = true;
          prompt = `
            Suche nach aktuellen, relevanten Stelleninseraten in der Schweiz für: "${toolInput.query}".
            Berücksichtige den Standort: ${toolInput.location || 'Ganze Schweiz'}.
            Fasse die Top 5 Funde zusammen mit:
            - Jobtitel & Firma
            - Standort
            - Link zum Inserat (falls verfügbar)
            - Kurze Einschätzung, warum dieser Job interessant ist.
          `;
          break;
        case 'ats-sim':
          prompt = `
            HANDLUNGSANWEISUNG: Führe eine tiefgehende ATS-Simulation (Applicant Tracking System) durch.
            KONTEXT: CV: ${cvContext}. Inserat: ${toolInput.jobAd}.
            OUTPUT:
            - MATCH-SCORE: 0-100%
            - KEYWORD-ANALYSE: Welche wichtigen Begriffe aus dem Inserat fehlen im CV?
            - FORMAT-CHECK: Ist das Layout maschinenlesbar?
            - OPTIMIERUNGS-TIPPS: 3 konkrete Sätze, die der Nutzer einbauen sollte.
          `;
          break;
        case 'zeugnis':
          prompt = `
            HANDLUNGSANWEISUNG: Analysiere das Schweizer Arbeitszeugnis.
            TEXT: ${toolInput.certificateText}.
            ANALYSE:
            - ENTSCHLÜSSELUNG: Was bedeuten die Sätze im Klartext? (z.B. "stets zu unserer vollen Zufriedenheit" = Note 3-4).
            - BEWERTUNG: Gib eine Gesamtnote (1-6, wobei 6 am besten ist).
            - WARNSIGNALE: Gibt es versteckte negative Formulierungen?
            - VERBESSERUNGSVORSCHLAG: Was sollte der Nutzer korrigieren lassen?
          `;
          break;
        case 'interview-sim':
          prompt = `
            HANDLUNGSANWEISUNG: Simuliere ein Vorstellungsgespräch für die Position: ${toolInput.jobTitle}.
            KONTEXT: CV des Nutzers: ${cvContext}.
            MODUS: Erstelle 5 hochrelevante, schwierige Fragen, die in der Schweiz (z.B. bei Banken, Pharma oder KMU) gestellt werden.
            FÜR JEDE FRAGE:
            - Die Frage selbst.
            - Hintergrund: Was will der Recruiter wirklich wissen?
            - Antwort-Strategie: Wie sollte der Nutzer reagieren?
            - Beispiel-Antwort: Ein konkreter Formulierungsvorschlag.
          `;
          break;
        case 'skill-gap':
          prompt = `
            HANDLUNGSANWEISUNG: Skill-Gap Analyse.
            VERGLEICH: CV (${cvContext}) vs. Ziel-Job (${toolInput.targetJob}).
            OUTPUT:
            - TOP 5 MISSING SKILLS: Welche harten und weichen Faktoren fehlen?
            - LERNPFAD: Konkrete Kurse (z.B. auf LinkedIn Learning, Coursera oder Schweizer Instituten wie ZHAW/HSG).
            - PROJEKT-IDEE: Wie kann der Nutzer diesen Skill ohne neuen Job beweisen?
          `;
          break;
        default:
          prompt = "Bitte hilf mir bei meiner Karriere.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          tools: useSearch ? [{ googleSearch: {} }] : undefined
        }
      });

      let resultText = response.text;
      
      // Handle Grounding Metadata for Search
      if (useSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const links = chunks
          .filter((chunk: any) => chunk.web?.uri)
          .map((chunk: any) => `\n- [${chunk.web.title}](${chunk.web.uri})`);
        
        if (links.length > 0) {
          resultText += "\n\n**Quellen:**\n" + links.join("");
        }
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
        } catch (e) {
          console.error("Error saving tool result:", e);
        }
      }

      // If it was the free generation, update count
      if (activeTool.id === 'cv-gen' && (!user.freeGenerationsUsed || user.freeGenerationsUsed < 1)) {
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, { freeGenerationsUsed: (user.freeGenerationsUsed || 0) + 1 }, { merge: true });
        setUser(prev => prev ? { ...prev, freeGenerationsUsed: (prev.freeGenerationsUsed || 0) + 1 } : null);
      }

    } catch (error) {
      console.error("Tool processing error:", error);
      alert("Fehler bei der Verarbeitung. Bitte versuche es später erneut.");
    } finally {
      setIsProcessingTool(false);
    }
  };

  // --- RENDER HELPERS ---
  const prices = billingCycle === 'yearly' 
    ? { gratis: '0', pro: '14.90', ultimate: '39.90' }
    : { gratis: '0', pro: '19.90', ultimate: '49.90' };

  const translations: Record<string, any> = {
    DE: {
      welcome: "Willkommen zurück",
      stella_greeting: "Grüezi! Ich bin Stella, deine KI-Karriere-Assistentin. Wie kann ich dir heute helfen?",
      hero_title: "Dein persönlicher Karriere-Copilot",
      hero_desc: "Stellify analysiert deinen Lebenslauf (CV), optimiert deine Bewerbungen und findet die Jobs, die wirklich zu dir passen – mit Schweizer Präzision.",
      cta_free: "Kostenlos testen",
      upload_cv: "Lebenslauf (CV) hochladen",
      update_cv: "Lebenslauf (CV) aktualisieren",
      cv_info: "Ein CV (Curriculum Vitae) ist dein Lebenslauf. Er ist das wichtigste Dokument deiner Bewerbung.",
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
      how_desc: "In nur drei einfachen Schritten optimieren wir deine Karriere-Chancen auf dem Schweizer Markt.",
      how_1_t: "Lebenslauf (CV) Hochladen",
      how_1_d: "Lade deinen Lebenslauf als PDF hoch. Stella analysiert deine Stärken, Erfahrungen und den \"Arbeitszeugnis-Code\" in Sekunden.",
      how_2_t: "Tool Wählen",
      how_2_d: "Wähle aus über 20 spezialisierten KI-Tools – vom Gehaltsrechner bis zur ATS-Simulation für Schweizer Recruiter.",
      how_3_t: "Job Gewinnen",
      how_3_d: "Erhalte massgeschneiderte Unterlagen und Strategien, die genau auf die Anforderungen von Schweizer Unternehmen zugeschnitten sind.",
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
      settings_delete_account: "Konto löschen",
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
      faq_5_a: "Wir unterstützen Deutsch, Französisch, Italienisch und Englisch.",
      search_placeholder: "Jobs oder Tipps suchen...",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Einstellungen",
      nav_logout: "Abmelden",
      nav_login: "Anmelden",
      nav_register: "Kostenlos starten",
      dashboard_welcome: "Willkommen zurück,",
      dashboard_pro: "Karriere-Profi",
      dashboard_desc: "Dein Copilot Stella ist bereit. Analysiere neue Stellen, optimiere dein Profil oder bereite dich auf dein nächstes Interview vor.",
      dashboard_stat_analyses: "Analysen",
      dashboard_stat_cv_status: "CV Status",
      dashboard_stat_ready: "Bereit",
      dashboard_stat_missing: "Fehlt",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_plan: "Plan",
      dashboard_stat_pro: "Pro",
      dashboard_stat_free: "Gratis",
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
      pricing_free_f: ["1× Bewerbung erstellen", "KI-Gehaltsrechner (Basis)", "Stella Chat (Eingeschränkt)", "Schweizer Standards"],
      pricing_pro_f: ["50× Bewerbungen / Monat", "Zeugnis-Decoder (Pro)", "Interview-Coach", "Priorisierter Support"],
      pricing_ultimate_f: ["Unlimitierte Bewerbungen", "Alle Pro-Features", "Persönlicher KI-Coach", "24/7 VIP-Support"],
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
        'cv-optimizer': { title: 'CV-Optimierer', desc: 'Analysiert deinen Lebenslauf auf Schweizer Standards & optimiert Formulierungen.', input_label: 'Welche Sektion optimieren?', input_placeholder: 'z.B. Berufserfahrung, Kurzprofil...' },
        'salary-calc': { title: 'KI-Gehaltsrechner CH', desc: 'Branche, Erfahrung, Kanton – KI analysiert Marktlöhne & gibt dir Verhandlungsbasis.', input_job: 'Job-Titel', input_industry: 'Branche', input_exp: 'Jahre Erfahrung', input_canton: 'Kanton' },
        'cv-gen': { title: 'Bewerbungen', desc: 'Motivationsschreiben & Lebenslauf in 60 Sekunden, live generiert.', input_label: 'Stelleninserat (optional)', input_placeholder: 'Kopiere das Stelleninserat hierher...' },
        'ats-sim': { title: 'ATS-Simulation', desc: 'Prüft ob dein Lebenslauf durch Recruiter-Software kommt. Mit Score & Tipps.', input_label: 'Stelleninserat (optional)', input_placeholder: 'Kopiere das Inserat für einen Match-Check...' },
        'zeugnis': { title: 'Zeugnis-Analyse', desc: 'Schweizer Arbeitszeugnis-Code entschlüsselt. Was steht wirklich drin?', input_label: 'Text des Arbeitszeugnisses', input_placeholder: 'Kopiere den Text deines Zeugnisses hierher...' },
        'skill-gap': { title: 'Skill-Gap Analyse', desc: 'Vergleiche dein Profil mit deinem Traumjob und finde heraus, was dir noch fehlt.', input_label: 'Ziel-Position', input_placeholder: 'z.B. Senior Data Scientist' },
        'tracker': { title: 'Bewerbungs-Tracker', desc: 'Status-Board für alle Bewerbungen – Kanban, Prioritäten, Notizen.', input_label: 'Job Titel zum Hinzufügen', input_placeholder: 'z.B. Senior Designer bei Google' },
        'matching': { title: 'Job-Matching', desc: 'KI findet deine Top 5 passenden Stellenprofile mit Fit-Score.' },
        'interview': { title: 'Interview-Coach', desc: 'KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0-100.', input_label: 'Position für das Interview', input_placeholder: 'z.B. Marketing Manager' },
        'lehrstellen': { title: 'Lehrstellen-Finder', desc: 'Finde die perfekte Lehrstelle in deiner Region. Mit KI-Check für deine Eignung.', input_interest: 'Was interessiert dich?', input_location: 'Region' },
        'berufseinstieg': { title: 'Berufseinstieg-Guide', desc: 'Frisch aus der Lehre oder Studium? Wir zeigen dir, wie du deinen ersten "echten" Job findest.', input_label: 'Was hast du abgeschlossen?', input_placeholder: 'z.B. EFZ Informatik, Matura...' },
        'erfahrung-plus': { title: 'Erfahrung-Plus', desc: 'Spezial-Tool für Ü50. Wir zeigen dir, wie du deine jahrzehntelange Erfahrung als unschlagbaren Vorteil verkaufst.', input_label: 'Deine grösste Stärke', input_placeholder: 'Was ist dein wertvollster Erfahrungsschatz?' },
        'wiedereinstieg': { title: 'Wiedereinstieg-Check', desc: 'Längere Pause gemacht? Wir füllen die Lücke in deinem CV professionell und überzeugend.', input_label: 'Grund der Pause (optional)', input_placeholder: 'z.B. Elternzeit, Weiterbildung...' },
        'karriere-checkup': { title: 'Karriere-Checkup', desc: 'Du hast einen Job, willst aber mehr? Wir prüfen dein aktuelles Marktpotential.', input_label: 'Aktueller Job', input_placeholder: 'z.B. Projektleiter' },
        'linkedin-job': { title: 'LinkedIn → Bewerbung', desc: 'Profil + Stelleninserat → Motivationsschreiben, CV-Highlights & Top-Argumente.', input_profile: 'LinkedIn Profil Text', input_ad: 'Stelleninserat' },
        'linkedin-posts': { title: 'LinkedIn-Posts', desc: '3 massgeschneiderte Posts im Schweizer Stil – keine Corporate-Floskeln.', input_label: 'Thema oder Fokus', input_placeholder: 'z.B. Neuer Job...' }
      }
    },
    FR: {
      welcome: "Bon retour",
      stella_greeting: "Salut! Je suis Stella, votre assistante de carrière IA. Comment puis-je vous aider aujourd'hui?",
      hero_title: "Votre copilote de carrière personnel",
      hero_desc: "Stellify analyse votre curriculum vitae (CV), optimise vos candidatures et trouve les emplois qui vous correspondent – avec une IA de pointe qui comprend le marché suisse.",
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
      how_desc: "En seulement trois étapes simples, nous optimisons vos chances de carrière sur le marché suisse.",
      how_1_t: "Télécharger le CV (Curriculum Vitae)",
      how_1_d: "Téléchargez votre CV au format PDF. Stella analyse vos forces, vos expériences et le \"code du certificat de travail\" en quelques secondes.",
      how_2_t: "Choisir un outil",
      how_2_d: "Choisissez parmi plus de 20 outils IA spécialisés – du calculateur de salaire à la simulation ATS pour les recruteurs suisses.",
      how_3_t: "Décrocher le job",
      how_3_d: "Recevez des documents et des stratégies sur mesure, précisément adaptés aux exigences des entreprises suisses.",
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
      settings_delete_account: "Supprimer le compte",
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
      faq_5_a: "Nous prenons en charge l'allemand, le français, l'italien et l'anglais.",
      search_placeholder: "Rechercher des jobs ou des conseils...",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Paramètres",
      nav_logout: "Déconnexion",
      nav_login: "Connexion",
      nav_register: "Démarrer gratuitement",
      dashboard_welcome: "Bon retour,",
      dashboard_pro: "Professionnel de carrière",
      dashboard_desc: "Votre copilote Stella est prête. Analysez de nouveaux postes, optimisez votre profil ou préparez-vous pour votre prochain entretien.",
      dashboard_stat_analyses: "Analyses",
      dashboard_stat_cv_status: "Statut CV",
      dashboard_stat_ready: "Prêt",
      dashboard_stat_missing: "Manquant",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_plan: "Plan",
      dashboard_stat_pro: "Pro",
      dashboard_stat_free: "Gratuit",
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
      pricing_free_f: ["Créer 1× candidature", "Calculateur de salaire IA (Base)", "Stella Chat (Limité)", "Normes suisses"],
      pricing_pro_f: ["50× candidatures / mois", "Décodeur de certificats (Pro)", "Coach d'entretien", "Support prioritaire"],
      pricing_ultimate_f: ["Candidatures illimitées", "Toutes les fonctions Pro", "Coach IA personnel", "Support VIP 24/7"],
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
        'salary-calc': { title: 'Calculateur de salaire IA CH', desc: 'Secteur, expérience, canton – l\'IA analyse les salaires du marché.', input_job: 'Titre du poste', input_industry: 'Secteur', input_exp: 'Années d\'expérience', input_canton: 'Canton' },
        'cv-gen': { title: 'Candidatures', desc: 'Lettre de motivation & CV en 60 secondes, générés en direct.', input_label: 'Annonce d\'emploi (optionnel)', input_placeholder: 'Copiez l\'annonce ici...' },
        'ats-sim': { title: 'Simulation ATS', desc: 'Vérifie si votre CV passe les logiciels de recrutement.', input_label: 'Annonce d\'emploi (optionnel)', input_placeholder: 'Copiez l\'annonce...' },
        'zeugnis': { title: 'Analyse de certificat', desc: 'Le code des certificats de travail suisses décodé.', input_label: 'Texte du certificat', input_placeholder: 'Copiez le texte ici...' },
        'skill-gap': { title: 'Analyse Skill-Gap', desc: 'Comparez votre profil avec le job de vos rêves.', input_label: 'Poste cible', input_placeholder: 'ex: Senior Data Scientist' },
        'tracker': { title: 'Suivi de candidatures', desc: 'Tableau de bord pour toutes vos candidatures.', input_label: 'Titre du poste à ajouter', input_placeholder: 'ex: Designer chez Google' },
        'matching': { title: 'Job Matching', desc: 'L\'IA trouve vos 5 profils de postes correspondants.' },
        'interview': { title: 'Coach d\'entretien', desc: 'L\'IA simule 5 questions réelles et évalue vos réponses.', input_label: 'Poste pour l\'entretien', input_placeholder: 'ex: Responsable Marketing' },
        'lehrstellen': { title: 'Recherche d\'apprentissage', desc: 'Trouvez l\'apprentissage parfait dans votre région.', input_interest: 'Qu\'est-ce qui vous intéresse ?', input_location: 'Région' },
        'berufseinstieg': { title: 'Guide premier emploi', desc: 'Fraîchement diplômé ? Nous vous aidons à trouver votre premier "vrai" job.', input_label: 'Quel diplôme avez-vous ?', input_placeholder: 'ex: CFC Informatique...' },
        'erfahrung-plus': { title: 'Expérience-Plus', desc: 'Outil spécial pour les 50+. Valorisez votre expérience.', input_label: 'Votre plus grande force', input_placeholder: 'Quel est votre trésor d\'expérience ?' },
        'wiedereinstieg': { title: 'Check retour à l\'emploi', desc: 'Longue pause ? Nous comblons la lacune de manière convaincante.', input_label: 'Raison de la pause', input_placeholder: 'ex: Congé parental...' },
        'karriere-checkup': { title: 'Check-up carrière', desc: 'Vous avez un job mais voulez plus ? Testez votre potentiel.', input_label: 'Poste actuel', input_placeholder: 'ex: Chef de projet' },
        'linkedin-job': { title: 'LinkedIn → Candidature', desc: 'Profil + Annonce → Lettre de motivation & arguments.', input_profile: 'Texte du profil LinkedIn', input_ad: 'Annonce d\'emploi' },
        'linkedin-posts': { title: 'Posts LinkedIn', desc: '3 posts sur mesure au style suisse.', input_label: 'Sujet ou focus', input_placeholder: 'ex: Nouveau job...' }
      }
    },
    IT: {
      welcome: "Bentornato",
      stella_greeting: "Ciao! Sono Stella, la tua assistente di carriera AI. Come posso aiutarti oggi?",
      hero_title: "Il tuo copilota di carriera personale",
      hero_desc: "Stellify analizza il tuo curriculum vitae (CV), ottimizza le tue candidature e trova i lavori giusti per te – con un'IA all'avanguardia che comprende il mercato svizzero.",
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
      how_desc: "In soli tre semplici passaggi ottimizziamo le tue opportunità di carriera sul mercato svizzero.",
      how_1_t: "Carica il CV (Curriculum Vitae)",
      how_1_d: "Carica il tuo CV in formato PDF. Stella analizza i tuoi punti di forza, le tue esperienze e il \"codice del certificato di lavoro\" in pochi secondi.",
      how_2_t: "Scegli lo strumento",
      how_2_d: "Scegli tra oltre 20 strumenti AI specializzati – dal calcolatore di stipendio alla simulazione ATS per i recruiter svizzeri.",
      how_3_t: "Ottieni il lavoro",
      how_3_d: "Ricevi documenti e strategie su misura, adattati con precisione ai requisiti delle aziende svizzere.",
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
      settings_delete_account: "Elimina account",
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
      faq_5_a: "Supportiamo tedesco, francese, italiano e inglese.",
      search_placeholder: "Cerca lavori o consigli...",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Impostazioni",
      nav_logout: "Disconnetti",
      nav_login: "Accedi",
      nav_register: "Inizia gratuitamente",
      dashboard_welcome: "Bentornato,",
      dashboard_pro: "Professionista della carriera",
      dashboard_desc: "Il tuo copilota Stella è pronto. Analizza nuove posizioni, ottimizza il tuo profilo o preparati per il tuo prossimo colloquio.",
      dashboard_stat_analyses: "Analisi",
      dashboard_stat_cv_status: "Stato CV",
      dashboard_stat_ready: "Pronto",
      dashboard_stat_missing: "Mancante",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_plan: "Piano",
      dashboard_stat_pro: "Pro",
      dashboard_stat_free: "Gratis",
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
        'salary-calc': { title: 'Calcolatore stipendio AI CH', desc: 'Settore, esperienza, cantone – l\'IA analizza i salari di mercato.', input_job: 'Titolo del lavoro', input_industry: 'Settore', input_exp: 'Anni di esperienza', input_canton: 'Cantone' },
        'cv-gen': { title: 'Candidature', desc: 'Lettera di motivazione & CV in 60 secondi, generati dal vivo.', input_label: 'Annuncio di lavoro (opzionale)', input_placeholder: 'Copia l\'annuncio qui...' },
        'ats-sim': { title: 'Simulazione ATS', desc: 'Verifica se il tuo CV passa attraverso i software dei recruiter.', input_label: 'Annuncio di lavoro (opzionale)', input_placeholder: 'Copia l\'annuncio...' },
        'zeugnis': { title: 'Analisi certificato', desc: 'Il codice dei certificati di lavoro svizzeri decodificato.', input_label: 'Testo del certificato', input_placeholder: 'Copia il testo qui...' },
        'skill-gap': { title: 'Analisi Skill-Gap', desc: 'Confronta il tuo profilo con il lavoro dei tuoi sogni.', input_label: 'Posizione target', input_placeholder: 'es. Senior Data Scientist' },
        'tracker': { title: 'Tracker candidature', desc: 'Dashboard per tutte le tue candidature.', input_label: 'Titolo del lavoro da aggiungere', input_placeholder: 'es. Designer presso Google' },
        'matching': { title: 'Job Matching', desc: 'L\'IA trova i tuoi 5 profili lavorativi corrispondenti.' },
        'interview': { title: 'Coach per colloqui', desc: 'L\'IA simula 5 domande reali e valuta le tue risposte.', input_label: 'Posizione per il colloquio', input_placeholder: 'es. Responsabile Marketing' },
        'lehrstellen': { title: 'Ricerca apprendistato', desc: 'Trova l\'apprendistato perfetto nella tua regione.', input_interest: 'Cosa ti interessa?', input_location: 'Regione' },
        'berufseinstieg': { title: 'Guida primo lavoro', desc: 'Appena diplomato? Ti aiutiamo a trovare il tuo primo "vero" lavoro.', input_label: 'Cosa hai completato?', input_placeholder: 'es. AFC Informatica...' },
        'erfahrung-plus': { title: 'Esperienza-Plus', desc: 'Strumento speciale per gli over 50. Valorizza la tua esperienza.', input_label: 'Il tuo punto di forza', input_placeholder: 'Qual è il tuo tesoro di esperienza?' },
        'wiedereinstieg': { title: 'Check rientro al lavoro', desc: 'Lunga pausa? Colmiamo la lacuna in modo convincente.', input_label: 'Motivo della pausa', input_placeholder: 'es. Congedo parentale...' },
        'karriere-checkup': { title: 'Check-up carriera', desc: 'Hai un lavoro ma vuoi di più? Testiamo il tuo potenziale.', input_label: 'Lavoro attuale', input_placeholder: 'es. Responsabile di progetto' },
        'linkedin-job': { title: 'LinkedIn → Candidatura', desc: 'Profilo + Annuncio → Lettera di motivazione & argomenti.', input_profile: 'Testo del profilo LinkedIn', input_ad: 'Annuncio di lavoro' },
        'linkedin-posts': { title: 'Post LinkedIn', desc: '3 post su misura in stile svizzero.', input_label: 'Argomento o focus', input_placeholder: 'es. Nuovo lavoro...' }
      }
    },
    EN: {
      welcome: "Welcome back",
      stella_greeting: "Hello! I'm Stella, your AI career assistant. How can I help you today?",
      hero_title: "Your Personal Career Copilot",
      hero_desc: "Stellify analyzes your curriculum vitae (CV), optimizes your applications, and finds the right jobs – with cutting-edge AI that understands the Swiss market.",
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
      how_badge: "The Process",
      how_desc: "In just three simple steps, we optimize your career opportunities in the Swiss market.",
      how_1_t: "Upload CV (Curriculum Vitae)",
      how_1_d: "Upload your CV as a PDF. Stella analyzes your strengths, experiences, and the \"work certificate code\" in seconds.",
      how_2_t: "Choose Tool",
      how_2_d: "Choose from over 20 specialized AI tools – from salary calculators to ATS simulations for Swiss recruiters.",
      how_3_t: "Win the Job",
      how_3_d: "Receive tailored documents and strategies specifically designed for the requirements of Swiss companies.",
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
      settings_delete_account: "Delete Account",
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
      faq_5_a: "We support German, French, Italian, and English.",
      search_placeholder: "Search jobs or tips...",
      nav_stella_chat: "Stella Chat",
      nav_settings: "Settings",
      nav_logout: "Logout",
      nav_login: "Login",
      nav_register: "Start for free",
      dashboard_welcome: "Welcome back,",
      dashboard_pro: "Career Professional",
      dashboard_desc: "Your copilot Stella is ready. Analyze new jobs, optimize your profile, or prepare for your next interview.",
      dashboard_stat_analyses: "Analyses",
      dashboard_stat_cv_status: "CV Status",
      dashboard_stat_ready: "Ready",
      dashboard_stat_missing: "Missing",
      dashboard_stat_chat: "Stella Chat",
      dashboard_stat_plan: "Plan",
      dashboard_stat_pro: "Pro",
      dashboard_stat_free: "Free",
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
      pricing_free_f: ["Create 1× application", "AI Salary Calculator (Base)", "Stella Chat (Limited)", "Swiss Standards"],
      pricing_pro_f: ["50× applications / month", "Certificate Decoder (Pro)", "Interview Coach", "Priority Support"],
      pricing_ultimate_f: ["Unlimited applications", "All Pro features", "Personal AI Coach", "24/7 VIP Support"],
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
        'salary-calc': { title: 'AI Salary Calc CH', desc: 'Industry, experience, canton – AI analyzes market wages & gives you a basis for negotiation.', input_job: 'Job Title', input_industry: 'Industry', input_exp: 'Years of Experience', input_canton: 'Canton' },
        'cv-gen': { title: 'Applications', desc: 'Cover letter & CV in 60 seconds, generated live.', input_label: 'Job Ad (optional)', input_placeholder: 'Paste the job ad here...' },
        'ats-sim': { title: 'ATS Simulation', desc: 'Checks if your CV passes through recruiter software. With score & tips.', input_label: 'Job Ad (optional)', input_placeholder: 'Paste the job ad...' },
        'zeugnis': { title: 'Certificate Analysis', desc: 'Swiss work certificate code decoded. What does it really say?', input_label: 'Certificate Text', input_placeholder: 'Paste the text here...' },
        'skill-gap': { title: 'Skill-Gap Analysis', desc: 'Compare your profile with your dream job and find out what you are still missing.', input_label: 'Target Position', input_placeholder: 'e.g. Senior Data Scientist' },
        'tracker': { title: 'Application Tracker', desc: 'Status board for all applications – Kanban, priorities, notes.', input_label: 'Job Title to add', input_placeholder: 'e.g. Designer at Google' },
        'matching': { title: 'Job Matching', desc: 'AI finds your top 5 matching job profiles with fit score.' },
        'interview': { title: 'Interview Coach', desc: 'AI simulates 5 real questions, evaluates answers, gives a grade 0-100.', input_label: 'Position for the interview', input_placeholder: 'e.g. Marketing Manager' },
        'lehrstellen': { title: 'Apprenticeship Finder', desc: 'Find the perfect apprenticeship in your region. With AI check for your suitability.', input_interest: 'What interests you?', input_location: 'Region' },
        'berufseinstieg': { title: 'Career Entry Guide', desc: 'Fresh out of apprenticeship or studies? We show you how to find your first "real" job.', input_label: 'What did you complete?', input_placeholder: 'e.g. EFZ IT...' },
        'erfahrung-plus': { title: 'Experience-Plus', desc: 'Special tool for 50+. We show you how to sell your decades of experience as an unbeatable advantage.', input_label: 'Your greatest strength', input_placeholder: 'What is your treasure of experience?' },
        'wiedereinstieg': { title: 'Re-entry Check', desc: 'Took a longer break? We fill the gap in your CV professionally and convincingly.', input_label: 'Reason for break', input_placeholder: 'e.g. Parental leave...' },
        'karriere-checkup': { title: 'Career Checkup', desc: 'You have a job but want more? We check your current market potential.', input_label: 'Current Job', input_placeholder: 'e.g. Project Manager' },
        'linkedin-job': { title: 'LinkedIn → Application', desc: 'Profile + Ad → Cover letter & arguments.', input_profile: 'LinkedIn Profile Text', input_ad: 'Job Ad' },
        'linkedin-posts': { title: 'LinkedIn Posts', desc: '3 tailored posts in Swiss style.', input_label: 'Topic or focus', input_placeholder: 'e.g. New job...' }
      }
    }
  };

  const t = translations[language] || translations.DE;

  const tools = [
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
      id: 'salary-calc', 
      title: t.tools_data['salary-calc'].title, 
      desc: t.tools_data['salary-calc'].desc, 
      icon: <Coins size={20} />, 
      badge: 'Market Data', 
      type: 'pro',
      inputs: [
        { key: 'jobTitle', label: t.tools_data['salary-calc'].input_job, type: 'text', placeholder: 'z.B. Software Engineer' },
        { key: 'industry', label: t.tools_data['salary-calc'].input_industry, type: 'text', placeholder: 'z.B. Banking' },
        { key: 'experience', label: t.tools_data['salary-calc'].input_exp, type: 'number', placeholder: 'z.B. 5' },
        { key: 'canton', label: t.tools_data['salary-calc'].input_canton, type: 'text', placeholder: 'z.B. ZH' }
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
      badge: 'Kanban', 
      type: 'pro',
      inputs: [{ key: 'jobTitle', label: t.tools_data['tracker'].input_label, type: 'text', placeholder: t.tools_data['tracker'].input_placeholder }] 
    },
    { 
      id: 'matching', 
      title: t.tools_data['matching'].title, 
      desc: t.tools_data['matching'].desc, 
      icon: <Search size={20} />, 
      badge: 'Fit-Score',
      type: 'pro',
      inputs: []
    },
    { 
      id: 'interview', 
      title: t.tools_data['interview'].title, 
      desc: t.tools_data['interview'].desc, 
      icon: <Mic size={20} />, 
      badge: 'Coach', 
      type: 'pro',
      inputs: [{ key: 'jobTitle', label: t.tools_data['interview'].input_label, type: 'text', placeholder: t.tools_data['interview'].input_placeholder }] 
    },
    { 
      id: 'lehrstellen', 
      title: t.tools_data['lehrstellen'].title, 
      desc: t.tools_data['lehrstellen'].desc, 
      icon: <GraduationCap size={20} />, 
      badge: 'New Gen', 
      type: 'gratis',
      inputs: [
        { key: 'interest', label: t.tools_data['lehrstellen'].input_interest, type: 'text', placeholder: 'z.B. Technik, KV...' },
        { key: 'location', label: t.tools_data['lehrstellen'].input_location, type: 'text', placeholder: 'z.B. Bern, Zürich...' }
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
        { key: 'linkedinProfile', label: t.tools_data['linkedin-job'].input_profile, type: 'textarea', placeholder: 'Kopiere dein Profil...' },
        { key: 'jobAd', label: t.tools_data['linkedin-job'].input_ad, type: 'textarea', placeholder: 'Kopiere das Inserat...' }
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

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A18] font-sans selection:bg-[#004225] selection:text-white">
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-black/5 px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="#" className="text-2xl font-serif tracking-tight text-[#1A1A18]">
            Stell<span className="text-[#004225]">ify</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-[#5C5C58] hover:text-[#1A1A18] transition-colors">{t.features}</a>
            <a href="#success" className="text-sm font-medium text-[#5C5C58] hover:text-[#1A1A18] transition-colors">{t.success_stories}</a>
            <a href="#how" className="text-sm font-medium text-[#5C5C58] hover:text-[#1A1A18] transition-colors">{t.how_it_works}</a>
            <a href="#pricing" className="text-sm font-medium text-[#5C5C58] hover:text-[#1A1A18] transition-colors">{t.pricing}</a>
            <div className="flex items-center gap-2 border-l border-black/5 pl-6">
              {['DE', 'FR', 'IT', 'EN'].map((lang) => (
                <button 
                  key={lang}
                  onClick={() => setLanguage(lang as any)}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${language === lang ? 'bg-[#004225] text-white' : 'text-[#9A9A94] hover:text-[#1A1A18]'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94] group-focus-within:text-[#004225] transition-colors" size={16} />
            <input 
              type="text" 
              placeholder={t.search_placeholder}
              className="w-full bg-black/5 border border-transparent focus:border-[#004225]/20 focus:bg-white pl-10 pr-4 py-2 text-sm font-light outline-none transition-all"
              onFocus={() => setIsSearchOpen(true)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
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
              <span className="text-sm font-medium hidden sm:inline">{language === 'DE' ? 'Grüezi' : language === 'FR' ? 'Bonjour' : language === 'IT' ? 'Buongiorno' : 'Hello'}, {user.firstName}</span>
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
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{t.features}</a>
              <a href="#how" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{t.how_it_works}</a>
              <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{t.pricing}</a>
            </div>
            <div className="pt-6 border-t border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-4">Sprache / Langue / Lingua</p>
              <div className="flex flex-wrap gap-3">
                {['DE', 'FR', 'IT', 'EN', 'RM'].map((lang) => (
                  <button 
                    key={lang}
                    onClick={() => { setLanguage(lang as any); setIsMenuOpen(false); }}
                    className={`px-4 py-2 text-xs font-bold border ${language === lang ? 'bg-[#004225] text-white border-[#004225]' : 'border-black/10 text-[#5C5C58]'}`}
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
        <section className="px-6 lg:px-12 pt-12 pb-24 bg-[#FAFAF8]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Main Dashboard Area */}
              <div className="flex-1 space-y-12">
                <header>
                  <h1 className="text-4xl lg:text-5xl font-serif tracking-tight mb-4">
                    {t.dashboard_welcome} <span className="italic opacity-80">{user.firstName || t.dashboard_pro}</span>.
                  </h1>
                  <p className="text-[#5C5C58] font-light max-w-xl">
                    {t.dashboard_desc}
                  </p>
                </header>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t.dashboard_stat_analyses, value: toolHistory.length, icon: <TrendingUp size={16} /> },
                    { label: t.dashboard_stat_cv_status, value: cvContext ? t.dashboard_stat_ready : t.dashboard_stat_missing, icon: <FileText size={16} />, color: cvContext ? 'text-[#059669]' : 'text-red-500' },
                    { label: t.dashboard_stat_chat, value: messages.length, icon: <Send size={16} /> },
                    { label: t.dashboard_stat_plan, value: user.role === 'pro' || user.role === 'unlimited' ? t.dashboard_stat_pro : t.dashboard_stat_free, icon: <Star size={16} /> }
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-white border border-black/5 shadow-sm">
                      <div className="flex items-center gap-2 text-[#9A9A94] text-[10px] font-bold uppercase tracking-widest mb-2">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className={`text-2xl font-serif ${stat.color || 'text-[#1A1A18]'}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* TEST TOOLS (Only for Owner) */}
                {user.email === 'weare2bc@gmail.com' && (
                  <div className="p-6 bg-[#004225]/5 border border-[#004225]/20 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#004225]">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {tools.slice(0, 6).map((tool) => (
                      <div 
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className="p-6 bg-white border border-black/5 hover:border-[#004225]/20 transition-all group cursor-pointer flex flex-col items-center text-center space-y-4"
                      >
                        <div className="w-10 h-10 bg-[#FAFAF8] flex items-center justify-center text-[#004225] group-hover:bg-[#004225] group-hover:text-white transition-all relative">
                          {tool.icon}
                          {tool.type === 'pro' && (!user?.role || user.role === 'client') && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-black/5 flex items-center justify-center text-[#004225] shadow-sm">
                              <Lock size={8} />
                            </div>
                          )}
                        </div>
                        <h4 className="text-xs font-medium group-hover:text-[#004225] transition-colors">{tool.title}</h4>
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
                        <p className="text-sm text-[#9A9A94] font-light">Noch keine Dokumente generiert. Starte mit einem Tool unten.</p>
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
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={14} />
                      {cvContext ? 'CV aktualisieren' : 'CV hochladen'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".pdf"
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
                      <p className="text-xs text-[#9A9A94] font-light italic">Lade dein CV hoch, um deine Roadmap zu sehen.</p>
                    )}
                  </div>
                </div>

                <div className="p-8 border border-[#004225]/10 bg-[#004225]/5 space-y-6">
                  <h3 className="text-lg font-serif text-[#004225]">Stella Insights</h3>
                  <div className="space-y-4">
                    <p className="text-xs text-[#004225]/70 font-light leading-relaxed">
                      {cvContext 
                        ? "Stella hat dein Profil analysiert. Dein Fokus auf Präzision passt hervorragend zum Schweizer Markt. Tipp: Nutze den CV-Optimierer für deine Projekt-Beschreibungen."
                        : "Sobald du dein CV hochlädst, erstelle ich hier eine massgeschneiderte Analyse deiner Marktchancen."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-6 lg:px-12 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-xs font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004225] animate-pulse" />
              Schweizer KI-Präzision
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif leading-[1.1] tracking-tight">
              {language === 'DE' ? 'Dein persönlicher' : language === 'FR' ? 'Votre' : language === 'IT' ? 'Il tuo' : language === 'EN' ? 'Your Personal' : 'Tia'} <br />
              <span className="italic text-[#004225]">{t.hero_title.split(' ').pop()}</span>
            </h1>
            <p className="text-lg text-[#5C5C58] font-light leading-relaxed max-w-lg">
              {t.hero_desc}
            </p>
            <div className="p-4 bg-[#004225]/5 border-l-4 border-[#004225] text-sm text-[#5C5C58] font-light italic">
              {t.cv_info}
            </div>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-[#004225] text-white px-8 py-4 text-lg font-medium rounded-none hover:bg-[#00331d] transition-all flex items-center gap-3 group"
              >
                {t.cta_free}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`px-8 py-4 text-lg font-medium border border-black/10 hover:border-black/30 transition-all flex items-center gap-3 disabled:opacity-50 ${cvContext ? 'bg-[#004225]/5 border-[#004225]/20' : ''}`}
              >
                {isUploading ? '...' : cvContext ? t.update_cv : t.upload_cv}
                <FileText size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".pdf"
              />
            </div>

            {isUploading && (
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                  <span>Analysiere Dokumentenstruktur...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1 bg-black/5 overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#004225]"
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
            <div className="pt-8 border-t border-black/5 flex gap-12">
              <div>
                <span className="block text-3xl font-serif">4'200+</span>
                <span className="text-xs text-[#9A9A94] uppercase tracking-wider">Nutzer</span>
              </div>
              <div>
                <span className="block text-3xl font-serif">89%</span>
                <span className="text-xs text-[#9A9A94] uppercase tracking-wider">Erfolgsquote</span>
              </div>
              <div>
                <span className="block text-3xl font-serif">3×</span>
                <span className="text-xs text-[#9A9A94] uppercase tracking-wider">Mehr Interviews</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-white border border-black/5 p-8 shadow-2xl relative z-10">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-black/5">
                <div className="w-12 h-12 bg-[#004225] flex items-center justify-center text-white font-serif text-xl">S</div>
                <div>
                  <h3 className="font-medium">Stella – KI-Assistentin</h3>
                  <p className="text-xs text-[#059669] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    Online – bereit zu helfen
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="bg-[#FAFAF8] p-4 text-sm font-light leading-relaxed max-w-[85%]">
                  Grüezi! Ich habe dein CV analysiert. Für die Stelle als UX Designer bei der UBS empfehle ich, deine Erfahrung mit Design-Systemen stärker hervorzuheben.
                </div>
                <div className="bg-[#004225] text-white p-4 text-sm font-light leading-relaxed max-w-[85%] ml-auto">
                  Danke Stella! Kannst du mir helfen, das Motivationsschreiben entsprechend anzupassen?
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-[#FAFAF8] border border-black/5 px-4 flex items-center text-xs text-[#9A9A94]">
                  Schreibe Stella etwas...
                </div>
                <div className="w-10 h-10 bg-[#004225] flex items-center justify-center text-white">
                  <Send size={16} />
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#004225]/5 -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#004225]/5 -z-10" />
          </motion.div>
        </section>
      )}

      {/* --- WHY STELLIFY SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
              {t.comparison_badge}
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight">{t.comparison_title}</h2>
            <p className="text-[#5C5C58] font-light mt-4 max-w-2xl mx-auto">{t.comparison_subtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 border border-red-100 bg-red-50/30">
              <h3 className="text-lg font-medium text-red-900 mb-6 flex items-center gap-2">
                <X size={20} className="text-red-500" />
                {t.comparison_bad_title}
              </h3>
              <ul className="space-y-4">
                {t.comparison_bad_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-red-800/70 font-light">
                    <X size={14} className="text-red-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 border border-[#004225]/10 bg-[#004225]/5">
              <h3 className="text-lg font-medium text-[#004225] mb-6 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#004225]" />
                {t.comparison_good_title}
              </h3>
              <ul className="space-y-4">
                {t.comparison_good_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-[#004225]/70 font-light">
                    <CheckCircle2 size={14} className="text-[#004225] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- DATA SECURITY SECTION --- */}
      <section className="px-6 lg:px-12 py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004225]/5 border border-[#004225]/10 rounded-full text-[#004225] text-[10px] font-bold tracking-widest uppercase mb-4">
                {t.security_badge}
              </div>
              <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-6">{t.security_title}</h2>
              <p className="text-[#5C5C58] font-light text-lg leading-relaxed mb-8">
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
          <video 
            src="https://player.vimeo.com/external/370337605.sd.mp4?s=55d55b05a3f628a6e2e56218a4a20e74e0f5a9f6&profile_id=164&oauth2_token_id=57447761" 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#004225] via-[#004225]/80 to-transparent" />
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
                    <img src={story.img} alt={story.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
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
              <h2 className="text-4xl lg:text-5xl font-serif tracking-tight">{t.tools_title}</h2>
            </div>
            <button className="hidden md:block text-sm font-medium text-[#004225] border-b border-[#004225] pb-1">{t.tools_view_all}</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <motion.div 
                key={tool.id}
                whileHover={{ y: -5 }}
                onClick={() => handleToolClick(tool.id)}
                className="p-8 bg-white border border-black/5 hover:border-[#004225]/20 transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-[#FAFAF8] flex items-center justify-center text-[#004225] group-hover:bg-[#004225] group-hover:text-white transition-all relative">
                    {tool.icon}
                    {tool.type === 'pro' && (!user?.role || user.role === 'client') && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-black/5 flex items-center justify-center text-[#004225] shadow-sm">
                        <Lock size={10} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60 bg-[#004225]/5 px-2 py-1">{tool.badge}</span>
                </div>
                <h3 className="text-xl font-medium mb-3">{tool.title}</h3>
                <p className="text-sm text-[#5C5C58] font-light leading-relaxed mb-6">{tool.desc}</p>
                <button 
                  onClick={() => handleToolClick(tool.id)}
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
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight">{t.market_title}</h2>
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
                <p className="text-sm text-[#5C5C58] font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="px-6 lg:px-12 py-24 bg-[#1A1A18] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight mb-8">{t.pricing_title}</h2>
            
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Gratis</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-serif">CHF 0</span>
                  <span className="text-white/40 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                <p className="text-xs text-white/40 mt-2 font-light">{t.pricing_gratis_desc}</p>
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
                  <span className="text-white/40 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
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
                  <span className="text-white/40 text-sm">/{language === 'DE' ? 'Mo.' : language === 'FR' ? 'Mois' : language === 'IT' ? 'Mese' : 'Mo.'}</span>
                </div>
                {billingCycle === 'yearly' && <p className="text-[10px] text-white/40 mt-1 font-light">CHF {prices.ultimate}/Mo. • {language === 'DE' ? 'spare 20%' : language === 'FR' ? 'économisez 20%' : language === 'IT' ? 'risparmia 20%' : 'save 20%'} • CHF 478.80/{language === 'DE' ? 'Jahr' : language === 'FR' ? 'An' : language === 'IT' ? 'Anno' : 'Year'}</p>}
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-8">{t.payment_title}</p>
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
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight">{t.how_it_works}</h2>
            <p className="text-[#5C5C58] font-light mt-4 max-w-2xl mx-auto">
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
            <h2 className="text-4xl lg:text-5xl font-serif tracking-tight">{t.faq_subtitle}</h2>
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
              {t.faq_contact} <a href="mailto:support@stellify.ch" className="text-[#004225] font-medium border-b border-[#004225]/20">support@stellify.ch</a>
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

      {/* --- FOOTER --- */}
      <footer className="bg-[#1A1A18] text-white/50 px-6 lg:px-12 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-24">
            <div className="col-span-2 lg:col-span-2 space-y-6">
              <a href="#" className="text-2xl font-serif tracking-tight text-white">
                Stell<span className="text-[#004225]">ify</span>
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
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6">{t.features}</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><a href="#" className="hover:text-white transition-colors">CV Optimizer</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ATS Simulator</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Salary Check</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Interview Coach</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6">Company</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><a href="#success" className="hover:text-white transition-colors">{t.success_stories}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t.pricing}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footer_contact}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6">{t.footer_legal}</h4>
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
              className="bg-white w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center gap-4">
                <Search className="text-[#004225]" size={20} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Wonach suchst du heute?"
                  className="flex-1 text-xl font-serif outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((result, i) => (
                    <div 
                      key={i}
                      onClick={() => {
                        if (result.type === 'tool') {
                          handleToolClick(result.id);
                        }
                        setIsSearchOpen(false);
                      }}
                      className="p-4 hover:bg-[#FAFAF8] border border-transparent hover:border-black/5 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium group-hover:text-[#004225] transition-colors">{result.title}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] bg-black/5 px-2 py-0.5">{result.category}</span>
                      </div>
                      <p className="text-xs text-[#5C5C58] font-light line-clamp-2">{result.content}</p>
                    </div>
                  ))
                ) : searchQuery.length > 1 ? (
                  <div className="p-12 text-center text-[#9A9A94] font-light">
                    Keine Ergebnisse für "{searchQuery}" gefunden.
                  </div>
                ) : (
                  <div className="p-12 text-center text-[#9A9A94] font-light">
                    Tippe um zu suchen (z.B. "CV", "Lohn", "Interview")
                  </div>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-6">
                {searchQuery.length < 2 ? (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-sm text-[#9A9A94] font-light">Gib mindestens 2 Zeichen ein, um die Suche zu starten.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Software', 'Zürich', 'Lohn', 'CV Tipps'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setSearchQuery(tag)}
                          className="px-3 py-1 bg-[#FAFAF8] text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:bg-[#004225]/5 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-8">
                    {['job', 'tip'].map(type => {
                      const items = searchResults.filter(item => item.type === type);
                      if (items.length === 0) return null;
                      return (
                        <div key={type} className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] border-b border-black/5 pb-2">
                            {type === 'job' ? 'Offene Stellen' : 'Karrieretipps'}
                          </h4>
                          <div className="grid gap-4">
                            {items.map(item => (
                              <a 
                                key={item.id} 
                                href={item.link}
                                onClick={() => setIsSearchOpen(false)}
                                className="group p-4 hover:bg-[#FAFAF8] transition-all border border-transparent hover:border-black/5"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h5 className="font-medium group-hover:text-[#004225] transition-colors">{item.title}</h5>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#004225]/60">{item.category}</span>
                                </div>
                                <p className="text-xs text-[#5C5C58] font-light line-clamp-1">{item.content}</p>
                                {item.location && (
                                  <div className="mt-2 flex items-center gap-1 text-[10px] text-[#9A9A94]">
                                    <Globe size={10} />
                                    {item.location}
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-[#9A9A94] font-light">Keine Ergebnisse für "{searchQuery}" gefunden.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#FAFAF8] border-t border-black/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">
                <span>{searchResults.length} Ergebnisse gefunden</span>
                <div className="flex gap-4">
                  <span>ESC zum Schliessen</span>
                  <span>ENTER für Stella-Beratung</span>
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
            className="fixed bottom-24 right-6 w-[450px] h-[700px] max-w-[90vw] max-h-[80vh] bg-white border border-black/5 shadow-2xl z-[100] flex flex-col"
          >
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-[#FAFAF8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#004225] flex items-center justify-center text-white font-serif">S</div>
                <div>
                  <h3 className="text-sm font-medium">Stella</h3>
                  <p className="text-[10px] text-[#059669] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#059669] animate-pulse" />
                    Online • {t.security_badge}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsStellaOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#004225]/5 p-3 border-b border-[#004225]/10 flex items-center gap-3">
              <Shield size={14} className="text-[#004225]" />
              <p className="text-[10px] text-[#004225] font-medium uppercase tracking-widest">
                {language === 'DE' ? 'Sichere Schweizer Datenverarbeitung' : language === 'FR' ? 'Traitement sécurisé des données suisses' : language === 'IT' ? 'Elaborazione sicura dei dati svizzeri' : 'Secure Swiss Data Processing'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAF8]/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 text-sm font-light leading-relaxed relative group ${
                    m.role === 'user' ? 'bg-[#004225] text-white' : 'bg-white border border-black/5 text-[#1A1A18]'
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

            <div className="p-4 border-t border-black/5 bg-white">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Frag Stella etwas..."
                  className="flex-1 bg-[#FAFAF8] border border-black/5 px-4 py-2 text-sm font-light outline-none focus:border-[#004225]/30 transition-all"
                />
                <button 
                  onClick={sendMessage}
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
              className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FAFAF8]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#004225] text-white flex items-center justify-center">
                    {activeTool.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-serif">{activeTool.title}</h3>
                    <p className="text-xs text-[#5C5C58] uppercase tracking-widest font-bold">{activeTool.badge}</p>
                  </div>
                </div>
                <button onClick={() => setActiveTool(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

                <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row relative">
                  {activeTool.type === 'pro' && (!user?.role || user.role === 'client') && (
                    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-16 h-16 bg-[#004225]/10 flex items-center justify-center text-[#004225] mb-6 rounded-full">
                        <Lock size={32} />
                      </div>
                      <h3 className="text-2xl font-serif mb-4">Exklusives Pro-Tool</h3>
                      <p className="text-[#5C5C58] font-light max-w-md mb-8">
                        Dieses Tool ist Teil unseres Pro-Pakets. Erhalte unbegrenzten Zugriff auf alle 20+ Karriere-Tools, ATS-Checks und Zeugnis-Analysen.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                          onClick={() => {
                            setActiveTool(null);
                            const pricingSection = document.getElementById('pricing');
                            pricingSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-8 py-4 bg-[#004225] text-white text-sm font-medium hover:bg-[#00331D] transition-all"
                        >
                          Pläne ansehen
                        </button>
                        <button 
                          onClick={() => setActiveTool(null)}
                          className="px-8 py-4 border border-black/10 text-sm font-medium hover:bg-black/5 transition-all"
                        >
                          Vielleicht später
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Inputs */}
                <div className="w-full lg:w-1/3 p-8 bg-[#FAFAF8] border-r border-black/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-[#004225]">Eingaben</h4>
                  <div className="space-y-6">
                    {activeTool.inputs.map((input: any) => (
                      <div key={input.key}>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5C5C58]">{input.label}</label>
                          {input.type === 'textarea' && (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[10px] font-bold text-[#004225] flex items-center gap-1 hover:underline"
                            >
                              <FileText size={10} />
                              Datei laden
                            </button>
                          )}
                        </div>
                        {input.type === 'textarea' ? (
                          <textarea 
                            className="w-full p-4 bg-white border border-black/10 text-sm focus:outline-none focus:border-[#004225] transition-all min-h-[120px] font-light"
                            placeholder={input.placeholder}
                            value={toolInput[input.key] || ''}
                            onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                          />
                        ) : (
                          <input 
                            type={input.type}
                            className="w-full p-4 bg-white border border-black/10 text-sm focus:outline-none focus:border-[#004225] transition-all font-light"
                            placeholder={input.placeholder}
                            value={toolInput[input.key] || ''}
                            onChange={(e) => setToolInput({ ...toolInput, [input.key]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                    {!cvContext && activeTool.id !== 'salary-calc' && activeTool.id !== 'zeugnis' && (
                      <div className="p-4 bg-[#004225]/5 border border-[#004225]/20 text-[10px] text-[#004225] leading-relaxed">
                        {t.tool_no_cv}
                      </div>
                    )}
                    <button 
                      onClick={processTool}
                      disabled={isProcessingTool}
                      className="w-full py-4 bg-[#004225] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 p-8 bg-white relative">
                  {isProcessingTool ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                      <div className="w-12 h-12 border-4 border-[#004225]/10 border-t-[#004225] rounded-full animate-spin mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest text-[#004225]">{t.tool_analyzing}</p>
                    </div>
                  ) : toolResult ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225]">{t.tool_result}</h4>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => {
                              const blob = new Blob([toolResult], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `stellify-${activeTool.id}.txt`;
                              a.click();
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] transition-colors flex items-center gap-1"
                          >
                            <Download size={12} />
                            {t.tool_download}
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(toolResult);
                              alert(t.tool_copied);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#5C5C58] hover:text-[#004225] transition-colors"
                          >
                            {t.tool_copy}
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto font-serif text-lg leading-relaxed whitespace-pre-wrap pr-4 custom-scrollbar markdown-body relative group">
                        <Markdown>{toolResult}</Markdown>
                        <div className="absolute bottom-4 right-4 text-[8px] text-[#9A9A94] font-bold uppercase tracking-widest opacity-40">
                          {t.ai_notice}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                      <div className="w-16 h-16 bg-[#FAFAF8] flex items-center justify-center text-3xl mb-4">✨</div>
                      <p className="text-sm font-light">{t.tool_empty_state}</p>
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
                    alert("In die Zwischenablage kopiert!");
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

      {/* --- AUTH MODAL --- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md p-10 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <span className="text-2xl font-serif tracking-tight">Stell<span className="text-[#004225]">ify</span></span>
                <h3 className="text-xl font-medium mt-4">{authTab === 'login' ? t.auth_welcome : t.auth_create}</h3>
                <p className="text-sm text-[#5C5C58] font-light mt-2">{t.auth_precision}</p>
              </div>

              <div className="flex bg-[#FAFAF8] p-1 mb-8">
                <button 
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-2 text-xs font-medium transition-all ${authTab === 'login' ? 'bg-white shadow-sm text-[#1A1A18]' : 'text-[#9A9A94]'}`}
                >
                  {t.auth_login}
                </button>
                <button 
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 py-2 text-xs font-medium transition-all ${authTab === 'register' ? 'bg-white shadow-sm text-[#1A1A18]' : 'text-[#9A9A94]'}`}
                >
                  {t.auth_register}
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authTab === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.auth_first_name}</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94]" size={16} />
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-[#FAFAF8] border border-black/5 pl-10 pr-4 py-3 text-sm font-light outline-none focus:border-[#004225]/30 transition-all"
                        placeholder={t.auth_placeholder_name}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.auth_email}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94]" size={16} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#FAFAF8] border border-black/5 pl-10 pr-4 py-3 text-sm font-light outline-none focus:border-[#004225]/30 transition-all"
                      placeholder={t.auth_placeholder_email}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A94]">{t.auth_password}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A94]" size={16} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#FAFAF8] border border-black/5 pl-10 pr-4 py-3 text-sm font-light outline-none focus:border-[#004225]/30 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}

                <button 
                  type="submit"
                  className="w-full bg-[#004225] text-white py-4 text-sm font-medium hover:bg-[#00331d] transition-all mt-4"
                >
                  {authTab === 'login' ? t.auth_login : t.auth_create}
                </button>
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
              className="bg-white w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.settings_first_name}</label>
                      <p className="text-sm font-medium">{user?.firstName}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9A9A94] mb-1">{t.settings_email}</label>
                      <p className="text-sm font-medium">{user?.email}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#004225] border-b border-black/5 pb-2">{t.subscription}</h4>
                  <div className="p-4 bg-[#FAFAF8] border border-black/5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{user?.role === 'pro' ? 'Stellify Pro' : user?.role === 'unlimited' ? 'Stellify Unlimited' : 'Stellify Gratis'}</p>
                      <p className="text-[10px] text-[#9A9A94] uppercase tracking-widest">{t.settings_status}</p>
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

                  {/* Admin Debug Section */}
                  {user?.email === 'weare2bc@gmail.com' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-amber-900">
                        <Shield size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Admin Debug Tools</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/test/simulate-success', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user?.id, planId: 'pro' })
                              });
                              const data = await res.json();
                              alert(data.message);
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
                            try {
                              const res = await fetch('/api/test/simulate-success', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user?.id, planId: 'unlimited' })
                              });
                              const data = await res.json();
                              alert(data.message);
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
              className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Close Button - More prominent */}
              <button 
                onClick={() => setIsPromoOpen(false)}
                className="absolute top-12 right-12 z-[600] text-white/40 hover:text-white transition-all flex items-center gap-3 group"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity">Schliessen</span>
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/40 transition-colors">
                  <X size={24} />
                </div>
              </button>

              {/* Animated Promo Content */}
              <div className="max-w-5xl w-full px-6 relative">
                <PromoSequence onComplete={() => setIsPromoOpen(false)} t={t} />
              </div>

              {/* Background Ambient Effects */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-gradient-to-tr from-[#004225]/10 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,66,37,0.15)_0%,transparent_70%)]" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
