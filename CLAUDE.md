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
- Open Sans only, weights 400 and 600. **Enforced, not just stated**: Figma also holds Light (300)
  and Medium (500) styles, and `build-type-css.mjs` refuses to ship them — it emits **`font-weight:
  400` explicitly** for those classes. `text-styles.tsv` still records what Figma has — its job is to
  be truthful about Figma — and the exclusions are counted and named by both the build and
  `verify-type.mjs` on every run. Re-enabling one fails the type check.

  This line used to say the build emits **no** `font-weight` for them *"so they inherit 400"*. It
  does not: a class with no weight inherits whatever the UA stylesheet says, which on an `<h2>` is
  **700** — a weight this system has no face for, so the browser synthesises one. Emitting nothing
  is not a way of saying 400. The same applies to plain `<strong>`, `<b>` and `<th>`, which the type
  layer now maps onto 600 for the same reason. See *What the 2026-09-12 merge corrected*.
- Green = positive/confirm, blue = default action, pink = brand (not a button).
- Both light and dark mode must work. Using tokens gives this for free.
- Never draw an icon by hand. All 293 are in `assets/icons/`.

## Using the tokens, components and type

Four stylesheets. For a page:

```html
<link rel="stylesheet" href="dist/fonts.css">       <!-- Open Sans, self-hosted — load FIRST -->
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

**Type comes from the text styles, not from the component.** A component whose label Figma
gives a text style does not carry its own `font-size` or `font-weight` — it composes the
style, in a rule at the end of `components.css` generated from the same source as
`type.css`. So a page must never set type on a component class: the class already has it,
and writing your own puts a second, drifting copy next to the generated one.
`npm run verify` fails on it. **183 of the 208** component labels work this way — 155 bound in
Figma and 28 matched by value. The other 25 are 23 rows the ramp cannot express and 2 ambiguous,
listed in `docs/FIGMA-ISSUES.md` §7.

**Those two figures are different units, and saying so closed a hole in the gate.** The off-ramp
census deduplicates: a label is `<component> <size>px <weight>`, so two variants of one component
with identical type collapse into one, and `Navigation item 11px 400` already does — 23 rows have
always reported as 22. The gate was pinned on the deduplicated number, so a NEW variant going off
the ramp with the type of an existing one moved nothing: rows 23 → 24, distinct 22, green. Proved
by injecting exactly that row — old gate green, new gate fails. It is pinned on ROWS now, which can
only be equal or larger, while the distinct labels stay the thing it NAMES because that is what a
person acts on. The arithmetic reconciles: 155 + 28 + 23 + 2 = 208.

Dark mode: `data-theme="dark"` / `"light"` on the root, or omit to follow the OS.


<!-- The eight sections below came from the other branch in the 2026-09-12 merge. They are
     about what a component class CARRIES — artwork, borders, shadows, clipping — and nothing
     in this half covers that ground, so neither document could replace the other. -->

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

## Borders: which edges, and how thick

The colour extract records one thing about a stroke — its token — so the generator painted
every bound stroke as `1px solid <token>`: a box, all four sides, one pixel. Figma says
otherwise 56 times, and none of it was visible to the pipeline:

- **26 variants stroke some edges and not others.** `Nav tabs` is a FILE-FOLDER tab, not an
  underlined one: unselected it rules its bottom edge; selected it rules top, left and right
  and leaves the bottom OPEN so the tab joins the panel below, with 8px top corners. Drawn
  as a box, every tab in the strip became an outlined rectangle and the selected one stopped
  reading as selected. `Table cell (AG)`, `Filter tab single`, `Sticky footer`, `Side panel
  header` and `Config parent menu` are the same mistake: a rule on one edge, drawn as a cage.
- **12 stroke all four sides at a width that is not 1px** — `AI button`, `AI banner`,
  `Draggable card` and `AG field` at 2px, `Clock in` at 1.5px. The 1px was not measured by
  eye; it was a default nobody chose.
- **18 keep a stroke paint Figma has switched OFF** and draw no border at all. Every
  `Table cell (AG)` variant is one, so a table rendered as a grid of boxes.

Measured into `tokens/_raw/component-stroke-sides.tsv` by
`scripts/extract-component-stroke-sides.mjs`. **Any component absent from that file strokes
1px on all four sides**, which is what the generator already emitted; the file is the
departures and only the departures. `npm run verify` runs `check-stroke-sides.mjs`, which
renders each one and reads the border back.

Four components are measured but not emitted — `AI banner`, `AI card modal`, `Mobile bottom
navigation` and `Status` bind no stroke token at all (two are stroked with a gradient, which
no colour variable can carry; one keeps a paint switched off; one has no stroke paint), so
there is no border style to widen. A width with no colour is not a border. The build names
them rather than skipping them quietly.

**A rule must be written with the axes the STYLESHEET uses, not the axes Figma names.**
Figma calls a variant `Type=Standard, Darkmode=False`; the stylesheet collapses an axis that
changes nothing, so the class is `.pf-clock-in[data-type="Standard"]` and a page writes only
`data-type`. The first version generated the full Figma string, so the rule matched nothing
any page produces and sat in the file looking correct. `check-stroke-sides` did not catch it
either — it built its own markup and wrote every axis. `check-off-system` did, by noticing
the page still had to set the width by hand.

## Shadows

`dist/components.css` contained the string `box-shadow` **zero times**. Figma casts a drop
shadow on **47 component variants** — `Card`, `Side panel`, `Side filter`, `Toast message`,
`Tool tip`, `Action menu`, `Table card (AG)`, `Header navigation`, `Side navigation`: every
floating surface in the system, all of them rendering flat against the page. Same shape as
the border fault — the colour extract knows a fill, a stroke and a text token, and a shadow
is none of the three.

Measured into `tokens/_raw/component-shadow.tsv` by `scripts/extract-component-shadow.mjs`.
All twelve product pages were swept and four have no effects at all, so absence from that
file means "measured, has none", not "not looked at".

**The design system has exactly two shadow tokens and the pipeline does not invent a third.**
`--pf-shadow-drop-shadow` and `--pf-shadow-modal-header-shadow`. **29 of the 47 match one
exactly** and are emitted as `box-shadow: var(--pf-shadow-*)`. The other **18 match neither**,
and nothing is emitted for them — writing Figma's rgba into the stylesheet would put a raw
colour in generated CSS and freeze it across both modes. The build names all 18 and they are
written up in `docs/FIGMA-ISSUES.md` §12, with the four shadow shapes that would clear them.

A page never writes a `box-shadow` on a component class. `npm run verify` runs
`check-shadows.mjs`, which measures the RENDERED shadow against Figma's numbers rather than
against the token name the generator picked — a wrong token, a selector matching nothing and
a token whose value drifts are three faults that all show up as the same wrong pixels. It
also asserts the negative: if one of the 18 ever starts painting, that rule was hand-written.

Neither shadow token changes between modes — both are defined once in `:root`, and
`--pf-shadow-drop-shadow` is `#c1c1c1`, a light glow that does not read on a dark ground.
That is a gap in the design system rather than in the pipeline, recorded in §12; the file
already has a mode-aware `Border/Border - Drop shadow` colour that the shadow tokens do not
use.

## Clipping — measured, and deliberately NOT carried

Figma clips the contents of **34 of the 62 components** on Cards and panels, 22 of them with
a corner radius, and `dist/components.css` sets `overflow` once. After the border and the
shadow this looked like the obvious next thing to carry, and it is the one that must not be.

The measurement that settled it: **27 of the 154 templates already render outside the box
their own class draws** — `pf-hemisphere-chart` by 333px, `pf-donut-pie-chart` by 284px,
`pf-content` by 180px. `overflow: hidden` would not have reproduced the design on those; it
would have deleted part of the component's own generated contents from view. And nothing
would have said so: a clipped child still has a bounding rect, so `check-templates` would
have gone on reporting that every template renders its contents while a fifth of one was
invisible. That is precisely the silent failure this project keeps finding — introduced on
purpose, in the name of fidelity.

The overflow is not a fault in the templates. A class's height is the artboard Figma drew
the component at, and a template holds placeholder contents of their own size; the two were
never promised to agree.

`npm run verify` runs `check-template-overflow.mjs`, which reports and pins the count. It is
the precondition: **clipping can only ever be carried once that number is zero.**

## Children a parent does not lay out

For an auto-layout parent, the order of the children is enough: the template writes the same
direction, gap and padding, and they land where Figma put them. For a parent laid out
**NONE** there is nothing to copy, and flowing them is not merely imprecise — it is a
different picture. `Profile image` is 93x93 and holds two children, a photo and a `People`
instance, **both at 0,0 at 93x93**: overlaid in Figma, stacked by the template, 93px tall
becoming 184.

`tokens/_raw/component-child-pos.tsv` records where each child sits inside a parent Figma
does not lay out, and the template places it there. Three guards, because a position applied
to the wrong node is worse than none:

1. the tree must carry that exact component and path;
2. it must **agree on the child's size** — two rotated `LINE` nodes in `Donut pie chart`
   report a rotated bounding box against the tree's unrotated size, and are refused;
3. **the class must carry the whole box.** A pixel offset means nothing unless the element
   it is measured inside is the size Figma measured it in, and the stylesheet drops a width
   above 120px on purpose. Nine components are measured and deliberately not placed for this
   reason — `Full page`, `Configuration`, `AI Assistant`, the three charts and others — and
   the build names them. Applying the offsets to them anyway pushed their children straight
   out of the box and the overflow count went UP, which is how the guard was found.

Two more things this cost, both worth knowing before touching it:

- **The outer element is the positioning origin.** Put `position: relative` on every parent
  except the root and the children resolve against whatever ancestor on the page happens to
  be positioned — on a plain page, the document, so they fly to the top-left corner.
- **An origin whose children are all absolute holds nothing in flow**, so it collapses to
  zero and everything after it slides up. It is given its measured size.

An icon is emitted as an HTML comment (`<!--pf-icon:home-->`), which cannot carry a style,
so a placement on one is wrapped in a positioned span. Before that it was silently dropped
while the build counted it as applied — which is why the build now counts what reached the
written template rather than what it intended.

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

**That last sentence is true of the CLASSES and false of the EXTRACT, and three Figma reads on
2026-09-12 showed why the backfill could never pin those two names.** They are not ambiguous
components. They are **two components each, merged under one name**, so there is no single id to
pin and refusing was correct:

| name | rows that belong to it | rows that belong to something else |
|---|---|---|
| `Field` | `Right aligned × Filled`, 300×42 — **`13737:25495`** | `Field\|Property 1=Default`, auto×42 — that is **`18846:28925`**, a one-variant 95×42 component |
| `People` | `Who?=…`, 91×91 and 64×64 — **`329:422`**, the avatar set | `Item × Type × Mobile` — that is **`10773:126429`**, a 5-type list/card/header set |

**And the merge reaches the shipped stylesheet.** `dist/components.css` carries
`.pf-field[data-property-1="Default"]` and both `.pf-people[data-who=…]` and
`.pf-people[data-item=…]` — one class wearing two components' variant axes. A page writing
`data-property-1` on `.pf-field` would get the other component's geometry. Nothing does today.

The evidence is the AXES, and they are decisive without a judgement: Figma publishes
`13737:25495` with four variants on `Right aligned × Filled` at 300×42 and `18846:28925` with one
on `Property 1` at 95×42, which is exactly how the rows divide. `Field (second component)` already
exists as a separate geometry row, so the split was started and one row was left behind under the
wrong name.

**Not fixed here.** Separating them renames shipped classes, and `People`'s half would mint a class
for a 30-variant avatar set — a library change, not a data tidy-up. Put to the design lead with the
node ids and the axes, because the answer decides what the classes are called.

**Note what this is NOT: a case for pinning harder.** The right response to a name the backfill
cannot resolve is sometimes that the name covers two things. Forcing an id onto either of these
would have made half its rows lie, and the refusal that looked like a gap was the mechanism
working.

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
`check-component-art.mjs` was counting rules rather than classes. The real figure is
**14 classes with no paint**, and it was never the right measure anyway: a class can have a
perfectly good background and still be an empty box. It read 2 until `Calendar picker`,
`Time picker` and `Repeating group` had their one text colour dropped, which is explained in
`docs/FIGMA-ISSUES.md` §11 — for those three, losing their only paint was the fix rather
than the fault. It then read 5 until the census was found to be splitting a rule's selector
list on commas, so a generated comment containing one became the "selector" and the rule
below it was attributed to nothing: nine shape-only classes — `Field icons`, `Floaters`,
`Horizontal scroll`, `Map`, `Notification image`, `People`, `Stars`, `Tooltip`, `Waffle` —
had never been in the census at all. None of them lost anything; the check simply could not
see them. That is the third time this one check has been found counting the wrong set.)

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
**One is outstanding**, on `case-mgmt-my-team`: `pf-layout-container-title`, the
"Department insights" row, which Figma gives a circle icon and a title on the left and
three buttons on the right, and the page fills with a title and two text links.

(This sentence read "Two are outstanding — `pf-header` and
`pf-layout-container-magazine-style`" for a while after those two stopped being outstanding:
rebuilding that page on its templates fixed both and left a third the note never named. The
count is checked against the script now, so it cannot drift again.)

It does not look at type classes. A component composes its own type, so a page must not add
`pf-text-*` inside one — see the rule above.

**`prototypes/` are exempt** — they are hand-built fixtures and score 30-63 off-system
each. That is what they are; see the section above. Builds FROM a design are not exempt.

## Keeping up with Figma

The Figma file keeps moving. New components are occasional rather than weekly, which is exactly
what makes drift dangerous — nobody is watching, because most weeks there is nothing to watch.
`components.json` was read on 2026-09-08 and the variant extract moved on the 9th; `Repeating
group` fell in the gap and shipped a `.pf-repeating-group` class that no inventory had heard of.

Two questions, two costs, two mechanisms:

**Do this repo's extracts agree with each other?** `check-catalogue-drift.mjs`, first in
`npm run verify`, no Figma calls. A component with a class must be in `components.json`; a
measured shape must belong to something; anything in Figma with no rules must have a line in
`tokens/_raw/uncaptured-reasons.tsv` saying why. **An unexplained absence fails.** That file is
load-bearing now, not a comment.

A reason beginning `pending:` is DEBT — known, recorded, waiting on a re-extract. It passes and
is **counted and named in the verdict line on every run**. Never delete that count to tidy the
output; it is the only thing keeping a known gap from becoming a forgotten one.

