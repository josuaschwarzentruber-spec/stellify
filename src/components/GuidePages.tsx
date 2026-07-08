/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Ratgeber (guides) — evergreen, Swiss-focused career content. Its purpose is
 * twofold: genuinely help visitors, and give Google real, keyword-rich pages
 * to index so stellify.ch earns free organic traffic. Content is German (the
 * largest Swiss market and where these searches happen); the shell chrome is
 * translated. Rendered as a lazy chunk, like the legal pages.
 */
const GuidePages = ({ onBack, onOpenTool, language }: { onBack: () => void; onOpenTool: () => void; language: string }) => {
  const isDE = language === 'DE';

  const articles = [
    {
      id: 'bewerbung-schreiben-schweiz',
      kicker: 'Leitfaden',
      title: 'Bewerbung schreiben in der Schweiz: der komplette Leitfaden',
      lede: 'Was in ein Schweizer Bewerbungsdossier gehört, in welcher Reihenfolge, und worauf Personalverantwortliche wirklich achten.',
      body: [
        'Eine vollständige Schweizer Bewerbung besteht aus dem Motivationsschreiben, dem Lebenslauf und den Beilagen. Die Reihenfolge im PDF ist fast immer: Motivationsschreiben zuerst, dann der Lebenslauf, danach Arbeitszeugnisse, Diplome und allfällige Referenzen. Ein sauber gegliedertes Dossier signalisiert Sorgfalt, noch bevor der erste Satz gelesen wird.',
        'Das Motivationsschreiben beantwortet zwei Fragen: Warum diese Stelle und warum ausgerechnet du. Es ist kein zweiter Lebenslauf in Prosa, sondern eine kurze, konkrete Begründung mit Bezug zur ausgeschriebenen Position. Eine Seite genügt.',
        'Der Lebenslauf ist tabellarisch, chronologisch rückwärts (die aktuellste Station zuerst) und in der Schweiz meist zwei Seiten lang. Ein Bewerbungsfoto ist üblich, aber freiwillig. Lücken erklärt man knapp und ehrlich, statt sie zu kaschieren.',
        'Zu den Beilagen gehören die letzten Arbeitszeugnisse, relevante Diplome und Zertifikate. Referenzen gibt man erst auf Anfrage oder mit dem Vermerk, dass sie auf Wunsch zur Verfügung stehen. Weniger, aber passend, wirkt stärker als ein dicker Stapel.',
      ],
      tips: [
        'Alles als ein einziges, sauber benanntes PDF senden (z.B. Bewerbung_Nachname_Firma.pdf).',
        'Die Stellenanzeige genau lesen und die drei wichtigsten Anforderungen im Schreiben aufgreifen.',
        'Namen der Ansprechperson korrekt schreiben, das fällt sofort positiv auf.',
      ],
    },
    {
      id: 'lebenslauf-schweizer-standard',
      kicker: 'Lebenslauf',
      title: 'Lebenslauf nach Schweizer Standard: Aufbau, Reihenfolge, Foto',
      lede: 'Wie ein Schweizer CV aufgebaut ist, wie lang er sein darf und welche Angaben heute erwartet werden.',
      body: [
        'Oben stehen die persönlichen Angaben: Name, Adresse, Telefon, E-Mail. Geburtsdatum und Nationalität sind freiwillig, in der Schweiz aber weiterhin verbreitet. Danach folgt idealerweise ein kurzes Profil, drei bis vier Sätze, die dich in deiner Zielrolle positionieren.',
        'Das Herzstück ist die Berufserfahrung, chronologisch rückwärts. Pro Station nennst du Zeitraum, Funktion, Arbeitgeber und Ort, dazu zwei bis vier konkrete Ergebnisse statt reiner Aufgabenlisten. Zahlen wirken: Budget, Teamgrösse, erreichte Verbesserung.',
        'Es folgen Ausbildung, Sprachen mit Niveau (z.B. Englisch C1), IT-Kenntnisse und je nach Branche Weiterbildungen. Sprachen sind in der viersprachigen Schweiz ein echtes Plus und gehören klar ausgewiesen.',
        'Zwei Seiten sind die Regel. Ein Foto ist optional, wenn du eines einsetzt, dann ein professionelles. Einheitliche Schrift, ruhiges Layout und konsequente Formatierung sind wichtiger als jede Designspielerei.',
      ],
      tips: [
        'Berufserfahrung in Ergebnissen formulieren: nicht "verantwortlich für Projekte", sondern "5 Projekte geleitet, Budget CHF 500 000, plus 20 Prozent Effizienz".',
        'Sprachniveaus ehrlich und mit Referenzrahmen angeben (A1 bis C2).',
        'Denselben Namen und dieselbe Schrift wie im Motivationsschreiben verwenden, das wirkt wie aus einem Guss.',
      ],
    },
    {
      id: 'motivationsschreiben',
      kicker: 'Motivationsschreiben',
      title: 'Motivationsschreiben: Aufbau, Formulierungen, typische Fehler',
      lede: 'Der klassische Dreiteiler, der überzeugt, und die Fehler, die eine gute Bewerbung sofort schwächen.',
      body: [
        'Ein starkes Motivationsschreiben hat drei Teile. Der Einstieg macht in einem Satz klar, worauf du dich bewirbst und weshalb dich genau diese Firma interessiert, ohne Floskeln wie "hiermit bewerbe ich mich". Der Mittelteil belegt mit ein bis zwei konkreten Beispielen, warum du zur Rolle passt. Der Schluss lädt selbstbewusst zum Gespräch ein.',
        'Schreibe an die Firma, nicht über dich. Jeder Satz sollte einen Nutzen für den Arbeitgeber zeigen. Der beste Test: Streiche jeden Satz, der auch in jeder anderen Bewerbung stehen könnte.',
        'Die Anrede endet in der Schweiz mit Komma, danach beginnt der erste Satz klein. Halte dich an eine Seite, kurze Absätze, klare Sprache. Rechtschreibung und der richtige Firmenname sind Pflicht, hier verzeiht niemand Fehler.',
      ],
      tips: [
        'Keine Wiederholung des Lebenslaufs, sondern Einordnung und Begründung.',
        'Drei Anforderungen aus dem Inserat aufgreifen und je ein konkretes Beispiel liefern.',
        'Vor dem Absenden laut vorlesen, holprige Sätze fallen dabei sofort auf.',
      ],
    },
    {
      id: 'lohn-verhandeln-schweiz',
      kicker: 'Lohn',
      title: 'Lohn verhandeln in der Schweiz: Vorbereitung, Argumente, Timing',
      lede: 'Wie du dich auf die Lohnfrage vorbereitest, welche Spanne realistisch ist und wann der richtige Moment kommt.',
      body: [
        'Vorbereitung schlägt Talent. Kenne deine Marktspanne, bevor du eine Zahl nennst: Branche, Region, Erfahrung und Verantwortung bestimmen den Rahmen. In der Schweiz unterscheiden sich Löhne zwischen Kantonen und Branchen deutlich, ein Pauschalwert hilft nicht.',
        'Nenne eine Spanne, keine einzelne Zahl, und begründe sie mit deinem Beitrag: Ergebnisse, Verantwortung, gefragte Fähigkeiten. Wer den eigenen Wert an konkreten Resultaten festmacht, verhandelt ruhiger und glaubwürdiger.',
        'Das Timing zählt. Die Lohnfrage gehört nicht in den ersten Satz, sondern in den Moment, in dem klar ist, dass beide Seiten zusammenpassen, meist gegen Ende des Prozesses. Denke am Gesamtpaket: 13. Monatslohn, Ferien, Weiterbildung, Homeoffice und Pensionskasse gehören mit auf den Tisch.',
      ],
      tips: [
        'Immer eine begründete Spanne nennen, nie nur eine nackte Zahl.',
        'Das Gesamtpaket rechnen, nicht nur den Grundlohn.',
        'Ruhig bleiben: Wer vorbereitet ist, muss nicht schnell zusagen.',
      ],
    },
  ];

  return (
    <section className="px-6 lg:px-12 py-16 bg-[#FDFCFB] dark:bg-[#1A1A18] min-h-screen">
      <style>{`
        @keyframes stellifyPageIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .stellify-page-in { animation: stellifyPageIn .5s cubic-bezier(.22,.61,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .stellify-page-in { animation: none; } }
      `}</style>
      <div className="max-w-3xl mx-auto stellify-page-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors mb-12"
        >
          <ArrowLeft size={14} /> {language === 'FR' ? 'Retour' : language === 'IT' ? 'Indietro' : language === 'EN' ? 'Back' : 'Zurück'}
        </button>

        <header className="mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#004225] dark:text-[#00A854] mb-4">
            {language === 'FR' ? 'Guides' : language === 'IT' ? 'Guide' : language === 'EN' ? 'Guides' : 'Ratgeber'}
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-5 leading-[1.05] tracking-tight">
            {language === 'FR' ? 'Bien postuler en Suisse' : language === 'IT' ? 'Candidarsi bene in Svizzera' : language === 'EN' ? 'Applying well in Switzerland' : 'Richtig bewerben in der Schweiz'}
          </h1>
          <p className="text-lg text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">
            {language === 'FR' ? 'Nos guides pratiques pour le marché du travail suisse (en allemand).'
              : language === 'IT' ? 'Le nostre guide pratiche per il mercato del lavoro svizzero (in tedesco).'
              : language === 'EN' ? 'Our practical guides for the Swiss job market (in German).'
              : 'Praktische Leitfäden für den Schweizer Arbeitsmarkt, damit deine nächste Bewerbung sitzt.'}
          </p>
        </header>

        {/* Table of contents — internal links help both readers and Google. */}
        <nav className="mb-14 border-l-2 border-[#004225]/20 dark:border-[#00A854]/30 pl-5 space-y-2">
          {articles.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="block text-sm text-[#4A4A45] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors font-light">
              {a.title}
            </a>
          ))}
        </nav>

        <div className="space-y-16">
          {articles.map((a) => (
            <article key={a.id} id={a.id} className="scroll-mt-24">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#004225] dark:text-[#00A854] mb-3">{a.kicker}</p>
              <h2 className="text-2xl md:text-3xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4 leading-tight">{a.title}</h2>
              <p className="text-[15px] text-[#4A4A45] dark:text-[#9A9A94] italic font-light leading-relaxed mb-6">{a.lede}</p>
              <div className="space-y-4 text-[15px] text-[#26261F] dark:text-[#C8C8C2] font-light leading-[1.75]">
                {a.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <div className="mt-6 p-5 bg-[#004225]/[0.04] dark:bg-[#00A854]/[0.06] border border-[#004225]/12 dark:border-[#00A854]/20 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#004225] dark:text-[#00A854] mb-3">
                  {isDE ? 'Kurz gemerkt' : language === 'FR' ? 'À retenir' : language === 'IT' ? 'In breve' : 'Quick tips'}
                </p>
                <ul className="space-y-2">
                  {a.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] text-[#26261F] dark:text-[#C8C8C2] font-light leading-snug">
                      <span className="text-[#004225] dark:text-[#00A854] mt-0.5">✓</span>{tip}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        {/* Soft CTA into the product */}
        <div className="mt-16 p-8 bg-[#004225] text-white rounded-2xl text-center">
          <h3 className="text-2xl font-serif mb-3">
            {language === 'FR' ? 'Laisse Stella écrire ta candidature' : language === 'IT' ? 'Lascia che Stella scriva la tua candidatura' : language === 'EN' ? 'Let Stella write your application' : 'Lass Stella deine Bewerbung schreiben'}
          </h3>
          <p className="text-sm text-white/70 font-light mb-6 max-w-md mx-auto leading-relaxed">
            {language === 'FR' ? 'Un design, tes données, une candidature complète en PDF et Word. Trois essais gratuits.'
              : language === 'IT' ? 'Un design, i tuoi dati, una candidatura completa in PDF e Word. Tre prove gratuite.'
              : language === 'EN' ? 'A design, your details, a full application in PDF and Word. Three free tries.'
              : 'Ein Design, deine Angaben, eine vollständige Bewerbung als PDF und Word. Drei Versuche gratis.'}
          </p>
          <button
            onClick={onOpenTool}
            className="inline-flex items-center gap-2 px-7 py-3 bg-white text-[#004225] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#FAFAF8] transition-all"
          >
            {language === 'FR' ? 'Commencer' : language === 'IT' ? 'Inizia' : language === 'EN' ? 'Get started' : 'Jetzt loslegen'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default GuidePages;
