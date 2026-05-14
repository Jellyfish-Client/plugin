export async function fetchBridge(path) {
  const api = window.ApiClient;
  if (api && typeof api.fetch === 'function') {
    return api.fetch({ url: path, type: 'GET', dataType: 'json' });
  }
  const token = api && typeof api.accessToken === 'function' ? api.accessToken() : null;
  const headers = token
    ? { Authorization: 'MediaBrowser Client="Jellyfin Web", Token="' + token + '"' }
    : {};
  const res = await window.fetch(path, { credentials: 'include', headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Centralized POST that surfaces backend error details (status + body) in the
// thrown Error.message — so modal callers can show something better than
// "Erreur inconnue".
export async function postBridge(path, body) {
  const api = window.ApiClient;
  const payload = JSON.stringify(body || {});
  const token = api && typeof api.accessToken === 'function' ? api.accessToken() : null;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) {
    headers.Authorization = 'MediaBrowser Client="Jellyfin Web", Token="' + token + '"';
  }
  // Always use window.fetch so we can read the response body on errors —
  // ApiClient.fetch rejects with a Response object that's hard to inspect.
  const res = await window.fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: payload
  });
  const text = res.status === 204 ? '' : await res.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch (_) { /* keep null */ }
  }
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    if (parsed && (parsed.detail || parsed.message || parsed.error)) {
      msg += ' — ' + (parsed.detail || parsed.message || parsed.error);
    } else if (text && text.length < 200) {
      msg += ' — ' + text;
    }
    const err = new Error(msg);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}
