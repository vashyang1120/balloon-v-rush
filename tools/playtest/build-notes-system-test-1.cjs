#!/usr/bin/env node
'use strict';
// Builds playtest-adventure-notes-system-test-1/ from the current development baseline
// (rpg-dual-continent-test/ + rpg-continent1-universe/ + repo-root assets/, minigames/, motion-comic/).
// The package is an isolated acceptance build: its own storage namespace (playtest-guard.js), forced
// guest + sandbox, CSP, and GitHub Raw asset mirroring on the githack preview hosts.
//   node tools/playtest/build-notes-system-test-1.cjs
const { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const repo = join(__dirname, '..', '..');
const NAME = 'playtest-adventure-notes-system-test-1';
const NS = 'balloon-v-rush:adventure-playtest:notes-system-test-1:';
const out = join(repo, NAME);
const CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob: https://raw.githubusercontent.com/vashyang1120/balloon-v-rush/; media-src \'self\' data: blob: https://raw.githubusercontent.com/vashyang1120/balloon-v-rush/; font-src \'self\' data:; connect-src \'self\' data: blob: https://raw.githubusercontent.com/vashyang1120/balloon-v-rush/; frame-src \'self\'; base-uri \'self\'; form-action \'none\'">';

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const skipTests = src => !/[\\/]tests([\\/]|$)/.test(src.slice(repo.length));
for (const dir of ['rpg-dual-continent-test', 'rpg-continent1-universe']) cpSync(join(repo, dir), join(out, dir), { recursive: true, filter: skipTests });
for (const dir of ['assets', 'minigames', 'motion-comic']) cpSync(join(repo, dir), join(out, dir), { recursive: true, filter: skipTests });

// Guard: Revision 5 guard with this package's namespace; guest + sandbox forced on both game folders.
let guard = readFileSync(join(repo, 'playtest-adventure-gameplay-polish-qa-rev5', 'playtest-guard.js'), 'utf8');
guard = guard.replace("const namespace = 'balloon-v-rush:adventure-playtest:gameplay-polish-qa-rev5:';", "const namespace = '" + NS + "';");
guard = guard.replace("if (location.pathname.startsWith(previewRoot.pathname + 'rpg-dual-continent-test/')) {",
  "if (['rpg-dual-continent-test/', 'rpg-continent1-universe/'].some(dir => location.pathname.startsWith(previewRoot.pathname + dir))) {");
if (!guard.includes(NS) || !guard.includes("'rpg-continent1-universe/'")) throw new Error('guard patch failed');
writeFileSync(join(out, 'playtest-guard.js'), guard);

function patchIndex(rel, extra) {
  const file = join(out, rel);
  let html = readFileSync(file, 'utf8');
  const head = '<meta charset="UTF-8" />';
  if (!html.includes(head)) throw new Error('no charset in ' + rel);
  html = html.replace(head, head + '\n  ' + CSP + '\n  <script src="../playtest-guard.js"></script>');
  // The universe SDK lives on another origin; the isolated playtest never talks to it (guest only).
  html = html.replace(/\s*<script src="https:\/\/vashyang1120\.github\.io\/balloon-v-universe\/universe\/shared\/universe-sdk\.js[^"]*"><\/script>/, '');
  if (extra) html = extra(html);
  writeFileSync(file, html);
}
patchIndex('rpg-dual-continent-test/index.html');
patchIndex('rpg-continent1-universe/index.html', html => html.replace(
  /(<script src="\.\.\/assets\/adventure\/adventure-notes\.js[^"]*" data-continents="1"><\/script>)/,
  '$1\n  <script src="../playtest-notes-shortcuts.js"></script>'));
cpSync(join(__dirname, 'playtest-notes-shortcuts.js'), join(out, 'playtest-notes-shortcuts.js'));
cpSync(join(__dirname, 'notes-system-test-1-landing.html'), join(out, 'index.html'));

const sha = process.env.BUILD_BASE || '';
writeFileSync(join(out, 'build.json'), JSON.stringify({
  version: 'adventure-v0.4.13-notes-system-test-1',
  baseline: '93e3c2dee32c3a94f0d2eef917d15f99c6ce8805',
  branchBase: sha || undefined,
  sources: { dualSource: 'rpg-dual-continent-test', continent1: 'rpg-continent1-universe', notesModule: 'assets/adventure/adventure-notes.js' },
  storageNamespace: NS,
  entries: {
    home: 'index.html',
    continent1NoteTest: 'rpg-continent1-universe/index.html?notesqa=note23',
    continent1HomeNotes: 'rpg-continent1-universe/index.html?notesqa=home',
    continent1HomeNotesWithBossNote: 'rpg-continent1-universe/index.html?notesqa=homeboss',
    knowledgeNote34: 'rpg-dual-continent-test/index.html?devtools=1&ch3test=start&qago=note34',
    knowledgeNote34Flight: 'rpg-dual-continent-test/index.html?devtools=1&ch3test=start&qago=note34fly',
    continent2HomeNotes: 'rpg-dual-continent-test/index.html?devtools=1&ch3test=3-1&qago=noteshome',
    continent1NoteInDual: 'rpg-dual-continent-test/index.html?devtools=1&ch3test=start&qago=note23',
    fullAdventure: 'rpg-dual-continent-test/index.html',
  },
}, null, 2) + '\n');
if (!existsSync(join(out, 'assets', 'adventure', 'adventure-notes.js'))) throw new Error('module missing');
console.log('built ' + NAME);
