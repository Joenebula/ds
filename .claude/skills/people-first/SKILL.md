---
name: people-first
description: Build UI using the People First Design System (MHR). Use whenever creating or restyling any screen, page, component, artifact, or design canvas that should look like People First — buttons, forms, tables, cards, tags, navigation, charts, dashboards. Provides the colour, typography, spacing and elevation tokens plus component recipes, in light and dark mode.
---

# People First Design System

Design tokens extracted from the People First Figma library (`aRWjBnTvdLiG50xtwodGwH`).
Everything below is generated from that file — not invented.

## Setup

Link the token stylesheet, then use `var(--pf-*)` everywhere:

```html
<link rel="stylesheet" href="dist/tokens.css">
```

For a self-contained artifact or canvas, inline the contents of `dist/tokens.css`
into a `<style>` block instead. Never paste hex values in place of tokens.

## Hard rules

1. **Never write a raw hex value.** Every colour comes from a `--pf-*` token. If no
   token fits, the design system has no answer — say so rather than inventing one.
2. **Use semantic tokens, not primitives.** Reach for `--pf-text-primary`, not
   `--pf-base-grey-slate`. Primitives exist only to feed the semantic layer, and in
   Figma they are deliberately scoped out of every picker. Using them directly
   breaks dark mode, because primitives do not change between modes — semantics do.
3. **Green is the positive/confirm action. Blue is the default action. Pink is brand, not a button.**
   This trips people up: the theme colour (`--pf-bg-theme-full`, pink) is for brand
   surfaces and selected states, *not* primary buttons.
4. **Open Sans only**, weights 400 (Regular) and 600 (SemiBold).
5. **Dark mode is not optional.** Every semantic token already carries both modes.
   Get this free by using tokens; break it by hardcoding.
6. **Ignore the `DEPRECATED COLOURS/*` paint styles** in Figma — 46 of the 49 paint
   styles are marked deprecated. The live colour system is the variables.

## Colour

### Text
| Token | Use |
|---|---|
| `--pf-text-primary` | Body copy, headings |
| `--pf-text-secondary` | Supporting/muted copy |
| `--pf-text-link` | Links |
| `--pf-text-negative` | Errors |
| `--pf-text-positive` | Success |
| `--pf-text-warning` | Warnings |
| `--pf-text-disabled` | Disabled labels |
| `--pf-text-theme` | Brand-coloured text, selected chips |
| `--pf-text-inverted-primary` | Text on the Action (blue) button |
| `--pf-text-always-white` | Text on green/red buttons — stays white in both modes |
| `--pf-text-always-grey-slate` | Stays dark in both modes (use on fixed-light surfaces) |

`--pf-text-inverted-primary` and `--pf-text-inverted-secondary` **flip** between modes.
`--pf-text-always-*` deliberately do not. Pick by intent, not by how it looks in light mode.

### Surfaces
| Token | Use |
|---|---|
| `--pf-bg-primary` | Page/card background |
| `--pf-bg-secondary` | Subtle recessed background |
| `--pf-bg-tertiary` | Stronger recessed background, table headers |
| `--pf-bg-highlight` | Highlighted rows/regions |
| `--pf-bg-neutral` / `-positive` / `-warning` / `-negative` | Status message backgrounds |
| `--pf-bg-theme` | Soft brand tint |
| `--pf-bg-theme-full` | Full-strength brand surface |

### Borders
`--pf-border-default` · `--pf-border-secondary` · `--pf-border-tertiary` ·
`--pf-border-disabled` · `--pf-border-form-input` · `--pf-border-hollow-button` ·
`--pf-border-theme` · `--pf-border-info` · `--pf-border-positive` ·
`--pf-border-warning` · `--pf-border-negative` · `--pf-border-drop-shadow`

### Icons
`--pf-icon-primary` · `-secondary` · `-link` · `-info` · `-positive` · `-warning` ·
`-negative` · `-disabled` · `-theme` · `-required-field` · `-primary-inverted` ·
`-secondary-inverted` · `-always-grey-slate`

Icons have their **own** token family — do not colour an icon with a `--pf-text-*` token.

