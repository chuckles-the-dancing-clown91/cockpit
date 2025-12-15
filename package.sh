#!/usr/bin/env bash
set -euo pipefail

# Cockpit Package Builder
# Creates distributable packages using Tauri's bundler for production-ready binaries

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Auto-extract version from Cargo.toml if not set
if [ -z "${VERSION:-}" ]; then
    VERSION=$(grep '^version = ' "$ROOT_DIR/backend/Cargo.toml" | head -n1 | sed 's/version = "\(.*\)"/\1/')
fi
VERSION="${VERSION:-0.1.0}"

ARCH="${ARCH:-amd64}"
BUILD_DIR="$ROOT_DIR/build/package"
DIST_DIR="$ROOT_DIR/dist"
TAURI_BUNDLE_DIR="$ROOT_DIR/build/target/release/bundle"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Clean previous builds
print_step "Cleaning previous builds..."
rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

# Build with Tauri bundler (creates production-ready binaries)
print_step "Building Cockpit with Tauri bundler..."
cd "$ROOT_DIR/backend"
cargo tauri build
cd "$ROOT_DIR"

# Check if Tauri bundles were created
if [ ! -d "$TAURI_BUNDLE_DIR" ]; then
    echo "Error: Tauri bundle directory not found at $TAURI_BUNDLE_DIR"
    echo "Tauri build may have failed."
    exit 1
fi

# Copy Tauri-built packages to dist/
print_step "Copying Tauri-built packages to dist/..."

# Copy .deb package (primary distribution method)
if [ -f "$TAURI_BUNDLE_DIR/deb/Cockpit_${VERSION}_${ARCH}.deb" ]; then
    cp "$TAURI_BUNDLE_DIR/deb/Cockpit_${VERSION}_${ARCH}.deb" "$DIST_DIR/"
    print_success "Debian package: Cockpit_${VERSION}_${ARCH}.deb"
else
    print_warning "Debian package not found"
fi

# Copy .rpm package
if [ -f "$TAURI_BUNDLE_DIR/rpm/Cockpit-${VERSION}-1.x86_64.rpm" ]; then
    cp "$TAURI_BUNDLE_DIR/rpm/Cockpit-${VERSION}-1.x86_64.rpm" "$DIST_DIR/"
    print_success "RPM package: Cockpit-${VERSION}-1.x86_64.rpm"
else
    print_warning "RPM package not found"
fi

# Create tarball for portable installation
print_step "Creating portable tarball..."
PACKAGE_ROOT="$BUILD_DIR/cockpit-$VERSION-linux-$ARCH"
mkdir -p "$PACKAGE_ROOT"/{bin,icons,scripts}

# Copy the production binary from Tauri build
print_step "Copying production binary..."
if [ -f "$ROOT_DIR/build/target/release/cockpit" ]; then
    cp "$ROOT_DIR/build/target/release/cockpit" "$PACKAGE_ROOT/bin/"
    chmod +x "$PACKAGE_ROOT/bin/cockpit"
    print_success "Binary copied from Tauri build"
else
    echo "Error: Binary not found at build/target/release/cockpit"
    echo "Tauri build may have failed."
    exit 1
fi

# Copy icons
print_step "Copying icons..."
if [ -d "$ROOT_DIR/backend/icons" ]; then
    cp -r "$ROOT_DIR/backend/icons/"* "$PACKAGE_ROOT/icons/" 2>/dev/null || true
fi

# Copy installation scripts
print_step "Copying installation scripts..."
cp "$ROOT_DIR/install.sh" "$PACKAGE_ROOT/scripts/"
cp "$ROOT_DIR/uninstall.sh" "$PACKAGE_ROOT/scripts/"
chmod +x "$PACKAGE_ROOT/scripts/"*.sh

# Copy documentation
print_step "Copying documentation..."
cp "$ROOT_DIR/README.md" "$PACKAGE_ROOT/"
cp "$ROOT_DIR/INSTALL.md" "$PACKAGE_ROOT/"

# Create desktop entry template
cat > "$PACKAGE_ROOT/cockpit.desktop" << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Cockpit
GenericName=Productivity Suite
Comment=Modern productivity suite for content creators
Exec=cockpit
Icon=cockpit
Terminal=false
Categories=Utility;Office;TextEditor;Development;
Keywords=writing;markdown;news;research;productivity;tasks;
StartupNotify=true
EOF

