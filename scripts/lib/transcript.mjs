// Finding and validating the batches the extract scripts read out of session transcripts.
//
// WHY THIS FILE EXISTS. The four extract-*.mjs scripts each grew their own copy of the same
// three mechanisms, and all four copies carried the same two defects:
//
//   1. `readdirSync(dir).filter(...).sort().pop()` takes the lexicographically LAST FILENAME,
//      not the newest file, and takes exactly ONE of them. Transcript names are random uuids,
//      so "last" is arbitrary. Two of the four scripts OVERWRITE their output file, so a run
//      that spanned two sessions would rewrite the whole extract from half the batches and
//      report it as a success.
//   2. Every batch header declares `COUNT n` and no script ever compared it to the rows it
//      parsed. Batches are emitted under a 20KB truncation cap, so a batch CAN arrive short —
//      and a short batch that reports success is a partial extract wearing a complete one's
//      clothes. That is the failure this repo keeps finding: a mechanism that cannot tell two
//      states apart reports the wrong one confidently.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const TRANSCRIPT_DIR = '/root/.claude/projects/-home-user-ds';

// Every transcript, OLDEST FIRST by mtime. Order matters: the scripts all resolve a collision
// by letting the later batch win, so "later in the list" must mean "read more recently".
// Filename order does not mean that and never did.
export function transcriptFiles(dir = TRANSCRIPT_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(dir, f))
    .map((p) => ({ path: p, mtime: statSync(p).mtimeMs, size: statSync(p).size }))
    .sort((a, b) => a.mtime - b.mtime);
}

// Every string anywhere in the transcript whose START matches. The `^` is load-bearing and the
// absence of the `m` flag is deliberate: the batch must be the first thing in its string value,
// so the format documented in CLAUDE.md or discussed in conversation cannot be mistaken for data.
export function scrapeBatches(paths, re) {
  const batches = [];
  const walk = (v) => {
    if (typeof v === 'string') { if (re.test(v)) batches.push(v); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const p of paths) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
    }
  }
  return batches;
}

// Split a batch into its header and its data lines, and CHECK THE COUNT.
//
// `headerLines` is how many lines precede the data — 2 where the marker and `COUNT n` are on
// separate lines, 1 where the count rides on the marker line (the icon exports).
//
// Returns { header, lines, declared, errors }. `errors` is never a warning: every caller treats
// a non-empty errors array as a hard failure, because the two things it catches — a count that
// disagrees with the rows, and a row with the wrong number of columns — are both truncation.
export function parseBatch(text, { headerLines, columns, label = 'batch' }) {
  const all = text.replace(/\n+$/, '').split('\n');
  const header = all.slice(0, headerLines);
  const lines = all.slice(headerLines).filter((l) => l.trim());
  const m = header.join('\n').match(/COUNT (\d+)/);
  const declared = m ? +m[1] : null;
  const errors = [];
  const where = `${label} "${header[0].replace(/\t/g, ' ')}"`;

  if (declared === null) errors.push(`${where}: no COUNT in the header`);
  else if (lines.length !== declared) {
    errors.push(`${where}: COUNT says ${declared}, found ${lines.length} rows`
      + (lines.length < declared ? ' — TRUNCATED, the tail of this batch never arrived' : ''));
  }

  // Strict arity. A batch cut off mid-row leaves a final line with too few columns, and a row
  // count alone cannot see it: 10 whole rows plus one half row still counts as 11. The batch
  // format therefore carries every column including the empty trailing ones, so a short row is
  // always a broken row. (Trailing blanks are still dropped when a row is WRITTEN to the TSV —
  // that is the file's convention, not the wire format's.)
  if (columns) {
    lines.forEach((l, i) => {
      const n = l.split('\t').length;
      if (n !== columns) {
        errors.push(`${where}: row ${i + 1} has ${n} columns, expected ${columns} `
          + `— ${JSON.stringify(l.slice(0, 60))}`);
      }
    });
  }
  return { header, lines, declared, errors };
}

// ---------------------------------------------------------------------------
export function selfTest() {
  let failures = 0;
  const miss = (msg) => { failures++; console.log(`  MISS ${msg}`); };

  const good = 'PAGE\tForms\nCOUNT 2\na\tb\tc\nd\te\tf';
  let r = parseBatch(good, { headerLines: 2, columns: 3 });
  if (r.errors.length) miss(`a well-formed batch must pass (got ${JSON.stringify(r.errors)})`);
  if (r.lines.length !== 2 || r.declared !== 2) miss('a well-formed batch must parse its rows and count');

  // THE TRUNCATION CASE. This is the whole reason the file exists.
  r = parseBatch('PAGE\tForms\nCOUNT 3\na\tb\tc\nd\te\tf', { headerLines: 2, columns: 3 });
  if (!r.errors.some((e) => /TRUNCATED/.test(e))) miss('a batch short of its COUNT must fail, and say it was truncated');

  // A batch cut off MID-ROW still has the right number of lines. Only arity catches it.
  r = parseBatch('PAGE\tForms\nCOUNT 2\na\tb\tc\nd\te', { headerLines: 2, columns: 3 });
  if (!r.errors.some((e) => /expected 3/.test(e))) miss('a row with too few columns must fail even when the COUNT agrees');

  r = parseBatch('PAGE\tForms\nno count here\na\tb\tc', { headerLines: 2, columns: 3 });
  if (!r.errors.some((e) => /no COUNT/.test(e))) miss('a header with no COUNT must fail rather than skip the check');

  // One-line header, the icon-export shape.
  r = parseBatch('FROM 0 NEXT 2 OF 9 COUNT 2\n0\tTick\tx\n1\tFilter\ty', { headerLines: 1, columns: 3 });
  if (r.errors.length || r.declared !== 2) miss('a one-line header must take its COUNT from that line');

  // Blank lines are not rows.
  r = parseBatch('PAGE\tForms\nCOUNT 1\n\na\tb\tc\n\n', { headerLines: 2, columns: 3 });
  if (r.errors.length) miss('blank lines must not be counted as rows');

  // The anchor: a batch quoted inside prose must NOT be scraped.
  const re = /^PAGE\t.+\nCOUNT \d+/;
  if (re.test('Here is an example:\nPAGE\tForms\nCOUNT 1\na\tb\tc')) {
    miss('a batch quoted inside prose must not match — the ^ anchor is what keeps documentation out of the data');
  }
  if (!re.test('PAGE\tForms\nCOUNT 1\na\tb\tc')) miss('a real batch must match');

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — a short batch, a mid-row truncation and a missing COUNT each fail, '
    + 'blank lines are not rows, and a batch quoted in prose is not data');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  for (const f of transcriptFiles()) console.log(`${new Date(f.mtime).toISOString()}  ${(f.size / 1e6).toFixed(1)}MB  ${f.path}`);
}
