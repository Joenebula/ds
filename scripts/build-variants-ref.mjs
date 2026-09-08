#!/usr/bin/env node
// Builds .claude/skills/people-first/references/variants.md — every component
// variant with its token bindings, translated from Figma names to CSS vars,
// so a prototype can render any named variant correctly.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));

// Figma variable name -> CSS var
const cssVarFor = new Map();
(function walk(n) {
  if (n && typeof n === 'object') {
    if (n.$type) {
      const e = n.$extensions?.['com.mhr.pf'];
      if (e?.figmaName && e?.cssVar) cssVarFor.set(e.figmaName, e.cssVar);
    } else Object.values(n).forEach(walk);
  }
})(t);

const rows = readFileSync('tokens/_raw/component-variants.tsv', 'utf8')
  .trim().split('\n').slice(1)
  .map(l => {
    const [page, component, variant, fill, stroke, text] = l.split('\t');
    return { page, component, variant, fill: fill || '', stroke: stroke || '', text: text || '' };
  });

const unmapped = new Set();
const v = name => {
  if (!name) return '—';
  return name.split(',').map(n => {
    n = n.trim();
    const c = cssVarFor.get(n);
    if (!c) { unmapped.add(n); return `\`${n}\` ⚠️`; }
    return `\`var(${c})\``;
  }).join(' + ');
};

// group: page -> component -> rows
const byPage = new Map();
for (const r of rows) {
  if (!byPage.has(r.page)) byPage.set(r.page, new Map());
  const comps = byPage.get(r.page);
  if (!comps.has(r.component)) comps.set(r.component, []);
  comps.get(r.component).push(r);
}

let md = `# Component variants

Every variant below is taken from the Figma component sets, with the exact
variables each variant binds — translated to CSS custom properties.

**How to use this.** When a prototype needs a component in a particular state,
find it here and apply the three bindings: background \`fill\`, border \`stroke\`,
and \`color\` from text. A dash means the variant binds nothing for that slot
(inherit, or the component draws it another way). Every value is mode-aware, so
light and dark both work without extra effort.

Bindings are per-variant, not guessed from the component name — e.g. the Action
button uses \`--pf-text-inverted-primary\`, NOT white, because that is what the
Figma component actually binds.

`;

const pageOrder = ['Buttons and links', 'Forms', 'Controls', 'Tables',
  'Tags and ratings', 'System messages', 'Navigation', 'Cards and panels', 'AI'];
const pages = [...byPage.keys()].sort((a, b) => {
  const ia = pageOrder.indexOf(a), ib = pageOrder.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});

let componentCount = 0;
for (const page of pages) {
  md += `\n## ${page}\n`;
  for (const [comp, list] of byPage.get(page)) {
    componentCount++;
    md += `\n### ${comp}\n\n`;
    md += `| Variant | Background | Border | Text |\n|---|---|---|---|\n`;
    for (const r of list) {
      md += `| ${r.variant} | ${v(r.fill)} | ${v(r.stroke)} | ${v(r.text)} |\n`;
    }
  }
}

md += `\n## Notes and quirks

Carried through from Figma rather than silently corrected:

- **\`Tags\` Type=Theme binds \`Tags/Borders/Info\` for its text**, where every
  other tag type binds a \`Tags/Content/*\` token. That looks like a mis-binding
  in Figma — use \`var(--pf-tag-content-info)\` for tag text and flag it upstream.
- **\`Toast message\` hardcodes \`Base colours/White\` and \`Base colours/Grey Slate\`**
  rather than semantic tokens, so toasts stay light in dark mode. If that is
  deliberate (toasts as a fixed-light surface) it is fine; if not, it is a
  dark-mode gap.
- **\`Button\` Type=Action binds \`Text/Inverted primary\`, not white.** This
  matters: white on the dark-mode Action fill would fail contrast, the inverted
  token does not.
- **\`AI\` components bind \`Base colours/Default Pink\` directly** instead of
  \`Text/Theme\`, so they do not flip in dark mode.
- Several sets carry \`Darkmode=True/False\` as an explicit variant axis. Ignore
  it when building — the CSS tokens handle dark mode automatically. It exists in
  Figma only because Figma cannot show both modes in one frame.
`;

mkdirSync('.claude/skills/people-first/references', { recursive: true });
writeFileSync('.claude/skills/people-first/references/variants.md', md);

console.log(`variants.md written — ${componentCount} components, ${rows.length} variants, ${pages.length} pages`);
if (unmapped.size) console.log('unmapped token names:', [...unmapped].join(', '));
