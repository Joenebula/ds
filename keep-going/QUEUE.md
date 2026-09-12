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

## Open — needs you — `resolved by task 38 below`

**Superseded. Left here because it is the reasoning task 38 acted on, not a live decision.**
Both tokens turned out to be renames rather than phantoms and neither exists in
`dist/tokens.css` any more. Nothing here needs answering.

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

## 34. The 14 Navigation components the inventory never saw — `done`

The user pushed back on "33 components" and was right to. A page-by-page count against
Figma shows 157 distinct components on the 12 real pages, and my inventory extract
(`tokens/_raw/components.json`) is missing 15 of them — 14 on Navigation, 1 on Buttons and
links. The cause is structural: the extract never descended into Figma SECTIONs, and
Navigation is organised almost entirely in sections.

So the reconciliation I reported was internally consistent and wrong at the source: it
reconciled against an inventory that was itself incomplete. Everything downstream — the
"460 components", the gallery's gap list, the per-page tallies — inherited that.

Missing, all on Navigation: Full page, Full page/Header navigation/Yes/No, Header
navigation, Nav tabs, Notification categories, Notification list, Notification panel,
Notification tabs, Pagination buttons, Search navigation, Stepper, Steps, Tertiary nav,
Waffle. (`Repeating group` on Buttons and links is absent from the inventory too, but it
already has rules, so nothing is missing from the stylesheet for it.)

**Done when:** the inventory extract descends into sections and lists all 157; the 14 have
colour bindings and measured geometry in the extracts and classes in `dist/components.css`;
a check fails if the inventory disagrees with a per-page count taken from Figma; and the
gallery's totals move accordingly.

**Governing skills:** `figma-use` before any Figma read.

## 38. The two tokens with no Figma variable — `done`

Both turned out to be renames, like the navigation components before them — and the second
was not the harmless duplicate I had reported.

**`Border/Default` -> `Border/Default full`.** Light identical (Grey Steel); dark moves from
White to Grey Fog. 35 bindings across 19 components. Measured on a rendered screen before
the user decided: 3.54% of pixels change at all, 0.60% noticeably. I had described this as
"every hairline turns white to grey", which sounded dramatic and is not what it looks like.

**`Background/Theme full` -> `Background/Theme`, and our `Background/Theme` ->
`Background/Light Theme`.** I told the user this one was an exact duplicate that would
change nothing. That was wrong, and checking before acting is the only reason it did not
ship: our `Background/Theme` held Pale Pink / #2c3844, which matches no Figma token; the
values Figma now has under `Background/Theme` are Default Pink / Blue Sky, which our
extract held under `Background/Theme full`. A naive "retire the duplicate" would have
repointed 10 components — every table row hover, filter chip hover, selected radio card and
selected nav tab — from a pale pink WASH to SOLID BRAND PINK.

Confirmed against Figma rather than inferred: `Table cell (AG) Style=Hover`,
`AG sort item State=Hover` and `Multi-select checkbox State=Hover` all bind
`Background/Light Theme` today. So the 15 bindings moved there, and their dark value
corrected from #2c3844 to #3d475a at the same time.

`Progress bar/Border` aliased the retired `Border/Default` and now aliases
`Border/Default full`, as Figma has it.

**Done when:** met. `dist/tokens.css` carries **111 semantic tokens — exactly Figma's 111**,
with no name that Figma does not have. Both phantoms gone.

## 35. Component 1 — the last real component with no rules — `done`

Of the 28 components with no rules, the user confirmed 27 are notes — project documentation,
brand assets, sample content — and only this one was required.

It is the row inside `Editable list card`: a label with a trailing add or remove action.
`Property 1=Frame 6270951` is the ADD state (no fill, green Plus circle); `Frame 6270952`
is the ADDED state (Background/Tertiary fill, grey Remove icon). 432x48, radius 8, 20px
text, 10px padding, 10px gap.

**Done when:** met. Captured faithfully — Figma's own default names kept, because renaming
is the design team's call — with a note in the generated CSS saying what it actually is.
`dist/components.css` carries it as `.pf-component-1` with both variants.

Caught while writing it: the geometry file's layout column is `LAYOUT COUNTER PRIMARY`, not
`LAYOUT PRIMARY COUNTER`, and I had both inverted AND inferred rather than measured — the
first version emitted `align-items: flex-start; justify-content: center` for a row Figma
centres vertically and packs from the left. Measured and corrected.

**Raise with design:** the component is called `Component 1` and its variants are called
`Frame 6270951` and `Frame 6270952`. Every one is a Figma default nobody renamed, so the
class is `.pf-component-1[data-property-1="Frame 6270951"]` — accurate and unusable. It
should be named in Figma, then re-extracted.

## 36. The seven renamed navigation components — `done`

The user asked for all seven under Figma's current names because the main template will use
them, accepting that the prototypes get updated later.

Six were unused by any prototype, so they were RENAMED rather than duplicated — no new
classes for the same component. `Secondary nav` had to vacate its name before
`[S] Main nav context` could take it, because Figma's rename was a swap:

    Header top navigation      -> Header navigation
    [S] Navigation/main tabs   -> Nav tabs
    Secondary nav              -> Tertiary nav        (node 13658:7900)
    [S] Main nav context       -> Secondary nav       (node 13658:7842)
    Search home button         -> Search navigation
    Full page navigation       -> Full page

The seventh, `Side navigation tab`, is used 29 times across three prototypes, so it stays.
Its node is Figma's `Notification tabs` today, captured separately with its real current
structure, and the old rows are flagged in the inventory as a legacy snapshot.

**The rename was hiding the real problem.** All six carried STALE DATA, not just stale
names — different variant axes (`Breakpoint` where Figma now has `Mobile x Tablet`), and
different bindings (`Background/Primary` where Figma now binds `Navigation/Nav bg top`).
Renaming alone would have shipped six components whose colours and variants do not match
Figma. Replaced with values read from Figma in this session.

**And it answers the parked token question.** `Nav tabs` stored `Border/Default` where
Figma now binds `Border/Default full` — so `--pf-border-default` is not a phantom, it is
the OLD NAME of `Border/Default full`, renamed at the same time as the components. 32
components still bind it. Still parked, but no longer a mystery: it is a rename to follow,
not a token to invent.