**The node id is the identity, not the name.** `component-variants.tsv` and
`component-geometry.tsv` carry `nodeId` as their **last** column — last, because six readers
destructure by position (`const [page, component, ...] = l.split('\t')`) and a leading column
would shift every one of them, while a trailing one is invisible to all of them.

This matters because Figma renames things, and a name-only comparison cannot tell a rename from
a deletion plus an addition. Comparing this repo against a newer component list produced
*"7 gone, 27 new"* when the truth was *"5 renamed, 2 removed, 22 newly captured"*. With ids, a
rename is one line that says so.

`scripts/backfill-node-ids.mjs` fills ids from `components.json` by name, makes no Figma calls,
and never invents one — an unmatched row keeps an empty id and is reported.

**The "18 geometry rows have no id on purpose" line was wrong in character as well as count**, and
the character is what mattered. It said they were all measured sub-parts (`People (row)`,
`Information box (row)`) that Figma never published as component sets, so they never would. Thirteen
of them are. The rest were real components left empty by an AMBIGUITY — a different thing entirely,
because a sub-part is finished business and an ambiguity is an unanswered question. Bundling the two
under "on purpose" is how seven open questions read as a settled decision.

It now reads **16, and they are two kinds**: 13 genuine sub-parts, plus `Field`, `Header` and
`People` — three names Figma really does publish twice, still unresolved. `Field` and `People` have
both candidates on one page so no narrowing can reach them; `Header` is the rebuilt component below.

**A geometry row borrows a tie already broken in `component-variants.tsv`.** Geometry records no
page, so the row-page narrowing cannot run there — but variants names the same components and has
been disambiguated, so `Bar chart`, `Configuration`, `Org chart` and `Signature` carry across rather
than being derived twice. The safety property is **membership**: the borrowed id must be one of that
row's own candidates, or `Bar chart` the component hands its id to `Bar chart` the glyph. The
tie-only condition beside it is recorded in the source as intent rather than a second guard, because
it cannot be one — with no candidates, membership already refuses everything, and a mutation of it
changes no behaviour. Naming a line that cannot fail beats implying two protections where there is
one.

This matters beyond tidiness: `apply-renames.mjs` renames by id and **refuses to rename by name**,
so an id-less row is a component a rename cannot reach.

**A name published twice is resolved by the row's OWN page, and that took the blind spot from 6 to
2.** Six component names matched more than one inventory id and were left empty as a coin toss:
`Bar chart`, `Configuration`, `Header`, `Org chart`, `Signature` and `Field`. Five of them are the
double-published names — once as a component, once as a glyph — and `component-variants.tsv`
already records the page it captured each row from, so only the candidate on THAT page can be what
the row means. Every one is an exact page match, and `Field` stays ambiguous because both its
components are on `Forms` — the same shape as `GIF` and `Transfer` staying ambiguous on the icon
side because both are published on `Icons`.

**What is deliberately NOT used is a page CLASS.** Narrowing to "not an excluded page" looks
equivalent and is wrong: `Icons` is a legitimate row page in `component-variants.tsv`, because
`Circle icons` is captured from it, so that rule would discard a row's own correct candidate. It is
the mistake `sync-check` made in the GONE direction, one layer down, and the row's own recorded page
is evidence where a page class is an assumption.

**And the sixth one found something.** `Header` narrowed cleanly to `13658:7653` — and that id is
not in the saved listing at all. The two Figma files disagree: `components.json` has one Navigation
`Header`, the listing has **two others**, `32488:24634` and `32527:39433`. The component was rebuilt
or split in Figma, which changes the node id, and **nobody had seen it because the id-less row fell
back to a NAME match that succeeded** — reporting `Header` unchanged while Figma had replaced it.
That is exactly what the nodeId column exists to prevent, hiding inside the gap the column had not
reached yet.

So the backfill now refuses a pin the listing contradicts, because **an id is only an identity if
the current listing still publishes it**: `components.json` is an INVENTORY and can lag, and writing
a stale id is worse than writing nothing — it is indistinguishable from a live one to every later
reader. The test is CONTRADICTION and never absence: it refuses only when the listing publishes the
NAME and not the ID. A name the listing omits entirely proves nothing and is still filled, because
refusing on absence is the *"not in this listing means not in Figma"* error made once already.

`Header` is therefore an open question for a person rather than a pinned row. Nine mutants hold
the two rules, including one that fires the guard on absence and one that writes the stale pin
anyway.

**And the question turned out to be the wrong one, which three Figma reads settled on 2026-09-12.**
This file asked *which of the two Navigation `Header`s we ship, or whether it is now both*. Only one
of them is a header:

| node | what it actually is |
|---|---|
| `32488:24634` | the header. A component SET of **32 variants — `Theme` × `Mobile`, 16 brand themes** — desktop 1830×86, mobile 390×62 |
| `32527:39433` | **not a header at all.** A 60×100 frame named `Header` holding two 20×20 symbols, one of them `14990:11954` — the `Counter` this file spent a section on |
| `13658:7653` | the id we hold. `get_metadata` refuses it as an invalid node selection, and the listing does not carry it |

**So the header was RE-AUTHORED**, and the 16 themes are: `Default – Cranberry red`, `Classic`,
`Dark mode`, `Configr`, `Velvet red`, `Striking red`, `Berry pink`, `Purple orchid`, `Purple iris`,
`Royal purple`, `Orange flame`, `Cobalt blue`, `Blue lagoon`, `Teal ocean`, `Fern green`,
`Cool grey`.

**This section used to continue "and our capture is on an axis Figma no longer has", which is true
of ONE of the two extracts and false of the other — the same scope error this file catalogues
everywhere else, made about our own files.** Measured on the tree rather than remembered:

| | what it holds | against Figma today |
|---|---|---|
| `component-geometry.tsv` | **31 `Header` rows on `Theme` × `Mobile`**, all 16 themes, 1830×86 desktop and 390×62 mobile | **current** |
| `component-variants.tsv` | **3 rows on `Breakpoint`** (Desktop / Tablet / Mobile), each binding a text colour and nothing else | **stale** |

The re-capture is half done. The shape is on Figma's current axes and has been for some time; it is
the COLOUR that is still on `Breakpoint`.

**And that is worse than either half being stale, because both halves ship onto one class.**
`dist/components.css` carries all three of these:

```
.pf-header[data-breakpoint="Desktop"]                     the colour, on the axis Figma replaced
.pf-header[data-theme="Classic"][data-mobile="No"]        the geometry, on the axes that replaced it
.pf-header[data-system="People First"]                    20×20 — the OTHER component, `32527:39433`
```

**No element can satisfy the first two at once.** A page writing `data-breakpoint` gets a text
colour and none of the theme geometry; a page writing `data-theme`/`data-mobile` gets the geometry
and no colour. Neither is empty, so both render and neither looks broken. And the third line makes
`Header` a THIRD merged class beside `Field` and `People` — the same fault as §"Two class names are
each doing the work of two components", found by looking at a different file.

Checked rather than assumed: this does **not** collide with dark mode. `dist/tokens.css` scopes the
mode to `:root[data-theme="dark"]`, so a `data-theme="Classic"` on a header cannot reach it.

`build-components-css.mjs` now reports **AXIS DISAGREEMENT** — any component whose colour rows and
geometry rows were captured against variant axes with nothing in common — counted and named on
every run. `Header` is the only one in the system, which is the reassuring half of the finding.

It compares axis NAMES and never values, and that is the line between a report anyone reads and one
nobody does: a re-capture that adds a variant, renames a value or reorders them changes the values
and nothing else, so comparing those would fire on every ordinary Figma edit. Only a re-AUTHORED
component changes the axis names. A side with no axes at all is an ABSENCE rather than a
disagreement — a component with one unvaried shape is the ordinary case — and a PARTIAL overlap is
agreement, since one half measuring an extra axis is what a deeper read looks like.

`scripts/lib/axis-split.mjs`, ten mutants, in `npm run selftest`.

**Decided 2026-09-12: LEAVE IT, until the themes are settled.** The class keeps working, the debt is
recorded here and named by the build on every run. What a re-capture would need is unchanged:
`component-variants.tsv` re-read on `Theme` × `Mobile` from `32488:24634`, and a person saying which
of the 16 themes the bare class defaults to.

**Has Figma changed since we last looked?** One call, on demand:

```
1. list_file_components_for_code_connect  fileKey aRWjBnTvdLiG50xtwodGwH
   (despite the name it takes only a file key and returns every published component — it is a
    listing, and reads no Code Connect map. D-019 bars using Code Connect as a source; this is
    not that.)
2. Save the response to tokens/_raw/figma-components.json
3. npm run sync:check
```

It reports three numbers — unchanged, new, gone. **A component new in Figma FAILS rather than
being captured automatically**: it might be real, half-finished, or an experiment somebody left
on a page, and nothing enters the published library without a person deciding. Capture it, or
add a row to `uncaptured-reasons.tsv` saying why it stays out.

**And "GONE" used to claim more than the listing can prove.** It read *"is no longer published by
Figma"*. What a saved listing proves is *"is not in this listing"*, and on 2026-09-11 the two
components carrying that verdict turned out to be opposite cases:

| | node id | what Figma said | really |
|---|---|---|---|
| `Side navigation panel` | `22973:20811` | `get_metadata`: *"node ID was not found in the file"* | **deleted** — and since RETIRED: the design lead decided on 2026-09-11, the class no longer ships, and the row carries `verdict=retired` |
| `Counter` | `14990:11954` | `get_metadata` resolves it — a 20×20 `System=People First` badge holding a "7" — and `search_design_system` returns `Counter` as a published component of this library, updated 2026-06-04 | **not gone.** The listing is incomplete |

One verdict line, two opposite truths, inside a gate. Both answers came from a Figma read, so the
fix is not to guess better: `tokens/_raw/gone-components.tsv` records `name`, `nodeId`, `verdict`,
`checked` and the evidence, read by header.

- `verdict=published` — a false alarm answered. Dropped from GONE, **counted and named in its own
  column**, because a false alarm left in a verdict line is how 286 NEW happened.
- `verdict=deleted` — confirmed removed, and still a problem: a class ships for something that does
  not exist. It keeps failing unless the evidence begins `pending:`, the same visible-debt marker
  used everywhere else, in which case it passes and is counted and named.
- **no row** — UNCONFIRMED. Fails, and says what the listing can and cannot prove, naming the one
  read that settles it.

A third verdict, `retired`, was added when the design lead decided `Side navigation panel`'s fate:
*confirmed gone from Figma, and the class removed from this repo on this date.* It exists because
the moment the component stops being captured, `sync-check` stops reporting it gone — so its
confirmation becomes STALE and fails, and the record would have to be deleted to keep the gate
green, erasing exactly the history it was kept for. A `retired` row outlives its own component, is
excluded from `staleConfirmations`, and is **counted and named in the verdict line**. A `retired`
verdict on a component that is still captured is the opposite contradiction and is reported as one.

**And `Counter`'s row is gone, because the thing it answered went away.** A refreshed listing
carries `Counter`, so nothing reports it gone and a confirmation with no subject is folklore by this
file's own stale rule. The lesson it bought — *a listing proves "not in this listing", never "not in
Figma"* — is the paragraph above, which is where it belongs. A row is an operational record, not a
place to keep a lesson.

### The gate reported a live component deleted, and its own input said otherwise

`Circle icons` (`6580:66319`) sat in the GONE column as UNCONFIRMED, and this file said what it says
for every unconfirmed GONE: *one `get_metadata` settles it.* **No Figma call was needed.** The saved
listing holds that exact node id, and `component-variants.tsv` captures the component under it —
`sync-check` was reporting a component deleted while reading a file that proved it published.

The cause is the page narrowing, and it is worth stating precisely because the narrowing itself is
right. `isExcludedPage` drops the icon page so that 281 captured glyphs are not reported as new
components. Used for the **GONE** direction as well, it made an id invisible: `Circle icons` is
published ON the icon page and captured from there. *A mechanism that cannot distinguish "not in
Figma" from "on a page my classifier hands to the other half of this check" reported the wrong one
confidently* — this file's recurring diagnosis, found inside the gate written to catch it.

**So the ID match runs over the whole listing and the NAME fallback does not**, and that asymmetry
is the whole design. An id is identity: found anywhere in the listing, it is proof of publication.
A name is not proof — `Bar chart`, `Configuration`, `Org chart` and `Signature` are each published
twice, once as a component and once as a glyph, so a name matched across the icon page would let a
GLYPH vouch for a component that really had gone. That is a false CLEAN, which is the worse
direction to be wrong in, and a mutant holds each half.

An unrecognised verdict excuses nothing — checked in `judge()` and not only in the reader, because
the reader being careful does not make `judge()` careful. And a confirmation for something no longer
reported gone is STALE and fails, the same rule `check-token-drift.mjs` applies to a declared token
nothing binds. Eleven mutants hold all of that.

**Icons are counted separately, and for a long time they were not.** Icons are published Figma
components, but they are captured by `extract-icons.mjs` into `icons.tsv` and `assets/icons/`
rather than as component classes — so comparing Figma against the COMPONENT extract alone reported
the entire icon set as uncaptured. This check said **286 NEW** for months: 281 already captured,
5 real. A verdict line that is 98% false alarm is not a gate, it is a number people learn to read
past — which is what happened, repeatedly. `isIconPage` in `check-catalogue-drift.mjs` is the one
definition of that page, and both checks use it.

**`icons.tsv` now has a nodeId column too**, so an icon rename reports as a rename — the same
id-first matching `component-variants.tsv` got in `6218a8d`. 283 of its 293 rows are pinned, and
none of it needed a Figma call: icons are published components, so the ids came from
`components.json` via `backfill-node-ids.mjs`, which now takes `icons.tsv` as a third file.

Two things make that work and both are worth knowing:

- **Page narrowing.** Four names — `Bar chart`, `Configuration`, `Org chart`, `Signature` — are
  published twice, once as a component and once as a glyph. Every row in `icons.tsv` is an icon by
  construction, so the Icons-page candidate is the right one, and that is evidence rather than a
  coin toss. `GIF` and `Transfer` are published twice *on the icon page*, so the ambiguity refusal
  stands and they stay empty. The four ids this resolves to are the exact four removed from
  component rows in `2ccdc33` as belonging to glyphs.
