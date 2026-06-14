import { useState } from 'react';

/**
 * Founder portrait with an elegant hover crossfade to a second photo.
 *
 * Photos live in /public:
 *   /founder.jpg       — professional portrait (4:5, ≥800×1000px recommended)
 *   /founder-golf.jpg  — golf shot shown on hover (same crop ratio)
 *
 * Until both photos exist the component renders a quiet branded
 * monogram placeholder, so the section never shows a broken image.
 */
const FounderPortrait = ({ language }: { language: string }) => {
  const [portraitOk, setPortraitOk] = useState(true);
  const [golfOk, setGolfOk] = useState(true);

  const roleLabel =
    language === 'FR' ? 'Fondateur'
    : language === 'IT' ? 'Fondatore'
    : language === 'EN' ? 'Founder'
    : 'Gründer';

  return (
    <figure className="group/founder w-44 sm:w-52 shrink-0 select-none">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#004225]/5 dark:bg-white/5 border border-black/8 dark:border-white/10">
        {portraitOk ? (
          <>
            <img
              src="/founder.jpg"
              alt={roleLabel}
              loading="lazy"
              onError={() => setPortraitOk(false)}
              className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(.22,.61,.36,1)] group-hover/founder:opacity-0 group-hover/founder:scale-[1.04]"
            />
            {golfOk && (
              <img
                src="/founder-golf.jpg"
                alt=""
                aria-hidden="true"
                loading="lazy"
                onError={() => setGolfOk(false)}
                className="absolute inset-0 h-full w-full object-cover opacity-0 scale-[1.06] transition-all duration-700 ease-[cubic-bezier(.22,.61,.36,1)] group-hover/founder:opacity-100 group-hover/founder:scale-100"
              />
            )}
            {/* Soft vignette for depth, fades slightly on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60 group-hover/founder:opacity-30 transition-opacity duration-700 pointer-events-none" />
          </>
        ) : (
          /* Placeholder until /founder.jpg is uploaded */
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#004225] to-[#00331d]">
            <span className="font-serif text-5xl text-white/90 tracking-tight">S</span>
          </div>
        )}
      </div>
      <figcaption className="mt-4">
        <p className="font-serif text-lg text-[#1A1A18] dark:text-[#FAFAF8] leading-tight">{roleLabel}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B66] dark:text-[#9A9A94]">Stellify</p>
      </figcaption>
    </figure>
  );
};

export default FounderPortrait;
