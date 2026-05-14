#!/usr/bin/env bash
# One-shot: build → package → drop into ./.dev/config/plugins → restart Jellyfin.
#
# Assumes you started Jellyfin via the docker-compose.yml in this repo.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAME="Jellyfish.Bridge"
VERSION=$(awk -F'["[:space:]]+' '/^version:/ {print $2; exit}' "$NAME/build.yaml")
PLUGIN_DIR=".dev/config/plugins/${NAME}_${VERSION}"

echo "==> Packaging"
"$ROOT/tool/package.sh" "$VERSION" > /dev/null

# Stop Jellyfin BEFORE swapping the plugin folder. If we rm -rf the install
# directory while Jellyfin is running, it marks the plugin as missing in its
# in-memory plugin manager and won't reload it after restart.
JF_WAS_RUNNING=0
if docker ps --format '{{.Names}}' | grep -q '^jellyfin$'; then
  JF_WAS_RUNNING=1
  echo "==> Stopping Jellyfin container"
  docker stop jellyfin > /dev/null
fi

echo "==> Installing into $PLUGIN_DIR"
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
unzip -q -o "build/${NAME}_${VERSION}.zip" -d "$PLUGIN_DIR"

if [[ "$JF_WAS_RUNNING" == "1" ]]; then
  echo "==> Starting Jellyfin container"
  docker start jellyfin > /dev/null
  echo "==> Done. http://localhost:8096"
  echo "    Tail logs:  docker logs -f jellyfin"
else
  echo "==> Plugin installed but Jellyfin container is not running."
  echo "    Start it with:  docker compose up -d"
fi
