// What size window should a screen be measured in?
//
// WHY THIS EXISTS. Every check opened Playwright with the default 1280x720 context, which was
// invisible for as long as every prototype was narrower than that — the Case screens are 516.
// The first 1600px design walked straight into it: `.magazine` measured 1240 against Figma's
// 1600, `.body-panel` 1160 against 1520, and the numbers were not wrong. The page really was
// 1240 wide, because `max-width: 100%` had shrunk it to fit a window smaller than the design.
//
// A check that reports a 1600px frame as 1240px is not measuring the screen; it is measuring
// the window. Same shape as F-020 through F-026: the mechanism could not distinguish "this
// design is the wrong width" from "this window is too narrow", and reported the first.
//
// So the screen says how wide it must be measured, in its own extract:
//
//   "viewport": { "width": 1680, "height": 1200 }
//
// Absent, the old 1280x720 stands — which keeps every existing screen measuring exactly as
// before, so adopting this changes no result that was already right.
import { readFileSync, existsSync } from 'node:fs';

export const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

export function viewportFor(builtHtmlPath) {
  const extractPath = String(builtHtmlPath).replace(/\.html$/, '.figma.json');
  if (!existsSync(extractPath)) return { ...DEFAULT_VIEWPORT };
  let design;
  try { design = JSON.parse(readFileSync(extractPath, 'utf8')); } catch { return { ...DEFAULT_VIEWPORT }; }
  const v = design && design.viewport;
  if (!v || typeof v !== 'object') return { ...DEFAULT_VIEWPORT };
  const width = Number(v.width), height = Number(v.height);
  // A declared viewport narrower than the default is almost certainly a typo, and it would
  // silently shrink a screen that used to measure correctly. Take the wider of the two.
  return {
    width: Number.isFinite(width) ? Math.max(width, DEFAULT_VIEWPORT.width) : DEFAULT_VIEWPORT.width,
    height: Number.isFinite(height) ? Math.max(height, DEFAULT_VIEWPORT.height) : DEFAULT_VIEWPORT.height,
  };
}
