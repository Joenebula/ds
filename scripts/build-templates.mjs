#!/usr/bin/env node
// Turns each component's child tree into working MARKUP, so "use the component" means
// pasting something that renders rather than an empty div.
//
//   node scripts/build-templates.mjs
//
// Writes dist/templates/<class>.html, one per composite component, plus
// docs/templates.html showing every one of them rendered in both modes.
//
// The rule this exists to serve: a page may use design-system components, and its own CSS
// does layout and nothing else. A composite component made that impossible — `.pf-card`
// is a fill, a radius and a size with nothing inside it, so anyone who needed a card had
// to hand-write its contents, and a hand-written component is where the wrong font
// weights and the flat pink band came from. A template closes that gap: the contents come
// from Figma too.
//
// Every node becomes exactly one of four things, and NOTHING is invented:
//
//   INSTANCE  -> the instanced component's own class. The walk stopped there, because
//                what is inside it is that component's business, not this one's.
//   TEXT      -> a span with the type class its Figma text style resolves to, plus the
//                bound colour token. Never a font-size.
//   LINE      -> a 1px rule in its bound border token.
//   FRAME etc -> a div carrying ONLY layout: direction, alignment, gap, padding. Any fill
//                or radius it binds comes from a token.
//
// A node whose fill or colour Figma did not bind to a variable is emitted with a comment
// saying so rather than a guessed value — the same treatment the colour extract gives an
// unbound paint.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { buildResolver } from './resolve-component-type.mjs';

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = name => 'pf-' + kebab(name);

