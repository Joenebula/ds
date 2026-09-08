#!/usr/bin/env node
// Builds ds-bundle/ — self-contained preview pages for the claude.ai/design
// Design System pane. Each carries a first-line @dsCard marker so the pane
// indexes it. Tokens are inlined because the pane renders these standalone.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));
const tokensCss = readFileSync('dist/tokens.css', 'utf8');
const ext = n => n.$extensions['com.mhr.pf'];
const collect = (n, acc = []) => {
  if (n && typeof n === 'object') { if (n.$type) acc.push(n); else Object.values(n).forEach(v => collect(v, acc)); }
  return acc;
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const shell = ({ group, name, subtitle, body }) => `<!-- @dsCard group="${group}" name="${name}" -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} — People First</title>
<style>
${tokensCss}
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

files['components/buttons.html'] = shell({
  group: 'Components', name: 'Buttons',
  subtitle: 'Action is the default. Positive confirms, Negative destroys, Hollow is secondary. Pink is brand — never a button.',
  body: `<div class="row">
    <button style="font-family:inherit;font-weight:var(--pf-font-weight-bold);font-size:var(--pf-font-size-s);padding:var(--pf-space-small) var(--pf-space-large);border-radius:var(--pf-radius-small);border:none;cursor:pointer;background:var(--pf-bg-secondary-button);color:var(--pf-text-inverted-primary)">Action</button>
    <button style="font-family:inherit;font-weight:var(--pf-font-weight-bold);font-size:var(--pf-font-size-s);padding:var(--pf-space-small) var(--pf-space-large);border-radius:var(--pf-radius-small);border:none;cursor:pointer;background:var(--pf-bg-primary-button);color:var(--pf-text-always-white)">Positive</button>
    <button style="font-family:inherit;font-weight:var(--pf-font-weight-bold);font-size:var(--pf-font-size-s);padding:var(--pf-space-small) var(--pf-space-large);border-radius:var(--pf-radius-small);border:none;cursor:pointer;background:var(--pf-bg-negative-button);color:var(--pf-text-always-white)">Negative</button>
    <button style="font-family:inherit;font-weight:var(--pf-font-weight-bold);font-size:var(--pf-font-size-s);padding:var(--pf-space-small) var(--pf-space-large);border-radius:var(--pf-radius-small);cursor:pointer;background:transparent;color:var(--pf-text-primary);border:1px solid var(--pf-border-hollow-button)">Hollow</button>
  </div>
  <h2>Hover fills</h2>
  <table><tbody>
    <tr><td class="mono">--pf-bg-secondary-button-hover</td><td><div style="width:80px;height:24px;border-radius:var(--pf-radius-small);background:var(--pf-bg-secondary-button-hover)"></div></td></tr>
    <tr><td class="mono">--pf-bg-primary-button-hover</td><td><div style="width:80px;height:24px;border-radius:var(--pf-radius-small);background:var(--pf-bg-primary-button-hover)"></div></td></tr>
    <tr><td class="mono">--pf-bg-negative-button-hover</td><td><div style="width:80px;height:24px;border-radius:var(--pf-radius-small);background:var(--pf-bg-negative-button-hover)"></div></td></tr>
    <tr><td class="mono">--pf-button-fill-hollow-hover</td><td><div style="width:80px;height:24px;border-radius:var(--pf-radius-small);background:var(--pf-button-fill-hollow-hover)"></div></td></tr>
  </tbody></table>`
});

files['components/tags.html'] = shell({
  group: 'Components', name: 'Tags',
  subtitle: 'Seven statuses. Always take fill, border and content from the same status — never mix.',
  body: `<div class="row">${TAGS.map(s =>
    `<span style="font-size:var(--pf-font-size-xs);text-transform:uppercase;letter-spacing:-.01em;border-radius:var(--pf-radius-small);padding:2px 10px;border:1px solid;background:var(--pf-tag-fill-${s});border-color:var(--pf-tag-border-${s});color:var(--pf-tag-content-${s})">${s}</span>`).join('')}</div>`
});

files['components/tables.html'] = shell({
  group: 'Components', name: 'Tables',
  subtitle: 'Tables have dedicated surface tokens — do not substitute --pf-bg-* for them.',
  body: `<table style="background:var(--pf-table-card)">
    <thead><tr><th>Name</th><th>Team</th><th>Status</th></tr></thead>
    <tbody>
      <tr style="background:var(--pf-table-primary-cell)"><td>Row one</td><td>People Ops</td><td><span style="font-size:var(--pf-font-size-xs);text-transform:uppercase;border-radius:var(--pf-radius-small);padding:2px 10px;border:1px solid;background:var(--pf-tag-fill-positive);border-color:var(--pf-tag-border-positive);color:var(--pf-tag-content-positive)">active</span></td></tr>
      <tr style="background:var(--pf-table-stripe-cell)"><td>Row two</td><td>Payroll</td><td><span style="font-size:var(--pf-font-size-xs);text-transform:uppercase;border-radius:var(--pf-radius-small);padding:2px 10px;border:1px solid;background:var(--pf-tag-fill-warning);border-color:var(--pf-tag-border-warning);color:var(--pf-tag-content-warning)">pending</span></td></tr>
      <tr style="background:var(--pf-table-primary-cell)"><td>Row three</td><td>Talent</td><td><span style="font-size:var(--pf-font-size-xs);text-transform:uppercase;border-radius:var(--pf-radius-small);padding:2px 10px;border:1px solid;background:var(--pf-tag-fill-expired);border-color:var(--pf-tag-border-expired);color:var(--pf-tag-content-expired)">expired</span></td></tr>
    </tbody></table>`
});

files['components/forms.html'] = shell({
  group: 'Components', name: 'Form inputs',
  subtitle: '--pf-border-form-input is the one border token identical in both modes.',
  body: `<div style="display:flex;flex-direction:column;gap:var(--pf-space-large);max-width:340px">
    <label style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:var(--pf-font-size-xs)">Full name <span style="color:var(--pf-icon-required-field)">*</span></span>
      <input value="Ada Lovelace" style="font-family:inherit;background:var(--pf-bg-primary);color:var(--pf-text-primary);border:1px solid var(--pf-border-form-input);border-radius:var(--pf-radius-small);padding:var(--pf-space-small);font-size:var(--pf-font-size-s)">
    </label>
    <label style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:var(--pf-font-size-xs)">Email</span>
      <input value="not-an-email" aria-invalid="true" style="font-family:inherit;background:var(--pf-bg-primary);color:var(--pf-text-primary);border:1px solid var(--pf-border-negative);border-radius:var(--pf-radius-small);padding:var(--pf-space-small);font-size:var(--pf-font-size-s)">
      <span style="font-size:var(--pf-font-size-xs);color:var(--pf-text-negative)">Enter a valid email address</span>
    </label>
    <label style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:var(--pf-font-size-xs);color:var(--pf-text-disabled)">Employee ID</span>
      <input value="Locked" disabled style="font-family:inherit;background:var(--pf-bg-secondary);color:var(--pf-text-disabled);border:1px solid var(--pf-border-disabled);border-radius:var(--pf-radius-small);padding:var(--pf-space-small);font-size:var(--pf-font-size-s)">
    </label>
  </div>`
});

files['components/chips.html'] = shell({
  group: 'Components', name: 'Filter chips',
  subtitle: 'Selected and hover both take the theme border and theme text; hover adds the soft theme fill.',
  body: `<div class="row">
    <span style="background:var(--pf-bg-primary);color:var(--pf-text-primary);border:1px solid var(--pf-border-hollow-button);border-radius:var(--pf-radius-medium);padding:var(--pf-space-xsmall) var(--pf-space-small);font-size:var(--pf-font-size-xs)">Default</span>
    <span style="background:var(--pf-bg-primary);color:var(--pf-text-theme);border:1px solid var(--pf-border-theme);border-radius:var(--pf-radius-medium);padding:var(--pf-space-xsmall) var(--pf-space-small);font-size:var(--pf-font-size-xs)">Selected</span>
    <span style="background:var(--pf-bg-theme);color:var(--pf-text-theme);border:1px solid var(--pf-border-theme);border-radius:var(--pf-radius-medium);padding:var(--pf-space-xsmall) var(--pf-space-small);font-size:var(--pf-font-size-xs)">Hover</span>
  </div>`
});

files['components/charts.html'] = shell({
  group: 'Components', name: 'Chart palette',
  subtitle: 'Ten categorical colours, mode-stable. Use in sequence — reordering makes a series change colour between screens.',
  body: `<div style="display:flex;height:56px;border-radius:var(--pf-radius-small);overflow:hidden">
    ${Array.from({ length: 10 }, (_, i) => `<div style="flex:1;background:var(--pf-chart-${i + 1})"></div>`).join('')}</div>
  <h2>AI gradient</h2>
  <p class="sub">Reserved for AI features — not ordinary decoration.</p>
  <div style="height:56px;border-radius:var(--pf-radius-small);background:var(--pf-gradient-ai-gradient)"></div>`
});

mkdirSync('ds-bundle/foundations', { recursive: true });
mkdirSync('ds-bundle/components', { recursive: true });
let total = 0;
for (const [p, html] of Object.entries(files)) { writeFileSync(`ds-bundle/${p}`, html); total += html.length; }
console.log(`ds-bundle: ${Object.keys(files).length} preview pages, ${(total / 1024).toFixed(0)} KB total`);
for (const p of Object.keys(files)) console.log('  ' + p);
