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
