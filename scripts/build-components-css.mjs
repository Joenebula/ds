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
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { buildResolver, WEIGHT, declarationsFor } from './resolve-component-type.mjs';
import { PRIMITIVE_ALIAS } from './primitive-alias.mjs';

// THE TYPE LINK (spec fault 4). Until this existed, components.css carried 410 font-size
// and 131 font-weight declarations transcribed from measurements, type.css carried the 23
// Figma text styles, and nothing joined them — so a component could drift off the ramp
// with both files passing their own checks. Now a label whose text style can be named
// COMPOSES it: the component rule emits no type at all, and its selector is collected
// here and emitted once, in a rule generated from the ramp.
const typeResolver = buildResolver();
const resolveType = (component, font, variant = null) => {
  const r = typeResolver.resolve(component, font, variant);
  if (!r || (r.outcome !== 'bound' && r.outcome !== 'matched')) return null;
  // ITALIC IS NOT COMPOSED, and this is deliberate rather than an oversight. The label
  // the walk measures is the FIRST text node in the variant, which on an input is the
  // placeholder — and `Field`'s geometry note records exactly that: "Placeholder text is
  // italic, the value is not." Composing the italic style would put font-style: italic on
  // the input box itself and slant the typed value, a visual change this work has no
  // business making. The generator never emitted italic before and still does not; the
  // size and weight are emitted the old way and check-component-type reports it.
  if (r.italic) return null;
  return r;
};
// Keyed on the style's IDENTITY, not its name: two different styles are both called
// `Desktop text/Button text`, so a map keyed on the name would merge them and emit one
// set of values for both.
const composed = new Map(typeResolver.styles.map(st => [st.id, { style: st, sels: new Set() }]));

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
// The primitive-to-semantic substitution table. Shared with build-templates.mjs so the
// two generators cannot disagree about what a raw primitive stands in for.
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
    if (k === 'State' || k === 'Hover') continue;
    sel += `[data-${kebab(k)}="${val}"]`;
  }

  // A boolean Hover axis is a CSS state, not something a page should have to declare.
  // Emitting it as a required attribute meant `.pf-links` painted NOTHING unless the
  // markup carried data-hover="False" — so a link fell through to the browser's default
  // blue, which is unreadable on a dark surface. The page cannot be expected to know
  // that. False is the resting state and belongs on the bare selector; True is :hover.
  if (props.Hover !== undefined) {
    const on = /^(true|yes)$/i.test(props.Hover);
    const withState = props.State && !/^default$/i.test(props.State)
      ? `${sel}[data-state="${props.State}"]` : sel;
    if (!on) return [withState, `${withState}[data-hover="False"]`];
    return [`${withState}:hover`, `${withState}[data-hover="True"]`];
  }

  const state = props.State;
  if (!state || /^default$/i.test(state)) return [sel];
  const out = [`${sel}[data-state="${state}"]`];
  for (const extra of CSS_STATE[state] || []) out.push(sel + extra.slice(1));
  return out;
}

// ---- geometry -> declarations ----------------------------------------------
const num = s => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };

// Components whose Figma frame clips. Their icons must not shrink — see the fix-up below.
const clipComponents = new Set();

