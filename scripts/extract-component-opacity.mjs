#!/usr/bin/env node
// How TRANSPARENT a node inside a component is — into tokens/_raw/component-opacity.tsv.
//
//   node scripts/extract-component-opacity.mjs [transcript.jsonl]
//
// The colour extract answers ONE question about a paint: which variable does it bind. It has
// no column for how transparent that paint is, and no column for the node's own opacity — so
// two children binding the same token render the same colour however differently Figma draws
// them. Reported by looking at `Slider`: Figma draws its handle as a solid 24px circle inside
// a PALE 32px ring, both binding `Icons/Icon - Link`, and the template rendered one solid
// 32px dot. The paleness is `opacity: 0.4` on the outer ellipse and nothing else.
//
// Swept with `use_figma` across the ten component pages (Analytics and charts is deliberately
// skipped — the charts are being redrawn and the user has parked them). **63 nodes across 22
// components are not fully opaque**, which is 63 more than the pipeline could see.
//
// TWO DIFFERENT PROPERTIES, and they are not interchangeable:
//
//   node     the NODE's opacity. Fades the node and everything inside it. Maps to CSS
//            `opacity`, exactly.
//   fill     a PAINT's opacity. Fades that one paint and nothing else — a translucent
//            background under fully opaque text. Maps to the colour's alpha, NOT to CSS
//            `opacity`, and emitting one as the other would fade a component's own label.
//
// A SEPARATE FILE, NOT A COLUMN ON THE TREE, for the reason `component-child-pos.tsv` gives:
// adding a column changes the tree's block header, which deliberately invalidates every older
// block, and a re-walk of all 158 components through a connection that drops between calls
// would leave the file holding only the ones that got through. Absence here is harmless —
// a node with no row is opaque, which is what the generator already assumed.
//
// `variants` is how many variants of that component were measured and `nvals` how many
// DISTINCT readings they gave. `nvals > 1` means the value depends on the variant, which a
// template cannot express — it holds one markup for all of them — so those are recorded and
// refused rather than averaged. That is the same shape as the shared-fill rule: a value every
// variant agrees on is a fact; one they disagree about is the variant's business.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'OPA1\tcomponent\tpath\ttype\tnode\tfill\tstroke\tvariants\tnvals';
const OUT = 'tokens/_raw/component-opacity.tsv';
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
if (!rows.size) { console.error('no OPA1 block found in ' + file); process.exit(1); }

const out = [...rows.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], undefined, { numeric: true })).map(([, l]) => l);
writeFileSync(OUT, HEADER.replace(/^OPA1\t/, '') + '\n' + out.join('\n') + '\n');

// WHAT WILL ACTUALLY BE USED. A row applies only where the tree carries the same component
// and path — and only where every measured variant agreed, and only for the NODE's own
// opacity, which is the one CSS `opacity` means.
const tree = new Map();
const t = readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n');
const th = t[0].split('\t');
for (const line of t.slice(1)) {
  const c = line.split('\t');
  tree.set(c[0] + '|' + c[1], c[th.indexOf('type')]);
}
let usable = 0, varies = 0, noRow = 0, paintOnly = 0, root = 0, typeClash = 0;
for (const line of out) {
  const c = line.split('\t');
  const [comp, path, type, node, fill] = c;
  // ORDER MATTERS, AND THE FIRST VERSION GOT IT WRONG. With the paint and variant tests
  // first, `root` could never fire — every root row is also one of those — so the build
  // reported "0 are the component ROOT" and read as though none existed, when five do. A
  // category that cannot be reached is worse than no category: it states a fact nobody
  // measured. The strongest reason goes first, and each count now means what it says.
  if (!path) { root++; continue; }
  if (+c[7] > 1) { varies++; continue; }
  if (+node === 1 && +fill !== 1) { paintOnly++; continue; }
  const seen = tree.get(comp + '|' + path);
  if (seen === undefined) { noRow++; continue; }
  if (seen !== type) { typeClash++; continue; }
  usable++;
}
console.log(`component-opacity.tsv — ${out.length} node(s) across `
  + `${new Set(out.map(l => l.split('\t')[0])).size} components are not fully opaque`);
console.log(`  ${usable} carry the node's own opacity, agree across every variant, and match a `
  + 'tree row — these are the ones a template can state');
console.log(`  ${varies} depend on the VARIANT, which one template cannot express`);
console.log(`  ${paintOnly} are a PAINT's opacity, which is the colour's alpha and not CSS opacity`);
console.log(`  ${root} are the component ROOT, whose opacity belongs to its class, not its template`);
console.log(`  ${noRow} name a node the tree does not carry (past its depth, or collapsed artwork)`);
console.log(`  ${typeClash} match a tree row whose node TYPE disagrees — not used, and worth a look`);
const acc = usable + varies + paintOnly + root + noRow + typeClash;
if (acc !== out.length) {
  console.error(`FAIL the six outcomes sum to ${acc}, not the ${out.length} rows in the file`);
  process.exit(1);
}
