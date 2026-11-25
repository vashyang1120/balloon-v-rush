'use strict';
// Companion Water Animation｜Hotfix 1: the balloon dog in the 3-4 pool, with real keyboard or touch input.
// Uses the QA shortcut "3-4 水池（帶小狗）" exactly as a tester would.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { test } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { serveCheckout } = require('./chapter3-static-fixture.cjs');

const origin = 'http://127.0.0.1:8412';
const evidence = process.env.HOTFIX1_EVIDENCE;

for (const mode of ['keyboard', 'touch']) test('dog swims in the 3-4 pool (' + mode + ')', { timeout: 300000 }, async () => {
  const touch = mode === 'touch';
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext(touch
      ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const cdp = touch ? await context.newCDPSession(page) : null;
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/[^/]+\//, route => serveCheckout(route, origin));
    await page.goto(origin + '/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1&ch3test=pool&qago=dogpool');
    await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
    if (touch) await page.locator('#btn-start-gate-go').tap(); else await page.locator('#btn-start-gate-go').click();
    await page.waitForFunction(() => {
      if (rpgActive && bringBalloonDog) rpgClose('skipped');
      return gameState === 'playing' && debugC34().ready && debugC34().section === 'pool' && bringBalloonDog && !assetGateActive;
    }, undefined, { timeout: 90000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      // Test set-up only: a full pool (so 小V can climb out) and no interruptions.
      enemies.length = 0; c34.level = 1;
      window.__guard = setInterval(() => { if (rpgActive) rpgClose('skipped'); }, 50);
      window.__rec = [];
      const f = () => {
        const d = debugC34Dog();
        window.__rec.push({ seg: window.__seg, swim: c34.swim, climb: !!c34.climb, ground: player.onGround, vx: player.vx, pose: dogLastDraw && dogLastDraw.pose,
          state: dogLastDraw && dogLastDraw.state, y: dogLastDraw && dogLastDraw.y, water: d.water,
          nose: d.draw && d.draw.noseAboveSurface, sub: d.draw && d.draw.submergedPx });
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    const held = new Set();
    async function press(actions) {
      if (!touch) {
        for (const a of held) if (!actions.includes(a)) { await page.keyboard.up({ left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' }[a]); held.delete(a); }
        for (const a of actions) if (!held.has(a)) { await page.keyboard.down({ left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' }[a]); held.add(a); }
        return;
      }
      if (held.size) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      held.clear();
      if (!actions.length) return;
      const points = await Promise.all(actions.map(async (a, id) => {
        const b = await page.locator('#btn-' + a).boundingBox();
        return { id, x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
      actions.forEach(a => held.add(a));
    }
    const seg = name => page.evaluate(n => { window.__seg = n; }, name);
    const shot = async name => { if (!evidence) return; await mkdir(evidence, { recursive: true }); await page.locator('canvas').first().screenshot({ path: evidence + '/' + mode + '-' + name + '.png' }); };

    await seg('enter'); await press(['right']);
    await page.waitForFunction(() => c34.swim, undefined, { timeout: 10000 });
    await page.waitForTimeout(800); await shot('swim-moving');
    await seg('still'); await press([]); await page.waitForTimeout(1400); await shot('swim-still');
    await seg('left'); await press(['left']); await page.waitForTimeout(700);
    await seg('right'); await press(['right']); await page.waitForTimeout(700);
    // Up onto the floating pad, then turn left so the dog is on the pad too.
    await seg('toPad');
    await page.waitForFunction(() => { const p = platforms.find(q => q.c34Pad); return player.onGround && player.x + player.w > p.x && player.x < p.x + p.w; }, undefined, { timeout: 15000 });
    await press([]); await page.waitForTimeout(900);
    const padBeside = await page.evaluate(() => ({ water: debugC34Dog().water, state: dogLastDraw.state, spotOnPad: (() => { const a = getDogWorldAnchor(), p = platforms.find(x => x.c34Pad); return a.x >= p.x - 6 && a.x <= p.x + p.w + 6; })() }));
    await shot('pad-dog-beside');
    await seg('padTurn'); await press(['left']); await page.waitForTimeout(70); await press([]); await page.waitForTimeout(900);
    const padOn = await page.evaluate(() => ({ water: debugC34Dog().water, state: dogLastDraw.state, spotOnPad: (() => { const a = getDogWorldAnchor(), p = platforms.find(x => x.c34Pad); return a.x >= p.x - 6 && a.x <= p.x + p.w + 6; })() }));
    await shot('pad-dog-on');
    // Back to the left bank.
    await seg('toBank'); await press(['left']);
    for (let i = 0; i < 60; i++) {
      const s = await page.evaluate(() => ({ swim: c34.swim, x: player.x, g: player.onGround, feet: player.y + player.h, px: c34Pool().x, by: c34Pool().baseY }));
      if (s.g && s.x < s.px && Math.abs(s.feet - s.by) < 2) break;
      if (s.swim && s.x < s.px + 50) { await press(['left', 'jump']); await page.waitForTimeout(250); await press(['left']); }
      await page.waitForTimeout(200);
    }
    await press([]); await page.waitForTimeout(900);
    const bank = await page.evaluate(() => ({ x: player.x, px: c34Pool().x, ground: player.onGround, water: debugC34Dog().water, state: dogLastDraw.state, face: player.facingRight }));
    await shot('bank');
    // 小V on the bank edge facing the bank, so the dog behind is over the water.
    await seg('bankEdge'); await press(['right']); await page.waitForTimeout(60); await press(['left']); await page.waitForTimeout(60); await press([]);
    await page.evaluate(() => { const D = c34Pool(); player.x = D.x - player.w + 4; player.vx = 0; player.facingRight = false; });
    await page.waitForTimeout(1500);
    const edge = await page.evaluate(() => ({ water: debugC34Dog().water, state: dogLastDraw.state, nose: debugC34Dog().draw.noseAboveSurface, ground: player.onGround }));
    await shot('bank-edge-dog-in-water');
    await seg('reenter'); await press(['right']); await page.waitForTimeout(1500); await press([]); await page.waitForTimeout(500);
    const rec = await page.evaluate(() => { clearInterval(window.__guard); return window.__rec; });
    if (evidence) await writeFile(evidence + '/' + mode + '-record.json', JSON.stringify({ rec, padBeside, padOn, bank, edge, errors }));

    // Swimming = 小V in the water and not climbing out (while climbing, the dog climbs with her).
    const swimming = rec.filter(r => r.swim && !r.climb);
    assert.ok(swimming.length > 60);
    // H-01: while 小V swims the dog is in the water, loops the run frames and never shows fall.
    assert.ok(swimming.every(r => r.state === 'swim' && /^run[1-4]$/.test(r.pose)), 'swim frames only');
    assert.ok(rec.filter(r => r.climb).every(r => r.state !== 'fall'), 'no fall frame while climbing out');
    const still = rec.filter(r => r.seg === 'still' && r.swim && !r.climb);
    assert.ok(new Set(still.map(r => r.pose)).size === 4, 'still in the water: still paddling (all four frames)');
    // H-02: nose above the water, body below.
    for (const r of rec.filter(r => r.state === 'swim')) {
      assert.ok(r.nose >= 8 && r.nose <= 16, 'nose ' + r.nose + ' px above the water');
      assert.ok(r.sub >= 12, 'feet ' + r.sub + ' px under the water');
    }
    // H-04/H-05
    // 小V on the pad: the dog swims exactly when its own spot is off the pad.
    for (const p of [padBeside, padOn]) {
      assert.equal(p.water, !p.spotOnPad, 'dog spot ' + (p.spotOnPad ? 'on' : 'beside') + ' the pad');
      assert.equal(p.state === 'swim', !p.spotOnPad);
    }
    assert.ok([padBeside, padOn].some(p => p.spotOnPad), 'checked the dog standing on the pad');
    assert.equal(bank.ground, true); assert.ok(bank.x < bank.px);
    assert.equal(edge.water, true, '小V on the bank, dog over the water: the dog swims');
    assert.ok(edge.nose >= 8 && edge.nose <= 16);
    assert.ok(rec.some(r => r.seg === 'reenter' && r.state === 'swim'), 'enters the water again');
    let toggles = 0;
    for (let i = 1; i < rec.length; i++) if (rec[i].water !== rec[i - 1].water) toggles++;
    assert.ok(toggles <= 12, 'no rapid water/land flicker: ' + toggles + ' changes');
    for (let i = 1; i < rec.length; i++) {
      const a = rec[i - 1], b = rec[i];
      if (a.y == null || b.y == null || a.seg === 'bankEdge' || b.seg === 'bankEdge') continue;   // bankEdge places 小V directly
      assert.ok(Math.abs(b.y - a.y) <= 20, 'no vertical jump between frames: ' + a.y + ' -> ' + b.y + ' (' + a.state + ' -> ' + b.state + ')');
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
