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
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'visibility', 'pointer-events', 'transition', 'aspect-ratio', 'object-fit',
  // TABLE LAYOUT IS NOT A BORDER. `border-collapse` and `border-spacing` are caught by the
  // `border-\w+` arm of OWNED above, and they are nothing to do with the border a component
  // paints — Figma has no tables, so no component can own either. A page rendering a real
  // <table> has to set border-collapse or its cell borders double, and it was being told to
  // justify that with a pf-new marker explaining a checker quirk rather than a design
  // decision, which is the kind of marker that teaches people to ignore markers.
  'border-collapse', 'border-spacing', 'table-layout', 'vertical-align']);

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
//
// Comments must go FIRST. A naive scan treats the text before a `{` as the selector, so a
// `/* ... */` block ahead of a rule is swallowed into it and the rule's classes are lost.
// This check reported .pf-text-label-text, .pf-text-sub-heading and .pf-text-large-heading
// as INVENTED while they were sitting in type.css — it was finding 12 of the 23 type
// classes. A checker that quietly indexes two thirds of the library is worse than none.
const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, ' ');
// @media wrappers nest braces, which the flat scan cannot see past. Unwrap them so the
// rules inside are indexed like any other.
const unwrapAtRules = css => css.replace(/@[a-z-]+[^{]*\{/gi, ' ');

// The prefix `(^|\})` this used to carry made the scan consume one rule's CLOSING brace
// as the next rule's opening delimiter, so it matched every OTHER rule — 12 of the 23 type
// classes, half the library, silently. No prefix: a selector is whatever sits between the
// last brace and the next `{`.
const libClasses = new Map();
// The VALUE as well as the property, for the one question that needs it: whether a page's
// `display` is the inline-to-block promotion of what the class already says.
const libDecls = new Map();
for (const m of unwrapAtRules(stripComments(libCss)).matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  const body = m[2];
  const props = new Set([...body.matchAll(/(^|;)\s*([a-z-]+)\s*:/g)].map(x => x[2]));
  const bare = /^\s*\.(pf-[a-z0-9-]+)\s*$/.exec(m[1]);
  for (const cm of m[1].matchAll(/\.(pf-[a-z0-9-]+)/g)) {
    if (!libClasses.has(cm[1])) libClasses.set(cm[1], new Set());
    for (const p of props) libClasses.get(cm[1]).add(p);
  }
  if (bare) {
    const d = /(^|;)\s*display\s*:\s*([^;}]+)/.exec(body);
    if (d) libDecls.set(bare[1], { ...(libDecls.get(bare[1]) || {}), display: d[2].trim() });
  }
}

// THE SCORE IS EXPORTED so the docs can be checked against it rather than against a number
// somebody typed. CLAUDE.md quotes what each prototype scores, and a figure nobody re-measures
// is the drift this repo keeps finding in itself — "30-63 off-system each" sat in that file
// long after the real answers were 82, 138 and 163. `check-skill-classes.mjs` imports this and
// compares, so the arithmetic has one home: a second copy would be the same source with a
// second chance to disagree.
export function offSystem(file) {
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
  // NOTE: the page's own CSS is scanned WITH its comments intact, because the pf-new
  // marker is a comment and has to be visible to the scan.
  for (const css of styleBlocks) {
    for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!selector || selector.startsWith('/*') || selector.startsWith(':root')) continue;
      // The marker is the comment that CLOSES immediately before the selector. Finding it
      // by indexOf(selector) was wrong: a marker that mentions the selector's own name
      // ("no component for the <body> element") matched inside its own comment, cut the
      // slice short, and the exemption silently stopped applying to the rule it was
      // written for. Walk back from the last `*/` in the pre-selector text instead.
      const raw = m[1];
      const close = raw.lastIndexOf('*/');
      let marked = false;
      if (close !== -1 && raw.slice(close + 2).trim() === selector) {
        const open = raw.lastIndexOf('/*', close);
        marked = open !== -1 && /^\/\*\s*pf-new:/.test(raw.slice(open, close));
      }
      if (marked) continue;

      const decls = [...m[2].matchAll(/(^|;)\s*([a-z-]+)\s*:\s*([^;}]+)/g)]
        .map(d => [d[2].trim(), d[3].trim()]);
      // A ::before/::after on a component class is a CHILD the page draws, not the
      // component's own box — the library never defines one. Reporting it as an override
      // was wrong twice over: it named a property the pseudo-element does not share with
      // the component, and it offered no way to declare a legitimate child. It is
      // hand-written work, so it needs a pf-new marker like any other.
      const pseudo = /::(before|after)\b/.test(selector);
      const targetsComponent = pseudo ? null : /\.(pf-[a-z0-9-]+)/.exec(selector);

      // A COMPONENT'S AUTO-LAYOUT IS THE COMPONENT'S, exactly like its padding and gap.
      //
      // `display`, `flex-direction`, `align-items` and `justify-content` are read straight
      // off Figma's layout string — `Card` is VERTICAL CENTER MIN and the class says
      // `display: inline-flex; flex-direction: column; align-items: center`. They were on the
      // FREE list, and FREE was tested before the code that knows whether the selector points
      // at a component, so a page could rewrite a component's whole layout and be called
      // on-system. `prototypes/timesheet-approvals` does exactly that —
      // `.pf-card { display: flex; align-items: stretch }` — to force a 358px content card to
      // behave like an 89px metric tile, and every check passed.
      //
      // They stay free on a page's OWN selector, which is why the list exists: a layout
      // element has to be able to say `display: grid`. The distinction the check needed was
      // already sitting one branch below.
      const LAYOUT_OWNED = new Set(['display', 'flex-direction', 'align-items',
        'justify-content', 'align-content', 'justify-items']);
      // `display: flex` where the class says `inline-flex` is the same statement as
      // `width: 100%` — "this one fills its row" — not a redesign of the component's layout.
      // Only the inline-to-block promotion of the SAME layout mode; `inline-block` to
      // `inline-flex` really does change how the box lays its children out.
      const PROMOTES = { 'inline-flex': 'flex', 'inline-grid': 'grid', 'inline-block': 'block' };
      for (const [prop, val] of decls) {
        if (FREE.has(prop) && !(targetsComponent && LAYOUT_OWNED.has(prop))) continue;
        if (prop === 'display' && targetsComponent) {
          const has = (libDecls.get(targetsComponent[1]) || {})['display'];
          if (has && PROMOTES[has] === val.trim()) continue;
        }
        if (/^(width|max-width|min-width|height|min-height|max-height)$/.test(prop)
            && FULL_BLEED.test(val)) continue;
        if (SPACING_PROPS.test(prop) && SPACING_OK(val)) continue;
        if (!OWNED.test(prop) && !LAYOUT_OWNED.has(prop)) continue;

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

  return problems;
}

// Run as a script, report; imported, just export the scorer above.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let failures = 0;
  for (const file of process.argv.slice(2)) {
    const problems = offSystem(file);
    if (problems.length) {
      console.log(`\n=== ${file} — ${problems.length} off-system`);
      for (const p of problems) console.log('  ' + p);
      failures += problems.length;
    } else {
      console.log(`${file} — on-system: every painted thing is a component class`);
    }
  }
  process.exit(failures ? 1 : 0);
}
