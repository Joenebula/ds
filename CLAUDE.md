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

## Responsive — components follow the viewport

Figma draws **52 components at more than one width**: `Header` at 1830 and 390, `Header
navigation` at 1830/768/390, `Full page` at 1830/768/375. The stylesheet exposed every one
of those as a data attribute and **nothing else**, and `dist/components.css` contained no
viewport media query at all — all four `@media` rules in the system were
`prefers-color-scheme`. So the library did not respond to the viewport: the only way to get
the mobile header was for a page to write `data-mobile="Yes"` itself, and every page in this
repo instead hard-writes Desktop. A phone got the desktop component in a 390px window.

The mobile and tablet variants are now **mirrored into media queries** — a post-pass over the
rules already emitted, so the phone rule is the SAME declarations as the attribute-driven one
with the breakpoint axis stripped out. Re-deriving them from the extracts would produce a
second copy that can drift; mirroring cannot.

```html
<div class="pf-header"></div>          <!-- 86px on a desktop, 62px on a phone, by itself -->
<div class="pf-header" data-mobile="No"><!-- pinned: 86px at every width --></div>
```

**The boundaries:** mobile below 768px, tablet 768–1023px, desktop above. **768 is measured**
— every tablet artboard in the file is 768–801 wide and no mobile artboard exceeds 392.
**1024 is chosen, not measured**: Figma has no artboard between 801 and 1130, so that line is
a judgement and is named as one rather than presented as a reading of the file.

Three things this took, each of which looked finished before it worked:

- **A mirrored rule that still demands an axis matches nothing.** `Header`'s variants are
  `Theme=X, Mobile=Yes`, so stripping the breakpoint leaves `.pf-header[data-theme="Berry
  pink"]` — and a bare `pf-header` carries no theme. Measured: it stayed 86px tall on a phone
  while `pf-header-navigation`, whose only axis IS the breakpoint, went 130/118/106 perfectly.
  Two components out of five worked and the block looked complete. The fix is the shared-fill
  rule again — a value **every** variant agrees on is a fact, so it goes on the bare class —
  and the agreement is tested **per declaration**, because Figma lays 15 of the 16 mobile
  headers out as a row and `Default - Cranberry red` as a column, and a whole-block test threw
  away the height all 16 do agree on over two declarations they do not.

  **What counts as agreement took two wrong answers.** *Every leftover must declare it* is too
  strict — a composed-type rule contributes a selector that states a font-size and no height,
  and its silence is not disagreement; `Filter tab single` states 70px on every one of its
  mobile variants and was refused on that. *Any leftover that declares it* is too loose —
  `Graph legend` has a mobile variant for `Key type=Donut graph` and none for `Line graph`, and
  hoisting 27px would state a height for the line legend that Figma has never drawn. The rule
  is: among the variants that **do** state the property they must agree, **and together they
  must cover every value of each axis they all carry**. `Selected` False and True together
  cover `Selected`; `Bar chart`'s lone `Darkmode=False` covers `Darkmode`, which takes no other
  value; Donut alone does not cover `Key type`.
- **The bare rule is not a variant.** A rule already scoped to the bare class at that
  breakpoint was being counted as a 17th `Header` "variant", putting the denominator one above
  the 16 themes that carry a height, so the 62px every one of them agrees on was refused.
- **Specificity does not deliver "explicit wins".** `Header`'s desktop rules are keyed on the
  theme too, so `<div class="pf-header" data-mobile="No">` matches no desktop rule at all and
  the mirrored phone rule won on the bare class — it went to 62px having been told not to.
  Every mirrored rule is therefore guarded with
  `:not([data-mobile]):not([data-tablet]):not([data-device]):not([data-breakpoint])`.
  **Present means the page is managing breakpoints itself and these rules stand down**,
  whatever the value. That is what keeps every existing page — all of which pin Desktop —
  behaving exactly as before.

`npm run verify` runs `check-responsive.mjs`, which takes its expectation from
`component-geometry.tsv` rather than from the stylesheet or the generator's agreement logic,
and asserts both directions: a bare class must render Figma's height for its breakpoint
(**24 of 28** do), and a class that writes the attribute must **not move at any width**
(28 of 28). It refuses to pass if nothing was measured.

The four it reports are not defects here: `Graph legend`, `Navigation item` and `Spotlight
Card` each have an axis whose mobile variant **Figma drew for only some of its values** — no
Configr nav item on a phone, no vertical Spotlight Card, no line-graph legend — so there is no
fact to carry and inventing one would state a size Figma has never drawn. They are written up
in `docs/FIGMA-ISSUES.md` §13 with what would clear each.

**This does not make a PAGE responsive.** Measured, on `case-mgmt-my-team` with its 17 pins
removed: the components adapt and the page is worse, because its shell — a 90px sidebar and a
fixed grid — is page layout, which the library has no say over. Unpinning a page is only
worth doing together with its own layout work.

### White text at one width only

Mirroring a variant with the breakpoint stripped out puts the rule on the bare class wherever
the breakpoint was a component's only axis — and `Header` and `Header navigation` have **no
bare-class rules of their own at all**, because the pink band behind them is separate artwork
by design. Their mobile variants bind white. So at 390px, and only at 390px, those two classes
carried **white text over whatever the page provides**. Measured at the time: **1:1**. The
desktop side showed nothing, because the desktop variants bind no text colour at all.

