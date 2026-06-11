import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const VIEWPORTS = [
  { name: 'galaxy-fold', width: 280, height: 653 },
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 393, height: 852 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'ipad-pro', width: 1024, height: 1366 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
];

const LANGS = ['DE', 'EN', 'FR', 'IT'];

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'pricing', path: '/?view=pricing' },
];

const GERMAN_LEAKS = ['Kostenlos', 'anmelden', 'Lebenslauf', 'Pläne ansehen', 'Schweizer', 'Bewerbung', 'ansehen', 'Anmelden', 'Einloggen', 'Registrieren', 'Jetzt starten', 'Mehr erfahren', 'Preise', 'Funktionen', 'Über uns', 'Kontakt', 'Datenschutz', 'Impressum', 'Nutzungsbedingungen'];

const OUT = '/tmp/audit-fable5';
const SHOT_DIR = `${OUT}/screenshots`;

const findings = {
  critical: [],
  high: [],
  medium: [],
  translation: [],
  jsErrors: [],
};

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
});

function fileSafe(s) { return s.replace(/[^a-zA-Z0-9_-]/g, '_'); }

async function setupPage(ctx, lang) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('JS: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  // set language before navigation
  await page.addInitScript((l) => {
    try { localStorage.setItem('language', l); } catch {}
  }, lang);
  return { page, errors };
}

async function detectOverflow(page) {
  return await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    if (docW <= winW) return null;
    // find culprit
    const all = Array.from(document.querySelectorAll('*'));
    let worst = null;
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > winW + 1 && r.width > 0) {
        if (!worst || r.right > worst.right) {
          worst = { right: r.right, width: r.width, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 80), text: (el.innerText || '').slice(0, 60) };
        }
      }
    }
    return { docW, winW, overflow: docW - winW, culprit: worst };
  });
}

async function detectTinyText(page) {
  return await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll('p, span, a, button, li, h1, h2, h3, h4, h5, h6, div, label');
    for (const el of els) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (fs > 0 && fs < 12 && el.innerText && el.innerText.trim().length > 0) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') {
          out.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 60), fs: fs.toFixed(1), text: el.innerText.trim().slice(0, 40) });
          if (out.length >= 5) break;
        }
      }
    }
    return out;
  });
}

async function detectTouchTargets(page) {
  return await page.evaluate(() => {
    const els = document.querySelectorAll('button, a, input, [role="button"]');
    const offenders = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) {
        offenders.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 40), cls: (el.className || '').toString().slice(0, 50) });
      }
    }
    offenders.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    return { count: offenders.length, worst: offenders.slice(0, 5) };
  });
}

async function detectHeaderOverlap(page) {
  return await page.evaluate(() => {
    const header = document.querySelector('header, nav') || document.querySelector('[class*="header"], [class*="Header"]');
    if (!header) return null;
    const kids = Array.from(header.querySelectorAll('a, button, img, [class*="logo"]'));
    const rects = kids.map(el => ({ el: el.tagName + (el.innerText || el.getAttribute('aria-label') || '').slice(0, 20), r: el.getBoundingClientRect() })).filter(x => x.r.width > 0);
    const overlaps = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
          overlaps.push(`${rects[i].el} <> ${rects[j].el}`);
        }
      }
    }
    return overlaps.slice(0, 3);
  });
}

async function detectTranslationLeaks(page, lang) {
  if (lang === 'DE') return [];
  const germanWords = ['Kostenlos', 'kostenlos', 'Anmelden', 'anmelden', 'Lebenslauf', 'Schweizer', 'Bewerbung', 'Einloggen', 'Registrieren', 'Pläne ansehen', 'ansehen', 'Funktionen', 'Datenschutz', 'Impressum', 'Nutzungsbedingungen', 'Jetzt starten', 'Mehr erfahren'];
  return await page.evaluate((words) => {
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    const seen = new Set();
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (!t) continue;
      for (const w of words) {
        // word boundary match
        const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\b');
        if (re.test(t)) {
          const parent = node.parentElement;
          if (!parent) continue;
          const cs = getComputedStyle(parent);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const key = w + '|' + t.slice(0, 40);
          if (seen.has(key)) continue;
          seen.add(key);
          found.push({ word: w, text: t.slice(0, 80), tag: parent.tagName.toLowerCase(), cls: (parent.className || '').toString().slice(0, 50) });
          if (found.length >= 8) return found;
        }
      }
    }
    return found;
  }, germanWords);
}

async function dismissCookie(page) {
  try {
    await page.locator('button:has-text("Akzeptieren"), button:has-text("Accept"), button:has-text("Alle akzeptieren"), button:has-text("Accepter"), button:has-text("Accetta")').first().click({ timeout: 1200 });
    await page.waitForTimeout(300);
  } catch {}
}

