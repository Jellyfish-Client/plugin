import { LOG_PREFIX } from './jf-constants.js';
import { tmdbLogoUrl, providerInitials } from './jf-tmdb.js';

export function renderProviderTile(provider, kind) {
  if (!provider || typeof provider !== 'object') return null;
  const id = provider.id;
  const name = provider.name || '';
  const logoUrl = tmdbLogoUrl(provider.logoPath);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'jf-bridge-provider-tile';
  if (id != null) btn.dataset.providerId = String(id);
  if (kind) btn.dataset.kind = kind;
  btn.title = name;
  btn.setAttribute('aria-label', name || 'Provider');
  btn.addEventListener('click', () => {
    try {
      console.log(LOG_PREFIX, 'tapped provider', { id: id, name: name, kind: kind });
    } catch (_) {}
  });

  if (logoUrl) {
    const img = document.createElement('img');
    img.alt = name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = logoUrl;
    // Fallback to initials on image error.
    img.addEventListener('error', () => {
      if (!btn.contains(img)) return;
      btn.removeChild(img);
      const span = document.createElement('span');
      span.className = 'jf-bridge-provider-tile-initials';
      span.textContent = providerInitials(name);
      btn.appendChild(span);
    });
    btn.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.className = 'jf-bridge-provider-tile-initials';
    span.textContent = providerInitials(name);
    btn.appendChild(span);
  }
  return btn;
}