That is `docs/FIGMA-ISSUES.md` §11's rule — a colour and the surface it was chosen against are
a pair, and half a pair is worse than neither — walked straight back into by the responsive
pass. A colour is now carried onto a bare class only where the class paints a background of
its own or the same rule brings one. **Four classes, over seven rules, keep their breakpoint
geometry and lose the colour**; `Notification categories` gains a colour *and* a surface together
and keeps both. (This read "Seven classes" until the build was asked to name them and listed
four: a class stranded at both mobile and tablet is counted once per rule, and the count of rules
had been printed as a count of classes. The build prints both now.)

`npm run verify` runs `check-breakpoint-consistency.mjs`, which asks the general question — does
what a component looks like depend on the viewport where Figma does not say it should — and
carries a second finding of the same shape. **Eight floating surfaces had a drop shadow on a
phone and none on a desktop**: `Side filter`, `Form`, `Manage columns`, `Table card (AG)`,
`AI Assistant`, `Notification panel`, `Side panel`, `Header navigation`. Figma casts the
identical shadow at both — `Side filter` is `0 0 4 0` at `Mobile=False` and `0 0 4 0` at
`Mobile=True` — and the asymmetry was only ever which selector the rule was keyed on. The
shadow now hoists to the bare class on the same agreement-and-coverage rule as the fill. The
one class that still differs, `Notification categories`, differs honestly: Figma measures
`2 0 4 0` at desktop and `0 0 4 0` at mobile, and the desktop one matches no token (§12). The
exception is read from the measurements, never allowed by name.

Two wrong questions came first on the colour half, and both are worth knowing:

- **A contrast ratio is not the test.** It needs a background to measure against, and the whole
  fault is that there isn't one — white text reads 1:1 on a white test page and 21:1 on a dark
  one, and neither number is about the component.
- **"States a colour but paints no background" is not the test either.** It fired on sixty
  classes at every width, which is not a finding but a wrong question: most components sit on a
  surface something else paints — `Detail item` on a card, `Top bar app context` on the header
  band, which this file names as correct.

The fault is the **asymmetry with a missing surface**: a class that states its own text colour
at some widths and not others, at a width where it paints no background. A complete pair
appearing at one width only is a mobile appearance Figma drew, and passes.

### The checker had to learn that a media query is a condition

`verify-against-figma.mjs` reads declared values by walking every rule in every stylesheet,
and it walked **into** `@media` blocks and treated their rules as applying unconditionally.
That went unnoticed for as long as the only media blocks were dark mode, whose rules are all
prefixed `:root:not([data-theme="light"]) …` so a bare test div never matches them. The
responsive block is the first without a `:root` guard, and it was read as always-on — so the
phone heights of `Full page`, `Side filter` and `Table (AG)` were reported as their desktop
heights being wrong. It now carries each rule's enclosing condition and asks `matchMedia`.

## The two ways of switching mode must agree

`data-theme="dark"` on the root and the OS preference are documented here as equivalent, and
for all 111 tokens they were. What they were **not** equivalent about is `color-scheme`.

`:root { color-scheme: light dark }` tells the BROWSER to follow the system for everything it
paints itself — the default text colour, form controls, scrollbars. Setting the attribute
swapped every token and left that alone, so on a light OS the page went dark and the browser
went on painting inherited text **black**. Measured: **69 of the 160 component classes**
rendered a different colour depending on which way dark mode was turned on, every one of them
a class that inherits its text colour rather than stating one. Reported from a phone as the
filter chips looking wrong in dark mode.

`:root[data-theme="dark"]` now sets `color-scheme: dark`, and `[data-theme="light"]` sets
`light` for a page pinning light on a dark OS.

**Nothing could have caught this from one side, and that is the lesson.** Every dark screenshot
in this repo is taken with the attribute — `scripts/shoot.mjs` sets `data-theme` — and every
probe written while chasing the responsive work used Playwright's `colorScheme`. The two halves
of the project were each exercising a different path, and both were green.

`npm run verify` runs `check-theme-paths.mjs`, which renders every class into each mode **both
ways** and asserts they agree. The OS is set the OPPOSITE way in each pair on purpose: matching
them would let a page pass by following the system while ignoring the attribute entirely, which
is the actual fault.

### Which checks only ever look at one mode

That lesson has an obvious next question — *what else is only tested from one side?* — and it
was asked rather than assumed. Of the checks that render in a browser, five switch mode
(`verify-components`, `check-contrast`, `pf-audit`, `check-theme-paths`, `verify-rendered`) and
**seventeen never did**. Each of the seventeen was run again against a dark-rendered page and
its output diffed: **sixteen are identical**, because what they measure — a height, an offset,
a border width, an icon, a font face, a template's contents — is not a colour and cannot move
with the mode. So being light-only is correct for those, and that is now a measurement rather
than a hope.

**The seventeenth was measuring the value instead of the declaration.**
`check-breakpoint-consistency` decided whether a class "states its own text colour" by comparing
its rendered colour against the body's. In dark mode `--pf-text-primary` resolves to
`--pf-base-white` — and so does the colour a bare body inherits. Measured: **91 classes state a
colour in light mode and 16 in dark.** It was not finding fewer faults in dark mode, it was
asking a smaller question, and the stranded colour it exists to catch **is white**, the one
value dark mode cannot tell from the default.