- **The id survives a re-extract.** `icons.tsv` is written WHOLE from batches carrying no id, so
  `build()` now carries an existing id forward keyed by name — without that, the next re-extract
  would wipe all 283 and report success. Keyed by NAME, not index, because a renamed row must not
  inherit the old name's id: that is a rename, and the backfill re-derives it. A tab in an svg cell
  is also collapsed to a space now, because a tab there would move the id column; no current row
  has one, and that was luck rather than a rule.

**The 10 rows still without an id are exactly the unresolved ones**, which is not a coincidence: a
row the inventory cannot match by name is a row whose name is wrong, and that is the same thing
that makes it unpairable. They are counted in the verdict line, because a rename among *them* is
still invisible. The list:

| `icons.tsv` | Figma | what it really is | status |
|---|---|---|---|
| ~~`addres book`~~ | `Address book` | a typo fixed in Figma | **corrected** — name only, artwork was already right |
| ~~`Calendarcross`~~ | `Calendar cross` | spacing fixed in Figma | **corrected** — as above |
| ~~`calendar link`~~ | `Calendar link` | case only | **corrected** — as above |
| `Taxes coins` | `Coins` + `Tax` | split into two | needs a Figma read for the two new glyphs |
| `Size=L/M/S/XS - ..px` | `Circle icons` | **not a Figma change at all** — `extract-icons.mjs` captured one component set's four VARIANTS as four separate icons | **extractor fixed** — it now refuses them; the four rows are left in place and reported by `--check` |
| `unnamed-813678321` | — | an unnamed node captured as an icon | needs a Figma read to identify or drop |

The two marked corrected needed no Figma call: the SVG on disk was already the right artwork, and
only the name was wrong, so it was a rename in `icons.tsv` plus a `git mv`. The rest genuinely
need a read and are left failing rather than declared — **a gate turned green by declaring a bug
acceptable is worse than one that is honestly red.** Nine actionable items with a written
diagnosis is a different thing from 286 unreadable ones.

**Four of the ten id-less rows are now pinned, by ARTWORK rather than by name.** `GIF` and
`Transfer` are each published twice on the icon page, so `backfill-node-ids.mjs` refused them — and
it was right to: exporting all four shows the pairs are **different drawings**, diverging at
character 97 of their SVG, not duplicates at all. So each row pins to its own node from a path
signature, and `scripts/pin-icon-ids.mjs` does it with a rule that keeps it honest: **the signature
must appear in that row and in no other row of the same name**, or nothing is written and the
refusal says why.

| `icons.tsv` row | node |
|---|---|
| `GIF` / `gif` | `10169:113776` |
| `GIF` / `gif-2` | `9598:97872` |
| `Transfer` / `transfer` | `11793:97862` |
| `Transfer` / `transfer-2` | `8136:78353` |

The generic document outline `M21 3.38C21.62 3.38` occurs in **thirteen** rows — CSV, Doc, JPG, PNG,
ZIP and friends — so uniqueness across the whole file would have refused a good pin, and no
uniqueness rule at all would accept anything. Within the two rows named `GIF` it is decisive, and
that narrower claim is the one the script makes and tests. Seven mutants hold it. Coordinates are
rounded to 2dp in `icons.tsv` and not in Figma's export, which is why the first probe — Figma's
`8.625` against the file's `8.63` — matched nothing at all.

**Six rows are left, and every one now has a name and a node to act on:**

| row | what it is | what it needs |
|---|---|---|
| `unnamed-813678321` | node **`8136:78321`**, a 36×36 component whose Figma name is a single space — the slug was the node id with its colon dropped | a name from a designer; the artwork exports fine |
| `Taxes coins` | split into `Coins` **`14334:1477`** and `Tax` **`32530:44518`**, both live | **no longer blocked** — both SVGs are fetchable now; capturing them is still a person's decision |
| 4 × `Size=…` | variants of `Circle icons` **`6580:66319`** | which size is "the" icon is a designer's call |

Pair the two lists by eye before importing anything.

**A component set's VARIANT is not an icon, and the extractor now knows that.** It had no concept
of what an icon is: the whole accept test was an integer index and an SVG that starts `<svg` and
ends `</svg>`, which a variant satisfies perfectly. `slug()` then ate the one character that gave
it away — `[^a-z0-9]+` turns `Size=L - 52px` into the plausible-looking `size-l-52px` — and the
`file` column is derived from that slug, so nothing downstream ever saw the `=`.

```
node scripts/extract-icons.mjs --check        # audits icons.tsv; no transcripts needed
```

Two layers, and **the structural one is the verdict**: Figma names a variant node `Property=Value`,
so an `=` decides it alone. The inventory lookup through `scripts/lib/inventory.mjs` is
CORROBORATION ONLY — it turns *"this looks like a variant"* into *"this is the Size variant of
Circle icons (6580:66319)"*, which is what a person needs to act. Keeping those apart matters: a
stale or missing `components.json` must not re-open the hole.

**The dash is not the signal.** `PDF - Warning` is a real icon and contains ` - ` exactly as the
four bogus rows do; a dash heuristic would quietly drop it. That false positive is one of the six
mutants holding this.

The four rows stay in the file. They are real artwork, only misfiled, and deleting them would lose
drawings that cannot be re-fetched while the asset host is blocked — which size is "the" icon is a
designer's call. The extractor refuses to IMPORT them, so a whole-file rewrite would drop them and
the existing `WOULD LOSE` guard puts that to a person at exactly the right moment.

**The asset host was thought to be the wall, and it is not.** This file said flatly that `Coins`,
`Tax` and `Circle icons` could not be added from here: `get_design_context` returns asset URLs
rather than inline markup, and both `https://www.figma.com/api/mcp/asset/…` and `api.figma.com`
answer `CONNECT tunnel failed, response 403`. All of that is still true, and the conclusion drawn
from it was wrong.

**`node.exportAsync({ format: 'SVG_STRING' })` runs INSIDE the plugin and returns the markup
directly**, so no asset host is involved at all. `Coins` (`14334:1477`) came back as 3,379 bytes of
real path data on the first try. The wall was never egress; it was one tool's response format, and
nothing had tried the other one. A blocker recorded once and never re-tested is indistinguishable
from a blocker that is still there — which is the same shape as every stale count this file has
had to correct.

**It happened a second time, with a different tool, on 2026-09-12.** `get_screenshot` answers with a
URL on that same blocked host, and `curl` on it returns the familiar `CONNECT tunnel failed,
response 403` — so a session that stops there concludes it cannot see the file. It can:
**`enableBase64Response: true` returns the PNG inline instead**, and the header bar
(`32488:24622`) came back as a real 1000×47 render on the first try. Same lesson, same afternoon:
the wall is one response FORMAT, not the network, and both tools carry a second route that nobody
had tried.

What is genuinely blocked stays blocked, and the distinction matters: the asset host cannot be
reached, so an image cannot be DOWNLOADED to a file here. It can be looked at, which is enough to
answer a question and not enough to capture artwork.

## Icon drift

The token layer got a drift check and the type layer got one; the ICON layer had the same hole and
nobody had noticed. `icons.tsv` holds 293 SVGs captured from transcripts, `verify-icons.mjs` checks
them against the sheet it generates FROM them, and nothing had ever compared one of those drawings
against Figma. `sync-check.mjs` is not that check either — it compares NAMES, and a redrawn icon
keeps its name, so it is invisible there by construction.

```
npm run icons:check
```

**Current reading: 287 of 287 pinned icons are identical to Figma. NOTHING has drifted.** Getting
to that took three wrong answers in a row, all of them mine, and the sequence is the useful part.

| run | verdict | what was actually wrong |
|---|---|---|
| 1 | 6 drifted | compared rounded TEXT — 2dp rounding moves the boundary rather than removing it |
| 2 | 3 drifted | compared structure plus a derived tolerance — sound, and fed by a broken parser |
| 3 | **0 drifted** | the parser read `.37` as `37` |

**The third one is the lesson.** SVG path data omits a leading zero routinely, and the two sources
disagree on it: `icons.tsv` stores `.37`, Figma's exporter writes `0.37`. Identical geometry,
different notation. The number pattern was `-?\d+\.?\d*`, which requires a digit before the point,
so every `.37` parsed as `37` and inflated that path's coordinate sum by about 36. Ten of them in
one path is the **361.32** that got reported as a redrawn icon — twice, in two different verdicts,
one of them after I had already corrected the check once.

Both earlier fixes tightened the COMPARISON and neither looked at the parser feeding it. **A
tolerance cannot forgive a number that was never read correctly**, and three rounds of making the
comparison cleverer never once questioned whether the inputs were right. The fix is
`-?(?:\d*\.\d+|\d+\.?\d*)` and three assertions, including a negative leading-dot decimal.

**It was caught by rendering the thing.** The three "drifted" icons were re-captured from Figma and
screenshotted before and after, superimposed in two colours — and there was no fringing anywhere,
just one flat blend. Two drawings that differ by 361 units of summed coordinate cannot render
identically, so the measurement was wrong rather than the artwork. **The overlay took two minutes
and settled what three rounds of arithmetic had got wrong.** The re-capture was then reverted: there
was nothing to re-capture. `scripts/recapture-icons.mjs` survives it, proved by seven mutants and
useful the day something really has been redrawn.

**A digest is PATH DATA only, and the three exclusions are the whole design.** Colour is ignored
because `icons.tsv` stores `fill="currentColor"` by design while Figma exports the real paint —
comparing it would report all 287 as drifted on run one, which is a check nobody reads twice.
Numbers are rounded to 2dp on both sides because the extractor rounds and Figma does not; **the
first attempt compared raw coordinates and matched nothing at all, not one icon of 287**. Path ORDER
is deliberately NOT normalised: a reorder changes stacking, and "probably harmless" is a person's
call.

It takes no network calls, like `extract-tokens.mjs` — a session with Figma pastes
`docs/figma-icon-digest.js` into `use_figma` and drops the result into
`tokens/_raw/figma-icon-digests.json`. **That collector is GENERATED from the check, because the
hand-copy was wrong.** It lived in the check's header as a `norm`/`hash` snippet emitting
`{id, name, len, h}` — the format of the FIRST comparison, rewritten twice underneath it and never
updated there, so the documented instructions produced a file the current `formatError()` REFUSES.
It failed safe and it was still wrong. `build-figma-icon-digest.mjs` now inlines `digest()`,
`shape()`, `NUMBER` and `BUDGET_PER_NUMBER` verbatim and `verify-generated.mjs` gates the output, so
changing the comparison without rebuilding fails `npm run verify`. `differs()` is deliberately left
behind: a collector measures, it does not judge. Without that digest file the check
exits **2**, vacuous, rather than reporting a clean run. A row the digest file does not mention is
UNCOVERED, counted and named, never failed: a partial read is not a deletion. Eleven mutants hold it,
including one that turns the vacuous 2 into a 0 — which survived until the exit code was pulled out
of `main()` into a function a test can reach.

**And the seven icons Figma has that this repo has not captured are all already-known items**, which
is the reassuring answer: `Coins` `14334:1477` and `Tax` `32530:44518` (the `Taxes coins` split), the
four `Circle icons` variants — `6580:66320`, `16896:27867`, `16896:27887`, `16896:27897`, exactly the
four bogus `Size=` rows, now with ids — and `8136:78321`, the component whose name is a single space.
No surprises, which is the first time that has been provable.

## Re-extracting

A bigger, deliberate job. The `extract-*.mjs` scripts read Figma reads out of the session
transcripts rather than calling Figma, so it needs a live session — roughly one read per Figma
page. Run `npm run selftest` first; all four extractors are proved able to fail.

**A batch carries every column, including the empty trailing ones.** Not the file's convention —
the file drops them — but the wire format's, and it is load-bearing. Batches are emitted under a
20KB truncation cap, and a batch cut off mid-row has the right number of lines; only the column
count gives it away. A row of the wrong width is a hard failure, never a dropped row.

```
PAGE	<page>        COUNT <n>   component  variant  fill  stroke  text                    nodeId
GEOMETRY	<page>    COUNT <n>   component  size  padding  radius  gap  font  layout        nodeId
TEXTSTYLES	<group> COUNT <n>   name  size  style  lineHeight  letterSpacing  textCase
TEXTBOUND	<group>  COUNT <n>   name  size  style  fontWeightVar  fontStyleVar  -  sizeVar
FROM <a> NEXT <b> OF <total> COUNT <n>   index  figmaName  svg
```

**`--update` is what makes it a re-extract rather than an append.** Both component extractors
used to read `if (known.has(component)) continue` and report the skipped rows as *"already
measured (left alone)"*. So a re-read could add a component and never correct one: a radius or a
fill that moved in Figma was dropped, and the run said it had succeeded. A difference is now
always REPORTED; `--update` applies it. Without the flag it prints `WOULD CHANGE` — silence was
the bug, not the caution.

**`get_design_context` CANNOT PROVE A BINDING IS GONE. Only `get_variable_defs` can.** The
design-context response is a code-generation view: where Figma exports a node as artwork — vector
illustration, a flattened group, a rotated divider, and sometimes a plain frame's own stroke — the
generated code carries an `<img>` and no class, and the variable the node is bound to simply is
not in the output. Read as a measurement, that is indistinguishable from the binding having been
removed, which is this repo's recurring failure exactly: *a mechanism that cannot distinguish two
states reports the wrong one confidently.*

It has already put two wrong conclusions in this file. `Toggle`'s two Locked=Yes variants were
recorded as *"FLATTENED to images and bind nothing"* and `Control` as *"binds NO colour variable
at all"*. Both were false — `get_variable_defs` on 2816:1373, 2816:1379 and 30641:14910 returns
exactly the captured tokens. `Table header (AG)` and `Table cell (AG)` render with no border class
whatsoever and both bind `Border/Default full`.

**And `get_variable_defs` has the MIRROR blind spot.** It traverses every variant of a set — that
is how `Background/Light Theme` was found on a Hover variant — but it reports only what is VISIBLE
in each variant's default state, so a layer switched off by a boolean property is missing from it.
`Message box` (26895:77316) is the case: its placeholder line binds `Text/Secondary`, the extract
records `Text/Secondary`, and the variable set does not contain it, because `placeholderText`
defaults to false. Read alone, that says the capture is stale. It is not.

So the two tools fail in opposite directions, and the rule is:

| | says a binding is THERE | says a binding is NOT there |
|---|---|---|
| `get_design_context` | trust it — and it is the only source of the ROLE (fill / stroke / text) | do not trust it — artwork exports drop bindings |
| `get_variable_defs` | trust it — but it does not say which node or which role | do not trust it — hidden layers are not traversed |

