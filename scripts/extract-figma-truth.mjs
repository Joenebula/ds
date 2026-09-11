#!/usr/bin/env node
// Harvests an INDEPENDENT measurement of Figma into tokens/_raw/figma-truth.tsv.
//
//   node scripts/extract-figma-truth.mjs [transcript.jsonl]
//
// The point of this file is what does NOT read it. `npm run verify` used to print
// "2722 of 2722 checks match Figma" while comparing dist/components.css to
// component-geometry.tsv and component-variants.tsv — the two files it was GENERATED
// from. The copy checked against the copy. A mis-transcription was invisible and
// permanent, and four of them shipped.
//
// This snapshot is measured straight from Figma by a separate walk, and NOTHING under
// scripts/build-* may read it. verify-against-figma.mjs compares the rendered stylesheet
// to this instead, so the two sides have independent sources and a drift shows up.
//
// Rows arrive as a TSV block headed by the column line below.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'component\tvariant\tw\th\tpadding\tradius\tgap\tfontSize\tfontStyle';
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
// NAME COLLISION. `Header` exists twice: the People First component on the Navigation
// page, whose rows always carry a variant (Theme=... or System=...), and a plain
// variant-less COMPONENT on the Style Guide page that is the documentation site's own
// masthead — 1654x98, 30px padding, 28px type. A name-only exclusion would delete both.
// The variant is the discriminator, and it is a property of the data rather than a guess.
const isDocOnly = (name, variant) =>
  DOC_ONLY.has(name) || (name === 'Header' && !String(variant).trim());

// component|variant -> row. A later measurement supersedes an earlier one.
//
// A block ENDS at the first blank line, and a row must have the header's column count.
// Without both, a walk that returned this block followed by a GEOM block in one string
// swallowed the GEOM header and every GEOM row as if they were measurements: the columns
// line up differently, so `radius` read a gap and `gap` read a font size, and 170 values
// drifted at once against numbers nothing had ever measured.
const WIDTH = HEADER.split('\t').length;
const rows = new Map();
for (const b of blocks)
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    if (line.split('\t').length !== WIDTH) continue;
    if (isDocOnly(line.split('\t')[0], line.split('\t')[1])) continue;
    rows.set(line.split('\t').slice(0, 2).join('|'), line);
  }

// CONTENT-DEPENDENT VARIANTS. The People set has 300 variants on an `Item` axis whose
// values are sample entities — ~25 people plus Organisation, Department, Job, Initials.
// Its geometry is not a property of the component: the tile hugs its label, so
// "Nolan George" is 91px tall at Type=Table, Mobile=True and "Corey Franci" is 109
// because the longer name wraps. There is no class that can be right for both, and no
// representative the walk can pick that is not simply one name's measurement standing in
// for every other. Asserting any of them produces drift that no edit can clear, so the
// axis is recorded in uncaptured-reasons.tsv and left out of the comparison. The set's
// other axes (Type, Mobile) are measured through the [S] People component, which is the
// same shapes without the content permutations.
const rows2 = new Map();
let dropped = 0;
for (const [key, line] of rows) {
  if (/(^|\t)Item=/.test(line.split('\t')[1] || '')) { dropped++; continue; }
  rows2.set(key, line);
}
rows.clear();
for (const [k, v] of rows2) rows.set(k, v);
if (dropped) console.log(`  ${dropped} content-dependent People variants left out (see uncaptured-reasons.tsv)`);

writeFileSync('tokens/_raw/figma-truth.tsv',
  HEADER + '\n' + [...rows.values()].sort().join('\n') + '\n');
console.log(`figma-truth.tsv — ${rows.size} independently measured shapes`);
const comps = new Set([...rows.keys()].map(k => k.split('|')[0]));
console.log(`  covering ${comps.size} components: ${[...comps].sort().join(', ')}`);