**Done when:** met. All seven are classes in `dist/components.css` with current Figma data;
149 components, 304 variants.

## 37. The three stale extract entries — `done`

Checked each against Figma by node id rather than by name, which is what the whole session
has taught. They were three different things, not one:

- **Side navigation panel** (22973:20811) — `getNodeByIdAsync` returns nothing. Genuinely
  deleted from Figma. Removed.
- **Counter** (14990:11954) — the node exists, but it is called `System=People First` and
  its parent is the `Header` COMPONENT_SET. It is a VARIANT CHILD, never a component in its
  own right; the old extract mistook one for the other. Removed. ("Counter" survives in
  Figma as a boolean property on Notification tabs, not as a component.)
- **Default header background** (13658:7639) — exists, reads fine, 6 variants across
  Breakpoint x Darkmode. It is simply not among the Navigation page's components, so which
  page it lives on could not be confirmed. **Kept.** A live node is not a gap, and deleting
  a component that exists is a worse error than carrying one whose address is uncertain.

Both removals are recorded in `uncaptured-reasons.tsv` rather than just vanishing — the gap
list should get more explained, not shorter.

Neither class was used by any prototype source; the hits in the built pages were only the
inlined stylesheet, which regenerates.

**Done when:** met. 147 components, 302 variants.

## 38. A component list, and the Figma-side issues — `done`

`docs/COMPONENTS.md` — every component in one readable file: class, the variant properties
Figma defines with their values, measured size, radius and type, grouped by Figma page,
with per-page notes for shape-only components, renames, collapsed axes, per-variant sizes
and primitive bindings. Generated by `npm run build`; `check-generated.mjs` covers it for
free, because that check diffs whatever the build writes.

**Writing it found a reporting bug.** The components generator keyed its source-issue map
on `${figmaName} (${prop})`, so every component after the first to bind `Base colours/White`
overwrote the previous one. It printed 9 issues; there are 25 bindings across 20 components,
and the real list is not the AI-only set that number implied — Button, Toggle, Calendar
picker, Time picker and Sticky footer are all in it. Caught by counting the same thing two
ways and getting different answers.

`docs/FIGMA-ISSUES.md` — one document for the design team, covering the primitive bindings,
the unnamed `Component 1`, the `Tags Type=Theme` mis-binding, the seven renames and the two
removals. Better than four separate conversations.

**One of the 25 was mine to fix.** `Toggle` bound `Base colours/Grey Dolphin` for its
border; `Border/Secondary` is Grey Dolphin in both modes, is scoped STROKE_COLOR in Figma,
and means exactly what a toggle border means. Mapped.

**Seven were deliberately NOT fixed.** The only mode-stable semantic tokens holding White
are a tag fill and an icon colour; for Blue Ocean and Light Purple they are chart colours.
Borrowing one would put the right hex behind the wrong meaning, and the next person to
change the tag palette would silently change the toast. Those need new semantic tokens —
a design decision, not a build one.

**Two are real WCAG AA failures in dark mode**, measured:
- `AI Assistant` / `Clickable AI element` — Default Pink text on an adapting surface:
  5.28:1 light, **2.47:1 dark**. Binding `Text/Theme` leaves light mode untouched and gives
  6.54:1 in dark.
- `Config child menu` `Type=Selected` — fixed Blue Ocean fill under `Text/Inverted primary`,
  which DOES adapt, so the pair drifts: 4.9:1 light, **2.18:1 dark**.

**Two findings I nearly got wrong by not checking the surface.** The `AI button` white
border measured 1.0:1 against a white page — but it is on the `Inverted` style, which sits
on a dark surface, so it is fine. And `Toast message` looked like white-on-white until I
read both bindings: the text is fixed too, so it is a legible white card (10.7:1) that
simply does not belong to a dark UI. Measuring a colour without knowing what it sits on
produces confident nonsense.

**Done when:** met. Both documents written, one alias added, README updated, and two stale
README figures corrected (198 tokens not 177, 420 custom properties not 365).

---

## 9. Component artwork — `done`

The component extract models a component as one outer box plus three colour slots
(fill / stroke / text), and every slot wants a colour VARIABLE. The header band's visual
is a raster image bound to no variable, so `uncaptured-reasons.tsv` recorded "nothing to
put in a stylesheet" and the whole artwork was dropped. The class rendered as an empty
transparent box, so a header had to be hand-written — and hand-writing is where the flat
pink band and the wrong font weights came from.

**Done when:** met. Six `Default header background` variants exported at scale 1,
harvested by `scripts/extract-component-art.mjs`, inlined as data: URIs (a `url()` path
fails silently in an artifact or canvas), theme-aware without the page setting
`data-darkmode`. `scripts/check-component-art.mjs` fails if extracted artwork does not
reach the stylesheet, and pins the count of classes with no paint at all.

## 10. Navigation item measured per variant — `done`

One geometry row per component meant the Selected variant's numbers were applied to every
state and device. Four measured rows replace it.

**Done when:** met. Verified by screenshot in both modes — which is what caught the
regression the change introduced.

---

# Still open

## A. Composite components are still shells — `done`

The root cause behind both items above is unchanged: the extract captures a component's
OUTER BOX and nothing inside it. No children, no nested instances, no per-child type.
So simple components work as classes and composite ones do not — `.pf-header`,
`.pf-card`, `.pf-metric-card`, `.pf-calendar-picker`, `.pf-table-ag` carry a size and
nothing in it.

**Correction:** this item used to cite "70 classes have no paint at all". That number was
wrong — `check-component-art.mjs` was counting RULES rather than classes, and the real
figure is 2. It does not change the item: a class can have a perfectly good background and
still be an empty box, which is precisely why the shell census never caught this.

This needs a real structural extract: per component, the child tree with each child's box,
layout, fills, strokes, radius and text style, plus an HTML template per composite
component so "use the component" means pasting working markup rather than an empty div.
The pilot walk already works — see the TSV shape in this session's `use_figma` calls.

**Done when:** building a header, a card or a metric card means using the component and
nothing else, and a check fails when a composite component's class renders an empty box.

**Depends on:** nothing. Large.

### Done — 154 templates, every product-page component walked four levels deep

