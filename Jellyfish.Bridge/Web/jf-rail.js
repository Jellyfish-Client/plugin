import { RAIL_ATTR } from './jf-constants.js';
import { dbg, log, warn } from './jf-logger.js';

// Generic rail factory — builds the section/header/itemsContainer skeleton with
// trackpad-friendly scroll + mouse-drag scroll behaviour.
export function createRail({ id, eyebrow, title, items, renderCard }) {
  const section = document.createElement('div');
  section.className = 'verticalSection';
  section.setAttribute(RAIL_ATTR, id);

  const header = document.createElement('div');
  header.className = 'sectionTitleContainer sectionTitleTextContainer padded-left';
  if (eyebrow) {
    const eb = document.createElement('span');
    eb.className = 'jf-bridge-eyebrow';
    eb.textContent = eyebrow;
    header.appendChild(eb);
  }
  const h2 = document.createElement('h2');
  h2.className = 'sectionTitle sectionTitle-cards';
  h2.textContent = title;
  header.appendChild(h2);

  const itemsEl = document.createElement('div');
  itemsEl.className = 'itemsContainer jf-bridge-items';
  itemsEl.addEventListener('wheel', (e) => {
    // Let native overflow-x:auto handle trackpad gestures (preserves momentum).
    // Only convert Shift+vertical-wheel for mouse users (standard convention).
    if (e.shiftKey && e.deltaY !== 0) {
      e.preventDefault();
      itemsEl.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Click-and-drag scroll (mouse only — touch uses native overflow scroll).
  // Pattern: mousedown on rail, mousemove/mouseup on document. Avoids
  // setPointerCapture which can swallow clicks on child elements.
  const DRAG_THRESHOLD = 12;
  let dragStart = null;
  itemsEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragStart = {
      x: e.clientX,
      scrollLeft: itemsEl.scrollLeft,
      moved: false
    };
  });
  const onMouseMove = (e) => {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x;
    if (!dragStart.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragStart.moved = true;
      itemsEl.classList.add('jf-bridge-grabbing');
    }
    e.preventDefault();
    itemsEl.scrollLeft = dragStart.scrollLeft - dx;
  };
  const onMouseUp = () => {
    if (!dragStart) return;
    const wasDragging = dragStart.moved;
    itemsEl.classList.remove('jf-bridge-grabbing');
    dragStart = null;
    if (wasDragging) {
      // Suppress the click that browsers fire after a drag-release.
      const suppress = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      itemsEl.addEventListener('click', suppress, { capture: true, once: true });
    }
  };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  if (items && renderCard) {
    items.forEach(item => {
      const card = renderCard(item);
      if (card) itemsEl.appendChild(card);
    });
  }

  section.appendChild(header);
  section.appendChild(itemsEl);
  return { section, itemsEl };
}

// Resolves anchor, dedups, calls fetch+render, supports prepend/append/after.
export async function mountSection(opts, homeRoot) {
  const { id, eyebrow, title, fetch: fetcher, render, anchor } = opts;
  if (!id || typeof fetcher !== 'function' || typeof render !== 'function') {
    warn('mountSection: missing required option', id);
    return;
  }

  const rootSelector = (anchor && anchor.root) || '#homeTab .sections';
  const fallbackSelector = '.sections';

  // Resolve container against the LIVE DOM (not stale homeRoot). The
  // homePage element can be replaced by Jellyfin's view system between
  // the time onHomeShown was called and the time our async fetch resolves.
  function resolveContainer() {
    const liveHome = (homeRoot && homeRoot.isConnected) ? homeRoot : document.querySelector('.homePage');
    if (!liveHome) return null;
    return liveHome.querySelector(rootSelector)
      || liveHome.querySelector(fallbackSelector)
      || (liveHome.classList && liveHome.classList.contains('homePage') ? liveHome : null);
  }

  let container = resolveContainer();
  if (!container) { dbg('mountSection: no container for', id); return; }

  if (container.querySelector('[' + RAIL_ATTR + '="' + id + '"]')) {
    dbg('section already mounted:', id);
    return;
  }

  let data;
  try {
    data = await fetcher();
  } catch (e) {
    warn('section "' + id + '" fetch failed:', e && e.message ? e.message : e);
    return;
  }

  // Re-resolve container — the DOM may have changed during the fetch.
  container = resolveContainer();
  if (!container) { dbg('mountSection: container disappeared during fetch for', id); return; }
  if (container.querySelector('[' + RAIL_ATTR + '="' + id + '"]')) {
    dbg('section "' + id + '" mounted by another invocation while we were fetching');
    return;
  }

  const built = createRail({ id, eyebrow, title });
  const sectionEl = built.section;
  const itemsEl = built.itemsEl;

  let renderResult;
  try {
    renderResult = render(data, { sectionEl, itemsEl });
  } catch (e) {
    warn('section "' + id + '" render failed:', e && e.message ? e.message : e);
    return;
  }
  if (renderResult === false) {
    dbg('section "' + id + '" render returned false, skipping');
    return;
  }

  const position = anchor && anchor.position;
  if (position === 'prepend') {
    container.insertBefore(sectionEl, container.firstChild);
  } else if (position && typeof position === 'object' && position.after) {
    const ref = container.querySelector('[' + RAIL_ATTR + '="' + position.after + '"]');
    if (ref && ref.parentNode === container) {
      container.insertBefore(sectionEl, ref.nextSibling);
    } else {
      container.appendChild(sectionEl);
    }
  } else {
    container.appendChild(sectionEl);
  }

  log('mounted section "' + id + '"');
  return sectionEl;
}
