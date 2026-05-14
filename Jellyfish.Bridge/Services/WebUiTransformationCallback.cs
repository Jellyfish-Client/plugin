namespace Jellyfish.Bridge.Services;

/// <summary>
/// Payload deserialized by jellyfin-plugin-file-transformation when invoking
/// <see cref="WebUiTransformationCallback.InjectHomeScript"/>. Only the
/// <see cref="Contents"/> field is currently consumed.
/// </summary>
public sealed class WebUiTransformPayload
{
    public string? Contents { get; set; }
}

/// <summary>
/// Static callback invoked by jellyfin-plugin-file-transformation for every
/// <c>index.html</c> served by Jellyfin. The signature
/// (<c>public static string Method(PayloadType)</c>) is dictated by the
/// transformation plugin's reflection-based dispatcher and must not change.
/// The callback must never throw — the transformation plugin does not catch.
/// </summary>
public static class WebUiTransformationCallback
{
    private const string ScriptTag = "<script type=\"module\" src=\"/jellyfish/ui/home.js\"></script>";

    public static string InjectHomeScript(WebUiTransformPayload payload)
    {
        if (payload is null)
        {
            return string.Empty;
        }

        var contents = payload.Contents;
        if (string.IsNullOrEmpty(contents))
        {
            return contents ?? string.Empty;
        }

        // Idempotent — multiple passes (e.g. transformation reloads) won't
        // duplicate the tag.
        if (contents.Contains(ScriptTag, StringComparison.Ordinal))
        {
            return contents;
        }

        var idx = contents.IndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
        {
            return contents;
        }

        return contents.Insert(idx, ScriptTag);
    }
}