The question was never "is this colour different from the default", it is "does this element
inherit its colour or set one" — so vary what there is to inherit. Every class now renders
**twice on the same page, once under a red parent and once under a green one**, and a class that
renders identically under both states its own colour. That needs no token to differ from
anything and gives **91 in both modes**. The check runs the whole assertion in each mode and
carries a third one: whether a class states a colour, and whether it paints its own surface, are
facts about its rules, so **the two modes must agree on them** — a disagreement means the
detection has gone soft in one of them again. Putting the old comparison back fires that
assertion 226 times.

## A fill every variant agrees on belongs on the bare class

The colour rules are emitted per variant, so a class painted **nothing** until a page wrote
a data attribute — and the component's own template writes none. `<div class="pf-side-panel">`,
which is exactly what `dist/templates/pf-side-panel.html` hands you, rendered a transparent
panel. **38 of the 154 templates** did this.

For a component whose variants genuinely differ that is right: `Button` binds eight fills and
`Tags` seven, there is no single value, and the page must choose. For **48 classes there is
one** — every `Side panel` variant binds `Background/Primary`, every `Nav tabs` variant binds
`Navigation/Nav bg top` — and the stylesheet was throwing an unambiguous fact away. Those 48
now carry the fill on the bare class, and **19 templates still need a variant attribute to
paint**, which is the honest remainder.

Two things this is careful about:

- **`background: transparent` on a bare class is a reset, not a default.** Its reason is a
  variant Figma gives NO fill — `Button Type=Hollow` — falling through to the browser's grey
  buttonface. Where every variant binds a fill, nothing needs resetting, so the shared value
  takes its place instead.
- **A primitive is never hoisted.** `var(...)` is not the test, because a primitive resolves
  to a var too; the first version of the guard duly put `var(--pf-base-white)` on
  `.pf-toast-message`. The test is `--pf-base-*`, the same one used everywhere else. Where a
  semantic alias exists the substituted token hoists fine; where none does, the primitive
  stays on the variant rules it was already on rather than being spread further.

`npm run verify` runs `check-hoisted-fills.mjs`, which reads the RENDERED colour and asserts
both directions: a component whose variants agree must paint it bare, and one whose variants
differ must not paint a colour **none of its own variants binds**. The negative was first
written as "must paint nothing bare" and was wrong within a minute — the generator
deliberately collapses a `Default` state onto the bare class, so `.pf-radio-tile` carries
`State=Default`'s own fill by design. The check also fails if either side matches no
component at all, which is how the first version was caught resolving no tokens and calling
every component a deliberate skip.

## Clipping — measured, and deliberately NOT carried

Figma clips the contents of **34 of the 62 components** on Cards and panels, 22 of them with
a corner radius, and `dist/components.css` sets `overflow` once. After the border and the
shadow this looked like the obvious next thing to carry, and it is the one that must not be.

The measurement that settled it: **23 of the 154 templates already render outside the box
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

`npm run verify` runs `check-template-overflow.mjs`, which reports and pins the count **and
the magnitude — 1171px of overflow in total**. How many is not how much: placing
`Hemisphere chart`'s children at Figma's own offsets took it from 333px to 77px, a large
real improvement the count alone could not see, because it still overflows by something.
Both numbers are the precondition: **clipping can only ever be carried once they reach
zero.**

**And both are measured at two widths now.** They were desktop-only for as long as a class was
the same size at every width; making components follow the viewport ended that, and the pinned
pair described half the library. A class box shrinks to its mobile artboard while the template's
placeholder contents do not, so at 390px it is **27 templates and 1529px**. Four templates
overflow *only* once the class shrinks — `pf-navigation-tabs`, `pf-search-navigation`,
`pf-table-ag` — and no check could see them. A precondition checked at one width is not checked.

## Hug: a height that is the sum of the contents is not a rule

Reported as the stat tiles being **stretched rather than hugged**, and the arithmetic says so.
`Card` is stated 520x358, and 20px of padding plus its children plus its gaps comes to **358** —
the number IS the content. Figma's frame hugs; the 358 is only what the sample contents added
up to on the day it was drawn.

The geometry extract records a component's SIZE and nothing about how that size was arrived
at, so the generator treated every height as a rule and emitted it — exactly, or as a floor.
`min-height: 358px` then forces a card holding one line to be as tall as Figma's sample. That
is the stretch: a 358px content card used as an 89px stat tile, with the page writing its own
CSS to fight it.

**Hug is recoverable without a new extract.** On a VERTICAL auto-layout frame the height is the
primary axis, so a hugging frame's height equals padding + children + gaps EXACTLY. Recomputed
in `scripts/hugs.mjs` from the raw tree and geometry: **43 components come out on
the nose** and state no height at all. `.pf-card` holding a label, a number and a caption now
renders **157px instead of 358**.

Three guards, each of which earned its place:

- **Only exact equality counts.** Where the children sum to MORE than the stated height the
  sum is not trustworthy — absolute or nested children the top-level walk does not add up —
  and those keep their measured height rather than being called a hug on a bad number.
