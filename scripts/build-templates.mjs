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
import { PRIMITIVE_ALIAS } from './primitive-alias.mjs';

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = name => 'pf-' + kebab(name);

const tree = tsv('tokens/_raw/component-tree.tsv');

const css = readFileSync('dist/components.css', 'utf8');

// WHERE A CHILD SITS WHEN THE PARENT DOES NOT LAY OUT.
//
// For an auto-layout parent, order is enough: the template writes the same direction, gap
// and padding and the children land where Figma put them. For a parent laid out NONE there
// is nothing to copy, and flowing the children is not merely imprecise — it is a different
// picture. `Profile image` is 93x93 holding a photo and a `People` instance BOTH at 0,0 at
// 93x93: overlaid in Figma, stacked by the template, 93px tall becoming 184.
//
// Two guards, because a position applied to the wrong node is worse than none:
//   - the tree must carry that exact component and path, and
//   - it must AGREE on the child's size. Two rotated LINE nodes in `Donut pie chart` report
//     a rotated bounding box (0x25) against the tree's unrotated size (25x0); they are
//     refused by this and rendered as before.
const posRows = existsSync('tokens/_raw/component-child-pos.tsv')
  ? tsv('tokens/_raw/component-child-pos.tsv') : [];
const treeByKey = new Map(tree.map(r => [r.component + '|' + r.path, r]));
const ABS = new Map();   // component|path -> the style to apply
const REL = new Set();   // component|path of every parent that must become the origin
//
// THIRD GUARD: THE CLASS MUST CARRY THE WHOLE BOX. A pixel offset is meaningless unless the
// element it is measured inside is the size Figma measured it in. The stylesheet drops a
// width above 120px on purpose — that is the artboard the component was drawn at, not a
// rule — so `.pf-full-page` has no 1920px width to hold a child placed at x=1830. Applying
// the offsets anyway pushed five components' children straight out of their box and the
// overflow count went UP: `Full page`, `Configuration`, `AI Assistant`, `AI Gradient
// component` and `Image picker`, every one of them a component whose width the class drops.
// They are skipped and counted. (Proportional placement would reach them, but a percentage
// height inside a box sized by `min-height` resolves to auto and collapses the child — a
// second silent wrongness to fix the first. That is a deliberate piece of work, not a
// shortcut taken here.)
const bareBox = (base) => {
  const m = new RegExp(`(?<![-\\w])\\.${base} \\{([^}]*)\\}`).exec(css);
  if (!m) return null;
  const w = /(?:^|;|\s)width:\s*(\d+)px/.exec(m[1]);
  const h = /(?:^|;|\s)height:\s*(\d+)px/.exec(m[1]);
  return w && h ? `${w[1]}x${h[1]}` : null;
};
const posSkipped = [];
for (const p of posRows) {
  const row = treeByKey.get(p.component + '|' + p.path);
  if (!row || row.size !== `${p.w}x${p.h}`) continue;
  const parentPath = p.path.includes('.') ? p.path.slice(0, p.path.lastIndexOf('.')) : '';
  const parent = treeByKey.get(p.component + '|' + parentPath);
  if (!parent || (parent.layout && parent.layout !== 'NONE')) continue;
  // THE ORIGIN MUST HAVE A DEFINITE SIZE — and the origin is the PARENT, not the component.
  //
  // An offset is measured inside a box, so the box has to exist. Measured empirically: a
  // class with no width whose children are all absolute renders 0x200, because nothing is
  // left in flow to give it a width. That is why these are gated at all.
  //
  // The first version asked the question of the COMPONENT ROOT — the class must carry the
  // whole box — and so refused every placement in a component whose class drops its artboard
  // width, including placements on inner containers that have nothing to do with the root.
  // An inner origin is given its own measured width and height a few lines below, so it is
  // definite by construction; only a ROOT origin depends on what the class happens to carry.
  if (parentPath === '') {
    const rootSize = (treeByKey.get(p.component + '|') || {}).size;
    if (!rootSize || bareBox(cls(p.component)) !== rootSize) { posSkipped.push(p.component + '|' + p.path); continue; }
  } else if (!/^\d+x\d+$/.test(parent.size || '')) {
    posSkipped.push(p.component + '|' + p.path); continue;
  }
  // BORDER-BOX, because Figma's width and height INCLUDE the frame's padding and CSS's do
  // not. `AI Assistant`'s slot is 1108 wide with 20px padding either side; stated as a
  // content width it rendered 1148 and hung 39px out of its own component.
  ABS.set(p.component + '|' + p.path,
    `position:absolute;left:${p.dx}px;top:${p.dy}px;width:${p.w}px;height:${p.h}px;`
    + `box-sizing:border-box`);
  REL.add(p.component + '|' + parentPath);
}
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

