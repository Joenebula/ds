#!/usr/bin/env node
// Pulls the Figma TEXT STYLE batches out of the session transcripts and writes
// tokens/_raw/text-styles.tsv.
//
//   node scripts/extract-text-styles.mjs             report only, touch nothing
//   node scripts/extract-text-styles.mjs --write     write the file
//   node scripts/extract-text-styles.mjs --self-test
//
// A third of the styles resolve their weight only through a bound variable, and some resolve it
// through neither — which is recorded as a gap rather than guessed.
//
// Two batch shapes. EVERY COLUMN IS PRESENT, including empty trailing ones — a batch truncated
// mid-row is otherwise indistinguishable from a complete one:
//
//   TEXTSTYLES\t<group>          COUNT <n>   name size style lineHeight letterSpacing textCase
//   TEXTBOUND\t<group>           COUNT <n>   name size style fontWeightVar fontStyleVar - sizeVar
//
// THIS FILE IS WRITTEN WHOLE, NOT MERGED. The 23 styles are one flat set with no page concept,
// so a partial run would produce a partial file. Two things now stop that being silent:
//   * every transcript is read, not the one with the lexicographically-last filename, so a run
//     spanning two sessions still sees every batch;
//   * a write that would SHRINK the file is refused, and names what it would have dropped.
//     An extract that loses styles and reports success is the failure this repo keeps finding.
import { readFileSync, writeFileSync } from 'node:fs';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches, parseBatch } from './lib/transcript.mjs';

const TSV = 'tokens/_raw/text-styles.tsv';
const HEADER = 'name\tsize\tweight\tlineHeight\tletterSpacing\ttextCase';
const COLUMNS = { TEXTSTYLES: 6, TEXTBOUND: 7 };

// Two Figma styles genuinely share the name "Desktop text/Button text" — 16px sentence case and
// 13px uppercase. Key on name+size so they stay distinct.
const key = (name, size) => `${String(name || '').trim()}|${String(size || '').trim()}`;

// Figma's Weight/* variables are the authoritative weight where the font's own style is unset.
// Everything else stays blank and is reported, never guessed.
const FROM_VAR = { 'Weight/Regular': 'Regular', 'Weight/Bold': 'SemiBold' };

export function readBatches(batches) {
  const blocks = { TEXTSTYLES: [], TEXTBOUND: [] };
  const errors = [];
  for (const b of batches) {
    const kind = b.slice(0, b.indexOf('\t'));
    const p = parseBatch(b, { headerLines: 2, columns: COLUMNS[kind], label: kind });
    errors.push(...p.errors);
    if (p.errors.length) continue;       // never half-import a batch we know is damaged
    blocks[kind].push(...p.lines.map((l) => l.split('\t')).filter((c) => c[0]));
  }

  const styles = new Map();
  for (const c of blocks.TEXTSTYLES) {
    styles.set(key(c[0], c[1]), {
      name: c[0], size: c[1], style: c[2] || '',
      lineHeight: c[3] || '', letterSpacing: c[4] || '', textCase: c[5] || 'ORIGINAL',
      weightVar: '', sizeVar: '',
    });
  }
  for (const c of blocks.TEXTBOUND) {
    const s = styles.get(key(c[0], c[1]));
    if (!s) continue;
    if (!s.style && c[2]) s.style = c[2];
    // Figma binds the WEIGHT variable under boundVariables.fontStyle, not .fontWeight — reading
    // the obvious-looking field returns nothing and makes a third of the styles look weightless.
    // Prefer fontStyle, fall back to fontWeight.
    s.weightVar = c[4] || c[3] || '';
    s.sizeVar = c[6] || '';
  }

  const rows = []; const noWeight = [];
  for (const s of styles.values()) {
    const weight = s.style || FROM_VAR[s.weightVar] || '';
    if (!weight) noWeight.push(`${s.name} (${s.size}px)`);
    rows.push([s.name, s.size, weight, s.lineHeight, s.letterSpacing, s.textCase].join('\t'));
  }
  return { styles, rows, noWeight, errors };
}

