#!/usr/bin/env node
// Do things that should line up actually line up?
//
//   node scripts/verify-layout.mjs prototypes/case-summary.html
//   node scripts/verify-layout.mjs --self-test
//
// WHY THIS EXISTS. Swapping one class into the Case summary screen pushed the avatar-and-name
// row to the middle of its card, away from the label above it. All six existing checks stayed
// green. Geometry measures a component's height, radius and font size. Colour compares pixels
// against Figma. Icons compares glyph paths. Fonts reads the rendered face. Content reads the
// words. Tokens resolves the palette. **Not one of them measures where anything SITS.**
//
// WHY IT COMPARES INK, NOT BOXES. The class that broke it was `justify-content: center` on a
// row that STRETCHED to full width. Its box stayed perfectly aligned; only the avatar and name
// inside it moved. A check comparing element rectangles would have passed, so this compares
// the leftmost visible leaf in each row — the first thing your eye actually lands on.
//
// WHY CENTRING MUST BE DECLARED. Some rows centre on purpose: the "Add new stage" card does.
// The broken one also computed `justify-content: center`, so intent cannot be read off the
// CSS — the accident and the decision look identical from outside. So a deliberately centred
// element carries `data-align="center"` and anything else that centres is a failure. Same
// principle as the `placeholders` map in verify-content.mjs, for the same reason: you cannot
// infer intent, you can only declare it.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { viewportFor } from './lib/screen-viewport.mjs';

const TOLERANCE = 1.5;   // px. Sub-pixel layout and font hinting move an edge by well under 1.

