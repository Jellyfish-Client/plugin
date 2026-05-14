import {
  TMDB_POSTER_BASE,
  POSTER_PATH_REGEX,
  STATUS_LABELS,
  STATUS_CLASS
} from './jf-constants.js';
import { openRequestModal } from './jf-request-modal.js';

export function renderSeerrCard(item) {
  const tmdbId = item.id;
  const mediaType = item.mediaType;
  const title = item.title || item.name || '';
  const date = item.releaseDate || item.firstAirDate || '';
  const year = date ? date.slice(0, 4) : '';
  const poster = item.posterPath;
  if (!poster || !POSTER_PATH_REGEX.test(poster)) return null;
  const status = item.mediaInfo && item.mediaInfo.status;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card jf-bridge-card';
  btn.dataset.tmdbId = String(tmdbId);
  btn.dataset.mediaType = mediaType;
  btn.addEventListener('click', () => {
    openRequestModal({
      tmdbId: tmdbId,
      mediaType: mediaType,
      title: title,
      year: date || null,
      overview: item.overview || '',
      posterPath: poster
    });
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
  imgWrap.style.backgroundImage = "url('" + TMDB_POSTER_BASE + poster + "')";
  if (status && STATUS_CLASS[status]) {
    const chip = document.createElement('div');
    chip.className = 'jf-bridge-chip jf-bridge-chip--' + STATUS_CLASS[status];
    chip.textContent = STATUS_LABELS[status];
    imgWrap.appendChild(chip);
  }
  scalable.appendChild(imgWrap);
  cardBox.appendChild(scalable);

  const tText = document.createElement('div');
  tText.className = 'cardText cardText-first';
  tText.textContent = title;
  cardBox.appendChild(tText);

  if (year) {
    const yText = document.createElement('div');
    yText.className = 'cardText cardText-secondary';
    yText.textContent = year;
    cardBox.appendChild(yText);
  }

  btn.appendChild(cardBox);
  return btn;
}
