'use strict';
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { test } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const dir = 'rpg-dual-continent-test';
const screenshotDir = process.env.CH3_SCREENSHOTS;

async function boot(page, origin, section, bagMode) {
  await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
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
    !assetGateActive && gameState === 'playing' && debugC34().ready && debugC34().section === expected,
  section, { timeout: 90000 });
}

async function record(page, name) {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: screenshotDir + '/' + name + '.png' });
}

test('Chapter 3 terrain and water through the dual-continent entry', { timeout: 300000 }, async t => {
  const origin = 'http://127.0.0.1:8412';
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
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
    assert.match(report.version, /v0\.4\.13-(balloon-dice-v2|cross-continent-recovery-rev4)/);
    assert.ok(report.x < 620);
    assert.deepEqual(report.art, { loaded: 82, failed: [] });
    assert.equal(report.frames, 64);
    assert.equal(report.folders, 17);
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
    assert.equal(wet.t, 1200);
    assert.equal(wet.level, 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => c34.wet), 1200);
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
          onGround: true, facingRight: true, invincible: 0, hp: 3, fallingIntoPit: false });
        cameraX = x - 220;
        gameState = 'playing';
        activeSlot = umbrella ? 'umbrella' : 'sword';
        c34.wet = wet ? C34.water.steps : 0;
        c34.swim = false;
        wd.idx = WD_TUNING.angles.indexOf(angle);
        wdResetState(false);
        wd.history.length = 0;
        try {
          for (let i = 0; i < 280 && !wd.history.length; i++) {
            keys.ArrowRight = true;
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

  await t.test('a running jump with an umbrella cannot bypass the 3-4 angle puzzle', async () => {
    const flight = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    try {
      await boot(flight, origin, 'start');
      const outcomes = await flight.evaluate(() => {
        screenFreezeForTest = true;
        const mesa = C34_LAY.p1;
        const top = C34_LAY.y(mesa.h);
        return [[30, true], [45, true], [60, false]].map(([angle, jump]) => {
          if (rpgActive) rpgClose('skipped');
          rpgQueue.length = 0;
          Object.assign(player, { x: 950, y: GROUND_Y - player.h, vx: 0, vy: 0,
            onGround: true, facingRight: true, invincible: 0 });
          cameraX = 660;
          activeSlot = 'umbrella';
          wdSetAngleIndex(WD_TUNING.angles.indexOf(angle));
          wdResetState(false);
          wd.pitRecovers = 0;
          let landed = false;
          try {
            for (let tick = 0; tick < 245 && !landed && !wd.pitRecovers; tick++) {
              if (rpgActive) rpgClose('skipped');
              keys.ArrowRight = player.x < mesa.x + 110;
              keys.Space = jump && tick === 14;
              update(1);
              landed = player.onGround && player.x + player.w > mesa.x &&
                player.x < mesa.x + mesa.w && Math.abs(player.y + player.h - top) < 2;
            }
          } finally { keys.ArrowRight = keys.Space = false; }
          return { landed, fell: wd.pitRecovers > 0 };
        });
      });
      assert.deepEqual(outcomes, [
        { landed: false, fell: true }, { landed: false, fell: true }, { landed: true, fell: false },
      ]);
    } finally { await flight.close(); }
  });

  await t.test('same launch point and measured velocity satisfy the equal-height flight target', async () => {
    const bench = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    try {
      await boot(bench, origin, 'start');
      const groups = await bench.evaluate(() => {
        screenFreezeForTest = true;
        const savedPlatforms = platforms.slice();
        // Compare ranges at the launch height without the canyon stopping any arc.
        platforms.splice(0, platforms.length, ...platforms.filter(p => !p.c34Mesa));
        try {
          return [true, false].map(umbrella => [30, 45, 60].map(angle => {
            if (rpgActive) rpgClose('skipped');
            rpgQueue.length = 0;
            const origin = wdPivot().x + C34.wd.launchStart + 1;
            const x = origin - player.w / 2;
            Object.assign(player, { x, y: GROUND_Y - player.h, vx: 0, vy: 0, hp: 3,
              onGround: true, facingRight: true, invincible: 0, fallingIntoPit: false });
            cameraX = x - 280;
            gameState = 'playing';
            c34.wet = 0;
            c34.swim = false;
            activeSlot = umbrella ? 'umbrella' : 'sword';
            wdSetAngleIndex(WD_TUNING.angles.indexOf(angle));
            wdResetState(false);
            update(1);
            const vx = player.x + player.w / 2 - origin;
            const vy = -player.vy + GRAVITY;
            let previous = { x: player.x + player.w / 2, h: GROUND_Y - player.y - player.h };
            let height = previous.h;
            for (let i = 0; i < 240; i++) {
              if (rpgActive) rpgClose('skipped');
              update(1);
              const current = { x: player.x + player.w / 2, h: GROUND_Y - player.y - player.h };
              height = Math.max(height, current.h);
              if (current.h <= 0 && previous.h > 0) {
                const fraction = previous.h / (previous.h - current.h);
                const range = previous.x + (current.x - previous.x) * fraction - origin;
                return { angle, vx, vy, height, range };
              }
              previous = current;
            }
            throw Error('No return to launch height');
          }));
        } finally { platforms.splice(0, platforms.length, ...savedPlatforms); }
      });
      for (const runs of groups) {
        const speeds = runs.map(r => Math.hypot(r.vx, r.vy));
        assert.ok(speeds[0] > 0 && speeds.every(v => Math.abs(v - speeds[0]) < 1e-6));
        for (const r of runs) assert.ok(Math.abs(Math.atan2(r.vy, r.vx) * 180 / Math.PI - r.angle) < 1e-6);
        assert.ok(runs[2].height > runs[1].height && runs[1].height > runs[0].height);
      }
      const [low, middle, high] = groups[0];
      assert.ok(middle.range > Math.max(low.range, high.range));
      assert.ok(Math.abs(low.range - high.range) / ((low.range + high.range) / 2) <= 0.05);
    } finally { await bench.close(); }
  });

  await t.test('3-4 uses the approved cliff tree and one-piece rock pillar', async () => {
    const upright = await page.evaluate(() => {
      if (rpgActive) rpgClose('skipped');
      rpgQueue.length = 0;
      screenFreezeForTest = true;
      const tree = breakableTrees[0];
      const mesa = platforms.find(p => p.c34Id === 'P2');
      const pillar = platforms.find(p => p.c34Id === 'P3');
      Object.assign(player, { x: mesa.x + 65, y: mesa.y - player.h, vx: 0, vy: 0, onGround: true });
      cameraX = mesa.x - 165;
      c34.camY = 180;
      const art = c4TreeArt(tree);
      return {
        cliff: art.cliff,
        tree: art.tree && new URL(art.tree.src).pathname,
        root: art.root && new URL(art.root.src).pathname,
        pillar: [pillar.x, pillar.w, pillar.y],
        slopeTarget: tree.c41SlopeTo,
      };
    });
    assert.equal(upright.cliff, true);
    assert.match(upright.tree, /tree_standing_cliff\.png$/);
    assert.match(upright.root, /tree_cliff_turf_foreground\.png$/);
    assert.equal(upright.pillar[1], 130);
    assert.deepEqual(upright.slopeTarget, { x: upright.pillar[0], y: upright.pillar[2] });
    await record(page, 'desktop-3-4-standing-tree-and-pillar');

    const fallen = await page.evaluate(() => {
      const tree = breakableTrees[0];
      tree.state = 'falling';
      tree.fallTimer = 0;
      for (let i = 0; i < 120 && tree.state !== 'fallen'; i++) updateBreakableTrees(1);
      const { c41Slope: slope, state } = tree;
      if (!slope) return { state };
      const x = (slope.x0 + slope.x1) / 2;
      const y = c41SlopeY(slope, x);
      Object.assign(player, { x: x - player.w / 2, y: y - player.h - 1, vy: 0.4, onGround: false });
      c41SlopeStep();
      return { state, slope, footError: Math.abs(player.y + player.h - y), onGround: player.onGround };
    });
    assert.equal(fallen.state, 'fallen');
    assert.ok(fallen.slope.k < 0);
    assert.equal(fallen.slope.y1, upright.pillar[2]);
    assert.equal(fallen.footError, 0);
    assert.equal(fallen.onGround, true);
    await record(page, 'desktop-3-4-fallen-tree-and-pillar');
    await page.evaluate(() => { screenFreezeForTest = false; });
  });

  await openSection(page, 'pool');
  await t.test('pool catches the right-hand branch at the facing-dependent rate and dries continuously in wind', async () => {
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
      let clearsPad = true;
      const fillStep = () => {
        c34Step();
        const stream = c34.falls.get(f.id).streams.find(branch => branch.side === 'right');
        clearsPad &&= !!stream?.fills && Math.max(stream.outX, stream.x) <= pad.x - 44;
      };
      for (let i = 0; i < 180; i++) fillStep();
      const half = { stream: c34.stream, level: c34.level, surface: c34SurfaceY(), pad: pad.y, wet: c34.wet };
      put(f.x - 160, baseY, true, 'umbrella');
      const awayFromCanopy = c34FallCanopy(f) === null;
      for (let i = 0; i < 60; i++) c34Step();
      const stop = { stream: c34.stream, level: c34.level, surface: c34SurfaceY(), awayFromCanopy };
      put(f.x, baseY, true, 'umbrella');
      for (let i = 0; i < 240; i++) fillStep();
      const full = { level: c34.level, surface: c34SurfaceY(), pad: pad.y, clearsPad };
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
        c34.dryingWindStart = null;
        c34StepWet(false);
        const dry = rpgQueue.find(q => q.scene.id === 'c34_first_dry_wind')?.scene.pages[0];
        dryLine = dry?.text; dryFace = dry?.face;
        windValues = [c34.wet];
        c34StepWet(false); windValues.push(c34.wet);
        wind = false; c34StepWet(false); windValues.push(c34.wet);
        wind = true; c34StepWet(false); windValues.push(c34.wet);
        c34.wet = 2; c34.dryingWindStart = null; c34StepWet(false); windValues.push(c34.wet);
      } finally { wdFlowAt = priorWdFlow; }
      const taught = rpgQueue.filter(q => q.scene.id === 'c34_first_dry_wind').length;
      return { x, baseY, initial, left, half, stop, full, stood, released, wet, windValues, dryLine, dryFace, taught };
    });
    const { initial, left, half, stop, full, stood, released, wet } = actual;
    assert.equal(initial.section, 'pool');
    assert.ok(initial.x < actual.x);
    assert.equal(initial.surface - actual.baseY, 64);
    assert.equal(initial.wet, 0);
    assert.deepEqual(left, { stream: 'left', level: 0.1 / 360, wet: 0 });
    assert.equal(half.stream, 'right');
    assert.ok(Math.abs(half.level - (180.1 / 360)) < 1e-9);
    assert.equal(half.wet, 0);
    assert.ok(half.surface < initial.surface);
    assert.ok(half.pad < initial.pad);
    assert.equal(stop.awayFromCanopy, true);
    assert.equal(stop.stream, 'none');
    assert.equal(stop.level, half.level);
    assert.equal(stop.surface, half.surface);
    assert.equal(full.level, 1);
    assert.equal(full.clearsPad, true);
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
    assert.deepEqual(actual.windValues, [1196, 1192, 1191, 1187, 0]);
    assert.equal(actual.dryLine, '哇！這裡的風讓我身體乾了一些！！');
    assert.equal(actual.dryFace, 'balloonv_happy');
    assert.equal(actual.taught, 1);
    await page.evaluate(() => { if (rpgActive) rpgClose('skipped'); rpgQueue.length = 0; });
    await record(page, 'desktop-3-4-full-pool');
  });

  await t.test('C3 full and half wetness, mixed rates and repeated wind crossings', async () => {
    const result = await page.evaluate(() => {
      const vent = windVents.find(v => v.id === '3-4-left-bank');
      const original = { x: player.x, y: player.y, wet: c34.wet, start: c34.dryingWindStart };
      const move = intoWind => {
        player.x = vent.x + (intoWind ? (vent.w - player.w) / 2 : -player.w - 1);
        player.y = vent.y - player.h;
      };
      const dryTicks = (wet, inWind) => {
        c34.wet = wet;
        move(inWind);
        let ticks = 0;
        while (c34.wet > 0 && ticks < 1300) {
          c34StepWet(false);
          ticks++;
        }
        return ticks;
      };
      const timings = [dryTicks(1200, false), dryTicks(1200, true),
        dryTicks(600, false), dryTicks(600, true)];
      c34.wet = 1200;
      for (let i = 0; i < 60; i++) {
        move(i % 2 === 0);
        c34StepWet(false);
      }
      const mixed = c34.wet;
      move(true);
      c34StepWet(false);
      const wind = c34.dryingWindStart !== null;
      c34StepWet(true);
      const soaked = { wet: c34.wet, wind: c34.dryingWindStart !== null };
      Object.assign(player, { x: original.x, y: original.y });
      c34.wet = original.wet;
      c34.dryingWindStart = original.start;
      return { timings, mixed, wind, soaked };
    });
    assert.deepEqual(result, {
      timings: [1200, 300, 600, 150], mixed: 1050, wind: true, soaked: { wet: 1200, wind: false },
    });
  });
  await t.test('umbrella descent dries like wind without stacking or overriding a new shower', async () => {
    const actual = await page.evaluate(() => {
      const before = { ...player }, slot = activeSlot, wet = c34.wet, start = c34.dryingWindStart;
      try {
        player.x = c34Pool().x + 80;
        player.y = c34Pool().baseY - 240;
        function sample(tool, grounded, vy, touching = false) {
          activeSlot = tool;
          Object.assign(player, { onGround: grounded, vy });
          c34.wet = 1200;
          c34StepWet(touching);
          return c34.wet;
        }
        return [sample('umbrella', false, 2), sample('umbrella', false, -2),
          sample('umbrella', true, 0), sample('sword', false, 2), sample('umbrella', false, 2, true)];
      } finally {
        Object.assign(player, before);
        activeSlot = slot;
        c34.wet = wet;
        c34.dryingWindStart = start;
      }
    });
    assert.deepEqual(actual, [1196, 1199, 1199, 1199, 1200]);
  });

  await t.test('both waterfalls use the current canopy geometry for shelter and partial runoff', async () => {
    const result = await page.evaluate(() => {
      const before = { ...player }, slot = activeSlot;
      const outcomes = c34Falls().map(fall => {
        function sample(offset, facingRight, block, tool, vx = 0) {
          Object.assign(player, { x: fall.x + offset - player.w / 2, y: c34FallBase(fall) - player.h,
            onGround: true, facingRight, c2Block: block, vx, vy: 0, invincible: 0, popScare: 0 });
          activeSlot = tool;
          const interaction = c34ResolveFall(fall);
          return { wet: interaction.touching, cut: interaction.canopy?.width || 0, streams: interaction.streams.length };
        }
        return {
          none: sample(0, true, false, 'sword'),
          overhead: [sample(0, true, false, 'umbrella'), sample(0, false, false, 'umbrella')],
          side: [sample(0, true, true, 'umbrella'), sample(0, false, true, 'umbrella')],
          partial: [sample(-29, true, true, 'umbrella'), sample(29, false, true, 'umbrella')],
          moving: [sample(0, true, false, 'umbrella', 2), sample(0, false, false, 'umbrella', -2)],
          restored: sample(0, true, false, 'umbrella'),
          width: fall.w,
        };
      });
      Object.assign(player, before);
      activeSlot = slot;
      return outcomes;
    });
    for (const { none, overhead, side, partial, moving, restored, width } of result) {
      assert.ok(Math.abs(width - 46.46) < 0.015);
      assert.deepEqual(none, { wet: true, cut: 0, streams: 0 });
      assert.ok(overhead.every(pose => !pose.wet && pose.cut > 0));
      assert.ok(side.every(pose => pose.wet && pose.cut === 0));
      assert.ok(partial.every(pose => pose.wet && pose.cut > 0 && pose.cut < width && pose.streams > 0));
      assert.ok(moving.every(pose => !pose.wet && pose.cut > 0));
      assert.deepEqual(restored, overhead[0]);
    }
  });

  await t.test('each overhead diversion stops the whole column at the canopy', async () => {
    const results = await page.evaluate(() => {
      const before = { ...player }, slot = activeSlot, falls = c34.falls;
      const { column } = c34Art;
      const { draw } = c34PreviewWater;
      try {
        activeSlot = 'umbrella';
        return c34Falls().flatMap(fall => [true, false].map(facingRight => {
          Object.assign(player, { x: fall.x - player.w / 2 + (facingRight ? 12 : -12),
            y: c34FallBase(fall) - player.h, vx: 0, onGround: true, facingRight,
            c2Block: false, invincible: 0, popScare: 0 });
          const interaction = c34ResolveFall(fall);
          c34.falls = new Map([[fall.id, interaction]]);
          const columns = [], branches = [];
          c34Art.column = (_x, _top, _end, width, _time, contact) => columns.push({ width, clipped: !!contact });
          c34PreviewWater.draw = (...args) => {
            const profile = args[5];
            if (draw(...args)) branches.push(profile.left.side, profile.right.side);
            return branches.length === 2;
          };
          c34DrawFall(fall, fall.x - 200);
          return { width: fall.w, wet: interaction.touching, cut: interaction.canopy?.width, columns, branches };
        }));
      } finally {
        Object.assign(player, before);
        activeSlot = slot;
        c34.falls = falls;
        c34Art.column = column;
        c34PreviewWater.draw = draw;
      }
    });
    for (const result of results) {
      assert.ok(result.cut > 0 && result.cut < result.width);
      assert.equal(result.wet, false);
      assert.deepEqual(result.columns, [{ width: result.width, clipped: true }]);
      assert.deepEqual(result.branches, ['left', 'right']);
    }
  });

  await t.test('09 keeps cycling in place and both runoff widths follow the player', async () => {
    const actual = await page.evaluate(() => {
      const right = c34Art.swimPose(200, 300, 0, true, 0);
      const left = c34Art.swimPose(200, 300, 160, false, 0);
      const f = c34Falls()[0];
      const widths = ['left', 'right'].map(direction => c34FallStreams(f,
        { direction, left: f.x - 10, right: f.x + 10, outY: GROUND_Y - 100 }).map(stream => +(stream.width / f.w).toFixed(2)));
      return { ids: [right.id, left.id], mirror: [right.mirror, left.mirror], size: right.factor === left.factor,
        frameChanges: c34Art.image(right.id, 0) !== c34Art.image(left.id, 160), widths };
    });
    assert.deepEqual(actual, { ids: ['09_v_water_move', '09_v_water_move'], mirror: [false, true],
      size: true, frameChanges: true, widths: [[1.05, 0.52], [0.52, 1.05]] });
  });
  await t.test('climb reach uses the left-bank geometry and the approved six frames', async () => {
    const result = await page.evaluate(() => {
      const pool = c34Pool();
      const before = { ...player };
      const state = { level: c34.level, swim: c34.swim, jumpReleased: c34.jumpReleased };
      const images = Array.from({ length: 6 }, (_, frame) => c34Art.image('17_v_water_climb', frame * 110));
      const usable = [0, 0.5, 1].map(level => {
        c34.level = level;
        return c34CanClimbLeft();
      });
      Object.assign(player, { x: pool.x + 1, y: c34SurfaceY() + C34.water.feetDepth - player.h,
        vx: 0, vy: 0, onGround: false });
      Object.assign(c34, { swim: true, jumpReleased: true });
      keys.ArrowLeft = true;
      const started = c34AdvanceClimb();
      keys.ArrowLeft = false;
      for (let frame = 0; frame < 42 && c34.climb; frame++) c34AdvanceClimb();
      const landed = !c34.climb && player.onGround && player.x + player.w < pool.x &&
        player.y + player.h === pool.baseY && player.hp === before.hp;
      Object.assign(player, before);
      Object.assign(c34, state);
      return { usable, started, landed, frames: images.every(image => image?.naturalWidth > 0) };
    });
    assert.deepEqual(result, { usable: [false, true, true], started: true, landed: true, frames: true });
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
    assert.equal(actual.onWater.wet, 1200);
    assert.ok(actual.onWater.count > 0);
    assert.equal(actual.onWater.motion.move, 0.5);
    assert.equal(actual.onWater.motion.height, 0.4);
    assert.ok(Math.abs(actual.jump[0] - 0.4) < 0.01);
    assert.ok(Math.abs(actual.jump[1] - 0.7) < 0.01);
    assert.equal(actual.swimsOut.swimming, false);
    assert.ok(actual.swimsOut.vy < 0);
    assert.equal(actual.landed, true);
    assert.deepEqual(actual.bagReward, { counted: 10, inventory: 0 });
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
      persisted: JSON.parse(localStorage.getItem(c34BagKey('3-4', 'cumulative'))),
      current: playerInventory.coins,
      cumulative: c34CumulativeResources().totals,
      stocked: c34CreateInventory('3-4', 'stocked'),
      empty: c34CreateInventory('3-4', 'empty'),
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
      const testPage = await context.newPage();
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

  for (const [mode, viewport] of [['desktop', { width: 1280, height: 820 }], ['mobile', { width: 844, height: 390 }]]) {
    await t.test(mode + ' pool panic, repeated drops, swim, climb and full-water exit', async () => {
      const mobile = mode === 'mobile';
      const videoDir = process.env.CH3_VIDEO_DIR;
      const context = await browser.newContext({
        viewport, isMobile: mobile, hasTouch: mobile,
        ...(videoDir ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
      });
      const rescuePage = await context.newPage();
      const control = (button, pressed) => mobile
        ? rescuePage.locator('#btn-' + button).dispatchEvent(pressed ? 'touchstart' : 'touchend')
        : rescuePage.keyboard[pressed ? 'down' : 'up']({ left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' }[button]);
      const advanceDialog = () => mobile
        ? rescuePage.locator('.rpg-next').tap({ force: true })
        : rescuePage.locator('.rpg-next').click({ force: true });
      try {
        await boot(rescuePage, origin, 'pool');
        const armLowWaterEntry = () => rescuePage.evaluate(() => {
          const pool = c34Pool();
          if (rpgActive) rpgClose('finished');
          rpgQueue.length = 0;
          c34.taught.add('c34_first_wet');
          activeSlot = 'sword';
          Object.assign(player, { x: pool.x - player.w - 6, y: pool.baseY - player.h,
            vx: 0, vy: 0, onGround: true });
          c34.swim = false;
          cameraX = player.x - 380;
          return rpgAssetState('balloonv_panic');
        });
        assert.equal(await armLowWaterEntry(), 'loaded');
        await control('right', true);
        await rescuePage.waitForFunction(() => rpgActive?.id === 'c34_pool_panic');
        await control('right', false);
        assert.deepEqual(await rescuePage.evaluate(() => ({
          face: rpgCurLeft, right: rpgCurRight, pages: rpgActive.pages, swimming: c34.swim,
        })), { face: 'balloonv_panic', right: null,
          pages: [{ sp: 'balloonv', face: 'balloonv_panic', text: '糟糕！爬不上去了……怎麼辦？' }],
          swimming: true });
        await rescuePage.waitForFunction(() => rpgTypeDone && performance.now() - rpgOpenedAt >= 250);
        await rescuePage.evaluate(() => {
          const snapshot = () => {
            const pad = platforms.find(p => p.c34Pad);
            return [player.x, player.y, c34.swim, c34.level, pad.x, pad.y, pad.c34Angle, pad.c34Sink];
          };
          const close = rpgClose;
          rpgClose = (...args) => {
            const before = snapshot();
            close(...args);
            window.c34PanicClose = { before, after: snapshot() };
            rpgClose = close;
          };
        });
        await advanceDialog();
        await rescuePage.waitForFunction(() => !rpgActive && c34.lowWaterPanicSeen && c34.swim);
        const closed = await rescuePage.evaluate(() => window.c34PanicClose);
        assert.deepEqual(closed.after, closed.before);
        for (let repeat = 0; repeat < 2; repeat++) {
          await armLowWaterEntry();
          await control('right', true);
          await rescuePage.waitForFunction(() => c34.swim || !!rpgActive);
          await control('right', false);
          const tick = await rescuePage.evaluate(() => c34.waterTick);
          await rescuePage.waitForFunction(initial => c34.waterTick >= initial + 30 || !!rpgActive, tick);
          assert.deepEqual(await rescuePage.evaluate(() => ({ swim: c34.swim, dialog: !!rpgActive,
            level: c34.level, visits: c34.log.filter(e => e.ev === 'poolRescue').length })),
          { swim: true, dialog: false, level: 0, visits: 0 });
        }

        for (const [direction, side] of [['right', 1], ['left', -1]]) {
          await rescuePage.evaluate(side => {
            rpgAttempt.shown.add('rpg004_first_scorpion');
            const pad = platforms.find(p => p.c34Pad);
            Object.assign(player, { x: side > 0 ? pad.x - player.w - 8 : pad.x + pad.w + 8,
              y: c34SurfaceY() + C34.water.feetDepth - player.h, vx: 0, vy: 0, onGround: false });
            c34.swim = true;
          }, side);
          await control(direction, true);
          await rescuePage.waitForFunction(() => !!c34.climb?.pad, null, { timeout: 5000 });
          await control(direction, false);
          await rescuePage.waitForFunction(() => !c34.climb && player.onGround && !c34.swim);
          assert.deepEqual(await rescuePage.evaluate(() => [c34.level, c34CanClimbLeft()]), [0, false]);
        }

        await rescuePage.evaluate(() => {
          const pool = c34Pool();
          c34.fillFrames = C34.pool.fillFrames / 2;
          c34.level = 0.5;
          Object.assign(player, { x: pool.x - player.w - 6, y: pool.baseY - player.h, vx: 0, vy: 0, onGround: true });
        });
        await control('right', true);
        await rescuePage.waitForFunction(() => c34.swim && c34SwimPose(cameraX).id === '09_v_water_move');
        await control('right', false);
        await rescuePage.waitForFunction(() => c34.swim && player.vx === 0);
        const still = await rescuePage.evaluate(() => ({ x: player.x, time: c34.swimTime }));
        await rescuePage.waitForFunction(start => c34.swimTime > start + 180, still.time);
        assert.deepEqual(await rescuePage.evaluate(() => ({ x: player.x, art: c34SwimPose(cameraX).id })),
          { x: still.x, art: '09_v_water_move' });
        await control('left', true);
        await rescuePage.waitForFunction(() => !!c34.climb && !c34.climb.facingRight);
        await control('left', false);
        await rescuePage.waitForFunction(() => !c34.climb && player.onGround && player.x + player.w < c34Pool().x);
        assert.equal(await rescuePage.evaluate(() => c34.log.filter(e => e.ev === 'poolRescue').length), 0);
        await rescuePage.evaluate(() => {
          const pad = platforms.find(p => p.c34Pad);
          Object.assign(player, { x: pad.x - player.w - 12, y: c34SurfaceY() + C34.water.feetDepth - player.h,
            vx: 0, vy: 0, onGround: false });
          c34.swim = true;
        });
        await control('right', true);
        await rescuePage.waitForFunction(() => !!c34.climb?.pad);
        await control('right', false);
        await rescuePage.waitForFunction(() => !c34.climb && !c34.swim && player.onGround &&
          platforms.some(p => p.c34Pad && player.x >= p.x && player.x + player.w <= p.x + p.w));


        await rescuePage.evaluate(() => {
          c34.fillFrames = C34.pool.fillFrames;
          c34.level = 1;
          c34.wet = 0;
          activeSlot = 'sword';
          const pad = platforms.find(p => p.c34Pad);
          c34StepPad(pad);
          player.x = pad.x + pad.w - 16;
          player.y = c34PlatformSurface(pad) - player.h;
          player.vx = player.vy = 0;
          player.onGround = true;
          cameraX = player.x - 380;
        });
        await control('right', true);
        await control('jump', true);
        await rescuePage.waitForFunction(() => player.vy < 0);
        await control('jump', false);
        const reachedBank = () => {
          const bank = platforms.find(p => p.c34Id === 'BANK');
          return player.onGround && player.x + player.w > bank.x && player.y + player.h === bank.y;
        };
        while (!await rescuePage.evaluate(reachedBank)) {
          await rescuePage.waitForFunction(() => !!rpgActive || player.onGround);
          if (!await rescuePage.evaluate(() => !!rpgActive)) break;
          await control('right', false);
          while (await rescuePage.evaluate(() => !!rpgActive)) {
            await rescuePage.waitForFunction(() => rpgTypeDone && performance.now() - rpgOpenedAt >= 250);
            await advanceDialog();
          }
          await control('right', true);
        }
        await control('right', false);
        assert.equal(await rescuePage.evaluate(reachedBank), true);
        assert.equal(await rescuePage.evaluate(() => c34.level), 1);
      } finally {
        await context.close();
        if (videoDir) await rescuePage.video().saveAs(videoDir + '/Batch-D-pool-' + mode + '.webm');
      }
    });
  }

  await t.test('mobile-size pool entry and stage-specific assets', async () => {
    const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    mobile.on('pageerror', error => errors.push(error.message));
    await boot(mobile, origin, 'pool');
    const state = await mobile.evaluate(() => ({
      ready: debugC34().ready, scorpionArt: c3sReady, stage: debugC34().stage, cam: c34.camY,
      groups: ['3-1', '3-2', '3-3', '3-4'].map(sid => getAssetGroupsForLevel(getLevelIndexByStageId(sid))),
      canvas: document.querySelector('canvas').getBoundingClientRect().width,
    }));
    assert.equal(state.ready, true);
    assert.equal(state.stage, '3-4');
    assert.ok(state.cam > 0 && state.cam <= 430);
    assert.ok(state.canvas > 0 && state.canvas <= 844);
    assert.ok(state.groups.every(groups => groups.includes('chapter3vertical') && groups.includes('ch3NewScorpions')));
    assert.equal(state.scorpionArt, true);
    assert.ok(state.groups.slice(0, 3).every(groups => !groups.includes('c34canyon')));
    assert.ok(state.groups[3].includes('c34canyon'));
    await record(mobile, 'mobile-3-4-pool');
    await mobile.close();
  });

  await t.test('3-4 can be cleared from the start using movement and attacks', async () => {
    const runPage = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    try {
      await boot(runPage, origin, 'start');
      const result = await runPage.evaluate(() => {
        screenFreezeForTest = true;
        const layout = C34_LAY;
        function advance(limit, stop, { right = () => true, jump = false, attack = false } = {}) {
          for (let tick = 0; tick < limit && !stop(); tick++) {
            if (rpgActive) rpgClose('finished');
            if (gameState !== 'playing') break;
            keys.ArrowRight = right();
            keys.Space = jump && tick === 0;
            keys.KeyZ = attack;
            update(1);
          }
          keys.ArrowRight = keys.Space = keys.KeyZ = false;
          return stop();
        }
        const onTop = (x, w, y) => player.onGround && player.x + player.w > x &&
          player.x < x + w && Math.abs(player.y + player.h - y) < 2;
        const onMesa = mesa => onTop(mesa.x, mesa.w, layout.y(mesa.h));

        activeSlot = 'umbrella';
        const launcher = advance(360, () => player.x >= 960);
        wdSetAngleIndex(WD_TUNING.angles.indexOf(60));
        const firstMesa = advance(280, () => onMesa(layout.p1), { right: () => player.x < 1780 });
        advance(90, () => player.x >= layout.p1.x + layout.p1.w - player.w - 8);
        const secondMesa = advance(80, () => player.onGround && player.x >= layout.p2.x, { jump: true });

        activeSlot = 'hammer';
        const tree = breakableTrees[0];
        advance(100, () => tree.state !== 'standing' || player.x >= layout.tree.x - 28, { attack: true });
        const bridge = advance(110, () => tree.state === 'fallen', { right: () => false, attack: true });
        advance(110, () => player.x >= layout.p3.x + 75, { attack: true });
        const pillar = onMesa(layout.p3);
        activeSlot = 'umbrella';
        const canyonTop = advance(92, () => onMesa(layout.ct), { jump: true });

        activeSlot = 'sword';
        advance(120, () => player.x >= layout.ct.x + 440, { attack: true });
        activeSlot = 'umbrella';
        advance(100, () => player.x + player.w / 2 >= layout.fallX);
        const filled = advance(430, () => c34.level === 1, { right: () => false });
        advance(1240, () => c34.wet === 0, { right: () => false });
        const pad = platforms.find(p => p.c34Pad);
        advance(70, () => player.x >= layout.pool.x - player.w / 2 - 4);
        const reachedPad = advance(120, () => onTop(pad.x, pad.w, c34PlatformSurface(pad)),
          { jump: true, right: () => player.x < pad.x + 50 });
        advance(80, () => player.x >= pad.x + pad.w - 7);
        const bank = advance(95, () => onMesa(layout.bank), { jump: true });
        const bankWind = enemies.find(e => e.c2Id === 'BANK-W1');
        activeSlot = 'umbrella';
        const blocked = advance(185, () => wsBlades.some(b => b.owner === bankWind && b.st === 'reflect'),
          { right: () => false, attack: true });
        activeSlot = 'sword';
        advance(100, () => player.x >= layout.bank.x + 335);
        const bankEnemyDefeated = advance(65, () => !bankWind.active, { right: () => false, attack: true });
        const finished = advance(80, () => c2Proto.done);
        screenFreezeForTest = false;
        const completes = c34.log.filter(event => event.ev === 'complete').length;
        return { launcher, firstMesa, secondMesa, bridge, pillar, canyonTop, filled,
          reachedPad, bank, blocked, bankEnemyDefeated, finished, completes, hp: player.hp };
      });
      const { hp, ...checkpoints } = result;
      assert.ok(hp > 0);
      assert.deepEqual(checkpoints, {
        launcher: true, firstMesa: true, secondMesa: true, bridge: true, pillar: true,
        canyonTop: true, filled: true, reachedPad: true, bank: true, blocked: true,
        bankEnemyDefeated: true, finished: true,
        completes: 1,
      });
      await runPage.waitForFunction(() => h2IsOpen());
      await record(runPage, 'desktop-3-4-full-route-clear');
    } finally { await runPage.close(); }
  });

    async function openDiceChoice(target) {
      const choice = target.locator('#rpg-overlay .rpg-options--choice');
      const next = target.locator('#rpg-overlay [data-act="next"]');
      for (let step = 0; step < 12 && !await choice.isVisible(); step++) {
        await next.click({ force: true, timeout: 2000 });
        await target.waitForTimeout(110);
      }
      await choice.waitFor({ timeout: 3000 });
      const [yes, no] = await choice.getByRole('button').all();
      const [a, b, box] = await Promise.all([yes.boundingBox(), no.boundingBox(),
        target.locator('#rpg-overlay .rpg-box').boundingBox()]);
      assert.ok(a.width >= box.width * 0.4 && b.width >= box.width * 0.4);
      assert.ok(a.height >= 44 && b.height >= 44 && a.x + a.width <= b.x);
      assert.ok(a.y >= box.y && a.y + a.height <= box.y + box.height);
      assert.equal(await yes.locator('span').evaluate(el => getComputedStyle(el).animationName), 'rpgNextBlink');
    }
  await t.test('dice crafting and hidden chest decision use the real game inventory', async () => {
    const chestArt = await page.evaluate(async () => {
      const files = ['dice_face_blank.png', 'item_balloon_dice.png',
        ...Object.keys(chapter3TreasureDice.tiers).map(tier => 'item_treasure_chest_' + tier + '.png')];
      return Promise.all(files.map(async name => {
        ch3TreasureImage(name);
        await ch3TreasureImages.get(name).decode();
        return ch3TreasureImage(name).naturalWidth;
      }));
    });
    assert.deepEqual(chestArt, [1254, 1254, 1254, 1254, 1254]);
    const setup = await page.evaluate(() => {
      if (rpgActive) rpgClose('reset');
      resetDiceRewardAttempt();
      const chest = chapter3TreasureSpots('3-4')[0];
      const inventory = playerInventory;
      inventory.balloon260 = 12;
      inventory.roundBalloon = 4;
      inventory.craftedItems.balloonDice = 0;
      inventory.unlockedRecipes.balloonDice = true;
      inventory.bagLevel = 1;
      const lv1 = [craftItem('balloonDice'), craftItem('balloonDice')];
      inventory.bagLevel = 2;
      const lv2 = [craftItem('balloonDice'), craftItem('balloonDice')];
      const crafted = [inventory.balloon260, inventory.roundBalloon, v395Count('balloonDice')];
      bringBalloonDog = true;
      gameState = 'playing';
      player.x = chest.x - player.w / 2;
      player.y = chest.y - player.h / 2;
      createLevelStartSnapshot();
      checkChapter3Treasure();
      // Leave the pickup zone once the invite is open so the resumed game loop
      // cannot collect a nearby map coin while the chest payout is measured.
      player.x = 100;
      player.y = 0;
      return { lv1, lv2, crafted, coins: inventory.coins, before: currentRunStats.coins, chest: chest.id,
        pages: rpgActive?.pages.map(p => [p.face, p.text]) };
    });
    assert.deepEqual(setup.lv1, [true, false]);
    assert.deepEqual(setup.lv2, [true, false]);
    assert.deepEqual(setup.crafted, [6, 2, 2]);
    assert.equal(setup.pages[0][1], '哇！是一個寶箱耶！小V，要不要跟我比比看誰的骰子點數比較大？');
    assert.deepEqual(setup.pages.at(-1), ['balloonv_thinking', '要不要挑戰呢...']);

    await page.locator('#rpg-overlay .rpg-box--done').waitFor({ timeout: 8000 });
    await record(page, 'desktop-dice-spirit-invite');
    await openDiceChoice(page);
    await record(page, 'desktop-dice-large-choices');
    await page.getByRole('button', { name: '否', exact: true }).click();
    assert.deepEqual(await page.evaluate(id => [
      playerInventory.coins, currentRunStats.coins, diceRewardAttempt.claims.has(id), v395Count('balloonDice'),
    ], setup.chest), [setup.coins, setup.before + 100, true, 2]);

    const beforeRoll = await page.evaluate(id => {
      const chest = chapter3TreasureSpots('3-4')[0];
      checkChapter3Treasure();
      if (rpgActive) throw Error('claimed chest reopened');
      restoreLevelStartSnapshot();
      if (diceRewardAttempt.claims.has(id) || playerInventory.coins !== levelStartSnapshot.coins) {
        throw Error('abandoned claim or reward survived rollback');
      }
      player.x = chest.x - player.w / 2;
      player.y = chest.y - player.h / 2;
      bringBalloonDog = true;
      checkChapter3Treasure();
      const rollFace = chapter3TreasureDice.rollFace;
      chapter3TreasureDice.rollFace = () => 4;
      window.restoreTestRollFace = () => { chapter3TreasureDice.rollFace = rollFace; };
      return playerInventory.coins;
    }, setup.chest);
    await openDiceChoice(page);
    await page.getByRole('button', { name: '是', exact: true }).click();
    assert.deepEqual(await page.evaluate(id => {
      window.restoreTestRollFace();
      delete window.restoreTestRollFace;
      const saved = JSON.parse(localStorage.getItem(c34BagKey('3-4', 'cumulative')));
      return [saved?.craftedItems?.balloonDice, saved?.coins, diceRewardAttempt.claims.has(id)];
    }, setup.chest), [1, beforeRoll, true]);
    await page.getByRole('button', { name: '繼續冒險' }).waitFor();
    assert.equal(await page.locator('#rpg-overlay .rpg-dice-board').isVisible(), true);
    const dialog = await page.locator('#rpg-overlay .rpg-dice-board').boundingBox();
    assert.ok(dialog && Math.abs(dialog.x + dialog.width / 2 - 640) < 2);
    assert.equal(await page.locator('.rpg-dice-board').getAttribute('data-points'), '4,4');
    assert.match(await page.locator('#rpg-overlay .rpg-text').textContent(), /獲得 100 金幣/);
    assert.deepEqual(await page.evaluate(id => [
      playerInventory.coins, v395Count('balloonDice'), diceRewardAttempt.claims.has(id),
    ], setup.chest), [beforeRoll, 1, true]);
    await record(page, 'desktop-3-4-balloon-dice-result');
    await page.getByRole('button', { name: '繼續冒險' }).click();
  });
  await t.test('the chest challenge fits a mobile viewport and accepts touch', async () => {
    const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    try {
      await boot(mobile, origin, 'pool');
      await mobile.evaluate(() => {
        const chest = chapter3TreasureSpots('3-4')[0];
        playerInventory.craftedItems.balloonDice = 1;
        bringBalloonDog = true;
        player.x = chest.x - player.w / 2;
        player.y = chest.y - player.h / 2;
        checkChapter3Treasure();
      });
      await openDiceChoice(mobile);
      await record(mobile, 'mobile-dice-large-choices');
      await mobile.locator('#rpg-overlay [data-act="dice-accept"]').tap();
      const continueButton = mobile.getByRole('button', { name: '繼續冒險' });
      await continueButton.waitFor();
      const dialog = await mobile.locator('#rpg-overlay .rpg-dice-board').boundingBox();
      assert.ok(dialog && dialog.x > 0 && dialog.y > 0 && dialog.y + dialog.height < 390);
      assert.equal(await mobile.evaluate(() => v395Count('balloonDice')), 0);
      await record(mobile, 'mobile-3-4-balloon-dice-result');
      await continueButton.tap();
      assert.equal(await mobile.locator('#rpg-overlay .rpg-dice-board').isVisible(), false);
    } finally { await mobile.close(); }
  });
  assert.deepEqual(errors, []);
});
