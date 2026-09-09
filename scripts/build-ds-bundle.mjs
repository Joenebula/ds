#!/usr/bin/env node
// Builds ds-bundle/ — self-contained preview pages for the claude.ai/design
// Design System pane. Each carries a first-line @dsCard marker so the pane
// indexes it. Tokens are inlined because the pane renders these standalone.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';

const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));
const tokensCss = readFileSync('dist/tokens.css', 'utf8');
// The component and type layers, and the extracts they are generated from. Before this,
// the component pages here hand-wrote their own approximations of People First — the
// buttons carried border-radius: var(--pf-radius-small), which is 4px, on a system whose
// buttons are pills. The Design System pane is the surface people generate designs from,
// so a wrong shape here propagates into everything made with it.
const componentsCss = readFileSync('dist/components.css', 'utf8');
const typeCss = readFileSync('dist/type.css', 'utf8');
const tsv = (f) => {
  const [h, ...rows] = readFileSync(f, 'utf8').trim().split('\n');
  const k = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [k[i], v ?? ''])));
};
const variants = tsv('tokens/_raw/component-variants.tsv');
const geometry = new Map(tsv('tokens/_raw/component-geometry.tsv').map(r => [r.component, r]));
const textStyles = tsv('tokens/_raw/text-styles.tsv');
const kebab = x => x.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// components.css is emitted as one commented block per component. Splitting on those
// headers lets each preview page carry only the rules it actually uses — otherwise every
// one of the 18 pages inlines the whole 95 KB stylesheet to show a handful of specimens.
const cssBlocks = new Map();
for (const block of componentsCss.split(/\n(?=\/\* )/)) {
  const name = (block.match(/^\/\* ([^\n*]+?)(?:\s{2,}\(no geometry|\n)/) || [])[1];
  if (name) cssBlocks.set(name.trim(), block);
}
const cssFor = (names) => [...names].map(n => cssBlocks.get(n)).filter(Boolean).join('\n');
const ext = n => n.$extensions['com.mhr.pf'];
const collect = (n, acc = []) => {
  if (n && typeof n === 'object') { if (n.$type) acc.push(n); else Object.values(n).forEach(v => collect(v, acc)); }
  return acc;
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const shell = ({ group, name, subtitle, body, css }) => `<!-- @dsCard group="${group}" name="${name}" -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} — People First</title>
<style>
${tokensCss}
${css === undefined ? componentsCss + typeCss : css}
* { box-sizing: border-box; }
body { margin: 0; padding: var(--pf-space-large); background: var(--pf-bg-primary);
       color: var(--pf-text-primary); font-family: var(--pf-font-body);
       font-size: var(--pf-font-size-s); }
h1 { font-size: var(--pf-font-size-m); margin: 0 0 4px; font-weight: var(--pf-font-weight-bold); }
.sub { color: var(--pf-text-secondary); font-size: var(--pf-font-size-xs);
       margin: 0 0 var(--pf-space-large); }
h2 { font-size: var(--pf-font-size-xs); text-transform: uppercase; letter-spacing: .06em;
     color: var(--pf-text-secondary); margin: var(--pf-space-large) 0 var(--pf-space-small); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--pf-space-small); }
.sw { border: 1px solid var(--pf-border-default); border-radius: var(--pf-radius-small);
      overflow: hidden; background: var(--pf-bg-primary); }
.sw .c { height: 52px; }
.sw .m { padding: 8px; display: flex; flex-direction: column; gap: 2px; }
.sw code { font-family: ui-monospace, Menlo, monospace; font-size: 11px; word-break: break-all; }
.sw .f { font-size: 10px; color: var(--pf-text-secondary); }
.row { display: flex; gap: var(--pf-space-small); flex-wrap: wrap; align-items: center; }
table { width: 100%; border-collapse: collapse; }
th { background: var(--pf-table-header-cell); text-align: left; padding: var(--pf-space-small);
     font-size: var(--pf-font-size-xs); text-transform: uppercase; letter-spacing: .05em; }
td { padding: var(--pf-space-small); border-top: 1px solid var(--pf-table-border); }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--pf-text-secondary); }
</style>
</head>
<body>
<h1>${esc(name)}</h1>
<p class="sub">${esc(subtitle)}</p>
${body}
</body>
</html>
`;

const swatches = list => `<div class="grid">${list.map(n => {
  const e = ext(n);
  return `<div class="sw"><div class="c" style="background:var(${e.cssVar})"></div>
    <div class="m"><code>${e.cssVar}</code><span class="f">${esc(e.figmaName)}</span></div></div>`;
}).join('')}</div>`;

const byGroup = {};
for (const n of collect(t.color.semantic)) (byGroup[ext(n).figmaName.split('/')[0]] ??= []).push(n);

const TAGS = ['positive', 'negative', 'warning', 'neutral', 'info', 'other', 'expired'];
const files = {};

files['foundations/colour-semantic.html'] = shell({
  group: 'Foundations', name: 'Semantic colour',
  subtitle: '96 semantic tokens. Each resolves differently in light and dark mode — always use these, never primitives.',
  body: Object.entries(byGroup).map(([g, l]) => `<h2>${esc(g)}</h2>${swatches(l)}`).join('\n')
});

files['foundations/colour-primitive.html'] = shell({
  group: 'Foundations', name: 'Primitive colour',
  subtitle: 'The raw palette. Reference only — these do not change between modes, so using them directly breaks dark mode.',
  body: `<h2>Base colours</h2>${swatches(collect(t.color.base))}
         <h2>Theme colours</h2>${swatches(collect(t.color.theme))}`
});

files['foundations/typography.html'] = shell({
  group: 'Foundations', name: 'Typography',
  subtitle: 'Open Sans, weights 400 and 600. Body and labels carry -1% letter-spacing; headings 0.',
  body: `<table><thead><tr><th>Token</th><th>Size</th><th>Sample</th></tr></thead><tbody>
    ${collect(t.fontSize).sort((a, b) => parseInt(b.$value) - parseInt(a.$value)).map(n =>
      `<tr><td class="mono">${ext(n).cssVar}</td><td class="mono">${n.$value}</td>
       <td style="font-size:var(${ext(n).cssVar})">People First</td></tr>`).join('')}
    ${collect(t.fontWeight).map(n =>
      `<tr><td class="mono">${ext(n).cssVar}</td><td class="mono">${n.$value}</td>
       <td style="font-weight:var(${ext(n).cssVar})">People First</td></tr>`).join('')}
  </tbody></table>`
});

files['foundations/spacing.html'] = shell({
  group: 'Foundations', name: 'Spacing & radius',
  subtitle: '5px base scale. Do not introduce intermediate values — if a gap needs 12px, use 10 or 15.',
  body: `<table><thead><tr><th>Token</th><th>Value</th><th>Scale</th></tr></thead><tbody>
    ${collect(t.space).sort((a, b) => parseInt(a.$value) - parseInt(b.$value)).map(n =>
      `<tr><td class="mono">${ext(n).cssVar}</td><td class="mono">${n.$value}</td>
       <td><div style="height:12px;border-radius:2px;background:var(--pf-bg-theme-full);width:var(${ext(n).cssVar})"></div></td></tr>`).join('')}
    ${collect(t.radius).map(n =>
      `<tr><td class="mono">${ext(n).cssVar}</td><td class="mono">${n.$value}</td>
       <td><div style="width:44px;height:26px;background:var(--pf-bg-theme-full);border-radius:var(${ext(n).cssVar})"></div></td></tr>`).join('')}
    ${collect(t.iconSize).filter(n => parseInt(n.$value) > 0).sort((a, b) => parseInt(a.$value) - parseInt(b.$value)).map(n =>
      `<tr><td class="mono">${ext(n).cssVar}</td><td class="mono">${n.$value}</td>
       <td><div style="background:var(--pf-icon-primary);border-radius:2px;width:var(${ext(n).cssVar});height:var(${ext(n).cssVar})"></div></td></tr>`).join('')}
  </tbody></table>`
});

files['foundations/elevation.html'] = shell({
  group: 'Foundations', name: 'Elevation',
  subtitle: 'Two shadows only. There is no elevation ramp — do not invent one.',
  body: `<div class="row" style="gap:var(--pf-space-xlarge);padding:var(--pf-space-large) 0">
    ${collect(t.shadow).map(n => `<div style="background:var(--pf-bg-primary);padding:var(--pf-space-large);
      border-radius:var(--pf-radius-medium);box-shadow:var(${ext(n).cssVar})">
      <code class="mono">${ext(n).cssVar}</code></div>`).join('')}</div>`
});

// ---- component pages, generated from the extracts --------------------------
// One page per Figma page, every captured component and variant, rendered with the real
// dist/components.css. Nothing here is hand-written, so the pane cannot show a shape the
// library does not actually produce — which is exactly what it was doing before.
const SAMPLE = {
  'Button': 'Save', 'Filter chip': 'Absence type', 'Tags': 'Approved',
  'Links': 'View details', 'Field': 'Jane Okafor', 'Form field': 'Manager',
  'Option': 'Annual leave', 'Checkbox/Radio item': 'Include leavers',
  'Table cell (AG)': 'Jane Okafor', 'Table header (AG)': 'Employee',
  'Toast message': 'Request approved', 'Counter': '3', 'Navigation item': 'People',
  'Side navigation tab': 'Absence', 'Primary search': 'Search people',
  'Status': 'Pending', 'Clock in': 'Clock in', 'AI button': 'Ask AI',
  'Information box': 'Absence approved and added to the calendar.',
};
const TAG_FOR = { 'Button': 'button', 'Filter chip': 'button', 'AI button': 'button',
                  'Clock in': 'button', 'Links': 'a', 'Action menu button': 'button' };

const byPage = new Map();
for (const r of variants) {
  if (!byPage.has(r.page)) byPage.set(r.page, new Map());
  const m = byPage.get(r.page);
  if (!m.has(r.component)) m.set(r.component, []);
  m.get(r.component).push(r);
}

for (const [page, comps] of [...byPage.entries()].sort()) {
  const parts = [];
  for (const [component, rows] of [...comps.entries()].sort()) {
    const base = 'pf-' + kebab(component);
    const el = TAG_FOR[component] || 'div';
    const label = SAMPLE[component] || component;
    const g = geometry.get(component);
    parts.push(`<h2>${esc(component)}</h2>`);
    parts.push(`<p class="sub">.${base}${g ? '  ·  ' + esc(g.size) : ''}  ·  ${rows.length} variant${rows.length === 1 ? '' : 's'}</p>`);
    parts.push('<div class="row" style="flex-wrap:wrap;gap:14px;align-items:flex-start">');
    for (const r of rows) {
      const attrs = r.variant.split(',').map(x => x.trim()).filter(Boolean).map(x => {
        const i = x.indexOf('=');
        return i < 0 ? '' : ` data-${kebab(x.slice(0, i))}="${esc(x.slice(i + 1).trim())}"`;
      }).join('');
      parts.push(`<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
        <${el} class="${base}"${attrs}>${esc(label)}</${el}>
        <span class="mono" style="font-size:10px;color:var(--pf-text-secondary)">${esc(r.variant) || 'default'}</span>
      </div>`);
    }
    parts.push('</div>');
  }
  files[`components/${kebab(page)}.html`] = shell({
    css: cssFor(comps.keys()),
    group: 'Components', name: page,
    subtitle: `${comps.size} component${comps.size === 1 ? '' : 's'} from the ${page} page in Figma, rendered with dist/components.css. Class names mirror Figma's variant panel: the component is the class, each variant property is a data attribute.`,
    body: parts.join('\n'),
  });
}

// Type gets its own card: it is what every screen touches.
files['foundations/type-classes.html'] = shell({
  css: typeCss,
  group: 'Foundations', name: 'Type classes',
  subtitle: 'One class per Figma text style. Colour is deliberately not set — pair a type class with a --pf-text-* token. Every style uses Figma automatic line height, so `normal` is the faithful value.',
  body: (() => {
    const classes = [...typeCss.matchAll(/^\.(pf-text-[a-z0-9-]+) \{/gm)].map(m => m[1]);
    return textStyles.map((ts, i) => `<div style="margin-bottom:12px">
      <div class="${classes[i] || ''}">${esc(ts.name.replace(/^\w+ text\//, ''))}</div>
      <span class="mono" style="font-size:10px;color:var(--pf-text-secondary)">.${classes[i]}  ·  ${esc(ts.size)}px  ·  ${ts.weight ? esc(ts.weight) : 'no weight set in Figma'}</span>
    </div>`).join('\n');
  })(),
});

// Clear the output first. The page set is derived from Figma, so it changes when Figma
// does; without this, a page that is no longer generated lingers on disk and the Design
// System pane indexes it alongside the real one. Three hand-written pages from the
// previous generator were doing exactly that.
for (const d of ['ds-bundle/foundations', 'ds-bundle/components'])
  if (existsSync(d)) rmSync(d, { recursive: true });
mkdirSync('ds-bundle/foundations', { recursive: true });
mkdirSync('ds-bundle/components', { recursive: true });
let total = 0;
for (const [p, html] of Object.entries(files)) { writeFileSync(`ds-bundle/${p}`, html); total += html.length; }
console.log(`ds-bundle: ${Object.keys(files).length} preview pages, ${(total / 1024).toFixed(0)} KB total`);
for (const p of Object.keys(files)) console.log('  ' + p);