// `isVariant` matters for ZERO. On a base row, "no padding" and "padding: 0" look the
// same and emitting nothing is tidier. On a VARIANT row it is an override, and emitting
// nothing means the base's padding leaks through — Confirmation modal Mobile=True resets
// padding and radius to 0 in Figma and rendered with the desktop variant's 60 10 and its
// 8px radius. Zero is a real value in an override.
function geometryDecls(g, notes, isVariant = false, composedType = null) {
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
  // A variant rule cascades over the base rule, so whichever of the two properties the
  // variant does NOT set leaks through from the base. Spotlight Card's base is 302 tall
  // (a min-height) and its Horizontal=True variant is 218 (a height); the base's
  // min-height won and the variant rendered 302. A variant therefore resets the other
  // property every time rather than relying on which branch it lands in.
  if (h !== null && h <= 260) {
    d.push(`height: ${h}px`);
    if (isVariant) d.push('min-height: 0');
  } else if (h !== null && h <= 700) {
    if (isVariant) d.push('height: auto');
    d.push(`min-height: ${h}px`);
    notes.push(`Figma draws this ${h}px tall; emitted as a minimum, since content decides the real height`);
  } else if (h !== null) {
    // The height is dropped, but a variant still has to clear the base row's floor:
    // Document previewer's base is the 642px Mobile variant and its Tablet and Desktop
    // variants are artboard-tall, so with nothing emitted they inherited 642 and every
    // device rendered the phone. `min-height: 0` and not `height: auto` — the former
    // reads as the absence of a claim, the latter collapses the box to its content.
    if (isVariant) d.push('min-height: 0');
    notes.push(`Figma draws this ${h}px tall — the artboard it sits on, not a rule; dropped`);
  }

  if (isVariant && g.padding === '0') d.push('padding: 0');
  else if (g.padding && g.padding !== '—' && g.padding !== '0') {
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

  // The four-corner form has to be tested BEFORE num(), which parseFloats "16 16 0 0"
  // down to 16 and emits a uniformly rounded box — exactly the shape being corrected.
  const FOUR = /^[\d.]+( [\d.]+){3}$/;
  const r = FOUR.test(g.radius || '') ? null : num(g.radius);
  if (FOUR.test(g.radius || '')) {
    // Four corners, measured individually. This used to be recorded as the single word
    // "mixed" and dropped, so a panel Figma rounds along its top edge only rendered
    // square — the same write-off that lost the header artwork.
    d.push(`border-radius: ${g.radius.trim().split(/\s+/).map(v => v === '0' ? '0' : v + 'px').join(' ')}`);
  } else if (r !== null) {
    if (h !== null && r >= h / 2 - 1) { d.push('border-radius: 999px'); notes.push('pill'); }
    else if (r > 0) d.push(`border-radius: ${r}px`);
    else if (isVariant) d.push('border-radius: 0');
  } else if (g.radius === 'mixed') {
    notes.push('corner radius varies per corner in Figma and has not been measured yet');
  }

  // CLIP in the notes means the Figma frame has clipsContent and a FIXED width, so its
  // label overruns and is cut off. On the web the same box WRAPS instead, which is a
  // different shape entirely — Clock in went from one line to two and lost its pill.
  // A Figma text node with textAutoResize WIDTH_AND_HEIGHT never wraps, so nowrap plus
  // the clip is the faithful translation, not an embellishment.
  if (/\bCLIP\b/.test(g.notes || '')) {
    d.push('overflow: hidden');
    d.push('white-space: nowrap');
    notes.push('Figma clips this frame and its label overruns; nowrap + hidden reproduces that');
    clipComponents.add(cls(g.component));
  }

  // Auto-layout. Direction matters even when the gap is 0 — without it a vertical
  // stack like `Form field` (label above input) lays out sideways.
  const ALIGN = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
  const JUSTIFY = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
  const [mode, counter, primary] = (g.layout || '').split(/\s+/);
  const gap = num(g.gap);

  if (mode === 'HORIZONTAL' || mode === 'VERTICAL') {
    d.push('display: inline-flex');
    d.push(`flex-direction: ${mode === 'VERTICAL' ? 'column' : 'row'}`);
    // CENTRING OR END-ALIGNING CONTENT THAT OVERFLOWS PUTS ITS START OUT OF REACH.
    //
    // `.pf-secondary-nav` is `justify-content: center` and holds a 524px strip of tabs. Give
    // it less room than that — a phone — and a centred flex row spills equally BOTH ways, so
    // the first tab sat 83px off the left edge where no amount of scrolling reaches it.
    // Reported from a phone as the first tab being cut off, and it was: permanently.
    //
    // `safe` is the CSS keyword for exactly this and it changes nothing whatsoever while the
    // content fits — it only takes effect in the overflow case, which is the case where the
    // named alignment loses content. `flex-start` needs no guard: it already puts the start
    // of the content at the start of the box.
    // ONLY ON A ROW'S justify-content, and the first attempt proved why the scope matters.
    // Guarding align-items too made it worse in two places at once: `Navigation item` is a
    // COLUMN, so its align-items is the horizontal axis, and `safe` turned a "Notifications"
    // label that overflowed 8px each side into one that overflowed 16px on one — the layout
    // check caught it — while the header's "HR" and "Clock-in" shifted off the band they are
    // painted against and dropped to 1.04:1 contrast.
    //
    // The loss `safe` prevents is specific: content pushed past the START of the inline axis
    // goes off the left of the page and there is no scrolling back to it. Overflow up or down
    // is not lost, because the page scrolls; overflow centred within a fixed-width label is
    // not lost either, it is just centred. So the guard belongs on one property in one
    // direction, which is also the one the report was about.
    const horizontal = String(g.layout || '').startsWith('HORIZONTAL');
    const safeJustify = v =>
      (horizontal && v !== 'flex-start' && v !== 'space-between') ? `safe ${v}` : v;
    if (ALIGN[counter]) d.push(`align-items: ${ALIGN[counter]}`);
    if (JUSTIFY[primary]) d.push(`justify-content: ${safeJustify(JUSTIFY[primary])}`);
    // A variant row's 0 has to be EMITTED, not skipped: the variant rule cascades over
    // the base rule, so a skipped 0 silently inherits the base row's gap. Tertiary nav
    // Mobile=Yes/Page=Yes is gap 0 in Figma and was rendering the desktop row's 40.
    // Same fault as padding and radius, which were fixed without noticing gap shared it.
    if (gap !== null && (gap > 0 || (isVariant && gap === 0))) d.push(`gap: ${gap}px`);
  } else if (gap !== null && gap > 0) {
    // Direction not captured for this component — fall back to a row, and say so.
    d.push('display: inline-flex', 'align-items: center', `gap: ${gap}px`);
    notes.push('layout direction not captured; assumed a row');
  } else if (w !== null || h !== null) {
    // No auto-layout, but a fixed size. An inline element ignores width and height,
    // so the box would silently collapse.
    d.push('display: inline-block');
  }

  // TYPE IS NOT WRITTEN HERE WHEN THE LABEL HAS A TEXT STYLE. Where Figma binds a style —
  // or binds nothing but exactly one style has the label's size, weight, tracking and case
  // — the component COMPOSES that style instead of carrying a transcribed copy of its
  // values. The selector is collected and emitted once, at the end, in a rule generated
  // from the type ramp. That is the fix for fault 4: there is one declaration site per
  // style, so a component cannot drift from the ramp while both files pass.
  //
  // Where the label is ambiguous or off the ramp the measured values are still written
  // here, because refusing to guess is the point and a 12px label is real even though no
  // style has it. check-component-type.mjs reports every one.
  const f = (g.font || '').match(/^(\d+)px(?:\s+(\w+))?/);
  if (f && !composedType) {
    d.push(`font-size: ${f[1]}px`);
    if (f[2] === 'SemiBold' || f[2] === 'Bold') d.push('font-weight: var(--pf-font-weight-bold)');
    else if (f[2] === 'Regular') d.push('font-weight: var(--pf-font-weight-regular)');
    // "Italic" here is placeholder styling, not the component's font — see the
    // geometry notes. Deliberately not emitted.
    //
    // LINE HEIGHT, for the same reason the composed rules state it: a declaration a class
    // omits is one the PAGE supplies. These 49 rules stated a measured size and no line
    // height, so a page setting `line-height: 1.9` stretched every off-ramp component label
    // on it, and nothing could see it — an absent declaration is invisible to anything that
    // reads the stylesheet.
    //
    // `normal` is measured, not assumed. Every text node inside a component on all twelve
    // product pages was read: 3370 of 3377 set line height to AUTO. The seven that do not
    // are deep children rather than a component's own label — six are the ": " separator in
    // `Footer (AG)`'s pagination at 19.5px, one is a "+3" counter at 109.68% — so none of
    // them is the label whose type is emitted here.
    d.push('line-height: normal');
  }
  return d;
}

// A COMPONENT-LEVEL TEXT COLOUR THAT IS REALLY ONE CHILD'S.
//
// The colour extract gives a component one fill, one stroke and one text colour. For a
// component that IS one box that is exactly right. For a composite one it takes whichever
// label Figma recorded and paints EVERY descendant with it: `.pf-calendar-picker` shipped
// `color: var(--pf-text-always-white)`, so the whole calendar — weekday names, dates,
// disabled days — rendered white on white, while every check stayed green.
//
// Two components can look identical in that extract and mean opposite things.
// `Top bar app context` also binds white text and no fill, and there it is CORRECT: the
// component sits on the header band, which is dark. The difference is not in the colour
// record, it is in the tree — Calendar picker's labels bind four different colours and
// only one of them is white, Top bar app context's bind one. So the tree decides.
//
// Narrow on purpose: only a colour that came from a PRIMITIVE substitution, only where
// the tree disagrees with it. Everything else keeps the colour the extract recorded.
const labelColours = new Map();
try {
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!c[1] || c[2] !== 'TEXT' || !c[12]) continue;
    if (!labelColours.has(c[0])) labelColours.set(c[0], new Set());
    labelColours.get(c[0]).add(c[12]);
  }
} catch { /* the tree is optional input; without it nothing is dropped */ }
const colourIsOneChilds = (component) => (labelColours.get(component) || new Set()).size > 1;

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
        if (prop === 'color' && colourIsOneChilds(row.component)) {
          d.push(`/* Figma records "${figmaName}" as this component's text colour, but its child`);
          d.push(`   tree binds ${labelColours.get(row.component).size} different label colours — this is one of them`);
          d.push(`   promoted to all. Emitting it painted every label alike; the template gives`);
          d.push(`   each its own. See docs/FIGMA-ISSUES.md section 9. */`);
          sourceIssues.set(`${row.component} — ${figmaName} (${prop})`,
            `dropped — one child's colour recorded for the whole component; the tree has `
            + `${labelColours.get(row.component).size} label colours`);
          return;
        }
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
// A LABEL FIGMA DRAWS ON ONE LINE MUST NOT WRAP ONTO TWO.
//
// Reported from a phone: the filter chips and the nav tabs were rendering "Nav tabs" and
// "Filter chip" stacked over two lines. Figma is unambiguous — `Nav tabs` is a 40px component
// whose Label TEXT node is 40x22, and `Filter chip` is 42px around a 42x22 label. One line of
// 22px. A second line is ~44px and does not fit inside the component at all, so a wrap does
// not just look wrong, it pushes the text out of the box: `Nav tabs` and `Table action bar`
// were two of the four templates that overflow ONLY once the class shrinks to its mobile
// artboard, which is the same fault measured from the other end.
//
// The test is measured, not a list of component names. A TEXT node shorter than twice its own
// font-size is one line; `AI message bubble` (88px at 16px) and `Configuration panel` (68px at
// 13px) are real paragraphs and are excluded, as are 14 components whose height is auto or
// too tall to state, where a wrap is survivable rather than impossible. What is left is 72
// components whose height is FIXED and whose every label is one line.
const singleLineText = new Map();     // component -> true when every TEXT node is one line
for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
  const c = line.split('\t');
  if (c[2] !== 'TEXT') continue;
  const size = /^(\d+)x(\d+)$/.exec((c[7] || '').trim());
  const font = /^(\d+)px/.exec((c[15] || '').trim());
  if (!size || !font) continue;
  const oneLine = +size[2] < 2 * +font[1];
  singleLineText.set(c[0], (singleLineText.get(c[0]) ?? true) && oneLine);
}
let nowrapCount = 0;

