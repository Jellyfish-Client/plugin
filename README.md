# Jellyfish Bridge

Jellyfin server plugin that bridges **Jellyseerr**, **Radarr** and **Sonarr** behind Jellyfin authentication. Built for the [Jellyfish](https://github.com/lolo/jellyfish) Flutter mobile client so end users never have to configure a second login.

- Admin enters the upstream URLs + API keys **once** in the Jellyfin Dashboard → Plugins → Jellyfish Bridge
- Mobile users only authenticate against Jellyfin; the plugin proxies every Seer/Radarr/Sonarr call server-side
- Jellyseerr requests are attributed to the matching Seer user via `jellyfinUserId` mapping (no shared admin attribution)
- Radarr/Sonarr present a shared view; mutating endpoints (queue delete, …) require an admin Jellyfin user

## Status

Pre-release scaffold. Targets Jellyfin **10.10.x** / .NET **8.0**.

## Build

```sh
dotnet build -c Release
```

Produces `Jellyfish.Bridge/bin/Release/net8.0/Jellyfish.Bridge.dll`.

## Package for installation

```sh
tool/package.sh              # uses version from build.yaml
tool/package.sh 0.2.0.0      # override version
```

Produces `build/Jellyfish.Bridge_<version>.zip` containing `Jellyfish.Bridge.dll` + `meta.json`.

---

## Install on Jellyfin

### Path A — Manual install (fastest, for your own server)

1. **Locate your Jellyfin config directory:**

   | Platform | Path |
   |---|---|
   | Linux (deb/rpm) | `/var/lib/jellyfin/plugins/` |
   | Linux (Docker official image) | `<host volume mapped to /config>/plugins/` |
   | macOS | `~/.local/share/jellyfin/plugins/` |
   | Windows (service) | `C:\ProgramData\Jellyfin\Server\plugins\` |
   | Windows (portable) | `<install>\plugins\` |

2. **Create the plugin folder** named `Jellyfish.Bridge_<version>` and unzip into it:

   ```sh
   PLUGIN_DIR=/var/lib/jellyfin/plugins/Jellyfish.Bridge_0.1.0.0
   sudo mkdir -p "$PLUGIN_DIR"
   sudo unzip build/Jellyfish.Bridge_0.1.0.0.zip -d "$PLUGIN_DIR"
   sudo chown -R jellyfin:jellyfin "$PLUGIN_DIR"   # if running as the jellyfin user
   ```

   For Docker, mount the zip's contents into the plugins volume — for example:
   ```sh
   docker cp build/Jellyfish.Bridge_0.1.0.0.zip jellyfin:/tmp/bridge.zip
   docker exec jellyfin sh -c 'mkdir -p /config/plugins/Jellyfish.Bridge_0.1.0.0 && \
     unzip -o /tmp/bridge.zip -d /config/plugins/Jellyfish.Bridge_0.1.0.0'
   ```

3. **Restart Jellyfin**:
   ```sh
   sudo systemctl restart jellyfin           # Linux service
   docker restart jellyfin                   # Docker
   ```

4. **Verify**: open Jellyfin → Dashboard → Plugins → you should see "Jellyfish.Bridge" with status **Active**. If it shows **NotSupported**, the `targetAbi` in `meta.json` is incompatible with your Jellyfin server version (need ≥ 10.10.0.0). Check `/var/log/jellyfin/log_*.log` (or `docker logs jellyfin`) for load errors.

5. **Configure**: Plugins → Jellyfish.Bridge → enter Seer / Radarr / Sonarr URLs and API keys → Save.

6. **Smoke-test** from any Jellyfin user:
   ```sh
   TOKEN="<your-jellyfin-access-token>"     # from the user profile or device list
   HOST="http://localhost:8096"
   curl -s -H "Authorization: MediaBrowser Token=\"$TOKEN\"" \
        "$HOST/Plugins/Jellyfish/services" | jq
   # → { "seer": { "available": true }, "radarr": { "available": true }, "sonarr": { "available": false } }
   ```

### Path B — Repository (for distribution)

Once you want others to install via the Jellyfin UI ("Add Repository"), publish a `manifest.json` over HTTPS that points to your release zips. Workflow:

1. Push a tag `v0.1.0.0` → GitHub Action builds + uploads the zip as a release asset.
2. Same action regenerates `manifest.json` and pushes it to `gh-pages`.
3. Admins add `https://<your-user>.github.io/jellyfish-plugin/manifest.json` in Jellyfin → Dashboard → Plugins → Repositories → Add. The plugin then appears in the Catalog.

The `.github/workflows/release.yml` provided below uses [`jprm`](https://github.com/oddstr13/jellyfin-plugin-repository-manager) (the canonical packaging tool) to handle zip + manifest generation.

---

## Endpoints (require Jellyfin auth)

### Discovery
- `GET /Plugins/Jellyfish/services` — which upstreams the admin has configured

### Seer
- `GET  /Plugins/Jellyfish/seer/{trending,search,discover/movies,discover/tv,movie/{id},tv/{id},collection/{id}}`
- `GET  /Plugins/Jellyfish/seer/request` — caller's own requests only
- `POST /Plugins/Jellyfish/seer/request` — creates a request attributed to the caller
- `DELETE /Plugins/Jellyfish/seer/request/{id}` — caller's own request (or any if admin)

### Radarr / Sonarr
- `GET  …/system/status`
- `GET  …/movie | series | episode`
- `GET  …/queue | history | calendar`
- `DELETE …/queue/{id}` — **admin only**

## Security

API keys are serialised by Jellyfin into `<jellyfin-config>/plugins/configurations/Jellyfish.Bridge.xml` in plain text. Protect filesystem permissions on that file. All plugin endpoints require a valid Jellyfin auth token (`[Authorize]`).

## Caveats / known limitations

- The Seer "act-as user" mechanism relies on Jellyseerr accepting an `userId` override when authenticated as admin. Tested-on / known-good Jellyseerr versions TBD.
- Jellyfin users without a matching Jellyseerr account get a clean 403 on user-attributed Seer endpoints. Make sure Jellyseerr has imported your Jellyfin users (Jellyseerr → Settings → Jellyfin → Sync).
- No Seer webhook notifications surfaced to mobile in v0.1.
