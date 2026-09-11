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
  and Medium (500) styles, and `build-type-css.mjs` deliberately emits NO `font-weight` for those,
  so they inherit 400. `text-styles.tsv` still records what Figma has — its job is to be truthful
  about Figma — and the exclusions are counted and named by both the build and `verify-type.mjs`
  on every run. Re-enabling one fails the type check.
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
and never invents one — an unmatched row keeps an empty id and is reported. 18 geometry rows
have no id on purpose: they are measured sub-parts (`Links (primary)`, `People (row)`) that
Figma never published as component sets, so they never will.

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
| `Size=L/M/S/XS - ..px` | `Circle icons` | **not a Figma change at all** — `extract-icons.mjs` captured one component set's four VARIANTS as four separate icons | needs the extractor fixed, then a re-read |
| `unnamed-813678321` | — | an unnamed node captured as an icon | needs a Figma read to identify or drop |

The two marked corrected needed no Figma call: the SVG on disk was already the right artwork, and
only the name was wrong, so it was a rename in `icons.tsv` plus a `git mv`. The rest genuinely
need a read and are left failing rather than declared — **a gate turned green by declaring a bug
acceptable is worse than one that is honestly red.** Nine actionable items with a written
diagnosis is a different thing from 286 unreadable ones.

Pair the two lists by eye before importing anything. Giving `icons.tsv` an id column is the real
fix and needs a re-extract that carries one.

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

It is not an excuse either. Each of the seven is an **exact duplicate of a live primitive at the
same value**, so there is nothing to extract — but nine components still bind the retired name,
`Full page` binds four of them, and `Header` binds a deprecated pink *and* its non-deprecated twin
in the same component. That is a Figma-side rebinding job which this rule does not touch.

**It cannot attribute a read to a Figma file.** A design-context response does not carry its file
key, so a transcript that also read another Figma file will show that file's variables as
unknowns here. Six of the current eight are that: they come from the Pathway test file, and their
reasons say so and why (this file has no `color/*` collection; it spells spacing
`Spacing/sizing-small`, not `-sm`).

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
library, the type layer, the docs, and every GENERATED FILE THAT SOMEBODY READS, each on a
different axis.

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

A `--` is a check that measured nothing. It is not a pass. And a **placeholder is not a
picture**: an asset that has not arrived gets a marked stand-in from
`scripts/build-placeholders.mjs`, which `images` passes but counts and names by key in its
verdict line on every run. Never remove that count to tidy the output — it is the only thing
keeping a tinted panel from quietly becoming the finished thing.

**Always screenshot the result in light and dark and look at it** before saying a screen is done — with
`node scripts/screenshot-screen.mjs <screen.html>`, which refuses to write a PNG if the page
is not rendering in Open Sans. A screenshot in the wrong typeface is worse than none: it is
false evidence, and it is what this project shipped for months.
