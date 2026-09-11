#!/usr/bin/env node
// Has Figma moved since we last looked?
//
//   node scripts/sync-check.mjs tokens/_raw/figma-components.json
//   node scripts/sync-check.mjs --self-test
//
// WHY THIS EXISTS. The design system keeps evolving. New components are occasional rather than
// weekly, which is exactly what makes this dangerous: nobody is watching, because most weeks
// there is nothing to watch. `tokens/_raw/components.json` was read on 2026-09-08 and never
// refreshed; `component-variants.tsv` moved on the 9th. `Repeating group` fell in the gap and
// shipped a class no inventory had heard of.
//
// GATES ARE VALIDATORS, NOT FETCHERS. This makes no Figma call. Somebody runs the listing tool
// once, saves the response to disk, and this does the arithmetic — so re-running it is free and
// the call count stays honest. See CLAUDE.md for the one-call recipe.
//
// WHAT IT ANSWERS, in three numbers:
//
//   NEW       in Figma, in neither the library nor the declared exclusions  -> FAILS
//   GONE      captured here, no longer in Figma                             -> FAILS
//   SAME      matched                                                       -> the boring case
//
// NEW FAILS RATHER THAN AUTO-CAPTURING. A component appearing in Figma might be real, might be
// half-finished, might be an experiment somebody left on a page. Pulling it in automatically
// would let an unfinished idea become part of the published library without anyone deciding.
// So it stops the run and names itself, and a person classifies it.
import { readFileSync, existsSync } from 'node:fs';

const RAW = 'tokens/_raw';
const key = (n) => String(n || '').trim();

const tsv = (file) => {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).slice(1)
    .map((l) => l.split('\t').map((c) => c.trim()));
};

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function judge({ figma, library, declared, inventory }) {
  const fig = new Map(figma.filter((c) => key(c.name)).map((c) => [key(c.name), c]));
  const lib = new Set(library.map(key).filter(Boolean));
  const why = new Set(declared.map(key).filter(Boolean));
  const inv = new Set(inventory.map(key).filter(Boolean));

  const isNew = [...fig.keys()].filter((n) => !lib.has(n) && !why.has(n)).sort();
  // "Gone" is measured against what we CAPTURED, not against the old inventory: a component
  // with a class that Figma no longer publishes is a live problem — the CSS ships a rule for
  // something that does not exist. An inventory entry disappearing is only bookkeeping.
  const gone = [...lib].filter((n) => !fig.has(n)).sort();
  const same = [...lib].filter((n) => fig.has(n)).length;

  // Recorded, not failed: the inventory catching up is the expected outcome of a re-extract,
  // so say how far behind it was rather than treating it as a fault.
  const inventoryBehind = [...fig.keys()].filter((n) => !inv.has(n)).sort();

  return {
    isNew, gone, same, inventoryBehind,
    figma: fig.size, captured: lib.size,
    problems: isNew.length + gone.length,
  };
}

// ---------------------------------------------------------------------------
function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: sync-check.mjs <saved-figma-component-list.json> | --self-test');
    console.error('');
    console.error('  Save the listing first — see CLAUDE.md, "Keeping up with Figma".');
    process.exit(2);
  }
  if (!existsSync(file)) {
    // No saved response means the question was never asked. Vacuous, per F-019 — never a pass.
    console.log(`no ${file} — nothing saved from Figma to compare against`);
    console.log('nothing measured — freshness NOT MEASURED');
    process.exit(2);
  }

  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const figma = (Array.isArray(raw) ? raw : raw.components || []).map((c) => ({ name: c.name }));
  const library = tsv(`${RAW}/component-variants.tsv`).map((r) => r[1]);
  const declared = tsv(`${RAW}/uncaptured-reasons.tsv`).map((r) => r[0]);
  const inventory = JSON.parse(readFileSync(`${RAW}/components.json`, 'utf8')).map((c) => c.name);

  const r = judge({ figma, library, declared, inventory });

  for (const n of r.isNew) console.log(`NEW      "${n}" is in Figma, has no rules, and no declared reason`);
  for (const n of r.gone) console.log(`GONE     "${n}" has a .pf-* class and is no longer published by Figma`);
  if (r.inventoryBehind.length) {
    console.log(`  behind   components.json is missing ${r.inventoryBehind.length} name(s) Figma `
      + `publishes — refresh it in the same pass`);
  }
  if (r.problems) {
    console.log('');
    console.log('  Nothing is captured automatically. Decide for each: capture it, or add a row');
    console.log('  to tokens/_raw/uncaptured-reasons.tsv saying why it stays out.');
  }

  console.log(`\n${r.figma} published in Figma, ${r.captured} captured here — `
    + `${r.same} unchanged, ${r.isNew.length} new, ${r.gone.length} gone`);
  process.exit(r.problems ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {
  const base = { figma: [{ name: 'Button' }], library: ['Button'], declared: [], inventory: ['Button'] };
  const run = (o) => judge({ ...base, ...o });

  const cases = [
    ['nothing has moved', () => run({}), (r) => r.problems === 0 && r.same === 1],

    ['a NEW component in Figma fails', () => run({ figma: [{ name: 'Button' }, { name: 'Shiny' }] }),
      (r) => r.isNew.length === 1 && r.isNew[0] === 'Shiny' && r.problems === 1],

    ['...unless it is declared out', () =>
      run({ figma: [{ name: 'Button' }, { name: 'Shiny' }], declared: ['Shiny'] }),
      (r) => r.problems === 0],

    ['a captured component GONE from Figma fails', () =>
      run({ figma: [], library: ['Button'] }),
      (r) => r.gone.length === 1 && r.gone[0] === 'Button' && r.problems === 1],

    ['a trailing space is not a new component', () =>
      run({ figma: [{ name: 'Button ' }] }), (r) => r.problems === 0 && r.same === 1],

    ['the inventory lagging is recorded, not failed', () =>
      run({ figma: [{ name: 'Button' }, { name: 'Late' }], library: ['Button', 'Late'],
        inventory: ['Button'] }),
      (r) => r.problems === 0 && r.inventoryBehind.length === 1 && r.inventoryBehind[0] === 'Late'],
  ];

  let failures = 0;
  for (const [name, act, ok] of cases) {
    let got; try { got = act(); } catch (e) { got = { problems: -1, err: String(e) }; }
    if (!ok(got)) { failures++; console.log(`  MISS ${name}`); console.log(`         ${JSON.stringify(got)}`); }
  }

  // An empty Figma listing must not read as "everything is gone, and also fine". It is the
  // shape of a failed or truncated fetch, and it has to be loud.
  const emptyFetch = judge({ figma: [], library: ['Button', 'Tags'], declared: [], inventory: [] });
  if (emptyFetch.gone.length !== 2) {
    failures++;
    console.log('  MISS an empty listing must report everything as gone, not pass quietly');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a new Figma component with no rules and no '
    + 'reason, a captured component Figma no longer publishes, and an empty listing, while '
    + 'allowing a declared exclusion and a stray trailing space, and recording a lagging '
    + 'inventory rather than failing it');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
