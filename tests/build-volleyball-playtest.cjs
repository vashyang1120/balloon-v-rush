'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, '..');
const previewDir = 'playtest-volleyball-five-point-test-1';
const csp = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'\">";

async function build(outputRoot) {
  const output = path.join(outputRoot, previewDir);
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(output);
  for (const file of ['index.html', 'playtest-guard.js']) {
    await fs.copyFile(path.join(root, previewDir, file), path.join(output, file));
  }
  await fs.mkdir(path.join(output, 'minigames'));
  await fs.mkdir(path.join(output, 'motion-comic'));
  for (const dir of ['assets', 'rpg-continent1-universe', 'minigames/volleyball', 'minigames/whack-a-mole', 'motion-comic/player', 'motion-comic/assets', 'motion-comic/projects']) {
    await fs.cp(path.join(root, dir), path.join(output, dir), {
      recursive: true,
      filter: entry => !['tests', 'editor'].includes(path.basename(entry)) && !entry.endsWith('.md'),
    });
  }
  const home = path.join(output, 'rpg-continent1-universe', 'index.html');
  const html = await fs.readFile(home, 'utf8');
  if (!html.includes('<head>')) throw new Error('Missing HTML head in adventure entry');
  await fs.writeFile(home, html
    .replace('<head>', '<head>\n  ' + csp + '\n  <script src="../playtest-guard.js"></script>')
    .replace(/^\s*<script src="https:\/\/[^"]+"><\/script>/gm, ''));
  console.log(output);
}

module.exports = { build, previewDir };
if (require.main === module) {
  const target = process.argv[2];
  if (!target) throw new Error('Provide an output directory outside the preview source directory.');
  build(path.resolve(target)).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
