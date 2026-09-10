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

## 8. A stylesheet you can actually build with — `done`

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

## 10. Check the stylesheet against Figma — `done`

A script that renders `components.css` and compares every class against the measured
geometry and the extracted variant colours — the same idea as `verify-geometry.mjs`, but
covering the whole library rather than one page.

**Done when:** one command reports pass/fail per component, and correctly fails when a
value is deliberately broken.

**Depends on:** task 8.

## 11. Rebuild the absence-requests prototype on the stylesheet — `done`

Proof the library works: strip the hand-written component CSS out of the prototype and
use the classes instead.

**Done when:** met. The prototype's markup is now Figma variant names
(`<button class="pf-button" data-type="Action">`), its style block went from 543 lines to
161 lines of genuinely local CSS — page layout, cursor, transition, focus ring, the tick
glyph inside a checkbox — and every colour and shape comes from `dist/components.css`.
All five checks pass: 29 geometry, 54 colour, 21 of 21 icons real, audit on-system in
both modes, 1764 library checks. Confirmed by eye in light and dark.

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

---

# Run 3 — make the library the default, and close the colour gap

**Why this run exists.** Run 2 built `dist/components.css` and proved it works. But a
survey at the start of this run found that **no skill, and neither `README.md` nor
`CLAUDE.md`, mentions it exists**. A fresh session asked for a People First screen would
read `variants.md`, read `geometry.md`, and hand-write the CSS — which is precisely the
route that produced the wrong-shapes mistake. The library is only useful if it is the
thing people are told to reach for.

The second gap is coverage: 71 of 171 components have extracted colours. The missing ones
are concentrated where real screens need them — Navigation (9 of 26), Cards and panels
(17 of 32), Forms (7 of 20).

**Starting save point:** commit `212cd18`, clean tree, pushed.
**Scope fence:** `/home/user/ds` — unchanged.

**Governing skills** (re-read in full immediately before each task):
- `people-first`, `pf-screen`, `pf-handoff` — project. Governs tasks 12, 15.
- `skill-creator` — how to write and test a skill. Governs task 12.
- `figma-use` — Figma MCP resource. Mandatory before any Figma read. Governs tasks 13, 14.

## 12. Tell everyone the library exists — `done`

Update `people-first`, `pf-screen`, `pf-handoff`, `README.md` and `CLAUDE.md` so the
component stylesheet is the default route to building a screen, and hand-writing
component CSS is named as the thing not to do.

**Done when:** met, and **VERIFIED 2026-09-09** the way task 4 was. An independent
session (`session_01U3GTrXXs1Wn1aoHh3hVMEk`), fresh clone, no memory of this work, was
asked for a timesheet approvals screen with no mention of the library. It built the whole
screen from library classes — 15 of them, 175+ uses — with Figma's exact variant spelling
in the data attributes, including the subtle two-attribute rule for a selected filter chip
(`data-state="Selected" data-active="False"`). Its own style block contains one shape
declaration, and that one is page layout (aligning a label to a 42px input), not a
component. Its screen passes 29 geometry, 54 colour, 43 of 43 icons and the audit.

Before this change the same session would have read the recipes and hand-written
`.pf-btn--action`, which the library does not define.

**Depends on:** nothing.

## 13. Capture the colours screens actually need — `done`

Extract variant colour bindings for the unmeasured components on Navigation, Cards and
panels, Forms and Buttons — the pages a real screen draws from most.

**Done when:** met. Navigation, Cards and panels, Forms and Buttons captured; the library
went from 71 components / 191 variants to 98 / 235, and `verify-components.mjs` passes.

**Depends on:** nothing. Uses Figma reads.

## 14. Capture the rest — `done`

Analytics and charts (0 of 14), People (0 of 3), Pages and Layouts (0 of 3), Document
management (0 of 20).

**Done when:** met by the second half. The library now holds **139 of 172** components and
283 variants, and each of the **33** that remain has a recorded reason, written to
`tokens/_raw/uncaptured-reasons.tsv` and shown in `docs/components.html` grouped by reason:
20 are on the documentation page, 11 bind no colour variable anywhere in Figma, 1 is an
unnamed Figma leftover, and 1 is `People`, whose variants are one per fictional employee.

