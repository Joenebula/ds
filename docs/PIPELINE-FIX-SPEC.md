# Implementation spec — why the output does not match Figma, and what to change

Written after four rounds of "the buttons are still wrong". Every claim below was
checked before it was written; the command that proves each one is quoted with it.

---

## Summary

The pipeline does not use Figma components. It uses a **hand-typed summary** of them, and
every check validates that summary against itself. Four faults compound:

| # | Fault | Effect | Severity |
|---|---|---|---|
| 1 | ~~The typeface is never shipped~~ | **FIXED** — Open Sans 400/600 vendored and inlined; `check-fonts.mjs` guards it | ~~Critical~~ |
| 2 | ~~Checks compare the build to its own source~~ | **FIXED** — `verify-against-figma.mjs` has an independent source; wording corrected | ~~Critical~~ |
| 3 | ~~One geometry row per component~~ | **FIXED for the covered page** — extraction is per-variant; drift 14 → 0 | ~~High~~ |
| 4 | Component type is not linked to the text styles | Component type can drift from the type layer, both "passing" | Medium |

Fault 1 alone explains the reported button and title problems. Faults 2–4 explain why
nobody noticed.

---

## 1. The typeface is never shipped — CRITICAL — **FIXED**

`CLAUDE.md` says *"Open Sans only, weights 400 and 600"*. `--pf-font-body` is
`Open Sans, system-ui, sans-serif`. **Open Sans is not installed, not embedded, and not
downloaded.** Every screenshot produced from this repo has rendered in a fallback.

**Evidence**

```
$ fc-match "Open Sans"
DejaVuSans.ttf: "DejaVu Sans" "Book"

$ fc-match "Open Sans:weight=demibold"
DejaVuSans-Bold.ttf: "DejaVu Sans" "Bold"        # no SemiBold face exists

$ grep -c "@font-face" working/case-mgmt-my-team.html
0

$ find . -iname "*.woff*" -o -iname "*.ttf" | grep -v node_modules
                                                  # nothing — the repo ships no font
```

Measured in Chromium, the string "Action" at 13px:

| Family requested | Width |
|---|---|
| `"Open Sans"` 600 | 36.8px |
| `sans-serif` 600 | 40.5px |
| `system-ui` 600 | 46.6px |

**Two consequences, both visible:**

1. Letterforms and widths are wrong everywhere — every heading, label and button.
2. **DejaVu Sans has no SemiBold.** Weight 600 snaps to Bold (700). Text specified as
   SemiBold paints heavier and wider than the design. That is the reported
   "font weight is wrong", and it is not confined to buttons.

**Why no check caught it:** `verify-type` compares the emitted `font-weight: 600` against
`text-styles.tsv`'s `SemiBold`. Both are correct. The browser paints DejaVu Bold. No check
asks *which face actually rendered*.

### Change

1. Add `@fontsource/open-sans` (Apache-2.0, reachable here — `registry.npmjs.org` is
   allowlisted; `npm view @fontsource/open-sans version` → `5.3.0`). It is a new
   dependency and needs sign-off.
2. Generate `dist/fonts.css` with `@font-face` for weights 400 and 600, normal and italic,
   **woff2 inlined as data: URIs** — a `url()` path fails silently in an artifact or a
   `.dc.html` canvas, the same way the header artwork did.
3. Inline it alongside the other three stylesheets in `build-prototype.mjs`, and add it to
   the documented `<link>` set in `CLAUDE.md`.

### Done

Open Sans 400/600 (latin, Apache-2.0) vendored to `assets/fonts/` and inlined by
`dist/fonts.css` as data: URIs. Not a dependency — an asset, like the 293 icons.

Implementing it found three more instances of the same fault:

- **Ten text styles record no weight in Figma.** The generator emitted nothing and left it
  to inherit, so an `<h2>` took the UA default of 700. Now 400 is emitted; the pairing
  (`Sub heading` alongside `Sub heading (semi bold, 600)`) settles that the plain one is
  Regular.
- **`<strong>`, `<th>` and every heading element default to 700**, which no shipped face
  provides, so the browser synthesised one. `fonts.css` now maps UA bold onto 600. It sits
  there rather than in `type.css` because `type.css` is opt-in — `timesheet-approvals` has
  no `/*__TYPE__*/` placeholder at all, and its `<strong>` stayed 700 when the reset lived
  there. Faces are not opt-in.
- **All three prototypes fetched Open Sans from Google Fonts.** That request is blocked by
  this environment's egress policy and would also fail inside an artifact, so they had been
  silently falling back since they were written. Links removed.

