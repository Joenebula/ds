#!/usr/bin/env node
// Harvests the INSIDE of a component — its child tree — into tokens/_raw/component-tree.tsv.
//
//   node scripts/extract-component-tree.mjs [transcript.jsonl]
//
// Every other extract here captures a component's OUTER BOX. That is why a simple
// component works as a class and a composite one does not: `.pf-card` and
// `.pf-metric-card` carry a size, a fill and a radius, and nothing inside them. A page
// that needs a card gets an empty rounded rectangle, so whoever needs one writes their
// own — and a hand-written component is where the flat pink band and the wrong font
// weights came from.
//
// A composite component turns out to be three things and nothing more exotic:
//
//   FRAME / GROUP      a box with auto-layout. Becomes a div with layout CSS.
//   TEXT               becomes a span carrying a type class and a colour token.
//   INSTANCE           another component we already have. Becomes ITS class, and the
//                      walk stops there: what is inside it is that component's business.
//
// Plus the occasional LINE, RECTANGLE, ELLIPSE (a rule, an image placeholder, an icon
// backing circle) and SLOT — Figma's own "content goes here" marker, which `Card` uses
// and which is the clearest possible statement that a component is a container.
//
// Rows arrive as TREE blocks headed by the column line below. `path` is the position in
// the tree: "" is the component itself, "0" its first child, "3.0.1" a grandchild.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'TREE\tcomponent\tpath\ttype\tname\tsize\tlayout\tpadding\tgap\tradius\tfill\tstroke\ttextStyle\tfont\ttext';
const OUT = 'tokens/_raw/component-tree.tsv';
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

// The same rules the other extracts apply: documentation pages are not the design system,
// a block ends at the first blank line, and a row must be exactly one field narrower than
// the header (which carries a leading TREE tag the rows do not).
const DOC_ONLY = new Set(['Thumbnail', 'Thumbnail/Brand logo', 'Document label spec',
  'Document order spec', 'Prototype cover page', 'Prototype context screen',
  "Dos and don'ts", 'Storybook link', 'AI link', 'design system header', 'Work item',
  'Description', 'Logos', 'Avatar', 'Team member', 'Wiki menu', 'Logo', 'Skeleton state']);
const WIDTH = HEADER.split('\t').length - 1;

// component -> path -> row. A later walk of the same component REPLACES it wholesale
// rather than merging, because a tree is only meaningful as a whole: merging an old walk
// with a new one would leave orphan children whose parent no longer exists.
const trees = new Map();
for (const b of blocks) {
  const fresh = new Map();
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    if (DOC_ONLY.has(c[0])) continue;
    if (!fresh.has(c[0])) fresh.set(c[0], new Map());
    fresh.get(c[0]).set(c[1], line);
  }
  for (const [component, rows] of fresh) trees.set(component, rows);
}

const out = [];
for (const [, rows] of [...trees.entries()].sort())
  for (const [, line] of [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })))
    out.push(line);

writeFileSync(OUT, HEADER.replace(/^TREE\t/, '') + '\n' + out.join('\n') + '\n');

const composite = [...trees.entries()].filter(([, r]) => r.size > 1);
console.log(`component-tree.tsv — ${trees.size} components, ${out.length} nodes`);
console.log(`  ${composite.length} are composite (more than the outer box)`);
const kinds = {};
for (const [, rows] of trees) for (const [p, line] of rows) { if (!p) continue;
  const t = line.split('\t')[2]; kinds[t] = (kinds[t] || 0) + 1; }
console.log('  children by kind: ' + Object.entries(kinds).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`).join(', '));
