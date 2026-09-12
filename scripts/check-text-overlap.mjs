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
//
// IT IS NOW ZERO EVERYWHERE, and both of the two it used to carry turned out to be the rect
// rather than the page — a wrapped inline run's union rect swallowing its sibling on
// `payroll-run-summary`, and an ellipsis on `timesheet-approvals` whose text range measures
// past the box that truncates it. Both are written up at the probe. That makes THREE times
// this check has been found reporting a rectangle where there are no glyphs, so the honest
// reading of a zero here is that it now measures what it always claimed to: glyphs.
const BASELINE = 0;
// A COUNT OF ZERO IS ALSO WHAT A CHECK THAT LOOKED AT NOTHING REPORTS, and with the fixtures
// at zero that is no longer a hypothetical — this half of the check has no positive finding
// left to prove it ran. The docs half has carried a minimum for exactly this reason; the
// screens half needs one too. It finds 792.
const MIN_RUNS = 400;
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
const DOCS_BASELINE = 0;
// Clipping cuts the docs pages to zero, which is the right answer and also the one state in
// which this half of the check could pass while measuring nothing. It asserts it looked.
const DOCS_MIN_RUNS = 500;
const files = process.argv.slice(2).filter(f => f.endsWith('.html') && !f.endsWith('.src.html'));
if (!files.length) { console.error('usage: node scripts/check-text-overlap.mjs <built>.html ...'); process.exit(2); }

// ONE PROBE, USED ON BOTH. Two copies of this arithmetic would be the same question with a
// second chance to drift — the reason `hugs.mjs` is shared by its generator and its checker.
const overlapScript = () => {
  // A CLIPPED RUN IS NOT ON THE PAGE, and a rect does not know that. `getBoundingClientRect`
  // reports where a box WOULD be, so a child scrolled out of an `overflow: auto` ancestor still
  // has full coordinates — the same property CLAUDE.md names in the clipping section: "a
  // clipped child still has a bounding rect". Without this, the first version of this check
  // reported three overlaps on `docs/templates.html` between a template's contents and the
  // code listing below it, and every one of them was invisible: the `.stage` was scrolling
  // them, not spilling them. Measured: all three escaping elements are `position: static`,
  // which is impossible for a real spill out of a scroll container and is what gave it away.
  //
  // So each run is intersected with every clipping ancestor before it is compared, and a run
  // with nothing left is dropped.
  //
  // AND THE ELEMENT'S OWN OVERFLOW COUNTS. This walk started at the PARENT, so an element that
  // clips its own text was not clipping it here: `timesheet-approvals` truncates the employee
  // sub-line with `overflow: hidden; text-overflow: ellipsis`, and the span renders
  // "Warehouse Operative ·…" inside 340..488 while its text range still measures out to 522 —
  // four pixels into the date column beside it, reported as 40px² of text over text that
  // nobody can see. A rect says where the glyphs WOULD be; an ellipsis is the element saying
  // they are not there. Same lesson as the ancestors, one level nearer.
  const clipOf = el => {
    let r = { top: -1e9, left: -1e9, right: 1e9, bottom: 1e9 };
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflow === 'visible' && s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const b = n.getBoundingClientRect();
      r = { top: Math.max(r.top, b.top), left: Math.max(r.left, b.left),
            right: Math.min(r.right, b.right), bottom: Math.min(r.bottom, b.bottom) };
    }
    return r;
  };
  const runs = [];
  for (const e of document.querySelectorAll('body *')) {
    const s = getComputedStyle(e);
    if (s.position === 'absolute' || s.position === 'fixed') continue;
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    for (const n of e.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      // A WRAPPED RUN'S BOUNDING RECT IS A UNION, AND THE GAP IN IT BELONGS TO SOMEBODY ELSE.
      //
      // Same family as the clipped rect above, and found the same way — by looking at what the
      // check reported. `payroll-run-summary`'s table footer holds two inline spans; the first
      // takes 349px of line one, the second starts after it and wraps, so its union rect spans
      // BOTH lines from the left edge and swallows the first span whole. Reported as 6281px² of
      // text over text, and the two runs do not share a single pixel: the second simply is not
      // in the part of its own rectangle that overlaps.
      //
      // `getClientRects()` returns one rect PER LINE BOX, which is where the glyphs actually
      // are, so a wrapped run is compared line by line. That is the measurement this check was
      // always claiming to make — "the test is glyphs against glyphs" — and a union rect is not
      // glyphs. (The footer still reads as one running sentence, which is a real layout fault
      // and is fixed in the page; it was never text printed over text.)
      const range = document.createRange();
      range.selectNodeContents(n);
      const c = clipOf(e);
      const text = n.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
      for (const raw of range.getClientRects()) {
        if (raw.width < 2 || raw.height < 2) continue;
        const box = { top: Math.max(raw.top, c.top), left: Math.max(raw.left, c.left),
                      right: Math.min(raw.right, c.right), bottom: Math.min(raw.bottom, c.bottom) };
        if (box.right - box.left < 2 || box.bottom - box.top < 2) continue;  // scrolled out of view
        runs.push({ el: e, box, text });
      }
    }
  }
  const merged = new Map(), seen = new Map();
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const a = runs[i], b = runs[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
    const h = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
    if (w <= 1 || h <= 1) continue;
    // ONE PAIR PER PAIR OF ELEMENTS. A wrapped run contributes a line box each, so the same two
    // elements can collide on several lines; counting those separately would inflate the pinned
    // number for a reason that is not more overlap. The areas are summed instead.
    const key = seen.get(a.el) ?? seen.set(a.el, seen.size).get(a.el);
    const k2 = seen.get(b.el) ?? seen.set(b.el, seen.size).get(b.el);
    const id = `${key}:${k2}`;
    const prev = merged.get(id);
    if (prev) prev.area += Math.round(w * h);
    else merged.set(id, { a: a.text, b: b.text, area: Math.round(w * h) });
  }
  const out2 = [...merged.values()];
  return { pairs: out2.sort((x, y) => y.area - x.area), runs: runs.length };
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
let docsTotal = 0, docsRuns = 0;
const docsBy = [];
for (const file of DOCS) {
  if (!existsSync(file)) continue;
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1080 } });
  await page.goto('file://' + resolve(file));
  await page.evaluate(() => document.fonts.ready);
  const { pairs, runs } = await page.evaluate(overlapScript);
  await page.close();
  docsTotal += pairs.length;
  docsRuns += runs;
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
if (runsSeen < MIN_RUNS) {
  console.error(`  this check proved nothing: ${runsSeen} run(s) of text against ${MIN_RUNS} `
    + 'expected — with the screens at zero, the count alone cannot tell a clean page from an '
    + 'unloaded one');
  process.exit(1);
}
if (total > BASELINE) {
  problems.push(`${total} overlapping pairs, up from ${BASELINE} — text has been printed over `
    + `text on a screen that did not do it before`);
}
console.log(`${docsTotal} pair(s) on ${DOCS.join(' and ')} (baseline ${DOCS_BASELINE}), from `
  + `${docsRuns} run(s) of text`);
if (docsRuns < DOCS_MIN_RUNS) {
  problems.push(`only ${docsRuns} run(s) of text were found on the docs pages, below the `
    + `${DOCS_MIN_RUNS} expected — this half of the check measured almost nothing`);
}
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
