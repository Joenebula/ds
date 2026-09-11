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
// ICONS ARE COUNTED SEPARATELY, AND THAT IS THE DIFFERENCE BETWEEN A GATE AND NOISE. Icons are
// published Figma components, but they are captured by extract-icons.mjs into icons.tsv and
// assets/icons/ rather than as component classes. This check compared Figma against the COMPONENT
// extract alone, so it reported the entire icon set as uncaptured: 286 NEW, of which 281 were
// already captured and 5 were real. A verdict line that is 98% false alarm is not a gate — it is
// a number people learn to read past, which is exactly what happened, repeatedly, including by me.
//
// So an icon is now judged against icons.tsv, case-insensitively (Figma's "Calendar link" is
// "calendar link" in the extract), and reported in its own column. It still FAILS when it is
// genuinely uncaptured: the rule has not been relaxed, only made able to tell the two kinds apart.
//
// ICONS NOW HAVE IDS, SO A RENAME REPORTS AS A RENAME. icons.tsv gained a nodeId column,
// backfilled from components.json with no Figma call — 283 of its 293 rows are pinned. So the
// icon side gets the same id-first matching components have had since 6218a8d: the same glyph
// under a new name is ONE line saying so.
//
// Before that, this check could only say "5 new, 8 gone" and ask a person to pair the lists by
// eye, and almost none of it was an addition or a removal:
//
//   addres book          -> Address book        a typo fixed in Figma      (corrected)
//   Calendarcross        -> Calendar cross      spacing fixed in Figma     (corrected)
//   calendar link        -> Calendar link       case only                  (corrected)
//   Taxes coins          -> Coins + Tax         split into two
//   Size=L/M/S/XS - ..px -> Circle icons        NOT a Figma change at all: extract-icons.mjs
//                                               captured one component set's four VARIANTS as
//                                               four separate icons
//   unnamed-813678321    -> nothing             an unnamed node captured as an icon
//
// THE 10 ROWS STILL WITHOUT AN ID ARE EXACTLY THE UNRESOLVED ONES, and that is not a coincidence:
// a row the inventory cannot match by name is a row whose name is wrong, which is the same thing
// that makes it unpairable. They are counted in the verdict line, because a rename among THEM is
// still invisible and saying so is the only honest option.
//
// NEW FAILS RATHER THAN AUTO-CAPTURING. A component appearing in Figma might be real, might be
// half-finished, might be an experiment somebody left on a page. Pulling it in automatically
// would let an unfinished idea become part of the published library without anyone deciding.
// So it stops the run and names itself, and a person classifies it.
import { readFileSync, existsSync } from 'node:fs';
import { isExcludedPage, isIconPage } from './check-catalogue-drift.mjs';

const RAW = 'tokens/_raw';
const key = (n) => String(n || '').trim();

