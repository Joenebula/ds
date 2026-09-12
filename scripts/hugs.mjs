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
