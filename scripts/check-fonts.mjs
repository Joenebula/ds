#!/usr/bin/env node
// Asks the one question no other check asks: WHICH FACE ACTUALLY RENDERED?
//
//   node scripts/check-fonts.mjs <page.html> [...]
//
// verify-type compares the emitted `font-weight: 600` against the extract's "SemiBold".
// Both were correct for the whole life of this project while the browser painted DejaVu
// Sans Bold, because Open Sans was never shipped and DejaVu has no SemiBold face. Text
// specified as SemiBold rendered heavier and wider than the design, on every screen, and
// every check was green.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PROBE = 'Action Handling'; // mixed widths, no kerning pairs peculiar to one face

const browser = await chromium.launch({ executablePath: EXEC });
let failures = 0;

for (const file of process.argv.slice(2)) {
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/' + file.replace(/^\.\//, ''));
  const r = await page.evaluate(async (probe) => {
    await document.fonts.ready;
    const measure = (family, weight) => {
      const s = document.createElement('span');
      s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${weight} 13px ${family}`;
      s.textContent = probe;
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return Math.round(w * 100) / 100;
    };
    return {
      facesLoaded: document.fonts.size,
      // If the real face is present these differ; if Open Sans is falling back to the
      // generic they are identical, which is the whole failure.
      openSans400: measure('"Open Sans"', 400),
      openSans600: measure('"Open Sans"', 600),
      fallback400: measure('sans-serif', 400),
      fallback600: measure('sans-serif', 600),
      weights: [...new Set([...document.querySelectorAll('*')]
        .map(el => getComputedStyle(el).fontWeight))].sort(),
    };
  }, PROBE);
  await page.close();

  const problems = [];
  if (r.facesLoaded === 0)
    problems.push('no @font-face is loaded — the page has no typeface of its own');
  if (r.openSans400 === r.fallback400 && r.openSans600 === r.fallback600)
    problems.push(`"Open Sans" measures identically to sans-serif (${r.openSans400} / ${r.openSans600}) — it is falling back, not rendering`);
  if (r.openSans400 === r.openSans600)
    problems.push(`400 and 600 measure the same (${r.openSans400}) — only one face is present, so one weight is synthesised`);
  const stray = r.weights.filter(w => !['400', '600', 'normal', 'bold'].includes(w) && w !== '');
  if (stray.length)
    problems.push(`weights outside {400, 600} in use: ${stray.join(', ')} — the design system has two`);

  if (problems.length) {
    console.log(`FAIL  ${file}`);
    for (const p of problems) console.log('        ' + p);
    failures++;
  } else {
    console.log(`ok    ${file} — Open Sans rendering, 400 ${r.openSans400}px / 600 ${r.openSans600}px (fallback would be ${r.fallback400} / ${r.fallback600})`);
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
