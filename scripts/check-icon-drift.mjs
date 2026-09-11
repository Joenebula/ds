#!/usr/bin/env node
// Has the ARTWORK of a captured icon changed in Figma?
//
//   node scripts/check-icon-drift.mjs
//   node scripts/check-icon-drift.mjs --self-test
//
// WHY THIS EXISTS. This repo gained a token-drift check and a type-drift check, and both closed the
// same hole: two files agreeing with each other say nothing about whether either is right. The ICON
// layer still had it. `icons.tsv` holds 294 SVGs captured from transcripts, `verify-icons.mjs`
// checks them against the sheet it generates from them, and nothing has ever compared one of those
// drawings against Figma. An icon could have been redrawn a year ago and every check would be green.
//
// `sync-check.mjs` is not that check either: it compares NAMES against a published listing. A
// redrawn icon keeps its name, so it is invisible there by construction — the same shape as the
// rename problem this repo solved with node ids, one layer down.
//
// IT WAS IMPOSSIBLE UNTIL IT WAS NOT. CLAUDE.md recorded flatly that a glyph's SVG could not be
// fetched here: `get_design_context` hands back asset URLs and the asset host answers 403. True,
// and the conclusion was wrong — `node.exportAsync({format:'SVG_STRING'})` runs INSIDE the plugin
// and returns the markup directly, so no host is involved. A blocker recorded once and never
// re-tested is indistinguishable from a blocker that is still there.
//
// NO NETWORK CALLS. Like extract-tokens.mjs, this reads a response someone else fetched. Run this
// in a session with Figma, paste the result into tokens/_raw/figma-icon-digests.json:
//
//   const norm = (svg) => {
//     const ds = (svg.match(/ d="[^"]*"/g) || []).map((m) => m.slice(4, -1));
//     return ds.join('|').replace(/-?\d+\.?\d*/g, (x) => String(Math.round(parseFloat(x) * 100) / 100));
//   };
//   const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
//   const page = figma.root.children.find((p) => p.name.trim() === 'Icons');
//   await page.loadAsync();
//   const out = [];
//   for (const n of page.findAll((x) => x.type === 'COMPONENT')) {
//     const s = norm(await n.exportAsync({ format: 'SVG_STRING' }));
//     out.push({ id: n.id, name: n.name, len: s.length, h: hash(s) });
//   }
//   return JSON.stringify(out);
//
// WHAT A DIGEST IS, AND THE THREE THINGS IT DELIBERATELY IGNORES.
//
//   * COLOUR. `icons.tsv` stores `fill="currentColor"` on purpose — that is what makes an icon take
//     the colour of its context — while Figma's export carries the real paint. Comparing colour
//     would report all 287 as drifted on the first run, which is a check nobody would ever read
//     again. Only `d="…"` path data is compared.
//   * NUMBER PRECISION. The extractor rounds to 2dp and Figma does not: `8.625` against `8.63`. Both
//     sides round to 2dp, which is idempotent on already-rounded input. A first attempt at this
//     compared raw coordinates and matched nothing at all — not one icon of 287.
//   * ELEMENT ORDER WITHIN A PATH LIST is NOT ignored; paths are joined in document order, so a
//     reordered drawing is reported. That is deliberate: a reorder changes stacking, and "probably
//     harmless" is a judgement for a person.
//
// A PARTIAL DIGEST FILE IS NOT A DELETION, the same rule the extractors carry. A row the file does
// not mention is UNCOVERED, counted and named, never failed — absence from one read is not absence
// from Figma. And a digest for an id this repo has not captured is an icon Figma has and we do not:
// reported for a person, exactly as sync-check treats a new component.
import { readFileSync, existsSync } from 'node:fs';

const ICONS = 'tokens/_raw/icons.tsv';
const DIGESTS = 'tokens/_raw/figma-icon-digests.json';

