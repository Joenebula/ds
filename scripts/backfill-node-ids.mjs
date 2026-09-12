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
import { isIconPage } from './check-catalogue-drift.mjs';

const RAW = 'tokens/_raw';
const FILES = [
  // `rowPageCol` narrows a name published on two pages to the candidate on THIS row's page.
  // Only this file records one, so only this file gets it.
  { file: 'component-variants.tsv', nameCol: 'component', rowPageCol: 'page' },
  { file: 'component-geometry.tsv', nameCol: 'component' },
  // ICONS TOO. icons.tsv is index/figmaName/file/svg and had no identity at all, which is the
  // same defect the component extracts were fixed for here: without an id a rename is
  // indistinguishable from a deletion plus an addition, and sync-check could only report
  // "3 new, 6 gone — NO node ids" and ask a person to pair the lists by eye.
  //
  // Safe to append: only two things parse this file (sync-check.mjs reads index 1,
  // extract-icons.mjs reads index 2), both positional, neither reaches index 3 and neither
  // rejoins the tail — so a fifth column is invisible to both.
  //
  // `prefer` is what makes it work. Four names are published twice, once as a component and once
  // as a glyph: Bar chart, Configuration, Org chart, Signature. Every row in icons.tsv IS an icon
  // by construction, so the Icons-page candidate is the right one — that is evidence, not a coin
  // toss, and it is the one narrowing the ambiguity rule below permits.
  { file: 'icons.tsv', nameCol: 'figmaName', prefer: isIconPage },
];

const key = (n) => String(n || '').trim();