### Verification

`scripts/check-fonts.mjs`, wired into `npm run verify` — renders a page and **fails**
unless:
- `document.fonts.check('600 13px "Open Sans"')` is true **and** a real face is loaded
  (`document.fonts.size > 0`);
- the measured width of a probe string at 600 matches the Open Sans metric within 0.5px
  and differs from the `sans-serif` fallback — proving the real face rendered, not a
  substitute;
- no weight outside {400, 600} appears in any generated stylesheet.

Deliberately break it by removing the `@font-face` block; the check must fail. It already
proved itself by catching the 700s above, which nothing else could see.

---

## 2. The checks compare the build to its own source — CRITICAL — **FIXED**

`npm run verify` prints **"2722 of 2722 checks match Figma, 0 off"**. It does not check
against Figma.

**Evidence**

```
$ grep -n "_raw/" scripts/verify-components.mjs
21:const geometry = new Map(tsv('tokens/_raw/component-geometry.tsv')...
22:const variants = tsv('tokens/_raw/component-variants.tsv');

$ grep -ln "use_figma\|figma.com\|api.figma" scripts/*.mjs
                                                  # nothing — no script contacts Figma
```

`dist/components.css` is generated **from those two TSVs**, then compared **to those two
TSVs**. It is the copy checked against the copy. A mis-transcription is invisible and
permanent, and the wording of the output actively misleads.

### Change

1. Rename the output. It measures internal consistency, so it must say so:
   *"2722 of 2722 rendered values match the extract"* — never "match Figma".
2. Add `scripts/verify-against-figma.mjs`: for each component, export the Figma variant as
   PNG, render the class in Chromium at the same size, and compare. Report per-component
   pixel difference; fail above a threshold.
3. Store the Figma renders in `tokens/_raw/component-renders/` so the check runs offline
   and a re-extract refreshes them.

### Done

- Every check that said *"match Figma"* now says **"match the extract"**, because that is
  what it measures. Only `verify-against-figma.mjs` may claim Figma.
- `tokens/_raw/figma-truth.tsv` — an independent measurement, written by its own walk
  (`extract-figma-truth.mjs`). **No build script reads it.** That is the whole point: the
  stylesheet and the expectation now have separate origins.
- `scripts/verify-against-figma.mjs` renders each class and compares. It only compares a
  property the stylesheet actually *asserts* — a component whose height comes from its
  content has no height rule, and measuring the probe markup would be noise.

Implemented as a numeric comparison rather than a pixel diff: no stored PNGs to go stale,
and a difference names the property rather than a percentage.

### Verification

`--self-test` breaks `.pf-button`'s height from 32 to 30 and confirms it is caught. It is.

**It earned its keep on the first run.** 14 drifts, across components I had never looked
at, every one an instance of fault 3:

| Component | Figma | Rendered |
|---|---|---|
| `Button Type=Filter` | padding `0 15` | `0 20` |
| `Button Type=Sort` | padding `0 15` | `0 20` |
| `Button Label=No` (icon only) | padding `0 8`, gap 5 | `0 20`, gap 10 |
| `Filter chip Mobile=True` | 34px, padding `8 15`, 13px | 42px, `10 20`, 16px |
| `Filter chip Selected` | gap 10 | gap 5 |
| `Links Secondary` | 13px | 16px |

The count is pinned at 14 and fails if it rises. **Coverage is 23 shapes across 11
components** — the Buttons and links page. The snapshot grows a page at a time; that is a
real limit and is why the count is a baseline rather than a pass.

---

## 3. One geometry row per component — HIGH — **FIXED where measured**

`component-geometry.tsv` holds **one row per component**. Whichever variant happened to be
measured is applied to all of them.

**Evidence** — four separate bugs this session, all the same fault:

| Component | One row said | Figma actually has |
|---|---|---|
| `Navigation item` | 13px SemiBold, padding 0, gap 22 | SemiBold only on `Selected=Yes`; Default is Regular, padding `0 25`, gap 10; Mobile 86x76, Tablet 86x56 |
| `Profile image` | 93x93 | six sizes, 22 → 93; base should be 43 |
| `Clock in` | — | fixed 107 **with `clipsContent`**; the label overruns and Figma cuts it off. On the web it wrapped instead |
| `Card` | — | binds `Background/Primary` behind `Property 1=Default`, so the bare class painted nothing |

Each was patched individually. The shape that produced them is unchanged.

### Change

