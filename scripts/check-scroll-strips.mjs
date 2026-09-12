// A strip is ONE ROW, it SCROLLS, and it starts at its first item.
//
// Reported from a phone: the filter chips and the nav tabs were showing "Filter chip" and
// "Nav tabs" stacked over two lines. Figma says one line in two places at once — `Nav tabs`
// is a 40px component whose Label TEXT node is 40x22, and the row holding those tabs is a
// SLOT laid out HORIZONTAL. A second line is ~44px and does not fit inside the component at
// all, so a wrap does not merely look wrong: it pushes the label out of its own box.
//
// The narrow harness is the whole point. check-template-overflow renders each template at
// body width, where a strip sized to its contents never overflows — a first version of this
// assertion lived there and could not fail, which is worse than not having it. Here every
// strip is put in a box too small for it ON PURPOSE, so the overflow behaviour is the thing
// under test rather than something that happens to be absent.
//
// Three assertions, and the third is the one that found a real bug:
//   ONE ROW      every item shares a top edge — nothing has wrapped
//   SCROLLS      the container can be scrolled to reach what does not fit
//   REACHABLE    the first item is not left of the scroll origin. A centred flex row that
//                overflows spills equally BOTH ways and the left spill cannot be scrolled
//                to, because scrollLeft is already 0. `Secondary nav` put its first tab 83px
//                out of reach, so the first tab in the strip was permanently invisible —
//                content deleted from view, which is exactly what the clipping decision
//                refuses to do. `justify-content: safe center` is the fix.
import { readFileSync, readdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const NARROW = 320;                 // narrower than every strip in the file, so all of them overflow
const expand = h => h.replace(/<!--pf-icon:([a-z0-9-]+)(?:\s+(\d+))?-->/g, (m, n, s) => {
  const f = `assets/icons/${n}.svg`;
  return existsSync(f)
    ? readFileSync(f, 'utf8').trim().replace(/^<svg /, `<svg width="${s || 18}" height="${s || 18}" `)
    : m;
});

const specs = readdirSync('dist/templates').filter(f => f.endsWith('.html')).sort()
  .map(f => ({ base: f.replace(/\.html$/, ''), html: readFileSync('dist/templates/' + f, 'utf8') }))
  .filter(s => s.html.includes('overflow-x:auto'))
  .map(s => ({ ...s, html: expand(s.html.replace(/^<!--[\s\S]*?-->\n/, '')) }));

if (!specs.length) {
  console.error('no template declares a scrolling strip — this check would prove nothing');
  process.exit(1);
}

// min-width:0 on the wrapper is what lets a flex child actually be squeezed; without it the
// box quietly grows to its contents and nothing overflows, which is how the first version of
// this managed to pass on everything.
writeFileSync('tmp-strips.html',
  ['fonts', 'tokens', 'components', 'type'].map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<style>section{width:${NARROW}px;min-width:0;overflow:visible;margin:0 0 12px}`
  + `section>*{max-width:100%;min-width:0}</style>`
  + `<body style="margin:0">${specs.map((s, i) => `<section id="w${i}">${s.html}</section>`).join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: NARROW + 40, height: 900 } });
await page.goto('file://' + process.cwd() + '/tmp-strips.html');
await page.evaluate(() => document.fonts.ready);

const found = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (getComputedStyle(el).overflowX !== 'auto') continue;
    const kids = [...el.children];
    if (!kids.length) continue;
    const box = el.getBoundingClientRect();
    // A SECOND ROW IS NOT "TWO DIFFERENT TOP EDGES". Counting distinct tops called three
    // strips wrapped that were not: their slot is HORIZONTAL CENTER, so items of different
    // heights are centred against each other and start at different y by design. A real
    // second row is an item that begins at or below where another item ENDS.
    // Zero-area children are excluded, and nothing is compared with itself. `Horizontal
    // scroll`'s `Spacer` renders 0x0 — Figma gives it 60x5 but no fill, so the generator
    // emits no size — and an element whose top EQUALS its own bottom satisfies any
    // "begins below where that one ends" test against itself. It was reported as a wrapped
    // strip on the first run.
    const rects = kids.map(k => k.getBoundingClientRect()).filter(r => r.width && r.height);
    const wrapped = rects.some((a, i) => rects.some((b, j) => i !== j && a.top >= b.bottom - 1));
    // WHAT A SCROLL PORT TAKES OFF THE TOP AND BOTTOM.
    //
    // `overflow-x: auto` cannot be had on its own — the y-axis becomes a scroll port too, and
    // a scroll container also loses its automatic minimum height, so it stops growing to its
    // own contents. `Table action bar`'s strip was squashed from 42px to 32 and its 42px
    // chips, centred, hung 5px above and below: the port ate exactly the top and bottom of
    // every chip's border while the rounded ends survived. Reported from a phone as "the
    // borders are not showing", and no check could see it — the strip was one row, scrollable
    // and started at its first item.
    const clipped = Math.max(0, ...rects.map(r => Math.max(box.top - r.top, r.bottom - box.bottom)));
    out.push({
      id: (el.closest('section') || {}).id || '?',
      clipped: Math.round(clipped),
      wrapped,
      overflows: el.scrollWidth - el.clientWidth,
      firstOffset: Math.round(kids[0].getBoundingClientRect().left - box.left),
      justify: getComputedStyle(el).justifyContent,
      items: kids.length,
    });
  }
  return out;
});
await browser.close();
unlinkSync('tmp-strips.html');

const nameOf = id => {
  const i = Number(String(id).slice(1));
  return Number.isFinite(i) && specs[i] ? specs[i].base : id;
};
const problems = [];
let oneRow = 0, reachable = 0, overflowing = 0, unclipped = 0;
for (const f of found) {
  if (f.clipped > 0) {
    problems.push(`${nameOf(f.id)} — its scroll port cuts ${f.clipped}px off the top or bottom of `
      + `its items, which is where their borders are; the strip is shorter than what it holds`);
  } else unclipped++;
  if (f.wrapped) problems.push(`${nameOf(f.id)} — an item in its strip begins below where another `
    + `ends, so the strip has wrapped onto a second row; a strip is one row`);
  else oneRow++;
  if (f.firstOffset < -1) {
    problems.push(`${nameOf(f.id)} — the first of its ${f.items} items sits ${-f.firstOffset}px left of the `
      + `scroll origin (justify-content: ${f.justify}), so it can never be scrolled to`);
  } else reachable++;
  if (f.overflows > 0) overflowing++;
}

console.log(`${found.length} scrolling strip(s) across ${specs.length} template(s), each squeezed into ${NARROW}px`);
console.log(`  ${oneRow} stay on ONE row — no label or item has wrapped`);
console.log(`  ${reachable} start at their first item, so nothing is out of reach`);
console.log(`  ${unclipped} are at least as tall as what they hold, so the scroll port cuts no borders`);
console.log(`  ${overflowing} actually overflow at this width, which is what makes the test meaningful`);
if (!overflowing) {
  console.error('  this check proved nothing: not one strip overflowed, so nothing was tested');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
