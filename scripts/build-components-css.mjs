#!/usr/bin/env node
// Generates dist/components.css from the raw Figma extracts.
//
//   node scripts/build-components-css.mjs
//
// Why generate rather than hand-write: hand-written component CSS is exactly how the
// wrong-shapes mistake happened. Every value here traces to a measurement in
// tokens/_raw/, so the stylesheet cannot drift from Figma without the extract changing.
//
// Class naming mirrors Figma's variant panel rather than inventing a scheme:
//
//   <button class="pf-button" data-type="Action">Save</button>
//   <div class="pf-form-field" data-input-type="Dropdown" data-state="Error">
//
// A component is a class; each variant PROPERTY is a data attribute; values keep
// Figma's exact spelling so they match what a designer sees. States that have a real
// CSS equivalent (:hover, :disabled, :focus-visible) get one as well as the attribute,
// so a live control behaves correctly and a gallery can still force any state.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};

// ---- Figma token name -> CSS custom property -------------------------------
const tokenVar = new Map();
(function walk(o) {
  for (const v of Object.values(o)) {
    if (!v || typeof v !== 'object') continue;
    if (v.$value !== undefined) {
      const e = (v.$extensions || {})['com.mhr.pf'] || {};
      if (e.figmaName && e.cssVar) tokenVar.set(e.figmaName, e.cssVar);
    } else walk(v);
  }
})(JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8')));

const geometry = new Map(tsv('tokens/_raw/component-geometry.tsv').map(r => [r.component, r]));
const variants = tsv('tokens/_raw/component-variants.tsv');

// ---- naming ----------------------------------------------------------------
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = name => 'pf-' + kebab(name);

// A state that maps onto a real CSS state gets both, so the control behaves and a
// gallery can still pin it. Everything else is attribute-only.
const CSS_STATE = {
  Hover: ['&:hover'],
  Disabled: ['&:disabled', '&[aria-disabled="true"]'],
  Focus: ['&:focus-visible'],
};

const parseVariant = v => Object.fromEntries(
  v.split(',').map(p => p.trim()).filter(Boolean).map(p => {
    const i = p.indexOf('=');
    return i < 0 ? [p, ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  }));

function selectorsFor(base, props) {
  let sel = '.' + base;
  for (const [k, val] of Object.entries(props)) {
    if (k === 'State') continue;
    sel += `[data-${kebab(k)}="${val}"]`;
  }
  const state = props.State;
  if (!state || /^default$/i.test(state)) return [sel];
  const out = [`${sel}[data-state="${state}"]`];
  for (const extra of CSS_STATE[state] || []) out.push(sel + extra.slice(1));
  return out;
}

// ---- geometry -> declarations ----------------------------------------------
const num = s => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };

function geometryDecls(g, notes) {
  if (!g) return [];
  const d = [];
  const m = (g.size || '').match(/^(auto|\d+)\s*x\s*(auto|\d+)$/);
  const w = m && m[1] !== 'auto' ? +m[1] : null;
  const h = m && m[2] !== 'auto' ? +m[2] : null;

  // A large fixed width is the width of the artboard the component was drawn at, not a
  // rule — only carry width through for genuinely small fixed controls.
  if (w !== null && w <= 120) d.push(`width: ${w}px`);
  else if (w !== null) notes.push(`Figma draws this ${w}px wide; treated as layout, not a rule`);
  if (h !== null) d.push(`height: ${h}px`);

  if (g.padding && g.padding !== '—' && g.padding !== '0') {
    d.push(`padding: ${g.padding.trim().split(/\s+/).map(v => v === '0' ? '0' : v + 'px').join(' ')}`);
  }

  const r = num(g.radius);
  if (r !== null) {
    if (h !== null && r >= h / 2 - 1) { d.push('border-radius: 999px'); notes.push('pill'); }
    else if (r > 0) d.push(`border-radius: ${r}px`);
  } else if (g.radius === 'mixed') notes.push('corner radius varies per corner in Figma');

  // Auto-layout. Direction matters even when the gap is 0 — without it a vertical
  // stack like `Form field` (label above input) lays out sideways.
  const ALIGN = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
  const JUSTIFY = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
  const [mode, counter, primary] = (g.layout || '').split(/\s+/);
  const gap = num(g.gap);

  if (mode === 'HORIZONTAL' || mode === 'VERTICAL') {
    d.push('display: inline-flex');
    d.push(`flex-direction: ${mode === 'VERTICAL' ? 'column' : 'row'}`);
    if (ALIGN[counter]) d.push(`align-items: ${ALIGN[counter]}`);
    if (JUSTIFY[primary]) d.push(`justify-content: ${JUSTIFY[primary]}`);
    if (gap !== null && gap > 0) d.push(`gap: ${gap}px`);
  } else if (gap !== null && gap > 0) {
    // Direction not captured for this component — fall back to a row, and say so.
    d.push('display: inline-flex', 'align-items: center', `gap: ${gap}px`);
    notes.push('layout direction not captured; assumed a row');
  }

  const f = (g.font || '').match(/^(\d+)px(?:\s+(\w+))?/);
  if (f) {
    d.push(`font-size: ${f[1]}px`);
    if (f[2] === 'SemiBold' || f[2] === 'Bold') d.push('font-weight: var(--pf-font-weight-bold)');
    else if (f[2] === 'Regular') d.push('font-weight: var(--pf-font-weight-regular)');
    // "Italic" here is placeholder styling, not the component's font — see the
    // geometry notes. Deliberately not emitted.
  }
  return d;
}

function colourDecls(row) {
  const d = [];
  const put = (figmaName, prop) => {
    if (!figmaName) return;
    const v = tokenVar.get(figmaName);
    if (v) d.push(`${prop}: var(${v})`);
    else d.push(`/* unmapped Figma token: ${figmaName} */`);
  };
  put(row.fill, 'background');
  put(row.stroke, 'border-color');
  put(row.text, 'color');
  return d;
}

// ---- build ------------------------------------------------------------------
const byComponent = new Map();
for (const r of variants) {
  if (!byComponent.has(r.component)) byComponent.set(r.component, []);
  byComponent.get(r.component).push(r);
}

const out = [];
out.push('/* People First — component classes, generated from the Figma extracts.');
out.push(' *');
out.push(' * DO NOT EDIT. Regenerate with: npm run build');
out.push(' * Shapes come from tokens/_raw/component-geometry.tsv (measured in Figma).');
out.push(' * Colours come from tokens/_raw/component-variants.tsv (the variant bindings).');
out.push(' *');
out.push(' * Usage — a component is a class, each Figma variant property is a data');
out.push(' * attribute, and values keep Figma\'s exact spelling:');
out.push(' *');
out.push(' *   <button class="pf-button" data-type="Action">Save</button>');
out.push(' *   <div class="pf-form-field" data-input-type="Dropdown" data-state="Error">');
out.push(' *');
out.push(' * Requires dist/tokens.css.');
out.push(' */');
out.push('');

let componentCount = 0, ruleCount = 0, unmapped = new Set();

for (const [component, rows] of [...byComponent.entries()].sort()) {
  const base = cls(component);
  const g = geometry.get(component);
  const notes = [];
  const geo = geometryDecls(g, notes);

  out.push(`/* ${component}${g ? '' : '  (no geometry measured — colours only)'}`);
  out.push(` * ${rows.length} variant${rows.length === 1 ? '' : 's'} captured${
    g && g.notes ? '. ' + g.notes : ''}`);
  for (const n of notes) out.push(` * ${n}`);
  out.push(' */');

  if (geo.length) {
    out.push(`.${base} {`);
    for (const d of geo) out.push(`  ${d};`);
    // Reset the browser's own control styling. Without this a variant that Figma gives
    // NO fill — Button Type=Hollow, for example — falls through to the UA's grey
    // buttonface and renders as a filled pill, which is the opposite of hollow.
    out.push('  appearance: none;');
    out.push('  -webkit-appearance: none;');
    out.push('  background: transparent;');
    out.push('  margin: 0;');
    out.push(rows.some(r => r.stroke)
      ? '  border: 1px solid transparent;'
      : '  border: 0;');
    out.push('  box-sizing: border-box;');
    out.push('  font-family: var(--pf-font-body);');
    out.push('}');
    ruleCount++;
  }

  for (const r of rows) {
    const decls = colourDecls(r);
    for (const d of decls) { const m = d.match(/unmapped Figma token: (.+) \*\//); if (m) unmapped.add(m[1]); }
    if (!decls.length) continue;
    const sels = selectorsFor(base, parseVariant(r.variant));
    out.push(`${sels.join(',\n')} {`);
    for (const d of decls) out.push(`  ${d.startsWith('/*') ? d : d + ';'}`);
    out.push('}');
    ruleCount++;
  }
  out.push('');
  componentCount++;
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/components.css', out.join('\n'));

console.log(`components.css written — ${componentCount} components, ${ruleCount} rules`);
console.log(`  with measured geometry : ${[...byComponent.keys()].filter(c => geometry.has(c)).length}`);
if (unmapped.size) {
  console.log(`  UNMAPPED Figma tokens  : ${unmapped.size}`);
  for (const u of [...unmapped].sort()) console.log(`    ${u}`);
}
