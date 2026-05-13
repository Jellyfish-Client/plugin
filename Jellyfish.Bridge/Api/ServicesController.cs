using Jellyfish.Bridge.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfish.Bridge.Api;

/// <summary>
/// Discovery endpoint — the mobile client calls this once at startup to know
/// which upstream services the admin has wired up. Replaces the legacy
/// Custom-CSS marker mechanism the Jellyfish app used to use.
/// Never returns URLs or API keys.
/// </summary>
[ApiController]
[Route("jellyfish/services")]
[Authorize]
public class ServicesController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        var cfg = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        return Ok(new
        {
            jellyseerr = new { available = Has(cfg.JellyseerrUrl, cfg.JellyseerrApiKey) },
            radarr = new { available = Has(cfg.RadarrUrl, cfg.RadarrApiKey) },
            sonarr = new { available = Has(cfg.SonarrUrl, cfg.SonarrApiKey) }
        });
    }

    private static bool Has(string url, string key) =>
        !string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(key);
}
