#!/usr/bin/env node
// Does the Figma frame this screen copies fit its own contents?
//
//   node scripts/check-frame-clip.mjs prototypes/absence-requests.html
//   node scripts/check-frame-clip.mjs --self-test
//
// WHY THIS EXISTS. `6953:22156` is fixed at 1600x1085 while its own children run to 1507.
// Figma clips the overflow, so the Outcomes pills are sliced through the middle and the entire
// `Related learning` block — four cards, 40% of the screen — is simply never drawn. Nothing
// says so. The frame looks like a finished screen that happens to end there.
//
// It surfaced only because get_metadata and the renderer returned different heights and I
// happened to check both. Had I trusted either one alone I would have built a confident,
// verified, wrong screen: the renderer's 840 silently drops a third of the design, and the
// metadata's 1085 is a number that describes nothing at all.
//
// A HOUSE RULE IS NOT A CHECK. The rule now is that Figma frames show the full screen. Good —
// that fixes it at source, which beats anything this pipeline can do. But conventions are kept
// right until they quietly are not, and this failure is silent: a clipped frame and a short
// screen are the same picture. So the rule gets a detector.
//
// FAIL, UNLESS THE ANSWER IS ALREADY WRITTEN DOWN. A clipping frame is a defect in the design
// file, not in the build, and a screen whose source is a legacy frame should not hold the suite
// red forever. So the extract may declare it:
//
//   "sourceClips": {
//     "6953:22156": { "overflow": 422, "decision": "build the full content", "why": "..." }
//   }
//
// An undeclared clip fails. A declared one passes and is counted. That is the same shape as an
// `accept` block on a type divergence: the point was never to forbid the situation, it was to
// stop it going unnoticed.
import { readFileSync, existsSync } from 'node:fs';

const TOLERANCE = 1;   // px. Figma centres a child half a pixel out of its frame all the time.

