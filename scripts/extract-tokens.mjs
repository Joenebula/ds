#!/usr/bin/env node
// Extract the COLOUR TOKEN LAYER from a Figma Variables API response.
//
//   node scripts/extract-tokens.mjs                    dry run — report, write nothing
//   node scripts/extract-tokens.mjs --write            apply additions
//   node scripts/extract-tokens.mjs --write --update   apply additions AND corrections
//   node scripts/extract-tokens.mjs --self-test
//
// WHY THIS EXISTS, AND WHY IT IS THE LAST THING TO BE BUILT. Every other extractor in this repo
// reads Figma through the MCP tools. The token layer cannot be: `semantic.tsv` needs a LIGHT
// value, a DARK value and the scopes for every token, and `get_variable_defs` resolves exactly
// one mode and takes no mode parameter. There is no way to ask it for the other one.
//
// The Variables REST API carries both modes plus the scopes, and it is the only thing that does.
// It lives on api.figma.com, which this environment's egress policy denies (CONNECT tunnel
// failed, 403), so the response has to be fetched by a person and dropped in as a file:
//
//   GET https://api.figma.com/v1/files/aRWjBnTvdLiG50xtwodGwH/variables/local
//   X-Figma-Token: <a PAT with the file_variables:read scope — Enterprise plan only>
//   -> tokens/_raw/figma-variables.json
//
// This script makes NO network calls. It reads that file and nothing else.
//
// WHAT IT IS FOR. As of 2026-09-11, 63 captured variant rows across 26 components bind a colour
// Figma uses and this repo has never held — Border/Default full and hidden, Background/Light
// theme, and the whole Navigation/* collection. Every one of those pairs is IDENTICAL IN LIGHT
// MODE and differs only in dark. That is why they were left stale rather than substituted: a
// guess would have passed every light-mode check and every screenshot ever taken of it, and been
// wrong in dark. This script is what ends that, and every rule below exists to stop it ending it
// the wrong way.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const RAW = 'tokens/_raw';
const INPUT = `${RAW}/figma-variables.json`;
const SEMANTIC = `${RAW}/semantic.tsv`;
const PRIMITIVES = `${RAW}/primitives.tsv`;

// Both files are HEADERLESS — that is the existing convention, not an oversight, and adding a
// header here would break every reader that takes line 0 as data.
//   semantic.tsv    name \t light \t dark \t scopes      values are "@Alias" or "#hex"
//   primitives.tsv  name \t hex

// WHICH FILE A TOKEN BELONGS IN, by the first segment of its Figma name. The repo splits colours
// into a primitive layer (raw ramp values, deliberately scoped out of every Figma picker) and a
// semantic layer (what a designer can actually pick). Figma's own collection names do not carry
// that split, so the name prefix is what decides it — and it is what both TSVs are keyed on.
const PRIMITIVE_PREFIXES = new Set(['Base colours', 'Theme']);
const SEMANTIC_PREFIXES = new Set([
  'Background', 'Border', 'Buttons', 'Charts', 'Filter menu', 'Icons',
  'Org cards', 'Progress bar', 'Table', 'Tags', 'Text',
]);

const prefixOf = (name) => String(name).split('/')[0].trim();

// ---------------------------------------------------------------------------
// A Figma colour is four floats in 0..1. Alpha is NOT decorative here: Navigation/Search bg is
// #ffffffe5, a translucent white, and dropping its alpha would silently make it opaque.
export function hex(v) {
  if (!v || typeof v !== 'object') return null;
  const ch = (n) => Math.round(Math.max(0, Math.min(1, Number(n) || 0)) * 255)
    .toString(16).padStart(2, '0');
  const base = `#${ch(v.r)}${ch(v.g)}${ch(v.b)}`;
  return v.a === undefined || v.a >= 1 ? base : `${base}${ch(v.a)}`;
}

