#!/usr/bin/env node
// Is anything drawn ON TOP of anything else?
//
//   node scripts/check-overlap.mjs                 # every built screen
//   node scripts/check-overlap.mjs --self-test
//
// WHY THIS EXISTS. The suite had two questions about layout and neither is this one.
// `verify-clipped` asks whether anything is cut off or escaping its container;
// `verify-layout` asks whether things that should line up do. Two elements can sit fully
// inside their containers, aligned to everything they are supposed to align to, and be
// painted one on top of the other — and nothing asked.
//
// It was found the hard way. Looking at a screenshot I reported a paragraph colliding with
// a tab row, wrote it into three files, and it was false: the picture was displayed at 0.7x
// and a downscale closes gaps until things look welded. There was no mechanism to settle
// it, so settling it took a throwaway probe. The probe is this file now, because the next
// person to squint at a screenshot should get a number instead of an opinion.
//
// And it immediately found a real one that thirteen axes call clean:
// `prototypes/absence-requests` paints a checkbox label 10px INTO the textarea above it —
// both `position: static`, both in normal flow, so this is a collision rather than an
// overlay.
//
// WHAT COUNTS, and every exclusion is here because including it is a false positive:
//
//   - LEAF text only. A parent's box contains its children's by definition, so comparing
//     them reports the document tree rather than a bug. Ancestor/descendant pairs are
//     skipped for the same reason.
//   - Anything inside a POSITIONED subtree is excluded — `absolute`, `fixed` or `sticky`,
//     on the element OR on any ancestor. Deliberate stacking is what those properties are
//     for: a badge on an avatar, a menu over a page, and a sticky side panel that is
//     SUPPOSED to slide over the content beside it.
//
//     Checking only the element's own position is not enough, and this check nearly
//     shipped with the weaker test and two false positives baked into its baseline. A
//     child of an overlay is itself `static` — `prototypes/payroll-run-summary` reports
//     `Raise query` and `£1,968.91` colliding with the table, and both are static text
//     inside `aside.sidepanel`, which is sticky. A baseline containing false positives is
//     the number people learn to read past, so the walk goes up to `body`.
//   - Invisible elements are excluded: `display:none`, `visibility:hidden`, zero opacity.
//   - More than 2px on BOTH axes. Sub-pixel rounding routinely makes adjacent boxes share
//     a fractional edge, and a 0.5px kiss is not a collision.
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { viewportFor } from './lib/screen-viewport.mjs';

// Overlaps present when this was written. It may fall freely — that is a page getting
// better. It may not rise: up means something new is painting over something else.
// working/ is at ZERO and that is the number that matters, because working/ holds the
// pages built FROM a Figma design. The seven are all on prototypes/, which CLAUDE.md is
// explicit are rough hand-built fixtures allowed to be wrong — pinned so they cannot get
// worse rather than fixed, since rebuilding them is not this check's business.
//
// It was 7 before the positioned-subtree walk landed. FIVE of those seven were the sticky
// side panel doing its job — 71% of the first baseline was noise, in a check written to
// stop people reading past noisy numbers.
const OVERLAP_BASELINE = 2;

// The measurement, as a string so it can run in the page and in the self-test unchanged.
export const FIND_OVERLAPS = `(() => {
  const leaves = [...document.querySelectorAll('body *')].filter((el) => {
    const t = el.textContent && el.textContent.trim();
    if (!t) return false;
    if ([...el.children].some((c) => c.textContent && c.textContent.trim())) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === 'absolute' || p === 'fixed' || p === 'sticky') return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  });
  const out = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const A = leaves[i], B = leaves[j];
    if (A.contains(B) || B.contains(A)) continue;
    const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 2 && oy > 2) out.push({
      x: Math.round(ox), y: Math.round(oy),
      a: A.tagName.toLowerCase() + (A.className ? '.' + String(A.className).split(' ')[0] : ''),
      b: B.tagName.toLowerCase() + (B.className ? '.' + String(B.className).split(' ')[0] : ''),
      at: A.textContent.trim().slice(0, 28), bt: B.textContent.trim().slice(0, 28),
    });
  }
  return { leaves: leaves.length, out };
})()`;

const built = (dir) => existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.html') && !f.endsWith('.src.html')).map((f) => `${dir}/${f}`)
  : [];

