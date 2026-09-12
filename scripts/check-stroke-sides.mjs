#!/usr/bin/env node
// Does a component's border have the edges and the thickness Figma gives it?
//
//   node scripts/check-stroke-sides.mjs
//
// The colour extract knows a stroke's token and nothing else, so the generator painted
// every bound stroke as `1px solid <token>` on all four sides. Figma disagrees 56 times:
// 26 variants stroke some edges and not others, 12 stroke all four at 1.5px or 2px, and 18
// keep a stroke paint with its visibility switched OFF and draw no border at all.
//
// The one that surfaced it was reported from a screen, not by a check: `Nav tabs` is a
// file-folder tab — bottom edge only when unselected, top/left/right with an OPEN bottom
// when selected — and painted as a box, every tab in the strip became an outlined
// rectangle and the selected one stopped reading as selected.
//
// WHY IT IS MEASURED IN A BROWSER rather than read out of the stylesheet. The rules are
// emitted onto variant selectors built from Figma's variant strings — `[data-status=
// "Selected"][data-mobile="False"]`. Grep the file and a selector with an attribute the
// library does not use looks exactly like one that works; render it and the border comes
// back as the 1px the base class paints, which is the whole fault this exists to catch. A
// check that reads its own generator's output is not a check.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const TSV = 'tokens/_raw/component-stroke-sides.tsv';
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = readFileSync(TSV, 'utf8').trim().split('\n');
const head = lines[0].split('\t');
const rows = lines.slice(1).map(l => {
  const c = l.split('\t');
  return Object.fromEntries(head.map((h, i) => [h, c[i]]));
});

