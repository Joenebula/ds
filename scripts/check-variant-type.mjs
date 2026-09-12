#!/usr/bin/env node
// Does each VARIANT render the type Figma measured for it?
//
//   node scripts/check-variant-type.mjs
//
// Reported as "the button weight never changes on any state — it's the same as default".
// That turned out to be true of `Button` and correct: Figma measures 13px SemiBold on every
// one of its 24 labelled variants, so its states differ by colour and nothing else. But
// nothing in the suite could have answered the question, which is the part worth fixing.
//
// `check-component-type.mjs` reads the stylesheet text against the resolver that generated
// it — internally consistent by construction. `verify-against-figma.mjs` compares type, but
// only `if (declared('font-size'))`, so a component that COMPOSES its text style declares
// nothing on its own rule and is skipped by exactly the mechanism the type layer is built
// on. Between them, no check rendered a variant and asked what weight came out.
//
// This does. The expectation is `component-geometry.tsv`'s per-variant `font` column — a
// different walk from the one that produced `component-type.tsv`, which the composition is
// generated from, so the two sides have separate origins.
//
// THE MARKUP IS WRITTEN WITH THE AXES THE STYLESHEET USES, not the axes Figma names. That
// is the mistake `check-stroke-sides` made: it built its own markup with every Figma axis
// spelled out, so a rule keyed on an axis the stylesheet collapses matched anyway and a
// selector no page can produce looked correct. The attribute names are read back out of the
// stylesheet's own selectors for that class, so the test element is what a page would write.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const WEIGHT = { Regular: 400, SemiBold: 600, Medium: 500, Light: 300, Bold: 700, Italic: 400 };
const kebab = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const css = readFileSync('dist/components.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));

// The data-* attribute names each class's own selectors actually key on.
const axesOf = new Map();
for (const m of css.matchAll(/\.(pf-[a-z0-9-]+)((?:\[[^\]]+\])+)/g)) {
  if (!axesOf.has(m[1])) axesOf.set(m[1], new Set());
  for (const a of m[2].matchAll(/\[data-([a-z0-9-]+)/g)) axesOf.get(m[1]).add(a[1]);
}

const items = [];
for (const line of readFileSync('tokens/_raw/component-geometry.tsv', 'utf8').trim().split('\n').slice(1)) {
  const r = line.split('\t');
  if (!r[0].includes('|')) continue;
  const f = /^(\d+)px(?:\s+(\S+))?$/.exec((r[5] || '').trim());
  if (!f) continue;                                   // "—": the variant has no type to check
  const [component, variant] = r[0].split('|');
  const base = 'pf-' + kebab(component);
  if (!libClasses.has(base)) continue;
  const keep = axesOf.get(base) || new Set();
  const attrs = variant.split(', ').map(p => {
    const i = p.indexOf('=');
    return [kebab(p.slice(0, i)), p.slice(i + 1)];
  }).filter(([k]) => keep.has(k));
  items.push({ component, variant, base, size: +f[1],
    weight: f[2] ? (WEIGHT[f[2]] ?? null) : null,
    attrs: attrs.map(([k, v]) => ` data-${k}="${v.replace(/"/g, '&quot;')}"`).join('') });
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.setContent(['fonts', 'tokens', 'components', 'type']
  .map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + items.map((x, i) => `<div id="w${i}" class="${x.base}"${x.attrs}>Label</div>`).join(''));
await page.evaluate(() => document.fonts.ready);
const got = await page.evaluate(n => Array.from({ length: n }, (_, i) => {
  const s = getComputedStyle(document.getElementById('w' + i));
  return [Math.round(parseFloat(s.fontSize)), +s.fontWeight];
}), items.length);
await browser.close();

const problems = [];
let varies = 0;
const byComponent = new Map();
for (let i = 0; i < items.length; i++) {
  const x = items[i], [size, weight] = got[i];
  if (!byComponent.has(x.component)) byComponent.set(x.component, new Set());
  byComponent.get(x.component).add(`${x.size}|${x.weight ?? ''}`);
  if (size !== x.size || (x.weight !== null && weight !== x.weight)) {
    problems.push(`.${x.base} [${x.variant}] — Figma measures ${x.size}px`
      + `${x.weight ? ' weight ' + x.weight : ''} and it renders ${size}px weight ${weight}`);
  }
}
for (const vals of byComponent.values()) if (vals.size > 1) varies++;

console.log(`${items.length} variant(s) with a measured font rendered and read back, across `
  + `${byComponent.size} component(s)`);
console.log(`  ${varies} component(s) DO change size or weight between variants — the rest carry `
  + `one type across every state, which is what Figma draws (Button is 13px SemiBold on all 24)`);
if (!items.length || !varies) {
  console.error('  this check proved nothing: no variant carried a measured font, or not one '
    + 'component varied its type, so a stylesheet ignoring the variant would pass');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
