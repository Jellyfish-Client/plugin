import { dbg, log, warn } from './jf-logger.js';
import { ensureStyle } from './jf-styles.js';
import { mountTrendingRail } from './jf-section-trending.js';
import { mountHeroCarousel } from './jf-section-hero.js';
import {
  mountPopularMoviesRail,
  mountPopularSeriesRail
} from './jf-section-popular.js';
import {
  mountWatchProvidersMoviesRail,
  mountWatchProvidersTvRail
} from './jf-section-watch-providers.js';
import { mountWatchlistRail } from './jf-section-watchlist.js';
import {
  mountGenreSliderMoviesRail,
  mountGenreSliderTvRail
} from './jf-section-genre-slider.js';
import {
  mountUpcomingMoviesRail,
  mountUpcomingEpisodesRail
} from './jf-section-upcoming.js';
import { mountMoodRails } from './jf-section-moods.js';
import { mountRecoRails } from './jf-section-reco.js';
import {
  mountContinueWatching,
  mountNextUp,
  mountLatest,
  mountLibraryRails
} from './jf-section-jellyfin.js';
import { mountNativeTakeover } from './jf-section-native.js';

const HOME_RAILS = [
  mountTrendingRail,
  mountHeroCarousel,
  mountPopularMoviesRail,
  mountPopularSeriesRail,
  mountWatchProvidersMoviesRail,
  mountWatchProvidersTvRail,
  mountWatchlistRail,
  mountGenreSliderMoviesRail,
  mountGenreSliderTvRail,
  mountUpcomingMoviesRail,
  mountUpcomingEpisodesRail,
  mountMoodRails,
  mountRecoRails,
  mountContinueWatching,
  mountNextUp,
  mountLatest,
  mountLibraryRails
];

function onHomeShown(homeRoot) {
  ensureStyle();
  // Tag the library-shortcuts section before the CSS hide rule kicks in, so
  // it survives the takeover. Synchronous, no fetch.
  try { mountNativeTakeover(homeRoot); } catch (e) { warn('native takeover error:', e); }
  HOME_RAILS.forEach(fn => {
    try {
      const p = fn(homeRoot);
      if (p && typeof p.catch === 'function') {
        p.catch(e => warn('rail error:', e));
      }
    } catch (e) {
      warn('rail error:', e);
    }
  });
}

function handlePageShow(ev) {
  const tgt = ev.target;
  if (!(tgt instanceof HTMLElement)) return;
  if (!tgt.classList.contains('homePage')) return;
  onHomeShown(tgt);
}

// Debounce so a burst of mutations triggers a single remount pass.
let remountTimer = null;
function scheduleRemount(reason) {
  if (remountTimer) return;
  remountTimer = window.setTimeout(() => {
    remountTimer = null;
    const home = document.querySelector('.homePage');
    if (home) {
      dbg('remount triggered:', reason);
      onHomeShown(home);
    }
  }, 200);
}

function wireUp() {
  document.addEventListener('pageshow', handlePageShow, true);
  const visibleHome = document.querySelector('.homePage');
  if (visibleHome) onHomeShown(visibleHome);
  // Catch Jellyfin rebuilding the home view between or after our async mounts.
  try {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          if (n.classList && n.classList.contains('homePage')) {
            scheduleRemount('homePage added');
            return;
          }
          // Sub-element rebuild (e.g. #homeTab .sections wiped+repopulated).
          if (n.querySelector && n.querySelector('.homePage')) {
            scheduleRemount('homePage descendant added');
            return;
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) {
    warn('MutationObserver setup failed:', e && e.message ? e.message : e);
  }
}

export function bootstrap() {
  log('home.js loaded');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUp, { once: true });
  } else {
    wireUp();
  }
}
