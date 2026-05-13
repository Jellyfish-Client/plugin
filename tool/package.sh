#!/usr/bin/env bash
# Build + package Jellyfish.Bridge into a Jellyfin-installable zip.
#
# Output: build/Jellyfish.Bridge_<version>.zip containing:
#   - Jellyfish.Bridge.dll
#   - meta.json
#
# Usage:
#   tool/package.sh                # uses version from build.yaml
#   tool/package.sh 0.2.0.0        # override version

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAME="Jellyfish.Bridge"
GUID="93b3913f-bb53-4120-94a5-1b10e4280f50"
TARGET_ABI="10.11.0.0"
CATEGORY="General"
OWNER="lolo"
DESCRIPTION="Bridge between Jellyfin and Jellyseerr / Radarr / Sonarr for the Jellyfish mobile app."

VERSION="${1:-$(awk -F'["[:space:]]+' '/^version:/ {print $2; exit}' Jellyfish.Bridge/build.yaml)}"
if [[ -z "$VERSION" ]]; then
  echo "ERROR: could not determine version; pass it as the first argument or set it in build.yaml" >&2
  exit 1
fi

STAGE="$ROOT/build/stage"
OUT="$ROOT/build/${NAME}_${VERSION}.zip"

echo "==> Cleaning build/"
rm -rf "$ROOT/build"
mkdir -p "$STAGE"

echo "==> dotnet publish ($NAME @ $VERSION)"
dotnet publish "$ROOT/$NAME/$NAME.csproj" \
  -c Release \
  -f net9.0 \
  --nologo \
  -p:DebugType=embedded \
  -o "$STAGE" \
  > /dev/null

# Trim publish output to just our dll. Jellyfin's "assemblies" allowlist below
# only loads what we name; extras would be ignored at runtime but bloat the zip.
find "$STAGE" -type f ! -name "$NAME.dll" -delete
find "$STAGE" -type d -empty -delete

CHECKSUM=$(md5 -q "$STAGE/$NAME.dll" 2>/dev/null || md5sum "$STAGE/$NAME.dll" | awk '{print $1}')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "==> Writing meta.json"
cat > "$STAGE/meta.json" <<EOF
{
  "category": "$CATEGORY",
  "changelog": "Initial release.",
  "description": "$DESCRIPTION",
  "guid": "$GUID",
  "name": "$NAME",
  "overview": "Bridge for Jellyseerr / Radarr / Sonarr behind Jellyfin auth.",
  "owner": "$OWNER",
  "targetAbi": "$TARGET_ABI",
  "timestamp": "$TIMESTAMP",
  "version": "$VERSION",
  "status": "Active",
  "autoUpdate": true,
  "assemblies": ["$NAME.dll"]
}
EOF

echo "==> Zipping → $OUT"
(cd "$STAGE" && zip -q -r "$OUT" .)

echo
echo "Done."
echo "  zip:      $OUT"
echo "  checksum: $CHECKSUM"
echo
echo "Install on Jellyfin:"
echo "  1. Unzip into:  <jellyfin-config>/plugins/${NAME}_${VERSION}/"
echo "  2. Restart Jellyfin"
echo "  3. Dashboard → Plugins → ${NAME} → fill in URLs + API keys → Save"
