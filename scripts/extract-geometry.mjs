#!/usr/bin/env node
// Pulls component GEOMETRY batches out of the session transcripts and merges them into
// tokens/_raw/component-geometry.tsv.
//
//   node scripts/extract-geometry.mjs                 report only, touch nothing
//   node scripts/extract-geometry.mjs --write         apply additions
//   node scripts/extract-geometry.mjs --write --update  apply additions AND corrections
//   node scripts/extract-geometry.mjs --self-test
//
// Same transcript-reading approach as the other extractors: the measurements are already on
// disk once the tool result lands, so retyping them into the conversation would buy nothing
// but a chance to mistype one.
//
// Each batch is one Figma page. EVERY COLUMN IS PRESENT, including empty trailing ones — a
// batch truncated mid-row is otherwise indistinguishable from a complete one (see lib/transcript.mjs):
//
//   GEOMETRY\t<page name>
//   COUNT <n>
//   <component>\t<size>\t<padding>\t<radius>\t<gap>\t<font>\t<layout>\t<nodeId>
//
// THIS SCRIPT USED TO BE UNABLE TO CORRECT ANYTHING. It read `if (known.has(component)) continue`
// and reported the skipped rows as "already measured (left alone)". So a re-extract could add a
// component but never fix one: a radius or a size that moved in Figma was dropped, and the run
// said it had succeeded. A re-read that cannot change a row is not a re-extract, it is an append.
// `--update` is that repair, and a difference is REPORTED either way — silence was the bug.
//
// THE NODE ID IS THE IDENTITY. Matching on the component name meant a Figma rename produced a
// duplicate row rather than an update. Rows are matched on nodeId first and name second.
import { readFileSync, writeFileSync } from 'node:fs';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches, parseBatch } from './lib/transcript.mjs';

const TSV = 'tokens/_raw/component-geometry.tsv';
const COLUMNS = 8;                       // the batch shape, nodeId last
const FIELDS = ['size', 'padding', 'radius', 'gap', 'font', 'layout'];

// Figma reports "0" padding and "0" radius on a plain frame, which is not a measurement worth
// carrying — it is the absence of one. Blank them so the generator does not emit `padding: 0`
// as though the designer had chosen it.
const meaningful = (v) => (v && v !== '0' ? v : '');
const key = (n) => String(n || '').trim();

export function readBatches(batches) {
  const measured = new Map();            // identity -> measurement; a later batch supersedes
  const errors = [];
  for (const b of batches) {
    const p = parseBatch(b, { headerLines: 2, columns: COLUMNS, label: 'GEOMETRY' });
    errors.push(...p.errors);
    if (p.errors.length) continue;       // never half-import a batch we know is damaged
    for (const line of p.lines) {
      const c = line.split('\t');
      const m = {
        component: key(c[0]), size: c[1] || '', padding: meaningful(c[2]),
        radius: meaningful(c[3]), gap: c[4] || '', font: c[5] || '',
        layout: c[6] || '', nodeId: key(c[7]),
      };
      if (!m.component) continue;
      measured.set(m.nodeId || m.component, m);
    }
  }
  return { measured, errors };
}

