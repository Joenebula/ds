# Run log

Append-only. Newest at the bottom.

---

## Pre-flight — 2026-09-08

**Scope fence:** `/home/user/ds`
**Starting save point:** `fe002ce`, clean tree, already pushed.

**Skill scan (fresh, this run):**

| Skill | Source | Modified |
|---|---|---|
| `people-first` | project (`.claude/skills/`) | 2026-09-08 11:50 |
| `skill-creator` | user (synced) | read at task time |
| `figma-use` | Figma MCP resource | read at task time |
| `artifact-design` | bundled | read at task time |

Full `SKILL.md` files are read immediately before the task they govern, not cached from
this scan — a stale read is how work gets built against superseded rules.

**Queue written:** 5 actionable tasks, 1 blocked pending a decision on icon scope.

**Assumption logged:** the geometry check (task 1) will assert against
`tokens/_raw/component-geometry.tsv` as the source of truth, matching how the colour
check asserts against `component-variants.tsv`. Cheap to change if the file moves.

**Not started.** Waiting for approval to begin.

---

## Task 1 — Guard against wrong shapes — DONE

**Skills loaded:** `people-first` (project, modified 2026-09-08 11:50) — read in full for the
geometry reference. `figma-use` not needed (no Figma reads in this task).

**Built:** `scripts/verify-geometry.mjs`. Renders the page in Chromium and compares
computed height, width, radius, font-size and text-transform against the measured values
in `tokens/_raw/component-geometry.tsv`.

**Commands run and results:**
- `node scripts/verify-geometry.mjs prototypes/absence-requests.html`
  → first run: 28 match, 1 off. Caught the table header rendering 56px where Figma has 54px.
- Fixed by setting an explicit line-height on table cells (the 20px header icons were
  growing the line box). Re-run: **29 match, 0 off.**
- Failure test on a throwaway copy with the original two mistakes reintroduced
  (4px button radius, uppercase tags) → **correctly reported 2 failures.**

**Done-when met:** yes — checks all the named properties, and demonstrably fails on bad input.

**Assumption logged:** pill radii are checked as ">= half the height" rather than an exact
match, because Figma stores literal values (20, 76, 78) where CSS should use 999px. An exact
comparison would fail correct code. Cheap to tighten if wanted.

**Note, not a defect:** this sandbox blocks `fonts.googleapis.com`, so locally rendered
screenshots fall back from Open Sans to a system face. The published artifact loads Open Sans
correctly — only my local screenshots are unrepresentative of the typeface.

---

## Task 6 (moved up) — Real People First icons — PARTLY DONE (9 of 289)

**Skills loaded:** `figma-use` (Figma MCP resource, server-provided and not user-editable,
so the in-session read was reused rather than re-fetched — logged here for transparency).

**What happened:** three attempts to make a full 289-icon export cheap, all recorded
because the reasoning matters for whoever finishes this:
1. Minified the SVG output (stripped xmlns/width/height, currentColor, dropped no-op clip
   wrappers) — got about 9 icons per call.
2. Tried deliberately oversizing the payload so the harness would write it to a file
   instead of returning it inline. It does not: `use_figma` truncates at 20KB itself,
   before that mechanism applies. Data lost, approach abandoned.
3. Added coordinate rounding to 2dp — about 12 icons per call. Still ~24 calls for the rest.

**Decision:** exported the 9 icons the prototype actually uses rather than grinding 24
near-identical calls mid-run, and parked the remaining 280. This follows the queue rule
about parking an expensive task and carrying on rather than ending the run.

**Commands run and results:**
- Icons written to `assets/icons/` (9 files) and `tokens/_raw/icons.tsv`.
- 20 icon instances swapped into the prototype (my hand-drawn substitutes replaced with
  real Figma artwork).
- `node scripts/verify-geometry.mjs` → 29 match, 0 off.
- `node scripts/verify-rendered.mjs` → 54 colours match, 0 off.
- Screenshot checked by eye: buttons now carry the real glyphs.

**Not done:** 280 icons. `Filter` was skipped even within the chosen set — its SVG is
unusually large (a complex compound path) and was dropped when writing the batch to disk.
The table's filter glyph is still my drawn one.

---

## Task 2 — Measure the remaining components — DONE

**Skills loaded:** `figma-use` (MCP resource) for the reads; `people-first` (project,
2026-09-08 11:50) for where the geometry belongs.

**Built:** measured Navigation, System messages, Analytics and charts, People and AI —
41 more components, taking `tokens/_raw/component-geometry.tsv` from 38 to 79.

**Commands run and results:**
- 5 read-only Figma calls, one per page.
- `node scripts/build-geometry-ref.mjs` → geometry.md regenerated, 79 components.
- Coverage check → every component the prototype uses now has a measurement.

**Worth knowing, found while measuring:**
- `Profile image` is a **circle** (93x93, radius 47) — avatars are round even though
  checkboxes and radios in this system are square.
- `Clock in` and `AI button` are **pills**, like Button and Filter chip.
- `Navigation item` is a 90x86 rail item with the icon **above** the label, not beside
  it — the prototype's side nav is a simplification, not a match.
- Chart figures are large: donut centre numbers are 60px, metric cards 36px.

---

## Task 3 — pf-audit skill — DONE

