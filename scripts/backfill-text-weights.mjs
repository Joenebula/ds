#!/usr/bin/env node
// Fill the text styles whose weight the extract records as blank, from what Figma reports.
//
//   node scripts/backfill-text-weights.mjs            report only
//   node scripts/backfill-text-weights.mjs --write
//   node scripts/backfill-text-weights.mjs --self-test
//
// WHY. `extract-text-styles.mjs` resolves a weight from the font's own style, or from a bound
// Weight/* variable, and records a blank when neither exists — 10 of 23 styles. That was correct:
// it never guesses. But a weight it cannot resolve is not a weight Figma does not KNOW.
//
// Every get_design_context response ends with a line naming the text styles it used, and that line
// states the weight outright:
//
//   Desktop text/Large heading (light): Font(family: "Open Sans", style: Light, size: 24, weight: 300, …)
//
// So the gap is half-closable from responses already durable in the transcripts, with no Figma
// call. Found while re-reading the Configuration component, which renders at Open_Sans:Light — a
// weight the extract had blank and the design system's own rule says does not exist.
//
// THIS IS NOT THE TEXT-STYLE RE-EXTRACT. It fills blanks and nothing else. A weight already
// recorded is NEVER overwritten: a disagreement is reported and left for a person, because the
// extract's value came from the style definition and this one comes from a usage, and where those
// differ the definition is the better source.
import { readFileSync, writeFileSync } from 'node:fs';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches } from './lib/transcript.mjs';

const TSV = 'tokens/_raw/text-styles.tsv';
const MARKER = /These styles are contained in the design:/;

// The extract's vocabulary for a weight, as extract-text-styles.mjs writes it.
const WORD = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };

export function scanStyles(texts) {
  const found = new Map();
  for (const t of texts) {
    for (const m of t.matchAll(/([A-Za-z][^:,]*?): Font\(family: "([^"]+)", style: ([^,]+), size: ([^,]+), weight: (\d+)/g)) {
      found.set(m[1].trim(), { style: m[3].trim(), size: m[4].trim(), weight: +m[5] });
    }
  }
  return found;
}

export function backfill(text, found) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const header = lines[0].split('\t');
  const width = header.length;
  const iName = header.indexOf('name');
  const iWeight = header.indexOf('weight');
  if (iName === -1 || iWeight === -1) throw new Error('need both a name and a weight column');

  const out = [lines[0]];
  const filled = []; const disagree = []; let untouched = 0;
  for (const raw of lines.slice(1)) {
    const cells = raw.split('\t');
    while (cells.length < width) cells.push('');
    const hit = found.get(cells[iName].trim());
    const word = hit ? WORD[hit.weight] : undefined;
    if (!hit || !word) { untouched++; out.push(raw); continue; }
    if (cells[iWeight]) {
      // Already recorded. NEVER overwritten — the extract's value came from the style definition,
      // this one from a usage of it, and the definition is the better source where they differ.
      if (cells[iWeight] !== word) disagree.push({ name: cells[iName], had: cells[iWeight], figma: word });
      untouched++; out.push(raw); continue;
    }
    cells[iWeight] = word;
    filled.push({ name: cells[iName], weight: word, from: hit.weight });
    const c = [...cells]; while (c.length && !c[c.length - 1]) c.pop();
    out.push(c.join('\t'));
  }
  return { text: out.join('\n') + '\n', filled, disagree, untouched };
}

function main() {
  const write = process.argv.includes('--write');
  const files = transcriptFiles(TRANSCRIPT_DIR);
  const texts = scrapeBatches(files.map((f) => f.path), MARKER);
  const found = scanStyles(texts);

  console.log(`transcripts read : ${files.length}`);
  console.log(`style lists seen : ${texts.length}`);
  console.log(`styles reported  : ${found.size}`);
  if (!found.size) {
    console.log('\nno style list was found in these transcripts, so NOTHING WAS MEASURED — this is '
      + 'not a pass. Re-run in a session that has read components with get_design_context.');
    process.exit(2);
  }

  const r = backfill(readFileSync(TSV, 'utf8'), found);
  console.log(`weights filled   : ${r.filled.length}`);
  for (const f of r.filled) console.log(`    ${f.name.padEnd(42)} blank -> ${f.weight} (Figma says ${f.from})`);
  console.log(`left alone       : ${r.untouched}`);
  if (r.disagree.length) {
    console.log(`DISAGREEMENTS    : ${r.disagree.length} — NOT overwritten, decide by hand`);
    for (const d of r.disagree) console.log(`    ${d.name}: extract says ${d.had}, this usage says ${d.figma}`);
  }
  if (write) { writeFileSync(TSV, r.text); console.log(`\nwritten — ${TSV}`); }
  else console.log('\ndry run — pass --write to apply');
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (m) => { failures++; console.log(`  MISS ${m}`); };
  const H = 'name\tsize\tweight\tlineHeight\tletterSpacing\ttextCase';

  const line = 'These styles are contained in the design: Desktop text/Label text: Font(family: '
    + '"Open Sans", style: Regular, size: 13, weight: 400, lineHeight: 100, letterSpacing: 0), '
    + 'Desktop text/Large heading (light): Font(family: "Open Sans", style: Light, size: 24, weight: 300, lineHeight: 100, letterSpacing: 0).';
  const found = scanStyles([line]);
  if (found.size !== 2) miss(`both styles on one line must be parsed (got ${found.size})`);
  if (found.get('Desktop text/Large heading (light)')?.weight !== 300) miss('a Light style must report weight 300');

  // THE CASE THIS EXISTS FOR: a blank weight Figma actually knows.
  let r = backfill(`${H}\nDesktop text/Label text\t13\t\tAUTO\t0%\tORIGINAL\n`, found);
  if (r.filled.length !== 1 || r.filled[0].weight !== 'Regular') miss(`a blank weight must be filled from Figma (got ${JSON.stringify(r.filled)})`);
  if (!r.text.includes('Label text\t13\tRegular')) miss('the filled weight must land in the weight column');

  // 300 must become the extract's word for it, not the number.
  r = backfill(`${H}\nDesktop text/Large heading (light)\t24\t\tAUTO\t0%\tORIGINAL\n`, found);
  if (!r.text.includes('\tLight\t')) miss('weight 300 must be written as Light, the vocabulary the extract uses');

  // AN EXISTING WEIGHT IS NEVER OVERWRITTEN, and a disagreement is reported rather than applied.
  r = backfill(`${H}\nDesktop text/Label text\t13\tSemiBold\tAUTO\t0%\tORIGINAL\n`, found);
  if (r.filled.length) miss('a weight already recorded must never be overwritten');
  if (r.disagree.length !== 1) miss('a disagreement must be REPORTED, not silently kept or applied');
  if (!r.text.includes('SemiBold')) miss('the existing weight must survive a disagreement');

  // A style Figma did not report is left exactly as it was.
  const src = `${H}\nMobile text/XXL heading (light)\t50\t\tAUTO\t0%\tORIGINAL\n`;
  r = backfill(src, found);
  if (r.filled.length || r.text !== src) miss('a style Figma did not report must be left untouched, byte for byte');

  // A weight Figma reports that has no word in the extract's vocabulary must NOT be invented.
  r = backfill(`${H}\nX\t10\t\tAUTO\t0%\tORIGINAL\n`, new Map([['X', { weight: 137 }]]));
  if (r.filled.length) miss('an unknown weight number must not be written as a made-up word');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a blank weight is filled from what Figma reports and written in the '
    + "extract's own vocabulary, an existing weight is never overwritten and a disagreement is "
    + 'reported, and an unreported style or unknown weight is left alone rather than invented');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
