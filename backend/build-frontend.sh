#!/usr/bin/env bash
set -euo pipefail

# Portable Flutter frontend build script for Tauri

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FLUTTER_PROJECT_DIR="${FLUTTER_PROJECT_DIR:-$PROJECT_ROOT/flutter_app}"
FLUTTER_DIST_DIR="${FLUTTER_DIST_DIR:-$BACKEND_DIR/target/flutter-dist}"

case "${FLUTTER_BUILD_TARGET:-}" in
  "")
    # Use host OS when not explicitly set so CI can pick the right desktop target.
    UNAME_OUT="$(uname -s 2>/dev/null || echo unknown)"
    case "$UNAME_OUT" in
      Linux*)   FLUTTER_BUILD_TARGET="linux" ;;
      Darwin*)  FLUTTER_BUILD_TARGET="macos" ;;
      MINGW*|MSYS*|CYGWIN*) FLUTTER_BUILD_TARGET="windows" ;;
      *)        FLUTTER_BUILD_TARGET="web" ;;
    esac
    ;;
  *)
    FLUTTER_BUILD_TARGET="$FLUTTER_BUILD_TARGET"
    ;;
esac

if ! command -v flutter >/dev/null 2>&1; then
  echo "Error: Flutter SDK is not available on PATH. Install Flutter or add it to PATH before building." >&2
  exit 1
fi

if [ ! -f "$FLUTTER_PROJECT_DIR/pubspec.yaml" ]; then
  echo "Error: Could not find Flutter project (missing pubspec.yaml) at $FLUTTER_PROJECT_DIR" >&2
  echo "Set FLUTTER_PROJECT_DIR to the directory containing your Flutter app." >&2
  exit 1
fi

echo "Using Flutter project: $FLUTTER_PROJECT_DIR"
echo "Primary Flutter build target: $FLUTTER_BUILD_TARGET"

IFS=' ' read -r -a EXTRA_ARGS <<< "${FLUTTER_BUILD_ARGS:-}"

pushd "$FLUTTER_PROJECT_DIR" >/dev/null
flutter pub get
flutter build "$FLUTTER_BUILD_TARGET" "${EXTRA_ARGS[@]}"

if [ "$FLUTTER_BUILD_TARGET" != "web" ]; then
  echo "Building Flutter web bundle for Tauri assets..."
  flutter build web "${EXTRA_ARGS[@]}"
fi
popd >/dev/null

WEB_DIST="$FLUTTER_PROJECT_DIR/build/web"
if [ ! -d "$WEB_DIST" ]; then
  echo "Error: Flutter web bundle not found at $WEB_DIST" >&2
  exit 1
fi

echo "Copying Flutter web assets to $FLUTTER_DIST_DIR"
rm -rf "$FLUTTER_DIST_DIR"
mkdir -p "$FLUTTER_DIST_DIR"
cp -a "$WEB_DIST/." "$FLUTTER_DIST_DIR/"

echo "Flutter assets ready at: $FLUTTER_DIST_DIR"
