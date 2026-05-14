import { TMDB_POSTER_BASE, POSTER_PATH_REGEX } from './jf-constants.js';
import { fetchBridge, postBridge } from './jf-fetch.js';
import { log, warn } from './jf-logger.js';

let activeModal = null;

function isValidTmdbId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && Math.floor(n) === n;
}

function isValidMediaType(value) {
  return value === 'movie' || value === 'tv';
}

function showToast(message, kind) {
  const toast = document.createElement('div');
  toast.className = 'jf-bridge-toast jf-bridge-toast--' + (kind === 'error' ? 'error' : 'success');
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .25s ease, transform .25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 2200);
}

function trapFocus(modalEl, e) {
  if (e.key !== 'Tab') return;
  const focusables = modalEl.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

function buildSkeletonRow() {
  const row = document.createElement('div');
  row.style.height = '28px';
  row.style.background = '#171717';
  row.style.borderRadius = '8px';
  row.style.animation = 'jf-bridge-pulse 1.6s ease-in-out infinite';
  return row;
}

function renderSeasonsGrid(container, seasons, defaultChecked) {
  container.innerHTML = '';
  if (!seasons || !seasons.length) {
    const empty = document.createElement('div');
    empty.style.fontSize = '13px';
    empty.style.color = '#A3A3A3';
    empty.textContent = 'Aucune saison trouvée — la requête couvrira toutes les saisons disponibles.';
    container.appendChild(empty);
    return [];
  }
  const inputs = [];
  seasons.forEach(s => {
    const num = Number(s.seasonNumber);
    if (!Number.isFinite(num) || num < 0) return;
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = String(num);
    cb.dataset.seasonNumber = String(num);
    if (defaultChecked && num !== 0) cb.checked = true;
    const span = document.createElement('span');
    const name = (s.name && typeof s.name === 'string') ? s.name : (num === 0 ? 'Specials' : ('Saison ' + num));
    span.textContent = name;
    label.appendChild(cb);
    label.appendChild(span);
    container.appendChild(label);
    inputs.push(cb);
  });
  return inputs;
}

export function openRequestModal(opts) {
  if (activeModal) return;
  if (!opts || !isValidTmdbId(opts.tmdbId) || !isValidMediaType(opts.mediaType)) {
    warn('openRequestModal: invalid opts', opts);
    return;
  }
  const tmdbId = Number(opts.tmdbId);
  const mediaType = opts.mediaType;
  const title = typeof opts.title === 'string' ? opts.title : '';
  const overview = typeof opts.overview === 'string' ? opts.overview : '';
  const dateStr = typeof opts.year === 'string' ? opts.year : '';
  const year = dateStr ? dateStr.slice(0, 4) : '';
  const posterPath = (typeof opts.posterPath === 'string' && POSTER_PATH_REGEX.test(opts.posterPath))
    ? opts.posterPath : null;

  const previouslyFocused = document.activeElement;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'jf-bridge-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Demander ' + title);

  const modal = document.createElement('div');
  modal.className = 'jf-bridge-modal';
  overlay.appendChild(modal);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'jf-bridge-modal-close';
  closeBtn.setAttribute('aria-label', 'Fermer');
  closeBtn.textContent = '×';
  modal.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'jf-bridge-modal-body';
  modal.appendChild(body);

  // Poster
  const poster = document.createElement('div');
  poster.className = 'jf-bridge-modal-poster';
  if (posterPath) {
    poster.style.backgroundImage = "url('" + TMDB_POSTER_BASE + posterPath + "')";
  }
  body.appendChild(poster);

  // Content
  const content = document.createElement('div');
  content.className = 'jf-bridge-modal-content';
  body.appendChild(content);

  const titleEl = document.createElement('h2');
  titleEl.className = 'jf-bridge-modal-title';
  titleEl.textContent = title || (mediaType === 'tv' ? 'Série' : 'Film');
  content.appendChild(titleEl);

  if (year) {
    const meta = document.createElement('div');
    meta.className = 'jf-bridge-modal-meta';
    meta.textContent = year;
    content.appendChild(meta);
  }

  if (overview) {
    const ov = document.createElement('p');
    ov.className = 'jf-bridge-modal-overview';
    ov.textContent = overview;
    content.appendChild(ov);
  }

  // Seasons (TV only)
  let seasonsBlock = null;
  let seasonsGrid = null;
  let seasonsToggleBtn = null;
  let seasonInputs = [];
  let seasonsFailed = false;
  if (mediaType === 'tv') {
    seasonsBlock = document.createElement('div');
    seasonsBlock.className = 'jf-bridge-modal-seasons';
    const headerRow = document.createElement('div');
    headerRow.className = 'jf-bridge-modal-seasons-header';
    const h = document.createElement('h3');
    h.textContent = 'Saisons';
    headerRow.appendChild(h);
    seasonsToggleBtn = document.createElement('button');
    seasonsToggleBtn.type = 'button';
    seasonsToggleBtn.className = 'jf-bridge-modal-seasons-toggle';
    seasonsToggleBtn.textContent = 'Tout désélectionner';
    seasonsToggleBtn.hidden = true;
    seasonsToggleBtn.addEventListener('click', () => {
      if (!seasonInputs.length) return;
      // Specials (saison 0) are never included by "Tout sélectionner".
      const nonSpecials = seasonInputs.filter(cb => cb.dataset.seasonNumber !== '0');
      const allNonSpecialsChecked = nonSpecials.length > 0 && nonSpecials.every(cb => cb.checked);
      if (allNonSpecialsChecked) {
        seasonInputs.forEach(cb => { cb.checked = false; });
      } else {
        nonSpecials.forEach(cb => { cb.checked = true; });
      }
      updateSubmitState();
    });
    headerRow.appendChild(seasonsToggleBtn);
    seasonsBlock.appendChild(headerRow);
    seasonsGrid = document.createElement('div');
    seasonsGrid.className = 'jf-bridge-modal-seasons-grid';
    // skeleton placeholders
    for (let i = 0; i < 4; i++) seasonsGrid.appendChild(buildSkeletonRow());
    seasonsBlock.appendChild(seasonsGrid);
    content.appendChild(seasonsBlock);
  }

  // Error
  const errorEl = document.createElement('div');
  errorEl.className = 'jf-bridge-modal-error';
  errorEl.hidden = true;
  content.appendChild(errorEl);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'jf-bridge-modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'jf-bridge-btn jf-bridge-btn--secondary';
  cancelBtn.textContent = 'Annuler';
  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'jf-bridge-btn jf-bridge-btn--primary';
  submitBtn.textContent = 'Demander';
  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  content.appendChild(actions);

  let submitting = false;
  let closed = false;

  function setError(msg) {
    if (msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    } else {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function updateSubmitState() {
    if (submitting) {
      submitBtn.disabled = true;
      return;
    }
    if (mediaType === 'tv' && seasonInputs.length > 0) {
      const anyChecked = seasonInputs.some(cb => cb.checked);
      submitBtn.disabled = !anyChecked;
    } else {
      submitBtn.disabled = false;
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    activeModal = null;
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try { previouslyFocused.focus(); } catch (_) {}
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (submitting) return; // ignore while sending
      e.preventDefault();
      close();
      return;
    }
    trapFocus(modal, e);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !submitting) close();
  });
  closeBtn.addEventListener('click', () => { if (!submitting) close(); });
  cancelBtn.addEventListener('click', () => { if (!submitting) close(); });

  document.addEventListener('keydown', onKeyDown, true);

  submitBtn.addEventListener('click', () => {
    if (submitting) return;
    setError('');
    const payload = { mediaType: mediaType, mediaId: tmdbId };
    if (mediaType === 'tv') {
      if (!seasonInputs.length) {
        // Fallback: no season data — request without seasons array.
        // Bridge backend / Jellyseerr will treat as all seasons.
      } else {
        const seasons = seasonInputs
          .filter(cb => cb.checked)
          .map(cb => Number(cb.dataset.seasonNumber))
          .filter(n => Number.isFinite(n) && n >= 0);
        if (!seasons.length) {
          setError('Sélectionne au moins une saison.');
          return;
        }
        payload.seasons = seasons;
      }
    }

    submitting = true;
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi…';

    postBridge('/jellyfish/jellyseerr/request', payload)
      .then(() => {
        submitBtn.classList.add('jf-bridge-btn--success');
        submitBtn.textContent = 'Envoyé !';
        showToast('Demande envoyée', 'success');
        setTimeout(() => { close(); }, 1500);
      })
      .catch(err => {
        submitting = false;
        cancelBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        const msg = (err && err.message) ? err.message : 'Erreur inconnue';
        setError('Erreur lors de la demande : ' + msg);
        showToast('Erreur lors de la demande', 'error');
        updateSubmitState();
        warn('jellyseerr request failed:', err);
      });
  });

  document.body.appendChild(overlay);
  activeModal = overlay;

  // Default focus
  setTimeout(() => { try { submitBtn.focus(); } catch (_) {} }, 0);

  // Load seasons for TV
  if (mediaType === 'tv') {
    submitBtn.disabled = true;
    fetchBridge('/jellyfish/jellyseerr/tv/' + encodeURIComponent(String(tmdbId)))
      .then(data => {
        if (closed) return;
        const seasons = data && Array.isArray(data.seasons) ? data.seasons : [];
        seasonInputs = renderSeasonsGrid(seasonsGrid, seasons, true);
        if (seasonsToggleBtn && seasonInputs.length) {
          seasonsToggleBtn.hidden = false;
          const refreshToggleLabel = () => {
            const nonSpecials = seasonInputs.filter(cb => cb.dataset.seasonNumber !== '0');
            const allNonSpecialsChecked = nonSpecials.length > 0 && nonSpecials.every(cb => cb.checked);
            seasonsToggleBtn.textContent = allNonSpecialsChecked ? 'Tout désélectionner' : 'Tout sélectionner';
          };
          seasonInputs.forEach(cb => cb.addEventListener('change', refreshToggleLabel));
          refreshToggleLabel();
        }
        seasonInputs.forEach(cb => cb.addEventListener('change', updateSubmitState));
        updateSubmitState();
      })
      .catch(err => {
        if (closed) return;
        seasonsFailed = true;
        warn('failed to load seasons:', err);
        seasonsGrid.innerHTML = '';
        const fb = document.createElement('div');
        fb.style.fontSize = '13px';
        fb.style.color = '#FFB559';
        fb.style.padding = '8px 12px';
        fb.style.background = 'rgba(255, 181, 89, 0.1)';
        fb.style.borderRadius = '8px';
        fb.textContent = 'Impossible de récupérer la liste des saisons. La demande couvrira toutes les saisons disponibles.';
        seasonsGrid.appendChild(fb);
        seasonInputs = [];
        updateSubmitState();
      });
  } else {
    updateSubmitState();
  }

  log('opened request modal', { tmdbId, mediaType, title });
}
