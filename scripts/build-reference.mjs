#!/usr/bin/env node
// Generates reference/index.html — a visual proof sheet of every token, in both modes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

// OUTPUT PATH IS OVERRIDABLE so a gate can rebuild this into a temp directory and byte-compare
// it against what is committed, the way verify-built.mjs already does for the screens. The
// default is unchanged, so every existing caller behaves exactly as before.
const OUT = process.argv[2] || 'reference/index.html';

const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));
const css = readFileSync('dist/tokens.css', 'utf8');
const contrast = JSON.parse(execSync('node scripts/check-contrast.mjs --json').toString());

const ext = n => n.$extensions['com.mhr.pf'];
const collect = (node, acc = []) => {
  if (node && typeof node === 'object') {
    if (node.$type) acc.push(node); else Object.values(node).forEach(v => collect(v, acc));
  }
  return acc;
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const swatch = n => {
  const e = ext(n);
  return `<div class="sw"><div class="chip" style="background:var(${e.cssVar})"></div>
    <code>${e.cssVar}</code><span>${esc(e.figmaName)}</span></div>`;
};

const semanticGroups = {};
for (const n of collect(t.color.semantic)) {
  const g = ext(n).figmaName.split('/')[0];
  (semanticGroups[g] ??= []).push(n);
}

const scaleRow = (n, render) => {
  const e = ext(n);
  return `<tr><td><code>${e.cssVar}</code></td><td class="num">${esc(n.$value)}</td><td>${render(e)}</td></tr>`;
};

const contrastRows = contrast.map(r =>
  `<tr class="${r.verdict === 'AA' ? '' : 'warn'}"><td>${r.mode}</td><td>${esc(r.label)}</td>
   <td class="num">${r.ratio}</td><td><span class="verdict ${r.verdict === 'AA' ? 'ok' : 'no'}">${r.verdict}</span></td>
   <td><span class="mini" style="background:${r.bgHex};color:${r.fgHex}">Aa</span> <code>${esc(r.fg)}</code> on <code>${esc(r.bg)}</code></td></tr>`).join('\n');

const tagStatuses = ['positive', 'negative', 'warning', 'neutral', 'info', 'other', 'expired'];

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>People First — Token Reference</title>
<style>
${css}
* { box-sizing: border-box; }
body { margin:0; font-family: var(--pf-font-body); background: var(--pf-bg-secondary);
       color: var(--pf-text-primary); font-size: var(--pf-font-size-s); }
header { position:sticky; top:0; z-index:10; background: var(--pf-bg-primary);
         border-bottom:1px solid var(--pf-border-default); padding: var(--pf-space-large);
         display:flex; align-items:center; gap: var(--pf-space-large); flex-wrap:wrap; }
h1 { font-size: var(--pf-font-size-l); margin:0; font-weight: var(--pf-font-weight-bold); }
h2 { font-size: var(--pf-font-size-m); margin: var(--pf-space-xlarge) 0 var(--pf-space-small); }
h3 { font-size: var(--pf-font-size-s); margin: var(--pf-space-large) 0 var(--pf-space-small);
     color: var(--pf-text-secondary); text-transform:uppercase; letter-spacing:.06em; }
main { padding: 0 var(--pf-space-large) var(--pf-space-xlarge); max-width:1200px; margin:0 auto; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap: var(--pf-space-small); }
.sw { background: var(--pf-bg-primary); border-radius: var(--pf-radius-small);
      padding: var(--pf-space-small); display:flex; flex-direction:column; gap:4px;
      border:1px solid var(--pf-border-default); }
.chip { height:44px; border-radius: var(--pf-radius-small); border:1px solid var(--pf-border-secondary); }
.sw code { font-size:11px; color: var(--pf-text-primary); word-break:break-all; }
.sw span { font-size:11px; color: var(--pf-text-secondary); }
table { width:100%; border-collapse:collapse; background: var(--pf-bg-primary);
        border-radius: var(--pf-radius-small); overflow:hidden; }
th { background: var(--pf-bg-tertiary); text-align:left; padding: var(--pf-space-small);
     font-size: var(--pf-font-size-xs); text-transform:uppercase; letter-spacing:.05em; }
td { padding: var(--pf-space-small); border-top:1px solid var(--pf-border-default); vertical-align:middle; }
td.num { font-variant-numeric:tabular-nums; color: var(--pf-text-secondary); }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px; }
.bar { background: var(--pf-bg-theme-full); height:12px; border-radius:2px; }
.btn { font-family:inherit; font-weight: var(--pf-font-weight-bold); font-size: var(--pf-font-size-s);
       padding: var(--pf-space-small) var(--pf-space-large); border-radius: var(--pf-radius-small);
       border:none; cursor:pointer; }
.btn--action{background:var(--pf-bg-secondary-button);color:var(--pf-text-inverted-primary)}
.btn--positive{background:var(--pf-bg-primary-button);color:var(--pf-text-always-white)}
.btn--negative{background:var(--pf-bg-negative-button);color:var(--pf-text-always-white)}
.btn--hollow{background:transparent;color:var(--pf-text-primary);border:1px solid var(--pf-border-hollow-button)}
.row { display:flex; gap: var(--pf-space-small); flex-wrap:wrap; align-items:center; }
.tag { font-size: var(--pf-font-size-xs); text-transform:uppercase; letter-spacing:-.01em;
       border-radius: var(--pf-radius-small); padding:2px 10px; border:1px solid; }
