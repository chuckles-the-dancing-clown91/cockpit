//! Notes Feature - Tauri Commands
//!
//! Thin wrappers around business logic for frontend API

use tauri::State;

use crate::AppState;
use crate::notes::components;

#[tauri::command]
pub async fn notes_get_or_create(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: i64,
    note_type: Option<String>,
) -> Result<components::notes::NoteDto, String> {
    components::notes::get_or_create(
        &state.db,
        &entity_type,
        entity_id,
        note_type.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn notes_upsert(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: i64,
    note_type: Option<String>,
    body_html: String,
) -> Result<components::notes::NoteDto, String> {
    components::notes::upsert(
        &state.db,
        &entity_type,
        entity_id,
        note_type.as_deref(),
        &body_html,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn notes_append_snippet(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: i64,
    note_type: Option<String>,
    snippet_text: String,
    source_url: Option<String>,
    source_title: Option<String>,
) -> Result<components::notes::NoteDto, String> {
    components::notes::append_snippet(
        &state.db,
        &entity_type,
        entity_id,
        note_type.as_deref(),
        &snippet_text,
        source_url.as_deref(),
        source_title.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())
}
