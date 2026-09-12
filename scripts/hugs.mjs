// WHICH COMPONENTS HUG THEIR CONTENTS VERTICALLY — Figma's own answer, recomputed.
//
// The geometry extract records a component's SIZE and nothing about how that size was
// arrived at, so the generator treated every height as a rule. For a frame set to "Hug
// contents" the height is not a rule at all: it is whatever the contents came to on the day
// Figma drew it. `Card` is stated 520x358, and 20px of padding plus its children plus its
// gaps comes to 358 — the number IS the content. Emitting `min-height: 358px` then forces a
// card holding one line to be as tall as Figma's sample, which is the stretch that was
// reported: a 358px content card used as an 89px stat tile, with the page writing its own
// CSS to fight it.
//
// Hug is recoverable without a new extract. On a VERTICAL auto-layout frame the height is the
// primary axis, so a hugging frame's height equals padding + children + gaps EXACTLY. 46 of
// the 71 vertical components come out on the nose.
//
// ONLY EXACT EQUALITY COUNTS. Where the children sum to MORE than the stated height the sum
// is not trustworthy — absolute or nested children the top-level walk does not add up — and
// those keep their measured height rather than being called a hug on a bad number.
//
// Shared by the generator and by verify-components on purpose. It is a reading of the RAW
// Figma measurements, not of anything the generator produced, and the check's own assertion
// is still an independent one: it renders the class and asserts the rendered box matches what
// the reading predicts. Two copies of this arithmetic would be the same source with a second
// chance to drift.
import { readFileSync } from 'node:fs';

const SHAPE = new Set(['RECTANGLE', 'ELLIPSE', 'LINE', 'VECTOR', 'POLYGON', 'STAR',
  'BOOLEAN_OPERATION']);

// Shared by both axes. `axis` is 'v' (height, the primary axis of a VERTICAL frame) or
// 'h' (width, the primary axis of a HORIZONTAL one) — a frame only hugs on its primary axis
// in this arithmetic, because that is the one whose size is the sum of the children.
function hugs(axis) {
  const byComp = new Map();
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!byComp.has(c[0])) byComp.set(c[0], new Map());
    byComp.get(c[0]).set(c[1], c);
  }
  const hOf = (s, axis) => {
    const m = /^(auto|[\d.]+)\s*x\s*(auto|[\d.]+)$/.exec((s || '').trim());
    if (!m) return null;
    const v = axis === 'v' ? m[2] : m[1];
    return v === 'auto' ? null : +v;
  };
  const out = new Set();
  for (const [comp, nodes] of byComp) {
    const root = nodes.get('');
    const want = axis === 'v' ? /^VERTICAL/ : /^HORIZONTAL/;
    if (!root || !want.test(root[8] || '')) continue;
    const H = hOf(root[7], axis);
    if (H === null) continue;
    // Figma's padding is top right bottom left, with the usual CSS shorthand collapsing.
    const pad = (root[9] || '0').trim().split(/\s+/).map(Number);
    const at = i => pad[i] ?? pad[i - 2] ?? pad[0] ?? 0;
    const [pa, pb] = axis === 'v' ? [at(0), at(2)] : [pad.length >= 4 ? pad[3] : at(1), at(1)];
    const pt = pa;
    const gap = +(root[10] || 0) || 0;
    const kids = [...nodes.entries()].filter(([k]) => k && !k.includes('.')).map(([, v]) => v);
    if (!kids.length) continue;
    const hs = kids.map(k => hOf(k[7], axis));
    if (hs.some(x => x === null)) continue;
    // A FRAME THAT DRAWS ITSELF IS NOT HOLDING CONTENT. `Bar` is a 29x67 RECTANGLE with a
    // label under it; the arithmetic says hug, but the rectangle IS the component and the
    // 90px is the design. It showed up immediately: `Bar chart`'s template nests bars as
    // bare classes, so with no height they collapsed and the whole chart rendered empty —
    // check-templates caught it on the first run. Three components have a shape among their
    // direct children and all three keep their measured height.
    const drawsItself = kids.some(k => SHAPE.has(k[2]));
    const content = pt + pb + hs.reduce((a, b) => a + b, 0) + gap * (hs.length - 1);
    if (!drawsItself && Math.abs(content - H) <= 1) out.add(comp);
  }
  return out;
}