`extract-component-tree.mjs` walks a component's children and records what they are. A
composite component turns out to be three things and nothing exotic: FRAMEs with
auto-layout, TEXT, and INSTANCEs of components we already have. Plus the occasional LINE,
RECTANGLE and — on `Card` — a Figma **SLOT**, which is the clearest possible statement
that a component is a container.

`build-templates.mjs` turns each tree into markup: an instance becomes its class, an icon
instance becomes the `<!--pf-icon:-->` marker, text becomes a type class plus a colour
token, a frame becomes a div carrying layout ONLY. Nothing is invented — anything that
cannot be named is emitted as a comment saying why.

`check-templates.mjs` is the check this item asked for, and it is in `npm run verify`. It
renders the bare class and the template in a browser and fails if a composite component has
no template or if a template renders an empty box. **All 11 composite components render
NOTHING from the bare class.** `--self-test` swaps a template for its bare class and
confirms the failure.

Four things the work turned up, each now handled rather than papered over:

- **Every unresolved instance was an icon.** Looking for a `.pf-` class for `Warning` or
  `Close x cancel` was the wrong question — they are SVGs reached through the icon marker.
- **`Card`'s title underline binds `Base colours/Default Pink`**, a raw primitive, so it
  cannot change between modes. Left unpainted with the reason in place rather than shipped
  broken.
- **`Information box` instances ITSELF** — a one-child wrapper. It is not composite; its
  class already is the component. The generator and the check agree on that definition, or
  one would demand a template the other refuses to write.
- **Off-ramp text keeps its measurement.** "More details" is 13px bound to no style;
  emitting no size left it at the browser's 16.

**Coverage: 158 of the 161 product-page components walked; 154 have templates.** Every
product page has been through it, the large layout containers included — `Accordion`,
`Side panel`, `Layout container (magazine style)`, `50/50 layout container`,
`Horizontal scroll`, `Menu-search-settings`, `Full page`, `Repeating group`,
`Notification panel`, `Notification list`, `Notification categories`, `Filter tabs`.

**Nothing is left to walk at this depth.** The three components with no walk cannot be
walked: `Multi-select checkbox` has no children in Figma, `Side navigation tab` is the old
name of `Notification tabs`, and `Default header background` is detached from the page
tree. The four walked components with no template are not composite — `Tooltip` is vector
paths, `Information box` wraps an instance of itself.

### The walk's DEPTH cap truncated silently — `done`

The row cap had been fixed: a component that will not fit whole is rolled back and named.
The **depth** cap had not. The walk stopped at depth 2, so a container three levels down
was recorded with no children — indistinguishable from one Figma genuinely leaves empty —
and its template rendered a correct outer box around a blank one. 44 of the 156 components
had one, `Table (AG)`'s columns and `Calendar picker`'s week rows among them.

The data could not answer it, because a row said what a node IS and never how many children
it has. So the fix was in the walk, and it meant re-walking everything: the block header is
now `TREE4`, a row carries the node's own child count, and the walk goes four levels deep.
Changing the header deliberately invalidates every older block — half-populating a new
column would put a guess where a measurement belongs.

**Result: 158 components, 1233 nodes (up from 967).** `Table (AG)` now shows its column
structure with headers; `Menu-search-settings` its context menus and external links;
`Footer (AG)` its pagination counters. What is still behind the cap is **61 containers in 9
components**, each one named in the markup — `<!-- 13 children here in Figma that this walk
did not reach -->` — and the count is pinned by `check-templates.mjs`, which fails if it
grows. A blank inner div with no comment is now a statement that Figma has nothing there.

### The depth cap is closed, and closing it found a live bug — `done`

61 containers were still behind the limit. All nine components re-walked at five levels,
with one new rule: **a run of identical siblings is one fact, not thirteen.** `Table (AG)`
has 13 rows per column and `Calendar picker` six identical weeks; the walk keeps two and
the parent's own child count carries the rest, so the template says
`<!-- 11 more of the same in Figma -->`. That took `Calendar picker` from 88 rows of
repeated day cells to 24 rows of real structure, and `Table (AG)` from a list of empty
column boxes to a table with headers and alternating Default/Stripe rows.

**61 -> 3.** The three left each hold a single leaf child. Pinned by `check-templates.mjs`,
which counts deliberate run-collapses apart from real truncations — counting them together
would have put 60-odd decisions in a number meant to measure what the walk could NOT see,
which is the measuring-the-wrong-thing fault this project has now found in four of its own
checks.

**And looking at the result found a live bug nothing had caught.** `Calendar picker` was
rendering white text on white. Three faults stacked:

1. **The template generator applied the primitive rule to a child's fill and stroke but not
   to its text.** Six templates carried `var(--pf-base-*)`, which CLAUDE.md forbids because
   a primitive cannot change between modes. The substitution table now lives in
   `scripts/primitive-alias.mjs` so the two generators that need it cannot drift, and
   `check-templates` fails on any primitive in a template.
2. **Dropping half a pair is worse than dropping neither.** Figma paints the month header
   `Blue Charade` (a primitive, correctly dropped) with white text on it (correctly
   substituted) — so the text was left over nothing. The generator now detects a text whose
   nearest ancestor fill was dropped and leaves its colour to inherit, with the reason in
   place.
3. **The class itself was painting every label white.** The colour extract gives a component
   ONE text colour; for a composite one that is whichever label Figma recorded, promoted to
   all of them. `Calendar picker`, `Time picker` and `Repeating group` were shipping it.
   Dropped where the child tree shows more than one label colour — which is also what tells
   these apart from `Top bar app context`, identical in the colour extract and genuinely one
   colour, because it sits on the dark header band.

`verify-components` mirrors the rule rather than exempting by name, and the shell-class
baseline went 2 -> 5 with the reason recorded: those three lost their only paint, and in
this one case that is the fix rather than the fault.

Written up for the design team as `docs/FIGMA-ISSUES.md` §10 (four components, two names)
and §11 (one label's colour recorded as the whole component's).

Four more faults the re-walk turned up:

- **Artwork subtrees ate the row cap.** `Empty section` spent 80 of 88 rows on vector paths
  that can never become markup, so nothing else on its page fit. A subtree that is nothing
  but drawing primitives is now collapsed to the node that holds it, which took that
  component from 80 rows to 7.
