import {
  RAIL_ATTR,
  TTL_5MIN,
  HERO_AUTO_ADVANCE_MS,
  HERO_SLIDE_COUNT,
  SKELETON_SHOW_DELAY_MS
} from './jf-constants.js';
import { dbg, log, warn } from './jf-logger.js';
import { swr } from './jf-swr.js';
import { getApi, getCurrentUserId, getJfImageUrl } from './jf-apiclient.js';

export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

export function formatRuntimeMinutes(ticks) {
  if (!ticks || typeof ticks !== 'number') return '';
  const minutes = Math.round(ticks / 600000000); // 1 tick = 100ns, 1 min = 6e10
  if (!minutes) return '';
  return minutes + ' min';
}

export async function fetchHeroItems() {
  const api = getApi();
  if (!api || typeof api.getItems !== 'function') {
    throw new Error('ApiClient.getItems unavailable');
  }
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('no user id');
  const resp = await api.getItems(userId, {
    IncludeItemTypes: 'Movie,Series',
    Filters: 'IsUnplayed',
    ImageTypes: 'Logo,Backdrop',
    Recursive: true,
    SortBy: 'Random',
    Limit: 24,
    Fields: 'Overview,Genres,ProductionYear,OfficialRating,RunTimeTicks'
  });
  const items = (resp && resp.Items ? resp.Items : []);
  dbg('hero pool: total=' + items.length);
  // Prefer items with Backdrop. Logo is nice-to-have (we fall back to title).
  const all = items.filter(it => it && it.BackdropImageTags && it.BackdropImageTags.length);
  dbg('hero pool: with backdrop=' + all.length);
  shuffleInPlace(all);
  return all.slice(0, HERO_SLIDE_COUNT);
}

export function buildHeroSlide(item, idx) {
  const slide = document.createElement('article');
  slide.className = 'jf-bridge-hero-slide' + (idx === 0 ? ' jf-bridge-hero-slide--active' : '');
  slide.dataset.idx = String(idx);
  const backdropTag = item.BackdropImageTags && item.BackdropImageTags[0];
  const backdropUrl = getJfImageUrl(item.Id, { type: 'Backdrop', maxWidth: 1600, tag: backdropTag });
  slide.style.backgroundImage = "url('" + backdropUrl + "')";

  const content = document.createElement('div');
  content.className = 'jf-bridge-hero-content';

  if (item.ImageTags && item.ImageTags.Logo) {
    const logo = document.createElement('img');
    logo.className = 'jf-bridge-hero-logo';
    logo.alt = item.Name || '';
    logo.src = getJfImageUrl(item.Id, { type: 'Logo', maxWidth: 600, tag: item.ImageTags.Logo });
    content.appendChild(logo);
  } else {
    const h1 = document.createElement('h1');
    h1.className = 'jf-bridge-hero-title-fallback';
    h1.textContent = item.Name || '';
    content.appendChild(h1);
  }

  const metaPieces = [];
  if (item.ProductionYear) metaPieces.push(String(item.ProductionYear));
  const rt = formatRuntimeMinutes(item.RunTimeTicks);
  if (rt) metaPieces.push(rt);
  if (item.OfficialRating) metaPieces.push(item.OfficialRating);
  if (metaPieces.length) {
    const meta = document.createElement('div');
    meta.className = 'jf-bridge-hero-meta';
    metaPieces.forEach((piece, i) => {
      if (i > 0) {
        const dot = document.createElement('span');
        dot.className = 'jf-bridge-hero-meta-dot';
        meta.appendChild(dot);
      }
      const span = document.createElement('span');
      span.textContent = piece;
      meta.appendChild(span);
    });
    content.appendChild(meta);
  }

  if (item.Overview) {
    const ov = document.createElement('p');
    ov.className = 'jf-bridge-hero-overview';
    ov.textContent = item.Overview;
    content.appendChild(ov);
  }

  const actions = document.createElement('div');
  actions.className = 'jf-bridge-hero-actions';
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'jf-bridge-hero-btn jf-bridge-hero-btn--primary';
  playBtn.textContent = '▶ Lecture';
  playBtn.addEventListener('click', () => { window.location.hash = '#/details?id=' + item.Id; });
  const detailsBtn = document.createElement('button');
  detailsBtn.type = 'button';
  detailsBtn.className = 'jf-bridge-hero-btn jf-bridge-hero-btn--secondary';
  detailsBtn.textContent = 'Détails';
  detailsBtn.addEventListener('click', () => { window.location.hash = '#/details?id=' + item.Id; });
  actions.appendChild(playBtn);
  actions.appendChild(detailsBtn);
  content.appendChild(actions);

  slide.appendChild(content);
  return slide;
}

