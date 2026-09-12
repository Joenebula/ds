#!/usr/bin/env node
// Which semantic variable replaces a retired paint style on ONE node — the whole decision, with
// no Figma in it.
//
//   node scripts/lib/rebind-rule.mjs --self-test
//
// WHY THIS FILE EXISTS. The DEPRECATED COLOURS retirement was run from scripts pasted into
// use_figma, and the rule they encoded lived only in the session that typed them. It changed three
// times in one afternoon — twice because it was wrong — and nothing could replay it, test it, or
// prove it able to fail. CLAUDE.md's own line: the transcript is not the durable record.
//
// So the decision is here, pure. `chooseToken` takes what a caller measured and returns APPLY with
// one variable or HOLD with a reason. The Figma half stays thin: read the nodes, call this, write
// what it says, log every id.
//
// THE RULE, AND WHY EACH PART OF IT IS THERE.
//
// 1. VALUE. A candidate must resolve to the retired style's value IN LIGHT MODE. That is what makes
//    a rebind a rebind: light mode is unchanged and dark mode is corrected. A candidate that
//    differs in light is a redesign, and this function will not return one.
//
// 2. SCOPE, which is the part that was being done by hand for a week. Every Figma variable declares
//    where it may be used — TEXT_FILL, SHAPE_FILL, STROKE_COLOR, FRAME_FILL — so "which of the
//    twelve white tokens belongs on this node" is a LOOKUP. Twelve semantics resolve to #FFFFFF in
//    light and fan out in dark from #1D1F27 to #FFFFFF; scope cuts that to two or three before
//    anyone has to think.
//
// 3. EXACTLY ONE CANDIDATE, or hold. Two candidates that agree in light and differ in dark cannot
//    be separated from a light-mode render, which is the only render anyone looks at. That is a
//    design decision and it goes to a person, named, with both candidates in the reason.
//
// 4. DARK CONTRAST, and this one was bought with a mistake. A single-candidate scope match proves
//    THE SYSTEM HAS ONE MEANING FOR THAT COLOUR IN THAT ROLE. It does not prove the DESIGNER used
//    the colour for that meaning. Eighteen #868686 vectors were rebound to `Icons/Icon - Disabled`
//    because it was the only SHAPE_FILL at that value; most of them were ordinary chevrons and
//    tooltip glyphs, and in dark they became #F2F2F2 on a panel that does not darken — 1.12:1,
//    invisible, with light mode identical either way so no screenshot would ever show it.
//
//    So a winning candidate must also SURVIVE A MEASUREMENT: resolve it and the node's own backdrop
//    in dark and refuse under 3:1. On the run that introduced it, it held 13 nodes on the spot.
//
// WHAT IT DELIBERATELY DOES NOT DO. It never returns a PRIMITIVE (they carry one mode, so they
// break exactly the thing being fixed), and it never invents a token for a value the semantic layer
// does not hold. Four retired colours have no candidate at all — #2C313C, #1D1F27, #1A1A1A and
// #2066AF — because they are the DARK values of live tokens, painted statically into a light-mode
// design. What those nodes want is "the dark value of X", which a variable expresses by MODE and
// not by name, so no rebind can express it and this function says so rather than guessing.

// A backdrop only constrains a mark drawn ON it. A frame fill IS the backdrop, so nothing is
// measured against it — guarding a surface against itself is how you get a 1:1 verdict.
//
// AND STROKE_COLOR IS NOT IN HERE, WHICH THE SELF-TEST DECIDED RATHER THAN THE AUTHOR. The first
// version held anything under 3:1 including strokes. Writing a fixture for it showed that
// `Border/Default full` is #656565 in dark on a #2C313C panel — 2.24:1 — so a 3:1 bar on strokes
// would have held all 240 of the Grey steel borders that were rebound correctly earlier the same
// day. A divider is MEANT to be quiet; an icon is not. The rule cannot tell a decorative border
// from an icon outline by node type, so a stroke is applied and its ratio REPORTED, never silently
// held. The hard hold is for the marks a reader has to actually read.
export const MEASURED_ROLES = new Set(['TEXT_FILL', 'SHAPE_FILL']);

export const MIN_DARK_CONTRAST = 3;

