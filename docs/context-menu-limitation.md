# Custom Context Menu Limitation in External Webviews

## Problem
Cannot inject custom JavaScript (including context menus) into external websites loaded in Tauri WebviewWindows due to cross-origin security restrictions.

## What We Tried
1. **Backend script injection** via `initialization_script()` - Failed, cross-origin blocks execution
2. **Frontend script injection** via `webviewWindow.eval()` - Failed, same security policy
3. **Separate Window + Webview** - Failed, same restrictions apply

## Root Cause
Browsers and Tauri webviews enforce **Content Security Policy (CSP)** and **Cross-Origin Resource Sharing (CORS)** that prevent:
- Injecting scripts into pages from different origins
- Accessing DOM of external pages
- Overriding native context menus on external content

## Solution
**Two-Pane Dialog Approach**:
- Left pane: iframe displaying the external article (read-only)
- Right pane: Notes panel where users can manually copy/paste highlights
- Users select text in iframe and manually add to notes panel
- No script injection needed, works with all external URLs

## Implementation
See `frontend/src/writing/components/editor/ArticleModal.tsx` for the two-pane dialog implementation using Radix UI Dialog.

## Date
December 17, 2025
