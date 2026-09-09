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
| **`dist/components.css`** | **139 components, 283 variants, as ready classes. Generated.** |
| `assets/icons/` | All 293 People First icons as individual SVGs. |
| `docs/components.html` | Every component and variant, light and dark. |
| `docs/icons.html` | Every icon, browsable. |
| `.claude/skills/` | Four skills: `people-first`, `pf-screen`, `pf-audit`, `pf-handoff`. |
| `reference/index.html` | Visual proof sheet — every token rendered, with a dark-mode toggle. |
| `prototypes/` | Worked example screens, built from the library. |
| `ds-bundle/` | Preview pages for the claude.ai/design Design System pane. Generated. |
| `scripts/` | The build pipeline and the checks. |

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
npm run build     # everything below, in order
npm run verify    # the six checks, against a built page
npm run check     # WCAG AA audit of the real component pairings
```

`build` runs: tokens -> `design-tokens.json` -> `dist/tokens.css`, then the reference
sheet, the Design System pane bundle, the variant and geometry references, then
`dist/components.css` and `docs/components.html`.

## Using it

```html
<link rel="stylesheet" href="dist/tokens.css">      <!-- the colours -->
<link rel="stylesheet" href="dist/components.css">  <!-- the components -->
<html data-theme="dark">  <!-- or "light", or omit to follow the OS -->
```

Colours are `var(--pf-*)` tokens, never raw hex. Components are classes named
straight off Figma's variant panel — the component is the class, each variant property
is a data attribute, and the values keep Figma's own spelling:

```html
<button class="pf-button" data-type="Action">Save</button>
<span   class="pf-tags" data-type="Positive">Approved</span>
<div    class="pf-form-field" data-input-type="Date picker" data-state="Error">
```

Open `docs/components.html` to see all of them. **Do not hand-write component CSS** —
the class exists and is checked against Figma; your own CSS is for page layout and
behaviour. See `.claude/skills/people-first/SKILL.md` for the full rules.

## Checking

Six checks, each covering a different axis, because a green tick on one axis proved
repeatedly to mean nothing about the others:

```bash
node scripts/verify-geometry.mjs <page>.html      # shapes match Figma
node scripts/verify-rendered.mjs <page>.html      # colours match Figma, both modes
node scripts/check-icon-fidelity.mjs <page>.html  # every glyph is a real Figma icon
node scripts/pf-audit.mjs <page>.html             # on-system + WCAG contrast
node scripts/verify-components.mjs                # the whole library vs Figma
node scripts/check-skill-classes.mjs              # the docs match the stylesheet
```

`verify-components` takes `--self-test`, which deliberately breaks a value and confirms
the check catches it rather than reporting a comfortable pass.

The last one is there because documentation fails silently: if the skill tells you to
write `data-message-type` and the stylesheet keys on something else, nothing errors —
the component just renders unstyled and looks like your mistake.

None of them replace looking at the page. Three times during this build every check
passed while the screen was visibly broken.

## Accessibility

`scripts/check-contrast.mjs` checks the foreground/background pairs the Figma
components actually bind (not assumed pairings). **27 of 28 pass WCAG AA in both
modes.** Two known margins are documented in the skill.

## Regenerating after Figma changes

The raw extract in `tokens/_raw/` is the input. Re-extract from Figma into those
files, then re-run the build. Do not hand-edit `design-tokens.json`, `dist/tokens.css`
or `dist/components.css` — all three are generated and will be overwritten.

Component colours live in `tokens/_raw/component-variants.tsv` and shapes in
`tokens/_raw/component-geometry.tsv`; both are measured in Figma, and everything about
the component library follows from them.
