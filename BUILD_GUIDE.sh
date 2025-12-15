#!/usr/bin/env bash
# Quick Build Reference
# Common build commands for Cockpit development and distribution

set -e

cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║              Cockpit Build Commands                       ║
╚═══════════════════════════════════════════════════════════╝

DEVELOPMENT
-----------
./build.sh                     # Full development build (frontend + backend)
cd backend && cargo run        # Run backend in debug mode
cd frontend && npm run dev     # Run frontend dev server (hot reload)

DISTRIBUTION
------------
./package.sh                   # Build all distribution packages
                              # Output: dist/cockpit-*.tar.gz and *.deb

VERSION=0.2.0 ./package.sh    # Build with custom version

INSTALLATION
------------
# From tarball
tar -xzf cockpit-*.tar.gz
cd cockpit-*/
./install

# From .deb
sudo dpkg -i cockpit_*.deb

TESTING
-------
cd backend && cargo test       # Run backend tests
cd backend && cargo check      # Check for compilation errors
cd frontend && npm run build   # Build frontend for production
./build/target/release/cockpit # Run the built binary

CLEANING
--------
cd backend && cargo clean      # Clean Rust build artifacts
cd frontend && rm -rf dist/    # Clean frontend build
rm -rf build/ dist/            # Clean all build outputs

DEBUGGING
---------
cd backend && RUST_LOG=debug cargo run     # Debug mode with verbose logging
cd backend && cargo run 2>&1 | tee log.txt # Save output to file
./build/target/release/cockpit             # Run release binary directly

WORKSPACE MANAGEMENT
--------------------
./install.sh                   # Install to local system
./uninstall.sh                 # Remove from system (keeps ~/.cockpit)
rm -rf ~/.cockpit              # Remove all user data (CAREFUL!)

COMMON ISSUES
-------------
Error: "binary not found"
  → Run: ./build.sh (creates build/target/release/cockpit)

Error: "npm not found"
  → Install Node.js: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                      sudo apt install -y nodejs

Error: "missing tauri dependencies"
  → Install: sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev

Error: "database locked"
  → Kill running instance: pkill cockpit
                           rm ~/.cockpit/data/db.sql-shm ~/.cockpit/data/db.sql-wal

QUICK WORKFLOW
--------------
# 1. Make changes to code
# 2. Test in development
cd backend && cargo run

# 3. Build for distribution
./build.sh                     # Creates build/target/release/cockpit
./package.sh                   # Creates dist/ packages

# 4. Test binary directly
./build/target/release/cockpit

# 5. Test installation
cd dist
tar -xzf cockpit-*.tar.gz
cd cockpit-*/
./install

# 6. Launch and verify
cockpit

DOCUMENTATION
-------------
README.md           - Project overview and development guide
INSTALL.md          - End-user installation instructions
DISTRIBUTION.md     - Package building and release process
TODO.md             - Feature roadmap and task tracking

DIRECTORY STRUCTURE
-------------------
backend/            - Rust/Tauri backend
frontend/           - React/TypeScript frontend
build/              - Build artifacts (gitignored)
dist/               - Distribution packages (gitignored)
docs/               - Additional documentation
~/.cockpit/         - User data directory (on installed system)

EOF
