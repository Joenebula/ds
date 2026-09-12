#!/usr/bin/env node
// Does the component gallery render each specimen INSIDE the box that draws it?
//
//   node scripts/check-docs-specimens.mjs
//
// `docs/components.html` is the page this project tells people to look at, and it is the
// page the user actually reads on a phone. Nothing measured whether it renders legibly.
//
// It did not. The gallery fills each specimen with a real-world label where it knows one and
// otherwise falls back to the COMPONENT'S OWN NAME, and a component Figma gives no type at
// all is a box that holds no label: `Multi-select checkbox` is 20x20 and was rendering the
// words "Multi-select checkbox", overflowing its own box by 57px and landing on top of the
// variant caption underneath. Four classes, fifteen specimens. On a phone it read as a
// stylesheet bug — text escaping a component — when the stylesheet was right and the docs
// page was inventing text for a box Figma never puts text in.
//
// The measurement is the text's own rect against the element's, read in the browser. A
// generator cannot do this arithmetic: it does not know how wide a string renders. So the
// generator decides from a reading it does have — the geometry's `font` column, `—` for a
// component with no type — and this asserts the result of that reading independently.
//
// It asserts the negative too. A run where NO specimen carried text at all would pass while
// measuring nothing, which is how several checks on this project were green for months.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const PAGES = ['docs/components.html'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const problems = [];
let withText = 0, checked = 0;

for (const file of PAGES) {
  if (!existsSync(file)) { problems.push(`${file} is missing — run npm run build`); continue; }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('file://' + process.cwd() + '/' + file);
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const out = [];
    let text = 0, total = 0;
    for (const spec of document.querySelectorAll('.spec')) {
      const el = spec.firstElementChild;
      if (!el) continue;
      total++;
      // Only a DIRECT text child is the gallery's own placeholder. A template's contents are
      // a different question, answered by check-template-overflow.
      if (!el.firstChild || el.firstChild.nodeType !== 3 || !el.textContent.trim()) continue;
      text++;
      const box = el.getBoundingClientRect();
      const rng = document.createRange();
      rng.selectNodeContents(el);
      const t = rng.getBoundingClientRect();
      const over = Math.max(0, t.right - box.right, box.left - t.left,
                               t.bottom - box.bottom, box.top - t.top);
      if (over > 1) out.push({ cls: el.className, label: el.textContent.trim(),
        over: Math.round(over), box: `${Math.round(box.width)}x${Math.round(box.height)}` });
    }
    return { out, text, total };
  });
  await page.close();
  withText += r.text; checked += r.total;
  const seen = new Set();
  for (const x of r.out) {
    if (seen.has(x.cls)) continue;
    seen.add(x.cls);
    problems.push(`${file}: .${x.cls} is ${x.box} and the placeholder "${x.label}" renders `
      + `${x.over}px outside it — the gallery is putting a label in a box Figma gives no type`);
  }
}
await browser.close();

console.log(`${checked} specimen(s) on ${PAGES.join(', ')}, ${withText} of them carrying a `
  + `placeholder label, every one inside the box that draws it`);
if (!withText) {
  console.error('  this check proved nothing: not one specimen carried text, so nothing was measured');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
