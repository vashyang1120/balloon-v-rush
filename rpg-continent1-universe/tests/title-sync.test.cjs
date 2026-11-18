const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../universe-official.js'), 'utf8');
const entries = new Set(['1-1', '1-2b', '1-3', '2-1', '2-2', '2-3', '2-4']);

function fixture(mode = 'production') {
  const events = {};
  const calls = [];
  const store = new Map();
  const d = { runs: {}, titles: {}, results: [] };
  let sent;
  let fail = false;
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  const box = {
    BVUniverse: {
      createApiClient: () => ({ _request: async (method, url, body) => {
        calls.push({ url, body });
        if (fail && url.endsWith('/adventure-title-result')) throw { kind: 'network' };
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
    C1U: { mode, verify: 'ok', playerId: 'player-one', profile: { displayId: 'Title Test', baseAvatarKey: 'boy1' } },
    c1uIsUniversePlayer: () => !box.C1U.guest,
    advDevMode: () => !!box.dev,
    advNewRun: () => ({ status: 'in_progress', challengeId: 'adv-1234567890', startedAt: 1 }),
    advOnAttemptStart: () => {}, advAfterClear: () => {},
    achLoad: () => d, achSave: () => {},
    vbOpenFrame: () => {}, vbSettle: (_data, state) => { state.result = { playerScore: 7, cpuScore: 0 }; return true; },
    whOpenFrame: () => {}, whSettle: () => true, whData: () => ({ current: { id: 'whack-match', score: 660 } }),
    h2PanelBody: () => '', addEventListener: (event, fn) => { events[event] = fn; },
    document: { getElementById: () => null, addEventListener: () => {} },
    localStorage: { getItem: (key) => store.get(key), setItem: (key, val) => store.set(key, val) },
    setTimeout: () => 1, clearTimeout: () => {},
  };
  box.window = box;
  vm.runInNewContext(source, box);
  return { box, d, events, calls, store, release, sent: () => sent, fail: (value) => { fail = value; } };
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
  assert.equal(f.box.vbSettle({}, state), true);
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
