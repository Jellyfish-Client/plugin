import { LOG_PREFIX } from './jf-constants.js';
import { tmdbBackdropUrl } from './jf-tmdb.js';

export function renderGenreTile(genre, kind) {
  if (!genre || typeof genre !== 'object') return null;
  const id = genre.id;
  const name = genre.name || '';
  const backdrops = Array.isArray(genre.backdrops) ? genre.backdrops : [];
  const firstBackdrop = backdrops.length ? backdrops[0] : null;
  const backdropUrl = tmdbBackdropUrl(firstBackdrop);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'jf-bridge-genre-tile';
  if (id != null) btn.dataset.genreId = String(id);
  if (kind) btn.dataset.kind = kind;
  btn.setAttribute('aria-label', name || 'Genre');
  if (backdropUrl) {
    btn.style.backgroundImage = "url('" + backdropUrl + "')";
  }
  btn.addEventListener('click', () => {
    try {
      console.log(LOG_PREFIX, 'tapped genre', { id: id, name: name, kind: kind });
    } catch (_) {}
  });

  const label = document.createElement('span');
  label.className = 'jf-bridge-genre-name';
  label.textContent = name;
  btn.appendChild(label);
  return btn;
}
