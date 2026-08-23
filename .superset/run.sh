#!/bin/sh
# UNIQUE Hands run — noesis · raycast
set -eu
WS="${SUPERSET_WORKSPACE_PATH:-.}"
cd "$WS"
echo "superset-run: noesis · raycast"
exec npm run dev
