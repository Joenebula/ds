#!/usr/bin/env node
// Were a component's COLOUR and its SHAPE captured against the same Figma variant axes?
//
//   node scripts/lib/axis-split.mjs --self-test
//
// A component is one outer box plus three colour slots, and the two halves come from two
// different extracts — component-variants.tsv for the colour, component-geometry.tsv for the
// shape. Nothing had ever checked that the two were read against the same variant axes, and
// when they are not, both halves are emitted onto one class under selectors no single element
// can satisfy:
//
//   .pf-header[data-breakpoint="Desktop"]                 the colour, on an axis Figma replaced
//   .pf-header[data-theme="Classic"][data-mobile="No"]    the shape, on the axes that replaced it
//
// A page writes one or the other and silently gets half a component. It renders, so nothing
// looks wrong — which is this repo's recurring failure shape, found in its own two extracts
// disagreeing about what a component even is.
//
// WHY AXIS NAMES AND NOT VALUES. A re-capture that adds a variant, renames a value or reorders
// them changes the values and nothing else; only a re-AUTHORED component changes the axis NAMES.
// Comparing values would fire on every ordinary Figma edit, which is the false positive that
// makes a report unreadable.

// The axis NAMES in a Figma variant string: `Theme=Classic, Mobile=No` -> ['Theme', 'Mobile'].
// A bare property with no `=` keeps its whole text as the name, which is what the stylesheet
// does with it too.
export function axesOf(variant) {
  return String(variant ?? '').split(',').map((p) => p.trim()).filter(Boolean)
    .map((p) => { const i = p.indexOf('='); return i < 0 ? p : p.slice(0, i).trim(); })
    .filter(Boolean);
}

// rows: [{ component, colourVariants: [string], geoVariants: [string] }]
// Returns one entry per component whose two halves share no axis at all.
export function findAxisSplits(rows) {
  const out = [];
  for (const r of rows) {
    const colourAxes = new Set((r.colourVariants || []).flatMap(axesOf));
    const geoAxes = new Set((r.geoVariants || []).flatMap(axesOf));
    // A side with no axes is not a disagreement, it is an ABSENCE. A component with one
    // unvaried shape, or with colour bound on the bare class, is the ordinary case and
    // reporting it would bury the one real finding under a hundred non-findings.
    if (!colourAxes.size || !geoAxes.size) continue;
    if ([...colourAxes].some((a) => geoAxes.has(a))) continue;
    out.push({ component: r.component, colourAxes: [...colourAxes], geoAxes: [...geoAxes] });
  }
  return out.sort((a, b) => (a.component < b.component ? -1 : a.component > b.component ? 1 : 0));
}

// ---------------------------------------------------------------------------
function selfTest() {
  let miss = 0;
  const ok = (name, cond, why) => { if (!cond) { miss++; console.log(`  MISS  ${name}: ${why}`); } };

  ok('axesOf reads names and drops values',
    JSON.stringify(axesOf('Theme=Classic, Mobile=No')) === '["Theme","Mobile"]',
    JSON.stringify(axesOf('Theme=Classic, Mobile=No')));
  ok('axesOf survives a value containing a dash and spaces',
    JSON.stringify(axesOf('Theme=Default - Cranberry red, Mobile=Yes')) === '["Theme","Mobile"]',
    JSON.stringify(axesOf('Theme=Default - Cranberry red, Mobile=Yes')));
  ok('an empty variant has no axes', axesOf('').length === 0 && axesOf(null).length === 0, 'got axes');

  // THE REAL ONE, with its real strings.
  const header = {
    component: 'Header',
    colourVariants: ['Breakpoint=Desktop', 'Breakpoint=Tablet', 'Breakpoint=Mobile'],
    geoVariants: ['Theme=Configr, Mobile=Yes', 'Theme=Classic, Mobile=No', 'System=People First'],
  };
  const r = findAxisSplits([header]);
  ok('THE REAL ONE — Header, colour on Breakpoint and shape on Theme x Mobile',
    r.length === 1 && r[0].component === 'Header'
    && r[0].colourAxes.join() === 'Breakpoint'
    && r[0].geoAxes.join() === 'Theme,Mobile,System', JSON.stringify(r));

  ok('a component whose halves agree is not reported',
    findAxisSplits([{ component: 'Button', colourVariants: ['Type=Action, State=Default'],
      geoVariants: ['Type=Action, Label=No'] }]).length === 0, 'a healthy component was reported');

  // PARTIAL overlap is agreement, not disagreement: one half measuring an extra axis is what a
  // deeper read looks like, and firing on it would report most of the library.
  ok('one shared axis is enough, even where the other axes differ',
    findAxisSplits([{ component: 'Bar chart', colourVariants: ['Breakpoint=Desktop'],
      geoVariants: ['Breakpoint=Desktop, Darkmode=False'] }]).length === 0,
    'a partial overlap was reported as a split');

  ok('colour with no variants at all is an absence, not a split',
    findAxisSplits([{ component: 'Waffle', colourVariants: [''], geoVariants: ['Theme=Classic'] }]).length === 0,
    'an unvaried colour side was reported');
  ok('geometry with no variants at all is an absence, not a split',
    findAxisSplits([{ component: 'Tag', colourVariants: ['Type=Info'], geoVariants: [] }]).length === 0,
    'an unvaried geometry side was reported');

  // THREE entries, in an order that neither leaving them alone NOR reversing them would sort.
  // The first version of this used two, [Zed, Alpha] — where `reverse()` happens to produce name
  // order, so a mutant that replaced the sort with a reverse SURVIVED. A fixture a broken
  // implementation also satisfies tests nothing, which is the same trap the rebind rule's
  // near-miss colour fell into.
  ok('every split is reported, in name order',
    findAxisSplits([
      { component: 'Mid', colourVariants: ['A=1'], geoVariants: ['B=2'] },
      { component: 'Zed', colourVariants: ['C=1'], geoVariants: ['D=2'] },
      { component: 'Alpha', colourVariants: ['E=1'], geoVariants: ['F=2'] },
    ]).map((x) => x.component).join() === 'Alpha,Mid,Zed', 'order or count wrong');

  // Same axis, different VALUES, is an ordinary re-capture and must never fire.
  ok('the same axis with different values is not a split',
    findAxisSplits([{ component: 'Status', colourVariants: ['Type=New'],
      geoVariants: ['Type=Old'] }]).length === 0, 'a value change was reported as an axis change');

  if (miss) { console.log(`self-test FAILED — ${miss} case(s)`); process.exit(1); }
  console.log('axis-split: self-test passed — it finds Header, and holds its fire on a partial '
    + 'overlap, an unvaried side and a value-only change');
}

if (process.argv[2] === '--self-test') selfTest();
