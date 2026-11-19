'use strict';
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { test } = require('node:test');
const { createPreview } = require('../../tests/preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const dir = 'rpg-dual-continent-test';
const screenshotDir = process.env.CH3_SCREENSHOTS;

async function boot(page, origin, section, bagMode) {
  await page.route(/^https?:\/\/[^/]+\//, route =>
    route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  const bag = bagMode ? '&ch3bag=' + bagMode : '';
  await page.goto(origin + '/' + dir + '/?guest=1&sandbox=1&devtools=1&ch3test=' + section + bag);
  await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
  await page.locator('#btn-start-gate-go').click();
  await page.waitForFunction(expected =>
    !assetGateActive && !gameStartGateActive && !advIntroActive && !ocActive && gameState === 'playing' &&
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
    assert.deepEqual(report.willFloat, [30, 45, 60]);
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

  await t.test('first canyon uses the three angles, a safe landing and the two approved hints', async caseTest => {
    const composition = await page.evaluate(() => {
      if (rpgActive) rpgClose('skipped');
      Object.assign(player, { x: 925, y: GROUND_Y - player.h, vx: 0, vy: 0, onGround: true });
      for (let i = 0; i < 100; i++) updateCamera();
      updatePlayer(1);
      const firstHint = rpgQueue.find(q => q.scene.id === 'c34_canyon_arrival');
      const platform = platforms.find(p => p.c34Id === 'P1');
      return {
        inView: platform.x + 25 < cameraX + CANVAS_W,
        high: GROUND_Y - platform.y,
        safe: !enemies.some(e => e.c1dPlat?.x === platform.x),
        firstLine: firstHint?.scene.pages[0].text,
      };
    });
    assert.equal(composition.inView, true);
    assert.equal(composition.high, 190);
    assert.equal(composition.safe, true);
    assert.equal(composition.firstLine, '哇！好大的峽谷...我要怎麼飛到對面去呢？');
    await record(page, 'desktop-3-4-canyon-approach');

    const report = await page.evaluate(() => {
      function run(angle, umbrella, x = 970, wet = false) {
        if (rpgActive) rpgClose('skipped');
        rpgQueue.length = 0;
        Object.assign(player, { x, y: GROUND_Y - player.h, vx: 0, vy: 0,
          onGround: true, facingRight: true, invincible: 0 });
        cameraX = x - 220;
        gameState = 'playing';
        activeSlot = umbrella ? 'umbrella' : 'sword';
        c34.wet = wet ? C34.water.steps : 0;
        c34.swim = false;
        wd.idx = WD_TUNING.angles.indexOf(angle);
        wdResetState(false);
        wd.history.length = 0;
        keys.ArrowRight = true;
        try {
          for (let i = 0; i < 280 && !wd.history.length; i++) {
            update(1);
            if (rpgActive && !wd.history.length) rpgClose('skipped');
          }
        } finally { keys.ArrowRight = false; }
        const route = wd.history.at(-1);
        const platform = platforms.find(p => p.c34Id === 'P1');
        const onPlatform = player.onGround && Math.abs(player.y + player.h - platform.y) < 1;
        return { angle, umbrella, land: route?.result, high: route?.maxH, far: route?.maxX, onPlatform,
          noUmbrellaFalls: c34.noUmbrellaFalls,
          hint: [...rpgQueue.map(q => q.scene), rpgActive].find(s => s?.id === 'c34_canyon_umbrella')?.pages[0].text };
      }

      const before = localStorage.getItem('balloonV_c41WindFail_v1');
      const trials = [run(30, false), run(30, true), run(45, false),
        run(45, true), run(60, false), run(60, true)];
      const wet = [run(60, true, 950, true), run(60, true, 990, true)];
      const ordinaryFall = c2Pits.find(p => p.id === 'A1');
      wdPitHit(ordinaryFall);
      const withoutWindAttempt = c34.noUmbrellaFalls;
      const hintTrials = [run(45, false), run(60, false), run(45, false)];
      return { trials, wet, hintTrials, withoutWindAttempt,
        legacy: before === localStorage.getItem('balloonV_c41WindFail_v1') };
    });
    caseTest.diagnostic(JSON.stringify({ routes: report.trials, wetRoutes: report.wet }));
    assert.deepEqual(report.trials.map(r => r.land), ['pit', 'pit', 'pit', 'pit', 'pit', 'far'], JSON.stringify(report));
    assert.equal(report.trials[5].onPlatform, true);
    assert.ok(report.trials[3].high < composition.high);
    assert.ok(report.trials[5].high > composition.high);
    assert.ok(report.wet.every(r => r.land === 'far' && r.onPlatform));
    assert.equal(report.withoutWindAttempt, 0);
    assert.equal(report.legacy, true);
    assert.deepEqual(report.trials.map(r => r.noUmbrellaFalls), [1, 0, 1, 0, 1, 0]);
    assert.deepEqual(report.hintTrials.map(r => r.hint), [
      undefined, '咦...還是飛得不夠高...如果加上氣球雨傘的輔助呢？', undefined,
    ]);
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
      put(f.x - 160, baseY, true, 'umbrella');
      const awayFromCanopy = c34FallCanopy(f) === null;
      for (let i = 0; i < 60; i++) c34Step();
      const stop = { stream: c34.stream, level: c34.level, surface: c34SurfaceY(), awayFromCanopy };
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

      c34.taught.delete('c34_first_dry_wind');
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
    assert.equal(stop.awayFromCanopy, true);
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
      const bag = coins.find(c => c.c34PadBag);
      player.x = bag.x - player.w / 2;
      player.y = bag.y - player.h / 2;
      const coinsBefore = currentRunStats.coins;
      const inventoryBefore = playerInventory.coins;
      checkCollectibles();
      checkCollectibles();
      const bagReward = { counted: currentRunStats.coins - coinsBefore, inventory: playerInventory.coins - inventoryBefore };

      const beforeExit = c34.log.filter(e => e.ev === 'complete').length;
      player.x = FINISH_X; player.y = bank.y - player.h; checkFinish(); checkFinish();
      const afterExit = c34.log.filter(e => e.ev === 'complete').length;
      return { onWater, jump, swimsOut, landed, bagReward, beforeExit, afterExit,
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
    assert.deepEqual(actual.bagReward, { counted: 10, inventory: 10 });
    assert.equal(actual.beforeExit, 0);
    assert.equal(actual.afterExit, 1);
    assert.equal(actual.done, true);
    assert.equal(actual.saved, true);
  });

  await t.test('reopens the settled result in the same home overlay without changing the save', async () => {
    const summary = page.locator('#h2-sum-wrap');
    const body = page.locator('#h2-sum-body');
    await page.waitForFunction(() => H2.open && H2.summary && !H2.enterPending);
    await summary.waitFor({ state: 'visible' });
    const originalTitle = await page.locator('#h2-sum-title').textContent();
    const originalRows = await body.textContent();
    const readState = () => page.evaluate(() => ({
      inventory: JSON.stringify(playerInventory),
      hp: player.hp,
      local: Object.entries(localStorage).sort(),
      session: Object.entries(sessionStorage).sort(),
    }));
    const before = await readState();

    for (let attempt = 0; attempt < 2; attempt++) {
      await page.locator('#h2-sum-ok').click();
      await summary.waitFor({ state: 'hidden' });
      await page.locator('#h2-back').click();
      await summary.waitFor({ state: 'visible' });
      assert.equal(await page.locator('#h2-sum-title').textContent(), originalTitle);
      assert.equal(await body.textContent(), originalRows);
      assert.equal(await page.locator('#result-overlay').isVisible(), false);
    }
    assert.deepEqual(await readState(), before);
    await record(page, 'desktop-3-4-reopened-result');

    await page.evaluate(() => { H2.summary = null; });
    await page.locator('#h2-sum-ok').click();
    await page.locator('#h2-back').click();
    assert.match(await body.textContent(), /尚無本關結算紀錄/);
    assert.deepEqual(await readState(), before);
  });

  await t.test('guest sandbox has three separate backpack modes and keeps the completed playtest bag', async () => {
    const stored = await page.evaluate(() => ({
      mode: c34.devBagMode,
      base: localStorage.getItem(SAVE_KEY),
      persisted: JSON.parse(localStorage.getItem(c34BagKey('cumulative'))),
      current: playerInventory.coins,
      cumulative: c34CumulativeResources().totals,
      stocked: c34CreateInventory('stocked'),
      empty: c34CreateInventory('empty'),
    }));
    assert.equal(stored.mode, 'cumulative');
    assert.equal(stored.persisted.coins, stored.current);
    assert.ok(stored.persisted.coins >= stored.cumulative.coins + 10);
    assert.equal(stored.persisted.unlockedRecipes.balloonDice, true);
    assert.deepEqual([stored.stocked.coins, stored.stocked.balloon260, stored.stocked.roundBalloon], [1000, 100, 50]);
    assert.deepEqual([stored.empty.coins, stored.empty.balloon260, stored.empty.roundBalloon], [0, 0, 0]);
    await page.reload();
    await page.waitForFunction(() => assetBootReady);
    await page.locator('#btn-start-gate-go').click();
    await page.waitForFunction(() => !assetGateActive && gameState === 'playing' && c34.devBagMode === 'cumulative');
    const reloaded = await page.evaluate(() => [playerInventory.coins, localStorage.getItem(SAVE_KEY)]);
    assert.deepEqual(reloaded, [stored.current, stored.base]);
    for (const [mode, amounts] of [['stocked', [1000, 100, 50]], ['empty', [0, 0, 0]]]) {
      const testPage = await page.context().newPage();
      try {
        await boot(testPage, origin, 'pool', mode);
        const state = await testPage.evaluate(() => ({
          mode: c34.devBagMode,
          start: [playerInventory.coins, playerInventory.balloon260, playerInventory.roundBalloon],
          pickup: [currentRunStats.coins, currentRunStats.balloon260, currentRunStats.roundBalloon],
          base: localStorage.getItem(SAVE_KEY),
        }));
        assert.deepEqual(state, { mode, start: amounts, pickup: [0, 0, 0], base: stored.base });
      } finally { await testPage.close(); }
    }
  });

  await t.test('Chapter 3 enemy tiers and the choice of where to fight', async () => {
    const stages = await page.evaluate(() => {
      return ['3-1', '3-2', '3-3', '3-4'].map(id => {
        const level = LEVELS[getLevelIndexByStageId(id)];
        return {
          id, length: level.length, resources: adventureLevelResourceConfig(level).fixed,
          enemies: level.buildEnemies().map(enemy => ({
            id: enemy.c2Id, type: enemy.variant, x: enemy.x, y: enemy.y, platform: enemy.c1dPlat?.x,
          })),
        };
      });
    });
    assert.equal(stages[1].length, 7300);
    assert.ok(stages.every(stage => stage.enemies.some(enemy => enemy.type === 'windBlade')));
    assert.ok(stages.every(stage => stage.enemies.some(enemy => enemy.type === 'gale')));
    assert.ok(stages.slice(0, 2).every(stage => !stage.enemies.some(enemy => enemy.type === 'armored')));
    assert.ok(stages[2].enemies.some(enemy => enemy.type === 'armored'));
    assert.ok(stages[3].enemies.every(enemy => enemy.id.startsWith('P2-') || enemy.id.startsWith('CT-') || enemy.id.startsWith('BANK-')));
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
