# Cockpit - Installation Guide

A modern desktop productivity suite for content creators, researchers, and digital architects.

## System Requirements

- **Linux**: Ubuntu 20.04+, Fedora 35+, or equivalent
- **macOS**: 11.0 (Big Sur) or later
- **Windows**: Windows 10 or later
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application + user data

## Quick Install (Linux)

```bash
# 1. Download and extract the release
tar -xzf cockpit-v0.1.0-linux.tar.gz
cd cockpit-v0.1.0-linux

# 2. Run the installer (fully automated)
./install.sh

# 3. Launch Cockpit
cockpit
```

**That's it!** The installer automatically:
- ✅ Generates a secure 256-bit master key
- ✅ Creates the `~/.cockpit/` directory structure
- ✅ Sets up configuration with secure permissions
- ✅ Installs desktop integration

Or search for "Cockpit" in your application launcher.

## What Gets Installed

### Application Files
- **Binary**: `/usr/local/bin/cockpit` (or `/usr/bin` if installed as root)
- **Desktop Entry**: `~/.local/share/applications/cockpit.desktop`
- **Icons**: `~/.local/share/icons/hicolor/{32x32,128x128}/apps/cockpit.png`

### User Data Directory (`~/.cockpit/`)
```
~/.cockpit/
├── .env              # Configuration file (IMPORTANT: Set your keys here!)
├── data/             # SQLite database
│   └── db.sql
├── logs/             # Application logs
│   ├── app.log
│   ├── api_calls.log
│   └── errors.log
├── backups/          # Database backups
├── exports/          # Exported data (JSON, logs)
├── cache/            # Temporary cache
└── icons/            # Default application icons
```

## Configuration

### Automatic Configuration (Done by Installer)

The installer automatically generates and configures:

1. **COCKPIT_MASTER_KEY** (Auto-generated ✅)
   - 256-bit encryption key for securing API credentials
   - Generated using `openssl rand -hex 32`
   - Stored in `~/.cockpit/.env` with 600 permissions
   - **Location**: `~/.cockpit/.env`
   - **Backup**: Store your master key securely if you reinstall!

2. **Storage Paths** (Auto-configured ✅)
   ```bash
   DATABASE_URL=sqlite:~/.cockpit/data/db.sql
   STORAGE_ROOT=~/.cockpit
   LOGS_DIR=~/.cockpit/logs
   ```

3. **Default Settings** (Created on first launch ✅)
   - Theme: Dark
   - Language: English
   - Auto-save: Enabled
   - News fetch interval: 1 hour
   - Log level: Info
   - Storage limit: 50 GB

### Optional Configuration

Configure in the **Settings** view after first launch:

- **NEWSDATA_API_KEY**: For news aggregation ([Get free key](https://newsdata.io/))
- **LOG_LEVEL**: `debug`, `info`, `warn`, `error`
- **STORAGE_MAX_SIZE_GB**: Maximum storage size
- **Theme**: Light or Dark mode
- **Auto-save interval**: Content autosave frequency

**Note**: You can also manually edit `~/.cockpit/.env`, but the Settings UI is recommended.

## First Launch

On first run, Cockpit **automatically**:

1. ✅ Detects first-run status
2. ✅ Creates SQLite database with proper schema
3. ✅ Initializes 12 default settings across all categories
4. ✅ Sets up the task scheduler for news fetching
5. ✅ Shows a brief setup progress screen

The app will be **ready to use in seconds** - no wizard, no forms, no configuration required!

### What You'll See

During first launch:
- 🔐 **"Initializing encryption..."** - Loading master key
- 💾 **"Creating database..."** - Setting up SQLite
- ⚙️ **"Finalizing setup..."** - Creating default settings

Then the main app loads immediately.

## Features

### 📝 Writing Mode
- Markdown editor with LaTeX support
- Ideas library with priority tracking
- Archive management

### 📰 Research Mode
- News aggregation from multiple sources
- Article management (star, read, dismiss)
- Source configuration

### ⚙️ System Mode
- Settings management
- Database backups and exports
- Log viewer with filtering
- Task scheduler (automated news syncing)

### 🎨 Themes
- Dark (default)
- Cyberpunk
- Light

## Troubleshooting

### App won't start

**Check your master key:**
```bash
# Verify COCKPIT_MASTER_KEY is 64 hex characters
cat ~/.cockpit/.env | grep COCKPIT_MASTER_KEY
```

**Generate a new key if needed:**
```bash
openssl rand -hex 32
```

**Run with debug logging:**
```bash
RUST_LOG=debug cockpit
```

### Permission denied errors

The app needs write access to `~/.cockpit/`:
```bash
# Check permissions
ls -la ~/.cockpit

# Fix if needed
chmod -R u+rwX ~/.cockpit
```

### Database errors

**Create a backup first:**
```bash
cp ~/.cockpit/data/db.sql ~/.cockpit/data/db.sql.backup
```

**Reset database (will lose data):**
```bash
rm ~/.cockpit/data/db.sql
cockpit  # Will create fresh database
```

**Restore from backup:**
Use the Storage view in the app, or:
```bash
cp ~/.cockpit/backups/backup_YYYYMMDD_HHMMSS.sql ~/.cockpit/data/db.sql
```

## Uninstall

```bash
# Run the uninstall script
./uninstall.sh

# Removes app, keeps your data
# Or to remove data as well, answer 'Y' when prompted
```

**Manual cleanup:**
```bash
# Remove application
sudo rm /usr/local/bin/cockpit
rm ~/.local/share/applications/cockpit.desktop
rm ~/.local/share/icons/hicolor/*/apps/cockpit.png

# Remove user data (optional)
rm -rf ~/.cockpit
```

## Security Notes

1. **Master Key**: Your `COCKPIT_MASTER_KEY` encrypts all API keys stored in the database. **Never share this key** and keep it secure.

2. **File Permissions**: The `.env` file is automatically set to `600` (owner read/write only).

3. **API Keys**: All API keys (NewsData, etc.) are encrypted with AES-256-GCM before storage.

4. **Backups**: Database backups contain encrypted API keys. Keep backups secure.

## Getting Help

- **Documentation**: See included `README.md` for development guide
- **Issues**: Report bugs at [project repository]
- **Logs**: Check `~/.cockpit/logs/app.log` for error details

## Building from Source

```bash
# Clone repository
git clone [repository-url]
cd cockpit

# Install dependencies
cd frontend && npm install
cd ../backend

# Build
cargo tauri build

# Install
cd .. && ./install.sh
```

See main `README.md` for detailed build instructions.

## License

MIT License - See LICENSE file for details

---

**Version**: 0.1.0  
**Updated**: December 2025
