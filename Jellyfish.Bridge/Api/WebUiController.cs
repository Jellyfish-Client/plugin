using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfish.Bridge.Api;

/// <summary>
/// Serves static web UI assets injected into jellyfin-web via the
/// <c>jellyfin-plugin-file-transformation</c> plugin. The injected
/// <c>&lt;script&gt;</c> tag points at <c>/jellyfish/ui/home.js</c>, which is
/// fetched by the browser before the user authenticates, so the controller
/// must be anonymous-friendly.
/// </summary>
[ApiController]
[Route("jellyfish/ui")]
[AllowAnonymous]
public class WebUiController : ControllerBase
{
    [HttpGet("{name:regex(^[[a-z0-9]][[a-z0-9-]]*\\.js$)}")]
    [Produces("application/javascript")]
    public IActionResult Script(string name)
    {
        // The regex constraint guarantees `name` is a safe lowercase
        // alphanumeric-with-dashes filename ending in `.js` — no path
        // traversal, no separators.
        var resourceName = "Jellyfish.Bridge.Web." + name;
        var stream = typeof(Plugin).Assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers["Cache-Control"] = "public, max-age=300";
        return File(stream, "application/javascript");
    }
}