const hoistedFills = new Map();   // component -> the fill every one of its variants binds
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
  // Resolve the label's text style before emitting, so the type can be composed rather
  // than transcribed. A null result means ambiguous or off the ramp: the measured values
  // stay, and check-component-type.mjs reports it.
  const baseType = g ? resolveType(component, g.font) : null;
  const geo = geometryDecls(g, notes, false, baseType);
  if (baseType && baseType.resolved) composed.get(baseType.resolved.id).sels.add('.' + base);

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
    // A FILL EVERY VARIANT AGREES ON BELONGS ON THE BARE CLASS.
    //
    // The colour rules are emitted per variant, so a class painted nothing until a page
    // wrote a data attribute. For a component whose variants genuinely differ — `Button`
    // has eight fills, `Tags` seven — that is right: there is no single value, and the
    // page must choose. For 19 of them there IS one. Every `Side panel` variant binds
    // `Background/Primary`; every `Nav tabs` variant binds `Navigation/Nav bg top`. The
    // fact is unambiguous in Figma and the stylesheet was throwing it away, so
    // `<div class="pf-side-panel">` — which is exactly what that component's own template
    // writes — rendered a transparent panel.
    //
    // The `background: transparent` below is not a default; it is a reset, and its reason
    // is a variant Figma gives NO fill (`Button Type=Hollow`) falling through to the UA's
    // grey buttonface. Where every variant binds a fill, no variant lacks one, so there is
    // nothing for the reset to protect against and the shared value takes its place.
    const fills = new Set(rows.map(r => r.fill || ''));
    const sharedFill = rows.length && fills.size === 1 && [...fills][0] ? [...fills][0] : null;
    const sharedDecls = sharedFill
      ? colourDecls({ component, fill: sharedFill, stroke: '', text: '' })
      : [];
    // Only a real background survives. A primitive with no semantic equivalent comes back
    // as a comment, or as a value that cannot change between modes — hoisting that would
    // put the one thing this repo forbids on 19 bare classes at once.
    // `var(...)` is not the test — a PRIMITIVE resolves to a var too, and the first version
    // of this guard duly hoisted `var(--pf-base-white)` onto `.pf-toast-message`. The test
    // is the one this repo states everywhere else: a `--pf-base-*` token is a fixed hex that
    // cannot change between modes. Where colourDecls substitutes a semantic alias for a
    // primitive the result is semantic and hoists fine; where no alias exists it emits the
    // primitive itself, and that stays on the variant rules where it already was rather
    // than being spread to the bare class as well.
    const semanticBg = sharedDecls.some(d => /^background:\s*var\(--pf-(?!base-)/.test(d));
    const hoisted = semanticBg
      ? sharedDecls.filter(d => /^background:/.test(d) || d.startsWith('/*') || d.startsWith('   '))
      : [];
    if (hoisted.length) {
      hoistedFills.set(component, sharedFill);
      for (const d of hoisted) out.push(d.startsWith('/*') || d.startsWith('   ') ? `  ${d}` : `  ${d};`);
    } else {
      out.push('  background: transparent;');
    }
    out.push('  margin: 0;');
    out.push(rows.some(r => r.stroke)
      ? '  border: 1px solid transparent;'
      : '  border: 0;');
    out.push('  box-sizing: border-box;');
    out.push('  font-family: var(--pf-font-body);');
    // Only where the height is STATED. geometryDecls emits an exact height below 260px and a
    // minimum above it; a component free to grow can afford a second line, one pinned to
    // 40px cannot.
    if (singleLineText.get(component) && geo.some(d => /^height:\s*\d+px$/.test(d))) {
      out.push('  white-space: nowrap;');
      nowrapCount++;
    }
    out.push('}');
    ruleCount++;
  }

  for (const vg of geometryByVariant.get(component) || []) {
    const vnotes = [];
    const vType = resolveType(component, vg.font, vg.variant);
    const vdecls = geometryDecls(vg, vnotes, true, vType);
    const sels = selectorsFor(base, parseVariant(vg.variant));
    // A variant whose ONLY difference from the base row was its type now emits no
    // declarations of its own — its type comes from the composed rule instead. The
    // selector still has to be collected, or the variant would silently inherit the base
    // row's style: Nav tabs Selected is SemiBold and Unselected is not.
    if (vType && vType.resolved) for (const sel of sels) composed.get(vType.resolved.id).sels.add(sel);
    if (!vdecls.length) continue;
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
    // A component with exactly ONE variant has no alternative to choose between, so its
    // colours belong on the bare class as well as behind the attribute. Card binds
    // Background/Primary under `Property 1=Default`; without this, `class="pf-card"`
    // rendered a transparent box and the card vanished into the page. There is nothing
    // for the bare selector to conflict with, so this cannot mask another variant.
    if (rows.length === 1 && !sels.includes(`.${base}`)) sels.unshift(`.${base}`);
    out.push(`${sels.join(',\n')} {`);
    for (const d of decls) out.push(`  ${d.startsWith('/*') ? d : d + ';'}`);
    out.push('}');
    ruleCount++;
  }

  for (const a of artByComponent.get(component) || []) {
    // "*" means the artwork belongs to the component itself, not to one variant —
    // the default avatar is the same picture at every size.
    if (a.variant === '*') {
      out.push(`.${base} {`);
      out.push(`  background-image: url("${a.uri}");`);
      out.push('  background-size: cover;');
      out.push('  background-position: center;');
      out.push('  background-repeat: no-repeat;');
      out.push('}');
      ruleCount++;
      continue;
    }
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

// A clipping flex box squeezes its children instead of overflowing them, so the icon
// inside Clock in collapsed to a sliver — the box was right and the contents were not.
// In Figma the icon is a fixed 22x22 and simply overruns. flex:none says the same thing.
if (clipComponents.size) {
  out.push('/* A fixed-size icon inside a clipping flex box must not shrink; in Figma it');
  out.push('   keeps its size and the frame cuts it off. */');
  out.push([...clipComponents].sort().map(c => `.${c} > svg, .${c} > img`).join(',\n') + ' {');
  out.push('  flex: none;');
  out.push('}');
  out.push('');
}

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

// ---- the composed type layer -----------------------------------------------
//
// One rule per text style, listing every component selector whose label uses it. This is
// the whole of fault 4's fix: the values are generated from tokens/_raw/text-styles.tsv,
// the same file type.css is generated from, so a component and the type ramp cannot
// disagree. Before this, each component carried its own transcribed copy.
//
// Emitted LAST so that where a selector appears both here and in a component rule, this
// wins. That cannot currently happen — a selector is only collected when its component
// rule suppressed its type — but the ordering makes the intent explicit rather than
// depending on it never happening.
//
// Specificity still does the right thing between rules here: `.pf-nav-tabs` and
// `.pf-nav-tabs[data-status="Selected"]` land in different styles (Body text and Body
// text semibold), and the attribute selector is more specific, so Selected stays
// SemiBold.
const composedRules = [...composed.values()].filter(c => c.sels.size)
  .sort((a, b) => (a.style.name + a.style.size).localeCompare(b.style.name + b.style.size));
if (composedRules.length) {
  out.push('/* ---- type, composed from the Figma text styles -------------------------');
  out.push(' *');
  out.push(' * Each rule below IS a text style from tokens/_raw/text-styles.tsv, applied to');
  out.push(' * every component label Figma gives that style. No component carries its own');
  out.push(' * font-size or font-weight where its style could be named, so the library and');
  out.push(' * the type ramp have one source rather than two that can drift apart.');
  out.push(' *');
  out.push(' * A component NOT listed here has type the ramp cannot express — an ambiguous');
  out.push(' * match, or a size the ramp does not contain. Those keep their measured values');
  out.push(' * and are reported by scripts/check-component-type.mjs.');
  out.push(' */');
  for (const { style: st, sels } of composedRules) {
    // The name alone would be a lie where two styles share one, so the size is named too.
    const name = `${st.name}  (${st.size}px ${st.weight || 'Regular'}${st.textCase === 'UPPER' ? ', uppercase' : ''})`;
    // One source with build-type-css.mjs. A component class already sets font-family in its
    // own base rule, so it is the one declaration this does not repeat.
    const d = declarationsFor(st);
    out.push('');
    out.push(`/* ${name} */`);
    out.push([...sels].sort().join(',\n') + ' {');
    for (const x of d) out.push(`  ${x};`);
    out.push('}');
    ruleCount++;
  }
  out.push('');
}

// ---- boxes that centre one thing ------------------------------------------
//
// Reported from a screen: the icon at the top sat in the corner of its circle and was too
// small. `.pf-circle-icons` is generated, so every use of it was wrong the same way, and
// the one page here that looks right only does so because it carries a local
// `place-items: center` — hand-written component CSS by another name.
//
// Figma lays these out as `NONE`, so the geometry extract has no alignment to give and
// this generator rightly emitted none. What it does have, in `component-inner.tsv`, is a
// measurement: the child's offsets are equal on both axes (so it IS centred, rather than
// that being a guess) and its size is recorded per VARIANT — a 28px circle holds an 18px
// icon, a 52px one holds 36. Both facts are emitted.
//
// `inline-grid` rather than `grid` because these sit inline beside a heading, which is
// where the reported one was; the size variants already set their own box.
// WHICH SIDES ARE ACTUALLY STROKED, AND HOW THICKLY.
//
// The colour extract records a stroke's TOKEN and nothing else, so every component with a
// bound stroke was painted `border: 1px solid <token>` — a cage, one pixel, all four
// sides. `component-stroke-sides.tsv` carries the departures, measured from Figma: which
// edges carry a weight, what that weight is, and whether the paint is switched on at all.
//
// `Nav tabs` is the case that surfaced it. It is a file-folder tab: unselected it rules
// only its BOTTOM edge; selected it rules top, left and right and leaves the bottom OPEN
// so the tab joins the panel below. Drawn as a box, every tab became an outlined rectangle
// and the selected one no longer read as selected.
//
// These land on the variant selector for the same reason the centred-child rules do — the
// per-variant geometry rules outrank the bare class whatever the order — and after the
// colour rules, which set `border-color` and never a width, so the two do not fight.
// WHICH AXES A CLASS ACTUALLY USES — and why a measured variant string is not the answer.
//
// Figma names a variant with every axis it has: `Type=Standard, Darkmode=False`. The
// stylesheet does not: the colour extract collapses an axis that changes nothing, so the
// rules for Clock in are `.pf-clock-in[data-type="Standard"]` and a page writes only
// data-type. A rule generated from the full Figma string therefore reads
// `[data-type="Standard"][data-darkmode="False"]` and matches NOTHING a page ever writes —
// it sits in the file looking correct and does nothing, which is this project's oldest
// failure mode wearing a new hat. check-stroke-sides did not catch it either, because the
// check builds its own markup and wrote every axis; check-off-system caught it, by noticing
// the page still had to set the border width by hand.
//
// The authority is the stylesheet already generated above: whatever `data-` attributes its
// own selectors use for this class are the axes a page is expected to write.
const axesUsedBy = (base) => {
  const seen = new Set();
  // A run of attribute selectors, allowing SPACES inside a value: Figma names a size
  // `XS - 28px`, and a pattern that stopped at whitespace found no axes for Circle icons
  // at all, so all four sizes collapsed onto the bare class and a 28px circle got the
  // 52px circle's icon. check-component-inner caught it, which is what it is for.
  const re = new RegExp(`\\.${base}((?:\\[[^\\]]*\\])+)`, 'g');
  for (const m of out.join('\n').matchAll(re))
    for (const a of m[1].matchAll(/\[data-([a-z0-9-]+)=/g)) seen.add(a[1]);
  return seen;
};
// Build a variant selector from a Figma variant string, keeping only the axes the class
// really uses. Returns null when the component has no attribute selectors at all, which
// means the class is not variant-addressable and the rule belongs on the bare class.
const variantSel = (base, variant) => {
  if (!variant) return '';
  const axes = axesUsedBy(base);
  return variant.split(', ').map(v => {
    const axis = kebab(v.slice(0, v.indexOf('=')));
    return axes.has(axis) ? `[data-${axis}="${v.slice(v.indexOf('=') + 1)}"]` : '';
  }).join('');
};

let strokeSideSkips = [];
const sideClashes = new Set();
const sideRows = existsSync('tokens/_raw/component-stroke-sides.tsv')
  ? tsv('tokens/_raw/component-stroke-sides.tsv') : [];
if (sideRows.length) {
  const noStrokeToken = new Set();
  const sideSeen = new Map();
  out.push('/* Borders Figma does not draw as a 1px box: per-side weights, widths that are');
  out.push(' * not 1px, and strokes switched off in the file. Measured into');
  out.push(' * tokens/_raw/component-stroke-sides.tsv; every component absent from it strokes');
  out.push(' * 1px on all four sides. */');
  for (const r of sideRows) {
    const base = cls(r.component);
    if (!byComponent.has(r.component)) continue;   // no class to hang it on
    // A WIDTH WITH NO COLOUR IS NOT A BORDER. A component gets a border STYLE at all only
    // where some variant binds a stroke token, and four bind none — for three different
    // reasons: `AI banner` and `AI card modal` are stroked with a GRADIENT, which no colour
    // variable can carry; `Status` keeps a paint Figma has switched off; `Mobile bottom
    // navigation` binds no stroke paint at all. Emitting a width on any of them paints
    // nothing, because border-style stays `none`. They are skipped and NAMED rather than
    // skipped silently — the missing colour is a real gap in what the extract can carry.
    if (!byComponent.get(r.component).some(x => x.stroke)) { noStrokeToken.add(r.component); continue; }
    const at = variantSel(base, r.variant);
    const px = n => (Number(n) ? `${Number(n)}px` : '0');
    const width = r.visible === 'no' ? '0'
      : `${px(r.top)} ${px(r.right)} ${px(r.bottom)} ${px(r.left)}`;
    // DROPPING AN AXIS CAN MAKE TWO ROWS ONE. Where the two then disagree there is no
    // honest rule to write — the stylesheet cannot tell the variants apart — so nothing is
    // written and the clash is named. Where they agree, one rule covers both, which is
    // what collapsing the axis meant in the first place.
    const key = `.${base}${at}`;
    if (sideSeen.has(key)) {
      if (sideSeen.get(key) !== width) sideClashes.add(`${r.component} (${key})`);
      continue;
    }
    sideSeen.set(key, width);
    out.push(`${key} {`);
    // A paint that is switched off in Figma is kept in the file and draws nothing. The
    // colour rule above still binds its token — mirroring Figma, which also keeps the paint
    // — and the width is what makes it invisible, exactly as it is in the design.
    out.push(`  border-width: ${width};`);
    out.push('}');
    ruleCount++;
  }
  out.push('');
  if (noStrokeToken.size)
    strokeSideSkips = [...noStrokeToken].sort();
}

const innerRows = existsSync('tokens/_raw/component-inner.tsv')
  ? tsv('tokens/_raw/component-inner.tsv') : [];
if (innerRows.length) {
  out.push('/* Boxes that hold one centred child. Figma lays these out as NONE — no auto-');
  out.push(' * layout — so the alignment is not in the geometry extract; it is measured');
  out.push(' * separately in tokens/_raw/component-inner.tsv, along with the child size for');
  out.push(' * each variant. Without these a page has to centre the icon itself, which is');
  out.push(' * component CSS the page should never be writing. */');
  const seen = new Set();
  for (const r of innerRows) {
    const base = cls(r.component);
    // THE CENTRING GOES ON THE SAME SELECTOR AS THE BOX, not on the bare class.
    //
    // A size variant carries its own `display: inline-block` — every variant row does,
    // because that is what the geometry extract measured. `.pf-circle-icons` alone is one
    // class and `.pf-circle-icons[data-size="XS - 28px"]` is a class plus an attribute, so
    // the variant wins on specificity no matter how late the bare rule is written. The
    // first version of this put `inline-grid` on the bare class, and the icon rendered
    // 18px inside a 28px circle sitting against the top edge: correct size, no centring,
    // which is half the fault the user reported and looks like the whole thing is fixed.
    const box = `.${base}${variantSel(base, r.variant)}`;
    if (!seen.has(box)) {
      seen.add(box);
      out.push(`${box} {`);
      out.push('  display: inline-grid;');
      out.push('  place-items: center;');
      out.push('}');
      ruleCount++;
    }
    const [w, h] = (r.child || '').split('x').map(Number);
    if (!Number.isFinite(w) || !Number.isFinite(h)) continue;
    // Where the class is not variant-addressable — `Waffle` is shape-only, so the
    // stylesheet has no `[data-theme=...]` rule for it and a page cannot select one — all
    // fifteen of its variants collapse onto the bare class. They measure the same 32px
    // child, so one rule is the whole truth; fifteen identical copies of it were not.
    if (seen.has(box + ' > *')) continue;
    seen.add(box + ' > *');
    out.push(`${box} > * {`);
    out.push(`  width: ${w}px;`);
    out.push(`  height: ${h}px;`);
    out.push('}');
    ruleCount++;
  }
  out.push('');
}

// THE SHADOW A COMPONENT CASTS.
//
// This file used to contain the string "box-shadow" zero times, while Figma put a drop
// shadow on 50 component variants — `Card`, `Side panel`, `Side filter`, `Toast message`,
// `Tool tip`, `Action menu`, `Table card (AG)`, `Header navigation`, `Side navigation`:
// every floating surface in the system, rendering flat against the page.
//
// THE DESIGN SYSTEM HAS EXACTLY TWO SHADOW TOKENS and this does not invent a third. Where a
// measurement matches a token exactly, the token is emitted. Where it does not, NOTHING is
// emitted and the shadow is reported: writing Figma`s rgba straight into the rule would put
// a raw colour in generated CSS, which is this project`s first rule, and freeze it across
// both modes into the bargain. A shadow the design system has no token for is a gap in the
// design system, and the build says so rather than papering over it.
const SHADOW_TOKENS = [
  // token, [x, y, blur, spread], r,g,b,a — read from dist/tokens.css, not from memory.
  ['--pf-shadow-drop-shadow', [0, 0, 4, 0], '193,193,193,1'],
  ['--pf-shadow-modal-header-shadow', [0, 4, 4, 0], '0,0,0,0.102'],
];
const shadowRows = existsSync('tokens/_raw/component-shadow.tsv')
  ? tsv('tokens/_raw/component-shadow.tsv') : [];
const shadowUnmatched = new Map(), shadowNotAShadow = new Map();
if (shadowRows.length) {
  const byVariant = new Map();
  for (const r of shadowRows) {
    if (!byComponent.has(r.component)) continue;      // no class to hang it on
    if (r.type !== `DROP_SHADOW`) {
      shadowNotAShadow.set(`${r.component} ${r.variant || `*`}`, r.type);
      continue;
    }
    // Figma`s alpha is rounded to three places; the token`s comes from an 8-digit hex, so
    // #0000001a is 26/255 = 0.10196. Compare at the precision both can express.
    const near = (a, b) => Math.abs(a - b) < 0.006;
    const [cr, cg, cb, ca] = (r.colour || ``).split(`,`).map(Number);
    const hit = SHADOW_TOKENS.find(([, geo, col]) => {
      const [tr, tg, tb, ta] = col.split(`,`).map(Number);
      return geo[0] === Number(r.x) && geo[1] === Number(r.y)
        && geo[2] === Number(r.blur) && geo[3] === Number(r.spread)
        && tr === cr && tg === cg && tb === cb && near(ta, ca);
    });
    if (!hit) {
      shadowUnmatched.set(`${r.component} ${r.variant || `*`}`,
        `${r.x} ${r.y} ${r.blur} ${r.spread} rgba(${r.colour})`);
      continue;
    }
    const sel = `.${cls(r.component)}${variantSel(cls(r.component), r.variant)}`;
    if (!byVariant.has(sel)) byVariant.set(sel, []);
    byVariant.get(sel).push(hit[0]);
  }
  if (byVariant.size) {
    out.push(`/* Drop shadows. Figma puts one on every floating surface; the design system has`);
    out.push(` * two shadow tokens and a measurement is emitted only where it matches one`);
    out.push(` * exactly. Measured into tokens/_raw/component-shadow.tsv. */`);
    for (const [sel, tokens] of [...byVariant.entries()].sort()) {
      out.push(`${sel} {`);
      out.push(`  box-shadow: ${[...new Set(tokens)].map(t => `var(${t})`).join(`, `)};`);
      out.push(`}`);
      ruleCount++;
    }
    out.push(``);
  }
}

mkdirSync('dist', { recursive: true });
// ---- responsive: carry Figma's own mobile and tablet variants to the viewport ---------
//
// Figma draws 52 components at more than one width — `Header` at 1830 and 390, `Header
// navigation` at 1830/768/390, `Full page` at 1830/768/375 — and the stylesheet exposed
// every one of them as a data attribute and nothing else. So the library did not respond
// to the viewport at all: the ONLY way to get the mobile header was for a page to write
// data-mobile="Yes" itself, and every page in this repo instead hard-writes Desktop. A
// phone got the desktop component in a 390px window.
//
// This is a POST-PASS over the rules already emitted, on purpose. Re-deriving the mobile
// declarations from the geometry and colour extracts would produce a second copy that can
// drift from the attribute-driven one; mirroring the emitted rule cannot. The media rule is
// the SAME declarations with the responsive axis stripped out of the selector.
//
// PRECEDENCE IS THE WHOLE DESIGN. The mirrored rule carries one attribute fewer than the
// rule it mirrors, so a page that deliberately pins a variant — data-mobile="No" — still
// outranks the media query at every width and keeps working exactly as before. Nothing
// existing changes; only markup that says nothing about breakpoint starts responding.
//
// THE BOUNDARIES: 768 is measured — it is the width Figma draws every tablet artboard at
// (768, 774, 801) and no mobile artboard exceeds 392. 1024 is CHOSEN, not measured: Figma
// has no artboard between 801 and 1130, so the line between tablet and desktop is a
// judgement and is named here rather than presented as a reading of the file.
const RESPONSIVE_AXES = ['mobile', 'tablet', 'device', 'breakpoint'];
const bucketOf = (axis, value) => {
  const v = String(value).toLowerCase();
  if (axis === 'mobile') return /^(yes|true)$/.test(v) ? 'mobile' : null;
  if (axis === 'tablet') return /^(yes|true)$/.test(v) ? 'tablet' : null;
  if (axis === 'device' || axis === 'breakpoint') {
    if (v === 'mobile') return 'mobile';
    if (v === 'tablet') return 'tablet';
    return null;                      // Desktop is the default and needs no query
  }
  return null;
};

// A PAGE THAT WRITES THE BREAKPOINT ATTRIBUTE OWNS THE BREAKPOINT.
//
// Specificity alone does not deliver that. `Header`'s desktop rules are keyed on the theme
// as well (`[data-theme="Classic"][data-mobile="No"]`), so `<div class="pf-header"
// data-mobile="No">` matches NO desktop rule at all, and the mirrored phone rule — which by
// construction no longer carries a breakpoint attribute — won on the bare class. Measured:
// it went to 62px on a phone having been told not to. Sixteen classes did this, every page
// in this repo pins Desktop, and the plain reading of "explicit wins" was simply false.
//
// So every mirrored rule is guarded against the attribute existing AT ALL, whatever its
// value. Present means the page is managing breakpoints itself and these rules stand down;
// absent means it is not, and they apply.
const GUARD = RESPONSIVE_AXES.map(a => `:not([data-${a}])`).join('');
const guarded = sel => sel.replace(/^(\.[a-z0-9-]+(?:\[[^\]]*\])*)/, `$1${GUARD}`);

const emitted = out.join('\n');
const mobileRules = [], tabletRules = [];
const byBucket = new Map();
let bareHoisted = 0;
const respComponents = new Set();

// EACH SELECTOR IN A LIST IS JUDGED ON ITS OWN. The composed-type rules carry one selector
// list spanning dozens of components — `.pf-filter-chip, .pf-header[data-mobile="Yes"], …` —
// and bucketing the list as a whole mirrored every unrelated component into the phone media
// query because ONE member mentioned mobile. Harmless here only because the declarations are
// identical; wrong in principle, and it inflated the count.
for (const m of emitted.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selectorList = m[1].trim(), body = m[2].trim();
  if (!body || selectorList.startsWith('@') || selectorList.startsWith(':root')) continue;
  const decls = body.split('\n').map(x => x.trim()).filter(Boolean).join('\n    ');
  for (const one of selectorList.split(',').map(x => x.trim()).filter(Boolean)) {
    const buckets = new Set();
    let sel = one, sawResponsive = false;
    for (const axis of RESPONSIVE_AXES) {
      const re = new RegExp(`\\[data-${axis}="([^"]*)"\\]`, 'g');
      for (const a of one.matchAll(re)) {
        sawResponsive = true;
        const b = bucketOf(axis, a[1]);
        if (b) buckets.add(b);
      }
      sel = sel.replace(re, '');
    }
    if (!sawResponsive || buckets.size !== 1) continue;
    const bucket = buckets.has('mobile') ? 'mobile' : 'tablet';
    const cls = (/\.(pf-[a-z0-9-]+)/.exec(sel) || [])[1];
    if (!cls) continue;
    respComponents.add(cls);
    (bucket === 'mobile' ? mobileRules : tabletRules).push(`  ${guarded(sel)} {\n    ${decls}\n  }`);
    const key = cls + '|' + bucket;
    if (!byBucket.has(key)) byBucket.set(key, []);
    byBucket.get(key).push({ cls, bucket, leftover: sel.replace(`.${cls}`, ''), decls });
  }
}

// A MIRRORED RULE THAT STILL DEMANDS AN AXIS MATCHES NOTHING ON A BARE CLASS.
//
// `Header`'s variants are `Theme=X, Mobile=Yes`, so stripping the breakpoint leaves
// `.pf-header[data-theme="Berry pink"]` — and `<div class="pf-header">` carries no theme, so
// the phone rule never fired. Measured: pf-header stayed 86px tall at 390px while
// pf-header-navigation, whose only axes ARE the breakpoint, went 130/118/106 correctly. Two
// components out of five worked and the block looked finished.
//
// The fix is the shared-fill hoist's principle again: a value every variant AGREES on is a
// fact, not a default someone picked. The agreement is tested PER DECLARATION, not per
// block, because a block is too coarse to be useful — Figma lays 15 of the 16 mobile headers
// out as a row and `Default - Cranberry red` as a column, so a whole-block test threw away
// the height, padding and radius all 16 do agree on over two declarations they do not.
// A property only some variants declare is not agreement either, and is left alone.
// WHICH VALUES EACH AXIS TAKES, read off the selectors this stylesheet actually emits.
// Needed to tell "every variant agrees" from "Figma only drew one of them".
const axisValues = new Map();                 // cls -> Map(axis -> Set(value))
for (const m of emitted.matchAll(/\.(pf-[a-z0-9-]+)((?:\[[^\]]*\])+)/g)) {
  if (!axisValues.has(m[1])) axisValues.set(m[1], new Map());
  const per = axisValues.get(m[1]);
  for (const a of m[2].matchAll(/\[data-([a-z0-9-]+)="([^"]*)"\]/g)) {
    if (RESPONSIVE_AXES.includes(a[1])) continue;
    if (!per.has(a[1])) per.set(a[1], new Set());
    per.get(a[1]).add(a[2]);
  }
}
const axesOf = leftover => {
  const out = new Map();
  for (const a of leftover.matchAll(/\[data-([a-z0-9-]+)="([^"]*)"\]/g)) out.set(a[1], a[2]);
  return out;
};

// A MIRRORED RULE THAT STILL DEMANDS AN AXIS MATCHES NOTHING ON A BARE CLASS.
//
// `Header`'s variants are `Theme=X, Mobile=Yes`, so stripping the breakpoint leaves
// `.pf-header[data-theme="Berry pink"]` — and a bare `pf-header` carries no theme, so the
// phone rule never fired. Measured: it stayed 86px tall at 390px while pf-header-navigation,
// whose only axis IS the breakpoint, went 130/118/106 perfectly. Two of five worked and the
// block looked complete.
//
// The fix is the shared-fill rule again — a value every variant AGREES on is a fact, not a
// default someone picked — and the agreement is per DECLARATION, because Figma lays 15 of the
// 16 mobile headers out as a row and `Default - Cranberry red` as a column, and a per-block
// test threw away the height all 16 share over two declarations they do not.
//
// WHAT COUNTS AS AGREEMENT, and it took two wrong answers to land on:
//   - "every leftover must declare it" is too strict. A composed-type rule contributes a
//     leftover that declares font-size and no height, and its silence is not disagreement.
//     `Filter tab single` states 70px on every one of its mobile variants and was refused.
//   - "any leftover that declares it" is too loose. `Graph legend` has a mobile variant for
//     `Key type=Donut graph` and none for `Line graph`; hoisting 27px would state a height
//     for the line legend that Figma has never drawn.
// So: among the variants that DO state the property they must agree, and together they must
// cover every value of each axis they all carry. Donut alone does not cover Key type;
// Selected False and True together do cover Selected; `Bar chart`'s lone Darkmode=False
// covers Darkmode, which takes no other value.
for (const [, all] of byBucket) {
  // A rule whose selector is ALREADY bare at this breakpoint is not a competing variant —
  // it is the component-level rule and is emitted as-is above. Counting it as a 17th
  // "variant" of `Header` put the denominator one above the 16 themes carrying a height.
  const group = all.filter(g => g.leftover !== '');
  if (!group.length) continue;
  const { cls, bucket } = group[0];
  const known = axisValues.get(cls) || new Map();

  const states = new Map();                   // prop -> [{ leftover, decl }]
  for (const g of group) {
    for (const d of g.decls.split('\n').map(x => x.trim()).filter(Boolean)) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const prop = d.slice(0, i).trim();
      if (!states.has(prop)) states.set(prop, []);
      states.get(prop).push({ leftover: g.leftover, decl: d.replace(/;$/, '') });
    }
  }

  const agreed = [];
  for (const [, said] of states) {
    if (new Set(said.map(x => x.decl)).size !== 1) continue;          // they disagree
    const parsed = said.map(x => axesOf(x.leftover));
    // Axes EVERY stating variant carries. One that only some carry is not a dimension they
    // are divided on — `data-state` is absent from a Default variant by design.
    const shared = [...parsed[0].keys()].filter(a => parsed.every(p => p.has(a)));
    const covers = shared.every(a => {
      const all = known.get(a);
      if (!all) return true;
      const seen = new Set(parsed.map(p => p.get(a)));
      return [...all].every(v => seen.has(v));
    });
    if (covers) agreed.push(said[0].decl);
  }
  if (!agreed.length) continue;
  (bucket === 'mobile' ? mobileRules : tabletRules)
    .push(`  .${cls}${GUARD} {\n    ${agreed.join(';\n    ')};\n  }`);
  bareHoisted++;
}