**A binding is absent only when BOTH agree it is absent.** One tool alone can prove a presence;
neither alone can prove an absence. `AI Assistant`'s missing `Base colours/Default Pink` is the one
absence in this file that has been established that way, and it is the only one asserted flatly.

Screening a component with `get_variable_defs` alone is cheap and catches every rename and split,
but it is a SCREEN, not a measurement — say so in the notes when that is all a component got.

**A captured variant absent from a re-read is reported, never deleted.** A batch legitimately
covers part of a page — the original extraction read variant sets first and plain components
later — so absence from one read is not absence from Figma. Same rule as an uncaptured
component: an unexplained absence is a question for a person, not a silent deletion.

**The two whole-file extracts refuse to shrink.** `text-styles.tsv` and `icons.tsv` are written
whole, so a partial read would delete the rest. A write that would drop a captured style or icon
is refused and names what it would have lost; `--shrink` is the deliberate override for something
genuinely gone from Figma.

And every transcript is read, oldest first, not the one with the lexicographically-last filename.
That is what lets a re-extract span more than one session, which at ~30 heavy reads it will.

## Token drift

The repo could always tell you a COMPONENT had drifted. Nothing could tell you a TOKEN had. The
component extract records a colour by its Figma variable name and every reader downstream assumes
the token layer knows that name; nothing checked it. Two were found by accident on 2026-09-11 —
`Navigation/Nav bg top` and `Border/Default full` are bound in Figma today and are in neither
`semantic.tsv` nor `primitives.tsv`. They surfaced only because the kebab decoder refused to guess
at a near miss. Luck is not a mechanism.

```
npm run tokens:check
```

No Figma calls: it reads the `get_design_context` responses already durable in the session
transcripts, pulls every `var(--…)` out, and resolves each against every name the repo holds —
colours in `semantic.tsv` and `primitives.tsv`, plus the dimensions, typography, text, effect,
grid and gradient names in `other.json`. **It is not in `npm run verify`**, because a fresh clone
has no transcripts and it would exit 2 (vacuous) and fail the chain for ever. Run it in a session
that has read components.

An unexplained unknown FAILS. A token that is genuinely not coming gets a line in
`tokens/_raw/uncaptured-tokens.tsv`; a `pending:` reason passes and is counted and named every run.

**`DEPRECATED COLOURS/*` is out by RULE, not by seven rows.** Figma named the collection
deprecated, which is the whole statement — extracting one would import into the shipped system
exactly what is being retired, and a rule says that once and covers the next one automatically.
`isDeprecatedCollection` in `check-token-drift.mjs` replaced the seven `pending:` rows that used
to say it individually.

The rows went; **the visibility did not**, and that distinction is the point. All seven are still
counted in their own column of the verdict line and named on every run with the components that
bind them, because the rule in this file is absolute: *never delete that count to tidy the output.*
What changed is where the knowledge lives, never whether anyone can see it. Five mutants hold that
line — the loudest being a rule that excuses a retired colour without counting it.

It is not an excuse either — but **what it is has now been checked against the live file rather
than against old transcripts, and the previous paragraph here was wrong.** It said nine components
still bind the retired names, that `Full page` bound four and that `Header` bound a deprecated pink
alongside its twin. A direct read on 2026-09-11 says:

| | |
|---|---|
| `Full page`, `Header`, `Mobile key actions` | **already clean** — no deprecated style at all |
| `AI Assistant` | **three**, not one |
| `[S] Config child menu` | **two**, not one |
| still carrying them | 6 components, **12 style references**, 5 distinct colours |

**And they are PAINT STYLES, not variable bindings** — `fillStyleId` / `strokeStyleId`, which is
why they never appear in a node's `boundVariables`. That matters more than it sounds: it means the
fix is NOT the same-value rename this file used to describe. Every one of the five values maps to
several semantic variables — `#FFFFFF` to nine of them, `#E5E5E5` to both `Border/Default full` and
`-hidden` — so picking one is a design decision, **invisible in light mode and wrong in dark**,
which is exactly the failure mode the rest of this file exists to prevent.

**277 nodes were rebound on 2026-09-11**, leaving `AI Assistant` completely clean and retiring
two of the seven colours outright:

| was | now | light | dark |
|---|---|---|---|
| `AI Assistant` — four `"10"` labels | `Text/Theme` | `#CD2359` unchanged | `#5CC4EA` |
| `AI Assistant` — `"How can I help you today?"` | `Text/Primary` | `#3E3E3E` unchanged | `#FFFFFF` |
| `AI Assistant` — panel stroke | `Border/Default full` | `#E5E5E5` unchanged | `#656565` |
| `[S] Config child menu` — `Line 17` divider | `Border/Default full` | `#E5E5E5` unchanged | `#656565` |
| `Waffle` — 270 dots, 18 in each of 15 themes | `Icons/Icon - Always white` | `#FFFFFF` unchanged | `#FFFFFF` deliberately |

`Text/Theme` rather than `Background/Theme` is the whole lesson in one line: they share `#CD2359`
in light and diverge in dark (`#5CC4EA` against `#33B5E5`), so matching the ROLE is what makes the
swap safe. Left unpublished for review. `Grey slate (A)` and `Default theme pink (A)` have no
references left **among the extracted components** — and this file used to say they had none at
all, which is wrong by a factor of sixty. File-wide they have **681 and 125**. See below.

**What is left is not rebinding work.** Two cases have no correct token:

- `Browser drop down` and `Option` fill a selected row with `#0075BE`, and every semantic at that
  value is a TEXT or ICON token. `Background/Highlight` is role-correct at `#F0F2F6` — a different
  colour.
- `Table header icons` fills three Hover states with `#E5E5E5`, where the only semantics are
  `Border/*`. `Background/Tertiary` is role-correct at `#F2F2F2` — again a different colour.

**The waffle was a third, and it was not. It is now DONE, and it should never have been on that
list.** 270 vectors — 18 in each of the 15 Theme variants of the `Waffle` set (`32517:29171`,
page `Navigation`) — were rebound to `Icons/Icon - Always white` on 2026-09-11 and verified
0 styled / 270 bound, with a screenshot of all 15.

What this file said before was that the waffle *could not be fixed here*: that the vectors sit
inside `App menu`, a remote component, carrying **0 overrides**, so the style was inherited and the
fix belonged to another library's owner. Half of that is true. `App menu` IS remote — `13658:6706`,
key `87407bb150c15d117e7f74f6c07a4e262f4b739d`. **The 0 came off a different node.** It was read
from the *Configr* waffle (`32544:53025`), whose `vectorSample` is empty — it has no waffle dots at
all — and applied to the People First one, which reports **19 overrides: `fillStyleId` ×18 and
`fills` ×18**. Measuring one variant and reporting the other is this file's own recurring failure
wearing a new hat.

**One property settles it without counting anything**, and it is the check worth keeping:
`DEPRECATED COLOURS/White` is `remote: false` — a style LOCAL to this file. A remote component
cannot reference a local style, so the fills could only ever have been set here. Where an override
count can be read off the wrong node, that cannot.

The token is `Icons/Icon - Always white`, not `Icon - Primary inverted` — and that is now proved
from the variables rather than argued from intent: **Always white aliases the same primitive
(`VariableID:27998:12734`) in BOTH Lightmode and Darkmode; Primary inverted aliases `12734` light
and `12735` dark.** Every waffle backdrop is a fixed brand colour (`#B90C2A` on the default, and 14
others from `#79C56E` to `#1D1F27`), so the dots must not flip. An earlier reading of "white on
white" was a too-shallow parent lookup and was wrong too.

**A cold `findAll` under-reports, and it nearly shipped a 15× error.** The first census compared
`fillStyleId` against the style id and found the deprecated style in **2** of the 15 variants. A
second pass that resolved each node's style to a NAME found it in all 15. Re-running the *identical*
id comparison afterwards then returned 270 as well — the same code, the same file, no writes in
between. The difference is that the subtree had been traversed once by then. Treat the first
traversal of a subtree as a warm-up whose counts are not evidence: **run any whole-file Figma census
twice and believe it only when the two runs agree.** Had the first number been trusted, 13 variants
would have been left carrying a retired style while the verdict line said the job was done.

**And the extract only ever saw a corner of this.** A sweep of the whole file for
`DEPRECATED COLOURS/White` finds **203 nodes still carrying it across 10 pages** — 27 on `WIKI`, 26
on `STYLE GUIDE`, 40 on `DOCUMENT MANAGEMENT`, and the rest spread over `Tables` (28), `AI` (24),
`Buttons and links` (17), `Navigation` (18), `Analytics and charts` (8), `Controls` (8) and
`System messages` (7). `tokens:check` sees none of them, because it reads captured components and
these are mostly specimens, documentation swatches and uncaptured variants. Among the 18 on
`Navigation` are seven inside `Full page` — which the line above calls *already clean*, and which is
clean only of the colours that line was measuring. **The count in a verdict line is scoped to what
was extracted, and that is not the same as what is in Figma.**

All 203 are sorted in `tokens/_raw/deprecated-white-census.tsv`, which no check reads — it is a
worklist for a person. **Only 26 are in components this repo ships a class for**, and 10 of those
are the whole job: fixing them clears 55 more that merely inherit. The remaining ~120 are
documentation: internal prototype templates, annotation chrome and pasted mockups on
`📄 DOCUMENT MANAGEMENT`, `📚 WIKI` and `AI`, none of it published, none of it shipping anything.

**Forty-seven of those are a judgement call rather than debt**, and they are marked `judge` rather
than `leave`: they are the colour SPECIMENS on `🎨 STYLE GUIDE` and `📚 WIKI` — the `BG primary` /
`Icon theme` tiles that demonstrate the system. Leaving them means the style guide keeps showing
the system in a retired style. That is a designer's call and not a bug, which is why the census
names the bucket instead of folding them into either answer.

The census also carries its own soft edge in writing: the SET-HERE / INHERITED split is computed
from instance override lists and does not fully close — `Warning` and `App menu` are named as
origins for nodes while carrying the style on no descendant of their own. That changes the ORDER of
the work and never the total, and saying so in the file is cheaper than a reader discovering it.

**Twenty-two of the `fix` bucket were rebound on 2026-09-11, and 203 became 141.** Twenty-two edits
cleared sixty-two nodes, because forty were instances that inherit. `Tables`, `Controls` and
`Analytics and charts` are completely clear; `System messages` is down to one. Every rebind
preserves today's appearance exactly, which was the bar: a rebind that changes how light mode looks
is a design decision, not a rebind.

**The biggest thing that run found is that the role matching this file keeps agonising over is
DECLARED.** Every variable carries `scopes` — `TEXT_FILL`, `SHAPE_FILL`, `STROKE_COLOR`,
`FRAME_FILL` — so "which of the twelve white tokens belongs on this node" is a lookup, not a
judgement. Twelve semantics resolve to `#FFFFFF` in light and they fan out in dark from `#1D1F27`
to `#FFFFFF`; scopes cut that to two or three candidates before anyone has to think. A text node
takes `Text/Always White` or `Text/Inverted primary` and nothing else can even be offered.

**A guard must test the risk, not a proxy for it — and mine did not.** Before rebinding glyphs onto
coloured badges I gated on backdrop luminance, and it ABORTED the run: `Icons/Icon - Info` `#33B5E5`
measures 0.615, comfortably "light". But that backdrop is `#33B5E5` in BOTH modes. The risk being
guarded against is a backdrop that FLIPS — that is what makes a static white wrong — and brightness
is not that. Rewritten as *white's contrast against this backdrop must be no worse in dark than in
light*, it passed the same four backdrops honestly. A guard that fires on the wrong question is not
cautious, it is a stopped clock.

It did surface something real on the way past. White on `Icons/Icon - Info` is **2.36:1** and on
`Icons/Icon - Warning` **2.44:1**, where WCAG wants 3:1 for non-text. That is PRE-EXISTING — the
deprecated style was the same white — and unchanged by the rebind, but it had never been measured
before. It is recorded, and the fix is the badge colour rather than the glyph.

**Three Figma API facts that cost a cycle each**, worth having in writing:

- **Instance vector data cannot be overridden.** `setVectorNetworkAsync` on a vector inside an
  instance throws *"This property cannot be overridden in an instance: vector-data"*. The fix goes
  on the node's own `fills`, not into the geometry.
- **A vector whose regions differ reports `fills` as `figma.mixed`**, and the idiom
  `JSON.parse(JSON.stringify(node.fills))` then throws `SyntaxError: unexpected token: 'undefined'`
  — `JSON.stringify` of a Symbol is `undefined`. Construct the paint instead of cloning it. Eight
  nodes failed this way in one batch while seven succeeded, which is what made it visible.
- **Setting node-level `fills` does not fill an unfilled region.** Region 0 of those eight was
  empty before and after, so the artwork is untouched — checked, not assumed, because the
  alternative was flattening eight icons.

**The cold-`findAll` under-report came back after an MCP reconnect**, which is worth knowing because
it means the warm-up is per connection and not per file: the first sweep after reconnecting returned
**92** against a settled **143**. Two agreeing sweeps is the rule, every time, not just the first
time in a session.

**And the last three `fix` nodes are not token work at all.** They are white artwork on a white
surface — invisible as drawn — so there is nothing to preserve and a token cannot be chosen without
knowing the intent. `Header`'s Configr app icon is the clear one: the Configr header variant's own
fill is a plain unbound `#FFFFFF`, and the token that fits is almost certainly
`Navigation/Configr nav` (`#656565` light, `#FFFFFF` dark) — white is right in dark and wrong in
light, which is exactly what a static white cannot express. Applying it would change light mode from
invisible to grey, so it goes to a designer rather than into a commit. `Status type=New social
group` is the same shape with a different cause: `fills[0].visible === false`, so the badge
background is switched off and its glyph renders on nothing.

## The retired collection is 46 styles, not 7

Everything above treats `DEPRECATED COLOURS` as seven names, because seven is what the extracted
components bind. A sweep of the live file on 2026-09-11 — every page, twice, agreeing — says the
collection holds **46 paint styles carrying 1,940 references**. The white census that took a week's
worth of care was **7% of it**, and the only part anyone had looked at.

`tokens/_raw/deprecated-collection-census.tsv` has the lot. The shape of the work:

