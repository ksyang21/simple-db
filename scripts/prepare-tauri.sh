#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI="$ROOT/src-tauri"
ARCH="$(uname -m)"
NODE_VERSION="20.18.3"

if [ "$ARCH" = "arm64" ]; then
  TARGET="aarch64-apple-darwin"
  NODE_ARCH="arm64"
else
  TARGET="x86_64-apple-darwin"
  NODE_ARCH="x64"
fi

echo "Preparing Tauri bundle resources..."

rm -rf "$TAURI/resources/app-server"
mkdir -p "$TAURI/resources/app-server/dist"
cp -r "$ROOT/server/dist/"* "$TAURI/resources/app-server/dist/"
cp "$ROOT/server/package.json" "$TAURI/resources/app-server/"

echo "Installing server production dependencies..."
(cd "$TAURI/resources/app-server" && npm install --omit=dev --no-package-lock --ignore-scripts=false)

rm -rf "$TAURI/resources/client"
cp -r "$ROOT/client/dist" "$TAURI/resources/client"

mkdir -p "$TAURI/binaries"
SIDECAR="$TAURI/binaries/node-$TARGET"
rm -f "$SIDECAR"

echo "Downloading official Node.js v${NODE_VERSION} for macOS ${NODE_ARCH}..."
TMP_DIR="$(mktemp -d)"
curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz" \
  | tar xz -C "$TMP_DIR"
cp "$TMP_DIR/node-v${NODE_VERSION}-darwin-${NODE_ARCH}/bin/node" "$SIDECAR"
rm -rf "$TMP_DIR"

chmod +x "$SIDECAR"
echo "Prepared node sidecar: node-$TARGET"
