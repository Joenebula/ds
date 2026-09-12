#!/usr/bin/env node
// Does a box that holds one centred child actually centre it, at the measured size?
//
//   node scripts/check-component-inner.mjs
//
// `component-inner.tsv` records three components whose Figma layout is NONE and whose
// single child is smaller than the box on both axes: Circle icons, Status and Waffle. The
// geometry extract cannot see that alignment — there is no auto-layout to read it from —
// so build-components-css.mjs emits it from the measurement. Without it a page centres the
// icon itself, which is component CSS a page must never write, and that is exactly what
// `working/case-mgmt-my-team` was doing.
//
// THE FAULT THIS EXISTS TO CATCH is not a missing rule; it is a rule that loses.
// Every size variant carries its own `display: inline-block`, so `.pf-circle-icons` alone
// — one class — is outranked by `.pf-circle-icons[data-size="XS - 28px"]` however late it
// is written. The first version put the centring on the bare class and the icon rendered
// at the right size against the TOP EDGE of its circle: the reported half of the fault
// fixed, the other half looking fixed. Nothing in the suite could see it, because every
// other check reads a class's colours, its box, or its paint — none of them asks where
// inside the box the child ended up.
//
// CENTRED MEANS EQUAL PER AXIS, NOT EQUAL ALL ROUND. Waffle is 90x86, so its 32px child
// sits 29/29 across and 27/27 down. Demanding one number for all four called all fifteen
// Waffle variants broken while they were perfect — a check measuring the wrong thing,
// which is the failure this project has now found in five of its own.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const TSV = 'tokens/_raw/component-inner.tsv';
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const lines = readFileSync(TSV, 'utf8').trim().split('\n');
const head = lines[0].split('\t');
const rows = lines.slice(1).map(l => {
  const c = l.split('\t');
  return Object.fromEntries(head.map((h, i) => [h, c[i]]));
});
if (!rows.length) { console.log('component-inner.tsv is empty — nothing to check'); process.exit(0); }

// A real icon, so the child is a replaced element of its own intrinsic size — which is
// what a page actually pastes, and what the `> *` rule has to override.
const icon = readFileSync('assets/icons/team.svg', 'utf8').trim();
const stage = rows.map((r, i) => {
  const at = r.variant
    ? r.variant.split(', ').map(v =>
        ` data-${kebab(v.slice(0, v.indexOf('=')))}="${v.slice(v.indexOf('=') + 1)}"`).join('')
    : '';
  return `<div id="s${i}" class="pf-${kebab(r.component)}"${at}>${icon}</div>`;
}).join('\n');

writeFileSync('tmp-inner-check.html', ['fonts', 'tokens', 'components', 'type']
  .map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${stage}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-inner-check.html');
await p.evaluate(() => document.fonts.ready);
const got = await p.evaluate(n => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = document.getElementById('s' + i);
    const b = el.getBoundingClientRect(), k = el.firstElementChild.getBoundingClientRect();
    out.push({ box: `${b.width}x${b.height}`, child: `${k.width}x${k.height}`,
      l: k.left - b.left, r: b.right - k.right, t: k.top - b.top, b: b.bottom - k.bottom });
  }
  return out;
}, rows.length);
await browser.close();
unlinkSync('tmp-inner-check.html');

// Half a pixel: Status/Comment's child is 17 in 22, which centres on 2.5 and is exact.
// The tolerance is for the browser's own rounding, not for a rule being roughly right.
const near = (a, b) => Math.abs(a - b) < 0.51;
const wrongSize = [], offCentre = [];
for (const [i, r] of rows.entries()) {
  const g = got[i];
  const where = `${r.component} ${r.variant || '*'}`;
  if (g.box !== r.box || g.child !== r.child)
    wrongSize.push(`${where} — Figma ${r.box} holding ${r.child}, renders ${g.box} holding ${g.child}`);
  else if (!near(g.l, g.r) || !near(g.t, g.b))
    offCentre.push(`${where} — ${g.l}/${g.r} across, ${g.t}/${g.b} down`);
}

console.log(`${rows.length} variant(s) whose child Figma centres by hand, in `
  + `${new Set(rows.map(r => r.component)).size} component(s)`);
if (wrongSize.length) {
  console.log(`  FAIL  ${wrongSize.length} render at the wrong size:`);
  for (const w of wrongSize) console.log('    ' + w);
}
if (offCentre.length) {
  console.log(`  FAIL  ${offCentre.length} are the right size but NOT centred — a page would `
    + `have to centre them itself, which is component CSS it must not write:`);
  for (const w of offCentre) console.log('    ' + w);
}
if (!wrongSize.length && !offCentre.length)
  console.log('  every one is centred on both axes at the size Figma draws it');

process.exit(wrongSize.length || offCentre.length ? 1 : 0);