// The scope a node needs, from what the node IS. A stroke is a stroke whatever it is drawn on;
// otherwise the node type decides. FRAME/COMPONENT/INSTANCE fills are surfaces, everything else
// (VECTOR, RECTANGLE, ELLIPSE, LINE, STAR, POLYGON, BOOLEAN_OPERATION) is a mark.
export function requiredScope(role, nodeType) {
  if (role === 'stroke') return 'STROKE_COLOR';
  if (nodeType === 'TEXT') return 'TEXT_FILL';
  if (nodeType === 'FRAME' || nodeType === 'COMPONENT' || nodeType === 'INSTANCE') return 'FRAME_FILL';
  return 'SHAPE_FILL';
}

const lin = (u) => (u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

export function contrast(a, b) {
  const x = lum(a) + 0.05;
  const y = lum(b) + 0.05;
  return Math.round((Math.max(x, y) / Math.min(x, y)) * 100) / 100;
}

// A candidate is { name, collection, light, dark, scopes }. `light`/`dark` are '#RRGGBB'; `dark`
// may be null for a single-mode collection, which is mode-stable and therefore always safe.
// `scopes` is Figma's array; EMPTY MEANS ALL, which is Figma's own meaning and not a shortcut.
export function scopeAllows(candidate, want) {
  const s = candidate.scopes || [];
  return s.length === 0 || s.includes(want) || s.includes('ALL_FILLS');
}

export const isPrimitive = (c) => /primitive/i.test(c.collection || '');

const rgb = (hexish) => {
  const h = String(hexish).replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 };
};

/**
 * value        the retired style's colour, '#RRGGBB'
 * role         'fill' | 'stroke'
 * nodeType     Figma node type
 * candidates   every variable the file holds, as above
 * backdropDark the node's nearest visible backdrop resolved in DARK, '#RRGGBB', or null if none
 */
export function chooseToken({ value, role, nodeType, candidates, backdropDark }) {
  const want = requiredScope(role, nodeType);
  const atValue = candidates.filter((c) => String(c.light).toUpperCase() === String(value).toUpperCase());
  const legal = atValue.filter((c) => !isPrimitive(c) && scopeAllows(c, want));

  if (legal.length === 0) {
    const why = atValue.length
      ? `no non-primitive candidate at ${value} carries ${want}`
      : `no semantic resolves to ${value} in light — this may be the DARK value of a live token, painted statically`;
    return { apply: false, reason: why, scope: want, candidates: [] };
  }
  if (legal.length > 1) {
    // A HOLD EITHER WAY, AND THE TWO REASONS ARE NOT THE SAME REASON. The first live multi-style
    // dry run held two `Orange` #FC8700 nodes saying the candidates "differ in dark" — and they do
    // not: `Icons/Icon - Warning` and `Charts/Chart 2` are #FC8700 in BOTH modes. The verdict was
    // right and its stated reason was false, which is exactly the thing this repo keeps finding in
    // other mechanisms: a message that asserts more than the measurement supports.
    //
    // Where every candidate resolves the same in dark too, no render can ever separate them, so
    // there is nothing to look at and nothing to screenshot: it is a choice of MEANING. That still
    // holds — picking by coin toss files a wrong-meaning token that looks perfect in both modes and
    // is therefore permanent — but it says what it actually is.
    const darks = new Set(legal.map((c) => String(c.dark || c.light).toUpperCase()));
    const list = legal.map((c) => `${c.name} -> ${c.dark || c.light}`).join(', ');
    return {
      apply: false,
      scope: want,
      candidates: legal.map((c) => c.name),
      sameInBothModes: darks.size === 1,
      reason: darks.size === 1
        ? `${legal.length} candidates are identical in light AND dark (${[...darks][0]}): ${list} — no render can separate them, so this is a choice of MEANING rather than of appearance`
        : `${legal.length} candidates agree in light and differ in dark: ${list}`,
    };
  }

  const won = legal[0];
  if (!backdropDark || !won.dark || want === 'FRAME_FILL') {
    return { apply: true, variable: won.name, scope: want, darkContrast: null };
  }
  const dc = contrast(rgb(won.dark), rgb(backdropDark));
  if (dc < MIN_DARK_CONTRAST && MEASURED_ROLES.has(want)) {
    return { apply: false, scope: want, candidates: [won.name], darkContrast: dc,
      reason: `${won.name} is ${won.dark} in dark against a ${backdropDark} backdrop — ${dc}:1, under ${MIN_DARK_CONTRAST}:1` };
  }
  const low = dc < MIN_DARK_CONTRAST ? `${won.name} is only ${dc}:1 in dark — fine for a divider, wrong for an icon outline` : null;
  return { apply: true, variable: won.name, scope: want, darkContrast: dc, note: low };
}