const css = readFileSync('dist/components.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));
// A class gets a border STYLE only where some variant of it binds a stroke token, and four
// components bind none — two stroked with a gradient, one whose paint Figma has switched
// off, one with no stroke paint at all. The generator skips those and says so; this must
// apply the same rule or it would demand a border the generator will not write.
// The axes are read from the stylesheet MINUS the border block this check is checking.
// Reading the whole file would let an over-specified border rule teach the check to write
// the very attribute that makes it match — a check that grades its own homework. The rest
// of the stylesheet is the independent statement of what a page is expected to write.
const others = css.slice(0, css.indexOf('/* Borders Figma does not draw'));
const axesUsedBy = (base) => {
  const seen = new Set();
  for (const m of others.matchAll(new RegExp(`\\.${base}((?:\\[[^\\]]*\\])+)`, 'g')))
    for (const a of m[1].matchAll(/\[data-([a-z0-9-]+)=/g)) seen.add(a[1]);
  return seen;
};
const hasBorderStyle = new Set([...css.matchAll(/^\.(pf-[a-z0-9-]+)[^{]*\{[^}]*border: 1px solid transparent;/gm)]
  .map(m => m[1]));

const stage = [], specs = [];
const noClass = [], noColour = [];
for (const r of rows) {
  const base = 'pf-' + kebab(r.component);
  // A component with no class is not a failure here — `check-skill-classes` owns the
  // question of what has a class. It is skipped and named, so the total below is the
  // number actually measured rather than the number of rows.
  if (!libClasses.has(base)) { noClass.push(r.component); continue; }
  if (!hasBorderStyle.has(base)) { noColour.push(r.component); continue; }
  // ONLY THE AXES THE LIBRARY USES. Figma names a variant with every axis it has; the
  // stylesheet collapses the ones that change nothing, and a page writes only what the
  // stylesheet asks for. Writing all of Figma's axes here made this check pass on rules
  // that matched nothing a real page produces — the generator was emitting
  // `.pf-clock-in[data-type="Standard"][data-darkmode="False"]` and only check-off-system
  // noticed, because the page still had to set the width by hand. Measure what a page gets.
  const axes = axesUsedBy(base);
  const at = r.variant
    ? r.variant.split(', ').map(v => {
        const a = kebab(v.slice(0, v.indexOf('=')));
        return axes.has(a) ? ` data-${a}="${v.slice(v.indexOf('=') + 1)}"` : '';
      }).join('')
    : '';
  const want = r.visible === 'no'
    ? [0, 0, 0, 0]
    : [r.top, r.right, r.bottom, r.left].map(Number);
  specs.push({ ...r, base, want });
  stage.push(`<div id="s${specs.length - 1}" class="${base}"${at}></div>`);
}

writeFileSync('tmp-sides-check.html', ['fonts', 'tokens', 'components', 'type']
  .map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${stage.join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-sides-check.html');
const got = await p.evaluate(n => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = document.getElementById('s' + i);
    const cs = getComputedStyle(el);
    // ALSO: does any rule that actually matches this element declare a border width?
    //
    // The floor tolerance below has a blind spot. `Clock in` should stroke 1.5px, Chromium
    // paints 1px, and the base class paints 1px too — so a rule that matches NOTHING renders
    // identically to the right one. The rendered value stays the source of truth; this says
    // whether the element is reached by a rule at all, which is the one thing rendering
    // cannot distinguish here.
    const declared = [...document.styleSheets].flatMap(s => [...s.cssRules])
      .filter(r => r.selectorText && r.style && r.style.borderTopWidth && el.matches(r.selectorText))
      .map(r => r.style.borderWidth || r.style.borderTopWidth);
    out.push({
      widths: ['Top', 'Right', 'Bottom', 'Left'].map(s => parseFloat(cs['border' + s + 'Width'])),
      declared: declared[declared.length - 1] || null,
    });
  }
  return out;
}, specs.length);
await browser.close();
unlinkSync('tmp-sides-check.html');

// A FRACTIONAL WIDTH IS NOT A FAILURE, AND NOT A PASS EITHER.
//
// `Clock in` strokes 1.5px in Figma and the generated rule says `border-width: 1.5px`, but
// Chromium floors a border to a whole CSS pixel — at any device scale factor — so it paints
// 1px and `getComputedStyle` reports 1px. Failing that would demand something no browser
// can do; accepting it silently would hide a genuine 2px-rendering-as-1px. So a width the
// browser cannot represent is allowed to floor, and counted and named separately, which is
// the only honest reading: the stylesheet carries Figma's number and the screen shows what
// it can. Everything else must match exactly.
const floors = n => Math.max(1, Math.floor(n));
const bad = [], floored = [];
for (const [i, s] of specs.entries()) {
  const g = got[i].widths, declared = got[i].declared;
  if (g.every((v, k) => Math.abs(v - s.want[k]) < 0.01)) continue;
  if (s.want.every((w, k) => w === 0 ? g[k] === 0 : (w % 1 !== 0 && g[k] === floors(w)))) {
    if (declared && Math.abs(parseFloat(declared) - s.want[0]) < 0.01) {
      floored.push(`${s.component} ${s.variant || '*'} — ${s.want[0]}px in Figma, painted at ${g[0]}px`);
      continue;
    }
    bad.push(`${s.component} ${s.variant || '*'} — Figma strokes ${s.want[0]}px and no rule that `
      + `matches this markup declares it (${declared ? `nearest is ${declared}` : 'none found'}), `
      + `so it only looks right because the base class paints ${g[0]}px`);
    continue;
  }
  bad.push(`${s.component} ${s.variant || '*'} — Figma strokes ${s.want.join('/')}`
    + `${s.visible === 'no' ? ' (paint switched off)' : ''}, the class paints ${g.join('/')}`);
}

console.log(`${specs.length} of ${rows.length} variant(s) whose border is not a 1px box, measured`);
if (noClass.length)
  console.log(`  ${noClass.length} skipped: no class in the stylesheet (${[...new Set(noClass)].sort().join(', ')})`);
if (noColour.length)
  console.log(`  ${noColour.length} skipped: the class binds no stroke token, so it has no border `
    + `to widen (${[...new Set(noColour)].sort().join(', ')})`);
if (bad.length) {
  console.log(`  FAIL  ${bad.length} paint a border Figma does not draw:`);
  for (const b of bad) console.log('    ' + b);
} else {
  console.log('  every one paints the edges Figma strokes, at the width Figma strokes them');
}
if (floored.length)
  console.log(`  ${floored.length} stroke a fractional width, which Chromium floors to a whole `
    + `pixel: ${floored.join('; ')}`);
process.exit(bad.length ? 1 : 0);