- **A frame that DRAWS ITSELF is not holding content.** `Bar` is a 29x67 rectangle with a
  label under it; the arithmetic says hug, but the rectangle IS the component and the 90px is
  the design. It showed up on the first run: `Bar chart`'s template nests bars as bare
  classes, so with no height they collapsed and the whole chart rendered empty.
  `check-templates` caught it. Three components have a shape among their direct children and
  all three keep their height.
- **The checker has four height tiers now, not three.** `verify-components` mirrors the
  generator, and on a hugging component it was measuring an EMPTY box against the height of
  Figma's sample contents — *expected 69px, got 19px*, on every `Form field` variant. It
  asserts the negative instead: a hugging class must state no height of its own, which is what
  lets the content decide.

### A height is a floor when the content can grow

Asked by looking at the overlap above: *why is the text's height not moving the rest down?*
Because the component would not let it. `.pf-information-box` stated `height: 56px` — **fixed** —
so two lines of a real message overflowed the box and the next block sat where the 56 said.

The generator emits a height three ways, and the first threshold is where this went wrong: up
to **260px the height is emitted EXACTLY**, on the reasoning that at that scale it is a control,
row or tile whose height IS the design — a 32px button, a 58px table row. That is true of a
button, whose label is one line and cannot wrap. It is false for anything holding a paragraph,
and **a px number cannot tell the two apart**.

So read what is inside instead. Two signals, both needed:

- **A TEXT node Figma itself draws on more than one line** — the same measurement the nowrap
  rule uses in the other direction, a node at least twice its own font-size. `Message box`,
  `Tool tip`, `Toast message`, `Note`, `Title panel`: 12 of them.
- **A height that comes entirely from a single nested INSTANCE that fills it**, so the component
  states no height of its own. `Information box` holds one child — an instance of itself — and
  the walk stops there, so the first signal cannot see any text at all. 6 of them.

**36 rules** now state a minimum instead of a cap. The change only ever lets a box grow, so
nothing gets smaller and nothing that fitted before stops fitting.

**The cross-axis hug is deliberately NOT used here, and the reason matters.** On a HORIZONTAL
frame the height is the cross axis, and a hugging frame's height is the TALLEST child plus
padding — readable from the same data, and it matches **55 components**, including `Filter chip`,
`Links`, `Option` and `Pagination buttons`, where the height genuinely is the design. A child set
to stretch fills its parent by definition, so `max(child) + padding == parent` whether the frame
hugs or not: **the signature is identical for both answers and this data cannot separate them.**
Acting on it would be a guess dressed as a measurement, across a third of the library.

**A variant row was never told which component it belonged to**, so none of the component-aware
branches could fire on one — the base class took its floor and `[data-type="Error"]` put the cap
straight back, which is what a page actually writes. It is passed now; the two hug branches keep
their own `!isVariant` guard so nothing they already decided moves.

**The width has the same question, and it is the one the checker gave up on.**
`verify-against-figma.mjs` says so in a comment: *"Width is deliberately NOT compared: a Figma
frame may hug or be fixed, and the extract"* does not say which. It reads the same way — on a
HORIZONTAL frame the width is the primary axis, so a hugging frame's width is padding +
children + gaps. **35 components hug horizontally.**

The stylesheet drops any width above 120px as "the artboard, not a rule". Measured, that guess
is **right by accident for 31** of those and **wrong for 24** that are genuinely fixed — and
below the line it pins **four that hug**: `Links` is a text link frozen at the 58px its old
label came to, `Action menu button` at 60, `Config parent menu` at 98, `Floaters` at 85. Put a
longer label in any of them and Figma's width for the previous one is still there. **21 classes
now state no width for a measured reason** rather than a threshold.

`hugs.mjs` is shared by the generator and the checker on purpose. It reads the RAW
Figma measurements, not anything the generator produced, and the checker's assertion is still
independent — it renders the class and measures whether the rendered box matches what the
reading predicts. Two copies of the arithmetic would be the same source with a second chance
to drift.

## Strips: one row, scrolling, never two lines of text

Reported from a phone: the filter chips and the nav tabs were rendering "Filter chip" and
"Nav tabs" stacked over **two lines**. Figma says one line in two places at once, and both are
measured rather than taken on trust.

**A label Figma draws on one line does not wrap.** `Nav tabs` is a 40px component whose `Label`
TEXT node is 40x22; `Filter chip` is 42px around a 42x22 label. One line of 22px. A second line
is about 44px and does not fit inside the component at all — so a wrap is not just ugly, it
pushes the text out of its own box, and `Nav tabs` and `Table action bar` were two of the four
templates that overflow only at mobile.

The test is a measurement, not a list of names: **a TEXT node shorter than twice its own
font-size is one line.** `AI message bubble` (88px at 16px) and `Configuration panel` (68px at
13px) are real paragraphs and are excluded, as are 14 components whose height is auto or too
tall to state, where a wrap is survivable. What is left is **72 components whose height is
FIXED and whose every label is one line**, and those get `white-space: nowrap`.

**A horizontal SLOT is a strip, and a strip scrolls.** Figma marks the row itself: `Secondary
nav`/Content, `Table action bar`/Filter content, `Navigation tabs`, `Tertiary nav`,
`Stepper`/Steps, `Table (AG)`/Unfixed columns — **ten horizontal SLOTs in the whole file**, and
the template gives each `overflow-x: auto`. Flex already refuses to wrap, so the row was always
one row; it simply ran off the edge with no way to reach the rest. This is deliberately NOT the
`overflow: hidden` the clipping section refuses to carry: that one deletes content from view,
this one lets you scroll to it. Measured before adding — of the nine horizontal containers whose
children exceed them at 390px, **zero** have a child sticking out vertically, so nothing is lost
to the y-axis becoming a scroll port.

