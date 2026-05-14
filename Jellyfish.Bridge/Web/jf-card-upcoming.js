import { LOG_PREFIX } from './jf-constants.js';
import { formatUpcomingDate } from './jf-date.js';

// Posters come pre-resolved as absolute http(s) URLs from Radarr/Sonarr — we
// don't combine them with a TMDB base. Validate anyway so a poisoned response
// can't smuggle `javascript:` or other schemes into a CSS url(...) context.
const POSTER_URL_REGEX = /^https?:\/\//i;

function pad2(n) {
  const s = String(n);
  return s.length >= 2 ? s : '0' + s;
}

function buildSubtitle(item) {
  const dateStr = formatUpcomingDate(item.releaseDate);
  if (item.kind === 'episode') {
    const s = (item.seasonNumber != null) ? pad2(item.seasonNumber) : '00';
    const e = (item.episodeNumber != null) ? pad2(item.episodeNumber) : '00';
    const code = 'S' + s + 'E' + e;
    return dateStr ? (code + ' · ' + dateStr) : code;
  }
  return dateStr;
}

export function renderUpcomingCard(item) {
  if (!item || typeof item !== 'object') return null;
  const kind = item.kind;
  if (kind !== 'movie' && kind !== 'episode') return null;
  const posterUrl = item.posterUrl;
  if (!posterUrl || typeof posterUrl !== 'string' || !POSTER_URL_REGEX.test(posterUrl)) return null;

  const title = kind === 'episode'
    ? (item.seriesTitle || item.title || '')
    : (item.title || '');
  if (!title) return null;

  const subtitle = buildSubtitle(item);
  const sourceId = item.sourceId;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card overflowPortraitCard card-hoverable show-focus';
  btn.dataset.kind = kind;
  if (sourceId != null) btn.dataset.sourceId = String(sourceId);
  btn.addEventListener('click', () => {
    try {
      console.log(LOG_PREFIX, 'tapped upcoming', { kind: kind, title: title, sourceId: sourceId });
    } catch (_) {}
  });

  const cardBox = document.createElement('div');
  cardBox.className = 'cardBox cardBox-bottompadded';

  const scalable = document.createElement('div');
  scalable.className = 'cardScalable';

  const padder = document.createElement('div');
  padder.className = 'cardPadder cardPadder-overflowPortrait';
  scalable.appendChild(padder);

  const imgWrap = document.createElement('div');
  imgWrap.className = 'cardImageContainer coveredImage cardContent';
  // posterUrl has been regex-validated above to start with http(s):// — safe to
  // interpolate into CSS url() without further escaping for our threat model.
  imgWrap.style.backgroundImage = "url('" + posterUrl + "')";
  scalable.appendChild(imgWrap);
  cardBox.appendChild(scalable);

  const tText = document.createElement('div');
  tText.className = 'cardText cardText-first';
  tText.textContent = title;
  cardBox.appendChild(tText);

  if (subtitle) {
    const sText = document.createElement('div');
    sText.className = 'cardText cardText-secondary';
    sText.textContent = subtitle;
    cardBox.appendChild(sText);
  }

  btn.appendChild(cardBox);
  return btn;
}
