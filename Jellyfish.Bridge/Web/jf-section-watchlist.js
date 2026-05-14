import { TTL_5MIN, WATCHLIST_ENRICH_LIMIT, isRequestable } from './jf-constants.js';
import { dbg } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderSeerrCard } from './jf-card-seerr.js';

export async function mountWatchlistRail(homeRoot) {
  return mountSection({
    id: 'seer_watchlist',
    eyebrow: 'JELLYSEERR',
    title: 'Votre watchlist',
    fetch: async () => swr('seer:watchlist:v2', TTL_5MIN, async () => {
      const data = await fetchBridge('/jellyfish/jellyseerr/discover/watchlist?page=1');
      const base = (data && Array.isArray(data.results) ? data.results : []).slice(0, WATCHLIST_ENRICH_LIMIT);
      if (!base.length) return [];
      const enriched = await Promise.all(base.map(async (it) => {
        if (!it || typeof it !== 'object') return null;
        const type = (it.mediaType === 'tv') ? 'tv' : 'movie';
        const tmdbId = (it.tmdbId != null) ? it.tmdbId : it.id;
        if (tmdbId == null) return null;
        try {
          const detail = await fetchBridge('/jellyfish/jellyseerr/' + type + '/' + encodeURIComponent(tmdbId));
          if (!detail || typeof detail !== 'object') return null;
          // Merge: detail first, then override id + mediaType so renderSeerrCard works.
          return Object.assign({}, detail, { mediaType: type, id: tmdbId });
        } catch (e) {
          dbg('watchlist enrich failed for ' + type + '/' + tmdbId + ':', e && e.message ? e.message : e);
          return null;
        }
      }));
      const out = enriched.filter(it => it && !!it.posterPath).filter(isRequestable);
      dbg('watchlist:', out.length, 'items (from', base.length, 'base)');
      return out;
    }),
    render: (items, { itemsEl }) => {
      if (!items || !items.length) return false;
      items.forEach(item => {
        const card = renderSeerrCard(item);
        if (card) itemsEl.appendChild(card);
      });
    },
    anchor: { root: '#homeTab .sections', position: { after: 'seer_popular_movies' } }
  }, homeRoot);
}
