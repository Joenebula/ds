# People First Design System

This repo holds the People First design tokens, extracted from Figma
(`aRWjBnTvdLiG50xtwodGwH`) and packaged for Claude Design and web output.

## Always use the design system

For **any** UI work — a design canvas, an artifact, a mockup, a component, a page —
use the `people-first` skill in `.claude/skills/people-first/SKILL.md`. Load it
before writing any markup or CSS.

Non-negotiables from that skill:

- Never write a raw hex value. Every colour is a `var(--pf-*)` token.
- Use semantic tokens (`--pf-text-primary`), never primitives (`--pf-base-grey-slate`).
  Primitives don't change between modes, so using them breaks dark mode.
- Open Sans only, weights 400 and 600.
- Green = positive/confirm, blue = default action, pink = brand (not a button).
- Both light and dark mode must work. Using tokens gives this for free.

## Using the tokens

For a page: `<link rel="stylesheet" href="dist/tokens.css">`
For a self-contained artifact or `.dc.html` canvas artboard: inline the contents of
`dist/tokens.css` into a `<style>` block. Artifacts and canvases can't reference
local files, so the link tag will silently do nothing there.

Dark mode: `data-theme="dark"` / `"light"` on the root, or omit to follow the OS.

## Editing tokens

`tokens/_raw/` is the input; everything else is generated. Re-extract from Figma into
those files, then `npm run build`. Never hand-edit `tokens/design-tokens.json` or
`dist/tokens.css` — they are overwritten. Run `npm run check` after any token change
to re-verify WCAG contrast.
