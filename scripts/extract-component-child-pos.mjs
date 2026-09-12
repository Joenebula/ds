#!/usr/bin/env node
// Where a child SITS inside a parent Figma does not lay out — into
// tokens/_raw/component-child-pos.tsv.
//
//   node scripts/extract-component-child-pos.mjs [transcript.jsonl]
//
// `component-tree.tsv` records what a component contains and in what order. It does not
// record WHERE, because for an auto-layout parent the order is enough: the template writes
// the same flex direction, gap and padding and the children land where Figma put them.
//
// For a parent laid out NONE there is no auto-layout to copy, and the template stacked the
// children in normal flow instead — which is not merely imprecise, it is a different
// picture. `Profile image` is 93x93 and holds TWO children, a photo and a `People`
// instance, BOTH at 0,0 at 93x93: they are stacked on top of each other in Figma and the
// template rendered them one below the other, 93px tall becoming 184. `Donut pie chart`
// puts five children at measured offsets inside a 200x200 box; flowed, its template ran
// 284px past the bottom. That overflow is what `check-template-overflow.mjs` counts, and
// this is the measurement that lets the generator stop causing it.
//
// A SEPARATE FILE, NOT A COLUMN ON THE TREE. Adding a column would change the tree's block
// header, which deliberately invalidates every older block — and a re-walk of all 158
// components through a connection that drops between calls would leave the file holding
// only the handful that got through, wiping the templates of the rest. Absence here is
// harmless: a child with no recorded position is laid out exactly as before.
//
// Rows are keyed by component and PATH, the same raw child-index chain the tree uses, and
// carry the child's own size so the generator can refuse a row whose size disagrees with
// the tree's. Paths that do not match a tree row — the 30 vector nodes inside
// `Configuration`, which the tree collapses as artwork — simply never apply.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'POS1\tcomponent\tpath\tdx\tdy\tw\th';
const OUT = 'tokens/_raw/component-child-pos.tsv';
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

const WIDTH = HEADER.split('\t').length - 1;
const rows = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    rows.set(c[0] + '|' + c[1], line);
  }
}

const out = [...rows.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], undefined, { numeric: true })).map(([, l]) => l);
writeFileSync(OUT, HEADER.replace(/^POS1\t/, '') + '\n' + out.join('\n') + '\n');

// How many of these will actually be used: a row applies only where the tree has the same
// component and path AND agrees on the child's size.
const tree = new Map();
const t = readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n');
const th = t[0].split('\t');
for (const line of t.slice(1)) {
  const c = line.split('\t');
  tree.set(c[0] + '|' + c[1], c[th.indexOf('size')]);
}
let usable = 0, sizeClash = 0, noRow = 0;
for (const line of out) {
  const c = line.split('\t');
  const size = tree.get(c[0] + '|' + c[1]);
  if (size === undefined) { noRow++; continue; }
  if (size === `${c[4]}x${c[5]}`) usable++; else sizeClash++;
}
console.log(`component-child-pos.tsv — ${out.length} child position(s) across `
  + `${new Set(out.map(l => l.split('\t')[0])).size} components`);
console.log(`  ${usable} match a tree row exactly and can be used`);
console.log(`  ${noRow} name a node the tree does not carry (collapsed artwork, or past its depth)`);
console.log(`  ${sizeClash} match a tree row whose size DISAGREES — not used, and worth a look`);
