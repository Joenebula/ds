#!/usr/bin/env node
// Does the page actually RENDER in Open Sans?
//
//   node scripts/verify-fonts.mjs prototypes/absence-requests.html
//   node scripts/verify-fonts.mjs --self-test
//
// WHY THIS EXISTS. Every check in this repo read a DECLARATION. verify-type.mjs compares
// dist/type.css against the Figma text-style extract. verify-content.mjs reads
// getComputedStyle().fontWeight — the number the CSS asked for. Both passed, 107 of 107 and
// 15 of 15, on pages rendering entirely in DejaVu Sans, because the font never loaded and
// nothing in the suite looks at the glyphs that came out.
//
// The screenshots were the same lie. CLAUDE.md says to screenshot every screen in light and
// dark and look at it before calling it done. That was being done — at the wrong typeface,
// for months, with four green checks agreeing.
//
// A NOTE ON document.fonts.check(). It returns TRUE for '600 16px "Open Sans"' on a page
// where Open Sans is absent, because it answers "will something render this" rather than "is
// this font here". It is the same vacuous-confidence shape as F-011/F-016/F-019, and it is
// why this check goes to CDP for the platform font instead.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const WANT = /open\s?sans/i;

// The families a page may legitimately render in something other than Open Sans. Monospace is
// used for spec captions in docs/components.html; emoji fall back by design.
const EXEMPT = /mono|emoji/i;

// ---------------------------------------------------------------------------
// Measure one page: what every text run DECLARED, and what actually drew it.
export async function measure(browser, url) {
  const ctx = await browser.newContext({ colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  // Not networkidle — a webfont can still be decoding after the last response.
  await page.evaluate(() => document.fonts.ready);

  // Tag the leaf text runs so CDP can be pointed at exactly them. An ancestor reports its
  // children's fonts as its own and the counts inflate.
  const tagged = await page.evaluate(() => {
    let n = 0, native = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length) continue;
      if (!(el.textContent || '').trim()) continue;
      // A <select> popup is drawn by the OS widget, not by the page, so CDP reports no
      // platform font for its options and the page cannot control the face there anyway.
      // Counted and reported rather than dropped, so the exemption stays visible.
      if (/^(option|optgroup)$/.test(el.tagName.toLowerCase())) { native++; continue; }
      // A <textarea> or <input> draws its value in an inner anonymous box, so CDP asked
      // about the host element reports nothing. The face IS the page's to get right here,
      // so it is measured by proxy rather than waved through: a span carrying the control's
      // own computed font resolves to exactly the same face.
      if (/^(textarea|input)$/.test(el.tagName.toLowerCase())) {
        const cs0 = getComputedStyle(el);
        const stand = document.createElement('span');
        stand.textContent = el.value || el.textContent || el.placeholder || '';
        if (!stand.textContent.trim()) continue;
        stand.style.cssText = `position:absolute;left:-9999px;top:0;white-space:pre;`
          + `font-family:${cs0.fontFamily};font-size:${cs0.fontSize};font-weight:${cs0.fontWeight};`
          + `font-style:${cs0.fontStyle}`;
        stand.setAttribute('data-pf-proxy-for', el.tagName.toLowerCase());
        document.body.appendChild(stand);
        stand.setAttribute('data-pf-fontprobe', String(n++));
        continue;
      }
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      el.setAttribute('data-pf-fontprobe', String(n++));
    }
    return { n, native };
  });

  const declared = await page.evaluate(() =>
    [...document.querySelectorAll('[data-pf-fontprobe]')].map((el) => {
      const cs = getComputedStyle(el);
      return { i: el.getAttribute('data-pf-fontprobe'),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34)
          + (el.hasAttribute('data-pf-proxy-for') ? `  <${el.getAttribute('data-pf-proxy-for')}>` : ''),
        family: cs.fontFamily, weight: cs.fontWeight };
    }));

  // ---- what actually drew the glyphs ----------------------------------------
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll',
    { nodeId: root.nodeId, selector: '[data-pf-fontprobe]' });

  const runs = [];
  for (let k = 0; k < nodeIds.length; k++) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: nodeIds[k] });
    runs.push({ ...declared[k], rendered: fonts.map((f) => f.familyName) });
  }

  // ---- is the weight axis real? ---------------------------------------------
  // A face that serves two weights renders them at identical widths. That is what "600 looks
  // like a medium" IS: one face doing every weight, either nearest-match or faux bold. This
  // uses the page's own font stack, so it measures the page and not the machine.
  const axis = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre;font-size:40px';
    probe.style.fontFamily = getComputedStyle(document.body).fontFamily;
    document.body.appendChild(probe);
    const w = {};
    for (const weight of [300, 400, 500, 600, 700]) {
      probe.style.fontWeight = String(weight);
      probe.textContent = 'Case raised Handgloves';
      w[weight] = Number(probe.getBoundingClientRect().width.toFixed(2));
    }
    probe.remove();
    return w;
  });

  await ctx.close();
  return { tagged: tagged.n, native: tagged.native, runs, axis };
}

