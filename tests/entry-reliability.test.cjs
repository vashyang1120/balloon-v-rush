'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const rules = vm.runInNewContext(read('assets/adventure/entry-reliability.js') + '\nAdventureEntry');
const fresh = () => ({ playsLeft: 0, history: [], settled: {}, clearLog: {} });

test('1-1 legacy unlock flag does not verify hammer recipe', () => {
  const w = { ...fresh(), unlocked: true };
  assert.equal(rules.reconcile(w, false, false, 1), false);
  assert.equal(w.hammerRecipeVerified, undefined);
  assert.equal(w.playsLeft, 0);
});

test('recipe verifies unlock, 1-2 clear grants exactly one initial play', () => {
  const w = fresh();
  rules.reconcile(w, true, false, 1);
  assert.equal(w.hammerRecipeVerified, true);
  assert.equal(w.playsLeft, 0);
  rules.reconcile(w, true, true, 2);
  assert.equal(w.playsLeft, 1);
  assert.equal(w.firstPlayGranted, true);
  const inv = { coins: 40 };
  assert.ok(rules.charge(inv, w, 'round-a', 5, 20, 3));
  assert.equal(inv.coins, 20);
  assert.equal(w.playsLeft, 0);
  assert.equal(rules.reconcile(w, true, true, 4), false);
  assert.equal(w.playsLeft, 0);
});

test('old clears restore a missed initial play after official restart', () => {
  const w = { ...fresh(), unlocked: true };
  assert.equal(rules.reconcile(w, false, true, 1), true);
  assert.equal(w.hammerRecipeVerified, true);
  assert.equal(w.playsLeft, 1);
});

test('previous paid attempt and previous result do not earn a second initial play', () => {
  for (const patch of [
    { current: { id: 'legacy', state: 'pending', paidAt: 1 } },
    { settled: { legacy: 1 } },
    { history: [{ t: 'enter' }] }
  ]) {
    const w = { ...fresh(), ...patch };
    rules.reconcile(w, true, true, 2);
    assert.equal(w.firstPlayGranted, true);
    assert.equal(w.playsLeft, 0);
  }
});

test('reload cannot replay an active paid round', () => {
  const w = { ...fresh(), hammerRecipeVerified: true, playsLeft: 1 };
  const inv = { coins: 50 };
  assert.ok(rules.charge(inv, w, 'round-a', 321, 20, 1));
  const reload = JSON.parse(JSON.stringify(w));
  assert.equal(rules.charge(inv, reload, 'round-a', 321, 20, 2), null);
  assert.equal(rules.abandonStarted(reload, 'reload'), true);
  assert.equal(reload.current.state, 'done');
  assert.ok(reload.current.abortedAt);
  assert.equal(rules.charge(inv, reload, 'round-b', 322, 20, 2), null);
  assert.equal(inv.coins, 30);
});

test('legacy charged but unstarted entry can be used once', () => {
  const w = { ...fresh(), current: { id: 'legacy', state: 'pending', paidAt: 1 } };
  const inv = { coins: 30 };
  assert.equal(rules.charge(inv, w, 'round-b', 322, 20, 2), null);
  assert.equal(rules.charge(inv, w, 'legacy', 321, 20, 2).paidAt, 1);
  assert.equal(inv.coins, 30);
  assert.equal(w.playsLeft, 0);
});

test('insufficient funds or qualification does not mutate the save', () => {
  const w = { ...fresh(), hammerRecipeVerified: true, playsLeft: 1 };
  const inv = { coins: 19 };
  assert.equal(rules.charge(inv, w, 'round', 123, 20, 1), null);
  assert.equal(inv.coins, 19);
  assert.equal(w.playsLeft, 1);
  assert.equal(w.current, undefined);
});

test('four loading stories follow the displayed integer percentage', () => {
  for (const [from, to, prefix] of [
    [0, 25, '每次氣球課'], [26, 50, '有時候'], [51, 75, '氣球槌柔軟'], [76, 100, '小V哥哥想']
  ]) for (let percent = from; percent <= to; percent++) {
    const progress = percent === 100 ? 1 : (percent + 0.2) / 100;
    assert.ok(rules.storyAt(progress).startsWith(prefix));
  }
  for (const kind of ['whack', 'volleyball']) {
    assert.match(rules.storyHtml(kind), /<details[^>]*class=/);
    assert.match(rules.storyHtml(kind), /<summary[^>]*>遊戲背後的故事/);
  }
});

