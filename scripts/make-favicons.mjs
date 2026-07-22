/**
 * One-off: render public/favicon.svg into raster favicons that Google and all
 * browsers can crawl. Google does NOT read data: URI favicons, so we ship real
 * files: favicon.ico (auto-requested), favicon-96x96.png, apple-touch-icon.png.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});

async function render(size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const doc = `<!doctype html><meta charset=utf8><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;
  await page.setContent(doc, { waitUntil: 'networkidle' });
  const el = await page.$('svg');
  const buf = await el.screenshot({ omitBackground: true, type: 'png' });
  await page.close();
  return buf;
}

const png48 = await render(48);
const png96 = await render(96);
const png180 = await render(180);

writeFileSync('public/favicon-96x96.png', png96);
writeFileSync('public/apple-touch-icon.png', png180);

// Build a minimal .ico that embeds the 48x48 PNG (PNG-in-ICO, widely supported).
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(1, 4);      // image count
  const dir = Buffer.alloc(16);
  dir.writeUInt8(size >= 256 ? 0 : size, 0); // width
  dir.writeUInt8(size >= 256 ? 0 : size, 1); // height
  dir.writeUInt8(0, 2);            // palette
  dir.writeUInt8(0, 3);            // reserved
  dir.writeUInt16LE(1, 4);         // color planes
  dir.writeUInt16LE(32, 6);        // bits per pixel
  dir.writeUInt32LE(png.length, 8);        // size of image data
  dir.writeUInt32LE(6 + 16, 12);           // offset to image data
  return Buffer.concat([header, dir, png]);
}
writeFileSync('public/favicon.ico', icoFromPng(png48, 48));

await browser.close();
console.log('[favicons] wrote favicon.ico (48), favicon-96x96.png, apple-touch-icon.png');
