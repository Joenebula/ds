#!/usr/bin/env node
// Is this screen the SIZE Figma draws it?
//
//   node scripts/verify-frame.mjs prototypes/case-first-stage.html
//   node scripts/verify-frame.mjs --self-test
//
// WHY THIS EXISTS. The user said "not an exact copy" four times. Each time the answer was a
// *declared divergence* in the extract file, and each time that declaration was treated as the
// fix. Measured against the Figma frame, the divergences had accumulated:
//
//     panel        516x570   vs Figma 516x472    98px taller
//     header card  516x205   vs Figma 476x170    35px taller, 40px wider
//     stage card   516x93    vs Figma 476x74     19px taller
//
// A declaration says what a number is. It does not say the number is right, and nothing
// measured whether the screen was the size of the thing it copies.
//
// WHY THE CARDS ARE LOCAL CSS NOW. CLAUDE.md bars hand-writing card CSS, so `.pf-card` was
// used for all of these. But the header and subject card are plain Figma FRAMES, not component
// instances — page layout, which local CSS is for — and the stage card is `Clickable card`,
// from a non-People-First library (F-018). None of them is the People First `Card`, so
// `.pf-card` was itself the unchecked approximation. The rule exists because hand-written
// components are UNCHECKED; this file is what removes that objection.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

// Sub-pixel layout moves an edge by well under 1px. Anything larger is a real difference.
const TOLERANCE = 1;

const px = (v) => Math.round(parseFloat(v) || 0);
// Chromium collapses `padding: 14px 12px 14px 12px` to `14px 12px`. Compare 4-tuples so the
// shorthand a human wrote and the shorthand the browser reports cannot disagree spuriously.
export function pad4(s) {
  const p = String(s).trim().split(/\s+/).map(px);
  if (p.length === 1) return [p[0], p[0], p[0], p[0]];
  if (p.length === 2) return [p[0], p[1], p[0], p[1]];
  if (p.length === 3) return [p[0], p[1], p[2], p[1]];
  return p.slice(0, 4);
}

// ---------------------------------------------------------------------------
export async function measure(browser, url, decls) {
  const ctx = await browser.newContext({ colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  const got = await page.evaluate((sels) => sels.map((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel,
      width: b.width, height: b.height,
      padding: cs.padding, radius: cs.borderTopLeftRadius,
      gap: cs.rowGap === 'normal' ? '0px' : cs.rowGap,
      colGap: cs.columnGap === 'normal' ? '0px' : cs.columnGap };
  }), decls.map((d) => d.selector));

  await ctx.close();
  return got;
}

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function judge(decls, got) {
  const problems = [];
  let checked = 0, asserts = 0;

  for (const d of decls) {
    const g = got.find((x) => x.sel === d.selector);
    if (!g || g.missing) {
      // A declared selector that is not on the page is not a pass — the screen no longer
      // contains the thing the extract describes.
      problems.push(`MISSING  ${d.selector} (${d.name || 'declared in the extract'}) is not on this page`);
      continue;
    }
    checked++;

    const cmp = (label, want, have, unit = 'px') => {
      asserts++;
      if (Math.abs(want - have) > TOLERANCE) {
        problems.push(`SIZE     ${d.selector} ${label} is ${Math.round(have)}${unit}, `
          + `Figma says ${want}${unit}${d.name ? `  (${d.name})` : ''}`);
      }
    };

    if (d.width != null) cmp('width', d.width, g.width);
    if (d.height != null) cmp('height', d.height, g.height);
    if (d.radius != null) cmp('radius', d.radius, px(g.radius));
    if (d.gap != null) cmp('gap', d.gap, px(g.gap));
    if (d.columnGap != null) cmp('column gap', d.columnGap, px(g.colGap));
    if (d.padding != null) {
      asserts++;
      const want = pad4(d.padding), have = pad4(g.padding);
      if (want.some((v, i) => Math.abs(v - have[i]) > TOLERANCE)) {
        problems.push(`SIZE     ${d.selector} padding is ${have.join(' ')}px, `
          + `Figma says ${want.join(' ')}px${d.name ? `  (${d.name})` : ''}`);
      }
    }
  }

  return { problems, checked, asserts };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: verify-frame.mjs <built-screen.html> | --self-test'); process.exit(2); }
  if (!existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }

  const extractPath = file.replace(/\.html$/, '.figma.json');
  if (!existsSync(extractPath)) {
    console.log(`no ${extractPath} — this screen has no saved Figma extract`);
    console.log('nothing to compare against — frame NOT MEASURED');
    process.exit(2);
  }
  const design = JSON.parse(readFileSync(extractPath, 'utf8'));
  const decls = (design.frame || []).filter((d) => d && d.selector);
  if (!decls.length) {
    // A screen copying a Figma frame and declaring none of its geometry cannot be checked on
    // this axis. Vacuous, per F-019 — never a pass.
    console.log('the extract declares no `frame` geometry');
    console.log('nothing measured — frame NOT MEASURED');
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const got = await measure(browser, file.startsWith('http') ? file : 'file://' + resolve(file), decls);
  await browser.close();

  const r = judge(decls, got);
  for (const p of r.problems) console.log(p);

  console.log(`\n${r.asserts} geometry assertion(s) across ${r.checked} element(s) match the `
    + `Figma frame, ${r.problems.length} off`);
  process.exit(r.problems.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --self-test. The fixtures are the real drift: a card 19px taller than Figma, a radius that
// came from the design system instead of the design, and 20px padding where Figma says 14/12.
function selfTest() {
  const decl = { selector: '.stage', name: 'Clickable card', height: 74, padding: '14px 12px', radius: 10, gap: 12 };
  const ok = { sel: '.stage', width: 476, height: 74, padding: '14px 12px', radius: '10px', gap: '12px', colGap: '12px' };
  const with_ = (over) => [{ ...ok, ...over }];

  const cases = [
    ['a card built to Figma passes', [decl], with_({}), null],
    ['a card 19px too tall', [decl], with_({ height: 93 }), /height is 93px, Figma says 74px/],
    ['the design system radius instead of the design', [decl], with_({ radius: '8px' }), /radius is 8px, Figma says 10px/],
    ['20px padding where Figma says 14 and 12', [decl], with_({ padding: '20px' }), /padding is 20 20 20 20px/],
    ['a wrong gap', [decl], with_({ gap: '20px' }), /gap is 20px, Figma says 12px/],
    ['a declared element missing from the page', [decl], [{ sel: '.stage', missing: true }], /MISSING/],
    ['sub-pixel drift is not a defect', [decl], with_({ height: 74.4 }), null],
    ['shorthand and longhand padding agree', [decl], with_({ padding: '14px 12px 14px 12px' }), null],
  ];

  let failures = 0;
  for (const [name, d, g, want] of cases) {
    const { problems } = judge(d, g);
    const hit = want ? problems.some((p) => want.test(p)) : problems.length === 0;
    if (!hit) {
      failures++;
      console.log(`  MISS ${name}`);
      for (const p of problems) console.log(`         ${p}`);
      if (want) console.log(`         expected a problem matching ${want}`);
    }
  }

  // A declaration that asserts nothing must not read as a pass with work done.
  const empty = judge([{ selector: '.stage', name: 'nothing declared' }], with_({}));
  if (empty.asserts !== 0) {
    failures++;
    console.log('  MISS a declaration with no values must make no assertions');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a card too tall, a design-system radius in '
    + "place of the design's, the wrong padding and gap, and a declared element missing from "
    + 'the page, while allowing sub-pixel drift and equivalent padding shorthands');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  await main();
}
