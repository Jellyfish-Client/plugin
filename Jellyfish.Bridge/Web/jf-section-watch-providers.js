import { MAX_ITEMS, TTL_5MIN } from './jf-constants.js';
import { dbg } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderProviderTile } from './jf-card-provider.js';

function mountWatchProvidersRail(homeRoot, kind) {
  const isMovies = kind === 'movies';
  const endpointSeg = isMovies ? 'movies' : 'tv';
  const id = isMovies ? 'seer_watch_providers_movies' : 'seer_watch_providers_tv';
  const title = isMovies ? 'Sur vos services' : 'Sur vos services (séries)';
  const cacheKey = isMovies ? 'seer:wp_movies:v1' : 'seer:wp_tv:v1';
  const anchor = isMovies
    ? { root: '#homeTab .sections', position: { after: 'seer_popular_series' } }
    : { root: '#homeTab .sections', position: 'append' };

  return mountSection({
    id: id,
    eyebrow: 'JELLYSEERR',
    title: title,
    fetch: async () => swr(cacheKey, TTL_5MIN, async () => {
      const data = await fetchBridge('/jellyfish/jellyseerr/watchproviders/' + endpointSeg + '?watchRegion=FR');
      const arr = Array.isArray(data) ? data : [];
      // TMDB returns 50+ providers sorted by displayPriority asc — keep top 20.
      const sorted = arr.slice().sort((a, b) => {
        const pa = (a && typeof a.displayPriority === 'number') ? a.displayPriority : 999999;
        const pb = (b && typeof b.displayPriority === 'number') ? b.displayPriority : 999999;
        return pa - pb;
      });
      const top = sorted.slice(0, MAX_ITEMS);
      dbg('watch_providers ' + kind + ':', top.length, 'items');
      return top;
    }),
    render: (items, ctx) => {
      if (!items || !items.length) return false;
      items.forEach(p => {
        const tile = renderProviderTile(p, kind);
        if (tile) ctx.itemsEl.appendChild(tile);
      });
    },
    anchor: anchor
  }, homeRoot);
}

export function mountWatchProvidersMoviesRail(homeRoot) {
  return mountWatchProvidersRail(homeRoot, 'movies');
}

export function mountWatchProvidersTvRail(homeRoot) {
  return mountWatchProvidersRail(homeRoot, 'tv');
}