const directories = ['rpg-continent1-universe', 'rpg-dual-continent-test'];
const part = (code, start, end) => code.slice(code.indexOf(start), code.indexOf(end, code.indexOf(start)));
for (const dir of directories) {
  const main = read(dir + '/main.js');
  test(dir + ' official restart waits for the requested chapter groups', () => {
    const calls = [];
    const ctx = vm.createContext({
      assetGateBusy: false, whFrame: {},
      getAssetGroupsForLevelBase(index) { assert.equal(index, 0); return ['common', 'chapter1']; },
      getAssetGateTitleForLevel() { return 'Chapter 1'; },
      runWithAssetGate(groups, _title, fn) { calls.push(...groups); ctx.go = fn; },
      advBeginOfficialChallenge() { calls.push('reset'); }
    });
    vm.runInContext(part(main, 'function advStartOfficialChallenge()', 'function advBeginOfficialChallenge()') + '\nadvStartOfficialChallenge()', ctx);
    assert.deepEqual(calls, ['common', 'chapter1']);
    ctx.go();
    assert.deepEqual(calls, ['common', 'chapter1', 'reset']);
  });

  test(dir + ' cached failure is retried before the restart callback', async () => {
    const calls = [];
    let complete;
    const ctx = vm.createContext({
      whFrame: {},
      ASSET_GROUP_STATE: { chapter1: { settled: true, summary: { criticalFailed: 1 } } },
      isAssetGroupReady: () => false,
      ensureAssetGroups(_groups, _progress, force) { calls.push(force); return new Promise(resolve => { complete = resolve; }); },
      showAssetLoadingOverlay() {}, flushPendingAssetApplies() {}, hideAssetLoadingOverlay() {},
      finish() { calls.push('reset'); }
    });
    vm.runInContext(part(main, 'let assetGateBusy = false;', '// ── debug 指令') + '\nrunWithAssetGate(["chapter1"], "", finish)', ctx);
    assert.deepEqual(calls, [true]);
    complete({ ok: true });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, [true, 'reset']);
  });

  test(dir + ' payment is rolled back if the save cannot be written', () => {
    const inv = { coins: 40, whack: { ...fresh(), playsLeft: 1, hammerRecipeVerified: true } };
    const context = vm.createContext({
      AdventureEntry: rules, C1U_WHACK: { fee: 20 }, playerInventory: inv,
      whData: () => inv.whack, whPending: () => inv.whack.current, whSave: () => false
    });
    const result = vm.runInContext(part(main, 'function whPay(sess)', '// 小遊戲轉接') + '\nwhPay({ id: "attempt", seed: 4 })', context);
    assert.equal(result, false);
    assert.equal(inv.coins, 40);
    assert.equal(inv.whack.playsLeft, 1);
    assert.equal(inv.whack.current, undefined);
  });

  test(dir + ' iframe progress waits for image and audio payloads', () => {
    const turns = [];
    const frame = { contentWindow: { __wam: { game: {}, renderer: {} }, WAM: {
      Assets: { report: () => ({ monster: 'ok' }) },
      Audio: { report: () => ({ sfx: { hit: 'loading' }, bgm: 'ok' }) },
      CONFIG: { IMAGES: { monster: { path: 'monster.png' } }, AUDIO: { SFX: { hit: { path: 'hit.mp3' } } } }
    } } };
    const loader = { st: {} };
    const context = vm.createContext({
      frame, ADV_LOAD: loader, whFrame: { iframe: frame, loading: true },
      clearTimeout() {}, clearInterval() {},
      whAdapt: () => turns.push('ready'), whFrameFail: (_sess, paths) => turns.push(paths[0])
    });
    vm.runInContext(part(main, 'function whCheckFrame(', 'function whPay('), context);
    vm.runInContext('whCheckFrame(frame, {})', context);
    assert.equal(loader.st.realP, 2 / 3);
    assert.deepEqual(turns, []);
    frame.contentWindow.WAM.Audio.report = () => ({ sfx: { hit: 'failed' }, bgm: 'ok' });
    vm.runInContext('whCheckFrame(frame, {})', context);
    assert.deepEqual(turns, ['hit.mp3']);
    frame.contentWindow.WAM.Audio.report = () => ({ sfx: { hit: 'fetched' }, bgm: 'ok' });
    vm.runInContext('whCheckFrame(frame, {})', context);
    assert.equal(loader.st.realP, 1);
    assert.deepEqual(turns, ['hit.mp3', 'ready']);
  });
}