## Typography

Open Sans. `--pf-font-body` and `--pf-font-heading` both resolve to it.

| Token | px | Desktop role |
|---|---|---|
| `--pf-font-size-xl` | 36 | XL heading |
| `--pf-font-size-l` | 24 | Large heading |
| `--pf-font-size-m` | 20 | Sub heading |
| `--pf-font-size-s` | 16 | Body, button text |
| `--pf-font-size-xs` | 13 | Labels, tags |

Weights: `--pf-font-weight-regular` (400), `--pf-font-weight-bold` (600 SemiBold).

Body and label text use **-1% letter-spacing**; headings use 0. Mobile headings run
larger than desktop (50 / 30 / 20 / 18) — that is intentional, not an error.

Two text styles in Figma are `textCase: UPPER` — `Desktop text/Tag text` and the
13px `Desktop text/Button text`. **Neither is used by the shipping components**: the
real `Tags` component renders sentence case with 13px Regular, and buttons use 13px
SemiBold sentence case. Treat those two styles as legacy and follow the components.

## Spacing, radius, icons

| Token | px |
|---|---|
| `--pf-space-xsmall` | 5 |
| `--pf-space-small` | 10 |
| `--pf-space-medium` | 15 |
| `--pf-space-large` | 20 |
| `--pf-space-xlarge` | 40 |
| `--pf-radius-small` | 4 |
| `--pf-radius-medium` | 8 |

Icon sizes: `--pf-icon-size-xxs` 18 · `-xs` 22 · `-s` 28 · `-m` 36 · `-lg` 44.

The scale is a 5px base. Do not introduce intermediate values — if a gap needs 12px,
use 10 or 15.

## Elevation

```css
box-shadow: var(--pf-shadow-drop-shadow);          /* 0 0 4px #c1c1c1 — cards */
box-shadow: var(--pf-shadow-modal-header-shadow);  /* 0 4px 4px rgba(0,0,0,.1) — modal/sticky headers */
```

Only these two exist. There is no elevation ramp — do not invent one.

## Layout grid

24 columns @ 1588px · 22 @ 1454px · 18 @ 1320px · 12 @ 784px.
All use a 20px gutter and 47px column width, centre-aligned.

## Component variants — READ THIS BEFORE PROTOTYPING

`references/variants.md` carries **71 components and 191 variants**, each with the
exact tokens that variant binds in Figma, already translated to CSS vars.

**Load it whenever a prototype needs a component in a specific state** — an errored
dropdown, a hovered table row, a selected nav item, a dragged card. Do not guess a
variant's colours from its name; look it up. The bindings are frequently
counter-intuitive (the Action button uses `--pf-text-inverted-primary`, not white).

Variant axes you can ask for by name:

| Component | Axes |
|---|---|
| `Button` | Type (Action/Positive/Negative/Hollow/Filter/Sort) × State (Default/Hover/Disabled) × Label |
| `Form field` | Input type (Text/Dropdown/Search/Date picker/Time picker) × State (Default/Disabled/Error/Selected) × Full width |
| `Checkbox/Radio item` | State (Default/Hover/Disabled/Error/Selected) × Radio × Filled |
| `Table cell (AG)` | Type (Default/Checkbox) × Style (Default/Stripe/Hover) |
| `Table header icons` | Variant (Sort/Filter/Context menu) × State (Default/Hover/Ascending/Descending/Filtered/Active) |
| `Tags` | Type (7 statuses) × Small |
| `Navigation item` | State (Selected/Unselected/Hover) × Device |
| `Draggable card` | State (Default/Hover/Click/Drag/Drop) |
| `Radio card` | State (Enabled/Disabled) × Selected |
| `Toggle` | On × Locked |
| `Star rating` | Rating (0–5) × State × Read only |
| `AI button` | Style (Light mode/Inverted) × Hover |

Ignore any `Darkmode` variant axis you see — the CSS tokens handle both modes.
It exists in Figma only because a Figma frame can't show both at once.

## Component geometry — the part that makes it LOOK like People First

