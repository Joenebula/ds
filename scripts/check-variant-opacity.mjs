#!/usr/bin/env node
// Does a variant Figma fades actually render faded — and does nothing else?
//
//   node scripts/check-variant-opacity.mjs
//
// WHY THIS EXISTS. `Button Type=Action, State=Disabled` binds exactly the fill and text tokens
// its `State=Default` binds, and what makes it read as disabled is `opacity: 0.4` on the variant
// itself. The colour extract has no slot for that, so the disabled rule rendered PIXEL-IDENTICAL
// to the enabled one — measured: same background, same text colour, same everything. Three of
// the six button types are in that position (`Action`, `Negative`, `Positive`, the solid ones);
// the other three bind `Text/Disabled` and always did look disabled.
//
// BOTH DIRECTIONS, and the negative is the one that matters most here. A faded variant is easy
// to see. A fade that spread to variants Figma does NOT fade — an enabled button at 40% — is the
// kind of thing that looks like a rendering bug rather than a stylesheet one, and the selector
// that would cause it is one attribute away from the correct one.
//
// It renders the markup a PAGE writes, with the axes the STYLESHEET uses, read out of the
// stylesheet's own selectors. Spelling out every Figma axis instead is the mistake
// `check-stroke-sides` made: the rule matched nothing any page produces and sat there looking
// correct. The extractor refuses a variant string `component-variants.tsv` does not have, which
// is the same guard one step earlier.
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const tsv = f => {
  const [h, ...rows] = readFileSync(f, 'utf8').trim().split('\n');
  const head = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [head[i], v])));
};
const cls = n => 'pf-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

if (!existsSync('tokens/_raw/component-variant-opacity.tsv')) {
  console.error('FAIL tokens/_raw/component-variant-opacity.tsv is missing, so this checked nothing');
  process.exit(1);
}
const want = tsv('tokens/_raw/component-variant-opacity.tsv');
const variants = tsv('tokens/_raw/component-variants.tsv');
const css = ['tokens', 'components'].map(f => readFileSync(`dist/${f}.css`, 'utf8')).join('\n');

// The axes the STYLESHEET uses for this class, read back out of its own selectors — not the
// axes Figma names. A page can only write what the stylesheet matches.
const axesOf = base => {
  const seen = new Set();
  const re = new RegExp('\\.' + base + '((?:\\[data-[a-z0-9-]+="[^"]*"\\])+)', 'g');
  for (const m of css.matchAll(re)) {
    for (const a of m[1].matchAll(/\[data-([a-z0-9-]+)="([^"]*)"\]/g)) seen.add(a[1]);
  }
  return seen;
};
const attrs = (base, variant) => {
  const use = axesOf(base);
  return variant.split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const k = x.slice(0, x.indexOf('=')).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return use.has(k) ? ` data-${k}="${x.slice(x.indexOf('=') + 1)}"` : '';
  }).join('');
};

// Every variant of every component the file names — the faded ones and, just as importantly,
// the ones beside them that must NOT be faded.
const named = new Map(want.map(r => [`${r.component}|${r.variant}`, +r.opacity]));
const comps = new Set(want.map(r => r.component));
const cases = variants.filter(v => comps.has(v.component)).map(v => ({
  component: v.component, variant: v.variant, base: cls(v.component),
  expect: named.get(`${v.component}|${v.variant}`) ?? 1,
}));
if (!cases.length) { console.error('FAIL no variant matched, so this checked nothing'); process.exit(1); }

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
await page.setContent(`<style>${css}</style>` + cases.map((c, i) =>
  `<button class="${c.base}"${attrs(c.base, c.variant)} id="c${i}">Save</button>`).join(''));
const got = await page.evaluate(n => Array.from({ length: n }, (_, i) =>
  +getComputedStyle(document.getElementById('c' + i)).opacity), cases.length);
await browser.close();

let bad = 0, faded = 0;
for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  if (Math.abs(got[i] - c.expect) > 0.001) {
    bad++;
    console.error(`FAIL ${c.component} "${c.variant}" renders opacity ${got[i]}, Figma measures `
      + `${c.expect}${c.expect === 1 ? ' — a fade has spread to a variant Figma does not fade' : ''}`);
  } else if (c.expect !== 1) faded++;
}
if (faded !== want.length) {
  console.error(`FAIL ${faded} of the ${want.length} measured variants were reached; the rest match `
    + 'no rule a page can produce');
  bad++;
}
console.log(`${cases.length} variant(s) rendered: ${faded} carry the opacity Figma fades them to, `
  + `${cases.length - faded} are not faded and must not be`);
process.exit(bad ? 1 : 0);
