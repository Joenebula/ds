#!/usr/bin/env node
// Pulls the Figma text-style reads out of the session transcript into
// tokens/_raw/text-styles.tsv.
//
//   node scripts/extract-text-styles.mjs [--write] [transcript.jsonl]
//
// Two reads feed this, because neither alone is complete:
//   TEXTSTYLES  size, the font's own style, line height, letter spacing, text case
//   TEXTBOUND   the VARIABLE bound to weight/size, where the style uses one
// A third of the styles resolve their weight only through a bound variable, and some
// resolve it through neither — which is recorded as a gap rather than guessed.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const write = process.argv.includes('--write');
const args = process.argv.slice(2).filter(a => a !== '--write');
const dir = '/root/.claude/projects/-home-user-ds';
const file = args[0] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => join(dir, f)).sort().pop();

const blocks = { TEXTSTYLES: [], TEXTBOUND: [] };
const walk = v => {
  if (typeof v === 'string') {
    const m = v.match(/^(TEXTSTYLES|TEXTBOUND)\t.+\nCOUNT \d+/);
    if (m) blocks[m[1]].push(v);
  } else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}
const rowsOf = (arr) => {
  const out = [];
  for (const b of arr) for (const l of b.split('\n').slice(2)) {
    const c = l.split('\t');
    if (c[0]) out.push(c);
  }
  return out;
};

// Two Figma styles genuinely share the name "Desktop text/Button text" — 16px sentence
// case and 13px uppercase. Key on name+size so they stay distinct.
const key = (name, size) => `${name}|${size}`;

const styles = new Map();
for (const c of rowsOf(blocks.TEXTSTYLES)) {
  styles.set(key(c[0], c[1]), {
    name: c[0], size: c[1], style: c[2] || '',
    lineHeight: c[3] || '', letterSpacing: c[4] || '', textCase: c[5] || 'ORIGINAL',
    weightVar: '', sizeVar: '',
  });
}
for (const c of rowsOf(blocks.TEXTBOUND)) {
  const s = styles.get(key(c[0], c[1]));
  if (!s) continue;
  if (!s.style && c[2]) s.style = c[2];
  // Figma binds the WEIGHT variable under boundVariables.fontStyle, not .fontWeight —
  // reading the obvious-looking field returns nothing and makes a third of the styles
  // look weightless. Prefer fontStyle, fall back to fontWeight.
  s.weightVar = c[4] || c[3] || '';
  s.sizeVar = c[6] || '';
}
if (!styles.size) { console.error('no text-style batches found in the transcript'); process.exit(1); }

// Figma's Weight/* variables are the authoritative weight where the font's own style is
// unset. Everything else stays blank and is reported, never guessed.
const FROM_VAR = { 'Weight/Regular': 'Regular', 'Weight/Bold': 'SemiBold' };
const rows = [];
const noWeight = [];
for (const s of [...styles.values()]) {
  let weight = s.style || FROM_VAR[s.weightVar] || '';
  if (!weight) noWeight.push(`${s.name} (${s.size}px)`);
  rows.push([s.name, s.size, weight, s.lineHeight, s.letterSpacing, s.textCase].join('\t'));
}

console.log(`text styles read : ${styles.size}`);
console.log(`line heights     : ${[...new Set([...styles.values()].map(s => s.lineHeight))].join(', ')}`);
console.log(`letter spacings  : ${[...new Set([...styles.values()].map(s => s.letterSpacing))].join(', ')}`);
console.log(`weights present  : ${[...new Set([...styles.values()].map(s => s.style).filter(Boolean))].join(', ')}`);
if (noWeight.length) {
  console.log(`NO WEIGHT in Figma (${noWeight.length}) — neither a font style nor a bound variable:`);
  for (const n of noWeight) console.log(`    ${n}`);
}
if (write) {
  writeFileSync('tokens/_raw/text-styles.tsv',
    'name\tsize\tweight\tlineHeight\tletterSpacing\ttextCase\n' + rows.join('\n') + '\n');
  console.log(`\nwritten — tokens/_raw/text-styles.tsv, ${rows.length} rows`);
} else console.log('\ndry run — pass --write to apply');
