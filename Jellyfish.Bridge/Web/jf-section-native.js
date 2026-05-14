// Native Jellyfin home takeover.
//
// Keeps ONLY the "library shortcuts" row (Mes films / Mes séries / …) and
// hides every other native verticalSection so the home reads like our mobile
// app. Our own rails carry [data-jf-bridge-rail] and are never hidden by the
// CSS rule injected here.
import { dbg } from './jf-logger.js';

const KEEP_ATTR = 'data-jf-bridge-native-keep';

// Selectors tried in order to identify the library-shortcuts row. Jellyfin
// 10.10/10.11 uses `.section-mylibrary`; older builds may differ. Each entry
// is queried against `.homePage` and the first match wins.
const LIBRARY_SECTION_SELECTORS = [
  '.section-mylibrary',
  '[data-section="mylibrary"]',
  '.homeSectionLibraryButtons',
  // Heuristic fallback: a verticalSection whose itemsContainer holds
  // .cardLayout-square cards (the library button visual).
  '.verticalSection:has(.cardLayout-square)',
];

function findLibrarySection(homeRoot) {
  for (const sel of LIBRARY_SECTION_SELECTORS) {
    try {
      const el = homeRoot.querySelector(sel);
      if (el) return el;
    } catch (_) { /* :has() may throw on older engines — skip */ }
  }
  return null;
}

export function mountNativeTakeover(homeRoot) {
  if (!homeRoot) return;
  const lib = findLibrarySection(homeRoot);
  if (lib) {
    lib.setAttribute(KEEP_ATTR, '');
    // Move it to the very top of `.sections` so it sits directly under our
    // hero (the hero is prepended on `.homePage`, outside `.sections`).
    const sections = homeRoot.querySelector('#homeTab .sections') || homeRoot.querySelector('.sections');
    if (sections && lib.parentNode === sections && sections.firstChild !== lib) {
      sections.insertBefore(lib, sections.firstChild);
    }
    dbg('native: tagged library section');
  } else {
    dbg('native: no library section found (selectors tried:', LIBRARY_SECTION_SELECTORS.join(', '), ')');
  }
}