export const hugsVertically = () => hugs('v');

// THE WIDTH HAS THE SAME QUESTION, and it is the one `verify-against-figma.mjs` gave up on:
// "Width is deliberately NOT compared: a Figma frame may hug or be fixed, and the extract"
// does not say which. It can be read the same way — on a HORIZONTAL frame the width is the
// primary axis, so a hugging frame's width is padding + children + gaps.
//
// The stylesheet drops any width above 120px as "the artboard, not a rule". Measured, that
// guess is right by accident for 31 components that genuinely hug and wrong for 24 that are
// genuinely fixed — and below the threshold it pins four that hug: `Links` is a text link
// frozen at 58px, `Action menu button` at 60, `Config parent menu` at 98, `Floaters` at 85.
// Put a longer label in any of them and the width Figma computed from the old one is still
// there.
export const hugsHorizontally = () => hugs('h');


// A COMPONENT WHOSE OWN CONTENT CAN GROW MUST NOT CAP ITS HEIGHT.
//
// Reported by looking at a screenshot and asking the right question: why is the text's height
// not pushing the rest down? On `timesheet-approvals` the side panel's working-time warning
// runs straight through the "Daily hours" heading below it, and the reason is in the library
// rather than the page — `.pf-information-box` states `height: 56px`, a FIXED height, so two
// lines of real message overflow it and the next block sits where the 56 says.
//
// The generator emits a height three ways, and the middle threshold is where this went wrong:
// up to 260px the height is emitted EXACTLY, on the reasoning that "a control, row or tile —
// the height IS the design (a 32px button, a 58px table row)". That is true of a button, whose
// label is one line and cannot wrap. It is not true of anything holding a paragraph, and the
// threshold cannot tell the two apart because a px number does not know what is inside.
//
// So read what is inside. Two signals, and both are needed:
//
//   1. The component holds a TEXT node Figma itself draws on MORE THAN ONE LINE — the same
//      measurement the nowrap rule uses in the other direction, a node at least twice its own
//      font-size. `Message box`, `Tool tip`, `Toast message`, `Note`, `Title panel`: 12 of them.
//   2. Its height comes ENTIRELY from a single nested INSTANCE that fills it, so the component
//      states no height of its own — whatever is inside decides. `Information box` holds one
//      child, an instance of itself, and the walk stops there so signal 1 cannot see any text.
//      6 of them.
//
// Deliberately NOT the cross-axis hug. On a HORIZONTAL frame the height is the cross axis and a
// hugging frame's height is the TALLEST child plus padding, which is readable from the same
// data — and it matches 55 components, including `Filter chip`, `Links`, `Option` and
// `Pagination buttons`, where the height genuinely is the design. A child set to stretch fills
// its parent by definition, so max(child) + padding == parent whether the frame hugs or not:
// the signature is the same for both answers and this data cannot separate them. Acting on it
// would be a guess dressed as a measurement across a third of the library.
//
// The change only ever lets a box grow — `height` becomes `min-height`, so nothing gets
// smaller and nothing that fitted before stops fitting.
export function growsWithContent() {
  const byComp = new Map();
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!byComp.has(c[0])) byComp.set(c[0], new Map());
    byComp.get(c[0]).set(c[1], c);
  }
  const hOf = s => {
    const m = /^(auto|[\d.]+)\s*x\s*(auto|[\d.]+)$/.exec((s || '').trim());
    return (!m || m[2] === 'auto') ? null : +m[2];
  };
  const out = new Set();
  for (const [comp, nodes] of byComp) {
    const root = nodes.get('');
    if (!root) continue;
    const H = hOf(root[7]);
    const kids = [...nodes.entries()].filter(([k]) => k && !k.includes('.')).map(([, v]) => v);

    // 1. a TEXT node Figma draws on more than one line
    for (const k of kids.length ? [...nodes.values()] : []) {
      if (k[2] !== 'TEXT') continue;
      const size = /^(\d+)x(\d+)$/.exec((k[7] || '').trim());
      const font = /^(\d+)px/.exec((k[15] || '').trim());
      if (size && font && +size[2] >= 2 * +font[1]) { out.add(comp); break; }
    }
    // 2. one nested instance that fills the height
    if (H !== null && kids.length === 1 && kids[0][2] === 'INSTANCE') {
      const kh = hOf(kids[0][7]);
      if (kh !== null && Math.abs(kh - H) <= 1) out.add(comp);
    }
  }
  return out;
}


