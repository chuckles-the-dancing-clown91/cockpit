#!/bin/bash
# Portable frontend build script for Tauri

# Find project root by looking for backend/Cargo.toml
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo "Error: Could not find frontend/package.json at $FRONTEND_DIR"
    exit 1
fi

echo "Building frontend at: $FRONTEND_DIR"
cd "$FRONTEND_DIR" && npm run build
