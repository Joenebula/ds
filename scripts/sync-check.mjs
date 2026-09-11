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
export function judge({ figma, captured, declared, inventory }) {
  const fig = figma.filter((c) => key(c.name));
  const figById = new Map(fig.filter((c) => key(c.nodeId)).map((c) => [key(c.nodeId), c]));
  const figByName = new Map(fig.map((c) => [key(c.name), c]));

  const why = new Set(declared.map(key).filter(Boolean));
  const inv = new Set(inventory.map(key).filter(Boolean));

  const renamed = [], gone = [], unidentified = [];
  let same = 0;
  const matchedFigma = new Set();

  for (const row of captured) {
    const name = key(row.name);
    if (!name) continue;
    const id = key(row.nodeId);

    // BY ID FIRST. This is the whole point: an id survives a rename, so the same component
    // coming back under a new name is ONE line saying so, not one "gone" and one "new" for a
    // human to pair up by eye. Against the newer list this repo was compared with, that turned
    // "7 gone, 27 new" into "5 renamed".
    if (id && figById.has(id)) {
      const f = figById.get(id);
      matchedFigma.add(key(f.nodeId));
      if (key(f.name) !== name) renamed.push({ from: name, to: key(f.name), nodeId: id });
      else same++;
      continue;
    }

    // No id on our side — all we can do is match the name, and say so. A row with no identity
    // cannot tell a rename from a deletion, which is exactly the state this change exists to
    // retire. Counted in the verdict line so the remaining blind spots stay visible.
    if (!id) {
      unidentified.push(name);
      if (figByName.has(name)) { matchedFigma.add(key(figByName.get(name).nodeId) || name); same++; }
      else gone.push(name);
      continue;
    }

    // Has an id, and Figma does not publish it any more. That is a real removal, and the CSS
    // still ships a rule for it.
    gone.push(name);
  }

  const isNew = fig
    .filter((c) => !matchedFigma.has(key(c.nodeId)) && !matchedFigma.has(key(c.name)))
    .filter((c) => !why.has(key(c.name)))
    .map((c) => key(c.name))
    .filter((n) => !captured.some((r) => key(r.name) === n))
    .sort();

  // Recorded, not failed: the inventory catching up is the expected outcome of a re-extract.
  const inventoryBehind = fig.map((c) => key(c.name)).filter((n) => !inv.has(n)).sort();

  return {
    renamed: renamed.sort((a, b) => a.from.localeCompare(b.from)),
    isNew, gone: gone.sort(), same,
    unidentified: [...new Set(unidentified)].sort(),
    inventoryBehind,
    figma: fig.length, captured: captured.length,
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
  const figma = (Array.isArray(raw) ? raw : raw.components || [])
    .map((c) => ({ name: c.name, nodeId: c.nodeId || c.id || c.node_id || '' }));
  // Header-keyed, so the nodeId column is picked up wherever it sits in the row.
  const vh = readFileSync(`${RAW}/component-variants.tsv`, 'utf8').split('\n')[0].split('\t');
  const ci = vh.indexOf('component'), ni = vh.indexOf('nodeId');
  const seen = new Map();
  for (const r of tsv(`${RAW}/component-variants.tsv`)) {
    const name = key(r[ci]);
    if (name && !seen.has(name)) seen.set(name, { name, nodeId: ni === -1 ? '' : key(r[ni]) });
  }
  const captured = [...seen.values()];
  const declared = tsv(`${RAW}/uncaptured-reasons.tsv`).map((r) => r[0]);
  const inventory = JSON.parse(readFileSync(`${RAW}/components.json`, 'utf8')).map((c) => c.name);

  const r = judge({ figma, captured, declared, inventory });

  for (const m of r.renamed) {
    console.log(`RENAMED  "${m.from}" is now called "${m.to}" in Figma (${m.nodeId}) — same `
      + 'component, new name; update the extracts rather than capturing it twice');
  }
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

  if (r.unidentified.length) {
    console.log(`  no id    ${r.unidentified.length} captured row(s) carry no nodeId, so a rename `
      + 'of one is indistinguishable from a deletion — run backfill-node-ids.mjs, or re-extract');
  }
  console.log(`\n${r.figma} published in Figma, ${r.captured} captured here — `
    + `${r.same} unchanged, ${r.renamed.length} renamed, ${r.isNew.length} new, ${r.gone.length} gone`
    + (r.unidentified.length ? `, ${r.unidentified.length} with no id` : ''));
  process.exit(r.problems ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {
  const base = {
    figma: [{ name: 'Button', nodeId: '1:2' }],
    captured: [{ name: 'Button', nodeId: '1:2' }],
    declared: [], inventory: ['Button'],
  };
  const run = (o) => judge({ ...base, ...o });

  const cases = [
    ['nothing has moved', () => run({}), (r) => r.problems === 0 && r.same === 1],

    // THE ONE THIS CHANGE EXISTS FOR. Real names, from the real diff: node 22973 kept its
    // identity while Figma changed what it was called. Name matching reported that as one
    // deletion and one addition and left a person to pair them up.
    ['A RENAME IS ONE LINE, NOT A DELETE PLUS AN ADD', () =>
      run({ figma: [{ name: 'Search navigation', nodeId: '1:2' }],
        captured: [{ name: 'Search home button', nodeId: '1:2' }] }),
      (r) => r.renamed.length === 1 && r.renamed[0].from === 'Search home button'
        && r.renamed[0].to === 'Search navigation'
        && r.gone.length === 0 && r.isNew.length === 0 && r.problems === 0],

    ['five renames report as five, not as 5 gone and 5 new', () => {
      const pairs = [['Search home button', 'Search navigation'], ['[S] Main nav context', 'Secondary nav'],
        ['[S] Navigation/main tabs', 'Nav tabs'], ['Header top navigation', 'Header navigation'],
        ['Full page navigation', 'Full page']];
      return run({
        captured: pairs.map(([from], i) => ({ name: from, nodeId: `9:${i}` })),
        figma: pairs.map(([, to], i) => ({ name: to, nodeId: `9:${i}` })),
      });
    }, (r) => r.renamed.length === 5 && r.gone.length === 0 && r.isNew.length === 0],

    ['a genuinely NEW component still fails', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' }, { name: 'Shiny', nodeId: '7:7' }] }),
      (r) => r.isNew.length === 1 && r.isNew[0] === 'Shiny' && r.problems === 1],

    ['...unless it is declared out', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' }, { name: 'Shiny', nodeId: '7:7' }],
        declared: ['Shiny'] }), (r) => r.problems === 0],

    ['a captured id Figma no longer publishes is GONE', () =>
      run({ figma: [] }), (r) => r.gone.length === 1 && r.gone[0] === 'Button' && r.problems === 1],

    ['a row with NO id falls back to the name, and says so', () =>
      run({ captured: [{ name: 'Button', nodeId: '' }] }),
      (r) => r.problems === 0 && r.unidentified.length === 1 && r.unidentified[0] === 'Button'],

    ['a row with no id CANNOT see a rename — that is the cost, and it is reported', () =>
      run({ captured: [{ name: 'Search home button', nodeId: '' }],
        figma: [{ name: 'Search navigation', nodeId: '1:2' }] }),
      (r) => r.renamed.length === 0 && r.gone.length === 1 && r.isNew.length === 1
        && r.unidentified.length === 1],

    ['a trailing space is not a new component', () =>
      run({ figma: [{ name: 'Button ', nodeId: '1:2' }] }), (r) => r.problems === 0 && r.same === 1],

    ['the inventory lagging is recorded, not failed', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' }, { name: 'Late', nodeId: '5:5' }],
        captured: [{ name: 'Button', nodeId: '1:2' }, { name: 'Late', nodeId: '5:5' }],
        inventory: ['Button'] }),
      (r) => r.problems === 0 && r.inventoryBehind.length === 1 && r.inventoryBehind[0] === 'Late'],
  ];

  let failures = 0;
  for (const [name, act, ok] of cases) {
    let got; try { got = act(); } catch (e) { got = { problems: -1, err: String(e) }; }
    if (!ok(got)) { failures++; console.log(`  MISS ${name}`); console.log(`         ${JSON.stringify(got)}`); }
  }

  // An empty listing is the shape of a failed or truncated fetch. It must be loud, not quiet.
  const emptyFetch = judge({ figma: [], captured: [{ name: 'Button', nodeId: '1:2' },
    { name: 'Tags', nodeId: '3:4' }], declared: [], inventory: [] });
  if (emptyFetch.gone.length !== 2) {
    failures++;
    console.log('  MISS an empty listing must report everything as gone, not pass quietly');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — a rename reports as ONE line rather than a deletion plus an '
    + 'addition, five renames as five, and a row with no id falls back to the name and is '
    + 'counted as blind; a new component, a removal and an empty listing all still fail');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
