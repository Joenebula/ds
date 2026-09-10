# Avatar photographs

Drop images here and `npm run build` turns them into `dist/avatars.css`.

**Naming.** The filename is the binding key, lowercased and hyphenated:

```
assets/avatars/aisha-bello.png  ->  <span class="avatar pf-avatar-photo" data-avatar="aisha-bello">AB</span>
```

`.png`, `.jpg`, `.jpeg` and `.webp` are read; anything else is ignored.

**Size.** Avatars render at 24-36px, so 96px square is plenty and keeps the base64 small.
They are inlined rather than linked because an artifact or a `.dc.html` canvas cannot
reference a local file — the same reason `dist/fonts.css` is inlined.

**A missing file is not a broken avatar.** The photo covers the initials rather than
replacing them, so anything with no matching file degrades to a monogram.

## Why these are not in the library

`tokens/_raw/uncaptured-reasons.tsv` records the reason, and it is the right one:

```
People          People   its variants are sample content (one per fictional employee), not design
Profile image   People   no variant binds a colour variable in Figma — nothing to put in a stylesheet
```

A photograph is not a design token. Figma keeps one variant per fictional employee as
sample content, which is why `[S] People` — the avatar-and-name row — is captured as
`.pf-s-people` while the faces are not.

## Sample data only

These portraits stand in for employees who do not exist, and the prototypes they appear in
include a disciplinary case. **Never pair one with a real person's record**, and do not add
a photograph of an identifiable person without checking you have the right to redistribute
it in this repository.
