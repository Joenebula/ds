#!/usr/bin/env node
// Renders dist/components.css in Chromium and checks every class against the Figma
// extracts — the measured geometry and the variant colour bindings.
//
//   node scripts/verify-components.mjs            check the library
//   node scripts/verify-components.mjs --self-test  prove the check actually fails
//
// verify-geometry.mjs does this for a single page. This does it for the whole library,
// which is what you need once screens are built from classes rather than hand-written CSS.
import { hugsVertically } from './hugs-vertically.mjs';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Figma's own answer about which frames hug — see scripts/hugs-vertically.mjs.
const HUGS = hugsVertically();

// Mirrors build-components-css.mjs: a component-level text colour that is really one
// child's, identified by the child tree binding more than one label colour.
const labelColours = new Map();
for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
  const c = line.split('\t');
  if (!c[1] || c[2] !== 'TEXT' || !c[12]) continue;
  if (!labelColours.has(c[0])) labelColours.set(c[0], new Set());
  labelColours.get(c[0]).add(c[12]);
}
const colourIsOneChilds = (component) => (labelColours.get(component) || new Set()).size > 1;

const selfTest = process.argv.includes('--self-test');

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};

const geometryRows = tsv('tokens/_raw/component-geometry.tsv');
const geometry = new Map(geometryRows.filter(r => !r.component.includes('|')).map(r => [r.component, r]));
// Per-variant rows. This file used to hold one row per component, so every variant was
// checked against the same expectation — which was the fault, not the check. Now a
// variant with its own row must be checked against THAT row: Information box is 56px in
// its default Type=Information and 74px in Warning, Error and Success, and comparing all
// four to the base reported four failures that were the checker's, not the library's.
// Key these exactly the way the generator builds its selectors. selectorsFor() drops the
// State and Hover axes — they become CSS states, not attributes — so the rule for
// "AG Filter menus|Variant=Sort, State=Default" is emitted as [data-variant="Sort"].
// Looking the colour row "Variant=Sort" up by its literal key therefore missed, fell
// back to the base row, and reported the 252px default against a correctly rendered
// 176px. Later rows win, as they do in the cascade.
const dropStateAxes = v => String(v).split(',').map(x => x.trim()).filter(Boolean)
  .filter(a => !/^(State|Hover)=/.test(a)).join(', ');
const geometryVariant = new Map();
for (const r of geometryRows) {
  if (!r.component.includes('|')) continue;
  const i = r.component.indexOf('|');
  geometryVariant.set(r.component, r);                                   // literal key
  const collapsed = `${r.component.slice(0, i)}|${dropStateAxes(r.component.slice(i + 1))}`;
  if (collapsed !== r.component && dropStateAxes(r.component.slice(i + 1)))
    geometryVariant.set(collapsed, r);
}
const variants = tsv('tokens/_raw/component-variants.tsv');