**Skills loaded:** `skill-creator` (user, synced) for skill structure and description
wording; `people-first` (project, 2026-09-08 11:50) for what the auditor should check.

**Commands run and results:**
- `node scripts/pf-audit.mjs prototypes/absence-requests.html` → first ever run.
  100% token coverage in both modes; flagged 2 contrast issues, both on DISABLED text.
- Refined the auditor to separate disabled-text findings from real failures. WCAG 1.4.3
  exempts disabled controls and the system's disabled token is 3.64:1 by design, so
  counting it as a failure would train people to ignore the report.
- Re-run on the prototype → PASS, exit 0.
- Built `test-fixtures/off-brand.html` (deliberately not People First) →
  23.1% coverage, 10 off-palette colours each with the nearest correct token and a
  distance, 5 genuine contrast failures, exit 1.

**Done-when met:** yes — passes a good page, fails a bad one, and names the right token.

## Task 4 — pf-screen skill — DONE

**Skills loaded:** `skill-creator`; `people-first`; both reference files.

**Built:** `.claude/skills/pf-screen/SKILL.md`, encoding the workflow that actually
worked this session: read geometry and variants BEFORE writing, tokens for colour and
measured literals for shape, then run both verification scripts before handing over.

**Checked:** every file path the skill cites was confirmed to exist (7/7).

**NOT fully checked:** the done-when asked for a fresh session, given only this skill,
to produce a passing page. That was not run — I wrote the skill, so me following it is
not an independent test. What is verified is that its instructions are internally
consistent and every path and command in it resolves. A genuine test needs a separate
session.

## Task 5 — pf-handoff skill — DONE

**Skills loaded:** `skill-creator`; `people-first`; both reference files.

**Built:** `.claude/skills/pf-handoff/SKILL.md` plus a worked example,
`docs/handoff-absence-requests.md`, generated for the prototype.

**Commands run and results:**
- The spec generator pulls every value from `design-tokens.json`,
  `component-geometry.tsv` and `component-variants.tsv` — nothing typed by hand.
- All 10 component-to-variant mappings were checked against the variant extract:
  **0 unverified**. Anything unmatched would have been marked in the output.
- The spec carries honest gaps where Figma does not specify (responsive behaviour of the
  review panel, which navigation pattern is intended) rather than filling them.

**Done-when met:** yes — tokens, variants, states, geometry and accessibility, no
invented values.

---

## Task 4 re-check — pf-screen INDEPENDENTLY VERIFIED

The gap flagged earlier ("me following my own skill is not a test") is now closed.

**Method:** spawned a separate Claude Code session on a fresh clone of the branch, with
a natural request ("build me a payroll run summary screen for People First...") that
deliberately never mentioned `pf-screen`. That tests description-triggering as well as
content.

**Result:** it pushed `prototypes/payroll-run-summary.html` to the branch. Checked here
with the same scripts:
- `verify-geometry` → **29 match, 0 off**
- `pf-audit` → **166/166 on-system, 100% coverage both modes, no contrast failures**

It also used the `.src.html` + `build-prototype.mjs` placeholder workflow, which is
described only in the skill — evidence the skill was actually read, not just that the
result happened to be fine.

**Bug found and fixed before the test could run:** `playwright-core` was installed with
`--no-save` and never declared, so a fresh clone could not run any of the three checks.
Fixed in `7fef260` (declared in devDependencies, verified by wiping node_modules and
reinstalling). Only a fresh-clone test would have surfaced this.

---

## Task 6 — icons — STOPPED for a decision

Found a route roughly 50x cheaper than batching, and stopped rather than grinding:
`download_assets` on the Icons page returns the whole page as ONE 2.1MB SVG containing
all 289 icons. One download, split locally.

It is blocked only by this session's network policy denying `www.figma.com` (verified:
`connect_rejected` from the egress proxy) — the same block that stopped the REST API
earlier in this project.

The batching route works (adaptive batching verified at ~11 icons per call, no
truncation) but costs about 25 export calls PLUS 25 equally large writes, because the
data crosses the conversation twice. Stopped and put the choice to the user rather than
spending hours on the expensive path when a cheap one exists.

---

## Task 6 — icons — DONE (293 of 293)

**Skills loaded:** `figma-use` (MCP resource) — re-read in full before the export run.

**Route:** the cheap route stayed shut. `download_assets` returns the whole Icons page
as one 2.1MB SVG, but every asset URL is on `www.figma.com`, which this environment's
network policy denies (`CONNECT tunnel failed, response 403`, re-confirmed this run).
So: the plugin API, in adaptive byte-budgeted batches under the 20KB truncation cap.

**What made it affordable.** The expensive half of batching was never the Figma calls —
it was that each batch had to be retyped into the conversation to be written to disk, so
~200KB of path data crossed twice. It doesn't: tool results are already persisted to the
session transcript on disk. `scripts/extract-icons.mjs` reads the batches back out of the
transcript and writes the files. That removed the second crossing entirely, and made the
run resilient — when the Figma MCP server disconnected mid-export, **nothing was lost**;
re-running the extractor recovered all 216 icons captured to that point.

Also: exports were fanned out 6 at a time in a single message rather than sequentially.

