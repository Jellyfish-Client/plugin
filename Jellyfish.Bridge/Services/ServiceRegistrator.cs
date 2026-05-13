using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfish.Bridge.Services;

public class ServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddHttpClient();
        serviceCollection.AddSingleton<IUpstreamHttpClient, UpstreamHttpClient>();
        serviceCollection.AddSingleton<IJellyseerrUserMapper, JellyseerrUserMapper>();
    }
}
