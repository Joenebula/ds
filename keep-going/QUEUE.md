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

**Depends on:** tasks 1 and 2 (it should cite complete geometry and be checkable).

## 5. Developer handoff skill (`pf-handoff`) — `done`

A skill that turns a screen into a spec a developer can build from.

**Done when:** given the absence-requests prototype, it produces a spec listing the
tokens used, the Figma component and variant each element maps to, the states to
build, and the accessibility notes — with no invented values.

**Depends on:** task 2.

## 6. Real People First icons — `partly done` (9 of 289)

All 289 icon names are captured. The 9 the prototype actually uses are exported as
real Figma SVG and swapped in (`assets/icons/`, `tokens/_raw/icons.tsv`).

The remaining 280 are a mechanical job: Figma's export tool truncates at 20KB per
call, which works out at roughly 12 icons per call, so about 24 more calls. Nothing
hard, just repetitive — better as its own focused run than interleaved with the
skills work.

**Done when:** all 289 exist as individual SVGs in `assets/icons/`.

---

## Suggestions (not queued — for you to decide)

Found while working; not acted on, to keep the change pile reviewable.

- **`Tags` Type=Theme** binds a border token for its text where all six siblings bind a
  content token. Looks like a Figma mis-binding — worth fixing upstream.
- **`Toast message` and the AI components** bind fixed colours rather than mode-aware
  ones, so they will not adapt in dark mode. May be deliberate; may be a gap.
- **`Icon-size-xxxs` is 0px** in Figma — almost certainly unset.
- **Two text styles share the name** `Desktop text/Button text`.