const tokenVar = new Map();
(function walk(o) {
  for (const v of Object.values(o)) {
    if (!v || typeof v !== 'object') continue;
    if (v.$value !== undefined) {
      const e = (v.$extensions || {})['com.mhr.pf'] || {};
      if (e.figmaName && e.cssVar) tokenVar.set(e.figmaName, e.cssVar);
    } else walk(v);
  }
})(JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8')));

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const num = s => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
const parseVariant = v => v.split(',').map(p => p.trim()).filter(Boolean).map(p => {
  const i = p.indexOf('='); return i < 0 ? [p, ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
});

// ---- expectations + specimen markup -----------------------------------------
const specs = [];
variants.forEach((r, i) => {
  const g = geometryVariant.get(`${r.component}|${r.variant}`) || geometry.get(r.component);
  const base = 'pf-' + kebab(r.component);
  const attrs = parseVariant(r.variant).map(([k, v]) => ` data-${kebab(k)}="${esc(v)}"`).join('');
  const id = 's' + i;

  const m = (g?.size || '').match(/^(auto|\d+)\s*x\s*(auto|\d+)$/);
  const h = m && m[2] !== 'auto' ? +m[2] : null;
  const radius = num(g?.radius);
  const fontPx = (g?.font || '').match(/^(\d+)px/);
  const mode = (g?.layout || '').split(/\s+/)[0];
  const hugs = HUGS.has(r.component);

  specs.push({
    id, component: r.component, variant: r.variant,
    html: `<div class="${base}" id="${id}"${attrs}>x</div>`,
    expect: {
      // Mirror the generator's FOUR height tiers (see build-components-css.mjs): a
      // hugging frame states none at all, a control's is exact, a panel's is a floor, and
      // an artboard's is not a rule. Asserting the raw Figma number for all of them would
      // fail the checker on values the generator is deliberately, and correctly, not
      // emitting — and on a hugging component it would be measuring an EMPTY box against
      // the height of Figma's sample contents, which said 69px expected, 19px got.
      hugs,
      height: !hugs && h !== null && h <= 260 ? h : null,
      minHeight: !hugs && h !== null && h > 260 && h <= 700 ? h : null,
      radiusPill: h !== null && radius !== null && radius >= h / 2 - 1,
      radius: radius !== null && !(h !== null && radius >= h / 2 - 1) && radius > 0 ? radius : null,
      fontSize: fontPx ? +fontPx[1] : null,
      flexDirection: mode === 'VERTICAL' ? 'column' : mode === 'HORIZONTAL' ? 'row' : null,
      fill: tokenVar.get(r.fill) || null,
      stroke: tokenVar.get(r.stroke) || null,
      text: tokenVar.get(r.text) || null,
    },
  });
});

const page = `<link rel="stylesheet" href="dist/tokens.css">
<link rel="stylesheet" href="dist/components.css">
${selfTest ? '<style>.pf-button{height:11px !important;border-radius:3px !important}</style>' : ''}
<body style="margin:0">${specs.map(s => s.html).join('\n')}
<div id="probe"></div></body>`;
writeFileSync('tmp-components-check.html', page);

// ---- render and compare ------------------------------------------------------
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const results = [];

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto('file:///home/user/ds/tmp-components-check.html');

  const found = await p.evaluate(specs => {
    const probe = document.getElementById('probe');
    const resolve = (v) => { probe.style.background = `var(${v})`;
      return getComputedStyle(probe).backgroundColor; };
    return specs.map(s => {
      const el = document.getElementById(s.id);
      if (!el) return { id: s.id, missing: true };
      const cs = getComputedStyle(el);
      return {
        id: s.id,
        height: Math.round(el.getBoundingClientRect().height),
        declaredHeight: (() => { for (const sh of document.styleSheets) {
          let rs; try { rs = sh.cssRules; } catch { continue; }
          for (const rr of rs) { if (rr.selectorText === '.' + el.className.split(' ')[0]
            && rr.style && rr.style.height) return rr.style.height; } } return ''; })(),
        radius: parseFloat(cs.borderTopLeftRadius),
        fontSize: parseFloat(cs.fontSize),
        minHeight: cs.minHeight,
        flexDirection: cs.flexDirection,
        bg: cs.backgroundColor,
        color: cs.color,
        borderColor: cs.borderTopColor,
        want: {
          fill: s.expect.fill ? resolve(s.expect.fill) : null,
          stroke: s.expect.stroke ? resolve(s.expect.stroke) : null,
          text: s.expect.text ? resolve(s.expect.text) : null,
        },
      };
    });
  }, specs.map(s => ({ id: s.id, expect: { fill: s.expect.fill, stroke: s.expect.stroke, text: s.expect.text } })));

  const byId = new Map(found.map(f => [f.id, f]));
  for (const s of specs) {
    const f = byId.get(s.id);
    const add = (prop, want, got, ok) =>
      results.push({ theme, component: s.component, variant: s.variant, prop, want, got, ok });

    if (!f || f.missing) { add('exists', 'in DOM', 'missing', false); continue; }
    const e = s.expect;

    // The negative, so a hugging component is still asserted rather than merely skipped:
    // its class must state no height of its own, which is what lets the content decide.
    if (e.hugs) add('height (hugs)', 'not stated', f.declaredHeight || 'not stated',
      !f.declaredHeight || f.declaredHeight === 'auto');
    if (e.height !== null) add('height', e.height + 'px', f.height + 'px', Math.abs(f.height - e.height) <= 1);
    if (e.minHeight !== null) add('min-height', e.minHeight + 'px', f.minHeight, f.minHeight === e.minHeight + 'px');
    if (e.radiusPill) add('radius (pill)', '>= half height', f.radius + 'px', f.radius >= f.height / 2 - 1);
    else if (e.radius !== null) add('radius', e.radius + 'px', f.radius + 'px', Math.abs(f.radius - e.radius) <= 1);
    if (e.fontSize !== null) add('font-size', e.fontSize + 'px', f.fontSize + 'px', Math.abs(f.fontSize - e.fontSize) <= 0.5);
    if (e.flexDirection) add('flex-direction', e.flexDirection, f.flexDirection, f.flexDirection === e.flexDirection);

    if (f.want.fill) add('background', f.want.fill, f.bg, f.bg === f.want.fill);
    // THE GENERATOR DELIBERATELY DROPS SOME TEXT COLOURS, so asserting them all would fail
    // the library on values it is right not to emit. The colour extract gives a component
    // ONE text colour; for a composite one that is whichever label Figma happened to record,
    // and painting it on the class paints every descendant — `.pf-calendar-picker` rendered
    // its whole calendar white on white. The generator drops such a colour when the child
    // tree shows more than one label colour, and this mirrors that rule. Mirroring rather
    // than exempting by name: the same reasoning, read from the same file, so the two cannot
    // drift the way the State/Hover axis collapsing once did.
    if (f.want.text && !colourIsOneChilds(s.component)) add('color', f.want.text, f.color, f.color === f.want.text);
    if (f.want.stroke) add('border-color', f.want.stroke, f.borderColor, f.borderColor === f.want.stroke);
  }
  await ctx.close();
}
await browser.close();
unlinkSync('tmp-components-check.html');   // the specimen page must sit next to dist/ for the relative CSS links to resolve

const fails = results.filter(r => !r.ok);
for (const r of fails.slice(0, 40)) {
  console.log(`FAIL [${r.theme}] ${r.component} — ${r.variant}\n       ${r.prop}: expected ${r.want}, got ${r.got}`);
}
if (fails.length > 40) console.log(`... and ${fails.length - 40} more`);

// NOT "match Figma". This renders dist/components.css and compares it to
// component-geometry.tsv and component-variants.tsv — the two files the stylesheet is
// GENERATED FROM. It measures internal consistency, which is worth having and is not the
// same claim. verify-against-figma.mjs is the one with an independent source.
console.log(`\n${results.length - fails.length} of ${results.length} rendered values match the extract they were built from, ${fails.length} off`);
console.log('  (internal consistency — see verify-against-figma.mjs for the check with an independent source)');
if (selfTest) {
  const caught = fails.filter(f => f.component === 'Button' && /height|radius/.test(f.prop)).length;
  console.log(caught ? `self-test OK — the deliberate break was caught (${caught} failures)`
                     : 'self-test FAILED — the deliberate break was NOT caught');
  process.exit(caught ? 0 : 1);
}
process.exit(fails.length ? 1 : 0);
