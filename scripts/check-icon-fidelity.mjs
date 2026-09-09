#!/usr/bin/env node
// Reports which inline <svg> glyphs in a page match a real exported Figma icon,
// and which are hand-drawn approximations.
//
//   node scripts/check-icon-fidelity.mjs <file.src.html>
//
// A drawn-by-hand glyph is the fastest way to make a screen look not-quite
// People First, and it is invisible to the colour and geometry checks.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-icon-fidelity.mjs <file.html>'); process.exit(2); }

// Normalise a path list so formatting differences don't count as a mismatch.
const norm = svg => (svg.match(/ d="([^"]+)"/g) || [])
  .map(d => d.slice(4, -1).replace(/\s+/g, ' ').trim()).sort().join('|');

const known = new Map();
for (const f of readdirSync('assets/icons').filter(f => f.endsWith('.svg'))) {
  known.set(norm(readFileSync(join('assets/icons', f), 'utf8')), f.replace(/\.svg$/, ''));
}

const page = readFileSync(file, 'utf8');
const glyphs = page.match(/<svg[\s\S]*?<\/svg>/g) || [];
let matched = 0;
const unknown = [];
for (const g of glyphs) {
  const hit = known.get(norm(g));
  if (hit) { matched++; continue; }
  // show enough of the first path to identify it by eye
  const d = (g.match(/ d="([^"]+)"/) || [])[1] || '(no path)';
  unknown.push(d.slice(0, 60));
}
for (const d of unknown) console.log(`not a Figma icon:  ${d}...`);
// A page with no glyphs at all is not a pass, it is a check that found nothing to check.
// Pointing this at a .src.html whose icons are still <!--pf-icon:--> references would
// otherwise report a comfortable "0 of 0" — run it on the BUILT page.
if (!glyphs.length) {
  console.log('no inline <svg> found — if this is a .src.html, run it on the built page instead');
  process.exit(2);
}
console.log(`\n${matched} of ${glyphs.length} inline glyphs are real Figma icons, ${unknown.length} are not`);
process.exit(unknown.length ? 1 : 0);
