// Pure logic — no DOM, no fetch. Picks up to N "seed" items to drive the
// "Parce que vous avez regardé X" / "Comme X" recommendation rails.
//
// Ported from the mobile app's `reco_seeds.dart`. Behaviour:
//   1. Anime bias  — if the user has watched any anime, one random anime
//      from history is guaranteed in the picks.
//   2. History fill — the remaining slots come from the user's history,
//      shuffled, deduped by tmdbId.
//   3. Popular fallback — if history doesn't fill up to `max`, top up
//      with shuffled popular items (these are flagged fromHistory: false
//      so the rail title can switch to "Comme X").

function shuffleInPlace(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

export function tmdbIdOf(item) {
  var ids = item && item.ProviderIds;
  if (!ids || typeof ids !== 'object') return null;
  var keys = Object.keys(ids);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key && key.toLowerCase() === 'tmdb') {
      var v = ids[key];
      var n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

export function historyCandidates(history) {
  var out = [];
  var seen = new Set();
  if (!Array.isArray(history)) return out;
  for (var i = 0; i < history.length; i++) {
    var item = history[i];
    if (!item) continue;
    var tmdbId = tmdbIdOf(item);
    if (tmdbId == null) continue;
    if (seen.has(tmdbId)) continue;
    var title = item.Name;
    if (!title) continue;
    var type;
    if (item.Type === 'Movie') type = 'movie';
    else if (item.Type === 'Series') type = 'tv';
    else continue;
    seen.add(tmdbId);
    var genres = Array.isArray(item.Genres) ? item.Genres : [];
    // Anime literal genre — NOT 'Animation' (which would capture Pixar etc.).
    var isAnime = false;
    for (var g = 0; g < genres.length; g++) {
      var gn = genres[g];
      if (gn && typeof gn === 'string' && gn.toLowerCase() === 'anime') {
        isAnime = true;
        break;
      }
    }
    out.push({ tmdbId: tmdbId, type: type, title: title, isAnime: isAnime });
  }
  return out;
}

export function pickRecoSeeds(history, popularFallback, max) {
  var limit = typeof max === 'number' && max > 0 ? max : 3;
  var picks = [];
  var usedIds = new Set();

  var candidates = historyCandidates(history);

  // 1. Anime bias — pick one random anime from history if any exist.
  var animes = candidates.filter(function (c) { return c.isAnime; });
  if (animes.length && picks.length < limit) {
    var pick = animes[Math.floor(Math.random() * animes.length)];
    picks.push({
      tmdbId: pick.tmdbId,
      type: pick.type,
      title: pick.title,
      fromHistory: true
    });
    usedIds.add(pick.tmdbId);
  }

  // 2. Fill from remaining shuffled history.
  var remaining = candidates.filter(function (c) { return !usedIds.has(c.tmdbId); });
  shuffleInPlace(remaining);
  for (var i = 0; i < remaining.length && picks.length < limit; i++) {
    var c = remaining[i];
    picks.push({
      tmdbId: c.tmdbId,
      type: c.type,
      title: c.title,
      fromHistory: true
    });
    usedIds.add(c.tmdbId);
  }

  // 3. Top up with shuffled popular fallback.
  if (picks.length < limit && Array.isArray(popularFallback) && popularFallback.length) {
    var fallback = popularFallback.filter(function (m) {
      return m && m.id != null && !usedIds.has(m.id);
    });
    shuffleInPlace(fallback);
    for (var k = 0; k < fallback.length && picks.length < limit; k++) {
      var m = fallback[k];
      var type = m.mediaType === 'tv' ? 'tv' : 'movie';
      picks.push({
        tmdbId: m.id,
        type: type,
        title: m.title || m.name || '',
        fromHistory: false
      });
      usedIds.add(m.id);
    }
  }

  return picks;
}
