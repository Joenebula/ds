---
name: people-first
description: Build UI using the People First Design System (MHR). Use whenever creating or restyling any screen, page, component, artifact, or design canvas that should look like People First — buttons, forms, tables, cards, tags, navigation, charts, dashboards. Provides the colour, typography, spacing and elevation tokens plus generated stylesheets giving every Figma component, variant and text style as a ready class, in light and dark mode.
---

# People First Design System

Design tokens extracted from the People First Figma library (`aRWjBnTvdLiG50xtwodGwH`).
Everything below is generated from that file — not invented.

## Setup

Three stylesheets. Link all three:

```html
<link rel="stylesheet" href="dist/tokens.css">      <!-- the colours -->
<link rel="stylesheet" href="dist/components.css">  <!-- the components -->
<link rel="stylesheet" href="dist/type.css">        <!-- the type -->
```

`tokens.css` gives you `var(--pf-*)`. `components.css` gives you the components
themselves as ready classes — see **Component classes** below, and reach for it before
you write any CSS of your own. `type.css` gives you a class per Figma text style, so a
heading is a class rather than three hand-written declarations.

For a self-contained artifact or canvas, inline all three into a `<style>` block instead.
Never paste hex values in place of tokens.

## Hard rules

1. **Never write a raw hex value.** Every colour comes from a `--pf-*` token. If no
   token fits, the design system has no answer — say so rather than inventing one.
2. **Never hand-write component or type CSS.** If it is a button, a tag, an input, a
   table cell, a card, a nav item, the class is in `dist/components.css`; if it is a
   heading, body copy or a label, the class is in `dist/type.css`. Both are generated
   from Figma. Hand-writing either is how the wrong-shapes mistake happened: the colours
   were right and every shape was invented. Your own CSS is for page layout and
   behaviour, not for what a component looks like or how big its text is.
3. **Use semantic tokens, not primitives.** Reach for `--pf-text-primary`, not
   `--pf-base-grey-slate`. Primitives exist only to feed the semantic layer, and in
   Figma they are deliberately scoped out of every picker. Using them directly
   breaks dark mode, because primitives do not change between modes — semantics do.
4. **Green is the positive/confirm action. Blue is the default action. Pink is brand, not a button.**
   This trips people up: the theme colour (`--pf-bg-theme-full`, pink) is for brand
   surfaces and selected states, *not* primary buttons.
5. **Open Sans only**, weights 400 (Regular) and 600 (SemiBold).
6. **Dark mode is not optional.** Every semantic token already carries both modes.
   Get this free by using tokens; break it by hardcoding.
7. **Ignore the `DEPRECATED COLOURS/*` paint styles** in Figma — 46 of the 49 paint
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

### Type classes — use these rather than setting size and weight by hand

`dist/type.css` carries a class per Figma text style, checked against the extract by
`scripts/verify-type.mjs`:

```html
<h1 class="pf-text-xl-heading">Absence requests</h1>
<h2 class="pf-text-large-heading">Review request</h2>
<p  class="pf-text-body-text">Cover confirmed with the payroll team.</p>
<span class="pf-text-label-text-semibold">Return-to-work date</span>
```

Desktop is the default and drops Figma's prefix; the mobile ramp keeps it
(`.pf-text-mobile-xl-heading`). A class sets size, weight, letter-spacing, case and
line-height — **not colour**. Pair it with a `--pf-text-*` token, so the same size can be
primary, secondary or negative text.

**Line height is `normal`, and that is the Figma value.** All 23 text styles are set to
automatic line height. A specific `line-height` on a People First screen is invented —
this project had `1.2` and `1.3` hand-written into a table before anyone checked, and
the geometry check passes without them.

Two things the extract found that are worth flagging rather than working around:

- **Ten of the 23 styles have no weight set in Figma** at all — neither a font style nor
  a bound variable. Among them: `XL heading`, `Sub heading`, `Label text`, `Tag text`.
  Their classes deliberately set no `font-weight` and inherit. Four are the `(light)`
  variants, whose names promise a weight the style does not carry.
- **`Light` (300) and `Medium` (500) appear in the text styles** but no shipping
  component uses them, and they sit outside this system's stated 400/600. The classes
  exist and are marked in the CSS; prefer the 400/600 pair.

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

