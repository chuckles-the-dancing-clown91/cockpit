//! News feed management module
//! 
//! Handles NewsData.io integration for fetching and managing news articles.
//! Organized by responsibility:
//! - **entities**: Database entity models (articles, settings, sources)
//! - **types**: Shared DTOs and API response structures
//! - **settings**: News settings management (API keys, filters, quotas)
//! - **articles**: Article CRUD operations (list, get, dismiss, star, read)
//! - **sources**: News source management and syncing
//! - **sync**: News article syncing from API with rate limiting

pub mod entities;
pub mod types;
pub mod settings;
pub mod articles;
pub mod sources;
pub mod sync;

// Re-export public APIs
pub use types::{
    NewsArticleDto,
    NewsSettingsDto,
    SaveNewsSettingsInput,
    NewsSourceDto,
};

pub use settings::{
    get_news_settings_handler,
    save_news_settings_handler,
};

pub use articles::{
    list_news_articles_handler,
    get_news_article_handler,
    dismiss_news_article_handler,
    toggle_star_news_article_handler,
    mark_news_article_read_handler,
};

pub use sources::{
    list_news_sources_handler,
    sync_news_sources_now_handler,
    run_news_sources_sync_task,
};

pub use sync::{
    sync_news_now_handler,
    run_news_sync_task,
};
