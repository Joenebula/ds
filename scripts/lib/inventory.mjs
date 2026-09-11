// tokens/_raw/components.json — the published-component listing, read in one place.
//
// WHY A SHARED READER. Three scripts want this file and each had its own bare
// `JSON.parse(readFileSync(...))`: sync-check.mjs for the freshness comparison, backfill-node-ids
// for the id lookup, and now extract-icons to tell a component set's variants from an icon. Three
// copies of a read is where a fourth copy's slightly different assumption gets in.
//
// It also answers the question this file exists for downstream: Figma names a variant node
// `Property=Value`, so `Size=L - 52px` is not an icon, it is one of the four Size variants of
// `Circle icons` — and this listing is the only thing in the repo that knows that.
import { readFileSync, existsSync } from 'node:fs';

const DEFAULT = 'tokens/_raw/components.json';
const key = (s) => String(s || '').trim();

// Every published component: { name, nodeId, page, type, properties }.
// A missing file is an EMPTY LIST, not a throw — every caller treats the inventory as
// corroboration it can do without, never as the thing its verdict rests on. A check that breaks
// when an optional input is absent is a check that gets deleted.
export function inventory(file = DEFAULT) {
  if (!existsSync(file)) return [];
  let raw;
  try { raw = JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  const list = Array.isArray(raw) ? raw : (raw.components || []);
  return list.map((c) => ({
    name: key(c.name),
    nodeId: key(c.nodeId || c.id || c.node_id),
    page: key(c.pageName || c.page),
    type: key(c.type),
    properties: c.properties && typeof c.properties === 'object' ? c.properties : {},
  })).filter((c) => c.name);
}

// Every `Property=Value` name a published COMPONENT_SET can produce, mapped to the set it belongs
// to. Figma names variant nodes exactly this way, so it is a direct lookup rather than a guess:
// `Size=L - 52px` -> { set: 'Circle icons', nodeId: '6580:66319', property: 'Size' }.
//
// Keyed case-insensitively because the extract and the listing have already disagreed on case
// once (`calendar link` against Figma's `Calendar link`).
export function variantNames(list = inventory()) {
  const byName = new Map();
  for (const c of list) {
    if (c.type !== 'COMPONENT_SET') continue;
    for (const [prop, def] of Object.entries(c.properties)) {
      const options = def && Array.isArray(def.variantOptions) ? def.variantOptions : [];
      for (const opt of options) {
        byName.set(`${prop}=${opt}`.toLowerCase(), { set: c.name, nodeId: c.nodeId, property: prop });
      }
    }
  }
  return byName;
}

// ---------------------------------------------------------------------------
function selfTest() {
  let f = 0;
  const miss = (m) => { f++; console.log(`  MISS ${m}`); };

  // A missing file must be empty, never a throw: the callers use this as corroboration.
  if (inventory('does/not/exist.json').length !== 0) miss('a missing inventory must read as empty');
  if (variantNames(inventory('does/not/exist.json')).size !== 0) {
    miss('no inventory means no variant names, not a crash');
  }

  const list = [
    { name: 'Circle icons', nodeId: '6580:66319', type: 'COMPONENT_SET', pageName: 'Icons ',
      properties: { Size: { type: 'VARIANT', variantOptions: ['XS - 28px', 'L - 52px'] },
        Icon: { type: 'INSTANCE_SWAP' } } },
    { name: 'Tick', nodeId: '1:1', type: 'COMPONENT', pageName: 'Icons ' },
  ].map((c) => ({ ...c }));

  // inventory() normalises shape; the trailing space on "Icons " is Figma's and must be trimmed.
  const norm = inventory.call(null, 'does/not/exist.json'); // eslint-disable-line no-unused-vars
  const v = variantNames(list.map((c) => ({
    name: c.name, nodeId: c.nodeId, page: (c.pageName || '').trim(), type: c.type,
    properties: c.properties || {},
  })));

  if (v.get('size=l - 52px')?.set !== 'Circle icons') {
    miss(`a COMPONENT_SET's variant names must resolve to it (got ${JSON.stringify([...v.keys()])})`);
  }
  if (v.get('size=l - 52px')?.nodeId !== '6580:66319') miss('the set\'s nodeId must come with it');
  // INSTANCE_SWAP is a property but not a VARIANT axis — it has no variantOptions and must
  // contribute no names.
  if ([...v.keys()].some((k) => k.startsWith('icon='))) {
    miss('only VARIANT properties produce variant names — an INSTANCE_SWAP has no options');
  }
  // A plain COMPONENT is not a set and produces nothing, or every icon would match itself.
  if ([...v.keys()].some((k) => k.startsWith('tick'))) {
    miss('a plain COMPONENT must contribute no variant names');
  }

  if (f) { console.log(`self-test FAILED — ${f} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a missing inventory reads as empty rather than throwing, a '
    + 'COMPONENT_SET\'s Property=Value names resolve to the set and its node id, and neither a '
    + 'plain component nor a non-VARIANT property contributes a name');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  const list = inventory();
  console.log(`${list.length} published component(s); `
    + `${list.filter((c) => c.type === 'COMPONENT_SET').length} set(s), `
    + `${variantNames(list).size} variant name(s) they can produce`);
}
