#!/usr/bin/env node
// How far a component's own template spills outside the box its class defines.
//
//   node scripts/check-template-overflow.mjs
//
// WHY THIS EXISTS: it is the measurement that settled whether the pipeline should carry
// Figma's `clipsContent`. Figma clips 34 of the 62 components on Cards and panels, 22 of
// them with a corner radius — and clipping is the only way to make a child respect a
// rounded corner, so carrying it looked like the obvious next fix after the border and the
// shadow. It is not, and this says why in numbers: 28 of the 154 templates ALREADY render
// outside the box their own class draws — `pf-hemisphere-chart` by 333px, `pf-donut-pie-
// chart` by 284px, `pf-content` by 180px. `overflow: hidden` would have deleted that
// content from view, and nothing would have reported it — a clipped child
// still has a bounding rect, so check-templates would go on reporting the template renders
// its contents while a fifth of it was invisible. That is the exact shape of silent failure
// this project keeps finding, and it would have been introduced deliberately.
//
// The overflow is not a bug in the templates. A class's height comes from the artboard
// Figma drew the component at, and a template holds placeholder contents of its own size;
// the two were never promised to agree. So this REPORTS and pins rather than failing. The
// number is the precondition: clipping can only ever be carried once it is zero.
import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

// The count at the time this was written. It may fall freely — that is the class box and
// its contents coming into agreement. It may not rise without somebody deciding to raise
// it, because up means a template drifted further from the box it is pasted into.
//
// It was first set to 5 from a sample of eighteen components, which is how many of THOSE
// overflowed; run across all 154 it is 28. A baseline taken from a subset is a baseline
// that fails the moment it meets the whole set — measure the population you are pinning.
const OVERFLOW_BASELINE = 27;

const expand = h => h.replace(/<!--pf-icon:([a-z0-9-]+)(?:\s+(\d+))?-->/g, (m, n, s) => {
  const f = `assets/icons/${n}.svg`;
  return existsSync(f)
    ? readFileSync(f, 'utf8').trim().replace(/^<svg /, `<svg width="${s || 18}" height="${s || 18}" `)
    : m;
});

const specs = readdirSync('dist/templates').filter(f => f.endsWith('.html')).sort().map(f => ({
  base: f.replace(/\.html$/, ''),
  html: expand(readFileSync('dist/templates/' + f, 'utf8').replace(/^<!--[\s\S]*?-->\n/, '')),
}));

writeFileSync('tmp-overflow-check.html',
  ['fonts', 'tokens', 'components', 'type'].map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${specs.map((s, i) => `<section id="w${i}">${s.html}</section>`).join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-overflow-check.html');
await p.evaluate(() => document.fonts.ready);
const got = await p.evaluate(n => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const box = document.getElementById('w' + i).firstElementChild;
    if (!box) { out.push(null); continue; }
    const b = box.getBoundingClientRect();
    let worst = 0, count = 0;
    for (const el of box.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      // Only DOWN and RIGHT. A component laid out inline can legitimately sit at a
      // negative offset for a moment during layout; what clipping would eat is the
      // content past the box's own bottom and right edges.
      const d = Math.max(r.bottom - b.bottom, r.right - b.right);
      if (d > 1) { count++; worst = Math.max(worst, d); }
    }
    out.push({ w: Math.round(b.width), h: Math.round(b.height), count, worst: Math.round(worst) });
  }
  return out;
}, specs.length);
await browser.close();
unlinkSync('tmp-overflow-check.html');

const over = [];
for (const [i, s] of specs.entries()) {
  const g = got[i];
  if (!g || !g.count) continue;
  over.push(`${s.base} — class box ${g.w}x${g.h}, ${g.count} element(s) outside it, by up to ${g.worst}px`);
}

console.log(`${specs.length} template(s) measured against the box their own class draws`);
console.log(`  ${over.length} render outside it (baseline ${OVERFLOW_BASELINE})`);
for (const o of over.sort()) console.log('    ' + o);
console.log('  Figma clips these components; the pipeline deliberately does NOT emit');
console.log('  overflow:hidden, because on these it would hide the template rather than');
console.log('  reproduce the design. See CLAUDE.md, "Clipping".');

let failed = 0;
if (over.length > OVERFLOW_BASELINE) {
  console.log('  FAIL  more templates overflow their class box than before — a template has '
    + 'drifted further from the box a page pastes it into.');
  failed = 1;
} else if (over.length < OVERFLOW_BASELINE) {
  console.log(`  note  down ${OVERFLOW_BASELINE - over.length} — lower OVERFLOW_BASELINE to ${over.length} to lock it in`);
}
process.exit(failed);
