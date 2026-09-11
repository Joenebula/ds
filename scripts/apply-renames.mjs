#!/usr/bin/env node
// Rename captured rows to the name Figma uses now, matched on node id.
//
//   node scripts/apply-renames.mjs            report only
//   node scripts/apply-renames.mjs --write
//   node scripts/apply-renames.mjs --self-test
//
// WHY THIS IS SEPARATE FROM THE RE-EXTRACT. `sync-check.mjs` can already SEE a rename — that is
// what carrying the node id bought. Nothing could APPLY one. The re-extract cannot do it either
// on this page, because several renamed components also had their variant axes restructured, so
// the extractor's axis guard correctly refuses to touch their rows; and their new colours bind
// tokens this repo has never extracted (`Navigation/Nav bg top`, `Border/Default full`), so the
// colour half has to wait for a token re-extract. A rename needs neither: the id says which row,
// and the published listing says what it is called now.
//
// WHY IT MATTERS MORE THAN IT SOUNDS. Class names are generated from component names, so a stale
// name is a stale class. On this file it is worse than stale — Figma performed a SWAP:
//
//     13658:7900  was "Secondary nav"        -> Figma now calls it "Tertiary nav"
//     13658:7842  was "[S] Main nav context" -> Figma now calls it "Secondary nav"
//
// So `.pf-secondary-nav` in the shipped stylesheet is generated from the component the designer
// now calls the TERTIARY nav. Anyone writing that class gets the wrong component. A name-only
// comparison reports "Secondary nav — unchanged" and is confidently wrong; only the id sees it.
//
// NEVER RENAMES BY NAME. A row with no node id is left alone and counted. Guessing which row a
// name refers to is exactly how a swap gets applied backwards.
import { readFileSync, writeFileSync } from 'node:fs';

const RAW = 'tokens/_raw';
const FILES = ['component-variants.tsv', 'component-geometry.tsv'];
const key = (s) => String(s || '').trim();

export function rename(text, byId) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const header = lines[0].split('\t');
  const width = header.length;
  const iName = header.indexOf('component');
  const iId = header.indexOf('nodeId');
  if (iName === -1 || iId === -1) throw new Error('need both a component and a nodeId column');

  const out = [lines[0]];
  const renamed = []; let unidentified = 0; let unchanged = 0;
  for (const raw of lines.slice(1)) {
    const cells = raw.split('\t');
    // Pad first, so a cell always means the column it is named after — a TSV row omits its
    // trailing empty fields, and reading one by position without padding is how the first
    // node-id backfill put 72 ids in the `notes` column.
    while (cells.length < width) cells.push('');
    const id = key(cells[iId]);
    const was = key(cells[iName]);
    if (!id) { unidentified++; out.push(raw); continue; }
    const now = byId.get(id);
    if (now === undefined || now === was) { unchanged++; out.push(raw); continue; }
    cells[iName] = now;
    renamed.push({ id, was, now });
    const c = [...cells]; while (c.length && !c[c.length - 1]) c.pop();
    out.push(c.join('\t'));
  }
  return { text: out.join('\n') + '\n', renamed, unidentified, unchanged };
}

function main() {
  const write = process.argv.includes('--write');
  const byId = new Map();
  for (const c of JSON.parse(readFileSync(`${RAW}/figma-components.json`, 'utf8'))) byId.set(key(c.nodeId), key(c.name));
  console.log(`published in Figma : ${byId.size}`);

  let total = 0;
  for (const f of FILES) {
    const path = `${RAW}/${f}`;
    const r = rename(readFileSync(path, 'utf8'), byId);
    console.log(`\n${f}`);
    console.log(`  renamed      : ${r.renamed.length}`);
    for (const x of r.renamed) console.log(`      ${x.id.padEnd(14)} ${JSON.stringify(x.was)} -> ${JSON.stringify(x.now)}`);
    console.log(`  unchanged    : ${r.unchanged}`);
    console.log(`  no node id   : ${r.unidentified} (left alone — a rename is never applied by name)`);
    total += r.renamed.length;
    if (write) { writeFileSync(path, r.text); console.log('  written'); }
  }
  console.log(`\n${total} row(s) ${write ? 'renamed' : 'would be renamed'}`);
  if (!write) console.log('dry run — pass --write to apply');
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (m) => { failures++; console.log(`  MISS ${m}`); };
  const H = 'page\tcomponent\tvariant\tfill\tstroke\ttext\tnodeId';

  // THE SWAP. This is the whole reason the script exists, and the case a name-keyed rename gets
  // backwards: the name "Secondary nav" belongs to a DIFFERENT component after the rename.
  const src = `${H}
Navigation\tSecondary nav\tA\t\t\tText/Theme\t13658:7900
Navigation\t[S] Main nav context\t\tBackground/Primary\t\tText/Theme\t13658:7842
`;
  const byId = new Map([['13658:7900', 'Tertiary nav'], ['13658:7842', 'Secondary nav']]);
  let r = rename(src, byId);
  const rows = r.text.split('\n').slice(1, 3).map((l) => l.split('\t'));
  if (rows[0][1] !== 'Tertiary nav') miss(`the row with id 13658:7900 must become "Tertiary nav" (got ${rows[0][1]})`);
  if (rows[1][1] !== 'Secondary nav') miss(`the row with id 13658:7842 must become "Secondary nav" (got ${rows[1][1]})`);
  if (r.renamed.length !== 2) miss(`both halves of a swap must be reported (got ${r.renamed.length})`);
  // And the ids must not have moved.
  if (rows[0][6] !== '13658:7900' || rows[1][6] !== '13658:7842') miss('a rename must not disturb the node id');

  // A ROW WITH NO ID IS NEVER RENAMED, however tempting the name match.
  r = rename(`${H}\nNavigation\tSecondary nav\tA\t\t\tText/Theme\t\n`, byId);
  if (r.renamed.length) miss('a row with no node id must never be renamed by name');
  if (r.unidentified !== 1) miss('a row with no node id must be counted');

  // An id Figma no longer publishes is left alone, not blanked.
  r = rename(`${H}\nNavigation\tCounter\t\tIcons/Icon - Theme\t\tText/Inverted primary\t14990:11954\n`, byId);
  if (r.renamed.length) miss('a component Figma no longer publishes must be left alone, not renamed or emptied');
  if (!r.text.includes('Counter')) miss('an unpublished component must keep its row');

  // An unchanged name is not a rename.
  r = rename(`${H}\nNavigation\tTertiary nav\tA\t\t\tText/Theme\t13658:7900\n`, byId);
  if (r.renamed.length || r.unchanged !== 1) miss('a name that already matches must not be reported as a rename');

  // A RAGGED ROW must not have its id read out of the wrong column.
  r = rename(`component\tsize\tnotes\tnodeId\nOld name\t32 x 32\n`, new Map([['', 'WRONG']]));
  if (r.renamed.length) miss('a short row must not be matched on an empty id read from a padded cell');

  // Round-trip: nothing to rename means byte-identical output.
  const same = `${H}\nNavigation\tTertiary nav\tA\t\t\tText/Theme\t13658:7900\n`;
  if (rename(same, byId).text !== same) miss('a file with no renames must round-trip byte for byte');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — both halves of a name SWAP land on the right rows, a row with no '
    + 'id is never renamed by name, a component Figma no longer publishes keeps its row, and a file '
    + 'with nothing to rename round-trips byte for byte');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