let failures = 0;
const miss = (m) => { console.log(`  MISS: ${m}`); failures++; };

function selfTest() {
  const C = (name, light, dark, scopes, collection = 'Colours Semantic') => ({ name, light, dark, scopes, collection });
  const WHITES = [
    C('Background/Primary', '#FFFFFF', '#2C313C', ['FRAME_FILL', 'SHAPE_FILL']),
    C('Icons/Icon - Always white', '#FFFFFF', '#FFFFFF', ['SHAPE_FILL', 'STROKE_COLOR']),
    C('Icons/Icon - Primary inverted', '#FFFFFF', '#3E3E3E', ['SHAPE_FILL', 'STROKE_COLOR']),
    C('Text/Always White', '#FFFFFF', '#FFFFFF', ['TEXT_FILL']),
    C('Text/Inverted primary', '#FFFFFF', '#3E3E3E', ['TEXT_FILL']),
    C('Base colours/White', '#FFFFFF', null, [], 'Colours Primitive'),
  ];

  // Scope is what separates twelve whites into an answer.
  let r = chooseToken({ value: '#FFFFFF', role: 'fill', nodeType: 'FRAME', candidates: WHITES, backdropDark: null });
  if (!r.apply || r.variable !== 'Background/Primary') miss(`a FRAME fill must resolve by FRAME_FILL scope (got ${r.variable || r.reason})`);

  r = chooseToken({ value: '#FFFFFF', role: 'fill', nodeType: 'TEXT', candidates: WHITES, backdropDark: null });
  if (r.apply) miss('two TEXT_FILL whites differ in dark and must HOLD, not pick one');
  if (!/Text\/Always White/.test(r.reason) || !/Text\/Inverted primary/.test(r.reason)) miss('a hold must name BOTH candidates — that is the whole use of it');
  if (r.sameInBothModes) miss('candidates that really do differ in dark must not be reported as identical');

  // A HOLD, AND THE TRUE REASON FOR IT. Live case: two `Orange` #FC8700 nodes were held saying the
  // candidates "differ in dark", and both are #FC8700 in dark too. The verdict was right and the
  // stated reason was false. It still holds — a wrong-meaning token that renders identically in
  // both modes is invisible and therefore permanent — but it must not claim a difference the
  // values do not have.
  const SAME = [C('Icons/Icon - Warning', '#FC8700', '#FC8700', ['SHAPE_FILL']),
                C('Charts/Chart 2', '#FC8700', '#FC8700', ['SHAPE_FILL'])];
  r = chooseToken({ value: '#FC8700', role: 'fill', nodeType: 'VECTOR', candidates: SAME, backdropDark: '#1D1F27' });
  if (r.apply) miss('two candidates must HOLD even when identical in both modes — the wrong meaning would be invisible');
  if (r.sameInBothModes !== true) miss('and the hold must SAY they are identical, rather than asserting a dark difference');
  if (/differ in dark/.test(r.reason)) miss('a reason must not claim a difference the measured values do not have');

  // A primitive is never the answer, even when it is the only thing at the value.
  r = chooseToken({ value: '#FFFFFF', role: 'fill', nodeType: 'POLYGON',
    candidates: [C('Base colours/White', '#FFFFFF', null, [], 'Colours Primitive')], backdropDark: null });
  if (r.apply) miss('a PRIMITIVE must never be returned — one mode is the bug being fixed');

  // The dark-contrast guard: the exact shape of the #868686 mistake.
  const GREY = [C('Icons/Icon - Disabled', '#868686', '#F2F2F2', ['SHAPE_FILL', 'STROKE_COLOR'])];
  r = chooseToken({ value: '#868686', role: 'fill', nodeType: 'VECTOR', candidates: GREY, backdropDark: '#FFFFFF' });
  if (r.apply) miss('a sole candidate that is near-white in dark on a panel that does not darken must be HELD');
  if (!r.darkContrast || r.darkContrast >= MIN_DARK_CONTRAST) miss('a hold on contrast must report the measured ratio');
  r = chooseToken({ value: '#868686', role: 'fill', nodeType: 'VECTOR', candidates: GREY, backdropDark: '#1D1F27' });
  if (!r.apply) miss('the same candidate on a backdrop that DOES darken must apply — the guard is about the pair, not the token');

  // A surface is never measured against itself.
  const SURF = [C('Background/Tertiary', '#F2F2F2', '#282A32', ['FRAME_FILL'])];
  r = chooseToken({ value: '#F2F2F2', role: 'fill', nodeType: 'FRAME', candidates: SURF, backdropDark: '#282A32' });
  if (!r.apply) miss('a FRAME fill is the backdrop and must not be contrast-checked against one');
  if (r.darkContrast !== null || r.note) miss('a surface must not even be MEASURED against its parent — a card on a page is quiet by design, and a note there is noise');

  // A value the semantic layer does not hold is refused and SAID, never approximated.
  r = chooseToken({ value: '#2C313C', role: 'fill', nodeType: 'RECTANGLE', candidates: WHITES, backdropDark: null });
  if (r.apply) miss('a value no semantic resolves to in light must never be rebound');
  if (!/DARK value/.test(r.reason)) miss('refusing an unheld value must say WHY it is probably unheld — it is a dark value painted statically');

  // Light is the invariant. A near-miss value is a redesign, not a rebind.
  // #FFFFFE, not #FEFEFE: a near miss has to be near ENOUGH that a sloppy comparison would accept
  // it, or the mutant that compares prefixes survives and the assertion proves nothing.
  r = chooseToken({ value: '#FFFFFE', role: 'fill', nodeType: 'FRAME', candidates: WHITES, backdropDark: null });
  if (r.apply) miss('a candidate must match the retired value EXACTLY in light — one digit out is a redesign');

  // Stroke takes STROKE_COLOR whatever the node is. This assertion was WRONG when first written —
  // it expected #FFFFFF to resolve, and the self-test caught that two whites carry STROKE_COLOR, so
  // the honest answer there is a HOLD. Kept as the hold it really is, with a single-candidate value
  // beside it to prove the role mapping itself.
  r = chooseToken({ value: '#FFFFFF', role: 'stroke', nodeType: 'FRAME', candidates: WHITES, backdropDark: '#1D1F27' });
  if (r.apply) miss('two STROKE_COLOR whites differ in dark — a FRAME stroke at #FFFFFF must hold');
  const BORDER = [C('Border/Default full', '#E5E5E5', '#656565', ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'])];
  r = chooseToken({ value: '#E5E5E5', role: 'stroke', nodeType: 'FRAME', candidates: BORDER, backdropDark: '#2C313C' });
  if (!r.apply || r.variable !== 'Border/Default full') miss(`a stroke must resolve by STROKE_COLOR regardless of node type (got ${r.variable || r.reason})`);
  // The border that made the rule change: quiet in dark, and that is the point of a divider.
  if (r.darkContrast >= MIN_DARK_CONTRAST) miss('this fixture is meant to be a LOW-contrast border — if it is not, it proves nothing');
  if (!r.note) miss('a stroke applied under the bar must still REPORT its ratio, or the measurement is thrown away');
  r = chooseToken({ value: '#868686', role: 'fill', nodeType: 'VECTOR', candidates: GREY, backdropDark: '#FFFFFF' });
  if (r.apply) miss('the same low ratio on a SHAPE_FILL must still be a hard hold — a reader has to read an icon');
  r = chooseToken({ value: '#E5E5E5', role: 'fill', nodeType: 'TEXT', candidates: BORDER, backdropDark: null });
  if (r.apply) miss('a border token carries no TEXT_FILL and must not be offered to text');
  if (requiredScope('stroke', 'TEXT') !== 'STROKE_COLOR') miss('a stroke on a TEXT node is still a stroke');
  if (!scopeAllows({ scopes: [] }, 'TEXT_FILL')) miss("an empty scopes array is Figma's ALL and must allow everything");

  if (contrast(rgb('#FFFFFF'), rgb('#FFFFFF')) !== 1) miss('contrast of a colour with itself must be 1');
  if (Math.abs(contrast(rgb('#000000'), rgb('#FFFFFF')) - 21) > 0.01) miss('black on white must be 21:1');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — scope narrows twelve whites to one answer, two candidates that differ only in dark '
    + 'HOLD and name both, two identical in BOTH modes hold too but say that rather than claiming a difference they do not have, a primitive is never returned, a sole candidate that would be unreadable in dark against '
    + 'its own backdrop is held with the ratio measured, a surface is not checked against itself, a value the semantic '
    + 'layer does not hold is refused and told why, and light mode is an exact match rather than a near one');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  console.log('This module is the rebind decision. Run with --self-test, or import chooseToken.');
}