// ---------------------------------------------------------------------------
// The judgement, kept pure so --self-test can drive it with fixtures.
export function judge({ runs, axis }) {
  const problems = [];
  let checked = 0, exempt = 0, notOurs = 0;

  for (const r of runs) {
    if (EXEMPT.test(r.family)) { exempt++; continue; }
    // A run that never asked for Open Sans is not a font-loading failure — but it is not
    // silence either, or a page could dodge this check by declaring something else.
    if (!WANT.test(r.family)) { notOurs++; continue; }
    checked++;
    const ok = r.rendered.some((f) => WANT.test(f));
    if (!ok) {
      problems.push(`FACE     "${r.text}" asks for Open Sans and is drawn in `
        + `${r.rendered.join(', ') || '(nothing measured)'}`);
    }
  }

  // Collapse identical-width weights into groups. Open Sans variable gives five distinct
  // widths; a two-face fallback gives two groups, which is the defect.
  const groups = new Map();
  for (const [w, px] of Object.entries(axis || {})) {
    if (!groups.has(px)) groups.set(px, []);
    groups.get(px).push(w);
  }
  if (checked && groups.size && groups.size < 3) {
    const shown = [...groups.entries()].map(([px, ws]) => `${ws.join('/')}=${px}px`).join('  ');
    problems.push(`WEIGHT   400 and 600 are not distinct faces — ${groups.size} width(s) across `
      + `five weights (${shown}); the page is nearest-matching or faux-bolding`);
  }

  return { problems, checked, exempt, notOurs, groups: groups.size };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: verify-fonts.mjs <built-screen.html> | --self-test'); process.exit(2); }
  if (!file.startsWith('http') && !existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const m = await measure(browser, file.startsWith('http') ? file : 'file://' + resolve(file));
  await browser.close();

  const r = judge(m);
  for (const p of r.problems) console.log(p);

  if (!r.checked) {
    // Nothing on the page asked for Open Sans. That is not a pass — it is the same hole
    // F-019 was about, and a page with no design-system type is exactly what it hides.
    console.log(`${m.runs.length} text run(s), none asking for Open Sans`);
    console.log('nothing measured — rendered type NOT MEASURED');
    process.exit(2);
  }

  console.log(`\n${r.checked} text run(s) checked, ${r.checked - r.problems.filter((p) => p.startsWith("FACE")).length} in Open Sans as asked, ${r.problems.length} problem(s)`
    + `, ${r.groups} distinct weight width(s)`
    + (r.exempt ? `, ${r.exempt} exempt (mono/emoji)` : '')
    + (r.notOurs ? `, ${r.notOurs} not asking for it` : '')
    + (m.native ? `, ${m.native} in native <select> widgets (not the page's to draw)` : ''));
  process.exit(r.problems.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --self-test. The fixtures are the two real failure modes: the font is absent so a
// fallback draws the glyphs, and one fallback face serves every weight.
function selfTest() {
  const realAxis = { 300: 180.1, 400: 183.3, 500: 188.0, 600: 196.6, 700: 203.4 };
  const flatAxis = { 300: 183.27, 400: 183.27, 500: 183.27, 600: 196.64, 700: 196.64 };
  const run = (family, rendered, text = 'Case raised') => ({ text, family, weight: '600', rendered });

  const cases = [
    ['a page in the real face passes',
      { runs: [run('"Open Sans", system-ui, sans-serif', ['Open Sans'])], axis: realAxis }, null],
    ['the font absent, a fallback drawing it',
      { runs: [run('"Open Sans", system-ui, sans-serif', ['DejaVu Sans'])], axis: realAxis }, /FACE/],
    ['nothing measured for a run',
      { runs: [run('"Open Sans", system-ui, sans-serif', [])], axis: realAxis }, /FACE/],
    ['one face serving every weight',
      { runs: [run('"Open Sans", system-ui, sans-serif', ['Open Sans'])], axis: flatAxis }, /WEIGHT/],
    ['a monospace caption is exempt, not a failure',
      { runs: [run('ui-monospace, Menlo, monospace', ['DejaVu Sans Mono'])], axis: realAxis }, null],
    ['a run that never asks for Open Sans is not a failure',
      { runs: [run('Comic Sans MS', ['DejaVu Sans'])], axis: realAxis }, null],
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

  // A page where nothing asks for Open Sans must be VACUOUS, never a pass. judge() cannot
  // exit, so this asserts the signal main() reads.
  const none = judge({ runs: [run('Comic Sans MS', ['DejaVu Sans'])], axis: realAxis });
  if (none.checked !== 0) {
    failures++;
    console.log('  MISS a page asking for Open Sans nowhere must report 0 checked (vacuous)');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a fallback face drawing Open Sans text, a run '
    + 'nothing measured, and one face serving every weight, while leaving monospace and '
    + 'non-system type alone and reporting a page with no Open Sans as vacuous');
}

// Only run the CLI when this file IS the command. screenshot-screen.mjs imports measure()
// and judge() from here, and an unguarded top-level main() ran — and process.exit()ed — the
// moment it was imported, so the screenshot tool silently produced nothing.
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  await main();
}
