'use strict';
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { test } = require('node:test');
const { createPreview } = require('../../tests/preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const dir = 'rpg-dual-continent-test';
const screenshotDir = process.env.CH3_SCREENSHOTS;

async function boot(page, origin, section) {
  await page.route(/^https?:\/\/[^/]+\//, route =>
    route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.goto(origin + '/' + dir + '/?guest=1&sandbox=1&devtools=1&ch3test=' + section);
  await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
  await page.locator('#btn-start-gate-go').click();
  await page.waitForFunction(expected =>
    !gameStartGateActive && !advIntroActive && !ocActive && gameState === 'playing' &&
    debugC34().ready && debugC34().section === expected, section, { timeout: 90000 });
}

async function openSection(page, section) {
  await page.evaluate(() => {
    if (rpgActive) rpgClose('skipped');
    pauseGame();
  });
  const entry = page.locator('#btn-pause-test-c2-3-4-' + section);
  if (!await entry.isVisible()) await page.locator('#p2-dev-toggle').click();
  await entry.click();
  await page.waitForFunction(expected =>
    gameState === 'playing' && debugC34().ready && debugC34().section === expected,
  section, { timeout: 90000 });
}

async function record(page, name) {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: screenshotDir + '/' + name + '.png' });
}

test('Chapter 3 terrain and water through the dual-continent entry', { timeout: 300000 }, async t => {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, origin, 'start');

  await t.test('start, assets, initial terrain and waterfall dialogue', async () => {
    const report = await page.evaluate(() => {
      const d = debugC34();
      const all = Object.values(chapter3ArtCatalog);
      const terrain = [];
      const drawTerrain = c34Art.terrain;
      try {
        c34Art.terrain = (...args) => terrain.push(args);
        c34DrawTerrain(0);
      } finally { c34Art.terrain = drawTerrain; }
      return {
        stage: d.stage, section: d.section, dev: d.dev, x: player.x, version: d.version,
        art: d.art, frames: all.filter(a => a.ms).reduce((n, a) => n + a.files.length, 0),
        folders: new Set(all.flatMap(a => a.files.map(f => f.split('/')[0]))).size,
        p3: terrain.some(a => a[0] === C34_LAY.p3.x && a[6] === true),
        gaps: d.gaps.length, pits: d.pits, floors: d.floors, falls: c34Falls().map(f => f.id),
        stock: d.umb.testStock, willFloat: d.wd.angles, tree: d.trees[0]?.slopeTo,
      };
    });
    assert.equal(report.stage, '3-4');
    assert.equal(report.section, 'start');
    assert.equal(report.dev, true);
    assert.match(report.version, /v0\.4\.13-ch3-water-terrain/);
    assert.ok(report.x < 620);
    assert.deepEqual(report.art, { loaded: 76, failed: [] });
    assert.equal(report.frames, 58);
    assert.equal(report.folders, 16);
    assert.equal(report.p3, true);
    assert.ok(report.gaps > 0);
    assert.ok(report.pits.some(p => p.c34 === 'abyss' && p.wd));
    assert.deepEqual(report.floors, []);
    assert.deepEqual(report.falls, ['WA', 'WB']);
    assert.equal(report.stock, 9);
    assert.deepEqual(report.willFloat, [45, 60]);
    assert.ok(report.tree);
    await record(page, 'desktop-3-4-start');

    await page.evaluate(() => {
      const f = c34Falls()[0];
      player.x = f.x - player.w / 2;
      player.y = f.baseY ?? GROUND_Y - player.h;
      activeSlot = 'sword';
      cameraX = Math.max(0, player.x - 380);
    });
    await page.waitForFunction(() => rpgActive?.id === 'c34_first_wet');
    const wet = await page.evaluate(() => ({
      line: rpgActive.pages[0].text, face: rpgActive.pages[0].face, t: c34.wet, level: c34.level,
    }));
    assert.equal(wet.line, '啊！！我全身都溼了...身體變好重好難動...');
    assert.equal(wet.face, 'balloonv_surprised');
    assert.equal(wet.t, 1800);
    assert.equal(wet.level, 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => c34.wet), 1800);
    await record(page, 'desktop-first-wet');
  });

  await openSection(page, 'pool');
  await t.test('pool fills only on rightward diversion, follows water level and drains wetness per wind entry', async () => {
    const actual = await page.evaluate(() => {
      const { x, baseY } = c34Pool();
      const f = c34Falls()[1], pad = platforms.find(p => p.c34Pad);
      function put(cx, y, direction, slot) {
        Object.assign(player, { x: cx - player.w / 2, y: y - player.h, vx: 0, vy: 0, facingRight: direction, onGround: true });
        activeSlot = slot;
      }
      const initial = { surface: c34SurfaceY(), pad: pad.y, wet: c34.wet, section: c34.section, x: player.x };
      put(f.x, baseY, false, 'umbrella');
      c34Step();
      const left = { stream: c34.stream, level: c34.level, wet: c34.wet };
      put(f.x, baseY, true, 'umbrella');
      for (let i = 0; i < 180; i++) c34Step();
      const half = { stream: c34.stream, level: c34.level, surface: c34SurfaceY(), pad: pad.y, wet: c34.wet };
      put(f.x - 80, baseY, true, 'umbrella');
      for (let i = 0; i < 60; i++) c34Step();
      const stop = { stream: c34.stream, level: c34.level, surface: c34SurfaceY() };
      put(f.x, baseY, true, 'umbrella');
      for (let i = 0; i < 240; i++) c34Step();
      const full = { level: c34.level, surface: c34SurfaceY(), pad: pad.y };
      put(pad.x + pad.w * 0.8, pad.y, true, 'sword');
      for (let i = 0; i < 80; i++) c34Step();
      const stood = { sink: pad.c34Sink, angle: pad.c34Angle, occupied: pad.c34Occupied,
        floorError: Math.abs(player.y + player.h - c34PlatformSurface(pad)) };
      put(f.x - 80, baseY, true, 'sword');
      for (let i = 0; i < 65; i++) c34Step();
      const released = { sink: pad.c34Sink, angle: pad.c34Angle, occupied: pad.c34Occupied };

      c34.wet = C34.water.steps;
      c34.swim = false;
      const wet = c34Motion();
      const priorWdFlow = wdFlowAt;
      let wind = true;
      let windValues, dryLine, dryFace;
      try {
        wdFlowAt = () => wind ? 1 : 0;
        c34.inWind = false;
        c34StepWet(false);
        const dry = rpgQueue.find(q => q.scene.id === 'c34_first_dry_wind')?.scene.pages[0];
        dryLine = dry?.text; dryFace = dry?.face;
        windValues = [c34.wet];
        c34StepWet(false); windValues.push(c34.wet);
        wind = false; c34StepWet(false); windValues.push(c34.wet);
        wind = true; c34StepWet(false); windValues.push(c34.wet);
        c34.wet = 2; c34.inWind = false; c34StepWet(false); windValues.push(c34.wet);
      } finally { wdFlowAt = priorWdFlow; }
      const taught = rpgQueue.filter(q => q.scene.id === 'c34_first_dry_wind').length;
      return { x, baseY, initial, left, half, stop, full, stood, released, wet, windValues, dryLine, dryFace, taught };
    });
    const { initial, left, half, stop, full, stood, released, wet } = actual;
    assert.equal(initial.section, 'pool');
    assert.ok(initial.x < actual.x);
    assert.equal(initial.surface - actual.baseY, 64);
    assert.equal(initial.wet, 0);
    assert.deepEqual(left, { stream: 'left', level: 0, wet: 0 });
    assert.equal(half.stream, 'right');
    assert.equal(half.level, 0.5);
    assert.equal(half.wet, 0);
    assert.ok(half.surface < initial.surface);
    assert.ok(half.pad < initial.pad);
    assert.equal(stop.stream, 'none');
    assert.equal(stop.level, half.level);
    assert.equal(stop.surface, half.surface);
    assert.equal(full.level, 1);
    assert.equal(full.surface - actual.baseY, 8);
    assert.ok(full.pad < half.pad);
    assert.ok(stood.sink > 2 && stood.sink < 5);
    assert.ok(stood.angle > 0 && stood.angle < 0.026);
    assert.equal(stood.occupied, true);
    assert.ok(stood.floorError < 0.01);
    assert.ok(Math.abs(released.sink) < 0.01);
    assert.ok(Math.abs(released.angle) < 0.001);
    assert.equal(released.occupied, false);
    assert.deepEqual(wet, { move: 0.7, height: 0.7, swim: false });
    assert.deepEqual(actual.windValues, [1620, 1619, 1618, 1438, 0]);
    assert.equal(actual.dryLine, '哇！這裡的風讓我身體乾了一些！！');
    assert.equal(actual.dryFace, 'balloonv_happy');
    assert.equal(actual.taught, 1);
    await record(page, 'desktop-3-4-full-pool');
  });

  await t.test('swimming, jump ratios, exit route and test-save isolation', async () => {
    const actual = await page.evaluate(() => {
      if (rpgActive) rpgClose('skipped');
      rpgQueue.length = 0;
      const pool = c34Pool(), pad = platforms.find(p => p.c34Pad);
      const bank = platforms.find(p => p.c34Id === 'BANK');
      const realSave = localStorage.getItem(SAVE_KEY);
      const hp = player.hp;
      Object.assign(player, { x: pool.x + 30, y: c34SurfaceY() + 9 - player.h, vx: 0, vy: 3, onGround: false });
      c34Step();
      const onWater = { swim: c34.swim, hp: player.hp === hp, feet: player.y + player.h - c34SurfaceY(),
        wet: c34.wet, count: c34.ripples.length, motion: c34Motion() };
      const height = speed => {
        let rise = 0, v = speed;
        while ((v -= GRAVITY) > 0) rise += v;
        return rise;
      };
      const normal = height(JUMP_FORCE);
      const jump = [height(c34JumpSpeed(JUMP_FORCE, 0.4)) / normal, height(c34JumpSpeed(JUMP_FORCE, 0.7)) / normal];
      keys.Space = true;
      updatePlayer(1);
      const swimsOut = { swimming: c34.swim, vy: player.vy };
      keys.Space = false;
      rpgQueue.length = 0;
      c34.swim = false; c34.wet = 0;

      // Start at the right end of the fully raised pad, then make its normal in-game jump.
      player.x = pad.x + pad.w - 2;
      player.y = c34PlatformSurface(pad) - player.h;
      player.vx = player.vy = 0;
      player.onGround = true; cameraX = Math.max(0, player.x - 400);
      keys.Space = true; keys.ArrowRight = true;
      let landed = false;
      for (let i = 0; i < 60; i++) {
        updatePlayer(1);
        keys.Space = false;
        if (player.onGround && Math.abs(player.y + player.h - bank.y) < 0.1 && player.x + player.w > bank.x) {
          landed = true;
          break;
        }
      }
      keys.ArrowRight = false;
      const beforeExit = c34.log.filter(e => e.ev === 'complete').length;
      player.x = FINISH_X; player.y = bank.y - player.h; checkFinish(); checkFinish();
      const afterExit = c34.log.filter(e => e.ev === 'complete').length;
      return { onWater, jump, swimsOut, landed, beforeExit, afterExit,
        saved: localStorage.getItem(SAVE_KEY) === realSave, done: c2Proto.done };
    });
    assert.equal(actual.onWater.swim, true);
    assert.equal(actual.onWater.hp, true);
    assert.equal(actual.onWater.feet, 20);
    assert.equal(actual.onWater.wet, 1800);
    assert.ok(actual.onWater.count > 0);
    assert.equal(actual.onWater.motion.move, 0.5);
    assert.equal(actual.onWater.motion.height, 0.4);
    assert.ok(Math.abs(actual.jump[0] - 0.4) < 0.01);
    assert.ok(Math.abs(actual.jump[1] - 0.7) < 0.01);
    assert.equal(actual.swimsOut.swimming, false);
    assert.ok(actual.swimsOut.vy < 0);
    assert.equal(actual.landed, true);
    assert.equal(actual.beforeExit, 0);
    assert.equal(actual.afterExit, 1);
    assert.equal(actual.done, true);
    assert.equal(actual.saved, true);
  });

  await t.test('mobile-size pool entry and stage-specific assets', async () => {
    const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    mobile.on('pageerror', error => errors.push(error.message));
    await boot(mobile, origin, 'pool');
    const state = await mobile.evaluate(() => ({
      ready: debugC34().ready, stage: debugC34().stage, cam: c34.camY,
      groups: ['3-1', '3-2', '3-3', '3-4'].map(sid => getAssetGroupsForLevel(getLevelIndexByStageId(sid))),
      canvas: document.querySelector('canvas').getBoundingClientRect().width,
    }));
    assert.equal(state.ready, true);
    assert.equal(state.stage, '3-4');
    assert.ok(state.cam > 0 && state.cam <= 430);
    assert.ok(state.canvas > 0 && state.canvas <= 844);
    assert.ok(state.groups.every(groups => groups.includes('chapter3vertical')));
    assert.ok(state.groups.slice(0, 3).every(groups => !groups.includes('c34canyon')));
    assert.ok(state.groups[3].includes('c34canyon'));
    await record(mobile, 'mobile-3-4-pool');
    await mobile.close();
  });
  assert.deepEqual(errors, []);
});
