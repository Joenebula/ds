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
//   GONE      captured here, NOT IN THIS LISTING                            -> FAILS until confirmed
//   SAME      matched                                                       -> the boring case
//
// AND "GONE" USED TO CLAIM MORE THAN THE EVIDENCE SUPPORTS. It said "is no longer published by
// Figma". What the listing proves is only "is not in this listing", and on 2026-09-11 the two
// components carrying that verdict turned out to be opposite cases:
//
//   Side navigation panel  22973:20811  get_metadata: "node ID was not found in the file"
//                                       -> really deleted, and .pf-side-navigation-panel still ships
//   Counter                14990:11954  get_metadata resolves it (a 20x20 "System=People First"
//                                       badge holding a "7"), and search_design_system returns
//                                       Counter as a published component of this library, updated
//                                       2026-06-04 -> NOT gone. The listing is incomplete.
//
// One verdict line, two opposite truths — this repo's recurring failure, sitting inside a gate.
// Both facts came from Figma reads, so the fix is not to guess better but to record what was read:
// tokens/_raw/gone-components.tsv carries name, nodeId, verdict, date and the evidence.
//
//   verdict=deleted    confirmed removed. Still a problem — a class ships for something that does
//                      not exist — unless the evidence begins `pending:`, the repo's existing
//                      visible-debt marker, in which case it passes and is COUNTED AND NAMED.
//   verdict=published  confirmed false alarm. Dropped from GONE and counted in its own column,
//                      because a false alarm left in a verdict line is how 286 NEW happened.
//   no row             UNCONFIRMED. Stays in GONE and fails, and the message says what the
//                      listing can and cannot prove, with the one read that settles it.
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
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
// What a Figma read established about a component this listing does not contain. Header-keyed, so
// a column added later cannot shift the meaning of the others. A MISSING FILE IS AN EMPTY MAP, not
// a throw: every GONE row then reports as unconfirmed, which is exactly right — nobody has looked.
export function readConfirmations(file) {
  const out = new Map();
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return out; }
  const lines = text.replace(/\n+$/, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return out;
  const header = lines[0].split('\t').map((h) => h.trim());
  const at = (c) => header.indexOf(c);
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    const g = (n) => (at(n) === -1 ? '' : (cells[at(n)] || '').trim());
    const name = g('name');
    if (!name) continue;
    // An unrecognised verdict is NOT quietly treated as one of the two. It stays unconfirmed and
    // keeps failing, because a typo that silently excuses a component is the failure this whole
    // file exists to stop.
    const verdict = g('verdict').toLowerCase();
    if (verdict !== 'deleted' && verdict !== 'published' && verdict !== 'retired') continue;
    out.set(name, { nodeId: g('nodeId'), verdict, checked: g('checked'), evidence: g('evidence') });
  }
  return out;
}

