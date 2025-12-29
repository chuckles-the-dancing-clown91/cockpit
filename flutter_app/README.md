# Cockpit Flutter Scaffold

Prototype Flutter client that mirrors Cockpit’s desktop domains (ideas, writing, notes, research) with Material 3 theming and adaptive desktop layouts.

## Stack
- Flutter + Material 3 (`MaterialApp.router` with light/dark themes)
- Navigation via [`go_router`](https://pub.dev/packages/go_router) using a shell route to keep tab state alive
- State management via [`flutter_riverpod`](https://pub.dev/packages/flutter_riverpod)
- Backend adapter uses the same Tauri command protocol as the Rust backend (see `core/api`)

## Layout
- Navigation rail on wide screens, navigation bar on compact screens
- Domain scaffolds add responsive padding and consistent headers for desktop form factors
- Placeholder lists/grids for ideas, writings, notes, and research to map feature parity

## API layer
- `core/api/cockpit_api_client.dart` defines a `CockpitApiClient` interface with a `TauriCommandApiClient` implementation that calls the Rust commands via `MethodChannel`
- `lib/api/` adds a transport-agnostic `CockpitApi` wrapper for the new Rust HTTP bridge (`/api/command`) with domain services (`ideas`, `writings`, `notes`, `research`)
- Configure endpoints with `--dart-define` flags (defaults shown):
  - `COCKPIT_API_URL=http://localhost:1420`
  - `COCKPIT_COMMAND_PATH=/api/command`
  - `COCKPIT_USE_NATIVE=false` (set to `true` to prefer MethodChannel/FFI when bundled)
  - `COCKPIT_NATIVE_CHANNEL=cockpit.backend/commands`
- Example: `flutter run --dart-define=COCKPIT_API_URL=http://localhost:1420 --dart-define=COCKPIT_COMMAND_PATH=/api/command --dart-define=COCKPIT_ENV=dev`

## Getting started
1. Install Flutter (3.5+ recommended).
2. From `flutter_app/`, run `flutter pub get`.
3. Run the app with `flutter run -d macos`/`windows`/`linux` depending on your target.

The Flutter toolchain is not bundled in this repository; install it locally before running commands.
