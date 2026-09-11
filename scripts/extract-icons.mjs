#!/usr/bin/env node
// Pulls the icon export batches out of the session transcripts and writes assets/icons/*.svg
// and tokens/_raw/icons.tsv.
//
//   node scripts/extract-icons.mjs              report only, touch nothing
//   node scripts/extract-icons.mjs --write      write the SVGs and the TSV
//   node scripts/extract-icons.mjs --check        just audit icons.tsv — no transcripts needed
//   node scripts/extract-icons.mjs --self-test
//
// IT USED TO WRITE ON EVERY INVOCATION. There was no --write flag at all, and the first
// positional argument was taken as a transcript path — so `extract-icons.mjs --write` tried to
// open a file called "--write" and, failing that, wrote anyway. It is the only script here that
// touches 293 files, and it was the only one with no dry run.
//
// Two batch shapes:
//   FROM <a> NEXT <b> OF <total> COUNT <n>   the bulk export
//   FILETYPE COUNT <n>                       the ten file-type badges, re-exported with their
//                                            badge colours intact after a blanket
//                                            fill->currentColor flattened them. These come later
//                                            in the transcript, so they supersede the flat ones.
// Rows are `<index>\t<name>\t<svg>`, parsed by the first two tab positions only, because an SVG
// path may itself contain tabs.
//
// WHY A TRUNCATED ROW MATTERS HERE. Arity cannot be checked — the payload swallows tabs — so
// truncation is caught by well-formedness instead: a row's SVG must both start with `<svg` and
// end with `</svg>`. A half-written icon is otherwise a perfectly plausible-looking row, and
// this repo has already shipped 293 icons that verify-icons.mjs called complete while ten of
// them were wrong.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches, parseBatch } from './lib/transcript.mjs';
import { inventory, variantNames } from './lib/inventory.mjs';

const TSV = 'tokens/_raw/icons.tsv';
const DIR = 'assets/icons';
// nodeId goes LAST, after the svg, for the same reason it does in component-variants.tsv: the two
// things that parse this file (sync-check.mjs reads index 1, the WOULD LOSE guard below reads
// index 2) are positional and neither reaches past index 2, so a trailing column is invisible to
// both. That only holds while the svg cell is tab-free, which build() now enforces rather than
// assumes — see normaliseCell.
const HEADER = 'index\tfigmaName\tfile\tsvg\tnodeId';

// A TAB INSIDE AN SVG WOULD MOVE THE nodeId COLUMN. Figma path data may legally contain tabs, and
// the wire format is built to survive them — the payload is taken from the second tab onward,
// which is why arity cannot be the truncation check here. But a tab written into the TSV's svg
// CELL would put the id at an unpredictable index and silently corrupt every reader that counts
// columns. None of the 293 current rows carries one, and that was luck rather than a rule. Tabs
// are whitespace in path data, so collapsing them to spaces changes no artwork; doing it here
// turns "no row happens to have a tab" into "no row can".
export const normaliseCell = (svg) => String(svg).replace(/\t/g, ' ');

// A COMPONENT SET'S VARIANT IS NOT AN ICON, and this extractor had no way to know that.
//
// Its whole accept test was well-formedness of the payload — an integer index and an SVG that
// starts <svg and ends </svg>. A variant renders as a perfectly whole SVG, so four of them sailed
// in as four separate icons: Size=L - 52px, Size=M - 44px, Size=S - 36px and Size=XS - 28px are
// the four sizes of `Circle icons` (6580:66319). slug() then stripped the one character that gave
// it away — [^a-z0-9]+ turns "Size=L - 52px" into the entirely plausible "size-l-52px" — and the
// file column is derived from that slug, so nothing downstream ever saw the "=".
//
// TWO LAYERS, AND THE STRUCTURAL ONE IS THE VERDICT. Figma names a variant node Property=Value, so
// an "=" in the name is decisive on its own and needs nothing else to be true. The inventory
// lookup is CORROBORATION ONLY: it turns "this looks like a variant" into "this is the Size
// variant of Circle icons", which is what a person needs in order to act. That split matters —
// the detector must not stop working because components.json is stale or absent.
//
// THE DASH IS NOT THE SIGNAL. `PDF - Warning` is a real icon and contains " - " exactly as the
// four bogus rows do. A dash heuristic would quietly drop it. Only the "=" is reliable.
export function variantOf(name, variants = new Map()) {
  const n = String(name || '').trim();
  if (!n.includes('=')) return null;
  return variants.get(n.toLowerCase()) || { set: null, nodeId: null, property: n.split('=')[0] };
}