**A defect I introduced, and how it surfaced.** The minifier mapped every fill to
`currentColor` so icons would tint with text. `verify-icons.mjs` passed 293/293 — every
file rendered. But rendering is not the same as being right: the **screenshot** showed
ten file-type badges as solid black blocks with the lettering swallowed. Those icons are
genuinely multi-colour in Figma and the colour IS the information — PDF `#BE2028`,
spreadsheet `#517A38`, document `#0075BE`, TXT `#3E3E3E`, ZIP `#FC8700`, white lettering
knocked out. Re-exported all ten with a minifier that maps only the monochrome outline
(`#656565`) to `currentColor` and leaves everything else alone. Confirmed by eye.

The lesson is the same one this project already learned once with geometry: an automated
check only covers the axis it looks at. `verify-icons.mjs` proved the files *paint*; only
looking at them proved they were *correct*. Both were needed.

**Commands run and results:**
- `node scripts/extract-icons.mjs` → 293 of 293, complete, no gaps.
- `node scripts/verify-icons.mjs` → 293 of 293 render, 0 broken, no dangling mask refs.
- `node scripts/verify-geometry.mjs` on both prototypes → 29 match, 0 off (each).
- `node scripts/verify-rendered.mjs` → 54 colours match, 0 mismatched.
- `node scripts/pf-audit.mjs` on both prototypes → PASS, 100% coverage both modes.

**Also fixed in passing:** Figma emits document-global mask ids
(`path-5-inside-1_9598_97877`). Two icons inlined on the same page would collide and one
would render through the other's mask. The extractor namespaces every id per file.

**Known and deliberate:** `Icon background` (three overlapping blurred circles) is a
decorative backdrop, not a glyph. Two icons are named `GIF` and two `Transfer` in Figma;
filenames are deduped with a numeric suffix. One component has a blank name and is
exported as `unnamed-<id>`.

---

## Follow-on — hand-drawn glyphs, and a check for them

With the full set available, the last hand-drawn glyph in the prototype (the table
header filter funnel, drawn because `Filter` had failed to export earlier) was replaced
with the real Figma icon.

**Built:** `scripts/check-icon-fidelity.mjs`. It normalises every inline `<svg>` in a
page against `assets/icons/` and names the ones that aren't real Figma icons. Added to
`npm run verify`.

This is the third axis. The colour check and the geometry check both passed on a page
containing a glyph I had drawn myself — neither can see it. A hand-drawn icon is exactly
the kind of thing that makes a screen read as "close, but not ours".

- `node scripts/check-icon-fidelity.mjs prototypes/absence-requests.src.html`
  → before: 20 of 21, one not a Figma icon. After: **21 of 21**.
- geometry 29/29, colour 54/54, audit PASS — unchanged by the swap.

---

# Run 2 — make the variants usable

## Task 7 — Measure Forms and Controls — DONE

**Skills loaded:** `figma-use` (Figma MCP resource, re-read in full before the reads).
`people-first` (project, 2026-09-08 19:13) for where geometry belongs.

**Built:** measured every component on the Forms and Controls pages — 27 new rows, taking
`tokens/_raw/component-geometry.tsv` from 79 to **106** components. Forms 20 of 21,
Controls 11 of 11.

**Commands run and results:**
- 2 read-only Figma calls, fanned out in parallel (one page each, as the skill requires).
- `node scripts/build-geometry-ref.mjs` → geometry.md, 106 components.
- `node scripts/verify-geometry.mjs prototypes/absence-requests.html` → **29 match, 0 off**
  (unchanged by the rename below).

**A naming correction.** Figma calls the input box `Field`. An earlier pass had recorded it
under my own invented name, `Form field (input)`. Renamed to Figma's name and updated
`verify-geometry.mjs` to match — the whole point of this extract is that names line up with
what a designer sees.

**Worth knowing, found while measuring:**
- `Form field` is the *wrapper* — label + input + helper text — and carries **40 variants**
  (Input type x State: Text, Dropdown, Search, Date picker, Time picker, each
  Default/Disabled/Error/Selected). This is the single most useful component for building
  screens, and it had no geometry recorded at all.
- `Control` is the checkbox/radio box itself: 20x20, radius 4.
  `Checkbox/Radio item` is box + label, 22 high, 10px gap, and has 18 variants.
- `Radio tile` and `Radio card` are 235 wide with 25px side padding and 16px SemiBold —
  noticeably heavier type than the rest of the form set.
- `[S] Post content` has 73px of left padding, which is room for an avatar.

**Assumption logged:** the geometry script measures the *first* variant of a set as
representative. For sets whose variants differ in size (rare here) that under-reports.
Cheap to revisit — the variant list is already captured per component.

**Correction to an earlier reading:** I first reported that no variant data existed for
Forms and Controls. That was wrong — I matched the page name with trailing spaces. Variant
colours were already captured for 15 of these components (47 rows).

---

## Task 8 — A stylesheet you can actually build with — DONE (proof pending task 11)

**Skills loaded:** `people-first` (project, 2026-09-08 19:13); `figma-use` (MCP resource)
for the extra measurement pass below.

**Built:** `scripts/build-components-css.mjs` → `dist/components.css`.
**71 components, 244 rules, 54 with measured geometry.** Generated from the raw extracts,
never hand-written, so it cannot drift from Figma without the extract changing.