| | | |
|---|---|---|
| `Grey slate (A)` | `#3E3E3E` | **681** refs across 16 pages |
| `Grey steel` | `#E5E5E5` | 259 |
| `Grey fog (A)` | `#656565` | 178 |
| `White` | `#FFFFFF` | 141 (was 203) |
| `Default theme pink (A)` | `#CD2359` | 125 |
| the other 41 | | 556, of which **10 styles have no reference in this file at all** |

**Two of this file's own claims did not survive that sweep.** It said `Grey slate (A)` and
`Default theme pink (A)` "now have no references at all" after the AI Assistant rebinds. They have
681 and 125. The statement was true of the extracted components and was written as though it were
true of Figma — the same scope error the white census found, five times larger. The sentence above
is corrected rather than deleted, because *"a verdict-line count is scoped to what was extracted"*
is a rule this file now states twice and broke twice.

**Six pairs share a value under two names, and every pair is one live name beside a dead one** —
which is what a half-finished rename looks like: `#3E3E3E` is `Grey slate (A)` 681 and `Cool grey`
0; `#CD2359` is `Default theme pink (A)` 125 and `Cranberry red` 0; `#BE2028`, `#2066AF` and
`#33B5E5` the same shape.

**The exception is the one that matters. `#FFFFFF` is `White` at 141 AND `Grey dolphin` at 75, and
both are live** — a second deprecated white that the white census never counted, because that
census was written from a single style id. A sweep keyed on one name cannot see the other, which is
this repo's recurring failure in its purest form: *a mechanism that cannot distinguish two states
reports the wrong one confidently.* The collection-wide sweep keys on the COLLECTION, so it cannot
miss a sibling by construction.

### The grey run, and the wall it hit

`Grey slate (A)`, `Grey steel` and `Grey fog (A)` are 1,118 of the 1,940. **348 were rebound on
2026-09-11 and the collection went to 1,592**, two agreeing sweeps each time:

| | | |
|---|---|---|
| 240 | `Grey steel` **strokes** | `Border/Default full` — 259 to 19 |
| 72 | `Grey slate (A)` text | `Text/Primary` — 681 to 609 |
| 23 | `Grey fog (A)` text | `Text/Secondary` — 178 to 142 |
| 13 | `Grey fog (A)` vectors | `Icons/Icon - Secondary` |

**`Grey steel` was the clean one because it is a BORDER.** 240 of its 259 references were strokes,
none inherited, one role, one token — a border does not depend on what is behind it the way text
does, so nothing had to be looked at twice. The 19 left are fills: six are the known
`Table header icons` hover case, eight are `Line` rectangles of annotation chrome, five are
specimens and one-offs.

**The other two are blocked, and by something bigger than the greys.** Of the 646 `Grey slate (A)`
TEXT nodes, only **72 sit on a surface that follows the mode**:

| backdrop of the text | count | |
|---|---|---|
| a SEMANTIC variable | 72 | rebound |
| a **PRIMITIVE** | 287 | held |
| a **RAW hex** | 177 | held |
| another **DEPRECATED** style | 108 | held |
| no filled ancestor at all | 2 | held |

`Grey fog (A)` is the same shape — 40 raw, 52 deprecated — plus 49 frame strokes held separately,
because a `#656565` frame stroke could be a hollow-button border, a nav item or a divider and those
take three different tokens.

**You cannot give text a mode-aware token over a surface that does not change mode.** `Text/Primary`
is `#3E3E3E` light and `#FFFFFF` dark; put it on text sitting over a raw `#FFFFFF` panel and dark
mode renders white on white. `Text/Always grey slate` would preserve both modes — and would cement
a light-only design in place, making the surface bug permanent and invisible, which is this repo's
definition of the worst kind of green.

So **574 held-back nodes are not waiting on a token decision. They are waiting on their SURFACES**,
and every one of those surfaces is its own entry in the census. That reorders the whole job: the
retirement is not a sweep down a list of colours, it is surfaces first and everything that sits on
them second. The token layer cannot fix a page whose panels are raw hex.

### Only 346 of it is the shipped library — and 346 was still a PAGE count

The retirement reads like a quarter of work until you split the remaining 1,592 by page. Two
agreeing sweeps:

| | |
|---|---|
| **346** | COMPONENT pages — the shipped library. **The real job.** |
| 1,073 | documentation — `WIKI`, `STYLE GUIDE`, `DOCUMENT MANAGEMENT` |
| 173 | the `AI` exploration page |

**Sixty-seven per cent of what is left is documentation.** Only 21 of the 46 styles touch a
component page at all, and five of them are 231 of the 346: `Grey slate (A)` 113, `Default theme
pink (A)` 58, `Grey` 33, `White` 28, `Green leaf` 19.

That is the number to plan against, and the rest is a separate question rather than a smaller
version of the same one: should the style guide and the wiki demonstrate the system in a retired
style? The white census raised it at 47 nodes; across the collection it is 1,073.

**The surfaces were checked before anything was applied, and they are not mechanical.** Every
surface value behind the blocked grey text maps to several semantic frame-fill variables that
diverge in dark:

| value | candidates |
|---|---|
| `#FFFFFF` | **7** — `Background/Primary` `#2C313C`, `Table/Card` `#2C313C`, `Table/Primary cell` `#323441`, `Org cards/Fills/BG Main` `#1D1F27`, `Navigation/Nav bg left` `#1D1F27`, `Nav bg top` `#23252E`, `Tags/Fills/Info` `#FFFFFF` |
| `#FAFAFA` | 2 — `Background/Secondary` `#1D1F27` vs `Table/Stripe cell` `#23252E` |
| `#F2F2F2` | 2 — `Background/Tertiary` `#282A32` vs `Table/Header cell` `#141414` |

A page background and a table stripe are the same colour in light and different in dark. Choosing
between them from a light-mode render is the decision this repo exists to stop anyone making by
accident, so the surfaces stay for a person — and with them the 574 text nodes that sit on them.

### The whole collection in one sweep, and the number every earlier one was a piece of

Every figure above came from a per-style run, so the collection total was an aggregate of separate
measurements taken at different moments. On 2026-09-12 the driver swept **all 46 styles in one
traversal**, twice agreeing: **403 nodes outside the three documentation pages, carrying 414 style
references** (a node can carry a fill and a stroke).

**Read the scope before the number.** That count EXCLUDES `WIKI`, `STYLE GUIDE` and
`DOCUMENT MANAGEMENT`, so it is not the 1,423 file-wide figure minus documentation, and it does not
split component pages from the `AI` page — a split this sweep did not measure. This file has twice
written a scoped count as though it were a file-wide one; saying which is which is the cheap half
of not doing it a third time.

**Twenty-seven of the forty-six styles have no node outside documentation at all.** Nineteen styles
are the entire shipped-side job, and two of them are half of it: `Grey slate (A)` at 177 and
`White` at 52.

**174 of the 414 are one question.** `Grey slate (A)` text holds on `Text/Primary` (`#FFFFFF` dark)
against `Text/Always grey slate` (`#3E3E3E` dark) — answering it settles 42% of what is left, and
it is the same surfaces question this file has been circling: `Text/Primary` is correct only where
the panel underneath follows the mode.

**Six nodes would have applied and were deliberately not.** They are `Green leaf` STROKES taking
`Charts/Chart 3`. The rule applies a stroke and REPORTS its ratio rather than holding, which exists
so the 240 `Grey steel` dividers could be rebound — and its own note on five of the six reads
*"only 2.82:1 in dark — fine for a divider, wrong for an icon outline"*. A chart series line is a
mark a reader has to read, and the eight `Green leaf` FILLS beside them were held by the guard at
exactly those ratios. Applying the strokes while holding the fills would split one cluster on a
distinction node type cannot see. **The rule is not wrong and it is not enough here**, so the six
are recorded with their ratios rather than written; the fix is the series colour, not the token.

**`Grey steel`'s last 9 are all FILLS**, every one holding on `Border/Default full` against
`Border/Default hidden`. As a STROKE that colour had one answer and 240 nodes took it; used as a
fill it has two. The split this repo confirmed with the design lead is what makes it ambiguous.

### "On a component page" is not "in a component", and that was the last scope error

The section above this one says **346 COMPONENT pages — the shipped library. The real job.** It is
wrong, and it is the same mistake one level further out: a page is not a component. Classifying the
403 by ANCESTRY rather than by page, twice agreeing:

| | |
|---|---|
| 213 | inside an INSTANCE placed on a board |
| 155 | loose on the canvas — specimens, rules, annotation chrome |
| **35** | **inside a COMPONENT or COMPONENT_SET — the published library** |

**The shipped job is 35 nodes across 27 components.** A component page in this file is mostly
BOARDS: a master beside a dozen placed instances of it, a Dos-and-don'ts panel, a rules strip, a
specimen row. All of it renders identically to the real thing and none of it publishes — which is
exactly why a page-scoped count read as a library-scoped one for so long.

**Why an instance node is not the library, stated so it can be checked rather than trusted.** An
instance node carrying the style either inherits it from its master — in which case that master
node is itself among the 35, since it is on the same page and the sweep found it — or carries it as
a board-level override. A master in *another* file cannot be the source: `DEPRECATED COLOURS` styles
are `remote: false`, and a remote component cannot reference a local style. That is the property
that settled the waffle, used again. Either way the instance is a USAGE, and fixing the master is
what fixes the library.

Seventeen of the 35 are `White`, seven `Grey slate (A)`, three `Grey steel`, three `Default theme
pink (A)`, two `Grey`, two `Blue shark`, one `Blue deep ocean (A)`.

**It is 15 components, not the 27 first recorded, and the node-by-node list is now written down** in
`tokens/_raw/deprecated-shipped-worklist.tsv`. The 27 came from a classifier that stopped at the
nearest COMPONENT — which inside a component SET is the VARIANT — so `Link=Key actions` and
`Link=MHR` were counted as two components when they are two variants of `Mobile key actions`.
Climbing to the set gives 15, and three of them are 18 of the 35: `Full page` 9, `Mobile key
actions` 6, `Header` 3.

**And that list disproves something this file says twice.** `Full page`, `Header` and `Mobile key
actions` are recorded above as *"already clean — no deprecated style at all"*. They are not: those
three hold **18 of the 35**, over half the shipped job. The claim was scoped to the colours being
measured on 2026-09-11 and was written as though it were general — the same scope error, for the
fourth time, and the reason the sentence above now carries its scope in the sentence itself.

**Three patterns account for most of the 35, and each is ONE fix rather than N.** The six `Mobile
key actions` rows are the same `Key actions` label in six Link variants. The five `Full page`
mobile-nav vectors are five glyphs in one frame inside one `Navigation item` instance. The Configr
`Folder organiser` glyph appears three times because `Full page` embeds `Header` — fixing Header's
master clears two of them, and it is the known white-on-white case where `Navigation/Configr nav`
is probably right and would change light mode from invisible to grey.

**13 of the 35 are direct and 22 sit inside an instance nested within a component master.** That is
published content of that master, so it ships either way; what it changes is where the edit goes.

**And the surfaces holding the rest are boards too.** 301 of the 403 sit on something that does not
follow the mode, and the largest of those surfaces are Figma SECTIONS and specimen frames —
`Button rules` (14 nodes under it), `How to use` (9), `Bar chart` (8), `Dos and don'ts`, `Rules`.
**249 of the 301 sit on a raw `#FFFFFF`.** A text node whose nearest filled ancestor is a SECTION is
not inside any component at all; it is a label on the board. Meanwhile **98 of the 403 DO sit on a
variable-bound surface** — those are held on candidate ambiguity, not on surfaces, and the earlier
grey run conflated the two.

So the *"574 nodes are waiting on their surfaces"* framing holds, and the thing they are waiting on
is mostly the page furniture rather than the product.

### The scope rule, and the thing it does not prove

Pink and `Grey` `#868686` went next, and the method got sharper: rather than choosing a token by
hand, derive the REQUIRED SCOPE from the node — a stroke needs `STROKE_COLOR`, a text fill
`TEXT_FILL`, a frame fill `FRAME_FILL`, anything else `SHAPE_FILL` — then take the semantic
variables at that value carrying that scope. **Exactly one candidate means apply; more than one
means hold.** No judgement, and the holds name their own candidates.

It took the collection from 1,592 to **1,514**, and component pages from 346 to **268**:

| | | |
|---|---|---|
| 47 | `Default theme pink` vectors | `Icons/Icon - Theme` — 125 to 76 |
| 1 | pink text | `Text/Theme` |
| 1 | pink line stroke | `Border/Theme` |
| 18 | `Grey` `#868686` vectors | `Icons/Icon - Disabled` — 36 to 7 |

Nine pink fills held (`SHAPE_FILL` is shared by `Icons/Icon - Theme` and `Background/Theme`, which
diverge in dark: `#5CC4EA` against `#33B5E5`) and 13 grey strokes held (`STROKE_COLOR` shared by
`Icons/Icon - Disabled` and `Border/Tertiary`).

**And then the rule's limit showed up, in my own work.** A single-candidate scope match proves *the
system has one meaning for that colour in that role*. It does **not** prove the designer used the
colour for that meaning. The check afterwards could not confirm the 18: every node now bound to
`Icons/Icon - Disabled` comes back as 260 — overwhelmingly pre-existing bindings rather than mine —
and only 11 sit somewhere named Disabled. The rest are ordinary `Left chevron < Button < Actions`,
`Right arrow < Switcher`, `Tooltip question < Field label`. If any of the 18 are that kind of node
they now resolve to `#F2F2F2` in DARK MODE, near-white and effectively invisible, while light mode
is unchanged at `#868686` — which is precisely why nobody would notice.

**The real mistake was not the rule. It was writing without recording what was written.** Nothing
logged which node ids changed, so the 18 cannot now be separated from the others already bound.
Every earlier run here logged its targets; this one logged a count. **A batch write must record its
ids, or its verification is guesswork.**

**So the going-back audited the whole population instead, and found something larger.** Warm, two
agreeing runs: **277 nodes on component pages are bound to `Icons/Icon - Disabled`, 13 of them sit
anywhere named Disabled, and 86 of the remaining 264 fail WCAG 3:1 in DARK MODE** against their own
backdrop — 45 of those on a static `#FFFFFF` panel at **1.12:1**, which is the surfaces problem
compounding: a raw-hex panel does not darken, so a near-white icon lands on a white ground. The
worst clusters are `Dashboard star < Stars` (30), `Union < Vector` (12) and
`Icon viewport/Icon_Template` (12).