export function judge({ figma, captured, declared, inventory, icons = [], confirmed = new Map() }) {
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

  // A GONE row that a Figma read has ALREADY SETTLED does not belong in the same list as one
  // nobody has looked at. Three outcomes, and only the last is still a question.
  const goneConfirmed = [], goneDebt = [], goneUnconfirmed = [], stillPublished = [];
  const retiredButPresent = [];
  for (const n of gone.sort()) {
    const c = confirmed.get(n);
    // The verdict must be one of the two, HERE and not only in the reader. A caller that builds
    // this map itself would otherwise have anything-but-"published" silently mean "deleted" —
    // a typo excusing a component is the exact failure this file exists to stop, and the reader
    // being careful does not make judge() careful.
    if (!c || (c.verdict !== 'published' && c.verdict !== 'deleted' && c.verdict !== 'retired')) {
      goneUnconfirmed.push(n); continue;
    }
    // `retired` says "gone from Figma AND dropped from this repo". Reaching here means the second
    // half is false — the component is still captured, so it is still reported gone. That is a
    // contradiction between the record and the extracts, and it gets its own line rather than
    // being filed under a verdict that would read as settled.
    if (c.verdict === 'retired') { retiredButPresent.push({ name: n, ...c }); continue; }
    if (c.verdict === 'published') { stillPublished.push({ name: n, ...c }); continue; }
    // `pending:` is this repo's visible-debt marker: recorded, waiting on a person, passes and is
    // counted and named every run. Anything else is a confirmed deletion nobody has decided about.
    if (/^pending:/i.test(c.evidence || '')) goneDebt.push({ name: n, ...c });
    else goneConfirmed.push({ name: n, ...c });
  }

  // A confirmation for a component this run does NOT report gone is folklore — the same rule
  // check-token-drift.mjs applies to a declared token nothing binds.
  // A `retired` row is the one confirmation that SHOULD outlive the component. It records that
  // Figma deleted it, that a person decided to drop the class, and when — so it is history
  // rather than folklore, and the stale rule must not force it to be deleted to keep the gate
  // green. That would erase exactly what it exists to hold. Counted and named every run.
  const retired = [...confirmed.entries()]
    .filter(([, c]) => c.verdict === 'retired')
    .map(([name, c]) => ({ name, ...c }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const staleConfirmations = [...confirmed.keys()]
    .filter((n) => !gone.includes(n) && !retired.some((r) => r.name === n)).sort();

  return {
    renamed: renamed.sort((a, b) => a.from.localeCompare(b.from)),
    isNew, gone: gone.sort(), same,
    goneConfirmed, goneDebt, goneUnconfirmed, stillPublished, staleConfirmations, retired,
    retiredButPresent,
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
    // A GONE confirmed still PUBLISHED is not a problem, it is a false alarm answered — leaving
    // it red is how a verdict line becomes a number people read past. A confirmed DELETION is
    // still a problem until somebody decides what to do about the class; a `pending:` one has
    // been decided and is debt. And a confirmation nothing reports gone any more is stale.
    problems: isNew.length + goneUnconfirmed.length + goneConfirmed.length
      + staleConfirmations.length + retiredButPresent.length + newIcons.length + goneIcons.length,
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
  const confirmed = readConfirmations(`${RAW}/gone-components.tsv`);

  const r = judge({ figma, captured, declared, inventory, icons, confirmed });

  for (const m of r.renamed) {
    console.log(`RENAMED  "${m.from}" is now called "${m.to}" in Figma (${m.nodeId}) — same `
      + 'component, new name; update the extracts rather than capturing it twice');
  }
  for (const n of r.isNew) console.log(`NEW      "${n}" is in Figma, has no rules, and no declared reason`);
  for (const n of r.goneUnconfirmed) {
    console.log(`GONE     "${n}" has a .pf-* class and is NOT IN THIS LISTING — which is not the `
      + 'same as not in Figma. get_metadata on its nodeId settles it in one read: an id that does '
      + 'not resolve is a deletion, an id that resolves means the listing is incomplete. Record '
      + 'the answer in tokens/_raw/gone-components.tsv.');
  }
  for (const c of r.goneConfirmed) {
    console.log(`GONE     "${c.name}" is CONFIRMED deleted (${c.checked}) and a .pf-* class still `
      + 'ships a rule for it — retire the class, or say why it stays with a `pending:` reason');
  }
  // Counted and named every run, never tidied away: the whole value of a confirmation is that
  // somebody can see what was confirmed and when.
  for (const c of r.goneDebt) {
    console.log(`pending  "${c.name}" confirmed deleted (${c.checked}) — ${c.evidence}`);
  }
  for (const c of r.stillPublished) {
    console.log(`not gone "${c.name}" is absent from this listing but CONFIRMED still published `
      + `(${c.checked}) — ${c.evidence}`);
  }
  for (const n of r.staleConfirmations) {
    console.log(`stale    "${n}" has a row in gone-components.tsv and this listing is not reporting `
      + 'it gone — a confirmation kept for something settled is folklore');
  }
  // Named every run, because the whole point of a retired record is that somebody can still see
  // what was dropped and when. Deleting it to tidy the output would erase the decision itself.
  for (const c of r.retired) {
    console.log(`retired  "${c.name}" was confirmed gone from Figma and its class was removed from `
      + `this repo (${c.checked}) — ${c.evidence}`);
  }
  for (const c of r.retiredButPresent) {
    console.log(`CONFLICT "${c.name}" is marked retired in gone-components.tsv — gone from Figma `
      + 'AND dropped from here — but it is still captured in the extracts, so only the first half '
      + 'is true. Remove its rows, or change the verdict back to "deleted".');
  }
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
    + `renamed, ${r.isNew.length} new, ${r.gone.length} not in this listing `
    + `(${r.goneUnconfirmed.length} unconfirmed, ${r.goneConfirmed.length} confirmed deleted, `
    + `${r.goneDebt.length} pending, ${r.stillPublished.length} confirmed still published)`
    + (r.retired.length ? `, ${r.retired.length} retired (gone from Figma and dropped here)` : '')
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

    // THE CLAIM MUST MATCH THE EVIDENCE. A GONE nobody has checked is UNCONFIRMED — the listing
    // proves absence from itself, not absence from Figma — and it fails until somebody reads.
    ['a GONE nobody has read is UNCONFIRMED, not declared deleted', () =>
      run({ figma: [] }),
      (r) => r.goneUnconfirmed.length === 1 && r.goneConfirmed.length === 0
        && r.stillPublished.length === 0 && r.problems === 1],

    // Counter, verbatim: absent from the listing, resolves in Figma, published today. Leaving it
    // red is how a verdict line becomes a number people read past — 286 NEW, all over again.
    ['a GONE confirmed STILL PUBLISHED is a false alarm answered, and stops failing', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Button',
        { verdict: 'published', checked: '2026-09-11', evidence: 'get_metadata resolves it' }]]) }),
      (r) => r.stillPublished.length === 1 && r.goneUnconfirmed.length === 0 && r.problems === 0],

    // ...and it is still NAMED. A confirmation nobody can see is the same as no confirmation.
    ['a confirmed-still-published component is reported, never silently dropped', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Button',
        { verdict: 'published', checked: '2026-09-11', evidence: 'resolves' }]]) }),
      (r) => r.stillPublished[0] && r.stillPublished[0].name === 'Button'
        && r.stillPublished[0].evidence === 'resolves'],

    // Side navigation panel: confirmed deleted. A class still ships for it, so it is a problem
    // until somebody decides — a confirmation is not an excuse.
    ['a GONE confirmed DELETED still fails — confirming a deletion is not deciding about it', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Button',
        { verdict: 'deleted', checked: '2026-09-11', evidence: 'node not found' }]]) }),
      (r) => r.goneConfirmed.length === 1 && r.problems === 1],

    // ...unless the decision has been recorded, which is this repo's existing `pending:` marker.
    ['a `pending:` deletion passes and is COUNTED, the visible-debt pattern', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Button',
        { verdict: 'deleted', checked: '2026-09-11', evidence: 'pending: retire the class in the next pass' }]]) }),
      (r) => r.goneDebt.length === 1 && r.goneConfirmed.length === 0 && r.problems === 0],

    // A typo in the verdict column must not silently excuse anything.
    ['an unrecognised verdict excuses nothing', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Button',
        { verdict: 'probably fine', checked: '2026-09-11', evidence: 'x' }]]) }),
      (r) => r.goneUnconfirmed.length === 1 && r.problems === 1],

    // RETIRED — the one confirmation that outlives its component. Once the class is dropped the
    // component is no longer captured, so nothing reports it gone, and the plain stale rule would
    // force the record to be deleted to keep the gate green — erasing the decision it holds.
    ['a retired record survives its own component and does not fail', () =>
      judge({ ...base, confirmed: new Map([['Long gone',
        { verdict: 'retired', checked: '2026-09-11', evidence: 'node not found; class removed' }]]) }),
      (r) => r.retired.length === 1 && r.staleConfirmations.length === 0 && r.problems === 0],

    ['a retired record is NAMED, not just counted', () =>
      judge({ ...base, confirmed: new Map([['Long gone',
        { verdict: 'retired', checked: '2026-09-11', evidence: 'because' }]]) }),
      (r) => r.retired[0] && r.retired[0].name === 'Long gone' && r.retired[0].evidence === 'because'],

    // ...and it must not become a way to silence a genuine stale row.
    ['retired excuses only the row that carries it', () =>
      judge({ ...base, confirmed: new Map([
        ['Long gone', { verdict: 'retired', checked: '2026-09-11', evidence: 'x' }],
        ['Folklore', { verdict: 'deleted', checked: '2026-09-01', evidence: 'x' }]]) }),
      (r) => r.staleConfirmations.length === 1 && r.staleConfirmations[0] === 'Folklore'
        && r.problems === 1],

    // A component still reported gone that carries `retired` is a contradiction the gate should
    // not paper over: it is still in the extracts, so it is not retired at all.
    // `retired` claims two things: gone from Figma AND dropped from here. A component still in the
    // extracts makes the second half false, so the row contradicts the repo and gets its own line
    // rather than being filed under a verdict that reads as settled.
    ['a retired verdict on a component still captured is a CONTRADICTION, named as one', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Button',
        { verdict: 'retired', checked: '2026-09-11', evidence: 'x' }]]) }),
      (r) => r.retiredButPresent.length === 1 && r.retiredButPresent[0].name === 'Button'
        && r.goneUnconfirmed.length === 0 && r.goneConfirmed.length === 0 && r.problems === 1],

    ['the reader accepts retired as a verdict', () => {
      const f = join(tmpdir(), `pf-conf3-${process.pid}.tsv`);
      writeFileSync(f, 'name\tnodeId\tverdict\tchecked\tevidence\nX\t1:2\tretired\t2026-09-11\tgone\n');
      const m = readConfirmations(f); unlinkSync(f); return m;
    }, (m) => m.get('X') && m.get('X').verdict === 'retired'],

    // A confirmation only excuses the component it names.
    ['a confirmation for one component does not excuse another', () =>
      judge({ ...base, figma: [], confirmed: new Map([['Something else',
        { verdict: 'published', checked: '2026-09-11', evidence: 'x' }]]) }),
      (r) => r.goneUnconfirmed.length === 1 && r.problems >= 1],

    // And a confirmation for something no longer reported gone is folklore — the same rule
    // check-token-drift.mjs applies to a declared token nothing binds.
    ['a confirmation nothing reports gone is STALE', () =>
      judge({ ...base, confirmed: new Map([['Gone last month',
        { verdict: 'deleted', checked: '2026-09-01', evidence: 'x' }]]) }),
      (r) => r.staleConfirmations.length === 1 && r.problems === 1],

    // The file itself: header-keyed, and a missing one means nobody has looked rather than a crash.
    ['a missing confirmations file is an empty map, not a throw', () =>
      readConfirmations('does/not/exist.tsv'), (m) => m.size === 0],
    // Read by HEADER, so a column added or moved later cannot change what the others mean. The
    // columns here are deliberately in a different order from the shipped file's.
    ['a confirmation row is read by HEADER, not by position', () => {
      const f = join(tmpdir(), `pf-conf-${process.pid}.tsv`);
      writeFileSync(f, 'verdict\tevidence\tname\tchecked\tnodeId\n'
        + 'published\tresolves in Figma\tButton\t2026-09-11\t1:2\n');
      const m = readConfirmations(f); unlinkSync(f); return m;
    }, (m) => m.get('Button') && m.get('Button').verdict === 'published'
      && m.get('Button').nodeId === '1:2' && m.get('Button').evidence === 'resolves in Figma'],

    // A verdict the file does not define is not one of the two by default.
    ['an unrecognised verdict in the FILE is not read at all', () => {
      const f = join(tmpdir(), `pf-conf2-${process.pid}.tsv`);
      writeFileSync(f, 'name\tnodeId\tverdict\tchecked\tevidence\nButton\t1:2\tmaybe\t2026-09-11\tx\n');
      const m = readConfirmations(f); unlinkSync(f); return m;
    }, (m) => m.size === 0],

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
    + 'fails, matched case-insensitively, with the gone side reported beside it; and a GONE '
    + 'states only what the listing proves — unconfirmed until a Figma read settles it, a '
    + 'confirmed-still-published one stops failing but is still named, a confirmed deletion keeps '
    + 'failing until a `pending:` reason records the decision, an unrecognised verdict excuses '
    + 'nothing in the reader OR in judge(), and a confirmation nothing reports gone is stale — '
    + 'except a `retired` one, which outlives its own component because it records what was '
    + 'dropped and when, is named every run, and excuses only the row that carries it');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
