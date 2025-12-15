# Cockpit Distribution Guide

Complete guide for building and distributing Cockpit packages with automated installation.

## Quick Start

```bash
# Build all distribution packages
./package.sh

# Output in dist/:
# - cockpit-0.1.0-linux-amd64.tar.gz (portable)
# - cockpit_0.1.0_amd64.deb (Debian/Ubuntu)
# - SHA256 checksums
```

## Building Packages

### Full Package Build

```bash
./package.sh
```

Creates:
1. **Tarball** - Portable `.tar.gz` with automated installer
2. **Debian Package** - `.deb` for apt-based systems
3. **Checksums** - SHA256 verification files

### Custom Version

```bash
VERSION=0.2.0 ARCH=amd64 ./package.sh
```

## Installation Methods

### Method 1: Tarball (Any Linux)

**Distribution:**
```bash
tar -xzf cockpit-0.1.0-linux-amd64.tar.gz
cd cockpit-0.1.0-linux-amd64
./install
```

**What it does automatically:**
- ✅ Generates 256-bit master encryption key
- ✅ Creates ~/.cockpit/ directory structure
- ✅ Installs binary to /usr/local/bin/cockpit
- ✅ Sets up desktop integration
- ✅ No configuration required

### Method 2: Debian Package

**Distribution:**
```bash
sudo dpkg -i cockpit_0.1.0_amd64.deb
sudo apt-get install -f  # Install dependencies if needed
```

**First run automatically:**
- ✅ Generates master key
- ✅ Creates user directories
- ✅ Initializes database with 21 default settings
- ✅ Starts with zero configuration

## Automated Setup Flow

### Installation Phase (install.sh)

1. **Master Key Generation**
   ```bash
   openssl rand -hex 32  # 256-bit encryption key
   ```

2. **Directory Creation**
   ```
   ~/.cockpit/
   ├── .env              # Configuration with master key
   ├── data/             # SQLite database
   ├── logs/             # Application logs
   ├── cache/            # Temporary cache
   ├── backups/          # Database backups
   └── exports/          # Export files
   ```

3. **Configuration Setup**
   - Writes DATABASE_URL, STORAGE_ROOT, LOGS_DIR
   - Sets COCKPIT_MASTER_KEY (generated)
   - Applies 600 permissions (user-only access)

4. **Desktop Integration**
   - Binary → /usr/local/bin/cockpit
   - Desktop entry → ~/.local/share/applications/
   - Icons → ~/.local/share/icons/hicolor/

### First Launch (Automatic)

1. **Environment Loading** - Loads ~/.cockpit/.env
2. **Database Creation** - SQLite at ~/.cockpit/data/db.sql
3. **Schema Migrations** - 3 migrations (schema, settings, indexes)
4. **Default Settings** - 21 settings inserted via migration
5. **Task Scheduler** - Background jobs for news sync
6. **Main Window** - Application ready to use

**Total time:** < 5 seconds, zero user interaction

## Testing Installation

### VM Testing Checklist

**Ubuntu 22.04:**
```bash
# 1. Install dependencies
sudo apt install openssl

# 2. Test tarball
tar -xzf cockpit-0.1.0-linux-amd64.tar.gz
cd cockpit-0.1.0-linux-amd64
./install

# 3. Verify
ls -la ~/.cockpit/
cat ~/.cockpit/.env | grep COCKPIT_MASTER_KEY
sqlite3 ~/.cockpit/data/db.sql "SELECT COUNT(*) FROM app_settings"

# 4. Launch
cockpit
```

**Expected results:**
- Master key: 64 hex characters
- Database: 21 settings
- App launches without errors

## Version Management

Update before release:
- `backend/Cargo.toml` → `version = "0.2.0"`
- `backend/tauri.conf.json` → `"version": "0.2.0"`
- `frontend/package.json` → `"version": "0.2.0"`
- Or set: `VERSION=0.2.0 ./package.sh`

## Package Contents

### Tarball Structure
```
cockpit-0.1.0-linux-amd64/
├── install              # User-facing installer
├── README.txt          # Quick start guide
├── bin/cockpit         # Binary
├── icons/              # Application icons
└── scripts/
    ├── install.sh      # Installation logic
    └── uninstall.sh    # Removal script
```

### Debian Package
```
usr/bin/cockpit                          # Binary
usr/share/applications/cockpit.desktop   # Launcher
usr/share/icons/hicolor/*/apps/          # Icons
usr/share/doc/cockpit/                   # Documentation
```

## Release Process

1. **Update version** in Cargo.toml, tauri.conf.json, package.json
2. **Build packages**: `./package.sh`
3. **Test on clean VM** (Ubuntu + Debian)
4. **Create git tag**: `git tag -a v0.1.0 -m "Release v0.1.0"`
5. **Push tag**: `git push origin v0.1.0`
6. **GitHub Release**:
   - Upload `.tar.gz` + `.deb` + checksums
   - Copy release notes from CHANGELOG.md

## Security

- **Master Key**: 256-bit, cryptographically secure (openssl)
- **File Permissions**: .env is 600 (user read/write only)
- **API Keys**: Encrypted in database with AES-256-GCM
- **Checksums**: SHA256 provided for package verification

## Troubleshooting

**Binary not found:**
```bash
cd backend && cargo tauri build
```

**Missing dependencies:**
```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev
```

**dpkg-deb not found:**
```bash
sudo apt install dpkg-dev
```

## Future: APT Repository

For `apt install cockpit`:

1. Set up repository server
2. Sign packages with GPG
3. Create Release/Packages files
4. Users add repository:
   ```bash
   curl -fsSL https://repo.example.com/key.gpg | sudo apt-key add -
   sudo add-apt-repository "deb https://repo.example.com stable main"
   sudo apt install cockpit
   ```

## Support

- GitHub: https://github.com/yourusername/cockpit
- Issues: https://github.com/yourusername/cockpit/issues
- Docs: INSTALL.md, README.md
