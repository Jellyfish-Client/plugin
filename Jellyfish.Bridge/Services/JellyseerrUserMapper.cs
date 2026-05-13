using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Services;

public sealed class JellyseerrUserMapper : IJellyseerrUserMapper
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly IUpstreamHttpClient _http;
    private readonly ILogger<JellyseerrUserMapper> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private Dictionary<Guid, int> _map = new();
    private DateTimeOffset _loadedAt = DateTimeOffset.MinValue;

    public JellyseerrUserMapper(IUpstreamHttpClient http, ILogger<JellyseerrUserMapper> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<int?> MapAsync(Guid jellyfinUserId, CancellationToken ct)
    {
        if (TryLookup(jellyfinUserId, out var hit)) return hit;
        await RefreshAsync(ct).ConfigureAwait(false);
        return TryLookup(jellyfinUserId, out var fresh) ? fresh : null;
    }

    public void Invalidate()
    {
        _loadedAt = DateTimeOffset.MinValue;
    }

    private bool TryLookup(Guid jfId, out int seerId)
    {
        var fresh = DateTimeOffset.UtcNow - _loadedAt < CacheTtl;
        if (fresh && _map.TryGetValue(jfId, out seerId)) return true;
        seerId = 0;
        return false;
    }

    private async Task RefreshAsync(CancellationToken ct)
    {
        await _refreshLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            // Re-check inside the lock — another caller may have refreshed while we waited.
            if (DateTimeOffset.UtcNow - _loadedAt < CacheTtl && _map.Count > 0) return;

            using var http = _http.ForJellyseerr();
            using var res = await http.GetAsync("api/v1/user?take=1000&skip=0", ct).ConfigureAwait(false);
            res.EnsureSuccessStatusCode();

            await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);

            var next = new Dictionary<Guid, int>();
            if (doc.RootElement.TryGetProperty("results", out var results) &&
                results.ValueKind == JsonValueKind.Array)
            {
                foreach (var u in results.EnumerateArray())
                {
                    if (!u.TryGetProperty("id", out var idEl) || idEl.ValueKind != JsonValueKind.Number) continue;
                    if (!u.TryGetProperty("jellyfinUserId", out var jfEl) ||
                        jfEl.ValueKind != JsonValueKind.String) continue;

                    var raw = jfEl.GetString();
                    if (!Guid.TryParse(raw, out var jfId)) continue;
                    next[jfId] = idEl.GetInt32();
                }
            }

            _map = next;
            _loadedAt = DateTimeOffset.UtcNow;
            _logger.LogInformation("JellyseerrUserMapper refreshed: {Count} mappings", next.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh JellyseerrUserMapper");
            throw;
        }
        finally
        {
            _refreshLock.Release();
        }
    }
}
