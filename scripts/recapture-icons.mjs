#!/usr/bin/env node
// Replace the captured artwork of icons that `check-icon-drift.mjs` proved have been redrawn.
//
//   node scripts/recapture-icons.mjs            # reports, writes nothing
//   node scripts/recapture-icons.mjs --write
//   node scripts/recapture-icons.mjs --self-test
//
// WHY THIS IS A SCRIPT AND NOT A HAND EDIT. `icons.tsv` is load-bearing — `verify-icons.mjs`, the
// icon sheet and `assets/icons/` are all generated from it, and the svg lives in a TAB-SEPARATED
// cell where one stray tab silently shifts the nodeId column into the svg column. The repo already
// learned that once: "a tab in an svg cell is also collapsed to a space now, because a tab there
// would move the id column; no current row has one, and that was luck rather than a rule."
//
// WHAT IT REFUSES, and each refusal is a way this could go wrong quietly:
//
//   * a node id with no row — a typo in the payload would otherwise write nothing and report
//     success, which is the silent no-op this repo keeps finding in other mechanisms.
//   * artwork that is byte-identical to what is stored — nothing to do, and reporting a write that
//     changed nothing trains people to ignore the output.
//   * anything not in the stored shape `<svg viewBox="0 0 36 36" fill="currentColor">…</svg>` —
//     the normaliser that produces these was proved against `Add plus`, whose re-normalised export
//     is byte-identical to the cell already in the file. A payload that does not look like that did
//     not come from it.
//   * a tab or newline anywhere in the svg — see above.
//   * a row whose `file` column has no matching svg in assets/icons/ — the pair must stay in step,
//     and writing one without the other is how the sheet and the assets drift apart.
//
// It writes BOTH the cell and `assets/icons/<file>.svg`, because they are two copies of one fact.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ICONS = 'tokens/_raw/icons.tsv';
const PAYLOAD = 'tokens/_raw/figma-icon-recapture.json';
const ASSETS = 'assets/icons';

export const SHAPE = /^<svg viewBox="0 0 36 36" fill="currentColor">.*<\/svg>$/s;

export function plan(text, payload, assetExists) {
  const lines = text.split('\n');
  const head = lines[0].split('\t');
  const iName = head.indexOf('figmaName');
  const iFile = head.indexOf('file');
  const iSvg = head.indexOf('svg');
  const iId = head.indexOf('nodeId');
  if ([iName, iFile, iSvg, iId].some((i) => i < 0)) throw new Error('icons.tsv is missing a required column');

  const rows = lines.map((l, n) => ({ n, cells: l.split('\t') }));
  const applied = [], refused = [];

  for (const [nodeId, svg] of Object.entries(payload)) {
    const row = rows.find((r) => r.n > 0 && (r.cells[iId] || '').trim() === nodeId);
    if (!row) { refused.push(`${nodeId}: no row carries that node id`); continue; }
    const name = row.cells[iName];
    if (/[\t\n\r]/.test(svg)) { refused.push(`${name}: the svg contains a tab or newline, which would shift the nodeId column`); continue; }
    if (!SHAPE.test(svg)) { refused.push(`${name}: not in the stored shape — this did not come from the proved normaliser`); continue; }
    if (row.cells[iSvg] === svg) { refused.push(`${name}: already identical, nothing to recapture`); continue; }
    const file = row.cells[iFile];
    if (!assetExists(file)) { refused.push(`${name}: assets/icons/${file}.svg does not exist, so the pair would fall out of step`); continue; }
    applied.push({ row: row.n, name, file, nodeId, was: row.cells[iSvg].length, now: svg.length });
    row.cells[iSvg] = svg;
  }
  return { text: rows.map((r) => r.cells.join('\t')).join('\n'), applied, refused };
}

let failures = 0;
const miss = (m) => { console.log(`  MISS: ${m}`); failures++; };

