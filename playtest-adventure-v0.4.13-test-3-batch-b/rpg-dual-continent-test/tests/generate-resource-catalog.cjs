'use strict';
const { writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { createPreview } = require('../../tests/preview-entry.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('../../minigames/whack-a-mole/js/config.js');

async function scan() {
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.route(/^https?:\/\/[^/]+\//, route =>
      route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    await page.goto(origin + '/rpg-dual-continent-test/?guest=1&sandbox=1&devtools=1');
    await page.waitForFunction(() => assetBootReady, undefined, { timeout: 90000 });
    return await page.evaluate(() => {
      const official = new Set(OFFICIAL_ADVENTURE_STAGE_IDS);
      function at(enemy, otherwise) {
        const { c2Id, type, variant, x, y } = enemy;
        return { id: c2Id, type: type || otherwise, variant, x, y };
      }
      const stages = LEVELS.map((lv, index) => {
        loadLevel(index);
        const id = lv.stageId;
        const scope = official.has(id) ? 'continent1'
          : /^3-[1-4]$/.test(id) ? 'continent2' : 'alternate';
        const resources = adventureLevelResourceConfig(lv);
        const foes = [
          ...enemies.map(e => at(e, 'scorpion')),
          ...orangeNemeses.map(e => at(e, 'orange')),
          ...chimneyOranges.map(e => at(e, 'chimneyOrange')),
          ...dualNozzleOranges.map(e => at(e, 'dualNozzleOrange')),
          ...projectileOranges.map(e => at(e, 'projectileOrange')),
          ...fanOranges.map(e => at(e, 'fanOrange')),
        ];
        if (id === '2-4') foes.push({ type: 'orangeKing', x: null, y: null });
        return { id, scope, length: lv.length, ...resources, enemies: foes };
      });
      const requiredKnown = ['basicHammer', 'balloonUmbrella'].map(id => ({
        id, cost: RECIPES.find(recipe => recipe.id === id).cost,
      }));
      requiredKnown.push({ id: 'firstDogTrip', cost: { balloon260: CONFIG.DOG_LEASH_COST_BALLOON260 } });
      const opening = c34CumulativeResources();
      const afterRequiredKnown = { ...opening.totals };
      for (const step of requiredKnown) {
        for (const [unit, amount] of Object.entries(step.cost)) afterRequiredKnown[unit] -= amount;
      }
      const totals = {};
      for (const [scope, filter] of Object.entries({
        continent1: stage => stage.scope === 'continent1',
        continent2: stage => stage.scope === 'continent2',
        both: stage => stage.scope !== 'alternate',
      })) {
        const selected = stages.filter(filter);
        const fixed = { coins: 0, balloon260: 0, roundBalloon: 0 };
        let optionalCoins = 0;
        for (const stage of selected) {
          for (const key of Object.keys(fixed)) fixed[key] += stage.fixed[key];
          optionalCoins += stage.hidden.reduce((sum, item) => sum + item.coins, 0);
        }
        totals[scope] = { fixed, optionalCoins };
      }
      return {
        version: GAME_VERSION, stages, totals,
        opening34: { ...opening, afterRequiredKnown },
        minigames: {
          volleyball: {
            costPerCraft: VB_CONFIG.cost, maxMatches: VB_CONFIG.maxMatches, reward: VB_CONFIG.reward,
          },
          whack: { costCoins: C1U_WHACK.fee, maxPlays: C1U_WHACK.maxPlays },
        },
        requiredKnown, unknown: ['enemyRandomDrops', 'conditionalClearRewards', 'fullRepeatRules', 'bossSpawn'],
      };
    });
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

function markdown(data) {
  const rows = data.stages.map(({ id, scope, fixed, hidden, specials, enemies }) => {
    const hiddenLabel = hidden.map(item => item.name + (item.coins ? '（+' + item.coins + ' 金幣）' : '')).join('、') || '—';
    const specialLabel = specials.map(item => item.kind + '×' + item.amount).join('、') || '—';
    return '| ' + [id, scope, fixed.coins, fixed.balloon260, fixed.roundBalloon, specialLabel, hiddenLabel, enemies.length].join(' | ') + ' |';
  });
  const totalRows = Object.entries(data.totals).map(([group, { fixed, optionalCoins }]) =>
    '| ' + [group, fixed.coins, fixed.balloon260, fixed.roundBalloon, optionalCoins].join(' | ') + ' |');
  const { totals, afterRequiredKnown, recipes } = data.opening34;
  const amounts = data => [data.coins, data.balloon260, data.roundBalloon].join('／');
  return [
    '# 冒險資源統計', '',
    '由遊戲實際關卡配置產生。金幣和氣球指地圖可收集數量，特殊組合已取代原拾取物並併入三欄。隱藏道具為額外選擇性收入。alternate 為非主線的舊關或開發場。', '',
    '| 關卡 | 路線 | 金幣 | 260 氣球 | 圓氣球 | 已計入的錢袋／組合 | 隱藏資源 | 敵人 |',
    '| --- | --- | ---: | ---: | ---: | --- | --- | ---: |', ...rows, '',
    '| 主線合計 | 金幣 | 260 氣球 | 圓氣球 | 可選寶箱金幣 |',
    '| --- | ---: | ---: | ---: | ---: |', ...totalRows, '',
    '## 3-4 起始試玩背包', '',
    '- 走完 1-1 至 3-3 且收集配置內固定資源及一次性寶箱，金幣／260／圓氣球為 **' + amounts(totals) + '**。',
    '- 扣除目前已核實的槌、雨傘與首趟狗繩，參考值為 **' + amounts(afterRequiredKnown) + '**。自由消費及補貼會讓實際背包不同。',
    '- 前置秘笈為 ' + recipes.join('、') + '，另依第三章測試規格標記骰子解鎖。水池捷徑從左岸開始，略過區段的本關拾取仍是 0。',
    '', '## 額外來源與待核', '',
    '- 排球配置保存首局到最多三場的入場製作成本、勝負及分數分級資源。打地鼠記錄費用、資格及三段獎勵。兩者均未加入主線合計。',
    '- 各關可重玩與一次性額外資源由既有進度及通關規則決定。敵人隨機掉落、條件式通關獎勵、完整重玩細則待核。暫無可證實的分布及期望值，未加入預設背包。',
    '- 第三章逐隻敵人的類型及出生座標見 JSON。', '',
    '重新產生：`node rpg-dual-continent-test/tests/generate-resource-catalog.cjs`。需要 Playwright 與 Chrome。', '',
  ].join('\n');
}
scan().then(async data => {
  data.minigames.whack.rewards = globalThis.WAM.CONFIG.REWARD_TIERS;
  const docs = resolve(__dirname, '../../docs/development/v0.4.13-test-2');
  await Promise.all([
    writeFile(resolve(docs, 'RESOURCE_CATALOG.json'), JSON.stringify(data, null, 2) + '\n'),
    writeFile(resolve(docs, 'RESOURCE_CATALOG.md'), markdown(data)),
  ]);
}).catch(error => { console.error(error); process.exitCode = 1; });
