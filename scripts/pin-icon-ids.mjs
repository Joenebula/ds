#!/usr/bin/env node
// Pin a node id onto an icons.tsv row that `backfill-node-ids.mjs` refuses, using the ARTWORK.
//
//   node scripts/pin-icon-ids.mjs            # reports, writes nothing
//   node scripts/pin-icon-ids.mjs --write
//   node scripts/pin-icon-ids.mjs --self-test
//
// WHY A SECOND PINNER. `backfill-node-ids.mjs` matches by NAME and refuses an ambiguous one, which
// is right: `GIF` and `Transfer` are each published TWICE on the icon page, and a coin toss between
// them would put the wrong id on a row that then looks settled for ever. Four rows have stayed
// empty for that reason.
//
// The refusal was waiting for evidence, and the evidence is the drawing. Exporting each candidate
// component with `exportAsync({format:'SVG_STRING'})` — inside the plugin, so the blocked asset host
// is not involved — shows the two GIFs and the two Transfers are DIFFERENT ARTWORK rather than
// duplicates. So each row can be matched to its own node by a path signature, and the pair that
// shares a name is separated by the only thing that actually differs.
//
// THE RULE THAT KEEPS THIS HONEST. A signature is not trusted because it was typed here: the script
// refuses to write unless, for each pin, the signature appears in THAT row and in NO OTHER ROW OF
// THE SAME NAME. `M21 3.38C21.62 3.38` is the generic document outline and occurs in thirteen rows
// — CSV, Doc, JPG, PNG, ZIP and friends — so a rule that merely required uniqueness across the file
// would refuse it, and a rule that required nothing would accept anything. Within the two rows
// named `GIF` it is decisive, and that is the claim being made.
//
// Coordinates are rounded to 2dp in icons.tsv and not in Figma's export, which is why a signature
// is written in the file's own rounding. The first probe used Figma's `8.625` against the file's
// `8.63` and matched nothing at all.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'tokens/_raw/icons.tsv';

// name, the node it really is, and a path signature found in that row's svg and no sibling's.
// Every id here was read from the live file on 2026-09-11 and its artwork compared byte for byte
// against its twin — the pairs differ at character 97 of their exported SVG.
export const PINS = [
  { name: 'GIF', nodeId: '9598:97872', sig: 'd="M21 3.38C21.62 3.38' },
  { name: 'GIF', nodeId: '10169:113776', sig: 'd="M7.5 8.63C6.46 8.63' },
  { name: 'Transfer', nodeId: '8136:78353', sig: 'd="M12 4.5H6C5.17 4.5' },
  { name: 'Transfer', nodeId: '11793:97862', sig: 'd="M18 7.13C15.91 7.13' },
];

export function pin(text, pins) {
  const lines = text.split('\n');
  const head = lines[0].split('\t');
  const iName = head.indexOf('figmaName');
  const iSvg = head.indexOf('svg');
  const iId = head.indexOf('nodeId');
  if (iName < 0 || iSvg < 0 || iId < 0) throw new Error('icons.tsv is missing figmaName, svg or nodeId');

  const rows = lines.map((l, n) => ({ n, cells: l.split('\t') }));
  const applied = [], refused = [];

  for (const p of pins) {
    const sameName = rows.filter((r) => r.n > 0 && r.cells[iName] === p.name);
    const hits = sameName.filter((r) => (r.cells[iSvg] || '').includes(p.sig));
    if (sameName.length === 0) { refused.push(`${p.name} ${p.nodeId}: no row carries that name`); continue; }
    if (hits.length !== 1) {
      refused.push(`${p.name} ${p.nodeId}: its signature matches ${hits.length} of the ${sameName.length} rows named ${p.name} — it separates nothing`);
      continue;
    }
    const row = hits[0];
    const current = (row.cells[iId] || '').trim();
    if (current && current !== p.nodeId) {
      refused.push(`${p.name} row ${row.n} already holds ${current}; refusing to overwrite a pinned id`);
      continue;
    }
    if (current === p.nodeId) continue;              // already done, silently idempotent
    while (row.cells.length <= iId) row.cells.push('');
    row.cells[iId] = p.nodeId;
    applied.push({ row: row.n, name: p.name, file: row.cells[head.indexOf('file')] || '?', nodeId: p.nodeId });
  }

  // Two pins must never land on one row, which a bad pair of signatures could otherwise do.
  const targets = applied.map((a) => a.row);
  if (new Set(targets).size !== targets.length) throw new Error('two pins resolved to the same row');

  return { text: rows.map((r) => r.cells.join('\t')).join('\n'), applied, refused };
}

