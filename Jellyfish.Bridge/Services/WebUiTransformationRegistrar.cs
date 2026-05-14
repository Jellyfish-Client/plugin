using System.Runtime.Loader;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfish.Bridge.Services;

/// <summary>
/// One-shot startup hook that registers the Bridge's web UI transformations
/// with the <c>jellyfin-plugin-file-transformation</c> plugin once Jellyfin has
/// finished loading every plugin assembly. Implemented as an
/// <see cref="IScheduledTask"/> with a startup trigger because Jellyfin
/// auto-discovers scheduled tasks and only fires them after the plugin
/// graph is fully composed — which is exactly when reflection against the
/// FileTransformation assembly is safe.
///
/// Failure to find the FileTransformation plugin is non-fatal: we log a
/// warning and return successfully so the rest of the Bridge keeps working.
/// </summary>
public class WebUiTransformationRegistrar : IScheduledTask
{
    // Generated 2026-05-14 — stable identifier persisted on the
    // FileTransformation side so re-registration is idempotent across restarts.
    private static readonly Guid TransformationId = Guid.Parse("4C8CFDF4-D822-488C-9404-032AE8D7E05B");

    private readonly ILogger<WebUiTransformationRegistrar> _logger;

    public WebUiTransformationRegistrar(ILogger<WebUiTransformationRegistrar> logger)
    {
        _logger = logger;
    }

    public string Name => "Jellyfish Bridge WebUI Startup";

    public string Key => "Jellyfish.Bridge.WebUiTransformationRegistrar";

    public string Description => "Registers Jellyfish Bridge web UI transformations with the FileTransformation plugin.";

    public string Category => "Startup Services";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        try
        {
            var payload = new JObject
            {
                ["id"] = TransformationId.ToString(),
                ["fileNamePattern"] = "index.html",
                ["callbackAssembly"] = typeof(WebUiTransformationCallback).Assembly.FullName,
                ["callbackClass"] = typeof(WebUiTransformationCallback).FullName,
                ["callbackMethod"] = nameof(WebUiTransformationCallback.InjectHomeScript)
            };

            var ftAssembly = AssemblyLoadContext.All
                .SelectMany(x => x.Assemblies)
                .FirstOrDefault(x => x.FullName?.Contains(".FileTransformation", StringComparison.Ordinal) ?? false);

            if (ftAssembly is null)
            {
                _logger.LogWarning(
                    "FileTransformation plugin assembly not found — skipping web UI transformation registration. Install jellyfin-plugin-file-transformation to enable injected scripts.");
                return Task.CompletedTask;
            }

            var pluginInterface = ftAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
            if (pluginInterface is null)
            {
                _logger.LogWarning(
                    "FileTransformation assembly {Assembly} is loaded but does not expose Jellyfin.Plugin.FileTransformation.PluginInterface — incompatible version?",
                    ftAssembly.FullName);
                return Task.CompletedTask;
            }

            var register = pluginInterface.GetMethod("RegisterTransformation");
            if (register is null)
            {
                _logger.LogWarning(
                    "FileTransformation PluginInterface is missing RegisterTransformation — incompatible version?");
                return Task.CompletedTask;
            }

            register.Invoke(null, new object?[] { payload });
            _logger.LogInformation(
                "Registered web UI transformation {TransformationId} for index.html with FileTransformation.",
                TransformationId);
        }
        catch (Exception ex)
        {
            // Never let a startup hook fault the task scheduler.
            _logger.LogError(ex, "Failed to register web UI transformation with FileTransformation plugin.");
        }

        return Task.CompletedTask;
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
        => new[] { new TaskTriggerInfo { Type = TaskTriggerInfoType.StartupTrigger } };
}