This also found a real gap in the extraction method: it only ever walked `COMPONENT_SET`s,
so 18 components that have no variants had never been read at all.

**Depends on:** task 13.

## 15. Prove it on a second screen — `done`

Build one more screen using only the library, to show task 12 actually changed behaviour
rather than just adding words to a file.

**Done when:** met, and more convincingly than planned. Rather than building it myself —
which would have proved only that I can follow my own documentation — the screen was built
by the independent verification session from task 12:
`prototypes/timesheet-approvals.html`, a team timesheet approvals view. It is built from
classes only and passes all the checks. A screen I wrote would not have tested whether the
documentation works on someone who has not read this conversation.

**Depends on:** tasks 12 and 13.

---

# Run 4 — finish the layers that are still half-built

**Why this run exists.** "Keep building the whole system." Two structural holes remain
after Run 3, and both are the kind that a screen-builder hits immediately:

1. **55 of the 139 captured components have colours but no measured shape.** They are
   half-captured: the stylesheet gives them a background and no height, padding or radius.
   That is the exact split — right colours, invented shapes — that this project already
   shipped once and built two checks to prevent.
2. **There is no typography layer at all.** Figma has 23 text styles; the library has
   none of them. Every screen still hand-writes `font-size`, `font-weight` and
   `letter-spacing`, which is hand-written component CSS by another name. The extract
   also has no line-height, which is why every screen so far has needed a local
   `line-height` rule — a Figma value being restated by hand on every page.

**Starting save point:** commit `faf38ae`, clean tree, pushed.
**Scope fence:** `/home/user/ds` — unchanged.

**Governing skills** (re-read in full immediately before each task):
- `figma-use` — Figma MCP resource. Mandatory before any Figma read. Governs 16, 17.
- `people-first`, `pf-screen` — project. Govern 17, 18, 19.
- `skill-creator` — governs any skill change.

## 16. Measure the 55 half-captured components — `done`

**Done when:** met — **139 of 139**, up from 84. It also exposed a rule that only ever
covered half the box: the generator knew a large fixed WIDTH is the artboard rather than a
rule, but applied no judgement to height, so components drawn at screen size were about to
ship with `height: 1080px`. Height now has three tiers (control / panel / artboard), and
`verify-components.mjs` encodes the same three, or it would fail the library on values the
generator deliberately does not emit.

**Depends on:** nothing. Uses Figma reads.

## 17. A typography layer — `done`

Generate type classes from Figma's 23 text styles, so a heading is a class rather than
three hand-written declarations. Re-extract the text styles to pick up **line-height**,
which the current extract does not carry and which every screen has therefore been
restating by hand.

**Done when:** met. `dist/type.css`, 23 classes, `scripts/verify-type.mjs` (107 checks,
self-tested), documented in the skill and shown in the gallery.

Re-reading the styles corrected three things: **line height** (Figma sets automatic on all
23, so `normal` is faithful — the `1.2`/`1.3` hand-written into the table were inventions
and the geometry check passes without them); **weight** (Figma binds it under
`boundVariables.fontStyle`, not `.fontWeight`, which is why a third read "unresolved");
and **letter spacing** (percent, not a bare number).

**Depends on:** nothing.

## 18. Make icons usable without pasting SVG — `done`

All 293 icons exist as files, but using one means opening the file and pasting its markup
inline. That is friction on every single use, and friction is what makes someone draw
their own instead.

**Done when:** met — `<!--pf-icon:tick-->`, expanded at build time to the real file's
markup, so the output is the plain inline SVG the fidelity check already verifies. A name
that does not exist fails the build. All 21 icons on the absence-requests screen now use it.

It also caught a check going hollow: pointed at the `.src.html`, which no longer holds any
inline `<svg>`, `check-icon-fidelity` reported "0 of 0 ... 0 are not" and exited zero. It
now treats an empty page as an error, and `npm run verify` runs it on the built page.

**Depends on:** nothing.

