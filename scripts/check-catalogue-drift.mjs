#!/usr/bin/env node
// Do this repo's own extracts agree with each other about what exists?
//
//   node scripts/check-catalogue-drift.mjs
//   node scripts/check-catalogue-drift.mjs --self-test
//
// WHY THIS EXISTS. `Repeating group` has a real class in dist/components.css, geometry, a
// gallery specimen and verify-components assertions — and it is in no entry of
// tokens/_raw/components.json, the Figma inventory. Two generated artefacts, built from the
// same directory, disagreeing about what exists.
//
// Nothing found it for two days, and the reason is one line. check-variant-coverage.mjs joins
// the library against the inventory and then:
//
//     if (!inv || !inv.properties) continue;        // scripts/check-variant-coverage.mjs:36
//
// A component missing from the inventory is SKIPPED, not reported. That is the whole family of
// bug this project keeps finding: a mechanism that cannot distinguish "absent" from "fine"
// reports the wrong one. Here the two states are "this component is not in Figma" and "this
// component is in Figma and nobody wrote it down".
//
// FOUR SOURCES, AND THEY MUST AGREE:
//
//   components.json          the Figma inventory — what the file publishes
//   component-variants.tsv   the LIBRARY — a row here is what earns a .pf-* class
//   component-geometry.tsv   measured shapes
//   uncaptured-reasons.tsv   the declared exclusions — why something is deliberately absent
//
// An unexplained disagreement fails. A declared one passes. That is what turns
// uncaptured-reasons.tsv from a comment into a load-bearing file: **an unexplained absence
// becomes a failure instead of a silence.**
import { readFileSync, existsSync } from 'node:fs';

const RAW = 'tokens/_raw';

// Figma pages that are not the design system: documentation, style guide, wiki, and the icon
// page (293 icons, captured separately by extract-icons.mjs into assets/icons/). The emoji
// prefix is the file's own convention — see extract-variants.mjs, which uses the same test.
export const isExcludedPage = (page) => /^(📄|📚|🎨)/.test(String(page || '').trim())
  || String(page || '').trim() === 'Icons';

