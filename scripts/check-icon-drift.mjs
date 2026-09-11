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
// CURRENT READING: 287 of 287 pinned icons are identical to Figma. Nothing has drifted. Getting to
// that answer took three wrong ones, and the sequence is the useful part — see NUMBER below.
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

export function digest(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// THE FIRST VERSION OF THIS COMPARED ROUNDED TEXT AND WAS WRONG SIX TIMES OUT OF 287.
//
// It rounded both sides to 2dp and hashed the result. That is not precision-safe, it merely moves
// the boundary: Figma's `29.735` rounds to 29.74 and the value the extractor stored as `29.73`
// stays 29.73, so one hundredth of a unit at one control point reported a redrawn icon. Rounding to
// 1dp does not fix it either — 1dp has boundaries too, and four of the six still differed there.
// `Team` was the proof: same six paths, same command sequence letter for letter, same 78/52/52/78/
// 52/80 numbers per path, and a digest that said the drawing had changed.
//
// So the shape is measured structurally and the numbers are measured WITH A TOLERANCE:
//
//   skeleton   the command letters with every number stripped — MCCCCZMCCCCZ. A redraw that adds,
//              removes or reorders a segment changes this and no rounding can.
//   counts     how many numbers each path carries. Same argument, finer.
//   sums       the sum of each path's numbers, compared against the error budget the stored
//              precision actually allows: 2dp storage means each number is off by at most 0.005,
//              so a path of n numbers can drift n * 0.005 by rounding alone and no further.
//
// WHAT THAT STILL CANNOT SEE, said rather than left to be discovered: two equal and opposite moves
// within one path cancel in the sum. The skeleton and the count both hold, so it takes a deliberate
// edit to hide, and a real redraw of an icon does not preserve segment count, segment order and
// summed coordinates simultaneously. It is a tolerance, not a proof.
export function shape(svg) {
  const ds = (String(svg).match(/ d="[^"]*"/g) || []).map((m) => m.slice(4, -1));
  const nums = ds.map((d) => (d.match(NUMBER) || []).map(Number));
  return {
    sk: digest(ds.map((d) => d.replace(/[-\d.\s,]/g, '')).join('|')),
    counts: nums.map((a) => a.length),
    sums: nums.map((a) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100),
  };
}

export const BUDGET_PER_NUMBER = 0.005;   // what 2dp storage can be wrong by, per number

// THE PARSER UNDER THE COMPARISON, AND THE THIRD TIME THIS CLAIM HAD TO BE CORRECTED.
//
// This was `-?\d+\.?\d*`, which requires a digit before the point — so in `M.37 30.5` it matches
// `37`, not `.37`. SVG path data omits the leading zero routinely and the two sources disagree on
// it: `icons.tsv` stores `.37` and Figma's exporter writes `0.37`. Identical geometry, different
// notation, and every `.37` read as `37` inflated a path's sum by about 36 — roughly ten of them in
// one path is the 361.32 that was reported as a redrawn icon, twice, in two different verdicts.
//
// The lesson is not the regex. Both earlier corrections tightened the COMPARISON — exact hash, then
// skeleton plus tolerance — and neither looked at the parser feeding it. A tolerance cannot forgive
// a number that was never read correctly in the first place, and three rounds of making the
// comparison cleverer never once questioned whether the inputs were right.
export const NUMBER = /-?(?:\d*\.\d+|\d+\.?\d*)/g;

// Same drawing within the precision the file can hold? Returns null when it is, or why not.
export function differs(mine, theirs) {
  if (!theirs) return 'not measured';
  if (mine.sk !== theirs.sk) return 'the path commands differ — a segment was added, removed or reordered';
  if (mine.counts.length !== theirs.counts.length) return `path count ${mine.counts.length} against ${theirs.counts.length}`;
  for (let i = 0; i < mine.counts.length; i++) {
    if (mine.counts[i] !== theirs.counts[i]) return `path ${i} carries ${mine.counts[i]} numbers against ${theirs.counts[i]}`;
  }
  for (let i = 0; i < mine.sums.length; i++) {
    const budget = mine.counts[i] * BUDGET_PER_NUMBER + 1e-9;
    const gap = Math.abs(mine.sums[i] - theirs.sums[i]);
    if (gap > budget) return `path ${i} moved: coordinates differ by ${gap.toFixed(3)}, more than the ${budget.toFixed(3)} that ${mine.counts[i]} numbers can drift by rounding`;
  }
  return null;
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

// A digest written by an older collector carries {id, h} and no shape. Reading it with the current
// comparison would report EVERY icon as "path commands differ" — 287 false alarms presented as
// fact, which is the failure this whole file exists to catch. So a file in the wrong format is
// refused outright rather than measured.
export function formatError(digests) {
  const shaped = digests.filter((d) => d && d.sk && Array.isArray(d.counts) && Array.isArray(d.sums));
  if (shaped.length === digests.length) return null;
  return `${digests.length - shaped.length} of ${digests.length} entries carry no sk/counts/sums — `
    + 'this digest file was written by an older collector. Re-run the collector in this file\'s header; '
    + 'measuring it with the current comparison would report every icon as drifted.';
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
    const why = differs(shape(r.svg), d);
    if (!why) same.push(r.name);
    else drifted.push({ name: r.name, nodeId: r.nodeId, why, figmaName: d.name });
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
  const rows = readIcons(`${H}\n1\tAlpha\talpha\t${svgA}\t1:1\n2\tBeta\tbeta\t${svgB}\t2:2\n`);

  // The whole point: same drawing passes, changed drawing is REPORTED.
  let r = judge(rows, [{ id: '1:1', ...shape(svgA) }, { id: '2:2', ...shape(svgB) }]);
  if (r.same.length !== 2) miss(`two unchanged icons must both compare equal (got ${r.same.length}: ${JSON.stringify(r.drifted)})`);
  r = judge(rows, [{ id: '1:1', ...shape(svgA) }, { id: '2:2', ...shape('<svg><path d="M9 9L1 1L5 5Z"/></svg>') }]);
  if (r.drifted.length !== 1 || r.drifted[0].name !== 'Beta') miss('a redrawn icon must be REPORTED — that is the only reason this check exists');

  // THE BUG THIS REWRITE EXISTS FOR. Figma's real precision against the file's 2dp storage must
  // NOT read as drift. The first version hashed rounded text and called six real icons redrawn;
  // 29.735 rounds to 29.74 while the stored 29.73 stays put, and a hash cannot forgive that.
  const figma = shape('<svg><path d="M27.735 5.2C28.1434 4.765Z"/></svg>');
  const file = shape('<svg><path d="M27.74 5.2C28.14 4.77Z"/></svg>');
  if (differs(file, figma)) miss(`a difference within 2dp storage error must NOT be drift (got: ${differs(file, figma)})`);

  // ...and a real move must still be caught, at a size no rounding could produce.
  const moved = shape('<svg><path d="M27.74 5.2C29.14 4.77Z"/></svg>');
  if (!differs(moved, figma)) miss('a whole unit of movement must be reported — the tolerance must not swallow a redraw');

  // A LEADING-DOT DECIMAL IS ONE NUMBER, NOT A WHOLE ONE. icons.tsv writes `.37` and Figma writes
  // `0.37`; reading the first as `37` inflated a sum by 36 and reported three icons as redrawn.
  if (differs(shape('<svg><path d="M.37 30.5Z"/></svg>'), shape('<svg><path d="M0.37 30.5Z"/></svg>')))
    miss('`.37` and `0.37` are the same number — a leading-dot decimal must not read as a whole one');
  if ([...'M-.5 1'.matchAll(NUMBER)].map((m) => Number(m[0])).join(',') !== '-0.5,1')
    miss('a NEGATIVE leading-dot decimal must parse too');
  if (shape('<svg><path d="M.37 .5Z"/></svg>').counts[0] !== 2) miss('two leading-dot decimals must count as two numbers');

  // Structure is compared exactly: rounding can never add or drop a segment.
  if (!differs(shape('<svg><path d="M1 1L2 2Z"/></svg>'), shape('<svg><path d="M1 1L2 2L3 3Z"/></svg>')))
    miss('an added segment must be reported however small');
  const why = differs(shape('<svg><path d="M1 1L2 2Z"/></svg>'), shape('<svg><path d="M1 1C2 2 3 3 4 4Z"/></svg>'));
  if (!/commands differ/.test(String(why))) miss('a changed command letter must be named as a command difference');

  // The budget scales with how many numbers a path holds, because that is where the error comes
  // from. A fixed tolerance would be too tight for a long path and too loose for a short one.
  const many = { sk: 'x', counts: [100], sums: [0] };
  if (differs({ sk: 'x', counts: [100], sums: [0.4] }, many)) miss('100 numbers may drift 0.5 by rounding alone and must not be called drift');
  if (!differs({ sk: 'x', counts: [2], sums: [0.4] }, { sk: 'x', counts: [2], sums: [0] })) miss('2 numbers may drift only 0.01 — 0.4 there IS a move');

  // Colour must not enter the comparison, or every icon reports drifted for ever.
  if (differs(shape('<svg viewBox="0 0 36 36" fill="#3E3E3E"><path d="M7.5 8.63C6.46 8.63Z"/></svg>'), shape(svgA)))
    miss('a colour difference must NOT read as artwork drift — icons.tsv stores currentColor by design');

  // A row the digest file does not mention is uncovered, not drifted and not fine.
  r = judge(rows, [{ id: '1:1', ...shape(svgA) }]);
  if (r.drifted.length) miss('a row missing from a PARTIAL digest file must never be reported as drifted');
  if (r.uncovered.length !== 1) miss('an uncovered row must be counted — absence from one read is not absence from Figma');

  // An icon Figma has that this repo has not captured is a question for a person.
  r = judge(rows, [{ id: '1:1', ...shape(svgA) }, { id: '2:2', ...shape(svgB) }, { id: '9:9', name: 'Newcomer', ...shape('<svg><path d="M1 1"/></svg>') }]);
  if (r.uncaptured.length !== 1 || !/Newcomer/.test(r.uncaptured[0])) miss('a digest for an id we have not captured must be reported, not ignored');
  if (r.drifted.length) miss('the two matching rows must not be reported as drift');

  // A row with no node id cannot be compared at all, and saying so is the honest answer.
  r = judge(readIcons(`${H}\n1\tNoId\tnoid\t${svgA}\t\n`), [{ id: '1:1', ...shape(svgA) }]);
  if (r.unpinned.length !== 1) miss('a row with no node id must be counted as uncomparable, not silently passed');
  if (r.same.length) miss('a row with no node id must never count as verified');

  // An old-format digest file must be REFUSED, not measured — it would report all 287 as drifted.
  if (!formatError([{ id: '1:1', sk: 'a', counts: [1], sums: [1] }])) { /* good shape passes */ }
  else miss('a well-formed digest file must not be refused');
  const oldFormat = formatError([{ id: '1:1', h: 'abc' }]);
  if (!oldFormat) miss('a digest file in the OLD {id,h} format must be refused outright');
  if (!/older collector/.test(String(oldFormat))) miss('and the refusal must say what to do about it');

  // A run with no digest file measured NOTHING, and that is exit 2, never 0.
  if (exitCode({ digestsPresent: false, drifted: 0 }) !== 2) miss('no digest file must exit 2 (vacuous) — a check that measured nothing is not a pass');
  if (exitCode({ digestsPresent: true, drifted: 0 }) !== 0) miss('a clean measured run must exit 0');
  if (exitCode({ digestsPresent: true, drifted: 3 }) !== 1) miss('drift must fail the run');

  // Path ORDER is part of the drawing.
  if (!differs(shape('<svg><path d="M1 1L9 9Z"/><path d="M2 2Z"/></svg>'), shape('<svg><path d="M2 2Z"/><path d="M1 1L9 9Z"/></svg>')))
    miss('a reordered path list must not compare equal — a reorder changes stacking');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a redrawn icon is reported and an unchanged one is not, a difference within what 2dp '
    + 'storage can be wrong by is NOT drift while a whole unit of movement is, an added segment or changed command is '
    + 'caught however small, the tolerance scales with how many numbers a path holds, colour is not artwork, a row '
    + 'absent from a partial digest file is uncovered rather than drifted, an icon Figma has that we have not captured '
    + 'is named, an unpinned row counts as uncomparable rather than verified, and a reordered path list is a difference');
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

  const bad = formatError(digests);
  if (bad) { console.log(`  REFUSED  ${bad}`); process.exit(2); }

  const rows = readIcons(readFileSync(ICONS, 'utf8'));
  const r = judge(rows, digests);

  for (const d of r.drifted) console.log(`  DRIFTED  ${d.name} (${d.nodeId}) — ${d.why}`);
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