**Centring a strip that overflows puts the start of it out of reach.** `Secondary nav`'s slot is
`HORIZONTAL CENTER CENTER`. Once its children are wider than it, a centred flex row spills
equally *both* ways — and the left spill cannot be scrolled to, because `scrollLeft` is already
0. Measured: the first `Nav tabs` sat **83px left of the scroll origin**, so the first tab in
the strip was permanently invisible. `justify-content: safe center` keeps the design intent
where it fits and falls back to the start where it does not.

**A scroll container has no automatic minimum height**, and that is how making the strips
scroll quietly cropped every chip in them. `min-height: auto` resolves to 0 for a scroll
container, so `Table action bar`'s filter strip stopped growing to the 42px chips it holds and
was squashed by its parent to 32 — with `align-items: center` the chips then hung 5px above and
below, and the y-axis scroll port that comes free with `overflow-x` ate exactly those 5px: the
top and bottom of every chip's border, while the rounded left and right ends survived. Reported
from a phone as *"the borders are not showing"*, and no check could see it — the strip was one
row, scrollable, and started at its first item. The fix is `min-height: fit-content`, which
restores precisely what the scroll container suppressed. Stating Figma's measured slot height
instead looked equivalent and was not: `Footer`'s slot is 28px and its real contents are
shorter, so pinning 28 pushed the footer's own contents out of its class box and invented a
new overflow.

**`justify-content: safe` goes on a ROW, and nowhere else.** `.pf-secondary-nav` centres a
524px strip of tabs; give it a phone's width and a centred flex row spills equally *both* ways,
putting the first tab 83px off the left edge where nothing reaches it. `safe` fixes that and
costs nothing while the content fits. Guarding `align-items` as well made two things worse at
once: `Navigation item` is a COLUMN, so its `align-items` is the horizontal axis, and `safe`
turned a "Notifications" label overflowing 8px each side into one overflowing 16px on one — the
layout check caught it — while the header's "HR" and "Clock-in" shifted off the band they are
painted against and fell to 1.04:1 contrast. The loss `safe` prevents is specific: content
pushed past the START of the inline axis goes off the left of the page and there is no
scrolling back. Overflow up or down is not lost, because the page scrolls.

`npm run verify` runs `check-scroll-strips.mjs`, which squeezes every strip into 320px **on
purpose** and asserts three things: it stays on one row, it can be scrolled, and it begins at
its first item, and that its scroll port cuts nothing off the top or bottom of what it holds.
The narrow harness is the point — the first version of this assertion lived
inside `check-template-overflow`, where templates render at body width and a strip sized to its
contents never overflows, so it could not fail at all. Two false positives had to be cleared
before it was right: "two different top edges" is not a second row when the slot centres items
of different heights, and `Horizontal scroll`'s `Spacer` renders 0x0, so its top equals its own
bottom and it overlapped itself.

## Children a parent does not lay out

For an auto-layout parent, the order of the children is enough: the template writes the same
direction, gap and padding, and they land where Figma put them. For a parent laid out
**NONE** there is nothing to copy, and flowing them is not merely imprecise — it is a
different picture. `Profile image` is 93x93 and holds two children, a photo and a `People`
instance, **both at 0,0 at 93x93**: overlaid in Figma, stacked by the template, 93px tall
becoming 184.

`tokens/_raw/component-child-pos.tsv` records where each child sits inside a parent Figma
does not lay out, and the template places it there — **17 children across 8 components**.
Three guards, because a position applied to the wrong node is worse than none:

1. the tree must carry that exact component and path;
2. it must **agree on the child's size** — two rotated `LINE` nodes in `Donut pie chart`
   report a rotated bounding box against the tree's unrotated size, and are refused;
3. **the ORIGIN must have a definite size**, and the origin is the child's PARENT, not the
   component. An offset is measured inside a box, so the box has to exist: measured
   empirically, a class with no width whose children are all absolute renders **0 wide**,
   because nothing is left in flow to give it one. An inner origin is given its own measured
   size and is definite by construction; only a ROOT origin depends on what the class
   carries, and the stylesheet drops a width above 120px on purpose. **16 offsets across 7
   components are measured and deliberately not applied** for that reason — `Donut pie
   chart`, `Bar chart with axis`, `Full page`, `Configuration` and others — and the build
   names them.

**Every refused offset is named, and the counts are asserted to add up to the file.** The
first version of the loop reported guard 3 and dropped guards 1 and 2 with a bare
`continue`, so the build's "16 measured offsets NOT applied" read as the whole shortfall
when the file holds **71** — 17 applied, 54 refused, and **38 of those were leaving no
trace at all**. That is the silent-discard fault this pipeline keeps finding, sitting in
the code that fixes it elsewhere. The refusals are now 16 for the origin, **36 measured
deeper than the tree walk reaches** (`WALK_DEPTH` is 4, and `Configuration`, `Image picker`
and `Data variance alternative` were measured past it, so there is no node to place), and
2 where the tree and the measurement disagree — the two rotated `Donut pie chart` lines.
The build fails if those four numbers and the applied count do not sum to the row count,
so a fifth refusal cannot be added quietly.

