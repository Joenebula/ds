// Which component classes still ship but should not be used on new work.
//
// One reader, three consumers: the stylesheet writes the notice into the class's own comment
// block, the gallery marks the swatch, and the skill reference marks the table. A page author
// reads one of those three and never all of them, so a deprecation that appears in only one
// is a deprecation half the readers never see.
//
// The FILE is the declaration and this is only the parser: it does not decide what is
// deprecated, and it deliberately does not check that the names are real — that needs the
// build's own list of classes, and build-components-css.mjs fails on it there.
import { readFileSync, existsSync } from 'node:fs';

export const DEPRECATED_PATH = 'tokens/_raw/deprecated-classes.tsv';

export function readDeprecated(path = DEPRECATED_PATH) {
  const out = new Map();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [component, supersededBy, nodeId, decided, decidedBy, why] = line.split('\t');
    out.set(component, { supersededBy, nodeId, decided, decidedBy, why });
  }
  return out;
}