// The measured box for a node, or ''. Placement is applied wherever a node is emitted —
// not only through styleFor — because the IMAGE and INSTANCE branches return their own
// markup and would otherwise flow while their siblings were positioned, which is worse
// than all of them flowing together.
const absStyle = (component, path) => ABS.get(component + '|' + path) || '';

function styleFor(component, row) {
  const s = [];
  // Absolute placement comes FIRST, so a later `align-self:stretch` or `width` from the
  // decorative-box rule below cannot quietly override the measured box.
  const abs = absStyle(component, row.path);
  if (abs) s.push(abs);
  if (REL.has(component + '|' + row.path)) {
    s.push('position:relative');
    // AN ORIGIN WHOSE CHILDREN ARE ALL ABSOLUTE HOLDS NOTHING IN FLOW, so it collapses to
    // zero and everything after it slides up. `Menu`'s inner frame did exactly that and the
    // component's other five children ended up outside its box. The measured size is what
    // the frame is, so it is stated. Not needed on the root — the class carries that box,
    // and the gate above required it to.
    const [rw, rh] = (row.size || '').split('x').map(Number);
    if (row.path && Number.isFinite(rw) && Number.isFinite(rh))
      s.push(`width:${rw}px`, `height:${rh}px`, 'box-sizing:border-box');
  }
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

// WHITE TEXT ON A BACKGROUND WE REFUSED TO PAINT.
//
// Two rules that are each right on their own produce something invisible when they meet.
// `Calendar picker`'s month header binds `Base colours/Blue Charade` as its fill — a raw
// primitive with no semantic equivalent, so the generator correctly drops it rather than
// ship something that cannot do dark mode. Its label binds `Base colours/White`, which
// correctly substitutes `--pf-text-always-white`. The result is white text on the page's
// own background: legible in neither mode, and every check green.
//
// The template cannot represent this pair, so it says so instead of guessing. The test is
// exact rather than a list of light-looking colours: walk the path's ancestors, find the
// nearest one Figma gave a fill, and ask whether THAT fill is a primitive the generator
// dropped. Same shape as FIGMA-ISSUES.md section 9, where `Option` Selected=Yes binds
// inverted text and no background at all.
function onDroppedSurface(rows, path) {
  const parts = path.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const anc = rows.get(parts.slice(0, i).join('.'));
    if (!anc || !anc.fill) continue;
    if (anc.fill === 'LITERAL' || anc.fill === 'IMAGE' || anc.fill === 'GRADIENT') return false;
    if (!isPrimitive(anc.fill)) return false;              // painted from a token; fine
    return !(PRIMITIVE_ALIAS[anc.fill] || {}).background;  // dropped, so nothing is behind
  }
  return false;
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
    // THE MAIN COMPONENT'S NAME, NOT THE INSTANCE'S. An instance can be renamed in Figma
    // and two are: the instance labelled "Key actions" inside `Mobile key actions` is an
    // instance of `[S] Mobile top cards`, and "Control list item" inside `Settings card`
    // is `Checkbox/Radio option/Checkbox/Default`. Looking a component up by a label
    // somebody can retype is the same mistake as trusting a name over a node id.
    const source = row.main || row.name;

    // A component that instances ITSELF. `Information box` is a one-child wrapper around
    // an instance of `Information box`, so emitting the class here nests the component
    // inside itself and renders an empty box twice over. The wrapper adds nothing the
    // class does not already have.
    if (source === component) {
      unresolved.push(`${component}: instances itself — the wrapper adds nothing, so the class alone is the component`);
      return `${pad}<!-- ${esc(component)} instances itself here; the outer class already is it -->`;
    }
    const c = cls(source);
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
      // BUT NOT INTO A CONTROL-SIZED BOX. The label exists because an empty inline-flex
      // instance collapses to a sliver — a box wide enough to hold a word does not have
      // that problem, and a box that ISN'T spills its label over its neighbours. `AG Filter
      // menus` rendered "Multi-select checkbox" across three lines out of a 20x20 tick box
      // and over the option beside it. Below 44px — Figma's own smallest control size —
      // the class paints the box and the name goes in a comment instead.
      const [iw] = (row.size || '').split('x').map(Number);
      const iabs = absStyle(component, row.path);
      const istyle = iabs ? ` style="${iabs}"` : '';
      if (Number.isFinite(iw) && iw > 0 && iw < 44)
        return `${pad}<div class="${c}"${attrs}${istyle}></div><!-- ${esc(source)} -->`;
      return `${pad}<div class="${c}"${attrs}${istyle}>${esc(source)}</div>`;
    }
    const icon = iconFor(source);
    if (icon) {
      const px = parseInt(row.size, 10);
      const marker = `<!--pf-icon:${icon}${Number.isFinite(px) && px !== 18 ? ' ' + px : ''}-->`;
      // AN ICON MARKER IS A COMMENT, and a comment cannot carry a style. Where Figma places
      // this icon by hand the placement has nowhere to go, and it was being dropped while
      // the build counted it as applied — a number that flattered itself. Wrapped in a span
      // so the measurement survives; build-prototype expands the marker inside it either way.
      const iabs = absStyle(component, row.path);
      return iabs ? `${pad}<span style="${iabs}">${marker}</span>` : `${pad}${marker}`;
    }
    // Not a class and not an icon. Every one of these so far has turned out to be a
    // DETACHED component — one the file uses but that sits on no page, so no walk could
    // capture it. They are recorded in uncaptured-reasons.tsv with the reason; the
    // template says so in place rather than pretending the gap is not there.
    const known = detachedNames.has(source);
    unresolved.push(`${component}: instances "${source}"`
      + (source !== row.name ? ` (labelled "${row.name}")` : '') + ', '
      + (known ? 'a DETACHED component (recorded)' : 'which is neither a class nor an icon'));
    return `${pad}<!-- ${esc(source)}: ${known
      ? 'detached from the Figma page tree, so the library has no class for it — see uncaptured-reasons.tsv'
      : 'not in the library'} -->`;
  }

  if (row.type === 'TEXT') {
    const tc = typeClassFor(component, row);
    const bits = [];
    // Placement first, for the same reason the icon branch needs it: this branch builds its
    // own style and never calls styleFor, so a measured offset had nowhere to go. In
    // `Search navigation` the icon WAS placed and the word "Search" was not, and the two
    // rendered on top of each other — placing some children of a hand-laid-out parent and
    // flowing the rest is worse than flowing all of them.
    const tabs = absStyle(component, path);
    if (tabs) bits.push(tabs);
    // A TEXT COLOUR IS SUBJECT TO THE PRIMITIVE RULE TOO — and for a long time it was the
    // one place here that was not. `styleFor` checks a child's fill and stroke, and this
    // branch went straight to tokenVar, which resolves a primitive perfectly well: to the
    // primitive. `Calendar picker`'s month header shipped `color: var(--pf-base-white)`
    // over a background this same generator had correctly refused to paint for binding a
    // primitive, so the heading was white on nothing. Six of these were in the templates.
    // Substitute the semantic token that means the same thing where one exists; otherwise
    // emit no colour at all and say why, because inheriting the page's text colour is
    // readable and an unadaptable one is not.
    const stranded = row.fill && onDroppedSurface(rows, path);
    if (stranded) {
      unresolved.push(`${component}: text "${row.text}" binds "${row.fill}" over a surface whose own `
        + `fill is a primitive with no semantic equivalent — the pair cannot be carried, so the `
        + `colour is left to inherit`);
    } else if (row.fill && isPrimitive(row.fill)) {
      const alias = (PRIMITIVE_ALIAS[row.fill] || {}).color;
      if (alias) bits.push(`color:var(${alias})`);
      else unresolved.push(`${component}: text binds the PRIMITIVE "${row.fill}" and no semantic `
        + `token has that role — left to inherit rather than shipped unable to change between modes`);
    } else {
      const colour = tokenVar.get(row.fill);
      if (colour) bits.push(`color:var(${colour})`);
      else if (row.fill) unresolved.push(`${component}: text colour "${row.fill}" has no token`);
    }
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
    let why = tc ? '' : `<!-- ${esc(row.font || '')} is not a text style; see FIGMA-ISSUES.md section 7 -->`;
    if (stranded) why += `<!-- Figma colours this "${esc(row.fill)}" against a surface it fills with `
      + `a raw primitive. Dropping the surface (it cannot do dark mode) would leave this text `
      + `invisible, so the colour is left to inherit. Give the surface a semantic token in Figma. -->`;
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
    if (!kids.length) return open + cutNote(row) + '</div>';
    const note = cutNote(row, kids.length);
    return [open, ...kids.map(k => render(component, rows, k, depth + 1)),
      ...(note ? [`${pad}  ${note}`] : []), `${pad}</div>`].join('\n');
  }

  // A fill Figma records as IMAGE is artwork, not a colour — the same situation as the
  // header band, which is why assets/component-art/ exists. `Map` is a single rectangle
  // with an image fill, so without this the template was an empty div.
  if (row.fill === 'IMAGE') {
    const [w, h] = (row.size || '').split('x').map(Number);
    const abs = absStyle(component, row.path);
    return `${pad}<div style="${abs ? abs + ';' : `width:100%;${Number.isFinite(h) ? `height:${h}px;` : ''}`}`
      + `background:var(--pf-bg-tertiary)">`
      + `<!-- artwork: Figma fills this with an IMAGE. Export it through the `
      + `component-art pipeline (see CLAUDE.md) — a placeholder stands in until then. --></div>`;
  }

  const style = styleFor(component, row);

  // A DECORATIVE BOX NEEDS ITS SIZE. A template gives children no dimensions on purpose —
  // on a real page they size to their content. But a box that HAS no content and exists
  // only to be seen (a progress track, a coloured bar, a rule) collapses to nothing
  // without one: `Percentage bar` rendered as four empty divs. The rule mirrors the one
  // the stylesheet uses for components — the height IS the design, and a width is carried
  // only when it is small enough to be a rule rather than the artboard.
  if (!kids.length && (row.fill || row.stroke)) {
    const [w, h] = (row.size || '').split('x').map(Number);
    if (Number.isFinite(h) && h > 0) style.push(`min-height:${h}px`);
    if (Number.isFinite(w) && w > 0 && w <= 120) style.push(`width:${w}px`);
    else style.push('align-self:stretch');
  }

  const open = `${pad}<div${style.length ? ` style="${style.join(';')}"` : ''}>`;
  if (!kids.length) return open + cutNote(row) + '</div>';
  const note = cutNote(row, kids.length);
  return [open, ...kids.map(k => render(component, rows, k, depth + 1)),
    ...(note ? [`${pad}  ${note}`] : []), `${pad}</div>`].join('\n');
}

