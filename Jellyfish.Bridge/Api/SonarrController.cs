using Jellyfish.Bridge.Configuration;
using Jellyfish.Bridge.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Api;

/// <summary>
/// Proxies Sonarr. Same model as Radarr: shared view for every Jellyfin user,
/// admin-only mutations.
/// </summary>
[ApiController]
[Route("jellyfish/sonarr")]
[Authorize]
public class SonarrController : ControllerBase
{
    private readonly IUpstreamHttpClient _http;
    private readonly ILogger<SonarrController> _logger;

    public SonarrController(IUpstreamHttpClient http, ILogger<SonarrController> logger)
    {
        _http = http;
        _logger = logger;
    }

    [HttpGet("system/status")]
    public Task<IActionResult> Status(CancellationToken ct = default)
        => Forward(HttpMethod.Get, "api/v3/system/status", ct);

    [HttpGet("series")]
    public Task<IActionResult> Series(CancellationToken ct = default)
        => Forward(HttpMethod.Get, "api/v3/series", ct);

    [HttpGet("series/{id:int}")]
    public Task<IActionResult> SeriesById(int id, CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v3/series/{id}", ct);

    [HttpGet("episode")]
    public Task<IActionResult> Episodes(
        [FromQuery] int seriesId,
        CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v3/episode?seriesId={seriesId}", ct);

    [HttpGet("queue")]
    public Task<IActionResult> Queue(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v3/queue?page={page}&pageSize={pageSize}", ct);

    [HttpGet("history")]
    public Task<IActionResult> History(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Forward(HttpMethod.Get, $"api/v3/history?page={page}&pageSize={pageSize}", ct);

    [HttpGet("calendar")]
    public Task<IActionResult> Calendar(
        [FromQuery] DateTimeOffset? start = null,
        [FromQuery] DateTimeOffset? end = null,
        CancellationToken ct = default)
    {
        var qs = new List<string>();
        if (start.HasValue) qs.Add($"start={Uri.EscapeDataString(start.Value.ToString("O"))}");
        if (end.HasValue) qs.Add($"end={Uri.EscapeDataString(end.Value.ToString("O"))}");
        var url = "api/v3/calendar" + (qs.Count > 0 ? "?" + string.Join("&", qs) : string.Empty);
        return Forward(HttpMethod.Get, url, ct);
    }

    [HttpDelete("queue/{id:int}")]
    public Task<IActionResult> DeleteQueueItem(int id, CancellationToken ct = default)
    {
        if (!User.IsAdministrator()) return Task.FromResult<IActionResult>(Forbid());
        return Forward(HttpMethod.Delete, $"api/v3/queue/{id}", ct);
    }

    private async Task<IActionResult> Forward(HttpMethod method, string path, CancellationToken ct)
    {
        var cfg = Plugin.Instance?.Configuration;
        if (cfg is null || string.IsNullOrWhiteSpace(cfg.SonarrUrl) || string.IsNullOrWhiteSpace(cfg.SonarrApiKey))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "sonarr_not_configured" });
        }

        using var http = _http.ForSonarr();
        return await UpstreamProxy.ForwardAsync(http, method, path, null, ct, _logger);
    }
}
