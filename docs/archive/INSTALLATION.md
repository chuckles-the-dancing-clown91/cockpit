# Cockpit Installation Guide

## Quick Install (Recommended)

### 1. Clean Old Installations
```bash
./cleanup-old-installs.sh
```

### 2. Install Package
```bash
# Debian/Ubuntu
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb

# Fedora/RedHat
sudo rpm -i build/target/release/bundle/rpm/Cockpit-0.1.0-1.x86_64.rpm
```

### 3. Launch
- **From Launcher**: Press Super, type "Cockpit"
- **From Terminal**: `cockpit`

## Verifying Installation

```bash
# Check if installed
which cockpit

# View version/info
cockpit --version

# Check package
dpkg -l | grep cockpit  # Debian/Ubuntu
rpm -qa | grep cockpit  # Fedora/RedHat
```

## Troubleshooting

### App shows in launcher but won't start

**Cause**: Lingering files from old manual installation

**Fix**:
```bash
./cleanup-old-installs.sh
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
```

### `which cockpit` returns nothing

**Possible causes**:
1. Package not installed - Run installation steps above
2. Old desktop entry lingering - Run `./cleanup-old-installs.sh`

### Wrong database path (using `backend/storage/`)

**Cause**: Running development binary instead of installed one

**Check**:
```bash
# Should show /usr/bin/cockpit
which cockpit

# Should NOT exist (development binary)
ls -la /usr/local/bin/cockpit
```

**Fix**:
```bash
# Remove development binary if exists
sudo rm /usr/local/bin/cockpit

# Reinstall package
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
```

### App doesn't appear in launcher

**Fix**:
```bash
# Update desktop database
sudo update-desktop-database /usr/share/applications/
update-desktop-database ~/.local/share/applications/

# Update icon cache
sudo gtk-update-icon-cache /usr/share/icons/hicolor/ -f

# Logout/login or restart desktop environment
```

## Uninstalling

### Complete Removal
```bash
# Remove package
sudo dpkg -r cockpit  # Debian/Ubuntu
sudo rpm -e cockpit   # Fedora/RedHat

# Clean up any lingering files
./cleanup-old-installs.sh

# Remove user data (optional)
rm -rf ~/.cockpit
```

### Keep User Data
```bash
# Just remove package
sudo dpkg -r cockpit

# User data remains in ~/.cockpit
```

## File Locations

### After Installation
```
/usr/bin/cockpit                              # Binary
/usr/share/applications/Cockpit.desktop       # Desktop entry
/usr/share/icons/hicolor/*/apps/cockpit.png   # Icons (7 sizes)
~/.cockpit/                                   # User data (auto-created on first run)
  ├── data/db.sql                            # Database
  ├── logs/                                  # Application logs
  ├── backups/                               # Database backups
  ├── cache/                                 # Temporary cache
  └── exports/                               # Exported data
```

### What NOT to Have
```
/usr/local/bin/cockpit                        # ❌ Development binary (remove this)
~/.local/share/applications/cockpit.desktop   # ❌ User desktop entry (remove this)
~/.local/share/icons/*/cockpit.png            # ❌ User icons (remove these)
backend/storage/                              # ❌ Development data (keep for dev only)
```

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Binary | `build/target/release/cockpit` | `/usr/bin/cockpit` |
| Desktop | None or `~/.local/share/applications/` | `/usr/share/applications/` |
| Icons | `backend/icons/` | `/usr/share/icons/hicolor/` |
| Data | `backend/storage/` | `~/.cockpit/` |
| Install | Manual copy | `.deb`/`.rpm` package |

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `build-complete.sh` | Build packages | `./build-complete.sh` |
| `cleanup-old-installs.sh` | Clean old files | `./cleanup-old-installs.sh` |
| `verify-installation.sh` | Test installation | `./verify-installation.sh` |
| `package-quick.sh` | Copy to dist/ | `./package-quick.sh` |
| `install.sh` | ⚠️ Deprecated manual install | Not recommended |

## For Developers

### Building from Source
```bash
# Full build
./build-complete.sh

# Or manually
cd backend
cargo tauri build

# Packages created at:
# build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
# build/target/release/bundle/rpm/Cockpit-0.1.0-1.x86_64.rpm
```

### Testing Without Installing
```bash
cd backend
cargo tauri dev    # Hot-reload development mode
```

### Installing for Testing
```bash
# Clean previous installs
./cleanup-old-installs.sh

# Install
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb

# Verify
./verify-installation.sh

# Test
cockpit
```

## Common Workflows

### Update Installation
```bash
# Build new version
./build-complete.sh

# Clean old
./cleanup-old-installs.sh

# Install new
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
```

### Test Build
```bash
# Build
./build-complete.sh

# Verify package contents
dpkg -c build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb

# Test install in VM or:
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
./verify-installation.sh
```

### Distribute
```bash
# Build
./build-complete.sh

# Copy to dist/
./package-quick.sh

# Upload dist/*.deb and dist/*.rpm
```
