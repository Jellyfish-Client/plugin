import { JF_ID_REGEX } from './jf-constants.js';
import { dbg, warn } from './jf-logger.js';
import { getJfImageUrl } from './jf-apiclient.js';

function isValidJfId(id) {
  return typeof id === 'string' && JF_ID_REGEX.test(id);
}

function pad2(n) {
  const s = String(n);
  return s.length >= 2 ? s : '0' + s;
}

function buildEpisodeSubtitle(item) {
  if (item == null || item.Type !== 'Episode') return null;
  if (item.ParentIndexNumber == null && item.IndexNumber == null) return null;
  const s = (item.ParentIndexNumber != null) ? pad2(item.ParentIndexNumber) : '00';
  const e = (item.IndexNumber != null) ? pad2(item.IndexNumber) : '00';
  return ('S' + s + 'E' + e).toUpperCase();
}

// Picks the best landscape image URL: Thumb -> Backdrop -> Primary on the item.
// For episodes, also falls back to the series Primary image if neither Thumb nor
// Backdrop is present on the episode itself.
function buildLandscapeImageUrl(item) {
  if (!item || !isValidJfId(item.Id)) return null;
  const tags = item.ImageTags || {};
  const backdrops = Array.isArray(item.BackdropImageTags) ? item.BackdropImageTags : [];
  if (tags.Thumb) {
    return getJfImageUrl(item.Id, { type: 'Thumb', maxWidth: 600, tag: tags.Thumb });
  }
  if (backdrops.length > 0) {
    return getJfImageUrl(item.Id, { type: 'Backdrop', maxWidth: 600, tag: backdrops[0] });
  }
  if (item.Type === 'Episode' && isValidJfId(item.SeriesId)) {
    return getJfImageUrl(item.SeriesId, {
      type: 'Primary',
      maxWidth: 600,
      tag: item.SeriesPrimaryImageTag
    });
  }
  if (tags.Primary) {
    return getJfImageUrl(item.Id, { type: 'Primary', maxWidth: 600, tag: tags.Primary });
  }
  return null;
}

function buildPosterImageUrl(item) {
  if (!item || !isValidJfId(item.Id)) return null;
  const tags = item.ImageTags || {};
  if (tags.Primary) {
    return getJfImageUrl(item.Id, { type: 'Primary', maxWidth: 300, tag: tags.Primary });
  }
  // Series primary fallback for episodes shown as posters (rare for poster style).
  if (item.Type === 'Episode' && isValidJfId(item.SeriesId)) {
    return getJfImageUrl(item.SeriesId, {
      type: 'Primary',
      maxWidth: 300,
      tag: item.SeriesPrimaryImageTag
    });
  }
  return getJfImageUrl(item.Id, { type: 'Primary', maxWidth: 300 });
}

function attachClickNavigate(btn, item) {
  btn.addEventListener('click', () => {
    if (!isValidJfId(item.Id)) return;
    try {
      window.location.hash = '#/details?id=' + item.Id;
    } catch (e) {
      warn('navigate failed:', e && e.message ? e.message : e);
    }
  });
}

export function renderJellyfinCard(item, opts) {
  try {
    if (!item || typeof item !== 'object') return null;
    if (!isValidJfId(item.Id)) {
      dbg('renderJellyfinCard: invalid id', item && item.Id);
      return null;
    }
    const options = opts || {};
    const style = options.style || 'poster';
    const isLandscape = style === 'landscape';
    const showProgress = !!options.showProgress && isLandscape;

    const imageUrl = isLandscape ? buildLandscapeImageUrl(item) : buildPosterImageUrl(item);
    if (!imageUrl) return null;

    const title = isLandscape
      ? ((item.SeriesName != null && item.SeriesName !== '') ? item.SeriesName : (item.Name || ''))
      : (item.Name || '');
    if (!title) return null;

    let subtitle = null;
    if (isLandscape) {
      subtitle = buildEpisodeSubtitle(item);
    } else if (item.ProductionYear) {
      subtitle = String(item.ProductionYear);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isLandscape ? 'card jf-bridge-landscape' : 'card';
    btn.dataset.jfId = item.Id;
    if (item.Type) btn.dataset.jfType = String(item.Type);
    attachClickNavigate(btn, item);

    const cardBox = document.createElement('div');
    cardBox.className = 'cardBox cardBox-bottompadded';

    const scalable = document.createElement('div');
    scalable.className = 'cardScalable';

    const padder = document.createElement('div');
    padder.className = 'cardPadder cardPadder-overflowPortrait';
    scalable.appendChild(padder);

    const imgWrap = document.createElement('div');
    imgWrap.className = 'cardImageContainer coveredImage cardContent';
    // imageUrl comes from ApiClient.getScaledImageUrl / serverAddress concat —
    // never user-controlled freeform. Safe to interpolate into CSS url().
    imgWrap.style.backgroundImage = "url('" + imageUrl + "')";

    if (showProgress) {
      const pctRaw = item.UserData && item.UserData.PlayedPercentage;
      const pct = (typeof pctRaw === 'number' && isFinite(pctRaw))
        ? Math.max(0, Math.min(100, pctRaw))
        : 0;
      if (pct > 0) {
        const track = document.createElement('div');
        track.className = 'jf-bridge-progress';
        const bar = document.createElement('div');
        bar.className = 'jf-bridge-progress-bar';
        bar.style.width = pct + '%';
        track.appendChild(bar);
        imgWrap.appendChild(track);
      }
    }

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
  } catch (e) {
    warn('renderJellyfinCard error:', e && e.message ? e.message : e);
    return null;
  }
}
