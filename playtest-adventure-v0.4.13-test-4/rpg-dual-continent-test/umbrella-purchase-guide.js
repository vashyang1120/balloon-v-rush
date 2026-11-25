'use strict';

(() => {
  const sceneId = 'c2_umbrella_shop';
  const packId = 'b260Bundle';
  const recipeId = 'balloonUmbrella';
  let phase = null;
  let entranceTimer = 0;
  let focusFrame = 0;
  let crafting = false;
  const wrapFn = (name, wrap) => { globalThis[name] = wrap(globalThis[name]); };

  function target() {
    if (phase === 'shop') return document.querySelector('[data-h2-act="buy395"][data-key="' + packId + '"]');
    if (phase === 'craft') return document.querySelector('[data-h2-act="craft"][data-key="' + recipeId + '"]');
    return null;
  }

  function setPhase(next) {
    phase = next;
    document.body.classList.toggle('umbrella-guide', !!next);
    document.body.classList.toggle('umbrella-guide-panel', next === 'shop' || next === 'craft');
  }

  function refreshFocus(scroll = false) {
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      document.querySelector('.umbrella-guide-row')?.classList.remove('umbrella-guide-row');
      const button = target();
      if (!button) return;
      const row = button.closest('.h2-row');
      row?.classList.add('umbrella-guide-row');
      if (scroll) button.scrollIntoView({ block: 'center' });
      button.focus({ preventScroll: true });
    });
  }

  function openRequiredPanel() {
    const prep = c2UmbrellaPrep();
    if (prep.ready || (!prep.buy && !prep.craft)) {
      delete c2Flow().umbrellaPurchaseGuide;
      saveInventory();
      setPhase(null);
      return;
    }
    if (prep.buy) {
      H2.shopQty[packId] = prep.quantity;
      setPhase('shop');
      h2OpenPanel('shop', { focus: packId });
    } else {
      setPhase('craft');
      h2ShowFix(c2DepartState().fix);
      h2OpenPanel('recipes', { focus: recipeId });
    }
    refreshFocus(true);
  }

  function startGuide() {
    if (phase) return;
    if (!c2UmbrellaPrep().buy) return;
    c2Flow().umbrellaPurchaseGuide = true;
    if (!saveInventory()) {
      delete c2Flow().umbrellaPurchaseGuide;
      h2Toast('存檔失敗，請重新出發');
      return;
    }
    setPhase('dialogue');
    rpgRequestUi(sceneId);
  }

  wrapFn('rpgBuildScene', original => function (id) {
    if (id !== sceneId) return original.apply(this, arguments);
    const prep = c2UmbrellaPrep();
    return { id, title: '購買雨傘材料', modeControlled: false, requirePages: true, left: null, right: 'star_spirit_normal',
      pages: [
        { sp: 'spirit', face: 'star_spirit_normal', text: '小V！要前往下一關，需要一把氣球雨傘喔！' },
        { sp: 'spirit', face: 'star_spirit_normal', text: '可是你的 260 長條氣球只有 ' + prep.have + ' 條，還差 ' + prep.missing + ' 條……' },
        { sp: 'spirit', face: 'star_spirit_normal', text: '右上角的商店可以購買氣球，快去補足吧！' },
      ] };
  });

  wrapFn('rpgShowPage', original => function () {
    const result = original.apply(this, arguments);
    if (rpgActive?.id === sceneId && rpgPageIdx === 2) rpgSetButtonFocus('umbrella-guide-shop-entry');
    return result;
  });
  wrapFn('rpgClose', original => function (how) {
    const comingFromGuide = rpgActive?.id === sceneId;
    const result = original.apply(this, arguments);
    if (comingFromGuide && (how === 'finished' || how === 'skipped')) {
      setPhase('opening');
      clearTimeout(entranceTimer);
      entranceTimer = setTimeout(openRequiredPanel, 450);
    }
    return result;
  });
  wrapFn('h2Go', original => function () {
    if (phase) return;
    if (c2Is31Clear() && c2UmbrellaPrep().buy) return startGuide();
    return original.apply(this, arguments);
  });
  wrapFn('h2ShowFix', original => function (fix) {
    if (fix?.c2buy) return startGuide();
    return original.apply(this, arguments);
  });
  wrapFn('h2Open', original => function () {
    const result = original.apply(this, arguments);
    if (c2Is31Clear() && c2Flow().umbrellaPurchaseGuide && !phase) {
      // The stored marker and current inventory determine which step remains after a reload.
      setPhase('opening');
      requestAnimationFrame(openRequiredPanel);
    }
    return result;
  });
  wrapFn('h2RenderPanel', original => function () {
    const result = original.apply(this, arguments);
    if (phase === 'shop' || phase === 'craft') refreshFocus();
    return result;
  });
  wrapFn('v395ShopBuy', original => function (id) {
    if (!phase) return original.apply(this, arguments);
    if (phase !== 'shop' || id !== packId) return;
    const prep = c2UmbrellaPrep();
    if (!prep.buy) return openRequiredPanel();
    H2.shopQty[packId] = prep.quantity;
    const result = original.apply(this, arguments);
    if (c2UmbrellaPrep().craft) openRequiredPanel();
    return result;
  });
  wrapFn('saveInventory', original => function () {
    return crafting || original.apply(this, arguments);
  });
  wrapFn('craftItem', original => function (id) {
    if (!phase) return original.apply(this, arguments);
    if (phase !== 'craft' || id !== recipeId) return false;
    const before = structuredClone(playerInventory);
    let crafted;
    crafting = true;
    try { crafted = original.apply(this, arguments); }
    finally { crafting = false; }
    if (!crafted) return false;
    delete c2Flow().umbrellaPurchaseGuide;
    if (!saveInventory()) {
      Object.assign(playerInventory, before);
      initEquippedUmbrella();
      return false;
    }
    setPhase(null);
    document.querySelector('.umbrella-guide-row')?.classList.remove('umbrella-guide-row');
    return true;
  });

  function blockOutsideGuide(event) {
    if (!phase) return;
    const eventTarget = event.target;
    const allowed = phase === 'dialogue' ? rpgActive?.id === sceneId && eventTarget.closest?.('#rpg-overlay') : target()?.contains(eventTarget);
    if (allowed) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'contextmenu', 'wheel', 'touchmove']) {
    window.addEventListener(type, blockOutsideGuide, { capture: true, passive: false });
  }
  for (const type of ['keydown', 'keyup']) {
    window.addEventListener(type, event => {
      if (!phase) return;
      if (['Enter', ' ', 'z', 'Z'].includes(event.key) &&
          (phase === 'dialogue' && rpgActive?.id === sceneId || target() === event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
  window.addEventListener('resize', () => refreshFocus(true));
})();
