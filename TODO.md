# Priority 1: Backend refactor and error handling
- Split backend into modules (config, errors, scheduler, news, commands) to reduce main.rs complexity.
- Centralize env/config loading (.env) for DB paths and keys; remove hard-coded paths.
- Add robust error handling using thiserror across scheduler/news/db access; surface clear startup errors.

# Priority 2: News subsystem (per news(1).txt)
- Schema updates: add news_sources table; extend news_settings (keywords, keywords_in_title, from_date/to_date, max_stored, arrays); extend news_articles fields (fetched_at, added_via, is_starred, is_dismissed, country/category JSON).
- API integration: support latest vs archive endpoints based on date range; include filters for language/country/sources/categories/keywords/qInTitle; parse country/category arrays; log HTTP status and body preview on errors.
- Sync tasks: add news_sources_sync daily task; ensure news_sync summary includes inserted/updated/total; prune beyond max_stored skipping starred/dismissed.
- Commands: list_news_sources (filters/search), sync_news_sources_now; update_news_settings (partial, parsing arrays/dates); list_news_articles with limit/offset/search/include_dismissed; toggle_star_news_article; dismiss_news_article; optional create_idea_for_article.
- Frontend: News modal right panel with country/provider/date/keywords filters and “Apply & Sync”; provider sync trigger; left panel cards with thumbnail/meta badges/actions (Review/Dismiss/Star); Article Details modal; local search + pagination; use useRunTaskNow(\"news_sync\") + commands above.

# Existing TODO
- Build a "Jobs" page: list scheduled, running, and completed runs with statuses, next run time, last run time, and actions (run now/enable/disable). Consider showing overlap skips and error counts.
- Implement NewsData sync handler using SeaORM tables (news_settings/news_articles) with rate limits and pruning.
- Add Tauri commands for news: get_news_settings, save_news_settings, list_news_articles (pagination/filter), dismiss_news_article, add_news_article_to_ideas, get_news_stats, sync_news_now.
- Add command/list view for system_task_runs to power the Jobs page (scheduled/running/history). Include overlap/skipped info.