export function backfill(text, nameCol, byName,
  { prefer = null, pageOf = new Map(), rowPageCol = null, listingByName = null } = {}) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const header = lines[0].split('\t');
  const idx = header.indexOf(nameCol);
  if (idx === -1) throw new Error(`no "${nameCol}" column`);

  const already = header.indexOf('nodeId');
  // The row's OWN page, when the file records one. Stronger evidence than any page predicate:
  // it is data already in the row rather than a claim about what kind of file this is.
  const pageIdx = rowPageCol ? header.indexOf(rowPageCol) : -1;
  if (rowPageCol && pageIdx === -1) throw new Error(`no "${rowPageCol}" column`);
  const out = [];
  let filled = 0; const missing = []; const ambiguous = []; const narrowed = [];
  const contradicted = [];

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
    let candidates = byName.get(name) || [];
    // ONE narrowing is allowed, and only one: a caller that knows what KIND of thing every row in
    // its file is may filter the candidates by page. icons.tsv is entirely icons, so a name
    // published once on the Icons page and once elsewhere is not ambiguous at all — the other
    // candidate cannot be what this row means. If the filter leaves anything other than exactly
    // one, it is discarded and the ambiguity stands.
    if (prefer && candidates.length > 1) {
      const onPage = candidates.filter((c) => prefer(pageOf.get(c) || ''));
      if (onPage.length === 1) {
        narrowed.push(`${name} -> ${onPage[0]} — published more than once, one on the icon page`);
        candidates = onPage;
      }
    }
    // THE SAME NARROWING, WITH THE ROW'S OWN EVIDENCE. component-variants.tsv records the page it
    // captured each component from, so a name published on two pages is not ambiguous there at
    // all: only the candidate on THIS row's page can be what the row means. It resolves five of
    // the six — `Bar chart`, `Configuration`, `Header`, `Org chart` and `Signature` — each an
    // exact page match, and `Field` stays ambiguous because both its candidates are on `Forms`.
    //
    // Note what is NOT used here. Narrowing to "not an excluded page" would look equivalent and
    // is wrong: `Icons` is a legitimate page in component-variants.tsv — `Circle icons` is
    // captured from it — so that rule would discard a row's own correct candidate. That is the
    // same mistake sync-check made in the GONE direction, one layer down.
    if (pageIdx !== -1 && candidates.length > 1) {
      const rowPage = key(cells[pageIdx]);
      const onPage = rowPage
        ? candidates.filter((c) => key(pageOf.get(c) || '') === rowPage) : [];
      if (onPage.length === 1) {
        narrowed.push(`${name} -> ${onPage[0]} — published more than once; this row records `
          + `page "${rowPage}", which matches exactly one`);
        candidates = onPage;
      }
    }
    // An ambiguous name is NOT a match. Filling one of two candidates would be a coin toss
    // wearing a measurement's clothes, and every later read would trust the result.
    if (candidates.length > 1) ambiguous.push(name);
    let id = candidates.length === 1 ? candidates[0] : '';

    // AN ID IS ONLY AN IDENTITY IF THE CURRENT LISTING STILL PUBLISHES IT. This fills from
    // components.json, an INVENTORY that can be older than the saved listing — so a name whose
    // component was rebuilt in Figma resolves here to the id it used to have. Writing that is
    // worse than writing nothing: a stale id is indistinguishable from a live one, and every
    // later read trusts it. `Header` is the real case — the inventory has one Navigation Header
    // (13658:7653), the listing has two others (32488:24634, 32527:39433) and not that one.
    //
    // The test is CONTRADICTION, never absence: refuse only when the listing publishes this NAME
    // and does not publish this ID. A name the listing omits entirely proves nothing — it may sit
    // on a page the listing does not cover — and refusing on that would be the "not in this
    // listing means not in Figma" error this repo has already made once.
    // `have` is read once and used by BOTH the test and the report, so a report can never throw
    // on a name the test did not require to be present. A reporting line that crashes hides a
    // logic error behind a stack trace — and a mutant that dies of a crash proves nothing.
    const have = (id && listingByName) ? listingByName.get(name) : null;
    if (have && !have.has(id)) {
      contradicted.push(`${name} -> ${id} is not published under that name in the listing, which `
        + `has ${[...have].join(', ')} — left empty as a STALE pin`);
      id = '';
    }
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
  return { text: out.join('\n') + '\n', filled, missing: uniq(missing),
    ambiguous: uniq(ambiguous), narrowed: uniq(narrowed), contradicted: uniq(contradicted) };
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
  // The saved LISTING, when there is one. Used only to refuse a pin it contradicts — see the
  // guard in backfill(). Optional by design: a fresh clone may not have it, and its absence must
  // change nothing except that the guard cannot fire.
  let listingByName = null;
  try {
    const listing = JSON.parse(readFileSync(`${RAW}/figma-components.json`, 'utf8'));
    listingByName = new Map();
    for (const c of listing) {
      const n = key(c.name); const id = key(c.nodeId || c.id);
      if (!n || !id) continue;
      if (!listingByName.has(n)) listingByName.set(n, new Set());
      listingByName.get(n).add(id);
    }
  } catch { listingByName = null; }
  console.log(listingByName
    ? `${listingByName.size} name(s) in the saved listing, used to refuse a stale pin`
    : 'no saved listing — a pin the listing would contradict cannot be caught');

  const dupes = [...byName].filter(([, ids]) => ids.length > 1);
  console.log(`${byName.size} name(s) available from components.json`);
  console.log(`${dupes.length} of them are published more than once and can fill NOTHING:`);
  for (const [n, ids] of dupes.sort()) {
    console.log(`    "${n}" -> ${ids.map((i) => `${i} (${pageOf.get(i) || '?'})`).join(', ')}`);
  }
  console.log('');

  for (const { file, nameCol, prefer, rowPageCol } of FILES) {
    const path = `${RAW}/${file}`;
    const r = backfill(readFileSync(path, 'utf8'), nameCol, byName,
      { prefer, pageOf, rowPageCol, listingByName });
    const total = r.filled + r.missing.length;
    console.log(`${file}`);
    console.log(`  ${r.filled} row-name(s) matched exactly one inventory id, `
      + `${r.missing.length} matched none, ${r.ambiguous.length} matched more than one`);
    for (const m of r.missing) console.log(`    no id     "${m}"`);
    for (const a of r.ambiguous) console.log(`    AMBIGUOUS "${a}" — left empty, resolve by hand`);
    for (const n of r.narrowed) console.log(`    by page   ${n}`);
    for (const c of r.contradicted) console.log(`    STALE     ${c}`);
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
  // This file counted failures inline and had no helper. The page-narrowing cases below were
  // written with one, passed, and were pure decoration: miss() did not exist, so the first
  // assertion to actually fail would have thrown a ReferenceError instead of reporting. Four
  // mutants surfaced it at once by all dying the same way. A self-test that can only crash is
  // not a self-test.
  const miss = (m) => { failures++; console.log(`  MISS ${m}`); };
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

  // PAGE NARROWING. The one permitted way out of an ambiguity, and it has to be exactly that —
  // one way out, not a general licence to pick a candidate.
  {
    const pages = new Map([['ic', 'Icons'], ['comp', 'Cards and panels'], ['ic2', 'Icons']]);
    const onlyOneOnPage = new Map([['Org chart', ['comp', 'ic']]]);
    const r1 = backfill('figmaName\tfile\nOrg chart\torg-chart\n', 'figmaName', onlyOneOnPage,
      { prefer: (pg) => pg === 'Icons', pageOf: pages });
    if (r1.filled !== 1 || !r1.text.includes('\tic')) {
      miss('a name published once on the preferred page and once elsewhere is NOT ambiguous — '
        + 'the other candidate cannot be what an all-icons file means');
    }
    if (r1.ambiguous.length) miss('a narrowed name must not also be reported ambiguous');
    if (!r1.narrowed.length) miss('a narrowing must be REPORTED — it is a judgement, not a lookup');

    // Two candidates BOTH on the icon page. The filter changes nothing and the refusal stands.
    const bothOnPage = new Map([['GIF', ['ic', 'ic2']]]);
    const r2 = backfill('figmaName\tfile\nGIF\tgif\n', 'figmaName', bothOnPage,
      { prefer: (pg) => pg === 'Icons', pageOf: pages });
    if (r2.filled !== 0 || !r2.ambiguous.includes('GIF')) {
      miss('when the page does not narrow to exactly one, the ambiguity refusal must stand — '
        + 'GIF and Transfer are each published twice ON the icon page and must stay empty');
    }

    // None on the preferred page: nothing to narrow to, so it stays ambiguous.
    const noneOnPage = new Map([['Elsewhere', ['comp', 'comp']]]);
    const r3 = backfill('figmaName\tfile\nElsewhere\tx\n', 'figmaName', noneOnPage,
      { prefer: (pg) => pg === 'Icons', pageOf: pages });
    if (r3.filled !== 0) miss('a filter matching NOTHING must not resolve the ambiguity either');

    // And without a prefer the old behaviour is untouched.
    const r4 = backfill('figmaName\tfile\nOrg chart\torg-chart\n', 'figmaName', onlyOneOnPage);
    if (r4.filled !== 0 || !r4.ambiguous.includes('Org chart')) {
      miss('a file with no prefer must still refuse an ambiguous name outright');
    }
  }

  // THE ROW'S OWN PAGE. The same narrowing with better evidence: component-variants.tsv records
  // the page each component was captured from, so only the candidate on THIS row's page can be
  // what the row means. Five of the six ambiguities in the real file fall to it.
  {
    const pages = new Map([['ic', 'Icons'], ['chart', 'Analytics and charts'],
      ['f1', 'Forms'], ['f2', 'Forms'], ['nopage', '']]);
    const by = new Map([['Bar chart', ['chart', 'ic']], ['Field', ['f1', 'f2']],
      ['Ghost', ['nopage', 'ic']]]);
    const opt = { pageOf: pages, rowPageCol: 'page' };

    const r5 = backfill('page\tcomponent\nAnalytics and charts\tBar chart\n', 'component', by, opt);
    if (r5.filled !== 1 || !r5.text.includes('\tchart')) {
      miss("the row's own page must resolve a name published on two pages — it is evidence in the "
        + 'row, not a guess about the file');
    }
    if (r5.ambiguous.length) miss('a row-page narrowing must not also report the name ambiguous');
    if (!r5.narrowed.length) miss('a row-page narrowing must be REPORTED like any other');

    // Both candidates on the row's page: nothing is narrowed and the refusal stands. This is the
    // real `Field`, whose two components are both on `Forms`.
    const r6 = backfill('page\tcomponent\nForms\tField\n', 'component', by, opt);
    if (r6.filled !== 0 || !r6.ambiguous.includes('Field')) {
      miss('two candidates on the ROW\'s own page narrow to nothing, so the refusal must stand');
    }

    // A row whose page matches NEITHER candidate must not be resolved. Picking the survivor of a
    // filter that matched nothing is exactly the coin toss this rule exists to refuse.
    const r7 = backfill('page\tcomponent\nTables\tBar chart\n', 'component', by, opt);
    if (r7.filled !== 0 || !r7.ambiguous.includes('Bar chart')) {
      miss('a row page matching no candidate must leave the ambiguity standing');
    }

    // A row with an EMPTY page cell carries no evidence, so it narrows nothing. The candidate
    // here is one the INVENTORY records no page for, which is the only way this can go wrong:
    // comparing the two blanks for equality matches unknown to unknown and calls it a fact.
    const r8 = backfill('page\tcomponent\n\tGhost\n', 'component', by, opt);
    if (r8.filled !== 0 || !r8.ambiguous.includes('Ghost')) {
      miss('a blank page cell is not evidence — an unknown row page must not be matched against '
        + 'a candidate whose page is equally unknown');
    }

    // Without the option, the old behaviour is untouched — the same row stays ambiguous.
    const r9 = backfill('page\tcomponent\nAnalytics and charts\tBar chart\n', 'component', by,
      { pageOf: pages });
    if (r9.filled !== 0 || !r9.ambiguous.includes('Bar chart')) {
      miss('without rowPageCol the ambiguity refusal must be exactly as it was');
    }

    // A file declaring a page column it does not have is a wiring mistake, not a silent no-op.
    let threw = false;
    try { backfill('component\nBar chart\n', 'component', by, opt); } catch { threw = true; }
    if (!threw) miss('a missing rowPageCol column must throw rather than silently not narrowing');
  }

  // THE STALE PIN. components.json is an inventory that can lag the saved listing, so a name whose
  // component was rebuilt in Figma resolves to the id it USED to have. `Header` is the real case.
  {
    const by2 = new Map([['Header', ['old']], ['Tags', ['t1']], ['Offpage', ['p1']]]);
    const listing = new Map([
      ['Header', new Set(['new1', 'new2'])],   // rebuilt: the old id is not published any more
      ['Tags', new Set(['t1'])],               // agrees
    ]);                                        // `Offpage` is absent from the listing entirely

    const r10 = backfill('component\nHeader\n', 'component', by2, { listingByName: listing });
    if (r10.filled !== 0 || r10.text.includes('old')) {
      miss('an id the listing does not publish under that name is STALE and must not be written — '
        + 'a stale id is indistinguishable from a live one to every later reader');
    }
    if (!r10.contradicted.length) {
      miss('a refused stale pin must be REPORTED, naming what the listing has instead');
    }

    // ABSENCE IS NOT CONTRADICTION. A name the listing never mentions may simply sit on a page the
    // listing does not cover. Refusing on that is the "not in this listing means not in Figma"
    // error this repo has already made once, and it would empty ids that are perfectly good.
    const r11 = backfill('component\nOffpage\n', 'component', by2, { listingByName: listing });
    if (r11.filled !== 1 || r11.contradicted.length) {
      miss('a name the listing does not mention at all must still be filled — absence proves '
        + 'nothing, and only a contradiction is evidence');
    }

    // An id both files agree on is untouched.
    const r12 = backfill('component\nTags\n', 'component', by2, { listingByName: listing });
    if (r12.filled !== 1 || !r12.text.includes('t1')) miss('an agreed id must still be written');

    // No listing on disk: the guard cannot fire, and nothing else changes.
    const r13 = backfill('component\nHeader\n', 'component', by2);
    if (r13.filled !== 1 || r13.contradicted.length) {
      miss('with no listing the guard must be inert rather than refusing everything');
    }
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
