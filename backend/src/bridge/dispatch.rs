use crate::core::commands::CurrentUser;
use crate::core::components::events::EventEmitter;
use crate::core::components::setup_wizard::SetupConfig;
use crate::core::components::storage::StorageStats;
use crate::research::components::feed::{
    CreateFeedSourceInput, FeedSourceDto, NewsArticleDto, NewsSettingsDto, NewsSourceDto,
    SaveNewsSettingsInput, SyncAllResult, SyncSourceResult, UpdateFeedSourceInput,
};
use crate::research::components::reader::{
    ClipCreateInput, ReaderClipDto, ReaderFetchInput, ReaderReferenceDto, ReaderRefreshInput,
    ReaderResult, ReaderSnapshotDto, ReferenceUpdateInput,
};
use crate::research::dto::{
    CreateResearchAccountInput, ListResearchItemsQuery, ResearchAccountDto, ResearchItemDto,
    ResearchStreamDto, UpdateResearchAccountInput, UpsertResearchStreamInput,
};
use crate::system::components::scheduler::{
    RunTaskNowResult, SystemTaskDto, TaskRunDto, UpdateTaskInput,
};
use crate::writing::components::ideas::{
    AddReferenceInput, CreateIdeaForArticleInput, CreateIdeaInput, IdeaDto, IdeaReferenceDto,
    LinkIdeaReferenceInput, ReaderSnapshotInput, ReferenceReaderSnapshotDto,
    UpdateIdeaArticleInput, UpdateIdeaMetadataInput, UpdateIdeaNotesInput,
    UpdateReferenceNotesInput,
};
use crate::writing::components::knowledge_graph::entities::writings;
use crate::writing::components::knowledge_graph::{
    CreateNoteInput, CreateReferenceInput, CreateWritingInput, LinkWritingIdeaInput, NoteDto,
    ReferenceDto, UpdateNoteInput, UpdateReferenceInput, UpdateWritingInput, WritingDto,
};
use crate::writing::dto::{
    CreateWritingDraftInput, GetWritingInput, LinkIdeaInput, ListLinkedIdeasInput,
    ListWritingsQuery, PublishWritingInput, SaveDraftInput, UpdateWritingDraftMetaInput,
    WritingDraftDto,
};
use crate::writing::text;
use crate::AppState;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone)]
pub struct BridgeContext {
    pub state: Arc<AppState>,
    pub emitter: Arc<dyn EventEmitter>,
}

#[derive(Debug, Deserialize)]
pub struct CommandRequest {
    pub command: String,
    #[serde(default)]
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct CommandResponse {
    pub result: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub message: String,
}

#[derive(thiserror::Error, Debug)]
pub enum ApiError {
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("handler error: {0}")]
    Handler(String),
    #[error("serialization error: {0}")]
    Serde(String),
}

impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::Serde(err.to_string())
    }
}

fn parse_payload<T: DeserializeOwned>(payload: Option<Value>) -> Result<T, ApiError> {
    match payload {
        Some(v) => serde_json::from_value(v).map_err(ApiError::from),
        None => serde_json::from_value(Value::Null).map_err(ApiError::from),
    }
}

fn into_value<T: Serialize>(data: T) -> Result<Value, ApiError> {
    serde_json::to_value(data).map_err(|e| ApiError::Serde(e.to_string()))
}

fn handler_err<E: ToString>(err: E) -> ApiError {
    ApiError::Handler(err.to_string())
}

