# Stellify Rechtliche TODO-Liste

Stand: 2026-07-23
Diese Punkte MUSS die betreibende Person selbst erledigen oder bestaetigen, bevor
Stellify kostenpflichtig oeffentlich startet. Claude kann Code und Texte vorbereiten,
aber keine echten Personendaten erfinden und keine Rechtsgarantie geben.

---

## 1. Betreiber-Identitaet (BLOCKER fuer bezahlten Launch)

Im Impressum und in der Datenschutzerklaerung stehen aktuell sichtbare Platzhalter:

- `[VOLLSTAENDIGER GESETZLICHER NAME]`
- `[STRASSE UND HAUSNUMMER]`
- `[PLZ UND ORT]`

Diese muessen durch die echten Angaben ersetzt werden. Nur "JTSP, Luzern, Schweiz"
reicht als vollstaendige Betreiberangabe nicht.

Hinweis: Als Einzelperson unter der Umsatzgrenze ist KEIN Handelsregistereintrag
noetig. Es darf aber NICHT der Eindruck einer GmbH/AG erweckt werden. Kein Zusatz
wie "Stellify GmbH", "Stellify AG".

## 2. DeepSeek-Bedingungen (HOCH, offener Datenschutzpunkt)

Aktueller Stand: Bewerbungsinhalte (inkl. Lebenslauf-Text mit persoenlichen Angaben)
werden an die DeepSeek-API (Sitz China) uebermittelt. Es gibt aktuell KEINE
bestaetigte Zusage, dass API-Daten nicht fuer Modelltraining verwendet werden.

Entscheidung der betreibenden Person: Es wird bewusst der volle Inhalt gesendet
(keine Anonymisierung). Das ist mit transparenter Offenlegung und ausdruecklicher
Einwilligung rechtlich vertretbar, bleibt aber ein Restrisiko.

Empfohlene Handlung (nicht zwingend fuer Beta, empfohlen vor bezahltem Launch):
Schreibe an privacy@deepseek.com und verlange schriftliche Bestaetigung zu:

1. Werden API-Prompts und -Antworten fuer Modelltraining verwendet?
2. Wie kann das API-Konto vollstaendig vom Training ausgeschlossen werden?
3. Wie lange werden API-Prompts gespeichert?
4. Werden Daten ausschliesslich in China verarbeitet?
5. Wie koennen Daten der Endnutzer geloescht werden?
6. Gibt es einen Auftragsbearbeitungsvertrag (DPA)?

Bis dahin gilt in der Datenschutzerklaerung: Uebermittlung an DeepSeek (China),
moegliche Speicherung und Nutzung zur Modellverbesserung, Rechtsgrundlage
ausdrueckliche Einwilligung des Nutzers.

## 3. Gemini-Entscheidung (ERLEDIGT)

Entscheidung: Gemini wird nicht mehr verwendet. Google Gemini wurde vollstaendig
aus dem Code entfernt (Generator laeuft ohnehin nur auf DeepSeek) und aus allen
Rechtstexten gestrichen. Nebenwirkung: Der Lebenslauf-Upload akzeptiert nur noch
PDF, Word und Text (kein Foto/Screenshot mehr). Die Live-Jobsuche (noch nicht
gestartet) liefert ohne Gemini vorerst keine Ergebnisse.

## 4. Abo- und Rueckerstattungsbedingungen (HOCH)

- Automatische Verlaengerung: technisch via Stripe vorhanden, in AGB beschrieben. Bestaetigen.
- Kuendigung: via Stripe-Kundenportal, wirkt zum Periodenende. Bestaetigen, dass das gewuenscht ist.
- Rueckerstattung: aktuell KEINE eigene Rueckerstattungsregel erfunden. Falls gewuenscht,
  Regel definieren und in AGB ergaenzen.
- MWST: pruefen, ob unter der Umsatzgrenze (keine MWST-Pflicht) oder ob ein
  MWST-Hinweis noetig ist.

## 5. Analyse- und Trackingdienste (NIEDRIG)

Aktiv sind nur: Vercel Analytics (anonym, cookielos) und technisch notwendige
Cookies (Auth-Session, localStorage). Kein Google Analytics, kein Meta/TikTok Pixel,
kein Hotjar/Clarity. Bestaetigen, dass keine weiteren Trackingdienste eingebaut werden.

## 6. Rechtstexte professionell pruefen lassen (HOCH)

Impressum, Datenschutzerklaerung und AGB vor dem oeffentlichen kostenpflichtigen
Launch von einer Fachperson pruefen lassen. Claude gibt keine Rechtsgarantie.

---

## Zusammenfassung: Was NUR du tun kannst

- [ ] Echten Namen + Adresse ins Impressum eintragen (BLOCKER)
- [ ] DeepSeek-Bestaetigung per Mail einholen (empfohlen)
- [ ] Gemini behalten oder entfernen entscheiden
- [ ] Rueckerstattung/MWST-Position festlegen
- [ ] Rechtstexte fachlich pruefen lassen
