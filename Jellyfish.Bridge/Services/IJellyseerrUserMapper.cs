namespace Jellyfish.Bridge.Services;

public interface IJellyseerrUserMapper
{
    /// <summary>
    /// Resolve a Jellyfin user id to the matching Jellyseerr user id, or null
    /// if no Jellyseerr account has linked that Jellyfin user.
    /// </summary>
    Task<int?> MapAsync(Guid jellyfinUserId, CancellationToken ct);

    /// <summary>Invalidate the in-memory cache (e.g. after admin config changes).</summary>
    void Invalidate();
}
