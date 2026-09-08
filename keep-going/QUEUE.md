# Build queue — People First design system

**Project folder (scope fence):** `/home/user/ds` — nothing outside this is touched.
**Starting save point:** commit `fe002ce` (clean tree, pushed to
`claude/figma-design-system-j0s6ad`).

**Governing skills** (re-read in full immediately before each task that needs them):
- `people-first` — the design system itself. Governs tasks 1, 2, 4, 5.
- `skill-creator` — how to write and test a skill. Governs tasks 3, 4, 5.
- `figma-use` (Figma MCP resource) — mandatory before any Figma read. Governs task 2.
- `artifact-design` — governs anything published as an artifact.

**Note on pushing:** this project has a stop hook that requires everything committed
AND pushed. So each finished task is committed and pushed to the working branch —
one commit per task, same review surface, just more granular.

---

## 1. Guard against wrong shapes — `done`

Add an automated check that what the browser renders matches the measured Figma
geometry, the same way colours are already checked.

This exists because of a real failure: the colour check passed 54/54 while the buttons
were the wrong shape entirely. A green tick on the wrong axis is worse than no tick.

**Done when:** one command reports pass/fail for button height and radius, chip height,
tag text case, input height, and table row height — and it correctly *fails* when a
value is deliberately broken.

**Depends on:** nothing.

## 2. Measure the remaining components — `done`

Geometry is measured for 38 components across Buttons, Forms, Controls, Tables, Tags
and Cards. Still unmeasured: Navigation, System messages, Analytics and charts, People,
AI.

**Done when:** the geometry file covers those five pages too, the reference page
regenerates, and no component used in the prototype is missing a measurement.

**Depends on:** nothing. Uses Figma reads (~5 calls, well inside the daily limit).

## 3. Design-system audit skill (`pf-audit`) — `done`

A skill that checks any page against People First and reports what is off-system.
The underlying script is already written (`scripts/pf-audit.mjs`) but has never been run.

**Done when:** pointing it at the prototype reports a clean pass, pointing it at a
deliberately off-brand page names the specific wrong colours with the nearest correct
token, and lists any text failing contrast.

**Depends on:** nothing.

## 4. Screen-building skill (`pf-screen`) — `done`

A skill that builds a People First screen correctly first time — reading the variant
and geometry references rather than inferring, then running both checks before
handing over.

**Done when:** a fresh session given only this skill and "build me a People First
[screen]" produces a page that passes both the colour check and the new geometry check.

**VERIFIED 2026-09-08.** An independent session (`session_01ApHJSHPoCLvWg5nHYx4qkb`),
fresh clone, no memory of this work, was asked for a payroll run summary screen with
NO mention of the skill. It produced `prototypes/payroll-run-summary.html`, which
scores **29/29 geometry** and **100% token coverage in both modes, no contrast
failures**. It also used the `.src.html` + build-prototype workflow, which only the
skill describes — so the skill both triggered from its description and was followed.

**Depends on:** tasks 1 and 2 (it should cite complete geometry and be checkable).

## 5. Developer handoff skill (`pf-handoff`) — `done`

A skill that turns a screen into a spec a developer can build from.

**Done when:** given the absence-requests prototype, it produces a spec listing the
tokens used, the Figma component and variant each element maps to, the states to
build, and the accessibility notes — with no invented values.

**Depends on:** task 2.

## 6. Real People First icons — `done` (293 of 293)

All 293 icons are exported from Figma as individual SVGs in `assets/icons/`, indexed
in `tokens/_raw/icons.tsv`, and browsable at `docs/icons.html`.

**Route taken:** the plugin API in adaptive byte-budgeted batches. The one-download
route stayed blocked — this environment's network policy denies `www.figma.com`, so
the 2.1MB whole-page SVG could not be fetched. What made batching affordable was
reading the results back out of the session transcript on disk
(`scripts/extract-icons.mjs`) instead of retyping them into the conversation: the
SVG is already on disk once a tool result lands. That halved the cost and meant an
MCP disconnection mid-run lost nothing.

