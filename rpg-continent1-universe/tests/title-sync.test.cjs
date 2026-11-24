const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../universe-official.js'), 'utf8');
const entries = new Set(['1-1', '1-2b', '1-3', '2-1', '2-2', '2-3', '2-4']);

function fixture(mode = 'production', hostname = 'vashyang1120.github.io') {
  const events = {};
  const calls = [];
  const store = new Map();
  const d = { runs: {}, titles: {}, results: [] };
  let sent;
  let fail = false;
  let failMigration = false;
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  const box = {
    BVUniverse: {
      createApiClient: () => ({ _request: async (method, url, body) => {
        calls.push({ url, body });
        if (fail && url.endsWith('/adventure-title-result')) throw { kind: 'network' };
        if (url.endsWith("/adventure-title-migration")) {
          if (failMigration) throw { kind: "network" };
          return { confirmed: body.claims.map((c) => c.record.titleKey) };
        }
        return {};
      } }),
      createOfficialClient: ({ getPlayer }) => ({
        init: () => ready, isEnabled: () => true,
        beginRun: async () => ({ official: true, sessionId: 's_test', ...getPlayer() }),
        submitRun: async (run, score) => { sent = score; return {}; },
      }),
      describeOfficialResult: () => '',
    },
    GAME_VERSION: 'fixture', advPlayMode: 'official', OFFICIAL_ADVENTURE_STAGE_IDS: [...entries],
    C1U: { mode, verify: 'ok', playerId: 'player-one', storageId: 'player-one', ws: '__c1u__prd__player-one', profile: { displayId: 'Title Test', baseAvatarKey: 'boy1' } },
    c1uIsUniversePlayer: () => !box.C1U.guest,
    advDevMode: () => !!box.dev,
    advNewRun: () => ({ status: 'in_progress', challengeId: 'adv-1234567890', startedAt: 1 }),
    advOnAttemptStart: () => {}, advAfterClear: () => {},
    achLoad: () => d, achSave: () => {},
    VB_CONFIG: { targetScore: 5 },
    vbOpenFrame: () => {}, vbSettle: (data, state) => { state.result = data; return true; },
    whOpenFrame: () => {}, whSettle: () => true, whData: () => ({ current: { id: 'whack-match', score: 660 } }),
    location: { hostname },
    C1U_TITLES: [{ titleKey: 'adventure_whack_legend', name: '傳奇槌王', desc: '氣球槌打地鼠達到 660 分' }],
    h2Esc: (s) => s, c1uFinalSectionsHtml: () => '本趟稱號',
    h2PanelBody: () => '', addEventListener: (event, fn) => { events[event] = fn; },
    document: { getElementById: () => null, addEventListener: () => {} },
    localStorage: { getItem: (key) => store.get(key), setItem: (key, val) => store.set(key, val) },
    C1U_ACH_KEY: "achievement-key", ADV_DEVTEST: { rawGet: (key) => store.get(key), rawSet: (key, v) => store.set(key, v) },
    setTimeout: () => 1, clearTimeout: () => {},
  };
  box.window = box;
  vm.runInNewContext(source, box);
  return { box, d, events, calls, store, release, sent: () => sent, fail: (value) => { fail = value; }, failMigration: (value) => { failMigration = value; } };
}

test('only new fully tracked adventures carry counters, snapshotted before networking', async () => {
  const f = fixture();
  const run = f.box.advNewRun();
  const snap = { challengeId: run.challengeId, complete: true };
  f.box.c1uFinalCtx = { eligible: true, challengeId: run.challengeId };
  const track = f.d.runs[run.challengeId];
  assert.equal(track.fullTracking, true);
  const promise = f.box.C1UOfficial.submitSnapshot(snap);
  track.purchases = 1;
  f.box.c1uFinalCtx = null;
  f.release();
  await promise;
  assert.deepEqual({ ...f.sent().achievementTrack }, { kills: 0, damage: 0, purchases: 0 });
  f.box.c1uFinalCtx = { eligible: true, challengeId: run.challengeId };
  delete track.fullTracking;
  assert.equal(f.box.C1UOfficial.scoreDataFrom(snap).achievementTrack, undefined);
});

test('a previously unlocked whack title appears in Party Island achievements', () => {
  const f = fixture();
  assert.doesNotMatch(f.box.h2PanelBody('handbook'), /傳奇槌王/);
  f.d.titles.adventure_whack_legend = {};
  assert.match(f.box.h2PanelBody('handbook'), /派對島已解鎖成就.*傳奇槌王/);
  assert.match(f.box.c1uFinalSectionsHtml({}), /^本趟稱號.*派對島已解鎖成就.*傳奇槌王/);
});

