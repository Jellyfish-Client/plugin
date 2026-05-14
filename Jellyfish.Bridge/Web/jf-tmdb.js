import {
  TMDB_POSTER_BASE,
  TMDB_LOGO_BASE,
  TMDB_BACKDROP_BASE,
  POSTER_PATH_REGEX
} from './jf-constants.js';

export function tmdbPosterUrl(posterPath) {
  if (!posterPath || typeof posterPath !== 'string') return '';
  if (!POSTER_PATH_REGEX.test(posterPath)) return '';
  return TMDB_POSTER_BASE + posterPath;
}

// logoPath / backdropPath come from TMDB as "/abc123.png". Validate before interpolation.
export function tmdbLogoUrl(logoPath) {
  if (!logoPath || typeof logoPath !== 'string') return '';
  if (!POSTER_PATH_REGEX.test(logoPath)) return '';
  return TMDB_LOGO_BASE + logoPath;
}

export function tmdbBackdropUrl(backdropPath) {
  if (!backdropPath || typeof backdropPath !== 'string') return '';
  if (!POSTER_PATH_REGEX.test(backdropPath)) return '';
  return TMDB_BACKDROP_BASE + backdropPath;
}

export function providerInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map(p => p.charAt(0)).join('');
  return (letters || '?').toUpperCase();
}