// ---------------------------------------------------------------------------
// Measure: every column container that intends to left-align, and where its rows' ink starts.
export async function measure(browser, url, viewport) {
  // Alignment is a question about where things sit, so it has to be asked in a window the
  // screen actually fits in — see scripts/lib/screen-viewport.mjs.
  const ctx = await browser.newContext({ colorScheme: 'light', viewport });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  const groups = await page.evaluate(() => {
    const vis = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'absolute') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    // The leftmost ink INSIDE a row, measured against that row's own content box.
    //
    // The subtlety that took two attempts: a card, a button and a padded panel all inset
    // their contents on purpose, and comparing raw ink across siblings reports every one of
    // them as broken. So the walk stops at any descendant that declares its own padding or
    // border and takes that element's outer edge instead — its contents are inset by its own
    // design, and if IT centres them, it gets judged as a row in its own right.
    const inkLeft = (root) => {
      const walk = (el, isRoot) => {
        if (!vis(el)) return null;
        const cs = getComputedStyle(el);
        if (!isRoot) {
          const inset = parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
          if (inset > 0) return { left: el.getBoundingClientRect().left, what: label(el) };
          // Decorative art is measured by its own box, never by what is inside it. A 24px
          // marker centring a 14px tick is an icon slot doing its job, not a row centring
          // its contents. The distinction still catches the real bug, because there the
          // decorative element's own BOX is the thing that moved.
          if (el.getAttribute('aria-hidden') === 'true') {
            return { left: el.getBoundingClientRect().left, what: label(el) };
          }
        }
        const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        // A PICTURE IS INK, WHETHER OR NOT IT HAS ARRIVED. An <img> was recognised; an element
        // painting a background-image was not, so a hero drawn as a background was invisible
        // here and the walk reported the next thing along — on the Pathway screen the masthead
        // 390px to its right, which read as "this row is centring its contents". The row was
        // fine; the check could not see the leftmost thing in it.
        //
        // And it must count the SLOT, not only the paint. A declared picture whose file has
        // not arrived still occupies its space and is still the leftmost thing in the row, so
        // `data-image` and role="img" are ink too. Whether the picture actually paints is
        // verify-images.mjs's question, and answering it twice — once as a phantom alignment
        // defect — would make the real report harder to read, not easier.
        const painted = getComputedStyle(el).backgroundImage !== 'none';
        const pictureSlot = el.hasAttribute('data-image') || el.getAttribute('role') === 'img';
        if (ownText || painted || pictureSlot || /^(img|svg|canvas)$/.test(el.tagName.toLowerCase())) {
          return { left: el.getBoundingClientRect().left, what: label(el) };
        }
        let best = null;
        for (const k of el.children) {
          const c = walk(k, false);
          if (c && (best === null || c.left < best.left)) best = c;
        }
        return best;
      };
      return walk(root, true);
    };
    const label = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 22)
      || `<${el.tagName.toLowerCase()}>`;
    const contentLeft = (el) => {
      const cs = getComputedStyle(el);
      return el.getBoundingClientRect().left
        + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    };

    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (!/flex|grid/.test(cs.display)) continue;
      if (cs.flexDirection !== 'column') continue;
      // Only containers that INTEND a shared left edge. A column that centres or right-aligns
      // its children is not making that promise and is not this check's business.
      if (!/^(stretch|flex-start|start|normal)$/.test(cs.alignItems)) continue;
      const kids = [...el.children].filter(vis);
      if (kids.length < 2) continue;

      const rows = [];
      for (const k of kids) {
        const kcs = getComputedStyle(k);
        const declared = k.closest('[data-align]')?.getAttribute('data-align') || '';
        const ink = inkLeft(k);
        if (!ink) continue;
        // Does this row carry anything a reader actually reads? An icon-only button holds
        // one centred glyph and nothing to align it WITH, so its inset is the button's own
        // business. A row with a name in it is a different matter — and note the regression
        // is still caught, because that row's leftmost ink was the avatar but the row also
        // held "Tomasz Kowalczyk".
        const readable = [...k.querySelectorAll('*')].concat([k]).some((d) =>
          !d.closest('[aria-hidden="true"]') && vis(d)
          && [...d.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
        rows.push({ what: ink.what, readable, ink: Number(ink.left.toFixed(2)),
          content: Number(contentLeft(k).toFixed(2)),
          box: Number(k.getBoundingClientRect().left.toFixed(2)),
          declared, alignSelf: kcs.alignSelf });
      }
      if (rows.length < 2) continue;
      out.push({ container: el.className || `<${el.tagName.toLowerCase()}>`, rows });
    }
    return out;
  });

  await ctx.close();
  return { groups };
}

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function judge({ groups }) {
  const problems = [];
  let checked = 0, declaredRows = 0, rows = 0;

  for (const g of groups) {
    // A row may opt out by declaring its alignment, or by setting align-self away from the
    // container's intent. Both are decisions someone wrote down.
    const active = g.rows.filter((r) => {
      if (r.declared === 'center' || r.declared === 'right') { declaredRows++; return false; }
      if (/^(center|flex-end|end)$/.test(r.alignSelf || '')) { declaredRows++; return false; }
      return true;
    });
    if (active.length < 2) continue;
    checked++;
    rows += active.length;

    // ---- A. the rows themselves share a left edge -----------------------------
    // Compares BOXES, so a card that insets its contents by its own padding is not a
    // finding — that is what padding is for. This catches a stray margin or indent.
    const base = active[0];
    for (const r of active.slice(1)) {
      const drift = Math.abs(r.box - base.box);
      if (drift > TOLERANCE) {
        problems.push(`ALIGN    in .${g.container}: "${r.what}" sits at ${r.box} but `
          + `"${base.what}" sits at ${base.box} (${drift.toFixed(1)}px adrift)`);
      }
    }

    // ---- B. each row's contents start where its own box says ------------------
    // THE REGRESSION. A row that stretches to full width and then centres its contents has
    // a perfectly aligned box, so check A passes and the screen still looks wrong. This
    // measures the row against ITSELF: ink should begin at the row's content-box edge.
    for (const r of active) {
      if (r.readable === false) continue;      // nothing in this row to align against
      const inset = r.ink - r.content;
      if (inset > TOLERANCE) {
        problems.push(`INSET    in .${g.container}: "${r.what}" starts ${inset.toFixed(1)}px `
          + `inside its own row, which declares no padding there — the row is centring its `
          + `contents. If that is deliberate, say so with data-align="center".`);
      }
    }
  }

  return { problems, checked, declared: declaredRows, rows };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: verify-layout.mjs <built-screen.html> | --self-test'); process.exit(2); }
  if (!file.startsWith('http') && !existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const m = await measure(browser, file.startsWith('http') ? file : 'file://' + resolve(file),
  viewportFor(file));
  await browser.close();

  const r = judge(m);
  for (const p of r.problems) console.log(p);

  if (!r.checked) {
    // No left-aligning column with two rows in it. Nothing was compared, so this is not a
    // pass — the F-019 rule, which this repo now applies everywhere.
    console.log(`${m.groups.length} column container(s) found, none with two rows to compare`);
    console.log('nothing measured — layout NOT MEASURED');
    process.exit(2);
  }

  console.log(`\n${r.checked} left-aligned group(s) checked across ${r.rows} row(s), `
    + `${r.problems.length} adrift`
    + (r.declared ? `, ${r.declared} row(s) declaring their own alignment` : ''));
  process.exit(r.problems.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --self-test. The first fixture IS the regression: a row whose box lines up perfectly while
// its contents sit in the middle of the card.
function selfTest() {
  // ink === content means "this row's contents start at its own edge", which is the
  // healthy case whatever padding the row itself carries.
  const row = (what, box, content, ink, extra = {}) =>
    ({ what, box, content, ink, readable: true, declared: '', alignSelf: 'stretch', ...extra });

  const cases = [
    ['a left-aligned group passes',
      { groups: [{ container: 'field', rows: [row('Case subject', 422, 422, 422), row('AB', 422, 422, 422)] }] }, null],

    ['THE REGRESSION — box aligned, contents centred',
      { groups: [{ container: 'field', rows: [row('Case subject', 422, 422, 422), row('AB', 422, 422, 560)] }] }, /INSET/],

    ['a row with a stray indent',
      { groups: [{ container: 'stages', rows: [row('Stages', 124, 124, 124), row('Case raised', 168, 168, 168)] }] }, /ALIGN/],

    ['a padded card insetting its own contents is NOT a finding',
      { groups: [{ container: 'panel', rows: [row('Stages', 124, 124, 124), row('Case summary', 124, 144, 144)] }] }, null],

    ['sub-pixel drift is not a defect',
      { groups: [{ container: 'field', rows: [row('Case subject', 422, 422, 422), row('AB', 422, 422, 422.9)] }] }, null],

    ['centring DECLARED on the row is allowed',
      { groups: [{ container: 'stages', rows: [row('Stages', 124, 124, 124),
        row('Add new stage', 124, 145, 500, { declared: 'center' })] }] }, null],

    ['align-self away from the container is allowed',
      { groups: [{ container: 'stages', rows: [row('Stages', 124, 124, 124),
        row('Add new stage', 124, 145, 500, { alignSelf: 'center' })] }] }, null],

    ['a group left with one comparable row is not judged',
      { groups: [{ container: 'field', rows: [row('Case subject', 422, 422, 422),
        row('AB', 422, 422, 560, { declared: 'center' })] }] }, null],

    ['an icon-only row with no readable text is not judged on inset',
      { groups: [{ container: 'cell', rows: [row('Icon only', 124, 124, 124),
        row('<svg>', 124, 124, 132, { readable: false })] }] }, null],

    ['ink LEFT of its own content box is not a finding (negative margins are legal)',
      { groups: [{ container: 'field', rows: [row('Case subject', 422, 422, 422), row('AB', 422, 422, 410)] }] }, null],
  ];

  let failures = 0;
  for (const [name, fixture, want] of cases) {
    const { problems } = judge(fixture);
    const hit = want ? problems.some((p) => want.test(p)) : problems.length === 0;
    if (!hit) {
      failures++;
      console.log(`  MISS ${name}`);
      for (const p of problems) console.log(`         ${p}`);
      if (want) console.log(`         expected a problem matching ${want}`);
    }
  }

  // Declaring every row away must leave NOTHING checked, so main() reports it vacuous
  // rather than as a clean pass — a page cannot buy a green by declaring its way out.
  const dodged = judge({ groups: [{ container: 'field', rows: [
    row('Case subject', 422, 422, 422, { declared: 'center' }),
    row('AB', 422, 422, 560, { declared: 'center' })] }] });
  if (dodged.checked !== 0) {
    failures++;
    console.log('  MISS a group whose every row is declared must count as nothing checked');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a row whose box lines up while its contents '
    + 'centre, and a row with a stray indent, while leaving a padded card, sub-pixel drift, '
    + 'declared centring and align-self alone, and counting a fully-declared group as nothing '
    + 'measured');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  await main();
}
