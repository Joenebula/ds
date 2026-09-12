#!/usr/bin/env node
// Does a component composing a text style render that style — all of it?
//
//   node scripts/check-composed-type.mjs
//
// `dist/type.css` writes a class per Figma text style. `dist/components.css` writes the same
// styles onto the component labels Figma gives them, and its own comment says the two have
// "one source rather than two that can drift apart". They were two separate implementations,
// and they HAD drifted: the type class emitted `line-height: normal` — Figma's AUTO, which
// all 23 styles use — and the composed rule emitted no line-height at all. So a component
// label inherited whatever the page set.
//
// Measured on a page with `line-height: 1.9`, before the fix:
//
//     .pf-text-body-text   normal      <- correct
//     .pf-filter-chip      30.4px      <- the page's, not Figma's
//
// Same style, two renderings, on nearly every page — because nearly every page sets a body
// line-height. Nothing could see it: verify-type checks 107 values and line-height was not
// among them, and the stylesheet looked right because the MISSING declaration is invisible.
//
// So this does not read the stylesheet. It renders a component and its style's own type
// class INSIDE a container with a deliberately wrong line-height, and asks whether they come
// out the same. A declaration that is absent can only be caught by something the page can
// override — which is exactly what makes this class of fault invisible to a text search.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PROPS = ['fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform', 'lineHeight'];
// A hostile ancestor: every property a page could plausibly set on its body, set to
// something Figma never says. Anything a component fails to state, it inherits from here.
const HOSTILE = 'line-height:1.9;letter-spacing:3px;text-transform:lowercase;font-style:italic;font-weight:100;font-size:11px';

const css = readFileSync('dist/components.css', 'utf8');
// The composed block names its style in a comment above each rule, and the type class for
// that style is derived from the same text-styles.tsv the generator used.
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const className = (name) => {
  let n = name.replace(/^Desktop text\//, '').replace(/^Mobile text\//, 'mobile ');
  n = n.replace(/\(semi bold, 600\)/i, 'semibold').replace(/\(bold\)/i, 'semibold')
       .replace(/\(light\)/i, 'light').replace(/\(italic\)/i, 'italic')
       .replace(/\(uppercase\)/i, 'uppercase');
  return 'pf-text-' + kebab(n);
};
const typeClasses = new Set([...readFileSync('dist/type.css', 'utf8')
  .matchAll(/^\.(pf-text-[a-z0-9-]+)/gm)].map(m => m[1]));

// Each composed rule: the comment carries the style name, the selector list the components.
const block = css.slice(css.indexOf('/* ---- type, composed from the Figma text styles'));
const pairs = [];
for (const m of block.matchAll(/\/\* ([^*]+?)\s+\(\d+px[^)]*\) \*\/\n([^{]+)\{/g)) {
  const tc = className(m[1].trim());
  if (!typeClasses.has(tc)) continue;      // style the ramp does not name; nothing to compare
  const first = m[2].split(',')[0].trim();
  pairs.push({ style: m[1].trim(), typeClass: tc, sel: first });
}
if (!pairs.length) {
  console.log('FAIL  no composed type rules found — the block moved or was renamed, so this '
    + 'check is measuring nothing');
  process.exit(1);
}

// Turn a selector into markup: `.pf-x[data-a="b"]` -> <div class="pf-x" data-a="b">
const markup = (sel, id) => {
  const cls = /^\.([a-z0-9-]+)/.exec(sel)[1];
  const attrs = [...sel.matchAll(/\[([a-z0-9-]+)="([^"]*)"\]/g)]
    .map(a => ` ${a[1]}="${a[2]}"`).join('');
  return `<div id="${id}" class="${cls}"${attrs}>Sample</div>`;
};

const stage = pairs.map((p, i) =>
  `<div style="${HOSTILE}">${markup(p.sel, 'c' + i)}<span id="t${i}" class="${p.typeClass}">Sample</span></div>`).join('\n');

writeFileSync('tmp-composed-check.html', ['fonts', 'tokens', 'components', 'type']
  .map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${stage}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-composed-check.html');
await p.evaluate(() => document.fonts.ready);
const got = await p.evaluate(({ n, props }) => {
  const read = el => Object.fromEntries(props.map(k => [k, getComputedStyle(el)[k]]));
  const out = [];
  for (let i = 0; i < n; i++)
    out.push({ comp: read(document.getElementById('c' + i)), type: read(document.getElementById('t' + i)) });
  return out;
}, { n: pairs.length, props: PROPS });
await browser.close();
unlinkSync('tmp-composed-check.html');

const bad = [];
for (const [i, pair] of pairs.entries()) {
  const { comp, type } = got[i];
  const off = PROPS.filter(k => comp[k] !== type[k]);
  if (off.length)
    bad.push(`${pair.sel} composes "${pair.style}" but renders `
      + off.map(k => `${k} ${comp[k]} where .${pair.typeClass} renders ${type[k]}`).join(', '));
}

console.log(`${pairs.length} composed type rule(s) rendered beside the type class for the same style`);
if (bad.length) {
  console.log(`  FAIL  ${bad.length} render the style differently from its own class:`);
  for (const b of bad) console.log('    ' + b);
} else {
  console.log('  every one renders identically, with a hostile line-height, letter-spacing, '
    + 'case, style, weight and size on the ancestor');
}
process.exit(bad.length ? 1 : 0);
