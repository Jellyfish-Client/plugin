import {
  MAX_ITEMS,
  POSTER_PATH_REGEX,
  SWR_PREFIX,
  TTL_30MIN,
  isRequestable
} from './jf-constants.js';
import { dbg, warn } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderSeerrCard } from './jf-card-seerr.js';
import { getApi, getCurrentUserId } from './jf-apiclient.js';
import { pickRecoSeeds } from './jf-reco-seeds.js';

var SEED_CACHE_PREFIX = 'jf-bridge:reco:seeds:';
var SEED_TTL_MS = 30 * 60 * 1000;
var MAX_SEEDS = 3;

function loadCachedSeeds(userId) {
  try {
    if (!window.sessionStorage) return null;
    var raw = window.sessionStorage.getItem(SEED_CACHE_PREFIX + userId);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.t !== 'number' || !Array.isArray(parsed.v)) return null;
    if (Date.now() - parsed.t > SEED_TTL_MS) return null;
    return parsed.v;
  } catch (_) {
    return null;
  }
}

function saveCachedSeeds(userId, seeds) {
  try {
    if (!window.sessionStorage) return;
    window.sessionStorage.setItem(
      SEED_CACHE_PREFIX + userId,
      JSON.stringify({ t: Date.now(), v: seeds })
    );
  } catch (_) { /* ignore quota / serialization issues */ }
}

async function fetchPlayedHistory() {
  var api = getApi();
  if (!api || typeof api.getItems !== 'function') return [];
  var userId = await getCurrentUserId();
  if (!userId) return [];
  try {
    var resp = await api.getItems(userId, {
      SortBy: 'DatePlayed',
      SortOrder: 'Descending',
      Filters: 'IsPlayed',
      IncludeItemTypes: 'Movie,Series',
      Recursive: true,
      Limit: 30,
      Fields: 'ProviderIds,Genres'
    });
    return (resp && Array.isArray(resp.Items)) ? resp.Items : [];
  } catch (e) {
    warn('reco history fetch failed:', e && e.message ? e.message : e);
    return [];
  }
}

// Read popular items already cached by the popular rails (no refetch).
function readPopularFallback() {
  var combined = [];
  if (!window.sessionStorage) return combined;
  var keys = ['seer:popular_movies:v3', 'seer:popular_series:v3'];
  for (var i = 0; i < keys.length; i++) {
    try {
      var raw = window.sessionStorage.getItem(SWR_PREFIX + keys[i]);
      if (!raw) continue;
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.v)) {
        for (var j = 0; j < parsed.v.length; j++) {
          var item = parsed.v[j];
          if (item && item.id != null) combined.push(item);
        }
      }
    } catch (_) { /* ignore corrupt cache entries */ }
  }
  return combined;
}

function isValidSeed(s) {
  return s
    && typeof s === 'object'
    && (s.type === 'movie' || s.type === 'tv')
    && Number.isFinite(s.tmdbId) && s.tmdbId > 0
    && typeof s.title === 'string' && s.title.length > 0
    && typeof s.fromHistory === 'boolean';
}

async function buildSeeds(userId) {
  var cached = loadCachedSeeds(userId);
  if (cached && cached.length && cached.every(isValidSeed)) {
    dbg('reco: using cached seeds (' + cached.length + ')');
    return cached;
  }
  var history = await fetchPlayedHistory();
  var fallback = readPopularFallback();
  var seeds = pickRecoSeeds(history, fallback, MAX_SEEDS);
  if (seeds.length) saveCachedSeeds(userId, seeds);
  dbg('reco: picked ' + seeds.length + ' seeds');
  return seeds;
}

function railIdFor(seed) {
  return 'seer_reco_' + seed.type + '_' + seed.tmdbId;
}

function railTitleFor(seed) {
  return seed.fromHistory
    ? 'Parce que vous avez regardé ' + seed.title
    : 'Comme ' + seed.title;
}

function fetchSimilarFor(seed) {
  var key = 'seer:reco:' + seed.type + ':' + seed.tmdbId + ':v1';
  return swr(key, TTL_30MIN, async function () {
    var path = '/jellyfish/jellyseerr/' + encodeURIComponent(seed.type)
      + '/' + encodeURIComponent(String(seed.tmdbId)) + '/similar?page=1';
    var data = await fetchBridge(path);
    var raw = (data && Array.isArray(data.results)) ? data.results : [];
    var items = raw
      .filter(function (r) { return r && r.posterPath && POSTER_PATH_REGEX.test(r.posterPath); })
      .filter(isRequestable)
      .slice(0, MAX_ITEMS)
      .map(function (r) { return Object.assign({ mediaType: seed.type }, r); });
    dbg('reco ' + seed.type + '/' + seed.tmdbId + ':', items.length, 'items');
    return items;
  });
}

export async function mountRecoRails(homeRoot) {
  var userId;
  try {
    userId = await getCurrentUserId();
  } catch (_) { userId = null; }
  if (!userId) {
    dbg('reco: no userId, skipping');
    return;
  }

  var seeds;
  try {
    seeds = await buildSeeds(userId);
  } catch (e) {
    warn('reco seed build failed:', e && e.message ? e.message : e);
    return;
  }
  if (!seeds || !seeds.length) {
    dbg('reco: no seeds available');
    return;
  }

  // Mount sequentially so DOM order matches seed order.
  for (var i = 0; i < seeds.length && i < MAX_SEEDS; i++) {
    var seed = seeds[i];
    if (!isValidSeed(seed)) continue;
    var capture = seed; // closure capture for fetch()
    try {
      await mountSection({
        id: railIdFor(seed),
        eyebrow: 'JELLYSEERR',
        title: railTitleFor(seed),
        fetch: function () { return fetchSimilarFor(capture); },
        render: function (items, ctx) {
          if (!items || !items.length) return false;
          var mounted = 0;
          for (var k = 0; k < items.length; k++) {
            var card = renderSeerrCard(items[k]);
            if (card) {
              ctx.itemsEl.appendChild(card);
              mounted++;
            }
          }
          if (mounted === 0) return false;
        },
        anchor: { root: '#homeTab .sections', position: 'append' }
      }, homeRoot);
    } catch (e) {
      warn('reco rail "' + railIdFor(seed) + '" mount failed:', e && e.message ? e.message : e);
    }
  }
}
