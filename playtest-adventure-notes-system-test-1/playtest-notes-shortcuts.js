'use strict';
// Adventure Notes System Test 1 — playtest-package-only shortcuts for the Continent 1 copy.
// Loaded only by playtest-adventure-notes-system-test-1/rpg-continent1-universe/index.html (never by the
// official rpg-continent1-universe/). Works only inside the playtest guard (own storage namespace, guest +
// sandbox forced), so nothing here can touch official player data.
//   ?notesqa=note23    2-3 with the balloon dog, a few steps before the 橘子王觀察筆記 (walk right)
//   ?notesqa=home      小V之家 → 冒險筆記 (whatever this test save has collected)
//   ?notesqa=homeboss  same, after a simulated 2-3 clear that brought the boss note home (test save only)
(() => {
  const q = new URLSearchParams(location.search);
  const job = q.get('notesqa');
  if (!job || !window.adventurePlaytestReady || q.get('guest') !== '1' || q.get('sandbox') !== '1') return;
  const begun = Date.now();
  let prepared = false;
  const timer = setInterval(() => {
    if (Date.now() - begun > 120000) return clearInterval(timer);
    try {
      if (typeof assetBootReady === 'undefined' || !assetBootReady || !window.AdvNotes) return;
      if (!prepared) { prepared = true; rpgLoad().worldIntro = 'done'; }   // skip the first-visit world intro in this test save
      if (gameStartGateActive || (typeof assetGateActive !== 'undefined' && assetGateActive)) return;
    } catch (e) { return; }
    clearInterval(timer);
    setTimeout(run, 400);
  }, 200);
  function run() {
    try { if (rpgActive) rpgClose('reset'); } catch (e) {}
    try { advHideResumePrompt(); } catch (e) {}
    if (job === 'note23') {
      try { closeHomeScreen(); } catch (e) {}
      currentLevelIndex = LEVELS.findIndex(level => level.stageId === '2-3');
      loadLevel(currentLevelIndex);
      restart({ keepHp: false });
      bringBalloonDog = true; levelStartBringDog = true;
      player.x = 4980; player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0;
      cameraX = Math.max(0, player.x - 380);
      gameState = 'playing'; lastTime = 0; fixedStepAccumulator = 0;
      try { if (typeof window.showPauseBtn === 'function') window.showPauseBtn(); } catch (e) {}
      showHint('🧪 測試捷徑：2-3（已帶氣球小狗），往右走就會找到橘子王觀察筆記', 260);
      return;
    }
    if (job === 'home' || job === 'homeboss') {
      if (job === 'homeboss') {
        playerInventory.keyItems = playerInventory.keyItems || {};
        if (!playerInventory.keyItems.orangeKingWeaknessNote01) {
          playerInventory.keyItems.orangeKingWeaknessNote01 = { id: 'orangeKingWeaknessNote01', type: 'bossNote', name: '橘子王觀察筆記', emoji: '📜', title: '橘子王觀察筆記', noteText: '', acquiredAt: Date.now() };
        }
        saveInventory();
      }
      gameState = 'paused';
      openHomeScreen('normal');
      setTimeout(() => { try { h2HideSummary(); } catch (e) {} AdvNotes.openPanel(); }, 300);
    }
  }
})();
