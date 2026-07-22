import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, ChevronLeft, ChevronRight, Plus, Save, Trash2,
  FolderOpen, Lock, Palette, Eye, X, Sparkles, Download,
  Pencil, RefreshCw, MessageSquare, ListChecks, UserSquare, Link2,
  Upload,
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, query, where, limit,
  deleteDoc, doc, updateDoc,
} from 'firebase/firestore';

/* ──────────────────────────────────────────────────────────────────────────
   Design system. six original, code-defined application designs.
   A design is pure data; ApplicationDocument renders it. The same renderer
   will drive the PDF/DOCX export in phase 2, so design === export layout.
   ────────────────────────────────────────────────────────────────────────── */

export type DesignConfig = {
  id: string;
  /** display font pairing */
  font: 'serif' | 'sans' | 'mix';
  /** accent colour (headings, rules, blocks) */
  accent: string;
  /** soft tint derived from accent for backgrounds */
  layout: 'classic' | 'sidebar' | 'minimal' | 'elegant' | 'block' | 'executive';
  custom?: boolean;
  name?: string;
  /** Ultimate-only design. locked for Free + Pro */
  premium?: boolean;
};

const BUILT_IN_DESIGNS: DesignConfig[] = [
  { id: 'klassisch',  font: 'serif', accent: '#1A1A18', layout: 'classic' },
  { id: 'modern',     font: 'sans',  accent: '#004225', layout: 'sidebar' },
  { id: 'minimal',    font: 'sans',  accent: '#5C5C58', layout: 'minimal' },
  { id: 'elegant',    font: 'mix',   accent: '#8A6D3B', layout: 'elegant', premium: true },
  { id: 'kreativ',    font: 'sans',  accent: '#0E7490', layout: 'block' },
  { id: 'management', font: 'mix',   accent: '#1E2A38', layout: 'executive', premium: true },
];

const ACCENT_PRESETS = ['#004225', '#1E2A38', '#8A6D3B', '#0E7490', '#7C2D4E', '#1A1A18'];

export type ApplicationForm = {
  firstName: string; lastName: string; address: string; phone: string; email: string;
  currentRole: string; targetCompany: string; targetPosition: string; jobDescription: string;
  experience: string; education: string; skills: string; motivation: string; tone: string;
  /** Optional applicant photo as a data URL. Pre-shrunk to ~360px wide
      to keep payload tiny and PDF export crisp without blowing up size. */
  photo?: string;
};

const EMPTY_FORM: ApplicationForm = {
  firstName: '', lastName: '', address: '', phone: '', email: '',
  currentRole: '', targetCompany: '', targetPosition: '', jobDescription: '',
  experience: '', education: '', skills: '', motivation: '', tone: '',
  photo: '',
};

export type GeneratedContent = {
  coverLetter: string;
  cvSummary: string;
  skills: string[];
  interview: { q: string; a: string }[];
};

/* ── i18n ────────────────────────────────────────────────────────────────── */

