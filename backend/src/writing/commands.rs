//! Writing domain Tauri commands

use tauri::{AppHandle, State};
use crate::AppState;
use super::components::ideas::{
    list_ideas_handler, get_idea_handler, create_idea_handler,
    create_idea_for_article_handler, update_idea_metadata_handler,
    update_idea_notes_handler, update_idea_article_handler, archive_idea_handler,
    list_idea_references_handler, add_reference_to_idea_handler,
    remove_reference_handler, update_reference_notes_handler,
    IdeaDto, CreateIdeaInput, CreateIdeaForArticleInput,
    UpdateIdeaMetadataInput, UpdateIdeaNotesInput, UpdateIdeaArticleInput,
    IdeaReferenceDto, AddReferenceInput, UpdateReferenceNotesInput,
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

/// Open an article in a modal window with context menu for highlighting
#[tauri::command]
pub async fn open_article_modal(
    app: tauri::AppHandle,
    idea_id: i64,
    url: String,
) -> Result<(), String> {
    super::components::article_viewer::open_article_modal(app, idea_id, url)
        .await
        .map_err(|e| e.to_string())
}

/// Add a highlight from an article to the idea's notes
#[tauri::command]
pub async fn add_highlight(
    app: AppHandle,
    idea_id: i64,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    super::components::article_viewer::add_highlight(app, &state, idea_id, text)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Idea References Commands
// ============================================================================

/// List all references for an idea
#[tauri::command]
pub async fn list_idea_references(
    idea_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<IdeaReferenceDto>, String> {
    list_idea_references_handler(idea_id, &state)
        .await
        .map_err(|e| e.to_string())
}

/// Add a reference (article/URL) to an idea
#[tauri::command]
pub async fn add_reference_to_idea(
    input: AddReferenceInput,
    state: State<'_, AppState>,
) -> Result<IdeaReferenceDto, String> {
    add_reference_to_idea_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}

/// Remove a reference from an idea
#[tauri::command]
pub async fn remove_reference(
    reference_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    remove_reference_handler(reference_id, &state)
        .await
        .map_err(|e| e.to_string())
}

/// Update notes for a specific reference
#[tauri::command]
pub async fn update_reference_notes(
    input: UpdateReferenceNotesInput,
    state: State<'_, AppState>,
) -> Result<IdeaReferenceDto, String> {
    update_reference_notes_handler(input, &state)
        .await
        .map_err(|e| e.to_string())
}