// WHICH MODE IS LIGHT AND WHICH IS DARK — the whole reason this script exists, and the one place
// a wrong answer is invisible. It is resolved BY NAME, never by position and never by
// defaultModeId: "default" is whichever mode the designer happened to leave selected, and a
// collection whose modes are ordered dark-first would silently invert the entire design system.
//
// A single-mode collection is mode-stable and legitimately the same in both — the ten chart
// colours are exactly that. Anything else FAILS by name rather than being guessed at.
export function modesOf(collection) {
  const modes = (collection && collection.modes) || [];
  if (modes.length === 1) return { light: modes[0].modeId, dark: modes[0].modeId, stable: true };
  const find = (re) => modes.find((m) => re.test(String(m.name)));
  const light = find(/^\s*light\s*$/i) || find(/light/i);
  const dark = find(/^\s*dark\s*$/i) || find(/dark/i);
  if (!light || !dark || light.modeId === dark.modeId) {
    return { error: `collection "${collection && collection.name}" has modes `
      + `[${modes.map((m) => m.name).join(', ')}] — cannot tell which is light and which is dark. `
      + 'Naming a mode is a Figma-side fix; guessing here would invert dark mode silently' };
  }
  return { light: light.modeId, dark: dark.modeId, stable: false };
}

// One mode's value for one variable, as the TSV spells it: "@Referenced Name" or "#hex".
function valueAt(variable, modeId, byId) {
  const raw = variable.valuesByMode && variable.valuesByMode[modeId];
  if (raw === undefined) return { error: `no value for mode ${modeId}` };
  if (raw && raw.type === 'VARIABLE_ALIAS') {
    const target = byId[raw.id];
    // An alias to a variable the response does not contain is not resolvable to a name, and a
    // raw hex in its place would erase the aliasing the token layer is built on.
    if (!target) return { error: `aliases ${raw.id}, which is not in this response` };
    return { value: `@${target.name}` };
  }
  const h = hex(raw);
  return h ? { value: h } : { error: `value is not a colour: ${JSON.stringify(raw)}` };
}

// ---------------------------------------------------------------------------
export function readVariables(json) {
  const meta = (json && json.meta) || {};
  const byId = meta.variables || {};
  const collections = meta.variableCollections || {};
  const semantic = new Map(); const primitives = new Map();
  const errors = []; const unknown = new Map(); const skipped = [];

  const modeCache = new Map();
  const modesFor = (cid) => {
    if (!modeCache.has(cid)) modeCache.set(cid, modesOf(collections[cid]));
    return modeCache.get(cid);
  };

  for (const v of Object.values(byId)) {
    if (v.resolvedType !== 'COLOR') continue;       // dimensions and type live in other.json
    const name = String(v.name || '').trim();
    if (!name) continue;
    const prefix = prefixOf(name);

    // AN UNKNOWN COLLECTION IS REFUSED, NOT IMPORTED. This file also holds DEPRECATED COLOURS,
    // a second product theme (Configr), and the raw "1st (light)" / "2nd (light)" palette ramps.
    // Importing them wholesale would put into the shipped system precisely what the design lead
    // is retiring, and would do it in one silent run. Same gate sync-check.mjs applies to a new
    // component: a person decides, and until they do it is reported and left out.
    if (!PRIMITIVE_PREFIXES.has(prefix) && !SEMANTIC_PREFIXES.has(prefix)) {
      unknown.set(prefix, (unknown.get(prefix) || 0) + 1);
      continue;
    }

    const m = modesFor(v.variableCollectionId);
    if (m.error) { errors.push(`"${name}": ${m.error}`); continue; }

    if (PRIMITIVE_PREFIXES.has(prefix)) {
      // A primitive is a raw value by definition. An aliased one is a semantic in the wrong place.
      const lv = valueAt(v, m.light, byId);
      if (lv.error) { errors.push(`"${name}": ${lv.error}`); continue; }
      if (lv.value.startsWith('@')) {
        errors.push(`"${name}" is a primitive but aliases ${lv.value} — primitives hold raw values`);
        continue;
      }
      primitives.set(name, lv.value);
      continue;
    }

    const lv = valueAt(v, m.light, byId);
    const dv = valueAt(v, m.dark, byId);
    if (lv.error || dv.error) {
      errors.push(`"${name}": ${lv.error || dv.error}`);
      continue;
    }
    semantic.set(name, {
      light: lv.value,
      dark: dv.value,
      // The TSV joins scopes with "+" — FRAME_FILL+SHAPE_FILL. Figma gives an array.
      scopes: Array.isArray(v.scopes) ? v.scopes.join('+') : '',
      stable: m.stable,
    });
  }
  return { semantic, primitives, errors, unknown, skipped };
}