## 19. Verify the two untested skills — `done`

Run 3 changed `pf-handoff` and `pf-audit` but no fresh session exercised either. They are
currently claims, not verified behaviour.

**Done when:** met, with a finding.

`session_01TR1QxeyroynT2mcedatDgx`, fresh clone, produced
`docs/handoff-timesheet-approvals.md` (668 lines) without being told how. Checked
mechanically: every class and token it cites exists, except `.pf-button--icon-only`,
which it flags under **"Gaps in the extract you must fill"** with the CSS a developer
needs, and it carries an **"Open questions"** section for what is genuinely unspecified.
That is the skill's own rule — never invent a value — being followed.

**`pf-audit` was overclaiming.** It printed `PASS — page is on-system` for
`payroll-run-summary`, a page that simultaneously fails the geometry, colour-binding and
icon checks and uses none of the component library. The script only ever looked at colour
and contrast; "on-system" reads as "follows the design system". It now states what it
checked and points at `npm run verify` for the rest. A check that overstates its own scope
is the same failure as one that cannot fail.

**Depends on:** tasks 16 and 17 (so the skills are verified in their finished state).

---

# Run 5 — the original ask, and a screen nobody was checking

**Why this run exists.** A survey after Run 4 found two things.

1. **`ds-bundle/` — the Claude Design pane — is four runs out of date.** It was generated
   on day one from the tokens alone, and `scripts/build-ds-bundle.mjs` reads *none* of the
   component, variant, geometry or text-style extracts. Getting the system into Claude
   Design was the original ask of this whole project; what is in there now predates the
   139-component library, the type layer and the icons entirely.
2. **`prototypes/payroll-run-summary.html` scores 4 of 13 geometry checks.** It was built
   by an independent session before the library existed, hand-writes its component CSS,
   and now contradicts every rule the skills state. It sat there unnoticed because
   `npm run verify` only ever checks the absence screen.

The second is the more instructive: the checks are only as good as what they are pointed
at, and a screen that no check covers will drift silently — which is the same failure as
a check that cannot fail, found twice in Run 4.

**Starting save point:** commit `0cf0bfa`, clean tree, pushed.
**Scope fence:** `/home/user/ds` — unchanged.

**Governing skills:** `people-first`, `pf-screen`, `pf-audit` (project); `skill-creator`
for any skill change.

## 20. Check every screen, not one — `done`

**Done when:** met — `scripts/verify-screens.mjs`, discovering screens from the directory.
It immediately reported what a single-screen command had hidden: absence and timesheet
pass all four axes, payroll fails three.

**Depends on:** nothing.

## 21. Rebuild the payroll screen on the library — `done`

**Done when:** met — 4 of 13 to **29 geometry, 54 colour, 24 of 24 icons, audit clean**,
and all three screens now pass all four axes. 54 hand-written component rules removed, 23
hand-built sprite glyphs replaced with real icon references.

**All four checks passed while the page was visibly wrecked** — the fourth time in this
project. The table cells were stacking their contents vertically. Cause: Figma measures a
table cell as an auto-layout frame, so the library emitted `display: inline-flex`, which
stops a `<td>` being a table cell. It had survived unnoticed on a screen whose cells hold
one value and broke on one whose cells hold three. Fixed in the generator, so both screens
benefit.

Two more things this turned up:
- **I had picked the wrong component for the sidebar.** Figma's `Navigation item` is a
  90x86 rail item with the icon above the label; the sidebar row is `Side navigation tab`
  (268x48, horizontal). Both screens now use the right one.
- **A `<td>`'s `height` is a minimum in CSS**, not a fixed value — content that needs more
  room grows and no stylesheet can stop it. Figma's 58px row with 10px padding and a 1px
  border leaves 36px, which two lines of 13px text exceed. The geometry check now asserts
  the floor for table cells rather than an exact height it cannot guarantee.

**Depends on:** task 20 (so the check that proves it is in place first).

## 22. Regenerate the Claude Design bundle from the real library — `done`