export function normalise(svg) {
  const ds = (String(svg).match(/ d="[^"]*"/g) || []).map((m) => m.slice(4, -1));
  return ds.join('|').replace(/-?\d+\.?\d*/g, (x) => String(Math.round(parseFloat(x) * 100) / 100));
}

export function digest(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function readIcons(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const head = lines[0].split('\t');
  const iName = head.indexOf('figmaName');
  const iSvg = head.indexOf('svg');
  const iId = head.indexOf('nodeId');
  if (iName < 0 || iSvg < 0 || iId < 0) throw new Error('icons.tsv is missing figmaName, svg or nodeId');
  const rows = [];
  for (const l of lines.slice(1)) {
    const c = l.split('\t');
    rows.push({ name: c[iName], nodeId: (c[iId] || '').trim(), svg: c[iSvg] || '' });
  }
  return rows;
}

// The exit code, as a function rather than three scattered process.exit calls — because a mutant
// that turns the vacuous 2 into a 0 has to be killable by a test, and `main()` is not testable.
// 2 is VACUOUS: the check measured nothing, which is not a pass.
export function exitCode({ digestsPresent, drifted }) {
  if (!digestsPresent) return 2;
  return drifted ? 1 : 0;
}

export function judge(rows, digests) {
  const byId = new Map();
  for (const d of digests) if (d && d.id) byId.set(d.id, d);

  const drifted = [], same = [], uncovered = [], unpinned = [], uncaptured = [];
  const capturedIds = new Set();

  for (const r of rows) {
    if (!r.nodeId) { unpinned.push(r.name); continue; }
    capturedIds.add(r.nodeId);
    const d = byId.get(r.nodeId);
    if (!d) { uncovered.push(`${r.name} (${r.nodeId})`); continue; }
    const mine = digest(normalise(r.svg));
    if (mine === d.h) same.push(r.name);
    else drifted.push({ name: r.name, nodeId: r.nodeId, repo: mine, figma: d.h, figmaName: d.name });
  }
  for (const d of digests) if (d && d.id && !capturedIds.has(d.id)) uncaptured.push(`${d.name || '?'} (${d.id})`);

  return { drifted, same, uncovered, unpinned, uncaptured };
}

let failures = 0;
const miss = (m) => { console.log(`  MISS: ${m}`); failures++; };

function selfTest() {
  const H = 'index\tfigmaName\tfile\tsvg\tnodeId';
  const svgA = '<svg viewBox="0 0 36 36" fill="currentColor"><path d="M7.5 8.63C6.46 8.63Z"/></svg>';
  const svgB = '<svg viewBox="0 0 36 36" fill="currentColor"><path d="M9 9L1 1Z"/></svg>';
  const hA = digest(normalise(svgA));
  const rows = readIcons(`${H}\n1\tAlpha\talpha\t${svgA}\t1:1\n2\tBeta\tbeta\t${svgB}\t2:2\n`);

  // The whole point: same drawing passes, changed drawing is REPORTED.
  let r = judge(rows, [{ id: '1:1', name: 'Alpha', h: hA }, { id: '2:2', name: 'Beta', h: 'deadbeef' }]);
  if (r.same.length !== 1 || r.same[0] !== 'Alpha') miss('an unchanged icon must compare equal');
  if (r.drifted.length !== 1 || r.drifted[0].name !== 'Beta') miss('a redrawn icon must be REPORTED — that is the only reason this check exists');

  // Figma's real precision against the file's rounding. This is the case that matched NOTHING on
  // the first attempt, so a fixture that only used matching precision would prove nothing.
  const figmaPrecision = digest(normalise('<svg><path d="M7.5 8.625C6.46447 8.625Z"/></svg>'));
  const filePrecision = digest(normalise('<svg><path d="M7.5 8.63C6.46 8.63Z"/></svg>'));
  if (figmaPrecision !== filePrecision) miss('2dp rounding must make Figma precision and file precision agree');

  // Colour must not enter the comparison, or every icon reports drifted for ever.
  const coloured = '<svg viewBox="0 0 36 36" fill="#3E3E3E"><path d="M7.5 8.63C6.46 8.63Z"/></svg>';
  if (digest(normalise(coloured)) !== hA) miss('a colour difference must NOT read as artwork drift — icons.tsv stores currentColor by design');

  // A row the digest file does not mention is uncovered, not drifted and not fine.
  r = judge(rows, [{ id: '1:1', name: 'Alpha', h: hA }]);
  if (r.drifted.length) miss('a row missing from a PARTIAL digest file must never be reported as drifted');
  if (r.uncovered.length !== 1) miss('an uncovered row must be counted — absence from one read is not absence from Figma');

  // An icon Figma has that this repo has not captured is a question for a person.
  r = judge(rows, [{ id: '1:1', name: 'Alpha', h: hA }, { id: '2:2', name: 'Beta', h: digest(normalise(svgB)) }, { id: '9:9', name: 'Newcomer', h: 'x' }]);
  if (r.uncaptured.length !== 1 || !/Newcomer/.test(r.uncaptured[0])) miss('a digest for an id we have not captured must be reported, not ignored');
  if (r.drifted.length) miss('Beta matches here and must not be reported as drift');

  // A row with no node id cannot be compared at all, and saying so is the honest answer.
  r = judge(readIcons(`${H}\n1\tNoId\tnoid\t${svgA}\t\n`), [{ id: '1:1', h: hA }]);
  if (r.unpinned.length !== 1) miss('a row with no node id must be counted as uncomparable, not silently passed');
  if (r.same.length) miss('a row with no node id must never count as verified');

  // A run with no digest file measured NOTHING, and that is exit 2, never 0.
  if (exitCode({ digestsPresent: false, drifted: 0 }) !== 2) miss('no digest file must exit 2 (vacuous) — a check that measured nothing is not a pass');
  if (exitCode({ digestsPresent: true, drifted: 0 }) !== 0) miss('a clean measured run must exit 0');
  if (exitCode({ digestsPresent: true, drifted: 3 }) !== 1) miss('drift must fail the run');

  // Path ORDER is part of the drawing.
  const one = digest(normalise('<svg><path d="M1 1"/><path d="M2 2"/></svg>'));
  const two = digest(normalise('<svg><path d="M2 2"/><path d="M1 1"/></svg>'));
  if (one === two) miss('a reordered path list must not compare equal — a reorder changes stacking');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a redrawn icon is reported and an unchanged one is not, Figma precision and the '
    + "file's 2dp rounding agree, a colour difference is not artwork drift, a row absent from a partial digest file is "
    + 'uncovered rather than drifted, an icon Figma has that we have not captured is named, a row with no node id '
    + 'counts as uncomparable rather than verified, and a reordered path list is a difference');
}

// ---------------------------------------------------------------------------
function main() {
  if (!existsSync(DIGESTS)) {
    console.log(`${DIGESTS} is not here, so NOTHING WAS MEASURED.`);
    console.log('Run the collector in the header of this file in a session with Figma and drop the result in.');
    process.exit(exitCode({ digestsPresent: false, drifted: 0 }));
  }
  let digests;
  try { digests = JSON.parse(readFileSync(DIGESTS, 'utf8')); }
  catch (e) { console.log(`${DIGESTS} is not valid JSON: ${e.message}`); process.exit(1); }
  if (!Array.isArray(digests)) { console.log(`${DIGESTS} must be an array of {id, name, h}`); process.exit(1); }

  const rows = readIcons(readFileSync(ICONS, 'utf8'));
  const r = judge(rows, digests);

  for (const d of r.drifted) {
    console.log(`  DRIFTED  ${d.name} (${d.nodeId}) — the drawing in Figma is not the drawing captured here`);
  }
  for (const u of r.uncaptured) console.log(`  new      ${u} — Figma has it, icons.tsv does not`);

  console.log(`\n${r.same.length} icon(s) verified against Figma, ${r.drifted.length} DRIFTED, `
    + `${r.uncovered.length} not in this digest file, ${r.unpinned.length} with no node id (uncomparable), `
    + `${r.uncaptured.length} in Figma and not captured`);
  if (r.uncovered.length) {
    console.log(`  the ${r.uncovered.length} uncovered are counted, never failed: a partial read is not a deletion. `
      + `First few: ${r.uncovered.slice(0, 5).join(', ')}`);
  }
  if (r.unpinned.length) {
    console.log(`  the ${r.unpinned.length} with no id can never be checked until they are pinned: ${r.unpinned.join(', ')}`);
  }
  process.exit(exitCode({ digestsPresent: true, drifted: r.drifted.length }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