Replace the single row with a full per-variant extract. New
`scripts/extract-component-geometry.mjs` walks every variant of every component and writes
one row per variant: size, padding, radius, gap, layout, `layoutSizingHorizontal/Vertical`,
`clipsContent`, and the label's font. The generator already emits per-variant rules
(`Component|Prop=Value`), so this is a data change, not a generator rewrite.

Keep a base row, derived rather than typed: the values shared by **all** variants.

### Done

`scripts/extract-component-geometry.mjs` harvests per-variant rows. Two decisions worth
recording, because the obvious choice was wrong in both:

- **The base row is Figma's DEFAULT variant, not the intersection of all of them.** Blanking
  every field the variants disagree on sounds more honest and is worse: `class="pf-button"`
  with no attribute would lose its padding, height and type entirely. The default variant
  is a real, complete shape; variant rows override it where Figma differs.
- **Height stays the measured pixels even where the frame hugs.** Figma reports `HUG`
  vertically on a Button whose frame is nonetheless 32 tall. Emitting `auto` drops it to the
  line box — about 22px — and the pill is gone. Width still becomes `auto` when it hugs,
  because a hugging width really is content.

Four hand-written descriptive rows (`Button (icon only)`, `Filter chip (mobile)`,
`Links (primary)`, `Links (secondary)`) were measurement notes standing in for variants.
Real variant rows supersede them; they are deleted.

It is a SEPARATE walk from `extract-figma-truth.mjs` on purpose. That one feeds the check,
this one feeds the build. Merging them would rebuild the circularity fault 2 just removed.

### Verification

**Drift went 14 → 0. 90 of 90 rendered values match the independent measurement**, and the
baseline is locked at 0 so it cannot rise. `--self-test` still catches a deliberate break.
No visual regression: the button specimen, the working screen and the prototypes all
re-shot and checked.

### The honest limit

**11 components on one Figma page are per-variant. 178 rows are still one-per-component.**
Everything outside Buttons and links carries the old shape and is unchecked against an
independent source — the same fault, just not yet visible. Extending both walks page by
page is item G in the queue, and until that is done "fixed" means *fixed where measured*.

---

## 4. Component type is not linked to the text styles — MEDIUM

`dist/type.css` is correct — 23 styles extracted from Figma's real text styles. Components
do not use it. They emit **131 `font-size`** and **32 `font-weight`** declarations of their
own, transcribed by hand.

**Evidence**

```
$ grep -c "font-size:" dist/components.css     # 131
$ grep -c "font-weight:" dist/components.css   # 32
$ grep -o "pf-text-[a-z0-9-]*" dist/components.css | sort | uniq -c | sort -rn | head -3
    140 pf-text-primary        # colour tokens, not type classes
     28 pf-text-theme
     24 pf-text-always-white
$ grep -rln "textStyleId" scripts/
                                # nothing — the link has never been extracted
```

Read from Figma:

| Component | Label | Bound text style |
|---|---|---|
| `Links` | 16px/mixed | **`Desktop text/Body text`** |
| `Button` | 13px/SemiBold | **none — raw local type** |

So the mechanism exists and is used; `Button` is detached from it **in Figma**. Note that
13px/SemiBold is exactly `Label text (semibold)` — the values match a style that is simply
not bound.

### Change

1. Extract `textStyleId` for every component label.
2. **Bound** → the generated class composes the corresponding `.pf-text-*` class instead of
   emitting its own font values.
3. **Unbound but matching a style by value** → compose that class, and report *"Figma has
   not bound the style"* to `docs/FIGMA-ISSUES.md`. This is `Button`'s case.
4. **Unbound and matching nothing** → the component is off the type ramp. Report it as a
   design issue rather than silently copying it in.

### Verification

- `font-size`/`font-weight` declarations in `components.css` fall to near zero.
- A new check fails if a component emits raw type while a text style with identical values
  exists.
- `docs/FIGMA-ISSUES.md` lists every unbound label, `Button` included.

---

## Order of work

1. **Fault 1** — the font. Alone it explains the reported bug, and it is the smallest
   change. Needs sign-off on the dependency.
2. **Fault 2** — the render-against-Figma check, plus honest wording. Without it, nothing
   below can be trusted to have worked.
3. **Fault 3** — per-variant extraction. The largest change; retires a whole bug class.
4. **Fault 4** — type styles. Cosmetic until 1 and 2 are done.

## What this does not fix

The extract still captures a component's **outer box only** — no children, no nested
instances. `.pf-header`, `.pf-metric-card`, `.pf-calendar-picker` and `.pf-table-ag` remain
sizes with nothing inside them, and **69 classes have no paint at all**. That is item A in
`keep-going/QUEUE.md` and a larger piece of work than everything above.
