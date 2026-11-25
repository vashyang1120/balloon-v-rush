#!/usr/bin/env node
'use strict';
// Cross-continent sync check. Reads docs/development/cross-continent-sync/manifest.json and
// verifies that every active build still carries the accepted shared implementation.
//
//   node tools/sync-check/check-cross-continent-sync.cjs           # strict on active builds
//   node tools/sync-check/check-cross-continent-sync.cjs --archived # also report archived snapshots
//   node tools/sync-check/check-cross-continent-sync.cjs --json     # machine-readable result
//
// Exit code 1 when an active build fails a check.
const { readFileSync, existsSync } = require('node:fs');
const { join, resolve, posix } = require('node:path');
const { createHash } = require('node:crypto');

const repo = resolve(__dirname, '..', '..');
const manifest = JSON.parse(readFileSync(join(repo, 'docs/development/cross-continent-sync/manifest.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const results = [];

function gameDir(id) {
  const b = manifest.builds[id];
  if (!b) throw new Error('Unknown build ' + id);
  return b.game ? posix.join(b.root, b.game) : b.root;
}
function read(rel) {
  const file = join(repo, rel);
  return existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
}
function sha(text) { return createHash('sha256').update(text).digest('hex').slice(0, 12); }
function record(kind, feature, build, ok, detail) {
  const status = manifest.builds[build]?.status || 'active';
  results.push({ kind, feature, build, status, ok, detail });
}

for (const rule of manifest.identical) {
  const canonical = read(rule.canonical);
  for (const copy of rule.copies) {
    const rel = posix.join(manifest.builds[copy.build].root, copy.path);
    const text = read(rel);
    if (canonical == null) { record('identical', rule.feature, copy.build, false, 'canonical missing: ' + rule.canonical); continue; }
    if (text == null) { record('identical', rule.feature, copy.build, false, 'copy missing: ' + rel); continue; }
    record('identical', rule.feature, copy.build, text === canonical,
      text === canonical ? rel + ' = ' + rule.canonical + ' (' + sha(text) + ')'
        : rel + ' (' + sha(text) + ') differs from ' + rule.canonical + ' (' + sha(canonical) + ') — stale copy?');
  }
}

for (const rule of manifest.contains) {
  for (const build of rule.builds) {
    const rel = posix.normalize(posix.join(gameDir(build), rule.file));
    const text = read(rel);
    if (text == null) { record('contains', rule.feature, build, false, 'missing file ' + rel); continue; }
    const missing = rule.patterns.filter(p => !text.includes(p));
    const assetRoot = manifest.builds[build].root === 'rpg-continent1-universe' ? '' : manifest.builds[build].root;
    const missingAssets = (rule.assets || []).filter(a => !existsSync(join(repo, assetRoot, a)));
    record('contains', rule.feature, build, !missing.length && !missingAssets.length,
      missing.length || missingAssets.length ? rel + ' lacks: ' + [...missing, ...missingAssets].join(' | ') : rel);
  }
}

for (const rule of manifest.forbidden) {
  for (const build of rule.builds) {
    const hits = [];
    for (const file of rule.files) {
      const rel = posix.normalize(posix.join(gameDir(build), file));
      const text = read(rel);
      if (text == null) continue;
      for (const p of rule.patterns) if (text.includes(p)) hits.push(rel + ': ' + p);
    }
    record('forbidden', rule.feature, build, !hits.length, hits.length ? hits.join(' | ') + ' — ' + rule.reason : 'none');
  }
}

for (const rule of manifest.cacheTags) {
  const rel = posix.normalize(posix.join(gameDir(rule.build), rule.file));
  const text = read(rel);
  if (text == null) { record('cacheTag', rel, rule.build, false, 'missing'); continue; }
  const bad = [];
  for (const name of [...(rule.scripts || []), ...(rule.styles || [])]) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const m = text.match(new RegExp('(?:src|href)=\\\\?"' + escaped + '\\?v=([^"\\\\]+)'));
    if (!m) bad.push(name + ' has no ?v=');
    else if (m[1] !== rule.expected) bad.push(name + '?v=' + m[1]);
  }
  record('cacheTag', 'cache-tags', rule.build, !bad.length, bad.length ? rel + ': ' + bad.join(', ') + ' (expected ' + rule.expected + ')' : rel);
}

if (args.has('--archived')) {
  for (const [id, b] of Object.entries(manifest.builds)) {
    if (b.status !== 'archived') continue;
    for (const rule of manifest.contains.filter(r => r.builds.includes('rev4'))) {
      const rel = posix.normalize(posix.join(gameDir(id), rule.file));
      const text = read(rel);
      if (text == null) continue;
      const missing = rule.patterns.filter(p => !text.includes(p));
      record('archived', rule.feature, id, !missing.length, missing.length ? 'lacks ' + missing.length + ' accepted marker(s)' : 'ok');
    }
  }
}

const failed = results.filter(r => !r.ok && r.status === 'active');
if (args.has('--json')) {
  console.log(JSON.stringify({ ok: !failed.length, results }, null, 2));
} else {
  for (const r of results) {
    const mark = r.ok ? 'PASS' : r.status === 'active' ? 'FAIL' : 'WARN';
    console.log(mark.padEnd(5) + r.kind.padEnd(10) + (r.build + '').padEnd(12) + r.feature.padEnd(32) + r.detail);
  }
  console.log('\n' + (failed.length ? failed.length + ' active check(s) failed.' : 'All active cross-continent checks passed.') +
    ' (' + results.filter(r => r.status === 'active').length + ' active checks)');
}
process.exit(failed.length ? 1 : 0);
