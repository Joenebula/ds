# People First Design System

This repo holds the People First design tokens, extracted from Figma
(`aRWjBnTvdLiG50xtwodGwH`) and packaged for Claude Design and web output.

## Always use the design system

For **any** UI work — a design canvas, an artifact, a mockup, a component, a page —
use the `people-first` skill in `.claude/skills/people-first/SKILL.md`. Load it
before writing any markup or CSS.

Non-negotiables from that skill:

- Never write a raw hex value. Every colour is a `var(--pf-*)` token.
- **Never hand-write component or type CSS.** Buttons, tags, inputs, table cells, cards
  and nav items are classes in `dist/components.css`; headings, body and label text are
  classes in `dist/type.css`. Both are generated from Figma. Writing your own is how this
  project shipped a screen with perfect colours and invented shapes.
- Use semantic tokens (`--pf-text-primary`), never primitives (`--pf-base-grey-slate`).
  Primitives don't change between modes, so using them breaks dark mode.
- Open Sans only, weights 400 and 600.
- Green = positive/confirm, blue = default action, pink = brand (not a button).
- Both light and dark mode must work. Using tokens gives this for free.
- Never draw an icon by hand. All 293 are in `assets/icons/`.

## Using the tokens, components and type

Four stylesheets. For a page:

```html
<link rel="stylesheet" href="dist/fonts.css">       <!-- Open Sans, self-hosted -->
<link rel="stylesheet" href="dist/tokens.css">      <!-- the colours -->
<link rel="stylesheet" href="dist/components.css">  <!-- the components -->
<link rel="stylesheet" href="dist/type.css">        <!-- the type -->
```

For a self-contained artifact or `.dc.html` canvas artboard: inline the contents of
all four into a `<style>` block. Artifacts and canvases can't reference local files, so the
link tag will silently do nothing there.

**`dist/fonts.css` is not optional.** It carries Open Sans as base64 `@font-face` rules, and
without it the page falls through to `system-ui` — SF Pro on a Mac, Segoe UI on Windows —
which renders every 600 visibly lighter than Open Sans SemiBold. That is not a small thing:
this repo rendered in DejaVu Sans for months while four checks reported green, because every
check read the CSS declaration and none read the glyphs. Never use a `fonts.googleapis.com`
link instead: it dies offline, dies behind a proxy, and does nothing at all in an artifact.

Component classes are named off Figma's variant panel — component is the class, each
variant property is a data attribute, values keep Figma's spelling:

```html
<button class="pf-button" data-type="Action">Save</button>
<div class="pf-form-field" data-input-type="Date picker" data-state="Error">
```

`docs/components.html` shows every one. Your own CSS is for page layout and behaviour
only.

Dark mode: `data-theme="dark"` / `"light"` on the root, or omit to follow the OS.

## Editing tokens

`tokens/_raw/` is the input; everything else is generated. Re-extract from Figma into
those files, then `npm run build`. Never hand-edit `tokens/design-tokens.json`,
`dist/tokens.css`, `dist/components.css`, `dist/type.css` or `dist/fonts.css` — they are overwritten. Run `npm run check`
after any token change to re-verify WCAG contrast, and `npm run verify` to re-check the
component library and the example screens against Figma.

## Checking any screen

**Edit the `.src.html`, never the `.html`.** `npm run build` generates every screen from its
source; the built file is an output. Editing it directly is overwritten on the next build, and
until then the screen and its source disagree.

`npm run verify` checks every screen in `prototypes/` on eleven axes, plus the component
library, the type layer and the docs, each on a different axis. They are not
interchangeable — on this project every one of them has passed while the page was
visibly wrong on an axis it does not measure.

The first axis is `built`, and it is a **gate**: it rebuilds each source and compares bytes,
because `npm run build` once built everything except the screens, and eight green marks on a
stale page read exactly like eight on a current one. If it fails, run `npm run build` — nothing
on that screen has been measured, whatever the other marks say.

The last axis is `source`, and it asks a question about the DESIGN rather than the page: does
the Figma frame fit its own contents? A frame fixed shorter than its children clips the rest,
and a clipped frame looks exactly like a screen that ends there — so the build silently copies
whichever height it was handed. It reads `prototypes/<screen>.figma.xml`, the raw `get_metadata`
saved beside the extract. Fix the frame in Figma, or declare the decision in the extract's
`sourceClips` with a reason.

A `--` is a check that measured nothing. It is not a pass. And a **placeholder is not a
picture**: an asset that has not arrived gets a marked stand-in from
`scripts/build-placeholders.mjs`, which `images` passes but counts and names by key in its
verdict line on every run. Never remove that count to tidy the output — it is the only thing
keeping a tinted panel from quietly becoming the finished thing.

**Always screenshot the result in light and dark and look at it** before saying a screen is done — with
`node scripts/screenshot-screen.mjs <screen.html>`, which refuses to write a PNG if the page
is not rendering in Open Sans. A screenshot in the wrong typeface is worse than none: it is
false evidence, and it is what this project shipped for months.
