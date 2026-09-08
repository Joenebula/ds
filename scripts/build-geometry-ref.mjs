#!/usr/bin/env node
// Builds .claude/skills/people-first/references/geometry.md from the measured
// component geometry, so the skill can cite real numbers rather than infer them.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const rows = readFileSync('tokens/_raw/component-geometry.tsv', 'utf8')
  .trim().split('\n').slice(1).map(l => l.split('\t'));

let md = `# Component geometry

Measured from the Figma components — sizes, padding, radii, gaps and type. These are
**not** derivable from the spacing/radius tokens: component geometry and the token
scale are separate systems in People First.

The most common way a People First build goes wrong is inferring shape from the token
scale. Buttons do not use the radius tokens at all (they are pills), tags are sentence
case, and table rows are far taller than a default table. Look values up here.

| Component | Size (w × h) | Padding | Radius | Gap | Type | Notes |
|---|---|---|---|---|---|---|
`;
for (const [c, size, pad, r, gap, font, notes] of rows) {
  md += `| **${c}** | ${size || '—'} | ${pad || '—'} | ${r || '—'} | ${gap || '—'} | ${font || '—'} | ${notes || ''} |\n`;
}

md += `
## Reading these numbers

- **Padding** is CSS order: \`top right bottom left\`, collapsed where symmetric.
  \`10 10 10 20\` on inputs means the asymmetric left inset is deliberate.
- **Radius 20 / 76 / 999** all mean *pill*. Figma stores a literal large radius;
  in CSS use \`border-radius: 999px\` so it stays a pill at any height.
- **\`auto x N\`** means the width hugs content and the height is fixed. Set the
  height explicitly — letting padding decide it produces a slightly-wrong control.
- **\`mixed\`** means the corners differ on that node; check the specific component
  before implementing.

## The five that matter most

If you only carry five numbers, carry these — they account for most of the
difference between a page that reads as People First and one that doesn't:

1. Buttons: pill, **32px** tall, **13px SemiBold**, leading icon, 10px gap
2. Filter chips: pill, **42px** tall, **16px**
3. Tags: **sentence case**, 4px radius, 28px tall, 13px Regular
4. Inputs: **42px** tall, **8px** radius, \`padding: 10px 10px 10px 20px\`
5. Table rows **58px**, headers **54px**, both at **13px**
`;

mkdirSync('.claude/skills/people-first/references', { recursive: true });
writeFileSync('.claude/skills/people-first/references/geometry.md', md);
console.log(`geometry.md written — ${rows.length} components`);
