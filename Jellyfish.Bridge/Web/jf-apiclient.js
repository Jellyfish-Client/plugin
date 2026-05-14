import { dbg, warn } from './jf-logger.js';

export function getApi() { return window.ApiClient; }

export async function getCurrentUserId() {
  const api = getApi();
  if (api && typeof api.getCurrentUserId === 'function') {
    try {
      return await api.getCurrentUserId();
    } catch (e) {
      warn('getCurrentUserId failed:', e && e.message ? e.message : e);
      return null;
    }
  }
  return null;
}

export function getJfImageUrl(itemId, opts) {
  const api = getApi();
  const o = opts || {};
  const type = o.type || 'Primary';
  const maxWidth = o.maxWidth || 600;
  const tag = o.tag;
  if (api && typeof api.getScaledImageUrl === 'function') {
    const params = { type, maxWidth };
    if (tag) params.tag = tag;
    try {
      return api.getScaledImageUrl(itemId, params);
    } catch (e) {
      dbg('getScaledImageUrl failed, falling back:', e && e.message ? e.message : e);
    }
  }
  const base = api && typeof api.serverAddress === 'function' ? api.serverAddress() : '';
  return base + '/Items/' + itemId + '/Images/' + type + '?maxWidth=' + maxWidth + (tag ? '&tag=' + encodeURIComponent(tag) : '');
}