async function main() {
  const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const screens = files.length ? files : [...built('working'), ...built('prototypes')].sort();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  let total = 0, measured = 0;
  const lines = [];
  for (const f of screens) {
    const page = await browser.newPage({ viewport: viewportFor(f) });
    await page.goto('file://' + resolve(f));
    const r = await page.evaluate(FIND_OVERLAPS);
    await page.close();
    // No text at all is VACUOUS — nothing could have overlapped. One leaf is a measurement
    // that found no pair, which is a pass. Collapsing the two is how a check that sees
    // nothing reports the same as one that saw everything.
    if (!r.leaves) { lines.push(`  --   ${f} — no text to measure`); continue; }
    measured++; total += r.out.length;
    lines.push(`  ${r.out.length ? 'over' : 'ok  '} ${f} — ${r.leaves} text leaf/leaves, ${r.out.length} overlap(s)`);
    for (const o of r.out) {
      lines.push(`         ${o.x}x${o.y}px  ${o.a} "${o.at}"  OVER  ${o.b} "${o.bt}"`);
    }
  }
  await browser.close();
  for (const l of lines) console.log(l);
  console.log(`${measured} screen(s) measured, ${total} element pair(s) painted over one another `
    + `(baseline ${OVERLAP_BASELINE})`);
  if (total > OVERLAP_BASELINE) {
    console.log('  FAIL  something new is drawn on top of something else.');
    return 1;
  }
  if (total < OVERLAP_BASELINE) {
    console.log(`  note  down ${OVERLAP_BASELINE - total} — lower OVERLAP_BASELINE to ${total} to lock it in`);
  }
  return 0;
}

// ---------------------------------------------------------------------------
async function selfTest() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  let failures = 0;
  const miss = (m) => { failures++; console.log('  MISS ' + m); };
  const run = async (html) => {
    await page.setContent('<style>body{margin:0}</style>' + html);
    return page.evaluate(FIND_OVERLAPS);
  };

  // Two static boxes pulled on top of one another. This is the whole point.
  let r = await run('<div style="height:40px">AAAA</div>'
    + '<div style="height:40px;margin-top:-30px">BBBB</div>');
  if (r.out.length !== 1) miss('two in-flow elements painted over one another must be caught '
    + `(got ${r.out.length})`);
  else if (r.out[0].y < 20) miss('the reported overlap must be the real one, not a rounding edge');

  // Stacked ON PURPOSE. Excluding these is why the check is usable at all.
  r = await run('<div style="position:relative"><div style="height:40px">AAAA</div>'
    + '<div style="position:absolute;top:0;left:0">BBBB</div></div>');
  if (r.out.length) miss('an absolutely positioned overlay is deliberate stacking and must NOT '
    + 'be reported — a badge sits on its avatar by design');

  // The element itself is STATIC; its ancestor is what does the overlaying. This is the real
  // sticky side panel on payroll-run-summary, and checking only the element's own position
  // let two of its labels into the baseline as collisions.
  r = await run('<div style="height:40px">AAAA</div>'
    + '<aside style="position:sticky;top:0;margin-top:-30px"><span>BBBB</span></aside>');
  if (r.out.length) miss('static text inside a STICKY panel is deliberate stacking too — the '
    + "walk has to go up to body, not stop at the element's own position");

  // ...and the same for a static child of an absolute overlay.
  r = await run('<div style="height:40px">AAAA</div>'
    + '<div style="position:absolute;top:0"><span>BBBB</span></div>');
  if (r.out.length) miss('a static child of an absolute overlay must be excluded with its parent');

  // Adjacent, not overlapping. The commonest thing on any page must stay silent.
  r = await run('<div style="height:40px">AAAA</div><div style="height:40px">BBBB</div>');
  if (r.out.length) miss('elements merely touching must not be reported as overlapping');

  // A 1px kiss is sub-pixel rounding, not a collision.
  r = await run('<div style="height:40px">AAAA</div>'
    + '<div style="height:40px;margin-top:-1px">BBBB</div>');
  if (r.out.length) miss('a 1px shared edge is rounding, not an overlap');

  // A parent CONTAINS its children, so the tree must not be reported as a bug.
  r = await run('<div>outer <span>inner</span></div>');
  if (r.out.length) miss('an ancestor and its descendant overlap by definition and must be skipped');

  // Invisible things paint nothing.
  r = await run('<div style="height:40px">AAAA</div>'
    + '<div style="height:40px;margin-top:-30px;visibility:hidden">BBBB</div>');
  if (r.out.length) miss('a hidden element paints nothing and cannot overlap anything');

  // Nothing to measure is VACUOUS, not clean.
  r = await run('<div style="width:50px;height:50px;background:red"></div>');
  if (r.leaves !== 0) miss('a page with no text has no leaves to compare — it is vacuous, and '
    + 'the caller needs to be able to tell that from a clean measurement');

  await browser.close();
  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — two in-flow elements painted over one another are caught, while '
    + 'a deliberate overlay is not — absolute, '
    + 'fixed or STICKY, and on an ancestor as well as on the element itself, which is what five of '
    + "this check's own first seven findings turned out to be; a merely adjacent pair, a 1px "
    + 'rounding kiss, an ancestor/descendant pair and a hidden element are all correctly silent; '
    + 'and a page with no text reports as vacuous rather than clean');
}

if (process.argv.includes('--self-test')) await selfTest();
else process.exit(await main());