**How it reads.** Class naming mirrors Figma's variant panel rather than inventing a
scheme — a component is a class, each variant *property* is a data attribute, and values
keep Figma's exact spelling:

    <button class="pf-button" data-type="Action">Save</button>
    <div class="pf-form-field" data-input-type="Dropdown" data-state="Error">

States that have a real CSS equivalent get one *as well as* the attribute, so a live
control behaves correctly and a gallery can still pin any state:

    .pf-button[data-type="Action"][data-state="Hover"],
    .pf-button[data-type="Action"]:hover { background: var(--pf-bg-secondary-button-hover); }

**A bug the first draft had, and how it was caught.** Reading the generated output showed
`.pf-form-field` laid out as a horizontal row. It is a vertical stack — label above input.
The cause: the geometry extract recorded `gap` but never recorded auto-layout *direction*,
so a gap of 5 was rendered as a row. Fixed properly rather than patched: measured
`layoutMode`, `counterAxisAlignItems` and `primaryAxisAlignItems` across all nine
component pages (9 parallel Figma reads), added a `layout` column to
`component-geometry.tsv` — now filled for **76 of 106** components — and taught the
generator to emit `flex-direction`, `align-items` and `justify-content`. Components whose
direction is not captured fall back to a row *and say so in a comment*, rather than
silently guessing.

**Commands run and results:**
- `node scripts/build-components-css.mjs` → 71 components, 244 rules, 0 unmapped tokens.
- Cross-checked every `var()` in the output against `dist/tokens.css`:
  **64 distinct tokens referenced, 0 undefined.**
- `npm run build` → clean; the generator is now part of the build.

**Assumptions logged:**
- A large fixed width in Figma is the width of the artboard the component was drawn at,
  not a rule, so width is only carried through for small fixed controls (<=120px).
  Anything wider is recorded as a comment instead. Easy to change in one place.
- A component set is measured from its *first* variant. Fine here; would under-report a
  set whose variants differ in size.

**Not yet checked:** whether a real screen can be built from these classes alone. That is
task 11, and it is the actual proof.

---

## Task 9 — See every component on one page — DONE

**Skills loaded:** `people-first` (project, 2026-09-08 19:13).

**Built:** `scripts/build-components-gallery.mjs` → `docs/components.html`.
**9 pages, 71 components, 191 variants**, each rendered with the real generated
stylesheet, with a System/Light/Dark switch. Every specimen is labelled with Figma's own
variant string, so the page reads like the Figma variant panel.

This is the answer to the original complaint that only 11 cards were surfaced.

It also lists the **100 components that are NOT captured** — they exist in Figma but have
no extracted variant colours, so the stylesheet has no rules for them. A gallery that
quietly omitted the gaps would be worse than no gallery.

**A second bug caught by looking, not by a script.** In dark mode, Button
`Type=Hollow`, `Type=Filter` and `Type=Sort` in their Default state rendered as
light-filled pills with near-invisible text — the opposite of hollow. The extract was
right: those variants genuinely have no fill in Figma. The fault was mine. `.pf-button`
renders as a `<button>`, and the generated base class never reset the browser's own
control styling, so "no fill" fell through to the UA's grey buttonface. Fixed by emitting
an appearance/background/border reset in every component's base rule. Both modes now
correct: hollow buttons are transparent with a border.

That is now **twice this run** that the automated checks passed while the output was
visibly wrong, and twice that a screenshot caught it. Task 10 exists to close some of that
gap, but looking stays part of the job.

**Commands run and results:**
- `node scripts/build-components-gallery.mjs` → 9 pages, 71 components, 191 variants.
- Rendered in Chromium and inspected by eye in **both** light and dark:
  all 12 Button variants, Filter chip, Links correct in each.
- `npm run build` → clean; both generators are now part of the build.

---

## Task 10 — Check the stylesheet against Figma — DONE

**Skills loaded:** `people-first` (project, 2026-09-08 19:13).

**Built:** `scripts/verify-components.mjs`. Renders `dist/components.css` in Chromium and
compares every class against the extracts — height, radius (with the pill rule), font
size, flex direction, and the resolved background / text / border colour of every
variant — in **both light and dark**. `verify-geometry.mjs` does this for one page; this
does it for the whole library, which is what matters once screens are built from classes.

**Commands run and results:**
- `node scripts/verify-components.mjs` → **1764 of 1764 checks match Figma, 0 off.**
- `node scripts/verify-components.mjs --self-test` → deliberately breaks Button's height
  and radius; **48 failures caught**, so the check demonstrably fails on bad input.
- Added to `npm run verify`.

**A genuine data conflict it found, and the rule that resolves it.** Four checks failed
at first: `Control` measured 22px where Figma says 20px. Not a tolerance problem — Figma
records the box as 20x20 *and* gives it 10px padding. In CSS with `border-box`, padding
plus border (22px) floors the height and silently wins, so the box you get is not the box
you drew. The size you see in Figma is authoritative, so the generator now drops padding
that its own measured height cannot fit, and records why in a comment above the rule.
This affects any component whose padding exceeds its height, not just this one.

---

## Task 11 — Rebuild the absence-requests prototype on the stylesheet — DONE

**Skills loaded:** `people-first` (project, 2026-09-08 19:13), `pf-audit`, `pf-screen`.