Colour alone does not make a page read as People First. The **shapes** do, and they
are not derivable from the token scale — the radius tokens (4px, 8px) are for cards
and inputs, and are NOT what buttons use. Full geometry is in
`references/geometry.md`; these are the ones that change the look most:

| Rule | Why it matters |
|---|---|
| **Buttons are pills** — `border-radius: 20px`, height **32px**, `padding: 0 20px` | The single most recognisable trait. A 4px-radius button reads as a different product. |
| **Button text is 13px SemiBold**, not 16px | 16px buttons look oversized and generic. |
| **Every button carries a leading icon**, 10px gap | Icon-less buttons look unfinished. Icon-only variants are 32×32 circles. |
| **Filter chips are pills too** — fully rounded, height **42px**, 16px text | Chips are noticeably larger than buttons. |
| **Tags are sentence case**, radius 4px, height 28px, 13px Regular | They are NOT uppercase. Uppercase tags are the giveaway of a guessed implementation. |
| **Inputs are 42px tall**, radius **8px**, `padding: 10px 10px 10px 20px` | Note the asymmetric left padding. |
| **Table rows are 58px**, headers 54px, both **13px** | People First tables are airy. 38px rows read as a spreadsheet, not this product. |
| **Cards**: radius 8px, `padding: 20px`, `gap: 20px`, shadow `0 0 4px` | |

When in doubt, read `references/geometry.md` rather than reaching for a spacing token —
component geometry and the spacing scale are separate systems here.

## Component recipes

Geometry below is measured from the Figma components, not inferred.

### Buttons

```css
.pf-btn {
  display: inline-flex; align-items: center; gap: 10px;
  height: 32px; padding: 0 20px;
  border-radius: 20px;                    /* pill — not a radius token */
  border: 1px solid transparent;
  font: var(--pf-font-weight-bold) 13px/1 var(--pf-font-body);
  cursor: pointer;
}
.pf-btn--icon-only { width: 32px; padding: 0; justify-content: center; }

.pf-btn--action        { background: var(--pf-bg-secondary-button); color: var(--pf-text-inverted-primary); }
.pf-btn--action:hover  { background: var(--pf-bg-secondary-button-hover); }
.pf-btn--positive      { background: var(--pf-bg-primary-button); color: var(--pf-text-always-white); }
.pf-btn--positive:hover{ background: var(--pf-bg-primary-button-hover); }
.pf-btn--negative      { background: var(--pf-bg-negative-button); color: var(--pf-text-always-white); }
.pf-btn--negative:hover{ background: var(--pf-bg-negative-button-hover); }
.pf-btn--hollow        { background: transparent; color: var(--pf-text-primary);
                         border-color: var(--pf-border-hollow-button); }
.pf-btn--hollow:hover  { background: var(--pf-button-fill-hollow-hover); }
```

Filter and Sort are Hollow with a funnel / arrows icon.

### Filter chip

```css
.pf-chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 42px; padding: 10px 20px;
  border-radius: 999px;                   /* pill */
  background: var(--pf-bg-primary); color: var(--pf-text-primary);
  border: 1px solid var(--pf-border-hollow-button);
  font-size: 16px; letter-spacing: -0.01em;
}
.pf-chip[aria-pressed="true"] { border-color: var(--pf-border-theme); color: var(--pf-text-theme);
                                font-weight: var(--pf-font-weight-bold); gap: 10px; }
.pf-chip:hover { background: var(--pf-bg-theme); border-color: var(--pf-border-theme);
                 color: var(--pf-text-theme); }
```

### Tags

Sentence case. Seven statuses, each with a matched fill / border / content triplet —
always all three from the same status.

```css
.pf-tag {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 5px 10px;
  border-radius: var(--pf-radius-small);  /* 4px */
  border: 1px solid; font-size: 13px;
  font-weight: var(--pf-font-weight-regular);
}
.pf-tag--positive { background: var(--pf-tag-fill-positive);
                    border-color: var(--pf-tag-border-positive);
                    color: var(--pf-tag-content-positive); }
/* ...negative, warning, neutral, info, other, expired */
```

