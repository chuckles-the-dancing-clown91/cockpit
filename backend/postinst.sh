#!/bin/bash
# Post-install script for Cockpit
# This runs after the package is installed

# Copy icon to pixmaps for better compatibility with all desktop environments
if [ -f /usr/share/icons/hicolor/341x512/apps/cockpit.png ]; then
    cp /usr/share/icons/hicolor/341x512/apps/cockpit.png /usr/share/pixmaps/cockpit.png
    chmod 644 /usr/share/pixmaps/cockpit.png
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f /usr/share/icons/hicolor/ 2>/dev/null || true
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications/ 2>/dev/null || true
fi

exit 0