**Built:** `prototypes/absence-requests.src.html` no longer contains hand-written
component CSS. Markup now names Figma variants directly — `<button class="pf-button"
data-type="Action">`, `<div class="pf-form-field" data-input-type="Text"
data-state="Error">`, `<td class="pf-table-cell-ag" data-type="Default"
data-style="Stripe">`. The file went from 543 lines to 455, and the style block from
around 380 lines of component CSS to 161 lines of genuinely local rules: page layout,
cursor, transition, the focus ring, and the tick glyph drawn inside a checkbox. That
block is marked with a comment saying so — if anything in it restates a Figma value,
that is a bug.

`scripts/build-prototype.mjs` now inlines both stylesheets (`/*__TOKENS__*/` and
`/*__COMPONENTS__*/`), so a self-contained prototype still has no external references.

**Commands run and results:**
- `npm run build` → clean; 71 components, 244 rules, 0 unmapped tokens.
- `node scripts/build-prototype.mjs prototypes/absence-requests.src.html
  prototypes/absence-requests.html` → 111 KB, 44 distinct tokens, no raw hex, no raw rgb.
- `node scripts/verify-geometry.mjs` → **29 of 29 match Figma, 0 off.**
- `node scripts/verify-rendered.mjs` → **54 rendered colours match, 0 mismatched.**
- `node scripts/check-icon-fidelity.mjs` → **21 of 21 inline glyphs are real Figma icons.**
- `node scripts/pf-audit.mjs` → **PASS**, 100% token coverage in both modes. The two
  low-contrast items it lists are disabled controls, which WCAG 1.4.3 exempts.
- `node scripts/verify-components.mjs` → **1764 of 1764, 0 off.**
- Screenshotted at 1400x1100 in light and dark and inspected by eye.

**The third visual-only bug this run.** All five scripts were green while the two table
header icons rendered as tiny empty outlined boxes. Cause: `.pf-table-header-icons` is
24x24 in Figma with 10px padding, which leaves a 2px content box and crushes the 11px
glyph. The padding rule added in task 10 only caught a *negative* content box, so 2px
slipped through. Generalised it: any padding leaving under 8px for content is treated as
decorative and dropped, because nothing legible fits below that. Also corrected a
mislabelled icon in the prototype — a Sort glyph was carrying Filter's variant
attributes.

**Assumption logged:** table striping is subtle in light mode (`bg-primary` vs
`bg-secondary`). Checked the bindings rather than adjusting: Figma binds
`Table/Primary cell` and `Table/Stripe cell`, which resolve to genuinely different values
in both modes. The subtlety is Figma's, not a broken binding, so it is left alone.

**Not checked:** the prototype is one screen. The 100 components with no extracted
variant colours are still uncovered by any rendered check — they are listed in
`docs/components.html` under "Not yet captured" so the gap is visible.

---

# Run 3 — make the library the default, and close the colour gap

## Task 12 — Tell everyone the library exists — DONE

**Skills loaded:** `people-first`, `pf-screen`, `pf-handoff` (project, all re-read in full
at the start of this task).

**Why this was the first task of the run.** A survey at the start found that nothing
pointed anyone at the component library built in Run 2 — not the skills, not `README.md`,
not `CLAUDE.md`. Worse, the `people-first` skill still taught hand-written recipes under
class names the library does not define (`.pf-btn--action`, where the library ships
`.pf-button` with `data-type="Action"`). A fresh session would have followed the skill,
written its own component CSS, and walked straight back into the wrong-shapes bug the
library exists to prevent. The library was, in effect, invisible.

**Changed:** the recipes section of `people-first` replaced with the real classes and how
the naming maps to Figma's variant panel; a new hard rule against hand-writing component
CSS; the variant and geometry sections reframed as reference rather than instructions.
`pf-screen` now builds from classes and lists all the checks. `pf-handoff` names the class
alongside the component and variant. `README.md` and `CLAUDE.md` updated.

**A stale claim that would have actively misled.** `pf-screen` said *"Only 9 of the 289
Figma icons are extracted so far. If you need one that is missing, say so rather than
drawing a substitute."* All 293 have been extracted since Run 1. A session reading that
would have refused to use icons it had.

**Commands run and results:**
- `node scripts/check-skill-classes.mjs` → **15 classes, 78 real variants, 0 problems.**
- Self-test: renamed a documented class in the skill → **5 failures caught**; restored.
- `npm run verify` → all six green.

**VERIFIED by an independent session, the way task 4 was.**
`session_01U3GTrXXs1Wn1aoHh3hVMEk`, fresh clone, no memory of this work, asked for a
timesheet approvals screen with no mention of the library. It built the entire screen from
library classes — 15 of them, 175+ uses — with Figma's exact variant spelling, including
the subtle two-attribute rule for a selected filter chip. Its own style block holds one
shape declaration, and that one is page layout, not a component. Its screen scores 29
geometry, 54 colour, 43 of 43 icons, audit PASS.

**A new check, because writing the class table by hand went wrong immediately.** Four of
the fifteen rows had the wrong attribute on the first pass — `Toast message` keys on
`data-message-type`, not `data-type`; `Table header (AG)` has an `Alignment` axis I had
recorded as having none. Wrong documentation of this kind fails **silently**: the
attribute matches nothing, the component renders unstyled, and nothing reports an error.
So `scripts/check-skill-classes.mjs` now renders every documented class and attribute and
asserts it selects a real rule. `pf-audit` also joined `npm run verify`, which had claimed
to run it and did not.