// ---------------------------------------------------------------------------
// Figma's metadata XML is regular enough to walk directly: one tag per node, attributes on the
// open tag, children nested, `hidden="true"` on anything not drawn. Coordinates are relative to
// the parent, which is what makes the comparison below meaningful.
export function parse(xml) {
  const tag = /<(\/?)([a-z-]+)([^>]*?)(\/?)>/gi;
  const attr = /([a-z-]+)="([^"]*)"/gi;
  const root = { children: [] };
  const stack = [root];
  let m;
  while ((m = tag.exec(xml))) {
    const [, closing, name, rest, selfClosing] = m;
    if (closing) { if (stack.length > 1) stack.pop(); continue; }
    const node = { tag: name, children: [] };
    let a;
    attr.lastIndex = 0;
    while ((a = attr.exec(rest))) {
      const v = a[2];
      node[a[1]] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    }
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root.children;
}

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function findClips(nodes, declared = {}) {
  const clips = [];
  let framesChecked = 0;

  const walk = (node) => {
    const kids = node.children.filter((k) => k.hidden !== 'true' && k.width != null && k.height != null);
    if (kids.length && node.width != null && node.height != null) {
      framesChecked++;
      // Children are positioned relative to this node, so a child whose bottom edge lands past
      // this node's height is content Figma will not draw.
      let bottom = 0, right = 0, top = 0, left = 0;
      for (const k of kids) {
        bottom = Math.max(bottom, (k.y || 0) + k.height);
        right = Math.max(right, (k.x || 0) + k.width);
        top = Math.min(top, k.y || 0);
        left = Math.min(left, k.x || 0);
      }
      const over = {
        bottom: bottom - node.height, right: right - node.width,
        top: -top, left: -left,
      };
      const worst = Math.max(over.bottom, over.right, over.top, over.left);
      if (worst > TOLERANCE) {
        clips.push({
          id: node.id, name: node.name,
          width: node.width, height: node.height,
          contentBottom: Math.round(bottom), contentRight: Math.round(right),
          over: Math.round(worst),
          axis: over.bottom === worst ? 'below' : over.right === worst ? 'right of'
              : over.top === worst ? 'above' : 'left of',
          declared: Object.prototype.hasOwnProperty.call(declared, node.id),
        });
      }
    }
    for (const k of node.children) walk(k);
  };
  for (const n of nodes) walk(n);

  return { clips, framesChecked };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: check-frame-clip.mjs <built-screen.html> | --self-test'); process.exit(2); }

  const xmlPath = file.replace(/\.html$/, '.figma.xml');
  if (!existsSync(xmlPath)) {
    // No saved get_metadata means there is nothing to ask the question of. Vacuous, per F-019 —
    // never a pass.
    console.log(`no ${xmlPath} — this screen has no saved get_metadata to check`);
    console.log('nothing to compare against — source frame NOT MEASURED');
    process.exit(2);
  }

  const extractPath = file.replace(/\.html$/, '.figma.json');
  const design = existsSync(extractPath) ? JSON.parse(readFileSync(extractPath, 'utf8')) : {};
  const declared = { ...(design.sourceClips || {}) };
  delete declared.comment;

  const { clips, framesChecked } = findClips(parse(readFileSync(xmlPath, 'utf8')), declared);
  const undeclared = clips.filter((c) => !c.declared);

  for (const c of clips) {
    const head = c.declared ? 'declared' : 'CLIPPED ';
    console.log(`${head} ${c.id} "${c.name}" is ${c.width}x${c.height} but its contents run to `
      + `${c.contentBottom} — ${c.over}px ${c.axis} the frame is never drawn`);
  }
  if (undeclared.length) {
    console.log('');
    console.log('  A frame shorter than its own contents looks exactly like a screen that ends');
    console.log('  there, so the build silently copies whichever height it was handed. Fix the');
    console.log('  frame in Figma, or declare the decision in the extract\'s `sourceClips`.');
  }

  console.log(`\n${framesChecked} frame(s) checked against their own contents, ${clips.length} `
    + `clipping (${clips.length - undeclared.length} declared), ${undeclared.length} undeclared`);
  process.exit(undeclared.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --self-test. The first fixture is the real frame, with its real numbers.
function selfTest() {
  const xml = (body) => `<frame id="F" name="Frame" x="0" y="0" width="1600" height="1085">${body}</frame>`;
  const bar = '<frame id="A" name="White bar" x="0" y="20" width="1600" height="254" />';
  const big = '<frame id="B" name="Layout container" x="0" y="274" width="1600" height="1233" />';
  const fits = '<frame id="B" name="Layout container" x="0" y="274" width="1600" height="700" />';

  const run = (body, declared) => findClips(parse(xml(body)), declared || {}).clips;

  const cases = [
    ['THE REAL ONE — 1085 tall, contents to 1507', () => run(bar + big), (c) =>
      c.length === 1 && c[0].id === 'F' && c[0].over === 422 && !c[0].declared],
    ['a frame that fits its contents', () => run(bar + fits), (c) => c.length === 0],
    ['the same clip, declared in the extract', () => run(bar + big, { F: { decision: 'build the full content' } }),
      (c) => c.length === 1 && c[0].declared],
    ['a hidden child that overflows is not drawn, so not a clip', () =>
      run(bar + '<frame id="H" name="Hidden" x="0" y="274" width="1600" height="1233" hidden="true" />'),
      (c) => c.length === 0],
    ['half a pixel is Figma centring, not a clip', () =>
      run('<frame id="C" name="wrapper" x="0" y="-0.5" width="1600" height="1085.5" />'), (c) => c.length === 0],
    ['overflow to the RIGHT is caught too', () =>
      run('<frame id="W" name="wide" x="0" y="0" width="1900" height="100" />'),
      (c) => c.length === 1 && c[0].axis === 'right of'],
    ['a leaf with no children is not a frame to check', () =>
      findClips(parse('<text id="T" name="t" x="0" y="0" width="10" height="10" />')).framesChecked === 0,
      (v) => v === true],
  ];

  let failures = 0;
  for (const [name, act, ok] of cases) {
    let got;
    try { got = act(); } catch (e) { got = e; }
    if (!ok(got)) {
      failures++;
      console.log(`  MISS ${name}`);
      console.log(`         got ${JSON.stringify(got)}`);
    }
  }

  // The check must not be able to pass by never looking. A frame that clips, run through a
  // finder that always returns nothing, has to fail these cases.
  const blind = () => ({ clips: [], framesChecked: 0 });
  if (blind().clips.length !== 0 || cases.filter(([, , ok]) => { try { return ok(blind().clips); } catch { return false; } }).length > 3) {
    failures++;
    console.log('  MISS a finder that always reports "no clips" must fail most of these cases');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a frame 422px shorter than its own contents '
    + 'and an overflow to the right, told a declared clip from an undeclared one, and left a '
    + 'fitting frame, a hidden child and half a pixel of Figma centring alone');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  await main();
}
