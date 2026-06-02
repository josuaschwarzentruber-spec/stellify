/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Pause, Play, VolumeX, Volume2 } from 'lucide-react';

// --- PROMO VIDEO MODAL (Werbespot Lightbox) ---
const PromoVideoModal = ({ onClose, onError, src, language }: { onClose: () => void; onError?: () => void; src: string; language: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        v.paused ? v.play() : v.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const onTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = Math.max(0, Math.min(1, ratio)) * v.duration;
  };

  const closeLabel = language === 'FR' ? 'Fermer' : language === 'IT' ? 'Chiudi' : language === 'EN' ? 'Close' : 'Schliessen';
  const muteLabel = language === 'FR' ? 'Couper le son' : language === 'IT' ? 'Disattiva audio' : language === 'EN' ? 'Mute' : 'Stummschalten';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl mx-4 aspect-video bg-black shadow-2xl"
      >
        <video
          ref={videoRef}
          src={src}
          autoPlay
          playsInline
          onTimeUpdate={onTime}
          onEnded={() => setIsPlaying(false)}
          onError={() => onError?.()}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 pointer-events-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6FCF97] animate-pulse" />
            Stellify · Campaign Film
          </div>
          <button
            onClick={onClose}
            aria-label={closeLabel}
            className="pointer-events-auto p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Bottom bar with progress + controls */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 bg-gradient-to-t from-black/80 to-transparent">
          <div
            onClick={seek}
            className="group relative h-1 w-full bg-white/15 hover:h-1.5 transition-all cursor-pointer mb-3"
          >
            <div
              className="absolute left-0 top-0 h-full bg-[#6FCF97]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
            </button>
            <button
              onClick={toggleMute}
              aria-label={muteLabel}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
              ESC · {closeLabel}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromoVideoModal;
