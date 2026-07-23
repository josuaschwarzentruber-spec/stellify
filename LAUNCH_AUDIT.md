# Stellify Launch-Audit

Stand: 2026-07-23
Zweck: Strukturierte Einschaetzung der Startbereitschaft fuer einen oeffentlichen,
kostenpflichtigen Launch in der Schweiz. Prioritaeten: BLOCKER, HOCH, MITTEL, NIEDRIG.

Rechtlicher Hinweis: Diese Datei ist eine technische Einschaetzung, keine
Rechtsberatung. Die Rechtstexte (Impressum, Datenschutz, AGB) sollten vor dem
kostenpflichtigen Launch fachlich geprueft werden.

---

## 1. Kritische Fehler vor dem Launch

| Punkt | Prioritaet | Datei | Status | Loesung |
|---|---|---|---|---|
| Impressum ohne echten Namen und Adresse (nur "JTSP, Luzern") | BLOCKER | LegalPages.tsx | OFFEN (dein Eintrag) | Echten gesetzlichen Namen + Postadresse einsetzen. Platzhalter sichtbar markiert. |
| Kein Einwilligungs-Haekchen bei Registrierung | HOCH | App.tsx (Auth-Modal) | GEPLANT | Pflicht-Haekchen "AGB und Datenschutz gelesen" mit Links. |
| Checkout ohne klare "zahlungspflichtig"-Bestaetigung | HOCH | App.tsx (Checkout) | GEPLANT | Button "Zahlungspflichtig abonnieren" + AGB-Bestaetigung. |

## 2. Datenschutzprobleme

| Punkt | Prioritaet | Datei | Status | Loesung |
|---|---|---|---|---|
| DeepSeek-Uebermittlung (China, moegliches Training) nicht vollstaendig offengelegt | HOCH | LegalPages.tsx | IN ARBEIT | Offenlegung praezisieren: volle Bewerbungsinhalte, moegliche Speicherung/Training, Einwilligung als Rechtsgrundlage. |
| Auslandsuebermittlung braucht ausdrueckliche Einwilligung als Rechtsgrundlage | HOCH | LegalPages.tsx | IN ARBEIT | Einwilligung ergaenzen (Art. 17 DSG / Art. 49 DSGVO). |
| CV-Speicherung offengelegt, selbst loeschbar | MITTEL | LegalPages.tsx | ERLEDIGT | Text korrigiert, Loeschung moeglich. |
| Vercel Analytics offengelegt (anonym, cookielos) | NIEDRIG | LegalPages.tsx | ERLEDIGT | In Datenschutz beschrieben. |

## 3. Sicherheitsprobleme

| Punkt | Prioritaet | Datei | Status |
|---|---|---|---|
| Bezahl-Bypass ueber Firestore-Regeln (Rolle/Quota) | BLOCKER | firestore.rules | ERLEDIGT (deployt) |
| SSRF bei Stellen-URL (DNS, Redirects, IP-Encoding) | HOCH | api/index.ts | ERLEDIGT |
| Offener Mail-Versand (Marken-Domain) | HOCH | api/index.ts | ERLEDIGT (entfernt) |
| Unbegrenzte Firestore-Dokumente | MITTEL | firestore.rules | ERLEDIGT (Feld-Limit) |
| Storage-Regeln (nur Server-Zugriff) | HOCH | storage.rules | ERLEDIGT (deployt) |
| Secrets nur serverseitig, keine im Frontend | HOCH | api/index.ts | GEPRUEFT, SAUBER |
| Serverseitige Quota (nicht nur Frontend) | HOCH | api/index.ts | ERLEDIGT |
| Stripe-Webhook signiert und verifiziert | HOCH | api/index.ts | ERLEDIGT |
| App Check (fremde Skripte blocken) | MITTEL | Firebase-Konsole | OFFEN (dein Schritt) |
| Prompt-Injection-Schutz in Systemprompts | MITTEL | api/index.ts | GEPLANT |

## 4. Fehlende Funktionen