**259 of the 277 predate today, so this is a file-wide pattern rather than my bug — and my 18
joined it.** The pattern is a grey icon taking the Disabled token because the value matches, with
nobody seeing the consequence because it only exists in dark mode.

**My 18 did make their own nodes worse, and that deserves precision rather than comfort.** Before
the rebind they were a static `#868686` in both modes — about 3.6:1 on a white panel, readable.
After it they are `#F2F2F2` in dark, 1.12:1, not. Light mode is identical either way, so no
screenshot in the mode anyone actually looks at would have shown it. The fix for all 86 is one
decision rather than eighteen: these are secondary icons, not disabled ones, and
`Icons/Icon - Secondary` (`#656565` light, `#C1C1C1` dark) is role-correct. That is a designer's
call across seven pages, so it is recorded rather than applied.

**And the cold-`findAll` under-report bit the going-back itself.** The first audit returned **38**;
re-running the identical count three times gave **37, 260, 260**. So the warm-up is not merely per
session or per connection — it is per PREDICATE: a `findAll` with a filter that has not walked those
subtrees before under-reports on its first pass, however warm the file is for other queries. The
38-node audit was published to nobody only because the number looked wrong beside an earlier one.
**Two agreeing runs, for every query, every time — including the query that is checking another
query.**

### The guard that stops the mistake I had just made

The next run kept the scope rule and added the lesson to it as a **dark-mode contrast guard**:
having found the single scope-matched candidate, resolve both the candidate and the node's own
backdrop in Darkmode and refuse the write if the pair falls under 3:1. Plus the other lesson —
every id written is logged, to `tokens/_raw/deprecated-rebinds-applied.tsv`.

Collection **1,514 to 1,429**; 20 edits cleared 85 nodes. **And the guard earned its place on its
first run**, holding 13 nodes whose one legal candidate would have been unreadable in dark against
their own backdrop: 12 `Green leaf` → `Charts/Chart 3` at 2.82:1 and 2.94:1, one `Blue sky` →
`Icons/Icon - Info` at 2.36:1. That is exactly the mistake the `Grey` `#868686` run made eighteen
times. The rule that picks the token is unchanged; what changed is that it must now survive a
measurement before it is written.

**Four colours have no semantic at their value at all**, and they are one kind of thing rather than
four odd cases:

| | | |
|---|---|---|
| `Blue Charade` | `#2C313C` | 13 — the DARK value of `Background/Primary` |
| `Blue shark` | `#1D1F27` | 4 — the DARK value of `Navigation/Nav bg left` |
| `Black` | `#1A1A1A` | 2 — the DARK value of `Progress bar/Border` |
| `Blue deep ocean (A)` | `#2066AF` | 1 |

Someone painted a dark-mode colour statically into a light-mode design. **There is no token to
rebind them to, because what they want is "the dark value of X", and a variable expresses that by
MODE rather than by name.** They need redrawing, not rebinding — and no amount of sweeping will
ever clear them.

**The biggest hold is still the surfaces**: 110 `Grey slate (A)` text (`Text/Primary` against
`Text/Always grey slate`), 16 `White` text with four candidates, 15 `Blue ocean (A)` rectangles, 12
`White` vectors with seven. Every one is a case where the candidates agree in light and differ in
dark, so none can be settled from the render anyone actually looks at.

### The rule is a file now, and writing its test changed it twice

Every rebind above was run from a script pasted into `use_figma`, so the rule lived only in the
session that typed it. It changed three times in one afternoon — twice because it was wrong — and
nothing could replay it, test it, or prove it able to fail. `scripts/lib/rebind-rule.mjs` is that
decision with no Figma in it: `chooseToken` takes what a caller measured and returns APPLY with one
variable or HOLD with a reason. **Twelve mutants hold it**, and it is in `npm run selftest`.

Writing the test corrected the rule twice, which is the argument for having written it:

- **A stroke must not be held on contrast.** The first version held anything under 3:1. The fixture
  for it showed `Border/Default full` is `#656565` in dark on a `#2C313C` panel — **2.24:1** — so a
  3:1 bar on strokes would have held all 240 `Grey steel` borders rebound correctly earlier the
  same day. A divider is MEANT to be quiet; an icon is not, and node type cannot tell them apart.
  So a stroke is applied and its ratio **reported**, and the hard hold is for marks a reader has to
  actually read. `MEASURED_ROLES` is `TEXT_FILL` and `SHAPE_FILL`.
- **A near-miss fixture has to be near enough.** The "light must match exactly" assertion used
  `#FEFEFE` against `#FFFFFF`, and a mutant comparing only the first three hex digits **survived** —
  those differ anyway. `#FFFFFE` kills it. A fixture that a sloppy implementation would also reject
  tests nothing, which is the shape of half the false comfort in this repo's history.

A third mutant found a line that could not be falsified at all: once `MEASURED_ROLES` stopped
containing `FRAME_FILL`, the separate `want === 'FRAME_FILL'` early return only suppressed a note.
It now has an assertion of its own — a surface is not even MEASURED against its parent, because a
card on a page is quiet by design and a note there is noise. *A guard nothing can falsify is a line
nobody can trust.*

### And the driver is generated from the rule, so the two cannot drift

A rule nothing can run is half a mechanism. `docs/figma-rebind-deprecated.js` is the Figma-side
driver: set `STYLE_NAME`, paste it into `use_figma`, read the report — and it **writes nothing until
you also set `WRITE = true`**. It is **generated** by
`scripts/build-figma-rebind.mjs`, which inlines `rebind-rule.mjs` verbatim — a plugin sandbox cannot
import a module, and a hand-copied second copy is how a fixed rule keeps being run in its broken
form. `verify-generated.mjs` gates it (one of six now — the icon collector is generated the same way
and for the same reason), so changing the rule without rebuilding fails
`npm run verify` rather than leaving a stale copy to be pasted into Figma and believed.

The driver's own job is only the four things the rule cannot do for itself, and each one cost a
cycle:

- **Report by default.** Every other script here reports and writes only with `--write`; this one
  wrote the moment it was pasted, which is the wrong default for the single tool in the repo whose
  mistakes land in someone else's file. A dry run still names every node it WOULD change and every
  node it holds, so the held reasons can be read before anything moves. **Proved by RUNNING the
  generated driver against a stub Figma**, not by grepping it for `if (WRITE)` — a string search
  passes on a driver that writes anyway one line lower. Five mutants: the guard removed, the default
  flipped, the id log moved inside the guard, `WROTE` hardcoded, and a dry run that reports nothing.

- **Sweep twice and REFUSE to write unless the counts agree.** Not warn — refuse, and return the
  two numbers.
- **Resolve light and dark by mode NAME**, never by position or `defaultModeId`.
- **Log every node id it writes**, in the exact four columns
  `tokens/_raw/deprecated-rebinds-applied.tsv` takes.

**Its self-test exists because the first build was broken and said it had succeeded.** The inliner
carried the rule's `#!/usr/bin/env node` shebang into the generated file, which is a syntax error on
its second line — and nothing parsed the output, so nothing noticed. The self-test now compiles the
whole generated script as an async function body with `figma` in scope, and also checks that a
restructured rule module THROWS rather than quietly inlining the wrong span. **A builder that emits
unusable bytes and reports success is the `--` problem in a new place.**

### The verdict line stopped asserting a number it never measured

`tokens:check` ended every run with *"...but nine components still bind the retired NAME"*. Nine was
true of the extracted components when it was written, was never re-measured, and the live file holds
46 retired styles. A hardcoded figure in a verdict line is the thing this file keeps diagnosing in
other people's mechanisms — **a number people learn to read past** — and it was sitting in ours.

It now names the dated snapshot instead. A census that is MISSING is said out loud, and one
carrying no date is called out as unable to be aged. This check reads transcripts and cannot
re-count Figma; pretending otherwise is how the nine got there.

**And the first version of THAT had the same bug one size smaller.** It read one `# checked:` header
and one count and printed them together — so the moment the 12 September sweep put a new number in
the file, the line reported *"1423 references as at 2026-09-11"*: a 12 September figure wearing an
11 September date. It also could not see the two most actionable readings in the census at all, so
the shipped-library figure — **35 nodes** — never reached anyone running the check.

**Each reading now carries its own date**, and attaching the NEWEST date to every reading would have
been the opposite error and worse: it would overstate the freshness of the oldest number in the
file. A reading with no date of its own falls back to `# checked:` **only while nothing in the file
is newer than that** — the moment a later sweep is present, an undated number cannot be assumed to
be from either date, and it is named rather than resolved by guessing. Nine mutants hold it now,
including one that restores the silent older-dating and one that drops the newest readings from the
line.

**And the first version of those four assertions could only ever PASS.** They were written at the
top of `selfTest`, above its own `const miss` — and `if (!ok) miss(...)` never touches `miss` while
it is passing, so the temporal-dead-zone error appears only once something is genuinely broken.
Every mutant died of a `ReferenceError` instead of a recorded MISS, and only the harness rule that
**a mutant must die of a MISS, never of a crash** caught it. A test that cannot fail reports green
for both states, which is this repo's own recurring failure aimed at its own test suite.

**And `Border/Default hidden` has a light value and no dark value at all** — worth knowing, since
three components map onto it.

**The name guard was tightened on 2026-09-11, and the reason is the lesson.** It was written to
reject prose that merely contains `var(--`, and it rejected the single character `…` — one
SPELLING, not the class. `--...` still passed, because a dot was in the allowed set, and so did
`--\u2026`, the escape spelling, because a backslash was allowed for the sake of `--text\/primary`.
Both appear in `check-token-drift.mjs`'s own comments and self-test, and both came back as UNKNOWN
tokens the moment a session re-read the file. The guard is now written from what a Figma name IS
rather than from what prose has been seen to do: of the 223 names this repo holds, **none contains
a dot and none contains a backslash**, so the dot is gone and a backslash is legal only in the
`\/` pair a kebab variable uses to escape its separator. Four mutants hold it, including one that
allows the dot back and one that rejects the real names too.

## What the 2026-09-12 merge corrected

Two branches ran side by side from 2026-09-09 — this one on the colour retirement and the drift
checks, the other on component fidelity — and 52 files conflicted. Merging them corrected four
things that neither branch could see alone, and each is the same shape: **a claim that was true of
one branch's evidence, written as though it were true of Figma.**

**`Border/Default full` and `-hidden` were never blocked.** This file says at length that applying
the 38-row split waits on `figma-variables.json`, a file this environment cannot fetch. The other
branch's `semantic.tsv` already had both, with light and dark values — along with 14 more tokens
recorded here as missing, the whole Configr set among them. Its extract had already applied the
split: 0 rows on the old name against 43 on `-full`. **The file we were waiting for was on the
other branch**, and 13 `uncaptured-tokens.tsv` declarations were dead the moment the two met.

**Emitting no `font-weight` does not mean "inherits 400".** This file states that
`build-type-css.mjs` deliberately emits nothing for off-system weights *so they inherit 400*. They
inherit whatever the UA stylesheet says, which on an `<h2>` is **700** — a weight this system does
not ship, so the browser synthesises it. The other branch had found that for unweighted styles and
fixed it; the same argument applies to the off-ramp, and the merged build now emits 400 explicitly
for both. The same fault one layer out: `<strong>`, `<b>` and `<th>` are 700 in every UA stylesheet
and the type layer declared nothing for them, so the "400 and 600 only" rule was true of the
classes and false of the page.

**One screen had been shipping with no type layer at all.** `build-prototype.mjs` read
`if (html.includes('/*__TYPE__*/'))` — so a source without the placeholder was built silently
without the type layer, and `timesheet-approvals.src.html` was in that state. It now fails loudly.
A silently skipped layer is the same failure as a silently skipped check.

**And the rename was real, after I recorded that it was not.** `Side navigation tab` →
`Notification tabs`: the other branch's extract carries both names as separate components with
different variant axes, which looked like proof that nothing had been renamed. `sync:check` settled
it the way this repo always settles a rename — **by node id**. All five rows under both names are
`22973:20747`, and `components.json` lists that one id twice. It is one component captured twice,
and a name-only comparison fooled me in both directions inside one afternoon.

**Two checks wanted the opposite of each other from one file.** `check-detached.mjs` requires every
uncaptured detached component to be written up in `uncaptured-reasons.tsv`; `check-catalogue-drift`
calls a reason stale when its component is in no source — which a detached component never is.
Running both, one demanded exactly the 23 rows the other deleted. The file serves two purposes and
both are legitimate, so the carve-out is declared rather than inferred.

**Two branches also wrote a `verify-layout.mjs` independently, asking different questions** — one
"is anything cut off or escaping?", the other "does anything that should line up, line up?".
Keeping one would have lost an axis silently, so the first is now `verify-clipped.mjs`. It
immediately found a `Selected action banner` pushing its buttons 369px outside its own box, because
the extract measured a hug-contents gap of **899px** on the Figma canvas and the generator emitted
it faithfully. Hug-contents is a canvas behaviour, not a page one.

**What was deliberately NOT merged away:** `ds-bundle/` and its builder. This branch deleted them
as having no reader; the other branch's `package.json` calls the builder on every build, and git
never flagged the deletion because that branch had not modified the file. Restoring it was the
conservative move — a silent deletion inside someone else's merge is the thing this file forbids
everywhere else. Re-applying it is a decision, not a merge artefact.

## Provenance: who said it

Every content heuristic above closed a SPELLING. None closed the class, and the class kept
reappearing — five times now, the last being the very prompt that investigated it. The fix is
structural and it lives in `scripts/lib/transcript.mjs`.

`scrapeBatches` keeps any string matching a regex, wherever it sits. That is right for the BATCH
markers, which are `^`-anchored. It is wrong for a Figma RESPONSE, whose markers sit in the middle
of a generated file — so a string that merely *contains* one matches, and this repo's own comments
quote those formats verbatim on purpose.

A transcript records who said it. `scrapeFigma(paths, re)` uses that:

| | |
|---|---|
| a tool result | `type:"user"`, a `tool_result` block in `message.content[]`, carrying `tool_use_id` |
| its tool | that id equals the `id` of an assistant `tool_use` block, which has `name` and `input` |

Counted over the real transcript: of 156 strings matching the style marker, **127 are under an
`mcp__Figma__*` result and 29 are not** — and every one of the 29 resolves to `Bash`, `Write` or
`Agent`. For `data-node-id=`, 302 against 24. **100% of the contamination removed, 0% of the real
data lost.** `type:check` went from 18 rejected occurrences to **0**: every one was this repo's own
source, never a Figma truncation.