That 36 is the only honest measure of what deepening the walk would buy, and it was
invisible until the accounting was closed.

Asking that question of the component root instead of the parent refused every placement
inside a component whose class drops its width, including ones on inner containers that had
nothing to do with the root. Fixing it took `Hemisphere chart` from 333px of overflow to
77px.

Four things this cost, all worth knowing before touching it:

- **The outer element is the positioning origin.** Put `position: relative` on every parent
  except the root and the children resolve against whatever ancestor on the page happens to
  be positioned — on a plain page, the document, so they fly to the top-left corner.
- **An origin whose children are all absolute holds nothing in flow**, so it collapses to
  zero and everything after it slides up. It is given its measured size.
- **`box-sizing: border-box` wherever a measured size is stated.** Figma's width and height
  include the frame's padding; CSS's do not. `AI Assistant`'s slot is 1108 wide with 20px
  padding either side, and stated as a content width it rendered 1148 and hung out of its
  own component.
- **Placing SOME children of an origin and flowing the rest is worse than flowing all of
  them.** The generator sends different node kinds down different branches, and two of them
  build their own markup: an icon (an HTML comment, which cannot carry a style) and a TEXT
  node. Both dropped the placement silently. In `Search navigation` the magnifier was placed
  and the word "Search" was not, so they rendered on top of each other — and nothing
  measured it: the box did not overflow, the template rendered its contents, every check was
  green. `check-template-overflow.mjs` now asks the question directly in the browser — inside
  a positioned container, is every element child positioned the same way? — and fails on a
  mix.

## Every form field's icon sits in the same place

Search glass, dropdown chevron, calendar, clock — **all four are right-aligned and
vertically centred**, at the field's own right padding. This is one rule, and it comes from
the Figma tree rather than from taste: `Field` is laid out **HORIZONTAL CENTER MAX** —
children packed to the END, centred on the cross axis — and its last child is a single
`Field icons` instance whose four frames are `Search icons`, `Dropdown`, `Calendar` and
`Clock`. They are the same object in the same place; only the glyph differs.

```html
<div class="pf-field" data-right-aligned="No" data-filled="No">
  <select class="fieldinput">…</select>
  <span class="icn"><!--pf-icon:down-chevron 22--></span>
</div>
```

**The field is a container, not the control.** Figma's `Field` holds a TEXT node plus the
icons, so in HTML the class goes on a wrapper and the real `<input>` or `<select>` sits
inside it with its UA chrome reset. Putting the class on the control itself leaves nowhere
for the icon to go, which is what forced two pages to position it absolutely — on the wrong
side, and centred on the label-plus-input block rather than on the input, so it floated up
into the corner. A page never positions a field icon.

**`.pf-field` sets `appearance: none`, which removes the browser's own dropdown arrow.** So
a `<select>` given that class and nothing else renders with **no chevron at all** — which
every dropdown on every prototype did. The People First `Down chevron` has to be placed
next to the control, as above.

A field with no icon is not a fault: `Field icons` has a `State=Empty`, and a plain text
field or a textarea carries none.

`npm run verify` runs `check-field-icons.mjs`, which measures every field icon on every
screen — last child, at the field's own computed padding and border, equal gaps above and
below. The right-hand distance is read from the field rather than hard-coded, so the check
stays correct if Figma changes the padding.

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

## Does a state change the type? Only where Figma says so

Reported as *"the button weight never changes on any state — it's the same as default"*, and
the answer is that **Figma draws it that way**: `Button` is `13px SemiBold` on every one of its
24 labelled variants, so its states differ by colour and nothing else. Measured across the
whole library, **15 components DO change size or weight between variants** — `Filter chip`
Selected is SemiBold and Hover is not, `Nav tabs` and `Tab` go SemiBold when selected, `Steps`
on Hover and Selected, `Filter tab single` at 20px SemiBold on a phone — and every one of them
renders exactly what Figma measures.

**The part worth fixing was that nothing could answer the question.**
`check-component-type.mjs` reads the stylesheet text against the resolver that generated it,
so it is internally consistent by construction. `verify-against-figma.mjs` does compare type —
but only `if (declared('font-size'))`, and a component that COMPOSES its text style declares
nothing on its own rule. The skip is triggered by exactly the mechanism the type layer is
built on, so the more correct a component was, the less of it was checked.

`npm run verify` runs `check-variant-type.mjs`, which renders **267 variants that carry a
measured font** and reads the size and weight back. Its expectation is
`component-geometry.tsv`'s per-variant `font` column — a different walk from the
`component-type.tsv` the composition is generated from, so the two sides have separate
origins. It refuses to pass if no component varies its type at all, which is the state in
which a stylesheet that ignored the variant entirely would look perfect.

**The markup is written with the axes the STYLESHEET uses**, read back out of its own
selectors, not the axes Figma names — that is the mistake `check-stroke-sides` made, where
spelling out every Figma axis let a rule no page can produce match anyway.

## The docs page is a screen too

`docs/components.html` is the page this file tells you to look at, and the one the user
actually reads on a phone. Nothing measured whether it renders legibly.