function selfTest() {
  const H = 'index\tfigmaName\tfile\tsvg\tnodeId';
  const ok = '<svg viewBox="0 0 36 36" fill="currentColor"><path d="M1 1"/></svg>';
  const old = '<svg viewBox="0 0 36 36" fill="currentColor"><path d="M9 9"/></svg>';
  const T = (svg = old, id = '1:1', file = 'alpha') => `${H}\n1\tAlpha\t${file}\t${svg}\t${id}\n`;
  const yes = () => true;

  let r = plan(T(), { '1:1': ok }, yes);
  if (r.applied.length !== 1) miss(`a genuine recapture must apply (${r.refused.join('; ')})`);
  if (!r.text.includes(ok)) miss('the new artwork must actually reach the cell');
  if (r.text.split('\n')[1].split('\t')[4] !== '1:1') miss('the nodeId column must survive the write');

  r = plan(T(), { '9:9': ok }, yes);
  if (r.applied.length || !/no row carries/.test(r.refused.join(' '))) miss('an id with no row must be refused and named, not quietly skipped');

  r = plan(T(), { '1:1': old }, yes);
  if (r.applied.length || !/already identical/.test(r.refused.join(' '))) miss('artwork identical to what is stored must be refused — a write that changes nothing is noise');

  r = plan(T(), { '1:1': '<svg viewBox="0 0 36 36"><path d="M1 1"/></svg>' }, yes);
  if (r.applied.length || !/stored shape/.test(r.refused.join(' '))) miss('artwork not in the stored shape must be refused');

  r = plan(T(), { '1:1': '<svg viewBox="0 0 36 36" fill="currentColor"><path\td="M1 1"/></svg>' }, yes);
  if (r.applied.length || !/tab or newline/.test(r.refused.join(' '))) miss('a TAB in the svg must be refused — it would shift the nodeId column');

  r = plan(T(), { '1:1': ok }, () => false);
  if (r.applied.length || !/does not exist/.test(r.refused.join(' '))) miss('a missing asset file must stop the write — the two copies must stay in step');

  // Rows this run is not touching come out byte-identical, trailing columns included.
  const before = `${H}\n1\tAlpha\talpha\t${old}\t1:1\n2\tBeta\tbeta\t${old}\t2:2\n`;
  const after = plan(before, { '1:1': ok }, yes).text;
  if (after.split('\n')[2] !== `2\tBeta\tbeta\t${old}\t2:2`) miss('a row outside the payload must be untouched');

  // Running twice is a no-op, because the second run sees identical artwork.
  const once = plan(T(), { '1:1': ok }, yes);
  const twice = plan(once.text, { '1:1': ok }, yes);
  if (twice.applied.length) miss('a second run must apply nothing');
  if (twice.text !== once.text) miss('a no-op run must round-trip byte for byte');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a genuine recapture reaches the cell without disturbing the nodeId column, an id with '
    + 'no row is refused and named, artwork identical to what is stored is refused, artwork not in the stored shape is '
    + 'refused, a TAB is refused because it would shift a column, a missing asset file stops the write, rows outside the '
    + 'payload are untouched and a second run is a byte-for-byte no-op');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  if (!existsSync(PAYLOAD)) { console.log(`${PAYLOAD} is not here, so there is nothing to recapture.`); process.exit(2); }
  const payload = JSON.parse(readFileSync(PAYLOAD, 'utf8'));
  const r = plan(readFileSync(ICONS, 'utf8'), payload, (f) => existsSync(`${ASSETS}/${f}.svg`));
  for (const a of r.applied) console.log(`  recapture  ${a.name} (${a.file}) — ${a.was} bytes becomes ${a.now}`);
  for (const f of r.refused) console.log(`  REFUSED    ${f}`);
  if (!process.argv.includes('--write')) {
    console.log(`\n${r.applied.length} icon(s) WOULD be recaptured, ${r.refused.length} refused. Re-run with --write.`);
    process.exit(0);
  }
  writeFileSync(ICONS, r.text);
  for (const a of r.applied) writeFileSync(`${ASSETS}/${a.file}.svg`, `${payload[a.nodeId]}\n`);
  console.log(`\n${r.applied.length} icon(s) recaptured in icons.tsv and assets/icons/, ${r.refused.length} refused.`);
}
