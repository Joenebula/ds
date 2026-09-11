#!/usr/bin/env node
// THE RULE: a page may only use design-system components. Its own CSS does layout,
// and nothing else.
//
//   node scripts/check-off-system.mjs <page.src.html> [...]
//
// Three ways a page goes off-system, all of which have actually happened here:
//
//   1. It uses a pf- class that does not exist. `pf-text-medium-heading` was invented;
//      the title fell back to the browser's bold h2 default and looked like a weight bug.
//   2. It hand-writes a component. The sub nav was written with --pf-bg-primary, which is
//      white in light mode so it looked right and was a different grey in dark. Clock-in
//      was written with padding 7 16 7 6; the component says 7 20 7 10.
//   3. It overrides a property the component already owns. Silently undoes the extract.
//
// A page CAN legitimately need something new — a child the extract cannot reach, a
// one-off layout. Mark it and say why:
//
//   /* pf-new: the 3x132 selected bar is a sibling rect the outer-box extract never sees */
//
// The marker must sit immediately before the rule. It makes the exception visible and
// reviewable instead of invisible.
import { readFileSync } from 'node:fs';

// Properties a COMPONENT owns. A page setting these is drawing a control by hand.
const OWNED = /^(height|min-height|max-height|width|min-width|max-width|padding|padding-\w+|border-radius|gap|row-gap|column-gap|font-size|font-weight|font-family|background|background-color|color|border|border-\w+|border-\w+-\w+|box-shadow|letter-spacing|text-transform)$/;

// Layout and behaviour, always fine.
const FREE = new Set(['display', 'position', 'top', 'right', 'bottom', 'left', 'inset',
  'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-area',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'overflow', 'overflow-x', 'overflow-y', 'cursor', 'z-index', 'opacity', 'content',
  'white-space', 'text-align', 'text-decoration', 'list-style', 'place-items',
  'visibility', 'pointer-events', 'transition', 'aspect-ratio', 'object-fit']);

// width/max-width are owned in general, but a page legitimately says "fill the row".
const FULL_BLEED = /^(100%|auto|0|none|min-content|max-content|fit-content|100vh|100vw)$/;

// Spacing BETWEEN things is layout; spacing INSIDE a control is the control's. A page may
// set padding/gap/margin as long as every value is a spacing token or zero — that is the
// design system's own scale being used for layout, not a control being redrawn with
// numbers someone measured by eye.
const SPACING_PROPS = /^(padding|padding-\w+|gap|row-gap|column-gap)$/;
const SPACING_OK = v => v.split(/\s+/).every(x => /^var\(--pf-space-[a-z-]+\)$/.test(x) || x === '0' || x === '0px');

const libCss = readFileSync('dist/components.css', 'utf8') + '\n'
             + readFileSync('dist/type.css', 'utf8');

// Every class the design system defines, and which properties each one sets.
const libClasses = new Map();
for (const m of libCss.matchAll(/(^|\})([^{}@]+)\{([^}]*)\}/g)) {
  const body = m[3];
  const props = new Set([...body.matchAll(/(^|;)\s*([a-z-]+)\s*:/g)].map(x => x[2]));
  for (const cm of m[2].matchAll(/\.(pf-[a-z0-9-]+)/g)) {
    if (!libClasses.has(cm[1])) libClasses.set(cm[1], new Set());
    for (const p of props) libClasses.get(cm[1]).add(p);
  }
}

let failures = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const problems = [];

  // ---- 1. pf- classes used in the markup that the library does not define ----
  const markup = src.replace(/<style[\s\S]*?<\/style>/gi, '');
  const used = new Set();
  for (const m of markup.matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) if (/^pf-/.test(c)) used.add(c);
  for (const c of [...used].sort())
    if (!libClasses.has(c))
      problems.push(`INVENTED CLASS  .${c} — used in the markup, defined nowhere. It paints nothing and falls back to the browser default.`);

  // ---- 2 & 3. the page's own CSS --------------------------------------------
  const styleBlocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
  for (const css of styleBlocks) {
    for (const m of css.matchAll(/(^|\}|\*\/)([^{}@]+)\{([^}]*)\}/g)) {
      const selector = m[2].trim();
      if (!selector || selector.startsWith('/*') || selector.startsWith(':root')) continue;
      const before = css.slice(0, m.index + m[0].indexOf(selector));
      const marked = /\/\*\s*pf-new:[\s\S]*?\*\/\s*$/.test(before);
      if (marked) continue;

      const decls = [...m[3].matchAll(/(^|;)\s*([a-z-]+)\s*:\s*([^;}]+)/g)]
        .map(d => [d[2].trim(), d[3].trim()]);
      const targetsComponent = /\.(pf-[a-z0-9-]+)/.exec(selector);

      for (const [prop, val] of decls) {
        if (FREE.has(prop)) continue;
        if (/^(width|max-width|min-width|height|min-height|max-height)$/.test(prop)
            && FULL_BLEED.test(val)) continue;
        if (SPACING_PROPS.test(prop) && SPACING_OK(val)) continue;
        if (!OWNED.test(prop)) continue;

        if (targetsComponent) {
          const owns = libClasses.get(targetsComponent[1]);
          if (owns && owns.has(prop))
            problems.push(`OVERRIDES COMPONENT  ${selector} sets ${prop} — .${targetsComponent[1]} already defines it.`);
        } else {
          problems.push(`HAND-WRITTEN  ${selector} sets ${prop}: ${val} — a component owns this. Use the class, or mark it /* pf-new: why */.`);
        }
      }
    }
  }

  if (problems.length) {
    console.log(`\n=== ${file} — ${problems.length} off-system`);
    for (const p of problems) console.log('  ' + p);
    failures += problems.length;
  } else {
    console.log(`${file} — on-system: every painted thing is a component class`);
  }
}
process.exit(failures ? 1 : 0);
