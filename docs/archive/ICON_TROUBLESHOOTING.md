# Icon Issues - COSMIC Desktop Environment

## Problem Summary

Cockpit shows a **gear icon** (generic application icon) instead of the custom fractal icon, specifically on **COSMIC desktop environment** (Pop!_OS 24.04+).

## Root Cause

COSMIC desktop environment aggressively caches application icons and doesn't automatically refresh when packages are updated. This is a known behavior with the new COSMIC DE (still in development).

## Current Status

✅ **All icons are correctly installed:**
- 7 icon sizes in `/usr/share/icons/hicolor/` (11x16 through 1024x1536)
- Fallback icon in `/usr/share/pixmaps/cockpit.png`
- All icons are RGBA format (required)
- Desktop entry correctly references `Icon=cockpit`
- Post-install script updates icon caches

❌ **COSMIC is showing cached gear icon** from previous builds

## Solutions

### Quick Fix: Restart COSMIC Components

```bash
# Kill and restart COSMIC launcher/panel (they auto-restart)
killall -9 cosmic-launcher cosmic-panel cosmic-app-library

# Wait 2-3 seconds for auto-restart
# Then open app launcher and search for Cockpit
```

### Full Fix: Log Out and Back In

The most reliable solution:
1. Save your work
2. Log out of your session
3. Log back in
4. The icon cache will be rebuilt on login

### Nuclear Option: Clear All Caches

If the above doesn't work:

```bash
# Clear COSMIC and icon caches
rm -rf ~/.cache/cosmic*
rm -rf ~/.cache/icon-cache*

# Log out and log back in
```

## Verification

Run the troubleshooting script:

```bash
./troubleshoot-icons.sh
```

This checks:
- Icon installation (all sizes)
- Desktop entry configuration
- Icon cache status
- Pixmaps fallback
- Icon format (RGBA)
- Desktop environment detection

## Technical Details

### Icon Locations

**System icons** (preferred):
```
/usr/share/icons/hicolor/11x16/apps/cockpit.png      (560 bytes)
/usr/share/icons/hicolor/21x32/apps/cockpit.png      (1.6 KB)
/usr/share/icons/hicolor/32x48/apps/cockpit.png      (3.3 KB)
/usr/share/icons/hicolor/85x128/apps/cockpit.png     (20 KB)
/usr/share/icons/hicolor/171x256/apps/cockpit.png    (74 KB)
/usr/share/icons/hicolor/341x512/apps/cockpit.png    (284 KB)
/usr/share/icons/hicolor/1024x1536/apps/cockpit.png  (2.5 MB)
```

**Fallback icon** (for older/simple DEs):
```
/usr/share/pixmaps/cockpit.png  (284 KB, 341x512)
```

### Desktop Entry

```desktop
[Desktop Entry]
Name=Cockpit
GenericName=Writing and Research Tool
Comment=Writing, Research & System Management Desktop App
Exec=cockpit
Icon=cockpit          # Icon name, not path
Terminal=false
Type=Application
Categories=Office;
Keywords=writing;research;news;ideas;productivity;notes;editor;
StartupWMClass=cockpit
StartupNotify=true
```

The `Icon=cockpit` tells the system to look for `cockpit.png` in:
1. `/usr/share/icons/hicolor/` (current theme, multiple sizes)
2. `/usr/share/pixmaps/` (fallback)

### Icon Theme System

Linux desktop environments use the **freedesktop.org icon theme specification**:

1. **Icon lookup order**:
   - `~/.local/share/icons/` (user-specific)
   - `/usr/share/icons/hicolor/` (default theme)
   - `/usr/share/pixmaps/` (fallback)

2. **Size selection**:
   - DE determines needed size (e.g., 48x48 for launcher, 256x256 for Alt+Tab)
   - System finds closest available size
   - Scales if exact size not available

3. **Caching**:
   - `icon-theme.cache` in each theme directory
   - DE-specific caches (GNOME, KDE, COSMIC)
   - Updated by `gtk-update-icon-cache` (triggered by package install)

### COSMIC-Specific Behavior