**Done when:** met. 12 component pages, one per Figma page, generated from the extracts;
plus a Type classes card. **It was not merely stale — it was wrong.** Its hand-written
buttons used `border-radius: var(--pf-radius-small)` (4px) on a system whose buttons are
pills, with no height and 16px text: the wrong-shapes failure this project exists to fix,
in the one place that propagates it into everything generated from the pane. An Action
button there is now 999px radius, 32px tall, 13px SemiBold.

Also: pages inlined the whole 95 KB stylesheet each (now only their own rules, 2291 KB →
1109 KB), and the generator never cleared its output, so three pages from the old
hand-written set were still on disk for the pane to index.

**Depends on:** nothing, but best done after 20 and 21 so it ships the corrected screens.

## 23. Tag every element for the developer pipeline — `done`

A screen handed to developers, or to an AI pipeline that turns it into Angular, has to
address elements by NAME. A CSS selector changes every time the layout does; a name does
not. Only the name is authored — component and variant are derived from the class and its
data attributes, because those already come from Figma and retyping them is how they drift.

**Done when:** met. Every design-system element on all three screens carries a
`data-pf-id`, each screen has a `.manifest.json` a pipeline can read, and the check fails
if anything is unnamed or a name repeats.

**Depends on:** nothing.

## 24. Make the names usable, not merely present — `done`

Task 23's check reported "176 of 176 addressable by name" on a screen whose names included
`button-path-d-m29-2-9-7c29-64` and `filter-chip-all-248`. Present and unique was all it
measured. Three kinds of name are no use to a developer: one carrying SVG path data (the
label reader was looking through an inline icon), one carrying sample data (next month the
count is 251 and the name is a lie), and a bare collision counter (`tags-approved-4`).

**Done when:** met. 84 of 208 names on the timesheet screen were unusable and now none
are; a colliding name is qualified by what it sits inside rather than numbered; and the
check fails on all three kinds, proven against the pre-fix page.

**Depends on:** 23.

## 25. Fail on a variant Figma does not have — `done`

A `data-*` attribute that is not one of Figma's variant properties for that component is
worse than no variant: a pipeline turns it into an `@Input` the component does not have.

**Done when:** met. `data-darkmode="False"` was sitting on a Selected action banner whose
only Figma property is `Mobile`; removed, and the check now fails on any such attribute.

**Depends on:** 23.

## 26. Check whether an element can be SEEN — `done`

Every other check measures one element in isolation: its size, its colour, its glyphs, its
contrast, its name. None of them notice an element being cut off. The timesheet screen was
slicing 126px off its own table — the whole Status column — with all five passing.

**Done when:** met. `verify-layout.mjs` fails a screen where anything is clipped by an
ancestor with no way to scroll to it, proven against the pre-fix build; the root cause
(Figma draws `Table (AG)` as a hug-contents frame, so `display: inline-flex` grew past its
column and its own overflow clipped the rest) is fixed in the generator for every screen.

**Depends on:** nothing.

## 27. Make the manifest explain itself — `done`

There is no existing JSON contract to match — asked, and there isn't one — so the manifest
IS the contract. That means it cannot depend on a separate document travelling with it,
because the separate document is the thing that gets lost.

**Done when:** met. Every manifest carries an `about` line and a `fields` block defining
each key in plain English, so a developer or a generator can read the file cold. The
writer refuses to emit a manifest whose field guide has drifted from the data it
describes — proven by adding a field and watching it abort. `pf-handoff` now points at the
manifest as the machine-readable half of a handoff.

**Depends on:** 23.

## Open — needs you

Nothing blocking. The manifest format is now settled by default rather than by
specification: if the Angular pipeline turns out to want different fields, say which and
they are a small change to `scripts/tag-elements.mjs`.

---

## 28. Payroll handoff document — `done`

`docs/` has a handoff spec for absence-requests and timesheet-approvals but not for
payroll-run-summary, which is the most component-dense of the three.

**Done when:** `docs/handoff-payroll-run-summary.md` exists, built the way the other two
were — every value traceable to the extracts, never estimated — and names the manifest
alongside it.

**Governing skills:** `pf-handoff`. **Depends on:** nothing.

