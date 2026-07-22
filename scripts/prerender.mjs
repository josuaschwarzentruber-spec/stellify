/**
 * Post-build prerender for SEO.
 *
 * A single-page app serves the SAME index.html for every route, whose static
 * canonical points at the homepage. Google reads that raw HTML before running
 * our JavaScript, so it flags /pricing and every guide article as a duplicate
 * of "/". This script writes a dedicated HTML file per important route — same
 * app bundle, but with the correct <title>, description, canonical and og tags
 * baked into the served HTML. vercel.json rewrites each path to its file.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DIST = 'dist';
const BASE = 'https://stellify.ch';
const html = readFileSync(join(DIST, 'index.html'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** path (no leading slash) -> file, plus its SEO fields. */
const ROUTES = [
  {
    path: 'pricing',
    title: 'Preise | Stellify',
    desc: 'Gratis starten mit 3 Bewerbungen. Pro ab CHF 9.90 pro Monat: 30 Generierungen, Stellen-Import per Link, alle Designs. Karriere+ ab CHF 19.90. Jederzeit im Konto verwaltbar.',
  },
  {
    path: 'about',
    title: 'Über uns | Stellify',
    desc: 'Stellify ist die Bewerbungs-KI für die Schweiz, gegründet und entwickelt in der Schweiz. Wie aus zwei Wörtern eine Mission wurde.',
  },
  {
    path: 'ratgeber',
    title: 'Ratgeber: Richtig bewerben in der Schweiz | Stellify',
    desc: 'Praktische Leitfäden für den Schweizer Arbeitsmarkt: Bewerbung schreiben, Lebenslauf nach Schweizer Standard, Motivationsschreiben und Lohn verhandeln. Kostenlos.',
  },
  {
    path: 'ratgeber/bewerbung-schreiben-schweiz',
    title: 'Bewerbung schreiben in der Schweiz: der komplette Leitfaden | Stellify',
    desc: 'Schritt für Schritt zur überzeugenden Bewerbung nach Schweizer Standard: Aufbau, Anschreiben, Lebenslauf, Foto und die häufigsten Fehler. Kostenloser Ratgeber.',
  },
  {
    path: 'ratgeber/lebenslauf-schweizer-standard',
    title: 'Lebenslauf nach Schweizer Standard: Aufbau, Reihenfolge, Foto | Stellify',
    desc: 'So sieht ein Lebenslauf für die Schweiz aus: richtige Reihenfolge, Foto, Sprachniveaus und Länge. Praktischer Leitfaden für den Schweizer Arbeitsmarkt.',
  },
  {
    path: 'ratgeber/motivationsschreiben',
    title: 'Motivationsschreiben: Aufbau, Formulierungen, Fehler | Stellify',
    desc: 'Ein starkes Motivationsschreiben für die Schweiz: Aufbau, überzeugende Formulierungen und typische Fehler, die du vermeiden solltest.',
  },
  {
    path: 'ratgeber/lohn-verhandeln-schweiz',
    title: 'Lohn verhandeln in der Schweiz: Vorbereitung und Timing | Stellify',
    desc: 'Gehalt verhandeln in der Schweiz: Marktwert einschätzen, Argumente vorbereiten und den richtigen Zeitpunkt wählen. Praktischer Leitfaden.',
  },
];

let count = 0;
for (const r of ROUTES) {
  const url = `${BASE}/${r.path}`;
  let out = html;
  // <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`);
  // meta description
  out = out.replace(/(<meta name="description" content=")[^"]*(">)/, `$1${esc(r.desc)}$2`);
  // canonical
  out = out.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${url}$2`);
  // og:url / og:title / og:description
  out = out.replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${url}$2`);
  out = out.replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${esc(r.title)}$2`);
  out = out.replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${esc(r.desc)}$2`);
  // twitter mirrors
  out = out.replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${esc(r.title)}$2`);
  out = out.replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${esc(r.desc)}$2`);

  const file = join(DIST, `${r.path}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out, 'utf8');
  count++;
}
console.log(`[prerender] wrote ${count} route HTML files`);
