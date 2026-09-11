// Turn a CSS variable name out of get_design_context back into Figma's own variable name.
//
// WHY THIS EXISTS. The re-extract reads components with `get_design_context`, which returns
// Tailwind carrying CSS custom properties:
//
//     bg-[var(--tags\/fills\/neutral,#e1f5fb)]
//     text-[color:var(--text\/inverted-primary,white)]
//     bg-[var(--icons\/icon---theme,#cd2359)]
//
// The TSVs hold Figma's spelling — `Tags/Fills/Neutral`, `Text/Inverted primary`,
// `Icons/Icon - Theme`. The forward transform is lossy: lowercase, and every space becomes a
// hyphen, so `icon - theme` and `icon---theme` are indistinguishable going back. Typing the
// originals out by hand is exactly the "invent a value" failure this repo keeps finding — a
// mistyped token name would land in the TSV, generate a rule, and verify green against itself.
//
// So names are RESOLVED against the tokens the repo already extracted, never reconstructed. A
// name that does not resolve is reported and left empty; it is never guessed at.
import { readFileSync } from 'node:fs';

const kebab = (name) => name.toLowerCase().replace(/ /g, '-');

export function buildIndex(names) {
  const byKey = new Map(); const collisions = new Map();
  for (const n of names) {
    const k = kebab(n);
    if (byKey.has(k) && byKey.get(k) !== n) {
      if (!collisions.has(k)) collisions.set(k, [byKey.get(k)]);
      collisions.get(k).push(n);
    } else byKey.set(k, n);
  }
  return { byKey, collisions };
}

// Read the canonical names the repo already holds. These are Figma's, extracted, not invented.
export function knownNames(dir = 'tokens/_raw') {
  const names = [];
  for (const f of ['semantic.tsv', 'primitives.tsv']) {
    for (const line of readFileSync(`${dir}/${f}`, 'utf8').trim().split('\n')) {
      const n = line.split('\t')[0];
      if (n && n.includes('/')) names.push(n);
    }
  }
  return names;
}

// `--tags\/fills\/neutral,#e1f5fb` -> `tags/fills/neutral`
export const varKey = (raw) => raw.replace(/^--/, '').replace(/\\/g, '').split(',')[0].trim();

export function decode(raw, index) {
  const key = varKey(raw);
  const hit = index.byKey.get(key);
  if (index.collisions.has(key)) return { name: '', problem: `"${key}" is ambiguous — ${index.collisions.get(key).join(' | ')}` };
  if (!hit) return { name: '', problem: `"${key}" matches no extracted token — left empty rather than guessed` };
  return { name: hit, problem: null };
}

// Pull every var(--…) out of a chunk of design-context Tailwind, tagged by what it paints.
// `bg-[var(…)]` is a fill, `border-[var(…)]` a stroke, `text-[color:var(…)]` text.
export function scanRole(css) {
  const out = { fill: [], stroke: [], text: [] };
  const add = (role, m) => { for (const x of m) if (!out[role].includes(x)) out[role].push(x); };
  add('fill', [...css.matchAll(/\bbg-\[var\((--[^,)]+)/g)].map((m) => m[1]));
  add('stroke', [...css.matchAll(/\bborder-\[var\((--[^,)]+)/g)].map((m) => m[1]));
  add('text', [...css.matchAll(/\btext-\[color:var\((--[^,)]+)/g)].map((m) => m[1]));
  return out;
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (m) => { failures++; console.log(`  MISS ${m}`); };
  const idx = buildIndex(['Tags/Fills/Neutral', 'Text/Inverted primary', 'Background/Secondary Button',
    'Icons/Icon - Theme', 'Buttons/Fills/Hollow hover']);

  const ok = (raw, want) => {
    const r = decode(raw, idx);
    if (r.name !== want) miss(`${raw} must decode to "${want}" (got ${JSON.stringify(r)})`);
  };
  ok('--tags\\/fills\\/neutral,#e1f5fb', 'Tags/Fills/Neutral');
  ok('--text\\/inverted-primary,white', 'Text/Inverted primary');
  ok('--background\\/secondary-button,#4e6998', 'Background/Secondary Button');
  // The lossy case: " - " collapses to "---" and only the real token list can undo it.
  ok('--icons\\/icon---theme,#cd2359', 'Icons/Icon - Theme');
  ok('--buttons\\/fills\\/hollow-hover,rgba(101,101,101,0.2)', 'Buttons/Fills/Hollow hover');

  // AN UNKNOWN NAME IS NEVER GUESSED.
  let r = decode('--tags\\/fills\\/invented', idx);
  if (r.name !== '' || !/matches no extracted token/.test(r.problem || '')) {
    miss('an unknown variable must resolve to EMPTY and say so, never to a near miss');
  }

  // TWO Figma names that kebab to the same key must be reported, not silently picked between.
  const amb = buildIndex(['Icons/Icon - Theme', 'Icons/Icon---Theme']);
  r = decode('--icons\\/icon---theme', amb);
  if (r.name !== '' || !/ambiguous/.test(r.problem || '')) miss('a kebab collision must be reported as ambiguous, not resolved arbitrarily');

  // Roles must come from what paints them, not from the order they appear.
  const css = String.raw`bg-[var(--tags\/fills\/neutral,#e1f5fb)] border-[var(--tags\/borders\/neutral,#82d4ee)] text-[color:var(--tags\/content\/neutral,#00588e)]`;
  const role = scanRole(css);
  if (role.fill[0] !== '--tags\\/fills\\/neutral') miss(`bg- must be read as the fill (got ${JSON.stringify(role.fill)})`);
  if (role.stroke[0] !== '--tags\\/borders\\/neutral') miss(`border- must be read as the stroke (got ${JSON.stringify(role.stroke)})`);
  if (role.text[0] !== '--tags\\/content\\/neutral') miss(`text-[color: must be read as the text (got ${JSON.stringify(role.text)})`);
  // A bare `text-[13px]` is a SIZE, not a colour, and must not be mistaken for one.
  if (scanRole('text-[13px] text-center').text.length) miss('text-[13px] is a size and must not be read as a text colour');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a lossy kebab name resolves only against tokens the repo already '
    + 'extracted, an unknown one resolves to EMPTY and says so, a collision is reported rather than '
    + 'picked between, and a role comes from the property that paints it');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  const { byKey, collisions } = buildIndex(knownNames());
  console.log(`${byKey.size} canonical token names indexed, ${collisions.size} kebab collision(s)`);
  for (const [k, v] of collisions) console.log(`  AMBIGUOUS ${k} -> ${v.join(' | ')}`);
}
