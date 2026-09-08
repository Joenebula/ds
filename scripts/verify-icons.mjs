#!/usr/bin/env node
// Renders every exported icon in Chromium and checks it actually draws something.
//
//   node scripts/verify-icons.mjs [--sheet out.html]
//
// A file existing is not the same as an icon working: a broken path, a mask
// referencing a stripped id, or an empty <g> all produce a valid SVG file that
// paints nothing. getBBox() on the rendered node is the only honest check.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const dir = 'assets/icons';
const files = readdirSync(dir).filter(f => f.endsWith('.svg')).sort();

const cells = files.map(f => {
  const svg = readFileSync(join(dir, f), 'utf8').trim();
  return `<figure data-name="${f}"><span class="ico">${svg}</span><figcaption>${
    f.replace(/\.svg$/, '')}</figcaption></figure>`;
}).join('\n');

const sheet = `<title>People First icons</title>
<style>
  :root { --bg:#fff; --fg:#1c1c1c; --muted:#6a6a6a; --line:#e5e5e5; }
  @media (prefers-color-scheme: dark) { :root { --bg:#161616; --fg:#f2f2f2; --muted:#9a9a9a; --line:#2e2e2e; } }
  body { background:var(--bg); color:var(--fg); font:13px/1.4 system-ui, sans-serif; margin:0; padding:24px; }
  h1 { font-size:15px; font-weight:600; margin:0 0 4px; }
  p { color:var(--muted); margin:0 0 20px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:4px; }
  figure { margin:0; padding:10px 4px; text-align:center; border:1px solid var(--line); border-radius:6px; }
  .ico svg { width:28px; height:28px; display:block; margin:0 auto 8px; }
  figcaption { color:var(--muted); font-size:10px; line-height:1.3; word-break:break-word; }
</style>
<h1>People First — ${files.length} icons</h1>
<p>Exported from Figma. Every glyph uses <code>currentColor</code>, so it inherits text colour.</p>
<div class="grid">${cells}</div>`;

const sheetPath = process.argv.includes('--sheet')
  ? process.argv[process.argv.indexOf('--sheet') + 1] : null;
if (sheetPath) writeFileSync(sheetPath, sheet);

const tmp = '/tmp/pf-icons-check.html';
writeFileSync(tmp, sheet);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push(String(e)));
await page.goto('file://' + tmp);

const results = await page.evaluate(() => {
  return [...document.querySelectorAll('figure')].map(fig => {
    const svg = fig.querySelector('svg');
    if (!svg) return { name: fig.dataset.name, ok: false, why: 'no <svg> element' };
    let bbox;
    try { bbox = svg.getBBox(); } catch { return { name: fig.dataset.name, ok: false, why: 'getBBox threw' }; }
    if (!(bbox.width > 0 && bbox.height > 0)) {
      return { name: fig.dataset.name, ok: false, why: 'paints nothing (empty bbox)' };
    }
    // A mask or filter pointing at an id that is not in this file renders blank
    // in some engines and fully opaque in others — either way it is a defect.
    const refs = [...fig.innerHTML.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
    const missing = refs.filter(id => !svg.querySelector(`[id="${id}"]`));
    if (missing.length) {
      return { name: fig.dataset.name, ok: false, why: 'dangling ref: ' + missing.join(', ') };
    }
    return { name: fig.dataset.name, ok: true };
  });
});
await browser.close();

const bad = results.filter(r => !r.ok);
for (const r of bad) console.log(`FAIL ${r.name.padEnd(36)} ${r.why}`);
if (consoleErrors.length) {
  console.log('\npage errors:');
  for (const e of consoleErrors) console.log('  ' + e);
}
console.log(`\n${results.length - bad.length} of ${results.length} icons render, ${bad.length} broken`);
process.exit(bad.length ? 1 : 0);
