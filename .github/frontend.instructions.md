---
applyTo: "frontend/**"
---

# Frontend Instructions (React + TS + Radix)

## Use existing providers
- TanStack Query provider is already wired. Do not create new QueryClient instances.
- Toast helper lives under `frontend/src/core/lib`.

## Data fetching rules
- `features/<feature>/api/*` wraps `invoke`.
- `features/<feature>/hooks/*` owns query keys + invalidation.
- Components do not call `invoke` directly.

## UI rules
- Use Radix Themes components for layout and forms.
- Use Radix Primitives for Toolbar, Dialog, Accordion when needed.
- Do not hardcode colors; use theme tokens / CSS vars.

## Writing workspace layout
- 1/4 left panel, 1/2 editor, 1/4 metadata.
- Left panel reuses Ideas + References features; do not rewrite idea lists.
