#!/usr/bin/env node
// Every component that paints its OWN surface and states its OWN text colour, measured in both
// modes — with the pairs taken from Figma rather than from a list somebody kept by hand.
//
//   node scripts/check-component-contrast.mjs
//
// `check-contrast.mjs` already measures contrast in both modes, and it missed this because of
// two things it does: its `PAIRS` are hand-written, and it ends in `process.exit(0)` — it is a
// report, not a check. A component nobody added to that list is never measured, and nothing it
// finds can fail a build.
//
// Reported from a phone as a white tag looking wrong in dark mode. That is real —
// `Tags Type=Theme` binds `Tags/Fills/Info`, which Figma gives the SAME value in both modes
// (`@Base colours/White`) while its text token moves `#c82f3c → #4e6998`. The surface is frozen
// and the text adapts: half a pair, which is FIGMA-ISSUES §11's rule.
//
// Sweeping for that shape found a worse one nobody had reported. `Browser drop down` binds
// `Text/Always White` over `Background/Secondary`, and `Background/Secondary` is `#fafafa` in
// light — so in LIGHT MODE it renders white text on near-white at **1.04:1**, invisible. Only
// three components in the library disagree with themselves this way, and measuring all of them
// was what turned one reported symptom into two findings.
//
// TWO THINGS THIS GETS RIGHT THAT A NAIVE VERSION DOES NOT:
//
//   - It COMPOSITES the alpha. `Button Type=Hollow, State=Hover` is a 20%-black wash, and read
//     as an opaque colour it scores 1.83:1 and looks like a third fault. Over the page it is
//     about #d0d0d0 and the label reads fine. A translucent overlay is also the one case where
//     an unchanging fill is CORRECT — it darkens whatever is behind it, in either mode.
//   - It only judges a component that paints its own background. Most components sit on a
//     surface something else provides — `Detail item` on a card, `Top bar app context` on the
//     header band — and a ratio measured against a test page's colour is not about them. That
//     is the same scoping `check-breakpoint-consistency` had to learn.
//
// THE THRESHOLD DEPENDS ON WHAT THE COMPONENT HOLDS, and that took one wrong answer first.
// WCAG asks 4.5:1 of text and 3:1 of a meaningful graphic, so measuring a 20x20 checkbox's tick
// against the text threshold is the wrong question — the same mistake as "a contrast ratio is
// not the test" in the breakpoint work.
//
// The obvious reading is wrong: counting TEXT nodes in `component-tree.tsv` says `Sticky
// footer`, `Browser drop down` and `People and department drop down` hold no text, when all
// three plainly do — the walk is depth-limited and stops at nested instances, so "no TEXT
// child" means "not seen", not "not there". Relaxing a threshold on that would be a guess.
//
// `component-geometry.tsv`'s `font` column is the reading that holds: it is per component and
// says `—` where Figma gives the component no type at all. `Status` is `22 x 22` at `—` and is
// a dot; `Sticky footer` is `13px SemiBold` and is a label. Same reading the docs gallery uses
// to decide which specimens get a placeholder.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Pairs below AA that are Figma's to fix, not the pipeline's. The SET is pinned, not just the
// count: a count alone lets one be fixed while a new one appears and the total stays put, which
// is the substitution this project has been caught by before. Written up in
// docs/FIGMA-ISSUES.md §15. It may shrink; it may not grow, and no name may change.
const KNOWN = new Set([
  'pf-sticky-footer|light', 'pf-people-and-department-drop-down|light', 'pf-browser-drop-down|light',
  'pf-multi-select-checkbox|dark', 'pf-config-child-menu|dark', 'pf-status|dark',
  'pf-ai-assistant|dark', 'pf-radio-card|light', 'pf-ag-filter-menus|light',
  'pf-ag-field|light', 'pf-toggle|light',
]);

