#!/usr/bin/env node
// How far a component's own template spills outside the box its class defines.
//
//   node scripts/check-template-overflow.mjs
//
// WHY THIS EXISTS: it is the measurement that settled whether the pipeline should carry
// Figma's `clipsContent`. Figma clips 34 of the 62 components on Cards and panels, 22 of
// them with a corner radius — and clipping is the only way to make a child respect a
// rounded corner, so carrying it looked like the obvious next fix after the border and the
// shadow. It is not, and this says why in numbers: 28 of the 154 templates ALREADY render
// outside the box their own class draws — `pf-hemisphere-chart` by 333px, `pf-donut-pie-
// chart` by 284px, `pf-content` by 180px. `overflow: hidden` would have deleted that
// content from view, and nothing would have reported it — a clipped child
// still has a bounding rect, so check-templates would go on reporting the template renders
// its contents while a fifth of it was invisible. That is the exact shape of silent failure
// this project keeps finding, and it would have been introduced deliberately.
//
// The overflow is not a bug in the templates. A class's height comes from the artboard
// Figma drew the component at, and a template holds placeholder contents of its own size;
// the two were never promised to agree. So this REPORTS and pins rather than failing. The
// number is the precondition: clipping can only ever be carried once it is zero.
import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

// The count at the time this was written. It may fall freely — that is the class box and
// its contents coming into agreement. It may not rise without somebody deciding to raise
// it, because up means a template drifted further from the box it is pasted into.
//
// It was first set to 5 from a sample of eighteen components, which is how many of THOSE
// overflowed; run across all 154 it is 28. A baseline taken from a subset is a baseline
// that fails the moment it meets the whole set — measure the population you are pinning.
const OVERFLOW_BASELINE = 20;
// The sum of each overflowing template's worst edge, in pixels. Same rule: it may fall
// freely, and may not rise without somebody deciding to raise it.
const OVERFLOW_PX_BASELINE = 866;

// AND THE SAME TWO NUMBERS ON A PHONE.
//
// These were desktop-only for as long as a class was the same size at every width. Making
// components follow the viewport changed that and made the pinned pair describe half the
// library: a class box shrinks to its mobile artboard while the template's placeholder
// contents do not, so at 390px it is 31 templates and 1536px, not 27 and 1372. Four
// templates and 164px of overflow that no check could see — the same blind spot this repo
// keeps finding, introduced by the change that made the components responsive.
//
// It matters because these numbers are the precondition for carrying Figma's clipping (see
// CLAUDE.md, "Clipping"), and a precondition checked at one width is not checked.
const MOBILE_OVERFLOW_BASELINE = 24;
// RAISED ON PURPOSE, from 1536, and this is the one place the rule allows it.
//
// Keeping a fixed-height component's label on one line stopped it wrapping downward and let
// it run sideways instead, so the count fell (31 to 29, and 27 to 26 on the desktop pass)
// while the worst-edge total rose. What the rise reveals is true and was previously hidden by
// the wrap: `Search navigation` is a 32x32 ICON on mobile in Figma — no label at all — and
// the template still holds the desktop contents, so the word "Search" now hangs 119px out of
// a 32px box instead of folding up inside it. A template that disagrees with its mobile class
// is worth seeing; a wrap that concealed it was not.
// Raised again, by 5px, and this one is the cost of the chips being drawn at all. Letting
// the filter strip grow back to the 42px chips it holds — instead of being squashed to 32 and
// cropping their top and bottom borders — means those chips now extend 5px further past the
// component's own box. Five pixels of measured overflow for a border that renders.
const MOBILE_OVERFLOW_PX_BASELINE = 1224;
const WIDTHS = [['desktop', 1280, OVERFLOW_BASELINE, OVERFLOW_PX_BASELINE],
                ['mobile', 390, MOBILE_OVERFLOW_BASELINE, MOBILE_OVERFLOW_PX_BASELINE]];

