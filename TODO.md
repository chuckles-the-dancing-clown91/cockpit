# TODO

## Backend
- Refactor into clearer modules (config, errors, scheduler, news, commands) and adopt `thiserror` for consistent startup/runtime errors.
- Harden NewsData parsing to tolerate variant field shapes (arrays vs strings for country/language/category) and add tests/fixtures around sync error handling.
- Expose system task run history via command + pagination (for Jobs page), including overlap/skip/error metadata.
- Optional: add `create_idea_for_article` command if still desired.

## Frontend
- Build a Jobs page: list scheduled tasks, running state, history, next/last run, enable/disable, and “run now”; surface overlap/skip/error counts.
- News UI polish: search/sort/filter sources/domains list, show sync result/status and call usage, and add error toasts on settings save/sync failures.
- Ideas integration (if kept): add “Add to ideas” action for articles.

## QA / Ops
- Integration tests around news sync and source sync (mocked responses), scheduler overlap guard, and pruning respecting stars/dismissals.
- Add lint/format hooks (ESLint/Prettier) and a simple CI check (fmt/test/build).