// A component Figma gives no type holds a glyph, not a label: WCAG 1.4.11 asks 3:1 of it, not
// the 4.5:1 of text. Read per component from the geometry's own `font` column.
const typeless = new Set();
for (const line of readFileSync('tokens/_raw/component-geometry.tsv', 'utf8').trim().split('\n').slice(1)) {
  const c = line.split('\t');
  if (c[0].includes('|')) continue;
  if ((c[5] || '').trim() === '\u2014') typeless.add(c[0]);
}
const kebab = s => 'pf-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const css = readFileSync('dist/components.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));
const axesOf = new Map();
for (const m of css.matchAll(/\.(pf-[a-z0-9-]+)((?:\[[^\]]+\])+)/g)) {
  if (!axesOf.has(m[1])) axesOf.set(m[1], new Set());
  for (const a of m[2].matchAll(/\[data-([a-z0-9-]+)/g)) axesOf.get(m[1]).add(a[1]);
}

const items = [];
for (const line of readFileSync('tokens/_raw/component-variants.tsv', 'utf8').trim().split('\n').slice(1)) {
  const c = line.split('\t');
  const base = kebab(c[1]);
  if (!libClasses.has(base)) continue;
  const keep = axesOf.get(base) || new Set();
  const attrs = (c[2] || '').split(', ').filter(Boolean).map(p => {
    const i = p.indexOf('=');
    return [String(p.slice(0, i)).toLowerCase().replace(/[^a-z0-9]+/g, '-'), p.slice(i + 1)];
  }).filter(([k]) => keep.has(k));
  items.push({ component: c[1], variant: c[2] || '(only)', base,
    attrs: attrs.map(([k, v]) => ` data-${k}="${v.replace(/"/g, '&quot;')}"`).join('') });
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const read = async theme => {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(t => document.addEventListener('DOMContentLoaded',
    () => document.documentElement.setAttribute('data-theme', t)), theme);
  await page.setContent(['fonts', 'tokens', 'components', 'type']
    .map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
    + '<body style="background:var(--pf-bg-primary)">'
    + items.map((x, i) => `<div id="c${i}" class="${x.base}"${x.attrs}>Sample</div>`).join('')
    + '</body>');
  await page.evaluate(() => document.fonts.ready);
  const out = await page.evaluate(n => {
    const rgba = s => (s.match(/[\d.]+/g) || []).map(Number);
    const over = (fg, bg) => {            // composite fg (may be translucent) over bg
      const a = fg.length > 3 ? fg[3] : 1;
      return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
    };
    const pageBg = rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3);
    return Array.from({ length: n }, (_, i) => {
      const s = getComputedStyle(document.getElementById('c' + i));
      const own = rgba(s.backgroundColor);
      const alpha = own.length > 3 ? own[3] : 1;
      return { paints: alpha > 0, translucent: alpha > 0 && alpha < 1,
        bg: over(own, pageBg), fg: over(rgba(s.color), over(own, pageBg)) };
    });
  }, items.length);
  await ctx.close();
  return out;
};
const seen = { light: await read('light'), dark: await read('dark') };
await browser.close();

const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const low = [];
let measured = 0, skipped = 0, translucent = 0, graphics = 0;
for (const mode of ['light', 'dark']) {
  items.forEach((x, i) => {
    const r = seen[mode][i];
    if (!r.paints) { skipped++; return; }
    if (r.translucent) translucent++;
    measured++;
    const c = ratio(r.fg, r.bg);
    const floor = typeless.has(x.component) ? 3 : 4.5;
    if (floor === 3) graphics++;
    if (c < floor) low.push({ mode, x, c: +c.toFixed(2), floor });
  });
}
low.sort((a, b) => a.c - b.c);

console.log(`${measured} variant-renderings measured across both modes (${skipped} skipped: the `
  + `component paints no background of its own, so the surface is not its to answer for)`);
console.log(`  ${translucent} of them paint a TRANSLUCENT fill, composited over the page rather `
  + `than read as an opaque colour — a 20% wash scores 1.83:1 read the naive way and is fine`);
const fresh = low.filter(l => !KNOWN.has(`${l.x.base}|${l.mode}`));
console.log(`  ${graphics} of them hold a GLYPH rather than a label — Figma gives the component no `
  + `type at all — so WCAG's 3:1 for a graphic applies to those rather than 4.5:1 for text`);
console.log(`  ${low.length} below their own floor, across `
  + `${new Set(low.map(l => l.x.base + '|' + l.mode)).size} class/mode pair(s); ${KNOWN.size} are `
  + `known and written up in docs/FIGMA-ISSUES.md §15`);
if (!measured) {
  console.error('  this check proved nothing: not one component painted its own background');
  process.exit(1);
}
for (const l of low) {
  const line = `.${l.x.base} [${l.x.variant}] in ${l.mode} mode reads ${l.c}:1 against a floor of `
    + `${l.floor}:1 — its own ${l.floor === 3 ? 'glyph' : 'text'} on its own background`;
  if (KNOWN.has(`${l.x.base}|${l.mode}`)) console.log('  known — ' + line);
  else console.error('FAIL ' + line);
}
process.exit(fresh.length ? 1 : 0);
