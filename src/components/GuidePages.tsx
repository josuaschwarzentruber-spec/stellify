/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Ratgeber (guides) — evergreen, Swiss-focused career content. Its purpose is
 * twofold: genuinely help visitors, and give Google real, keyword-rich pages
 * to index so stellify.ch earns free organic traffic. Available in all four
 * site languages so the Romandie and Ticino are covered too. Rendered as a
 * lazy chunk, like the legal pages.
 */

type Article = { id: string; kicker: string; title: string; lede: string; body: string[]; tips: string[] };

const CONTENT: Record<string, Article[]> = {
  DE: [
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
  ],
  FR: [
    {
      id: 'bewerbung-schreiben-schweiz',
      kicker: 'Guide',
      title: 'Postuler en Suisse : le guide complet',
      lede: 'Ce qui compose un dossier de candidature suisse, dans quel ordre, et ce que les recruteurs regardent vraiment.',
      body: [
        'Une candidature suisse complète comprend la lettre de motivation, le CV et les annexes. Dans le PDF, l\'ordre est presque toujours : lettre de motivation en premier, puis le CV, ensuite les certificats de travail, diplômes et éventuelles références. Un dossier bien structuré signale du soin avant même la première phrase.',
        'La lettre de motivation répond à deux questions : pourquoi ce poste et pourquoi toi. Ce n\'est pas un second CV en prose, mais une justification courte et concrète, en lien avec le poste mis au concours. Une page suffit.',
        'Le CV est tabulaire, antichronologique (le poste le plus récent d\'abord) et fait en Suisse le plus souvent deux pages. La photo est courante mais facultative. Les lacunes s\'expliquent brièvement et honnêtement, plutôt que de les masquer.',
        'Les annexes regroupent les derniers certificats de travail, les diplômes et certificats pertinents. Les références se donnent sur demande ou avec la mention qu\'elles sont disponibles. Moins, mais pertinent, vaut mieux qu\'une pile épaisse.',
      ],
      tips: [
        'Tout envoyer en un seul PDF bien nommé (p. ex. Candidature_Nom_Entreprise.pdf).',
        'Lire l\'annonce attentivement et reprendre les trois exigences principales dans la lettre.',
        'Écrire correctement le nom de la personne de contact, cela se remarque tout de suite.',
      ],
    },
    {
      id: 'lebenslauf-schweizer-standard',
      kicker: 'CV',
      title: 'CV au standard suisse : structure, ordre, photo',
      lede: 'Comment un CV suisse est construit, quelle longueur il peut avoir et quelles informations sont attendues aujourd\'hui.',
      body: [
        'En haut figurent les données personnelles : nom, adresse, téléphone, e-mail. La date de naissance et la nationalité sont facultatives, mais restent courantes en Suisse. Vient ensuite idéalement un court profil, trois à quatre phrases qui te positionnent dans le poste visé.',
        'Le cœur du CV est l\'expérience professionnelle, antichronologique. Pour chaque poste : période, fonction, employeur et lieu, plus deux à quatre résultats concrets au lieu de simples listes de tâches. Les chiffres parlent : budget, taille d\'équipe, amélioration obtenue.',
        'Suivent la formation, les langues avec niveau (p. ex. anglais C1), les compétences informatiques et, selon la branche, les formations continues. Dans une Suisse quadrilingue, les langues sont un vrai atout et doivent être clairement indiquées.',
        'Deux pages sont la règle. La photo est facultative ; si tu en mets une, qu\'elle soit professionnelle. Une police uniforme, une mise en page sobre et une mise en forme cohérente comptent plus que tout effet de design.',
      ],
      tips: [
        'Formuler l\'expérience en résultats : non pas "responsable de projets", mais "5 projets menés, budget CHF 500 000, plus 20 pour cent d\'efficacité".',
        'Indiquer honnêtement les niveaux de langue avec le cadre de référence (A1 à C2).',
        'Utiliser le même nom et la même police que dans la lettre, pour un ensemble cohérent.',
      ],
    },
    {
      id: 'motivationsschreiben',
      kicker: 'Lettre de motivation',
      title: 'Lettre de motivation : structure, formulations, erreurs fréquentes',
      lede: 'Le classique en trois parties qui convainc, et les erreurs qui affaiblissent aussitôt une bonne candidature.',
      body: [
        'Une bonne lettre a trois parties. L\'accroche indique en une phrase le poste visé et pourquoi cette entreprise précisément t\'intéresse, sans formules creuses. Le corps prouve, avec un ou deux exemples concrets, pourquoi tu conviens au poste. La conclusion invite avec assurance à un entretien.',
        'Écris à l\'entreprise, pas sur toi. Chaque phrase devrait montrer un bénéfice pour l\'employeur. Le meilleur test : supprime toute phrase qui pourrait figurer dans n\'importe quelle autre candidature.',
        'La formule d\'appel se termine par une virgule. Tiens-toi à une page, des paragraphes courts, une langue claire. L\'orthographe et le nom exact de l\'entreprise sont impératifs, ici personne ne pardonne les fautes.',
      ],
      tips: [
        'Pas de répétition du CV, mais mise en contexte et justification.',
        'Reprendre trois exigences de l\'annonce et donner un exemple concret pour chacune.',
        'Se relire à voix haute avant d\'envoyer, les phrases bancales sautent aux oreilles.',
      ],
    },
    {
      id: 'lohn-verhandeln-schweiz',
      kicker: 'Salaire',
      title: 'Négocier son salaire en Suisse : préparation, arguments, timing',
      lede: 'Comment te préparer à la question du salaire, quelle fourchette est réaliste et quand vient le bon moment.',
      body: [
        'La préparation l\'emporte sur le talent. Connais ta fourchette de marché avant d\'annoncer un chiffre : branche, région, expérience et responsabilité fixent le cadre. En Suisse, les salaires varient nettement selon les cantons et les branches, une valeur unique n\'aide pas.',
        'Annonce une fourchette, pas un chiffre unique, et justifie-la par ta contribution : résultats, responsabilités, compétences recherchées. Qui rattache sa valeur à des résultats concrets négocie plus calmement et de façon crédible.',
        'Le timing compte. La question du salaire ne vient pas dans la première phrase, mais au moment où il est clair que les deux parties s\'accordent, souvent vers la fin du processus. Pense au paquet global : 13e salaire, vacances, formation, télétravail et caisse de pension font partie de la table.',
      ],
      tips: [
        'Toujours donner une fourchette justifiée, jamais un chiffre nu.',
        'Calculer le paquet global, pas seulement le salaire de base.',
        'Rester calme : bien préparé, tu n\'es pas obligé d\'accepter vite.',
      ],
    },
  ],
  IT: [
    {
      id: 'bewerbung-schreiben-schweiz',
      kicker: 'Guida',
      title: 'Candidarsi in Svizzera: la guida completa',
      lede: 'Cosa compone un dossier di candidatura svizzero, in quale ordine e cosa guardano davvero i responsabili del personale.',
      body: [
        'Una candidatura svizzera completa comprende la lettera di motivazione, il CV e gli allegati. Nel PDF l\'ordine è quasi sempre: lettera di motivazione per prima, poi il CV, quindi i certificati di lavoro, i diplomi ed eventuali referenze. Un dossier ben strutturato trasmette cura ancora prima della prima frase.',
        'La lettera di motivazione risponde a due domande: perché questa posizione e perché proprio tu. Non è un secondo CV in prosa, ma una motivazione breve e concreta, legata alla posizione messa a concorso. Una pagina basta.',
        'Il CV è tabellare, in ordine cronologico inverso (la posizione più recente per prima) e in Svizzera è di solito lungo due pagine. La foto è comune ma facoltativa. Le lacune si spiegano in modo breve e onesto, invece di nasconderle.',
        'Tra gli allegati ci sono gli ultimi certificati di lavoro, i diplomi e i certificati pertinenti. Le referenze si forniscono su richiesta o con la nota che sono disponibili. Meno, ma pertinente, vale più di una pila spessa.',
      ],
      tips: [
        'Inviare tutto in un unico PDF ben nominato (es. Candidatura_Cognome_Azienda.pdf).',
        'Leggere con attenzione l\'annuncio e riprendere i tre requisiti principali nella lettera.',
        'Scrivere correttamente il nome della persona di contatto, si nota subito in positivo.',
      ],
    },
    {
      id: 'lebenslauf-schweizer-standard',
      kicker: 'CV',
      title: 'CV secondo lo standard svizzero: struttura, ordine, foto',
      lede: 'Come è costruito un CV svizzero, quanto può essere lungo e quali informazioni ci si aspetta oggi.',
      body: [
        'In alto figurano i dati personali: nome, indirizzo, telefono, e-mail. Data di nascita e nazionalità sono facoltative, ma restano diffuse in Svizzera. Segue idealmente un breve profilo, tre o quattro frasi che ti posizionano nel ruolo desiderato.',
        'Il cuore del CV è l\'esperienza professionale, in ordine cronologico inverso. Per ogni posizione: periodo, funzione, datore di lavoro e luogo, più due o quattro risultati concreti invece di semplici elenchi di compiti. I numeri parlano: budget, dimensione del team, miglioramento ottenuto.',
        'Seguono formazione, lingue con livello (es. inglese C1), competenze informatiche e, a seconda del settore, i perfezionamenti. In una Svizzera quadrilingue le lingue sono un vero vantaggio e vanno indicate chiaramente.',
        'Due pagine sono la regola. La foto è facoltativa; se la usi, che sia professionale. Un carattere uniforme, un layout sobrio e una formattazione coerente contano più di ogni effetto di design.',
      ],
      tips: [
        'Formulare l\'esperienza in risultati: non "responsabile di progetti", ma "5 progetti guidati, budget CHF 500 000, più 20 per cento di efficienza".',
        'Indicare onestamente i livelli di lingua con il quadro di riferimento (A1 a C2).',
        'Usare lo stesso nome e lo stesso carattere della lettera, per un insieme coerente.',
      ],
    },
    {
      id: 'motivationsschreiben',
      kicker: 'Lettera di motivazione',
      title: 'Lettera di motivazione: struttura, formulazioni, errori tipici',
      lede: 'Il classico in tre parti che convince e gli errori che indeboliscono subito una buona candidatura.',
      body: [
        'Una buona lettera ha tre parti. L\'apertura chiarisce in una frase la posizione desiderata e perché proprio questa azienda ti interessa, senza formule vuote. Il corpo dimostra, con uno o due esempi concreti, perché sei adatto al ruolo. La chiusura invita con sicurezza a un colloquio.',
        'Scrivi all\'azienda, non su di te. Ogni frase dovrebbe mostrare un vantaggio per il datore di lavoro. La prova migliore: cancella ogni frase che potrebbe stare in qualsiasi altra candidatura.',
        'La formula di apertura termina con una virgola. Resta su una pagina, paragrafi brevi, lingua chiara. L\'ortografia e il nome esatto dell\'azienda sono d\'obbligo, qui nessuno perdona gli errori.',
      ],
      tips: [
        'Nessuna ripetizione del CV, ma inquadramento e motivazione.',
        'Riprendere tre requisiti dell\'annuncio e fornire un esempio concreto per ciascuno.',
        'Rileggere ad alta voce prima di inviare, le frasi zoppicanti saltano all\'orecchio.',
      ],
    },
    {
      id: 'lohn-verhandeln-schweiz',
      kicker: 'Stipendio',
      title: 'Negoziare lo stipendio in Svizzera: preparazione, argomenti, timing',
      lede: 'Come prepararti alla domanda sullo stipendio, quale fascia è realistica e quando arriva il momento giusto.',
      body: [
        'La preparazione batte il talento. Conosci la tua fascia di mercato prima di dire una cifra: settore, regione, esperienza e responsabilità definiscono il quadro. In Svizzera gli stipendi variano nettamente tra cantoni e settori, un valore unico non aiuta.',
        'Indica una fascia, non una cifra singola, e giustificala con il tuo contributo: risultati, responsabilità, competenze richieste. Chi lega il proprio valore a risultati concreti negozia con più calma e credibilità.',
        'Il timing conta. La domanda sullo stipendio non va nella prima frase, ma nel momento in cui è chiaro che entrambe le parti combaciano, spesso verso la fine del processo. Pensa al pacchetto complessivo: 13a mensilità, vacanze, formazione, telelavoro e cassa pensioni fanno parte del tavolo.',
      ],
      tips: [
        'Indicare sempre una fascia motivata, mai una cifra nuda.',
        'Calcolare il pacchetto complessivo, non solo lo stipendio base.',
        'Restare calmi: ben preparati, non si è obbligati ad accettare in fretta.',
      ],
    },
  ],
  EN: [
    {
      id: 'bewerbung-schreiben-schweiz',
      kicker: 'Guide',
      title: 'Applying for a job in Switzerland: the complete guide',
      lede: 'What a Swiss application dossier contains, in what order, and what recruiters really look at.',
      body: [
        'A complete Swiss application consists of the cover letter, the CV and the enclosures. In the PDF the order is almost always: cover letter first, then the CV, followed by work references, diplomas and any references. A cleanly structured dossier signals care before the first sentence is even read.',
        'The cover letter answers two questions: why this role and why you. It is not a second CV in prose, but a short, concrete case with a clear link to the advertised position. One page is enough.',
        'The CV is tabular, reverse chronological (the most recent role first) and in Switzerland usually two pages long. A photo is common but optional. Gaps are explained briefly and honestly, rather than hidden.',
        'The enclosures include the most recent work references, relevant diplomas and certificates. References are given on request or with a note that they are available. Fewer, but fitting, beats a thick pile.',
      ],
      tips: [
        'Send everything as a single, clearly named PDF (e.g. Application_Surname_Company.pdf).',
        'Read the job ad carefully and address its three key requirements in your letter.',
        'Spell the contact person\'s name correctly, it stands out immediately.',
      ],
    },
    {
      id: 'lebenslauf-schweizer-standard',
      kicker: 'CV',
      title: 'The Swiss-standard CV: structure, order, photo',
      lede: 'How a Swiss CV is built, how long it may be and which details are expected today.',
      body: [
        'At the top are the personal details: name, address, phone, email. Date of birth and nationality are optional, but still common in Switzerland. Ideally a short profile follows, three to four sentences that position you for the target role.',
        'The core is your work experience, reverse chronological. Per role: period, function, employer and location, plus two to four concrete results instead of plain task lists. Numbers land: budget, team size, improvement achieved.',
        'Then come education, languages with level (e.g. English C1), IT skills and, depending on the field, further training. In quadrilingual Switzerland, languages are a real plus and belong clearly stated.',
        'Two pages is the norm. A photo is optional; if you use one, make it professional. A consistent font, a calm layout and clean formatting matter more than any design flourish.',
      ],
      tips: [
        'Phrase experience as results: not "responsible for projects", but "led 5 projects, CHF 500,000 budget, plus 20 percent efficiency".',
        'State language levels honestly using the reference framework (A1 to C2).',
        'Use the same name and font as in the cover letter, so it reads as one piece.',
      ],
    },
    {
      id: 'motivationsschreiben',
      kicker: 'Cover letter',
      title: 'The cover letter: structure, wording, common mistakes',
      lede: 'The classic three-part letter that convinces, and the mistakes that instantly weaken a strong application.',
      body: [
        'A strong letter has three parts. The opening makes clear in one sentence what you are applying for and why this company in particular interests you, without empty phrases. The middle proves, with one or two concrete examples, why you fit the role. The close confidently invites an interview.',
        'Write to the company, not about yourself. Every sentence should show a benefit for the employer. Best test: delete any sentence that could appear in any other application.',
        'The salutation ends with a comma. Keep to one page, short paragraphs, clear language. Spelling and the exact company name are a must, no one forgives errors here.',
      ],
      tips: [
        'No repetition of the CV, but context and reasoning.',
        'Pick up three requirements from the ad and give one concrete example for each.',
        'Read it aloud before sending, clumsy sentences reveal themselves at once.',
      ],
    },
    {
      id: 'lohn-verhandeln-schweiz',
      kicker: 'Salary',
      title: 'Negotiating salary in Switzerland: preparation, arguments, timing',
      lede: 'How to prepare for the salary question, what range is realistic and when the right moment comes.',
      body: [
        'Preparation beats talent. Know your market range before you name a number: industry, region, experience and responsibility set the frame. In Switzerland, salaries differ clearly between cantons and industries, a single figure does not help.',
        'Name a range, not a single number, and back it with your contribution: results, responsibility, sought-after skills. Anchoring your worth in concrete results lets you negotiate more calmly and credibly.',
        'Timing matters. The salary question does not belong in the first sentence, but in the moment when it is clear both sides fit, usually toward the end of the process. Think of the whole package: 13th month salary, holidays, training, home office and pension fund all belong on the table.',
      ],
      tips: [
        'Always give a reasoned range, never a bare number.',
        'Count the whole package, not just the base salary.',
        'Stay calm: well prepared, you do not have to say yes quickly.',
      ],
    },
  ],
};

