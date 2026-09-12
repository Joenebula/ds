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
// So this asks one question the others do not: is anything the reader cannot properly see?
// There are TWO ways to fail that, and for a long time this only tested one.
//
//   CLIPPED   an ancestor hides the overflow, so the content is amputated and there is no
//             way to scroll to it. The payroll table above.
//   ESCAPED   nothing hides it, so the content spills OUT of the box it belongs to — over
//             the edge of its own card, across a neighbour, past the panel's background.
//             Visually just as wrong, and this check passed it silently: no ancestor
//             clips, so the walk found nothing to report.
//
// There is a THIRD, and it lives in `check-text-overlap.mjs` rather than here because it needs
// a count pinned across every screen at once: text printed ON TOP of other text. Both elements
// sit correctly inside their own boxes, so neither is clipped and neither has escaped — they
// are simply on the same pixels. Found by looking at a screenshot of `timesheet-approvals`,
// where the side panel's working-time warning runs underneath the "Daily hours" heading.
//
// The second is the harder question, because escaping is sometimes correct — a dropdown,
// a tooltip and a notification badge are all supposed to leave their parent. Those are
// out of flow, so the test is scoped to in-flow elements against the nearest ancestor
// that actually PAINTS: a card, a panel, a banner. Overflowing a box with a background is
// a visible mistake; overflowing a bare layout div usually is not.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const file = process.argv[2];
const selfTest = process.argv.includes('--self-test');
// The clipped half has had a self-test since it was written. The escaped half needs its
// own, and it has to be screen-agnostic: pick whatever box on this page actually paints
// and push one of its in-flow children out of it.
const selfTestEscape = process.argv.includes('--self-test-escape');
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

if (selfTestEscape) {
  const broke = await page.evaluate(() => {
    const paints = el => {
      const o = getComputedStyle(el);
      const bg = o.backgroundColor;
      return (bg && bg !== 'transparent' && !/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(bg))
        || (o.backgroundImage && o.backgroundImage !== 'none');
    };
    for (const el of document.querySelectorAll('div, section, article')) {
      const o = getComputedStyle(el);
      if (!paints(el)) continue;
      if (/(auto|scroll|hidden|clip)/.test(o.overflowX + o.overflowY)) continue;
      const kid = [...el.children].find(c => {
        const co = getComputedStyle(c);
        return co.position === 'static' || co.position === 'relative';
      });
      if (!kid) continue;
      kid.style.width = (el.getBoundingClientRect().width + 240) + 'px';
      kid.style.maxWidth = 'none';
      return el.className.toString().split(' ')[0] || el.tagName.toLowerCase();
    }
    return null;
  });
  if (!broke) { console.log('self-test-escape: no painted container on this page to break'); process.exit(2); }
  console.log(`self-test-escape: pushed a child 240px out of .${broke}`);
}

const found = await page.evaluate(() => {
  const scrolls = el => {
    const o = getComputedStyle(el);
    return /(auto|scroll)/.test(o.overflowX) || /(auto|scroll)/.test(o.overflowY);
  };
  const out = { amputated: [], escaped: [],
    pageOverflow: document.documentElement.scrollWidth - window.innerWidth };

  // A box that paints is one a reader perceives as a container: it has a background, or a
  // border they can see. Escaping one of those is what reads as broken.
  const paints = el => {
    const o = getComputedStyle(el);
    const bg = o.backgroundColor;
    const hasBg = bg && bg !== 'transparent' && !/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(bg);
    const hasImg = o.backgroundImage && o.backgroundImage !== 'none';
    const bw = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']
      .map(k => parseFloat(o[k]) || 0);
    const hasBorder = bw.some(w => w > 0) && o.borderTopStyle !== 'none';
    return hasBg || hasImg || hasBorder;
  };
  const inFlow = el => {
    const o = getComputedStyle(el);
    return (o.position === 'static' || o.position === 'relative')
      && o.float === 'none' && o.transform === 'none';
  };
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

  // ---- 2. escaped: in flow, and outside the nearest box that paints ----------
  for (const el of document.querySelectorAll('*')) {
    if (SKIP.has(el.tagName)) continue;
    if (el.closest('[data-pf-ignore]')) continue;
    if (!inFlow(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;

    // Walk to the nearest painting ancestor. Stop at anything that scrolls or clips —
    // those are the other failure mode and are handled above, and a scroll region makes
    // the content reachable rather than escaped.
    let box = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(o.overflowX + o.overflowY)) { box = null; break; }
      if (!inFlow(p) && p !== document.body) { box = null; break; }
      if (paints(p)) { box = p; break; }
    }
    if (!box) continue;

    const br = box.getBoundingClientRect();
    // 2px of tolerance: sub-pixel layout and a 1px border should not be a finding.
    const outX = Math.round(Math.max(0, r.right - br.right) + Math.max(0, br.left - r.left));
    const outY = Math.round(Math.max(0, r.bottom - br.bottom) + Math.max(0, br.top - r.top));
    if (outX <= 2 && outY <= 2) continue;
    out.escaped.push({
      el: el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ')[0] || ''),
      id: el.getAttribute('data-pf-id') || '',
      box: box.tagName.toLowerCase() + '.' + (box.className.toString().split(' ')[0] || ''),
      outX, outY,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
    });
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

// The same collapsing as above: one escaping container takes its children with it, so
// report the outermost per box rather than the whole subtree.
const seenEsc = new Set();
const esc = found.escaped.filter(e => {
  const k = e.box + '|' + e.outX + '|' + e.outY;
  if (seenEsc.has(k)) return false; seenEsc.add(k); return true;
});
for (const e of esc.slice(0, 12)) {
  const dir = [e.outX > 2 ? `${e.outX}px sideways` : '', e.outY > 2 ? `${e.outY}px below` : '']
    .filter(Boolean).join(' and ');
  console.log(`    ${e.el}${e.id ? ` (${e.id})` : ''} escapes ${e.box} by ${dir} — "${e.text}"`);
}
if (found.pageOverflow > 1) console.log(`    the page itself scrolls ${found.pageOverflow}px sideways at 1440`);

const bad = top.length || esc.length || found.pageOverflow > 1;
console.log(bad
  ? `${top.length} element(s) clipped with no way to scroll to them, `
    + `${esc.length} escaping the box they belong to`
  : `nothing clipped and nothing escaping — every element is fully visible, `
    + `inside a scroll region, or deliberately out of flow`);
process.exit(bad ? 1 : 0);