// A PACKING NO CHILD CAN EVIDENCE IS NOT A PACKING.
//
// Reported three times, and the first two answers were about the wrong box. `Table progress
// bar`'s `Bar` frame is `HORIZONTAL MIN CENTER`, so the template centred its child — and the
// child is the FILL. A progress bar whose fill floats in the middle of its track is not a
// progress bar; at 15% it is a blue blob in the centre.
//
// Figma draws that component at exactly ONE state: `Completion=0%`, where the `Progress`
// rectangle measures 0x14. With a zero-width child, `center` and `flex-start` render
// identically, so Figma's CENTER is unfalsifiable — not a statement about where a real fill
// sits, because no real fill was ever drawn there. A page then supplies `width: 75%` into a
// slot whose packing was never tested.
//
// Where a frame's ONLY child measures zero on the packing axis, pack to the START. Measured
// across the whole file, FIVE frames are in that position: four hold a zero-height divider
// `Line` inside a zero-height content box, where the change is invisible, and the fifth is the
// progress fill. Returns a Set of `component|path`.
//
// Shared by the generator and the checker for the reason `hugs` is: two copies of a reading are
// the same source with a second chance to drift.
export function unfalsifiablePacking() {
  const byComp = new Map();
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!byComp.has(c[0])) byComp.set(c[0], new Map());
    byComp.get(c[0]).set(c[1], c);
  }
  const dim = (v, i) => {
    const m = /^(auto|[\d.]+)\s*x\s*(auto|[\d.]+)$/.exec((v || '').trim());
    return (!m || m[i] === 'auto') ? null : +m[i];
  };
  const out = new Set();
  for (const [comp, nodes] of byComp) {
    for (const [path, n] of nodes) {
      const parts = (n[8] || '').split(/\s+/);
      if (parts.length < 3 || parts[2] === 'MIN') continue;
      const kids = [...nodes.entries()]
        .filter(([k]) => k && (k.includes('.') ? k.slice(0, k.lastIndexOf('.')) : '') === path);
      if (kids.length !== 1) continue;
      const size = dim(kids[0][1][7], parts[0] === 'VERTICAL' ? 2 : 1);
      if (size !== null && size <= 0.5) out.add(`${comp}|${path}`);
    }
  }
  return out;
}


