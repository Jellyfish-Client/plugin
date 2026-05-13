using System.Text.Json.Nodes;
using Jellyfish.Bridge.Configuration;
using Jellyfish.Bridge.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Api;

/// <summary>
/// Aggregated "upcoming" feed: combines Radarr (movies) + Sonarr (episodes)
/// calendars into a single, normalized, date-sorted list. Used by the mobile
/// client and by the home-page injection for quick visual testing.
/// </summary>
[ApiController]
[Route("jellyfish/upcoming")]
[Authorize]
public class UpcomingController : ControllerBase
{
    private readonly IUpstreamHttpClient _http;
    private readonly ILogger<UpcomingController> _logger;

    public UpcomingController(IUpstreamHttpClient http, ILogger<UpcomingController> logger)
    {
        _http = http;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] int days = 30,
        [FromQuery] string kinds = "movies,episodes",
        [FromQuery] bool onlyMissing = true,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        days = Math.Clamp(days, 1, 180);
        limit = Math.Clamp(limit, 1, 200);
        var wantMovies = kinds.Contains("movies", StringComparison.OrdinalIgnoreCase);
        var wantEps = kinds.Contains("episodes", StringComparison.OrdinalIgnoreCase);
        var start = DateTimeOffset.UtcNow;
        var end = start.AddDays(days);

        var cfg = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        var radarrOk = wantMovies && !string.IsNullOrWhiteSpace(cfg.RadarrUrl) && !string.IsNullOrWhiteSpace(cfg.RadarrApiKey);
        var sonarrOk = wantEps && !string.IsNullOrWhiteSpace(cfg.SonarrUrl) && !string.IsNullOrWhiteSpace(cfg.SonarrApiKey);

        var movieTask = radarrOk ? FetchMoviesAsync(start, end, ct) : Task.FromResult(new List<JsonNode>());
        var epsTask = sonarrOk ? FetchEpisodesAsync(start, end, ct) : Task.FromResult(new List<JsonNode>());
        await Task.WhenAll(movieTask, epsTask).ConfigureAwait(false);

        var items = new List<JsonObject>();
        foreach (var m in movieTask.Result)
        {
            if (onlyMissing && (Bool(m["hasFile"]) ?? false)) continue;
            var mapped = MapMovie(m);
            if (mapped is not null) items.Add(mapped);
        }
        foreach (var e in epsTask.Result)
        {
            if (onlyMissing && (Bool(e["hasFile"]) ?? false)) continue;
            var mapped = MapEpisode(e);
            if (mapped is not null) items.Add(mapped);
        }

        var ordered = items
            .Where(x => Str(x["releaseDate"]) is not null)
            .OrderBy(x => Str(x["releaseDate"]), StringComparer.Ordinal)
            .Take(limit)
            .ToList();

        return Ok(new
        {
            count = ordered.Count,
            windowStart = start,
            windowEnd = end,
            items = ordered,
        });
    }

    private async Task<List<JsonNode>> FetchMoviesAsync(DateTimeOffset start, DateTimeOffset end, CancellationToken ct)
    {
        using var http = _http.ForRadarr();
        var url = $"api/v3/calendar?start={Uri.EscapeDataString(start.ToString("O"))}&end={Uri.EscapeDataString(end.ToString("O"))}";
        try
        {
            using var res = await http.GetAsync(url, ct).ConfigureAwait(false);
            res.EnsureSuccessStatusCode();
            await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            var node = await JsonNode.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
            return (node as JsonArray)?.Where(n => n is not null).Select(n => n!).ToList() ?? new List<JsonNode>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Radarr calendar fetch failed");
            return new List<JsonNode>();
        }
    }

    private async Task<List<JsonNode>> FetchEpisodesAsync(DateTimeOffset start, DateTimeOffset end, CancellationToken ct)
    {
        using var http = _http.ForSonarr();
        var url = $"api/v3/calendar?start={Uri.EscapeDataString(start.ToString("O"))}&end={Uri.EscapeDataString(end.ToString("O"))}&includeSeries=true";
        try
        {
            using var res = await http.GetAsync(url, ct).ConfigureAwait(false);
            res.EnsureSuccessStatusCode();
            await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            var node = await JsonNode.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
            return (node as JsonArray)?.Where(n => n is not null).Select(n => n!).ToList() ?? new List<JsonNode>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Sonarr calendar fetch failed");
            return new List<JsonNode>();
        }
    }

    private static JsonObject? MapMovie(JsonNode m)
    {
        var date = Str(m["digitalRelease"]) ?? Str(m["physicalRelease"]) ?? Str(m["inCinemas"]);
        return new JsonObject
        {
            ["kind"] = "movie",
            ["releaseDate"] = date,
            ["title"] = Str(m["title"]),
            ["year"] = Int(m["year"]),
            ["overview"] = Str(m["overview"]),
            ["posterUrl"] = PickPoster(m["images"] as JsonArray),
            ["hasFile"] = Bool(m["hasFile"]) ?? false,
            ["sourceId"] = Int(m["id"]),
        };
    }

    private static JsonObject? MapEpisode(JsonNode e)
    {
        var date = Str(e["airDateUtc"]) ?? Str(e["airDate"]);
        var series = e["series"] as JsonObject;
        return new JsonObject
        {
            ["kind"] = "episode",
            ["releaseDate"] = date,
            ["title"] = Str(e["title"]),
            ["seriesTitle"] = series is null ? null : Str(series["title"]),
            ["seasonNumber"] = Int(e["seasonNumber"]) ?? 0,
            ["episodeNumber"] = Int(e["episodeNumber"]) ?? 0,
            ["overview"] = Str(e["overview"]),
            ["posterUrl"] = PickPoster(series?["images"] as JsonArray),
            ["hasFile"] = Bool(e["hasFile"]) ?? false,
            ["sourceId"] = Int(e["id"]),
        };
    }

    private static string? PickPoster(JsonArray? images)
    {
        if (images is null) return null;
        foreach (var im in images)
        {
            if (im is null) continue;
            if (string.Equals(Str(im["coverType"]), "poster", StringComparison.OrdinalIgnoreCase))
            {
                return Str(im["remoteUrl"]) ?? Str(im["url"]);
            }
        }
        return null;
    }

    private static string? Str(JsonNode? n)
        => n is JsonValue v && v.TryGetValue<string>(out var s) ? s : null;

    private static int? Int(JsonNode? n)
    {
        if (n is not JsonValue v) return null;
        if (v.TryGetValue<int>(out var i)) return i;
        if (v.TryGetValue<long>(out var l)) return (int)l;
        if (v.TryGetValue<double>(out var d)) return (int)d;
        return null;
    }

    private static bool? Bool(JsonNode? n)
        => n is JsonValue v && v.TryGetValue<bool>(out var b) ? b : null;
}
