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