let failures = 0;
const miss = (m) => { console.log(`  MISS: ${m}`); failures++; };

function selfTest() {
  const H = 'index\tfigmaName\tfile\tsvg\tnodeId';
  const T = (rows) => `${H}\n${rows.join('\n')}\n`;

  // The real shape: two rows share a name and are separated only by their drawing.
  let r = pin(T(['1\tGIF\tgif\t<svg><path d="M7.5 8.63C6.46 8.63 Z"/></svg>\t',
                 '2\tGIF\tgif-2\t<svg><path d="M21 3.38C21.62 3.38 Z"/></svg>\t']), PINS.slice(0, 2));
  if (r.applied.length !== 2) miss(`both GIF rows must pin from their artwork (got ${r.applied.length}: ${r.refused.join('; ')})`);
  const ids = r.text.split('\n').slice(1, 3).map((l) => l.split('\t')[4]);
  if (ids[0] !== '10169:113776' || ids[1] !== '9598:97872') miss(`each row must get ITS OWN node, not the other's (got ${ids.join(', ')})`);

  // A signature that matches both rows of a name separates nothing and must be refused.
  r = pin(T(['1\tGIF\tgif\t<svg><path d="M21 3.38C21.62 3.38 A"/></svg>\t',
             '2\tGIF\tgif-2\t<svg><path d="M21 3.38C21.62 3.38 B"/></svg>\t']), [PINS[0]]);
  if (r.applied.length) miss('a signature present in BOTH rows of a name must pin nothing');
  if (!/separates nothing/.test(r.refused.join(' '))) miss('and it must say why, not fail silently');

  // A signature matching no row is refused rather than written to the first one.
  r = pin(T(['1\tGIF\tgif\t<svg><path d="M99 9"/></svg>\t']), [PINS[0]]);
  if (r.applied.length) miss('a signature that matches nothing must pin nothing');

  // An id already on a row is never overwritten — that is somebody else's evidence.
  r = pin(T(['1\tGIF\tgif\t<svg><path d="M7.5 8.63C6.46 8.63 Z"/></svg>\t1:1']), [PINS[1]]);
  if (r.applied.length) miss('an existing DIFFERENT id must not be overwritten');
  if (!/refusing to overwrite/.test(r.refused.join(' '))) miss('and the refusal must say so');

  // Running twice changes nothing the second time.
  const once = pin(T(['1\tGIF\tgif\t<svg><path d="M7.5 8.63C6.46 8.63 Z"/></svg>\t']), [PINS[1]]);
  const twice = pin(once.text, [PINS[1]]);
  if (twice.applied.length) miss('a second run must be a no-op, not a rewrite');
  if (twice.text !== once.text) miss('a no-op run must round-trip byte for byte');

  // The unrelated rows are untouched, including their trailing columns.
  const before = T(['1\tGIF\tgif\t<svg><path d="M7.5 8.63C6.46 8.63 Z"/></svg>\t', '2\tOther\tother\t<svg/>\t5:5']);
  const after = pin(before, [PINS[1]]).text;
  if (after.split('\n')[2] !== '2\tOther\tother\t<svg/>\t5:5') miss('a row this script is not pinning must come out identical');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — two rows sharing a name are separated by their artwork and each gets its OWN node, '
    + 'a signature present in both rows or in neither pins nothing and says why, an id already on a row is never '
    + 'overwritten, a second run is a byte-for-byte no-op, and rows outside the pin list are untouched');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  const text = readFileSync(FILE, 'utf8');
  const r = pin(text, PINS);
  for (const a of r.applied) console.log(`  pin  ${a.name} (${a.file}) -> ${a.nodeId}`);
  for (const f of r.refused) console.log(`  REFUSED  ${f}`);
  if (!process.argv.includes('--write')) {
    console.log(`\n${r.applied.length} row(s) WOULD be pinned, ${r.refused.length} refused. Re-run with --write to apply.`);
    process.exit(0);
  }
  writeFileSync(FILE, r.text);
  console.log(`\n${r.applied.length} row(s) pinned, ${r.refused.length} refused.`);
}