### The icon set

All **293** People First icons are exported from Figma to `assets/icons/<name>.svg`,
kebab-cased from the Figma name. Browse them at `docs/icons.html`; look up a name in
`tokens/_raw/icons.tsv`. **Never draw an icon by hand — use these.** A hand-drawn
substitute is the fastest way to make a screen look not-quite-People-First.

**Reference an icon rather than pasting it.** In a `.src.html` built through
`scripts/build-prototype.mjs`, write:

```html
<!--pf-icon:tick-->        <!-- 18px, the xxs icon size -->
<!--pf-icon:export 14-->   <!-- an explicit pixel size -->
```

The build expands that to the real file's markup, so the output is ordinary inline SVG
and works in a standalone artifact. A name that does not exist **fails the build** rather
than leaving a silent gap. Look names up in `docs/icons.html`.

Where you cannot use the build, paste the SVG inline (they are already minified) and size
it with CSS:

```css
.pf-icon { width: var(--pf-icon-size-xs); height: var(--pf-icon-size-xs); }
```

Every glyph is `fill="currentColor"`, so it takes the colour of its container —
set that with an **icon** token, never a text token:

```css
.pf-icon { color: var(--pf-icon-primary); }
```

Ten icons are the exception and are deliberately multi-colour: the file-type badges
(`csv` `doc` `gif-2` `jpg` `mp4` `pdf` `png` `txt-file` `xls-file` `zip`). The badge
carries a fixed colour that *is* the meaning — PDF red, spreadsheet green, document
blue, ZIP orange — with white lettering knocked out. Their document outline still
follows `currentColor`. Do not recolour the badge.

## Elevation

```css
box-shadow: var(--pf-shadow-drop-shadow);          /* 0 0 4px #c1c1c1 — cards */
box-shadow: var(--pf-shadow-modal-header-shadow);  /* 0 4px 4px rgba(0,0,0,.1) — modal/sticky headers */
```

Only these two exist. There is no elevation ramp — do not invent one.

## Layout grid

24 columns @ 1588px · 22 @ 1454px · 18 @ 1320px · 12 @ 784px.
All use a 20px gutter and 47px column width, centre-aligned.

## Component variants — what the classes are made of

> **You do not need to apply any of this by hand.** `dist/components.css` already binds
> every one of these — see **Component classes** below. This section is the reference
> for *understanding* or *checking* a binding, and for the axes you can name when asking
> for a component in a particular state.

`references/variants.md` carries **147 components and 302 variants**, each with the
exact tokens that variant binds in Figma, already translated to CSS vars.

Read it when you need to know *why* a variant looks the way it does, or to check
whether the class is doing the right thing. Never guess a variant's colours from its
name — the bindings are frequently counter-intuitive (the Action button uses
`--pf-text-inverted-primary`, not white, and that is what keeps it legible in dark mode).

Variant axes as **Figma** defines them. Not all of them were captured — for what the
stylesheet actually responds to, use the table in **Component classes** below, which is
taken from the extract. Where the two disagree, the extract is what the CSS does:

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

> **The classes already carry these numbers.** Use `.pf-button` and you get the pill for
> free. This section exists because the shapes are the thing people get wrong when they
> go off-library, and because knowing them lets you spot a page that has.

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

When in doubt, use the class. If you are working somewhere the stylesheet genuinely
cannot reach, read `references/geometry.md` rather than reaching for a spacing token —
component geometry and the spacing scale are separate systems here.

## Component classes — use these, do not rewrite them

`dist/components.css` carries **147 components and 302 variants** as real classes,
generated from the Figma extracts, plus **13 more that ship as shape only** — Figma binds
no colour variable to any of their variants (Tooltip, Menu, Stars among them), so the
class carries their measured geometry and leaves colour to you. This is the part to reach
for first. It is regenerated by `npm run build` and checked against Figma by
`node scripts/verify-components.mjs` — so it cannot quietly drift, and anything you
hand-write instead of using it is unchecked.

The naming mirrors Figma's variant panel exactly, so what you write matches what a
designer sees in the right-hand pane:

- the **component** is the class — `Filter chip` → `.pf-filter-chip`
- each **variant property** is a data attribute — `Type` → `data-type`
- **values keep Figma's own spelling**, capital letters and all — `Type=Action` →
  `data-type="Action"`

