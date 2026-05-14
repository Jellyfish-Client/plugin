import { MAX_ITEMS } from './jf-constants.js';
import { dbg } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderUpcomingCard } from './jf-card-upcoming.js';

// Calendar moves fast — keep the TTL tight per architect plan.
const TTL_60S = 60 * 1000;

function mountUpcomingRail(homeRoot, kind) {
  const isMovies = kind === 'movies';
  const id = isMovies ? 'upcoming_movies' : 'upcoming_episodes';
  const eyebrow = isMovies ? 'RADARR' : 'SONARR';
  const title = isMovies ? 'À venir — Films' : 'À venir — Séries';
  const cacheKey = isMovies ? 'bridge:upcoming_movies:v1' : 'bridge:upcoming_episodes:v1';
  const kindsParam = isMovies ? 'movies' : 'episodes';
  const expectedItemKind = isMovies ? 'movie' : 'episode';
  // Movies appended; episodes anchored after movies so they sit side-by-side
  // even if other rails later append to the same container.
  const anchor = isMovies
    ? { root: '#homeTab .sections', position: 'append' }
    : { root: '#homeTab .sections', position: { after: 'upcoming_movies' } };

  return mountSection({
    id: id,
    eyebrow: eyebrow,
    title: title,
    fetch: async () => swr(cacheKey, TTL_60S, async () => {
      const path = '/jellyfish/upcoming?days=30&kinds=' + kindsParam + '&limit=30';
      const data = await fetchBridge(path);
      const items = (data && Array.isArray(data.items) ? data.items : [])
        .filter(it => it && it.kind === expectedItemKind)
        .slice(0, MAX_ITEMS);
      dbg('upcoming ' + kind + ':', items.length, 'items');
      return items;
    }),
    render: (items, { itemsEl }) => {
      if (!items || !items.length) return false;
      let mounted = 0;
      items.forEach(item => {
        const card = renderUpcomingCard(item);
        if (card) {
          itemsEl.appendChild(card);
          mounted++;
        }
      });
      if (mounted === 0) return false;
    },
    anchor: anchor
  }, homeRoot);
}

export function mountUpcomingMoviesRail(homeRoot) {
  return mountUpcomingRail(homeRoot, 'movies');
}

export function mountUpcomingEpisodesRail(homeRoot) {
  return mountUpcomingRail(homeRoot, 'episodes');
}