// AN EMPTY BOX HAS TO SAY WHY IT IS EMPTY.
// Until the tree carried a child count there was no way to tell a container Figma leaves
// empty from one the walk stopped short of, and both rendered the same blank div. Whoever
// pasted the template had to open Figma to find out which — or, more likely, assume the
// first and hand-write the contents, which is the whole failure this directory exists to
// prevent. The row now knows, so the markup says.
// THREE different reasons, and saying the wrong one is worse than saying nothing: a reader
// told "depth limit" goes looking for structure the walk skipped, artwork needs the
// component-art pipeline instead, and a collapsed run is not a gap at all — the walk saw
// every one and kept two on purpose, because thirteen identical table rows teach a reader
// nothing the second did not.
//
// `shown` is how many of the node's children reached the template. Zero means the walk
// stopped at this node; fewer than `kids` means it kept a sample of a repeating run.
const WALK_DEPTH = 4;
function cutNote(row, shown = 0) {
  const n = Number(row.kids || 0);
  if (!n || shown >= n) return '';
  if (shown > 0) {
    const more = n - shown;
    return `<!-- ${more} more of the same in Figma (${n} in all) — a repeating run, kept short `
      + `on purpose. Repeat the ${shown === 1 ? 'element' : 'elements'} above for real data. -->`;
  }
  const at = (row.path || '').split('.').length >= WALK_DEPTH;
  return at
    ? `<!-- ${n} child${n === 1 ? '' : 'ren'} here in Figma that this walk did not reach `
      + `(depth limit). Not an empty container — open the component in Figma before filling it. -->`
    : `<!-- ${n} drawing${n === 1 ? '' : 's'} here in Figma — vector paths, which no markup `
      + `can carry. Artwork belongs in assets/component-art/, not in a template. -->`;
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
// A component drawn entirely out of VECTORs is artwork, not a composite. `Tooltip` is a
// 28x28 glyph whose whole tree is vector paths and a boolean operation; turning that into
// nested divs produces an empty box, because the shape lives in path data no markup can
// carry. Those belong in the icon set or the component-art pipeline, not here.
const DRAWING = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON']);
const isComposite = (component, rows) => [...rows.entries()]
  .some(([path, r]) => path
    && !(r.type === 'INSTANCE' && (r.main || r.name) === component)
    && !DRAWING.has(r.type));

// A TEMPLATE'S OUTER ELEMENT IS THE COMPONENT'S CLASS, so there has to BE one.
//
// Figma has two components called `Field` on the Forms page and two called `People`, and
// the extract now keeps them apart as `X (second component)` rather than letting one tree
// land on the other's paths. But only the first of each pair has rules in
// `components.css` — the second `People`'s variants are one per fictional employee, which
// is recorded as content rather than a component. Writing a template for those produced
// `<div class="pf-people-second-component">`, a class nothing defines: the contents render,
// so the empty-box check passes, and the thing is still unpasteable. Named and skipped.
const noClass = [];
for (const [component, rows] of [...byComponent.entries()].sort()) {
  if (!isComposite(component, rows)) continue;         // the class alone is the component
  const base = cls(component);
  if (!libClasses.has(base)) { noClass.push({ component, base }); continue; }
  const kids = [...rows.keys()].filter(p => p && !p.includes('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const body = kids.map(k => render(component, rows, k, 1)).join('\n');
  // THE OUTER ELEMENT IS THE POSITIONING ORIGIN when Figma places this component's own
  // children by hand. Without it they resolve against whatever ancestor on the page happens
  // to be positioned — which is not the component, and on a plain page is the document
  // itself, so every one of them flies to the top-left corner. The first run of this put
  // position:relative on every parent EXCEPT the root, and the overflow count went up.
  const rootRel = REL.has(component + '|') ? ' style="position:relative"' : '';
  const html = `<!-- ${component} — generated from Figma by scripts/build-templates.mjs.\n`
    + `     The outer element is the component's own class; everything inside is its Figma\n`
    + `     child tree. Do not hand-edit: regenerate with npm run build. -->\n`
    + `<div class="${base}"${rootRel}>\n${body}\n</div>\n`;
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
  .note { margin:var(--pf-space-xsmall) 0 0; font-size:13px; color:var(--pf-text-secondary); }
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
  // A COMPONENT MADE FOR A DARK SURFACE NEEDS A DARK STAGE.
  // `Top bar app context` is white text and nothing else: correct, because it sits inside
  // the app header, whose band is the artwork in assets/component-art/. On the gallery's
  // light stage it rendered as nothing at all, which reads as a broken template rather than
  // a correctly-placed one. Detected from the markup rather than a list of names — always-
  // white text and not one background in the whole template — and stood on the token the
  // header itself binds, `Navigation/Nav bg top`, rather than a colour picked to suit.
  const body = expandIcons(m.html.replace(/^<!--[\s\S]*?-->\n/, ''));
  const onDark = /--pf-text-always-white|--pf-icon-always-white/.test(body) && !/background:/.test(body);
  g.push(`<div class="stage"${onDark ? ' style="background:var(--pf-navigation-nav-bg-top)"' : ''}>${body}</div>`);
  if (onDark) g.push('<p class="note">White text and no background of its own — this one is '
    + 'built to sit on the header band, so the stage is the header\'s colour.</p>');
  g.push(`<pre>${esc(m.html.replace(/^<!--[\s\S]*?-->\n/, ''))}</pre>`);
  g.push('</div>');
}
g.push('</div>');
writeFileSync('docs/templates.html', g.join('\n'));

console.log(`${made.length} component template(s) written to dist/templates/, gallery in docs/templates.html`);
// COUNT WHAT REACHED THE PAGE, not what was intended. Reported straight from the written
// templates rather than from the ABS map: the two differed, because a placement on an icon
// marker had nowhere to go and the map did not know that.
const placed = made.filter(m => m.html.includes('position:absolute'));
if (ABS.size) {
  const n = placed.reduce((t, m) => t + (m.html.match(/position:absolute/g) || []).length, 0);
  console.log(`  ${n} child(ren) placed at Figma's own offsets in ${placed.length} component(s) `
    + `whose parent has no auto-layout — without this they flow, and Figma overlays them`);
}
// COUNT THE PLACEMENTS, NOT THE COMPONENTS. A component can have some placements applied
// and others refused — `Image picker` and `Search navigation` do — and listing it as "not
// applied" said something false about the ones that were.
if (posSkipped.length) {
  const comps = [...new Set(posSkipped.map(x => x.split('|')[0]))].sort();
  console.log(`  ${posSkipped.length} measured offset(s) across ${comps.length} component(s) NOT `
    + `applied: the box they are measured inside has no definite size, because the class drops `
    + `the artboard width — ${comps.join(', ')}`);
}
if (noClass.length) {
  console.log(`  ${noClass.length} walked but NOT written — the stylesheet has no class to hang them on:`);
  for (const n of noClass) console.log(`    ${n.component} (would be .${n.base})`);
}
if (unresolved.length) {
  const u = [...new Set(unresolved)];
  console.log(`  ${u.length} thing(s) the tree references that the library cannot name:`);
  for (const x of u.slice(0, 20)) console.log('    ' + x);
}
