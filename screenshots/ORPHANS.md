# Captures with no source page

Every other file in this directory is reproducible: `check-screenshots.mjs` re-shoots it from
its source page and fails if the committed picture is not byte-for-byte what the current build
produces. That is what stops a screenshot going stale while everyone goes on looking at it.

These eight cannot be, because the page they were taken from no longer exists in the repo.
They are one-off diagnostic captures kept from earlier work. **Any dark one among them predates
the pre-paint fix in `shoot.mjs`** — see CLAUDE.md, "Checking any screen" — so its colours may
be the light-mode ones on a dark ground. Do not read a colour off any of them.

They are listed here rather than deleted because deleting someone else's evidence is their call,
not the check's. Adding a name to this list is how you say "this one is a keepsake"; anything
not listed and not reproducible fails.

| File | What it was |
|---|---|
| `deep.light.png`, `deep.dark.png` | a deep-nesting test page |
| `field-icons.light.png`, `field-icons.dark.png` | the form-field icon placement work |
| `form-fields.light.png` | an early form-field page (no dark twin was taken) |
| `responsive-desktop.png`, `responsive-mobile.png` | the responsive pass, one width each |
| `search-payroll.*`, `search-timesheet.*` | the `Search navigation` template work |
| `stretched-tiles.png` | the stat tiles before the hug fix — the "before" for that section |
