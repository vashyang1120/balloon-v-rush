(function (root) {
  'use strict';

  const stories = {
    whack: [
      '每次在氣球課教孩子們製作氣球槌時，總會有孩子開始扮成地鼠，跟我玩起打地鼠遊戲。',
      '有時候是我當地鼠，有時候是孩子們當地鼠，每次都玩得非常開心。',
      '氣球槌柔軟、富有彈性，輕輕敲打就有很有趣的打擊回饋。它色彩繽紛，更是孩子們自己親手完成的玩具。',
      '如果氣球槌只能在派對島裡用來冒險，我覺得有點可惜。',
      '因為每當看到氣球槌，我就會想到和孩子們玩打地鼠的畫面。',
      '所以，我把這份歡樂的回憶變成了派對島裡的小遊戲！'
    ],
    volleyball: [
      '氣球排球的靈感，同樣來自我的氣球課堂。',
      '每當孩子們親手完成氣球排球，大家就會迫不及待地互相傳球、一起玩起排球遊戲。',
      '從自己動手製作，到和朋友一起遊玩，氣球不只是完成一件作品，更能創造許多歡樂的回憶。',
      '我希望這份在氣球教室裡的快樂，也能延續到派對島的冒險世界。',
      '這就是氣球排球小遊戲的由來！'
    ]
  };
  const loadingStory = [
    '每次氣球課教大家製作氣球槌時，孩子們總會自動扮成地鼠，跟小V哥哥玩起打地鼠遊戲！',
    '有時候是孩子們當地鼠，有時候是小V哥哥當地鼠，大家總是玩得不亦樂乎！',
    '氣球槌柔軟又有彈性，輕輕敲打就有有趣的回饋，還是孩子們親手完成的玩具！',
    '小V哥哥想把氣球課上的歡樂回憶，也帶進派對島的世界，於是氣球槌打地鼠就誕生了！'
  ];

  function hasPlayed(w) {
    return Boolean(w.current?.paidAt || Object.keys(w.settled).length ||
      w.history.some(entry => entry?.t === 'enter' || entry?.t === 'game'));
  }

  // 1-2 的舊版通關流程保證發放秘笈。永久通關紀錄可修復重開正式挑戰後的舊背包。
  function reconcile(w, recipe, cleared, at) {
    let changed = false;
    if (!w.hammerRecipeVerified && (recipe || cleared)) {
      w.hammerRecipeVerified = true;
      w.unlocked = true;
      w.unlockedAt = w.unlockedAt || at;
      changed = true;
    }
    if (w.hammerRecipeVerified && cleared && !w.firstPlayGranted) {
      w.firstPlayGranted = true;
      if (!hasPlayed(w)) w.playsLeft = Math.max(w.playsLeft, 1);
      changed = true;
    }
    return changed;
  }

  function charge(inv, w, id, seed, fee, at) {
    const c = w.current;
    if (c && c.state !== 'done' && c.state !== 'abandoned') {
      return c.state === 'pending' && !c.startedAt && c.id === id && c.paidAt ? c : null;
    }
    if (!w.hammerRecipeVerified || w.playsLeft < 1 || (inv.coins || 0) < fee) return null;
    inv.coins -= fee;
    w.playsLeft -= 1;
    w.current = { id, seed, state: 'active', fee, paidAt: at, startedAt: at };
    w.history.push({ t: 'enter', at, session: id, fee, playsLeft: w.playsLeft });
    return w.current;
  }

  function abandonStarted(w, reason) {
    const c = w.current;
    if (!c || !c.paidAt || (c.state !== 'active' && !(c.state === 'pending' && c.startedAt))) return false;
    c.state = 'abandoned';
    c.lastStop = reason;
    return true;
  }

  function storyHtml(game) {
    return '<details data-entry-story="' + game + '" class="vb-box" style="display:block"><summary style="cursor:pointer;font-weight:bold">遊戲背後的故事</summary>' +
      stories[game].map(paragraph => '<p>' + paragraph + '</p>').join('') + '</details>';
  }

  function storyAt(progress) {
    const pct = Math.floor(progress * 100);
    return loadingStory[pct <= 25 ? 0 : pct <= 50 ? 1 : pct <= 75 ? 2 : 3];
  }

  // 進度決定正在探頭的洞。前一個動作可以直接略過，素材就緒時立即離開。
  function drawHoles(g, bar, progress, now, st) {
    const types = ['scorpion', 'orange', 'spike', 'scorpion', 'orange', 'scorpion', 'spike', 'scorpion', 'boss'];
    const index = Math.min(8, Math.floor(progress * 9));
    if (st.holeIndex !== index) { st.holeIndex = index; st.holeSince = now; }
    const age = now - st.holeSince;
    const active = types[index], bursts = active === 'orange' || active === 'spike';
    const y = bar.y - 17;
    const step = bar.w / types.length;
    for (let i = 0; i < types.length; i++) {
      const x = Math.round(bar.x + step * (i + 0.5));
      g.fillStyle = '#574168'; g.fillRect(x - 21, y - 4, 42, 10);
      g.fillStyle = '#21152f'; g.fillRect(x - 16, y - 3, 32, 6);
      if (i !== index) continue;
      const h = Math.round(Math.min(age / 90, 1) * 23);
      g.save();
      g.beginPath(); g.rect(x - 23, y - 31, 46, 29); g.clip();
      g.translate(x, y - h);
      if (active === 'spike') {
        g.fillStyle = '#ccc2e1';
        for (let j = 0; j < 5; j++) g.fillRect(-2 - j * 2, j * 4, 4 + j * 4, 4);
      } else {
        g.fillStyle = active === 'scorpion' ? '#7ad6d0' : active === 'boss' ? '#ffab45' : '#ff934e';
        g.fillRect(-11, 1, 22, 19);
        g.fillRect(-15, 7, 30, 9);
        g.fillStyle = '#281f3d'; g.fillRect(-6, 7, 3, 4); g.fillRect(3, 7, 3, 4);
        if (active === 'boss') {
          g.fillStyle = '#ffe16d';
          g.fillRect(-11, -3, 22, 3);
          for (const dx of [-11, -1, 8]) g.fillRect(dx, -7, 3, 4);
        }
      }
      g.restore();
      if (active === 'boss' || age < 95 || age > 320) continue;
      if (bursts && age > 175) {
        g.fillStyle = '#ffda86';
        for (const [dx, dy] of [[-13, -30], [7, -41], [17, -26], [-6, -44], [11, -16]]) {
          g.fillRect(x + dx, y + dy, 4, 4);
        }
      } else {
        const swingY = y - 43 + Math.min(17, Math.round((age - 95) / 5));
        g.fillStyle = '#e3a7ff'; g.fillRect(x + 2, swingY, 21, 9);
        g.fillStyle = '#bd76ef'; g.fillRect(x + 15, swingY + 8, 5, 12);
      }
    }
  }

  root.AdventureEntry = { reconcile, charge, abandonStarted, storyHtml, storyAt, drawHoles };
})(globalThis);