- **Two components called `Field`, and two called `People`.** Keyed by name their rows land
  on each other's paths and the result is a tree from neither. Kept apart as
  `X (second component)`, following the name `component-geometry.tsv` already uses.
- **A template whose outer class does not exist.** Those two renames produced
  `<div class="pf-people-second-component">`, a class nothing defines. The contents render,
  so the empty-box check passed, and the thing was still unpasteable. The generator now
  refuses to write one and the check fails on any that survive.
- **A control-sized placeholder spilling its label.** `AG Filter menus` rendered
  "Multi-select checkbox" across three lines out of a 20x20 tick box and over the option
  beside it. Below 44px the class paints the box and the name goes in a comment.

Three more faults the widening turned up, all now fixed:

- **A truncated walk left a partial tree that read as complete.** `Time picker` came back
  as a root plus one empty frame, and its template rendered an empty box —
  indistinguishable from a component that genuinely has no contents. The walk now marks its
  position before each component and rolls back if it would not fit whole.
- **The `Header` name collision, for the third time.** Two component sets are called
  `Header`: the 1830x86 app header and a 20x20 badge. Keyed by name, the badge's tree
  overwrote the header's and the header's template became a two-node badge. The badge is
  already recorded in `uncaptured-reasons.tsv` as `Counter`; the root row's variant axis is
  the discriminator, as it is in the other extracts.
- **A decorative box collapsed to nothing.** A template gives children no dimensions on
  purpose, but a box with no content that exists only to be seen — a progress track, a
  coloured bar — needs its height. `Percentage bar` rendered as four empty divs.

Two more things the widened walk turned up:

- **A placeholder must carry its variant attributes, not just the class.** Almost no
  component paints from its bare class — the colours live behind `[data-*]`, because that
  is where Figma puts them. `<div class="pf-button">` is a transparent box; it is
  `data-type="Positive"` that makes it green. The tree now records each instance's variant
  and the template emits it.
- **A SLOT can have children**, and they were being thrown away. `Browser drop down` is a
  slot holding seven `Option` instances; returning only the marker comment lost all seven
  and the template rendered empty. A slot is a real layout box AND a marker.

And a design fault the gallery made visible, now written up as FIGMA-ISSUES.md section 9:
`Option` `Selected=Yes` binds `Text/Inverted primary` and **no background**, so a selected
option is white text on nothing. The highlight exists in Figma only as a raw unbound paint
on the instance.

## B. `verify-layout` is blind to content that ESCAPES its container — `done`

**Done when:** met. The check now tests both ways an element can be unreadable — CLIPPED
by an ancestor that hides overflow, and ESCAPED, where nothing clips it so the content
spills out over its own card. Escaping is sometimes correct (a dropdown, a tooltip, a
badge), so the test is scoped to IN-FLOW elements measured against the nearest ancestor
that actually PAINTS — a card, a panel, a banner. Overflowing a box with a background is a
visible mistake; overflowing a bare layout div usually is not.

`--self-test-escape` pushes a child 240px out of whatever painted container the page
happens to have and confirms the check fails; the existing `--self-test` for the clipped
half still passes. No false positives on any of the five screens.

## C. Two Figma components share the name `Header` — `done`

Confirmed by walking both: the People First `Header` on Navigation is 1830x86 with `10 20`
padding, and the Style Guide page has its own variant-less `Header` at 1654x98 with 30px
padding and 28px type — the documentation site's masthead. The second silently replaced the
first the moment the Style Guide page was walked.

**Done when:** met, though not the way this item assumed. The Style Guide, WIKI and
DOCUMENT MANAGEMENT pages describe the design system rather than belong to it, so the fix
is not to disambiguate a class name — it is to keep those pages out of the pipeline
entirely. Both extractors now exclude them by name, and `Header` specifically by the
absence of a variant, which is the discriminator the data itself provides. Recorded in
`uncaptured-reasons.tsv`.

## D. `Tabs navigation` — `done`

**Answered, and it was neither of the two options this item offered.** It is not CM-only
and it is not a rename. It is a real People First component set — node 781:10884, 8
variants, used by `Menu-search-settings` — that is **detached from the document tree**. The
API resolves it by id and reports `parent: null`, so `findAllWithCriteria()` can never
reach it and the inventory recorded it only as an "external" dependency.

It is also **superseded**: its instances are 52x36 active with an underline and 59x34
inactive, which is exactly the live `Tab`, and it binds `Base colours/Default Pink` — a raw
primitive, so it predates the semantic layer and cannot do dark mode. Deliberately not
captured; recorded in `uncaptured-reasons.tsv`.

**The bigger finding is what looking for it turned up.** Walking every instance on every
page and following it to its main component found **55 detached component sets**, including
`Default header background` — the header swoosh, which had a SECOND reason to go missing,
so this one stayed hidden behind it for the life of the project.

`tokens/_raw/detached-components.tsv` is the census and `scripts/check-detached.mjs` pins
it: the count may not grow, and every uncaptured one must have a written reason. Written up
for design in `docs/FIGMA-ISSUES.md` section 8.


## H. The skills did not know the templates existed — `done`

A survey after closing the depth cap found the same fault Run 3 found, on the newer layer.
**`people-first` — the skill CLAUDE.md tells every session to load before writing any
markup — mentioned templates zero times.** So did `pf-screen`, which builds screens, and
`pf-handoff`, which specs them. 154 templates existed and the four documents that govern UI
work were all ignorant of them; a fresh session would have hand-written the contents of a
card, which is precisely what the templates exist to stop.

All three now carry it: `people-first` has a section on why a composite component needs its
template and what each generated comment means, `pf-screen` reads `docs/templates.html`
before writing and has a step for pasting one, and `pf-handoff` cites the template file
alongside the class in the components table.

**Their figures had drifted too, and one of them was two different numbers.** `people-first`
said "139 of the 172 components are in the stylesheet" and listed `Tooltip`, `Menu`,
`Stars`, `Field icons` and `Component 1` as missing — all five captured months ago.
`pf-screen` said 147. Both were describing the same library, and BOTH were defensible:
**147 components carry colour bindings (302 variants) and 162 have a class**, the difference
being the shape-only ones Figma binds no colour to. Quoting one as the other is how the two
files disagreed.

