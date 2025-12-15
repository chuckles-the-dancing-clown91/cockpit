#!/usr/bin/env bash
set -euo pipefail

# Quick Package Script - Copies Tauri-built packages to dist/
# For full builds, use: cd backend && cargo tauri build

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Auto-extract version from Cargo.toml
VERSION=$(grep '^version = ' "$ROOT_DIR/backend/Cargo.toml" | head -n1 | sed 's/version = "\(.*\)"/\1/')
ARCH="amd64"
TAURI_BUNDLE_DIR="$ROOT_DIR/build/target/release/bundle"
DIST_DIR="$ROOT_DIR/dist"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}==>${NC} Cockpit Quick Package (v${VERSION})"
echo ""

# Check if Tauri bundles exist
if [ ! -d "$TAURI_BUNDLE_DIR" ]; then
    echo -e "${YELLOW}⚠${NC} No Tauri bundles found at: $TAURI_BUNDLE_DIR"
    echo ""
    echo "Build packages first:"
    echo "  cd backend && cargo tauri build"
    echo ""
    exit 1
fi

# Create dist directory
mkdir -p "$DIST_DIR"

# Copy packages
COPIED=0

if [ -f "$TAURI_BUNDLE_DIR/deb/Cockpit_${VERSION}_${ARCH}.deb" ]; then
    cp "$TAURI_BUNDLE_DIR/deb/Cockpit_${VERSION}_${ARCH}.deb" "$DIST_DIR/"
    sha256sum "$DIST_DIR/Cockpit_${VERSION}_${ARCH}.deb" > "$DIST_DIR/Cockpit_${VERSION}_${ARCH}.deb.sha256"
    echo -e "${GREEN}✓${NC} Copied: Cockpit_${VERSION}_${ARCH}.deb"
    COPIED=$((COPIED + 1))
fi

if [ -f "$TAURI_BUNDLE_DIR/rpm/Cockpit-${VERSION}-1.x86_64.rpm" ]; then
    cp "$TAURI_BUNDLE_DIR/rpm/Cockpit-${VERSION}-1.x86_64.rpm" "$DIST_DIR/"
    sha256sum "$DIST_DIR/Cockpit-${VERSION}-1.x86_64.rpm" > "$DIST_DIR/Cockpit-${VERSION}-1.x86_64.rpm.sha256"
    echo -e "${GREEN}✓${NC} Copied: Cockpit-${VERSION}-1.x86_64.rpm"
    COPIED=$((COPIED + 1))
fi

if [ $COPIED -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC} No packages found in bundle directory"
    echo ""
    echo "Expected locations:"
    echo "  • $TAURI_BUNDLE_DIR/deb/Cockpit_${VERSION}_${ARCH}.deb"
    echo "  • $TAURI_BUNDLE_DIR/rpm/Cockpit-${VERSION}-1.x86_64.rpm"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✓${NC} Packages copied to: $DIST_DIR/"
echo ""
echo "Install:"
echo "  sudo dpkg -i $DIST_DIR/Cockpit_${VERSION}_${ARCH}.deb"
echo ""
