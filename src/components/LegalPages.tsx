/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';

const LegalPages = ({ activeView, onBack, language }: { activeView: string; onBack: () => void; language: string }) => {
  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const isDE = language === 'DE';
  const isFR = language === 'FR';
  const isIT = language === 'IT';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-10">
      <h2 className="text-xl font-serif text-[#004225] dark:text-[#00A854] mb-4 pb-2 border-b border-[#004225]/10 dark:border-white/10">{title}</h2>
      <div className="space-y-3 text-sm text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">{children}</div>
    </div>
  );

  const placeholder = (text: string) => (
    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1 rounded font-mono text-xs">{text}</span>
  );

  return (
    <section className="px-6 lg:px-12 py-16 bg-[#FDFCFB] dark:bg-[#1A1A18] min-h-screen">
      <div className={`${activeView === 'about' ? 'max-w-4xl' : 'max-w-3xl'} mx-auto`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#6B6B66] dark:text-[#9A9A94] hover:text-[#004225] dark:hover:text-[#00A854] transition-colors mb-12"
        >
          <ArrowLeft size={14} /> {isDE ? 'Zurück' : isFR ? 'Retour' : isIT ? 'Indietro' : 'Back'}
        </button>

        {/* ======= DATENSCHUTZRICHTLINIE ======= */}
        {activeView === 'datenschutz' && (
          <article>
            <header className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-3">
                {isDE ? 'Rechtliches' : isFR ? 'Mentions légales' : isIT ? 'Note legali' : 'Legal'}
              </p>
              <h1 className="text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4">
                {isDE ? 'Datenschutzrichtlinie' : isFR ? 'Politique de confidentialité' : isIT ? 'Informativa sulla privacy' : 'Privacy Policy'}
              </h1>
              <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94]">
                {isDE ? `Stand: ${today} · Gilt für: stellify.ch` : isFR ? `Mis à jour le : ${today} · Applicable à : stellify.ch` : isIT ? `Aggiornato il: ${today} · Applicabile a: stellify.ch` : `Last updated: ${today} · Applies to: stellify.ch`}
              </p>
            </header>

            {isDE ? <>
              <Section title="1. Verantwortliche Person">
                <p>Verantwortlich für die Datenbearbeitung im Sinne des Schweizer Datenschutzgesetzes (DSG) und der Europäischen Datenschutz-Grundverordnung (DSGVO) ist:</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Betreiber der Plattform Stellify</p><p>Schweiz</p><p>E-Mail: support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Erhobene Personendaten">
                <p>Wir erheben und bearbeiten folgende Kategorien von Personendaten:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Kontodaten:</strong> Vorname, E-Mail-Adresse (bei Registrierung)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Lebenslauf-Inhalt:</strong> Text deines hochgeladenen Lebenslaufs (nur zur KI-Verarbeitung, nicht dauerhaft gespeichert)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Nutzungsdaten:</strong> Anzahl Tool-Nutzungen, Chat-Anfragen, Datum des letzten Resets</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Zahlungsdaten:</strong> Werden ausschliesslich durch Stripe Inc. verarbeitet.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Technische Daten:</strong> Spracheinstellungen, Theme-Präferenz (lokal gespeichert)</li>
                </ul>
              </Section>
              <Section title="3. Zweck der Datenbearbeitung">
                <p>Wir bearbeiten deine Daten ausschliesslich zu folgenden Zwecken:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Bereitstellung und Verbesserung der Plattform-Funktionen</li>
                  <li>Authentifizierung und Kontoverwaltung</li>
                  <li>Abrechnung und Zahlungsabwicklung (via Stripe)</li>
                  <li>Einhaltung gesetzlicher Pflichten</li>
                  <li>KI-gestützte Karriereberatung (Verarbeitung des Lebenslauf-Textes durch einen externen KI-Dienst)</li>
                </ul>
              </Section>
              <Section title="4. Rechtsgrundlage der Bearbeitung">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO / Art. 31 DSG):</strong> Kontodaten und Nutzungsdaten sind für die Bereitstellung des Dienstes notwendig.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):</strong> Für optionale Analyse-Cookies.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO):</strong> Sicherheit und Missbrauchsprävention.</li>
                </ul>
              </Section>
              <Section title="5. Weitergabe an Dritte">
                <p>Wir geben deine Daten nur an folgende Drittdienstleister weiter, die als Auftragsverarbeiter tätig sind:</p>
                <div className="mt-3 space-y-4">
                  {[['Authentifizierungsdienst (Google LLC)', 'Zweck: Authentifizierung, Datenbankhosting. Sitz: USA. Schutzinstrument: EU-Standardvertragsklauseln (SCCs).'],['KI-Dienst (DeepSeek / Hangzhou DeepSeek AI Co., Ltd.)', 'Zweck: Primäre KI-gestützte Verarbeitung von Nutzeranfragen und Lebenslauf-Inhalten. Sitz: China. Es werden nur die für die jeweilige Anfrage nötigen Inhalte übermittelt; keine Kontodaten, keine Zahlungsdaten.'],['KI-Dienst (Google LLC, Gemini)', 'Zweck: KI-Verarbeitung als Ausweichdienst. Sitz: USA. Schutzinstrument: EU-Standardvertragsklauseln (SCCs). Eingabedaten werden nicht zum Training genutzt.'],['Stripe Inc.', 'Zweck: Zahlungsabwicklung. Sitz: USA. Stripe ist PCI-DSS-zertifiziert.'],['Cloud-Hosting-Anbieter (Vercel Inc.)', 'Zweck: Hosting der Web-Applikation. Sitz: USA. Schutzinstrument: EU-Standardvertragsklauseln.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookies und lokale Speicherung">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Notwendige Cookies (immer aktiv)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Firebase Auth Session: Authentifizierung</li><li>localStorage: <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code></li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Optionale Analyse-Cookies (nur mit Einwilligung)</p><p className="text-xs mt-1">Derzeit keine Analyse-Dienste von Drittanbietern aktiv.</p></div>
                </div>
              </Section>
              <Section title="7. Speicherdauer"><ul className="list-disc pl-5 space-y-2"><li>Kontodaten: bis zur Kontolöschung</li><li>Lebenslauf-Text: nicht dauerhaft gespeichert</li><li>Zahlungsbelege: 10 Jahre (OR Art. 958f)</li><li>Nutzungsstatistiken: monatlich zurückgesetzt</li></ul></Section>
              <Section title="8. Deine Rechte">
                <p>Du hast nach Schweizer DSG und DSGVO folgende Rechte:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Auskunft, Berichtigung, Löschung, Datenportabilität, Widerspruch, Widerruf.</strong></li>
                  <li>Beschwerde beim EDÖB (edoeb.admin.ch)</li>
                </ul>
                <p className="mt-4">Kontakt: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Datensicherheit"><ul className="list-disc pl-5 space-y-2"><li>TLS/HTTPS-Verschlüsselung aller Datenübertragungen</li><li>Firebase Security Rules für Datenbankzugriffskontrolle</li><li>Keine Klartextpasswörter (Firebase Authentication)</li><li>Zugriff auf Produktionsdaten nur für autorisierte Personen</li></ul></Section>
              <Section title="10. Änderungen dieser Richtlinie"><p>Wir behalten uns vor, diese Richtlinie jederzeit anzupassen. Bei wesentlichen Änderungen informieren wir per E-Mail.</p></Section>
            </> : isFR ? <>
              <Section title="1. Responsable du traitement">
                <p>Le responsable du traitement des données au sens de la loi suisse sur la protection des données (LPD) et du RGPD est :</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Exploitant de la plateforme Stellify</p><p>Suisse</p><p>E-mail : support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Données collectées">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données de compte :</strong> prénom, adresse e-mail</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Contenu du CV :</strong> texte de votre CV (traitement IA uniquement, non stocké de façon permanente)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données d'utilisation :</strong> nombre d'utilisations des outils, requêtes chat</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données de paiement :</strong> traitées exclusivement par Stripe Inc.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Données techniques :</strong> paramètres de langue, préférence de thème (stockage local)</li>
                </ul>
              </Section>
              <Section title="3. Finalités du traitement">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Fourniture et amélioration des fonctionnalités de la plateforme</li>
                  <li>Authentification et gestion des comptes</li>
                  <li>Facturation et traitement des paiements (via Stripe)</li>
                  <li>Respect des obligations légales</li>
                  <li>Conseil de carrière assisté par IA (traitement du CV via un service IA externe)</li>
                </ul>
              </Section>
              <Section title="4. Base légale">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Exécution du contrat (Art. 6 al. 1 lit. b RGPD) :</strong> données nécessaires à la fourniture du service.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Consentement (Art. 6 al. 1 lit. a RGPD) :</strong> cookies d'analyse optionnels.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Intérêt légitime (Art. 6 al. 1 lit. f RGPD) :</strong> sécurité et prévention des abus.</li>
                </ul>
              </Section>
              <Section title="5. Transfert à des tiers">
                <p>Nous ne transmettons vos données qu'aux sous-traitants suivants :</p>
                <div className="mt-3 space-y-4">
                  {[['Service d\'authentification (Google LLC)', 'Finalité : authentification, hébergement de base de données. Siège : USA. Protection : clauses contractuelles types UE (CCT).'],['Service IA (DeepSeek / Hangzhou DeepSeek AI Co., Ltd.)', 'Finalité : traitement IA principal des requêtes et du contenu du CV. Siège : Chine. Seuls les contenus nécessaires à la requête sont transmis; ni données de compte ni données de paiement.'],['Service IA (Google LLC, Gemini)', 'Finalité : traitement IA de secours. Siège : USA. Protection : clauses contractuelles types UE. Les données ne sont pas utilisées pour l\'entraînement.'],['Stripe Inc.', 'Finalité : traitement des paiements. Siège : USA. Stripe est certifié PCI-DSS.'],['Hébergeur cloud (Vercel Inc.)', 'Finalité : hébergement de l\'application web. Siège : USA. Protection : clauses contractuelles types UE.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookies et stockage local">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookies nécessaires (toujours actifs)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Session Firebase Auth : authentification</li><li>localStorage : <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code></li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookies d'analyse optionnels (avec consentement uniquement)</p><p className="text-xs mt-1">Aucun service d'analyse tiers actuellement actif.</p></div>
                </div>
              </Section>
              <Section title="7. Durée de conservation"><ul className="list-disc pl-5 space-y-2"><li>Données de compte : jusqu'à la suppression du compte</li><li>Contenu du CV : non stocké de façon permanente</li><li>Pièces comptables : 10 ans (droit suisse)</li><li>Statistiques d'utilisation : réinitialisées mensuellement</li></ul></Section>
              <Section title="8. Vos droits">
                <p>Vous disposez des droits suivants selon la LPD et le RGPD : accès, rectification, suppression, portabilité, opposition, retrait du consentement, réclamation auprès du PFPDT (edoeb.admin.ch).</p>
                <p className="mt-4">Contact : <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Sécurité des données"><ul className="list-disc pl-5 space-y-2"><li>Chiffrement TLS/HTTPS de toutes les transmissions</li><li>Firebase Security Rules pour le contrôle d'accès à la base de données</li><li>Aucun mot de passe en clair (Firebase Authentication)</li><li>Accès aux données de production réservé aux personnes autorisées</li></ul></Section>
              <Section title="10. Modifications"><p>Nous nous réservons le droit de modifier cette politique à tout moment. Les utilisateurs inscrits seront informés par e-mail en cas de changements importants.</p></Section>
            </> : isIT ? <>
              <Section title="1. Titolare del trattamento">
                <p>Il titolare del trattamento ai sensi della legge svizzera sulla protezione dei dati (LPD) e del GDPR è:</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Gestore della piattaforma Stellify</p><p>Svizzera</p><p>E-mail: support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Dati raccolti">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati account:</strong> nome, indirizzo e-mail</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Contenuto del CV:</strong> testo del CV (solo per elaborazione IA, non memorizzato permanentemente)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati di utilizzo:</strong> numero di utilizzi degli strumenti, richieste chat</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati di pagamento:</strong> elaborati esclusivamente da Stripe Inc.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Dati tecnici:</strong> impostazioni lingua, preferenza tema (memorizzati localmente)</li>
                </ul>
              </Section>
              <Section title="3. Finalità del trattamento">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Fornitura e miglioramento delle funzionalità della piattaforma</li>
                  <li>Autenticazione e gestione degli account</li>
                  <li>Fatturazione ed elaborazione dei pagamenti (via Stripe)</li>
                  <li>Rispetto degli obblighi legali</li>
                  <li>Consulenza di carriera assistita da IA (elaborazione del CV tramite un servizio IA esterno)</li>
                </ul>
              </Section>
              <Section title="4. Base giuridica">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Esecuzione del contratto (Art. 6 par. 1 lett. b GDPR):</strong> necessario per la fornitura del servizio.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Consenso (Art. 6 par. 1 lett. a GDPR):</strong> cookie analitici opzionali.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Interesse legittimo (Art. 6 par. 1 lett. f GDPR):</strong> sicurezza e prevenzione degli abusi.</li>
                </ul>
              </Section>
              <Section title="5. Trasferimento a terzi">
                <p>Trasferiamo i dati solo ai seguenti responsabili del trattamento:</p>
                <div className="mt-3 space-y-4">
                  {[['Servizio di autenticazione (Google LLC)', 'Finalità: autenticazione, hosting database. Sede: USA. Strumento di protezione: clausole contrattuali tipo UE (SCC).'],['Servizio IA (DeepSeek / Hangzhou DeepSeek AI Co., Ltd.)', 'Finalità: elaborazione IA principale delle richieste e del contenuto del CV. Sede: Cina. Vengono trasmessi solo i contenuti necessari alla richiesta; nessun dato del conto né di pagamento.'],['Servizio IA (Google LLC, Gemini)', 'Finalità: elaborazione IA di riserva. Sede: USA. Strumento: clausole contrattuali tipo UE. I dati non vengono usati per il training.'],['Stripe Inc.', 'Finalità: elaborazione pagamenti. Sede: USA. Stripe è certificato PCI-DSS.'],['Provider hosting cloud (Vercel Inc.)', 'Finalità: hosting dell\'applicazione web. Sede: USA. Strumento: clausole contrattuali tipo UE.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookie e memorizzazione locale">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookie necessari (sempre attivi)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Sessione Firebase Auth: autenticazione</li><li>localStorage: <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code></li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Cookie analitici opzionali (solo con consenso)</p><p className="text-xs mt-1">Nessun servizio di analisi di terze parti attualmente attivo.</p></div>
                </div>
              </Section>
              <Section title="7. Durata della conservazione"><ul className="list-disc pl-5 space-y-2"><li>Dati account: fino alla cancellazione dell'account</li><li>CV: non memorizzato permanentemente</li><li>Documenti contabili: 10 anni (diritto svizzero)</li><li>Statistiche di utilizzo: reimpostate mensilmente</li></ul></Section>
              <Section title="8. I tuoi diritti">
                <p>Hai i seguenti diritti ai sensi della LPD e del GDPR: accesso, rettifica, cancellazione, portabilità, opposizione, revoca del consenso, reclamo all'IFPDT (edoeb.admin.ch).</p>
                <p className="mt-4">Contatto: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Sicurezza dei dati"><ul className="list-disc pl-5 space-y-2"><li>Crittografia TLS/HTTPS di tutte le trasmissioni</li><li>Firebase Security Rules per il controllo degli accessi al database</li><li>Nessuna password in chiaro (Firebase Authentication)</li><li>Accesso ai dati di produzione riservato al personale autorizzato</li></ul></Section>
              <Section title="10. Modifiche"><p>Ci riserviamo il diritto di modificare questa informativa in qualsiasi momento. Gli utenti registrati saranno informati via e-mail in caso di modifiche sostanziali.</p></Section>
            </> : <>
              <Section title="1. Data Controller">
                <p>The controller responsible for data processing under Swiss data protection law (FADP) and the EU General Data Protection Regulation (GDPR) is:</p>
                <div className="mt-3 p-4 bg-[#F5F4F0] dark:bg-[#2A2A26] font-mono text-xs space-y-1"><p>JTSP</p><p>Operator of the Stellify platform</p><p>Switzerland</p><p>Email: support.stellify@gmail.com</p></div>
              </Section>
              <Section title="2. Personal Data Collected">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Account data:</strong> First name, email address (upon registration)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">CV content:</strong> Text of your uploaded resume (used for AI processing only, not permanently stored on our servers)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Usage data:</strong> Number of tool uses, chat requests, date of last reset</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Payment data:</strong> Processed exclusively by Stripe Inc. We do not receive full credit card data.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Technical data:</strong> Language settings, theme preference (stored locally in browser)</li>
                </ul>
              </Section>
              <Section title="3. Purposes of Processing">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Provision and improvement of platform features</li>
                  <li>Authentication and account management</li>
                  <li>Billing and payment processing (via Stripe)</li>
                  <li>Compliance with legal obligations</li>
                  <li>AI-powered career advice (processing of CV text via an external AI service)</li>
                </ul>
              </Section>
              <Section title="4. Legal Basis">
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Contract performance (Art. 6(1)(b) GDPR):</strong> Account and usage data are necessary to provide the service.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Consent (Art. 6(1)(a) GDPR):</strong> Optional analytics cookies.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Legitimate interest (Art. 6(1)(f) GDPR):</strong> Security and abuse prevention.</li>
                </ul>
              </Section>
              <Section title="5. Third-Party Data Sharing">
                <p>We only share data with the following processors:</p>
                <div className="mt-3 space-y-4">
                  {[['Authentication Service (Google LLC)', 'Purpose: Authentication, database hosting. Location: USA. Safeguard: EU Standard Contractual Clauses (SCCs).'],['AI Service (DeepSeek / Hangzhou DeepSeek AI Co., Ltd.)', 'Purpose: Primary AI processing of user requests and CV content. Location: China. Only the content required for the request is transmitted; no account or payment data.'],['AI Service (Google LLC, Gemini)', 'Purpose: AI processing as fallback. Location: USA. Safeguard: EU Standard Contractual Clauses. Input data is not used for model training.'],['Stripe Inc.', 'Purpose: Payment processing. Location: USA. Stripe is PCI-DSS certified.'],['Cloud Hosting Provider (Vercel Inc.)', 'Purpose: Web application hosting. Location: USA. Safeguard: EU Standard Contractual Clauses.']].map(([name, desc]) => (
                    <div key={name} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name}</p><p className="text-xs mt-1">{desc}</p></div>
                  ))}
                </div>
              </Section>
              <Section title="6. Cookies and Local Storage">
                <div className="mt-3 space-y-3">
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Necessary cookies (always active)</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4"><li>Firebase Auth Session: authentication</li><li>localStorage: <code className="bg-black/10 px-1">language</code>, <code className="bg-black/10 px-1">theme</code>, <code className="bg-black/10 px-1">cookieConsent</code>: user preferences</li></ul></div>
                  <div className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Optional analytics cookies (consent required)</p><p className="text-xs mt-1">No third-party analytics services are currently active.</p></div>
                </div>
              </Section>
              <Section title="7. Retention Periods"><ul className="list-disc pl-5 space-y-2"><li>Account data: until account deletion</li><li>CV text: not permanently stored</li><li>Payment records: 10 years (Swiss accounting law)</li><li>Usage statistics: reset monthly</li></ul></Section>
              <Section title="8. Your Rights">
                <p>Under Swiss FADP and GDPR, you have the right to: access, rectification, erasure, data portability, objection, withdrawal of consent, and to lodge a complaint with the FDPIC (edoeb.admin.ch).</p>
                <p className="mt-4">Contact: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a></p>
              </Section>
              <Section title="9. Data Security"><ul className="list-disc pl-5 space-y-2"><li>TLS/HTTPS encryption for all data transfers</li><li>Firebase Security Rules for database access control</li><li>No plaintext password storage (Firebase Authentication)</li><li>Production database access restricted to authorised personnel</li></ul></Section>
              <Section title="10. Changes to This Policy"><p>We reserve the right to update this Privacy Policy at any time. Registered users will be notified by email of material changes. The current version is always available on this page.</p></Section>
            </>}
          </article>
        )}

        {/* ======= IMPRESSUM ======= */}
        {activeView === 'impressum' && (
          <article>
            <header className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-3">
                {isDE ? 'Rechtliches' : isFR ? 'Mentions légales' : isIT ? 'Note legali' : 'Legal'}
              </p>
              <h1 className="text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4">
                {isDE ? 'Impressum' : isFR ? 'Mentions légales' : isIT ? 'Informazioni legali' : 'Legal Notice'}
              </h1>
              <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94]">{isDE ? `Stand: ${today}` : `${today}`}</p>
            </header>

            <Section title={isDE ? 'Betreiber und Verantwortlicher' : isFR ? 'Exploitant et responsable' : isIT ? 'Gestore e responsabile' : 'Operator & Controller'}>
              <div className="p-5 bg-[#F5F4F0] dark:bg-[#2A2A26] space-y-2 font-mono text-xs">
                <p className="text-base font-sans font-medium text-[#1A1A18] dark:text-[#FAFAF8]">Stellify</p>
                <p>{isDE ? 'Betreiber: JTSP' : isFR ? 'Exploitant : JTSP' : isIT ? 'Gestore: JTSP' : 'Operator: JTSP'}</p>
                <p>{isDE ? 'Schweiz' : isFR ? 'Suisse' : isIT ? 'Svizzera' : 'Switzerland'}</p>
              </div>
            </Section>

            <Section title={isDE ? 'Kontakt' : isFR ? 'Contact' : isIT ? 'Contatto' : 'Contact'}>
              <div className="p-5 bg-[#F5F4F0] dark:bg-[#2A2A26] space-y-2 text-sm">
                <p>E-Mail: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] dark:text-[#00A854] underline">support.stellify@gmail.com</a></p>
                <p>Website: stellify.ch</p>
              </div>
            </Section>

<Section title={isDE ? 'Haftungsausschluss' : isFR ? 'Clause de non-responsabilité' : isIT ? 'Esclusione di responsabilità' : 'Disclaimer'}>
              <p>{isDE ? 'Die Inhalte dieser Website werden mit grösstmöglicher Sorgfalt erstellt. Der Betreiber übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Inhalte. Die KI-generierten Texte dienen ausschliesslich als Hilfsmittel und ersetzen keine professionelle Rechts- oder Karriereberatung.' : isFR ? 'Les contenus de ce site sont créés avec le plus grand soin. L\'exploitant ne garantit cependant pas l\'exactitude, l\'exhaustivité et l\'actualité des contenus fournis. Les textes générés par IA servent uniquement d\'aide et ne remplacent pas un conseil professionnel juridique ou de carrière.' : isIT ? 'I contenuti di questo sito vengono creati con la massima cura. Tuttavia, il gestore non garantisce l\'accuratezza, la completezza e l\'attualità dei contenuti forniti. I testi generati dall\'IA servono esclusivamente come ausilio e non sostituiscono una consulenza professionale legale o di carriera.' : 'The contents of this website are created with the utmost care. However, the operator does not guarantee the accuracy, completeness or timeliness of the content provided. AI-generated texts serve solely as an aid and do not replace professional legal or career advice.'}</p>
            </Section>

            <Section title={isDE ? 'Urheberrecht' : isFR ? 'Droits d\'auteur' : isIT ? 'Diritto d\'autore' : 'Copyright'}>
              <p>{isDE ? 'Die auf dieser Website veröffentlichten Inhalte und Werke unterliegen dem Schweizer Urheberrecht. Jede Art von Vervielfältigung oder Verwendung bedarf der schriftlichen Genehmigung.' : isFR ? 'Les contenus et œuvres publiés sur ce site sont soumis au droit d\'auteur suisse. Toute reproduction ou utilisation requiert l\'autorisation écrite.' : isIT ? 'I contenuti e le opere pubblicati su questo sito sono soggetti al diritto d\'autore svizzero. Qualsiasi riproduzione o utilizzo richiede l\'autorizzazione scritta.' : 'The contents and works published on this website are subject to Swiss copyright law. Any reproduction or use requires written permission.'}</p>
            </Section>

            <Section title={isDE ? 'Anwendbares Recht' : isFR ? 'Droit applicable' : isIT ? 'Diritto applicabile' : 'Applicable Law'}>
              <p>{isDE ? 'Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist Zug, Schweiz.' : isFR ? 'Le droit suisse est exclusivement applicable. Le for juridique est Zoug, Suisse.' : isIT ? 'Si applica esclusivamente il diritto svizzero. Il foro competente è Zugo, Svizzera.' : 'Swiss law applies exclusively. Place of jurisdiction is Zug, Switzerland.'}</p>
            </Section>
          </article>
        )}

        {/* ======= AGB ======= */}
        {activeView === 'agb' && (
          <article>
            <header className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004225] dark:text-[#00A854] mb-3">
                {isDE ? 'Rechtliches' : isFR ? 'Mentions légales' : isIT ? 'Note legali' : 'Legal'}
              </p>
              <h1 className="text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-4">
                {isDE ? 'Allgemeine Geschäftsbedingungen (AGB)' : isFR ? 'Conditions générales d\'utilisation (CGU)' : isIT ? 'Condizioni generali di utilizzo (CGU)' : 'Terms and Conditions'}
              </h1>
              <p className="text-sm text-[#6B6B66] dark:text-[#9A9A94]">
                {isDE ? `Stand: ${today} · Anbieter: JTSP, Schweiz` : isFR ? `Mis à jour : ${today} · Fournisseur : JTSP, Suisse` : isIT ? `Aggiornato: ${today} · Fornitore: JTSP, Svizzera` : `Last updated: ${today} · Provider: JTSP, Switzerland`}
              </p>
            </header>

            {isDE ? <>
              <Section title="1. Vertragsgegenstand und Geltungsbereich">
                <p>Diese AGB gelten für alle Nutzungsverträge zwischen dem Anbieter JTSP, Betreiber der Plattform Stellify (nachfolgend „Stellify") und registrierten Nutzern der Plattform stellify.ch.</p>
                <p className="mt-2">Stellify bietet eine KI-gestützte Karriereplattform mit Tools zur Lebenslaufoptimierung, Interview-Vorbereitung, Gehaltsanalyse und weiteren Karriere-Diensten an.</p>
              </Section>
              <Section title="2. Vertragsschluss und Kontoregistrierung">
                <p>Der Vertrag kommt durch die Nutzung der Plattform oder den Abschluss eines Abonnements zustande. Mit der Registrierung oder dem Abschluss eines Abonnements gilt die Zustimmung zu diesen AGB und der Datenschutzrichtlinie als erteilt.</p>
                <p className="mt-2">Die Nutzung ist ab einem Mindestalter von <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 Jahren</strong> gestattet. Personen unter 18 Jahren benötigen für den Abschluss eines kostenpflichtigen Abonnements die Zustimmung eines Erziehungsberechtigten. (Rechtliche Grundlage: OR Art. 19; das Mindestalter von 14 Jahren entspricht dem typischen Eintrittsalter für Berufslehren in der Schweiz.)</p>
              </Section>
              <Section title="3. Leistungsumfang und Tarife">
                <div className="mt-3 space-y-3">
                  {[['Gratis-Plan (kostenlos)', ['3 KI-Generierungen','Bewerbungs-Generator & Bewerbungs-Übersicht','PDF-Export','Schweizer Karriere-Standards']],['Pro-Plan (CHF 19.90/Mo. · CHF 190.–/Jahr)', ['50 Generierungen pro Monat','Massgeschneiderte Bewerbungen mit KI','Stellen-Import per Link & Lebenslauf-Nutzung','Alle Standard-Designs','PDF- & Word-Export']],['Karriere+ (CHF 39.90/Mo. · CHF 349.–/Jahr)', ['Alles aus Pro','150 Generierungen pro Monat','Exklusive Premium-Designs','Persönlicher E-Mail-Support']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">Alle Preise in CHF, inkl. MwSt. Preisänderungen werden mindestens 30 Tage im Voraus angekündigt.</p>
              </Section>
              <Section title="4. Zahlung und Abrechnung"><p>Zahlung ausschliesslich via <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Abrechnung im Voraus, monatlich oder jährlich.</p></Section>
              <Section title="5. Widerrufsrecht"><p>Stellify bietet eine <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">7-Tage-Geld-zurück-Garantie</strong> für Erstkäufer. Anfragen an <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Laufzeit, Verlängerung und Kündigung">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Monatliches Abo:</strong> Läuft 1 Monat ab Kaufdatum und verlängert sich automatisch um jeweils einen weiteren Monat, sofern es nicht gekündigt wird.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Jährliches Abo:</strong> Läuft 12 Monate ab Kaufdatum und verlängert sich automatisch um jeweils ein weiteres Jahr, sofern es nicht gekündigt wird.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Kündigung:</strong> Jederzeit möglich, direkt in den Kontoeinstellungen unter «Abo verwalten & kündigen». Die Kündigung wirkt auf das Ende der laufenden Abrechnungsperiode; bis dahin bleibt der volle Zugriff bestehen. Danach wird das Konto automatisch auf den Gratis-Plan zurückgestuft.</li>
                </ul>
              </Section>
              <Section title="7. Nutzungsbeschränkungen"><ul className="list-disc pl-5 space-y-2"><li>Keine illegale Nutzung oder Täuschung Dritter</li><li>Kein Scraping / Bots</li><li>Keine Weitergabe von Zugangsdaten</li><li>Nutzer ist für die Richtigkeit von KI-Inhalten selbst verantwortlich</li></ul></Section>
              <Section title="7a. Nutzungs-Kontingente (verbindlich)">
                <p>Alle kostenpflichtigen Pläne stellen festgelegte Kontingente für KI-Anfragen bereit, die serverseitig durchgesetzt werden. <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+ ist ausdrücklich kein unbeschränkter Plan</strong>, sondern ein Premium-Plan mit höheren, jedoch klar definierten Limits.</p>
                <p className="mt-2">Zum Zeitpunkt der aktuellen Fassung gelten:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Gratis-Plan:</strong> 3 Generierungen lebenslang (Tool-Nutzungen)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Pro-Plan:</strong> 50 Generierungen pro Monat, max. 15 pro Minute</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+:</strong> 150 Generierungen pro Monat, max. 30 pro Minute</li>
                </ul>
                <p className="mt-2">Monatliche Kontingente werden am 1. des Monats (Europe/Zurich) zurückgesetzt, Tageskontingente täglich um 00:00 Uhr. Die Minuten-Limits dienen ausschliesslich dem Schutz vor Missbrauch und automatisierter Massennutzung.</p>
                <p className="mt-2">Eine <em>Erhöhung</em> der Kontingente ist jederzeit möglich und gilt automatisch zugunsten des Nutzers. Eine <em>Senkung</em> würde nur für nach der Änderung neu abgeschlossene Abonnements wirksam und vorab mit 30 Tagen Frist angekündigt.</p>
              </Section>
              <Section title="8. Geistiges Eigentum"><p>Alle Rechte an Plattform, Code, Design und Marken liegen beim Betreiber. KI-generierte Inhalte dürfen vom Nutzer für eigene Bewerbungsunterlagen verwendet werden.</p></Section>
              <Section title="9. Haftungsbeschränkung"><p>Stellify haftet nur für vorsätzliche oder grob fahrlässige Schäden. Gesamthaftung begrenzt auf den in den letzten 12 Monaten bezahlten Betrag.</p></Section>
              <Section title="9a. KI-Inhalte und Eigenverantwortung">
                <p>Stellify nutzt grosse Sprachmodelle (KI) von Drittanbietern (insbesondere Google Gemini und DeepSeek). Generierte Inhalte sind statistische Wahrscheinlichkeitsausgaben und können unvollständig, sachlich falsch, veraltet oder vollständig erfunden sein.</p>
                <p className="mt-2">Der Nutzer hat alle von Stellify generierten Inhalte vor jeder Verwendung sorgfältig zu prüfen, insbesondere:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Persönliche Angaben (Name, Anschrift, Geburtsdatum, Kontaktdaten)</li>
                  <li>Berufliche Stationen, Zeiträume, Titel, Abschlüsse und Qualifikationen</li>
                  <li>Aussagen zu Arbeitgebern, Branchen, Lohnbändern und Marktbedingungen</li>
                  <li>Rechtliche, steuerliche, medizinische oder ähnlich beratungsintensive Aussagen</li>
                </ul>
                <p className="mt-2">Falsche oder erfundene Angaben in Bewerbungsunterlagen können <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">arbeitsrechtliche, vertragliche oder strafrechtliche Folgen</strong> haben (z.B. Anfechtung des Arbeitsvertrags, fristlose Kündigung, Urkundenfälschung, Betrug). Diese liegen ausschliesslich beim Nutzer.</p>
                <p className="mt-2">Stellify haftet ausdrücklich nicht für Schäden, die durch ungeprüftes Verwenden KI-generierter Inhalte entstehen. insbesondere nicht für nicht erfolgreiche Bewerbungen, abgelehnte Stellen, Rückzug von Stellenangeboten, Vertragsverletzungen oder Reputationsschäden. Diese Klausel ergänzt §9 (Haftungsbeschränkung) und gilt vorrangig.</p>
              </Section>
              <Section title="10. Verfügbarkeit"><p>Keine Garantie auf unterbrechungsfreie Verfügbarkeit. Ausfälle von Firebase, Stripe oder Google AI liegen ausserhalb unseres Einflussbereichs.</p></Section>
              <Section title="11. Änderungen"><p>Anpassungen mit 30 Tagen Frist. Wesentliche Änderungen per E-Mail. Fortgesetzte Nutzung gilt als Zustimmung.</p></Section>
              <Section title="12. Anwendbares Recht"><p>Ausschliesslich <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Schweizer Recht</strong>. Gerichtsstand: Zug, Schweiz.</p></Section>
              <Section title="13. Streitbeilegung"><p>Kontakt: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. EU-Schlichtung: <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </> : isFR ? <>
              <Section title="1. Objet et champ d'application"><p>Les présentes CGU régissent tous les contrats d'utilisation entre le fournisseur JTSP, exploitant de la plateforme Stellify (ci-après «Stellify») et les utilisateurs inscrits de la plateforme stellify.ch. Stellify propose une plateforme de carrière assistée par IA.</p></Section>
              <Section title="2. Conclusion du contrat">
                <p>Le contrat est conclu par l'utilisation de la plateforme ou la souscription d'un abonnement. En s'inscrivant ou en souscrivant un abonnement, l'utilisateur accepte implicitement les présentes CGU et la politique de confidentialité.</p>
                <p className="mt-2">L'utilisation est autorisée dès l'âge de <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 ans</strong>. Les personnes mineures (moins de 18 ans) doivent obtenir le consentement d'un représentant légal pour souscrire un abonnement payant.</p>
              </Section>
              <Section title="3. Prestations et tarifs">
                <div className="mt-3 space-y-3">
                  {[['Plan Gratuit (gratuit)', ['3 générations IA','Générateur de candidatures & aperçu des candidatures','Export PDF','Standards suisses']],['Plan Pro (CHF 19.90/mois · CHF 190.–/an)', ['50 générations par mois','Candidatures sur mesure avec IA','Import d\'offres par lien & utilisation du CV','Tous les designs standard','Export PDF & Word']],['Karriere+ (CHF 39.90/mois · CHF 349.–/an)', ['Tout de Pro','150 générations par mois','Designs Premium exclusifs','Support e-mail personnel']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">Tous les prix en CHF, TVA incluse. Les modifications de prix sont annoncées 30 jours à l'avance.</p>
              </Section>
              <Section title="4. Paiement"><p>Paiement exclusivement via <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Facturation en avance, mensuelle ou annuelle.</p></Section>
              <Section title="5. Droit de rétractation"><p>Stellify offre une <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">garantie de remboursement de 7 jours</strong> pour les premiers acheteurs. Demandes à <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Durée, renouvellement et résiliation">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abonnement mensuel :</strong> Court 1 mois à compter de la date d'achat et se renouvelle automatiquement d'un mois à la fois, sauf résiliation.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abonnement annuel :</strong> Court 12 mois à compter de la date d'achat et se renouvelle automatiquement d'une année à la fois, sauf résiliation.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Résiliation :</strong> Possible à tout moment, directement dans les paramètres du compte sous «Gérer et résilier l'abonnement». Elle prend effet à la fin de la période de facturation en cours; l'accès complet reste garanti jusque-là. Le compte passe ensuite automatiquement au plan gratuit.</li>
                </ul>
              </Section>
              <Section title="7. Restrictions d'utilisation"><ul className="list-disc pl-5 space-y-2"><li>Pas d'utilisation illégale ni de tromperie de tiers</li><li>Pas de scraping / bots</li><li>Pas de partage d'identifiants</li><li>L'utilisateur est responsable de l'exactitude des contenus IA</li></ul></Section>
              <Section title="7a. Quotas d'utilisation (engageants)">
                <p>Tous les plans payants prévoient des quotas définis de requêtes IA, appliqués côté serveur. <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+ n'est expressément pas un plan illimité</strong>, mais un plan Premium avec des limites supérieures clairement définies.</p>
                <p className="mt-2">À la date de la version actuelle, les limites sont :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Plan Gratuit :</strong> 3 générations à vie (utilisations d'outils)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Plan Pro :</strong> 50 générations par mois, max. 15 par minute</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+ :</strong> 150 générations par mois, max. 30 par minute</li>
                </ul>
                <p className="mt-2">Les quotas mensuels sont réinitialisés le 1er du mois (Europe/Zurich), les quotas journaliers à 00h00. Les limites par minute servent exclusivement à prévenir les abus et l'utilisation automatisée de masse.</p>
                <p className="mt-2">Une <em>augmentation</em> des quotas est possible à tout moment et s'applique automatiquement en faveur de l'utilisateur. Une <em>diminution</em> ne s'appliquerait qu'aux abonnements souscrits après la modification et serait annoncée 30 jours à l'avance.</p>
              </Section>
              <Section title="8. Propriété intellectuelle"><p>Tous les droits sur la plateforme, le code, le design et les marques appartiennent à l'exploitant. Les contenus générés par IA peuvent être utilisés par l'utilisateur pour ses dossiers de candidature.</p></Section>
              <Section title="9. Limitation de responsabilité"><p>Stellify n'est responsable que des dommages causés intentionnellement ou par négligence grave. Responsabilité totale limitée aux montants payés au cours des 12 derniers mois.</p></Section>
              <Section title="9a. Contenus IA et responsabilité de l'utilisateur">
                <p>Stellify utilise de grands modèles de langage (IA) de tiers (notamment Google Gemini et DeepSeek). Les contenus générés sont des sorties probabilistes statistiques et peuvent être incomplets, factuellement incorrects, obsolètes ou entièrement inventés.</p>
                <p className="mt-2">L'utilisateur doit vérifier soigneusement tous les contenus générés par Stellify avant chaque utilisation, en particulier :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Données personnelles (nom, adresse, date de naissance, coordonnées)</li>
                  <li>Étapes professionnelles, périodes, titres, diplômes et qualifications</li>
                  <li>Affirmations sur des employeurs, secteurs, fourchettes salariales ou conditions de marché</li>
                  <li>Affirmations juridiques, fiscales, médicales ou autres nécessitant un conseil professionnel</li>
                </ul>
                <p className="mt-2">Des informations fausses ou inventées dans des dossiers de candidature peuvent avoir des <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">conséquences en droit du travail, contractuelles ou pénales</strong> (p. ex. annulation du contrat de travail, licenciement immédiat, faux et usage de faux, escroquerie). Celles-ci incombent exclusivement à l'utilisateur.</p>
                <p className="mt-2">Stellify n'est expressément pas responsable des dommages résultant de l'utilisation non vérifiée des contenus générés par l'IA. notamment pour des candidatures infructueuses, postes refusés, retraits d'offres d'emploi, violations contractuelles ou atteintes à la réputation. Cette clause complète §9 (Limitation de responsabilité) et prime sur celle-ci.</p>
              </Section>
              <Section title="10. Disponibilité"><p>Aucune garantie de disponibilité ininterrompue. Les pannes de Firebase, Stripe ou Google AI échappent à notre contrôle.</p></Section>
              <Section title="11. Modifications"><p>Modifications avec un préavis de 30 jours. Changements importants communiqués par e-mail.</p></Section>
              <Section title="12. Droit applicable"><p>Le <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">droit suisse</strong> s'applique exclusivement. For juridique : Zoug, Suisse.</p></Section>
              <Section title="13. Règlement des litiges"><p>Contact : <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. Plateforme de médiation UE : <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </> : isIT ? <>
              <Section title="1. Oggetto e ambito di applicazione"><p>Le presenti CGU disciplinano tutti i contratti d'uso tra il fornitore JTSP, gestore della piattaforma Stellify (di seguito «Stellify») e gli utenti registrati della piattaforma stellify.ch.</p></Section>
              <Section title="2. Conclusione del contratto">
                <p>Il contratto si conclude con l'utilizzo della piattaforma o la sottoscrizione di un abbonamento. Registrandosi o sottoscrivendo un abbonamento, l'utente accetta implicitamente le presenti CGU e l'informativa sulla privacy.</p>
                <p className="mt-2">L'utilizzo è consentito a partire dai <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 anni</strong>. I minorenni (sotto i 18 anni) necessitano del consenso di un rappresentante legale per sottoscrivere un abbonamento a pagamento.</p>
              </Section>
              <Section title="3. Prestazioni e tariffe">
                <div className="mt-3 space-y-3">
                  {[['Piano Gratuito (gratuito)', ['3 generazioni IA','Generatore di candidature & panoramica candidature','Esportazione PDF','Standard svizzeri']],['Piano Pro (CHF 19.90/mese · CHF 190.–/anno)', ['50 generazioni al mese','Candidature su misura con IA','Import di annunci da link & uso del CV','Tutti i design standard','Esportazione PDF & Word']],['Karriere+ (CHF 39.90/mese · CHF 349.–/anno)', ['Tutto di Pro','150 generazioni al mese','Design Premium esclusivi','Supporto e-mail personale']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">Tutti i prezzi in CHF, IVA inclusa. Le modifiche dei prezzi vengono comunicate con 30 giorni di preavviso.</p>
              </Section>
              <Section title="4. Pagamento"><p>Pagamento esclusivamente tramite <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Fatturazione anticipata, mensile o annuale.</p></Section>
              <Section title="5. Diritto di recesso"><p>Stellify offre una <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">garanzia di rimborso di 7 giorni</strong> per i nuovi acquirenti. Richieste a <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Durata, rinnovo e disdetta">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abbonamento mensile:</strong> Dura 1 mese dalla data di acquisto e si rinnova automaticamente di un mese alla volta, salvo disdetta.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Abbonamento annuale:</strong> Dura 12 mesi dalla data di acquisto e si rinnova automaticamente di un anno alla volta, salvo disdetta.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Disdetta:</strong> Possibile in qualsiasi momento, direttamente nelle impostazioni del conto sotto «Gestisci e disdici l'abbonamento». Ha effetto alla fine del periodo di fatturazione in corso; fino ad allora l'accesso completo resta garantito. Poi l'account passa automaticamente al piano gratuito.</li>
                </ul>
              </Section>
              <Section title="7. Restrizioni d'uso"><ul className="list-disc pl-5 space-y-2"><li>Nessun utilizzo illegale né inganno di terzi</li><li>Nessun scraping / bot</li><li>Nessuna condivisione di credenziali</li><li>L'utente è responsabile dell'accuratezza dei contenuti IA</li></ul></Section>
              <Section title="7a. Limiti di utilizzo (vincolanti)">
                <p>Tutti i piani a pagamento prevedono limiti definiti per le richieste IA, applicati lato server. <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+ non è espressamente un piano illimitato</strong>, ma un piano Premium con limiti più elevati ma chiaramente definiti.</p>
                <p className="mt-2">Alla data della versione attuale valgono:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Piano Gratuito:</strong> 3 generazioni a vita (utilizzi di strumenti)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Piano Pro:</strong> 50 generazioni al mese, max. 15 al minuto</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+:</strong> 150 generazioni al mese, max. 30 al minuto</li>
                </ul>
                <p className="mt-2">I limiti mensili vengono reimpostati il 1° del mese (Europe/Zurich), i limiti giornalieri alle 00:00. I limiti al minuto servono esclusivamente a prevenire abusi e utilizzo automatizzato di massa.</p>
                <p className="mt-2">Un <em>aumento</em> dei limiti è possibile in qualsiasi momento e si applica automaticamente a favore dell'utente. Una <em>riduzione</em> si applicherebbe solo agli abbonamenti sottoscritti dopo la modifica e verrebbe annunciata con 30 giorni di preavviso.</p>
              </Section>
              <Section title="8. Proprietà intellettuale"><p>Tutti i diritti sulla piattaforma, il codice, il design e i marchi appartengono al gestore. I contenuti generati dall'IA possono essere utilizzati dall'utente per i propri documenti di candidatura.</p></Section>
              <Section title="9. Limitazione di responsabilità"><p>Stellify risponde solo per danni causati intenzionalmente o per colpa grave. Responsabilità totale limitata agli importi pagati negli ultimi 12 mesi.</p></Section>
              <Section title="9a. Contenuti IA e responsabilità dell'utente">
                <p>Stellify utilizza grandi modelli linguistici (IA) di terze parti (in particolare Google Gemini e DeepSeek). I contenuti generati sono output probabilistici statistici e possono essere incompleti, fattualmente errati, obsoleti o interamente inventati.</p>
                <p className="mt-2">L'utente deve verificare attentamente tutti i contenuti generati da Stellify prima di ogni utilizzo, in particolare:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Dati personali (nome, indirizzo, data di nascita, contatti)</li>
                  <li>Tappe professionali, periodi, titoli, diplomi e qualifiche</li>
                  <li>Affermazioni su datori di lavoro, settori, fasce salariali o condizioni di mercato</li>
                  <li>Affermazioni legali, fiscali, mediche o altre che richiedono consulenza professionale</li>
                </ul>
                <p className="mt-2">Informazioni false o inventate nei documenti di candidatura possono avere <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">conseguenze giuslavoristiche, contrattuali o penali</strong> (ad es. annullamento del contratto di lavoro, licenziamento immediato, falsificazione di documenti, truffa). Queste ricadono esclusivamente sull'utente.</p>
                <p className="mt-2">Stellify non è espressamente responsabile dei danni derivanti dall'uso non verificato dei contenuti generati dall'IA. in particolare per candidature non riuscite, posizioni rifiutate, ritiri di offerte di lavoro, violazioni contrattuali o danni reputazionali. Questa clausola integra §9 (Limitazione di responsabilità) e ha precedenza.</p>
              </Section>
              <Section title="10. Disponibilità"><p>Nessuna garanzia di disponibilità ininterrotta. I guasti di Firebase, Stripe o Google AI esulano dal nostro controllo.</p></Section>
              <Section title="11. Modifiche"><p>Modifiche con 30 giorni di preavviso. Cambiamenti sostanziali comunicati via e-mail.</p></Section>
              <Section title="12. Diritto applicabile"><p>Si applica esclusivamente il <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">diritto svizzero</strong>. Foro competente: Zugo, Svizzera.</p></Section>
              <Section title="13. Risoluzione delle controversie"><p>Contatto: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. Piattaforma di mediazione UE: <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </> : <>
              <Section title="1. Subject Matter and Scope"><p>These Terms govern all usage agreements between the provider JTSP, operator of the Stellify platform (hereinafter "Stellify") and registered users of stellify.ch. Stellify offers an AI-powered career platform with CV optimisation, interview preparation, salary analysis and other career services.</p></Section>
              <Section title="2. Contract Formation">
                <p>The contract is formed upon using the platform or subscribing to a plan. By registering or subscribing, users implicitly accept these Terms and the Privacy Policy.</p>
                <p className="mt-2">Use is permitted from the age of <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">14 years</strong>. Users under 18 require parental or guardian consent to subscribe to a paid plan. (Legal basis: Swiss CO Art. 19; the minimum age of 14 reflects typical apprenticeship entry age in Switzerland.)</p>
              </Section>
              <Section title="3. Services and Pricing">
                <div className="mt-3 space-y-3">
                  {[['Free Plan (no cost)', ['3 AI generations','Application generator & application overview','PDF export','Swiss career standards']],['Pro Plan (CHF 19.90/mo · CHF 190.–/yr)', ['50 generations per month','Tailored applications with AI','Job import by link & CV reuse','All standard designs','PDF & Word export']],['Karriere+ (CHF 39.90/mo · CHF 349.–/yr)', ['Everything in Pro','150 generations per month','Exclusive Premium designs','Personal email support']]].map(([name, items]) => (
                    <div key={name as string} className="p-4 bg-[#F5F4F0] dark:bg-[#2A2A26]"><p className="font-medium text-[#1A1A18] dark:text-[#FAFAF8]">{name as string}</p><ul className="text-xs mt-2 space-y-1 list-disc pl-4">{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul></div>
                  ))}
                </div>
                <p className="mt-3">All prices in CHF, incl. VAT. Price changes announced at least 30 days in advance.</p>
              </Section>
              <Section title="4. Payment"><p>Payment exclusively via <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Stripe Inc.</strong> Billed in advance, monthly or annually.</p></Section>
              <Section title="5. Right of Withdrawal"><p>Stellify offers a <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">7-day money-back guarantee</strong> for first-time buyers. Requests to <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>.</p></Section>
              <Section title="6. Duration, Renewal and Cancellation">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Monthly subscription:</strong> Runs for 1 month from purchase date and renews automatically one month at a time unless cancelled.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Annual subscription:</strong> Runs for 12 months from purchase date and renews automatically one year at a time unless cancelled.</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Cancellation:</strong> Possible at any time, directly in the account settings under "Manage &amp; cancel subscription". It takes effect at the end of the current billing period; full access remains until then. The account then automatically reverts to the Free Plan.</li>
                </ul>
              </Section>
              <Section title="7. Usage Restrictions"><ul className="list-disc pl-5 space-y-2"><li>No illegal use or deception of third parties</li><li>No automated scraping or bots</li><li>No sharing of login credentials</li><li>Users are responsible for verifying the accuracy of AI-generated content</li></ul></Section>
              <Section title="7a. Usage quotas (binding)">
                <p>All paid plans provide defined AI request quotas that are enforced server-side. <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+ is expressly not an unlimited plan</strong>, but a Premium plan with higher yet clearly defined limits.</p>
                <p className="mt-2">As of the current version the limits are:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Free Plan:</strong> 3 lifetime generations (tool uses)</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Pro Plan:</strong> 50 generations per month, max. 15 per minute</li>
                  <li><strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Karriere+:</strong> 150 generations per month, max. 30 per minute</li>
                </ul>
                <p className="mt-2">Monthly quotas reset on the 1st of each month (Europe/Zurich), daily quotas at 00:00. The per-minute limits serve solely to prevent abuse and automated mass use.</p>
                <p className="mt-2">An <em>increase</em> of quotas is possible at any time and applies automatically in favour of the user. A <em>decrease</em> would only apply to subscriptions taken out after the change and would be announced 30 days in advance.</p>
              </Section>
              <Section title="8. Intellectual Property"><p>All rights to the platform, code, design and trademarks belong to the operator. AI-generated content may be used by the user for their own job applications.</p></Section>
              <Section title="9. Limitation of Liability"><p>Stellify is only liable for damages caused by wilful misconduct or gross negligence. Total liability is capped at the amount paid by the user in the last 12 months.</p></Section>
              <Section title="9a. AI Content and User Responsibility">
                <p>Stellify uses third-party large language models (AI), notably Google Gemini and DeepSeek. Generated content consists of statistical probability outputs and may be incomplete, factually incorrect, outdated or entirely fabricated.</p>
                <p className="mt-2">The user must carefully check all content generated by Stellify before each use, in particular:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Personal details (name, address, date of birth, contact information)</li>
                  <li>Career steps, periods, titles, degrees and qualifications</li>
                  <li>Statements about employers, industries, salary ranges or market conditions</li>
                  <li>Legal, tax, medical or other statements requiring professional advice</li>
                </ul>
                <p className="mt-2">Incorrect or fabricated information in application materials may have <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">employment-law, contractual or criminal consequences</strong> (e.g. rescission of the employment contract, immediate dismissal, document forgery, fraud). These rest exclusively with the user.</p>
                <p className="mt-2">Stellify is expressly not liable for damages caused by unverified use of AI-generated content. in particular not for unsuccessful applications, rejected positions, withdrawn job offers, breaches of contract or reputational damage. This clause supplements §9 (Limitation of Liability) and takes precedence.</p>
              </Section>
              <Section title="10. Availability"><p>No guarantee of uninterrupted availability. Outages of Firebase, Stripe or Google AI are outside our control.</p></Section>
              <Section title="11. Changes"><p>Changes to these Terms with 30 days' notice. Material changes communicated by email. Continued use constitutes acceptance.</p></Section>
              <Section title="12. Applicable Law"><p>Exclusively <strong className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">Swiss law</strong> applies. Place of jurisdiction: Zug, Switzerland.</p></Section>
              <Section title="13. Dispute Resolution"><p>Contact: <a href="mailto:support.stellify@gmail.com" className="text-[#004225] underline">support.stellify@gmail.com</a>. EU dispute resolution: <a href="https://ec.europa.eu/consumers/odr" className="text-[#004225] underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p></Section>
            </>}
          </article>
        )}

        {/* ======= ÜBER UNS ======= */}
        {activeView === 'about' && (() => {
          const c = isDE ? {
            eyebrow: 'Unsere Geschichte', h1: 'Über Uns',
            lede: 'Wie aus zwei Wörtern eine Mission wurde.',
            founderLabel: 'Vom Gründer',
            founderQuote: 'Ich hätte mir früher selbst ein Werkzeug wie Stellify gewünscht. Eines, das den Schweizer Arbeitsmarkt wirklich versteht.',
            founderAttr: 'Der Gründer',
            whyTitle: 'Warum es Stellify gibt',
            whyP1: 'Die Idee entstand aus persönlicher Erfahrung. Lange Zeit gab es zwar zahlreiche künstliche Intelligenzen am Markt, aber keine, die sich auf die Schweiz spezialisiert hat. Keine, die Schweizer Bewerbungsstandards kennt, Schweizer Gehaltsbänder versteht und mit allen vier Landessprachen arbeitet.',
            whyP2: 'Stellify füllt diese Lücke. Eine KI, die nicht mit Standard-Antworten arbeitet, sondern den Schweizer Berufsalltag wirklich kennt. Mit präzisen Werkzeugen für jede Phase deiner Karriere: vom Lebenslauf optimieren über Bewerbungen erstellen bis zur Vorbereitung auf das Vorstellungsgespräch.',
            whyP3: 'Das Versprechen ist einfach. Schweizer Exzellenz, automatisiert. Für jeden zugänglich.',
            nameTitle: 'Der Name',
            nameIntro: 'Hinter Stellify stehen zwei Bedeutungen, die sich in einem einzigen Wort vereinen.',
            stellDesc: 'Vom deutschen Wort Stellen. Wir helfen dir, die passende Stelle zu finden, die zu dir passt.',
            ifyDesc: 'Vom lateinischen stellificare. Das bedeutet so viel wie zum Stern werden. Eine alte Vorstellung aus der römischen Mythologie, nach der grosse Persönlichkeiten zu Sternen am Himmel wurden.',
            nameSummary: 'Stellify bedeutet damit wörtlich, jemanden zum Stern zu machen. Eine berufliche Identität, die strahlt.',
            stellaTitle: 'Stella, die KI hinter Stellify',
            stellaDesc: 'Stella ist der Name unserer KI. Der Begriff kommt aus dem Lateinischen, wo stella schlicht Stern bedeutet. Stella arbeitet im Hintergrund jedes Tools: Sie schreibt deine Bewerbung, optimiert deinen Lebenslauf, analysiert Stellenanzeigen und bereitet dich auf Vorstellungsgespräche vor. Du chattest nicht mit ihr, du nutzt sie. Wie ein Stern, der den Weg leise vorgibt.',
            statLanguages: 'Sprachen', statAvailable: 'Verfügbar', statHq: 'Schweizer Sitz', statLaw: 'Recht und Datenschutz',
            oneClickTitle: 'Mit einem Klick zum Resultat',
            oneClickLabel: 'Klick',
            oneClickP1: 'Was früher Stunden gebraucht hat, geschieht heute in Sekunden. Lebenslauf-Analyse, Interview-Vorbereitung, Lohnverhandlungs-Strategie, ATS-Optimierung.',
            oneClickP2: 'Die KI übernimmt die Recherche, die Formulierung, die Schweizer Marktanalyse. Du bekommst das fertige Resultat. Präzise. Sofort einsatzbereit.',
            swissTitle: 'Made in Switzerland',
            swissDesc: 'Stellify wurde in der Schweiz gegründet und entwickelt. Wir verbinden Schweizer Sorgfalt, Datenschutz und Präzision mit moderner künstlicher Intelligenz. Unser Sitz ist in Zug, im Herzen der Schweizer Innovation.',
          } : isFR ? {
            eyebrow: 'Notre histoire', h1: 'À Propos',
            lede: 'Comment deux mots sont devenus une mission.',
            founderLabel: 'Du fondateur',
            founderQuote: "J'aurais aimé avoir moi-même un outil comme Stellify. Un outil qui comprenne vraiment le marché du travail suisse.",
            founderAttr: 'Le fondateur',
            whyTitle: 'Pourquoi Stellify existe',
            whyP1: "L'idée est née d'une expérience personnelle. Pendant longtemps, de nombreuses intelligences artificielles existaient déjà sur le marché, mais aucune spécialisée pour la Suisse. Aucune qui connaisse les standards de candidature suisses, comprenne les fourchettes salariales suisses et travaille dans les quatre langues nationales.",
            whyP2: "Stellify comble ce manque. Une IA qui ne se contente pas de réponses standards, mais qui connaît réellement le quotidien professionnel suisse. Avec des outils précis pour chaque phase de ta carrière : de l'optimisation du CV à la rédaction de candidatures, jusqu'à la préparation aux entretiens.",
            whyP3: "La promesse est simple. L'excellence suisse, automatisée. Accessible à tous.",
            nameTitle: 'Le nom',
            nameIntro: 'Derrière Stellify se rejoignent deux significations dans un seul mot.',
            stellDesc: "Du mot allemand Stellen, qui signifie «postes». Nous t'aidons à trouver le poste qui te correspond.",
            ifyDesc: "Du latin stellificare. Cela signifie devenir une étoile. Une vieille idée de la mythologie romaine selon laquelle les grandes personnalités devenaient des étoiles dans le ciel.",
            nameSummary: 'Stellify signifie ainsi littéralement transformer quelqu\'un en étoile. Une identité professionnelle qui brille.',
            stellaTitle: 'Stella, l\'IA derrière Stellify',
            stellaDesc: "Stella est le nom de notre IA. Le terme vient du latin, où stella signifie simplement étoile. Stella travaille en arrière-plan de chaque outil : elle rédige tes candidatures, optimise ton CV, analyse les offres d'emploi et te prépare aux entretiens. Tu ne discutes pas avec elle, tu l'utilises. Comme une étoile qui indique discrètement la voie.",
            statLanguages: 'Langues', statAvailable: 'Disponible', statHq: 'Siège suisse', statLaw: 'Droit et confidentialité',
            oneClickTitle: 'En un clic, le résultat',
            oneClickLabel: 'Clic',
            oneClickP1: "Ce qui prenait des heures se passe désormais en secondes. Analyse de CV, préparation aux entretiens, stratégie de négociation salariale, optimisation ATS.",
            oneClickP2: "L'IA prend en charge la recherche, la formulation, l'analyse du marché suisse. Tu reçois le résultat fini. Précis. Prêt à l'emploi immédiatement.",
            swissTitle: 'Made in Switzerland',
            swissDesc: "Stellify a été fondée et développée en Suisse. Nous allions soin suisse, protection des données et précision avec une IA moderne. Notre siège est à Zoug, au cœur de l'innovation suisse.",
          } : isIT ? {
            eyebrow: 'La nostra storia', h1: 'Chi Siamo',
            lede: 'Come due parole sono diventate una missione.',
            founderLabel: 'Dal fondatore',
            founderQuote: 'Avrei voluto avere io stesso uno strumento come Stellify. Uno strumento che capisca davvero il mercato del lavoro svizzero.',
            founderAttr: 'Il fondatore',
            whyTitle: 'Perché esiste Stellify',
            whyP1: "L'idea è nata da un'esperienza personale. Per molto tempo erano già presenti sul mercato numerose intelligenze artificiali, ma nessuna specializzata per la Svizzera. Nessuna che conoscesse gli standard di candidatura svizzeri, comprendesse le fasce salariali svizzere e lavorasse in tutte e quattro le lingue nazionali.",
            whyP2: "Stellify colma questa lacuna. Un'IA che non si limita a risposte standard, ma conosce davvero la quotidianità professionale svizzera. Con strumenti precisi per ogni fase della carriera: dall'ottimizzazione del CV alla creazione di candidature, fino alla preparazione ai colloqui.",
            whyP3: "La promessa è semplice. L'eccellenza svizzera, automatizzata. Accessibile a tutti.",
            nameTitle: 'Il nome',
            nameIntro: 'Dietro Stellify si incontrano due significati in una sola parola.',
            stellDesc: 'Dalla parola tedesca Stellen, che significa «posizioni». Ti aiutiamo a trovare la posizione giusta per te.',
            ifyDesc: "Dal latino stellificare. Significa diventare una stella. Un'antica idea della mitologia romana, secondo cui le grandi personalità diventavano stelle nel cielo.",
            nameSummary: "Stellify significa quindi letteralmente trasformare qualcuno in una stella. Un'identità professionale che brilla.",
            stellaTitle: 'Stella, l\'IA dietro Stellify',
            stellaDesc: 'Stella è il nome della nostra IA. Il termine viene dal latino, dove stella significa semplicemente stella. Stella lavora in background in ogni strumento: scrive le tue candidature, ottimizza il tuo CV, analizza gli annunci di lavoro e ti prepara ai colloqui. Non chatti con lei, la usi. Come una stella che indica silenziosamente la rotta.',
            statLanguages: 'Lingue', statAvailable: 'Disponibile', statHq: 'Sede svizzera', statLaw: 'Diritto e privacy',
            oneClickTitle: 'In un click, il risultato',
            oneClickLabel: 'Click',
            oneClickP1: "Quello che prima richiedeva ore, oggi avviene in secondi. Analisi del CV, preparazione al colloquio, strategia di negoziazione salariale, ottimizzazione ATS.",
            oneClickP2: "L'IA si occupa della ricerca, della formulazione, dell'analisi del mercato svizzero. Ricevi il risultato finito. Preciso. Pronto all'uso.",
            swissTitle: 'Made in Switzerland',
            swissDesc: "Stellify è stata fondata e sviluppata in Svizzera. Uniamo cura svizzera, protezione dei dati e precisione con un'IA moderna. La nostra sede è a Zugo, nel cuore dell'innovazione svizzera.",
          } : {
            eyebrow: 'Our Story', h1: 'About Us',
            lede: 'How two words became one mission.',
            founderLabel: 'From the founder',
            founderQuote: "I wish I'd had a tool like Stellify myself, back then. One that truly understands the Swiss job market.",
            founderAttr: 'The founder',
            whyTitle: 'Why Stellify exists',
            whyP1: "The idea came from personal experience. For a long time, many artificial intelligences already existed on the market, but none specialised for Switzerland. None that knew Swiss application standards, understood Swiss salary ranges and worked across all four national languages.",
            whyP2: "Stellify fills that gap. An AI that doesn't rely on stock answers, but truly understands the Swiss working world. With precise tools for every phase of your career: from CV optimisation to application drafting through to interview preparation.",
            whyP3: 'The promise is simple. Swiss excellence, automated. Accessible to everyone.',
            nameTitle: 'The name',
            nameIntro: 'Two meanings meet in a single word Stellify.',
            stellDesc: 'From the German word Stellen, meaning positions or jobs. We help you find the position that fits you.',
            ifyDesc: "From the Latin stellificare. It means becoming a star. An old idea from Roman mythology that great figures would turn into stars in the sky.",
            nameSummary: 'Stellify thus literally means to turn someone into a star. A professional identity that shines.',
            stellaTitle: 'Stella, the AI behind Stellify',
            stellaDesc: 'Stella is the name of our AI. The word comes from Latin, where stella simply means star. Stella works in the background of every tool: she writes your applications, optimises your CV, analyses job ads and prepares you for interviews. You don\'t chat with her. you use her. Like a star quietly showing the way.',
            statLanguages: 'Languages', statAvailable: 'Available', statHq: 'Swiss HQ', statLaw: 'Law and Privacy',
            oneClickTitle: 'One click. Done.',
            oneClickLabel: 'Click',
            oneClickP1: 'What used to take hours now happens in seconds. CV analysis, interview preparation, salary negotiation strategy, ATS optimisation.',
            oneClickP2: 'The AI handles the research, the wording, the Swiss market analysis. You get the finished result. Precise. Ready to use immediately.',
            swissTitle: 'Made in Switzerland',
            swissDesc: 'Stellify was founded and developed in Switzerland. We combine Swiss care, data protection, and precision with modern AI. Our home is in Zug, at the heart of Swiss innovation.',
          };

          return (
          <article>
            {/* HERO */}
            <header className="mb-20 max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#004225] dark:text-[#00A854] mb-6">
                {c.eyebrow}
              </p>
              <h1 className="text-5xl md:text-7xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-8 leading-[0.95] tracking-tight">
                {c.h1}
              </h1>
              <p className="text-xl md:text-2xl text-[#4A4A45] dark:text-[#9A9A94] font-serif italic leading-snug">
                {c.lede}
              </p>
            </header>

            {/* FOUNDER PULL QUOTE */}
            <div className="my-20 py-14 border-t border-b border-[#004225]/15 dark:border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#004225] dark:text-[#00A854] mb-8">
                {c.founderLabel}
              </p>
              <blockquote className="font-serif text-2xl md:text-4xl text-[#1A1A18] dark:text-[#FAFAF8] leading-tight mb-8 max-w-3xl">
                «{c.founderQuote}»
              </blockquote>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6B6B66] dark:text-[#9A9A94]">
                {c.founderAttr}
              </p>
            </div>

            {/* WARUM ES STELLIFY GIBT */}
            <div className="mb-24 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-10 leading-tight">
                {c.whyTitle}
              </h2>
              <div className="space-y-6 text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">
                <p>{c.whyP1}</p>
                <p>{c.whyP2}</p>
                <p className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">{c.whyP3}</p>
              </div>
            </div>

            {/* DER NAME */}
            <div className="mb-24">
              <h2 className="text-3xl md:text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-10 leading-tight max-w-2xl">
                {c.nameTitle}
              </h2>
              <p className="text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light max-w-2xl mb-12">
                {c.nameIntro}
              </p>

              {/* Big wordmark display. full brand lockup */}
              <div className="text-center my-16 pt-16 pb-20 border-y border-[#004225]/10 dark:border-white/10">
                <svg width="56" height="56" viewBox="0 0 32 32" className="text-[#004225] dark:text-[#00A854] mx-auto mb-8" aria-hidden="true">
                  <path d="M16 4L19 14L29 16L19 18L16 28L13 18L3 16L13 14Z" fill="currentColor"/>
                </svg>
                <p className="font-serif text-7xl md:text-9xl text-[#1A1A18] dark:text-[#FAFAF8] tracking-tight leading-none" style={{paddingBottom: '.22em'}}>
                  Stell<span className="text-[#004225] dark:text-[#00A854]">ify</span>
                </p>
              </div>

              {/* Two columns: Stell- and -ify */}
              <div className="grid md:grid-cols-2 gap-12 md:gap-20 mb-12">
                <div>
                  <p className="font-serif text-5xl md:text-6xl text-[#004225] dark:text-[#00A854] tracking-tight leading-none" style={{paddingBottom: '.18em'}}>Stell<span className="opacity-30">·</span></p>
                  <div className="w-12 h-px bg-[#004225]/40 dark:bg-[#00A854]/40 mt-2 mb-6"></div>
                  <p className="text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">
                    {c.stellDesc}
                  </p>
                </div>
                <div>
                  <p className="font-serif text-5xl md:text-6xl text-[#004225] dark:text-[#00A854] tracking-tight leading-none" style={{paddingBottom: '.22em'}}><span className="opacity-30">·</span>ify</p>
                  <div className="w-12 h-px bg-[#004225]/40 dark:bg-[#00A854]/40 mt-2 mb-6"></div>
                  <p className="text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">
                    {c.ifyDesc}
                  </p>
                </div>
              </div>

              <p className="text-base md:text-lg text-[#1A1A18] dark:text-[#FAFAF8] leading-relaxed font-light max-w-2xl">
                {c.nameSummary}
              </p>
            </div>

            {/* STELLA */}
            <div className="mb-24 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-10 leading-tight">
                {c.stellaTitle}
              </h2>
              <p className="text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">
                {c.stellaDesc}
              </p>
            </div>

            {/* MIT EINEM KLICK ZUM RESULTAT */}
            <div className="my-24 py-16 border-t border-b border-[#004225]/15 dark:border-white/10">
              <h2 className="text-3xl md:text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-12 leading-tight max-w-2xl">
                {c.oneClickTitle}
              </h2>
              <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
                <div className="md:col-span-4">
                  <div className="font-serif text-8xl md:text-9xl text-[#004225] dark:text-[#00A854] leading-none tracking-tight" style={{paddingBottom: '.05em'}}>
                    1
                  </div>
                  <div className="w-12 h-px bg-[#004225]/40 dark:bg-[#00A854]/40 mt-4 mb-4"></div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#6B6B66] dark:text-[#9A9A94]">
                    {c.oneClickLabel}
                  </p>
                </div>
                <div className="md:col-span-8 space-y-5 text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">
                  <p>{c.oneClickP1}</p>
                  <p className="text-[#1A1A18] dark:text-[#FAFAF8] font-medium">{c.oneClickP2}</p>
                </div>
              </div>
            </div>

            {/* STATS GRID */}
            <div className="my-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#004225]/15 dark:bg-white/10 border border-[#004225]/15 dark:border-white/10">
              {[
                ['4', c.statLanguages],
                ['24/7', c.statAvailable],
                ['Zug', c.statHq],
                ['CH', c.statLaw],
              ].map(([num, label], i) => (
                <div key={i} className="bg-[#FDFCFB] dark:bg-[#1A1A18] p-6 md:p-8">
                  <p className="font-serif text-4xl md:text-5xl text-[#004225] dark:text-[#00A854] mb-3 leading-none">{num}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B66] dark:text-[#9A9A94]">{label}</p>
                </div>
              ))}
            </div>

            {/* MADE IN SWITZERLAND */}
            <div className="mb-12 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-serif text-[#1A1A18] dark:text-[#FAFAF8] mb-10 leading-tight">
                {c.swissTitle}
              </h2>
              <p className="text-base md:text-lg text-[#4A4A45] dark:text-[#9A9A94] leading-relaxed font-light">
                {c.swissDesc}
              </p>
            </div>
          </article>
          );
        })()}
      </div>
    </section>
  );
};

export default LegalPages;
