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
import { TRANSCRIPT_DIR, transcriptFiles, scrapeFigma } from './lib/transcript.mjs';

const TSV = 'tokens/_raw/text-styles.tsv';
const MARKER = /These styles are contained in the design:/;
// This design system's file — the transcripts hold reads of two others.
const FILE_KEY = 'aRWjBnTvdLiG50xtwodGwH';

// The extract's vocabulary for a weight, as extract-text-styles.mjs writes it.
const WORD = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };

// The weight column also carries a SLANT, and that is deliberate rather than a mistake — see the
// note in backfill(). This is the one vocabulary the builder, the verifier and this script now
// share: a slant recorded in the weight column IS the weight beside it, in italic.
const SLANT = { Italic: 400 };

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
      //
      // EXCEPT THAT THE WEIGHT COLUMN ALSO HOLDS A SLANT, and this was the only reader that did not
      // know. `Italic` is not a weight: Figma reports the two italic styles as `style: Italic,
      // weight: 400`, and the extract records the slant in the weight column deliberately —
      // build-type-css.mjs says so in as many words and emits `font-weight: 400; font-style:
      // italic`, and verify-type.mjs checks exactly that. So comparing WORD[400] = 'Regular'
      // against 'Italic' reported a DISAGREEMENT on every run for ever: a verdict line carrying a
      // permanent false alarm is a number people learn to read past, which is this repo's own
      // diagnosis of the 286-NEW case.
      const agrees = cells[iWeight] === word || (SLANT[cells[iWeight]] !== undefined
        && SLANT[cells[iWeight]] === hit.weight && /italic/i.test(hit.style || ''));
      if (!agrees) disagree.push({ name: cells[iName], had: cells[iWeight], figma: word });
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
  // PROVENANCE. This is the only one of the three readers of this marker that WRITES, and its
  // name regex is the loosest of them — so a weight filled out of this repo's own quoted
  // documentation would land in text-styles.tsv, which the whole type layer is generated from.
  // Only Figma's own answers, and only this file's.
  const dc = scrapeFigma(files.map((f) => f.path), MARKER);
  const texts = dc.reads.filter((r) => !r.fileKey || r.fileKey === FILE_KEY).map((r) => r.text);
  const foreign = dc.reads.length - texts.length;
  const found = scanStyles(texts);

  console.log(`transcripts read : ${files.length}`);
  console.log(`style lists seen : ${texts.length} from Figma`
    + (foreign ? `, ${foreign} from ANOTHER Figma file (excluded)` : '')
    + (dc.unattributed ? `, ${dc.unattributed} unattributable` : ''));
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

  // THE WEIGHT COLUMN ALSO HOLDS A SLANT. `Italic` is not a weight — Figma reports the two italic
  // styles as `style: Italic, weight: 400`, and the extract records the slant there deliberately.
  // This was the only reader that did not know, so it reported a DISAGREEMENT every run for ever.
  {
    const it = scanStyles(['These styles are contained in the design: Desktop text/Body text (italic): '
      + 'Font(family: "Open Sans", style: Italic, size: 16, weight: 400, lineHeight: 100, letterSpacing: -1).']);
    const r2 = backfill(`${H}\nDesktop text/Body text (italic)\t16\tItalic\tAUTO\t-1%\tORIGINAL\n`, it);
    if (r2.disagree.length) {
      miss(`a slant recorded in the weight column is not a disagreement with the weight beside it `
        + `(got ${JSON.stringify(r2.disagree)})`);
    }
    // And it must not become a way to wave anything through: a REAL difference on an italic row
    // still has to be reported.
    const wrong = scanStyles(['These styles are contained in the design: Desktop text/Body text (italic): '
      + 'Font(family: "Open Sans", style: Italic, size: 16, weight: 600, lineHeight: 100, letterSpacing: -1).']);
    if (!backfill(`${H}\nDesktop text/Body text (italic)\t16\tItalic\tAUTO\t-1%\tORIGINAL\n`, wrong).disagree.length) {
      miss('an italic row whose WEIGHT really differs must still be reported');
    }
    // A non-italic usage reported against an Italic row is a real disagreement too.
    const upright = scanStyles(['These styles are contained in the design: Desktop text/Body text (italic): '
      + 'Font(family: "Open Sans", style: Regular, size: 16, weight: 400, lineHeight: 100, letterSpacing: -1).']);
    if (!backfill(`${H}\nDesktop text/Body text (italic)\t16\tItalic\tAUTO\t-1%\tORIGINAL\n`, upright).disagree.length) {
      miss('a row recorded Italic that Figma reports upright IS a disagreement');
    }
  }

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