export function buildHeroCarousel(items) {
  const hero = document.createElement('section');
  hero.className = 'jf-bridge-hero';
  hero.setAttribute(RAIL_ATTR, 'hero');

  const slidesWrap = document.createElement('div');
  slidesWrap.className = 'jf-bridge-hero-slides';
  items.forEach((it, i) => slidesWrap.appendChild(buildHeroSlide(it, i)));
  hero.appendChild(slidesWrap);

  const dots = document.createElement('div');
  dots.className = 'jf-bridge-hero-dots';
  items.forEach((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'jf-bridge-hero-dot' + (i === 0 ? ' jf-bridge-hero-dot--active' : '');
    d.dataset.idx = String(i);
    d.setAttribute('aria-label', 'Slide ' + (i + 1));
    dots.appendChild(d);
  });
  hero.appendChild(dots);

  let active = 0;
  let timer = null;
  const total = items.length;

  function goTo(i) {
    if (total <= 0) return;
    active = ((i % total) + total) % total;
    const slideEls = slidesWrap.querySelectorAll('.jf-bridge-hero-slide');
    const dotEls = dots.querySelectorAll('.jf-bridge-hero-dot');
    slideEls.forEach((el, idx) => {
      el.classList.toggle('jf-bridge-hero-slide--active', idx === active);
    });
    dotEls.forEach((el, idx) => {
      el.classList.toggle('jf-bridge-hero-dot--active', idx === active);
    });
  }
  function next() { goTo(active + 1); }
  function startAuto() {
    if (timer || total < 2) return;
    timer = window.setInterval(next, HERO_AUTO_ADVANCE_MS);
  }
  function stopAuto() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  dots.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const idxAttr = t.dataset.idx;
    if (idxAttr == null) return;
    const i = parseInt(idxAttr, 10);
    if (!isNaN(i)) { stopAuto(); goTo(i); startAuto(); }
  });
  hero.addEventListener('mouseenter', stopAuto);
  hero.addEventListener('mouseleave', startAuto);
  startAuto();

  return hero;
}

export async function mountHeroCarousel(homeRoot) {
  const container = homeRoot && homeRoot.classList && homeRoot.classList.contains('homePage')
    ? homeRoot
    : homeRoot.querySelector('.homePage') || homeRoot;
  if (!container) return;
  if (container.querySelector('[' + RAIL_ATTR + '="hero"]')) {
    dbg('hero already mounted');
    return;
  }

  // Skeleton if fetch takes > 200ms
  let skeleton = null;
  const skeletonTimer = window.setTimeout(() => {
    skeleton = document.createElement('section');
    skeleton.className = 'jf-bridge-hero';
    skeleton.setAttribute(RAIL_ATTR, 'hero-skeleton');
    const sk = document.createElement('div');
    sk.className = 'jf-bridge-hero-skeleton';
    skeleton.appendChild(sk);
    container.insertBefore(skeleton, container.firstChild);
  }, SKELETON_SHOW_DELAY_MS);

  let items;
  try {
    items = await swr('hero:featured:v2', TTL_5MIN, fetchHeroItems);
  } catch (e) {
    warn('hero fetch failed:', e && e.message ? e.message : e);
    window.clearTimeout(skeletonTimer);
    if (skeleton && skeleton.parentNode) skeleton.parentNode.removeChild(skeleton);
    return;
  }
  window.clearTimeout(skeletonTimer);

  if (!items || !items.length) {
    dbg('hero: no eligible items');
    if (skeleton && skeleton.parentNode) skeleton.parentNode.removeChild(skeleton);
    return;
  }

  const hero = buildHeroCarousel(items);
  if (skeleton && skeleton.parentNode) {
    skeleton.parentNode.replaceChild(hero, skeleton);
  } else {
    container.insertBefore(hero, container.firstChild);
  }
  log('mounted hero carousel (' + items.length + ' slides)');
}
