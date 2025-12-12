//! Writing domain Tauri commands

use tauri::State;
use crate::AppState;
use super::components::ideas::{
    list_ideas_handler, get_idea_handler, create_idea_handler,
    create_idea_for_article_handler, update_idea_metadata_handler,
    update_idea_notes_handler, update_idea_article_handler, archive_idea_handler,
    IdeaDto, CreateIdeaInput, CreateIdeaForArticleInput,
    UpdateIdeaMetadataInput, UpdateIdeaNotesInput, UpdateIdeaArticleInput,
};

/// List writing ideas with filtering and pagination
/// 
/// # Parameters
/// - `status`: Filter by status ("draft", "in_progress", "completed", "archived")
/// - `search`: Text search in title/summary
/// - `include_removed`: Include archived ideas (default: false)
/// - `limit`: Max number of results (default: 50)
/// - `offset`: Pagination offset (default: 0)
/// 
/// # Returns
/// Paginated list of ideas sorted by last updated (newest first)
#[tauri::command]
pub async fn list_ideas(
    status: Option<String>,
    search: Option<String>,
    include_removed: Option<bool>,
    limit: Option<u64>,
    offset: Option<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<IdeaDto>, String> {
    list_ideas_handler(status, search, include_removed, limit, offset, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_idea(id: i64, state: State<'_, AppState>) -> Result<IdeaDto, String> {
    get_idea_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_idea(
    input: CreateIdeaInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    create_idea_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_idea_for_article(
    input: CreateIdeaForArticleInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    create_idea_for_article_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_idea_metadata(
    id: i64,
    input: UpdateIdeaMetadataInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_metadata_handler(id, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_idea_notes(
    id: i64,
    input: UpdateIdeaNotesInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_notes_handler(id, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_idea_article(
    id: i64,
    input: UpdateIdeaArticleInput,
    state: State<'_, AppState>,
) -> Result<IdeaDto, String> {
    update_idea_article_handler(id, input, &state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn archive_idea(id: i64, state: State<'_, AppState>) -> Result<IdeaDto, String> {
    archive_idea_handler(id, &state)
        .await
        .map_err(|e| e.to_string())
}
