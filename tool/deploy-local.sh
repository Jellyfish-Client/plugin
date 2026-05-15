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

echo "==> Installing into $PLUGIN_DIR"
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
unzip -q -o "build/${NAME}_${VERSION}.zip" -d "$PLUGIN_DIR"

if docker ps --format '{{.Names}}' | grep -q '^jellyfin$'; then
  echo "==> Restarting Jellyfin container"
  docker restart jellyfin > /dev/null
  echo "==> Done. http://localhost:8096"
  echo "    Tail logs:  docker logs -f jellyfin"
else
  echo "==> Plugin installed but Jellyfin container is not running."
  echo "    Start it with:  docker compose up -d"
fi
