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

// DOCUMENTATION PAGES ARE NOT THE DESIGN SYSTEM. Four of the Figma file's pages —
// 📚 WIKI, 🎨 STYLE GUIDE, 📄 DOCUMENT MANAGEMENT and the project-info boards — hold
// components that DESCRIBE the design system rather than belong to it: a Storybook link,
// a "Dos and don'ts" panel, project-status thumbnails, an Avatar in a Medium weight the
// system does not ship. uncaptured-reasons.tsv already records `AI link` on exactly this
// ground. Walking them also collides names: the Style Guide has its own `Header`
// (1654x98, 30px padding, 28px type) which is not the People First `Header` (1830x86).
// Excluded by name here so a stray walk of those pages cannot reach the library.
const DOC_ONLY = new Set(['Thumbnail', 'Thumbnail/Brand logo', 'Document label spec',
  'Document order spec', 'Prototype cover page', 'Prototype context screen',
  "Dos and don'ts", 'Storybook link', 'AI link', 'design system header', 'Work item',
  'Description', 'Logos', 'Avatar', 'Team member', 'Wiki menu', 'Logo', 'Skeleton state',
  'Project info - Files and Resources', 'Project info - UX PRD summary',
  'Project info - Meeting notes', 'Project info - Timeframe and schedule',
  'Project info - Stakeholders and Team']);

// component -> variant -> {size,padding,radius,gap,font,layout}
const measured = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    // A block ENDS at the first blank line. A walk that returns two blocks in one string
    // would otherwise spill the second one's rows into this map under shifted columns.
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== 8) continue;
    const [comp, variant, size, padding, radius, gap, font, layout] = c;
    // NAME COLLISION. `Header` exists twice: the People First component on the Navigation
    // page, whose rows always carry a variant (Theme=... or System=...), and a plain
    // variant-less COMPONENT on the Style Guide page — the documentation site's own
    // masthead, 1654x98. Excluding by name alone would delete both; the variant is the
    // discriminator, and it is a property of the data rather than a guess.
    if (DOC_ONLY.has(comp) || (comp === 'Header' && !String(variant).trim())) continue;
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
