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
<link rel="stylesheet" href="dist/fonts.css">       <!-- the typeface — load FIRST -->
<link rel="stylesheet" href="dist/tokens.css">      <!-- the colours -->
<link rel="stylesheet" href="dist/components.css">  <!-- the components -->
<link rel="stylesheet" href="dist/type.css">        <!-- the type -->
```

`fonts.css` ships Open Sans 400 and 600 (vendored in `assets/fonts/`, inlined as data:
URIs). Never link Google Fonts — the request fails in an artifact and behind an egress
policy, and the page then falls back silently. It also maps the UA stylesheet's 700 onto
600, because no 700 face exists and the browser would synthesise one.

`npm run verify` runs `check-fonts.mjs`, which asks the one question no other check asks:
**which face actually rendered.** For the whole life of this project the answer was DejaVu
Sans, with weight 600 painting as DejaVu Bold, while every check was green.

For a self-contained artifact or `.dc.html` canvas artboard: inline the contents of
all three into a `<style>` block. Artifacts and canvases can't reference local files, so the
link tag will silently do nothing there.

Component classes are named off Figma's variant panel — component is the class, each
variant property is a data attribute, values keep Figma's spelling:

```html
<button class="pf-button" data-type="Action">Save</button>
<div class="pf-form-field" data-input-type="Date picker" data-state="Error">
```

`docs/components.html` shows every one. Your own CSS is for page layout and behaviour
only.

**Type comes from the text styles, not from the component.** A component whose label Figma
gives a text style does not carry its own `font-size` or `font-weight` — it composes the
style, in a rule at the end of `components.css` generated from the same source as
`type.css`. So a page must never set type on a component class: the class already has it,
and writing your own puts a second, drifting copy next to the generated one.
`npm run verify` fails on it. 181 of the 208 component labels work this way; the other 27
use type the ramp cannot express and are listed in `docs/FIGMA-ISSUES.md` §7.

Dark mode: `data-theme="dark"` / `"light"` on the root, or omit to follow the OS.

## Component artwork

Some components' visual **is an image**, not a colour. The header band
(`Default header background`) is a 1920x86 raster swoosh with a charcoal dark-mode twin —
six variants in all. It binds no colour variable, so the colour extract has nothing to put
in its `fill / stroke / text` slots and used to drop the artwork entirely; the class then
rendered as an empty transparent box and whoever needed a header hand-wrote one. That is
where the flat pink band and the wrong font weights came from.

Artwork now lives in `assets/component-art/`, is listed in `tokens/_raw/component-art.tsv`,
and is **inlined as data: URIs** by `dist/components.css` — a `url()` path would fail
silently in an artifact or a `.dc.html` canvas, which is the same invisible failure again.

```html
<div class="pf-default-header-background"></div>          <!-- desktop, follows the theme -->
<div class="pf-default-header-background" data-breakpoint="Mobile"></div>
```

Light/dark is automatic via `data-theme`; you never set `data-darkmode` yourself, though
Figma's own variant attribute still works.

A component whose artwork is the same at every variant uses `*` as its variant, and the
rule lands on the bare class. To add artwork for another component: export it through `use_figma` in base64 chunks
headed `ART\t<slug>\t<format>\t<part>\t<total>`, declare the slug's owning component and
variant in the `EXPORTS` table in `scripts/extract-component-art.mjs`, run that script,
then `npm run build`.

## Boxes that centre their own child

A few components hold ONE smaller thing in the middle of themselves — `Circle icons` is a
28/36/44/52px circle around an 18/22/28/36px glyph, `Status` a 22px dot around a 16px one,
`Waffle` a 90x86 tile around a 32px mark. Figma lays all three out as **NONE**: no
auto-layout, the child positioned by hand. The geometry extract reads auto-layout, so it
had nothing to read, and the classes shipped with no alignment at all.

A page then centred the icon itself — `display: grid; place-items: center` written next to
the component class — which is hand-written component CSS, the thing this repo exists to
stop. `working/case-mgmt-my-team` did exactly that, and a screen built independently from
the same docs shipped an icon sitting small and off-centre at the top of the page, because
the page had no way to know.

The alignment is now measured rather than assumed. `scripts/extract-component-inner.mjs`
keeps a component only where the child's offsets are **equal on each axis** — so "centred"
is a reading, not a guess — and records the child's size per variant in
`tokens/_raw/component-inner.tsv`: **23 variants across 3 components**. `npm run build`
emits both facts, and a page sets neither.

```html
<span class="pf-circle-icons" data-size="XS - 28px"><!--pf-icon:team--></span>
```

No size on the icon marker: the class sizes its own child, and 21 other layout-NONE
components are deliberately absent from that file because their child FILLS them.

**The rule goes on the variant selector, not the bare class.** Every size variant carries
its own `display`, so a bare-class rule is outranked however late it is written. The first
version of this centred nothing while sizing correctly, which looks fixed.
`npm run verify` runs `check-component-inner.mjs`, which renders each variant and measures
where the child actually landed.

## What the component classes do and do not carry

A component is modelled as **one outer box plus three colour slots**
(`component-geometry.tsv` + `component-variants.tsv`). There is nowhere for a component's
*contents* to go — no children, no nested instances, no per-child type. So a component that
IS one box works as a class (`.pf-button`, `.pf-tag`, `.pf-filter-chip`) and a composite one
does not: `.pf-header`, `.pf-card`, `.pf-metric-card`, `.pf-calendar-picker` and
`.pf-table-ag` carry a size and nothing inside it.

**There are now templates for this.** `dist/templates/<class>.html` holds working markup
for each composite component, generated from its Figma child tree, and `docs/templates.html`
shows every one rendered. Paste the template — every class in it is a real library class,
every colour is a token, and every icon is a real icon. Do not hand-write the contents.

```
dist/templates/pf-metric-card.html      docs/templates.html   — see them all rendered
```

`npm run verify` runs `check-templates.mjs`, which fails if a composite component has no
template, if a template renders an empty box, or if a template's outer class is not a real
class in `components.css`. It also reports how many of them render NOTHING from the bare
class — currently **all 154 of them**, which is exactly why this exists.

**Coverage: 158 of the 161 product-page components are walked, and 154 have templates.**
The three unwalked ones are each unwalkable rather than skipped: `Multi-select checkbox`
has no children in Figma, `Side navigation tab` is the old name of `Notification tabs`, and
`Default header background` is detached from the page tree (it is artwork, and has its own
section above). Of the walked ones, four are not composite — `Tooltip` is drawn from vector
paths, `Information box` wraps an instance of itself — and two have no class to hang a
template on: Figma has two components called `Field` and two called `People`, and only the
first of each pair has rules.

**A template is only as deep as the walk that made it, and it says where it stopped.**
The walk records each node's child count, so a container that came back empty is
distinguishable from one Figma leaves empty, and any container it did stop short of carries
a comment saying how many children Figma has there. **Three** are left, each holding a
single leaf. A blank inner div with no comment IS empty in Figma.

A run of identical siblings is kept short on purpose — `Table (AG)` has thirteen rows per
column and the template carries two plus `<!-- 11 more of the same in Figma -->`. Repeat
the elements above it for real data; the third row never said anything the second did not.

**A template never uses a primitive token** (`--pf-base-*`), and `npm run verify` fails if
one appears. Six had slipped in, because the rule was applied to a child's fill and stroke
and not to its text.

(The same section used to cite "69 classes with no paint". That number was wrong —
`check-component-art.mjs` was counting rules rather than classes. The real figure is **5**,
and it was never the right measure anyway: a class can have a perfectly good background and
still be an empty box. It was 2 until `Calendar picker`, `Time picker` and `Repeating group`
had their one text colour dropped, which is explained in `docs/FIGMA-ISSUES.md` §11 — for
those three, losing their only paint was the fix rather than the fault.)

## The rule: only design-system components

A page may use design-system components. Its own CSS does **layout**, and nothing else.
`npm run verify` enforces this on anything in `working/`; run it anywhere with
`npm run off-system -- <file>`.

Three ways a page goes off-system, all of which happened on this project:

1. **An invented class.** `pf-text-medium-heading` does not exist. The title fell back to
   the browser's bold `h2` default and read as a font-weight bug for two rounds.
2. **A hand-written component.** The sub nav was written with `--pf-bg-primary`, which is
   white in light mode so it looked right and was a different grey in dark. Clock-in was
   written with `padding: 7 16 7 6` measured by eye; the component says `7 20 7 10`.
3. **An override.** Setting a property the component already owns silently undoes the
   extract.

**Properties a component owns** — and a page therefore must not set on its own class:
size, padding, radius, gap, font-size, font-weight, background, colour, border, shadow,
letter-spacing. Spacing is the exception: `padding` and `gap` are fine on a layout element
as long as every value is a `var(--pf-space-*)` token or zero.

**When something genuinely is new** — a Figma child the outer-box extract cannot reach, or
a page-shell element with no component — say so where you write it:

```css
/* pf-new: the presence dot is a child of the tile in Figma, not of any component */
.dot { ... }
```

The marker must sit immediately before the rule. It makes the exception visible and
reviewable rather than invisible.

**4. A component used as a shell.** The newest route, and the one `check-off-system`
cannot see. A page can pass every other check while hand-building the INSIDE of each
component it uses: `working/case-mgmt-my-team.html` rebuilds the whole of
`.pf-layout-container-magazine-style` out of local divs, and writes its own header contents
inside `.pf-header`. The outer class is real and the colours are tokens, so it is
"on-system" by that check's definition — and Figma's structure for the contents is thrown
away all the same. That is hand-writing a component, one level in.

`npm run verify` runs `check-template-fidelity.mjs`, which counts how many of the library
classes a component's template puts inside it the page actually uses. It reports rather
than judges — a real card holds real data, and a page may leave parts out — but a component
using NONE of several is one rebuilt by hand, and that total is pinned and may only fall.
**Two are outstanding**, both on `case-mgmt-my-team`: `pf-header` and
`pf-layout-container-magazine-style`.

It does not look at type classes. A component composes its own type, so a page must not add
`pf-text-*` inside one — see the rule above.

**`prototypes/` are exempt** — they are hand-built fixtures and score 30-63 off-system
each. That is what they are; see the section above. Builds FROM a design are not exempt.

## Editing tokens

`tokens/_raw/` is the input; everything else is generated. Re-extract from Figma into
those files, then **`npm run build`** — the whole build, never a single generator. Six
files inline `dist/components.css` (the component gallery and five ds-bundle pages), and
running only `build-components-css.mjs` leaves every one of them carrying the previous
version while every check still passes, because the checks read `dist/`. `npm run verify`
now fails if any generated file is stale.

Never hand-edit `tokens/design-tokens.json`, `dist/tokens.css`, `dist/components.css` or
`dist/type.css` — they are overwritten. Run `npm run check`
after any token change to re-verify WCAG contrast, and `npm run verify` to re-check the
component library and the example screens against Figma.

## What this repo is, and what `prototypes/` is not

This is a **pipeline**, not a design system file. Its job is to extract People First from
Figma (`aRWjBnTvdLiG50xtwodGwH`) and turn a Figma design into correct, tagged output.

**`prototypes/` are rough test fixtures.** They exist to exercise the token layer and a
subset of components, and their page composition — sidebar shell, top bar, metric tiles,
side-panel rows — is hand-built rather than taken from Figma. Measured: about 78–86% of
what paints on them uses a real library class, and **136 of the 160 classes are never used
by any of them** — the three screens between them reach for 24. That is acceptable for what they are. Do not describe them as reference
implementations, do not hand them to a developer as one, and do not rebuild them to chase
component fidelity unless asked — the user has explicitly said they are not real screens.

**The thing that must be correct is the other direction:** when asked to build something
FROM a Figma design, the output must match that design.

### Test-only Figma files — never extract these

A file may be supplied purely to test the Figma-to-output path. Such a file is **read-only
input for that one task**. Never extract its tokens, components, variants or icons into
`tokens/_raw/`, and never let it reach `dist/`, the skills or the docs — the pipeline's
design system comes from `aRWjBnTvdLiG50xtwodGwH` and nowhere else.

| File | Key | Use |
|---|---|---|
| People First design system | `aRWjBnTvdLiG50xtwodGwH` | **The** source. Extract from this only. |
| Case Management (Copy) | `kuX4KDIN0u4axsKTELYlzW` | **Testing only.** Build from it to check fidelity; never extract into the pipeline. |

## Checking any screen

`npm run verify` checks every screen in **`working/` and `prototypes/`** on six axes —
geometry, colour, icons, audit, tagging and layout — plus the component library, the type
layer and the docs, each on a different axis. They are not interchangeable: on this project
every one of them has passed while the page was visibly wrong on an axis it does not
measure.

For most of this project the six axes ran against `prototypes/` alone, which is exactly
backwards: the prototypes are rough fixtures that are allowed to be wrong, and `working/`
holds the pages built FROM a Figma design, which is the direction this repo exists to get
right. Pointing the suite at `working/` for the first time found a shape check that could
not run anywhere but the screen it was written for, 35 unnamed elements on the page meant
to be handed to a developer, and a notification badge that was white-on-sky-blue in dark
mode.

Five of the six measure an element in isolation. `verify-layout` is the one that asks
whether an element can be SEEN at all — the other five passed on a screen slicing 126px
off its own table.

**Always screenshot the result in light and dark and look at it** before saying a screen
is done:

```bash
node scripts/shoot.mjs prototypes/<screen>.html screenshots
```

A full-page capture (`--full`) flattens `position: sticky`, so a pinned sidebar looks
like it stops halfway down and a sticky footer looks like it is clipping the panel above
it. Neither is a bug. The default viewport shot shows the truth.