// A FRAME WHOSE ONLY CHILD MEASURES ZERO CANNOT HUG IT.
//
// The companion to `unfalsifiablePacking`, from the same degenerate sample and found by the
// same route. A template gives its children no dimensions on purpose — on a real page they
// size to their content — and that assumes there IS content. `Table progress bar`'s `Bar` is
// **208x14** in Figma and rendered **2x16** in the template: its only child is the fill, which
// Figma draws at `Completion=0%` as `0x14`, so the frame hugged nothing and collapsed to its
// own border. Anyone pasting that template got an invisible track, which is the template
// failing at the one thing templates exist for.
//
// So on an axis where the only child measures zero, the frame states its own measured size.
// Returns `component|path` -> { w, h }, true on an axis that needs stating.
export function collapsesOnZeroChild() {
  const byComp = new Map();
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!byComp.has(c[0])) byComp.set(c[0], new Map());
    byComp.get(c[0]).set(c[1], c);
  }
  const dim = (v, i) => {
    const m = /^(auto|[\d.]+)\s*x\s*(auto|[\d.]+)$/.exec((v || '').trim());
    return (!m || m[i] === 'auto') ? null : +m[i];
  };
  const out = new Map();
  for (const [comp, nodes] of byComp) {
    for (const [path, n] of nodes) {
      if (!path) continue;                       // the root's box is the class's, not the template's
      if (!(n[8] || '') || n[8] === 'NONE') continue;
      const kids = [...nodes.entries()]
        .filter(([k]) => k && (k.includes('.') ? k.slice(0, k.lastIndexOf('.')) : '') === path);
      if (kids.length !== 1) continue;
      const kw = dim(kids[0][1][7], 1), kh = dim(kids[0][1][7], 2);
      const w = kw !== null && kw <= 0.5, hh = kh !== null && kh <= 0.5;
      if (w || hh) out.set(`${comp}|${path}`, { w, h: hh });
    }
  }
  return out;
}


// A SPACE_BETWEEN FRAME THAT HUGS ITS CONTENT DISTRIBUTES NOTHING.
//
// The third reading from the same degenerate-template family, and the one with the widest
// reach: **27 space-between frames across the templates, and not one of them stated a width**,
// so `justify-content: space-between` was `flex-start` with extra words on every single one.
// `Percentage bar`'s label row is 343px in Figma holding a 146px label and a 35px percentage —
// the 162px of slack IS the layout, and a frame that hugs to 181 has none of it. Pasted, the
// label and the percentage sat against each other.
//
// A template gives its children no dimensions on purpose, because on a real page they size to
// their content. A space-between row is the case where that assumption destroys the design
// rather than adapting it, so the width is stated — and stated as a READING both ways:
//
//   - Measured, **37 of the 46** such frames are exactly as wide as their parent's content box,
//     so `width: 100%` is a measurement there and keeps the row fluid on a real page.
//   - The other **9** are genuinely narrower than their parent — `Menu-search-settings`'s rows
//     are 950 inside 1880 — and take their own measured px.
//
// Returns `component|path` -> '100%' or 'NNNpx'.
export function spaceBetweenWidth() {
  const byComp = new Map();
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!byComp.has(c[0])) byComp.set(c[0], new Map());
    byComp.get(c[0]).set(c[1], c);
  }
  const dim = (v, i) => {
    const m = /^(auto|[\d.]+)\s*x\s*(auto|[\d.]+)$/.exec((v || '').trim());
    return (!m || m[i] === 'auto') ? null : +m[i];
  };
  const out = new Map();
  for (const [comp, nodes] of byComp) {
    for (const [path, n] of nodes) {
      if (!path || !(n[8] || '').includes('SPACE_BETWEEN')) continue;
      const horiz = (n[8] || '').startsWith('HORIZONTAL');
      const w = dim(n[7], horiz ? 1 : 2);
      if (w === null) continue;
      const parent = nodes.get(path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : '');
      if (!parent) continue;
      const pw = dim(parent[7], horiz ? 1 : 2);
      const pad = (parent[9] || '0').trim().split(/\s+/).map(Number);
      const at = i => pad[i] ?? pad[i - 2] ?? pad[0] ?? 0;
      const inner = pw === null ? null
        : pw - (horiz ? (pad.length >= 4 ? pad[3] : at(1)) + at(1) : at(0) + at(2));
      out.set(`${comp}|${path}`, (inner !== null && Math.abs(inner - w) <= 1) ? '100%' : `${w}px`);
    }
  }
  return out;
}