// Rows already captured that are really a component set's variants. Reported, never deleted.
export function existingVariants(text, variants = new Map()) {
  const lines = String(text).replace(/\n+$/, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const iName = lines[0].split('\t').indexOf('figmaName');
  if (iName === -1) return [];
  const out = [];
  for (const l of lines.slice(1)) {
    const name = (l.split('\t')[iName] || '').trim();
    const v = name && variantOf(name, variants);
    if (v) out.push({ name, ...v });
  }
  return out;
}

// The nodeId already in the file, by Figma name. Header-keyed rather than positional, so it keeps
// working if the column ever moves — and it returns an empty map for a file that has no nodeId
// column at all, which is the state before the first backfill.
export function readIds(text) {
  const lines = String(text).replace(/\n+$/, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return new Map();
  const header = lines[0].split('\t');
  const iName = header.indexOf('figmaName'); const iId = header.indexOf('nodeId');
  const ids = new Map();
  // Deliberate belt-and-braces, and an EQUIVALENT MUTANT: deleting this line changes no
  // behaviour, because a missing column makes c[-1] undefined, which coerces to '' and is then
  // skipped by the `name && id` test below. It stays because relying on that coercion is
  // accidental correctness, and this file would rather say what it means.
  if (iName === -1 || iId === -1) return ids;
  for (const l of lines.slice(1)) {
    const c = l.split('\t');
    const name = (c[iName] || '').trim(); const id = (c[iId] || '').trim();
    if (name && id) ids.set(name, id);
  }
  return ids;
}
const MARKER = /^(FROM \d+ NEXT \d+ OF \d+ COUNT \d+|FILETYPE COUNT \d+)/;

export function readBatches(batches, variants = new Map()) {
  const icons = new Map();               // index -> { name, svg }; a later batch supersedes
  const errors = []; const refused = [];
  let total = 0;
  for (const b of batches) {
    const p = parseBatch(b, { headerLines: 1, label: 'icons' });   // arity unusable: SVGs hold tabs
    errors.push(...p.errors);
    if (p.errors.length) continue;
    const m = p.header[0].match(/OF (\d+)/);
    if (m) total = Math.max(total, +m[1]);
    const where = `icons "${p.header[0]}"`;
    const staged = [];
    let bad = false;
    for (const line of p.lines) {
      const tab1 = line.indexOf('\t');
      const tab2 = line.indexOf('\t', tab1 + 1);
      const idx = tab1 < 0 ? NaN : +line.slice(0, tab1);
      const svg = tab2 < 0 ? '' : line.slice(tab2 + 1);
      if (tab1 < 0 || tab2 < 0 || !Number.isInteger(idx)) {
        errors.push(`${where}: malformed row ${JSON.stringify(line.slice(0, 60))}`); bad = true; continue;
      }
      if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) {
        errors.push(`${where}: icon ${idx} is not a whole SVG — ${svg.startsWith('<svg')
          ? 'TRUNCATED, it never reached </svg>' : 'it does not begin with <svg'}`); bad = true; continue;
      }
      const name = line.slice(tab1 + 1, tab2);
      const variant = variantOf(name, variants);
      if (variant) { refused.push({ name, ...variant }); continue; }
      staged.push([idx, { name, svg }]);
    }
    if (bad) continue;                   // never half-import a batch we know is damaged
    for (const [idx, v] of staged) icons.set(idx, v);
  }
  return { icons, total, errors, refused };
}

// kebab-case filename, deduped — Figma has two `GIF` and two `Transfer`.
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon';

// Figma emits <mask id="path-5-inside-1_9598_97877"> and url(#...) references. Those ids are
// document-global, so two icons inlined on the same page would collide and one would render
// through the other's mask. Namespace per file.
export const namespaceIds = (svg, fileName) => {
  const ids = [...new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))];
  for (const id of ids) {
    const scoped = `${fileName}-${id}`;
    svg = svg.split(`id="${id}"`).join(`id="${scoped}"`).split(`url(#${id})`).join(`url(#${scoped})`);
  }
  return svg;
};

