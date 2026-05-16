using System.Text.Json;
using System.Text.Json.Nodes;
using Jellyfish.Bridge.Configuration;
using Jellyfish.Bridge.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Api;

/// <summary>
/// Proxies Jellyseerr behind Jellyfin auth. Every endpoint uses the admin
/// X-Api-Key stored in plugin config; for user-attributed actions (POST
/// request, GET own requests) we resolve the Jellyfin user to the matching
/// Jellyseerr user via <see cref="IJellyseerrUserMapper"/> and inject `userId`
/// into the payload so Jellyseerr attributes the call correctly.
/// </summary>
[ApiController]
[Route("jellyfish/jellyseerr")]
[Authorize]
public class JellyseerrController : ControllerBase
{
    private readonly IUpstreamHttpClient _http;
    private readonly IJellyseerrUserMapper _mapper;
    private readonly ILogger<JellyseerrController> _logger;

    public JellyseerrController(
        IUpstreamHttpClient http,
        IJellyseerrUserMapper mapper,
        ILogger<JellyseerrController> logger)
    {
        _http = http;
        _mapper = mapper;
        _logger = logger;
    }

    // ------------------------------------------------------------------
    // Public reads (no user mapping needed — Jellyseerr's data is global)
    // ------------------------------------------------------------------