const STR: Record<string, Record<string, string>> = {
  DE: {
    step_design: 'Design', step_data: 'Daten', step_preview: 'Vorschau',
    pick_design: 'Wähle dein Design', pick_design_sub: 'Sechs originale Layouts, entworfen für den Schweizer Arbeitsmarkt. Oder gestalte dein eigenes.',
    own_design: 'Eigenes Design', own_design_new: 'Neues Design erstellen',
    d_klassisch: 'Klassisch', d_modern: 'Modern', d_minimal: 'Minimalistisch', d_elegant: 'Elegant', d_kreativ: 'Kreativ', d_management: 'Management',
    builder_title: 'Eigenes Design', builder_name: 'Name des Designs', builder_name_ph: 'z.B. Mein Stil',
    builder_accent: 'Akzentfarbe', builder_font: 'Schrift', builder_layout: 'Layout-Stil',
    font_serif: 'Serif', font_sans: 'Sans-Serif', font_mix: 'Kombiniert',
    layout_classic: 'Klassisch zentriert', layout_sidebar: 'Seitenleiste', layout_minimal: 'Minimal', layout_elegant: 'Elegant', layout_block: 'Farbblock', layout_executive: 'Executive',
    save_design: 'Design speichern', cancel: 'Abbrechen', delete: 'Löschen',
    sec_person: 'Persönliche Angaben', sec_job: 'Zielstelle', sec_profile: 'Dein Profil',
    f_firstName: 'Vorname', f_lastName: 'Nachname', f_address: 'Adresse', f_phone: 'Telefon', f_email: 'E-Mail',
    f_currentRole: 'Beruf / aktuelle Rolle', f_targetCompany: 'Zielfirma', f_targetPosition: 'Stelle',
    f_jobDescription: 'Stellenbeschreibung', f_experience: 'Berufserfahrung', f_education: 'Ausbildung',
    f_skills: 'Fähigkeiten', f_motivation: 'Motivation', f_tone: 'Gewünschte Tonalität',
    tone_prof: 'Professionell', tone_conf: 'Selbstbewusst', tone_warm: 'Freundlich', tone_direct: 'Direkt',
    ph_jobDescription: 'Stellenbeschreibung einfügen oder die wichtigsten Anforderungen beschreiben…',
    ph_experience: 'Stationen, Aufgaben, Erfolge…', ph_education: 'Abschlüsse, Weiterbildungen, Zertifikate…',
    ph_skills: 'Fachlich und persönlich, z.B. Projektleitung, Deutsch/Französisch, CRM…',
    ph_motivation: 'Warum diese Stelle? Warum diese Firma?…',
    back: 'Zurück', next: 'Weiter', to_preview: 'Zur Vorschau',
    preview_title: 'Deine Bewerbung', preview_sub: 'Live-Vorschau im gewählten Design. Generiere den Text mit KI und exportiere als PDF oder Word.',
    saved_title: 'Deine gespeicherte Bewerbung', saved_sub: 'Bearbeite den Text mit dem Stift, exportiere als PDF oder Word, oder generiere bei Bedarf neu.',
    save_application: 'Bewerbung speichern', saved: 'Gespeichert', saving: 'Speichern…',
    load_saved: 'Gespeicherte Bewerbungen', load: 'Öffnen', no_saved: 'Noch keine gespeicherten Bewerbungen.',
    subject: 'Bewerbung als', attachment_note: 'Beilagen: Lebenslauf, Zeugnisse',
    greeting: 'Sehr geehrte Damen und Herren,', closing: 'Freundliche Grüsse',
    motivation_placeholder: 'Dein Bewerbungstext erscheint hier. Fülle das Formular aus, dein Motivations-Text bildet den Kern des Anschreibens. Im nächsten Schritt verfeinert die KI daraus ein vollständiges, professionelles Anschreiben.',
    profile_title: 'Profil', skills_title: 'Fähigkeiten', exp_title: 'Erfahrung', edu_title: 'Ausbildung',
    locked_title: 'Pro-Tool', locked_text: 'Der Bewerbungs-Generator ist Teil des Pro-Plans.', locked_cta: 'Pläne ansehen',
    required_hint: 'Vorname, Nachname, Zielfirma und Stelle ausfüllen, um fortzufahren.',
    generate: 'Mit KI generieren', regenerate: 'Neu generieren', generating: 'KI schreibt deine Bewerbung…',
    empty_preview_hint: 'Fast geschafft. Klicke jetzt auf "Mit KI generieren", dann schreibt die KI in wenigen Sekunden deine vollständige Bewerbung mit Kurzprofil, passenden Skills und Interview-Vorbereitung.',
    gen_error: 'Generierung fehlgeschlagen. Bitte versuche es erneut.',
    edit_letter: 'Text bearbeiten', done_editing: 'Fertig',
    click_to_edit: 'Klicke auf den Brief, um den Text zu bearbeiten', edit_hint: 'Bearbeite den Brieftext. Die Vorschau oben aktualisiert sich sofort.',
    extras_summary: 'CV-Kurzprofil', extras_skills: 'Passende Skills', extras_interview: 'Interview-Vorbereitung',
    export_pdf: 'PDF herunterladen', export_word: 'Word herunterladen', exporting: 'Exportiere…',
    interview_hint: '10 mögliche Fragen mit Antwortvorschlägen',
    quota_free: '{used}/3 Gratis-Versuche', quota_pro_month: '{used}/{cap} diesen Monat', quota_pro_day: '{used}/20 heute',
    quota_free_done: 'Gratis-Versuche aufgebraucht', quota_pro_month_done: 'Monatslimit erreicht', quota_pro_day_done: 'Tageslimit erreicht',
    job_url_title: 'Stelle per Link laden', job_url_sub: 'Füge die URL der Stellenanzeige ein (Yousty, jobs.ch, LinkedIn, Firmen-Karriereseite …). Stella liest sie aus und füllt Firma, Position und Anforderungen automatisch.',
    job_url_ph: 'https://www.yousty.ch/... oder linkedin.com/jobs/...', job_url_btn: 'Laden', job_url_loading: 'Lese Stelle …',
    job_fetch_ok: 'Stelle übernommen. Bitte kurz prüfen.', job_fetch_error: 'Konnte die Stelle nicht laden. Bitte Text manuell einfügen.',
    use_cv_label: 'Meinen hochgeladenen Lebenslauf verwenden', use_cv_hint: 'Stella nutzt deinen Lebenslauf für Erfahrung, Ausbildung und Skills.', no_cv_hint: 'Noch kein Lebenslauf hochgeladen. Klicke unten, um einen hinzuzufügen, oder fülle die Felder manuell aus.',
    badge_new: 'Neu',
    cv_upload_btn: 'Lebenslauf hochladen', cv_uploading: 'Lade …', cv_upload_ok: 'Lebenslauf importiert.',
    photo_title: 'Foto', photo_hint: 'Optional. Quadratisch oder Hochformat, JPG/PNG.', photo_upload: 'Foto hochladen', photo_replace: 'Foto ändern', photo_remove: 'Entfernen',
    try_example: 'Mit Beispiel ausprobieren', try_example_sub: 'Beispiel-Bewerbung mit realistischen Schweizer Daten und Foto, direkt zur Vorschau.',
  },
  FR: {
    step_design: 'Design', step_data: 'Données', step_preview: 'Aperçu',
    pick_design: 'Choisis ton design', pick_design_sub: 'Six mises en page originales, conçues pour le marché suisse. Ou crée la tienne.',
    own_design: 'Design personnel', own_design_new: 'Créer un nouveau design',
    d_klassisch: 'Classique', d_modern: 'Moderne', d_minimal: 'Minimaliste', d_elegant: 'Élégant', d_kreativ: 'Créatif', d_management: 'Management',
    builder_title: 'Design personnel', builder_name: 'Nom du design', builder_name_ph: 'p.ex. Mon style',
    builder_accent: 'Couleur d\'accent', builder_font: 'Police', builder_layout: 'Style de mise en page',
    font_serif: 'Serif', font_sans: 'Sans-serif', font_mix: 'Combiné',
    layout_classic: 'Classique centré', layout_sidebar: 'Barre latérale', layout_minimal: 'Minimal', layout_elegant: 'Élégant', layout_block: 'Bloc de couleur', layout_executive: 'Executive',
    save_design: 'Enregistrer le design', cancel: 'Annuler', delete: 'Supprimer',
    sec_person: 'Données personnelles', sec_job: 'Poste visé', sec_profile: 'Ton profil',
    f_firstName: 'Prénom', f_lastName: 'Nom', f_address: 'Adresse', f_phone: 'Téléphone', f_email: 'E-mail',
    f_currentRole: 'Profession / rôle actuel', f_targetCompany: 'Entreprise visée', f_targetPosition: 'Poste',
    f_jobDescription: 'Description du poste', f_experience: 'Expérience professionnelle', f_education: 'Formation',
    f_skills: 'Compétences', f_motivation: 'Motivation', f_tone: 'Tonalité souhaitée',
    tone_prof: 'Professionnel', tone_conf: 'Confiant', tone_warm: 'Chaleureux', tone_direct: 'Direct',
    ph_jobDescription: 'Colle la description du poste ou décris les exigences principales…',
    ph_experience: 'Étapes, responsabilités, succès…', ph_education: 'Diplômes, formations continues, certificats…',
    ph_skills: 'Techniques et personnelles, p.ex. gestion de projet, allemand/français, CRM…',
    ph_motivation: 'Pourquoi ce poste ? Pourquoi cette entreprise ?…',
    back: 'Retour', next: 'Continuer', to_preview: 'Voir l\'aperçu',
    preview_title: 'Ta candidature', preview_sub: 'Aperçu en direct dans le design choisi. Génère le texte avec l\'IA et exporte en PDF ou Word.',
    saved_title: 'Ta candidature enregistrée', saved_sub: 'Modifie le texte avec le crayon, exporte en PDF ou Word, ou régénère si besoin.',
    save_application: 'Enregistrer la candidature', saved: 'Enregistré', saving: 'Enregistrement…',
    load_saved: 'Candidatures enregistrées', load: 'Ouvrir', no_saved: 'Aucune candidature enregistrée.',
    subject: 'Candidature au poste de', attachment_note: 'Annexes : CV, certificats',
    greeting: 'Madame, Monsieur,', closing: 'Meilleures salutations',
    motivation_placeholder: 'Ton texte de candidature apparaîtra ici. Remplis le formulaire, ton texte de motivation forme le cœur de la lettre. À l\'étape suivante, l\'IA en fera une lettre complète et professionnelle.',
    profile_title: 'Profil', skills_title: 'Compétences', exp_title: 'Expérience', edu_title: 'Formation',
    locked_title: 'Outil Pro', locked_text: 'Le générateur de candidature fait partie du plan Pro.', locked_cta: 'Voir les plans',
    required_hint: 'Remplis prénom, nom, entreprise et poste pour continuer.',
    generate: 'Générer avec l\'IA', regenerate: 'Régénérer', generating: 'L\'IA rédige ta candidature…',
    empty_preview_hint: 'Presque fini. Clique sur "Générer avec l\'IA" et l\'IA rédige en quelques secondes ta candidature complète, avec profil court, compétences et préparation à l\'entretien.',
    gen_error: 'Échec de la génération. Réessaie.',
    edit_letter: 'Modifier le texte', done_editing: 'Terminé',
    click_to_edit: 'Clique sur la lettre pour modifier le texte', edit_hint: 'Modifie le texte de la lettre. L\'aperçu ci-dessus se met à jour aussitôt.',
    extras_summary: 'Profil CV', extras_skills: 'Compétences adaptées', extras_interview: 'Préparation à l\'entretien',
    export_pdf: 'Télécharger le PDF', export_word: 'Télécharger Word', exporting: 'Export en cours…',
    interview_hint: '10 questions possibles avec suggestions de réponses',
    quota_free: '{used}/3 essais gratuits', quota_pro_month: '{used}/{cap} ce mois', quota_pro_day: '{used}/20 aujourd\'hui',
    quota_free_done: 'Essais gratuits épuisés', quota_pro_month_done: 'Limite mensuelle atteinte', quota_pro_day_done: 'Limite journalière atteinte',
    job_url_title: 'Charger une offre par lien', job_url_sub: "Colle l'URL de l'offre (Yousty, jobs.ch, LinkedIn, page carrière …). Stella la lit et remplit l'entreprise, le poste et les exigences automatiquement.",
    job_url_ph: 'https://www.yousty.ch/... ou linkedin.com/jobs/...', job_url_btn: 'Charger', job_url_loading: "Lecture de l'offre …",
    job_fetch_ok: 'Offre importée. Merci de vérifier.', job_fetch_error: "Impossible de charger l'offre. Colle le texte manuellement.",
    use_cv_label: 'Utiliser mon CV téléchargé', use_cv_hint: 'Stella utilise ton CV pour expérience, formation et compétences.', no_cv_hint: 'Aucun CV téléchargé. Clique ci-dessous pour en ajouter un, ou remplis les champs manuellement.',
    badge_new: 'Nouveau',
    cv_upload_btn: 'Téléverser un CV', cv_uploading: 'Chargement …', cv_upload_ok: 'CV importé.',
    photo_title: 'Photo', photo_hint: 'Optionnel. Carré ou portrait, JPG/PNG.', photo_upload: 'Téléverser une photo', photo_replace: 'Changer la photo', photo_remove: 'Supprimer',
    try_example: 'Essayer avec un exemple', try_example_sub: 'Candidature exemple avec données suisses réalistes et photo, directement vers l\'aperçu.',
  },
  IT: {
    step_design: 'Design', step_data: 'Dati', step_preview: 'Anteprima',
    pick_design: 'Scegli il tuo design', pick_design_sub: 'Sei layout originali, pensati per il mercato svizzero. Oppure crea il tuo.',
    own_design: 'Design personale', own_design_new: 'Crea un nuovo design',
    d_klassisch: 'Classico', d_modern: 'Moderno', d_minimal: 'Minimalista', d_elegant: 'Elegante', d_kreativ: 'Creativo', d_management: 'Management',
    builder_title: 'Design personale', builder_name: 'Nome del design', builder_name_ph: 'es. Il mio stile',
    builder_accent: 'Colore accento', builder_font: 'Carattere', builder_layout: 'Stile layout',
    font_serif: 'Serif', font_sans: 'Sans-serif', font_mix: 'Combinato',
    layout_classic: 'Classico centrato', layout_sidebar: 'Barra laterale', layout_minimal: 'Minimal', layout_elegant: 'Elegante', layout_block: 'Blocco colore', layout_executive: 'Executive',
    save_design: 'Salva design', cancel: 'Annulla', delete: 'Elimina',
    sec_person: 'Dati personali', sec_job: 'Posizione desiderata', sec_profile: 'Il tuo profilo',
    f_firstName: 'Nome', f_lastName: 'Cognome', f_address: 'Indirizzo', f_phone: 'Telefono', f_email: 'E-mail',
    f_currentRole: 'Professione / ruolo attuale', f_targetCompany: 'Azienda', f_targetPosition: 'Posizione',
    f_jobDescription: 'Descrizione della posizione', f_experience: 'Esperienza professionale', f_education: 'Formazione',
    f_skills: 'Competenze', f_motivation: 'Motivazione', f_tone: 'Tonalità desiderata',
    tone_prof: 'Professionale', tone_conf: 'Sicuro', tone_warm: 'Cordiale', tone_direct: 'Diretto',
    ph_jobDescription: 'Incolla la descrizione della posizione o descrivi i requisiti principali…',
    ph_experience: 'Tappe, responsabilità, successi…', ph_education: 'Diplomi, perfezionamenti, certificati…',
    ph_skills: 'Tecniche e personali, es. gestione progetti, tedesco/francese, CRM…',
    ph_motivation: 'Perché questa posizione? Perché questa azienda?…',
    back: 'Indietro', next: 'Avanti', to_preview: 'Vai all\'anteprima',
    preview_title: 'La tua candidatura', preview_sub: 'Anteprima live nel design scelto. Genera il testo con l\'IA ed esporta in PDF o Word.',
    saved_title: 'La tua candidatura salvata', saved_sub: 'Modifica il testo con la matita, esporta in PDF o Word, o rigenera se necessario.',
    save_application: 'Salva candidatura', saved: 'Salvato', saving: 'Salvataggio…',
    load_saved: 'Candidature salvate', load: 'Apri', no_saved: 'Nessuna candidatura salvata.',
    subject: 'Candidatura come', attachment_note: 'Allegati: CV, certificati',
    greeting: 'Gentili Signore e Signori,', closing: 'Cordiali saluti',
    motivation_placeholder: 'Il tuo testo di candidatura apparirà qui. Compila il modulo: il testo di motivazione è il cuore della lettera. Al prossimo passo l\'IA lo trasformerà in una lettera completa e professionale.',
    profile_title: 'Profilo', skills_title: 'Competenze', exp_title: 'Esperienza', edu_title: 'Formazione',
    locked_title: 'Strumento Pro', locked_text: 'Il generatore di candidature fa parte del piano Pro.', locked_cta: 'Vedi i piani',
    required_hint: 'Compila nome, cognome, azienda e posizione per continuare.',
    generate: 'Genera con l\'IA', regenerate: 'Rigenera', generating: 'L\'IA scrive la tua candidatura…',
    empty_preview_hint: 'Quasi fatto. Clicca su "Genera con l\'IA" e l\'IA scrive in pochi secondi la tua candidatura completa, con profilo breve, competenze e preparazione al colloquio.',
    gen_error: 'Generazione non riuscita. Riprova.',
    edit_letter: 'Modifica il testo', done_editing: 'Fatto',
    click_to_edit: 'Clicca sulla lettera per modificare il testo', edit_hint: 'Modifica il testo della lettera. L\'anteprima qui sopra si aggiorna subito.',
    extras_summary: 'Profilo CV', extras_skills: 'Competenze adatte', extras_interview: 'Preparazione al colloquio',
    export_pdf: 'Scarica PDF', export_word: 'Scarica Word', exporting: 'Esportazione…',
    interview_hint: '10 possibili domande con suggerimenti di risposta',
    quota_free: '{used}/3 tentativi gratuiti', quota_pro_month: '{used}/{cap} questo mese', quota_pro_day: '{used}/20 oggi',
    quota_free_done: 'Tentativi gratuiti esauriti', quota_pro_month_done: 'Limite mensile raggiunto', quota_pro_day_done: 'Limite giornaliero raggiunto',
    job_url_title: 'Carica annuncio da link', job_url_sub: "Incolla l'URL dell'annuncio (Yousty, jobs.ch, LinkedIn, pagina carriere …). Stella lo legge e compila azienda, posizione e requisiti automaticamente.",
    job_url_ph: 'https://www.yousty.ch/... o linkedin.com/jobs/...', job_url_btn: 'Carica', job_url_loading: "Lettura dell'annuncio …",
    job_fetch_ok: 'Annuncio importato. Verifica per favore.', job_fetch_error: "Impossibile caricare l'annuncio. Incolla il testo manualmente.",
    use_cv_label: 'Usa il mio CV caricato', use_cv_hint: 'Stella usa il tuo CV per esperienza, formazione e competenze.', no_cv_hint: 'Nessun CV caricato. Clicca qui sotto per aggiungerne uno, oppure compila i campi manualmente.',
    badge_new: 'Nuovo',
    cv_upload_btn: 'Carica CV', cv_uploading: 'Caricamento …', cv_upload_ok: 'CV importato.',
    photo_title: 'Foto', photo_hint: 'Opzionale. Quadrato o verticale, JPG/PNG.', photo_upload: 'Carica foto', photo_replace: 'Cambia foto', photo_remove: 'Rimuovi',
    try_example: 'Prova con un esempio', try_example_sub: 'Candidatura di esempio con dati svizzeri realistici e foto, direttamente all\'anteprima.',
  },
  EN: {
    step_design: 'Design', step_data: 'Details', step_preview: 'Preview',
    pick_design: 'Pick your design', pick_design_sub: 'Six original layouts, built for the Swiss job market. Or create your own.',
    own_design: 'Custom design', own_design_new: 'Create a new design',
    d_klassisch: 'Classic', d_modern: 'Modern', d_minimal: 'Minimalist', d_elegant: 'Elegant', d_kreativ: 'Creative', d_management: 'Management',
    builder_title: 'Custom design', builder_name: 'Design name', builder_name_ph: 'e.g. My style',
    builder_accent: 'Accent colour', builder_font: 'Font', builder_layout: 'Layout style',
    font_serif: 'Serif', font_sans: 'Sans-serif', font_mix: 'Combined',
    layout_classic: 'Classic centred', layout_sidebar: 'Sidebar', layout_minimal: 'Minimal', layout_elegant: 'Elegant', layout_block: 'Colour block', layout_executive: 'Executive',
    save_design: 'Save design', cancel: 'Cancel', delete: 'Delete',
    sec_person: 'Personal details', sec_job: 'Target position', sec_profile: 'Your profile',
    f_firstName: 'First name', f_lastName: 'Last name', f_address: 'Address', f_phone: 'Phone', f_email: 'Email',
    f_currentRole: 'Profession / current role', f_targetCompany: 'Target company', f_targetPosition: 'Position',
    f_jobDescription: 'Job description', f_experience: 'Work experience', f_education: 'Education',
    f_skills: 'Skills', f_motivation: 'Motivation', f_tone: 'Preferred tone',
    tone_prof: 'Professional', tone_conf: 'Confident', tone_warm: 'Friendly', tone_direct: 'Direct',
    ph_jobDescription: 'Paste the job description or describe the key requirements…',
    ph_experience: 'Roles, responsibilities, achievements…', ph_education: 'Degrees, further training, certificates…',
    ph_skills: 'Technical and personal, e.g. project management, German/French, CRM…',
    ph_motivation: 'Why this role? Why this company?…',
    back: 'Back', next: 'Next', to_preview: 'See preview',
    preview_title: 'Your application', preview_sub: 'Live preview in your chosen design. Generate the text with AI and export as PDF or Word.',
    saved_title: 'Your saved application', saved_sub: 'Edit the text with the pencil, export as PDF or Word, or regenerate if needed.',
    save_application: 'Save application', saved: 'Saved', saving: 'Saving…',
    load_saved: 'Saved applications', load: 'Open', no_saved: 'No saved applications yet.',
    subject: 'Application for the position of', attachment_note: 'Enclosures: CV, references',
    greeting: 'Dear Sir or Madam,', closing: 'Kind regards',
    motivation_placeholder: 'Your application text will appear here. Fill in the form. your motivation text forms the core of the letter. In the next step, the AI turns it into a complete, professional cover letter.',
    profile_title: 'Profile', skills_title: 'Skills', exp_title: 'Experience', edu_title: 'Education',
    locked_title: 'Pro Tool', locked_text: 'The application generator is part of the Pro plan.', locked_cta: 'See plans',
    required_hint: 'Fill in first name, last name, company and position to continue.',
    generate: 'Generate with AI', regenerate: 'Regenerate', generating: 'The AI is writing your application…',
    empty_preview_hint: 'Almost there. Click "Generate with AI" and in a few seconds the AI writes your full application, with a short profile, matching skills and interview preparation.',
    gen_error: 'Generation failed. Please try again.',
    edit_letter: 'Edit text', done_editing: 'Done',
    click_to_edit: 'Click the letter to edit the text', edit_hint: 'Edit the letter text. The preview above updates instantly.',
    extras_summary: 'CV profile', extras_skills: 'Matching skills', extras_interview: 'Interview prep',
    export_pdf: 'Download PDF', export_word: 'Download Word', exporting: 'Exporting…',
    interview_hint: '10 possible questions with suggested answers',
    quota_free: '{used}/3 free attempts', quota_pro_month: '{used}/{cap} this month', quota_pro_day: '{used}/20 today',
    quota_free_done: 'Free attempts used up', quota_pro_month_done: 'Monthly limit reached', quota_pro_day_done: 'Daily limit reached',
    job_url_title: 'Load job from link', job_url_sub: 'Paste the job posting URL (Yousty, jobs.ch, LinkedIn, a company careers page …). Stella reads it and fills company, position and requirements automatically.',
    job_url_ph: 'https://www.yousty.ch/... or linkedin.com/jobs/...', job_url_btn: 'Load', job_url_loading: 'Reading job …',
    job_fetch_ok: 'Job imported. Please review.', job_fetch_error: 'Could not load the job. Please paste the text manually.',
    use_cv_label: 'Use my uploaded CV', use_cv_hint: 'Stella uses your CV for experience, education and skills.', no_cv_hint: 'No CV uploaded yet. Click below to add one, or fill in the fields manually.',
    badge_new: 'New',
    cv_upload_btn: 'Upload CV', cv_uploading: 'Uploading …', cv_upload_ok: 'CV imported.',
    photo_title: 'Photo', photo_hint: 'Optional. Square or portrait, JPG/PNG.', photo_upload: 'Upload photo', photo_replace: 'Replace photo', photo_remove: 'Remove',
    try_example: 'Try with example', try_example_sub: 'Sample application with realistic Swiss data and photo, straight to the preview.',
  },
};

