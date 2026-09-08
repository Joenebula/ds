# People First Design System

Design tokens and usage guidance extracted from the People First Figma library,
packaged so Claude Design — and any HTML/CSS output — generates on-brand UI.

**Source:** Figma `aRWjBnTvdLiG50xtwodGwH` (People First Design System, MHR)

## What's here

| Path | What it is |
|---|---|
| `tokens/_raw/` | Verbatim extract from Figma. The evidence trail. |
| `tokens/design-tokens.json` | 177 tokens in W3C DTCG format. Generated. |
| `dist/tokens.css` | 365 CSS custom properties, light + dark. Generated. |
| `.claude/skills/people-first/SKILL.md` | Teaches Claude the system: tokens, recipes, rules. |
| `reference/index.html` | Visual proof sheet — every token rendered, with a dark-mode toggle. |
| `scripts/` | The build pipeline. |

## What was extracted

- **52 primitive colours** (`Colours Primitive`) — raw palette, not for direct use
- **96 semantic colours** (`Colours Semantic`) — **each with Lightmode and Darkmode values**
- **13 dimensions** — spacing (5/10/15/20/40), radius (4/8), icon sizes (18–44)
- **9 typography variables** — Open Sans, sizes 13–36, weights Regular/SemiBold
- **23 text styles**, 2 shadows, 4 layout grids, 1 AI gradient
- **469 published components** inventoried across 16 pages

Alias chains are preserved rather than flattened, so `Table/Card` → `Background/Primary`
→ `Base colours/White` survives as `var(--pf-bg-primary)` in the CSS. Change a
primitive and everything downstream follows, exactly as in Figma.

## Build

```bash
node scripts/build-tokens.mjs     # tokens/_raw/ -> tokens/design-tokens.json
node scripts/build-css.mjs        # design-tokens.json -> dist/tokens.css
node scripts/build-reference.mjs  # -> reference/index.html
node scripts/check-contrast.mjs   # WCAG AA audit of real component pairings
```

Or `npm run build` for all four.

## Using it

```html
<link rel="stylesheet" href="dist/tokens.css">
<html data-theme="dark">  <!-- or "light", or omit to follow the OS -->
```

Then use `var(--pf-*)` tokens only — never raw hex. See the skill for the full
rules and component recipes.

## Accessibility

`scripts/check-contrast.mjs` checks the foreground/background pairs the Figma
components actually bind (not assumed pairings). **27 of 28 pass WCAG AA in both
modes.** Two known margins are documented in the skill.

## Regenerating after Figma changes

The raw extract in `tokens/_raw/` is the input. Re-extract from Figma into those
files, then re-run the build. Do not hand-edit `design-tokens.json` or `tokens.css` —
both are generated and will be overwritten.