if (mobileRules.length || tabletRules.length) {
  out.push('');
  out.push('/* ---- Responsive -----------------------------------------------------------');
  out.push(' * Figma draws these components at more than one width. Each mobile and tablet');
  out.push(' * variant below is the SAME rule the data attribute produces, with the');
  out.push(' * breakpoint axis stripped out, so a class with no breakpoint attribute follows');
  out.push(' * the viewport. A page that writes the attribute explicitly carries one more');
  out.push(' * attribute than these rules do and therefore still wins at every width.');
  out.push(' *');
  out.push(' * 768px is measured — every tablet artboard in the file is 768-801 wide and no');
  out.push(' * mobile artboard exceeds 392. 1024px is a CHOSEN boundary: Figma has no');
  out.push(' * artboard between 801 and 1130, so that line is a judgement, not a reading.');
  out.push(' * -------------------------------------------------------------------------- */');
  if (tabletRules.length) {
    out.push('@media (min-width: 768px) and (max-width: 1023px) {');
    out.push(tabletRules.join('\n'));
    out.push('}');
  }
  if (mobileRules.length) {
    out.push('@media (max-width: 767px) {');
    out.push(mobileRules.join('\n'));
    out.push('}');
  }
}
console.log(`  ${respComponents.size} class(es) now follow the viewport: ${mobileRules.length} mobile `
  + `and ${tabletRules.length} tablet rule(s) mirrored from the variants Figma draws, so a class `
  + `with no breakpoint attribute responds on its own`);