const severity = (issue, viewport) => {
  // Critical: horizontal overflow on common phones, JS errors blocking render
  if (issue.type === 'overflow' && (viewport === 'iphone-se' || viewport === 'iphone-14' || viewport === 'galaxy-fold')) return 'critical';
  if (issue.type === 'overflow') return 'high';
  if (issue.type === 'touch' && issue.count > 5) return 'high';
  if (issue.type === 'touch') return 'medium';
  if (issue.type === 'tiny') return 'medium';
  if (issue.type === 'overlap') return 'high';
  return 'medium';
};

const addFinding = (sev, msg) => {
  if (sev === 'critical') findings.critical.push(msg);
  else if (sev === 'high') findings.high.push(msg);
  else findings.medium.push(msg);
};

// Main loop
for (const lang of LANGS) {
  for (const vp of VIEWPORTS) {
    for (const pg of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
      const { page, errors } = await setupPage(ctx, lang);
      const url = 'http://127.0.0.1:5173' + pg.path;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2200);
      } catch (e) {
        console.log(`[${lang}/${vp.name}/${pg.name}] goto err: ${e.message}`);
      }
      await dismissCookie(page);
      await page.waitForTimeout(400);

      const shot = `${SHOT_DIR}/${lang}-${vp.name}-${pg.name}.png`;
      try { await page.screenshot({ path: shot, fullPage: true }); } catch (e) { console.log('shot err', e.message); }

      // Detect
      const overflow = await detectOverflow(page);
      const isMobile = vp.width < 640;
      const tiny = isMobile ? await detectTinyText(page) : [];
      const touch = isMobile ? await detectTouchTargets(page) : null;
      const overlap = await detectHeaderOverlap(page);
      const leaks = await detectTranslationLeaks(page, lang);

      const tag = `[${pg.name} ${vp.name} ${lang}]`;
      if (overflow) {
        const c = overflow.culprit;
        const sev = severity({ type: 'overflow' }, vp.name);
        addFinding(sev, `${tag} Horizontal overflow ${overflow.overflow}px (doc=${overflow.docW} > vp=${overflow.winW}). Culprit: <${c?.tag} class="${c?.cls}"> right=${Math.round(c?.right)}px text="${c?.text}"`);
      }
      if (tiny.length > 0) {
        addFinding('medium', `${tag} ${tiny.length} elements with font-size <12px: ` + tiny.map(t => `<${t.tag}>"${t.text}"@${t.fs}px`).join(' | '));
      }
      if (touch && touch.count > 0) {
        const sev = severity({ type: 'touch', count: touch.count }, vp.name);
        addFinding(sev, `${tag} ${touch.count} interactive elements below 44px touch target. Worst: ` + touch.worst.map(t => `<${t.tag} ${t.w}x${t.h}>"${t.text}"`).join(' | '));
      }
      if (overlap && overlap.length > 0) {
        addFinding('high', `${tag} Header element overlap: ${overlap.join('; ')}`);
      }
      for (const leak of leaks) {
        findings.translation.push(`${tag} German word "${leak.word}" leaked: "${leak.text}" in <${leak.tag} class="${leak.cls}">`);
      }
      if (errors.length > 0) {
        findings.jsErrors.push(`${tag} ${errors.length} errors: ${errors.slice(0, 2).join(' || ')}`);
      }

      await ctx.close();
    }
  }
}

// AUTH MODAL — DE/EN on a few viewports only (time budget)
const AUTH_VPS = [
  { name: 'galaxy-fold', width: 280, height: 653 },
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
];
for (const lang of ['DE', 'EN']) {
  for (const vp of AUTH_VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const { page, errors } = await setupPage(ctx, lang);
    try {
      await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2200);
    } catch {}
    await dismissCookie(page);

    // Try clicking various login triggers
    const triggers = ['Login', 'Anmelden', 'Einloggen', 'Connexion', 'Accedi', 'Kostenlos starten', 'Start', 'Sign in', 'Sign up'];
    let opened = false;
    for (const t of triggers) {
      try {
        const btn = page.locator(`button:has-text("${t}"), a:has-text("${t}")`).first();
        if (await btn.count() > 0) {
          await btn.click({ timeout: 1500 });
          await page.waitForTimeout(800);
          opened = true;
          break;
        }
      } catch {}
    }
    const shot = `${SHOT_DIR}/${lang}-${vp.name}-auth.png`;
    try { await page.screenshot({ path: shot, fullPage: false }); } catch {}

    const overflow = await detectOverflow(page);
    if (overflow) {
      const c = overflow.culprit;
      const sev = severity({ type: 'overflow' }, vp.name);
      addFinding(sev, `[auth ${vp.name} ${lang}] Horizontal overflow ${overflow.overflow}px. Culprit: <${c?.tag}> text="${c?.text}"`);
    }
    if (!opened) {
      findings.medium.push(`[auth ${vp.name} ${lang}] No login/start trigger found on landing`);
    }
    await ctx.close();
  }
}