export function merge(text, measured, { update = false } = {}) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const header = lines[0].split('\t');
  const width = header.length;
  const col = (n) => { const i = header.indexOf(n); if (i === -1) throw new Error(`no "${n}" column`); return i; };
  const iName = col('component'); const iId = col('nodeId');
  const iOf = Object.fromEntries(FIELDS.map((f) => [f, col(f)]));

  // Pad to the header width so a cell always means the column it is named after. A TSV row
  // omits its trailing empty fields, and reading one by position without padding is how the
  // first node-id backfill put 72 ids in the `notes` column.
  const rows = lines.slice(1).map((raw) => {
    const cells = raw.split('\t');
    while (cells.length < width) cells.push('');
    return { raw, cells, dirty: false };
  });

  const byId = new Map(); const byName = new Map();
  for (const r of rows) {
    if (key(r.cells[iId])) byId.set(key(r.cells[iId]), r);
    if (!byName.has(key(r.cells[iName]))) byName.set(key(r.cells[iName]), r);
  }

  const emit = (cells) => { const c = [...cells]; while (c.length && !c[c.length - 1]) c.pop(); return c.join('\t'); };

  const added = []; const changed = []; let unchanged = 0;
  for (const m of measured.values()) {
    const target = (m.nodeId && byId.get(m.nodeId)) || byName.get(m.component);
    if (!target) {
      const cells = Array(width).fill('');
      cells[iName] = m.component; cells[iId] = m.nodeId;
      for (const f of FIELDS) cells[iOf[f]] = m[f];
      added.push({ component: m.component, line: emit(cells) });
      continue;
    }
    // What differs. A rename is a difference like any other — and the only one the old
    // name-keyed merge could not even see, because it would have made a second row.
    const diffs = [];
    if (m.nodeId && key(target.cells[iName]) !== m.component) {
      diffs.push({ field: 'component', from: key(target.cells[iName]), to: m.component, i: iName });
    }
    for (const f of FIELDS) {
      if ((target.cells[iOf[f]] || '') !== m[f]) diffs.push({ field: f, from: target.cells[iOf[f]] || '', to: m[f], i: iOf[f] });
    }
    // Filling in an id that was never captured is a gain, never a conflict. An id already
    // present is never overwritten by a name match — that way round, a guess could rewrite a fact.
    const fillsId = m.nodeId && !key(target.cells[iId]);
    if (!diffs.length && !fillsId) { unchanged++; continue; }
    changed.push({ component: key(target.cells[iName]), diffs, fillsId });
    if (update) {
      for (const d of diffs) target.cells[d.i] = d.to;
      if (fillsId) target.cells[iId] = m.nodeId;
      target.dirty = true;
    }
  }

  const out = [lines[0], ...rows.map((r) => (r.dirty ? emit(r.cells) : r.raw)), ...added.map((a) => a.line)];
  return { text: out.join('\n') + '\n', added, changed, unchanged,
           unidentified: rows.filter((r) => !key(r.cells[iId])).length };
}

