#!/usr/bin/env bash
set -e

# Cockpit Installation Script
# Installs the application and sets up user directories

INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor"
COCKPIT_HOME="${HOME}/.cockpit"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_warn "Running as root. Installing to system directories."
    INSTALL_DIR="/usr/bin"
    DESKTOP_DIR="/usr/share/applications"
    ICON_DIR="/usr/share/icons/hicolor"
fi

# Detect binary location
if [ -f "./build/target/release/cockpit" ]; then
    BINARY_PATH="./build/target/release/cockpit"
else
    print_error "Could not find cockpit binary at ./build/target/release/cockpit"
    print_error "Please build first with: ./build.sh"
    exit 1
fi

print_info "Cockpit Installation Script"
echo "=============================="
echo "Binary: ${BINARY_PATH}"
echo "Install directory: ${INSTALL_DIR}"
echo "Desktop entry: ${DESKTOP_DIR}"
echo "Icons: ${ICON_DIR}"
echo "User data: ${COCKPIT_HOME}"
echo ""

# Create user directories
print_info "Creating user directories in ${COCKPIT_HOME}..."
mkdir -p "${COCKPIT_HOME}/data"
mkdir -p "${COCKPIT_HOME}/logs"
mkdir -p "${COCKPIT_HOME}/cache"
mkdir -p "${COCKPIT_HOME}/backups"
mkdir -p "${COCKPIT_HOME}/exports"
mkdir -p "${COCKPIT_HOME}/icons"

# Install binary
if [ "$EUID" -eq 0 ]; then
    cp "${BINARY_PATH}" "${INSTALL_DIR}/cockpit"
    chmod +x "${INSTALL_DIR}/cockpit"
else
    sudo cp "${BINARY_PATH}" "${INSTALL_DIR}/cockpit"
    sudo chmod +x "${INSTALL_DIR}/cockpit"
fi

# Create desktop entry
print_info "Creating desktop entry..."
mkdir -p "${DESKTOP_DIR}"

cat > "${DESKTOP_DIR}/cockpit.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Cockpit
Comment=Modern desktop productivity suite for content creators
Exec=${INSTALL_DIR}/cockpit
Icon=cockpit
Terminal=false
Categories=Productivity;Office;Utility;
Keywords=notes;writing;research;news;productivity;
StartupWMClass=cockpit
EOF

# Install icons
if [ -f "./backend/icons/frac-128x128.png" ]; then
    print_info "Installing application icons..."
    mkdir -p "${ICON_DIR}/128x128/apps"
    mkdir -p "${ICON_DIR}/32x32/apps"
    
    cp "./backend/icons/frac-128x128.png" "${ICON_DIR}/128x128/apps/cockpit.png"
    cp "./backend/icons/frac-32x32.png" "${ICON_DIR}/32x32/apps/cockpit.png"
    
    # Update icon cache
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -f -t "${ICON_DIR}" 2>/dev/null || true
    fi
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "${DESKTOP_DIR}" 2>/dev/null || true
fi

print_info "Installation complete!"
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Cockpit Installed Successfully! 🎉   ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Launch Cockpit:"
echo "  $ cockpit"
echo ""
echo "Or search for 'Cockpit' in your application launcher"
echo ""
echo "🔐 On first run, Cockpit will automatically:"
echo "   • Generate a secure master encryption key"
echo "   • Create ~/.cockpit directory structure"
echo "   • Initialize the database"
echo "   • Set up default settings"
echo ""
echo "✓ No configuration required - just launch and use!"
