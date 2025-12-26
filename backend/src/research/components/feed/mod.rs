//! News feed management module
//! 
//! Plugin-based feed aggregation system supporting multiple sources.
//! Organized by responsibility:
//! - **entities**: Database entity models (articles, feed_sources, settings, sources)
//! - **types**: Shared DTOs and API response structures
//! - **plugin**: Feed source plugin trait and registry
//! - **plugins**: Feed source plugin implementations (NewsData, Reddit, RSS, etc.)
//! - **settings**: News settings management (API keys, filters, quotas)
//! - **articles**: Article CRUD operations (list, get, dismiss, star, read)
//! - **sources**: News source management and syncing (outlets like CNN, BBC, etc.)
//! - **sync**: News article syncing from API with rate limiting

pub mod entities;
pub mod types;
pub mod plugin;
pub mod plugins;
pub mod feed_sources;
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
    clear_news_articles_handler,
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

// Feed source management
pub use feed_sources::{
    list_feed_sources_handler,
    get_feed_source_handler,
    create_feed_source_handler,
    update_feed_source_handler,
    delete_feed_source_handler,
    toggle_feed_source_handler,
    test_feed_source_connection_handler,
    sync_feed_source_now_handler,
    sync_all_feed_sources_handler,
    run_feed_source_sync_task,
    run_feed_sources_sync_all_task,
};

// Feed source types already exported above from types module
pub use types::{
    FeedSourceDto,
    CreateFeedSourceInput,
    UpdateFeedSourceInput,
    SyncSourceResult,
    SyncAllResult,
};
