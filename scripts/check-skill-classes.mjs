#!/usr/bin/env node
// Checks the class table in the people-first skill against dist/components.css.
//
//   node scripts/check-skill-classes.mjs
//
// Why this exists: the skill tells people to write `data-message-type="Success"`. If the
// stylesheet actually keys on something else, nothing matches, nothing errors, and the
// component silently renders unstyled. Documentation that is wrong in that way is worse
// than none — so it gets checked like everything else here.
//
// Two things are verified:
//   1. every class named in the skill exists in the stylesheet
//   2. every REAL Figma variant of those components is selected by a rule, using the
//      attribute spelling the skill documents
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const md = readFileSync('.claude/skills/people-first/SKILL.md', 'utf8');
const section = md.split('### The classes you will reach for most')[1];
if (!section) { console.error('skill has no class table — did the heading change?'); process.exit(1); }

// component name -> class, as the skill documents it
const documented = new Map();
for (const line of section.split('Three of these')[0].split('\n')) {
  const m = line.match(/^\| (.+?) \| `\.([a-z0-9-]+)` \|/);
  if (m && m[1] !== 'Figma component') documented.set(m[1], m[2]);
}

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};
const variants = tsv('tokens/_raw/component-variants.tsv');
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const problems = [];
const cases = [];
for (const [component, cls] of documented) {
  if ('pf-' + kebab(component) !== cls)
    problems.push(`${component}: skill says .${cls}, the generator produces .pf-${kebab(component)}`);
  const rows = variants.filter(r => r.component === component);
  if (!rows.length) { problems.push(`${component}: named in the skill but not in the extract`); continue; }
  for (const r of rows) {
    const attrs = r.variant.split(',').map(p => p.trim()).filter(Boolean).map(p => {
      const i = p.indexOf('='); return [kebab(p.slice(0, i)), p.slice(i + 1).trim()];
    });
    // a row with no colour binding has nothing to select beyond the base rule
    const hasColour = !!(r.fill || r.stroke || r.text);
    cases.push({ component, cls, variant: r.variant, attrs, hasColour });
  }
}

writeFileSync('tmp-skill-classes.html', `<style>${readFileSync('dist/components.css', 'utf8')}</style>
<body>${cases.map((c, i) => `<div id="c${i}" class="${c.cls}"${
  c.attrs.map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>x</div>`).join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await browser.newContext()).newPage();
await p.goto('file:///home/user/ds/tmp-skill-classes.html');
const matches = await p.evaluate(n => [...Array(n).keys()].map(i => {
  const el = document.getElementById('c' + i);
  let count = 0;
  for (const sheet of document.styleSheets)
    for (const r of sheet.cssRules)
      if (r.selectorText && el.matches(r.selectorText)) count++;
  return count;
}), cases.length);
await browser.close();
unlinkSync('tmp-skill-classes.html');

cases.forEach((c, i) => {
  if (matches[i] === 0)
    problems.push(`${c.component} — ${c.variant}: the documented spelling selects no rule at all`);
  else if (c.hasColour && matches[i] < 2)
    problems.push(`${c.component} — ${c.variant}: binds colours in Figma but only the base rule matches`);
});

// Counts quoted in prose go stale the moment the extract grows, and a stale count is a
// quiet lie about how much of Figma is covered. Check them the same way as everything else.
const nComponents = new Set(variants.map(r => r.component)).size;
const nVariants = variants.length;
for (const f of ['.claude/skills/people-first/SKILL.md', '.claude/skills/pf-screen/SKILL.md', 'README.md']) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  for (const m of text.matchAll(/(\d+) components(?:,| and) (\d+) variants/g)) {
    if (+m[1] !== nComponents || +m[2] !== nVariants)
      problems.push(`${f}: says "${m[0]}", the extract has ${nComponents} components and ${nVariants} variants`);
  }
}

for (const p of problems) console.log('FAIL ' + p);
console.log(`\n${documented.size} classes documented, ${cases.length} real variants checked, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
