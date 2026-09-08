#!/usr/bin/env node
// Pulls the icon export batches out of the live session transcript and writes
// them to assets/icons/ + tokens/_raw/icons.tsv.
//
//   node scripts/extract-icons.mjs [transcript.jsonl]
//
// Why read the transcript rather than have the model retype each batch: the
// SVG payload is already on disk once the tool result lands. Retyping it would
// send ~200KB of path data back through the conversation for no gain.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = '/root/.claude/projects/-home-user-ds';
const file = process.argv[2] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    .map(f => join(dir, f)).sort().pop();

// Every string anywhere in the transcript that looks like a batch header.
const batches = [];
const walk = v => {
  if (typeof v === 'string') {
    if (/^FROM \d+ NEXT \d+ OF \d+ COUNT \d+/.test(v)) batches.push(v);
  } else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}

// index -> { name, svg }. Later batches win, so a re-export supersedes.
const icons = new Map();
let total = 0;
for (const b of batches) {
  const lines = b.split('\n');
  const m = lines[0].match(/OF (\d+)/);
  if (m) total = Math.max(total, +m[1]);
  for (const line of lines.slice(1)) {
    const tab1 = line.indexOf('\t');
    const tab2 = line.indexOf('\t', tab1 + 1);
    if (tab1 < 0 || tab2 < 0) continue;
    const idx = +line.slice(0, tab1);
    if (!Number.isInteger(idx)) continue;
    const name = line.slice(tab1 + 1, tab2);
    const svg = line.slice(tab2 + 1);
    if (!svg.startsWith('<svg')) continue;
    icons.set(idx, { name, svg });
  }
}

// kebab-case filename, deduped — Figma has two `GIF` and two `Transfer`.
const slug = s => s.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon';
const used = new Map();
const rows = [];
mkdirSync('assets/icons', { recursive: true });
// Figma emits <mask id="path-5-inside-1_9598_97877"> and url(#...) references.
// Those ids are document-global, so two icons inlined on the same page would
// collide and one would render through the other's mask. Namespace per file.
const namespaceIds = (svg, fileName) => {
  const ids = [...new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))];
  for (const id of ids) {
    const scoped = `${fileName}-${id}`;
    svg = svg.split(`id="${id}"`).join(`id="${scoped}"`)
             .split(`url(#${id})`).join(`url(#${scoped})`);
  }
  return svg;
};

for (const idx of [...icons.keys()].sort((a, b) => a - b)) {
  const { name } = icons.get(idx);
  let base = slug(name);
  const n = (used.get(base) || 0) + 1;
  used.set(base, n);
  const fileName = n === 1 ? base : `${base}-${n}`;
  const svg = namespaceIds(icons.get(idx).svg, fileName);
  writeFileSync(join('assets/icons', fileName + '.svg'), svg + '\n');
  rows.push([idx, name, fileName, svg].join('\t'));
}
writeFileSync('tokens/_raw/icons.tsv', 'index\tfigmaName\tfile\tsvg\n' + rows.join('\n') + '\n');

const have = new Set(icons.keys());
const missing = [];
for (let i = 0; i < total; i++) if (!have.has(i)) missing.push(i);

console.log(`batches parsed : ${batches.length}`);
console.log(`icons written  : ${icons.size} of ${total}`);
if (missing.length) {
  // Collapse to ranges so the next export call is easy to aim.
  const ranges = [];
  for (const i of missing) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === i - 1) last[1] = i; else ranges.push([i, i]);
  }
  console.log(`MISSING (${missing.length}): ` +
    ranges.map(([a, b]) => a === b ? a : `${a}-${b}`).join(', '));
} else {
  console.log('complete — no gaps');
}