## Task 13 — Capture the colours screens actually need — DONE

**Skills loaded:** `figma-use` (Figma MCP resource, re-read in full before the first read).

Extracted the variant colour bindings for Navigation, Cards and panels, Forms, and Buttons
and links. Library: 71 components / 191 variants → 98 / 235.

**Built:** `scripts/extract-variants.mjs`, which reads the Figma batches back out of the
session transcript rather than having 300+ rows retyped into the conversation — the same
trick as the icon export, and it again meant the repeated Figma MCP disconnections during
this run cost nothing: every landed read was already durable on disk.

**Two decisions in it worth knowing:**

*Redundant axes are collapsed.* Figma variant sets carry axes with nothing to do with
colour — Darkmode, Mobile, Full width, Label. Carried through literally they would force
`data-full-width="Yes"` on every input before it took any style at all. An axis is dropped
when doing so leaves no contradiction. That rule reproduces, and now explains, the
convention the earlier hand extraction had followed without stating.

*Merging is conservative.* The new Button rows carry a `Label` axis the captured rows do
not. Importing them wholesale would have left `.pf-button[data-type="Action"]` matching
nothing and silently unstyled every button on the existing screen. A component already
captured is only extended by rows whose axes match; everything else is reported.

**Finding recorded rather than papered over:** a disabled Action, Positive or Negative
button binds exactly the same fill and text as its enabled state, so it is visually
identical. Only the hollow types change. That is an accessibility problem in the Figma
file; it is now documented in the skill rather than hidden by the library.

## Task 14 — Capture the rest — DONE

Read the remaining pages. Library: 98 → **139 of 172 components**, 283 variants.

**A real gap in my own method, not in Figma.** The extraction only ever walked
`COMPONENT_SET`s, so 18 components that have no variants had never been read at all. They
were sitting in the "not captured" list looking like Figma had nothing to give.

**Every one of the 33 that remain now has a recorded reason** — written to
`tokens/_raw/uncaptured-reasons.tsv` and shown in `docs/components.html` grouped by reason:
20 on the documentation page, 11 that bind no colour variable anywhere in Figma, 1 unnamed
Figma leftover, 1 whose variants are one per fictional employee. A gallery that lists gaps
without saying why invites the reader to assume they are oversights; most are deliberate.

**Two bugs found and fixed:**
- A page read twice — first its variant sets, later only its plain components — had the
  second read silently *replace* the first, discarding what the first found. Batches now
  merge per row.
- Whole-page exclusion reasons only covered components a read happened to touch. They now
  come from the inventory.

**Also added a count check.** Three files quoted "71 components and 191 variants". That
number had been wrong since the previous commit and nothing would have caught it.
`check-skill-classes.mjs` now verifies every such count against the extract. Self-tested by
bumping one: caught.

## Task 15 — Prove it on a second screen — DONE

Met by the task 12 verification session rather than by me. Building the screen myself would
have proved only that I can follow my own documentation; what needed testing was whether
the documentation works on someone who has not read this conversation.
`prototypes/timesheet-approvals.html` is the result, and it passes every check.

**A fourth look-at-it moment, which this time found nothing.** The screenshot appeared to
show the side panel's helper text clipped by its button row. Rather than "fixing" it I
measured: `overlapped: false` — the text sits below the fold inside the panel's own scroll
area, which is correct. The apparent clipping was an artefact of a full-page screenshot
against a `100vh` sticky panel. Worth recording that looking also produces false alarms,
and that the answer is to measure rather than to trust either the eye or the check.

**Not checked:** the two skills changed in task 12 that no fresh session exercised —
`pf-handoff` and `pf-audit` were edited but only `people-first` and `pf-screen` were proven
by the verification run.

---

# Run 4 — finish the layers that were still half-built

## Task 16 — Measure the 55 half-captured components — DONE

**Skills loaded:** `figma-use` (Figma MCP resource).

**Built:** `scripts/extract-geometry.mjs`, plus Figma measurement reads across nine pages.
Every component in the library now has its size, padding, radius, gap, font and layout
measured — **139 of 139**, up from 84. Until this, a third of the library handed you a
background and no height: right colours, invented shapes, which is the exact split this
project already shipped once and built two checks to prevent.

**A rule that only ever covered half the box.** The generator already knew that a large
fixed WIDTH is the artboard a component was drawn on rather than a rule, but applied no
such judgement to height — so components drawn at screen size were about to ship with
`height: 1080px` baked in. Height needed three tiers rather than one threshold, because
the number means something different at each scale: up to 260px it is a control or row and
the height IS the design; to 700px it is a panel or modal, so the measurement is a floor
rather than a cap; above that it is the artboard and gets dropped with the reason recorded.

`verify-components.mjs` encodes the same three tiers. Without that it would have gone on
asserting the raw Figma number and failing the library on values the generator is
deliberately not emitting — a check disagreeing with the rule it is meant to be checking.

**Found by looking, not by a check:** the gallery specimens for `Full page navigation` and
`Menu-search-settings` were rendering a screen tall.

**Commands run:** `npm run build`; `npm run verify` → 2622 library checks, 0 off;
`verify-components --self-test` → 72 failures caught.

## Task 17 — A typography layer — DONE

