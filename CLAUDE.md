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

**And the asset host is the real wall on the rest.** `Coins`, `Tax` and `Circle icons` cannot be
added from here, and it is worth being exact about why: the Figma *reads* work, but
`get_design_context` returns asset URLs rather than inline markup, and both
`https://www.figma.com/api/mcp/asset/…` and `api.figma.com` answer `CONNECT tunnel failed,
response 403`. There is no route to a new glyph's SVG until that changes.

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
what the provenance join bought; 5 were read fresh, 3 came from the earlier re-read. Seventeen bind
`-full`, two bind `-hidden`, and **two bind BOTH** (`Editable list card`, `Spotlight Card`) — for
those, `get_variable_defs` cannot say which variant or role, so they stay unresolved rather than
guessed. The 17 carry the standing caveat: that tool proves a binding is PRESENT, never that one is
absent, so a `-hidden` binding on a boolean-hidden layer is not ruled out.

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
- **The marker cannot be anchored, so this repo's own source is in the haystack.** `scrapeBatches`
  uses `^` precisely so a format quoted in prose is not mistaken for data, and that is unavailable
  here: Figma appends this marker at the END of generated code. The first live run scraped six
  occurrences of this repo's own comments and fixtures — a `Font(...)`, a `family: ' + '"Open Sans"`
  from a wrapped string literal, a `weight: 300, …` from an ellipsis — and one of them, being LAST,
  won and reported a difference that did not exist.

  Two mechanisms answer that, and neither is sufficient alone. A **shape guard**: a report always
  carries family, style, size and weight, so an occurrence missing one — or carrying an ellipsis or
  a string seam — measured nothing, and is rejected and **counted**, never read as evidence of
  absence. (Written for truncation too: batches come under a 20KB cap and a half-arrived `Font()`
  is indistinguishable from a style that lost its letterSpacing.) And **agreement instead of
  last-wins**: occurrences collate by name and resolved size, repeats reinforce, and a genuine
  disagreement is reported as a CONFLICT naming both sides and their counts — never resolved by
  picking the popular one. A check whose verdict can be steered by whatever was scraped last is not
  measuring Figma.

  What it still cannot do: a verbatim, well-formed report quoted in a source comment is
  byte-identical to a real one. `build-type-css.mjs`'s fixture is one, and it agrees with Figma, so
  it changes nothing today. A stale one would surface as a CONFLICT of 1 against 80-odd rather than
  as a verdict — the right failure mode, but a limit, not a solved problem.

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