console.log(`  ${bareHoisted} of them reach the BARE class because every variant of that component `
  + `agrees on the value at that width — without this a component whose variants carry another `
  + `axis (Header has 16 themes) mirrors a rule that matches nothing`);

writeFileSync('dist/components.css', out.join('\n'));

console.log(`components.css written — ${componentCount} components, ${ruleCount} rules`);
if (shadowUnmatched.size)
  console.log(`  SHADOWS with no token   : ${shadowUnmatched.size} variant(s) cast a drop shadow `
    + `the design system has no token for, so none is emitted (writing the rgba would be a raw `
    + `colour, frozen across both modes)`)
  || [...shadowUnmatched].sort().forEach(([k, v]) => console.log(`    ${k} — ${v}`));
if (shadowNotAShadow.size)
  console.log(`  ${shadowNotAShadow.size} effect(s) are not a shadow and have no box-shadow form: `
    + `${[...shadowNotAShadow].sort().map(([k, v]) => `${k} (${v})`).join(', ')}`);
if (sideClashes.size)
  console.log(`  border width NOT emitted for ${sideClashes.size} variant(s) — the stylesheet `
    + `collapses the axis that tells them apart, so no rule can distinguish them: `
    + `${[...sideClashes].sort().join(', ')}`);
if (strokeSideSkips.length)
  console.log(`  border width measured but NOT emitted for ${strokeSideSkips.length} component(s) — `
    + `they bind no stroke token, so the class has no border style to widen (gradients and `
    + `paints switched off in Figma): ${strokeSideSkips.join(', ')}`);
if (shapeOnly.length) {
  console.log(`  SHAPE ONLY (no colour bound in Figma) : ${shapeOnly.length}`);
  console.log(`    ${shapeOnly.sort().join(', ')}`);
}
console.log(`  with measured geometry : ${[...byComponent.keys()].filter(c => geometry.has(c)).length}`);
console.log(`  ${nowrapCount} class(es) keep their label on one line, because Figma draws it on one `
  + `and their height is fixed — a wrap there pushes the text out of the component`);
console.log(`  ${hoistedFills.size} class(es) carry a fill on the bare class because every one of their `
  + `variants binds it — without this the class painted nothing until a page wrote a data attribute`);
if (sourceIssues.size) {
  const affected = new Set([...sourceIssues.keys()].map(k => k.split(' — ')[0])).size;
  console.log(`  Figma SOURCE ISSUES    : ${sourceIssues.size} bindings across ${affected} components  (primitive bound where a semantic token belongs)`);
  for (const [k, v] of [...sourceIssues].sort()) console.log(`    ${k} — ${v}`);
}
if (unmapped.size) {
  console.log(`  UNMAPPED Figma tokens  : ${unmapped.size}`);
  for (const u of [...unmapped].sort()) console.log(`    ${u}`);
}
