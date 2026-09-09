#!/usr/bin/env node
// Pulls component GEOMETRY batches out of the live session transcript and merges them
// into tokens/_raw/component-geometry.tsv.
//
//   node scripts/extract-geometry.mjs [--write] [transcript.jsonl]
//
// Without --write it reports what it would change and touches nothing.
//
// Same transcript-reading approach as extract-icons.mjs and extract-variants.mjs: the
// measurements are already on disk once the tool result lands, so retyping them into the
// conversation would buy nothing but a chance to mistype one.
//
// Each batch is one Figma page, in the form:
//
//   GEOMETRY\t<page name>
//   COUNT <n>
//   <component>\t<size>\t<padding>\t<radius>\t<gap>\t<font>\t<layout>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const write = process.argv.includes('--write');
const args = process.argv.slice(2).filter(a => a !== '--write');
const dir = '/root/.claude/projects/-home-user-ds';
const file = args[0] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => join(dir, f)).sort().pop();

const batches = [];
const walk = v => {
  if (typeof v === 'string') { if (/^GEOMETRY\t.+\nCOUNT \d+/.test(v)) batches.push(v); }
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}

// component -> measurements. A later batch supersedes an earlier one for the same
// component, so a re-measure corrects rather than duplicates.
const measured = new Map();
for (const b of batches) {
  for (const line of b.split('\n').slice(2)) {
    const c = line.split('\t');
    if (!c[0] || c.length < 2) continue;
    measured.set(c[0], {
      size: c[1] || '', padding: c[2] || '', radius: c[3] || '',
      gap: c[4] || '', font: c[5] || '', layout: c[6] || '',
    });
  }
}
if (!measured.size) { console.error('no geometry batches found in the transcript'); process.exit(1); }

const TSV = 'tokens/_raw/component-geometry.tsv';
const [header, ...existingLines] = readFileSync(TSV, 'utf8').trim().split('\n');
const known = new Set(existingLines.map(l => l.split('\t')[0]));

// Figma reports "0" padding and "0" radius on a plain frame, which is not a measurement
// worth carrying — it is the absence of one. Blank them so the generator does not emit
// `padding: 0` as though the designer had chosen it.
const meaningful = v => (v && v !== '0' ? v : '');

const added = [];
for (const [component, m] of measured) {
  if (known.has(component)) continue;
  const cells = [component, m.size, meaningful(m.padding), meaningful(m.radius),
                 meaningful(m.gap), m.font, m.layout, ''];
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  added.push({ component, line: cells.join('\t') });
}

console.log(`batches parsed   : ${batches.length}`);
console.log(`components read  : ${measured.size}`);
console.log(`new measurements : ${added.length}`);
for (const a of added) console.log(`    ${a.component}`);
const already = [...measured.keys()].filter(c => known.has(c));
if (already.length) console.log(`already measured : ${already.length} (left alone)`);

if (write) {
  writeFileSync(TSV, [header, ...existingLines, ...added.map(a => a.line)].join('\n') + '\n');
  console.log(`\nwritten — ${existingLines.length} -> ${existingLines.length + added.length} rows`);
} else console.log('\ndry run — pass --write to apply');
