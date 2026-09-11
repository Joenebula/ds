#!/usr/bin/env node
// Pulls component artwork (raster fills that no colour variable can describe)
// out of the live session transcript and writes it to assets/component-art/
// plus tokens/_raw/component-art.tsv.
//
//   node scripts/extract-component-art.mjs [transcript.jsonl]
//
// Why this exists: the component extract only ever captured an outer box plus
// three colour slots (fill / stroke / text). A component whose visual IS an
// image — the header swoosh is a 1920x86 raster, not a vector — bound no
// colour variable, so uncaptured-reasons.tsv recorded "nothing to put in a
// stylesheet" and the artwork was dropped. The header then rendered as an
// empty transparent box and got hand-written instead. This closes that hole.
//
// Same transcript-harvest shape as extract-icons.mjs: Figma emits base64 in
// chunks, this reassembles them. Retyping ~180KB of base64 through the
// conversation would gain nothing.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// What to pull, and which Figma component variant each piece of artwork
// belongs to. The slug is the identity assigned at export time, so it cannot
// be recovered from Figma afterwards — it lives here, with the extractor, and
// the TSV below is generated from it.
const EXPORTS = {
  'header-background-desktop-light': ['Default header background', 'Breakpoint=Desktop, Darkmode=False'],
  'header-background-desktop-dark':  ['Default header background', 'Breakpoint=Desktop, Darkmode=True'],
  'header-background-tablet-light':  ['Default header background', 'Breakpoint=Tablet, Darkmode=False'],
  'header-background-tablet-dark':   ['Default header background', 'Breakpoint=Tablet, Darkmode=True'],
  'header-background-mobile-light':  ['Default header background', 'Breakpoint=Mobile, Darkmode=False'],
  'header-background-mobile-dark':   ['Default header background', 'Breakpoint=Mobile, Darkmode=True'],
};

const dir = '/root/.claude/projects/-home-user-ds';
const file = process.argv[2] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    .map(f => join(dir, f)).sort().pop();

// Every string in the transcript that looks like an art chunk header.
//   ART <slug> <format> <part> <total>\n<base64>
const chunks = [];
const walk = v => {
  if (typeof v === 'string') {
    if (/^ART\t[a-z0-9-]+\t[a-z]+\t\d+\t\d+\n/.test(v)) chunks.push(v);
  } else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}

// slug -> { format, total, parts: Map<index, base64> }. A re-export supersedes.
const assets = new Map();
for (const c of chunks) {
  const nl = c.indexOf('\n');
  const [, slug, format, part, total] = c.slice(0, nl).split('\t');
  const body = c.slice(nl + 1);
  if (!assets.has(slug)) assets.set(slug, { format, total: +total, parts: new Map() });
  const a = assets.get(slug);
  a.format = format;
  a.total = +total;
  a.parts.set(+part, body);
}

mkdirSync('assets/component-art', { recursive: true });
const rows = [];
const missing = [];
for (const [slug, a] of [...assets].sort()) {
  if (a.parts.size !== a.total) {
    missing.push(`${slug}: have ${a.parts.size} of ${a.total} parts`);
    continue;
  }
  const b64 = [...Array(a.total).keys()].map(i => a.parts.get(i)).join('');
  const buf = Buffer.from(b64, 'base64');
  const name = `${slug}.${a.format}`;
  const owner = EXPORTS[slug];
  if (!owner) { missing.push(`${slug}: exported but not declared in EXPORTS`); continue; }
  writeFileSync(join('assets/component-art', name), buf);
  rows.push([owner[0], owner[1], slug, name, buf.length].join('\t'));
}
for (const slug of Object.keys(EXPORTS)) {
  if (!assets.has(slug)) missing.push(`${slug}: declared in EXPORTS but never exported`);
}

rows.sort();
writeFileSync('tokens/_raw/component-art.tsv',
  'component\tvariant\tslug\tfile\tbytes\n' + rows.join('\n') + '\n');

// An incomplete asset is a silent half-image, so it fails rather than ships.
if (missing.length) {
  console.error('INCOMPLETE — re-export these:\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log(`${rows.length} component artwork files -> assets/component-art/`);
for (const r of rows) console.log('  ' + r.replace(/\t/g, '  '));