const expand = h => h.replace(/<!--pf-icon:([a-z0-9-]+)(?:\s+(\d+))?-->/g, (m, n, s) => {
  const f = `assets/icons/${n}.svg`;
  return existsSync(f)
    ? readFileSync(f, 'utf8').trim().replace(/^<svg /, `<svg width="${s || 18}" height="${s || 18}" `)
    : m;
});

const specs = readdirSync('dist/templates').filter(f => f.endsWith('.html')).sort().map(f => ({
  base: f.replace(/\.html$/, ''),
  html: expand(readFileSync('dist/templates/' + f, 'utf8').replace(/^<!--[\s\S]*?-->\n/, '')),
}));

writeFileSync('tmp-overflow-check.html',
  ['fonts', 'tokens', 'components', 'type'].map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${specs.map((s, i) => `<section id="w${i}">${s.html}</section>`).join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const measured = {};
let mixed = null;
for (const [name, width] of WIDTHS) {
const p = await browser.newPage({ viewport: { width, height: 900 } });
await p.goto('file://' + process.cwd() + '/tmp-overflow-check.html');
await p.evaluate(() => document.fonts.ready);
// PLACING SOME CHILDREN AND FLOWING THE REST IS WORSE THAN FLOWING ALL OF THEM.
//
// Where Figma lays a parent out by hand the template places its children at measured
// offsets — but the generator emits different node kinds down different branches, and two
// of them built their own markup and dropped the placement: an icon (an HTML comment, which
// cannot carry a style) and a TEXT node. In `Search navigation` the magnifier was placed and
// the word "Search" was not, so they rendered on top of each other. Nothing measured that:
// the box did not overflow, the template rendered its contents, every check was green.
//
// This asks the question directly, in the browser: inside a positioned container, is every
// element child positioned the same way? A mix means a branch dropped a placement.
// Asked once. Whether a container places some children and flows the rest is a fact about
// the markup, not about the viewport.
if (!mixed) mixed = await p.evaluate(() => {
  const out = [];
  for (const parent of document.querySelectorAll('*')) {
    if (getComputedStyle(parent).position !== 'relative') continue;
    const kids = [...parent.children];
    if (kids.length < 2) continue;
    const abs = kids.filter(k => getComputedStyle(k).position === 'absolute');
    if (abs.length && abs.length !== kids.length) {
      const root = parent.closest('section') ;
      out.push(`${root ? root.id : '?'}: ${abs.length} of ${kids.length} children placed`);
    }
  }
  return out;
});

const got = await p.evaluate(n => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const box = document.getElementById('w' + i).firstElementChild;
    if (!box) { out.push(null); continue; }
    const b = box.getBoundingClientRect();
    let worst = 0, count = 0;
    for (const el of box.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      // Only DOWN and RIGHT. A component laid out inline can legitimately sit at a
      // negative offset for a moment during layout; what clipping would eat is the
      // content past the box's own bottom and right edges.
      const d = Math.max(r.bottom - b.bottom, r.right - b.right);
      if (d > 1) { count++; worst = Math.max(worst, d); }
    }
    out.push({ w: Math.round(b.width), h: Math.round(b.height), count, worst: Math.round(worst) });
  }
  return out;
}, specs.length);
await p.close();
measured[name] = got;
}
await browser.close();
unlinkSync('tmp-overflow-check.html');

const listFor = got => {
  const over = [];
  for (const [i, s] of specs.entries()) {
    const g = got[i];
    if (!g || !g.count) continue;
    over.push(`${s.base} — class box ${g.w}x${g.h}, ${g.count} element(s) outside it, by up to ${g.worst}px`);
  }
  return over;
};
const got = measured.desktop;
const over = listFor(got);

// HOW MANY IS NOT HOW MUCH. Placing `Hemisphere chart`'s children at Figma's own offsets
// took its overflow from 333px to 77px — a large, real improvement that the count alone
// could not see, because it still overflows by something. Both numbers are pinned: the
// count says how many templates disagree with their box, the worst pixel says how badly.
const worstPx = got.reduce((t, g) => t + (g && g.count ? g.worst : 0), 0);
console.log(`${specs.length} template(s) measured against the box their own class draws`);
console.log(`  ${over.length} render outside it (baseline ${OVERFLOW_BASELINE}), `
  + `${worstPx}px of overflow in total (baseline ${OVERFLOW_PX_BASELINE})`);
