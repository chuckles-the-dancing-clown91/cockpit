# Package Building Guide

## TL;DR - Quick Start

```bash
# Build packages (production-ready)
cd backend
cargo tauri build

# Copy to dist/ folder
cd ..
./package-quick.sh

# Install
sudo dpkg -i dist/Cockpit_0.1.0_amd64.deb
```

## Understanding the Build System

Cockpit uses **Tauri's bundler** to create production-ready packages. Here's why:

### ✅ Use Tauri Bundler (Recommended)

**Location**: `build/target/release/bundle/`

```bash
cd backend
cargo tauri build
```

**What it creates:**
- `bundle/deb/Cockpit_0.1.0_amd64.deb` - Debian package
- `bundle/rpm/Cockpit-0.1.0-1.x86_64.rpm` - RPM package  
- Binary with production configuration (~/.cockpit paths)

**Why use this:**
- ✅ Production-ready binaries with correct paths
- ✅ Uses `~/.cockpit/` for all data
- ✅ Auto-generates encryption keys on first run
- ✅ Proper desktop integration
- ✅ All dependencies included

### ❌ DON'T Use package.sh (Legacy)

**Location**: `dist/` (when running `./package.sh`)

The `package.sh` script was an attempt to add professional features, but it copies already-compiled binaries that may have development paths baked in. This causes issues:

- ❌ May use development database paths
- ❌ Requires careful .env configuration
- ❌ Can fail silently with wrong paths

**Status**: Deprecated. Use Tauri's bundler instead.

## Recommended Workflow

### For Development

```bash
# Hot-reload development
cd backend
cargo tauri dev
```

### For Testing Builds

```bash
# Build without bundling (faster)
cd backend
cargo build --release

# Test the binary
../build/target/release/cockpit
```

### For Distribution

```bash
# Full production build with packages
cd backend
cargo tauri build

# Packages created in:
ls -lh ../build/target/release/bundle/deb/
ls -lh ../build/target/release/bundle/rpm/

# Optional: Copy to dist/ for easier access
cd ..
./package-quick.sh

# Now in dist/ folder for distribution
ls -lh dist/
```

## Distribution Checklist

Before distributing to users:

1. **Update version** in `backend/Cargo.toml` and `backend/tauri.conf.json`
2. **Build packages**: `cd backend && cargo tauri build`
3. **Test installation**:
   ```bash
   sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
   cockpit  # Launch and verify
   sudo apt remove cockpit  # Clean up
   ```
4. **Copy to dist**: `./package-quick.sh`
5. **Upload to release**: Use files from `dist/` folder

## File Locations Reference

### During Development
```
backend/storage/          # Development data
  ├── data/db.sql        # Dev database
  ├── logs/              # Dev logs
  └── .env               # Dev configuration (gitignored)
```

### After Production Install
```
~/.cockpit/              # Production data (auto-created)
  ├── data/db.sql       # Production database
  ├── logs/             # Production logs  
  ├── .env              # Auto-generated config
  ├── backups/          # Database backups
  ├── cache/            # Temporary cache
  └── exports/          # Data exports
```

### Build Artifacts
```
build/target/release/
  ├── cockpit                    # Main binary
  └── bundle/
      ├── deb/
      │   └── Cockpit_0.1.0_amd64.deb      # ✅ Use this
      └── rpm/
          └── Cockpit-0.1.0-1.x86_64.rpm   # ✅ Or this

dist/                             # Distribution folder (via package-quick.sh)
  ├── Cockpit_0.1.0_amd64.deb   # Copied from bundle/
  └── Cockpit_0.1.0_amd64.deb.sha256
```

## Troubleshooting

### "App doesn't appear in launcher"

You installed the wrong package. Use:
```bash
sudo apt remove cockpit
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
```

### "Command 'cockpit' not found"

After installing .deb:
```bash
which cockpit  # Should show: /usr/bin/cockpit
cockpit        # Launch
```

### "Database at wrong location"

The binary is using development paths. Ensure you're using Tauri-built packages:
```bash
# Check which package you installed
dpkg -l | grep cockpit

# Remove and reinstall correct one
sudo apt remove cockpit
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
```

### Build fails

```bash
# Clean build
cd backend
cargo clean
rm -rf ../build/target

# Rebuild
cargo tauri build
```

## Scripts Reference

| Script | Purpose | Use Case |
|--------|---------|----------|
| `cargo tauri build` | **Primary build command** | Production builds |
| `package-quick.sh` | Copy bundles to dist/ | Easier distribution |
| `package.sh` | ⚠️ Legacy/deprecated | Don't use |
| `build.sh` | ⚠️ Legacy/deprecated | Don't use |

## For CI/CD

```yaml
# GitHub Actions example
- name: Build Cockpit
  run: |
    cd backend
    cargo tauri build
    
- name: Upload Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: cockpit-packages
    path: |
      build/target/release/bundle/deb/*.deb
      build/target/release/bundle/rpm/*.rpm
```

## Summary

**✅ DO**: Use `cargo tauri build` for production packages  
**✅ DO**: Distribute files from `build/target/release/bundle/`  
**✅ DO**: Use `package-quick.sh` to copy to dist/  
**❌ DON'T**: Use `package.sh` (creates wrong binaries)  
**❌ DON'T**: Distribute development binaries  

---

**Questions?** Check [INSTALLATION_FIX.md](INSTALLATION_FIX.md) for common issues.

*Last Updated: December 14, 2025*
