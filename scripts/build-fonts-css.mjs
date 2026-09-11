#!/usr/bin/env node
// Generates dist/fonts.css — the typeface the design system mandates, actually shipped.
//
// Until this existed, `--pf-font-body: Open Sans, system-ui, sans-serif` resolved to
// DejaVu Sans, and weight 600 snapped to DejaVu Bold because DejaVu has no SemiBold.
// Every screen rendered in the wrong face at the wrong weight, and every check passed:
// verify-type compares the emitted `font-weight: 600` against the extract's "SemiBold",
// and both are right while the browser paints something else. Nothing asked which face
// actually rendered.
//
// Inlined as data: URIs, not url() paths — a path fails silently in an artifact or a
// .dc.html canvas, which is the same invisible failure that lost the header artwork.
import { readFileSync, writeFileSync } from 'node:fs';

const WEIGHTS = [
  [400, 'open-sans-400.woff2', 'the body weight'],
  [600, 'open-sans-600.woff2', 'SemiBold — the only other weight the design system uses'],
];

const out = [];
out.push('/* People First — the typeface, generated from assets/fonts/.');
out.push(' *');
out.push(' * DO NOT EDIT. Regenerate with: npm run build');
out.push(' *');
out.push(' * Open Sans, latin subset, weights 400 and 600 (Apache-2.0; see');
out.push(' * assets/fonts/LICENSE). Load this BEFORE the other stylesheets, or the first');
out.push(' * paint uses a fallback face.');
out.push(' *');
out.push(' * There is no 700. The design system has two weights; a third would be invented.');
out.push(' */');
out.push('');

let total = 0;
for (const [weight, file, why] of WEIGHTS) {
  const bytes = readFileSync(`assets/fonts/${file}`);
  total += bytes.length;
  out.push(`/* ${weight} — ${why} */`);
  out.push('@font-face {');
  out.push('  font-family: "Open Sans";');
  out.push('  font-style: normal;');
  out.push(`  font-weight: ${weight};`);
  // swap, not block: a flash of fallback beats invisible text, and the metrics are close
  // enough that the reflow is small.
  out.push('  font-display: swap;');
  out.push(`  src: url("data:font/woff2;base64,${bytes.toString('base64')}") format("woff2");`);
  out.push('}');
  out.push('');
}

// The browser's own stylesheet has a third weight. <strong>, <b>, <th> and every heading
// element default to 700; only 400 and 600 are shipped, so the browser SYNTHESISES a bold
// the design system does not have, wider and heavier than anything in Figma. Map UA bold
// onto the real 600.
//
// This lives here rather than in type.css because type.css is opt-in — one prototype has
// no /*__TYPE__*/ placeholder at all, and its <strong> stayed at 700 when the reset was
// there. Faces are not opt-in.
out.push('/* The UA stylesheet bolds these to 700, and no 700 face is shipped — the browser');
out.push('   would synthesise one. Map it onto the weight the design system actually has. */');
out.push('strong, b, th, h1, h2, h3, h4, h5, h6, optgroup {');
out.push('  font-weight: 600;');
out.push('}');
out.push('');

writeFileSync('dist/fonts.css', out.join('\n'));
console.log(`fonts.css written — ${WEIGHTS.length} faces, ${(total / 1024).toFixed(0)}KB of woff2 inlined`);
for (const [w, f] of WEIGHTS) console.log(`  ${w}  ${f}`);
