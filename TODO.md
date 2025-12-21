# Active Tasks

Keep this lean. 
    Completed items live in `docs/DONE.md`. 
    Roadmap in `docs/ROADMAP.md`. 
    Sprint details in `docs/sprint_priorities.md`. 
    Patterns in `docs/references.md`.

---

## 🔥 Ideas View Port (from src-old)
- Fix IdeaDetailDialog visibility (BLOCKER)
- Multi-select (checkboxes + bulk ops)
- Inline status editing in cards
- NotesEditor integration (TipTap/markdown)
- Per-reference notes (inline)
- UI polish: badges, hover states, selection highlight

## 🔥 Research — Feed Sources + Stream (current)
- Stream UX: pagination/infinite scroll + loading skeletons
- Article actions: add backend support to **undo** (restore dismissed, mark unread) and wire UI
- Article detail: in-app viewer (Radix Dialog + WebviewModal) + “Copy/Convert to Reference” actions
- Source filtering: backfill older `news_articles` rows to the selected feed source; migrate to an explicit `feed_source_id` column (avoid string parsing)
- Sync feedback: surface per-source sync errors and last run results in Stream UI
- Data hygiene: map/display provider `source_name` consistently; handle `url == null` gracefully

## 🧭 Future (tracked in `docs/ROADMAP.md`)
- Research “connectors” pipeline (accounts/streams/items/publish) for Reddit/RSS/X/etc. and capability-gated publish flows