const tree = tsv('tokens/_raw/component-tree.tsv');
const css = readFileSync('dist/components.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));
const typeClasses = new Set([...readFileSync('dist/type.css', 'utf8')
  .matchAll(/\.(pf-text-[a-z0-9-]+)/g)].map(m => m[1]));
const { byName } = buildResolver();

// ICONS ARE NOT CLASSES. Every unresolved instance in the first run of this script was an
// icon — Warning, Up_arrow, Close x cancel, Context menu, Add plus, Left chevron. They are
// in the library, as the 293 SVGs in assets/icons/, reached through the `<!--pf-icon:name-->`
// marker that build-prototype.mjs expands. Looking for a `.pf-` class for them was asking
// the wrong question. Matched on the Figma name with separators ignored, because the tree
// says "Up_arrow" and the icon sheet says "Up arrow".
const iconNames = new Map();
for (const line of readFileSync('tokens/_raw/icons.tsv', 'utf8').trim().split('\n').slice(1)) {
  const figmaName = line.split('\t')[1];
  if (figmaName) iconNames.set(figmaName.toLowerCase().replace(/[^a-z0-9]/g, ''), kebab(figmaName));
}
const iconFor = name => iconNames.get(String(name).toLowerCase().replace(/[^a-z0-9]/g, '')) || null;

// The components the file uses but that sit on no Figma page, so nothing could capture
// them. A template that instances one names it as such rather than leaving a blank.
const detachedNames = new Set(readFileSync('tokens/_raw/detached-components.tsv', 'utf8')
  .trim().split('\n').slice(1).map(l => l.split('\t')[0]));

// PRIMITIVES ARE NOT ALLOWED IN OUTPUT, and a child tree can bind one just as a component
// can: Card's title underline binds `Base colours/Default Pink` directly. A primitive does
// not change between modes, so emitting it would ship a template that cannot do dark mode
// — the very rule this pipeline exists to enforce. Flagged and left unpainted rather than
// emitted, and reported alongside the twenty components already listed in
// FIGMA-ISSUES.md section 1 for the same fault.
const PRIMITIVE_NAMES = new Set(readFileSync('tokens/_raw/primitives.tsv', 'utf8')
  .trim().split('\n').map(l => l.split('\t')[0]).filter(Boolean));
const isPrimitive = name => PRIMITIVE_NAMES.has(name);

// Figma variable name -> CSS custom property, read from the generated token file so the
// mapping has one source.
const tokenVar = new Map();
(function walkTokens(o) {
  for (const v of Object.values(o)) {
    if (!v || typeof v !== 'object') continue;
    if (v.$value !== undefined) {
      const e = (v.$extensions || {})['com.mhr.pf'] || {};
      if (e.figmaName && e.cssVar) tokenVar.set(e.figmaName, e.cssVar);
    } else walkTokens(v);
  }
})(JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8')));

const ALIGN = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
const JUSTIFY = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const unresolved = [];

// The type class for a text node, via the same resolver the stylesheet composition uses.
function typeClassFor(component, row) {
  const name = row.textStyle && row.textStyle !== 'EXTERNAL' ? row.textStyle : null;
  const st = name ? byName.get(name) : null;
  if (!st) return null;
  const c = 'pf-text-' + kebab(st.name.replace(/^(Desktop|Mobile) text\//, '')
    .replace(/\s*\(semi bold, 600\)/, '-semibold')
    .replace(/\s*\(bold\)/, '-semibold')
    .replace(/\s*\(italic\)/, '-italic')
    .replace(/\s*\(light\)/, '-light'));
  return typeClasses.has(c) ? c : null;
}

function styleFor(component, row) {
  const s = [];
  if (row.layout && row.layout !== 'NONE') {
    const [mode, counter, primary] = row.layout.split(/\s+/);
    s.push('display:flex', `flex-direction:${mode === 'VERTICAL' ? 'column' : 'row'}`);
    if (ALIGN[counter]) s.push(`align-items:${ALIGN[counter]}`);
    if (JUSTIFY[primary]) s.push(`justify-content:${JUSTIFY[primary]}`);
    const gap = parseInt(row.gap, 10);
    if (Number.isFinite(gap) && gap > 0) s.push(`gap:${gap}px`);
    const pad = (row.padding || '').trim().split(/\s+/).map(Number);
    if (pad.length === 4 && pad.some(n => n > 0)) s.push(`padding:${pad.map(n => n + 'px').join(' ')}`);
  }
  const r = parseInt(row.radius, 10);
  if (Number.isFinite(r) && r > 0) s.push(`border-radius:${r}px`);
  if (row.fill && row.fill !== 'LITERAL' && row.fill !== 'IMAGE' && row.fill !== 'GRADIENT') {
    if (isPrimitive(row.fill)) unresolved.push(`${component}: fill binds the PRIMITIVE "${row.fill}" — will not adapt between modes`);
    else {
      const v = tokenVar.get(row.fill);
      if (v) s.push(`background:var(${v})`);
      else unresolved.push(`${component}: fill "${row.fill}" has no token`);
    }
  }
  if (row.stroke && row.stroke !== 'LITERAL') {
    if (isPrimitive(row.stroke)) unresolved.push(`${component}: stroke binds the PRIMITIVE "${row.stroke}" — will not adapt between modes`);
    else {
      const v = tokenVar.get(row.stroke);
      if (v) s.push(`border:1px solid var(${v})`);
      else unresolved.push(`${component}: stroke "${row.stroke}" has no token`);
    }
  }
  return s;
}

function render(component, rows, path, depth) {
  const row = rows.get(path);
  if (!row) return '';
  const pad = '  '.repeat(depth);
  const kids = [...rows.keys()].filter(p => p !== path
    && (path === '' ? !p.includes('.') : p.startsWith(path + '.') && p.split('.').length === path.split('.').length + 1))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // An INSTANCE is another component. Use its class; say so if we do not have one.
  if (row.type === 'INSTANCE') {
    // A component that instances ITSELF. `Information box` is a one-child wrapper around
    // an instance of `Information box`, so emitting the class here nests the component
    // inside itself and renders an empty box twice over. The wrapper adds nothing the
    // class does not already have.
    if (row.name === component) {
      unresolved.push(`${component}: instances itself — the wrapper adds nothing, so the class alone is the component`);
      return `${pad}<!-- ${esc(component)} instances itself here; the outer class already is it -->`;
    }
    const c = cls(row.name);
    // The instanced component's NAME goes inside it as sample content. An empty div is
    // not neutral: nearly every component class is inline-flex, so with nothing in it the
    // instance collapses to zero width and the template renders as a stack of slivers —
    // which is how the gallery first looked. The name is also the useful placeholder: it
    // says what to replace.
    if (libClasses.has(c)) {
      // THE VARIANT ATTRIBUTES MATTER MORE THAN THE CLASS. Almost no component paints from
      // its bare class: the colours live behind `[data-*]`, because that is where Figma
      // puts them. `<div class="pf-button">` is a transparent box — it is
      // `data-type="Positive"` that makes it green. A placeholder without the attributes
      // renders the same empty shape the templates exist to replace.
      const attrs = (row.variant || '').split(',').map(x => x.trim()).filter(Boolean)
        .map(x => ` data-${kebab(x.slice(0, x.indexOf('=')))}="${esc(x.slice(x.indexOf('=') + 1))}"`)
        .join('');
      return `${pad}<div class="${c}"${attrs}>${esc(row.name)}</div>`;
    }
    const icon = iconFor(row.name);
    if (icon) {
      const px = parseInt(row.size, 10);
      return `${pad}<!--pf-icon:${icon}${Number.isFinite(px) && px !== 18 ? ' ' + px : ''}-->`;
    }
    // Not a class and not an icon. Every one of these so far has turned out to be a
    // DETACHED component — one the file uses but that sits on no page, so no walk could
    // capture it. They are recorded in uncaptured-reasons.tsv with the reason; the
    // template says so in place rather than pretending the gap is not there.
    const known = detachedNames.has(row.name);
    unresolved.push(`${component}: instances "${row.name}", `
      + (known ? 'a DETACHED component (recorded)' : 'which is neither a class nor an icon'));
    return `${pad}<!-- ${esc(row.name)}: ${known
      ? 'detached from the Figma page tree, so the library has no class for it — see uncaptured-reasons.tsv'
      : 'not in the library'} -->`;
  }

  if (row.type === 'TEXT') {
    const tc = typeClassFor(component, row);
    const colour = tokenVar.get(row.fill);
    const bits = [];
    if (colour) bits.push(`color:var(${colour})`);
    else if (row.fill) unresolved.push(`${component}: text colour "${row.fill}" has no token`);
    if (!tc) {
      // No type class means the label's style is off the ramp or ambiguous — the same 27
      // labels check-component-type reports. Emitting nothing would leave the text at
      // whatever size it inherits, which is not what Figma has: "More details" is 13px and
      // rendered at the browser's 16. The measurement is emitted with the reason, exactly
      // as the stylesheet does for an off-ramp component.
      const m = /^(\d+)px(?:\s+(\S+))?$/.exec(row.font || '');
      if (m) {
        bits.push(`font-size:${m[1]}px`);
        if (m[2] === 'SemiBold' || m[2] === 'Bold') bits.push('font-weight:600');
      }
      unresolved.push(`${component}: text "${row.text}" — no type class (${row.font || 'no font'}), measurement emitted`);
    }
    const style = bits.length ? ` style="${bits.join(';')}"` : '';
    const klass = tc ? ` class="${tc}"` : '';
    const why = tc ? '' : `<!-- ${esc(row.font || '')} is not a text style; see FIGMA-ISSUES.md section 7 -->`;
    return `${pad}<span${klass}${style}>${esc(row.text || 'Text')}</span>${why}`;
  }

  if (row.type === 'LINE' || (row.type === 'RECTANGLE' && parseInt(row.size) > 100 && row.size.endsWith('x0'))) {
    const bound = row.stroke || row.fill;
    if (isPrimitive(bound)) {
      unresolved.push(`${component}: rule binds the PRIMITIVE "${bound}" — will not adapt between modes`);
      return `${pad}<!-- rule: Figma binds "${esc(bound)}", a primitive, which cannot change between modes. `
        + `Left unpainted rather than shipped broken — see FIGMA-ISSUES.md section 1. -->`;
    }
    const v = tokenVar.get(bound);
    return `${pad}<div style="height:1px;align-self:stretch${v ? `;background:var(${v})` : ''}"></div>`;
  }

  // A SLOT is Figma's own "content goes here" marker — and it can still have children,
  // which are the sample content sitting in it. `Browser drop down` is a slot holding
  // seven `Option` instances; returning only the comment threw all seven away and the
  // template rendered an empty box. The slot is a real layout box AND a marker.
  if (row.type === 'SLOT') {
    const style = styleFor(component, row);
    const open = `${pad}<div${style.length ? ` style="${style.join(';')}"` : ''}>`
      + `<!-- SLOT: Figma marks this as where the component's content goes. -->`;
    if (!kids.length) return open + '</div>';
    return [open, ...kids.map(k => render(component, rows, k, depth + 1)), `${pad}</div>`].join('\n');
  }

  // A fill Figma records as IMAGE is artwork, not a colour — the same situation as the
  // header band, which is why assets/component-art/ exists. `Map` is a single rectangle
  // with an image fill, so without this the template was an empty div.
  if (row.fill === 'IMAGE') {
    const [w, h] = (row.size || '').split('x').map(Number);
    return `${pad}<div style="width:100%;${Number.isFinite(h) ? `height:${h}px;` : ''}`
      + `background:var(--pf-bg-tertiary)">`
      + `<!-- artwork: Figma fills this with an IMAGE. Export it through the `
      + `component-art pipeline (see CLAUDE.md) — a placeholder stands in until then. --></div>`;
  }

  const style = styleFor(component, row);
  const open = `${pad}<div${style.length ? ` style="${style.join(';')}"` : ''}>`;
  if (!kids.length) return open + '</div>';
  return [open, ...kids.map(k => render(component, rows, k, depth + 1)), `${pad}</div>`].join('\n');
}

const byComponent = new Map();
for (const r of tree) {
  if (!byComponent.has(r.component)) byComponent.set(r.component, new Map());
  byComponent.get(r.component).set(r.path, r);
}

mkdirSync('dist/templates', { recursive: true });
for (const f of readdirSync('dist/templates')) rmSync('dist/templates/' + f);

const made = [];
// WHAT COUNTS AS COMPOSITE. A component whose only child is an instance of ITSELF is not
// composite — `Information box` is a one-child wrapper around an `Information box`, so its
// class already is the whole component and a template for it would render an empty box
// twice over. Both this and check-templates.mjs must agree on that or one will demand a
// template the other refuses to write.
const isComposite = (component, rows) => [...rows.entries()]
  .some(([path, r]) => path && !(r.type === 'INSTANCE' && r.name === component));

for (const [component, rows] of [...byComponent.entries()].sort()) {
  if (!isComposite(component, rows)) continue;         // the class alone is the component
  const base = cls(component);
  const kids = [...rows.keys()].filter(p => p && !p.includes('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const body = kids.map(k => render(component, rows, k, 1)).join('\n');
  const html = `<!-- ${component} — generated from Figma by scripts/build-templates.mjs.\n`
    + `     The outer element is the component's own class; everything inside is its Figma\n`
    + `     child tree. Do not hand-edit: regenerate with npm run build. -->\n`
    + `<div class="${base}">\n${body}\n</div>\n`;
  writeFileSync(`dist/templates/${base}.html`, html);
  made.push({ component, base, nodes: rows.size, html });
}

// The gallery has to SHOW the icons, not the markers. Same expansion build-prototype.mjs
// does, so what the gallery renders is what a page gets.
function expandIcons(html) {
  return html.replace(/<!--pf-icon:([a-z0-9-]+)(?:\s+(\d+))?-->/g, (m, name, size) => {
    const f = `assets/icons/${name}.svg`;
    if (!existsSync(f)) return m;
    const px = size || 18;
    return readFileSync(f, 'utf8').trim()
      .replace(/^<svg /, `<svg class="pf-icon" width="${px}" height="${px}" aria-hidden="true" focusable="false" `);
  });
}

// ---- the gallery ------------------------------------------------------------
const g = [];
g.push('<meta charset="utf-8">');
g.push('<title>People First — component templates</title>');
g.push(`<style>${readFileSync('dist/fonts.css', 'utf8')}</style>`);
g.push(`<style>${readFileSync('dist/tokens.css', 'utf8')}</style>`);
g.push(`<style>${readFileSync('dist/components.css', 'utf8')}</style>`);
g.push(`<style>${readFileSync('dist/type.css', 'utf8')}</style>`);
g.push(`<style>
  body { margin:0; font-family:var(--pf-font-body); background:var(--pf-bg-secondary);
         color:var(--pf-text-primary); }
  .wrap { padding:var(--pf-space-large); display:flex; flex-direction:column; gap:var(--pf-space-xlarge); }
  .item > h2 { margin:0 0 var(--pf-space-small); }
  .stage { padding:var(--pf-space-large); background:var(--pf-bg-primary);
           border-radius:var(--pf-radius-medium); overflow:auto; }
  pre { margin:var(--pf-space-small) 0 0; padding:var(--pf-space-medium); overflow:auto;
        background:var(--pf-bg-tertiary); border-radius:var(--pf-radius-medium);
        font-size:12px; line-height:1.5; }
</style>`);
g.push('<div class="wrap">');
g.push('<div><h1 class="pf-text-xl-heading">Component templates</h1>');
g.push('<p class="pf-text-body-text">Generated from each component&rsquo;s Figma child tree. '
  + 'Paste the markup; every class in it is a real library class and every colour is a token.</p></div>');
for (const m of made) {
  g.push('<div class="item">');
  g.push(`<h2 class="pf-text-sub-heading">${esc(m.component)} <span class="pf-text-label-text" style="color:var(--pf-text-secondary)">${m.nodes} nodes</span></h2>`);
  g.push(`<div class="stage">${expandIcons(m.html.replace(/^<!--[\s\S]*?-->\n/, ''))}</div>`);
  g.push(`<pre>${esc(m.html.replace(/^<!--[\s\S]*?-->\n/, ''))}</pre>`);
  g.push('</div>');
}
g.push('</div>');
writeFileSync('docs/templates.html', g.join('\n'));

console.log(`${made.length} component template(s) written to dist/templates/, gallery in docs/templates.html`);
if (unresolved.length) {
  const u = [...new Set(unresolved)];
  console.log(`  ${u.length} thing(s) the tree references that the library cannot name:`);
  for (const x of u.slice(0, 20)) console.log('    ' + x);
}
