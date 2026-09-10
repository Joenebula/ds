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

`npm run verify` checks every screen in `prototypes/` on four axes, plus the component
library, the type layer and the docs, each on a different axis. They are not
interchangeable — on this project every one of them has passed while the page was
visibly wrong on an axis it does not measure. **Always screenshot the result in light
and dark and look at it** before saying a screen is done — with
`node scripts/screenshot-screen.mjs <screen.html>`, which refuses to write a PNG if the page
is not rendering in Open Sans. A screenshot in the wrong typeface is worse than none: it is
false evidence, and it is what this project shipped for months.