// DARK MODE — landing on a couple of viewports/langs, check contrast
for (const lang of ['DE', 'EN']) {
  for (const vp of [{ name: 'iphone-se', width: 375, height: 667 }, { name: 'laptop', width: 1280, height: 800 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, colorScheme: 'dark' });
    const { page } = await setupPage(ctx, lang);
    await page.addInitScript(() => {
      try { localStorage.setItem('theme', 'dark'); document.documentElement.classList.add('dark'); } catch {}
    });
    try {
      await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2200);
    } catch {}
    await dismissCookie(page);
    await page.evaluate(() => { try { document.documentElement.classList.add('dark'); } catch {} });
    await page.waitForTimeout(500);

    const shot = `${SHOT_DIR}/${lang}-${vp.name}-landing-dark.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch {}

    // contrast probe
    const lowContrast = await page.evaluate(() => {
      function parseRGB(str) {
        const m = str.match(/\\d+(\\.\\d+)?/g);
        if (!m) return null;
        return [parseFloat(m[0]), parseFloat(m[1]), parseFloat(m[2])];
      }
      function lightness(rgb) {
        const [r, g, b] = rgb.map(c => c / 255);
        return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 * 100;
      }
      function effectiveBg(el) {
        let cur = el;
        while (cur) {
          const cs = getComputedStyle(cur);
          const bg = parseRGB(cs.backgroundColor);
          if (bg && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return bg;
          cur = cur.parentElement;
        }
        return [0, 0, 0];
      }
      const out = [];
      const els = document.querySelectorAll('p, span, a, h1, h2, h3, h4, button, li');
      for (const el of els) {
        if (!el.innerText || !el.innerText.trim()) continue;
        const cs = getComputedStyle(el);
        const fg = parseRGB(cs.color);
        if (!fg) continue;
        const bg = effectiveBg(el);
        const dl = Math.abs(lightness(fg) - lightness(bg));
        if (dl < 30) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden') {
            out.push({ tag: el.tagName.toLowerCase(), text: el.innerText.slice(0, 40), dl: dl.toFixed(1), fg: cs.color, bg: 'rgb(' + bg.join(',') + ')' });
            if (out.length >= 5) break;
          }
        }
      }
      return out;
    });
    if (lowContrast.length > 0) {
      findings.medium.push(`[landing-dark ${vp.name} ${lang}] ${lowContrast.length} low-contrast text elements: ` + lowContrast.map(c => `<${c.tag}>"${c.text}" Δ${c.dl}`).join(' | '));
    }
    await ctx.close();
  }
}

await browser.close();

// Write report
const ts = new Date().toISOString();
let md = `# Stellify Design Audit (Fable 5 pass)\n\nGenerated: ${ts}\n\n`;
md += `Viewports: ${VIEWPORTS.map(v => `${v.name}(${v.width}x${v.height})`).join(', ')}\n`;
md += `Languages: ${LANGS.join(', ')}\n\n`;

const dedup = (arr) => Array.from(new Set(arr));

md += `## Critical (blocks usage)\n`;
dedup(findings.critical).forEach(f => md += `- ${f}\n`);
if (findings.critical.length === 0) md += `- (none)\n`;

md += `\n## High (looks broken)\n`;
dedup(findings.high).forEach(f => md += `- ${f}\n`);
if (findings.high.length === 0) md += `- (none)\n`;

md += `\n## Medium (polish)\n`;
dedup(findings.medium).forEach(f => md += `- ${f}\n`);
if (findings.medium.length === 0) md += `- (none)\n`;

md += `\n## Translation leaks\n`;
dedup(findings.translation).forEach(f => md += `- ${f}\n`);
if (findings.translation.length === 0) md += `- (none)\n`;

md += `\n## JS / Console errors (sampled)\n`;
dedup(findings.jsErrors).slice(0, 20).forEach(f => md += `- ${f}\n`);
if (findings.jsErrors.length === 0) md += `- (none)\n`;

md += `\n## Summary counts\n`;
md += `- Critical: ${dedup(findings.critical).length}\n`;
md += `- High: ${dedup(findings.high).length}\n`;
md += `- Medium: ${dedup(findings.medium).length}\n`;
md += `- Translation leaks: ${dedup(findings.translation).length}\n`;
md += `- JS error reports: ${dedup(findings.jsErrors).length}\n`;

writeFileSync(`${OUT}/findings.md`, md);
console.log('DONE. Findings written. Counts:', {
  critical: dedup(findings.critical).length,
  high: dedup(findings.high).length,
  medium: dedup(findings.medium).length,
  translation: dedup(findings.translation).length,
  jsErrors: dedup(findings.jsErrors).length,
});