test('test-2 thrift records missed by score sync recover only on Staging', async () => {
  const key = 'adventure_super_thrifty';
  const id = 'adv-history-abc';
  const record = { gameId: 'adventure', category: 'adventure', source: 'client', serverConfirmed: false,
    gameVersion: 'adventure-v0.4.2-title-sync-test-2', titleKey: key, challengeId: id, unlockedAt: 1234 };
  for (const [hostname, fullTracking, purchases, expected] of [
    ['balloon-v-universe-staging.pages.dev', false, 0, 'permanent'],
    ['balloon-v-universe-staging.pages.dev', true, 0, 'settlement'],
    ['balloon-v-universe-staging.pages.dev', true, 1, 'blocked'],
    ['vashyang1120.github.io', false, 0, 'blocked'],
  ]) {
    const f = fixture('production', hostname);
    f.store.set('achievement-key' + f.box.C1U.ws, JSON.stringify({
      titles: { [key]: record },
      runs: { [id]: { fullTracking, kills: 1, damage: 1, purchases } },
      results: [{ submissionId: id, playerId: f.box.C1U.playerId, gameId: 'adventure', mode: 'production' }],
    }));
    await f.events.online();
    const claim = f.calls[0]?.body.claims[0];
    if (expected === 'blocked') assert.equal(claim, undefined);
    else {
      assert.equal(claim.record.titleKey, key);
      assert.equal(claim.evidence?.id, expected === 'settlement' ? id : undefined);
    }
  }
});

test('changing identity during an adventure submission prevents sending it as another player', async () => {
  const f = fixture();
  const pending = f.box.C1UOfficial.submitSnapshot({ challengeId: 'adv-1234567890', complete: true });
  f.box.C1U.playerId = 'player-two';
  f.release();
  await pending;
  assert.equal(f.sent(), undefined);
});

test('minigame retry keeps the qualified result in the original player outbox', async () => {
  const f = fixture();
  const state = { id: 'volley-match', opponent: 'orange_king' };
  f.box.vbOpenFrame(state);
  f.fail(true);
  assert.equal(f.box.vbSettle({ playerScore: 5, cpuScore: 0, winner: 'player' }, state), true);
  await f.events.online();
  const key = [...f.store.keys()][0];
  assert.ok(JSON.parse(f.store.get(key))['volley-match']);
  f.box.C1U.playerId = 'player-two';
  f.fail(false);
  await f.events.online();
  assert.ok(JSON.parse(f.store.get(key))['volley-match']);
  f.box.C1U.playerId = 'player-one';
  await f.events.online();
  assert.deepEqual(JSON.parse(f.store.get(key)), {});
  assert.deepEqual(f.calls.map((c) => c.url.split('/').pop()), ['adventure-title-session', 'adventure-title-result', 'adventure-title-result']);
});

test('sandbox, guests and developer mode never start title writes', () => {
  const sandbox = fixture('sandbox');
  sandbox.box.whOpenFrame({ id: 'whack-match' });
  assert.equal(sandbox.calls.length, 0);
  const active = fixture();
  for (const flag of ['guest', 'dev']) {
    active.box.C1U.guest = flag === 'guest';
    active.box.dev = flag === 'dev';
    active.box.whOpenFrame({ id: 'whack-match' });
    active.box.whSettle({}, 'whack-match');
  }
  assert.equal(active.calls.length, 0);
  assert.equal(active.store.size, 0);
});

test('migration uses the verified player namespace and remembers only server-acknowledged titles', async () => {
  const f = fixture();
  const player = f.box.C1U;
  const title = 'adventure_whack_legend';
  const legacy = { gameId: 'adventure', category: 'adventure', source: 'client', serverConfirmed: false,
    gameVersion: 'adventure-v0.4.1-continent1-universe-test-1', unlockedAt: 1234, titleKey: title, via: 'whack:660' };
  const save = JSON.stringify({ titles: { [title]: legacy } });
  const marker = 'bvAdventureLegacyMigrated_v1__player-one';
  f.store.set('achievement-key' + player.ws + 'devplay', save);
  f.store.set('achievement-key__c1u__sbx__player-one', save);
  f.store.set('achievement-key__c1u__prd__player-two', save);
  await f.events.online();
  assert.equal(f.calls.length, 0);
  f.store.set('achievement-key' + player.ws, save);
  f.box.dev = true;
  await f.events.online();
  assert.equal(f.calls.length, 0);
  f.box.dev = false;
  f.failMigration(true);
  await f.events.online();
  assert.equal(f.store.has(marker), false);
  f.failMigration(false);
  await f.events.online();
  assert.equal(f.calls[1].body.claims[0].record.titleKey, title);
  assert.equal(f.calls[1].body.claims[0].evidence, undefined);
  assert.deepEqual(JSON.parse(f.store.get(marker)), { [title]: true });
  await f.events.online();
  player.playerId = 'player-two';
  await f.events.online();
  assert.equal(f.calls.length, 2);
});

test('volleyball forwards five-point shutouts for all opponents and skips other results', async () => {
  for (const opponent of ['scorpion', 'orange', 'orange_king']) {
    const f = fixture();
    for (const [i, playerScore, cpuScore, winner] of [
      [0, 5, 0, 'player'], [1, 5, 1, 'player'], [2, 5, 4, 'player'],
      [3, 0, 5, 'cpu'], [4, 4, 5, 'cpu'],
    ]) {
      const match = { id: 'match-' + i, opponent };
      f.box.vbOpenFrame(match);
      f.box.vbSettle({ playerScore, cpuScore, winner }, match);
    }
    await f.events.online();
    const results = f.calls.filter((call) => call.url.endsWith('/adventure-title-result'));
    assert.equal(results.length, 1);
    assert.deepEqual({ ...results[0].body.evidence }, {
      kind: 'volleyball', opponent, playerScore: 5, cpuScore: 0, winner: 'player',
    });
  }
});
