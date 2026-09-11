#!/usr/bin/env node
// Harvests PER-VARIANT geometry from the session transcript into
// tokens/_raw/component-geometry.tsv.
//
//   node scripts/extract-component-geometry.mjs [transcript.jsonl]
//
// The file used to hold ONE ROW PER COMPONENT, typed by hand. Whichever variant happened
// to get measured was applied to all of them, and four bugs shipped from it: Navigation
// item (Selected's SemiBold, padding and gap on every state), Profile image (Extra
// large's 93px on all six sizes), Clock in, Card. verify-against-figma.mjs then found ten
// more in components nobody had looked at — Button's Filter and Sort padding, Filter
// chip's whole mobile breakpoint, Links Secondary's size.
//
// Rows arrive as GEOM blocks. A component emits a BASE row of the values every variant
// shares, then one `Component|Prop=Value` row per variant that differs. The generator
// already understands that shape.
//
// This is a SEPARATE walk from extract-figma-truth.mjs on purpose. That one feeds the
// check; this one feeds the build. Two independent measurements that should agree is the
// whole point of fault 2's fix — merging them would rebuild the circularity.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'GEOM\tcomponent\tvariant\tsize\tpadding\tradius\tgap\tfont\tlayout';
const OUT = 'tokens/_raw/component-geometry.tsv';
const COLS = ['component', 'size', 'padding', 'radius', 'gap', 'font', 'layout', 'notes'];

const dir = '/root/.claude/projects/-home-user-ds';
const file = process.argv[2] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => join(dir, f)).sort().pop();

const blocks = [];
const walk = v => {
  if (typeof v === 'string') { if (v.startsWith(HEADER + '\n')) blocks.push(v); }
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}

// component -> variant -> {size,padding,radius,gap,font,layout}
const measured = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    const c = line.split('\t');
    if (c.length < 8) continue;
    const [comp, variant, size, padding, radius, gap, font, layout] = c;
    if (!measured.has(comp)) measured.set(comp, new Map());
    measured.get(comp).set(variant, { size, padding, radius, gap, font, layout });
  }
}

// Existing file. Its NOTES are hand-written knowledge that no walk can recover — PILL,
// CIRCLE, CLIP, the explanation of why Clock in's label overruns — so they are carried
// across rather than overwritten. Components this run did not measure are left alone.
const [head, ...existingLines] = readFileSync(OUT, 'utf8').trim().split('\n');
const oldKeys = head.split('\t');
const existing = existingLines.map(l => Object.fromEntries(l.split('\t').map((v, i) => [oldKeys[i], v ?? ''])));
const noteFor = new Map(existing.map(r => [r.component.split('|')[0], r.notes]).filter(([, n]) => n));

const kept = existing.filter(r => !measured.has(r.component.split('|')[0]));
const rows = [];
let baseCount = 0, variantCount = 0;

for (const [comp, byVariant] of [...measured].sort()) {
  const all = [...byVariant.entries()];
  // The base row is what every variant agrees on. A field they disagree on is left blank
  // in the base and carried by the variant rows, so nothing is asserted that is not true
  // of the whole component.
  // The base row is Figma's DEFAULT variant — the first child of the set — not the
  // intersection of all of them. Blanking every field the variants disagree on sounds
  // more honest and is worse in practice: `class="pf-button"` with no attribute would
  // lose its padding, height and type entirely. The default variant is a real, complete
  // shape, and the variant rows below override it wherever Figma differs.
  const base = { ...all[0][1] };
  rows.push([comp, base.size, base.padding, base.radius, base.gap, base.font, base.layout,
             noteFor.get(comp) || ''].join('\t'));
  baseCount++;
  for (const [variant, v] of all) {
    if (!variant) continue;
    // A variant identical to the default needs no row of its own.
    const differs = ['size', 'padding', 'radius', 'gap', 'font', 'layout']
      .some(f => v[f] !== base[f]);
    if (!differs) continue;
    rows.push([`${comp}|${variant}`, v.size, v.padding, v.radius, v.gap, v.font, v.layout, ''].join('\t'));
    variantCount++;
  }
}

const out = [COLS.join('\t'),
  ...kept.map(r => COLS.map(c => r[c] ?? '').join('\t')),
  ...rows].join('\n') + '\n';
writeFileSync(OUT, out);

console.log(`component-geometry.tsv — ${baseCount} components measured per variant`);
console.log(`  ${baseCount} base rows + ${variantCount} variant rows, ${kept.length} rows left untouched`);
console.log(`  components: ${[...measured.keys()].sort().join(', ')}`);
