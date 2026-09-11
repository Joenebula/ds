#!/usr/bin/env node
// Does a page that USES a composite component use what is INSIDE it?
//
//   node scripts/check-template-fidelity.mjs <page.html> [...]
//
// The newest way a page goes off-system, and the one nothing else here can see.
// `check-off-system` asks whether every painted thing is a component class, and a page can
// pass it completely while hand-building the inside of every component it uses:
// `working/case-mgmt-my-team.html` puts `<div class="ppl-head">` inside `.pf-card` and
// rebuilds the whole of `.pf-layout-container-magazine-style` out of local divs. Both are
// "on-system" by that check's definition — the outer class is real, the colours are tokens
// — and both throw away the structure Figma specifies for the component's contents.
//
// That is the same failure as hand-writing component CSS, one level in. It is why
// `dist/templates/` exists, and until this check there was nothing to notice it.
//
// WHAT IS MEASURED, and what deliberately is not.
//
// A template names the LIBRARY CLASSES that belong inside a component — `pf-card`'s
// template contains a `pf-circle-icons`, `pf-layout-container-magazine-style`'s contains
// five. This counts how many of those a page's own instance actually uses. It does NOT
// check content, order, or completeness: a real card holds real data, a header need not
// show an avatar, and a page is entitled to leave parts out. A component using NONE of
// several offered classes is the signal worth having — that is a component rebuilt by
// hand, not one used with different content.
//
// So this reports rather than judges, and pins the total the way the other censuses do:
// the number may fall and not rise. Overstating would make it the third check on this
// project to claim more than it measures.
//
// AND THE LABEL SAYS REVIEW, NOT HAND-BUILT, for the same reason. The two are not the
// same thing and this check cannot tell them apart. `case-mgmt-my-team` now builds its
// insights title row out of `.pf-layout-container-title` — the component, used properly —
// but puts `pf-links` in the action group where Figma has buttons, so it scores 0 of 2
// and is flagged. That flag is worth a look and is not a verdict; calling it "hand-built"
// would state something false about markup that is right.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

// The count of hand-built usages when this check was written. It may go DOWN — that is a
// page adopting a template. It may not go up without someone deciding to raise it.
const HANDBUILT_BASELINE = 1;

// `working/*.html` matches the .src.html sources as well as the built pages, and counting
// both reports every page twice — which is how the first run of this check came back with
// four hand-built components instead of two. The source is not what ships: its icon
// markers are unexpanded and its stylesheet is not inlined. Filtered here rather than in
// the npm script, so the count is right however the check is invoked.
const pages = process.argv.slice(2).filter(f => existsSync(f) && !f.endsWith('.src.html'));
if (!pages.length) { console.error('usage: check-template-fidelity.mjs <page.html> [...]'); process.exit(1); }

// class -> the COMPONENT classes its template puts inside it.
//
// Type classes are excluded, and getting that wrong would have made this check actively
// harmful. The first run reported six components as "not using pf-text-body-text", which
// looks like a finding and is not one: a component COMPOSES its own type — `.pf-tab`
// renders at 16px/400 from `dist/components.css`, which is exactly the
// `Desktop text/Body text` Figma binds to it. The template carries the type class as well
// so it renders standalone; a page that uses the component class does not need it, and
// CLAUDE.md explicitly forbids adding one ("a page must never set type on a component
// class: the class already has it"). A check whose output tells you to break a rule is
// worse than no check.
const offers = new Map();
for (const f of readdirSync('dist/templates')) {
  const base = f.replace(/\.html$/, '');
  const inside = new Set([...readFileSync('dist/templates/' + f, 'utf8')
    .matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/))
    .filter(c => c.startsWith('pf-') && c !== base && !c.startsWith('pf-text-')));
  if (inside.size) offers.set(base, [...inside]);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
let handbuilt = 0, checked = 0, failures = 0;
const report = [];

for (const file of pages) {
  await page.goto('file://' + process.cwd() + '/' + file);
  // Measured from the rendered DOM rather than by scanning the source with a regex window:
  // a window guesses where an element ends, and a nested component would be credited to
  // its parent. The browser knows the tree.
  const found = await page.evaluate((offersArr) => {
    const map = new Map(offersArr);
    const out = [];
    for (const [base, inside] of map) {
      for (const el of document.querySelectorAll('.' + base)) {
        const have = new Set();
        for (const d of el.querySelectorAll('*'))
          for (const c of d.classList) if (map.has(c) || c.startsWith('pf-')) have.add(c);
        out.push({ base, offered: inside.length, used: inside.filter(c => have.has(c)).length,
                   missing: inside.filter(c => !have.has(c)) });
      }
    }
    return out;
  }, [...offers.entries()]);

  // One row per COMPONENT, not per instance: a nav with nine items would otherwise drown
  // out everything else. The best-used instance is the one that counts — if any instance
  // uses the template's classes, the page knows about them.
  const best = new Map();
  for (const r of found) {
    const cur = best.get(r.base);
    if (!cur || r.used > cur.used) best.set(r.base, r);
  }
  const rows = [...best.values()].sort((a, b) => a.base.localeCompare(b.base));
  if (!rows.length) continue;
  report.push(`${file}`);
  for (const r of rows) {
    checked++;
    const hand = r.used === 0 && r.offered >= 2;
    if (hand) handbuilt++;
    report.push(`  ${hand ? 'REVIEW' : '  ok  '} ${r.base.padEnd(36)} `
      + `uses ${r.used} of the ${r.offered} library class(es) its template puts inside`
      + (r.missing.length ? `\n${' '.repeat(11)}not used: ${r.missing.join(', ')}` : ''));
  }
}
await browser.close();

console.log(report.join('\n'));
console.log(`\n${checked} composite component use(s) across ${pages.length} page(s); `
  + `${handbuilt} use none of the children Figma gives them (baseline ${HANDBUILT_BASELINE})`);
if (handbuilt > HANDBUILT_BASELINE) {
  console.log('  FAIL  more components use none of their template\'s children than before. '
    + 'Open dist/templates/<class>.html and check the contents were not written by hand.');
  failures++;
} else if (handbuilt < HANDBUILT_BASELINE) {
  console.log(`  note  down ${HANDBUILT_BASELINE - handbuilt} — lower HANDBUILT_BASELINE to ${handbuilt} to lock it in`);
}
process.exit(failures ? 1 : 0);
