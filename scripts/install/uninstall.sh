#!/usr/bin/env bash
set -e

# Cockpit Uninstallation Script
# Removes application but preserves user data by default

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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warn "Running as root. Removing from system directories."
    INSTALL_DIR="/usr/bin"
    DESKTOP_DIR="/usr/share/applications"
    ICON_DIR="/usr/share/icons/hicolor"
fi

print_info "Cockpit Uninstallation Script"
echo "==============================="
echo ""

# Ask about data removal
echo "Do you want to remove user data as well? (${COCKPIT_HOME})"
echo "This includes your database, logs, and exported files."
read -p "Remove user data? [y/N]: " -n 1 -r
echo ""

REMOVE_DATA=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    REMOVE_DATA=true
    print_warn "User data will be removed!"
else
    print_info "User data will be preserved in ${COCKPIT_HOME}"
fi

echo ""
read -p "Proceed with uninstallation? [y/N]: " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Uninstallation cancelled."
    exit 0
fi

# Remove binary
if [ -f "${INSTALL_DIR}/cockpit" ]; then
    print_info "Removing cockpit binary from ${INSTALL_DIR}..."
    if [ "$EUID" -eq 0 ]; then
        rm -f "${INSTALL_DIR}/cockpit"
    else
        sudo rm -f "${INSTALL_DIR}/cockpit"
    fi
else
    print_warn "Binary not found at ${INSTALL_DIR}/cockpit"
fi

# Remove desktop entry
if [ -f "${DESKTOP_DIR}/cockpit.desktop" ]; then
    print_info "Removing desktop entry..."
    rm -f "${DESKTOP_DIR}/cockpit.desktop"
else
    print_warn "Desktop entry not found"
fi

# Remove icons
if [ -d "${ICON_DIR}/128x128/apps" ]; then
    print_info "Removing application icons..."
    rm -f "${ICON_DIR}/128x128/apps/cockpit.png"
    rm -f "${ICON_DIR}/32x32/apps/cockpit.png"
    
    # Update icon cache
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -f -t "${ICON_DIR}" 2>/dev/null || true
    fi
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "${DESKTOP_DIR}" 2>/dev/null || true
fi

# Remove user data if requested
if [ "$REMOVE_DATA" = true ]; then
    if [ -d "${COCKPIT_HOME}" ]; then
        print_info "Removing user data from ${COCKPIT_HOME}..."
        rm -rf "${COCKPIT_HOME}"
        print_info "User data removed."
    else
        print_warn "User data directory not found at ${COCKPIT_HOME}"
    fi
else
    print_info "User data preserved at ${COCKPIT_HOME}"
    print_info "To remove manually later: rm -rf ${COCKPIT_HOME}"
fi

print_info "Uninstallation complete!"
echo ""

if [ "$REMOVE_DATA" = false ]; then
    echo "Your data is still available at: ${COCKPIT_HOME}"
    echo "To reinstall with existing data, run install.sh"
fi
