using System.Net.Http.Headers;
using Jellyfish.Bridge.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Services;

/// <summary>
/// Thin wrapper around <see cref="IHttpClientFactory"/> that builds an <see cref="HttpClient"/>
/// pre-configured for one of the three upstreams (Jellyseerr / Radarr / Sonarr).
/// </summary>
public interface IUpstreamHttpClient
{
    HttpClient ForJellyseerr();
    HttpClient ForRadarr();
    HttpClient ForSonarr();

    /// <summary>Build a one-off client with caller-supplied url + key (used by the admin "test" endpoints).</summary>
    HttpClient ForAdHoc(string baseUrl, string apiKey, int timeoutSeconds);
}

public sealed class UpstreamHttpClient : IUpstreamHttpClient
{
    private const string ApiKeyHeader = "X-Api-Key";

    private readonly IHttpClientFactory _factory;
    private readonly ILogger<UpstreamHttpClient> _logger;

    public UpstreamHttpClient(IHttpClientFactory factory, ILogger<UpstreamHttpClient> logger)
    {
        _factory = factory;
        _logger = logger;
    }

    public HttpClient ForJellyseerr() => Build(Cfg().JellyseerrUrl, Cfg().JellyseerrApiKey, Cfg().UpstreamTimeoutSeconds);
    public HttpClient ForRadarr() => Build(Cfg().RadarrUrl, Cfg().RadarrApiKey, Cfg().UpstreamTimeoutSeconds);
    public HttpClient ForSonarr() => Build(Cfg().SonarrUrl, Cfg().SonarrApiKey, Cfg().UpstreamTimeoutSeconds);

    public HttpClient ForAdHoc(string baseUrl, string apiKey, int timeoutSeconds) =>
        Build(baseUrl, apiKey, timeoutSeconds);

    private static PluginConfiguration Cfg() =>
        Plugin.Instance?.Configuration ?? new PluginConfiguration();

    private HttpClient Build(string baseUrl, string apiKey, int timeoutSeconds)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException("Upstream URL is not configured.");
        }

        var client = _factory.CreateClient("Jellyfish.Bridge.Upstream");
        client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromSeconds(Math.Max(1, timeoutSeconds));
        client.DefaultRequestHeaders.Accept.Clear();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            client.DefaultRequestHeaders.Remove(ApiKeyHeader);
            client.DefaultRequestHeaders.Add(ApiKeyHeader, apiKey);
        }
        return client;
    }
}