# Create main installer wrapper
cat > "$PACKAGE_ROOT/install" << 'EOF'
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔════════════════════════════════════════╗"
echo "║     Cockpit Installation Wizard        ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "This will install Cockpit to your system."
echo "The installation is fully automated and requires no configuration."
echo ""
read -p "Continue? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    echo "Installation cancelled."
    exit 0
fi

# Check for required tools
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is required but not installed."
    echo "Install it with: sudo apt install openssl"
    exit 1
fi

# Run the installation script
cd "$SCRIPT_DIR"
bash scripts/install.sh

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Installation Complete! 🎉            ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Launch Cockpit with: cockpit"
echo "Or search for 'Cockpit' in your application launcher"
echo ""
echo "Your data is stored in: ~/.cockpit/"
echo "Configuration: ~/.cockpit/.env"
echo ""
echo "To uninstall: cd $SCRIPT_DIR && bash scripts/uninstall.sh"
EOF
chmod +x "$PACKAGE_ROOT/install"

# Create README for the package
cat > "$PACKAGE_ROOT/README.txt" << EOF
Cockpit v${VERSION} - Linux Distribution Package
================================================

Automated Installation (Recommended)
------------------------------------
Run: ./install

This will:
✓ Install cockpit binary to /usr/local/bin
✓ Generate secure master encryption key
✓ Create ~/.cockpit directory structure  
✓ Install desktop integration
✓ Set up automatic database initialization

Manual Installation
-------------------
cd scripts
./install.sh

Uninstallation
--------------
cd scripts
./uninstall.sh

Documentation
-------------
See INSTALL.md for detailed installation instructions
See README.md for usage and features

System Requirements
-------------------
- Linux (Ubuntu 20.04+, Fedora 35+, or equivalent)
- openssl (for master key generation)
- 4GB RAM minimum (8GB recommended)
- 500MB storage

Support
-------
GitHub: https://github.com/yourusername/cockpit
Issues: https://github.com/yourusername/cockpit/issues

Copyright © 2025 Cockpit Project
EOF

# Create tarball for portable installation (optional)
print_step "Creating portable tarball..."
cd "$BUILD_DIR"
tar -czf "$DIST_DIR/cockpit-${VERSION}-linux-${ARCH}.tar.gz" "cockpit-$VERSION-linux-$ARCH"
print_success "Tarball: cockpit-${VERSION}-linux-${ARCH}.tar.gz"

# Create checksums
print_step "Generating checksums..."
cd "$DIST_DIR"
for file in *.{deb,rpm,tar.gz} 2>/dev/null; do
    if [ -f "$file" ]; then
        sha256sum "$file" > "$file.sha256"
    fi
done
print_success "Checksums created"

# Summary
echo ""
print_step "Build Summary"
echo "=============================================="
echo "Version:      $VERSION (from Cargo.toml)"
echo "Architecture: $ARCH"
echo ""
echo "✅ Packages created in: $DIST_DIR/"
echo ""

# List what was actually created
if [ -f "$DIST_DIR/Cockpit_${VERSION}_${ARCH}.deb" ]; then
    echo "  📦 Cockpit_${VERSION}_${ARCH}.deb"
    echo "     └─ Production-ready Debian package (RECOMMENDED)"
    echo "     └─ Install: sudo dpkg -i Cockpit_${VERSION}_${ARCH}.deb"
    echo ""
fi

if [ -f "$DIST_DIR/Cockpit-${VERSION}-1.x86_64.rpm" ]; then
    echo "  📦 Cockpit-${VERSION}-1.x86_64.rpm"
    echo "     └─ RPM package for Fedora/RHEL"
    echo "     └─ Install: sudo rpm -i Cockpit-${VERSION}-1.x86_64.rpm"
    echo ""
fi

if [ -f "$DIST_DIR/cockpit-${VERSION}-linux-${ARCH}.tar.gz" ]; then
    echo "  📦 cockpit-${VERSION}-linux-${ARCH}.tar.gz"
    echo "     └─ Portable tarball (for manual installation)"
    echo "     └─ Extract and run: ./install"
    echo ""
fi

echo "=============================================="
echo ""
echo "✨ IMPORTANT: Use Tauri-built packages"
echo ""
echo "The .deb and .rpm packages are built by Tauri's"
echo "bundler with proper production binaries."
echo ""
echo "These packages:"
echo "  ✅ Use ~/.cockpit/ for data (production)"
echo "  ✅ Auto-generate encryption keys on first run"
echo "  ✅ Include all dependencies"
echo "  ✅ Desktop integration ready"
echo ""
print_success "Package build complete!"