**It also dedupes.** Every result is stored twice — `message.content[].tool_result.content` and the
top-level `toolUseResult` mirror. Only the canonical path is walked, so every count these checks
printed was roughly halved, and was roughly doubled before.

**It is a separate function, not an option on `scrapeBatches`.** The five `extract-*.mjs` scripts
must keep the old behaviour exactly: their batches arrive as **Bash results** — a script printed
them — so a `mcp__Figma__` rule would zero them out. 0 of the 8 batches in this transcript survive
it. Keeping the two apart is the whole point, and a mutant holds it.

**The transcript is not the durable record; the TSVs are.** `tokens/_raw/` holds 302 variant rows,
502 geometry rows and 293 icon rows, and the only transcript on disk contains 4 `PAGE` batches and
1 `GEOMETRY` batch. The batches those files were built from are in sessions that no longer exist —
which is what the refuse-to-shrink guards have been protecting all along.

**Escaping depth is not meaning, and 53 real bindings were being dropped for it.** The same
binding reaches the transcript as `var(--border\/theme)` from one read and `var(--border\\/theme)`
from another, depending on how many string literals the response passed through. `NAME_SHAPE`
allowed exactly one backslash, so the doubled form failed the shape test and was filtered out —
**in silence**, because a name that fails the guard is dropped rather than reported. Measured after
provenance landed: 53 occurrences across **17 genuine Figma reads of this file**, one of them
`--border\\/default-full`, a token this check exists to find. Nothing was ever reported *wrong* —
they resolve to names the repo holds — the check was simply measuring less than it said, which is
the failure it keeps finding in other mechanisms. Collapsing any run of backslashes to one took the
count from 979 to **1032** bound variables, with `resolved` unchanged at 102 and still 0 unknown.

**A result too big to inline is a POINTER, and the payload is still Figma's answer.** The
transcript stores an oversized result as `<persisted-output> … Full output saved to: <path>` plus a
2 KB preview, and the bytes sit in a sibling `tool-results/` directory that `transcriptFiles()`
never sees — it is non-recursive and filters to `.jsonl`. So the checks were scraping this repo's
own source **while missing genuine Figma responses**: the two halves of one blindness. `scrapeFigma`
now follows the pointer, and three rules make that safe rather than merely bigger:

- **The file, never the preview.** The preview is the same response truncated at 2 KB, so reading
  both would stand a half-arrived duplicate beside the whole one — the truncation hazard the shape
  guards exist to catch, manufactured for free.
- **Parsed, not scanned raw.** A spilled MCP result is the content-block array, so its text is
  JSON-escaped. The first run of this scanned the raw file and `check-type-drift` correctly rejected
  five real Figma style reports as *"truncated or quoted source"* — the check catching my bug. The
  escaping is a representation, not damage.
- **The path is data.** It comes out of the transcript, so only a file inside that transcript's own
  directory is read.

It found one attributable Figma spill (`AI Assistant`, node `27507:11696`, our file), taking
`tokens:check` from 101 resolved to **102**. A second 87 KB spill is a real `get_design_context`
response that no pointer references — and **276 of its node ids match none of the 475 in our
inventory**, so it belongs to one of the other two Figma files and is rightly left out.

### It CAN attribute a read to a Figma file after all

This file used to say flatly that it could not. That was true of the response and false of the
call: `tool_use.input.fileKey` carries it, and the join is exact. The transcript holds **three**
Figma files — `aRWjBnTvdLiG50xtwodGwH` (ours), `kuX4KDIN0u4axsKTELYlzW` and
`3GENMC1nb7BxGNFfU0nBVW` — and about a fifth of the marker-bearing reads were not ours. Both drift
checks now filter to this file and **count and name what they excluded**.

That settled ten `pending:` rows in `uncaptured-tokens.tsv` written to excuse exactly this, and
**three of them said the opposite of what the evidence shows**: `shark`,
`progress-bar---text-percentage-(light)` and `1st-(light)/default-5%-theme` were recorded as
verified in this file, and every read that binds them is of `3GENMC1nb7BxGNFfU0nBVW`. Nine rows
were proven foreign and removed.

**The tenth was not, and that distinction is the point.** `grey` appears in NO read now — its
evidence was in a transcript that has since rotated away. Absence from a rotated transcript is not
absence from Figma, and deleting a row on that basis is the silent deletion this repo forbids
everywhere else. So `unverifiable:` joins `pending:` as a marker: it PASSES, is **counted and named
in the verdict line every run**, and says the honest thing — nobody can check this here. It is not
an excuse; a plain declaration nothing binds is still STALE and still fails. Four mutants hold the
difference.

**One more thing it found.** `backfill-text-weights.mjs` is the third reader of the style marker,
has the loosest name regex of the three, and is the only one that **writes** — to `text-styles.tsv`,
which the whole type layer is generated from. It also reported a permanent false alarm on every
run: `Italic` is a slant, not a weight, and sits in the weight column deliberately
(`build-type-css.mjs` emits `font-weight: 400; font-style: italic`, `verify-type.mjs` checks it).
It was the only reader that did not know. A verdict line carrying a permanent false alarm is a
number people learn to read past — this repo's own diagnosis of the 286-NEW case.

**`Border/Default` is SPLIT, and the whole mapping is now recorded.** Figma split it into
`Border/Default full` and `Border/Default hidden`; the design lead confirmed on 2026-09-11 that this
is deliberate. All 21 components whose stroke rows still record the old name — 38 rows — have been
resolved: **13 came from `get_variable_defs` reads already durable in the transcripts**, which is
what the provenance join bought; 5 were read fresh, 3 came from the earlier re-read, and the last
**2 needed `get_design_context`**. Eighteen bind `-full` on their root, three bind `-hidden`.

**The last two are the two-tool rule paying off exactly as written.** `Editable list card` and
`Spotlight Card` each bind BOTH names, and `get_variable_defs` gives a component's set of bindings
without saying which node or which role — so it could not choose. `get_design_context` gives both:
`Editable list card` binds `-full` on its root and `-hidden` on an inner panel's `border-r`, so its
row is `-full`; `Spotlight Card` binds `-hidden` on its own root. Neither was guessed, and neither
needed to be.

The 13 screened with `get_variable_defs` carry the standing caveat: that tool proves a binding is
PRESENT, never that one is absent, so a `-hidden` binding on a boolean-hidden layer is not ruled
out for them.

**And the split IS applied — this paragraph used to say it was blocked, and the merge disproved
that too.** It read: *"rewriting the 38 rows today would still delete `border-color` from 21 shipped
components; the correction becomes a mechanical apply the moment `figma-variables.json` lands."* The
file we were waiting for was on the other branch. Measured on the merged tree: **0 rows on the bare
`Border/Default`, 43 on `Border/Default full`, and `dist/components.css` contains the string
`unmapped Figma token` zero times.** The 13 `uncaptured-tokens.tsv` declarations written to excuse
the wait went with it.

`build-components-css.mjs` still emits `/* unmapped Figma token: X */` instead of a declaration when
the token layer lacks a name, and still counts and names those in its verdict line — that mechanism
is what would have made the blocked state visible, and it is worth keeping for the next token that
goes missing. It simply has nothing to report here any more.

This is the fourth blocker in this file that was recorded once and never re-tested, after the asset
host, the `Border/Default` file itself and the `Circle icons` read below. **A blocker recorded once
and never re-tested is indistinguishable from a blocker that is still there** — and the cost is not
neutral: every one of them had work parked behind it.

**The token layer needs a file this environment cannot fetch.** `semantic.tsv` needs a light
value, a dark value and scopes per token. `get_variable_defs` resolves ONE mode and takes no mode
parameter, and the Figma Variables REST API that carries both modes plus scopes is on
`api.figma.com`, which this environment's egress policy denies (`CONNECT tunnel failed, response
403`) — the same wall that blocks `download_assets`. So a missing token's light value is
recoverable here and its dark value is not, and adding it with a guessed dark value would break
dark mode while passing every check in this repo.

`scripts/extract-tokens.mjs` is the other half, and it is built and proved. It makes NO network
calls: a person runs the request and drops the response in.

```
GET https://api.figma.com/v1/files/aRWjBnTvdLiG50xtwodGwH/variables/local
X-Figma-Token: <a PAT with the file_variables:read scope — Enterprise plan only>
  -> tokens/_raw/figma-variables.json