`check-skill-classes.mjs` now re-derives every count a skill quotes from the build and fails
on a mismatch — proven by breaking each figure in turn and watching it fail. A skill may say
what it likes about why; it may not carry a number the build disagrees with.

## I. A page can use a component and still hand-build its insides — `done`

The templates existed, the skills now point at them, and **nothing in the repo actually
used one.** `working/case-mgmt-my-team.html` — the page built FROM a Figma design, which
CLAUDE.md says is the direction that must be correct — uses twelve composite component
classes and hand-writes the contents of every one: `<div class="ppl-head">` inside
`.pf-card`, the entire magazine layout rebuilt out of local divs inside
`.pf-layout-container-magazine-style`. `check-off-system` passes it, because the outer
class is real and every colour is a token. That is the fifth time on this project a check
has been green while the page was wrong on an axis it does not measure.

`check-template-fidelity.mjs` measures the new axis: of the library classes a component's
template puts inside it, how many does the page's own instance use? It reports rather than
judges — a real card holds real data and a page may leave parts out — but a component using
NONE of several offered is one rebuilt by hand. **Two are outstanding**, both on that page:
`pf-header` (0 of 2) and `pf-layout-container-magazine-style` (0 of 4). Pinned, may only
fall.

Two faults caught while building it, both of which would have made the check harmful:

- **It reported six components as "not using `pf-text-body-text`".** That looks like a
  finding and is the opposite of one: a component COMPOSES its own type — `.pf-tab` renders
  16px/400, exactly the `Desktop text/Body text` Figma binds it — and CLAUDE.md forbids a
  page adding a type class inside a component. Acting on that output would have broken a
  rule. Type classes are excluded.
- **`working/*.html` matches the `.src.html` sources too**, so the first run counted every
  page twice and reported four hand-built components instead of two. Filtered inside the
  script rather than in the npm invocation.

**Rebuilt, on request.** `case-mgmt-my-team` now builds those regions from the components:

- The header title was `.hdtitle` — a hand-written 66px flex row, 10px gap, 24px text,
  Text/Always white. That is `Top bar app context`, which carries all four. The local rule
  and its `pf-text-large-heading` both went; a page must not set type on a component class.
- The insights title was `.ins-head`, and the category tabs and action buttons were `.cats`
  and `.btnrow` — two separate hand-written rows. In Figma the tabs and buttons are ONE
  component, `Layout container tabs`, packed left and pushed right, and the title row is
  `Layout container title`. Both now are.

**2 flagged uses down to 1**, and the remaining one is a soft flag, not a fault: the title
row IS the component now, it just holds `pf-links` where Figma's action group holds buttons.
The check's label was changed from HAND-BUILT to REVIEW for exactly that reason — it cannot
tell "rebuilt by hand" from "used with different children", and saying the stronger thing
about correct markup is the same overstatement this project keeps finding in its own checks.

Two regressions caught by looking rather than by a check:

- **The hairline under the title collapsed to 0x1.** Moving it out of the old wrapper left
  it in an `inline-flex` column, so it had no width. Nothing failed — `verify-layout` asks
  whether elements are clipped or escaping, and a zero-width rule is neither.
- **The two component rows sized to their contents**, 1062 and 1110 inside a 1150
  container, because they are `inline-flex` with a large Figma gap and `space-between`. In
  Figma both FILL the container. `align-self: stretch` on each — alignment, not size, so
  the component still owns its height, padding and gap.

One off-system violation of my own making, caught by the check: I gave the meta paragraph
`color: var(--pf-text-secondary)`. A component owns colour, the original inherited, and
there was no reason to change it.

## J. The six-axis suite never checked the pages that matter — `done`

`verify-screens.mjs` was hardcoded to `prototypes/`. CLAUDE.md says in two places that the
prototypes are rough test fixtures which are allowed to be wrong, and that "the thing that
must be correct is the other direction: when asked to build something FROM a Figma design,
the output must match that design" — and those pages live in `working/`. So the suite ran
in full against the pages that do not matter and never once against the page that does.

Pointing it at `working/` found four real things:

- **`verify-geometry` could not run anywhere but the screen it was written for.** Nine of
  its thirteen checks were `expected present in DOM got missing` — an assertion about a
  page's INVENTORY smuggled into a check about SHAPE. A people-and-insights page has no
  table and no toggle, and that is not a geometry fault. Absence is now counted and named,
  never failed. Proven still to catch a real break by overriding a button's height.
- **35 unnamed elements** on the page built from Figma — the one that is supposed to be
  handable to a developer or an Angular pipeline. All 35 now carry a `data-pf-id`, authored
  in the source so they survive a rebuild, and the page has a manifest like the prototypes.
  The four action buttons all read "Action", so they are named for the icon each carries —
  a counter would become a lie the moment one was reordered.
- **A notification badge that was white on sky blue in dark mode**, 2.36:1. Page-local CSS
  picked Text/Always white, which is 5.28:1 in light; Background/Theme is Default Pink in
  light and Blue Sky in dark, so the pairing dies when the mode flips. Text/Inverted primary
  is the token for text on a brand surface and adapts with it — 5.28 and 4.52, AA in both.
- **12 "invented variants" that were real Figma axes.** `tag-elements` validated only
  against `component-variants.tsv`, which holds the axes that survived into CSS. An axis
  whose values all bind the same colours is collapsed (`collapsed-axes.tsv`, 66 rows) and
  one the colour extract never needed appears in neither. `Circle icons` does have `Size`,
  `Links` does have `Icon position`, `Nav tabs` and `Tab` do have `Mobile`, `Navigation
  item` does have `Selected`. Acting on the report would have meant DELETING correct
  attributes — the check's own stated harm, caused by the check. It now reads all three
  sources, the completest being the component tree's root rows, and `data-pf-*` is exempt
  because that is this pipeline's own namespace, not Figma's.

And one in `pf-audit`: **it read straight through artwork.** The header band is a raster
swoosh, and the walk for "what is behind this text" passed it and landed on the page,
reporting the title and the Clock-in button as 1.04:1 failures. The artwork is not even an
ancestor — it is a sibling pinned behind the row — so the fix looks for an element that
paints an image and COVERS the glyph. Such text is now listed as unmeasurable and neither
passed nor failed: no single number describes contrast against a photograph, and a nonsense
failure at 1.04:1 reads as the most urgent thing on the page.

