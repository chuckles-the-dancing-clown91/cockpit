# Cockpit Scripts

This directory contains utility scripts for building, installing, and diagnosing Cockpit.

## 📁 Directory Structure

```
scripts/
├── build/       # Build and packaging scripts
├── install/     # Installation and cleanup scripts
└── diagnostic/  # Troubleshooting and verification tools
```

## 🔨 Build Scripts

**Location:** `scripts/build/`

### build.sh
Simple build wrapper for quick development builds.
```bash
./scripts/build/build.sh
```

### build-complete.sh
Comprehensive build script with validation and testing.
```bash
./scripts/build/build-complete.sh
```

### package.sh
Complete packaging script - builds .deb and .rpm packages with verification.
```bash
./scripts/build/package.sh
```

### package-quick.sh
Quick packaging for testing - skips some validation steps.
```bash
./scripts/build/package-quick.sh
```

### BUILD_GUIDE.sh
Interactive build guide script (demonstrates build process step-by-step).
```bash
./scripts/build/BUILD_GUIDE.sh
```

## 📦 Installation Scripts

**Location:** `scripts/install/`

### install.sh
Install Cockpit from built package.
```bash
sudo ./scripts/install/install.sh
```

### uninstall.sh
Completely remove Cockpit from the system.
```bash
sudo ./scripts/install/uninstall.sh
```

### cleanup-old-installs.sh
Clean up remnants from previous installations.
```bash
sudo ./scripts/install/cleanup-old-installs.sh
```

## 🔍 Diagnostic Scripts

**Location:** `scripts/diagnostic/`

### verify-installation.sh
Verify Cockpit installation integrity (9 checks).
```bash
./scripts/diagnostic/verify-installation.sh
```

Checks:
- Package installation status
- Desktop entry validity
- Icon installation (7 sizes)
- Binary functionality
- File permissions
- Cache status

### troubleshoot-icons.sh
Diagnose and fix icon display issues (especially for COSMIC DE).
```bash
./scripts/diagnostic/troubleshoot-icons.sh
```

Checks:
- Icon theme installation
- Cache freshness
- Desktop environment detection
- RGBA format verification
- Local override conflicts

## 🛠️ Backend Scripts

**Location:** `backend/`

### postinst.sh
Post-installation script (runs automatically after .deb install).
- Updates icon cache
- Refreshes desktop database
- Copies fallback icon to /usr/share/pixmaps/

### build-frontend.sh
Build frontend production bundle.
```bash
cd backend && ./build-frontend.sh
```

### dev-frontend.sh
Start frontend development server.
```bash
cd backend && ./dev-frontend.sh
```

## 🚀 Common Workflows

### Full Development Build
```bash
# Build backend + frontend
cd backend
cargo tauri dev
```

### Create Distribution Package
```bash
# Complete packaging with verification
./scripts/build/package.sh

# Quick package for testing
./scripts/build/package-quick.sh
```

### Install and Test
```bash
# Build package
cd backend && cargo tauri build

# Install
sudo ./scripts/install/install.sh

# Verify
./scripts/diagnostic/verify-installation.sh
```

### Troubleshoot Issues
```bash
# Check installation
./scripts/diagnostic/verify-installation.sh

# Fix icon issues
./scripts/diagnostic/troubleshoot-icons.sh

# Clean up old installs
sudo ./scripts/install/cleanup-old-installs.sh
```

## 📝 Notes

- **All build scripts** should be run from the cockpit root directory
- **Installation scripts** require sudo (modify system files)
- **Diagnostic scripts** can run without sudo
- **Backend scripts** should be run from the `backend/` directory

## 🔗 Related Documentation

- [BUILD_GUIDE.md](../docs/archive/BUILD_GUIDE.md) - Detailed build instructions
- [BUILD_PACKAGE_GUIDE.md](../docs/archive/BUILD_PACKAGE_GUIDE.md) - Package creation guide
- [INSTALLATION.md](../docs/archive/INSTALLATION.md) - User installation guide
- [ICON_TROUBLESHOOTING.md](../docs/archive/ICON_TROUBLESHOOTING.md) - Icon issue solutions