/// Dispatch incoming command into the existing domain handlers.
pub async fn dispatch(
    command: &str,
    payload: Option<Value>,
    ctx: &BridgeContext,
) -> Result<Value, ApiError> {
    match command {
        // ---------- Core / Setup ----------
        "get_current_user" => {
            let res: Result<CurrentUser, String> = crate::core::commands::get_current_user().await;
            into_value(res.map_err(handler_err)?)
        }
        "get_system_user" => into_value(crate::util::commands::get_system_user()),
        "log_frontend_error" => {
            #[derive(Deserialize)]
            struct Input {
                message: String,
                stack: String,
                component_stack: String,
                action: Option<String>,
                metadata: Option<String>,
                severity: Option<String>,
                timestamp: String,
            }
            let input: Input = parse_payload(payload)?;
            Ok(crate::util::commands::log_frontend_error(
                input.message,
                input.stack,
                input.component_stack,
                input.action,
                input.metadata,
                input.severity,
                input.timestamp,
            )
            .into())
        }
        "get_app_settings" => {
            let data = crate::core::components::settings::get_app_settings_handler(&ctx.state.db)
                .await
                .map_err(handler_err)?;
            into_value(data)
        }
        "update_setting" => {
            let input: crate::core::components::settings::UpdateSettingInput =
                parse_payload(payload)?;
            crate::core::components::settings::update_setting_handler(&ctx.state.db, input)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "update_settings" => {
            let input: Vec<crate::core::components::settings::UpdateSettingInput> =
                parse_payload(payload)?;
            crate::core::components::settings::update_settings_handler(&ctx.state.db, input)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "get_storage_statistics" => {
            let stats: StorageStats =
                crate::core::components::storage::get_storage_stats(&ctx.state.config.storage)
                    .map_err(handler_err)?;
            into_value(stats)
        }
        "create_database_backup" => {
            let info = crate::core::components::storage::backup_database(
                &ctx.state.db,
                &ctx.state.config.storage,
            )
            .await
            .map_err(handler_err)?;
            into_value(info)
        }
        "restore_database_from_backup" => {
            #[derive(Deserialize)]
            struct Input {
                backup_path: String,
            }
            let input: Input = parse_payload(payload)?;
            crate::core::components::storage::restore_database(
                &ctx.state.db,
                &input.backup_path,
                &ctx.state.config.storage,
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "list_database_backups" => {
            let backups = crate::core::components::storage::list_backups(&ctx.state.config.storage)
                .map_err(handler_err)?;
            into_value(backups)
        }
        "delete_database_backup" => {
            #[derive(Deserialize)]
            struct Input {
                backup_path: String,
            }
            let input: Input = parse_payload(payload)?;
            crate::core::components::storage::delete_backup(
                &ctx.state.config.storage,
                &input.backup_path,
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "export_database" => {
            let info = crate::core::components::storage::export_data(
                &ctx.state.db,
                &ctx.state.config.storage,
            )
            .await
            .map_err(handler_err)?;
            into_value(info)
        }
        "import_database" => {
            #[derive(Deserialize)]
            struct Input {
                import_path: String,
            }
            let input: Input = parse_payload(payload)?;
            let summary =
                crate::core::components::storage::import_data(&ctx.state.db, &input.import_path)
                    .await
                    .map_err(handler_err)?;
            into_value(summary)
        }
        "cleanup_logs" => {
            #[derive(Deserialize)]
            struct Input {
                retention_days: Option<i64>,
            }
            let input: Input = parse_payload(payload)?;
            let result = crate::core::components::storage::cleanup_old_logs(
                &ctx.state.config.storage,
                input.retention_days,
            )
            .map_err(handler_err)?;
            into_value(result)
        }
        "cleanup_news" => {
            #[derive(Deserialize)]
            struct Input {
                retention_days: Option<i64>,
            }
            let input: Input = parse_payload(payload)?;
            let result = crate::core::components::storage::cleanup_old_news(
                &ctx.state.db,
                input.retention_days,
            )
            .await
            .map_err(handler_err)?;
            into_value(result)
        }
        "get_application_logs" => {
            #[derive(Deserialize)]
            struct Input {
                level_filter: Option<String>,
                limit: Option<usize>,
                offset: Option<usize>,
            }
            let input: Input = parse_payload(payload)?;
            let logs = crate::core::components::storage::get_logs(
                &ctx.state.config.storage,
                input.level_filter,
                input.limit,
                input.offset,
            )
            .map_err(handler_err)?;
            into_value(logs)
        }
        "get_application_log_stats" => {
            let stats = crate::core::components::storage::get_log_stats(&ctx.state.config.storage)
                .map_err(handler_err)?;
            into_value(stats)
        }
        "export_application_logs" => {
            #[derive(Deserialize)]
            struct Input {
                level_filter: Option<String>,
            }
            let input: Input = parse_payload(payload)?;
            let path = crate::core::components::storage::export_logs(
                &ctx.state.config.storage,
                input.level_filter,
            )
            .map_err(handler_err)?;
            into_value(path)
        }
        "clear_application_logs" => {
            let result =
                crate::core::components::storage::clear_logs(&ctx.state.config.storage, None)
                    .map_err(handler_err)?;
            into_value(result)
        }
        "check_setup_status_command" => {
            let status =
                crate::core::components::setup_wizard::check_setup_status().map_err(handler_err)?;
            into_value(status)
        }
        "generate_master_key_command" => {
            into_value(crate::core::components::setup_wizard::generate_master_key())
        }
        "save_setup_config_command" => {
            let cfg: SetupConfig = parse_payload(payload)?;
            crate::core::components::setup_wizard::save_setup_config(cfg).map_err(handler_err)?;
            into_value("ok")
        }
        "get_mixed_feed" => {
            let result = crate::util::commands::get_mixed_feed(None);
            into_value(result)
        }
        "get_upcoming_events" => {
            let events = crate::util::commands::get_upcoming_events(None);
            into_value(events)
        }
        "list_scheduled_jobs" => into_value(crate::util::commands::list_scheduled_jobs()),
        "sync_calendar" => {
            crate::util::commands::sync_calendar().map_err(handler_err)?;
            into_value("ok")
        }

        // ---------- System Scheduler ----------
        "list_system_tasks" => {
            let tasks: Vec<SystemTaskDto> =
                crate::system::components::scheduler::list_system_tasks_handler(&ctx.state)
                    .await
                    .map_err(handler_err)?;
            into_value(tasks)
        }
        "get_task_history" => {
            #[derive(Deserialize)]
            struct Input {
                task_id: Option<i64>,
                limit: Option<u64>,
                offset: Option<u64>,
            }
            let input: Input = parse_payload(payload)?;
            let runs: Vec<TaskRunDto> =
                crate::system::components::scheduler::get_task_history_handler(
                    input.task_id,
                    input.limit,
                    input.offset,
                    &ctx.state,
                )
                .await
                .map_err(handler_err)?;
            into_value(runs)
        }
        "run_system_task_now" => {
            #[derive(Deserialize)]
            struct Input {
                task_type: String,
            }
            let input: Input = parse_payload(payload)?;
            let res: RunTaskNowResult =
                crate::system::components::scheduler::run_system_task_now_handler(
                    input.task_type,
                    &ctx.state,
                    ctx.emitter.as_ref(),
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "update_system_task" => {
            #[derive(Deserialize)]
            struct Input {
                task_type: String,
                input: UpdateTaskInput,
            }
            let input: Input = parse_payload(payload)?;
            let saved = crate::system::components::scheduler::update_system_task_handler(
                input.task_type,
                input.input,
                &ctx.state,
            )
            .await
            .map_err(handler_err)?;
            into_value(saved)
        }

        // ---------- Research ----------
        "get_news_settings" => {
            let dto: NewsSettingsDto =
                crate::research::components::feed::get_news_settings_handler(&ctx.state)
                    .await
                    .map_err(handler_err)?;
            into_value(dto)
        }
        "save_news_settings" => {
            let input: SaveNewsSettingsInput = parse_payload(payload)?;
            let dto =
                crate::research::components::feed::save_news_settings_handler(input, &ctx.state)
                    .await
                    .map_err(handler_err)?;
            into_value(dto)
        }
        "list_news_articles" => {
            #[derive(Deserialize)]
            struct Input {
                status: Option<String>,
                limit: Option<u64>,
                offset: Option<u64>,
                include_dismissed: Option<bool>,
                search: Option<String>,
                source_id: Option<i64>,
                starred: Option<bool>,
                start_date: Option<String>,
                end_date: Option<String>,
                sort_by: Option<String>,
            }
            let input: Input = parse_payload(payload)?;
            let articles: Vec<NewsArticleDto> =
                crate::research::components::feed::list_news_articles_handler(
                    input.status,
                    input.limit,
                    input.offset,
                    input.include_dismissed,
                    input.search,
                    input.source_id,
                    input.starred,
                    input.start_date,
                    input.end_date,
                    input.sort_by,
                    &ctx.state,
                )
                .await
                .map_err(handler_err)?;
            into_value(articles)
        }
        "get_news_article" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let dto =
                crate::research::components::feed::get_news_article_handler(input.id, &ctx.state)
                    .await
                    .map_err(handler_err)?;
            into_value(dto)
        }
        "clear_news_articles" => {
            let deleted =
                crate::research::components::feed::clear_news_articles_handler(&ctx.state)
                    .await
                    .map_err(handler_err)?;
            into_value(deleted)
        }
        "dismiss_news_article" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::feed::dismiss_news_article_handler(input.id, &ctx.state)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "toggle_star_news_article" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                starred: bool,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::feed::toggle_star_news_article_handler(
                input.id,
                input.starred,
                &ctx.state,
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "mark_news_article_read" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::feed::mark_news_article_read_handler(input.id, &ctx.state)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "sync_news_now" => {
            let res = crate::research::components::feed::sync_news_now_handler(&ctx.state)
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "sync_news_sources_now" => {
            let res = crate::research::components::feed::sync_news_sources_now_handler(&ctx.state)
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "list_news_sources" => {
            #[derive(Deserialize)]
            struct Input {
                country: Option<String>,
                language: Option<String>,
                search: Option<String>,
            }
            let input: Input = parse_payload(payload)?;
            let sources: Vec<NewsSourceDto> =
                crate::research::components::feed::list_news_sources_handler(
                    input.country,
                    input.language,
                    input.search,
                    &ctx.state,
                )
                .await
                .map_err(handler_err)?;
            into_value(sources)
        }
        "list_feed_sources" => {
            let sources: Vec<FeedSourceDto> =
                crate::research::components::feed::list_feed_sources_handler(&ctx.state.db)
                    .await
                    .map_err(handler_err)?;
            into_value(sources)
        }
        "get_feed_source" => {
            #[derive(Deserialize)]
            struct Input {
                source_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let dto = crate::research::components::feed::get_feed_source_handler(
                &ctx.state.db,
                input.source_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(dto)
        }
        "create_feed_source" => {
            let input: CreateFeedSourceInput = parse_payload(payload)?;
            let dto =
                crate::research::components::feed::create_feed_source_handler(&ctx.state.db, input)
                    .await
                    .map_err(handler_err)?;
            into_value(dto)
        }
        "update_feed_source" => {
            #[derive(Deserialize)]
            struct Input {
                source_id: i64,
                input: UpdateFeedSourceInput,
            }
            let input: Input = parse_payload(payload)?;
            let dto = crate::research::components::feed::update_feed_source_handler(
                &ctx.state.db,
                input.source_id,
                input.input,
            )
            .await
            .map_err(handler_err)?;
            into_value(dto)
        }
        "delete_feed_source" => {
            #[derive(Deserialize)]
            struct Input {
                source_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::feed::delete_feed_source_handler(
                &ctx.state.db,
                input.source_id,
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "toggle_feed_source" => {
            #[derive(Deserialize)]
            struct Input {
                source_id: i64,
                enabled: bool,
            }
            let input: Input = parse_payload(payload)?;
            let dto = crate::research::components::feed::toggle_feed_source_handler(
                &ctx.state.db,
                input.source_id,
                input.enabled,
            )
            .await
            .map_err(handler_err)?;
            into_value(dto)
        }
        "test_feed_source_connection" => {
            #[derive(Deserialize)]
            struct Input {
                source_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::research::components::feed::test_feed_source_connection_handler(
                &ctx.state.db,
                &ctx.state.http_client,
                input.source_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "sync_feed_source_now" => {
            #[derive(Deserialize)]
            struct Input {
                source_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: SyncSourceResult =
                crate::research::components::feed::sync_feed_source_now_handler(
                    &ctx.state.db,
                    &ctx.state.http_client,
                    input.source_id,
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "sync_all_feed_sources" => {
            let res: SyncAllResult =
                crate::research::components::feed::sync_all_feed_sources_handler(
                    &ctx.state.db,
                    &ctx.state.http_client,
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        // Research connectors
        "research_list_accounts" => {
            let res: Vec<ResearchAccountDto> =
                crate::research::components::connectors::list_accounts(ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "research_upsert_account" => {
            let input: CreateResearchAccountInput = parse_payload(payload)?;
            let res =
                crate::research::components::connectors::upsert_account(input, ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "research_update_account" => {
            let input: UpdateResearchAccountInput = parse_payload(payload)?;
            let res =
                crate::research::components::connectors::update_account(input, ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "research_delete_account" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::connectors::delete_account(input.id, ctx.state.as_ref())
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "research_list_streams" => {
            #[derive(Deserialize)]
            struct Input {
                account_id: Option<i64>,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<ResearchStreamDto> =
                crate::research::components::connectors::list_streams(
                    input.account_id,
                    ctx.state.as_ref(),
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "research_upsert_stream" => {
            let input: UpsertResearchStreamInput = parse_payload(payload)?;
            let res =
                crate::research::components::connectors::upsert_stream(input, ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "research_delete_stream" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::connectors::delete_stream(input.id, ctx.state.as_ref())
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "research_sync_stream_now" => {
            #[derive(Deserialize)]
            struct Input {
                stream_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::connectors::sync_stream_now(
                input.stream_id,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "research_list_items" => {
            let query: ListResearchItemsQuery = parse_payload(payload)?;
            let res: Vec<ResearchItemDto> =
                crate::research::components::connectors::list_items(query, ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "research_set_item_status" => {
            #[derive(Deserialize)]
            struct Input {
                item_id: i64,
                status: String,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::connectors::set_item_status(
                input.item_id,
                input.status,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "research_open_detached_cockpit" | "open_live_page_window" => Err(ApiError::Handler(
            "Window management is not available in headless mode".into(),
        )),

        // Reader
        "reader_fetch" => {
            let input: ReaderFetchInput = parse_payload(payload)?;
            let res: ReaderResult = crate::research::components::reader::reader_fetch(
                &ctx.state.db,
                &ctx.state.http_client,
                input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "reader_refresh" => {
            let input: ReaderRefreshInput = parse_payload(payload)?;
            let res: ReaderResult = crate::research::components::reader::reader_refresh(
                &ctx.state.db,
                &ctx.state.http_client,
                input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "reader_reference_get" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: ReaderReferenceDto = crate::research::components::reader::reference_get(
                &ctx.state.db,
                input.reference_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "reader_reference_update" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
                input: ReferenceUpdateInput,
            }
            let input: Input = parse_payload(payload)?;
            let res: ReaderReferenceDto = crate::research::components::reader::reference_update(
                &ctx.state.db,
                input.reference_id,
                input.input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "reader_snapshots_list" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<ReaderSnapshotDto> = crate::research::components::reader::snapshots_list(
                &ctx.state.db,
                input.reference_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "reader_snapshot_get" => {
            #[derive(Deserialize)]
            struct Input {
                snapshot_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: ReaderSnapshotDto =
                crate::research::components::reader::snapshot_get(&ctx.state.db, input.snapshot_id)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "reader_clips_list" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<ReaderClipDto> =
                crate::research::components::reader::clips_list(&ctx.state.db, input.reference_id)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "reader_clip_create" => {
            let input: ClipCreateInput = parse_payload(payload)?;
            let res: ReaderClipDto =
                crate::research::components::reader::clip_create(&ctx.state.db, input)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "reader_clip_delete" => {
            #[derive(Deserialize)]
            struct Input {
                clip_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::research::components::reader::clip_delete(&ctx.state.db, input.clip_id)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }

        // ---------- Writing ----------
        "list_ideas" => {
            #[derive(Deserialize)]
            struct Input {
                status: Option<String>,
                search: Option<String>,
                include_removed: Option<bool>,
                limit: Option<u64>,
                offset: Option<u64>,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<IdeaDto> = crate::writing::components::ideas::list_ideas_handler(
                input.status,
                input.search,
                input.include_removed,
                input.limit,
                input.offset,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "get_idea" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: IdeaDto =
                crate::writing::components::ideas::get_idea_handler(input.id, ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "create_idea" => {
            let input: CreateIdeaInput = parse_payload(payload)?;
            let res: IdeaDto =
                crate::writing::components::ideas::create_idea_handler(input, ctx.state.as_ref())
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "create_idea_for_article" => {
            let input: CreateIdeaForArticleInput = parse_payload(payload)?;
            let res = crate::writing::components::ideas::create_idea_for_article_handler(
                input,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "update_idea_metadata" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                input: UpdateIdeaMetadataInput,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::ideas::update_idea_metadata_handler(
                input.id,
                input.input,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "update_idea_notes" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                input: UpdateIdeaNotesInput,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::ideas::update_idea_notes_handler(
                input.id,
                input.input,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "update_idea_article" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                input: UpdateIdeaArticleInput,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::ideas::update_idea_article_handler(
                input.id,
                input.input,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "archive_idea" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::ideas::archive_idea_handler(
                input.id,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "open_article_modal" | "add_highlight" => Err(ApiError::Handler(
            "Windowed article viewers are unavailable in headless mode".into(),
        )),

        // Idea references
        "list_idea_references" => {
            #[derive(Deserialize)]
            struct Input {
                idea_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<IdeaReferenceDto> =
                crate::writing::components::ideas::list_idea_references_handler(
                    input.idea_id,
                    ctx.state.as_ref(),
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "add_reference_to_idea" => {
            let input: AddReferenceInput = parse_payload(payload)?;
            let res = crate::writing::components::ideas::add_reference_to_idea_handler(
                input,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "remove_reference" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::writing::components::ideas::remove_reference_handler(
                input.reference_id,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "update_reference_notes" => {
            let input: UpdateReferenceNotesInput = parse_payload(payload)?;
            let res = crate::writing::components::ideas::update_reference_notes_handler(
                input,
                ctx.state.as_ref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "get_reference_reader_snapshot" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: ReferenceReaderSnapshotDto =
                crate::writing::components::ideas::get_reference_reader_snapshot_handler(
                    input.reference_id,
                    ctx.state.as_ref(),
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "get_reader_snapshot_for_url" => {
            let input: ReaderSnapshotInput = parse_payload(payload)?;
            let res: ReferenceReaderSnapshotDto =
                crate::writing::components::ideas::get_reader_snapshot_for_url_handler(
                    input,
                    ctx.state.as_ref(),
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }

        // Knowledge graph References
        "kg_list_references" => {
            #[derive(Deserialize)]
            struct Input {
                reference_type: Option<String>,
                search: Option<String>,
                limit: Option<u64>,
                offset: Option<u64>,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<ReferenceDto> =
                crate::writing::components::knowledge_graph::list_references(
                    &ctx.state.db,
                    input.reference_type,
                    input.search,
                    input.limit,
                    input.offset,
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "kg_get_reference" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: ReferenceDto =
                crate::writing::components::knowledge_graph::get_reference(&ctx.state.db, input.id)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "kg_create_reference" => {
            let input: CreateReferenceInput = parse_payload(payload)?;
            let res: ReferenceDto =
                crate::writing::components::knowledge_graph::create_reference(&ctx.state.db, input)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "kg_update_reference" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                input: UpdateReferenceInput,
            }
            let input: Input = parse_payload(payload)?;
            let res: ReferenceDto = crate::writing::components::knowledge_graph::update_reference(
                &ctx.state.db,
                input.id,
                input.input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_delete_reference" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::writing::components::knowledge_graph::delete_reference(&ctx.state.db, input.id)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }

        // Knowledge graph writings
        "kg_list_writings" => {
            #[derive(Deserialize)]
            struct Input {
                writing_type: Option<String>,
                status: Option<String>,
                search: Option<String>,
                limit: Option<u64>,
                offset: Option<u64>,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<WritingDto> = crate::writing::components::knowledge_graph::list_writings(
                &ctx.state.db,
                input.writing_type,
                input.status,
                input.search,
                input.limit,
                input.offset,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_get_writing" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: WritingDto =
                crate::writing::components::knowledge_graph::get_writing(&ctx.state.db, input.id)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "kg_create_writing" => {
            let input: CreateWritingInput = parse_payload(payload)?;
            let res: WritingDto =
                crate::writing::components::knowledge_graph::create_writing(&ctx.state.db, input)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "kg_update_writing" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                input: UpdateWritingInput,
            }
            let input: Input = parse_payload(payload)?;
            let res: WritingDto = crate::writing::components::knowledge_graph::update_writing(
                &ctx.state.db,
                input.id,
                input.input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_publish_writing" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: WritingDto = crate::writing::components::knowledge_graph::publish_writing(
                &ctx.state.db,
                input.id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_delete_writing" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::writing::components::knowledge_graph::delete_writing(&ctx.state.db, input.id)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }

        // Knowledge graph links
        "kg_link_idea_reference" => {
            let input: LinkIdeaReferenceInput = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::link_idea_reference(
                &ctx.state.db,
                input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_unlink_idea_reference" => {
            #[derive(Deserialize)]
            struct Input {
                idea_id: i64,
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::writing::components::knowledge_graph::unlink_idea_reference(
                &ctx.state.db,
                input.idea_id,
                input.reference_id,
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "kg_list_references_for_idea" => {
            #[derive(Deserialize)]
            struct Input {
                idea_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::list_references_for_idea(
                &ctx.state.db,
                input.idea_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_list_ideas_for_reference" => {
            #[derive(Deserialize)]
            struct Input {
                reference_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::list_ideas_for_reference(
                &ctx.state.db,
                input.reference_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_link_writing_idea" => {
            let input: LinkWritingIdeaInput = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::link_writing_idea(
                &ctx.state.db,
                input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_unlink_writing_idea" => {
            #[derive(Deserialize)]
            struct Input {
                writing_id: i64,
                idea_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::writing::components::knowledge_graph::unlink_writing_idea(
                &ctx.state.db,
                input.writing_id,
                input.idea_id,
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "kg_list_ideas_for_writing" => {
            #[derive(Deserialize)]
            struct Input {
                writing_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::list_ideas_for_writing(
                &ctx.state.db,
                input.writing_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_list_writings_for_idea" => {
            #[derive(Deserialize)]
            struct Input {
                idea_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::list_writings_for_idea(
                &ctx.state.db,
                input.idea_id,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }

        // Knowledge graph notes
        "kg_list_notes_for_entity" => {
            #[derive(Deserialize)]
            struct Input {
                entity_type: String,
                entity_id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res: Vec<NoteDto> =
                crate::writing::components::knowledge_graph::list_notes_for_entity(
                    &ctx.state.db,
                    input.entity_type,
                    input.entity_id,
                )
                .await
                .map_err(handler_err)?;
            into_value(res)
        }
        "kg_get_note" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            let res =
                crate::writing::components::knowledge_graph::get_note(&ctx.state.db, input.id)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "kg_create_note" => {
            let input: CreateNoteInput = parse_payload(payload)?;
            let res =
                crate::writing::components::knowledge_graph::create_note(&ctx.state.db, input)
                    .await
                    .map_err(handler_err)?;
            into_value(res)
        }
        "kg_update_note" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
                input: UpdateNoteInput,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::writing::components::knowledge_graph::update_note(
                &ctx.state.db,
                input.id,
                input.input,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "kg_delete_note" => {
            #[derive(Deserialize)]
            struct Input {
                id: i64,
            }
            let input: Input = parse_payload(payload)?;
            crate::writing::components::knowledge_graph::delete_note(&ctx.state.db, input.id)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }

        // Notes feature
        "notes_get_or_create" => {
            #[derive(Deserialize)]
            struct Input {
                entity_type: String,
                entity_id: i64,
                note_type: Option<String>,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::notes::components::notes::get_or_create(
                &ctx.state.db,
                &input.entity_type,
                input.entity_id,
                input.note_type.as_deref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "notes_upsert" => {
            #[derive(Deserialize)]
            struct Input {
                entity_type: String,
                entity_id: i64,
                note_type: Option<String>,
                body_html: String,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::notes::components::notes::upsert(
                &ctx.state.db,
                &input.entity_type,
                input.entity_id,
                input.note_type.as_deref(),
                &input.body_html,
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }
        "notes_append_snippet" => {
            #[derive(Deserialize)]
            struct Input {
                entity_type: String,
                entity_id: i64,
                note_type: Option<String>,
                snippet_text: String,
                source_url: Option<String>,
                source_title: Option<String>,
            }
            let input: Input = parse_payload(payload)?;
            let res = crate::notes::components::notes::append_snippet(
                &ctx.state.db,
                &input.entity_type,
                input.entity_id,
                input.note_type.as_deref(),
                &input.snippet_text,
                input.source_url.as_deref(),
                input.source_title.as_deref(),
            )
            .await
            .map_err(handler_err)?;
            into_value(res)
        }

        // Writing drafts (TipTap JSON)
        "writing_create" => {
            let input: CreateWritingDraftInput = parse_payload(payload)?;
            use crate::writing::components::knowledge_graph::entities::writings::WritingType;
            let writing_type = match input.writing_type.as_str() {
                "article" => WritingType::Article,
                "chapter" => WritingType::Chapter,
                "book" => WritingType::Book,
                _ => return Err(ApiError::BadRequest("invalid writing_type".into())),
            };
            let model = crate::writing::service::create_writing(
                &ctx.state.db,
                input.title,
                input.slug,
                writing_type,
                input.link_idea_ids,
                input.initial_content_json,
                input.excerpt,
                input.tags,
            )
            .await
            .map_err(handler_err)?;
            into_value(writing_model_to_draft_dto(model))
        }
        "writing_get" => {
            let input: GetWritingInput = parse_payload(payload)?;
            let res = crate::writing::service::get_writing(&ctx.state.db, input.writing_id)
                .await
                .map_err(handler_err)?;
            into_value(writing_model_to_draft_dto(res))
        }
        "writing_list" => {
            let input: ListWritingsQuery = parse_payload(payload)?;
            use crate::writing::components::knowledge_graph::entities::writings::{
                WritingStatus, WritingType,
            };
            let status = input.status.as_deref().and_then(|s| match s {
                "draft" => Some(WritingStatus::Draft),
                "in_progress" => Some(WritingStatus::InProgress),
                "review" => Some(WritingStatus::Review),
                "published" => Some(WritingStatus::Published),
                "archived" => Some(WritingStatus::Archived),
                _ => None,
            });
            let writing_type = input.writing_type.as_deref().and_then(|t| match t {
                "article" => Some(WritingType::Article),
                "chapter" => Some(WritingType::Chapter),
                "book" => Some(WritingType::Book),
                _ => None,
            });
            let res = crate::writing::service::list_writings(
                &ctx.state.db,
                status,
                writing_type,
                input.series_name,
                input.is_pinned,
                input.is_featured,
            )
            .await
            .map_err(handler_err)?;
            into_value(
                res.into_iter()
                    .map(writing_model_to_draft_dto)
                    .collect::<Vec<_>>(),
            )
        }
        "writing_update_meta" => {
            let input: UpdateWritingDraftMetaInput = parse_payload(payload)?;
            use crate::writing::components::knowledge_graph::entities::writings::{
                WritingStatus, WritingType,
            };
            let writing_type = input.writing_type.as_deref().and_then(|t| match t {
                "article" => Some(WritingType::Article),
                "chapter" => Some(WritingType::Chapter),
                "book" => Some(WritingType::Book),
                _ => None,
            });
            let status = input.status.as_deref().and_then(|s| match s {
                "draft" => Some(WritingStatus::Draft),
                "in_progress" => Some(WritingStatus::InProgress),
                "review" => Some(WritingStatus::Review),
                "published" => Some(WritingStatus::Published),
                "archived" => Some(WritingStatus::Archived),
                _ => None,
            });
            let res = crate::writing::service::update_writing_meta(
                &ctx.state.db,
                input.writing_id,
                input.title,
                input.slug,
                writing_type,
                status,
                input.excerpt,
                input.tags,
                input.series_name,
                input.series_part,
                input.is_pinned,
                input.is_featured,
            )
            .await
            .map_err(handler_err)?;
            into_value(writing_model_to_draft_dto(res))
        }
        "writing_save_draft" => {
            let input: SaveDraftInput = parse_payload(payload)?;
            let res = crate::writing::service::save_draft(
                &ctx.state.db,
                input.writing_id,
                input.content_json,
            )
            .await
            .map_err(handler_err)?;
            into_value(writing_model_to_draft_dto(res))
        }
        "writing_publish" => {
            let input: PublishWritingInput = parse_payload(payload)?;
            let res = crate::writing::service::publish_writing(&ctx.state.db, input.writing_id)
                .await
                .map_err(handler_err)?;
            into_value(writing_model_to_draft_dto(res))
        }
        "writing_link_idea" => {
            let input: LinkIdeaInput = parse_payload(payload)?;
            crate::writing::service::link_idea(
                &ctx.state.db,
                input.writing_id,
                input.idea_id,
                Some("primary".to_string()),
            )
            .await
            .map_err(handler_err)?;
            into_value("ok")
        }
        "writing_unlink_idea" => {
            let input: LinkIdeaInput = parse_payload(payload)?;
            crate::writing::service::unlink_idea(&ctx.state.db, input.writing_id, input.idea_id)
                .await
                .map_err(handler_err)?;
            into_value("ok")
        }
        "writing_list_linked_ideas" => {
            let input: ListLinkedIdeasInput = parse_payload(payload)?;
            let res = crate::writing::service::list_linked_ideas(&ctx.state.db, input.writing_id)
                .await
                .map_err(handler_err)?;
            into_value(res.into_iter().map(|link| link.idea_id).collect::<Vec<_>>())
        }

        _ => Err(ApiError::BadRequest(format!(
            "Unknown command: {}",
            command
        ))),
    }
}

fn writing_model_to_draft_dto(w: writings::Model) -> WritingDraftDto {
    let content_json = serde_json::from_str(&w.content_markdown)
        .unwrap_or(serde_json::json!({"type": "doc", "content": []}));
    let content_text = text::extract_plain_text(&content_json);

    WritingDraftDto {
        id: w.id,
        title: w.title,
        slug: w.slug,
        writing_type: w.r#type.to_string(),
        status: w.status.to_string(),
        content_json,
        content_text,
        excerpt: w.excerpt,
        tags: w.tags,
        word_count: w.word_count,
        series_name: w.series_name,
        series_part: w.series_part,
        is_pinned: w.is_pinned == 1,
        is_featured: w.is_featured == 1,
        created_at: w.created_at.to_rfc3339(),
        updated_at: w.updated_at.to_rfc3339(),
        published_at: w.published_at.map(|dt| dt.to_rfc3339()),
    }
}
