# Working files — NOT part of the pipeline

Scratch builds used to test the Figma-to-output path. Nothing in here is a pipeline
artefact, a reference implementation, or an input to anything.

- **Never extracted from.** These are built FROM a Figma file; no tokens, components or
  icons ever travel back out of here into `tokens/_raw/` or `dist/`.
- **Checked by `npm run verify` — this is the direction that matters.** This line used to read
  *"Not checked by `npm run verify`. That discovers screens from `prototypes/` only."* It was true
  once and is the exact opposite of the truth now: `verify-screens.mjs` walks `working/` and
  `prototypes/` both, and pointing it here for the first time found a shape check that could only
  run on the screen it was written for and 35 untagged elements on the page meant to be handed to a
  developer. A README asserting a check does not cover you is worse than one saying nothing.
- **Not a design deliverable.** Do not hand these to a developer.

Two screens, and they do not share a source — this said "current contents build from Case
Management (Copy)", which is true of one of them:

| | its design | |
|---|---|---|
| `case-mgmt-my-team` | **Case Management (Copy)** `kuX4KDIN0u4axsKTELYlzW` `17708:13612` | a test-only file, per CLAUDE.md |
| `button` | **People First** `aRWjBnTvdLiG50xtwodGwH` `10730:115188` | the real library |

`button` carries `button.figma.json` and `button.figma.xml` — a saved Figma read of the design it
copies, and the first screen extract in this repo. It is what switches the `frame`, `content` and
`source` axes on. `case-mgmt-my-team` has none, and cannot: read on 2026-09-12, the Case Management
file opens, lists exactly one page (`Thumbnail`), and does not contain `17708:13612` at all.
