#!/usr/bin/env node
// A SPACE_BETWEEN frame must not carry a gap.
//
//   node scripts/check-space-between-gap.mjs
//
// Figma IGNORES `itemSpacing` when a frame's primary-axis alignment is SPACE_BETWEEN, so the
// number left sitting in that field is a leftover from whatever the spacing was before. Both
// generators were emitting it as a CSS `gap`, which invents a MINIMUM separation on top of
// space-between and forces the frame wider than Figma ever drew it. `.pf-accordion` carried
// `gap: 689px` inside a 1200px component; `.pf-layout-container-title` 464px inside 1160;
// `Percentage bar`'s label row 370px inside 343, which pushed the bar out of its own box and
// was reported from a phone as the percentage bar being aligned left.
//
// It was proved from the measurements rather than taken from the documentation. Of the 51
// SPACE_BETWEEN frames in the file carrying a non-zero itemSpacing, **19 are arithmetically
// impossible** — padding + children + that gap exceeds the frame's own measured size, with
// `Accordion` needing 1889px inside 1200. A number that cannot fit the box it was measured in
// is not a gap. For the 15 that would have fitted, dropping it changes nothing: space-between
// already separates the children maximally, so the gap was a floor beneath the floor.
//
// Removing it took the template overflow this project pins as the precondition for clipping
// from 1171px to 866, and from 1529 to 1224 at mobile.
//
// The test is textual on purpose, and that is a deliberate exception to this project's habit of
// measuring the rendered result. The fault is a DECLARATION THAT MUST NEVER BE WRITTEN, not a
// value that might be wrong: rendered, it is invisible wherever the gap happens to fit, which
// is most of them, and would only show on the ones that were already overflowing. A grep over
// generated output is exact for "this pair never appears".
import { readFileSync, readdirSync } from 'node:fs';

const files = [['dist/components.css', readFileSync('dist/components.css', 'utf8')]];
for (const f of readdirSync('dist/templates').filter(f => f.endsWith('.html'))) {
  files.push([`dist/templates/${f}`, readFileSync(`dist/templates/${f}`, 'utf8')]);
}

const problems = [];
let blocks = 0;
for (const [name, text] of files) {
  // Every declaration block: a CSS rule body, or the contents of one style="..." attribute.
  const bodies = name.endsWith('.css')
    ? [...text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\{([^{}]*)\}/g)].map(m => m[1])
    : [...text.matchAll(/style="([^"]*)"/g)].map(m => m[1]);
  for (const body of bodies) {
    if (!/justify-content:\s*(safe\s+)?space-between/.test(body)) continue;
    blocks++;
    const gap = /(?:^|;|\n)\s*gap:\s*([\d.]+)px/.exec(body);
    if (gap && +gap[1] > 0) {
      problems.push(`${name} — a block sets justify-content: space-between AND gap: ${gap[1]}px. `
        + `Figma ignores itemSpacing on a SPACE_BETWEEN frame, so that number is a leftover and `
        + `emitting it forces the frame wider than Figma drew it`);
    }
  }
}

console.log(`${blocks} generated block(s) lay their children out with space-between, `
  + `across ${files.length} file(s); none of them also states a gap`);
if (!blocks) {
  console.error('  this check proved nothing: no generated block uses space-between at all');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
