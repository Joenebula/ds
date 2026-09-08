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