It did not. The gallery fills each specimen with a real-world label where it knows one and
otherwise falls back to the component's own name — and a component Figma gives **no type at
all** is a box that holds no label. `Multi-select checkbox` is 20x20 and was rendering the
words "Multi-select checkbox", **57px outside its own box** and on top of the variant caption
below it. Four classes, fifteen specimens: `Multi-select checkbox`, `Status`,
`Table header icons`, `Control`. On a phone that reads as text escaping a component — a
stylesheet bug — when the stylesheet was right and the docs page was inventing text for a box
Figma never puts text in.

The reading is the geometry's own `font` column: `Filter chip` is `auto x 42` at
`16px SemiBold` and is labelled; `Status` is `22 x 22` at `—` and is a dot. **Six classes now
render as the bare box**, marked with a dashed outline that is the docs page's own chrome —
outside the box, never a border on the component, so the gallery still draws nothing the
stylesheet does not.

`npm run verify` runs `check-docs-specimens.mjs`, which measures the text's own rect against
the element's in the browser. The generator cannot do that arithmetic — it does not know how
wide a string renders — so it decides from the reading it has and this asserts the result
independently. It also asserts the negative: a run where no specimen carried text at all would
pass while measuring nothing.

### And the page must not scroll sideways on a phone

Two specimens out of 325 are wider than a phone — `Title panel` at 470px and `Donut pie chart`
at 468 — and with nothing to contain them the gallery's document went to **514px wide in a 390px
window**. Every heading and paragraph then slides under the finger while you are trying to look
at one component, which is how a page reads as broken when only two things on it are oversized.

The row scrolls instead. Never clip — `docs/templates.html` already did this on its `.stage`,
and the library does it on a strip; this is the same answer a third time. And `min-height:
fit-content` goes on with it every time, because a scroll container's `min-height` resolves to 0
— that is what cropped the top and bottom off every filter chip the last time a row here was
made to scroll, and it was reported as *"the borders are not showing"*.

`check-docs-specimens.mjs` asserts it at 390px, on the gallery and the template page both, and
reports how many of them are containing an oversized specimen rather than letting the document
grow.

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
letter-spacing, **and its auto-layout**: `display`, `flex-direction`, `align-items`,
`justify-content`. Spacing is the exception: `padding` and `gap` are fine on a layout element
as long as every value is a `var(--pf-space-*)` token or zero.

**The auto-layout was missing from that list until the stretched tiles were looked at.**
`display`, `flex-direction`, `align-items` and `justify-content` are read straight off Figma's
layout string — `Card` is `VERTICAL CENTER MIN` and the class says `display: inline-flex;
flex-direction: column; align-items: center` — so they are the component's in exactly the way
its padding is. They sat on `check-off-system`'s FREE list, and FREE was tested *before* the
branch that knows whether the selector points at a component, so **a page could rewrite a
component's whole layout and be called on-system**. That is how
`prototypes/timesheet-approvals` turned a 358px content card into a stat tile —
`.pf-card { display: flex; align-items: stretch }` — with every check green.

They stay free on a page's OWN selector, which is why the list exists: a layout element has to
be able to say `display: grid`. One exemption is deliberate: **`display: flex` where the class
says `inline-flex`** is the inline-to-block promotion, the same statement as `width: 100%`, not
a redesign — but `inline-block` to `inline-flex` is not, because it changes how the box lays
its children out.

Tightening it found two real faults in `working/case-mgmt-my-team`, the page built FROM a
design: a `flex-direction: column` that was a second, drifting copy of what the class already
said, and a hand-written arrangement of `Search navigation`'s insides — `inline-flex`,
`align-items`, a 7px inset and an invented icon-to-text gap — when
`dist/templates/pf-search-navigation.html` already carries Figma's own measured offsets for
both children. The page uses the template now and that rule is gone.

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

**`prototypes/` are exempt** — they are hand-built fixtures. `absence-requests` **82**,
`timesheet-approvals` **138** and `payroll-run-summary` **163** off-system;
`recruitment-pipeline`, built on the templates, scores **0**. That spread is what the
exemption is for, not a licence: a prototype CAN be on-system, and the newest one is. Builds
FROM a design are not exempt.

Those four numbers are **checked**, not typed. `check-off-system.mjs` exports its scorer and
`check-skill-classes.mjs` imports it, so the figure in this file and the figure the check
computes have one source. That was the loose end: this paragraph read "30-63 off-system each"
for a long time — never re-measured as the check grew, and nothing could see it. A number in
prose that no check reaches is a number that is already drifting.

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
side-panel rows — is hand-built rather than taken from Figma. **62%**, **51%**, **39%** and
**90%** of what paints on them carries a library class — `absence-requests`,
`timesheet-approvals`, `payroll-run-summary` and `recruitment-pipeline` in that order — and
**126 of the 160 classes are never used by any of them**, the four screens reaching for 34
between them, 16, 15, 22 and 23 each. That is acceptable for what they are. Do not describe
them as reference implementations, do not hand them to a developer as one, and do not rebuild
them to chase component fidelity unless asked — the user has explicitly said they are not real
screens.

