(() => {
  'use strict';

  const previewRoot = new URL('.', document.currentScript.src);
  if (!location.pathname.startsWith(previewRoot.pathname)) return;
  if (window.adventurePlaytestReady) return;

  const namespace = 'balloon-v-rush:volleyball-five-point-test-1:';
  const save = window.Storage.prototype;
  const { getItem, setItem, removeItem, key } = save;
  const storageLength = Object.getOwnPropertyDescriptor(save, 'length').get;

  class PlaytestStorage {
    #storage;
    constructor(storage) { this.#storage = storage; }
    #keys() {
      const result = [];
      for (let i = 0; i < storageLength.call(this.#storage); i++) {
        const storedKey = key.call(this.#storage, i);
        if (storedKey?.startsWith(namespace)) result.push(storedKey.slice(namespace.length));
      }
      return result;
    }
    get length() { return this.#keys().length; }
    key(index) { return this.#keys()[Number(index) >>> 0] ?? null; }
    getItem(name) { return getItem.call(this.#storage, namespace + name); }
    setItem(name, value) { setItem.call(this.#storage, namespace + name, value); }
    removeItem(name) { removeItem.call(this.#storage, namespace + name); }
    clear() { for (const name of this.#keys()) removeItem.call(this.#storage, namespace + name); }
  }

  const local = new PlaytestStorage(window.localStorage);
  const session = new PlaytestStorage(window.sessionStorage);
  Object.defineProperties(window, {
    Storage: { value: PlaytestStorage },
    localStorage: { value: local },
    sessionStorage: { value: session },
  });

  function canRead(input, method) {
    const url = new URL(input, document.baseURI);
    const readOnly = ['GET', 'HEAD'].includes(String(method).toUpperCase());
    return readOnly && (url.protocol === 'data:' || url.protocol === 'blob:' ||
      (url.origin === previewRoot.origin && url.pathname.startsWith(previewRoot.pathname)));
  }

  const download = window.fetch;
  window.fetch = async function (input, options = {}) {
    const request = input instanceof Request ? input : null;
    if (!canRead(request?.url ?? input, options?.method ?? request?.method ?? 'GET')) {
      throw new TypeError('Adventure playtest only permits reading its own assets.');
    }
    return download.call(this, input, { ...options, credentials: 'omit', redirect: 'error' });
  };

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...options) {
    if (!canRead(url, method)) throw new DOMException('Playtest request blocked.', 'SecurityError');
    return open.call(this, method, url, ...options);
  };
  Navigator.prototype.sendBeacon = () => false;

  if (location.pathname.startsWith(previewRoot.pathname + 'rpg-continent1-universe/')) {
    const playerId = 'p_volleyballplaytestaa';
    const player = { playerId, displayId: '氣球排球試玩', baseAvatarKey: 'boy1' };
    sessionStorage.setItem('bvUniverseSandbox_v2_api', JSON.stringify({ players: { [playerId]: player } }));
    const url = new URL(location.href);
    url.search = new URLSearchParams({ sandbox: '1', bvPlayerId: playerId }).toString();
    history.replaceState(null, '', url);

    document.addEventListener('DOMContentLoaded', () => {
      const openVolleyball = () => {
        if (typeof assetBootReady === 'undefined' || !assetBootReady) {
          setTimeout(openVolleyball, 100);
          return;
        }
        advBootOpenHome({ ctx: { stageId: '1-2', levelIndex: 1, gameState: 'clear' } });
        playerInventory.unlockedRecipes[VB_CONFIG.recipeKey] = true;
        playerInventory.balloon260 = Math.max(playerInventory.balloon260 || 0, 9);
        if (vbData().matchesLeft === 0) vbData().matchesLeft = VB_CONFIG.maxMatches;
        vbSave();
        h2OpenPanel('volleyball');
      };
      openVolleyball();
    }, { once: true });
  }

  Object.defineProperty(window, 'adventurePlaytestReady', { value: true });
})();
