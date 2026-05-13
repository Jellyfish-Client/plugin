using System.Security.Claims;

namespace Jellyfish.Bridge.Services;

/// <summary>
/// Re-implements <c>Jellyfin.Api.Extensions.ClaimsPrincipalExtensions</c> for
/// plugins: that class lives in the host's <c>Jellyfin.Api</c> assembly, which
/// is not shipped as a NuGet package, so we read the same claim types
/// (<see cref="InternalClaimTypes"/>) ourselves.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(InternalClaimTypes.UserId);
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    public static bool IsAdministrator(this ClaimsPrincipal user)
        => user.IsInRole(UserRoles.Administrator);
}

internal static class InternalClaimTypes
{
    public const string UserId = "Jellyfin-UserId";
    public const string DeviceId = "Jellyfin-DeviceId";
    public const string Token = "Jellyfin-Token";
    public const string IsApiKey = "Jellyfin-IsApiKey";
}

internal static class UserRoles
{
    public const string Administrator = "Administrator";
    public const string User = "User";
    public const string Guest = "Guest";
}
