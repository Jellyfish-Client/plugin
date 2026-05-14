import { TTL_30SEC, TTL_5MIN, TTL_30MIN } from './jf-constants.js';
import { dbg, log, warn } from './jf-logger.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { getApi, getCurrentUserId } from './jf-apiclient.js';
import { renderJellyfinCard } from './jf-card-jellyfin.js';

const LANDSCAPE_FIELDS = 'PrimaryImageAspectRatio,UserData,ProductionYear,IndexNumber,ParentIndexNumber,SeriesPrimaryImageTag';
const NEXTUP_FIELDS = 'PrimaryImageAspectRatio,UserData,IndexNumber,ParentIndexNumber,SeriesPrimaryImageTag';
const POSTER_FIELDS = 'PrimaryImageAspectRatio,ProductionYear';
const IMAGE_TYPES_LANDSCAPE = 'Primary,Backdrop,Thumb';

// Library kind map — restricted to types we can reasonably preview today.
// BoxSets / LiveTV / Playlists / etc. fall through to skip.
const KIND_MAP = {
  movies:    { types: 'Movie',          style: 'poster',       titleSuffix: 'Films' },
  tvshows:   { types: 'Series,Episode', style: 'poster',       titleSuffix: 'Séries' },
  music:     { types: 'MusicAlbum',     style: 'poster-dense', titleSuffix: 'Albums' },
  homevideos:{ types: 'Video',          style: 'poster',       titleSuffix: 'Vidéos' }
};

function typeFirstChar(types) {
  // First char of the first comma-separated type — disambiguates IDs.
  if (!types) return 'X';
  const idx = types.indexOf(',');
  const head = idx === -1 ? types : types.slice(0, idx);
  return (head.charAt(0) || 'X').toUpperCase();
}

// Promisify ApiClient methods — some Jellyfin versions return jQuery deferreds,
// others return native Promises. `Promise.resolve` swallows both.
function pcall(fn) {
  return Promise.resolve(fn());
}

function callResume(api, userId) {
  if (typeof api.getResumeItems !== 'function') {
    return Promise.reject(new Error('ApiClient.getResumeItems unavailable'));
  }
  return pcall(() => api.getResumeItems(userId, {
    Limit: 12,
    ImageTypeLimit: 1,
    EnableImageTypes: IMAGE_TYPES_LANDSCAPE,
    Fields: LANDSCAPE_FIELDS
  }));
}

function callNextUp(api, userId) {
  const opts = {
    UserId: userId,
    Limit: 24,
    ImageTypeLimit: 1,
    EnableImageTypes: IMAGE_TYPES_LANDSCAPE,
    Fields: NEXTUP_FIELDS
  };
  if (typeof api.getNextUpEpisodes === 'function') {
    return pcall(() => api.getNextUpEpisodes(opts));
  }
  if (typeof api.getNextUp === 'function') {
    return pcall(() => api.getNextUp(opts));
  }
  return Promise.reject(new Error('ApiClient has neither getNextUpEpisodes nor getNextUp'));
}

function callLatest(api, userId, extra) {
  if (typeof api.getLatestItems !== 'function') {
    return Promise.reject(new Error('ApiClient.getLatestItems unavailable'));
  }
  const base = { UserId: userId, Limit: 24, Fields: POSTER_FIELDS };
  return pcall(() => api.getLatestItems(Object.assign(base, extra || {})));
}

function callUserViews(api, userId) {
  if (typeof api.getUserViews !== 'function') {
    return Promise.reject(new Error('ApiClient.getUserViews unavailable'));
  }
  return pcall(() => api.getUserViews(userId));
}

// Normalize both shapes: `{ Items: [...] }` and a bare array.
function asItemsArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.Items)) return resp.Items;
  return [];
}

export async function mountContinueWatching(homeRoot) {
  const userId = await getCurrentUserId();
  if (!userId) { dbg('continue_watching: no user id, skipping'); return; }
  const api = getApi();
  if (!api) { dbg('continue_watching: no ApiClient, skipping'); return; }

  return mountSection({
    id: 'jf_continue',
    eyebrow: 'JELLYFIN',
    title: 'Reprendre',
    fetch: async () => swr('bridge:resume:v1', TTL_30SEC, async () => {
      const resp = await callResume(api, userId);
      const items = asItemsArray(resp);
      dbg('continue_watching:', items.length, 'items');
      return items;
    }),
    render: (items, { itemsEl }) => {
      if (!items || !items.length) return false;
      let appended = 0;
      items.forEach(item => {
        const card = renderJellyfinCard(item, { style: 'landscape', showProgress: true });
        if (card) { itemsEl.appendChild(card); appended++; }
      });
      if (!appended) return false;
    },
    anchor: { root: '#homeTab .sections', position: 'prepend' }
  }, homeRoot);
}

