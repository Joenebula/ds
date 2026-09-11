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
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
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

// ---- 3. the FIGURES the skills quote ---------------------------------------
//
// This check exists because documentation that is wrong reads as authoritative and fails
// silently. A stale NUMBER does that just as well as a wrong class name, and this project
// has shipped several: the people-first skill said "139 of the 172 components are in the
// stylesheet" and listed `Tooltip`, `Menu`, `Stars`, `Field icons` and `Component 1` as
// missing, months after all five were captured; pf-screen said 147.
//
// THREE counts of "how many components", all true, none interchangeable:
//
//   160  distinct CLASSES in dist/components.css — 147 with colour bindings (302 variants
//        between them) plus 13 the stylesheet carries as shape only, because Figma binds
//        them no colour variable at all.
//   162  non-icon component ROWS those classes cover. Higher than 160 because three names
//        are each shared by two different Figma components — `Header`, `Field` and
//        `People`, written up in FIGMA-ISSUES.md section 10 — so one class serves both.
//   187  non-icon components in the file, leaving 25 with no class, all of them on the
//        documentation pages.
//
// The first version of this check reported 162 as "components with a class" and disagreed
// with the gallery's 160 — the collision bug reproducing inside the check written to stop
// figures diverging. So the two derivations are now cross-checked against each other
// below: a count nothing corroborates is how this started.
const classes = new Set([...readFileSync('dist/components.css', 'utf8')
  .matchAll(/^\.(pf-[a-z0-9-]+)/gm)].map(m => m[1]));
const nonIcon = JSON.parse(readFileSync('tokens/_raw/components.json', 'utf8'))
  .filter(c => (c.pageName || '').trim() !== 'Icons');
const coveredRows = nonIcon.filter(c => classes.has('pf-' + kebab(c.name)));
const uncovered = nonIcon.length - coveredRows.length;
const sharedNames = [...coveredRows.reduce((m, c) => {
  const k = 'pf-' + kebab(c.name); return m.set(k, (m.get(k) || 0) + 1);
}, new Map())].filter(([, n]) => n > 1).map(([k]) => k);
const templateCount = readdirSync('dist/templates').filter(f => f.endsWith('.html')).length;

// The two derivations must reconcile exactly, or one of them is measuring the wrong thing.
// `pf-circle-icons` is the one class whose component lives on the Icons page, which the
// non-icon list deliberately excludes.
const iconPageClasses = classes.size - new Set(coveredRows.map(c => 'pf-' + kebab(c.name))).size;
if (coveredRows.length - sharedNames.length + iconPageClasses !== classes.size)
  problems.push(`the two component counts do not reconcile: ${classes.size} classes vs `
    + `${coveredRows.length} covered rows with ${sharedNames.length} shared names `
    + `and ${iconPageClasses} on the Icons page`);

// CLAUDE.md and README.md carry the same figures and drifted the same way — README said
// "147 components ... plus 12 shape-only" and CLAUDE.md still quoted a shell count of 2
// and a prototype-coverage denominator of 147. Nothing was checking either, so they are
// checked here with the skills rather than left as the one documentation nobody verifies.
const docs = [
  ...['people-first', 'pf-screen', 'pf-handoff']
    .map(n => [n, readFileSync(`.claude/skills/${n}/SKILL.md`, 'utf8')]),
  ['CLAUDE.md', readFileSync('CLAUDE.md', 'utf8')],
  ['README.md', readFileSync('README.md', 'utf8')],
];

// Figures only these two quote.
const shapeOnly = classes.size - nComponents;
const DOC_PAGE = /WIKI|STYLE GUIDE|DOCUMENT MANAGEMENT/;
const productPage = nonIcon.filter(c => !DOC_PAGE.test(c.pageName || ''));
const treeNames = new Set(readFileSync('tokens/_raw/component-tree.tsv', 'utf8')
  .trim().split('\n').slice(1).map(l => l.split('\t')[0]));
const walked = productPage.filter(c => treeNames.has(c.name)).length;

