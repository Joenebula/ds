#!/usr/bin/env node
// Two things no other check measures.
//
// 1. Every piece of extracted artwork actually reaches the stylesheet.
// 2. The number of SHELL classes — a component class carrying no background, no
//    border, no colour and no artwork — does not grow.
//
// Why this exists: `.pf-header` was 86px of transparent nothing and every check
// passed. verify-components reads colours, verify-geometry reads boxes, and an
// empty box has correct colours (none) and a correct box. So the header got
// hand-written, and a hand-written header is where the wrong font weight and the
// flat pink band came from. A shell is not a bug in itself — a layout container
// legitimately has no paint — but a shell that should have paint is invisible to
// everything else here, so the count is pinned.
import { readFileSync } from 'node:fs';

// The count of shell classes at the time this check was written. It may go DOWN
// freely — that is the extract capturing more of each component. It may not go up
// without someone deciding to raise it, because up means a component quietly lost
// its paint.
const SHELL_BASELINE = 69;

const css = readFileSync('dist/components.css', 'utf8');
let failures = 0;

// ---- 1. artwork reaches the stylesheet --------------------------------------
const [head, ...artRows] = readFileSync('tokens/_raw/component-art.tsv', 'utf8').trim().split('\n');
const cols = head.split('\t');
let artChecked = 0;
for (const line of artRows) {
  const r = Object.fromEntries(line.split('\t').map((v, i) => [cols[i], v]));
  const bytes = readFileSync(`assets/component-art/${r.file}`);
  const head64 = bytes.toString('base64').slice(0, 64);
  if (!css.includes(head64)) {
    console.log(`  FAIL  ${r.component} / ${r.variant} — artwork extracted but not in the stylesheet`);
    failures++;
  }
  artChecked++;
}

// ---- 2. shell census ---------------------------------------------------------
const shells = [];
for (const m of css.matchAll(/^\.(pf-[a-z0-9-]+)\s*\{([^}]*)\}/gm)) {
  const [, name, body] = m;
  const hasBg = /background(?!-)[^;]*:(?!\s*transparent)/.test(body);
  const hasImg = /background-image\s*:/.test(body);
  const hasBorder = /border(?!-radius)[^;]*:(?!\s*0)/.test(body);
  const hasColour = /(^|;|\s)color\s*:/.test(body);
  // A class whose paint arrives on a later, more specific rule is not a shell.
  const painted = new RegExp(`^\\.${name}\\[[^{]*\\{[^}]*(background|color|border-color)`, 'm').test(css)
    || new RegExp(`\\.${name}[^,{]*,?\\n?[^{]*\\{[^}]*background-image`, 'm').test(css);
  if (!hasBg && !hasImg && !hasBorder && !hasColour && !painted) shells.push(name);
}

console.log(`${artChecked} artwork bindings reach dist/components.css`);
console.log(`${shells.length} shell classes (baseline ${SHELL_BASELINE}) — a class with no paint of any kind`);
if (shells.length > SHELL_BASELINE) {
  console.log('  FAIL  shell count went UP. A component lost its paint:');
  for (const s of shells) console.log('        ' + s);
  failures++;
} else if (shells.length < SHELL_BASELINE) {
  console.log(`  note  down ${SHELL_BASELINE - shells.length} from baseline — lower SHELL_BASELINE to ${shells.length} to lock it in`);
}

process.exit(failures ? 1 : 0);