export async function mountNextUp(homeRoot) {
  const userId = await getCurrentUserId();
  if (!userId) { dbg('next_up: no user id, skipping'); return; }
  const api = getApi();
  if (!api) { dbg('next_up: no ApiClient, skipping'); return; }

  return mountSection({
    id: 'jf_next_up',
    eyebrow: 'JELLYFIN',
    title: 'Prochains épisodes',
    fetch: async () => swr('bridge:next_up:v1', TTL_5MIN, async () => {
      const resp = await callNextUp(api, userId);
      const items = asItemsArray(resp);
      dbg('next_up:', items.length, 'items');
      return items;
    }),
    render: (items, { itemsEl }) => {
      if (!items || !items.length) return false;
      let appended = 0;
      items.forEach(item => {
        const card = renderJellyfinCard(item, { style: 'landscape', showProgress: false });
        if (card) { itemsEl.appendChild(card); appended++; }
      });
      if (!appended) return false;
    },
    anchor: { root: '#homeTab .sections', position: { after: 'jf_continue' } }
  }, homeRoot);
}

export async function mountLatest(homeRoot) {
  const userId = await getCurrentUserId();
  if (!userId) { dbg('latest: no user id, skipping'); return; }
  const api = getApi();
  if (!api) { dbg('latest: no ApiClient, skipping'); return; }

  return mountSection({
    id: 'jf_latest',
    eyebrow: 'JELLYFIN',
    title: 'Récemment ajouté',
    fetch: async () => swr('bridge:latest:v1', TTL_5MIN, async () => {
      const resp = await callLatest(api, userId, null);
      const items = asItemsArray(resp);
      dbg('latest:', items.length, 'items');
      return items;
    }),
    render: (items, { itemsEl }) => {
      if (!items || !items.length) return false;
      let appended = 0;
      items.forEach(item => {
        const card = renderJellyfinCard(item, { style: 'poster' });
        if (card) { itemsEl.appendChild(card); appended++; }
      });
      if (!appended) return false;
    },
    anchor: { root: '#homeTab .sections', position: { after: 'jf_next_up' } }
  }, homeRoot);
}

async function mountOneLibraryRail(homeRoot, view, kind, userId, api) {
  const viewId = view && view.Id;
  if (!viewId || typeof viewId !== 'string') return;
  const railId = 'jf_lib_' + viewId.replace(/[^a-zA-Z0-9]/g, '') + '_' + typeFirstChar(kind.types);
  const cacheKey = 'bridge:lib_' + viewId + ':v1';
  const title = (view.Name || kind.titleSuffix) + ' • Nouveautés';

  try {
    await mountSection({
      id: railId,
      eyebrow: 'JELLYFIN',
      title: title,
      fetch: async () => swr(cacheKey, TTL_5MIN, async () => {
        const resp = await callLatest(api, userId, {
          ParentId: viewId,
          IncludeItemTypes: kind.types
        });
        const items = asItemsArray(resp);
        dbg('lib_rail "' + title + '":', items.length, 'items');
        return items;
      }),
      render: (items, { itemsEl }) => {
        if (!items || !items.length) return false;
        let appended = 0;
        items.forEach(item => {
          const card = renderJellyfinCard(item, { style: kind.style });
          if (card) { itemsEl.appendChild(card); appended++; }
        });
        if (!appended) return false;
      },
      anchor: { root: '#homeTab .sections', position: 'append' }
    }, homeRoot);
  } catch (e) {
    warn('lib rail "' + title + '" failed:', e && e.message ? e.message : e);
  }
}

export async function mountLibraryRails(homeRoot) {
  const userId = await getCurrentUserId();
  if (!userId) { dbg('library_rails: no user id, skipping'); return; }
  const api = getApi();
  if (!api) { dbg('library_rails: no ApiClient, skipping'); return; }

  let views;
  try {
    views = await swr('bridge:user_views:v1', TTL_30MIN, async () => {
      const resp = await callUserViews(api, userId);
      return asItemsArray(resp);
    });
  } catch (e) {
    warn('library_rails: getUserViews failed:', e && e.message ? e.message : e);
    return;
  }

  if (!views || !views.length) {
    dbg('library_rails: no views');
    return;
  }

  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const ct = view && view.CollectionType;
    const kind = ct ? KIND_MAP[ct] : null;
    if (!kind) {
      dbg('library_rails: skip view', view && view.Name, 'type=', ct);
      continue;
    }
    // Sequential await — preserves the order in which views are returned
    // (which is the user's pinned order). One failure does not abort the loop.
    await mountOneLibraryRail(homeRoot, view, kind, userId, api);
  }
  log('library_rails: done');
}