const tsv = (file) => {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).slice(1)
    .map((l) => l.split('\t').map((c) => c.trim()));
};

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function judge({ figma, captured, declared, inventory, icons = [] }) {
  const all = figma.filter((c) => key(c.name));

  // Partition BEFORE anything else. A doc page is not the design system at all; an icon page is
  // the design system but captured in a different file. Folding either into the component
  // comparison is what made this check unreadable.
  const declaredSet = new Set(declared.map(key));
  // icons.tsv now carries a nodeId, so icons get the SAME id-first treatment components have had
  // since 6218a8d: a rename is one line saying so, not a gone plus a new for a person to pair up
  // by eye. Rows are accepted as {name, nodeId} or as a bare name, because 11 still have no id —
  // those fall back to matching by name and cannot see a rename, exactly as an id-less component
  // row cannot.
  const iconRows = icons.map((i) => (typeof i === 'string'
    ? { name: key(i), nodeId: '' }
    : { name: key(i && i.name), nodeId: key(i && i.nodeId) })).filter((i) => i.name);

  const figIcons = all.filter((c) => isIconPage(c.page));
  const figIconById = new Map(figIcons.filter((c) => key(c.nodeId)).map((c) => [key(c.nodeId), c]));
  const figIconByName = new Map(figIcons.map((c) => [key(c.name).toLowerCase(), c]));

  const renamedIcons = []; const goneIcons = [];
  const matchedIds = new Set(); const matchedNames = new Set();
  let blindIcons = 0;
  for (const row of iconRows) {
    if (row.nodeId && figIconById.has(row.nodeId)) {
      const f = figIconById.get(row.nodeId);
      // Only the id is recorded. Marking the name too would be dead code: newIcons already
      // excludes anything whose id matched, so the name could never change the outcome — and a
      // line that cannot be proved by a mutant does not belong in a file like this one.
      matchedIds.add(row.nodeId);
      if (key(f.name).toLowerCase() !== row.name.toLowerCase()) {
        renamedIcons.push({ from: row.name, to: key(f.name), nodeId: row.nodeId });
      }
      continue;
    }
    if (!row.nodeId) blindIcons++;          // no identity: a rename here still looks like a deletion
    const byName = figIconByName.get(row.name.toLowerCase());
    if (byName) {
      matchedNames.add(row.name.toLowerCase()); matchedIds.add(key(byName.nodeId));
      continue;
    }
    // Neither its id nor its name is published any more. Shipped artwork with no source — the
    // icon equivalent of a GONE component, and it fails for the same reason.
    if (!declaredSet.has(row.name)) goneIcons.push(row.name);
  }
  const newIcons = figIcons
    .filter((c) => !matchedIds.has(key(c.nodeId)) && !matchedNames.has(key(c.name).toLowerCase()))
    .filter((c) => !declaredSet.has(key(c.name)))
    .map((c) => key(c.name))
    .sort();
  goneIcons.sort();

  const fig = all.filter((c) => !isExcludedPage(c.page));
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
    newIcons, goneIcons, blindIcons,
    renamedIcons: renamedIcons.sort((a, b) => a.from.localeCompare(b.from)),
    capturedIcons: figIcons.length - newIcons.length,
    unidentified: [...new Set(unidentified)].sort(),
    inventoryBehind,
    figma: fig.length, published: all.length, captured: captured.length,
    // An uncaptured icon fails exactly as an uncaptured component does. Separating the two was
    // about making them VISIBLE, never about letting one through.
    // A rename is NOT a problem — it is the answer to one. Counting it would keep the gate red
    // for something already understood.
    problems: isNew.length + gone.length + newIcons.length + goneIcons.length,
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
    .map((c) => ({
      name: c.name,
      nodeId: c.nodeId || c.id || c.node_id || '',
      page: c.pageName || c.page || '',
    }));
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
  // icons.tsv is  index \t figmaName \t file \t svg \t nodeId  — header-keyed so the id column
  // is found wherever it sits, the same way the component extract is read above.
  const ih = readFileSync(`${RAW}/icons.tsv`, 'utf8').split('\n')[0].split('\t');
  const iName = ih.indexOf('figmaName'); const iId = ih.indexOf('nodeId');
  const icons = tsv(`${RAW}/icons.tsv`)
    .map((r) => ({ name: r[iName], nodeId: iId === -1 ? '' : (r[iId] || '') }))
    .filter((i) => i.name);
  const inventory = JSON.parse(readFileSync(`${RAW}/components.json`, 'utf8')).map((c) => c.name);

  const r = judge({ figma, captured, declared, inventory, icons });

  for (const m of r.renamed) {
    console.log(`RENAMED  "${m.from}" is now called "${m.to}" in Figma (${m.nodeId}) — same `
      + 'component, new name; update the extracts rather than capturing it twice');
  }
  for (const n of r.isNew) console.log(`NEW      "${n}" is in Figma, has no rules, and no declared reason`);
  for (const n of r.gone) console.log(`GONE     "${n}" has a .pf-* class and is no longer published by Figma`);
  for (const m of r.renamedIcons) {
    console.log(`RENAMED ICON "${m.from}" is now called "${m.to}" in Figma (${m.nodeId}) — same `
      + 'glyph, new name; correct icons.tsv rather than importing it as new');
  }
  for (const n of r.newIcons) {
    console.log(`NEW ICON  "${n}" is on the Figma icon page and is not in icons.tsv`);
  }
  for (const n of r.goneIcons) {
    console.log(`GONE ICON "${n}" is in icons.tsv and Figma's icon page does not publish it`);
  }
  if (r.newIcons.length && r.goneIcons.length && r.blindIcons) {
    console.log('');
    console.log(`  READ THOSE TWO LISTS TOGETHER. ${r.blindIcons} icon row(s) still carry no`);
    console.log('  nodeId, and a rename among those is indistinguishable from a deletion plus an');
    console.log('  addition — so these two lists cannot be paired automatically. A row the');
    console.log('  inventory could not match by name is a row whose NAME is wrong, which is the');
    console.log('  same thing that makes it unpairable, so expect these to be the same rows.');
  }
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
  console.log(`\n${r.published} published in Figma — ${r.figma} component(s) and `
    + `${r.capturedIcons + r.newIcons.length} icon(s); the rest are documentation pages`);
  console.log(`components: ${r.captured} captured — ${r.same} unchanged, ${r.renamed.length} `
    + `renamed, ${r.isNew.length} new, ${r.gone.length} gone`
    + (r.unidentified.length ? `, ${r.unidentified.length} with no id` : ''));
  console.log(`icons     : ${r.capturedIcons} captured, ${r.renamedIcons.length} renamed, `
    + `${r.newIcons.length} new, ${r.goneIcons.length} gone`
    + (r.blindIcons ? `, ${r.blindIcons} with no id (a rename of one is invisible)` : ''));
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

    // ---- icons -------------------------------------------------------------------------
    // The case this whole change exists for. Before it, every one of the 293 captured icons
    // read as a NEW component, and the 5 that mattered were buried in 286 lines.
    ['a captured ICON is not a new component', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Tick', nodeId: '8:8', page: 'Icons' }], icons: ['Tick'] }),
      (r) => r.problems === 0 && r.isNew.length === 0 && r.newIcons.length === 0
        && r.capturedIcons === 1],

    ['...and the icon page is kept OUT of the component tally', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Tick', nodeId: '8:8', page: 'Icons' }], icons: ['Tick'] }),
      (r) => r.figma === 1],

    // Excluding the icon page without comparing it would trade 281 false alarms for 5 silent
    // misses, which is the same failure wearing the opposite coat.
    ['an UNCAPTURED icon still FAILS — excluding is not the same as ignoring', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Coins', nodeId: '9:9', page: 'Icons' }], icons: [] }),
      (r) => r.newIcons.length === 1 && r.newIcons[0] === 'Coins'
        && r.goneIcons.length === 0 && r.problems === 1],

    // Figma's "Calendar link" is "calendar link" in the extract. Matching case-sensitively
    // reported a captured icon as new, and briefly made this session's count 6 instead of 5.
    ['icon names match case-INSENSITIVELY', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Calendar link', nodeId: '9:9', page: 'Icons' }], icons: ['calendar link'] }),
      (r) => r.newIcons.length === 0 && r.problems === 0],

    ['a captured icon Figma no longer publishes is GONE, not silence', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' }], icons: ['Retired glyph'] }),
      (r) => r.goneIcons.length === 1 && r.goneIcons[0] === 'Retired glyph' && r.problems === 1],

    // ---- icons matched BY ID ---------------------------------------------------------------
    // The whole point of giving icons.tsv a nodeId. Without this, a typo corrected in Figma
    // reported as one gone plus one new and a person had to pair them by eye.
    ['an ICON RENAME is ONE line, not a delete plus an add', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Address book', nodeId: '20044:38994', page: 'Icons' }],
        icons: [{ name: 'addres book', nodeId: '20044:38994' }] }),
      (r) => r.renamedIcons.length === 1 && r.renamedIcons[0].from === 'addres book'
        && r.renamedIcons[0].to === 'Address book'
        && r.newIcons.length === 0 && r.goneIcons.length === 0],

    ['an icon matched by id is not also reported new or gone', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Tick', nodeId: '8:8', page: 'Icons' }],
        icons: [{ name: 'Tick', nodeId: '8:8' }] }),
      (r) => r.problems === 0 && r.newIcons.length === 0 && r.goneIcons.length === 0
        && r.renamedIcons.length === 0 && r.blindIcons === 0],

    // A row with no id cannot see a rename. That is the cost of the 10 unpinned rows, and it is
    // counted rather than hidden.
    ['an icon row with NO id falls back to the name and is counted as blind', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Tick', nodeId: '8:8', page: 'Icons' }], icons: ['Tick'] }),
      (r) => r.problems === 0 && r.blindIcons === 1 && r.renamedIcons.length === 0],

    ['...and a RENAME of an id-less icon is invisible — one gone, one new, honestly counted', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Address book', nodeId: '20044:38994', page: 'Icons' }],
        icons: ['addres book'] }),
      (r) => r.renamedIcons.length === 0 && r.newIcons.length === 1 && r.goneIcons.length === 1
        && r.blindIcons === 1],

    // An id Figma no longer publishes must not silently pass by falling through to the name.
    ['an icon whose id AND name are both gone is GONE', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' }],
        icons: [{ name: 'Retired', nodeId: '5:5' }] }),
      (r) => r.goneIcons.length === 1 && r.goneIcons[0] === 'Retired' && r.problems === 1],

    ['a declared icon passes, like a declared component', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Coins', nodeId: '9:9', page: 'Icons' }], icons: [], declared: ['Coins'] }),
      (r) => r.newIcons.length === 0 && r.problems === 0],

    // A documentation page is not the design system and never was — no new, no gone, no noise.
    ['a documentation page is excluded entirely', () =>
      run({ figma: [{ name: 'Button', nodeId: '1:2' },
        { name: 'Dos and donts', nodeId: '4:4', page: '\u{1F4DA} WIKI' }] }),
      (r) => r.problems === 0 && r.isNew.length === 0 && r.newIcons.length === 0],

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
    + 'counted as blind; a new component, a removal and an empty listing all still fail; and a '
    + 'captured ICON is no longer mistaken for a new component while an uncaptured one still '
    + 'fails, matched case-insensitively, with the gone side reported beside it');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