function main() {
  const write = process.argv.includes('--write');
  const update = process.argv.includes('--update');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = args.length ? args.map((p) => ({ path: p })) : transcriptFiles(TRANSCRIPT_DIR);
  if (!files.length) { console.error(`no transcripts in ${TRANSCRIPT_DIR}`); process.exit(1); }

  const batches = scrapeBatches(files.map((f) => f.path), /^GEOMETRY\t.+\nCOUNT \d+/);
  const { measured, errors } = readBatches(batches);

  console.log(`transcripts read : ${files.length}`);
  console.log(`batches parsed   : ${batches.length}`);
  if (errors.length) {
    console.log(`DAMAGED BATCHES  : ${errors.length}`);
    for (const e of errors) console.log(`    ${e}`);
    console.error('\nrefusing to write. A batch that disagrees with its own COUNT is a truncated '
      + 'read, and importing it would leave a partial extract looking like a complete one. '
      + 'Re-read the page and run again.');
    process.exit(1);
  }
  if (!measured.size) { console.error('no geometry batches found in the transcripts'); process.exit(1); }

  const r = merge(readFileSync(TSV, 'utf8'), measured, { update });
  console.log(`components read  : ${measured.size}`);
  console.log(`new measurements : ${r.added.length}`);
  for (const a of r.added) console.log(`    ${a.component}`);
  console.log(`${update ? 'changed' : 'WOULD CHANGE'}          : ${r.changed.length}`);
  for (const c of r.changed) {
    const what = c.diffs.map((d) => `${d.field} ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`);
    if (c.fillsId) what.push('nodeId filled in');
    console.log(`    ${c.component}: ${what.join('; ')}`);
  }
  console.log(`unchanged        : ${r.unchanged}`);

  if (write) {
    writeFileSync(TSV, r.text);
    console.log(`\nwritten — ${r.text.trim().split('\n').length - 1} rows, ${r.unidentified} unidentified (no nodeId)`);
    if (!update && r.changed.length) {
      console.log(`${r.changed.length} difference(s) were REPORTED AND NOT APPLIED — re-run with --update to apply them`);
    }
  } else console.log('\ndry run — pass --write to apply' + (r.changed.length && !update ? ', --update to apply corrections too' : ''));
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (msg) => { failures++; console.log(`  MISS ${msg}`); };
  const H = 'component\tsize\tpadding\tradius\tgap\tfont\tlayout\tnotes\tnodeId';
  const src = `${H}\nButton\t32 x 32\t\t20\t10\t13px SemiBold\tHORIZONTAL\t\t1:2\nLinks (primary)\tauto\n`;
  const one = (c) => new Map([[c.nodeId || c.component, { padding: '', radius: '', gap: '', font: '', layout: '', ...c }]]);

  // THE CORRECTION CASE. This is the whole reason the script was rewritten: before, a changed
  // measurement on a captured component was dropped and reported as "left alone".
  const moved = one({ component: 'Button', size: '40 x 40', radius: '20', gap: '10', font: '13px SemiBold', layout: 'HORIZONTAL', nodeId: '1:2' });
  let r = merge(src, moved, { update: false });
  if (r.changed.length !== 1 || r.added.length) miss(`a changed measurement must be REPORTED (got ${JSON.stringify(r.changed)})`);
  if (r.text !== src) miss('without --update nothing may be written — a report is not a change');
  r = merge(src, moved, { update: true });
  if (!r.text.includes('Button\t40 x 40')) miss('with --update the changed measurement must actually land');
  if (!r.text.includes('\t1:2')) miss('applying a correction must not drop the nodeId');

  // A RENAME must update the row, not add a second one. Name-keyed merging could not see this.
  r = merge(src, one({ component: 'Action button', size: '32 x 32', radius: '20', gap: '10', font: '13px SemiBold', layout: 'HORIZONTAL', nodeId: '1:2' }), { update: true });
  if (r.added.length) miss('a rename must not add a duplicate row');
  if (!r.text.includes('Action button\t32 x 32')) miss('a rename must rewrite the name on the row the id points at');
  if (!r.changed.some((c) => c.diffs.some((d) => d.field === 'component'))) miss('a rename must be reported as a rename');

  // Unchanged input must be byte-for-byte unchanged output. A merge that reformats rows it did
  // not touch makes every diff unreadable and hides the one row that did change.
  r = merge(src, one({ component: 'Button', size: '32 x 32', radius: '20', gap: '10', font: '13px SemiBold', layout: 'HORIZONTAL', nodeId: '1:2' }), { update: true });
  if (r.text !== src) miss('an untouched file must round-trip byte for byte');
  if (r.unchanged !== 1) miss('an identical re-read must be counted as unchanged');

  // A new component still lands, and its id with it.
  r = merge(src, one({ component: 'Tag', size: '24 x 24', nodeId: '9:9' }), { update: false });
  if (r.added.length !== 1 || !r.added[0].line.endsWith('\t9:9')) miss('a new component must be added WITH its node id');
  // The id must sit under `nodeId`, not in whatever column came next.
  const cells = r.added[0].line.split('\t');
  if (cells[H.split('\t').indexOf('nodeId')] !== '9:9') miss('the id must land in the nodeId column, not in notes');

  // A short row in the existing file must not be misread. `Links (primary)` is 2 cells of 9.
  r = merge(src, one({ component: 'Links (primary)', size: 'auto', nodeId: '' }), { update: true });
  if (r.added.length) miss('a ragged existing row must still be matched by name, not treated as absent');

  // A DAMAGED BATCH must never reach the merge.
  const bad = readBatches(['GEOMETRY\tForms\nCOUNT 2\nButton\t32\t\t\t\t\t\t1:2']);
  if (!bad.errors.length) miss('a batch short of its COUNT must be reported as damaged');
  if (bad.measured.size) miss('a damaged batch must be imported from NOT AT ALL, not partially');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a changed measurement is reported and, with --update, applied; a '
    + 'rename rewrites its row instead of duplicating it; an untouched file round-trips byte for '
    + 'byte; a new row carries its id in the id column; and a truncated batch is not imported at all');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