const tsv = (file) => {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  return lines.slice(1).map((l) => l.split('\t').map((c) => c.trim()));
};

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function judge({ inventory, library, geometry, reasons }) {
  const problems = [];

  // MATCH ON THE TRIMMED NAME, AND REPORT THE UNTRIMMED ONE. `Text template format editor `
  // carries a trailing space in Figma, so exact matching split one component into two and
  // reported both halves as missing — a false finding that would have sent someone looking for
  // a component that was there all along. A trailing space is not a difference in identity, so
  // it must not break the join; it IS a defect in the design file, so it is still said out loud.
  const key = (n) => String(n || '').trim();
  const untrimmed = new Map();
  const note = (n) => { if (n !== key(n)) untrimmed.set(key(n), n); return key(n); };

  // A blank name is not a component. One empty row in an extract was becoming an entry called
  // "" and then reporting itself as whitespace-damaged, which is noise about nothing.
  const named = (n) => key(n).length > 0;
  const inv = new Map(inventory.filter((c) => named(c.name)).map((c) => [note(c.name), c]));
  const lib = new Set(library.filter((r) => named(r.component)).map((r) => note(r.component)));
  const geo = new Set(geometry.filter(named).map(note));
  const why = new Map(reasons.filter((r) => named(r.component)).map((r) => [note(r.component), r.reason]));

  // 1. A CLASS WITH NO INVENTORY ENTRY. This is `Repeating group`: it ships as CSS, so it is
  //    part of the published library, and the inventory has never heard of it. Nothing
  //    downstream can check a component the inventory cannot see.
  for (const name of [...lib].sort()) {
    if (!inv.has(name) && !why.has(name)) {
      problems.push(`DRIFT    "${name}" has a .pf-* class and is in no components.json entry `
        + '— the inventory is behind the library, or the component was renamed in Figma');
    }
  }

  // 2. A MEASURED SHAPE FROM NOWHERE. Geometry for something that is neither in the library nor
  //    in the inventory. Usually a sub-part somebody measured (`Links (primary)`), which is
  //    fine — but it has to SAY so, or a real component that fell out of both is invisible.
  for (const name of [...geo].sort()) {
    if (!lib.has(name) && !inv.has(name) && !why.has(name)) {
      problems.push(`DRIFT    "${name}" has measured geometry and is in neither the library nor `
        + 'components.json — declare it in uncaptured-reasons.tsv or capture it');
    }
  }

  // 3. IN FIGMA, NO RULES, NO REASON. The inventory knows about it, the library does not carry
  //    it, and nobody said why. This is the one that catches a NEW component appearing in
  //    Figma: it fails rather than sliding in unnoticed, and a person classifies it.
  for (const [name, c] of [...inv].sort()) {
    if (lib.has(name) || why.has(name) || isExcludedPage(c.pageName)) continue;
    problems.push(`DRIFT    "${name}" is in components.json (${c.pageName || 'no page'}) with no `
      + 'rules and no line in uncaptured-reasons.tsv — capture it, or say why not');
  }

  // 4. A REASON FOR SOMETHING THAT IS NOT THERE. Dead rows: the file is merged and never
  //    pruned, so an explanation outlives the thing it explained. Harmless until someone
  //    trusts the file as a description of the present.
  const orphans = [...why.keys()].filter((n) => !inv.has(n) && !lib.has(n) && !geo.has(n)).sort();

  // Names Figma publishes with leading or trailing whitespace. Not a failure — the join
  // already survives them — but a real inconsistency in the design file, and the kind of thing
  // that quietly breaks any OTHER tool doing an exact match.
  const whitespace = [...untrimmed.entries()].map(([k, raw]) => ({ name: k, raw })).sort(
    (a, b) => a.name.localeCompare(b.name));

  // A reason starting `pending:` is DEBT, not an exception: a disagreement that is known,
  // recorded, and waiting on work — a re-extract, usually. It passes, because a permanently red
  // suite teaches people to ignore the suite. It is COUNTED AND NAMED in the verdict line on
  // every run, because that is the only thing keeping a known gap from becoming a forgotten one.
  // Same shape as the placeholder count in verify-images (F-029).
  const pending = [...why.entries()].filter(([, r]) => /^pending:/i.test(String(r || '')))
    .map(([n, r]) => ({ name: n, why: String(r).replace(/^pending:\s*/i, '') }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    problems, orphans, whitespace, pending,
    counted: { inventory: inv.size, library: lib.size, geometry: geo.size, reasons: why.size },
  };
}

// ---------------------------------------------------------------------------
function load() {
  const inventory = JSON.parse(readFileSync(`${RAW}/components.json`, 'utf8'))
    .map((c) => ({ name: c.name, pageName: c.pageName }));
  const library = tsv(`${RAW}/component-variants.tsv`).map((r) => ({ page: r[0], component: r[1] }))
    .filter((r) => r.component);
  const geometry = tsv(`${RAW}/component-geometry.tsv`).map((r) => r[0]).filter(Boolean);
  const reasons = tsv(`${RAW}/uncaptured-reasons.tsv`).map((r) => ({ component: r[0], reason: r[2] }))
    .filter((r) => r.component);
  return { inventory, library, geometry, reasons };
}

function main() {
  const data = load();
  const r = judge(data);

  for (const p of r.problems) console.log(p);
  for (const o of r.orphans) {
    console.log(`  stale    "${o}" has a reason in uncaptured-reasons.tsv and exists in no source`);
  }
  for (const p of r.pending) {
    console.log(`  pending  "${p.name}" — ${p.why}`);
  }
  for (const w of r.whitespace) {
    console.log(`  name     "${w.raw}" is published with surrounding whitespace — matched as `
      + `"${w.name}". Worth fixing in Figma; any exact-match tool will split it in two`);
  }
  if (r.problems.length) {
    console.log('');
    console.log('  The extracts disagree about what exists. Re-extract from Figma, or declare');
    console.log('  the exception in tokens/_raw/uncaptured-reasons.tsv with its reason.');
  }

  console.log(`\n${r.counted.inventory} in components.json, ${r.counted.library} with rules, `
    + `${r.counted.geometry} measured, ${r.counted.reasons} declared — `
    + `${r.problems.length} disagreement(s), ${r.orphans.length} stale reason(s)`
    + (r.pending.length ? `, ${r.pending.length} awaiting re-extract` : '')
    + (r.whitespace.length ? `, ${r.whitespace.length} name(s) with stray whitespace` : ''));
  process.exit(r.problems.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --self-test. The first fixture is the real bug, with its real name.
function selfTest() {
  const base = { inventory: [{ name: 'Button', pageName: 'Buttons and links' }],
    library: [{ component: 'Button' }], geometry: ['Button'], reasons: [] };
  const run = (over) => judge({ ...base, ...over });

  const cases = [
    ['sources that agree', () => run({}), (r) => r.problems.length === 0],

    ['THE REAL ONE — a class with no inventory entry', () =>
      run({ library: [{ component: 'Button' }, { component: 'Repeating group' }] }),
      (r) => r.problems.length === 1 && /"Repeating group" has a \.pf-\* class/.test(r.problems[0])],

    ['geometry for something in neither source', () =>
      run({ geometry: ['Button', 'Links (primary)'] }),
      (r) => r.problems.some((p) => /"Links \(primary\)" has measured geometry/.test(p))],

    ['...unless it is declared', () =>
      run({ geometry: ['Button', 'Links (primary)'],
        reasons: [{ component: 'Links (primary)', reason: 'a measured sub-part' }] }),
      (r) => r.problems.length === 0],

    ['A NEW COMPONENT IN FIGMA fails rather than sliding in', () =>
      run({ inventory: [{ name: 'Button', pageName: 'Buttons and links' },
        { name: 'Shiny new thing', pageName: 'Forms' }] }),
      (r) => r.problems.some((p) => /"Shiny new thing" is in components\.json \(Forms\)/.test(p))],

    ['...and a documentation page does not', () =>
      run({ inventory: [{ name: 'Button', pageName: 'Buttons and links' },
        { name: 'Dos and don\'ts', pageName: '📄 DOCUMENT MANAGEMENT' }] }),
      (r) => r.problems.length === 0],

    ['a trailing space must not split one component into two', () =>
      run({ inventory: [{ name: 'Text template format editor ', pageName: 'Forms' }],
        library: [{ component: 'Text template format editor' }], geometry: [] }),
      (r) => r.problems.length === 0 && r.whitespace.length === 1
        && r.whitespace[0].raw === 'Text template format editor '],

    ['a reason for something that exists nowhere is stale, not a failure', () =>
      run({ reasons: [{ component: 'Long gone', reason: 'deleted in Figma' }] }),
      (r) => r.problems.length === 0 && r.orphans.length === 1 && r.orphans[0] === 'Long gone'],
  ];

  let failures = 0;
  for (const [name, act, ok] of cases) {
    let got;
    try { got = act(); } catch (e) { got = { problems: [String(e)], orphans: [] }; }
    if (!ok(got)) {
      failures++;
      console.log(`  MISS ${name}`);
      console.log(`         problems=${JSON.stringify(got.problems)} orphans=${JSON.stringify(got.orphans)}`);
    }
  }

  // A `pending:` row passes and MUST still be counted. Without the second assertion a future
  // edit could make `pending:` mean "fine", the count would vanish from the verdict line, and a
  // known gap would become an invisible one.
  const deb = judge({ ...base, library: [{ component: 'Button' }, { component: 'Repeating group' }],
    reasons: [{ component: 'Repeating group', reason: 'pending: the inventory predates its capture' }] });
  if (deb.problems.length !== 0) {
    failures++;
    console.log('  MISS a `pending:` row must not fail the check');
  }
  if (deb.pending.length !== 1 || deb.pending[0].name !== 'Repeating group') {
    failures++;
    console.log(`  MISS every pending row must be counted and named (got ${JSON.stringify(deb.pending)})`);
  }

  // The check must not be able to pass by looking at nothing. Empty sources agree trivially,
  // and that is exactly the shape of a check pointed at the wrong directory.
  const empty = judge({ inventory: [], library: [], geometry: [], reasons: [] });
  if (empty.problems.length !== 0 || empty.counted.inventory !== 0) {
    failures++;
    console.log('  MISS empty sources must agree, and must report zero counted');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a class with no inventory entry, geometry '
    + 'from nowhere, and a new Figma component with no rules and no reason, while allowing a '
    + 'declared sub-part and a documentation page, and reporting a dead reason row as stale');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
