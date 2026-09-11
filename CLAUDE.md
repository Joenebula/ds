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

**And "GONE" used to claim more than the listing can prove.** It read *"is no longer published by
Figma"*. What a saved listing proves is *"is not in this listing"*, and on 2026-09-11 the two
components carrying that verdict turned out to be opposite cases:

| | node id | what Figma said | really |
|---|---|---|---|
| `Side navigation panel` | `22973:20811` | `get_metadata`: *"node ID was not found in the file"* | **deleted**, and `.pf-side-navigation-panel` still ships a rule for it |
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

## Icon drift

The token layer got a drift check and the type layer got one; the ICON layer had the same hole and
nobody had noticed. `icons.tsv` holds 294 SVGs captured from transcripts, `verify-icons.mjs` checks
them against the sheet it generates FROM them, and nothing had ever compared one of those drawings
against Figma. `sync-check.mjs` is not that check either — it compares NAMES, and a redrawn icon
keeps its name, so it is invisible there by construction.

```
npm run icons:check
```

**Current reading: 284 of 287 pinned icons verified identical against Figma, 3 drifted.** The first
run said SIX had drifted, and three of those six were the CHECK being wrong — the correction is the
more useful half of this section.

| | | |
|---|---|---|
| `Community group people` | `6237:66072` | path 5 moved **361.32** |
| `People first face` | `695:14903` | path 0 moved **63.37** |
| `Team` | `11453:114175` | path 0 moved **49.06** |
| ~~`Key`~~ | `8198:78418` | every path within budget — **not drift** |
| ~~`Rocket`~~ | `9598:97928` | identical — **not drift** |
| ~~`Upload CSV`~~ | `659:390` | within budget — **not drift** |

The first version rounded both sides to 2dp and hashed the text. That does not remove precision
error, it MOVES THE BOUNDARY: Figma's `29.735` rounds to `29.74` while the value the extractor
stored as `29.73` stays put, and one hundredth of a unit at one control point reported a redrawn
icon. Rounding to 1dp is no fix — 1dp has boundaries too, and four of the six still differed there.
`Team` was the proof that something was wrong with the check rather than the artwork: same six
paths, same command sequence letter for letter, same 78/52/52/78/52/80 numbers per path, and a
digest insisting the drawing had changed.

**So the comparison is structural plus a tolerance, and the tolerance is derived rather than
picked.** The skeleton (command letters, every number stripped) and the per-path number counts are
compared EXACTLY — no rounding can add, remove or reorder a segment. The per-path sums are compared
against the error budget the stored precision actually allows: 2dp storage means each number is
wrong by at most `0.005`, so a path of n numbers may drift `n × 0.005` by rounding and no further.
The three real ones exceed their budget by three orders of magnitude — 361 against 0.275 — and the
three false ones come in under it. Nothing in between, which is what a good discriminator looks like.

**What it still cannot see, stated rather than left to be found:** two equal and opposite moves
inside one path cancel in the sum. The skeleton and the count both still hold, so it takes a
deliberate edit to hide, but it is a tolerance and not a proof.

**The digest file was deleted rather than left in place, then regenerated.** The old one was in the
`{id, h}` format, which the current comparison would read as "no skeleton" and report as 287 drifted
icons — 287 false alarms presented as fact. `formatError()` refuses an old-format file outright and
says to re-run the collector. Re-running is one call; reporting 287 lies is not recoverable.

**And 284 matching is itself the integrity check on the regenerated file.** It was transcribed by
hand out of two collector runs, and a single mistyped digit in any sum would have surfaced as a
spurious drift rather than passing quietly — so the 284 that matched are 284 lines proved correct by
the comparison they feed.

**A digest is PATH DATA only, and the three exclusions are the whole design.** Colour is ignored
because `icons.tsv` stores `fill="currentColor"` by design while Figma exports the real paint —
comparing it would report all 287 as drifted on run one, which is a check nobody reads twice.
Numbers are rounded to 2dp on both sides because the extractor rounds and Figma does not; **the
first attempt compared raw coordinates and matched nothing at all, not one icon of 287**. Path ORDER
is deliberately NOT normalised: a reorder changes stacking, and "probably harmless" is a person's
call.

It takes no network calls, like `extract-tokens.mjs` — a session with Figma runs the collector in the
script's header and drops the result into `tokens/_raw/figma-icon-digests.json`. Without that file it
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

### Only 346 of it is the shipped library

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
driver: set `STYLE_NAME`, paste it into `use_figma`, read the report. It is **generated** by
`scripts/build-figma-rebind.mjs`, which inlines `rebind-rule.mjs` verbatim — a plugin sandbox cannot
import a module, and a hand-copied second copy is how a fixed rule keeps being run in its broken
form. `verify-generated.mjs` gates it as a fifth file, so changing the rule without rebuilding fails
`npm run verify` rather than leaving a stale copy to be pasted into Figma and believed.

The driver's own job is only the three things the rule cannot do for itself, and each one cost a
cycle today:

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

It now names the dated snapshot instead: `censusNote()` reads the `# checked:` header of both
census files and prints *"1429 references as at 2026-09-11 … re-sweep with
`docs/figma-rebind-deprecated.js` before trusting either"*. A census that is MISSING is said out
loud, and one carrying no date is called out as unable to be aged. This check reads transcripts and
cannot re-count Figma; pretending otherwise is how the nine got there. Four mutants hold it, and the
same numbers came out of the comment above `isDeprecatedCollection` for the same reason.

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
rather than from what prose has been seen to do: of the 228 names this repo holds, **none contains
a dot and none contains a backslash**, so the dot is gone and a backslash is legal only in the
`\/` pair a kebab variable uses to escape its separator. Four mutants hold it, including one that
allows the dot back and one that rejects the real names too.

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

**The transcript is not the durable record; the TSVs are.** `tokens/_raw/` holds 284 variant rows,
162 geometry rows and 294 icon rows, and the only transcript on disk contains 4 `PAGE` batches and
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

**Confirming the split did not unblock applying it**, and the reason is worth knowing.
`build-components-css.mjs` emits `/* unmapped Figma token: X */` instead of a declaration when the
token layer lacks a name, and counts and names those in its verdict line — so it is not silent. But
rewriting the 38 rows today would still delete `border-color` from 21 shipped components. The
correction becomes a mechanical apply the moment `figma-variables.json` lands; until then the
mapping lives in `uncaptured-tokens.tsv` and is named on every `tokens:check` run.

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