// `priorIds` carries an existing nodeId forward, keyed by the Figma NAME.
//
// WITHOUT THIS THE COLUMN IS WORSE THAN USELESS. icons.tsv is written WHOLE — that is why it
// refuses to shrink — so a re-extract rebuilds every row from batches that carry index, name and
// svg, and nothing else. The ids backfilled from components.json would be silently wiped by the
// next re-extract, which would then report success, and the sync gate would quietly lose the
// ability to tell a rename from a delete-plus-add all over again.
//
// Keyed by name rather than by index because a Figma export's index is its position in that read,
// which shifts; the name is what the id was looked up under. A row whose NAME changed does not
// carry its id, which is correct — that is a rename, and the backfill re-derives it under the new
// name from the inventory.
export function build(icons, priorIds = new Map()) {
  const used = new Map(); const files = []; const rows = []; let tabsFixed = 0;
  for (const idx of [...icons.keys()].sort((a, b) => a - b)) {
    const { name } = icons.get(idx);
    const base = slug(name);
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const fileName = n === 1 ? base : `${base}-${n}`;
    const svg = namespaceIds(icons.get(idx).svg, fileName);
    const cell = normaliseCell(svg);
    if (cell !== svg) tabsFixed++;
    files.push({ fileName, svg });
    rows.push([idx, name, fileName, cell, priorIds.get(String(name).trim()) || ''].join('\t'));
  }
  return { files, rows, tabsFixed };
}

// Collapse to ranges so the next export call is easy to aim.
export function gaps(icons, total) {
  const have = new Set(icons.keys()); const missing = [];
  for (let i = 0; i < total; i++) if (!have.has(i)) missing.push(i);
  const ranges = [];
  for (const i of missing) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === i - 1) last[1] = i; else ranges.push([i, i]);
  }
  return { missing, text: ranges.map(([a, b]) => (a === b ? a : `${a}-${b}`)).join(', ') };
}

// AUDIT THE FILE WITHOUT RE-EXTRACTING. The variant report below sits after the batch read, so it
// only appears during a real re-extract — and a re-extract needs a session whose transcripts hold
// ~30 heavy Figma reads. That would make the four misfiled rows invisible on every ordinary day,
// which is the same "nobody can see it" failure the whole gate exists to avoid. This path reads
// only icons.tsv and components.json, so anyone can ask the question at any time.
function check() {
  let text = '';
  try { text = readFileSync(TSV, 'utf8'); } catch {
    console.log(`no ${TSV} — nothing to audit`);
    process.exit(2);                 // vacuous: measured nothing
  }
  const rows = text.replace(/\n+$/, '').split('\n').filter((l) => l.trim()).length - 1;
  const variants = variantNames(inventory());
  const found = existingVariants(text, variants);

  console.log(`${rows} captured icon(s); ${variants.size} variant name(s) known from the inventory`);
  if (!found.length) { console.log('no captured row is a component set\'s variant'); process.exit(0); }

  console.log(`\n${found.length} captured row(s) are VARIANTS, not icons:`);
  for (const r of found) {
    console.log(`    ${r.name}${r.set ? `  — the ${r.property} variant of ${r.set} (${r.nodeId})` : ''}`);
  }
  console.log('\nLeft in place on purpose. They are real artwork, misfiled — deleting them would');
  console.log('lose drawings that cannot be re-fetched while the Figma asset host is blocked, and');
  console.log('which size is "the" icon is a designer\'s call. The extractor now refuses to import');
  console.log('them, so the next re-extract will surface them through WOULD LOSE for a decision.');
  process.exit(1);
}

