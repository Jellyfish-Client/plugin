using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfish.Bridge.Services;

/// <summary>
/// Helpers to forward an HTTP request to an upstream and stream the response
/// back to the original Jellyfin caller. Keeps controllers concise.
/// </summary>
public static class UpstreamProxy
{
    /// <summary>
    /// Forward an HTTP request and copy the response body back as a stream,
    /// preserving status code and content-type.
    /// </summary>
    public static async Task<IActionResult> ForwardAsync(
        HttpClient http,
        HttpMethod method,
        string relativePath,
        HttpContent? body,
        CancellationToken ct,
        ILogger? logger = null)
    {
        using var req = new HttpRequestMessage(method, relativePath) { Content = body };
        try
        {
            using var res = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
            var bytes = await res.Content.ReadAsByteArrayAsync(ct).ConfigureAwait(false);
            var contentType = res.Content.Headers.ContentType?.ToString() ?? "application/json";
            return new FileContentResult(bytes, contentType) { /* status set below */ }
                .WithStatus((int)res.StatusCode);
        }
        catch (HttpRequestException ex)
        {
            logger?.LogWarning(ex, "Upstream call failed: {Method} {Path}", method, relativePath);
            return new ObjectResult(new { error = "upstream_unreachable", detail = ex.Message })
            {
                StatusCode = StatusCodes.Status502BadGateway
            };
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            logger?.LogWarning(ex, "Upstream call timed out: {Method} {Path}", method, relativePath);
            return new ObjectResult(new { error = "upstream_timeout" })
            {
                StatusCode = StatusCodes.Status504GatewayTimeout
            };
        }
    }

    public static HttpContent JsonBody(object payload) =>
        new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    // We need an IActionResult that lets us specify a status code AND a raw byte body.
    // FileContentResult doesn't expose StatusCode directly via constructor, so we wrap it.
    private static IActionResult WithStatus(this FileContentResult result, int status)
        => new StatusedFileContentResult(result.FileContents, result.ContentType, status);

    private sealed class StatusedFileContentResult : ActionResult
    {
        private readonly byte[] _content;
        private readonly string _contentType;
        private readonly int _status;

        public StatusedFileContentResult(byte[] content, string contentType, int status)
        {
            _content = content;
            _contentType = contentType;
            _status = status;
        }

        public override async Task ExecuteResultAsync(ActionContext context)
        {
            var response = context.HttpContext.Response;
            response.StatusCode = _status;
            response.ContentType = _contentType;
            response.ContentLength = _content.Length;
            await response.Body.WriteAsync(_content, context.HttpContext.RequestAborted).ConfigureAwait(false);
        }
    }
}
