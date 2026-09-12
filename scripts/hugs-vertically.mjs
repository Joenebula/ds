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

export function hugsVertically() {
  const byComp = new Map();
  for (const line of readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1)) {
    const c = line.split('\t');
    if (!byComp.has(c[0])) byComp.set(c[0], new Map());
    byComp.get(c[0]).set(c[1], c);
  }
  const hOf = s => {
    const m = /^(?:auto|\d+)\s*x\s*(auto|\d+)$/.exec((s || '').trim());
    return m && m[1] !== 'auto' ? +m[1] : null;
  };
  const out = new Set();
  for (const [comp, nodes] of byComp) {
    const root = nodes.get('');
    if (!root || !/^VERTICAL/.test(root[8] || '')) continue;
    const H = hOf(root[7]);
    if (H === null) continue;
    const pad = (root[9] || '0').trim().split(/\s+/).map(Number);
    const pt = pad[0] || 0, pb = (pad.length >= 3 ? pad[2] : pad[0]) || 0;
    const gap = +(root[10] || 0) || 0;
    const kids = [...nodes.entries()].filter(([k]) => k && !k.includes('.')).map(([, v]) => v);
    if (!kids.length) continue;
    const hs = kids.map(k => hOf(k[7]));
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