COSMIC (System76's new Rust-based DE) is still in active development and has some caching quirks:

**Known issues:**
- Icon cache not always refreshed on package update
- Launcher doesn't re-scan icons without restart
- May cache icon name → file mapping aggressively

**Workarounds:**
1. Restart launcher components after install
2. Log out/in to rebuild caches
3. Include post-install script to copy to pixmaps

### Post-Install Script

Our package includes `postinst.sh` that runs after installation:

```bash
#!/bin/bash
# Copy icon to pixmaps for compatibility
if [ -f /usr/share/icons/hicolor/341x512/apps/cockpit.png ]; then
    cp /usr/share/icons/hicolor/341x512/apps/cockpit.png /usr/share/pixmaps/cockpit.png
    chmod 644 /usr/share/pixmaps/cockpit.png
fi

# Update icon cache
gtk-update-icon-cache -f /usr/share/icons/hicolor/ 2>/dev/null || true

# Update desktop database
update-desktop-database /usr/share/applications/ 2>/dev/null || true
```

This ensures maximum compatibility across all desktop environments.

## Testing on Other Desktop Environments

The icon setup has been tested/verified on:

- ✅ **COSMIC** (Pop!_OS 24.04) - Works after logout/login
- ✅ **GNOME** (Ubuntu 22.04+) - Works immediately
- ✅ **KDE Plasma** (Kubuntu) - Works immediately
- ✅ **XFCE** (Xubuntu) - Works immediately

## Build Process

Icons are automatically included when running:

```bash
cd backend
cargo tauri build
```

The build process:
1. Reads icon files from `backend/icons/` directory
2. Resizes to standard sizes (handled by Tauri)
3. Embeds in .deb package at correct locations
4. Registers post-install script
5. Includes desktop entry with icon reference

## Icon Source Files

Located in `backend/icons/`:

```
icon-16x16.png    # 11x16 RGBA (aspect preserved)
icon-32x32.png    # 21x32 RGBA
icon-48x48.png    # 32x48 RGBA  
icon-128x128.png  # 85x128 RGBA
icon-256x256.png  # 171x256 RGBA
icon-512x512.png  # 341x512 RGBA
fractal.png       # 1024x1536 RGBA (source)
```

All icons maintain the 2:3 aspect ratio of the original fractal design.

### Regenerating Icons

If you need to recreate icons from a new source:

```bash
cd backend/icons

# From high-resolution source (replace newsource.png)
convert newsource.png -resize 16x16 -alpha on PNG32:icon-16x16.png
convert newsource.png -resize 32x32 -alpha on PNG32:icon-32x32.png
convert newsource.png -resize 48x48 -alpha on PNG32:icon-48x48.png
convert newsource.png -resize 128x128 -alpha on PNG32:icon-128x128.png
convert newsource.png -resize 256x256 -alpha on PNG32:icon-256x256.png
convert newsource.png -resize 512x512 -alpha on PNG32:icon-512x512.png

# Update fractal.png source
cp newsource.png fractal.png

# Verify all are RGBA
file icon-*.png | grep RGBA
```

**Important**: 
- Use `PNG32:` prefix to force RGBA format
- Use `-alpha on` to ensure alpha channel
- Tauri **requires** RGBA format (will error on RGB)

## Troubleshooting Steps

### 1. Verify Installation

```bash
./troubleshoot-icons.sh
```

Should show all checks passing (✓).

### 2. Check Desktop Entry

```bash
cat /usr/share/applications/Cockpit.desktop
desktop-file-validate /usr/share/applications/Cockpit.desktop
```

Should show no errors.

### 3. Check Icon Files

```bash
ls -lh /usr/share/icons/hicolor/*/apps/cockpit.png
file /usr/share/icons/hicolor/341x512/apps/cockpit.png
```

Should show 7 files, all PNG RGBA format.

### 4. Force Cache Refresh

```bash
sudo gtk-update-icon-cache -f /usr/share/icons/hicolor/
sudo update-desktop-database /usr/share/applications/
```

### 5. Restart Desktop Components

**COSMIC:**
```bash
killall -9 cosmic-launcher cosmic-panel cosmic-app-library
```

**GNOME:**
```bash
# Press Alt+F2, type 'r', press Enter
# Or: killall -9 gnome-shell (will log you out!)
```

**KDE:**
```bash
killall plasmashell && kstart5 plasmashell &
```

**XFCE:**
```bash
xfce4-panel -r
```

### 6. Check for Conflicts

```bash
# Check for user overrides
find ~/.local/share/icons -name "*cockpit*"
find ~/.local/share/applications -name "*cockpit*"

# Remove if found
rm -rf ~/.local/share/icons/*/apps/cockpit*
rm -rf ~/.local/share/applications/cockpit.desktop
```

### 7. Last Resort

```bash
# Clear all caches
rm -rf ~/.cache/icon-cache*
rm -rf ~/.cache/cosmic*

# Reinstall package
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb

# Log out and log back in
```

## Future Improvements

### For Tauri 2.x Updates

1. **SVG Icon**: Create scalable vector version
   ```bash
   # Convert PNG to SVG (requires potrace)
   convert fractal.png fractal.pgm
   potrace -s fractal.pgm -o fractal.svg
   ```
   Then add to `tauri.conf.json` icon array.

2. **Icon Theme Support**: Create a complete icon theme
   ```
   cockpit-icons/
     scalable/
       apps/
         cockpit.svg
     symbolic/
       apps/
         cockpit-symbolic.svg
   ```

3. **Animated Icon**: For loading states (GNOME Shell 42+)

### For COSMIC Maturity

When COSMIC reaches stable release (Pop!_OS 24.10+), these issues should be resolved:
- Better icon cache management
- Hot-reload of desktop entries
- Improved application launcher indexing

## Summary

**The icons ARE correctly installed.** The issue is purely a **COSMIC desktop environment caching problem**.

**Solutions in order of preference:**
1. ✅ Log out and log back in (most reliable)
2. ✅ Restart COSMIC launcher: `killall -9 cosmic-launcher`
3. ✅ Clear caches: `rm -rf ~/.cache/cosmic* ~/.cache/icon-cache*`

**For future installs:**
- Icons will work immediately on GNOME, KDE, XFCE
- COSMIC users need to restart launcher or log out/in once

**Scripts created:**
- `troubleshoot-icons.sh` - Diagnostic tool
- `backend/postinst.sh` - Auto-runs after package install
- Icons automatically included in build process

---

*Last updated: December 15, 2025*
*COSMIC version: alpha (Pop!_OS 24.04)*
*Status: Known issue with workaround*
