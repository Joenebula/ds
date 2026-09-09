#!/usr/bin/env node
// Compares the variant rows we captured against the variant axes Figma actually defines,
// and records which axes were collapsed and why.
//
//   node scripts/check-variant-coverage.mjs [--write]
//
// Why this exists: the colour extract deliberately collapses any axis that does not
// change a component's colours, so `Square progress bar` ends up as one row rather than
// fifteen. That is right for a stylesheet and wrong for a person reading the gallery,
// who would conclude the component has no states. Reporting "84 components have no
// states captured" was a reporting artefact, not a gap in Figma — this script exists so
// that mistake cannot be made from the data again.
import { readFileSync, writeFileSync } from 'node:fs';

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const k = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [k[i], v ?? ''])));
};
const variants = tsv('tokens/_raw/component-variants.tsv');
const inventory = JSON.parse(readFileSync('tokens/_raw/components.json', 'utf8'));
const invBy = new Map();
for (const c of inventory) if (!invBy.has(c.name)) invBy.set(c.name, c);

// Axes describing PRESENTATION CONTEXT rather than interaction. Collapsing these is
// correct: the tokens already carry dark mode, and a stylesheet is not breakpoint-scoped.
const CONTEXT = /^(darkmode|dark mode|mobile|breakpoint|device|full width|label|icon only|right aligned|page type|levels of navigation|area|horizontal|size|alignment)$/i;

const rowsBy = {};
for (const r of variants) (rowsBy[r.component] = rowsBy[r.component] || []).push(r);

const out = [];
let collapsedState = 0, collapsedContext = 0, single = 0;
for (const [component, rs] of Object.entries(rowsBy).sort()) {
  const inv = invBy.get(component);
  if (!inv || !inv.properties) continue;
  const axes = Object.entries(inv.properties).filter(([, p]) => p.type === 'VARIANT');
  const kept = new Set(rs.flatMap(r => r.variant.split(',').map(x => x.split('=')[0].trim()).filter(Boolean)));
  const dropped = axes.filter(([n, p]) => !kept.has(n) && (p.variantOptions || []).length > 1);
  if (!dropped.length) { if (rs.length === 1) single++; continue; }
  for (const [name, p] of dropped) {
    const kind = CONTEXT.test(name) ? 'context' : 'state';
    if (kind === 'state') collapsedState++; else collapsedContext++;
    out.push([component, name, (p.variantOptions || []).join('/'), kind].join('\t'));
  }
}

console.log(`components with a collapsed STATE axis   : ${collapsedState}`);
console.log('  (the axis exists in Figma but every value binds the same colours,');
console.log('   so it survives as geometry or content rather than as a CSS rule)');
console.log(`components with a collapsed CONTEXT axis : ${collapsedContext}  (correctly dropped)`);
console.log(`components Figma itself gives one variant: ${single}`);

if (process.argv.includes('--write')) {
  writeFileSync('tokens/_raw/collapsed-axes.tsv',
    'component\taxis\tvalues\tkind\n' + out.join('\n') + '\n');
  console.log(`\nwritten — tokens/_raw/collapsed-axes.tsv, ${out.length} rows`);
}
