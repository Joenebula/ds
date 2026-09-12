#!/usr/bin/env node
// Harvests the LINK between a component's label and the Figma text style it uses, into
// tokens/_raw/component-type.tsv.
//
//   node scripts/extract-component-type.mjs [transcript.jsonl]
//
// This link had never been extracted. `dist/type.css` held 23 styles read from Figma, and
// `dist/components.css` held 410 font-size and 131 font-weight declarations of its own,
// transcribed from measurements. Nothing connected the two, so a component's type could
// drift from the type ramp with both files passing their own checks — spec fault 4.
//
// A label falls into one of four cases, and they are NOT the same thing:
//
//   BOUND     textStyleId resolves to a local text style. The style's name is recorded
//             and the component composes that class.
//   EXTERNAL  textStyleId is set but points at a style in another library file, so this
//             file cannot name it. The label IS bound — the binding is just not local.
//             Matched by value instead, and reported.
//   UNBOUND   no textStyleId. The type is local and typed by hand in Figma. Where the
//             values match a style exactly (Button is 13px SemiBold, which is precisely
//             `Desktop text/Label text (semi bold, 600)`) that style is used and the
//             missing binding is reported as a Figma issue.
//
//   OFF-RAMP  no textStyleId and no style with those values — 11px, 12px, 15px and 60px
//             labels exist and the ramp has none of them. Reported, and the measured
//             values are kept, because inventing a binding would be worse than recording
//             the truth.
//
// letterSpacing and textCase are read for a reason. Matching on size and weight alone is
// ambiguous — three styles are 13px Regular (`Label text`, `Button text`, `Tag text`) and
// three are 20px Regular — so 43 labels had more than one candidate and picking the first
// would have been a guess. With tracking and case the match is nearly always unique, and
// it also exposes real off-ramp type that size alone hid: the Config menus are 16px UPPER
// and no style in the ramp is, so size-only matching called them `Body text`, which they
// are not.
//
// Rows arrive as TYPEB blocks headed by the column line below.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'TYPEB\tcomponent\tvariant\tboundStyle\tsize\tweight\tletterSpacing\ttextCase';
const OUT = 'tokens/_raw/component-type.tsv';
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

// The same documentation-page and name-collision rules the other two extractors apply.
// A stray walk of the WIKI, STYLE GUIDE or DOCUMENT MANAGEMENT pages must not reach the
// library, and the Style Guide's variant-less `Header` is not the People First one.
const DOC_ONLY = new Set(['Thumbnail', 'Thumbnail/Brand logo', 'Document label spec',
  'Document order spec', 'Prototype cover page', 'Prototype context screen',
  "Dos and don'ts", 'Storybook link', 'AI link', 'design system header', 'Work item',
  'Description', 'Logos', 'Avatar', 'Team member', 'Wiki menu', 'Logo', 'Skeleton state',
  'Project info - Files and Resources', 'Project info - UX PRD summary',
  'Project info - Meeting notes', 'Project info - Timeframe and schedule',
  'Project info - Stakeholders and Team']);

// component|variant -> row. A later measurement supersedes an earlier one. A block ends at
// the first blank line, and a data row is one field narrower than the header because the
// header carries a leading `TYPEB` tag. A row of any other width is a fragment — a
// truncated 20KB return, or a second block spilling in — and is dropped rather than parsed
// into shifted columns.
const WIDTH = HEADER.split('\t').length - 1;
const rows = new Map();
for (const b of blocks)
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    const [comp, variant] = c;
    if (DOC_ONLY.has(comp)) continue;
    if (comp === 'Header' && !String(variant).trim()) continue;
    rows.set(`${comp}|${variant}`, c.join('\t'));
  }

writeFileSync(OUT, 'component\tvariant\tboundStyle\tsize\tweight\tletterSpacing\ttextCase\n'
  + [...rows.values()].sort().join('\n') + '\n');

const all = [...rows.values()].map(r => r.split('\t'));
const bound = all.filter(r => r[2] && r[2] !== 'EXTERNAL');
const external = all.filter(r => r[2] === 'EXTERNAL');
const unbound = all.filter(r => !r[2]);
console.log(`component-type.tsv — ${all.length} component labels`);
console.log(`  ${bound.length} bind a local text style`);
console.log(`  ${external.length} bind a style in another library file (EXTERNAL)`);
console.log(`  ${unbound.length} bind nothing — type is local to the component in Figma`);
const comps = new Set(unbound.map(r => r[0]));
if (comps.size) console.log(`    unbound components: ${[...comps].sort().join(', ')}`);