`pf-audit`'s skill also now names the three checks it does not perform, so nobody reports
"100% coverage" as though it meant the page uses the library.

---

## 11. Ship the typeface — `done` (spec fault 1)

`CLAUDE.md` mandates Open Sans 400/600 and nothing provided it: `fc-match "Open Sans"`
resolved to DejaVu Sans, and DejaVu has no SemiBold, so weight 600 rendered as synthesised
Bold. Every screen, for the life of the project, in the wrong face at the wrong weight.

**Done when:** met. Vendored to `assets/fonts/`, inlined by `dist/fonts.css`,
`check-fonts.mjs` asks which face actually rendered. It found three more instances
immediately — ten unweighted text styles inheriting the UA's 700, `<strong>`/`<th>`
defaults, and all three prototypes fetching Google Fonts through a blocked egress policy.

## 12. Check against an independent measurement — `done` (spec fault 2)

**Done when:** met. `tokens/_raw/figma-truth.tsv` is measured by its own walk and no build
script reads it; `verify-against-figma.mjs` compares the rendered stylesheet to it and
passes `--self-test`. Every other check now says "match the extract" rather than
"match Figma". First run found 14 real drifts.

---

# Still open, in spec order

## E. Per-variant geometry — `done` (spec fault 3)

**Done when:** met, for the whole design system rather than one page. Every Figma page that
IS the design system has been walked. **321 variant-qualified rows**, up from 16 when this
started, and drift is **0 of 1407** against the independent measurement with the baseline
locked. `verify-spec.mjs` proves it: the claim that the rest of the library was still
one-row-per-component has stopped being true, which is what closed the fault.

## F. Component type from the text styles — `done` (spec fault 4)

**Done when:** met. `extract-component-type.mjs` reads `textStyleId` for all 208 component
labels — the link nothing had ever read. The library now composes the styles: one rule per
text style listing every selector that uses it, generated from the same `text-styles.tsv`
that `type.css` is generated from, so the two cannot disagree. **`font-size` went 410 → 69
and `font-weight` 131 → 31**, and what remains is exactly the labels the ramp cannot
express. `check-component-type.mjs` is wired into `npm run verify` and self-tested against
both failure modes.

181 of 208 labels resolve to one style. The other 27 are written up in
`docs/FIGMA-ISSUES.md` §7 — including `Button`, whose 18 variants are 13px SemiBold, which
is exactly `Desktop text/Label text (semi bold, 600)` and is bound to nothing.

Two source problems found while doing it, both now handled rather than guessed around:

- **A style name is not a unique key.** Two styles are both `Desktop text/Button text`
  (16px SemiBold and 13px uppercase), so `Notification card` Mobile=Yes composed the wrong
  one — right name, wrong values, under a component that was correctly bound.
- **Matching by size and weight alone is ambiguous** for 43 labels. Reading tracking and
  case too makes it unique, and reveals off-ramp type that size hid: the Config menus are
  16px UPPER and no style is.

**And one check was found to be measuring the wrong thing.** The shell census went 70 → 2:
it counted RULES, not classes, and the generator emits each component twice at the bare
class. `69` was near enough a count of the components that DO have paint.

## G. Truth-snapshot coverage — `done`

**Done when:** met. `figma-truth.tsv` covers **348 shapes across 158 components**, up from
23 across 11. **160 of the 187 non-icon components are measured**, and every product page
is complete: Buttons and links 11/11, Tags and ratings 4/4, System messages 7/7,
Cards and panels 32/32, Forms 21/21, Tables 13/13, Controls 11/11, Analytics and charts
14/14, People 4/4, Pages and Layouts 3/3, AI 8/8, Navigation 31/33.

The two walks stayed separate throughout, as required.

**The 27 not measured are accounted for, not missing** — all in `uncaptured-reasons.tsv`:

- 25 are on the three documentation pages (item C).
- `Side navigation tab` was renamed in Figma to `Notification tabs` and IS measured;
  `components.json` still carries the old name.
- `Default header background` is **detached from the document tree**: the Plugin API
  resolves node 13658:7639 by id but reports `parent=null` and `page=null`, so
  `page.findAllWithCriteria()` can never reach it. That is a second, independent reason the
  header artwork went missing, on top of it binding no colour variable. Measured by node id
  directly; all six variants now checked.

Also recorded while doing this: `People`'s `Item` axis is 300 sample entities whose height
depends on the length of the name rather than on the component — "Nolan George" is 91px at
Type=Table/Mobile=True and "Corey Franci" is 109 because it wraps. No class can be right for
both, so the axis is excluded with that measurement as the reason.

---

## H. Three properties the pipeline never carried — `done`

Found by working backwards from two defects the user reported on screen, not by any check.
Each is the same shape: the colour extract records a component's **fill, stroke token and
text token**, and anything that is none of those three was invisible to the whole pipeline.

**Done when:** met for all three. Each is measured from Figma into its own `tokens/_raw`
file, emitted by `npm run build`, and checked by a script in `npm run verify` that renders
the component and measures the result — plus a negative test proving the check fails when
the fault is reintroduced.

1. **A box that centres its own child.** `Circle icons`, `Status`, `Waffle` — Figma lays
   them out as NONE, so there was no auto-layout for the geometry extract to read and the
   classes carried no alignment. A page had to centre the icon itself, which is
   hand-written component CSS, and an independently-built screen shipped with the icon
   small and off-centre. 23 variants, `component-inner.tsv`, `check-component-inner.mjs`.
2. **Which edges a border strokes, and how thickly.** Every bound stroke was painted as a
   1px box on four sides. 56 variants depart from that: 26 stroke some edges only (`Nav
   tabs` is a file-folder tab, not an underlined one), 12 stroke at 1.5px or 2px, and 18
   keep a paint Figma has switched OFF — including every `Table cell (AG)`, so tables drew
   a grid of boxes instead of horizontal rules. `component-stroke-sides.tsv`,
   `check-stroke-sides.mjs`.
