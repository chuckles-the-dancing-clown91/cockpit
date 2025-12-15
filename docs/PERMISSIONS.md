# Tauri ACL Permissions Documentation

**Last Updated**: December 14, 2025  
**File**: `backend/capabilities/default.json`

This document explains why each permission is granted to the Cockpit application, following the **principle of least privilege**.

---

## Core Permissions

### `core:default`
**Purpose**: Basic Tauri runtime functionality  
**Justification**: Required for application lifecycle management (initialization, shutdown)  
**Risk Level**: Low - Standard Tauri baseline

### `core:window:default`
**Purpose**: Basic window management capabilities  
**Justification**: Required for window show/hide, focus, minimize operations  
**Risk Level**: Low - No system access, UI-only

### `core:window:allow-set-title`
**Purpose**: Update window title dynamically  
**Justification**: Used to show current mode (Writing, Research, System) in title bar  
**Usage**: Updates title to reflect user's current context  
**Risk Level**: Low - Visual only, no system impact

### `core:window:allow-close`
**Purpose**: Allow application to close window programmatically  
**Justification**: Required for "Exit" menu item and keyboard shortcuts (Ctrl+Q)  
**Usage**: Clean shutdown with database connection closure  
**Risk Level**: Low - Standard exit behavior

### `core:event:default`
**Purpose**: Tauri event system for frontend-backend communication  
**Justification**: Required for task execution notifications, log updates, real-time UI updates  
**Usage**: Emit events when tasks complete, logs update, or data changes  
**Risk Level**: Low - Internal IPC only, no external communication

---

## Dialog Permissions

### `dialog:default`
**Purpose**: Basic file dialog functionality  
**Justification**: Required for export/import features (database, logs, ideas)  
**Risk Level**: Medium - User explicitly initiates, sandboxed to user-selected paths

### `dialog:allow-open`
**Purpose**: Show "Open File" dialogs  
**Justification**: Used for:
  - Import database from backup
  - Import ideas from JSON
  - Select log file for export
**Usage**: User-initiated only, returns path user explicitly selects  
**Risk Level**: Medium - Read-only access to user-selected files

### `dialog:allow-save`
**Purpose**: Show "Save File" dialogs  
**Justification**: Used for:
  - Export database to JSON
  - Export logs to text file
  - Create database backups
  - Export ideas collection
**Usage**: User-initiated only, writes only to user-selected location  
**Risk Level**: Medium - Write access only where user explicitly grants

---

## Permissions NOT Granted (Security by Design)

### ❌ File System Access
**Not Granted**: `fs:*` permissions  
**Reason**: All file operations go through Rust backend with controlled paths  
**Security**: Prevents arbitrary file system access from frontend

### ❌ HTTP/Network Access
**Not Granted**: `http:*` permissions  
**Reason**: All HTTP requests handled by Rust backend with reqwest crate  
**Security**: CSP restricts network to `https://newsdata.io` only

### ❌ Shell Access
**Not Granted**: `shell:*` permissions  
**Reason**: No shell commands executed from frontend  
**Security**: Prevents command injection attacks

### ❌ System Tray
**Not Granted**: `tray:*` permissions  
**Reason**: Application uses standard window, no system tray integration  
**Security**: Reduces attack surface

### ❌ Clipboard Access
**Not Granted**: `clipboard:*` permissions  
**Reason**: Not required for current functionality  
**Security**: Prevents clipboard snooping

### ❌ Notification Access
**Not Granted**: `notification:*` permissions  
**Reason**: Uses in-app toast notifications instead  
**Security**: No OS-level notification spam

---

## Platform-Specific Considerations

### Linux
- Dialog uses GTK or Qt depending on desktop environment
- All permissions work through native Linux APIs
- Sandboxed in Tauri container

### macOS (Future)
- Will require code signing for distribution
- App Sandbox entitlements needed for App Store
- File access requires user permission via NSOpenPanel

### Windows (Future)
- Uses Win32 common dialogs
- UAC prompts for sensitive operations
- No registry access needed

---

## Security Boundaries

### Frontend (React/TypeScript)
- **Cannot**: Access file system directly
- **Cannot**: Make arbitrary HTTP requests
- **Cannot**: Execute shell commands
- **Can**: Call whitelisted Tauri commands
- **Restricted**: CSP prevents inline scripts, external resources

### Backend (Rust)
- **Full Access**: File system via controlled paths (`storage/` directory)
- **Full Access**: HTTP requests (limited to NewsData API by configuration)
- **Full Access**: SQLite database operations
- **No Access**: Arbitrary shell command execution
- **Encrypted**: API keys stored with AES-256-GCM

---

## Audit Trail

All permission-using operations are logged:
- File dialogs: Logged in `app.log` with selected paths
- Window operations: Logged with INFO level
- Event emissions: Logged with event type and data

---

## Review Schedule

- **Next Review**: After implementing Tasks #12-13 (production fixes)
- **Frequency**: Every major feature addition
- **Trigger**: Any new Tauri command that requires permissions
- **Process**: 
  1. Identify minimum required permissions
  2. Document justification in this file
  3. Test with restricted permissions first
  4. Add to `capabilities/default.json` only if necessary

---

## References

- [Tauri Security Documentation](https://tauri.app/v2/security/)
- [Tauri Permissions Reference](https://tauri.app/v2/reference/config/#permissions)
- [OWASP Least Privilege](https://owasp.org/www-community/Access_Control)
