#!/bin/bash
# Icon Troubleshooting Script for Cockpit
# Tests icon installation and suggests fixes

echo "=== Cockpit Icon Troubleshooting ===="
echo ""

# Check if package is installed
echo "1. Checking if Cockpit is installed..."
if dpkg -l | grep -q "^ii  cockpit"; then
    echo "   ✓ Cockpit package is installed"
else
    echo "   ✗ Cockpit is NOT installed"
    exit 1
fi
echo ""

# Check desktop entry
echo "2. Checking desktop entry..."
if [ -f /usr/share/applications/Cockpit.desktop ]; then
    echo "   ✓ Desktop entry exists"
    ICON_VALUE=$(grep "^Icon=" /usr/share/applications/Cockpit.desktop | cut -d= -f2)
    echo "   Icon value: $ICON_VALUE"
else
    echo "   ✗ Desktop entry NOT found"
fi
echo ""

# Check hicolor icons
echo "3. Checking hicolor icon theme..."
ICON_COUNT=$(find /usr/share/icons/hicolor -name "cockpit.png" 2>/dev/null | wc -l)
echo "   Found $ICON_COUNT icon sizes"
if [ $ICON_COUNT -gt 0 ]; then
    echo "   ✓ Icons installed in hicolor theme"
    find /usr/share/icons/hicolor -name "cockpit.png" -exec ls -lh {} \; | head -5
else
    echo "   ✗ NO icons found in hicolor theme"
fi
echo ""

# Check pixmaps fallback
echo "4. Checking pixmaps fallback..."
if [ -f /usr/share/pixmaps/cockpit.png ]; then
    echo "   ✓ Fallback icon exists in /usr/share/pixmaps/"
    ls -lh /usr/share/pixmaps/cockpit.png
else
    echo "   ✗ No fallback icon in /usr/share/pixmaps/"
    echo "   Creating fallback icon..."
    if [ -f /usr/share/icons/hicolor/341x512/apps/cockpit.png ]; then
        sudo cp /usr/share/icons/hicolor/341x512/apps/cockpit.png /usr/share/pixmaps/cockpit.png
        echo "   ✓ Created /usr/share/pixmaps/cockpit.png"
    fi
fi
echo ""

# Check icon cache
echo "5. Checking icon cache..."
if [ -f /usr/share/icons/hicolor/icon-theme.cache ]; then
    CACHE_AGE=$(stat -c %Y /usr/share/icons/hicolor/icon-theme.cache)
    NEWEST_ICON=$(find /usr/share/icons/hicolor -name "cockpit.png" -printf '%T@\n' 2>/dev/null | sort -n | tail -1 | cut -d. -f1)
    
    if [ -n "$NEWEST_ICON" ] && [ $CACHE_AGE -lt $NEWEST_ICON ]; then
        echo "   ⚠ Icon cache is OLDER than icons - needs update"
        echo "   Updating icon cache..."
        sudo gtk-update-icon-cache -f /usr/share/icons/hicolor/
        echo "   ✓ Icon cache updated"
    else
        echo "   ✓ Icon cache is up to date"
    fi
else
    echo "   Creating icon cache..."
    sudo gtk-update-icon-cache -f /usr/share/icons/hicolor/
    echo "   ✓ Icon cache created"
fi
echo ""

# Check desktop database
echo "6. Checking desktop database..."
sudo update-desktop-database /usr/share/applications/ 2>/dev/null
echo "   ✓ Desktop database updated"
echo ""

# Check desktop environment
echo "7. Detecting desktop environment..."
if [ -n "$XDG_CURRENT_DESKTOP" ]; then
    echo "   Desktop: $XDG_CURRENT_DESKTOP"
    
    case "$XDG_CURRENT_DESKTOP" in
        *COSMIC*)
            echo "   ℹ COSMIC detected - may need launcher restart"
            echo ""
            echo "   To restart COSMIC launcher:"
            echo "   killall -9 cosmic-launcher cosmic-panel cosmic-app-library"
            echo "   (They will auto-restart)"
            ;;
        *GNOME*)
            echo "   ℹ GNOME detected - restart GNOME Shell with Alt+F2, then 'r'"
            ;;
        *KDE*|*Plasma*)
            echo "   ℹ KDE detected - restart plasmashell:"
            echo "   killall plasmashell && plasmashell &"
            ;;
        *XFCE*)
            echo "   ℹ XFCE detected - restart panel:"
            echo "   xfce4-panel -r"
            ;;
    esac
else
    echo "   Desktop environment: Unknown"
fi
echo ""

# Check for local overrides
echo "8. Checking for local icon overrides..."
if [ -d ~/.local/share/icons ]; then
    LOCAL_ICONS=$(find ~/.local/share/icons -name "cockpit*" 2>/dev/null)
    if [ -n "$LOCAL_ICONS" ]; then
        echo "   ⚠ Found local icon overrides (may conflict):"
        echo "$LOCAL_ICONS"
        echo ""
        echo "   Consider removing: rm -rf ~/.local/share/icons/*/apps/cockpit*"
    else
        echo "   ✓ No local icon overrides"
    fi
else
    echo "   ✓ No local icons directory"
fi
echo ""

# Test icon lookup
echo "9. Testing icon lookup..."
if command -v gtk-launch &> /dev/null; then
    # Try to look up the icon (without launching)
    if gtk-launch --help &> /dev/null; then
        echo "   gtk-launch command available"
    fi
fi

# Check icon formats
echo "   Checking icon format..."
TEST_ICON="/usr/share/icons/hicolor/341x512/apps/cockpit.png"
if [ -f "$TEST_ICON" ]; then
    FORMAT=$(file "$TEST_ICON" | grep -o "RGBA\|RGB")
    if [ "$FORMAT" = "RGBA" ]; then
        echo "   ✓ Icon format: RGBA (correct)"
    else
        echo "   ⚠ Icon format: $FORMAT (should be RGBA)"
    fi
fi
echo ""

echo "=== Summary ==="
echo ""
echo "Icon installation appears complete. If icons still don't show:"
echo ""
echo "1. Restart your desktop environment/launcher"
echo "2. Log out and log back in"
echo "3. Check if there are local icon theme overrides"
echo "4. Try: killall -9 cosmic-launcher (for COSMIC)"
echo ""
echo "If the issue persists, the desktop environment may be caching"
echo "icons aggressively. Try creating ~/.cache/icon-cache-purge as a flag:"
echo ""
echo "  rm -rf ~/.cache/icon-cache*"
echo ""
