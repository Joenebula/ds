#!/usr/bin/env node
// A component that is a BOX with one thing centred in it.
//
//   node scripts/extract-component-inner.mjs [transcript.jsonl]
//
// The gap this closes was reported from a screen: the icon at the top of a page sat in the
// corner of its circle and was too small. `.pf-circle-icons` is a generated class and the
// defect was in the library, so every use of it was wrong the same way — the page this
// project built earlier only looks right because it carries a local
// `.ppl-mark { display: grid; place-items: center }`, which is hand-written component CSS
// by another name.
//
// Why the other extracts could not carry this. `component-geometry.tsv` records a
// component's OUTER box, and Figma lays these out as `NONE` — no auto-layout, so there is
// no alignment to emit and the generator correctly emitted none. `component-tree.tsv`
// records what is INSIDE a component, but keeps one variant per component, and here the
// child's size is per VARIANT: a 28px circle holds an 18px icon and a 52px one holds 36.
// So this is a third fact about a component and it gets its own file.
//
// What qualifies, measured rather than named:
//   - Figma lays the component out as NONE, and
//   - it has exactly ONE child, and
//   - that child is smaller than it on BOTH axes, and
//   - the child's offsets are equal left/right and top/bottom.
// Three components match — `Circle icons`, `Status`, `Waffle` — and all three are the same
// shape: an icon sitting in the middle of a box. Components whose single child FILLS them
// (`Map`, `Notification list`, `People`, `Search navigation`) do not match and are
// untouched, which is the discriminator doing its job.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'INNER1\tcomponent\tvariant\tbox\tchild\tchildType\tchildName';
const OUT = 'tokens/_raw/component-inner.tsv';
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
// component|variant -> row. A later walk replaces an earlier one for the same variant.
const rows = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    rows.set(c[0] + '|' + c[1], line);
  }
}

const out = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, l]) => l);
writeFileSync(OUT, HEADER.replace(/^INNER1\t/, '') + '\n' + out.join('\n') + '\n');

const byComponent = new Map();
for (const l of out) {
  const c = l.split('\t');
  if (!byComponent.has(c[0])) byComponent.set(c[0], []);
  byComponent.get(c[0]).push(c[3]);
}
console.log(`component-inner.tsv — ${out.length} variant(s) across ${byComponent.size} component(s)`);
for (const [name, sizes] of byComponent)
  console.log(`  ${name.padEnd(16)} child sizes: ${[...new Set(sizes)].join(', ')}`);