// ---------------------------------------------------------------------------
// Merge into a headerless TSV keyed on the first column.
//
// REFUSES TO SHRINK, like text-styles.tsv and icons.tsv. These files are written WHOLE, so a
// partial response would delete every token it did not mention and the run would report success.
// A write that would drop a captured token is refused and names what it would have lost.
export function merge(text, incoming, { update = false, shrink = false, columns = 4 } = {}) {
  const lines = String(text).replace(/\n+$/, '').split('\n').filter((l) => l.trim());
  const existing = new Map();
  const order = [];
  for (const l of lines) {
    const c = l.split('\t');
    existing.set(c[0], c.slice(1));
    order.push(c[0]);
  }

  const added = []; const changed = []; const errors = [];
  const missing = [...existing.keys()].filter((k) => !incoming.has(k));
  if (missing.length && !shrink) {
    errors.push(`${missing.length} captured token(s) are absent from this response and would be `
      + `DELETED: ${missing.join(', ')}. A partial read looks exactly like a deletion. Pass `
      + '--shrink only if they are genuinely gone from Figma');
  }

  for (const [name, cells] of incoming) {
    const want = cells.slice(0, columns - 1);
    if (!existing.has(name)) { added.push(name); existing.set(name, want); order.push(name); continue; }
    const have = existing.get(name);
    const diff = want.map((w, i) => [i, (have[i] || ''), w]).filter(([, a, b]) => a !== b);
    if (!diff.length) continue;
    changed.push(`${name} — ${diff.map(([i, a, b]) => `col ${i + 2}: "${a}" -> "${b}"`).join('; ')}`);
    if (update) existing.set(name, want);
  }

  const out = order.map((n) => [n, ...existing.get(n)].join('\t').replace(/\t+$/, ''));
  return { text: out.join('\n') + '\n', added, changed, missing, errors };
}