const figures = [
  ['templates', templateCount, /\b(\d+) (?:composite components have one|of them render NOTHING|rendered, light and dark)/g],
  ['templates', templateCount, /all (\d+) rendered/g],
  ['templates', templateCount, /all (\d+) of them\*\*, which is exactly why/g],
  ['templates', templateCount, /and (\d+) have templates/g],
  ['classes in the stylesheet', classes.size, /carries \*\*(\d+) classes\*\*/g],
  ['classes in the stylesheet', classes.size, /- \*\*(\d+) classes\.\*\*/g],
  ['classes in the stylesheet', classes.size, /carries (\d+) classes, generated from Figma/g],
  ['classes in the stylesheet', classes.size, /\*\*(\d+) classes\./g],
  ['classes in the stylesheet', classes.size, /\d+ of the (\d+) classes are never used/g],
  ['components covered by a class', coveredRows.length, /cover (\d+) of the \d+ non-icon Figma/g],
  ['components covered by a class', coveredRows.length, /- \*\*(\d+) components covered\*\*/g],
  ['non-icon components', nonIcon.length, /cover \d+ of the (\d+) non-icon Figma/g],
  ['non-icon components', nonIcon.length, /- \*\*(\d+) non-icon components\*\* in the file/g],
  ['components with no class', uncovered, /The (\d+) with no class are listed/g],
  ['components with no class', uncovered, /All (\d+)\s*\n?are documentation/g],
  ['colour-bound components', nComponents, /(\d+) of them carry colour variants/g],
  ['colour-bound components', nComponents, /(\d+) components and \d+\s+variants with colour bindings/g],
  ['colour-bound components', nComponents, /\*\*(\d+) components and \d+ variants\*\*/g],
  ['colour-bound components', nComponents, /(\d+) components with \d+ colour variants/g],
  ['variants', nVariants, /\d+ components and (\d+)\s+variants with colour bindings/g],
  ['variants', nVariants, /\*\*\d+ components and (\d+) variants\*\*/g],
  ['variants', nVariants, /\d+ components with (\d+) colour variants/g],
  ['variants', nVariants, /carry colour variants \((\d+) in all\)/g],
  ['shape-only classes', shapeOnly, /plus (\d+) shape-only/g],
  // Caught by reading the skill, not by this check: it said "plus **12 more that ship as
  // shape only**" and every pattern here missed that wording. The same figure is phrased
  // four different ways across three files, which is why each phrasing needs its own line
  // and why the match-at-least-once guard above matters more than the comparison does.
  ['shape-only classes', shapeOnly, /plus \*\*(\d+) more that ship as shape only\*\*/g],
  ['shape-only classes', shapeOnly, /the other (\d+) are\s*\n?\s*\*\*shape-only\*\*/g],
  ['shape-only classes', shapeOnly, /plus (\d+) the extract carries as shape only/g],
  ['product-page components walked', walked, /\*\*Coverage: (\d+) of the \d+ product-page/g],
  ['product-page components', productPage.length, /Coverage: \d+ of the (\d+) product-page/g],
];
// A PATTERN THAT MATCHES NOTHING PASSES VACUOUSLY, which is the "check that cannot fail"
// fault this project has found in itself three times — check-icon-fidelity reporting
// "0 of 0 ... 0 are not" on a page with no icons, pf-audit printing PASS for an axis it
// never looked at, the shell census counting rules instead of classes. So each pattern
// must match at least once: if a sentence is reworded, the figure stops being checked, and
// silence is exactly how these drift.
let matched = 0;
for (const [what, actual, re] of figures) {
  let hits = 0;
  for (const [name, text] of docs)
    for (const m of text.matchAll(re)) {
      hits++;
      if (Number(m[1]) !== actual)
        problems.push(`${name} says ${m[1]} ${what}; the build says ${actual} — "${m[0].replace(/\s+/g, ' ').trim()}"`);
    }
  if (!hits) problems.push(`nothing matches the pattern for "${what}" (${re.source}) — the `
    + `sentence it checked has been reworded, so that figure is no longer verified`);
  matched += hits;
}

console.log(`${matched} figure(s) in the docs checked — ${classes.size} classes (${nComponents} colour-bound, `
  + `${nVariants} variants) covering ${coveredRows.length} of ${nonIcon.length} non-icon `
  + `components, ${uncovered} with none, ${templateCount} templates`);

for (const p of problems) console.log('FAIL ' + p);
console.log(`\n${documented.size} classes documented, ${cases.length} real variants checked, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