### Form inputs

```css
.pf-input {
  height: 42px; padding: 10px 10px 10px 20px;
  border-radius: var(--pf-radius-medium); /* 8px */
  background: var(--pf-bg-primary); color: var(--pf-text-primary);
  border: 1px solid var(--pf-border-form-input);
  font-size: 16px;
}
.pf-field { display: flex; flex-direction: column; gap: 5px; }   /* label sits above */
.pf-input:disabled      { border-color: var(--pf-border-disabled); color: var(--pf-text-disabled); }
.pf-input[aria-invalid] { border-color: var(--pf-border-negative); }
.pf-label .required     { color: var(--pf-icon-required-field); }
```

Checkboxes and radios are both **20×20 with a 4px radius** — radios are not circles here.
Toggle is 55×25, radius 13.

### Tables

```css
.pf-table         { background: var(--pf-table-card); border-collapse: collapse; font-size: 13px; }
.pf-table th      { height: 54px; padding: 15px; background: var(--pf-table-header-cell);
                    text-align: left; font-weight: var(--pf-font-weight-bold); }
.pf-table td      { height: 58px; padding: 10px 15px;
                    background: var(--pf-table-primary-cell);
                    border-bottom: 1px solid var(--pf-table-border); }
.pf-table tr:nth-child(even) td { background: var(--pf-table-stripe-cell); }
.pf-table tr:hover td           { background: var(--pf-bg-theme); }
.pf-table-wrap    { border-radius: var(--pf-radius-medium); overflow: hidden; }
```

### Cards

```css
.pf-card { background: var(--pf-bg-primary);
           border-radius: var(--pf-radius-medium);   /* 8px */
           padding: 20px; display: flex; flex-direction: column; gap: 20px;
           box-shadow: var(--pf-shadow-drop-shadow); }
```

Draggable card is 50px tall with `padding: 10px 15px`; accordion rows are 84px.

## Charts

Ten categorical colours, `--pf-chart-1` … `--pf-chart-10`, in that order. They are
mode-stable (identical light and dark) — safe on any surface. Use them in sequence;
do not reorder for aesthetics or a series changes colour between screens.

1 Blue Ocean · 2 Orange · 3 Green Leaf · 4 Blue Turquoise · 5 Pineapple ·
6 Light Purple · 7 Grey Dolphin · 8 Purple Orchid · 9 Brown Gold · 10 Pink Candy

## AI surfaces

`--pf-gradient-ai-gradient` — blue → purple → pink → red. Reserved for AI features.
Do not use it as ordinary decoration.

## Dark mode

```html
<html data-theme="dark">   <!-- force dark -->
<html data-theme="light">  <!-- force light -->
<html>                     <!-- follow the OS -->
```

Handled entirely by `dist/tokens.css`. Build once with tokens and both modes work.

## Accessibility

Verified with `node scripts/check-contrast.mjs` against the pairings the components
actually use: **27 of 28 pass WCAG AA in both modes.** Two things to know:

- `--pf-text-disabled` on `--pf-bg-primary` is 3.64:1 in light mode. WCAG exempts
  disabled controls, so this is acceptable — but never use that token for live text.
- `--pf-text-positive` on `--pf-bg-primary` is 4.43:1 in dark mode, marginally under
  4.5. Fine at 18px+ or semibold; for small success text prefer pairing it with an
  icon or `--pf-bg-positive` rather than relying on colour alone.

Re-run that script after any token change.

## Known issues in the Figma source

Flag these rather than working around them silently:

- `Icon-size-xxxs` is **0px** — almost certainly unset in Figma. Do not use it.
- Two text styles share the name `Desktop text/Button text` (16px sentence case and
  13px uppercase). The 13px one is exported as `Button text (uppercase)`.
- `Spacing/sizing-medium` is scoped `ALL_SCOPES` while every other spacing token is
  scoped `GAP` — inconsistent, though the value (15px) is fine.
- Four variables (`Department`, `Project title`, `UX designer`, `Project manager`)
  live in a deleted collection and are mock content, not tokens. They are excluded.