**Skills loaded:** `figma-use`, `people-first`.

Figma has 23 text styles and the library had **none** of them, so every screen hand-wrote
`font-size`, `font-weight` and `letter-spacing` — hand-written component CSS by another
name, drifting from Figma the same way. `dist/type.css` now carries a class per style,
checked by `scripts/verify-type.mjs` (107 checks) and shown in the gallery.

**Re-reading from Figma corrected three things:**

- **Line height.** The old extract carried none, and the absence-requests screen had
  `line-height: 1.2` and `1.3` hand-written into its table *with a comment saying the
  extract could not capture it*. Figma sets AUTOMATIC line height on all 23 styles, so
  `normal` is the faithful value. Removed the invented numbers; the geometry check still
  passes at 54px and 58px. They had never been needed.
- **Weight.** A third recorded "unresolved". Figma binds the weight variable under
  `boundVariables.fontStyle`, not `.fontWeight`; reading the obvious-looking field returns
  nothing. With that fixed, 13 of 23 resolve. The other **10 have no weight anywhere in
  Figma** — including four `(light)` variants whose names promise a weight the style does
  not carry. Their classes set none and say so.
- **Letter spacing.** Recorded as a bare `-1` with no unit. It is percent: `-0.01em`.

**The self-test earned its place.** It reported the new type checker as broken, because it
targeted a class name that did not exist — exactly the failure a check that only ever
passes would hide.

## Task 18 — Make icons usable without pasting SVG — DONE

Using an icon meant opening `assets/icons/<name>.svg` and pasting its markup. That
friction on every use is what makes someone draw their own, which is the one thing the
icon set exists to prevent. Now: `<!--pf-icon:tick-->`, or `<!--pf-icon:export 14-->`,
expanded at build time to the real file's markup — so the output is still the ordinary
inline SVG the fidelity check already verifies, works in a standalone artifact, costs
nothing at runtime, and a name that does not exist **fails the build**.

All 21 icons on the absence-requests screen now use it, rewritten by matching each pasted
glyph against the icon files rather than by hand.

**It exposed a check going hollow.** `check-icon-fidelity` was pointed at the `.src.html`,
which no longer contains any inline `<svg>` — it reported a contented
`0 of 0 inline glyphs are real Figma icons, 0 are not` and exited zero. It now treats a
page with no glyphs as an error that says what to run instead, and `npm run verify` runs
it on the built page. A check that cannot fail is worse than no check.

**Commands run:** all seven checks green; a DOM sweep confirmed nothing on the rebuilt
page is clipped by the newly-measured fixed heights; screens read by eye in both modes.

**Not checked:** the icon reference syntax only works through `build-prototype.mjs`. A
hand-written artifact that never runs the build still has to paste SVG, and the skill
says so rather than implying otherwise.

---

# Run 5 — the original ask, and a screen nobody was checking

## Task 19 — Verify the two untested skills — DONE

`session_01TR1QxeyroynT2mcedatDgx`, fresh clone, produced
`docs/handoff-timesheet-approvals.md` (668 lines) without being told how. Checked
mechanically: every class and token it cites exists, bar `.pf-button--icon-only`, which it
flags under **"Gaps in the extract you must fill"** with the CSS a developer needs, beside
an **"Open questions"** section. That is pf-handoff's rule — never invent a value — being
followed by someone who had never seen this conversation.

**`pf-audit` was overclaiming.** It printed `PASS — page is on-system` for
`payroll-run-summary`: a page that fails geometry, colour-binding and icon checks and uses
none of the component library. The script only ever looked at colour and contrast. It now
says what it checked and what it did not.

## Task 20 — Check every screen, not one — DONE

`scripts/verify-screens.mjs`, discovering screens from `prototypes/` rather than a list.
It immediately reported what a single-screen command had hidden: absence and timesheet
pass all four axes, payroll fails three. Same failure as Run 4's two, from the other
direction — there a check could not fail; here a working check was aimed at one page in
three.

## Task 22 — Regenerate the Claude Design bundle — DONE

The Design System pane is the surface designs are generated FROM, and the original point
of this project. It was built on day one from tokens alone and never revisited — the
generator read none of the component, variant, geometry or text-style extracts.

**And it was wrong, not just old.** Its hand-written buttons carried
`border-radius: var(--pf-radius-small)` — 4px — on a system whose buttons are pills, with
no height and 16px text. The wrong-shapes failure this project was built to fix, sitting
where it propagates into everything made with the pane.

Now generated: 12 pages, one per Figma page, every captured component and variant rendered
with the real stylesheet, plus a Type card. An Action button in the pane measures 999px
radius, 32px tall, 13px SemiBold.

Two more found while there: every page inlined the whole 95 KB stylesheet (now only its
own rules, 2291 KB → 1109 KB), and the generator never cleared its output, so three pages
from the old set were still on disk for the pane to index.

**Not checked:** the pane itself. I can confirm the pages render correctly in a browser,
but not how claude.ai/design indexes or displays them — that needs someone to open it.

## Task 21 — Rebuild the payroll screen on the library — DONE

771 lines of pre-library markup moved onto the classes: 54 hand-written component rules
removed, 23 hand-built sprite glyphs replaced with real icon references, table striping
restored on alternate rows. 4 of 13 geometry checks to 29 of 29, and all three screens now
pass all four axes.