for (const o of over.sort()) console.log('    ' + o);
// The phone numbers are reported and gated the same way. Only the count and magnitude are
// listed, not every template again: the desktop list above already names them, and what the
// second width adds is how much further they drift once the class box shrinks to its mobile
// artboard and the contents do not.
const mobileOver = listFor(measured.mobile);
const mobilePx = measured.mobile.reduce((t, g) => t + (g && g.count ? g.worst : 0), 0);
console.log(`  at 390px: ${mobileOver.length} render outside it (baseline ${MOBILE_OVERFLOW_BASELINE}), `
  + `${mobilePx}px in total (baseline ${MOBILE_OVERFLOW_PX_BASELINE})`);
{
  const onlyMobile = mobileOver.map(x => x.split(' — ')[0])
    .filter(b => !over.some(o => o.startsWith(b + ' — ')));
  if (onlyMobile.length) {
    console.log(`    ${onlyMobile.length} overflow ONLY once the class shrinks to its mobile `
      + `artboard: ${onlyMobile.join(', ')}`);
  }
}
console.log('  Figma clips these components; the pipeline deliberately does NOT emit');
console.log('  overflow:hidden, because on these it would hide the template rather than');
console.log('  reproduce the design. See CLAUDE.md, "Clipping".');

let failed = 0;
if (mixed.length) {
  console.log(`  FAIL  ${mixed.length} container(s) place some children at Figma's measured `
    + `offsets and leave the rest in flow, so they render on top of each other:`);
  for (const m of mixed) {
    const i = Number(m.split(':')[0].replace('w', ''));
    console.log(`    ${Number.isFinite(i) && specs[i] ? specs[i].base : m}`);
  }
  failed = 1;
} else {
  console.log('  no container places only some of its children — a mix would overlap');
}
if (worstPx > OVERFLOW_PX_BASELINE) {
  console.log(`  FAIL  templates overflow their class box by ${worstPx - OVERFLOW_PX_BASELINE}px `
    + 'more than before.');
  failed = 1;
} else if (worstPx < OVERFLOW_PX_BASELINE) {
  console.log(`  note  down ${OVERFLOW_PX_BASELINE - worstPx}px — lower OVERFLOW_PX_BASELINE to `
    + `${worstPx} to lock it in`);
}
if (mobilePx > MOBILE_OVERFLOW_PX_BASELINE) {
  console.log(`  FAIL  at 390px templates overflow by ${mobilePx - MOBILE_OVERFLOW_PX_BASELINE}px `
    + 'more than before.');
  failed = 1;
} else if (mobilePx < MOBILE_OVERFLOW_PX_BASELINE) {
  console.log(`  note  at 390px down ${MOBILE_OVERFLOW_PX_BASELINE - mobilePx}px — lower `
    + `MOBILE_OVERFLOW_PX_BASELINE to ${mobilePx} to lock it in`);
}
if (mobileOver.length > MOBILE_OVERFLOW_BASELINE) {
  console.log('  FAIL  more templates overflow at 390px than before.');
  failed = 1;
} else if (mobileOver.length < MOBILE_OVERFLOW_BASELINE) {
  console.log(`  note  at 390px down to ${mobileOver.length} — lower MOBILE_OVERFLOW_BASELINE `
    + 'to lock it in');
}
if (over.length > OVERFLOW_BASELINE) {
  console.log('  FAIL  more templates overflow their class box than before — a template has '
    + 'drifted further from the box a page pastes it into.');
  failed = 1;
} else if (over.length < OVERFLOW_BASELINE) {
  console.log(`  note  down ${OVERFLOW_BASELINE - over.length} — lower OVERFLOW_BASELINE to ${over.length} to lock it in`);
}
process.exit(failed);
