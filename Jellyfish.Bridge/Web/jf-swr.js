import { SWR_PREFIX } from './jf-constants.js';
import { dbg, warn } from './jf-logger.js';

export async function swr(key, ttlMs, fetcher) {
  const storageKey = SWR_PREFIX + key;
  let cached = null;
  try {
    const raw = window.sessionStorage ? window.sessionStorage.getItem(storageKey) : null;
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    dbg('swr read failed:', e && e.message ? e.message : e);
  }

  if (cached && typeof cached.t === 'number' && (Date.now() - cached.t) < ttlMs) {
    return cached.v;
  }

  try {
    const fresh = await fetcher();
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(storageKey, JSON.stringify({ t: Date.now(), v: fresh }));
      }
    } catch (e) {
      dbg('swr write failed:', e && e.message ? e.message : e);
    }
    return fresh;
  } catch (e) {
    if (cached && cached.v !== undefined) {
      warn('swr fetcher failed for "' + key + '", returning stale');
      return cached.v;
    }
    throw e;
  }
}

window.JellyfishBridge = window.JellyfishBridge || {};
window.JellyfishBridge.swrClear = function () {
  try {
    Object.keys(window.sessionStorage).forEach(k => {
      if (k.indexOf(SWR_PREFIX) === 0) window.sessionStorage.removeItem(k);
    });
  } catch (e) {
    warn('swrClear failed:', e && e.message ? e.message : e);
  }
};
