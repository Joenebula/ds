#!/usr/bin/env node
// The third way content cannot be read: text printed ON TOP of other text.
//
//   node scripts/check-text-overlap.mjs <built>.html ...
//
// `verify-layout.mjs` names two ways an element cannot properly be seen — CLIPPED, where an
// ancestor hides the overflow and there is no way to scroll to it, and ESCAPED, where nothing
// hides it so it spills out of the box it belongs to. There is a third, and nothing asked it:
// two things both sitting correctly inside their own boxes, overlapping each other.
//
// Found by looking at a re-shot dark screenshot of `timesheet-approvals`: the side panel's
// working-time warning runs straight underneath the "Daily hours" heading and the "Adjust"
// button. Every check on the screen was green. It is the same shape as everything else this
// project keeps finding — a fault that is obvious to a reader and invisible to a measurement
// that only ever looks at one element at a time.
//
// THE TEST IS GLYPHS AGAINST GLYPHS, NOT BOX AGAINST BOX. Boxes overlap all the time and
// legitimately: a card sits inside a panel, a button inside a toolbar, a badge deliberately
// laps its parent's corner. Two runs of actual text on the same pixels almost never are. The
// rect comes from a Range over the element's OWN direct text nodes, so a parent is never
// compared against the child whose text it contains.
//
// Out-of-flow elements are excluded for the reason verify-layout excludes them: a dropdown, a
// tooltip and a notification badge are all supposed to leave their parent, and a menu open over
// the page is text over text on purpose.
//
// ONE WIDTH, AND THE REASON IS NAMED. Every screen here is drawn for a desktop and pins its
// components to Desktop, which CLAUDE.md records as deliberate — unpinning is page-layout work
// nobody has done. At 390px those pages squeeze and overlap in ways that are the pinning rather
// than the layout, so measuring there would report the known thing loudly and bury this one.
// When a screen is built to be responsive, this should be run at its breakpoints too.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

// Overlaps outstanding on the hand-built fixtures in `prototypes/`. It may fall; it may not
// rise. `working/` — the pages built FROM a Figma design, which is the direction this repo
// exists to get right — must be at zero, and is.
const BASELINE = 8;
const WIDTH = 1440;

// THE TEMPLATE GALLERY IS CHECKED TOO, and it is the one that matters most: `docs/templates.html`
// renders the markup this project tells people to PASTE, so text printed over text there is
// shipped rather than merely displayed. It had **seven** pairs, and the cause was the same
// mistake the docs gallery had — a placeholder label invented for a component Figma gives no
// type. `<div class="pf-circle-icons" data-size="M - 44px">Circle icons</div>` renders those
// words out of a 44px circle and across the heading beside it, in five templates.
//
// The generator already had the thought and had written it as a SIZE THRESHOLD — no label below
// 44px, "Figma's own smallest control size" — and `Circle icons` is exactly 44, so it kept its
// label. A threshold standing in for a reading, one more time. It reads the geometry's `font`
// column now, the same way the docs gallery does; **18 labels across 14 templates** were inside
// a type-less component, and fixing it took the seven pairs to three.
//
// The three that remain are pinned rather than fixed: one is `Donut pie chart`'s 60px centre
// number, and the charts are being reworked by the design owner, so this does not touch them.
const DOCS = ['docs/templates.html', 'docs/components.html'];
const DOCS_BASELINE = 3;
const files = process.argv.slice(2).filter(f => f.endsWith('.html') && !f.endsWith('.src.html'));
if (!files.length) { console.error('usage: node scripts/check-text-overlap.mjs <built>.html ...'); process.exit(2); }

// ONE PROBE, USED ON BOTH. Two copies of this arithmetic would be the same question with a
// second chance to drift — the reason `hugs.mjs` is shared by its generator and its checker.
const overlapScript = () => {
  const runs = [];
  for (const e of document.querySelectorAll('body *')) {
    const s = getComputedStyle(e);
    if (s.position === 'absolute' || s.position === 'fixed') continue;
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    for (const n of e.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const box = range.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      runs.push({ el: e, box, text: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) });
    }
  }
  const out = [];
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const a = runs[i], b = runs[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
    const h = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
    if (w <= 1 || h <= 1) continue;
    out.push({ a: a.text, b: b.text, area: Math.round(w * h) });
  }
  return { pairs: out.sort((x, y) => y.area - x.area), runs: runs.length };
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let total = 0, runsSeen = 0;
const problems = [], byFile = [];
for (const file of files) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1080 } });
  await page.goto('file://' + resolve(file));
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(overlapScript);
  await page.close();
  runsSeen += r.runs;
  total += r.pairs.length;
  byFile.push({ file, n: r.pairs.length, top: r.pairs.slice(0, 3) });
  // The pages built FROM a design are held at zero. The fixtures carry a baseline.
  if (r.pairs.length && file.includes('working/')) {
    for (const p of r.pairs) {
      problems.push(`${file} — "${p.a}" is printed over "${p.b}" (${p.area}px² of overlap)`);
    }
  }
}

// The docs pages, on their own baseline: they are generated documentation rather than a screen
// built from a design, and one of the three left is a chart that is being reworked.
let docsTotal = 0;
const docsBy = [];
for (const file of DOCS) {
  if (!existsSync(file)) continue;
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1080 } });
  await page.goto('file://' + resolve(file));
  await page.evaluate(() => document.fonts.ready);
  const { pairs } = await page.evaluate(overlapScript);
  await page.close();
  docsTotal += pairs.length;
  docsBy.push({ file, n: pairs.length, top: pairs.slice(0, 3) });
}
await browser.close();

console.log(`${runsSeen} run(s) of text across ${files.length} screen(s) at ${WIDTH}px, `
  + `${total} pair(s) printed on top of one another (baseline ${BASELINE})`);
for (const f of byFile) {
  if (!f.n) continue;
  console.log(`  ${basename(f.file)}: ${f.n}`);
  for (const p of f.top) console.log(`    ${p.area}px²  "${p.a}"  over  "${p.b}"`);
}
if (!runsSeen) {
  console.error('  this check proved nothing: it found no text at all to compare');
  process.exit(1);
}
if (total > BASELINE) {
  problems.push(`${total} overlapping pairs, up from ${BASELINE} — text has been printed over `
    + `text on a screen that did not do it before`);
}
console.log(`${docsTotal} pair(s) on ${DOCS.join(' and ')} (baseline ${DOCS_BASELINE})`);
for (const d of docsBy) {
  if (!d.n) continue;
  console.log(`  ${basename(d.file)}: ${d.n}`);
  for (const p of d.top) console.log(`    ${p.area}px²  "${p.a}"  over  "${p.b}"`);
}
if (docsTotal > DOCS_BASELINE) {
  problems.push(`${docsTotal} overlapping pairs on the docs pages, up from ${DOCS_BASELINE} — a `
    + `template that prints text over text ships that overlap to whoever pastes it`);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
