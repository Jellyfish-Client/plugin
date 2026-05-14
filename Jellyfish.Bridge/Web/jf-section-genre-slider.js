import { TTL_30MIN } from './jf-constants.js';
import { dbg } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderGenreTile } from './jf-card-genre.js';

function mountGenreSliderRail(homeRoot, kind) {
  const isMovies = kind === 'movies';
  const endpointSeg = isMovies ? 'movie' : 'tv';
  const id = isMovies ? 'seer_genre_slider_movies' : 'seer_genre_slider_tv';
  const title = isMovies ? 'Par genre — Films' : 'Par genre — Séries';
  const cacheKey = isMovies ? 'seer:gs_movies:v1' : 'seer:gs_tv:v1';
  // Movies appended after providers; tv appended after movies (natural append order).
  const anchor = { root: '#homeTab .sections', position: 'append' };

  return mountSection({
    id: id,
    eyebrow: 'JELLYSEERR',
    title: title,
    fetch: async () => swr(cacheKey, TTL_30MIN, async () => {
      const data = await fetchBridge('/jellyfish/jellyseerr/genreslider/' + endpointSeg);
      const arr = Array.isArray(data) ? data : [];
      dbg('genre_slider ' + kind + ':', arr.length, 'items');
      return arr;
    }),
    render: (items, ctx) => {
      if (!items || !items.length) return false;
      items.forEach(g => {
        const tile = renderGenreTile(g, kind);
        if (tile) ctx.itemsEl.appendChild(tile);
      });
    },
    anchor: anchor
  }, homeRoot);
}

export function mountGenreSliderMoviesRail(homeRoot) {
  return mountGenreSliderRail(homeRoot, 'movies');
}

export function mountGenreSliderTvRail(homeRoot) {
  return mountGenreSliderRail(homeRoot, 'tv');
}
