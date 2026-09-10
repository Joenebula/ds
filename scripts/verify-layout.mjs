#!/usr/bin/env node
// Fails a screen whose content is CUT OFF rather than laid out.
//
//   node scripts/verify-layout.mjs <built>.html
//
// Every other check on this project measures a property of an element in isolation:
// geometry checks its size against Figma, verify-rendered its colour, pf-audit its
// contrast, tag-elements its name. None of them look at whether the element can actually
// be SEEN. The payroll screen passed all four while 206px of its table — the whole
// Status column — was being sliced off at the card edge, because `Table (AG)` is
// `display: inline-flex` in Figma: it hugged its contents, grew past its column, and its
// own `overflow: hidden` amputated the rest. Correct colours, correct measurements,
// unusable screen.
//
// So this asks one question the others do not: is anything clipped by an ancestor that
// gives no way to scroll to it?
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const file = process.argv[2];
const selfTest = process.argv.includes('--self-test');
if (!file) { console.error('usage: node scripts/verify-layout.mjs <built>.html'); process.exit(2); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await page.goto('file://' + resolve(file));
if (selfTest) {
  // Break it the way Figma's own CSS broke it, and confirm this check says so.
  // Undo the generator's container fix-up, restoring the raw Figma behaviour: a
  // hug-contents frame with hug-contents children. Both halves have to go — with the
  // children still at width:100% they hug too, and nothing gets clipped.
  await page.addStyleTag({ content: `
    .pf-table-ag { display: inline-flex !important; width: auto !important;
                   max-width: none !important; align-items: flex-start !important; }
    .pf-table-ag > * { width: auto !important; max-width: none !important;
                       min-width: auto !important; }
  ` });
}

const found = await page.evaluate(() => {
  const scrolls = el => {
    const o = getComputedStyle(el);
    return /(auto|scroll)/.test(o.overflowX) || /(auto|scroll)/.test(o.overflowY);
  };
  const out = { amputated: [], pageOverflow: document.documentElement.scrollWidth - window.innerWidth };
  // EVERY element, not just the design-system ones. The first version of this check
  // looked only at `[class*="pf-"], td, th` and reported a clean bill of health on the
  // very page it was written for: the thing being amputated was the scroll DIV around
  // the table, which carries no pf- class, and walking up from a <td> stopped at that
  // div's own overflow before ever reaching the box doing the clipping.
  const SKIP = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE', 'HEAD', 'LINK', 'META', 'BR', 'PATH', 'SVG', 'G']);
  for (const el of document.querySelectorAll('*')) {
    if (SKIP.has(el.tagName)) continue;
    if (el.closest('[data-pf-ignore]')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p);
      const hidesX = o.overflowX === 'hidden' || o.overflowX === 'clip';
      if (!hidesX) { if (scrolls(p)) break; continue; }
      const pr = p.getBoundingClientRect();
      // How much of this element is outside the clipping box, in whole pixels.
      const lost = Math.round(Math.max(0, r.right - pr.right) + Math.max(0, pr.left - r.left));
      // Is there a scroll region BETWEEN the element and the thing clipping it? If so the
      // content is reachable and this is a scroll region, not an amputation.
      let reachable = false;
      for (let q = el.parentElement; q && q !== p; q = q.parentElement) if (scrolls(q)) { reachable = true; break; }
      if (lost > 1 && !reachable) {
        out.amputated.push({
          el: el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ')[0] || ''),
          id: el.getAttribute('data-pf-id') || '',
          clippedBy: p.tagName.toLowerCase() + '.' + (p.className.toString().split(' ')[0] || ''),
          lost,
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
        });
      }
      break;
    }
  }
  return out;
});
await browser.close();

// One clipped container drags every descendant in with it; report the outermost per
// clipping box so the output names the bug rather than its 40 consequences.
const seen = new Set();
const top = found.amputated.filter(a => { const k = a.clippedBy + '|' + a.lost; if (seen.has(k)) return false; seen.add(k); return true; });

for (const a of top.slice(0, 12)) {
  console.log(`    ${a.lost}px of ${a.el}${a.id ? ` (${a.id})` : ''} is cut off by ${a.clippedBy} — "${a.text}"`);
}
if (found.pageOverflow > 1) console.log(`    the page itself scrolls ${found.pageOverflow}px sideways at 1440`);

const bad = top.length || found.pageOverflow > 1;
console.log(bad
  ? `${top.length} element(s) clipped with no way to scroll to them`
  : `nothing clipped — every element is either fully visible or inside a scroll region`);
process.exit(bad ? 1 : 0);
