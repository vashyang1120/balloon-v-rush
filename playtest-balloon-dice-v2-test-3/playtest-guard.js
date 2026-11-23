(() => {
  'use strict';

  const previewRoot = new URL('.', document.currentScript.src);
  if (!location.pathname.startsWith(previewRoot.pathname)) return;
  if (window.adventurePlaytestReady) return;

  const namespace = 'balloon-v-rush:adventure-playtest:balloon-dice-v2-test-3:';
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

  const sourceAssets = previewRoot.hostname === 'rawcdn.githack.com'
    ? new URL('https://vashyang1120.github.io/balloon-v-rush/playtest-adventure-v0.4.13-test-4/')
    : null;
  if (sourceAssets) Object.defineProperty(window, 'adventurePlaytestAssetRoot', { value: sourceAssets.href });

  function canRead(input, method) {
    const url = new URL(input, document.baseURI);
    const readOnly = ['GET', 'HEAD'].includes(String(method).toUpperCase());
    return readOnly && (url.protocol === 'data:' || url.protocol === 'blob:' ||
      (url.origin === previewRoot.origin && url.pathname.startsWith(previewRoot.pathname)) ||
      (sourceAssets && url.origin === sourceAssets.origin &&
        ['assets/', 'rpg-dual-continent-test/chapter3-art/', 'motion-comic/assets/', 'minigames/whack-a-mole/assets/', 'minigames/volleyball/assets/audio/'].some(path =>
          url.pathname.startsWith(sourceAssets.pathname + path))));
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

  if (location.pathname.startsWith(previewRoot.pathname + 'rpg-dual-continent-test/')) {
    const url = new URL(location.href);
    for (const name of ['guest', 'sandbox', 'devtools']) url.searchParams.set(name, '1');
    url.searchParams.delete('bvPlayerId');
    if (url.href !== location.href) history.replaceState(null, '', url);
  }

  Object.defineProperty(window, 'adventurePlaytestReady', { value: true });
})();