3. **The shadow a component casts.** `dist/components.css` contained "box-shadow" zero
   times while Figma casts one on 47 variants — every floating surface in the system.
   29 match one of the two shadow tokens and are emitted; the other 18 match neither and
   are reported rather than written as a raw rgba. `component-shadow.tsv`,
   `check-shadows.mjs`, `docs/FIGMA-ISSUES.md` §12.

**Checks found to be measuring the wrong thing while doing this** — the running theme of
this project, now at six:

- The shell census split a rule's selector list on commas, so a generated comment
  containing one became the "selector" and the rule below it was attributed to nothing.
  **Nine shape-only classes had never been counted at all**; the real figure is 14, not 5.
- `check-stroke-sides` built its own markup with every Figma axis, so it passed on rules
  that matched nothing a real page writes. `check-off-system` caught that instead.
- The docs-figure check compared with `Number()`, so any figure written as a WORD was
  permanently unverifiable. "Two are outstanding" had been wrong — wrong count and wrong
  component names — since `case-mgmt-my-team` was rebuilt, and nothing could see it.
- My own first tally of the border census double-counted rows that were both switched off
  and uneven, and still summed to the right total by coincidence.

Figures checked in the docs went **44 → 58**.

## I. Survey: what else does the pipeline drop? — `done (nothing further found)`

Swept the component pages for four more properties, to see whether the pattern above
continues. It does not, and that is worth recording so nobody re-runs it:

- **opacity below 1** — none, on either page measured before the Figma connection dropped.
- **rotation** — none.
- **stroke alignment** — `INSIDE` almost everywhere; 3 components on Cards and panels use
  `OUTSIDE`. Not pursued: `verify-against-figma` compares 1408 rendered values against an
  INDEPENDENT Figma measurement and passes, so whatever the outside stroke does to the box
  is already accounted for. Worth a look only if a size discrepancy ever shows up.
- **`clipsContent`** — 34 components on Cards and panels clip their contents and
  `dist/components.css` sets `overflow` once. **This is the one real candidate left** and
  is NOT done: it needs the same treatment as the three above. Lower severity, because a
  class is mostly an empty box until a template is pasted into it — it would bite on a card
  holding an image that should be clipped by the rounded corner.

## J. `clipsContent` — measured, and deliberately NOT carried — `done`

Picked this up as the one candidate item I left in section I. The answer is **no**, with
evidence, and that is the deliverable.

Figma clips 34 of the 62 components on Cards and panels, 22 of them with a corner radius —
and clipping is the only way to make a child respect a rounded corner, so it looked like the
obvious next fix after the border and the shadow.

**Done when:** met — the question is settled by measurement rather than judgement, the
answer is written where the next person will look, and the number that would change the
answer is pinned.

What settled it: **28 of the 154 templates already render OUTSIDE the box their own class
draws** — `pf-hemisphere-chart` by 333px, `pf-donut-pie-chart` by 284px, `pf-content` by
180px. `overflow: hidden` on those would not reproduce the design, it would delete part of
the component's own generated contents. Worse, nothing would report it: a clipped child
still has a bounding rect, so `check-templates` would go on saying every template renders
its contents while a fifth of one was invisible. That is the exact silent failure this
project keeps finding in itself — and it would have been added deliberately, in the name of
fidelity.

The overflow is not a fault in the templates: a class's height is the artboard Figma drew
the component at, and a template holds placeholder contents of their own size. The two were
never promised to agree.

`check-template-overflow.mjs` reports and pins the 28. **It is the precondition — clipping
can only ever be carried once that number is zero.** So the door is left open with the
latch measured rather than the question re-litigated.

**A baseline taken from a subset is not a baseline.** The first version of that check pinned
5, which is how many of the eighteen components I had sampled overflowed. Run against all
154 it is 28, and it failed on its first honest run. Measure the population you are pinning.

## K. Place the children of a parent Figma does not lay out — `done`

Started as the min-height job from section J. **That hypothesis was wrong and the
measurement said so before any code changed**: all 28 overflowing components have a FIXED
height in Figma, not one hugs its content, so `min-height` would have made the CSS disagree
with Figma rather than agree with it.

The real cause, found by reading three of the templates: for a parent laid out NONE the
template stacked the children in normal flow, and Figma positions them by hand. `Profile
image` is 93x93 holding a photo and a `People` instance BOTH at 0,0 at 93x93 — overlaid in
Figma, stacked by the template, 93 becoming 184.

**Done when:** met. Positions measured into `component-child-pos.tsv`, applied by
`build-templates.mjs` behind three guards, no template worse than before, and the overflow
count down 28 -> 27.

Kept as a separate file rather than a column on the tree deliberately: a column changes the
tree's block header, which invalidates every older block, and a re-walk of 158 components
through a connection dropping between calls would have left the file holding only the few
that got through — wiping the templates of the rest.

**It got worse twice before it got better, and both were caught by the measurement:**

- Positions applied everywhere pushed FIVE components' children clean out of their box
  (28 -> 33), because the class drops an artboard width above 120px so there is no 1920px
  box for a child at x=1830 to sit in. Now gated on the class carrying the whole measured
  box; nine components are measured and deliberately not placed, and the build names them.
- `position: relative` on every parent EXCEPT the root sent the children to the top-left of
  the page. The root is the origin.
- A placement on an icon was silently dropped — an icon is an HTML comment and cannot carry
  a style — while the build counted it as applied. Wrapped in a span, and the build now
  counts what reached the written template rather than what it intended.

## L. The charts — the gate was asking the wrong question — `done` (partly)

Picked up as "do the charts with proportional placement". That is not what they needed, and
two measurements said so before any of it was built:

- All three chart classes emit a FIXED height, so percentage heights would have been safe —
  but **all three have no WIDTH**, and a class with no width whose children are all
  absolutely positioned renders **0 wide**. Measured, not reasoned: `.pf-donut-pie-chart`
  came back `0x200`. Percentages of zero are zero, so proportional placement would have made
  those templates vanish rather than improve them.
- The real fault was in the gate I wrote last time. It asked "does the CLASS carry the whole
  box" — a question about the component ROOT — and so refused every placement inside a
  component whose class drops its artboard width, **including placements on inner containers
  that have nothing to do with the root**. The origin is the child's PARENT, and an inner
  origin is given its own measured size, so it is definite by construction.