function main() {
  const write = process.argv.includes('--write');
  const shrink = process.argv.includes('--shrink');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const tfiles = args.length ? args.map((p) => ({ path: p })) : transcriptFiles(TRANSCRIPT_DIR);
  if (!tfiles.length) { console.error(`no transcripts in ${TRANSCRIPT_DIR}`); process.exit(1); }

  const batches = scrapeBatches(tfiles.map((f) => f.path), MARKER);
  // Corroboration only — a stale or missing components.json must not stop the structural test.
  const variants = variantNames(inventory());
  const { icons, total, errors, refused } = readBatches(batches, variants);

  console.log(`transcripts read : ${tfiles.length}`);
  console.log(`batches parsed   : ${batches.length}`);
  if (errors.length) {
    console.log(`DAMAGED BATCHES  : ${errors.length}`);
    for (const e of errors.slice(0, 20)) console.log(`    ${e}`);
    if (errors.length > 20) console.log(`    ... and ${errors.length - 20} more`);
    console.error('\nrefusing to write. A truncated icon is a plausible-looking row, and writing '
      + 'it would put a half-drawn glyph in the library under a name that says it is whole.');
    process.exit(1);
  }
  if (!icons.size) { console.error('no icon batches found in the transcripts'); process.exit(1); }

  // Read the ids already in the file BEFORE rebuilding it. build() writes every row from the
  // batches, which carry no id, so without this the next re-extract silently wipes the lot.
  let priorText = '';
  try { priorText = readFileSync(TSV, 'utf8'); } catch { /* first run */ }
  const priorIds = readIds(priorText);

  // Anything this read kept out, and anything already in the file that should never have got in.
  // The two are reported separately because they need different things from a person: one is a
  // batch to re-emit correctly, the other is artwork to re-file.
  if (refused.length) {
    console.log(`REFUSED          : ${refused.length} row(s) are a component set's VARIANTS, not icons`);
    for (const r of refused) {
      console.log(`    ${r.name}${r.set ? `  — the ${r.property} variant of ${r.set} (${r.nodeId})` : ''}`);
    }
  }
  const alreadyIn = existingVariants(priorText, variants);
  if (alreadyIn.length) {
    console.log(`ALREADY IN FILE  : ${alreadyIn.length} captured row(s) are variants, not icons`);
    for (const r of alreadyIn) {
      console.log(`    ${r.name}${r.set ? `  — the ${r.property} variant of ${r.set} (${r.nodeId})` : ''}`);
    }
    console.log('    left in place: they are real artwork, misfiled. Deleting them would lose');
    console.log('    drawings the asset host is currently blocking, and which size is "the" icon');
    console.log('    is a designer\'s call. Refusing them on import means a whole-file rewrite');
    console.log('    would drop them — see WOULD LOSE below, which puts that to a person.');
  }

  const { files, rows, tabsFixed } = build(icons, priorIds);
  if (priorIds.size) console.log(`node ids carried : ${priorIds.size} from the existing file`);
  if (tabsFixed) {
    console.log(`tabs normalised  : ${tabsFixed} svg cell(s) held a tab, collapsed to spaces so `
      + 'the nodeId column stays at a fixed index');
  }
  const g = gaps(icons, total);
  console.log(`icons read       : ${icons.size} of ${total}`);
  if (g.missing.length) console.log(`MISSING (${g.missing.length}): ${g.text}`);
  else console.log('complete — no gaps');

  // This file is written whole. An icon already captured and absent from this read would be
  // deleted from the TSV while its .svg stayed on disk — the two would disagree, and nothing
  // would say so.
  let existing = '';
  try { existing = readFileSync(TSV, 'utf8'); } catch { /* first run */ }
  const have = new Set(files.map((f) => f.fileName));
  const losing = existing.replace(/\n+$/, '').split('\n').slice(1)
    .filter((l) => l.trim()).map((l) => l.split('\t')[2]).filter((f) => f && !have.has(f));
  if (losing.length) {
    console.log(`WOULD LOSE       : ${losing.length} icon(s) already captured and absent from this read`);
    for (const l of losing.slice(0, 20)) console.log(`    ${l}`);
    if (write && !shrink) {
      console.error('\nrefusing to write. Their batches may still be in an older transcript, which '
        + 'this script now reads. Pass --shrink if they are genuinely gone from Figma.');
      process.exit(1);
    }
  }

  if (write) {
    mkdirSync(DIR, { recursive: true });
    for (const f of files) writeFileSync(join(DIR, f.fileName + '.svg'), f.svg + '\n');
    writeFileSync(TSV, HEADER + '\n' + rows.join('\n') + '\n');
    // An .svg on disk that no row claims is a leftover from an earlier run, and every reader
    // goes through the TSV — so it is invisible rather than harmful, which is exactly why it
    // needs saying out loud.
    const orphans = readdirSync(DIR).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, ''))
      .filter((f) => !have.has(f));
    console.log(`\nwritten — ${files.length} SVGs and ${rows.length} rows`);
    if (orphans.length) console.log(`ORPHANED on disk : ${orphans.length} .svg no row claims — ${orphans.slice(0, 10).join(', ')}`);
  } else console.log('\ndry run — pass --write to apply');
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (msg) => { failures++; console.log(`  MISS ${msg}`); };
  const SVG = (d) => `<svg viewBox="0 0 16 16"><path d="${d}"/></svg>`;
  const B = (n, ...rows) => `FROM 0 NEXT ${n} OF 4 COUNT ${n}\n` + rows.join('\n');

  let r = readBatches([B(2, `0\tTick\t${SVG('M0 0')}`, `1\tFilter\t${SVG('M1 1')}`)]);
  if (r.errors.length) miss(`well-formed batches must parse (got ${JSON.stringify(r.errors)})`);
  if (r.icons.size !== 2 || r.total !== 4) miss('a batch must yield its icons and its declared total');

  // THE TRUNCATION CASE, and the reason this script checks well-formedness instead of arity.
  // The row count agrees; only the missing </svg> gives it away.
  r = readBatches([B(2, `0\tTick\t${SVG('M0 0')}`, '1\tFilter\t<svg viewBox="0 0 16 16"><path d="M1')]);
  if (!r.errors.some((e) => /TRUNCATED, it never reached/.test(e))) miss('an SVG cut off mid-path must fail even when the COUNT agrees');
  if (r.icons.size) miss('a damaged batch must be imported from NOT AT ALL, not partially');

  r = readBatches([B(1, '0\tTick\tnot an svg at all')]);
  if (!r.errors.some((e) => /does not begin with/.test(e))) miss('a row whose payload is not an SVG must fail');

  // A short batch.
  r = readBatches([B(3, `0\tTick\t${SVG('M0 0')}`)]);
  if (!r.errors.some((e) => /COUNT says 3/.test(e))) miss('a batch short of its COUNT must fail');

  // An SVG containing a TAB must survive — the payload is taken from the second tab onward, and
  // this is why arity cannot be the truncation check here.
  r = readBatches([B(1, `0\tTick\t<svg viewBox="0 0 16 16">\t<path d="M0 0"/></svg>`)]);
  if (r.errors.length || r.icons.size !== 1) miss(`an SVG containing a tab must survive (got ${JSON.stringify(r.errors)})`);

  // A later batch supersedes an earlier one — how the FILETYPE re-export replaces the flattened ten.
  r = readBatches([B(1, `0\tTick\t${SVG('FLAT')}`), `FILETYPE COUNT 1\n0\tTick\t${SVG('COLOURED')}`]);
  if (!r.icons.get(0).svg.includes('COLOURED')) miss('a later batch must supersede an earlier one for the same index');

  // Duplicate Figma names must get distinct filenames — Figma has two `GIF` and two `Transfer`.
  const { files } = build(new Map([[0, { name: 'GIF', svg: SVG('a') }], [1, { name: 'GIF', svg: SVG('b') }]]));
  if (files[0].fileName !== 'gif' || files[1].fileName !== 'gif-2') miss(`duplicate names must get distinct files (got ${files.map((f) => f.fileName)})`);

  // Ids must be namespaced per file or two icons on one page render through each other's masks.
  const ns = namespaceIds('<svg><mask id="m1"/><g mask="url(#m1)"/></svg>', 'tick');
  if (!ns.includes('id="tick-m1"') || !ns.includes('url(#tick-m1)')) miss('ids and their url(#) references must both be namespaced');
  // ...and build() must actually CALL it. Testing the helper alone proves the helper works, not
  // that anything uses it — build() could quietly stop and this self-test would still pass.
  const nsed = build(new Map([[0, { name: 'Tick', svg: '<svg><mask id="m1"/><g mask="url(#m1)"/></svg>' }]]));
  if (!nsed.files[0].svg.includes('id="tick-m1"')) miss('build() must namespace the ids it writes, not just be able to');
  if (!nsed.rows[0].includes('id="tick-m1"')) miss('the TSV row must carry the namespaced SVG, not the raw one');

  // ---- what an icon is NOT ------------------------------------------------------------------
  // The gap that let four of Circle icons' size variants into the library as four icons. The
  // self-test asserted ten things about transport and nothing about semantics, so the extractor
  // was never able to fail on this.
  {
    const VARIANTS = new Map([['size=l - 52px',
      { set: 'Circle icons', nodeId: '6580:66319', property: 'Size' }]]);

    // The structural test is the verdict and stands alone.
    const v = variantOf('Size=L - 52px', VARIANTS);
    if (!v || v.set !== 'Circle icons') miss('a Property=Value name must be identified as a variant');
    if (variantOf('Size=XS - 28px', VARIANTS)?.set !== null) {
      miss('a Property=Value name the inventory does not know must STILL be refused — the "=" is '
        + 'decisive on its own, or a stale components.json would silently re-open the hole');
    }
    if (variantOf('Size=L - 52px', new Map())) {
      // corroboration absent is fine, but it must still refuse
      if (variantOf('Size=L - 52px', new Map()).set !== null) miss('no inventory must still refuse');
    }

    // THE FALSE POSITIVE THAT WOULD QUIETLY DROP A REAL ICON. `PDF - Warning` is a genuine icon
    // and contains " - " exactly as the bogus rows do. A dash heuristic would eat it.
    for (const good of ['PDF - Warning', 'Tick', 'Address book', 'Circle icons', '24 hours']) {
      if (variantOf(good, VARIANTS)) miss(`"${good}" is a real icon name and must NOT be refused`);
    }

    // And the refusal must actually keep it out of the import, and be counted.
    const r = readBatches([B(2, `0\tTick\t${SVG('a')}\n1\tSize=L - 52px\t${SVG('b')}`)], VARIANTS);
    if (r.icons.size !== 1 || !r.icons.get(0)) {
      miss(`a variant row must not be imported (got ${r.icons.size} icon(s))`);
    }
    if (r.icons.has(1)) miss('the variant row specifically must be the one kept out');
    if (r.refused.length !== 1 || r.refused[0].name !== 'Size=L - 52px') {
      miss(`a refusal must be COUNTED and NAMED, never silent (got ${JSON.stringify(r.refused)})`);
    }
    if (r.errors.length) miss('a refused variant is not a damaged batch — it must not error the run');

    // Rows already in the file are found and reported, so the defect is visible from the tool
    // that caused it rather than only from prose in CLAUDE.md.
    const tsvText = 'index\tfigmaName\tfile\tsvg\tnodeId\n'
      + '0\tTick\ttick\t<svg/>\t1:1\n225\tSize=L - 52px\tsize-l-52px\t<svg/>\t\n';
    const found = existingVariants(tsvText, VARIANTS);
    if (found.length !== 1 || found[0].set !== 'Circle icons') {
      miss(`variants already captured must be reported (got ${JSON.stringify(found)})`);
    }
    if (existingVariants('', VARIANTS).length) miss('an empty file must yield no variants');
  }

  // ---- the nodeId column ------------------------------------------------------------------
  // THE FAILURE THIS BLOCK EXISTS FOR. icons.tsv is written whole from batches that carry no id,
  // so without carry-forward a re-extract wipes every backfilled nodeId and reports success — the
  // gate would silently lose the ability to tell a rename from a delete-plus-add, which is the
  // entire reason the column was added.
  {
    const prior = readIds('index\tfigmaName\tfile\tsvg\tnodeId\n0\tTick\ttick\t<svg/>\t12:34\n');
    if (prior.get('Tick') !== '12:34') miss(`readIds must read the id by header (got ${prior.get('Tick')})`);

    const kept = build(new Map([[0, { name: 'Tick', svg: SVG('a') }]]), prior);
    if (!kept.rows[0].endsWith('\t12:34')) {
      miss('a re-extract MUST carry an existing nodeId forward — without this the next re-extract '
        + 'silently wipes every id and reports success');
    }
    // A row whose NAME changed must NOT inherit the old id: that is a rename, and the backfill
    // re-derives it from the inventory under the new name. Inheriting would pin the wrong node.
    const renamed = build(new Map([[0, { name: 'Tick circle', svg: SVG('a') }]]), prior);
    if (renamed.rows[0].endsWith('\t12:34')) {
      miss('a renamed row must not inherit the previous name\'s id — it is a different name and '
        + 'the id must be re-derived, not assumed');
    }
    // A file with no nodeId column yet — the state before the first backfill — is not an error.
    if (readIds('index\tfigmaName\tfile\tsvg\n0\tTick\ttick\t<svg/>\n').size !== 0) {
      miss('a file with no nodeId column must yield no ids rather than throwing');
    }
    if (readIds('').size !== 0) miss('an empty file must yield no ids');
  }

  // A TAB in an svg cell would move the nodeId column. Tabs are legal in path data and the wire
  // format deliberately survives them, so the TSV cell has to be the place that cannot carry one.
  {
    const tabbed = build(new Map([[0, { name: 'Tick', svg: '<svg>\t<path d="M0 0"/></svg>' }]]),
      new Map([['Tick', '9:9']]));
    const cells = tabbed.rows[0].split('\t');
    if (cells.length !== 5) miss(`a tab in an svg must not add a column (got ${cells.length})`);
    if (cells[4] !== '9:9') {
      miss('the nodeId must stay at index 4 however the svg is shaped — otherwise a tab in path '
        + 'data silently corrupts every reader that counts columns');
    }
    if (!tabbed.tabsFixed) miss('normalising a tab must be COUNTED, not done in silence');
  }

  // Gaps must be reported as ranges so the next export is easy to aim.
  const g = gaps(new Map([[0, {}], [3, {}]]), 6);
  if (g.text !== '1-2, 4-5') miss(`gaps must collapse to ranges (got ${JSON.stringify(g.text)})`);

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — an SVG cut off mid-path fails even when the COUNT agrees, a damaged '
    + 'batch is not imported at all, a tab inside an SVG survives, a re-export supersedes, duplicate '
    + 'names get distinct files, ids are namespaced per file, and gaps report as ranges');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  if (process.argv.includes('--check')) { check(); process.exit(0); }
  main();
}
