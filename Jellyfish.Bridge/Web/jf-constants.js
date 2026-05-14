// Constants shared across the home-page modules.
export const LOG_PREFIX = '[jellyfish-bridge]';
export const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
export const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';
export const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';
export const RAIL_ATTR = 'data-jf-bridge-rail';
export const MAX_ITEMS = 20;
export const STATUS_LABELS = { 2: 'En attente', 3: 'En traitement', 4: 'Partiel', 5: 'Disponible' };
export const STATUS_CLASS = { 2: 'warning', 3: 'warning', 4: 'info', 5: 'success' };
export const POSTER_PATH_REGEX = /^\/[\w./-]+$/;
export const SWR_PREFIX = 'jf-bridge:';
export const TTL_30SEC = 30 * 1000;
export const TTL_5MIN = 5 * 60 * 1000;
export const TTL_30MIN = 30 * 60 * 1000;
// Jellyfin item Ids are 32-hex-char GUIDs (or dash-delimited UUID variants).
// Validate before interpolating into URLs / hash routes to avoid smuggling.
export const JF_ID_REGEX = /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
export const HERO_AUTO_ADVANCE_MS = 8000;
export const HERO_SLIDE_COUNT = 6;
export const SKELETON_SHOW_DELAY_MS = 200;
export const WATCHLIST_ENRICH_LIMIT = 10;

// Mirror of mobile's `_hideAcquiredOrRequested`. Jellyseerr status codes:
//   1 = unknown (default, requestable) — KEEP
//   2 = pending     — hide (already requested)
//   3 = processing  — hide
//   4 = partially_available — hide
//   5 = available   — hide
// Items without a `mediaInfo` block are assumed unknown.
export function isRequestable(item) {
  const status = item && item.mediaInfo && item.mediaInfo.status;
  return status == null || status === 1;
}