**Done when:** met — all 293 exist as individual SVGs in `assets/icons/`, and
`scripts/verify-icons.mjs` renders every one in Chromium and confirms it paints
(293/293, no dangling mask references).

---

---

# Run 2 — make the variants usable

**Why this run exists.** Run 1 captured the design system: 177 tokens, 293 icons, the
colours and shapes of 79 components, and four skills. But the original ask was *"what
I'm after is being able to use the variants in the prototypes"*, and that is still not
true. `dist/` contains only `tokens.css`. To use a Button variant today you read
`variants.md`, read `geometry.md`, and hand-write the CSS — which is exactly how the
wrong-shapes mistake happened in the first place.

**Starting save point:** commit `c8e0d4c`, clean tree, pushed.
**Scope fence:** `/home/user/ds` — unchanged.

**Governing skills** (re-read in full immediately before each task):
- `people-first` — project, modified 2026-09-08 19:13. Governs tasks 8, 9, 11.
- `figma-use` — Figma MCP resource. Mandatory before any Figma read. Governs task 7.
- `pf-audit`, `pf-screen` — project. The checks used in task 11.

## 7. Measure the components people actually build with — `done`

Geometry is measured for 79 components, but the gaps are in the ones a real screen needs
most: **Forms** (3 of 21) and **Controls** (1 of 11) — inputs, dropdowns, checkboxes,
radios, toggles, date pickers, steppers.

**Done when:** met — Forms 20 of 21, Controls 11 of 11. (The 21st is a second, unrelated
Figma component also named `Field`; it is recorded as `Field (second component)`.)
Geometry file now covers **106** components, up from 79. `geometry.md` regenerates.

**Depends on:** nothing. Uses Figma reads.

## 8. A stylesheet you can actually build with — `done` (proof pending task 11)

Generate `dist/components.css` from the raw extracts, so every captured component and
variant is a real class: `.pf-btn`, `.pf-btn--hollow`, `.pf-tag--info`, `.pf-input`.
Colours come from tokens, shapes from the measured geometry. Generated, never hand-typed,
so it cannot drift from Figma.

**Done when:** a screen can be built using only these classes with no hand-written
component CSS, and that screen still passes the colour, geometry and audit checks.

**Depends on:** task 7 (so it is generated once against complete measurements).

## 9. See every component on one page — `done`

`docs/components.html`: every component, every variant, in light and dark. This is the
thing that was asked for back when only 11 cards showed up in Claude Design.

**Done when:** opening one file shows all captured components with their variants named
exactly as Figma names them, and it looks right in both light and dark mode.

**Depends on:** task 8.

## 10. Check the stylesheet against Figma — `pending`

A script that renders `components.css` and compares every class against the measured
geometry and the extracted variant colours — the same idea as `verify-geometry.mjs`, but
covering the whole library rather than one page.

**Done when:** one command reports pass/fail per component, and correctly fails when a
value is deliberately broken.

**Depends on:** task 8.

## 11. Rebuild the absence-requests prototype on the stylesheet — `pending`

Proof the library works: strip the hand-written component CSS out of the prototype and
use the classes instead.

**Done when:** the prototype has no hand-written component CSS, looks the same as before,
and still passes geometry, colour, icon-fidelity and audit.

**Depends on:** tasks 8 and 10.

---

## Suggestions (not queued — for you to decide)

Found while working; not acted on, to keep the change pile reviewable.

- **`Tags` Type=Theme** binds a border token for its text where all six siblings bind a
  content token. **DECIDED 2026-09-08: a gap, not deliberate. Leave as-is for now** —
  fix upstream in Figma rather than papering over it here. The extract and the skill
  both already document it, and the prototype uses `--pf-tag-content-info`.
- **`Toast message` and the AI components** bind fixed colours rather than mode-aware
  ones, so they will not adapt in dark mode. **DECIDED 2026-09-08: a gap, not
  deliberate. Leave as-is for now** — recorded so nobody implements it as intended
  behaviour.
- **`Icon-size-xxxs` is 0px** in Figma — almost certainly unset.
- **Two text styles share the name** `Desktop text/Button text`.
