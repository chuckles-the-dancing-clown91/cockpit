#!/bin/bash
# Cockpit - Cleanup Old Installations Script
# Removes lingering files from manual/development installations

set -e

echo "🧹 Cleaning up old Cockpit installations..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CLEANED=0

# 1. Remove user desktop entries
if [ -f ~/.local/share/applications/cockpit.desktop ] || [ -f ~/.local/share/applications/Cockpit.desktop ]; then
    echo -e "${YELLOW}→${NC} Removing user desktop entries..."
    rm -f ~/.local/share/applications/cockpit.desktop
    rm -f ~/.local/share/applications/Cockpit.desktop
    CLEANED=$((CLEANED + 1))
fi

# 2. Remove user icons
USER_ICONS=$(find ~/.local/share/icons/hicolor -name "cockpit.png" 2>/dev/null | wc -l)
if [ "$USER_ICONS" -gt 0 ]; then
    echo -e "${YELLOW}→${NC} Removing $USER_ICONS user icon files..."
    find ~/.local/share/icons/hicolor -name "cockpit.png" -delete 2>/dev/null
    CLEANED=$((CLEANED + 1))
fi

# 3. Check for development binaries
if [ -f /usr/local/bin/cockpit ]; then
    echo -e "${YELLOW}→${NC} Found development binary in /usr/local/bin/cockpit"
    echo -e "   ${RED}⚠${NC}  Run: ${YELLOW}sudo rm /usr/local/bin/cockpit${NC}"
    CLEANED=$((CLEANED + 1))
fi

# 4. Update caches
if [ "$CLEANED" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}→${NC} Updating desktop and icon caches..."
    update-desktop-database ~/.local/share/applications 2>/dev/null || true
    gtk-update-icon-cache ~/.local/share/icons/hicolor/ 2>/dev/null || true
    echo ""
    echo -e "${GREEN}✓${NC} Cleaned up $CLEANED old installation artifacts"
    echo -e "${GREEN}✓${NC} Caches updated"
else
    echo -e "${GREEN}✓${NC} No old installations found - system is clean"
fi

echo ""
echo "📦 Current installation status:"
echo ""

# Check dpkg package
if dpkg -l | grep -q "^ii.*cockpit"; then
    VERSION=$(dpkg -l | grep "^ii.*cockpit" | awk '{print $3}')
    echo -e "${GREEN}✓${NC} Package installed: cockpit ${VERSION}"
    
    # Check binary
    if [ -f /usr/bin/cockpit ]; then
        SIZE=$(du -h /usr/bin/cockpit | cut -f1)
        echo -e "${GREEN}✓${NC} Binary: /usr/bin/cockpit (${SIZE})"
    fi
    
    # Check desktop entry
    if [ -f /usr/share/applications/Cockpit.desktop ]; then
        echo -e "${GREEN}✓${NC} Desktop entry: /usr/share/applications/Cockpit.desktop"
    fi
    
    # Check icons
    ICON_COUNT=$(find /usr/share/icons/hicolor -name "cockpit.png" 2>/dev/null | wc -l)
    echo -e "${GREEN}✓${NC} Icons: ${ICON_COUNT} sizes installed"
else
    echo -e "${YELLOW}⚠${NC}  No Cockpit package installed"
    echo ""
    echo "To install:"
    echo "  cd $(dirname "$0")"
    echo "  sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb"
fi

echo ""
echo "Done!"