**Done when:** met for what is reachable. Placements went **5 across 4 components to 12
across 8**, `Hemisphere chart` from 333px of overflow to 77px, no template worse than before.

**Not done, and honestly blocked:** `Donut pie chart`, `Bar chart with axis`, `Full page`,
`Configuration` and `AI Gradient component` place children from their ROOT, and their class
has no width for the offsets to sit in. 16 offsets across 7 components are measured and
deliberately unapplied; the build names them every run.

**Two faults found on the way, both invisible to every existing check:**

- `box-sizing`. Figma's sizes include the frame's padding and CSS's do not, so `AI
  Assistant`'s 1108px slot with 20px padding rendered 1148 and hung out of its own component.
- **Placing SOME children of a hand-laid-out parent and flowing the rest** put `Search
  navigation`'s magnifier on top of the word "Search". The icon branch and the TEXT branch
  each build their own markup and had been dropping the placement silently. Nothing measured
  it — the box did not overflow, the template rendered its contents, every check was green.
  `check-template-overflow.mjs` now asks it directly in the browser and fails on a mix.

Also pinned: **how many is not how much.** The overflow count could not see 333px becoming
77px, so the total magnitude (1372px) is pinned alongside it.

**Suggestion for the user, not done — the question section J raises.** 27 classes draw a box
their own contents do not fit. Some components already emit `min-height` ("content decides
the real height"); these 28 emit a fixed `height` from the artboard. Emitting `min-height`
for a component whose template overflows would make the box honest and would take the
clipping precondition to zero. It is not a small change — 442 fixed heights in the
stylesheet, and `verify-against-figma` compares rendered geometry against an independent
Figma measurement, so it would need re-baselining carefully. Worth doing; worth doing
deliberately, not at the end of a run.

## M. A component's composed type drops its line-height — `done`

Found by survey, not from the queue. All 23 Figma text styles set line height to **AUTO**,
which `dist/type.css` correctly emits as `line-height: normal`. The rules that compose those
same styles onto component labels emit `font-size`, `font-weight` and `letter-spacing` and
**not** `line-height` — `dist/components.css` contains the string zero times.

Measured, on a page whose body sets `line-height: 1.9`:

```
.pf-text-body-text   line-height = normal     <- correct, Figma AUTO
.pf-filter-chip      line-height = 30.4px     <- inherited from the page
```

Same style, two renderings. Every component label on every page that sets a body
line-height — which is nearly all of them — is stretched by it, and nothing could see it:
`verify-type` checks 107 values and passes, because line-height is not among them.

**Done when:** a component composing a text style renders the same line-height as the
`pf-text-*` class for that style, measured in a browser; a check asserts it and fails when
the rule is removed; and the people-first skill stops contradicting itself about it.

**Second, documentation:** the skill says both of these, 250 lines apart —

- line 128: "automatic line height. A specific `line-height` on a People First screen is
  **invented**"
- line 382: "**line-height** — not captured by the extract", listed under *yours to write*

The second is false — it is captured, for all 23 styles — and it invites an author to write
the very thing the first calls invented, overriding a generated value.

**Done.** Both generators now call one `declarationsFor()` in `resolve-component-type.mjs`,
so the type ramp and the component library have the single source the components.css comment
already claimed they had. `dist/type.css` came out **byte-identical**, which is what makes
the refactor safe; `dist/components.css` gained the 14 missing line-heights.

`check-composed-type.mjs` renders each composed component beside the `pf-text-*` class for
its own style, inside an ancestor with a deliberately hostile line-height, letter-spacing,
case, style, weight and size — because a MISSING declaration is invisible to anything that
reads the stylesheet, and can only be caught by something the page can override. Proved it
fails: removing the line-heights again reports all 14.

The skill's contradiction is gone. It said, 250 lines apart, that a specific line-height is
"invented" and that line-height is "yours to write". The second is deleted and replaced with
why.

## N. The same line-height fault in the other 49 rules — `done`

Section M fixed the 14 COMPOSED type rules. Surveying the same question one level out found
**49 more** — the off-ramp labels, whose type the ramp cannot express, so the measured size
is written directly. Every one stated a font-size and no line-height, so the page supplied
one for all of them too.

**`normal` here is measured, not assumed.** `component-type.tsv` has no lineHeight column, so
rather than infer it from the 23 named styles, every text node inside a component on all
twelve product pages was read: **3370 of 3377 set line height to AUTO**. The seven that do
not are deep children rather than a component's own label — six are the `": "` separator in
`Footer (AG)`'s pagination at 19.5px, one a "+3" counter at 109.68% — so none is the label
whose type these rules emit.

**Done when:** met. `check-composed-type.mjs` now asserts the general rule — *every* class
that states a font-size must state a line-height — rather than only checking the 14 composed
ones. Proved it fails by removing three line-heights: it named all three.

`dist/type.css` stayed byte-identical throughout both M and N, which is the evidence the
refactor underneath them was safe.

## O. Every form field's icon in the same place — `done`

Reported from a screen, not caught by any check: the search magnifier was on the wrong side
and floating in the corner. Chasing it found the general rule and a second, larger fault.

**The rule, from the Figma tree rather than from taste.** `Field` is laid out HORIZONTAL
CENTER MAX — children packed to the END, centred on the cross axis — and its last child is
ONE `Field icons` instance whose four frames are `Search icons`, `Dropdown`, `Calendar` and
`Clock`. Search glass, chevron, calendar and clock are the same object in the same place;
only the glyph differs. All right-aligned, vertically centred, at the field's own padding.

**The larger fault: every dropdown on every prototype had no icon at all.** `.pf-field` sets
`appearance: none`, which removes the browser's arrow, and nothing replaced it — seven
`<select class="pf-field">` across three pages, rendering bare.

The cause of both is the same: `.pf-field` was being put on the CONTROL. Figma's `Field` is a
container holding a TEXT node plus the icons, so with the class on an `<input>` there is
nowhere for an icon to go — which is what forces absolute positioning. The class now goes on
a wrapper with the real control inside it.

**Done when:** met. Measured on every field: 11px from the right on all of them, equal gaps
above and below. `check-field-icons.mjs` reads the right-hand distance from the field's own
computed padding and border rather than hard-coding it, so it stays correct if Figma changes
either. Proved it fails by reinstating the old absolute positioning — it named all four.