    [HttpGet("trending")]
    public Task<IActionResult> Trending([FromQuery] int page = 1, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/discover/trending?page={page}", null, ct);

    [HttpGet("search")]
    public Task<IActionResult> Search([FromQuery] string query, [FromQuery] int page = 1, CancellationToken ct = default)
        => Forward(HttpMethod.Get,
            $"api/v1/search?query={Uri.EscapeDataString(query ?? string.Empty)}&page={page}", null, ct);

    [HttpGet("discover/movies")]
    public Task<IActionResult> DiscoverMovies(CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/discover/movies{Request.QueryString.Value}", null, ct);

    [HttpGet("discover/tv")]
    public Task<IActionResult> DiscoverTv(CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/discover/tv{Request.QueryString.Value}", null, ct);

    [HttpGet("movie/{tmdbId:int}")]
    public Task<IActionResult> Movie(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/movie/{tmdbId}", null, ct);

    [HttpGet("movie/{tmdbId:int}/similar")]
    public Task<IActionResult> MovieSimilar(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/movie/{tmdbId}/similar{Request.QueryString.Value}", null, ct);

    [HttpGet("tv/{tmdbId:int}")]
    public Task<IActionResult> Tv(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/tv/{tmdbId}", null, ct);

    [HttpGet("tv/{tmdbId:int}/similar")]
    public Task<IActionResult> TvSimilar(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/tv/{tmdbId}/similar{Request.QueryString.Value}", null, ct);

    [HttpGet("collection/{tmdbId:int}")]
    public Task<IActionResult> Collection(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/collection/{tmdbId}", null, ct);

    [HttpGet("person/{tmdbId:int}")]
    public Task<IActionResult> Person(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/person/{tmdbId}", null, ct);

    [HttpGet("person/{tmdbId:int}/combined_credits")]
    public Task<IActionResult> PersonCombinedCredits(int tmdbId, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/person/{tmdbId}/combined_credits{Request.QueryString.Value}", null, ct);

    [HttpGet("watchproviders/movies")]
    public Task<IActionResult> WatchProvidersMovies([FromQuery] string? watchRegion = null, CancellationToken ct = default)
    {
        var qs = string.IsNullOrWhiteSpace(watchRegion)
            ? string.Empty
            : $"?watchRegion={Uri.EscapeDataString(watchRegion)}";
        return Forward(HttpMethod.Get, $"api/v1/watchproviders/movies{qs}", null, ct);
    }

    [HttpGet("watchproviders/tv")]
    public Task<IActionResult> WatchProvidersTv([FromQuery] string? watchRegion = null, CancellationToken ct = default)
    {
        var qs = string.IsNullOrWhiteSpace(watchRegion)
            ? string.Empty
            : $"?watchRegion={Uri.EscapeDataString(watchRegion)}";
        return Forward(HttpMethod.Get, $"api/v1/watchproviders/tv{qs}", null, ct);
    }

    [HttpGet("genreslider/movie")]
    public Task<IActionResult> GenreSliderMovie(CancellationToken ct = default)
        => Forward(HttpMethod.Get, "api/v1/discover/genreslider/movie", null, ct);

    [HttpGet("genreslider/tv")]
    public Task<IActionResult> GenreSliderTv(CancellationToken ct = default)
        => Forward(HttpMethod.Get, "api/v1/discover/genreslider/tv", null, ct);

    [HttpGet("discover/watchlist")]
    public Task<IActionResult> DiscoverWatchlist(CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v1/discover/watchlist{Request.QueryString.Value}", null, ct);

    // ------------------------------------------------------------------
    // User-scoped reads — only the caller's own requests
    // ------------------------------------------------------------------

    [HttpGet("request")]
    public async Task<IActionResult> ListRequests(
        [FromQuery] int take = 20,
        [FromQuery] int skip = 0,
        [FromQuery] string? filter = null,
        CancellationToken ct = default)
    {
        var jellyseerrUserId = await ResolveJellyseerrUserAsync(ct);
        if (jellyseerrUserId is null) return UnknownJellyseerrUser();

        var qs = $"take={take}&skip={skip}&requestedBy={jellyseerrUserId.Value}";
        if (!string.IsNullOrWhiteSpace(filter)) qs += $"&filter={Uri.EscapeDataString(filter)}";
        return await Forward(HttpMethod.Get, $"api/v1/request?{qs}", null, ct);
    }

    // ------------------------------------------------------------------
    // User-attributed writes — inject userId into the upstream payload
    // ------------------------------------------------------------------

    [HttpPost("request")]
    public async Task<IActionResult> CreateRequest([FromBody] JsonObject body, CancellationToken ct = default)
    {
        var jellyseerrUserId = await ResolveJellyseerrUserAsync(ct);
        if (jellyseerrUserId is null) return UnknownJellyseerrUser();

        // Force userId — admin auth allows specifying any user; we never let
        // the client pick someone else's id.
        body["userId"] = jellyseerrUserId.Value;
        var content = UpstreamProxy.JsonBody(body);
        return await Forward(HttpMethod.Post, "api/v1/request", content, ct);
    }

    [HttpDelete("request/{id:int}")]
    public async Task<IActionResult> DeleteRequest(int id, CancellationToken ct = default)
    {
        var jellyseerrUserId = await ResolveJellyseerrUserAsync(ct);
        if (jellyseerrUserId is null) return UnknownJellyseerrUser();

        using var http = _http.ForJellyseerr();
        using var probe = await http.GetAsync($"api/v1/request/{id}", ct).ConfigureAwait(false);
        if (!probe.IsSuccessStatusCode)
        {
            return StatusCode((int)probe.StatusCode);
        }

        var owner = await ExtractRequestedById(probe, ct);
        if (owner is null || (owner.Value != jellyseerrUserId.Value && !User.IsAdministrator()))
        {
            return Forbid();
        }
        return await Forward(HttpMethod.Delete, $"api/v1/request/{id}", null, ct);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private async Task<IActionResult> Forward(
        HttpMethod method, string path, HttpContent? body, CancellationToken ct)
    {
        var cfg = Plugin.Instance?.Configuration;
        if (cfg is null || string.IsNullOrWhiteSpace(cfg.JellyseerrUrl) || string.IsNullOrWhiteSpace(cfg.JellyseerrApiKey))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "jellyseerr_not_configured" });
        }

        using var http = _http.ForJellyseerr();
        return await UpstreamProxy.ForwardAsync(http, method, path, body, ct, _logger);
    }

    private async Task<int?> ResolveJellyseerrUserAsync(CancellationToken ct)
    {
        var jfId = User.GetUserId();
        try
        {
            return await _mapper.MapAsync(jfId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resolve Jellyseerr user for Jellyfin user {JfId}", jfId);
            return null;
        }
    }

    private IActionResult UnknownJellyseerrUser() =>
        StatusCode(StatusCodes.Status403Forbidden,
            new { error = "no_jellyseerr_account",
                detail = "Your Jellyfin account is not linked to a Jellyseerr user." });

    private static async Task<int?> ExtractRequestedById(HttpResponseMessage res, CancellationToken ct)
    {
        await using var s = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(s, cancellationToken: ct).ConfigureAwait(false);
        if (!doc.RootElement.TryGetProperty("requestedBy", out var u)) return null;
        if (!u.TryGetProperty("id", out var idEl) || idEl.ValueKind != JsonValueKind.Number) return null;
        return idEl.GetInt32();
    }
}
