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

// A geometry row keyed `Component|Prop=Value` measures ONE variant rather than the
// component as a whole. Circle icons is four sizes of the same circle and Default header
// background is three heights of the same bar; both bind identical colours across those
// variants, so the colour layer collapses them correctly and the SIZE is the only thing
// that distinguishes them. Without this they would all render at one size.
const geometryRows = tsv('tokens/_raw/component-geometry.tsv');
const geometry = new Map(geometryRows.filter(r => !r.component.includes('|'))
  .map(r => [r.component, r]));
const geometryByVariant = new Map();
for (const r of geometryRows) {
  if (!r.component.includes('|')) continue;
  const [comp, variant] = r.component.split('|');
  if (!geometryByVariant.has(comp)) geometryByVariant.set(comp, []);
  geometryByVariant.get(comp).push({ ...r, variant });
}
const variants = tsv('tokens/_raw/component-variants.tsv');

// Artwork: a component whose visual IS an image. The colour extract has three slots —
// fill, stroke, text — and every one of them wants a colour VARIABLE. The header's
// swoosh is a 1920x86 raster fill bound to no variable at all, so it was recorded in
// uncaptured-reasons.tsv as "nothing to put in a stylesheet" and the header shipped as
// an empty transparent box. Anyone building a header then hand-wrote one, and that is
// where the flat pink band and the wrong font weights came from.
// Inlined as data: URIs, not url() paths, because an artifact or a .dc.html canvas
// cannot reference a local file — a link there fails silently, which is the same class
// of invisible failure all over again.
const artByComponent = new Map();
try {
  for (const r of tsv('tokens/_raw/component-art.tsv')) {
    const bytes = readFileSync(`assets/component-art/${r.file}`);
    const mime = r.file.endsWith('.jpg') ? 'image/jpeg'
      : r.file.endsWith('.png') ? 'image/png'
      : r.file.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    if (!artByComponent.has(r.component)) artByComponent.set(r.component, []);
    artByComponent.get(r.component).push({
      variant: r.variant,
      uri: `data:${mime};base64,${bytes.toString('base64')}`,
    });
  }
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}

// Primitive names Figma binds directly, and the semantic token of identical value to
// use instead — chosen per CSS property, because the semantic layer names the ROLE.
// `Grey-slate` is #3e3e3e; `Text/Always grey slate` resolves to exactly that and is a
// deliberately mode-stable token, so the rendered colour is unchanged.
const PRIMITIVE_ALIAS = {
  'Grey-slate': {
    'color': '--pf-text-always-grey-slate',
    'background': '--pf-base-grey-slate',
    'border-color': '--pf-base-grey-slate',
  },
  'Base colours/Grey Slate': {
    'color': '--pf-text-always-grey-slate',
  },
  'Base colours/White': {
    // Bound as text on Pagination buttons, Header navigation and Full page. The semantic
    // token that means exactly "white text, in both modes" is Text/Always White, and it
    // resolves to the same value.
    'color': '--pf-text-always-white',
    // Deliberately NOT mapped for background or border-color. The only semantic tokens
    // holding White in both modes are Tags/Fills/Info (a tag fill) and Icons/Icon - Always
    // white (an icon colour). Borrowing either for a toast background or a button border
    // would put the right hex behind the wrong meaning, and the next person to change the
    // tag palette would silently change the toast. Those stay flagged for design.
  },
  'Base colours/Grey Dolphin': {
    // Border/Secondary IS Grey Dolphin in both modes, is scoped STROKE_COLOR in Figma, and
    // means exactly what the Toggle's border means. A real equivalent, not a near one.
    'border-color': '--pf-border-secondary',
  },
};
// Every name in the primitive collection. A component binding one of these has reached
// past the semantic layer to a raw colour, which is what stops it adapting between modes.
// Detected by collection membership rather than by a list of names, so a new one cannot
// slip through unnoticed.
const PRIMITIVE_NAMES = new Set(
  readFileSync('tokens/_raw/primitives.tsv', 'utf8').trim().split('\n')
    .map(l => l.split('\t')[0]).filter(Boolean));
