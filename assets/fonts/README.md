# Open Sans

`CLAUDE.md` mandates "Open Sans only, weights 400 and 600". Nothing in this repo used to
provide it: `fc-match "Open Sans"` resolved to DejaVu Sans, and because DejaVu has no
SemiBold face, weight 600 snapped to Bold. Every screen rendered in the wrong typeface at
the wrong weight, and no check could see it — `verify-type` compares the emitted
`font-weight: 600` against the extract's "SemiBold", and both are correct while the
browser paints something else.

These are the two weights the design system uses, latin subset, from
`@fontsource/open-sans` 5.3.0 (Apache-2.0 — see LICENSE). Vendored as assets rather than
added as a dependency, the same way the 293 icons are.

`scripts/build-fonts-css.mjs` inlines them into `dist/fonts.css` as data: URIs. A `url()`
path would fail silently in an artifact or a `.dc.html` canvas — the same invisible
failure that lost the header artwork.
