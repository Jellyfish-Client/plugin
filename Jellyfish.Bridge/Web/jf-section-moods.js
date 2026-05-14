import { MAX_ITEMS, POSTER_PATH_REGEX, TTL_30MIN, isRequestable } from './jf-constants.js';
import { dbg, warn } from './jf-logger.js';
import { fetchBridge } from './jf-fetch.js';
import { swr } from './jf-swr.js';
import { mountSection } from './jf-rail.js';
import { renderSeerrCard } from './jf-card-seerr.js';

// Mood specs — ordered list, dedup walks in this order.
// Reference: mobile app `seer_moods.dart`.
export const MOOD_SPECS = [
  { id: 'pourRire',        title: 'Pour rire',        sortBy: 'popularity.desc',  genres: [35],          voteCountGte: 100 },
  { id: 'pourFrissonner',  title: 'Pour frissonner',  sortBy: 'popularity.desc',  genres: [27, 53],      voteCountGte: 100 },
  { id: 'pourPleurer',     title: 'Pour pleurer',     sortBy: 'vote_average.desc', genres: [18, 10749],   voteCountGte: 500 },
  { id: 'pourSEvader',     title: "Pour s'évader",    sortBy: 'popularity.desc',  genres: [12, 14, 878], voteCountGte: 200 },
  { id: 'coupsDeCoeur',    title: 'Coups de cœur',    sortBy: 'vote_average.desc', genres: [],            voteCountGte: 2000, voteAverageGte: 7.5 }
];

function buildMoodUrl(spec) {
  const params = new URLSearchParams();
  params.set('page', '1');
  params.set('sortBy', spec.sortBy);
  if (spec.genres && spec.genres.length) params.set('genre', spec.genres.join('|'));
  if (spec.voteCountGte != null) params.set('voteCountGte', String(spec.voteCountGte));
  if (spec.voteAverageGte != null) params.set('voteAverageGte', String(spec.voteAverageGte));
  return '/jellyfish/jellyseerr/discover/movies?' + params.toString();
}

async function fetchMood(spec) {
  return swr('seer:mood:' + spec.id + ':v2', TTL_30MIN, async () => {
    const data = await fetchBridge(buildMoodUrl(spec));
    const raw = (data && Array.isArray(data.results)) ? data.results : [];
    // Pre-filter to renderable items (valid posterPath, not already owned),
    // stamp mediaType so renderSeerrCard's existing logic works as-is.
    const items = raw
      .filter(r => r && r.posterPath && POSTER_PATH_REGEX.test(r.posterPath))
      .filter(isRequestable)
      .map(r => Object.assign({ mediaType: 'movie' }, r));
    dbg('mood ' + spec.id + ':', items.length, 'items (pre-dedup)');
    return items;
  });
}

export async function mountMoodRails(homeRoot) {
  // Fetch all moods in parallel; one failure must not kill the others.
  const settled = await Promise.allSettled(MOOD_SPECS.map(fetchMood));

  // Walk in MOOD_SPECS order so the dedup is deterministic regardless of
  // network completion order.
  const seen = new Set();
  for (let i = 0; i < MOOD_SPECS.length; i++) {
    const spec = MOOD_SPECS[i];
    const result = settled[i];
    if (result.status !== 'fulfilled') {
      warn('mood "' + spec.id + '" fetch failed:', result.reason && result.reason.message ? result.reason.message : result.reason);
      continue;
    }
    const cached = Array.isArray(result.value) ? result.value : [];
    const deduped = [];
    for (let j = 0; j < cached.length; j++) {
      const item = cached[j];
      const tmdbId = item && item.id;
      if (tmdbId == null) continue;
      if (seen.has(tmdbId)) continue;
      deduped.push(item);
      if (deduped.length >= MAX_ITEMS) break;
    }
    if (!deduped.length) {
      dbg('mood "' + spec.id + '" empty after dedup, skipping');
      continue;
    }
    // Mark all kept ids as seen for the next rails.
    deduped.forEach(it => { if (it && it.id != null) seen.add(it.id); });

    // Mount sequentially via await so DOM order matches MOOD_SPECS order.
    // Capture the deduped list in a fetcher closure — mountSection re-calls
    // fetch, so we return the already-deduped array synchronously.
    try {
      await mountSection({
        id: 'seer_mood_' + spec.id,
        eyebrow: 'JELLYSEERR',
        title: spec.title,
        fetch: async () => deduped,
        render: (items, { itemsEl }) => {
          if (!items || !items.length) return false;
          let mounted = 0;
          items.forEach(item => {
            const card = renderSeerrCard(item);
            if (card) {
              itemsEl.appendChild(card);
              mounted++;
            }
          });
          if (mounted === 0) return false;
        },
        anchor: { root: '#homeTab .sections', position: 'append' }
      }, homeRoot);
    } catch (e) {
      warn('mood "' + spec.id + '" mount failed:', e && e.message ? e.message : e);
    }
  }
}