const sourceIssues = new Map();

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

  // Height needs the same judgement, and it is not one threshold but three, because the
  // number means something different at each scale:
  //   up to 260px  a control, row or tile — the height IS the design (a 32px button, a
  //                58px table row). Emit it.
  //   to 700px     a panel or modal. Figma draws it at one content length; a real one
  //                grows. Emit as a floor so the measurement survives without capping it.
  //   above that   the artboard the component was drawn on (1080 is a screen, not a
  //                component). Emitting it would force a page-tall box. Drop and say so.
  if (h !== null && h <= 260) d.push(`height: ${h}px`);
  else if (h !== null && h <= 700) {
    d.push(`min-height: ${h}px`);
    notes.push(`Figma draws this ${h}px tall; emitted as a minimum, since content decides the real height`);
  } else if (h !== null) {
    notes.push(`Figma draws this ${h}px tall — the artboard it sits on, not a rule; dropped`);
  }

  if (g.padding && g.padding !== '—' && g.padding !== '0') {
    const parts = g.padding.trim().split(/\s+/).map(Number);
    // top/bottom, expanded from CSS shorthand
    const [pt, pb] = parts.length === 1 ? [parts[0], parts[0]]
      : parts.length === 2 ? [parts[0], parts[0]]
      : parts.length === 3 ? [parts[0], parts[2]]
      : [parts[0], parts[2]];
    // Figma lets a frame carry padding its own height cannot usefully fit — a 20x20
    // box with 10px padding has no content area at all, and a 24x24 box with 10px
    // padding leaves 2px, which crushes the glyph inside it. Below ~8px nothing legible
    // fits, so treat the padding as decorative: the size you see in Figma is what wins.
    const contentBox = h === null ? null : h - pt - pb - 2;
    if (contentBox !== null && contentBox < 8) {
      notes.push(`Figma sets ${g.padding}px padding on a ${h}px-tall box, leaving ${contentBox}px for content; dropped, as the size wins`);
    } else {
      d.push(`padding: ${g.padding.trim().split(/\s+/).map(v => v === '0' ? '0' : v + 'px').join(' ')}`);
    }
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
  } else if (w !== null || h !== null) {
    // No auto-layout, but a fixed size. An inline element ignores width and height,
    // so the box would silently collapse.
    d.push('display: inline-block');
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
    // A primitive resolves perfectly well through tokenVar — to the primitive — so the
    // check has to come FIRST or the substitution never runs and the component ships
    // with a colour that cannot change between modes.
    if (PRIMITIVE_NAMES.has(figmaName) || PRIMITIVE_ALIAS[figmaName]) {
      const alias = (PRIMITIVE_ALIAS[figmaName] || {})[prop];
      if (alias) {
        d.push(`/* Figma binds the primitive "${figmaName}" here instead of a semantic token */`);
        d.push(`${prop}: var(${alias})`);
        sourceIssues.set(`${row.component} — ${figmaName} (${prop})`, `substituted ${alias}, same value`);
        return;
      }
      if (v) {
        d.push(`/* Figma binds the primitive "${figmaName}" here; no semantic token has this role */`);
        d.push(`${prop}: var(${v})`);
        sourceIssues.set(`${row.component} — ${figmaName} (${prop})`, `NO semantic equivalent — will not adapt between modes`);
        return;
      }
    }
    if (v) { d.push(`${prop}: var(${v})`); return; }
    // A binding Figma records under a bare PRIMITIVE name rather than a semantic path.
    // Every other binding in the file reads `Text/Primary`, `Background/Theme`; these
    // reach past that layer to the raw colour, which is the thing that stops a component
    // adapting between modes. We cannot fix their file, but emitting nothing at all is
    // worse: the component then ships with no colour whatsoever. So substitute the
    // SEMANTIC token that resolves to the same value, and report it as a source issue.
    const alias = (PRIMITIVE_ALIAS[figmaName] || {})[prop];
    if (alias) {
      d.push(`/* Figma binds the primitive "${figmaName}" here instead of a semantic token */`);
      d.push(`${prop}: var(${alias})`);
      sourceIssues.set(figmaName, `bound directly on ${row.component} (${prop}); using ${alias}, same value`);
      return;
    }
    d.push(`/* unmapped Figma token: ${figmaName} */`);
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

// Components Figma binds no colour variable to still have a shape, and a shape is most
// of what a component is. Eleven of them had no rules at all — Tooltip, Menu, Stars among
// them — because the build only ever walked the colour extract. Walk the union.
//
// But ONLY for names that are real Figma components. The geometry file also holds rows
// measured against sub-parts, under descriptive labels written by hand — `Button (icon
// only)`, `Field (second component)`, `Table (AG) container`. Those are measurement
// notes, not components, and emitting `.pf-button-icon-only` would invent a component
// this design system does not have. Figma's own inventory is the arbiter.
const figmaComponents = new Set(
  JSON.parse(readFileSync('tokens/_raw/components.json', 'utf8')).map(c => c.name));
const shapeOnly = [];
for (const comp of geometry.keys()) {
  if (byComponent.has(comp)) continue;
  if (!figmaComponents.has(comp)) continue;
  byComponent.set(comp, []);
  shapeOnly.push(comp);
}

for (const [component, rows] of [...byComponent.entries()].sort()) {
  const base = cls(component);
  const g = geometry.get(component);
  const notes = [];
  const geo = geometryDecls(g, notes);

  out.push(`/* ${component}${g ? '' : '  (no geometry measured — colours only)'}`);
  out.push(rows.length
    ? ` * ${rows.length} variant${rows.length === 1 ? '' : 's'} captured${g && g.notes ? '. ' + g.notes : ''}`
    : ` * SHAPE ONLY — no variant of this binds a colour variable in Figma, so the class`);
  if (!rows.length) {
    out.push(' * carries its measured geometry and leaves colour to the page.' +
             (g && g.notes ? ' ' + g.notes : ''));
  }
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

  for (const vg of geometryByVariant.get(component) || []) {
    const vnotes = [];
    const vdecls = geometryDecls(vg, vnotes);
    if (!vdecls.length) continue;
    const sels = selectorsFor(base, parseVariant(vg.variant));
    out.push(`${sels.join(',\n')} {`);
    for (const d of vdecls) out.push(`  ${d};`);
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

  for (const a of artByComponent.get(component) || []) {
    const props = parseVariant(a.variant);
    // Figma models light/dark as a variant property. This project models it as
    // data-theme on the root, the same way every token does. Emit both: the faithful
    // variant selector, and the theme-driven one so the artwork follows dark mode
    // without the page having to know a Darkmode attribute exists.
    const dark = /^true$/i.test(props.Darkmode || '');
    delete props.Darkmode;
    // Every remaining axis stays an explicit attribute, except Breakpoint=Desktop,
    // which also answers to the bare class. Without that, `class="pf-default-header-
    // background"` on its own renders nothing at all — precisely the silent blank this
    // whole change exists to stop.
    const bare = props.Breakpoint === 'Desktop';
    const rest = { ...props };
    if (bare) delete rest.Breakpoint;
    const plains = [selectorsFor(base, props)[0]];
    if (bare) plains.push(selectorsFor(base, rest)[0]);

    const sels = [];
    for (const plain of plains) {
      sels.push(`${plain}[data-darkmode="${dark ? 'True' : 'False'}"]`);
      if (dark) sels.push(`:root[data-theme="dark"] ${plain}`);
      else { sels.push(plain); sels.push(`:root[data-theme="light"] ${plain}`); }
    }
    out.push(`${sels.join(',\n')} {`);
    out.push(`  background-image: url("${a.uri}");`);
    out.push('  background-size: cover;');
    out.push('  background-position: center;');
    out.push('  background-repeat: no-repeat;');
    out.push('}');
    if (dark) {
      out.push('@media (prefers-color-scheme: dark) {');
      for (const plain of plains) {
        out.push(`  :root:not([data-theme="light"]) ${plain} {`);
        out.push(`    background-image: url("${a.uri}");`);
        out.push('  }');
      }
      out.push('}');
    }
    ruleCount++;
  }
  out.push('');
  componentCount++;
}

// ---- element fix-ups --------------------------------------------------------
// Figma measures a table cell as an auto-layout frame, so the generator emits
// `display: inline-flex` for it. That is right for a standalone specimen and wrong on a
// real <td>: it stops the element being a table cell, the browser wraps it in an
// anonymous one, and the cell's contents stack. It survived on a screen whose cells hold
// a single value and broke visibly on one whose cells hold three, which is exactly the
// kind of bug no check catches — the colours and the measured height are still correct.
// Figma draws the header background as a fixed 1920x86 frame, so the generator emits a
// fixed height and `display: inline-block` — which on a page is a box with no width, and
// a background image on a zero-width box is invisible. Same trap as .pf-table-ag: a
// canvas frame's fixed width is a canvas fact, not a page one. A full-bleed band spans.
out.push('/* A full-bleed artwork band has to span its container; the fixed width it was');
out.push('   measured at is a Figma canvas fact, not a page one. */');
out.push('.pf-default-header-background {');
out.push('  display: block;');
out.push('  width: 100%;');
out.push('}');
out.push('');

out.push('/* Element fix-ups — a component used AS a table cell must stay a table cell. */');
out.push('td.pf-table-cell-ag, th.pf-table-header-ag, td.pf-table-header-ag {');
out.push('  display: table-cell;');
out.push('  vertical-align: middle;');
out.push('}');
out.push('');

// The same trap one level up. Figma draws Table (AG) as a hug-contents frame, so the
// faithful `display: inline-flex` shrink-wraps to whatever the table inside it measures.
// Put that container in a page column narrower than the table and it does not scroll and
// does not wrap — it grows past the column and its own overflow clips the last columns
// off. The timesheet screen lost 126px of itself this way, Status column included, with
// every geometry, colour, icon and contrast check still passing. (The payroll screen
// looks the same in a screenshot and is not the same bug: its container is a plain div,
// so its 206px is a real scroll region. scripts/verify-layout.mjs tells them apart.)
out.push('/* A component used as a table CONTAINER has to be able to be narrower than its');
out.push('   contents; hug-contents is a Figma canvas behaviour, not a page one. */');
out.push('.pf-table-ag {');
out.push('  display: flex;');
out.push('  width: 100%;');
out.push('  min-width: 0;');
out.push('  max-width: 100%;');
// Figma hugs its contents in BOTH directions, so align-items: flex-start leaves the
// table sitting at its natural width with dead space beside it inside a full-width card.
out.push('  align-items: stretch;');
out.push('}');
// A flex item defaults to min-width:auto, so the scroll region inside the container
// grows to the table's natural width and overflows anyway — the container fix alone
// moved the clipping one element inwards rather than removing it.
out.push('.pf-table-ag > * { min-width: 0; max-width: 100%; width: 100%; }');
// The container carries SemiBold because Figma sets it on the frame for the header row.
// Inherited into the body it turns every cell bold, including the secondary line under a
// name. A cell's weight belongs to the cell's own text, not to the frame around it.
out.push('.pf-table-ag td, .pf-table-ag tbody { font-weight: var(--pf-font-weight-regular); }');
out.push('');

mkdirSync('dist', { recursive: true });
writeFileSync('dist/components.css', out.join('\n'));

console.log(`components.css written — ${componentCount} components, ${ruleCount} rules`);
if (shapeOnly.length) {
  console.log(`  SHAPE ONLY (no colour bound in Figma) : ${shapeOnly.length}`);
  console.log(`    ${shapeOnly.sort().join(', ')}`);
}
console.log(`  with measured geometry : ${[...byComponent.keys()].filter(c => geometry.has(c)).length}`);
if (sourceIssues.size) {
  const affected = new Set([...sourceIssues.keys()].map(k => k.split(' — ')[0])).size;
  console.log(`  Figma SOURCE ISSUES    : ${sourceIssues.size} bindings across ${affected} components  (primitive bound where a semantic token belongs)`);
  for (const [k, v] of [...sourceIssues].sort()) console.log(`    ${k} — ${v}`);
}
if (unmapped.size) {
  console.log(`  UNMAPPED Figma tokens  : ${unmapped.size}`);
  for (const u of [...unmapped].sort()) console.log(`    ${u}`);
}
