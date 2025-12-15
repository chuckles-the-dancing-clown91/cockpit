//! Feed source plugin implementations
//!
//! Each module contains a specific feed source plugin:
//! - newsdata: NewsData.io API integration
//! - reddit: Reddit API integration (future)
//! - rss: RSS feed parser (future)
//! - twitter: Twitter/X API integration (future)

pub mod newsdata;

// Re-export plugins for easy access
pub use newsdata::NewsDataPlugin;
