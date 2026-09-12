#!/usr/bin/env node
// Every form field's trailing icon sits in the same place: right, vertically centred.
//
//   node scripts/check-field-icons.mjs <page.html> [...]
//
// This is one rule covering four icons, and it comes straight out of the Figma tree rather
// than from taste. `Field` is laid out HORIZONTAL CENTER MAX — children packed to the END,
// centred on the cross axis — and its last child is one `Field icons` instance whose four
// frames are Search, Dropdown, Calendar and Clock. So a search glass, a dropdown chevron, a
// calendar and a clock are all the same object in the same place. A page that puts one
// somewhere else has invented a second design.
//
// It was reported from a screen, not caught here: the magnifier was absolutely positioned
// at left:15px on two pages, on the wrong side and vertically centred on the label-plus-
// input block rather than on the input, so it floated up into the corner. The same pages'
// dropdowns had NO icon at all — `.pf-field` sets `appearance: none`, which removes the
// browser's arrow, and nothing replaced it.
//
// The right-hand gap is not a magic number: it is read from the field's own computed
// padding and border, so the check stays correct if Figma changes either.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const pages = process.argv.slice(2).filter(f => !f.endsWith('.src.html'));
if (!pages.length) { console.log('no pages given'); process.exit(1); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let checked = 0, bare = 0; const bad = [];

for (const file of pages) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file://' + process.cwd() + '/' + file);
  await p.evaluate(() => document.fonts.ready);
  const found = await p.evaluate(() => {
    const out = [];
    for (const f of document.querySelectorAll('.pf-field')) {
      const kids = [...f.children].filter(c => c.tagName !== 'OPTION');
      const icon = kids.find(c => c.querySelector('svg') || c.tagName === 'SVG');
      const name = f.getAttribute('data-pf-id') || f.getAttribute('aria-label')
        || (f.querySelector('select') ? 'select' : f.tagName.toLowerCase());
      if (!icon) { out.push({ name, none: true }); continue; }
      const cs = getComputedStyle(f);
      const fb = f.getBoundingClientRect(), ib = icon.getBoundingClientRect();
      out.push({
        name,
        last: kids[kids.length - 1] === icon,
        right: Math.round(fb.right - ib.right),
        want: Math.round(parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)),
        top: Math.round(ib.top - fb.top),
        bottom: Math.round(fb.bottom - ib.bottom),
      });
    }
    return out;
  });
  await p.close();

  for (const r of found) {
    // A field with no icon is not a fault: Figma's `Field icons` has a State=Empty, and a
    // plain text field or a textarea legitimately carries none. Counted, not failed.
    if (r.none) { bare++; continue; }
    checked++;
    const off = [];
    if (!r.last) off.push('the icon is not the field\'s last child, so it is not at the end');
    if (Math.abs(r.right - r.want) > 1)
      off.push(`${r.right}px from the right edge where the field's own padding and border say ${r.want}px`);
    if (Math.abs(r.top - r.bottom) > 1)
      off.push(`${r.top}px above and ${r.bottom}px below, so it is not vertically centred`);
    if (off.length) bad.push(`${file} — ${r.name}: ${off.join('; ')}`);
  }
}
await browser.close();

console.log(`${checked} form field icon(s) across ${pages.length} page(s), `
  + `${bare} field(s) with none (Figma's Field icons has an Empty state)`);
if (bad.length) {
  console.log(`  FAIL  ${bad.length} are not where Figma puts them:`);
  for (const b of bad) console.log('    ' + b);
} else {
  console.log('  every one is the last child, at the field\'s own right padding, vertically centred');
}
process.exit(bad.length ? 1 : 0);
