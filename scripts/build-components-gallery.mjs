#!/usr/bin/env node
// Generates docs/components.html — every captured component and every captured variant,
// rendered with dist/components.css, in light and dark.
//
//   node scripts/build-components-gallery.mjs
//
// Generated from the same extracts as the stylesheet, so the gallery cannot show
// something the stylesheet does not actually produce. It also reports what is NOT
// captured, because a gallery that quietly omits the gaps is worse than no gallery.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};

const geometry = new Map(tsv('tokens/_raw/component-geometry.tsv').map(r => [r.component, r]));
const variants = tsv('tokens/_raw/component-variants.tsv');
const inventory = JSON.parse(readFileSync('tokens/_raw/components.json', 'utf8'));
let textStyles = [];
try {
  const [h, ...ls] = readFileSync('tokens/_raw/text-styles.tsv', 'utf8').trim().split('\n');
  const k = h.split('\t');
  textStyles = ls.map(l => Object.fromEntries(l.split('\t').map((v, i) => [k[i], v ?? ''])));
} catch { /* type layer not extracted yet */ }
// Why each missing component is missing. A gallery that lists gaps without saying why
// invites the reader to assume they are oversights; most of them are deliberate.
let uncapturedWhy = new Map();
try {
  uncapturedWhy = new Map(tsv('tokens/_raw/uncaptured-reasons.tsv').map(r => [r.component, r.reason]));
} catch { /* not extracted yet */ }

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Specimen content. Where a component has an obvious real-world label, use it; otherwise
// fall back to the component's own name so nothing is silently invented.
const SAMPLE = {
  'Button': 'Save', 'Filter chip': 'Absence type', 'Tags': 'Approved',
  'Links': 'View details', 'Field': 'Jane Okafor', 'Form field': 'Manager',
  'Option': 'Annual leave', 'Multiselect tag': 'Finance',
  'Checkbox/Radio item': 'Include leavers', 'Table cell (AG)': 'Jane Okafor',
  'Table header (AG)': 'Employee', 'Toast message': 'Request approved',
  'Notification card': 'You have 3 approvals waiting', 'Counter': '3',
  'Navigation item': 'People', 'Side navigation tab': 'Absence',
  'Message box': 'Add a note for the approver', 'Primary search': 'Search people',
  'Status': 'Pending', 'Clock in': 'Clock in', 'AI button': 'Ask AI',
};
// A few components are genuinely interactive elements rather than boxes.
const TAG = { 'Button': 'button', 'Filter chip': 'button', 'AI button': 'button',
              'Clock in': 'button', 'Links': 'a', 'Action menu button': 'button' };