## 29. The one Figma token the generator cannot map — `done`

`Repeating group` binds a text colour Figma calls `Grey-slate`. Every other binding in the
file is a semantic path (`Text/Primary`, `Background/Theme`); this one is a PRIMITIVE bound
directly, which is the thing that breaks dark mode. The generator emits
`/* unmapped Figma token */` and the component ships with no text colour at all.

**Done when:** the rule carries a colour again, sourced from a semantic token of the same
value rather than the primitive; the build reports it as a Figma SOURCE ISSUE rather than
as an unmapped token; and `UNMAPPED Figma tokens` is 0.

**Depends on:** nothing.

## 30. The 11 components Figma binds no colour to — `done`

Not 33 — that number was wrong when I gave it. 20 of the 33 are project documentation on
the DOCUMENT MANAGEMENT page, one is an unnamed `Component 1`, one is sample employee
data; all 22 are correctly excluded. The real gap is 11 components with no rules at all:
Tooltip, Menu, Stars, Field icons, Map, Floaters, Horizontal scroll, Profile image,
Notification image, Mobile key actions, Default header background.

They are missing because no variant of any of them binds a colour variable. But a
component is a shape as well as a colour, and four of the eleven already have geometry
measured. A `.pf-tooltip` with Figma's real size and radius, and a comment saying colour
is unbound in Figma, is more use than nothing and is honest about what it is.

**Done when:** all 11 are classes in `dist/components.css` carrying their measured
geometry, each with a comment naming the gap; the seven currently unmeasured are measured
from Figma first; the gallery shows them under a heading that says what they are.

**Governing skills:** `figma-use` before any Figma read. **Depends on:** nothing.

## 31. `Circle icons` — the one genuinely missed component — `done`

A COMPONENT_SET on the Icons page with `Icon` and `Size` properties (XS 28, S 36, M 44,
L 52). It fell between the two extractors: the component extract skips the Icons page, and
the icon exporter only takes single icons, so nobody claimed it.

**Done when:** it is a class with its four sizes as a variant attribute, measured from
Figma, and the reconciliation of Figma's 460 components leaves nothing unaccounted but the
one blank-named component.

**Governing skills:** `figma-use` before any Figma read. **Depends on:** nothing.

## 32. The token extract was incomplete — `done`

Found while closing 31: `Circle icons` binds `Background/Light Theme`, and that token was
not in the extract at all. It was not alone.

**Done when:** met. 17 semantic tokens were missing — the whole `Navigation/*` group, both
`Configr` themes, `Border/Default full` and `Border/Default hidden` among them — and four
primitives (the violets) that those tokens alias. All added; `dist/tokens.css` now carries
113 semantic tokens against Figma's 111 definitions, and the build reports no unresolved
aliases and no unmapped names.

Two of the two extra: see **Open — needs you**.

## 33. No primitives left in any screen — `done`

Seven direct uses of `--pf-base-white` and `--pf-base-grey-dolphin` across the three
screens, which CLAUDE.md forbids because a primitive does not change between modes. They
were there because the semantic token that means "always white" was one of the 17 missing
from the extract. Replaced with `--pf-icon-always-white` and `--pf-border-secondary`, both
identical in value. Zero primitive uses remain.

## Open — needs you

**Two tokens in the shipped system have no Figma variable.** They are not missing from the
extract; they do not exist in the file at all.

- `--pf-border-default` — used 38 times in `dist/components.css` and 18 times on the
  payroll screen alone. Figma has `Border/Default full` (Grey Steel → Grey Fog) and
  `Border/Default hidden`, but no `Border/Default`. The extract's dark value is White,
  which matches neither. Either the variable was renamed after extraction or the extract
  was wrong at the time.
- `--pf-bg-theme-full` — values identical to `Background/Theme`, so probably a duplicate
  that should be retired.

I have not touched either. Repointing `--pf-border-default` at `Border/Default full` would
change every hairline in dark mode from white to Grey Fog — visible, and a design decision
rather than a build one. Ask the design team which is right, or say the word and I will
make the change and show you both before and after.