const GuidePages = ({ onBack, onOpenTool, language }: { onBack: () => void; onOpenTool: () => void; language: string }) => {
  const articles = CONTENT[language] || CONTENT.DE;

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
            {language === 'FR' ? 'Nos guides pratiques pour le marché du travail suisse.'
              : language === 'IT' ? 'Le nostre guide pratiche per il mercato del lavoro svizzero.'
              : language === 'EN' ? 'Our practical guides for the Swiss job market.'
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
                  {language === 'FR' ? 'À retenir' : language === 'IT' ? 'In breve' : language === 'EN' ? 'Quick tips' : 'Kurz gemerkt'}
                </p>
                <ul className="space-y-2">
                  {a.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] text-[#26261F] dark:text-[#C8C8C2] font-light leading-snug">
                      <span className="text-[#004225] dark:text-[#00A854] mt-0.5">✓</span>{tip}
                    </li>
                  ))}
                </ul>
                <button onClick={onOpenTool} className="mt-4 pt-3 border-t border-[#004225]/10 dark:border-[#00A854]/15 w-full text-left group">
                  <span className="text-[13px] font-light text-[#26261F] dark:text-[#C8C8C2]">
                    {language === 'FR' ? 'Bon à savoir : le générateur Stellify applique tout cela automatiquement, en 60 secondes. '
                      : language === 'IT' ? 'Da sapere: il generatore Stellify applica tutto questo automaticamente, in 60 secondi. '
                      : language === 'EN' ? 'Good to know: the Stellify generator applies all of this automatically, in 60 seconds. '
                      : 'Gut zu wissen: Der Stellify Bewerbungs-Generator setzt genau das automatisch um, in 60 Sekunden. '}
                  </span>
                  <span className="text-[13px] font-bold text-[#004225] dark:text-[#00A854] group-hover:underline whitespace-nowrap">
                    {language === 'FR' ? 'Essayer gratuitement →' : language === 'IT' ? 'Prova gratis →' : language === 'EN' ? 'Try it free →' : 'Gratis ausprobieren →'}
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Questions & contact — mail first, Instagram second */}
        <div className="mt-12 p-6 bg-white dark:bg-[#22221F] border border-black/5 dark:border-white/5 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#004225] dark:text-[#00A854] mb-2">
            {language === 'FR' ? 'Des questions ?' : language === 'IT' ? 'Domande?' : language === 'EN' ? 'Questions?' : 'Fragen oder Probleme?'}
          </p>
          <p className="text-sm text-[#4A4A45] dark:text-[#9A9A94] font-light leading-relaxed">
            {language === 'FR' ? 'Écris-nous en premier par e-mail à '
              : language === 'IT' ? 'Scrivici prima via e-mail a '
              : language === 'EN' ? 'Write to us first by email at '
              : 'Schreib uns am besten zuerst per E-Mail an '}
            <a href="mailto:support.stellify@gmail.com" className="font-medium text-[#004225] dark:text-[#00A854] hover:underline">support.stellify@gmail.com</a>
            {language === 'FR' ? ', ou pose ta question sur Instagram à '
              : language === 'IT' ? ', oppure fai la tua domanda su Instagram a '
              : language === 'EN' ? ', or ask on Instagram at '
              : ', oder stell deine Frage auf Instagram an '}
            <a href="https://www.instagram.com/stellify.ch/" target="_blank" rel="noopener noreferrer" className="font-medium text-[#004225] dark:text-[#00A854] hover:underline">@stellify.ch</a>.
          </p>
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
