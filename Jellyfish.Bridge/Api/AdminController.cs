using System.Text.Json;
using Jellyfish.Bridge.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Api;

/// <summary>
/// Admin-only utility endpoints, used by the plugin configuration page.
/// Each "test" endpoint takes a candidate URL + API key from the request body
/// (so the admin can verify credentials **before** saving them) and pings the
/// upstream's status endpoint, returning a structured result the UI can render.
///
/// Always returns 200 OK with <c>{ ok: bool, ... }</c> — never throws to the
/// browser — so the client doesn't have to differentiate between "5xx because
/// the test code crashed" and "the upstream is down".
/// </summary>
[ApiController]
[Route("jellyfish/admin")]
[Authorize(Policy = "RequiresElevation")]
public class AdminController : ControllerBase
{
    private const int TestTimeoutSeconds = 8;

    private readonly IUpstreamHttpClient _http;
    private readonly IJellyseerrUserMapper _mapper;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IUpstreamHttpClient http,
        IJellyseerrUserMapper mapper,
        ILogger<AdminController> logger)
    {
        _http = http;
        _mapper = mapper;
        _logger = logger;
    }

    public record TestRequest(string Url, string ApiKey);

    [HttpPost("test/jellyseerr")]
    public async Task<IActionResult> TestJellyseerr([FromBody] TestRequest body, CancellationToken ct)
    {
        // Invalidate the user-mapping cache on every successful Jellyseerr test
        // so admins can fix mapping issues without restarting Jellyfin.
        var probe = await ProbeAsync(body, "api/v1/status", ct, asJson: true);
        if (probe.Ok) _mapper.Invalidate();
        return Ok(probe);
    }

    [HttpPost("test/radarr")]
    public Task<IActionResult> TestRadarr([FromBody] TestRequest body, CancellationToken ct)
        => ProbeAndReturn(body, "api/v3/system/status", ct);

    [HttpPost("test/sonarr")]
    public Task<IActionResult> TestSonarr([FromBody] TestRequest body, CancellationToken ct)
        => ProbeAndReturn(body, "api/v3/system/status", ct);

    private async Task<IActionResult> ProbeAndReturn(TestRequest body, string path, CancellationToken ct)
        => Ok(await ProbeAsync(body, path, ct, asJson: true));

    private async Task<ProbeResult> ProbeAsync(TestRequest body, string path, CancellationToken ct, bool asJson)
    {
        if (string.IsNullOrWhiteSpace(body.Url))
            return ProbeResult.Fail("missing_url", "URL is empty.");
        if (!Uri.IsWellFormedUriString(body.Url, UriKind.Absolute))
            return ProbeResult.Fail("bad_url", "URL is not a well-formed absolute URI.");
        if (string.IsNullOrWhiteSpace(body.ApiKey))
            return ProbeResult.Fail("missing_api_key", "API key is empty.");

        try
        {
            using var http = _http.ForAdHoc(body.Url, body.ApiKey, TestTimeoutSeconds);
            using var res = await http.GetAsync(path, ct).ConfigureAwait(false);
            var status = (int)res.StatusCode;

            if (status == 401 || status == 403)
                return ProbeResult.Fail("unauthorized", $"Upstream returned {status}. Check the API key.");
            if (!res.IsSuccessStatusCode)
                return ProbeResult.Fail("bad_status", $"Upstream returned HTTP {status}.");

            string? version = null;
            if (asJson)
            {
                try
                {
                    await using var s = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
                    using var doc = await JsonDocument.ParseAsync(s, cancellationToken: ct).ConfigureAwait(false);
                    // Jellyseerr → { "version": "...", "commitTag": "..." }
                    // Radarr/Sonarr → { "version": "...", "appName": "...", ... }
                    if (doc.RootElement.TryGetProperty("version", out var v) && v.ValueKind == JsonValueKind.String)
                        version = v.GetString();
                }
                catch (JsonException)
                {
                    // Response wasn't JSON — still OK, just no version to report.
                }
            }

            return ProbeResult.Pass(version);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return ProbeResult.Fail("timeout", $"No response after {TestTimeoutSeconds}s.");
        }
        catch (HttpRequestException ex)
        {
            // DNS, TCP refused, TLS — all bubble up here.
            return ProbeResult.Fail("unreachable", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error testing upstream {Url}", body.Url);
            return ProbeResult.Fail("error", ex.Message);
        }
    }

    public record ProbeResult(bool Ok, string? Error = null, string? Detail = null, string? Version = null)
    {
        public static ProbeResult Pass(string? version) => new(true, Version: version);
        public static ProbeResult Fail(string error, string detail) => new(false, error, detail);
    }
}
