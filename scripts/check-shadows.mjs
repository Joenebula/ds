#!/usr/bin/env node
// Does a component cast the shadow Figma gives it?
//
//   node scripts/check-shadows.mjs
//
// `dist/components.css` contained the string "box-shadow" ZERO times while Figma put a drop
// shadow on 50 component variants — every floating surface in the system, rendering flat.
// The colour extract knows a fill, a stroke and a text token, and a shadow is none of the
// three, so nothing in the suite could see it. This is the third property found that way,
// after the centred child and the per-side border.
//
// It measures the RENDERED shadow against FIGMA'S NUMBERS, not against the token name the
// generator chose. A rule naming the wrong token, a selector that matches nothing, and a
// token whose value drifts are three different faults and all three show up here as the
// same thing: the wrong pixels.
//
// It also asserts the NEGATIVE. 18 variants cast a shadow the design system has no token
// for, and the generator deliberately emits nothing for them rather than writing Figma's
// rgba — which would be a raw colour in generated CSS and frozen across both modes. If one
// of those ever starts painting, that rule was written by hand, and this says so.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = readFileSync('tokens/_raw/component-shadow.tsv', 'utf8').trim().split('\n');
const head = lines[0].split('\t');
const rows = lines.slice(1).map(l => {
  const c = l.split('\t');
  return Object.fromEntries(head.map((h, i) => [h, c[i]]));
});

const css = readFileSync('dist/components.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));
// Axes from the stylesheet minus the shadow block, so a rule cannot teach this check to
// write the attribute that makes it match — the same trap check-stroke-sides fell into.
const others = css.slice(0, css.indexOf('/* Drop shadows. Figma puts one'));
const axesUsedBy = base => {
  const seen = new Set();
  for (const m of others.matchAll(new RegExp(`\\.${base}((?:\\[[^\\]]*\\])+)`, 'g')))
    for (const a of m[1].matchAll(/\[data-([a-z0-9-]+)=/g)) seen.add(a[1]);
  return seen;
};

const specs = [], stage = [], noClass = [], notShadow = [];
for (const r of rows) {
  const base = 'pf-' + kebab(r.component);
  if (!libClasses.has(base)) { noClass.push(r.component); continue; }
  if (r.type !== 'DROP_SHADOW') { notShadow.push(`${r.component} (${r.type})`); continue; }
  const axes = axesUsedBy(base);
  const at = r.variant
    ? r.variant.split(', ').map(v => {
        const a = kebab(v.slice(0, v.indexOf('=')));
        return axes.has(a) ? ` data-${a}="${v.slice(v.indexOf('=') + 1)}"` : '';
      }).join('')
    : '';
  specs.push(r);
  stage.push(`<div id="s${specs.length - 1}" class="${base}"${at}></div>`);
}

writeFileSync('tmp-shadow-check.html', ['fonts', 'tokens', 'components', 'type']
  .map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${stage.join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-shadow-check.html');
const got = await p.evaluate(n => {
  const out = [];
  for (let i = 0; i < n; i++) out.push(getComputedStyle(document.getElementById('s' + i)).boxShadow);
  return out;
}, specs.length);
await browser.close();
unlinkSync('tmp-shadow-check.html');

// "rgba(0, 0, 0, 0.1) 0px 4px 4px 0px" / "rgb(193, 193, 193) 0px 0px 4px 0px"
const parse = v => {
  const col = /rgba?\(([^)]+)\)/.exec(v);
  if (!col) return null;
  const nums = [...v.slice(col.index + col[0].length).matchAll(/(-?[\d.]+)px/g)].map(m => Number(m[1]));
  const c = col[1].split(',').map(x => Number(x.trim()));
  return { rgba: [c[0], c[1], c[2], c[3] === undefined ? 1 : c[3]], geo: nums };
};

const wrong = [], missing = [], unexpected = [], untokened = [];
for (const [i, r] of specs.entries()) {
  const v = got[i];
  const want = { rgba: (r.colour || '').split(',').map(Number),
                 geo: [Number(r.x), Number(r.y), Number(r.blur), Number(r.spread)] };
  if (want.rgba.length === 3) want.rgba.push(1);
  const where = `${r.component} ${r.variant || '*'}`;
  const g = parse(v);
  // Figma rounds alpha to three places and a token's comes from an 8-digit hex, so
  // #0000001a is 26/255 = 0.10196. Compare at the precision both can express.
  const same = g && g.geo.length === 4 && g.geo.every((n, k) => n === want.geo[k])
    && g.rgba.slice(0, 3).every((n, k) => n === want.rgba[k])
    && Math.abs(g.rgba[3] - want.rgba[3]) < 0.006;
  if (same) continue;
  if (!g) {
    // No shadow painted. Either the design system has no token for this measurement — in
    // which case that is the intended outcome and it is reported, not failed — or a rule
    // that should exist is missing.
    untokened.push(`${where} — ${want.geo.join(' ')} rgba(${r.colour})`);
    continue;
  }
  wrong.push(`${where} — Figma casts ${want.geo.join(' ')} rgba(${r.colour}), the class paints ${v}`);
}

console.log(`${specs.length} drop shadow(s) measured from Figma across `
  + `${new Set(specs.map(s => s.component)).size} components`);
console.log(`  ${specs.length - untokened.length - wrong.length} paint exactly what Figma casts`);
if (untokened.length)
  console.log(`  ${untokened.length} cast a shadow the design system has no token for, so the `
    + `generator emits none — see docs/FIGMA-ISSUES.md:\n    ${untokened.sort().join('\n    ')}`);
if (notShadow.length)
  console.log(`  ${notShadow.length} effect(s) are not a drop shadow: ${notShadow.sort().join(', ')}`);
if (noClass.length)
  console.log(`  ${noClass.length} skipped: no class in the stylesheet `
    + `(${[...new Set(noClass)].sort().join(', ')})`);
if (wrong.length) {
  console.log(`  FAIL  ${wrong.length} paint a shadow that is not the one Figma casts:`);
  for (const w of wrong) console.log('    ' + w);
}
process.exit(wrong.length ? 1 : 0);