**Every check passed while the page was visibly wrecked — the fourth time here.** The
table cells were stacking their contents vertically. Figma measures a table cell as an
auto-layout frame, so the generator emitted `display: inline-flex`; on a real `<td>` that
stops the element being a table cell and the browser wraps it in an anonymous one. It had
survived unnoticed on a screen whose cells hold a single value and broke on one whose
cells hold three. Fixed in the generator with an element fix-up, so both screens benefit.

**I picked the wrong component for the sidebar.** Figma's `Navigation item` is a 90x86
rail item with the icon above the label. The sidebar row is `Side navigation tab`, 268x48,
horizontal. Both screens now use the right one, and the colour check names it.

**A table cell's height is a minimum, not a value.** Figma's 58px row with 10px padding
and a 1px border leaves 36px of content box; two lines of 13px text need 37.6px, so the
cell grows and no stylesheet can prevent it. Asserting an exact height was asserting
something the box model does not guarantee — the geometry check now asserts the floor for
table cells.

Also caught while there: my own `<td>` regex mangled `<thead>` into `<th ...ead>`, the same
mistake as Run 2; and `verify-rendered` treated a component simply not present on a page as
a failure, which is wrong now that it runs against every screen — absent bindings are
skipped and reported, but a page where NOTHING matched still fails.

---

## Run 7 — element tagging for the developer pipeline

Skills loaded: `people-first` (SKILL.md, current), `pf-screen` (SKILL.md, current),
`keep-going`. Commands run and their results are named inline below.

**Built:** a naming layer (`scripts/name-elements.mjs`) and a manifest writer
(`scripts/tag-elements.mjs`), so every element on a screen can be addressed by name
rather than by CSS selector. All three screens: 86, 106 and 176 elements, none unnamed.

**The check I wrote passed while the thing it checked was useless.** It reported "176 of
176 elements addressable by name" on a screen whose names included
`button-path-d-m29-2-9-7c29-64`, `filter-chip-all-248` and `tags-approved-4`. Present and
unique was all it measured. 84 of 208 names on that screen were unusable. Three causes:
the label reader was looking through 900 characters of inline icon path data and picking
up the truncated tag; sample data (a count, a date, a currency amount) was being baked
into names that go stale the moment the data changes; and a colliding name got a number,
which tells a developer nothing. Names are now qualified by what they sit inside
(`card-marcus-webb-tags-approved`), and the check fails on all three kinds — verified by
running it against the pre-fix page from git, where it reports 84 and exits 1.

**Two of the three screens never marked their specimen gallery.** `data-pf-ignore` exists
precisely so a block showing every button variant does not put six identical
`button-action`s in a manifest a developer is meant to trust. Only absence-requests had
it. That was most of the collisions.

**A variant Figma does not have.** `data-darkmode="False"` sat on a Selected action
banner whose only Figma property is `Mobile`. A pipeline would have generated an `@Input`
for it. Removed, and the check now fails on any data attribute that is not a real Figma
variant property for that component — proven by putting it back on a scratch copy.

**Looking at the screenshots found what six checks did not.** The timesheet screen was
slicing 126px off its own table, the whole Status column, because Figma draws `Table (AG)`
as a hug-contents frame: the faithful `display: inline-flex` grew past its column and its
own `overflow: hidden` amputated the rest. Geometry, colour, icons, contrast and tagging
all passed. Fixed in the generator (same place as the earlier `<td>` fix-up) and added
`scripts/verify-layout.mjs`, which asks the one question the others cannot — can the
element be seen? It fails the pre-fix build and passes the fixed one.

**The first version of that check was hollow** and I nearly shipped it. It looked only at
`[class*="pf-"], td, th` and reported a clean bill of health on the very page it was
written for: the thing being amputated was the scroll `<div>` around the table, which
carries no `pf-` class. It walks every element now.

**And two "bugs" I nearly fixed that were not bugs.** A full-page screenshot flattens
`position: sticky`, so the payroll sidebar looked like it stopped halfway down the page
and the panel's sticky footer looked like it was clipping the content above it. Both are
correct at viewport size. `scripts/shoot.mjs` now shoots the viewport by default and says
so; `--full` is opt-in.

**Also fixed while looking:** `.searchwrap .control` was a dead selector on the payroll
screen — the input's class is `pf-field` — so the search icon sat on top of the
placeholder text; and Figma gives Information box no gap, so its icon was glued to the
first word on two screens.

Checks run: `verify-screens` (geometry, colour, icons, audit, tagging, layout on all
three screens), `verify-components` 2622/2622, `verify-type` 107/107,
`check-skill-classes` 15 classes / 86 variants / 0 problems.

**Not checked:** whether the manifest is the shape the Angular pipeline actually wants.
Its contract is in a session I cannot read, so the fields are my best guess.

**There is no JSON contract to match.** I had been treating the manifest shape as
provisional pending the Angular pipeline's expected input; there isn't one. So the
manifest is the contract, and the thing that mattered was making it readable without a
companion document — a companion document is what gets lost or goes stale. Every manifest
now carries an `about` line and a `fields` block defining each key, and the writer aborts
rather than emit a manifest whose field guide disagrees with the data (verified by adding
a field and watching it refuse). `pf-handoff` had never mentioned the manifest at all; it
now hands it over alongside the prose spec.
