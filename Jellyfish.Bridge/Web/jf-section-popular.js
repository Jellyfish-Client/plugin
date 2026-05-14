import { MAX_ITEMS, TTL_5MIN, isRequestable } from './jf-constants.js';
import { dbg } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderSeerrCard } from './jf-card-seerr.js';

export async function mountPopularMoviesRail(homeRoot) {
  return mountSection({
    id: 'seer_popular_movies',
    eyebrow: 'JELLYSEERR',
    title: 'Films populaires',
    fetch: async () => swr('seer:popular_movies:v3', TTL_5MIN, async () => {
      const data = await fetchBridge('/jellyfish/jellyseerr/discover/movies?page=1');
      const results = (data && data.results ? data.results : [])
        .filter(r => !!r.posterPath)
        .filter(isRequestable)
        .slice(0, MAX_ITEMS)
        .map(r => Object.assign({ mediaType: 'movie' }, r));
      dbg('popular_movies:', results.length, 'items');
      return results;
    }),
    render: (items, { itemsEl }) => {
      if (!items || !items.length) return false;
      items.forEach(item => {
        const card = renderSeerrCard(item);
        if (card) itemsEl.appendChild(card);
      });
    },
    anchor: { root: '#homeTab .sections', position: { after: 'trending' } }
  }, homeRoot);
}

export async function mountPopularSeriesRail(homeRoot) {
  return mountSection({
    id: 'seer_popular_series',
    eyebrow: 'JELLYSEERR',
    title: 'Séries populaires',
    fetch: async () => swr('seer:popular_series:v3', TTL_5MIN, async () => {
      const data = await fetchBridge('/jellyfish/jellyseerr/discover/tv?page=1');
      const results = (data && data.results ? data.results : [])
        .filter(r => !!r.posterPath)
        .filter(isRequestable)
        .slice(0, MAX_ITEMS)
        .map(r => Object.assign({ mediaType: 'tv' }, r));
      dbg('popular_series:', results.length, 'items');
      return results;
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
