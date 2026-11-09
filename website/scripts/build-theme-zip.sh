#!/usr/bin/env bash
# Packs the theme into website/dist/nota-app-theme.zip, ready for
# Appearance, Themes, Add Theme, Upload Theme. The zip holds one folder, nota-app/.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
out="$root/website/dist"
mkdir -p "$out"
rm -f "$out/nota-app-theme.zip"

cd "$root/website/wordpress-theme"
zip -r -X -q "$out/nota-app-theme.zip" nota-app -x '*.DS_Store' -x '*/.*'

ls -lh "$out/nota-app-theme.zip"