node scripts/extract-tokens.mjs            # dry run: reports, writes nothing
node scripts/extract-tokens.mjs --write --update
npm run build && npm run check && npm run verify
```

Without that file it exits **2** — vacuous, measured nothing — rather than reporting a clean run.

Four of its rules are the ones that matter, and each is proved by a mutant:

- **Light and dark are resolved by mode NAME, never by position or `defaultModeId`.** "Default" is
  whichever mode a designer left selected, and a dark-first collection resolved by position would
  invert the entire system in one silent run. A collection whose modes cannot be identified FAILS
  and says so; a single-mode collection is mode-stable, which is what the ten chart colours are.
- **An unknown collection is REFUSED, not imported.** The file also holds `DEPRECATED COLOURS`, the
  Configr theme and the raw `1st (light)` / `2nd (light)` ramps. Importing them wholesale would put
  into the shipped system exactly what is being retired. Same gate `sync-check.mjs` applies to a new
  component: it is reported by name and a person decides.
- **An alias keeps its `@Name` form** — 145 of the current rows are aliases, and 16 of those point
  at another semantic token rather than a primitive. An alias the response does not contain is an
  error, never a raw value in its place. A primitive that aliases is refused: `primitives.tsv` holds
  literals and every reader of it expects one.
- **It refuses to shrink**, like `text-styles.tsv` and `icons.tsv`. A partial response is
  indistinguishable from a deletion, so a write that would drop a captured token names what it
  would have lost; `--shrink` is the deliberate override.

## Type drift

Same hole, one layer over. `verify-type.mjs` checks `dist/type.css` against `text-styles.tsv` and
`build-type-css.mjs` generates the one from the other, so the type layer is internally consistent —
and **nothing checked the extract against Figma.** Two files agreeing with each other says nothing
about whether either is right.

```
npm run type:check
```

No Figma calls, same source as `tokens:check`: the design-context responses already in the
transcripts end with a line naming every text style they used, verbatim. It is **not in
`npm run verify`**, for the same reason — a fresh clone has no transcripts and would exit 2 for ever.

Current reading: **12 of 23 styles verified, 0 differences, 0 conflicts, 11 not seen.** The 11 are
counted AND NAMED on every run, because "0 differences" across half the file reads exactly like
"0 differences" across all of it — the `--` problem again.

Three things make the naive version of this check wrong, and each is a mutant:

- **Figma reports variable-bound values where the extract records literals.** `Desktop text/Body
  text` comes back as `style: Weight/Regular, size: Size/S`; the extract says `16 / Regular`. Same
  style. Worse, `Body text (semi bold, 600)` arrives BOTH ways in one run — 43 bound, 6 literal —
  so without resolving first they look like a contradiction rather than one style. `Size/S` is 16
  and `Weight/Bold` is SemiBold, both in `other.json`.
- **Two styles share one name.** `Desktop text/Button text` is captured twice, 16 sentence-case and
  13 UPPER. Matching pairs on name AND size; a name alone compares the wrong row and passes.
- **This repo's own source USED to be in the haystack.** The marker cannot be anchored — Figma
  appends it at the END of generated code — so the first live run scraped six occurrences of this
  repo's own comments and fixtures, and one of them, being LAST, won and reported a difference that
  did not exist.

  **Provenance closed that, and the paragraph that used to sit here is now wrong.** It named a
  residual limit: that a verbatim, well-formed report quoted in a source comment is byte-identical
  to a real one and slips past every content check. True when written; false since the checks began
  reading only `mcp__Figma__*` results. Byte-identical or not, a source comment did not come from
  Figma, so it is never in the haystack to be weighed. Rejections went **18 → 0** on the run that
  landed it. The claim is corrected rather than left standing, because a limit that no longer exists
  is how the next unnecessary content heuristic gets written to close it.

  Both mechanisms stay, for the narrower jobs that are still real. The **shape guard** now earns its
  place on TRUNCATION alone: batches come under a 20KB cap, so a half-arrived `Font()` inside a
  genuine response is possible and is indistinguishable from a style that lost its letterSpacing.
  **Agreement instead of last-wins** now earns its place on a disagreement between two GENUINE
  reads — a stale page, a mid-edit file — which is a question for a person, so a conflict names both
  sides and their counts rather than picking the popular one.

**A mutation test corrected this file's own comment.** The regex requires a style name to start
`Desktop text/` or `Mobile text/`, and the comment said that was what kept the effect styles
(`Drop shadow: Effect(...)`) out. It is not — `Font\(` does that. What the prefix really does is
anchor the name's LEFT edge: Figma comma-separates the entries, so a pattern that merely forbids a
colon walks backwards over the previous entry and captures `"#517A38, Desktop text/Label text"`,
which matches no row and reports ABSENT — 27 false differences. Widening the name changed nothing
about Effect styles, and that is how the comment was found to be wrong.

## Editing tokens

`tokens/_raw/` is the input; everything else is generated. Re-extract from Figma into
those files, then **`npm run build`** — the whole build, never a single generator. Six
files inline `dist/components.css` (the component gallery and five ds-bundle pages), and
running only `build-components-css.mjs` leaves every one of them carrying the previous
version while every check still passes, because the checks read `dist/`. `npm run verify`
now fails if any generated file is stale.

Never hand-edit `tokens/design-tokens.json`, `dist/tokens.css`, `dist/components.css`,
`dist/type.css` or `dist/fonts.css` — they are overwritten. Run `npm run check`
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

**Edit the `.src.html`, never the `.html`.** `npm run build` generates every screen from its
source; the built file is an output. Editing it directly is overwritten on the next build, and
until then the screen and its source disagree.

`npm run verify` checks every screen in **`working/` and `prototypes/`** on thirteen axes —
built, geometry, colour, icons, audit, fonts, layout, clipped, frame, content, tagging, images,
source — plus the component library, the type layer, the docs, and every GENERATED FILE THAT
SOMEBODY READS, each on a different axis.

That last one is `verify-generated.mjs`, and it closes a gap commit `223f4d1` named and deferred:
*"verify-built.mjs gates prototypes/ and nothing gates ds-bundle/ or docs/."* It rebuilds
`docs/components.html`, `reference/index.html` and the two `people-first` skill references into a
temp directory and compares bytes — never touching the real file, because a check that writes is
not a check. These four are gated because they have READERS: `CLAUDE.md` tells people to open the
gallery rather than guess whether a class exists, and the skill quotes its references as fact. A
stale one is not a stale preview, it is a confident wrong answer.

Each builder takes an optional output path so the rebuild can go somewhere else, and the
self-test checks that every one of them actually honours it — a builder that ignored the argument
would make the gate compare a file against itself and pass for ever. They are not
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

**It runs on exactly one screen**, `working/button`, whose extract landed on 2026-09-12 — see
*What decision 4 actually found* below. The other four screens have no `.figma.xml` and, it turns
out, no design to make one from.

A `--` is a check that measured nothing. It is not a pass.

**Four of the thirteen had never measured anything, on any screen, and three of them do now.**
`frame`, `content` and `source` need a saved Figma extract beside the screen —
`<screen>.figma.json` for the first two, `<screen>.figma.xml` for `source` — and for the whole life
of this project **no screen had either file**. They reported `--` honestly and the suite tallied
them, so nothing lied; but this file described them as working safety nets, which is the half that
was wrong.

`working/button` has both files as of 2026-09-12, so the count is **19**, not 22, and those three
axes read *"4 of 5"* rather than *"EVERY one, so this axis has never run"*. `images` is still at 5
of 5 — see below.

**`images` is the fourth and it is vacuous for a different reason, which is worth separating.** It
takes EITHER input: an `images` block in the extract, or any element on the page carrying
`data-avatar`. `case-mgmt-my-team` renders **eighteen** avatars and tags none, so the axis reports
*"nothing claims a picture"* on a screen full of them. And the gap it would have caught is one the
screen's own header already admits: six of the eighteen people have a photograph in the design and
all eighteen render the default avatar, because that file's frames cannot be reached from here
(**re-tested 2026-09-12 and the diagnosis is sharper than "cannot be reached"** — see below).
That is exactly *a placeholder quietly becoming the finished thing*, written down by hand in a
comment because the check that exists to count it could not see it.

Tagging them is not a one-line fix, and the reason is the interesting part: `verify-images` passes
a stand-in only when it paints a **marked** placeholder from `build-placeholders.mjs`. These paint
the real People First default avatar, which is a legitimate design element — so tagging them as
they are turns the axis red rather than counted. Choosing between a screen that looks finished and
one that shows its gaps is a design decision, so it is recorded here rather than made.

`screen-viewport.mjs` reads the same missing `<screen>.figma.json`, so it is inert too. Every
check therefore measures every screen at the 1280 default — and `screenshot-screen.mjs`, reading
the same absent declaration, shoots it at **640**. So the picture a person looks at and the width
the checks measure are not the same width, and neither was chosen for this design.

**That mattered immediately, and not in the way first written here.** This paragraph claimed the
9-column people grid "overlaps its own avatars at 1280". It does not, at any width: measured,
**0 overlapping avatar pairs and 0 overlapping text pairs at 1280, 1440 and 1920**, and no
horizontal overflow. The claim came from reading a 1280px capture displayed at 879px — a 1.46×
downscale closes the gaps between a 76px avatar and its 120px cell until they look welded
together. *Measuring with the eye on a resized image is not measuring*, and it is the same
failure this file catalogues in every mechanism: a reading that cannot distinguish two states,
reported confidently.

What IS measured, at 640px where the screenshots are taken: before the space-between gap fix the
page overflowed horizontally to **972px**; after it, it fits 640 exactly. The title wrapping to
two lines there is unchanged by that fix and is simply a desktop design in a mobile window.

Whether either width is right for this design is precisely what the declaration exists to answer,
and nothing has ever answered it.

**There was a THIRD width, and it was in the one axis that asks whether anything escapes.**
`verify-clipped.mjs` opened its browser at a hardcoded `1440` while its three browser-based
siblings — `verify-frame`, `verify-images`, `verify-layout` — all read `viewportFor`. It now reads
it too. That is not a tuning change: a check measuring a window nobody chose is measuring the
window rather than the screen, which is the sentence `screen-viewport.mjs` was written to stop
being true.

**And the obvious next assertion is deliberately NOT added.** A page whose `scrollWidth` exceeds
its viewport looks like content escaping the page itself, and that is exactly the 972-against-640
bug above — so asserting it seems free. It is not: a 1160px desktop design shown in a 640px window
is *supposed* to overflow, so the assertion is a false-positive machine on every screen until the
declaration says which width is the design's. The measurement is real and the gate has to wait for
the same missing file as the other four.

The verdict line now **names** them rather than only counting: *"images measured nothing on 5 of
5 screens — EVERY one, so this axis has never run"*. A bare tally of 22 reads like a rounding
error; the named form reads like the missing net it is. Same rule this file states everywhere
else — counted AND named — applied to its own suite, which had only the counting half.

The paragraph that used to sit here said a **placeholder is not a picture**: that an asset which
has not arrived gets a marked stand-in from `scripts/build-placeholders.mjs`, which `images`
passes but *"counts and names by key in its verdict line on every run"*, and that the count is
*"the only thing keeping a tinted panel from quietly becoming the finished thing"*. The mechanism
is real and the intent is right. There is no such count on any run, because `images` has never
measured a single screen. **A safety net described in the documentation and absent from every
run is worse than no net**, because it is the one people stop checking for by hand.

**Always screenshot the result in light and dark and look at it** before saying a screen is done — with
`node scripts/screenshot-screen.mjs <screen.html>`, which refuses to write a PNG if the page
is not rendering in Open Sans. A screenshot in the wrong typeface is worse than none: it is
false evidence, and it is what this project shipped for months.

### What decision 4 actually found

The design lead answered *"yes — save a snapshot for every screen"* on 2026-09-12. Doing it
produced a better answer than the question had allowed for: **four of the five screens have no
design to snapshot.**

| screen | its design | |
|---|---|---|
| `working/button` | `aRWjBnTvdLiG50xtwodGwH` `10730:115188` | **read, saved, done** |
| `working/case-mgmt-my-team` | `kuX4KDIN0u4axsKTELYlzW` `17708:13612` | **not in the file** |
| the three `prototypes/` | — | **no Figma design at all**, and never had one |

The prototypes are the easy half: they are hand-built fixtures, and no node id for them exists in
this repo, in the handoff docs, or in any commit that introduced them. There is nothing to read.
Those three axes can never run there, and that is a fact about the fixtures rather than a gap.

**The Case Management file was re-tested rather than trusted, and "cannot be reached from here" is
not what is happening.** The file OPENS. `get_metadata` with no node returns its page list, which is
exactly one page: `Thumbnail` (`55:11318`), holding one 1920×1080 thumbnail instance. `17708:13612`
comes back *"node ID was not found in the file"*. So it is not egress, and it is not a frame that
moved — the reachable copy under that key holds **no design at all**. That distinction matters for
the same reason every other one in this file does: an egress wall is worth re-testing later, and an
empty file is worth asking a person about.

**`working/button.figma.json` and `.figma.xml` are the first screen extract this repo has ever
had**, and two faults surfaced the moment the axes had something real to measure. Both would have
made the first genuine extract look like the thing that was wrong.

**Radius was compared as DECLARED, where what matters is what it PAINTS.** Figma says 20 on a 32px
button; the generator emits `999` on purpose, because a radius at or past half the height IS a pill.
CSS clamps every corner by `min(1, w/2r, h/2r)`, so both paint at 16 — identical pixels, two
different computed strings. `verify-frame` compares the clamped value now, which leaves a real
drift untouched: 40 against Figma's 10 on a 74px card is still 37 against 10, and still fails. Left
as it was, the axis would have reported a difference that does not exist on every pill in the
system, which is how a check becomes one people read past.

**A label beside an icon was invisible to `verify-content`.** The walk took leaf nodes only — an
ancestor would otherwise report its children's words as its own — so `<button><svg/>Action</button>`
was skipped whole, and the design string "Action" came back MISSING from a page that plainly renders
it. The mirror is the worse half: an INVENTED string in that position could never have been seen at
all. It takes each element's own direct text nodes now, which cannot double-count either, because a
text node belongs to exactly one element.

**And that fix was living somewhere no test could reach it.** It was an anonymous callback inside
`page.evaluate`, so the one piece of that check which decides *what counts as text* was the one
piece every fixture-driven case went around. It is a named `collectText()` now, with eight cases run
in a real browser; restoring the leaf-only rule kills three of them by MISS.

### The other three decisions of 2026-09-12

The design lead answered four of the five open questions on the published decisions page. Two were
*leave*, one was *keep both*, and each is recorded where a reader will meet it rather than only
here.

- **The header — LEAVE.** Written up in full under *What the 2026-09-12 merge corrected*, including
  the finding that cost the question its framing: the geometry is already on Figma's current axes
  and only the colour is stale, and both halves ship onto one class. Named by the build as AXIS
  DISAGREEMENT on every run.
- **The side-nav tab — KEEP BOTH, old one deprecated.** `tokens/_raw/deprecated-classes.tsv`, read
  by `scripts/lib/deprecated-classes.mjs` and written into three places a page author actually
  looks: the class's own comment block in `dist/components.css`, a DEPRECATED flag on its heading in
  `docs/components.html`, and the same notice in `.claude/skills/people-first/references/variants.md`, which the
  skill quotes as fact. A page author reads one
  of those three and never all of them, so a deprecation in only one is a deprecation half the
  readers never see. The build FAILS on a row naming a component with no rules, or a `supersededBy`
  with no rules — a notice pointing at a class that does not exist is worse than no notice.
  Five mutants, in `npm run selftest`.
- **The six untagged avatars — LEAVE.** The screen keeps its eighteen default avatars and the six
  missing photographs stay uncounted. This was answered on the understanding that tagging them
  changes nothing visible, which is true — `build-placeholders.mjs` marks a person slot without
  repainting it — so the decision is about whether the screen should show its gaps, not about how it
  looks. Nothing changes in the repo; `images` stays vacuous on 5 of 5 screens and stays named as
  such on every run.

The fifth, the two merged class names, is still open.

### Two mechanisms that shipped without a test, and what writing one found

The deprecation guard and AXIS DISAGREEMENT both went into `build-components-css.mjs` as inline
code with nothing able to run them. They were checked by hand — breaking the TSV and watching the
build exit 1 — which proves the code worked that afternoon and nothing about tomorrow. This file
says a guard nothing can falsify is a line nobody can trust; these were two of them, written the
same week the sentence was.

Both are libs now with a `--self-test` in `npm run selftest`, and moving them found three things a
hand-check could not:

**The build had a SECOND copy of the deprecation parser.** The gallery and the skill reference
imported `scripts/lib/deprecated-classes.mjs`; the build kept its own inline five lines doing the
same split. A change to the parse would have reached two of the three consumers and the third would
have gone on producing the old answer in silence — the hand-copied-rule failure this file already
records about the Figma driver, reintroduced within days of writing it down.

**A mutant CRASHED instead of missing.** Splitting the TSV on spaces rather than tabs made a test's
`.get()` return undefined, and the assertion died of a `TypeError`. The harness rule caught it: *a
mutant must die of a recorded MISS, never of a crash*, because a crash proves the test ran and
nothing about whether it can see. One `?.` and the mutant dies properly.

**And a fixture a broken implementation also satisfied.** The ordering case used two components,
`[Zed, Alpha]` — where `reverse()` happens to produce name order, so a mutant replacing the sort
with a reverse SURVIVED. Three components in an order neither leaving alone nor reversing would
sort kills it. Same trap as the rebind rule's `#FEFEFE` near-miss colour, and the same fix: a
fixture has to be one only the correct implementation passes.

### The suite runs against `working/` too, and that is the direction that matters

For most of this project the axes ran against `prototypes/` alone, which is exactly
backwards: the prototypes are rough fixtures that are allowed to be wrong, and `working/`
holds the pages built FROM a Figma design, which is the direction this repo exists to get
right. Pointing the suite at `working/` for the first time found a shape check that could
not run anywhere but the screen it was written for, 35 unnamed elements on the page meant
to be handed to a developer, and a notification badge that was white-on-sky-blue in dark
mode.

`verify-layout` is the one axis that asks whether an element can be SEEN at all — five
others passed on a screen slicing 126px off its own table. **Two branches independently
wrote a `verify-layout.mjs` and they ask different questions**; the merge kept both, so
`verify-clipped.mjs` is the one that finds content cut off or escaping its container, and
`verify-layout.mjs` is the one that finds things that should line up and do not.

**Neither asks whether anything is painted ON TOP of anything else, and `check-overlap.mjs`
is that third question.** Two elements can sit fully inside their containers, aligned to
everything they should align to, and still be drawn over one another. It exists because I
reported exactly that from a screenshot, wrote it into three files, and it was false — the
picture was displayed at 0.7× and a downscale closes gaps until things look welded. There
was no mechanism to settle it, so settling it took a throwaway probe. The probe is a check
now, because the next person to squint at a screenshot should get a number.

It found a real one that thirteen axes call clean: `prototypes/absence-requests` paints a
checkbox label **10px into the textarea above it**, both `position: static`, both in normal
flow — a collision rather than an overlay. `working/` is at **zero**, which is the number
that matters; the two on prototypes are pinned rather than fixed, since those are rough
fixtures and rebuilding them is not this check's business.

**The exclusion is the whole design, and getting it half-right made the first baseline 71%
noise.** Deliberate stacking is what `absolute`, `fixed` and `sticky` are FOR — a badge on
an avatar, a menu over a page, a sticky side panel sliding over the table beside it. The
first version tested the element's own `position` and reported 7; a child of an overlay is
itself `static`, so five of those seven were `payroll-run-summary`'s sticky side panel doing
its job. The walk goes up to `body` now and the honest number is **2**. A baseline full of
false positives is the number people learn to read past, which is the failure this check was
written to stop.

There are two screenshot tools and they are not the same:

```bash
node scripts/screenshot-screen.mjs <screen.html>   # refuses to write if not in Open Sans
node scripts/shoot.mjs prototypes/<screen>.html screenshots
```

A full-page capture (`--full`) flattens `position: sticky`, so a pinned sidebar looks like
it stops halfway down and a sticky footer looks like it is clipping the panel above it.
Neither is a bug. The default viewport shot shows the truth.