const parseVariant = v => v.split(',').map(p => p.trim()).filter(Boolean).map(p => {
  const i = p.indexOf('=');
  return i < 0 ? [p, ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
});

// ---- group ------------------------------------------------------------------
const byPage = new Map();
for (const r of variants) {
  if (!byPage.has(r.page)) byPage.set(r.page, new Map());
  const comps = byPage.get(r.page);
  if (!comps.has(r.component)) comps.set(r.component, []);
  comps.get(r.component).push(r);
}

const captured = new Set(variants.map(r => r.component));
const uncaptured = [];
for (const c of inventory) {
  const page = (c.pageName || '').trim();
  if (page === 'Icons' || page.startsWith('📚') || page.startsWith('🎨')) continue;
  if (!captured.has(c.name) && !uncaptured.some(u => u.name === c.name)) {
    uncaptured.push({ name: c.name, page, geometry: geometry.has(c.name),
                      why: uncapturedWhy.get(c.name) || '' });
  }
}

// ---- render -----------------------------------------------------------------
const out = [];
out.push('<title>People First components</title>');
out.push(`<link rel="stylesheet" href="../dist/tokens.css">`);
out.push(`<link rel="stylesheet" href="../dist/components.css">`);
out.push(`<link rel="stylesheet" href="../dist/type.css">`);
out.push(`<style>
  body { background: var(--pf-bg-secondary); color: var(--pf-text-primary);
         font-family: var(--pf-font-body); margin: 0; padding: 24px 28px 80px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .lede { color: var(--pf-text-secondary); margin: 0 0 24px; max-width: 60ch; font-size: 14px; }
  h2 { font-size: 15px; margin: 36px 0 4px; padding-bottom: 6px;
       border-bottom: 1px solid var(--pf-border-primary); }
  h3 { font-size: 13px; margin: 22px 0 2px; }
  .meta { color: var(--pf-text-secondary); font-size: 11px; margin: 0 0 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .row { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start;
         background: var(--pf-bg-primary); border: 1px solid var(--pf-border-primary);
         border-radius: 8px; padding: 16px; }
  .spec { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; max-width: 100%; }
  .spec > .label { color: var(--pf-text-secondary); font-size: 10px;
                   font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center;
         background: var(--pf-bg-secondary); padding: 10px 0 14px; margin: -24px 0 0; }
  .bar button { font: inherit; font-size: 12px; padding: 5px 12px; cursor: pointer;
                border-radius: 999px; border: 1px solid var(--pf-border-primary);
                background: var(--pf-bg-primary); color: var(--pf-text-primary); }
  .bar button[aria-pressed="true"] { background: var(--pf-bg-secondary-button);
                                     color: var(--pf-text-inverted-primary); }
  .gaps { columns: 3; column-gap: 24px; font-size: 12px; color: var(--pf-text-secondary); }
  .gaps div { break-inside: avoid; }
</style>`);

out.push('<div class="bar">');
out.push('  <strong style="font-size:12px">Theme</strong>');
for (const t of ['System', 'Light', 'Dark']) {
  out.push(`  <button data-theme-set="${t.toLowerCase()}" aria-pressed="${t === 'System'}">${t}</button>`);
}
out.push('</div>');

const totalVariants = variants.length;
out.push(`<h1>People First — components</h1>`);
out.push(`<p class="lede">Every component and variant captured from Figma, rendered with the
generated stylesheet. Each specimen is real <code>dist/components.css</code> — if it looks
wrong here, it is wrong in the stylesheet. Labels under each specimen are Figma's own
variant names.</p>`);

// The type layer first: it is the thing every screen touches, and until recently every
// screen hand-wrote it.
if (textStyles.length) {
  const typeClasses = [...readFileSync('dist/type.css', 'utf8')
    .matchAll(/^\.(pf-text-[a-z0-9-]+) \{/gm)].map(m => m[1]);
  out.push('<h2>Type</h2>');
  out.push(`<p class="lede">${textStyles.length} classes, one per Figma text style, in
  <code>dist/type.css</code>. Colour is deliberately not set — pair a type class with a
  <code>--pf-text-*</code> token. Every style uses Figma's automatic line height, so
  <code>normal</code> is the faithful value; a specific line-height on a People First
  screen is an invention.</p>`);
  out.push('<div class="row" style="flex-direction:column;align-items:stretch;gap:14px">');
  textStyles.forEach((t, i) => {
    const cls = typeClasses[i] || '';
    out.push('  <div class="spec" style="gap:2px">');
    out.push(`    <span class="${cls}">${esc(t.name.replace(/^\w+ text\//, ''))}</span>`);
    out.push(`    <span class="label">.${esc(cls)}  ·  ${esc(t.size)}px${
      t.weight ? '  ·  ' + esc(t.weight) : '  ·  no weight set in Figma'}${
      t.letterSpacing !== '0%' ? '  ·  ' + esc(t.letterSpacing) : ''}${
      t.textCase === 'UPPER' ? '  ·  uppercase' : ''}</span>`);
    out.push('  </div>');
  });
  out.push('</div>');
}

for (const [page, comps] of [...byPage.entries()].sort()) {
  out.push(`<h2>${esc(page)}</h2>`);
  for (const [component, rows] of [...comps.entries()].sort()) {
    const g = geometry.get(component);
    const base = 'pf-' + kebab(component);
    const tag = TAG[component] || 'div';
    const text = SAMPLE[component] || component;

    out.push(`<h3>${esc(component)}</h3>`);
    const bits = [`${rows.length} variant${rows.length === 1 ? '' : 's'}`, `.${base}`];
    if (g) bits.push(g.size); else bits.push('no geometry measured');
    if (g && g.layout) bits.push(g.layout.toLowerCase());
    out.push(`<p class="meta">${esc(bits.join('  ·  '))}</p>`);

    out.push('<div class="row">');
    for (const r of rows) {
      const attrs = parseVariant(r.variant)
        .map(([k, v]) => ` data-${kebab(k)}="${esc(v)}"`).join('');
      const open = tag === 'a' ? `<a href="#"${attrs} class="${base}">` : `<${tag} class="${base}"${attrs}>`;
      const close = `</${tag}>`;
      out.push('  <div class="spec">');
      out.push(`    ${open}${esc(text)}${close}`);
      out.push(`    <span class="label">${esc(r.variant)}</span>`);
      out.push('  </div>');
    }
    out.push('</div>');
  }
}

out.push('<h2>Not in the library</h2>');
out.push(`<p class="lede">These components exist in Figma but have no rules in the
stylesheet, each for a stated reason. Listed with the reason so the gaps are visible and
so nobody has to guess whether one is an oversight — most are deliberate.</p>`);

// Grouped by reason rather than by page: the reason is the useful axis here. "Binds no
// colour variable" is a finding about the Figma file; "documentation page" is a decision.
const byReason = new Map();
for (const u of uncaptured) {
  const key = u.why || 'no reason recorded — this is a bug in the extraction, not a decision';
  if (!byReason.has(key)) byReason.set(key, []);
  byReason.get(key).push(u);
}
for (const [reason, items] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
  out.push(`<h3 style="margin-top:20px">${esc(items.length)} — ${esc(reason)}</h3>`);
  out.push('<div class="gaps">');
  for (const u of items.sort((a, b) => a.page.localeCompare(b.page) || a.name.localeCompare(b.name)))
    out.push(`  <div>${esc(u.name)} <span style="opacity:.6">— ${esc(u.page)}${u.geometry ? ', geometry measured' : ''}</span></div>`);
  out.push('</div>');
}

out.push(`<script>
  const btns = [...document.querySelectorAll('[data-theme-set]')];
  btns.forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.themeSet;
    if (v === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', v);
    btns.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  }));
</script>`);

mkdirSync('docs', { recursive: true });
writeFileSync('docs/components.html', out.join('\n'));
console.log(`components.html written — ${byPage.size} pages, ${captured.size} components, ${totalVariants} variants`);
console.log(`  not yet captured: ${uncaptured.length}`);
