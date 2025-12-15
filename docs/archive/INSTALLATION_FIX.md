# Cockpit Installation Fix

## Problem
After installing the .deb package, cockpit doesn't appear in the app launcher or running `cockpit` from terminal doesn't show a window.

## Root Cause
There are **two different .deb packages** created during the build process:

1. ❌ **`dist/cockpit_0.1.0_amd64.deb`** - Created by `package.sh`
   - Contains development binary with wrong paths
   - Uses `backend/storage/data/db.sql` instead of `~/.cockpit/`
   - Won't work correctly when installed

2. ✅ **`build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb`** - Created by Tauri bundler
   - Contains properly configured production binary
   - Uses `~/.cockpit/` for all data
   - Works correctly

## Solution

### Step 1: Remove Incorrect Installation
```bash
sudo apt remove cockpit -y
# Or if you used purge:
sudo apt purge cockpit -y
```

### Step 2: Install Correct Package
```bash
# Use the Tauri-built package (note the capital C in Cockpit_)
sudo dpkg -i build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb
```

### Step 3: Launch Cockpit
```bash
# From terminal
cockpit

# Or search for "Cockpit" in your application launcher
```

### Step 4: Verify It's Running Correctly
```bash
# Check if it's using the correct data directory
ls -la ~/.cockpit/
# You should see: data/, logs/, backups/, cache/, exports/, .env

# Check the process
ps aux | grep cockpit
```

## Why package.sh Exists

The `package.sh` script was created to add professional packaging features:
- Automated version extraction
- Man pages
- Copyright files
- Changelog
- Enhanced desktop entries

However, it copies the binary AFTER it's already been built, which means it captures development paths.

## Future Fix

To properly use `package.sh` features, we need to:

1. **Option A**: Modify `package.sh` to use Tauri's .deb as a base and enhance it
2. **Option B**: Add the professional features directly to Tauri's bundler configuration
3. **Option C**: Keep using Tauri's bundler and document that `package.sh` is for reference only

For now, **always use the Tauri-built packages** from `build/target/release/bundle/deb/`.

## Quick Reference

### Correct Build Process
```bash
# 1. Build with Tauri (creates proper production binary)
cd backend
cargo tauri build

# 2. Install the Tauri-built package
sudo dpkg -i ../build/target/release/bundle/deb/Cockpit_0.1.0_amd64.deb

# 3. Launch
cockpit
```

### Distribution
When distributing to users, provide:
- **`Cockpit_0.1.0_amd64.deb`** from `build/target/release/bundle/deb/`
- **NOT** `cockpit_0.1.0_amd64.deb` from `dist/`

---

**Updated:** December 14, 2025