| Punkt | Prioritaet | Status |
|---|---|---|
| Konto loeschen (mit Bestaetigung) | HOCH | ERLEDIGT (vorhanden) |
| Abo kuendigen | HOCH | ERLEDIGT (Stripe-Portal) |
| Einzelne Bewerbung / Lebenslauf loeschen | HOCH | ERLEDIGT (vorhanden) |
| Sichtbarer KI-Hinweis beim Generator | HOCH | GEPLANT |
| Datenexport (Portabilitaet) | MITTEL | OFFEN (per Support-Anfrage abgedeckt, Selfservice spaeter) |

## 5. Rechtlich unklare Inhalte

| Punkt | Prioritaet | Status |
|---|---|---|
| Impressum-Betreiberangabe unvollstaendig | BLOCKER | OFFEN (dein Eintrag) |
| DeepSeek-Speicher-/Trainingsbedingungen ungeklaert | HOCH | OFFEN (schriftliche Bestaetigung einholen, siehe LEGAL_TODO) |
| Gemini in Rechtstexten genannt, im Code als Fallback aktiv | MITTEL | ENTSCHEIDUNG NOETIG (behalten oder entfernen) |

## 6. Unklare Abo- oder Preisangaben

| Punkt | Prioritaet | Status |
|---|---|---|
| Preise CHF, monatlich/jaehrlich, Generierungen | HOCH | ERLEDIGT (konsistent 30/100) |
| Automatische Verlaengerung / Kuendigung | HOCH | ERLEDIGT (in AGB, via Stripe) |
| MWST-Hinweis | MITTEL | PRUEFEN (aktuell keine MWST-Pflicht unter Umsatzgrenze; Hinweis pruefen) |

## 7. UX-Probleme

| Punkt | Prioritaet | Status |
|---|---|---|
| Navigation Preise/Ratgeber/Ueber uns (Sprung, Ruckeln) | MITTEL | ERLEDIGT |
| Doppeltes Augen-Symbol im Passwortfeld | NIEDRIG | ERLEDIGT |
| Startseite ueberladen / unregelmaessige Abstaende | MITTEL | ERLEDIGT (auf klare Struktur reduziert) |

## 8. Vertrauensprobleme

| Punkt | Prioritaet | Status |
|---|---|---|
| Erfundene Statistiken / Erfolgsquoten | HOCH | ERLEDIGT (entfernt) |
| "Schweizer Server"-Behauptung | HOCH | ERLEDIGT (zu "Schweizer Datenschutz") |
| Kompakter Vertrauensbereich ("deine Bewerbung, deine Kontrolle") | NIEDRIG | OPTIONAL (spaeter) |

## 9. Mobile Probleme

| Punkt | Prioritaet | Status |
|---|---|---|
| Mail-Button im Dunkelmodus unlesbar | MITTEL | ERLEDIGT |
| Allgemeine mobile Darstellung | MITTEL | LAUFEND GEPRUEFT |

## 10. SEO-Probleme

| Punkt | Prioritaet | Status |
|---|---|---|
| /pricing indexierbar, eigene URL | MITTEL | ERLEDIGT |
| Ratgeber-Seiten (SEO-Inhalte) | MITTEL | ERLEDIGT (vorhanden) |
| Sitemap / robots / OG | NIEDRIG | PRUEFEN |

## 11. Performance-Probleme

| Punkt | Prioritaet | Status |
|---|---|---|
| Grosses App-Bundle (App.tsx) | NIEDRIG | AKZEPTABEL (Code-Split fuer Legal/Guide aktiv) |
| Lazy-Chunks vorladen | NIEDRIG | ERLEDIGT |

## 12. Barrierefreiheit

| Punkt | Prioritaet | Status |
|---|---|---|
| Kontraste, Fokus, Labels, Alt-Texte | MITTEL | GRUNDLAGEN VORHANDEN, tiefer Audit spaeter |

---

## Gesamteinschaetzung

- Kostenloser Beta-Test: nahe startbereit (nach KI-Hinweis + Einwilligungs-Haekchen).
- Kostenpflichtiger oeffentlicher Launch: NOCH NICHT bereit. Offene Blocker:
  1. Echtes Impressum (Name + Adresse).
  2. DeepSeek-Bedingungen schriftlich klaeren (oder klar als Restrisiko mit Einwilligung fuehren).
  3. Checkout-Bestaetigung + Einwilligung.
- Rechtstexte vor bezahltem Launch fachlich pruefen lassen.