// What the new set would drop. Keyed on name+size, the same identity the styles themselves use.
export function wouldLose(existingText, rows) {
  const idOf = (line) => { const c = line.split('\t'); return key(c[0], c[1]); };
  const have = new Set(rows.map(idOf));
  return (existingText || '').replace(/\n+$/, '').split('\n').slice(1)
    .filter((l) => l.trim()).map(idOf).filter((id) => !have.has(id));
}

function main() {
  const write = process.argv.includes('--write');
  const shrink = process.argv.includes('--shrink');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = args.length ? args.map((p) => ({ path: p })) : transcriptFiles(TRANSCRIPT_DIR);
  if (!files.length) { console.error(`no transcripts in ${TRANSCRIPT_DIR}`); process.exit(1); }

  const batches = scrapeBatches(files.map((f) => f.path), /^(TEXTSTYLES|TEXTBOUND)\t.+\nCOUNT \d+/);
  const { styles, rows, noWeight, errors } = readBatches(batches);

  console.log(`transcripts read : ${files.length}`);
  console.log(`batches parsed   : ${batches.length}`);
  if (errors.length) {
    console.log(`DAMAGED BATCHES  : ${errors.length}`);
    for (const e of errors) console.log(`    ${e}`);
    console.error('\nrefusing to write. A batch that disagrees with its own COUNT is a truncated read.');
    process.exit(1);
  }
  if (!styles.size) { console.error('no text-style batches found in the transcripts'); process.exit(1); }

  console.log(`text styles read : ${styles.size}`);
  console.log(`line heights     : ${[...new Set([...styles.values()].map((s) => s.lineHeight))].join(', ')}`);
  console.log(`letter spacings  : ${[...new Set([...styles.values()].map((s) => s.letterSpacing))].join(', ')}`);
  console.log(`weights present  : ${[...new Set([...styles.values()].map((s) => s.style).filter(Boolean))].join(', ')}`);
  if (noWeight.length) {
    console.log(`NO WEIGHT in Figma (${noWeight.length}) — neither a font style nor a bound variable:`);
    for (const n of noWeight) console.log(`    ${n}`);
  }

  let existing = '';
  try { existing = readFileSync(TSV, 'utf8'); } catch { /* first run */ }
  const losing = wouldLose(existing, rows);
  if (losing.length) {
    console.log(`WOULD LOSE       : ${losing.length} style(s) already captured and absent from this read`);
    for (const l of losing) console.log(`    ${l.replace('|', ' @ ')}px`);
    if (write && !shrink) {
      console.error('\nrefusing to write. This file is written whole, so writing now would delete '
        + 'those styles. Either read the missing ones (their batches are still in an older '
        + 'transcript, which this script now reads) or pass --shrink if they are genuinely gone '
        + 'from Figma.');
      process.exit(1);
    }
  }

  if (write) {
    writeFileSync(TSV, HEADER + '\n' + rows.join('\n') + '\n');
    console.log(`\nwritten — ${TSV}, ${rows.length} rows`);
  } else console.log('\ndry run — pass --write to apply');
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (msg) => { failures++; console.log(`  MISS ${msg}`); };
  const B = (kind, n, ...rows) => `${kind}\tDesktop text\nCOUNT ${n}\n` + rows.join('\n');
  const S = (name, size, style, lh = 'AUTO', ls = '0%', tc = 'ORIGINAL') => [name, size, style, lh, ls, tc].join('\t');
  const T = (name, size, style, fw, fs, x, sz) => [name, size, style, fw, fs, x, sz].join('\t');

  // The weight comes from the font style, from the bound variable, or from nowhere — and
  // "nowhere" is recorded as a gap, never guessed.
  let r = readBatches([
    B('TEXTSTYLES', 3, S('T/A', '36', 'SemiBold'), S('T/B', '16', ''), S('T/C', '13', '')),
    B('TEXTBOUND', 2, T('T/B', '16', '', '', 'Weight/Bold', '', 'Size/M'), T('T/C', '13', '', '', '', '', '')),
  ]);
  if (r.errors.length) miss(`well-formed batches must parse (got ${JSON.stringify(r.errors)})`);
  if (!r.rows.some((l) => l.startsWith('T/A\t36\tSemiBold'))) miss("a style's own font style must be used as its weight");
  if (!r.rows.some((l) => l.startsWith('T/B\t16\tSemiBold'))) miss('Weight/Bold bound under fontStyle must resolve to SemiBold');
  if (r.noWeight.length !== 1 || !r.noWeight[0].startsWith('T/C')) miss(`a style with no weight anywhere must be REPORTED, not guessed (got ${JSON.stringify(r.noWeight)})`);
  if (r.rows.some((l) => l.startsWith('T/C\t13\t') && l.split('\t')[2] !== '')) miss('a style with no weight must be written blank, never filled in');

  // Figma binds weight under fontStyle, not fontWeight. Reading the obvious field loses a third
  // of the styles — the bug this preference exists for.
  r = readBatches([B('TEXTSTYLES', 1, S('T/D', '16', '')), B('TEXTBOUND', 1, T('T/D', '16', '', 'Weight/Regular', '', '', ''))]);
  if (!r.rows[0].startsWith('T/D\t16\tRegular')) miss('fontWeight must still be read as a fallback when fontStyle is empty');
  // With BOTH bound and disagreeing, fontStyle must win. Nothing else distinguishes the two
  // orders, so without this fixture the preference is asserted in a comment and tested nowhere.
  r = readBatches([B('TEXTSTYLES', 1, S('T/E', '16', '')), B('TEXTBOUND', 1, T('T/E', '16', '', 'Weight/Regular', 'Weight/Bold', '', ''))]);
  if (!r.rows[0].startsWith('T/E\t16\tSemiBold')) miss(`when both are bound, fontStyle must win over fontWeight (got ${JSON.stringify(r.rows[0])})`);

  // Two styles sharing a name must stay distinct — "Desktop text/Button text" is a real pair.
  r = readBatches([B('TEXTSTYLES', 2, S('Button text', '16', 'Regular'), S('Button text', '13', 'SemiBold'))]);
  if (r.rows.length !== 2) miss('two styles sharing a name at different sizes must stay distinct');
  if (wouldLose(HEADER + '\n' + r.rows.join('\n') + '\n', [r.rows[0]]).length !== 1) {
    miss('the loss check must key on name AND size, or one of a name-sharing pair hides the other');
  }

  // THE SHRINK CASE. This file is written whole, so a partial read would delete the rest.
  const existing = HEADER + '\nT/A\t36\tSemiBold\tAUTO\t0%\tORIGINAL\nT/Z\t12\tRegular\tAUTO\t0%\tORIGINAL\n';
  const lost = wouldLose(existing, ['T/A\t36\tSemiBold\tAUTO\t0%\tORIGINAL']);
  if (lost.length !== 1 || !lost[0].startsWith('T/Z')) miss(`a style that a partial read would delete must be named (got ${JSON.stringify(lost)})`);
  if (wouldLose(existing, existing.split('\n').slice(1, 3)).length) miss('a complete read must report losing nothing');

  // A DAMAGED BATCH must never reach the styles.
  r = readBatches([B('TEXTSTYLES', 3, S('T/A', '36', 'SemiBold'))]);
  if (!r.errors.some((e) => /TRUNCATED/.test(e))) miss('a batch short of its COUNT must be reported as damaged');
  if (r.styles.size) miss('a damaged batch must be imported from NOT AT ALL, not partially');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — weight resolves from the font style then the bound variable and is '
    + 'otherwise left blank and reported; two styles sharing a name stay distinct; a write that '
    + 'would delete captured styles is refused and names them; a truncated batch is not imported at all');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
