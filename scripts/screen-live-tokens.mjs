#!/usr/bin/env node
// Compare a page's CAPTURED colour columns against the live Figma variable sets.
//
//   node scripts/screen-live-tokens.mjs <live.json> "<page name>"
//   node scripts/screen-live-tokens.mjs --self-test
//
// <live.json> is { "<component name>": ["Figma/Variable Name", ...] }, one entry per component,
// written from get_variable_defs responses during a re-extract session. No Figma calls here.
//
// WHY IT EXISTS. A re-read of a 29-component page means 29 set-comparisons, and doing them by eye
// is how a difference gets missed — or invented. On `Cards and panels` this flagged 9 of 29 in one
// run, and eight of the nine turned out to be the one blocked token split. That is the job: turn a
// page of reading into a short list of questions.
//
// WHAT IT IS NOT. It is a SCREEN, not a measurement. It can only say whether every captured token
// is still bound SOMEWHERE under the node. It cannot say which node, and it cannot say which role
// — a fill that became a stroke screens clean. And per CLAUDE.md a miss here is NOT proof of an
// absence on its own: get_variable_defs never traverses a layer switched off by a boolean
// property, which is exactly how `Message box`'s Text/Secondary went missing from the set while
// sitting plainly in the render. Every `!!` is a prompt to go and read the component, never a
// verdict. The exit code says so: a miss is not a failure, it is a question.
import { readFileSync } from 'node:fs';

const TSV = 'tokens/_raw/component-variants.tsv';
const COLOUR_COLS = [3, 4, 5];            // fill, stroke, text
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');

export function capturedTokens(tsv, page) {
  const cap = new Map();
  tsv.replace(/\n+$/, '').split('\n').slice(1).forEach((l) => {
    const c = l.split('\t');
    if (c[0] !== page) return;
    if (!cap.has(c[1])) cap.set(c[1], new Set());
    for (const i of COLOUR_COLS) if (c[i] && c[i].trim()) cap.get(c[1]).add(c[i].trim());
  });
  return cap;
}

export function screen(cap, live) {
  const rows = [];
  for (const name of [...cap.keys()].sort()) {
    const want = [...cap.get(name)].sort();
    if (!(name in live)) { rows.push({ name, state: 'unscreened', want, missing: [] }); continue; }
    const have = new Set(live[name].map(norm));
    const missing = want.filter((t) => !have.has(norm(t)));
    rows.push({ name, state: missing.length ? 'question' : 'ok', want, missing });
  }
  const extra = Object.keys(live).filter((n) => !cap.has(n)).sort();
  return { rows, extra };
}

// ---------------------------------------------------------------------------
function main() {
  const [file, page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!file || !page) { console.error('usage: screen-live-tokens.mjs <live.json> "<page>"'); process.exit(2); }
  const cap = capturedTokens(readFileSync(TSV, 'utf8'), page);
  if (!cap.size) { console.error(`no captured rows for page "${page}" — nothing measured`); process.exit(2); }
  const { rows, extra } = screen(cap, JSON.parse(readFileSync(file, 'utf8')));

  for (const r of rows) {
    if (r.state === 'unscreened') console.log(`  ?  ${r.name.padEnd(34)} NOT screened`);
    else if (r.state === 'ok') console.log(`  ok ${r.name.padEnd(34)} all ${r.want.length} captured token(s) still bound`);
    else console.log(`  !! ${r.name.padEnd(34)} captured but not in the live set: ${r.missing.join(', ')}`);
  }
  if (extra.length) console.log(`\n  screened but carrying no captured colour: ${extra.join(', ')}`);

  const q = rows.filter((r) => r.state === 'question').length;
  const u = rows.filter((r) => r.state === 'unscreened').length;
  console.log(`\n${rows.length} captured component(s) on "${page}" — ${q} need a render to confirm`
    + `, ${u} not screened at all`);
  console.log('a "!!" is a QUESTION, not a verdict: get_variable_defs skips layers a boolean '
    + 'property hides, so read the component before calling a row stale');
  // Deliberately exit 0 on questions. A question is the output, not a failure. Exit 2 above for
  // "measured nothing", which IS a failure in this repo's vocabulary.
}

// ---------------------------------------------------------------------------
function selfTest() {
  let f = 0;
  const miss = (m) => { f++; console.log(`  MISS ${m}`); };
  const tsv = [
    'page\tcomponent\tvariant\tfill\tstroke\ttext\tnodeId',
    'Cards\tNote\tA\t\tBorder/Default\tText/Primary\t1:1',
    'Cards\tCard\tA\tBackground/Primary\t\t\t2:2',
    'Cards\tGhost\tA\tBackground/Theme\t\t\t3:3',
    'Other\tNote\tA\t\tNOT/Mine\t\t9:9',
  ].join('\n') + '\n';

  const cap = capturedTokens(tsv, 'Cards');
  if (cap.size !== 3) miss(`only the named page's rows count (got ${cap.size})`);
  if (cap.has('Note') && cap.get('Note').has('NOT/Mine')) miss('a row from another page must not leak in');

  const { rows, extra } = screen(cap, {
    Note: ['Border/Default full', 'Text/Primary'],     // the split — captured token is GONE
    Card: ['background/primary'],                      // same token, different spelling
    Stray: ['Whatever'],                               // screened, never captured
  });
  const by = Object.fromEntries(rows.map((r) => [r.name, r]));

  if (by.Note.state !== 'question' || by.Note.missing.join() !== 'Border/Default') {
    miss(`a captured token absent from the live set must be raised (got ${JSON.stringify(by.Note)})`);
  }
  // The whole point of normalising: "Background/Primary" and "background/primary" are one token,
  // and reporting that as a difference would bury the real ones in noise.
  if (by.Card.state !== 'ok') miss('case and spacing must not count as a difference');
  if (by.Ghost.state !== 'unscreened') {
    miss(`a captured component with NO live entry is "not screened", never a silent pass `
      + `(got ${by.Ghost.state}) — the count of unscreened rows is the only thing standing `
      + `between a partial run and a clean-looking one`);
  }
  if (by.Ghost.missing.length) miss('an unscreened component must not also be reported as missing tokens');
  if (extra.join() !== 'Stray') miss(`a live entry with no captured row must be listed (got ${extra})`);

  if (f) { console.log(`self-test FAILED — ${f} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — only the named page is read, a captured token missing from the '
    + 'live set is raised as a question, a spelling difference is not, a component with no live '
    + 'entry is counted as NOT SCREENED rather than passing silently, and a live entry with no '
    + 'captured row is listed');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