/* ── Document renderer ───────────────────────────────────────────────────────
   One renderer for every design. Pure HTML/CSS so the same markup can be
   printed to PDF in phase 2. Dimensions are A4-proportional (1:1.414). */

export const ApplicationDocument = memo(({ design, form, s, generatedText, editable, onBodyChange }: {
  design: DesignConfig; form: ApplicationForm; s: Record<string, string>; generatedText?: string | null;
  /** When true the cover-letter body can be edited directly in the document.
      Only the on-screen preview passes this; the export render never does. */
  editable?: boolean;
  /** Called on blur with the edited letter text. Kept stable (useCallback) by
      the parent so memo keeps the document mounted while typing (no cursor jump). */
  onBodyChange?: (text: string) => void;
}) => {
  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const headFont = design.font === 'sans' ? sans : serif;
  const bodyFont = design.font === 'serif' ? serif : sans;
  const a = design.accent;
  const fullName = [form.firstName, form.lastName].filter(Boolean).join(' ') || '-';
  const contactBits = [form.address, form.phone, form.email].filter(Boolean);
  const bodyText = generatedText || form.motivation || s.motivation_placeholder;
  const today = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

  /** Photo helper — rendered as a fixed-width img so html2canvas captures
      it cleanly. Returns null when no photo is set, so the existing
      layouts keep their photo-less behaviour. The photo is always a
      same-origin data: URL, so NO crossOrigin attribute, setting it
      breaks rendering + html2canvas capture in Safari. */
  const Photo = ({ size = 88, rounded = false, border }: { size?: number; rounded?: boolean; border?: string }) => {
    if (!form.photo) return null;
    return (
      <img
        src={form.photo}
        alt=""
        style={{
          width: size,
          height: Math.round(size * 1.25),
          objectFit: 'cover',
          borderRadius: rounded ? '50%' : 2,
          border,
          display: 'block',
        }}
      />
    );
  };

  const Body = () => (
    <div style={{ fontFamily: bodyFont, fontSize: 11, lineHeight: 1.9, color: '#26261F' }}>
      <p style={{ marginBottom: 12, color: '#6B6B66' }}>{today}</p>
      <p style={{ fontWeight: 700, marginBottom: 16, color: a, fontSize: 11.5 }}>
        {s.subject} {form.targetPosition || '…'}{form.targetCompany ? ` · ${form.targetCompany}` : ''}
      </p>
      <p style={{ marginBottom: 12 }}>{s.greeting}</p>
      {editable && generatedText ? (
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onBodyChange?.((e.currentTarget as HTMLElement).innerText)}
          className="stellify-letter-edit"
          style={{ whiteSpace: 'pre-wrap', marginBottom: 16, outline: 'none', cursor: 'text', borderRadius: 3, padding: '3px 5px', margin: '0 -5px 16px' }}
        >
          {bodyText}
        </p>
      ) : (
        <p style={{ whiteSpace: 'pre-wrap', marginBottom: 16, opacity: generatedText || form.motivation ? 1 : 0.45, fontStyle: generatedText || form.motivation ? 'normal' : 'italic' }}>
          {bodyText}
        </p>
      )}
      <p style={{ marginBottom: 4 }}>{s.closing}</p>
      <p style={{ fontWeight: 600 }}>{fullName}</p>
      <p style={{ marginTop: 16, fontSize: 9, color: '#9A9A94' }}>{s.attachment_note}</p>
    </div>
  );

  const SideMeta = () => (
    <div style={{ fontFamily: bodyFont, fontSize: 8.5, lineHeight: 1.7 }}>
      {form.currentRole && (<div style={{ marginBottom: 12 }}><p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 7.5, marginBottom: 3 }}>{s.profile_title}</p><p>{form.currentRole}</p></div>)}
      {form.skills && (<div style={{ marginBottom: 12 }}><p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 7.5, marginBottom: 3 }}>{s.skills_title}</p><p style={{ whiteSpace: 'pre-wrap' }}>{form.skills}</p></div>)}
      {form.education && (<div><p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 7.5, marginBottom: 3 }}>{s.edu_title}</p><p style={{ whiteSpace: 'pre-wrap' }}>{form.education}</p></div>)}
    </div>
  );

  /* Layout variants. each visually distinct, all original work */
  if (design.layout === 'sidebar') {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: '#fff' }}>
        <div style={{ width: '32%', background: a, color: '#fff', padding: '28px 18px' }}>
          {form.photo && <div style={{ marginBottom: 14 }}><Photo size={110} border="1px solid rgba(255,255,255,.2)" /></div>}
          <p style={{ fontFamily: headFont, fontSize: 17, fontWeight: 700, lineHeight: 1.2, marginBottom: 4, overflowWrap: 'break-word', hyphens: 'auto' }}>{fullName}</p>
          {form.currentRole && <p style={{ fontSize: 8.5, opacity: 0.75, marginBottom: 16 }}>{form.currentRole}</p>}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.25)', paddingTop: 12, fontSize: 8.5, lineHeight: 1.8, opacity: 0.92 }}>
            {contactBits.map((b, i) => <p key={i}>{b}</p>)}
          </div>
          <div style={{ marginTop: 20, opacity: 0.92 }}><SideMeta /></div>
        </div>
        <div style={{ flex: 1, padding: '28px 24px' }}><Body /></div>
      </div>
    );
  }

  if (design.layout === 'block') {
    return (
      <div style={{ background: '#fff', minHeight: '100%' }}>
        <div style={{ background: a, color: '#fff', padding: '26px 28px 20px', display: 'flex', gap: 18, alignItems: 'center' }}>
          {form.photo && <Photo size={80} rounded border="2px solid rgba(255,255,255,.5)" />}
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: headFont, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{fullName}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 6, fontSize: 8.5, opacity: 0.85 }}>
              {contactBits.map((b, i) => <span key={i}>{b}</span>)}
            </div>
          </div>
        </div>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${a} 0%, ${a}55 60%, transparent 100%)` }} />
        <div style={{ padding: '24px 28px' }}><Body /></div>
      </div>
    );
  }

  if (design.layout === 'executive') {
    return (
      <div style={{ background: '#fff', minHeight: '100%' }}>
        <div style={{ borderBottom: `3px solid ${a}`, padding: '26px 28px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            {form.photo && <Photo size={70} border={`1px solid ${a}33`} />}
            <div>
              <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: a }}>{fullName}</p>
              {form.currentRole && <p style={{ fontFamily: sans, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 2, color: '#6B6B66', marginTop: 2 }}>{form.currentRole}</p>}
            </div>
          </div>
          <div style={{ fontFamily: sans, fontSize: 8, textAlign: 'right', color: '#6B6B66', lineHeight: 1.7 }}>
            {contactBits.map((b, i) => <p key={i}>{b}</p>)}
          </div>
        </div>
        <div style={{ padding: '22px 28px' }}><Body /></div>
      </div>
    );
  }

  if (design.layout === 'elegant') {
    return (
      <div style={{ background: '#fff', minHeight: '100%', padding: '30px 34px' }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          {form.photo && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Photo size={72} rounded border={`1px solid ${a}55`} /></div>}
          <p style={{ fontFamily: serif, fontSize: 21, fontStyle: 'italic', color: '#1A1A18' }}>{fullName}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 8, color: '#6B6B66', marginTop: 4, fontFamily: sans }}>
            {contactBits.map((b, i) => <span key={i}>{b}</span>)}
          </div>
        </div>
        <div style={{ width: 60, margin: '10px auto 4px', borderTop: `1px solid ${a}` }} />
        <div style={{ width: 36, margin: '0 auto 22px', borderTop: `1px solid ${a}` }} />
        <Body />
      </div>
    );
  }

  /* Minimal layout intentionally omits the photo — minimalism by design. */
  if (design.layout === 'minimal') {
    return (
      <div style={{ background: '#fff', minHeight: '100%', padding: '34px 36px' }}>
        <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 300, textTransform: 'uppercase', letterSpacing: 5, color: '#1A1A18', marginBottom: 2 }}>{fullName}</p>
        <p style={{ fontFamily: sans, fontSize: 8, color: '#9A9A94', marginBottom: 28 }}>{contactBits.join('  ·  ')}</p>
        <Body />
      </div>
    );
  }

  /* classic (default) */
  return (
    <div style={{ background: '#fff', minHeight: '100%', padding: '30px 32px' }}>
      <div style={{ textAlign: 'center', borderBottom: `1px solid ${a}33`, paddingBottom: 14, marginBottom: 20 }}>
        {form.photo && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Photo size={78} rounded border={`1px solid ${a}33`} /></div>}
        <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: '#1A1A18' }}>{fullName}</p>
        <p style={{ fontFamily: serif, fontSize: 8.5, color: '#6B6B66', marginTop: 3 }}>{contactBits.join(' · ')}</p>
      </div>
      <Body />
    </div>
  );
});

/* ── Mini preview used on the design cards ──────────────────────────────── */
const DesignThumb = ({ design }: { design: DesignConfig }) => {
  const a = design.accent;
  const bar = (w: string, o = 0.18) => <div style={{ height: 3, width: w, background: '#1A1A18', opacity: o, borderRadius: 1 }} />;
  return (
    <div className="w-full aspect-[3/4] bg-white border border-black/8 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {design.layout === 'sidebar' && (
        <div className="flex h-full">
          <div style={{ width: '32%', background: a }} />
          <div className="flex-1 p-2 space-y-1.5 pt-3">{bar('70%', 0.5)}{bar('90%')}{bar('85%')}{bar('88%')}{bar('60%')}</div>
        </div>
      )}
      {design.layout === 'block' && (
        <div className="h-full">
          <div style={{ height: '26%', background: a }} />
          <div className="p-2 space-y-1.5 pt-2.5">{bar('92%')}{bar('85%')}{bar('88%')}{bar('55%')}</div>
        </div>
      )}
      {design.layout === 'executive' && (
        <div className="h-full p-2">
          <div className="flex justify-between items-end pb-1.5" style={{ borderBottom: `2px solid ${a}` }}>
            {bar('45%', 0.55)}{bar('20%')}
          </div>
          <div className="space-y-1.5 pt-2">{bar('90%')}{bar('86%')}{bar('88%')}{bar('58%')}</div>
        </div>
      )}
      {design.layout === 'elegant' && (
        <div className="h-full p-2 flex flex-col items-center pt-3">
          {bar('40%', 0.5)}
          <div style={{ width: '30%', borderTop: `1px solid ${a}`, marginTop: 5 }} />
          <div style={{ width: '18%', borderTop: `1px solid ${a}`, marginTop: 2, marginBottom: 7 }} />
          <div className="w-full space-y-1.5 px-1">{bar('100%')}{bar('92%')}{bar('96%')}{bar('60%')}</div>
        </div>
      )}
      {design.layout === 'minimal' && (
        <div className="h-full p-2.5 pt-4 space-y-1.5">
          <div style={{ height: 3, width: '50%', background: '#1A1A18', opacity: 0.6, letterSpacing: 2 }} />
          <div style={{ height: 12 }} />
          {bar('95%')}{bar('88%')}{bar('92%')}{bar('55%')}
        </div>
      )}
      {design.layout === 'classic' && (
        <div className="h-full p-2 flex flex-col items-center pt-3">
          {bar('45%', 0.55)}
          <div style={{ width: '85%', borderTop: `1px solid ${a}66`, margin: '6px 0 7px' }} />
          <div className="w-full space-y-1.5 px-1">{bar('100%')}{bar('90%')}{bar('94%')}{bar('58%')}</div>
        </div>
      )}
    </div>
  );
};

/* ── Main component ──────────────────────────────────────────────────────── */

const ApplicationGenerator = ({ language, user, profile, cvContext, locked, onUpgrade, showToast, authFetch, onUploadCv, recordUsage, usage, initialTarget, initialDocId, onAddToTracker }: {
  language: string;
  user: { id: string; email?: string } | null;
  profile?: { firstName?: string; email?: string } | null;
  /** Prefill for company/position when opened from a tracker row. */
  initialTarget?: { company?: string; position?: string } | null;
  /** Open straight into this saved application (from the dashboard list). */
  initialDocId?: string | null;
  cvContext?: string;
  locked: boolean;
  onUpgrade: (reason?: 'quota' | 'daily', message?: string) => void;
  showToast: (msg: string, type?: string) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  /** Called when user picks a CV file inside the generator. Should parse it
      and hoist the text into the parent's cvContext. */
  onUploadCv?: (file: File) => Promise<void> | void;
  recordUsage?: (entry: { input: string; result: string }) => Promise<void>;
  /** Add the generated application to the tracker (company + position). Returns
      true if it was newly added, false if a matching entry already existed. */
  onAddToTracker?: (entry: { company: string; position: string }) => Promise<boolean> | boolean;
  usage?: { toolUses: number; dailyToolUses: number; isPro: boolean; isUnlimited: boolean };
}) => {
  const s = STR[language] || STR.DE;
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [design, setDesign] = useState<DesignConfig>(BUILT_IN_DESIGNS[0]);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [customDesigns, setCustomDesigns] = useState<(DesignConfig & { docId: string })[]>([]);
  const [savedApps, setSavedApps] = useState<any[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builder, setBuilder] = useState({ name: '', accent: ACCENT_PRESETS[0], font: 'sans' as DesignConfig['font'], layout: 'classic' as DesignConfig['layout'] });
  const [isSaving, setIsSaving] = useState(false);
  const [loadedDocId, setLoadedDocId] = useState<string | null>(null);
  const [gen, setGen] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // The letter is edited IN the document itself (contentEditable). Syncing only
  // on blur (not on every keystroke) keeps the memoised document mounted while
  // typing, so the cursor never jumps. Stable identity via useCallback so memo
  // holds during typing.
  const onLetterChange = useCallback((text: string) => {
    setGen(g => g ? { ...g, coverLetter: text } : g);
  }, []);
  // Place the caret into the letter and scroll it into view (from the pencil
  // button or a click on the document).
  const focusLetter = () => {
    setTimeout(() => {
      const el = document.querySelector('.stellify-letter-edit') as HTMLElement | null;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 40);
  };
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [isFetchingJob, setIsFetchingJob] = useState(false);
  const [useCv, setUseCv] = useState(true);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [trackerAdded, setTrackerAdded] = useState(false);
  // A fresh generation (or a changed target) re-arms the "add to tracker" button.
  useEffect(() => { setTrackerAdded(false); }, [gen, form.targetCompany, form.targetPosition]);

  // Each step starts from the top so the URL importer (and stepper) are
  // always immediately visible after navigation.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Opened from a tracker row: company + position arrive prefilled. Only
  // fills empty fields so it never overwrites the user's own edits.
  useEffect(() => {
    if (initialTarget && (initialTarget.company || initialTarget.position)) {
      setForm(prev => ({
        ...prev,
        targetCompany: prev.targetCompany || initialTarget.company || '',
        targetPosition: prev.targetPosition || initialTarget.position || '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadCv) return;
    setIsUploadingCv(true);
    try {
      await onUploadCv(file);
      setUseCv(true);
      showToast(s.cv_upload_ok, 'success');
    } catch (err: any) {
      showToast(err?.message || s.gen_error, 'error');
    } finally {
      setIsUploadingCv(false);
    }
  };

  const openCvFilePicker = () => cvFileInputRef.current?.click();

  /** Reads the picked image, downscales it to max 360 px wide (keeping
      aspect ratio), encodes as a JPEG data URL and stores in form.photo.
      Downscaling keeps the form-state payload small and prevents jspdf
      from choking on 10 MP phone photos. */
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(s.gen_error, 'error'); return; }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      const maxW = 360;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL('image/jpeg', 0.88);
      setForm(prev => ({ ...prev, photo: out }));
    } catch {
      showToast(s.gen_error, 'error');
    }
  };
  const openPhotoFilePicker = () => photoFileInputRef.current?.click();

  /** Loads a fully filled sample application (Marketing Manager · Nestlé)
      and jumps straight to the preview step. Lets visitors and new users
      see what a finished dossier looks like in one click, without typing
      anything. The current design pick is preserved. */
  // Illustrated sample portrait for the example flow — clearly a drawing,
  // never a real person, so the preview and the exports show how a photo
  // sits in every design. Converted to JPEG via canvas because Word/PDF
  // exports handle raster data URLs much more reliably than SVG.
  const EXAMPLE_PORTRAIT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    + '<rect width="100" height="100" fill="#DCE9E2"/>'
    + '<path d="M28 40 Q26 78 32 92 L68 92 Q74 78 72 40 Q71 22 50 22 Q29 22 28 40 Z" fill="#5B4630"/>'
    + '<path d="M22 100 Q24 74 50 74 Q76 74 78 100 Z" fill="#14352A"/>'
    + '<rect x="44" y="58" width="12" height="14" rx="5" fill="#F4C89C"/>'
    + '<circle cx="50" cy="44" r="19" fill="#F4C89C"/>'
    + '<path d="M31 46 Q29 23 50 23 Q71 23 69 46 Q68 34 60 32 Q50 28 40 32 Q32 34 31 46 Z" fill="#5B4630"/>'
    + '<circle cx="43" cy="45" r="2.1" fill="#2A2622"/><circle cx="57" cy="45" r="2.1" fill="#2A2622"/>'
    + '<path d="M45 53 Q50 57 55 53" stroke="#2A2622" stroke-width="1.7" stroke-linecap="round" fill="none"/>'
    + '</svg>';
  const loadExamplePortrait = (): Promise<string> => new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 360; c.height = 360;
          const ctx = c.getContext('2d');
          if (!ctx) { resolve(''); return; }
          ctx.drawImage(img, 0, 0, 360, 360);
          resolve(c.toDataURL('image/jpeg', 0.9));
        } catch { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(EXAMPLE_PORTRAIT_SVG);
    } catch { resolve(''); }
  });

  const loadExample = () => {
    const sample: ApplicationForm = {
      firstName: (form.firstName || profile?.firstName || 'Anna').trim(),
      // Always a non-empty last name: an empty one would fail canProceed
      // and lock the user out of re-reaching the preview from step 1.
      lastName: form.lastName || 'Müller',
      address: form.address || 'Bahnhofstrasse 12, 8001 Zürich',
      phone: form.phone || '+41 79 123 45 67',
      email: form.email || profile?.email || 'anna.mueller@example.ch',
      currentRole: form.currentRole || 'Brand Strategist',
      targetCompany: 'Nestlé Suisse SA',
      targetPosition: 'Marketing Manager',
      jobDescription: 'Marketing Manager (m/w/d), Vevey. Verantwortung für die Markenführung im DACH-Markt, Budget CHF 1 bis 2 Mio., Erfahrung mit nachhaltigen FMCG-Marken erwünscht. Sehr gute Deutsch- und Französischkenntnisse Voraussetzung.',
      experience: 'Senior Brand Manager bei Schweizer FMCG-Player (2021 bis heute): Markenführung mit Budget CHF 1,2 Mio., +28% Brand Awareness, zwei Produkt-Launches DACH.\nBrand Manager bei Westschweizer Konsumgüter-Marke (2018 bis 2021): Aufbau Social-Media-Strategie, CRM-Programm mit 80k aktiven Kunden.',
      education: 'MSc Marketing & International Management, Universität St. Gallen (HSG).\nBSc Betriebswirtschaft, ZHAW Winterthur.\nCAS Digital Marketing, HWZ Zürich.',
      skills: 'Brand Strategy · CRM · Social Media · Performance Marketing · Analytics · A/B-Testing · Stakeholder Management · Deutsch (Muttersprache) · Französisch (C1) · Englisch (C1) · IT: Excel, Power BI, Salesforce Marketing Cloud, HubSpot, Figma.',
      motivation: 'Nestlé verbindet Schweizer Wurzeln mit globaler Reichweite. Genau in diesem Umfeld möchte ich Verantwortung für eine starke Marke übernehmen und mit datengetriebenem Marketing nachhaltiges Wachstum schaffen.',
      tone: 'confident',
      photo: form.photo || '',
    };
    setForm(sample);
    setStep(2);
    // Attach the illustrated portrait when the user has no own photo yet —
    // async so the step switch stays instant.
    if (!sample.photo) {
      loadExamplePortrait().then((dataUrl) => {
        if (dataUrl) setForm(prev => (prev.photo ? prev : { ...prev, photo: dataUrl }));
      });
    }
  };

  // Prefill the applicant's name + email from the account once, on mount.
  // Only fills empty fields so it never overwrites the user's own edits.
  useEffect(() => {
    if (!profile) return;
    setForm(prev => {
      const next = { ...prev };
      if (!next.firstName && profile.firstName) next.firstName = profile.firstName;
      if (!next.email && profile.email) next.email = profile.email;
      // Derive a last name from the email ONLY when it's clearly safe.
      // Safe = the local part is `firstname.lastname` (or _ / -) AND the
      // first token matches the user's known firstName. That covers the
      // common 'josua.schwarzentruber@…' case without ever guessing on
      // handles like 'jschwarz@…' or 'cool.dude@…'.
      const fn = (next.firstName || profile.firstName || '').trim().toLowerCase();
      if (!next.lastName && fn && profile.email) {
        const local = profile.email.split('@')[0] || '';
        const parts = local.split(/[._-]/).filter(Boolean);
        if (parts.length >= 2 && parts[0].toLowerCase() === fn) {
          const guess = parts.slice(1)
            .filter(p => /^[a-zà-öø-ÿ]{2,}$/i.test(p))
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(' ');
          if (guess) next.lastName = guess;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull a job posting from a pasted URL and fill company / position / job desc.
  const fetchJobFromUrl = async () => {
    const u = jobUrl.trim();
    if (!u) return;
    setIsFetchingJob(true);
    try {
      const res = await authFetch('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || s.job_fetch_error, 'error');
        return;
      }
      setForm(prev => ({
        ...prev,
        targetCompany: data.company || prev.targetCompany,
        targetPosition: data.position || prev.targetPosition,
        jobDescription: data.requirements
          ? (prev.jobDescription ? prev.jobDescription + '\n\n' + data.requirements : data.requirements)
          : prev.jobDescription,
      }));
      showToast(s.job_fetch_ok, 'success');
    } catch (e: any) {
      showToast(e?.message || s.job_fetch_error, 'error');
    } finally {
      setIsFetchingJob(false);
    }
  };

  const toneLabel = (v: string) => v === 'confident' ? (s as any).tone_conf : v === 'friendly' ? (s as any).tone_warm : v === 'direct' ? (s as any).tone_direct : (s as any).tone_prof;

  /* Mirror handleProcessTool gating: same thresholds, same messages. */
  // Must mirror the server QUOTA in api/index.ts:
  //   Free: 3 lifetime · Pro: 50/month · Karriere+ (role 'unlimited'): 150/month
  // No daily cap any more. only the monthly limit + per-minute fair-use guard.
  const quotaInfo = (() => {
    if (!usage) return null;
    if (!usage.isPro) {
      const used = Math.min(usage.toolUses, 3);
      const done = used >= 3;
      return { label: s.quota_free.replace('{used}', String(used)), done, doneLabel: s.quota_free_done };
    }
    const cap = usage.isUnlimited ? 150 : 50;
    const used = usage.toolUses;
    const done = used >= cap;
    const label = s.quota_pro_month.replace('{used}', String(used)).replace('{cap}', String(cap));
    return { label, done, doneLabel: s.quota_pro_month_done };
  })();
  const quotaBlocked = !!quotaInfo?.done;

  const generate = async () => {
    if (quotaBlocked) { onUpgrade(); return; }
    setIsGenerating(true);
    try {
      const cvForPrompt = (useCv && cvContext) ? cvContext.substring(0, 2500) : '';
      const prompt = `Erstelle eine vollständige Bewerbung basierend auf diesen Angaben.

