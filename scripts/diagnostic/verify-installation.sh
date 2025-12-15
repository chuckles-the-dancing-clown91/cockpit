#!/bin/bash
# Installation Verification Script for Cockpit
# Run this after installing the .deb package to verify everything works

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAIL_COUNT=0
PASS_COUNT=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Cockpit Installation Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Package installed
echo -n "Checking if cockpit package is installed... "
if dpkg -l | grep -q "^ii.*cockpit.*0.1.0"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Run: sudo dpkg -i dist/Cockpit_0.1.0_amd64.deb"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 2: Binary exists
echo -n "Checking if binary exists at /usr/bin/cockpit... "
if [ -f /usr/bin/cockpit ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 3: Binary is executable
echo -n "Checking if binary is executable... "
if [ -x /usr/bin/cockpit ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 4: Binary in PATH
echo -n "Checking if cockpit is in PATH... "
if command -v cockpit >/dev/null 2>&1; then
    WHICH_OUTPUT=$(which cockpit)
    if [ "$WHICH_OUTPUT" = "/usr/bin/cockpit" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($WHICH_OUTPUT)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} (found at $WHICH_OUTPUT, expected /usr/bin/cockpit)"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Try: hash -r (to refresh PATH cache)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 5: Desktop entry exists
echo -n "Checking if desktop entry exists... "
if [ -f /usr/share/applications/Cockpit.desktop ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 6: Desktop entry is valid
echo -n "Checking if desktop entry is valid... "
if command -v desktop-file-validate >/dev/null 2>&1; then
    if desktop-file-validate /usr/share/applications/Cockpit.desktop 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        desktop-file-validate /usr/share/applications/Cockpit.desktop
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (desktop-file-validate not installed)"
fi

# Test 7: Icons installed
echo -n "Checking if icons are installed... "
ICON_COUNT=$(ls /usr/share/icons/hicolor/*/apps/cockpit.png 2>/dev/null | wc -l)
if [ "$ICON_COUNT" -ge 5 ]; then
    echo -e "${GREEN}✓ PASS${NC} ($ICON_COUNT icons found)"
    PASS_COUNT=$((PASS_COUNT + 1))
elif [ "$ICON_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ WARN${NC} (only $ICON_COUNT icons found, expected 7)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test 8: Icon cache updated
echo -n "Checking if icon cache is current... "
if [ -f /usr/share/icons/hicolor/icon-theme.cache ]; then
    CACHE_TIME=$(stat -c %Y /usr/share/icons/hicolor/icon-theme.cache 2>/dev/null || echo "0")
    ICON_TIME=$(stat -c %Y /usr/share/icons/hicolor/*/apps/cockpit.png 2>/dev/null | head -1)
    if [ "$CACHE_TIME" -ge "$ICON_TIME" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} (cache outdated)"
        echo "  Run: sudo gtk-update-icon-cache /usr/share/icons/hicolor/ -f"
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (no icon cache)"
fi

# Test 9: Binary uses production paths
echo -n "Checking if binary uses production paths... "
# Run cockpit with a quick exit and check the log output
COCKPIT_OUTPUT=$(/usr/bin/cockpit 2>&1 | head -20 | grep "Database file" || echo "")
if echo "$COCKPIT_OUTPUT" | grep -q "/.cockpit/data/db.sql"; then
    echo -e "${GREEN}✓ PASS${NC} (uses ~/.cockpit/)"
    PASS_COUNT=$((PASS_COUNT + 1))
    # Kill the cockpit process we just started
    pkill -f "/usr/bin/cockpit" 2>/dev/null || true
elif echo "$COCKPIT_OUTPUT" | grep -q "backend/storage/data/db.sql"; then
    echo -e "${RED}✗ FAIL${NC} (uses development paths)"
    echo "  Binary was compiled with development paths!"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    pkill -f "/usr/bin/cockpit" 2>/dev/null || true
else
    echo -e "${YELLOW}⚠ SKIP${NC} (couldn't determine)"
fi

# Test 10: Desktop entry references correct binary
echo -n "Checking desktop entry Exec line... "
EXEC_LINE=$(grep "^Exec=" /usr/share/applications/Cockpit.desktop | cut -d= -f2)
if [ "$EXEC_LINE" = "cockpit" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Exec=cockpit)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} (Exec=$EXEC_LINE)"
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ($PASS_COUNT/$TOTAL)${NC}"
    echo ""
    echo -e "Installation is ${GREEN}complete and verified${NC}."
    echo ""
    echo -e "You can now:"
    echo -e "  • Launch from terminal: ${BLUE}cockpit${NC}"
    echo -e "  • Launch from app launcher: Search for ${BLUE}\"Cockpit\"${NC}"
    echo -e "  • Data stored in: ${BLUE}~/.cockpit/${NC}"
else
    echo -e "${RED}Some tests failed! ($PASS_COUNT passed, $FAIL_COUNT failed)${NC}"
    echo ""
    echo -e "Troubleshooting:"
    echo -e "  1. Update caches: ${BLUE}sudo update-desktop-database && sudo gtk-update-icon-cache /usr/share/icons/hicolor/ -f${NC}"
    echo -e "  2. Reinstall: ${BLUE}sudo dpkg -i dist/Cockpit_0.1.0_amd64.deb${NC}"
    echo -e "  3. Logout and login again"
fi
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

exit $FAIL_COUNT