// ---------------------------------------------------------------------------
function main() {
  const write = process.argv.includes('--write');
  const update = process.argv.includes('--update');
  const shrink = process.argv.includes('--shrink');

  if (!existsSync(INPUT)) {
    console.log(`${INPUT} is not here, so NOTHING WAS MEASURED — this is not a pass.\n`);
    console.log('It is a Figma Variables API response, which this environment cannot fetch:');
    console.log('  GET https://api.figma.com/v1/files/aRWjBnTvdLiG50xtwodGwH/variables/local');
    console.log('  X-Figma-Token: <PAT with the file_variables:read scope — Enterprise only>\n');
    console.log('Run it outside this container and save the response to that path.');
    process.exit(2);                 // vacuous, this repo's code for "measured nothing"
  }

  const json = JSON.parse(readFileSync(INPUT, 'utf8'));
  const r = readVariables(json);

  console.log(`variables read     : ${Object.keys((json.meta || {}).variables || {}).length}`);
  console.log(`collections        : ${Object.keys((json.meta || {}).variableCollections || {}).length}`);
  console.log(`semantic colours   : ${r.semantic.size}`);
  console.log(`primitive colours  : ${r.primitives.size}`);

  for (const [p, n] of [...r.unknown].sort()) {
    console.log(`  REFUSED  collection "${p}" — ${n} colour(s), not in this design system. `
      + 'Add it to SEMANTIC_PREFIXES or PRIMITIVE_PREFIXES once a person has decided it belongs');
  }
  for (const e of r.errors) console.log(`  ERROR    ${e}`);

  const sem = new Map([...r.semantic].map(([k, v]) => [k, [v.light, v.dark, v.scopes]]));
  const prim = new Map([...r.primitives].map(([k, v]) => [k, [v]]));

  let failed = r.errors.length > 0;
  for (const [path, incoming, columns] of [[SEMANTIC, sem, 4], [PRIMITIVES, prim, 2]]) {
    const m = merge(readFileSync(path, 'utf8'), incoming, { update, shrink, columns });
    console.log(`\n${path}`);
    console.log(`  ${m.added.length} new, ${m.changed.length} changed, ${m.missing.length} absent from the response`);
    for (const a of m.added) console.log(`    NEW          ${a}`);
    for (const c of m.changed) console.log(`    ${update ? 'CHANGED     ' : 'WOULD CHANGE'} ${c}`);
    for (const e of m.errors) { console.log(`    REFUSED      ${e}`); failed = true; }
    if (write && !m.errors.length) { writeFileSync(path, m.text); console.log('  written'); }
    else if (m.changed.length && !update) {
      console.log('  differences REPORTED AND NOT APPLIED — re-run with --update to apply them');
    }
  }

  if (!write) console.log('\ndry run — pass --write to apply'
    + (update ? '' : ', --update to apply corrections too'));
  console.log('\nAfter writing: npm run build && npm run check (WCAG, both modes) && npm run verify');
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {
  let f = 0;
  const miss = (m) => { f++; console.log(`  MISS ${m}`); };
  // A broken check must REPORT, not crash. Removing the guard in modesOf() made the self-test
  // throw a TypeError instead of printing MISS — which stops the mutant, but is indistinguishable
  // from the script being broken for some unrelated reason, and a mutation harness reads it as an
  // escape. Every group runs inside this, so a throw is itself a recorded failure.
  const group = (label, fn) => {
    try { fn(); } catch (e) { miss(`${label} — it THREW instead of reporting: ${e.message}`); }
  };

  // --- colour conversion -------------------------------------------------------------------
  if (hex({ r: 1, g: 1, b: 1, a: 1 }) !== '#ffffff') miss(`opaque white (got ${hex({ r: 1, g: 1, b: 1, a: 1 })})`);
  if (hex({ r: 0.2431, g: 0.2431, b: 0.2431, a: 1 }) !== '#3e3e3e') {
    miss(`Text/Primary must round to #3e3e3e (got ${hex({ r: 0.2431, g: 0.2431, b: 0.2431, a: 1 })})`);
  }
  // Navigation/Search bg is a TRANSLUCENT white. Dropping alpha makes it opaque and wrong, and
  // nothing downstream would ever report it.
  if (hex({ r: 1, g: 1, b: 1, a: 0.898 }) !== '#ffffffe5') {
    miss(`alpha must survive (got ${hex({ r: 1, g: 1, b: 1, a: 0.898 })})`);
  }

  // --- mode resolution ---------------------------------------------------------------------
  group('mode resolution', () => {
    const two = { name: 'Semantic', modes: [{ modeId: 'L', name: 'Light' }, { modeId: 'D', name: 'Dark' }] };
    if (modesOf(two).light !== 'L' || modesOf(two).dark !== 'D') miss('named modes must resolve');
    // ORDER MUST NOT DECIDE IT. A dark-first collection resolved by position inverts the system.
    const flipped = { name: 'Semantic', modes: [{ modeId: 'D', name: 'Dark' }, { modeId: 'L', name: 'Light' }] };
    if (modesOf(flipped).light !== 'L' || modesOf(flipped).dark !== 'D') {
      miss('a dark-first collection must still resolve by NAME — resolving by position inverts '
        + 'every colour in the design system, and no light-mode check would ever see it');
    }
    if (!modesOf({ name: 'Mystery', modes: [{ modeId: 'A', name: 'Mode 1' }, { modeId: 'B', name: 'Mode 2' }] }).error) {
      miss('modes that cannot be identified must FAIL, never be guessed');
    }
    if (modesOf({ name: 'Charts', modes: [{ modeId: 'X', name: 'Value' }] }).stable !== true) {
      miss('a single-mode collection is mode-stable, not an error — the ten chart colours are that');
    }
  });

  // --- reading a response ------------------------------------------------------------------
  const fixture = {
    meta: {
      variableCollections: {
        C: { id: 'C', name: 'Semantic', modes: [{ modeId: 'L', name: 'Light' }, { modeId: 'D', name: 'Dark' }] },
        P: { id: 'P', name: 'Primitive', modes: [{ modeId: 'M', name: 'Value' }] },
      },
      variables: {
        white: { name: 'Base colours/White', variableCollectionId: 'P', resolvedType: 'COLOR',
          valuesByMode: { M: { r: 1, g: 1, b: 1, a: 1 } }, scopes: [] },
        slate: { name: 'Base colours/Blue Charade', variableCollectionId: 'P', resolvedType: 'COLOR',
          valuesByMode: { M: { r: 0.1725, g: 0.1922, b: 0.2353, a: 1 } }, scopes: [] },
        bg: { name: 'Background/Primary', variableCollectionId: 'C', resolvedType: 'COLOR',
          valuesByMode: { L: { type: 'VARIABLE_ALIAS', id: 'white' }, D: { type: 'VARIABLE_ALIAS', id: 'slate' } },
          scopes: ['FRAME_FILL', 'SHAPE_FILL'] },
        navbg: { name: 'Navigation/Nav bg top', variableCollectionId: 'C', resolvedType: 'COLOR',
          valuesByMode: { L: { r: 1, g: 1, b: 1, a: 1 }, D: { r: 0, g: 0, b: 0, a: 1 } }, scopes: ['FRAME_FILL'] },
        dep: { name: 'DEPRECATED COLOURS/White', variableCollectionId: 'C', resolvedType: 'COLOR',
          valuesByMode: { L: { r: 1, g: 1, b: 1, a: 1 }, D: { r: 1, g: 1, b: 1, a: 1 } }, scopes: [] },
        // A non-COLOR variable under an ALLOWED prefix. The first draft used "Size/S", which the
        // prefix gate rejects on its own — so it passed a mutant that deleted the type gate.
        lh: { name: 'Text/Line height', variableCollectionId: 'C', resolvedType: 'FLOAT',
          valuesByMode: { L: 1.2, D: 1.2 }, scopes: [] },
        // A primitive that aliases. Primitives are the raw layer by definition; one that points
        // at another variable is a semantic filed in the wrong place, and importing it would put
        // an "@Alias" into a file whose every reader expects a literal.
        badprim: { name: 'Base colours/Wrong', variableCollectionId: 'P', resolvedType: 'COLOR',
          valuesByMode: { M: { type: 'VARIABLE_ALIAS', id: 'white' } }, scopes: [] },
      },
    },
  };
  const r = readVariables(fixture);

  if (r.primitives.get('Base colours/White') !== '#ffffff') miss('a primitive lands as a raw hex');
  if (!r.semantic.has('Background/Primary')) miss('a semantic colour must be read');
  const bg = r.semantic.get('Background/Primary') || {};
  if (bg.light !== '@Base colours/White' || bg.dark !== '@Base colours/Blue Charade') {
    miss(`an alias must keep the "@Name" form the TSV already uses in 145 of its rows `
      + `(got ${JSON.stringify([bg.light, bg.dark])})`);
  }
  if (bg.scopes !== 'FRAME_FILL+SHAPE_FILL') miss(`scopes join with "+" (got "${bg.scopes}")`);
  if (r.semantic.has('Text/Line height')) {
    miss('a non-COLOR variable is not a colour token even under an allowed prefix — dimensions '
      + 'and typography live in other.json');
  }
  // It must also raise no ERROR. hex() rejects a float anyway, so deleting the resolvedType gate
  // still keeps the value out of the file — but it turns every dimension, string and boolean in
  // the response into a reported failure. In a file with hundreds of them that is a run that
  // fails for no reason, and the "not a colour" gate is what stops it.
  if (r.errors.some((e) => e.includes('Text/Line height'))) {
    miss('a non-COLOR variable must be SKIPPED silently, not reported as a broken colour — '
      + 'it is not this script\'s business and erroring on it would fail every real run');
  }
  if (r.primitives.has('Base colours/Wrong')) {
    miss('a primitive that aliases must be REFUSED — primitives.tsv holds raw values, and every '
      + 'reader of it expects one');
  }
  if (!r.errors.some((e) => e.includes('Base colours/Wrong'))) {
    miss('a refused primitive must be named in the errors, not dropped');
  }

  // The gate that keeps the retired palette out of the shipped system.
  if (r.semantic.has('DEPRECATED COLOURS/White') || r.primitives.has('DEPRECATED COLOURS/White')) {
    miss('a collection this design system does not hold must be REFUSED, not imported — '
      + 'DEPRECATED COLOURS is exactly what the design lead is retiring');
  }
  if (!r.unknown.has('DEPRECATED COLOURS')) miss('a refused collection must be reported by name, not dropped in silence');

  // An alias pointing outside the response cannot be resolved to a name.
  const dangling = readVariables({ meta: {
    variableCollections: { C: { name: 'S', modes: [{ modeId: 'L', name: 'Light' }, { modeId: 'D', name: 'Dark' }] } },
    variables: { x: { name: 'Text/Primary', variableCollectionId: 'C', resolvedType: 'COLOR',
      valuesByMode: { L: { type: 'VARIABLE_ALIAS', id: 'nope' }, D: { r: 1, g: 1, b: 1, a: 1 } }, scopes: [] } },
  } });
  if (dangling.semantic.has('Text/Primary') || !dangling.errors.length) {
    miss('an alias to a variable not in the response must error, never fall back to a raw value');
  }

  // --- merging -----------------------------------------------------------------------------
  const src = 'Text/Primary\t@Base colours/Grey Slate\t@Base colours/White\tTEXT_FILL\n'
            + 'Border/Default\t@Base colours/Grey Steel\t#333333\tSTROKE_COLOR\n';
  const incoming = new Map([
    ['Text/Primary', ['@Base colours/Grey Slate', '@Base colours/White', 'TEXT_FILL']],
    ['Border/Default', ['@Base colours/Grey Steel', '#444444', 'STROKE_COLOR']],
    ['Border/Default full', ['@Base colours/Grey Steel', '#444444', 'STROKE_COLOR']],
  ]);

  // --update gates CORRECTIONS to tokens already captured. Additions are gated by --write in
  // main(), which is the same split the other four extractors use — so a dry run legitimately
  // carries the new row, and must leave every existing row exactly as it was.
  const dry = merge(src, incoming, { update: false });
  if (!dry.text.includes('Border/Default\t@Base colours/Grey Steel\t#333333\tSTROKE_COLOR')) {
    miss('without --update a captured token must keep its value — a report is not a change');
  }
  // Assert on the ROW, not on the file: the newly added "Border/Default full" legitimately
  // carries #444444 too, so a whole-file search for it passes a mutant that deserves to die.
  const rowOf = (t, n) => t.split('\n').find((l) => l.split('\t')[0] === n) || '';
  if (rowOf(dry.text, 'Border/Default').includes('#444444')) {
    miss('without --update a correction must not land on the captured row');
  }
  if (!dry.changed.length) miss('a changed value must be REPORTED even when it is not applied');
  if (dry.added.join() !== 'Border/Default full') miss(`a new token is an addition (got ${dry.added})`);

  const applied = merge(src, incoming, { update: true });
  if (!applied.text.includes('#444444')) miss('with --update the changed value must actually land');
  if (!applied.text.includes('Border/Default full')) miss('a new token must be appended');

  // The shrink guard. A partial response is indistinguishable from a deletion.
  const partial = merge(src, new Map([['Text/Primary', ['@a', '@b', 'TEXT_FILL']]]), { update: true });
  if (!partial.errors.length) {
    miss('a response missing a captured token must be REFUSED — these files are written whole, '
      + 'so a partial read would delete the rest and report success');
  }
  if (!partial.errors[0].includes('Border/Default')) miss('the refusal must name what it would have lost');
  const forced = merge(src, new Map([['Text/Primary', ['@a', '@b', 'TEXT_FILL']]]), { update: true, shrink: true });
  if (forced.errors.length) miss('--shrink is the deliberate override and must be allowed through');

  if (f) { console.log(`self-test FAILED — ${f} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — light and dark resolve by mode NAME so a dark-first collection '
    + 'cannot invert the system, unidentifiable modes fail rather than guess, alpha survives, an '
    + 'alias keeps its @Name form and a dangling one errors, a collection this system does not '
    + 'hold is refused and named, a difference is reported without --update and applied with it, '
    + 'and a response missing a captured token is refused rather than deleting it');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