**What "paints" means is defined, because it used to not be.** This paragraph read "about
78–86% of what paints on them uses a real library class" — a hand-measurement with no method
recorded and nothing computing it, so it could not be re-run, and adding a fourth prototype
made it wrong in a way nothing could detect. `check-skill-classes.mjs` now measures it: an
element paints if the reader can see it as itself (a background, a visible border, or its own
direct text — a descendant's text belongs to the descendant), and it is the library's if it
carries a class from `components.css` or `type.css`. SVG internals are skipped, because an
icon's paths are one icon and counting them would swamp the figure with whichever icons a page
happens to use.

**The new numbers are not comparable to the old 78–86%** — different method — so read the fall
from 86 to 62 as a change of question, not a regression. What it does show is the point the
paragraph is making: coverage tracks the off-system score. The page built on the templates is
0 off-system and 90% here; the most hand-built one is 163 and 39%.

(The class counts read "136 never used, the three screens reach for 24" until
`recruitment-pipeline` was added and they were re-counted. The 160 is pinned by
`check-skill-classes`; rewording the sentence away from "N of the 160 classes are never used"
un-checks even that, which is what happened on the first attempt at this paragraph.)

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

It names two ways that fails — **CLIPPED**, where an ancestor hides the overflow and there is
no way to scroll to it, and **ESCAPED**, where nothing hides it so the content spills out of
the box it belongs to. There is a **third**, and nothing asked it until a re-shot dark
screenshot was looked at: **text printed ON TOP of other text**. Both elements sit correctly
inside their own boxes, so neither is clipped and neither has escaped; they are simply on the
same pixels. On `timesheet-approvals` the side panel's working-time warning runs straight
underneath the "Daily hours" heading and the "Adjust" button, and every check on that screen
was green.

`npm run verify` runs `check-text-overlap.mjs`. **The test is glyphs against glyphs, not box
against box** — boxes overlap constantly and legitimately, a card inside a panel, a badge
lapping its parent's corner, so the rect comes from a Range over each element's OWN direct text
nodes and a parent is never compared against the child whose text it holds. Out-of-flow
elements are excluded for the same reason `verify-layout` excludes them: a dropdown open over
the page is text over text on purpose. **8 pairs outstanding, all on the two oldest fixtures in
`prototypes/`; `working/` is held at zero and is at zero**, as is the newest prototype.

It measures at 1440px only, and the reason is named rather than left implicit: every screen here
is drawn for a desktop and pins its components to Desktop, so at 390px they squeeze and overlap
in ways that are the pinning rather than the layout — measuring there would report the known
thing loudly and bury this one.

**Always screenshot the result in light and dark and look at it** before saying a screen
is done:

```bash
node scripts/shoot.mjs prototypes/<screen>.html screenshots
```

**The dark screenshots were wrong for two independent reasons, and both were found the same
week from opposite ends.** `shoot.mjs` used to `goto` and then flip `data-theme` on the
rendered page, which is wrong twice over:

- **The flip is not fully applied.** Chromium does not completely invalidate a restyle driven
  only by custom properties changing on the root: the element's `--pf-text-primary` reads the
  dark value, the only rule matching it is `color: var(--pf-text-primary)`, and its computed
  colour stays **light**. A `cloneNode` of the same element resolves correctly, which is what
  says invalidation rather than cascade. Measured on four of the five screens then in the repo:
  the Hollow button, the side-navigation tabs and the selected filter chip all shot in their
  light-mode colours on a dark page. `check-theme-paths.mjs` flips the attribute the same way
  and is green, because it does it on a flat synthetic page of bare divs where it does not
  happen — so the check cannot see this, and a page-shaped harness is what would.
- **The shutter fired mid-transition.** The screens give their chips and buttons a 120ms colour
  transition and the shot was taken in the same tick as the flip. Measured on
  `absence-requests`: the filter chips came out at **1.09:1** — a mid-fade grey on a mid-fade
  grey — where the settled page reads **13.03:1**. That was reported twice as *"the filter
  chips' dark mode colours are not correct"*. The colours were right; the picture was wrong —
  and looking at the picture is the step this file treats as the final word, so a wrong picture
  outranks every check that passed.

It now sets the theme **before the first paint** — `colorScheme` on the browser context so the
browser paints its own surfaces for the right mode, and `addInitScript` to put `data-theme` on
before anything renders — so there is no restyle to get wrong and no flip to catch half-way.

The settle-and-warn stays, because it answers a question the pre-paint fix does not: it waits
for `document.fonts.ready` and for every running animation to finish, then **says so if the
page still has not settled**, sampling the computed colours twice 150ms apart and warning when
they differ. An unsettled webfont shoots the fallback face, a page can animate on load, and a
wait that quietly was not long enough is the same failure one layer up. (The animation wait is
capped at 2s so an infinite animation cannot hang the shot — a page with a 3s transition is
shot mid-fade and warned about, which is the honest answer rather than a hang.)

**Every committed screenshot has been re-shot since.** That sentence read "the other screens'
dark screenshots predate the pre-paint fix and are still the wrong ones" when the fix landed,
and it stayed there after they were re-taken — a caveat nobody re-checked is the same drift as
a figure nobody re-measured. The test is cheap and exact: re-run `shoot.mjs` over every screen
and ask git whether anything changed. Rendering is deterministic, so **a clean `git status`
means the committed image is what the current shooter produces**; a diff means it is stale.

A full-page capture (`--full`) flattens `position: sticky`, so a pinned sidebar looks
like it stops halfway down and a sticky footer looks like it is clipping the panel above
it. Neither is a bug. The default viewport shot shows the truth.
