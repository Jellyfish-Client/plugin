using MediaBrowser.Model.Plugins;

namespace Jellyfish.Bridge.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public string JellyseerrUrl { get; set; } = string.Empty;
    public string JellyseerrApiKey { get; set; } = string.Empty;

    public string RadarrUrl { get; set; } = string.Empty;
    public string RadarrApiKey { get; set; } = string.Empty;

    public string SonarrUrl { get; set; } = string.Empty;
    public string SonarrApiKey { get; set; } = string.Empty;

    public int UpstreamTimeoutSeconds { get; set; } = 20;
}
