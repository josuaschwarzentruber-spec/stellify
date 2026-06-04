/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

const PromoSequence = ({ onComplete, t, language }: { onComplete: () => void, t: any, language: string }) => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [isCutting, setIsCutting] = useState(false);

  const isFR = language === 'FR';
  const isIT = language === 'IT';
  const isEN = language === 'EN';

  // ESC to close + lock body scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onComplete]);

  const scenes = [
    {
      chapter: '01 / 05',
      tag: isFR ? 'OUVERTURE' : isIT ? 'APERTURA' : isEN ? 'OPENING' : 'ERÖFFNUNG',
      line1: isFR ? 'En Suisse.' : isIT ? 'In Svizzera.' : isEN ? 'In Switzerland.' : 'In der Schweiz.',
      line2: isFR ? 'Chaque mot compte.' : isIT ? 'Ogni parola conta.' : isEN ? 'Every word counts.' : 'Zählt jedes Wort.',
      sub: isFR ? 'Le marché le plus exigeant d\'Europe.' : isIT ? 'Il mercato più esigente d\'Europa.' : isEN ? 'The most demanding market in Europe.' : 'Der anspruchsvollste Markt Europas.',
      isCta: false,
    },
    {
      chapter: '02 / 05',
      tag: isFR ? 'VOTRE CV' : isIT ? 'IL TUO CV' : isEN ? 'YOUR CV' : 'DEIN LEBENSLAUF',
      line1: isFR ? 'Ton CV.' : isIT ? 'Il tuo CV.' : isEN ? 'Your CV.' : 'Dein Lebenslauf.',
      line2: isFR ? 'Perfectionné.' : isIT ? 'Perfezionato.' : isEN ? 'Perfected.' : 'Perfektioniert.',
      sub: isFR ? 'Optimisé pour les recruteurs. Design soigné. Résultats immédiats.' : isIT ? 'Ottimizzato per i recruiter. Design curato. Risultati immediati.' : isEN ? 'Recruiter-ready. Refined design. Immediate results.' : 'Recruiter-geprüft. Präzises Design. Sofortige Wirkung.',
      isCta: false,
    },
    {
      chapter: '03 / 05',
      tag: isFR ? 'L\'ENTRETIEN' : isIT ? 'IL COLLOQUIO' : isEN ? 'THE INTERVIEW' : 'DAS INTERVIEW',
      line1: isFR ? 'L\'entretien.' : isIT ? 'Il colloquio.' : isEN ? 'The interview.' : 'Das Interview.',
      line2: isFR ? 'Maîtrisé.' : isIT ? 'Superato.' : isEN ? 'Mastered.' : 'Gemeistert.',
      sub: isFR ? 'Questions réelles. Feedback en temps réel. Confiance totale.' : isIT ? 'Domande reali. Feedback istantaneo. Fiducia totale.' : isEN ? 'Real questions. Real-time feedback. Total confidence.' : 'Echte Fragen. Echtzeit-Feedback. Totales Vertrauen.',
      isCta: false,
    },
    {
      chapter: '04 / 05',
      tag: 'STELLA AI',
      line1: 'Stella AI.',
      line2: isFR ? 'Ton avantage.' : isIT ? 'Il tuo vantaggio.' : isEN ? 'Your edge.' : 'Dein Vorteil.',
      sub: isFR ? 'L\'IA qui comprend le marché suisse.' : isIT ? 'L\'IA che capisce il mercato svizzero.' : isEN ? 'The AI that understands the Swiss market.' : 'Die KI, die den Schweizer Markt versteht.',
      isCta: false,
    },
    {
      chapter: '05 / 05',
      tag: isFR ? 'FIN' : isIT ? 'FINE' : isEN ? 'FIN' : 'ENDE',
      line1: 'Stellify.',
      line2: isFR ? 'Commence maintenant.' : isIT ? 'Inizia ora.' : isEN ? 'Start now.' : 'Jetzt starten.',
      sub: isFR ? 'Gratuit · Sans risque · Résultats réels.' : isIT ? 'Gratuito · Senza rischi · Risultati reali.' : isEN ? 'Free · No risk · Real results.' : 'Kostenlos · Ohne Risiko · Echte Ergebnisse.',
      isCta: true,
    },
  ];

  const totalScenes = scenes.length;

  useEffect(() => {
    if (sceneIdx >= totalScenes - 1) return;
    const timer = setTimeout(() => {
      setIsCutting(true);
      setTimeout(() => {
        setSceneIdx(s => s + 1);
        setIsCutting(false);
      }, 250);
    }, 4600);
    return () => clearTimeout(timer);
  }, [sceneIdx]);

  const scene = scenes[sceneIdx];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">

      {/* CINEMATIC LETTERBOX BARS */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none" style={{ height: 'clamp(32px, 8vh, 72px)', background: '#000' }} />
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" style={{ height: 'clamp(32px, 8vh, 72px)', background: '#000' }} />

      {/* DOT GRID */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)', backgroundSize: '46px 46px' }} />

      {/* ATMOSPHERIC ORBS — static for performance */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: '65vw', height: '65vw', maxWidth: 900, maxHeight: 900, top: '-25%', left: '-20%', background: 'radial-gradient(circle, rgba(0,100,50,0.32) 0%, transparent 65%)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: '50vw', height: '50vw', maxWidth: 700, maxHeight: 700, bottom: '-20%', right: '-15%', background: 'radial-gradient(circle, rgba(0,70,35,0.22) 0%, transparent 65%)' }}
      />

      {/* AMBIENT LIGHT — shifts per scene */}
      <motion.div
        key={`ambient-${sceneIdx}`}
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.5 }}
        style={{ background: 'radial-gradient(ellipse 60% 50% at 45% 55%, rgba(0,90,45,0.28) 0%, transparent 70%)' }}
      />

      {/* CUT FLASH */}
      <AnimatePresence>
        {isCutting && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none"
            style={{ background: '#fff' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.07 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>

      {/* CHAPTER + BRAND — top bar */}
      <div className="absolute left-0 right-0 z-40 flex items-center justify-between gap-3 px-6 md:px-14" style={{ top: 'clamp(10px, 2.5vh, 24px)' }}>
        <motion.span
          key={`ch-${sceneIdx}`}
          className="text-[9px] font-bold uppercase tracking-[0.45em] text-white/40 shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          {scene.chapter}
        </motion.span>
        <span className="hidden md:inline text-[9px] font-bold uppercase tracking-[0.5em] text-white/25">A STELLIFY FILM</span>
        <button
          onClick={onComplete}
          aria-label={t.close}
          className="flex items-center gap-2.5 px-3 py-2 border border-white/25 hover:border-white/70 bg-black/30 hover:bg-white/10 backdrop-blur-sm text-white/80 hover:text-white transition-all shrink-0 group"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{t.close}</span>
          <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* MAIN SCENE CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sceneIdx}
          className="relative z-10 w-full px-8 md:px-14 lg:px-20 space-y-6 md:space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Tag line */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="h-px w-10 bg-[#00A854]/50" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.45em] text-[#00A854]/65">{scene.tag}</span>
          </motion.div>

          {/* Line 1 — big serif */}
          <motion.h2
            className="font-serif text-white leading-none tracking-tight"
            style={{ fontSize: 'clamp(3rem, 9vw, 7.5rem)' }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {scene.line1}
          </motion.h2>

          {/* Line 2 — italic serif, green tint */}
          <motion.h3
            className="font-serif italic text-[#C6F6D5] leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.4rem, 7vw, 6rem)' }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {scene.line2}
          </motion.h3>

          {/* Sub-line */}
          <motion.p
            className="text-sm md:text-base text-white/38 font-light tracking-wide max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.72 }}
          >
            {scene.sub}
          </motion.p>

          {/* CTA — only on last scene */}
          {scene.isCta && (
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              onClick={onComplete}
              className="mt-2 inline-flex items-center gap-3 px-10 py-4 bg-white text-black text-[11px] font-bold uppercase tracking-[0.35em] hover:bg-[#D1FAE5] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              {isFR ? 'Commencer gratuitement' : isIT ? 'Inizia gratuitamente' : isEN ? 'Start for free' : 'Kostenlos starten'}
              <ArrowRight size={13} />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* PROGRESS TIMELINE — just above bottom bar */}
      <div className="absolute left-0 right-0 z-30 px-8 md:px-14" style={{ bottom: 'clamp(34px, 8.5vh, 76px)' }}>
        <div className="flex gap-1.5">
          {scenes.map((_, i) => (
            <div key={i} className="relative flex-1 h-[1px] bg-white/10 overflow-hidden">
              {i < sceneIdx && <div className="absolute inset-0 bg-white/35" />}
              {i === sceneIdx && (
                <motion.div
                  className="absolute top-0 left-0 bottom-0 bg-white/65"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4.6, ease: 'linear' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromoSequence;
