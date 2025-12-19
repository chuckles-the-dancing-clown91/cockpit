# Copilot Drift Guard (quick)

- NEW UI goes in /frontend/src/features/** (domains are thin screens only)
- Only /frontend/src/core/api/tauri.ts may call `invoke()`
- Shared DTO/types only in /frontend/src/shared/types/**
- SeaORM migrations only (no .sql)
- Radix Themes components first; Tailwind only to supplement layout
- Never return IDs if UI needs objects; return DTOs instead
