# Jellyfish Bridge

Jellyfin server plugin that bridges **Jellyseerr**, **Radarr** and **Sonarr** behind Jellyfin authentication. Built for the [Jellyfish](https://github.com/Jellyfish-Client) Flutter mobile client so end users never have to configure a second login.

- Admin enters the upstream URLs + API keys **once** in the Jellyfin Dashboard → Plugins → Jellyfish Bridge
- Mobile users only authenticate against Jellyfin; the plugin proxies every Jellyseerr / Radarr / Sonarr call server-side
- Jellyseerr requests are attributed to the matching Jellyseerr user via `jellyfinUserId` mapping (no shared admin attribution)
- Radarr / Sonarr present a shared view; mutating endpoints (queue delete, …) require an admin Jellyfin user

Targets Jellyfin **10.11.x** / .NET **9.0**.

---

## Install on Jellyfin

### Recommended — via the plugin repository

This is the same flow as installing an official Jellyfin plugin.

1. Open your Jellyfin web UI → **Dashboard** → **Plugins** → **Repositories** tab → **+**.
2. Fill in:
   - **Repository Name** : `Jellyfish-Client`
   - **Repository URL** : `https://jellyfish-client.github.io/plugin/manifest.json`
3. Click **Save**, accept the security warning.
4. Switch to the **Catalog** tab → find **Jellyfish Bridge** → click it → **Install**.
5. **Restart Jellyfin** when prompted.
6. After restart : **Dashboard** → **Plugins** → click **Jellyfish Bridge** → fill in Jellyseerr / Radarr / Sonarr URLs + API keys → use the three **Test** buttons to validate each upstream → **Save**.

Updates auto-appear in the catalog when a new release is tagged.

### Alternative — manual install (dev / air-gapped)

Use this only if your Jellyfin host cannot reach the public manifest.

1. Grab the latest zip from the [Releases page](https://github.com/Jellyfish-Client/plugin/releases).
2. Locate your Jellyfin plugin directory :

   | Platform | Path |
   |---|---|
   | Linux (deb/rpm) | `/var/lib/jellyfin/plugins/` |
   | Linux (Docker official image) | `<host volume mounted to /config>/plugins/` |
   | macOS | `~/.local/share/jellyfin/plugins/` |
   | Windows (service) | `C:\ProgramData\Jellyfin\Server\plugins\` |

3. Create a sub-folder named `Jellyfish.Bridge_<version>/` and unzip the contents into it. Example for Docker :

   ```sh
   docker cp jellyfish-bridge_0.1.0.1.zip jellyfin:/tmp/bridge.zip
   docker exec jellyfin sh -c \
     'mkdir -p /config/plugins/Jellyfish.Bridge_0.1.0.1 && \
      unzip -o /tmp/bridge.zip -d /config/plugins/Jellyfish.Bridge_0.1.0.1'
   docker restart jellyfin
   ```

4. Continue with step 6 of the "Recommended" path above to configure the plugin.

### Smoke-test

```sh
TOKEN="<jellyfin api key — Dashboard → Advanced → API Keys>"
curl -s -H "Authorization: MediaBrowser Token=\"$TOKEN\"" \
     http://localhost:8096/jellyfish/services | jq
# → { "jellyseerr":{"available":true},
#     "radarr":   {"available":true},
#     "sonarr":   {"available":true} }
```

If the plugin shows up in Jellyfin as **NotSupported**, you're on a Jellyfin server older than 10.11 — there isn't a 10.10 build of this plugin yet.

---

## Endpoints (require Jellyfin auth)

### Discovery
- `GET /jellyfish/services` — which upstreams the admin has configured

### Jellyseerr
- `GET    /jellyfish/jellyseerr/trending|search|discover/{movies,tv}|movie/{id}|tv/{id}|collection/{id}`
- `GET    /jellyfish/jellyseerr/request` — caller's own requests only
- `POST   /jellyfish/jellyseerr/request` — creates a request attributed to the caller
- `DELETE /jellyfish/jellyseerr/request/{id}` — caller's own request (or any if admin)

### Radarr / Sonarr
- `GET    …/system/status`
- `GET    …/movie | series | episode`
- `GET    …/queue | history | calendar`
- `DELETE …/queue/{id}` — **admin only**

### Aggregated
- `GET /jellyfish/upcoming?days=30&kinds=movies,episodes&onlyMissing=true&limit=50`
  Combined Radarr + Sonarr upcoming feed, sorted by release date.

---

## For developers

### Build locally

```sh
dotnet build -c Release
# → Jellyfish.Bridge/bin/Release/net9.0/Jellyfish.Bridge.dll
```

### Package a zip (for manual install)

```sh
tool/package.sh              # uses version from build.yaml
tool/package.sh 0.2.0.0      # override version
# → build/Jellyfish.Bridge_<version>.zip
```

### One-shot local deploy

A `docker-compose.yml` starts Jellyfin with a bind-mounted plugin folder so iteration is fast :

```sh
docker compose up -d         # http://localhost:8096
tool/deploy-local.sh         # build → package → drop into ./.dev/config/plugins → restart
```

### Cutting a release

```sh
git tag v0.1.2.0
git push origin v0.1.2.0
```

That triggers `.github/workflows/release.yml`, which uses [`jprm`](https://github.com/oddstr13/jellyfin-plugin-repository-manager) to publish a GitHub Release and append the new version to `gh-pages/manifest.json` — installs via the catalog auto-upgrade.

---

## Security

API keys are serialised by Jellyfin into `<jellyfin-config>/plugins/configurations/Jellyfish.Bridge.xml` in **plain text**. Restrict filesystem permissions on that path. All plugin endpoints require a valid Jellyfin auth token (`[Authorize]`); admin-only mutations also check `User.IsAdministrator()`.

## Known limitations

- Jellyfin users without a matching Jellyseerr account get a clean `403 no_jellyseerr_account` on user-attributed Jellyseerr endpoints. Make sure Jellyseerr has imported your users (Jellyseerr → Settings → Jellyfin → **Import Jellyfin Users**, or any once-only "Sign in with Jellyfin" flow).
- No webhook notifications surfaced to mobile in v0.1.
- The Jellyseerr "act-as user" mechanism relies on the upstream accepting a `userId` override when authenticated with `X-Api-Key`. Validated against current Jellyseerr — Seerr fork compatibility tracked in issues.