BEWERBER: ${form.firstName} ${form.lastName}${form.currentRole ? `, aktuell: ${form.currentRole}` : ''}
ZIELFIRMA: ${form.targetCompany}
STELLE: ${form.targetPosition}
${form.jobDescription ? `STELLENBESCHREIBUNG: ${form.jobDescription.substring(0, 1500)}` : ''}
${cvForPrompt ? `LEBENSLAUF DES BEWERBERS (nutze diese echten Angaben für Erfahrung, Ausbildung und Fähigkeiten): ${cvForPrompt}` : ''}
${form.experience ? `BERUFSERFAHRUNG: ${form.experience.substring(0, 1200)}` : ''}
${form.education ? `AUSBILDUNG: ${form.education.substring(0, 600)}` : ''}
${form.skills ? `FÄHIGKEITEN: ${form.skills.substring(0, 600)}` : ''}
${form.motivation ? `MOTIVATION: ${form.motivation.substring(0, 800)}` : ''}
TONALITÄT: ${toneLabel(form.tone)}

AUFGABE. antworte AUSSCHLIESSLICH mit validem JSON, ohne Markdown-Codeblock, exakt in dieser Struktur:
{
  "coverLetter": "Vollständiges Bewerbungsanschreiben, 340-430 Wörter (4 bis 5 gehaltvolle Absätze, damit die Seite gut gefüllt ist), ohne Anrede und ohne Grussformel (werden separat ergänzt, die Anrede endet mit Komma: auf Deutsch und Italienisch beginnt das erste Wort daher klein, auf Französisch und Englisch gross), Absätze mit \\n\\n getrennt",
  "cvSummary": "Optimiertes Kurzprofil für den Lebenslauf, 3-4 Sätze",
  "skills": ["6-8 passende Skills als kurze Stichworte"],
  "interview": [{"q": "Frage", "a": "Antwortvorschlag in 2-4 Sätzen"}]
}
Das interview-Array enthält genau 10 Einträge, zugeschnitten auf die Stelle.`;

      const res = await authFetch('/api/process-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Quota reached (402) or rate limited (429): show the server's own
        // clear message instead of a generic "failed", and route quota
        // cases straight to the plans page. Nothing was generated, nothing
        // was counted against the user in these cases.
        if (res.status === 402) {
          onUpgrade('quota', data.error);
          return;
        }
        // Daily free ceiling reached (server sends upgrade:true) → same warm
        // upgrade modal, "daily" variant. A plain rate limit stays a toast.
        if (res.status === 503 && data.upgrade) {
          onUpgrade('daily');
          return;
        }
        if (res.status === 429 || res.status === 503) {
          showToast(data.error || s.gen_error, 'error');
          return;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const rawText = String(data.text || '').trim();
      // The server has already counted this generation. If the model ignored
      // the JSON instruction (returns prose/markdown) we must NOT throw the
      // result away — that would burn the user's quota for nothing. Parse
      // JSON when possible; otherwise salvage the raw text as the letter.
      let parsed: any = null;
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch { /* fall through to salvage */ } }
      const salvage = !parsed || !String(parsed.coverLetter || '').trim();
      const coverLetter = salvage
        ? rawText.replace(/```[a-z]*\n?|```/g, '').trim()
        : String(parsed.coverLetter);
      if (!coverLetter) throw new Error('empty response');
      setGen({
        coverLetter,
        cvSummary: salvage ? '' : String(parsed.cvSummary || ''),
        skills: !salvage && Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
        interview: !salvage && Array.isArray(parsed.interview) ? parsed.interview.filter((x: any) => x?.q).map((x: any) => ({ q: String(x.q), a: String(x.a || '') })) : [],
      });
      // Mirror the standard tool bookkeeping: history entry + visible usage counters
      recordUsage?.({
        input: `${form.targetPosition} · ${form.targetCompany}`,
        result: coverLetter,
      }).catch(() => {});
    } catch (e: any) {
      console.error('[BEWERBUNGS-GEN]', e);
      showToast(s.gen_error, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* Export: capture the offscreen A4-width render of ApplicationDocument so
     the chosen design IS the exported layout (multi-page if needed). */
  const exportPdf = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf'),
      ]);
      const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      // Encode ONCE — re-encoding the full canvas per page wasted CPU/memory
      // on long documents for identical bytes.
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (imgH <= pageH * 1.12) {
        // Fits on (or only just over) one page. A short letter must never spill
        // a few millimetres onto a near-empty second page, so shrink the whole
        // page proportionally to fit exactly one A4 and centre it horizontally.
        const scale = Math.min(1, pageH / imgH);
        const w = pageW * scale, h = imgH * scale;
        pdf.addImage(imgData, 'JPEG', (pageW - w) / 2, 0, w, h);
      } else {
        // Genuinely multi-page dossier: slice the tall image across A4 pages.
        let rendered = 0, page = 0;
        while (rendered < imgH) {
          if (page > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -rendered, pageW, imgH);
          rendered += pageH; page++;
          if (page >= 12) break; // safety net far above any real dossier
        }
      }
      pdf.save(`bewerbung-${(form.targetCompany || 'stellify').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    } catch (e: any) {
      console.error('[EXPORT PDF]', e);
      showToast(e?.message || 'Export error', 'error');
    } finally { setIsExporting(false); }
  };

  const exportWord = () => {
    // Word export is a Pro feature per the pricing page (Free plan lists
    // PDF only) — route free users to the plans instead of over-delivering.
    if (usage && !usage.isPro) { onUpgrade(); return; }
    /* Word renders HTML: same letter, design approximated (accent colour,
       font pairing, simplified layout. sidebar becomes a table). */
    // Escape EVERY user-entered value before interpolating into the Word
    // HTML — an '&', '<' or '"' in a name/company would otherwise corrupt
    // the document or break inline styles.
    const esc = (v: string) => v
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const a = design.accent;
    const serif = "Georgia, 'Times New Roman', serif";
    const sans = "Helvetica, Arial, sans-serif";
    const bodyFont = design.font === 'serif' ? serif : sans;
    const headFont = design.font === 'sans' ? sans : serif;
    const fullName = esc(`${form.firstName} ${form.lastName}`.trim());
    const contact = esc([form.address, form.phone, form.email].filter(Boolean).join(' · '));
    const bodyText = (gen?.coverLetter || form.motivation || '').split('\n').map(p => `<p>${esc(p)}</p>`).join('');
    const today = new Date().toLocaleDateString(language === 'FR' ? 'fr-CH' : language === 'IT' ? 'it-CH' : language === 'EN' ? 'en-GB' : 'de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
    const headerHtml = design.layout === 'sidebar' || design.layout === 'block'
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:${a};color:#fff"><tr><td style="padding:18pt 22pt"><div style="font-family:${headFont};font-size:18pt;font-weight:bold">${fullName}</div><div style="font-size:8pt;margin-top:4pt;opacity:.85">${contact}</div></td></tr></table>`
      : `<div style="text-align:${design.layout === 'minimal' || design.layout === 'executive' ? 'left' : 'center'};border-bottom:${design.layout === 'executive' ? `3pt solid ${a}` : `0.5pt solid ${a}`};padding-bottom:10pt;margin-bottom:6pt"><div style="font-family:${headFont};font-size:16pt;${design.layout === 'elegant' ? 'font-style:italic;' : ''}color:#1A1A18">${fullName}</div><div style="font-size:8pt;color:#6B6B66;margin-top:3pt">${contact}</div></div>`;
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><style>@page{size:A4;margin:2cm 2.2cm}body{font-family:${bodyFont};font-size:10.5pt;line-height:1.65;color:#26261F}p{margin:0 0 8pt 0}</style></head><body>
${headerHtml}
<p style="color:#6B6B66;margin-top:14pt">${today}</p>
<p style="font-weight:bold;color:${a};margin-top:10pt">${esc(s.subject)} ${esc(form.targetPosition)}${form.targetCompany ? ` · ${esc(form.targetCompany)}` : ''}</p>
<p style="margin-top:10pt">${esc(s.greeting)}</p>
${bodyText}
<p style="margin-top:10pt">${esc(s.closing)}</p>
<p style="font-weight:bold">${fullName}</p>
<p style="font-size:8pt;color:#9A9A94;margin-top:12pt">${esc(s.attachment_note)}</p>
</body></html>`;
    const aEl = document.createElement('a');
    aEl.href = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    aEl.download = `bewerbung-${(form.targetCompany || 'stellify').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.doc`;
    document.body.appendChild(aEl);
    aEl.click();
    document.body.removeChild(aEl);
  };

  const designName = (d: DesignConfig) => d.custom ? (d.name || s.own_design) : (s as any)[`d_${d.id}`] || d.id;
  const canProceed = form.firstName && form.lastName && form.targetCompany && form.targetPosition;

  /* Load custom designs + saved applications */
  useEffect(() => {
    if (!user) return;
    // Practical caps that never bite a real user (no plan-imposed limit).
    // Pagination can be added later if someone genuinely passes these.
    getDocs(query(collection(db, 'application_designs'), where('user_id', '==', user.id), limit(100)))
      .then(snap => setCustomDesigns(
        snap.docs
          .map(d => ({ config: d.data().config as DesignConfig, name: d.data().name, docId: d.id, created_at: d.data().created_at }))
          .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
          .map(d => ({ ...(d.config), custom: true, name: d.name, id: `custom-${d.docId}`, docId: d.docId }))
      ))
      .catch(() => {});
    // Filter only by user_id (automatic single-field index) and sort in the
    // browser. A where+orderBy query needs a composite index that may not
    // exist — if it is missing the query throws and the saved application never
    // loads, so the dashboard click could not jump into the preview. Sorting
    // client-side removes that dependency entirely.
    getDocs(query(collection(db, 'generated_applications'), where('user_id', '==', user.id), limit(200)))
      .then(snap => {
        const apps = snap.docs
          .map(d => ({ docId: d.id, ...(d.data() as any) }))
          .sort((a: any, b: any) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
        setSavedApps(apps);
        // Opened from the dashboard "recent documents": jump straight into that
        // saved application so the customer can review, edit and re-save it.
        if (initialDocId) {
          const match = apps.find((a: any) => a.docId === initialDocId);
          if (match) {
            setForm({ ...EMPTY_FORM, ...match.form });
            if (match.design) setDesign(match.design);
            setGen(match.generated || null);
            setLoadedDocId(match.docId);
            setStep(2);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  const saveCustomDesign = async () => {
    if (!user || !builder.name.trim()) return;
    const config: DesignConfig = { id: 'custom', font: builder.font, accent: builder.accent, layout: builder.layout, custom: true, name: builder.name.trim() };
    try {
      const ref = await addDoc(collection(db, 'application_designs'), {
        user_id: user.id, name: builder.name.trim(), config, created_at: new Date().toISOString(),
      });
      const withId = { ...config, id: `custom-${ref.id}`, docId: ref.id };
      setCustomDesigns(prev => [withId, ...prev]);
      setDesign(withId);
      setShowBuilder(false);
      showToast(s.saved, 'success');
    } catch (e: any) { showToast(e?.message || 'Error', 'error'); }
  };

  const deleteCustomDesign = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'application_designs', docId));
      setCustomDesigns(prev => prev.filter(d => d.docId !== docId));
      if ((design as any).docId === docId) setDesign(BUILT_IN_DESIGNS[0]);
    } catch { /* ignore */ }
  };

  const saveApplication = async () => {
    if (!user) return;
    setIsSaving(true);
    const payload = {
      user_id: user.id,
      title: `${form.targetPosition || '-'} · ${form.targetCompany || '-'}`,
      design,
      form,
      generated: gen,
      updated_at: new Date().toISOString(),
    };
    try {
      if (loadedDocId) {
        await updateDoc(doc(db, 'generated_applications', loadedDocId), payload);
        setSavedApps(prev => prev.map(a => a.docId === loadedDocId ? { ...a, ...payload } : a));
      } else {
        const ref = await addDoc(collection(db, 'generated_applications'), { ...payload, created_at: new Date().toISOString() });
        setLoadedDocId(ref.id);
        setSavedApps(prev => [{ docId: ref.id, ...payload }, ...prev]);
      }
      showToast(s.saved, 'success');
    } catch (e: any) { showToast(e?.message || 'Error', 'error'); }
    finally { setIsSaving(false); }
  };

  const loadApplication = (app: any) => {
    setForm({ ...EMPTY_FORM, ...app.form });
    if (app.design) setDesign(app.design);
    setGen(app.generated || null);
    setLoadedDocId(app.docId);
    setStep(2);
  };

  const deleteApplication = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'generated_applications', docId));
      setSavedApps(prev => prev.filter(a => a.docId !== docId));
      if (loadedDocId === docId) setLoadedDocId(null);
    } catch { /* ignore */ }
  };

  const set = (key: keyof ApplicationForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const inputCls = "w-full px-3.5 py-2.5 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 text-sm text-[#1A1A18] dark:text-[#FAFAF8] focus:border-[#004225] dark:focus:border-[#00A854] outline-none transition-all placeholder:text-[#9A9A94]/60";
  const labelCls = "text-[10px] font-bold uppercase tracking-widest text-[#4A4A45] dark:text-[#9A9A94]";

  if (locked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 bg-[#004225]/10 flex items-center justify-center text-[#004225] mb-4 rounded-full"><Lock size={24} /></div>
        <h3 className="text-lg font-serif mb-2 text-[#1A1A18] dark:text-[#FAFAF8]">{s.locked_title}</h3>
        <p className="text-xs text-[#5C5C58] dark:text-[#9A9A94] font-light max-w-xs mb-5">{s.locked_text}</p>
        <button onClick={() => onUpgrade()} className="px-6 py-3 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all">{s.locked_cta}</button>
      </div>
    );
  }

  const steps = [s.step_design, s.step_data, s.step_preview];

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar ios-scroll bg-[#FDFCFB] dark:bg-[#1A1A18]">
      <input
        ref={cvFileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleCvFileChange}
      />
      <input
        ref={photoFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoFileChange}
      />
      {/* Stepper */}
      <div className="sticky top-0 z-10 bg-[#FDFCFB]/95 dark:bg-[#1A1A18]/95 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 sm:px-8 py-3.5 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2 min-w-0">
            {(() => {
              // A step is navigable if it is at or behind the current one, or if
              // the application is already far enough along: once the required
              // fields are filled (canProceed) or a letter exists (gen), every
              // step can be jumped to directly from the top — no forced "Weiter".
              const navigable = i <= step || canProceed || !!gen;
              const doneBehind = i < step;
              return (
            <button
              onClick={() => { if (navigable) setStep(i as 0 | 1 | 2); }}
              disabled={!navigable}
              className={`flex items-center gap-2 px-2.5 py-1.5 transition-all ${i === step ? 'text-[#004225] dark:text-[#00A854]' : navigable ? 'text-[#1A1A18] dark:text-[#FAFAF8] hover:opacity-70 cursor-pointer' : 'text-[#9A9A94] cursor-default'}`}
            >
              <span className={`w-5 h-5 shrink-0 flex items-center justify-center text-[10px] font-bold rounded-full ${i === step ? 'bg-[#004225] dark:bg-[#00A854] text-white' : doneBehind ? 'bg-[#004225]/15 dark:bg-[#00A854]/20 text-[#004225] dark:text-[#00A854]' : navigable ? 'bg-[#004225]/10 dark:bg-[#00A854]/15 text-[#004225] dark:text-[#00A854]' : 'bg-black/8 dark:bg-white/10'}`}>
                {doneBehind ? <Check size={11} /> : i + 1}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:inline truncate">{label}</span>
            </button>
              );
            })()}
            {i < 2 && <div className="w-6 sm:w-10 h-px bg-black/10 dark:bg-white/10 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: DESIGN ───────────────────────────────────────────── */}
          {step === 0 && (
            <motion.div key="design" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <h3 className="font-serif text-2xl text-[#1A1A18] dark:text-[#FAFAF8] mb-1">{s.pick_design}</h3>
              <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] font-light mb-6">{s.pick_design_sub}</p>

              {savedApps.length > 0 && (
                <div className="mb-7">
                  <p className={`${labelCls} mb-2 flex items-center gap-1.5`}><FolderOpen size={11} />{s.load_saved}</p>
                  <div className="flex flex-wrap gap-2">
                    {savedApps.map(app => (
                      <div key={app.docId} className="group flex items-center gap-1 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 pl-3 pr-1 py-1.5">
                        <button onClick={() => loadApplication(app)} className="text-xs text-[#1A1A18] dark:text-[#FAFAF8] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors max-w-[200px] truncate">
                          {app.title}
                        </button>
                        <button onClick={() => deleteApplication(app.docId)} aria-label={s.delete} className="p-1 text-[#9A9A94] opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...BUILT_IN_DESIGNS, ...customDesigns].map(d => {
                  const isLocked = !!d.premium && !usage?.isUnlimited;
                  return (
                  <button
                    key={d.id}
                    onClick={() => { if (isLocked) { onUpgrade(); return; } setDesign(d); }}
                    title={isLocked ? s.locked_text : undefined}
                    className={`group relative text-left p-2.5 border transition-all ${design.id === d.id ? 'border-[#004225] dark:border-[#00A854] bg-[#004225]/4 dark:bg-[#00A854]/8 shadow-md' : 'border-black/8 dark:border-white/8 hover:border-[#004225]/40 bg-white dark:bg-[#2A2A26]'}`}
                  >
                    <div className={isLocked ? 'relative' : ''}>
                      <DesignThumb design={d} />
                      {isLocked && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="w-7 h-7 rounded-full bg-[#004225] text-white flex items-center justify-center shadow-md"><Lock size={13} /></span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2.5 px-0.5 gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A18] dark:text-[#FAFAF8] truncate flex items-center gap-1.5">
                        {designName(d)}
                        {d.premium && <span className="text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 bg-[#004225] text-white">Ultimate</span>}
                      </span>
                      {design.id === d.id && <Check size={13} className="text-[#004225] dark:text-[#00A854] shrink-0" />}
                    </div>
                    {d.custom && (d as any).docId && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); deleteCustomDesign((d as any).docId); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteCustomDesign((d as any).docId); } }}
                        aria-label={s.delete}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 dark:bg-black/60 text-[#9A9A94] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      ><Trash2 size={11} /></span>
                    )}
                  </button>
                  );
                })}

                {/* + custom design */}
                <button
                  onClick={() => setShowBuilder(true)}
                  className="flex flex-col items-center justify-center gap-2 border border-dashed border-black/15 dark:border-white/15 hover:border-[#004225] dark:hover:border-[#00A854] text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-all aspect-auto min-h-[140px] bg-white/50 dark:bg-white/[0.02]"
                >
                  <span className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/8 flex items-center justify-center"><Plus size={16} /></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{s.own_design}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={loadExample}
                  className="group inline-flex items-center gap-3 px-4 py-2.5 border border-[#004225]/25 dark:border-[#00A854]/35 hover:border-[#004225] dark:hover:border-[#00A854] bg-[#004225]/[0.03] dark:bg-[#00A854]/[0.06] hover:bg-[#004225]/[0.07] dark:hover:bg-[#00A854]/[0.10] text-left transition-all rounded"
                  title={s.try_example_sub}
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#004225] dark:bg-[#00A854] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={13} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#004225] dark:text-[#00A854]">{s.try_example}</span>
                    <span className="hidden sm:block text-[10px] text-[#5C5C58] dark:text-[#9A9A94] font-light mt-0.5">{s.try_example_sub}</span>
                  </span>
                </button>
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-7 py-3 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all">
                  {s.next}<ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: FORM ─────────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {/* ── Job URL importer ─────────────────────────────────────── */}
                <section className="relative p-5 bg-gradient-to-br from-[#004225]/[0.06] to-[#00A854]/[0.04] dark:from-[#00A854]/[0.10] dark:to-[#004225]/[0.06] border border-[#004225]/25 dark:border-[#00A854]/30 rounded-lg shadow-sm">
                  <div className="absolute -top-2.5 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#004225] dark:bg-[#00A854] text-white text-[9px] font-bold uppercase tracking-[0.18em] rounded-full shadow">
                    <Sparkles size={10} /> {s.badge_new}
                  </div>
                  <div className="flex items-center gap-2 mb-1.5 mt-1">
                    <Link2 size={14} className="text-[#004225] dark:text-[#00A854]" />
                    <p className="text-sm font-bold text-[#1A1A18] dark:text-[#FAFAF8]">{s.job_url_title}</p>
                  </div>
                  <p className="text-[11px] text-[#5C5C58] dark:text-[#9A9A94] font-light leading-relaxed mb-3">{s.job_url_sub}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      type="url"
                      inputMode="url"
                      placeholder={s.job_url_ph}
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isFetchingJob) { e.preventDefault(); fetchJobFromUrl(); } }}
                    />
                    <button
                      onClick={fetchJobFromUrl}
                      disabled={isFetchingJob || !jobUrl.trim()}
                      className="shrink-0 px-5 py-2.5 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-[#00331d] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {isFetchingJob
                        ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {s.job_url_loading}</>
                        : <><Download size={12} /> {s.job_url_btn}</>}
                    </button>
                  </div>
                </section>

                {/* ── Use uploaded CV toggle + upload-from-here ──────────────
                    Two states:
                    • CV present → toggle is the primary control, on by default.
                    • No CV → toggle is decorative (and a hint that it activates
                      after upload). The big primary button below is the action. */}
                <section className="p-4 bg-white dark:bg-[#2A2A26] border border-black/8 dark:border-white/8 rounded-lg">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => { if (cvContext) setUseCv(v => !v); else openCvFilePicker(); }}
                      role="switch"
                      aria-checked={!!cvContext && useCv}
                      aria-label={cvContext ? s.use_cv_label : s.cv_upload_btn}
                      title={cvContext ? undefined : s.no_cv_hint}
                      className={`mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors relative ${cvContext && useCv ? 'bg-[#004225] dark:bg-[#00A854]' : 'bg-black/15 dark:bg-white/15'} ${!cvContext ? 'opacity-50' : ''}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${cvContext && useCv ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1A1A18] dark:text-[#FAFAF8]">{s.use_cv_label}</p>
                      <p className="text-[11px] text-[#5C5C58] dark:text-[#9A9A94] font-light mt-0.5">{cvContext ? s.use_cv_hint : s.no_cv_hint}</p>
                    </div>
                  </div>
                  {!cvContext && (
                    <button
                      type="button"
                      onClick={openCvFilePicker}
                      disabled={isUploadingCv}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#004225] dark:bg-[#00A854] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] dark:hover:bg-[#00964a] transition-all disabled:opacity-60 rounded"
                    >
                      {isUploadingCv
                        ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {s.cv_uploading}</>
                        : <><Upload size={12} /> {s.cv_upload_btn}</>}
                    </button>
                  )}
                </section>

                <section>
                  <p className={`${labelCls} mb-3 pb-2 border-b border-black/8 dark:border-white/8`}>{s.sec_person}</p>
                  <div className="grid grid-cols-[auto,1fr] gap-4 sm:gap-5 items-start">
                    {/* Photo column — fixed width so the form fields keep
                        their original two-column grid below. */}
                    <div className="flex flex-col items-center gap-1.5 w-[88px] sm:w-[110px]">
                      <button
                        type="button"
                        onClick={openPhotoFilePicker}
                        className="relative w-[88px] h-[110px] sm:w-[110px] sm:h-[138px] rounded-sm overflow-hidden bg-[#004225]/[0.04] dark:bg-[#00A854]/[0.08] border-2 border-dashed border-[#004225]/25 dark:border-[#00A854]/30 hover:border-[#004225] dark:hover:border-[#00A854] transition-colors flex flex-col items-center justify-center text-[#004225] dark:text-[#00A854]"
                        aria-label={form.photo ? s.photo_replace : s.photo_upload}
                      >
                        {form.photo ? (
                          <img src={form.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <UserSquare size={26} strokeWidth={1.25} />
                            <span className="mt-1 text-[8.5px] font-bold uppercase tracking-[1.5px]">{s.photo_title}</span>
                          </>
                        )}
                      </button>
                      {form.photo ? (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, photo: '' }))}
                          className="text-[9px] font-bold uppercase tracking-widest text-[#9A9A94] hover:text-red-600 transition-colors"
                        >{s.photo_remove}</button>
                      ) : (
                        <p className="text-[9px] text-[#9A9A94] text-center leading-tight">{s.photo_hint}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className={labelCls}>{s.f_firstName} *</label><input className={inputCls} value={form.firstName} onChange={set('firstName')} /></div>
                      <div className="space-y-1.5"><label className={labelCls}>{s.f_lastName} *</label><input className={inputCls} value={form.lastName} onChange={set('lastName')} /></div>
                      <div className="space-y-1.5 sm:col-span-2"><label className={labelCls}>{s.f_address}</label><input className={inputCls} value={form.address} onChange={set('address')} /></div>
                      <div className="space-y-1.5"><label className={labelCls}>{s.f_phone}</label><input className={inputCls} type="tel" value={form.phone} onChange={set('phone')} /></div>
                      <div className="space-y-1.5"><label className={labelCls}>{s.f_email}</label><input className={inputCls} type="email" value={form.email} onChange={set('email')} /></div>
                      <div className="space-y-1.5 sm:col-span-2"><label className={labelCls}>{s.f_currentRole}</label><input className={inputCls} value={form.currentRole} onChange={set('currentRole')} /></div>
                    </div>
                  </div>
                </section>

                <section>
                  <p className={`${labelCls} mb-3 pb-2 border-b border-black/8 dark:border-white/8`}>{s.sec_job}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className={labelCls}>{s.f_targetCompany} *</label><input className={inputCls} value={form.targetCompany} onChange={set('targetCompany')} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>{s.f_targetPosition} *</label><input className={inputCls} value={form.targetPosition} onChange={set('targetPosition')} /></div>
                    <div className="space-y-1.5 sm:col-span-2"><label className={labelCls}>{s.f_jobDescription}</label><textarea className={`${inputCls} min-h-[90px]`} placeholder={s.ph_jobDescription} value={form.jobDescription} onChange={set('jobDescription')} /></div>
                  </div>
                </section>

                <section>
                  <p className={`${labelCls} mb-3 pb-2 border-b border-black/8 dark:border-white/8`}>{s.sec_profile}</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5"><label className={labelCls}>{s.f_experience}</label><textarea className={`${inputCls} min-h-[80px]`} placeholder={s.ph_experience} value={form.experience} onChange={set('experience')} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>{s.f_education}</label><textarea className={`${inputCls} min-h-[70px]`} placeholder={s.ph_education} value={form.education} onChange={set('education')} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>{s.f_skills}</label><textarea className={`${inputCls} min-h-[70px]`} placeholder={s.ph_skills} value={form.skills} onChange={set('skills')} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>{s.f_motivation}</label><textarea className={`${inputCls} min-h-[100px]`} placeholder={s.ph_motivation} value={form.motivation} onChange={set('motivation')} /></div>
                    <div className="space-y-1.5">
                      <label className={labelCls}>{s.f_tone}</label>
                      <select className={inputCls} value={form.tone} onChange={set('tone')}>
                        <option value="">-</option>
                        <option value="professional">{s.tone_prof}</option>
                        <option value="confident">{s.tone_conf}</option>
                        <option value="friendly">{s.tone_warm}</option>
                        <option value="direct">{s.tone_direct}</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              {!canProceed && <p className="mt-5 text-[10px] text-[#9A9A94] italic">{s.required_hint}</p>}

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <ChevronLeft size={14} />{s.back}
                </button>
                <button
                  onClick={() => canProceed && setStep(2)}
                  disabled={!canProceed}
                  className={`inline-flex items-center gap-2 px-7 py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${canProceed ? 'bg-[#004225] text-white hover:bg-[#00331d]' : 'bg-black/10 dark:bg-white/10 text-[#9A9A94] cursor-not-allowed'}`}
                >
                  <Eye size={14} />{s.to_preview}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PREVIEW + GENERATE + EXPORT ─────────────────────── */}
          {step === 2 && (
            <motion.div key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-serif text-2xl text-[#1A1A18] dark:text-[#FAFAF8] mb-1">{loadedDocId && gen ? s.saved_title : s.preview_title}</h3>
                  <p className="text-xs text-[#6B6B66] dark:text-[#9A9A94] font-light">{loadedDocId && gen ? s.saved_sub : s.preview_sub}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                    <ChevronLeft size={12} />{s.back}
                  </button>
                  <button
                    onClick={saveApplication}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#004225] dark:border-[#00A854] text-[#004225] dark:text-[#00A854] text-[10px] font-bold uppercase tracking-widest hover:bg-[#004225]/5 transition-all disabled:opacity-60"
                  >
                    <Save size={12} />{isSaving ? s.saving : s.save_application}
                  </button>
                  {quotaInfo && (
                    <span
                      title={quotaInfo.label}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-widest border ${quotaInfo.done ? 'border-red-500/40 bg-red-500/8 text-red-700 dark:text-red-300' : 'border-[#004225]/20 dark:border-[#00A854]/30 bg-[#004225]/5 dark:bg-[#00A854]/8 text-[#004225] dark:text-[#00A854]'}`}
                    >
                      {quotaInfo.done ? quotaInfo.doneLabel : quotaInfo.label}
                    </span>
                  )}
                  {quotaBlocked ? (
                    <button
                      onClick={() => onUpgrade()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all"
                    >
                      <Sparkles size={12} />{s.locked_cta}
                    </button>
                  ) : (
                    <button
                      onClick={generate}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all disabled:opacity-60"
                    >
                      {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {isGenerating ? s.generating : gen ? s.regenerate : s.generate}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
                <div>
                  {/* A4 document preview */}
                  <div className="mx-auto max-w-[560px] shadow-2xl shadow-black/15 dark:shadow-black/50 border border-black/10 dark:border-white/10 relative">
                    {isGenerating && (
                      <div className="absolute inset-0 z-10 bg-white/70 dark:bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-2 border-[#004225] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#004225]">{s.generating}</p>
                      </div>
                    )}
                    {/* Empty preview: the letter is not written until the user
                        hits Generate. Many visitors did not realise they had to
                        click the top-right button, so we place a clear, central
                        call-to-action right on the blank page. */}
                    {!gen && !isGenerating && !quotaBlocked && (
                      <div className="absolute inset-0 z-10 bg-white/85 dark:bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-4 text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-[#004225]/10 dark:bg-[#00A854]/15 flex items-center justify-center">
                          <Sparkles size={26} className="text-[#004225] dark:text-[#00A854]" />
                        </div>
                        <p className="text-sm text-[#1A1A18] dark:text-[#FAFAF8] font-light leading-relaxed max-w-[320px]">{s.empty_preview_hint}</p>
                        <button
                          onClick={generate}
                          className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#004225] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#00331d] shadow-lg shadow-[#004225]/25 transition-all animate-pulse"
                        >
                          <Sparkles size={15} />{s.generate}
                        </button>
                      </div>
                    )}
                    {/* Editable letter: a subtle hover/focus tint marks it. */}
                    <style>{`.stellify-letter-edit:hover{background:rgba(0,66,37,0.05)}.stellify-letter-edit:focus{background:rgba(0,66,37,0.07);box-shadow:0 0 0 1px rgba(0,66,37,0.2)}`}</style>
                    <div className="aspect-[1/1.414] overflow-y-auto custom-scrollbar bg-white" title={gen?.coverLetter ? s.click_to_edit : undefined}>
                      <ApplicationDocument design={design} form={form} s={s} generatedText={gen?.coverLetter || null} editable={!!gen?.coverLetter} onBodyChange={onLetterChange} />
                    </div>
                  </div>

                  {/* Export + edit row */}
                  <div className="mx-auto max-w-[560px] mt-4 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={focusLetter}
                      disabled={!gen?.coverLetter}
                      title={s.click_to_edit}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${gen?.coverLetter ? 'border-black/10 dark:border-white/10 text-[#6B6B66] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5' : 'border-black/5 text-[#C5C5C0] cursor-not-allowed'}`}
                    >
                      <Pencil size={12} />{s.edit_letter}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={exportPdf}
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004225] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#00331d] transition-all disabled:opacity-60"
                      >
                        <Download size={12} />{isExporting ? s.exporting : s.export_pdf}
                      </button>
                      <button
                        onClick={exportWord}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#004225] dark:border-[#00A854] text-[#004225] dark:text-[#00A854] text-[10px] font-bold uppercase tracking-widest hover:bg-[#004225]/5 transition-all"
                      >
                        <Download size={12} />{s.export_word}
                      </button>
                    </div>
                  </div>

                  {/* Connect the two tools: drop this application straight into
                      the free tracker so it never gets lost. Only when a letter
                      exists and a company/position are set. */}
                  {onAddToTracker && gen && form.targetCompany && form.targetPosition && (
                    <div className="mx-auto max-w-[560px] mt-3">
                      <button
                        onClick={async () => {
                          if (trackerAdded) return;
                          const added = await onAddToTracker({ company: form.targetCompany, position: form.targetPosition });
                          setTrackerAdded(true);
                          showToast(
                            added
                              ? (language === 'FR' ? 'Ajouté au suivi des candidatures' : language === 'IT' ? 'Aggiunto al tracker delle candidature' : language === 'EN' ? 'Added to the application tracker' : 'Zum Bewerbungs-Tracker hinzugefügt')
                              : (language === 'FR' ? 'Déjà dans le suivi' : language === 'IT' ? 'Già nel tracker' : language === 'EN' ? 'Already in the tracker' : 'Ist bereits im Tracker'),
                            'success',
                          );
                        }}
                        className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${trackerAdded ? 'bg-[#004225]/8 dark:bg-[#00A854]/12 text-[#004225] dark:text-[#00A854] cursor-default' : 'border border-black/10 dark:border-white/10 text-[#5C5C58] dark:text-[#9A9A94] hover:border-[#004225]/40 dark:hover:border-[#00A854]/50 hover:text-[#004225] dark:hover:text-[#00A854] hover:bg-[#004225]/[0.03] dark:hover:bg-[#00A854]/[0.06]'}`}
                      >
                        {trackerAdded ? <Check size={13} strokeWidth={3} /> : <ListChecks size={13} />}
                        {trackerAdded
                          ? (language === 'FR' ? 'Dans le suivi des candidatures' : language === 'IT' ? 'Nel tracker delle candidature' : language === 'EN' ? 'In the application tracker' : 'Im Bewerbungs-Tracker')
                          : (language === 'FR' ? 'Ajouter au suivi des candidatures' : language === 'IT' ? 'Aggiungi al tracker delle candidature' : language === 'EN' ? 'Add to the application tracker' : 'In den Bewerbungs-Tracker übernehmen')}
                      </button>
                    </div>
                  )}

                </div>

                {/* Extras: CV summary, skills, interview prep */}
                {gen && (
                  <div className="space-y-4">
                    {gen.cvSummary && (
                      <div className="border border-black/8 dark:border-white/8 bg-white dark:bg-[#2A2A26] p-4">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-2"><UserSquare size={12} />{s.extras_summary}</p>
                        <p className="text-xs leading-relaxed text-[#1A1A18] dark:text-[#EBEBEB] font-light">{gen.cvSummary}</p>
                      </div>
                    )}
                    {gen.skills.length > 0 && (
                      <div className="border border-black/8 dark:border-white/8 bg-white dark:bg-[#2A2A26] p-4">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-2.5"><ListChecks size={12} />{s.extras_skills}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {gen.skills.map((sk, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#004225]/6 dark:bg-[#00A854]/10 text-[#004225] dark:text-[#00A854] text-[10px] font-medium">{sk}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {gen.interview.length > 0 && (
                      <div className="border border-black/8 dark:border-white/8 bg-white dark:bg-[#2A2A26] p-4">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-1"><MessageSquare size={12} />{s.extras_interview}</p>
                        <p className="text-[9px] text-[#9A9A94] mb-3">{s.interview_hint}</p>
                        <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                          {gen.interview.map((qa, i) => (
                            <details key={i} className="group border-b border-black/5 dark:border-white/5 pb-1.5">
                              <summary className="cursor-pointer list-none flex items-start gap-2 py-1">
                                <span className="shrink-0 w-4 h-4 mt-0.5 bg-[#004225]/10 dark:bg-[#00A854]/15 text-[#004225] dark:text-[#00A854] text-[8px] font-bold flex items-center justify-center rounded-full">{i + 1}</span>
                                <span className="text-[11px] font-medium text-[#1A1A18] dark:text-[#FAFAF8] leading-snug group-open:text-[#004225] dark:group-open:text-[#00A854] transition-colors">{qa.q}</span>
                              </summary>
                              <p className="text-[10.5px] leading-relaxed text-[#5C5C58] dark:text-[#B5B5AF] font-light pl-6 pb-1">{qa.a}</p>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Offscreen A4-width render used for the PDF export */}
              <div aria-hidden="true" className="fixed -left-[12000px] top-0 pointer-events-none">
                <div ref={exportRef} style={{ width: 794, minHeight: 1123, background: '#fff' }}>
                  <ApplicationDocument design={design} form={form} s={s} generatedText={gen?.coverLetter || null} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Custom design builder ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showBuilder && (
          <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center sm:p-4 bg-black/45 backdrop-blur-sm" onClick={() => setShowBuilder(false)}>
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1A1A18] w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl border border-black/10 dark:border-white/10"
            >
              <div className="p-5 border-b border-black/8 dark:border-white/8 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1A1A18]">
                <div className="flex items-center gap-2.5">
                  <Palette size={16} className="text-[#004225] dark:text-[#00A854]" />
                  <h4 className="font-serif text-lg text-[#1A1A18] dark:text-[#FAFAF8]">{s.own_design_new}</h4>
                </div>
                <button onClick={() => setShowBuilder(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[#9A9A94]"><X size={16} /></button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className={labelCls}>{s.builder_name}</label>
                    <input className={inputCls} placeholder={s.builder_name_ph} value={builder.name} onChange={e => setBuilder(b => ({ ...b, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>{s.builder_accent}</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ACCENT_PRESETS.map(c => (
                        <button key={c} onClick={() => setBuilder(b => ({ ...b, accent: c }))} aria-label={c}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${builder.accent === c ? 'border-[#1A1A18] dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ background: c }} />
                      ))}
                      <input type="color" value={builder.accent} onChange={e => setBuilder(b => ({ ...b, accent: e.target.value }))}
                        className="w-8 h-8 rounded-full border border-black/15 cursor-pointer bg-transparent" aria-label="Custom colour" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>{s.builder_font}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['serif', 'sans', 'mix'] as const).map(f => (
                        <button key={f} onClick={() => setBuilder(b => ({ ...b, font: f }))}
                          className={`px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${builder.font === f ? 'border-[#004225] dark:border-[#00A854] bg-[#004225]/5 text-[#004225] dark:text-[#00A854]' : 'border-black/10 dark:border-white/10 text-[#6B6B66] dark:text-[#9A9A94] hover:border-[#004225]/40'}`}>
                          {(s as any)[`font_${f}`]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>{s.builder_layout}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['classic', 'sidebar', 'minimal', 'elegant', 'block', 'executive'] as const).map(l => (
                        <button key={l} onClick={() => setBuilder(b => ({ ...b, layout: l }))}
                          className={`px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${builder.layout === l ? 'border-[#004225] dark:border-[#00A854] bg-[#004225]/5 text-[#004225] dark:text-[#00A854]' : 'border-black/10 dark:border-white/10 text-[#6B6B66] dark:text-[#9A9A94] hover:border-[#004225]/40'}`}>
                          {(s as any)[`layout_${l}`]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live builder preview */}
                <div>
                  <p className={`${labelCls} mb-2`}>{s.step_preview}</p>
                  <div className="border border-black/10 dark:border-white/10 shadow-lg">
                    <DesignThumb design={{ id: 'builder-preview', font: builder.font, accent: builder.accent, layout: builder.layout }} />
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-black/8 dark:border-white/8 flex justify-end gap-2">
                <button onClick={() => setShowBuilder(false)} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] hover:bg-black/5 dark:hover:bg-white/5 transition-all">{s.cancel}</button>
                <button
                  onClick={saveCustomDesign}
                  disabled={!builder.name.trim()}
                  className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${builder.name.trim() ? 'bg-[#004225] text-white hover:bg-[#00331d]' : 'bg-black/10 dark:bg-white/10 text-[#9A9A94] cursor-not-allowed'}`}
                >{s.save_design}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicationGenerator;
