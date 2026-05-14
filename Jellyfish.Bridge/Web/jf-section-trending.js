import { MAX_ITEMS, isRequestable } from './jf-constants.js';
import { dbg } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { mountSection } from './jf-rail.js';
import { renderSeerrCard } from './jf-card-seerr.js';

export async function mountTrendingRail(homeRoot) {
  return mountSection({
    id: 'trending',
    eyebrow: 'JELLYSEERR',
    title: 'Tendances',
    fetch: async () => {
      const data = await fetchBridge('/jellyfish/jellyseerr/trending?page=1');
      const items = (data && data.results ? data.results : [])
        .filter(r => r.mediaType === 'movie' || r.mediaType === 'tv')
        .filter(r => !!r.posterPath)
        .filter(isRequestable)
        .slice(0, MAX_ITEMS);
      return items;
    },
    render: (items, { itemsEl }) => {
      if (!items || !items.length) {
        dbg('trending returned 0 usable items');
        return false;
      }
      items.forEach(item => {
        const card = renderSeerrCard(item);
        if (card) itemsEl.appendChild(card);
      });
    },
    anchor: { root: '#homeTab .sections', position: 'append' }
  }, homeRoot);
}
