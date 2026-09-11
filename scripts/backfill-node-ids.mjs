#!/usr/bin/env node
// Give every captured component its Figma node id, from what the repo already knows.
//
//   node scripts/backfill-node-ids.mjs --dry-run
//   node scripts/backfill-node-ids.mjs --write
//
// WHY. Every extract except components.json joins on the component NAME, and a name is not an
// identity. When Figma renames something — which it does — a rename is indistinguishable from a
// deletion plus an addition. Comparing this repo against a newer component list produced
// "7 gone, 27 new" when the truth was "5 renamed, 2 removed, 22 newly captured". The only thing
// that survives a rename is the node id, and we were throwing it away.
//
// THE COLUMN GOES LAST, NOT FIRST. The plan said first; the plan was wrong. Six readers destructure
// by position — `const [page, component, variant, fill, stroke, text] = l.split('\t')` — and a
// leading column shifts every one of them. A TRAILING column is invisible to all of them: the
// header-keyed readers gain a key they ignore, the destructuring readers never reach it, and
// `split('\t')[0]` is unchanged. Backward compatible with every existing reader, which is what
// lets this land before the re-extract rather than after it.
//
// NO FIGMA CALLS, AND NO GUESSING. Ids come from tokens/_raw/components.json by trimmed-name
// match. A row that does not match stays empty and is reported: the sub-parts Figma never
// published (`Links (primary)`) will never have an id, and `Repeating group` has none because the
// inventory has never seen it. An invented id would be worse than an absent one.
//
// AND A NAME THAT MATCHES TWICE IS NOT A MATCH. This map used to be built with
// `byName.set(name, nodeId)` in a loop, so where Figma publishes two components under one name
// the LAST one silently won. Nine names in the 475-component inventory are duplicated, and four
// captured components were carrying the wrong object's id as a result:
//
//     Bar chart   Analytics and charts   held 6188:65918, a 36x36 ICON on the Icons page
//     Org chart   Cards and panels       held 6237:66512, likewise an icon
//     Signature   Forms                  held 8136:78299, likewise an icon
//     Header      Navigation             held 13658:7653, which is in no inventory at all
//
// It surfaced only because a re-read of "Bar chart" came back as a 36px glyph with one icon
// colour where the extract claims a 415x193 chart. The node id is this repo's IDENTITY: a wrong
// one is worse than an absent one, because every later read trusts it and reads the wrong node.
// So an ambiguous name now fills NOTHING and is reported with its candidates, which is the same
// rule as an unmatched name — an unexplained ambiguity is a question for a person.
import { readFileSync, writeFileSync } from 'node:fs';

const RAW = 'tokens/_raw';
const FILES = [
  { file: 'component-variants.tsv', nameCol: 'component' },
  { file: 'component-geometry.tsv', nameCol: 'component' },
];

const key = (n) => String(n || '').trim();

export function backfill(text, nameCol, byName) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const header = lines[0].split('\t');
  const idx = header.indexOf(nameCol);
  if (idx === -1) throw new Error(`no "${nameCol}" column`);

  const already = header.indexOf('nodeId');
  const out = [];
  let filled = 0; const missing = []; const ambiguous = [];

  out.push(already === -1 ? [...header, 'nodeId'].join('\t') : lines[0]);

  const width = header.length;
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    // RAGGED ROWS. A TSV row often omits its trailing empty fields, so a row can be shorter
    // than the header. Appending to such a row puts the id in whatever column happens to be
    // next — on `Action menu`, an 8-cell row under a 9-column header, the id landed in `notes`.
    // The first run of this script did exactly that to 72 rows and the count looked plausible.
    // Pad to the header width FIRST, so a cell always means the column it is named after.
    while (cells.length < (already === -1 ? width : width)) cells.push('');
    const name = key(cells[idx]);
    const candidates = byName.get(name) || [];
    // An ambiguous name is NOT a match. Filling one of two candidates would be a coin toss
    // wearing a measurement's clothes, and every later read would trust the result.
    if (candidates.length > 1) ambiguous.push(name);
    const id = candidates.length === 1 ? candidates[0] : '';
    if (already === -1) {
      cells.push(id);
    } else {
      // Never overwrite an id that is already there — a later extract knows better than this
      // backfill does, and clobbering it would undo real information with a name guess.
      if (!key(cells[already])) cells[already] = id;
    }
    if (id) filled++; else if (name && candidates.length === 0) missing.push(name);
    out.push(cells.join('\t'));
  }
  const uniq = (a) => [...new Set(a)].sort();
  return { text: out.join('\n') + '\n', filled, missing: uniq(missing), ambiguous: uniq(ambiguous) };
}