```html
<button class="pf-button" data-type="Action">Save</button>
<button class="pf-button" data-type="Hollow">Cancel</button>
<span   class="pf-tags" data-type="Positive">Approved</span>
<div    class="pf-form-field" data-input-type="Text" data-state="Error">
<td     class="pf-table-cell-ag" data-type="Default" data-style="Stripe">
```

States that have a real CSS equivalent are wired to both, so a live control behaves
correctly on its own **and** a gallery can pin any state to show it at rest:

```html
<button class="pf-button" data-type="Action">Hovers by itself</button>
<button class="pf-button" data-type="Action" data-state="Hover">Pinned hover</button>
```

`Hover`, `Disabled` and `Focus` work this way. Every other state is attribute-only.
`Default` needs no attribute — it is the bare class.

### The classes you will reach for most

Every attribute and value below is taken from the extract, so these are exactly what the
stylesheet responds to — an attribute spelled any other way silently does nothing.

| Figma component | Class | Variant properties |
|---|---|---|
| Button | `.pf-button` | `data-type` Action/Positive/Negative/Hollow/Filter/Sort · `data-state` Default/Hover |
| Filter chip | `.pf-filter-chip` | `data-state` Default/Selected/Hover · `data-active` False/True |
| Tags | `.pf-tags` | `data-type` Neutral/Positive/Negative/Warning/Expired/Other/Theme |
| Form field | `.pf-form-field` | `data-input-type` Text/Dropdown/Search/Date picker/Time picker · `data-state` Default/Disabled/Error/Selected |
| Field | `.pf-field` | `data-right-aligned` No · `data-filled` No/Yes |
| Checkbox/Radio item | `.pf-checkbox-radio-item` | `data-state` Default/Hover/Disabled/Error/Selected |
| Toggle | `.pf-toggle` | `data-on` No/Yes · `data-locked` No/Yes |
| Table header (AG) | `.pf-table-header-ag` | `data-alignment` Left/Right/Checkbox |
| Table cell (AG) | `.pf-table-cell-ag` | `data-type` Default/Checkbox · `data-style` Default/Stripe/Hover |
| Table header icons | `.pf-table-header-icons` | `data-variant` Sort/Filter/Context menu · `data-state` Default/Ascending/Descending/Filtered/Active |
| Navigation item | `.pf-navigation-item` | `data-state` Selected/Unselected/Hover · `data-device` Desktop |
| Card | `.pf-card` | `data-property-1` Default |
| Draggable card | `.pf-draggable-card` | `data-state` Default/Hover/Click/Drag/Drop |
| Toast message | `.pf-toast-message` | `data-message-type` Success/Info/Warning/Error |
| AI button | `.pf-ai-button` | `data-style` Light mode/Inverted · `data-hover` False/True |

Three of these have a shape worth knowing before you use them:

- **A selected filter chip needs both attributes** — `data-state="Selected"
  data-active="True"`. Setting the state alone matches nothing.
- **Toggle, Field and AI button use Figma's Yes/No and True/False**, not the other pair.
  `data-on="true"` does nothing; `data-on="Yes"` works.
- **`Card` really does have a property called `Property 1`** in Figma — an unnamed
  variant axis. `data-property-1="Default"` is the honest translation of it, and the
  bare `.pf-card` is what you normally want.

**A disabled Action, Positive or Negative button looks identical to an enabled one.**
That is Figma's own binding, not a bug in the library: those three bind exactly the same
fill and text in `State=Disabled` as in `State=Default`, so only the hollow types
(Hollow, Filter, Sort) visibly change, to `--pf-border-disabled` / `--pf-text-disabled`.
If a screen disables a solid button, say so — colour alone will not tell the user, which
is a real accessibility problem and worth raising against the Figma file.

The full list is every `.pf-*` in `dist/components.css`, and every one is rendered in
`docs/components.html` — open that rather than guessing whether a class exists.

### What the classes deliberately do NOT include

Generated CSS only carries what Figma actually measures. These are yours to write, and
writing them is not a violation of rule 2:

- **page layout** — grids, columns, page padding, where things sit
- **behaviour** — `cursor`, `transition`, `:focus-visible` rings
- **line-height** — not captured by the extract
- **anything drawn inside a component** — the tick glyph inside a checkbox, the knob
  inside a toggle. Supplying the glyph is yours; **positioning or sizing it is not** — see
  the next block.

Keep that CSS in one block and label it local. If something in it restates a Figma
value — a colour, a height, a radius — that is a bug, not a local style.

### A box that holds one icon centres and sizes it ITSELF

`Circle icons`, `Status` and `Waffle` each hold one smaller thing in their middle. Figma
positions that child by hand rather than with auto-layout, so for most of this project the
classes carried no alignment and pages centred the icon themselves. That is hand-written
component CSS, and a screen built from these docs shipped with the icon at the top of the
page small and pushed off-centre.

The classes now carry it. Give the component its variant and drop the icon in — **no size
on the marker, no `display`, no `place-items`, no width or height of your own**:

```html
<span class="pf-circle-icons" data-size="XS - 28px"><!--pf-icon:team--></span>
<span class="pf-status" data-status-type="Like"><!--pf-icon:like--></span>
```

The circle sizes the glyph to what Figma draws — 18/22/28/36px for the 28/36/44/52px
sizes — and centres it on both axes. Writing your own size is how one came out at 22px in
a 28px circle.

**23 variants across 3 components** work this way, listed in
`tokens/_raw/component-inner.tsv`. Every other component's child fills its box, so there is
nothing to centre.

### A composite component needs its TEMPLATE, not just its class

**This is the most important thing on this page after "do not hand-write component CSS",
and it is the newest.**

A class carries one box and three colours. That is the whole component for a `.pf-button`
or a `.pf-tag`. It is emphatically NOT the whole component for a card, a table, a panel or
a modal: `.pf-card` is a 520x358 rounded rectangle with **nothing inside it**, and it
passes every colour and geometry check while being unusable. That gap is why screens on
this project got hand-written contents, and hand-written contents are where the flat pink
band and the wrong font weights came from.

So for a composite component, paste the template:

```
dist/templates/pf-card.html        the markup
dist/templates/pf-metric-card.html
docs/templates.html                all 154 rendered, light and dark
```

Every class inside a template is a real library class, every colour is a token, every icon
is a real icon, and the structure is Figma's own child tree. Replace the placeholder text
and the sample instances; change nothing else.

**154 composite components have one, and all 154 render NOTHING from the bare class.**
If you are about to write a `<div>` inside a component class, stop and open the template.

Three things a template tells you that nothing else does:

- `<!-- 11 more of the same in Figma (13 in all) -->` — a repeating run, kept short. Repeat
  the elements above it for real data.
- `<!-- N children here in Figma that this walk did not reach -->` — genuinely unfinished;
  open the component in Figma before filling it. A blank inner div with **no** comment is
  empty in Figma, and meant to be.
- `<!-- ... detached from the Figma page tree ... -->` — the library has no class for that
  child. Two templates are blocked this way and cannot be completed here.

### When a component is not in the library

The stylesheet carries **160 classes**, and they cover 162 of the 187 non-icon Figma
components. The 25 with no class are listed in `docs/components.html` under **Not in the
library**, each with its reason — and every one is on a documentation page (Storybook and
Miro logos, "dos and don'ts" panels, project info): they describe the design system rather
than belonging to it. Nothing on a product page is missing.

Three numbers, all true, none interchangeable — quote the one you mean:

- **160 classes.** 147 of them carry colour variants (302 in all); the other 13 are
  **shape-only**, because Figma binds them no colour variable anywhere. A shape-only class
  is still real — right size, padding and radius — it just has nothing to paint.
- **162 components covered**, which is higher than 160 because three names are each shared
  by two different Figma components: `Header`, `Field` and `People`. One class serves both,
  so for those three you must check you have the one you meant. See
  `docs/FIGMA-ISSUES.md` §10.
- **187 non-icon components** in the file altogether.

Nothing on a product page is missing any more. `Tooltip`, `Menu`, `Stars`, `Field icons`
and `Component 1` were all in this list once and have since been captured.

If you think you need something that is not there, say so rather than hand-writing an
approximation that looks right to you — an unchecked component is exactly what the library
exists to prevent.


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