.card { background: var(--pf-bg-primary); border-radius: var(--pf-radius-medium);
        box-shadow: var(--pf-shadow-drop-shadow); padding: var(--pf-space-large); }
.verdict { font-size:11px; padding:2px 8px; border-radius:10px; }
.verdict.ok { background: var(--pf-tag-fill-positive); color: var(--pf-tag-content-positive); }
.verdict.no { background: var(--pf-tag-fill-warning); color: var(--pf-tag-content-warning); }
.mini { display:inline-block; padding:2px 8px; border-radius:3px; font-size:12px; }
.chartbar { display:flex; height:44px; border-radius: var(--pf-radius-small); overflow:hidden; }
.chartbar div { flex:1; }
.note { background: var(--pf-bg-warning); border-left:3px solid var(--pf-border-warning);
        padding: var(--pf-space-small) var(--pf-space-large); border-radius: var(--pf-radius-small);
        margin: var(--pf-space-small) 0; }
</style>
</head>
<body>
<header>
  <h1>People First — Token Reference</h1>
  <span style="color:var(--pf-text-secondary);font-size:var(--pf-font-size-xs)">
    ${collect(t.color).length} colours · generated from Figma aRWjBnTvdLiG50xtwodGwH</span>
  <button class="btn btn--action" style="margin-left:auto" onclick="
    document.documentElement.dataset.theme =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'">Toggle dark mode</button>
</header>
<main>

<h2>Components</h2>
<div class="card">
  <h3>Buttons</h3>
  <div class="row">
    <button class="btn btn--action">Action</button>
    <button class="btn btn--positive">Positive</button>
    <button class="btn btn--negative">Negative</button>
    <button class="btn btn--hollow">Hollow</button>
  </div>
  <h3>Tags</h3>
  <div class="row">
    ${tagStatuses.map(s => `<span class="tag" style="background:var(--pf-tag-fill-${s});border-color:var(--pf-tag-border-${s});color:var(--pf-tag-content-${s})">${s}</span>`).join('\n    ')}
  </div>
  <h3>Chart sequence</h3>
  <div class="chartbar">
    ${Array.from({ length: 10 }, (_, i) => `<div style="background:var(--pf-chart-${i + 1})"></div>`).join('')}
  </div>
  <h3>AI gradient</h3>
  <div style="height:44px;border-radius:var(--pf-radius-small);background:var(--pf-gradient-ai-gradient)"></div>
</div>

<h2>Typography</h2>
<table><thead><tr><th>Token</th><th>Size</th><th>Sample</th></tr></thead><tbody>
${collect(t.fontSize).sort((a, b) => parseInt(b.$value) - parseInt(a.$value))
  .map(n => scaleRow(n, e => `<span style="font-size:var(${e.cssVar})">People First</span>`)).join('\n')}
</tbody></table>

<h2>Spacing</h2>
<table><thead><tr><th>Token</th><th>Value</th><th>Scale</th></tr></thead><tbody>
${collect(t.space).sort((a, b) => parseInt(a.$value) - parseInt(b.$value))
  .map(n => scaleRow(n, e => `<div class="bar" style="width:var(${e.cssVar})"></div>`)).join('\n')}
</tbody></table>

<h2>Radius &amp; icon sizes</h2>
<table><thead><tr><th>Token</th><th>Value</th><th></th></tr></thead><tbody>
${collect(t.radius).map(n => scaleRow(n, e => `<div style="width:44px;height:28px;background:var(--pf-bg-theme-full);border-radius:var(${e.cssVar})"></div>`)).join('\n')}
${collect(t.iconSize).filter(n => parseInt(n.$value) > 0).sort((a, b) => parseInt(a.$value) - parseInt(b.$value))
  .map(n => scaleRow(n, e => `<div style="width:var(${e.cssVar});height:var(${e.cssVar});background:var(--pf-icon-primary);border-radius:2px"></div>`)).join('\n')}
</tbody></table>
<div class="note"><strong>Icon-size-xxxs is 0px in Figma</strong> and is omitted above — it looks unset rather than intentional.</div>

<h2>Elevation</h2>
<div class="row">
${collect(t.shadow).map(n => `<div class="card" style="box-shadow:var(${ext(n).cssVar})"><code>${ext(n).cssVar}</code></div>`).join('\n')}
</div>

<h2>Semantic colours</h2>
<p style="color:var(--pf-text-secondary)">Toggle dark mode above — every swatch below re-resolves.</p>
${Object.entries(semanticGroups).map(([g, list]) =>
  `<h3>${esc(g)}</h3><div class="grid">${list.map(swatch).join('')}</div>`).join('\n')}

<h2>Primitives</h2>
<div class="note">Reference only. Do not use these directly — they do not change between modes.</div>
<h3>Base colours</h3>
<div class="grid">${collect(t.color.base).map(swatch).join('')}</div>
<h3>Theme colours</h3>
<div class="grid">${collect(t.color.theme).map(swatch).join('')}</div>

<h2>Contrast (WCAG AA)</h2>
<p style="color:var(--pf-text-secondary)">Pairs taken from the Figma component sets, not assumed.</p>
<table><thead><tr><th>Mode</th><th>Pair</th><th>Ratio</th><th>Verdict</th><th>Tokens</th></tr></thead>
<tbody>${contrastRows}</tbody></table>

</main>
</body></html>`;

mkdirSync('reference', { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const pass = contrast.filter(r => r.verdict === 'AA').length;
console.log(`reference/index.html written — ${contrast.length} contrast pairs, ${pass} pass AA`);