// ---------------------------------------------------------------------------
function main() {
  const write = process.argv.includes('--write');
  const inv = JSON.parse(readFileSync(`${RAW}/components.json`, 'utf8'));
  const byName = new Map();       // name -> EVERY id the inventory publishes under it
  const pageOf = new Map();       // id -> the page it lives on, for the ambiguity report
  for (const c of inv) {
    const n = key(c.name);
    if (!n || !c.nodeId) continue;
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(c.nodeId);
    pageOf.set(c.nodeId, key(c.pageName || c.page));
  }
  const dupes = [...byName].filter(([, ids]) => ids.length > 1);
  console.log(`${byName.size} name(s) available from components.json`);
  console.log(`${dupes.length} of them are published more than once and can fill NOTHING:`);
  for (const [n, ids] of dupes.sort()) {
    console.log(`    "${n}" -> ${ids.map((i) => `${i} (${pageOf.get(i) || '?'})`).join(', ')}`);
  }
  console.log('');

  for (const { file, nameCol } of FILES) {
    const path = `${RAW}/${file}`;
    const r = backfill(readFileSync(path, 'utf8'), nameCol, byName);
    const total = r.filled + r.missing.length;
    console.log(`${file}`);
    console.log(`  ${r.filled} row-name(s) matched exactly one inventory id, `
      + `${r.missing.length} matched none, ${r.ambiguous.length} matched more than one`);
    for (const m of r.missing) console.log(`    no id     "${m}"`);
    for (const a of r.ambiguous) console.log(`    AMBIGUOUS "${a}" — left empty, resolve by hand`);
    if (write) { writeFileSync(path, r.text); console.log('  written'); }
    console.log('');
  }
  if (!write) console.log('dry run — nothing written. Re-run with --write.');
}

// ---------------------------------------------------------------------------
function selfTest() {
  const by = new Map([['Button', ['1:2']], ['Tags', ['3:4']]]);
  const t = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') + '\n';

  const src = t(`
    component\tsize
    Button\t32
    Links (primary)\tauto
  `).replace(/ {4}/g, '');

  let failures = 0;
  const r = backfill(src, 'component', by);
  if (!r.text.split('\n')[0].endsWith('nodeId')) {
    failures++; console.log('  MISS the id column must be appended LAST, never prepended');
  }
  if (r.text.split('\n')[1] !== 'Button\t32\t1:2') {
    failures++; console.log(`  MISS a matched row gets its id (got ${JSON.stringify(r.text.split('\n')[1])})`);
  }
  if (r.text.split('\n')[2] !== 'Links (primary)\tauto\t') {
    failures++; console.log('  MISS an unmatched row gets an EMPTY id, never a guess');
  }
  if (r.filled !== 1 || r.missing.length !== 1 || r.missing[0] !== 'Links (primary)') {
    failures++; console.log(`  MISS the split must be reported honestly (got ${JSON.stringify(r)})`);
  }

  // Running it twice must not double the column, and must not overwrite a real id.
  const twice = backfill(r.text, 'component', new Map([['Button', ['9:9']]]));
  if ((twice.text.split('\n')[0].match(/nodeId/g) || []).length !== 1) {
    failures++; console.log('  MISS running twice must not add a second nodeId column');
  }
  if (twice.text.split('\n')[1] !== 'Button\t32\t1:2') {
    failures++; console.log('  MISS an existing id must never be overwritten by a later name guess');
  }

  // A RAGGED ROW must not put the id in the wrong column. This is the bug the first run shipped.
  const ragged = 'component\tsize\tnotes\nButton\t32\n';
  const rr = backfill(ragged, 'component', new Map([['Button', ['1:2']]]));
  const rrHeader = rr.text.split('\n')[0].split('\t');
  const rrRow = rr.text.split('\n')[1].split('\t');
  if (rrRow.length !== rrHeader.length || rrRow[rrHeader.indexOf('nodeId')] !== '1:2'
      || rrRow[rrHeader.indexOf('notes')] !== '') {
    failures++;
    console.log(`  MISS a short row must be padded so the id lands in nodeId, not in the next `
      + `column along (got ${JSON.stringify(rrRow)})`);
  }

  // A NAME PUBLISHED TWICE fills nothing. This is the defect that put an Icons-page glyph's id
  // on the Analytics `Bar chart` row, where it sat as the component's identity until a re-read
  // came back 36px. Picking either candidate is a guess; the row must stay empty and SAY so.
  const amb = backfill('component\tsize\nBar chart\t415\n', 'component',
    new Map([['Bar chart', ['7658:72458', '6188:65918']]]));
  if (amb.text.split('\n')[1] !== 'Bar chart\t415\t') {
    failures++;
    console.log(`  MISS a name with two inventory ids must fill NOTHING `
      + `(got ${JSON.stringify(amb.text.split('\n')[1])})`);
  }
  if (amb.filled !== 0 || amb.ambiguous.length !== 1 || amb.ambiguous[0] !== 'Bar chart') {
    failures++;
    console.log(`  MISS an ambiguous name must be reported as ambiguous, not counted as filled `
      + `(got ${JSON.stringify({ filled: amb.filled, ambiguous: amb.ambiguous })})`);
  }
  if (amb.missing.length !== 0) {
    failures++;
    console.log('  MISS an ambiguous name is not the same as an unmatched one and must not be '
      + 'reported as merely missing — the fix is to choose, not to find');
  }

  // A trailing column must be invisible to a positional reader — the whole reason it goes last.
  const [c0, c1] = twice.text.split('\n')[1].split('\t');
  if (c0 !== 'Button' || c1 !== '32') {
    failures++; console.log('  MISS positional destructuring must be unaffected by the new column');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the column is appended last and stays invisible to positional '
    + 'readers, a matched row gets its id, an unmatched row gets an empty one rather than a '
    + 'guess, a name the inventory publishes TWICE fills nothing and is reported as ambiguous '
    + 'rather than resolved by a coin toss, and a second run neither duplicates the column nor '
    + 'overwrites a real id');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
