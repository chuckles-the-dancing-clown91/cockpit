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

// ============================================================================
// Knowledge Graph Commands
// ============================================================================

use super::components::knowledge_graph::{
    // Reference Items
    list_references, get_reference, create_reference, update_reference, delete_reference,
    CreateReferenceInput, UpdateReferenceInput, ReferenceDto,
    // Writings
    list_writings, get_writing, create_writing, update_writing, publish_writing, delete_writing,
    CreateWritingInput, UpdateWritingInput, WritingDto,
    // Links
    link_idea_reference, unlink_idea_reference, list_references_for_idea, list_ideas_for_reference,
    link_writing_idea, unlink_writing_idea, list_ideas_for_writing, list_writings_for_idea,
    LinkIdeaReferenceInput, IdeaReferenceLinkDto, LinkWritingIdeaInput, WritingIdeaLinkDto,
    // Notes
    list_notes_for_entity, get_note, create_note, update_note, delete_note,
    CreateNoteInput, UpdateNoteInput, NoteDto,
};

// Reference Items Commands
// ============================================================================

#[tauri::command]
pub async fn kg_list_references(
    reference_type: Option<String>,
    search: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<ReferenceDto>, String> {
    list_references(&state.db, reference_type, search, limit, offset)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_get_reference(
    id: i64,
    state: State<'_, AppState>,
) -> Result<ReferenceDto, String> {
    get_reference(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_create_reference(
    input: CreateReferenceInput,
    state: State<'_, AppState>,
) -> Result<ReferenceDto, String> {
    create_reference(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_update_reference(
    id: i64,
    input: UpdateReferenceInput,
    state: State<'_, AppState>,
) -> Result<ReferenceDto, String> {
    update_reference(&state.db, id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_delete_reference(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    delete_reference(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

// Writings Commands
// ============================================================================

#[tauri::command]
pub async fn kg_list_writings(
    writing_type: Option<String>,
    status: Option<String>,
    search: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<WritingDto>, String> {
    list_writings(&state.db, writing_type, status, search, limit, offset)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_get_writing(
    id: i64,
    state: State<'_, AppState>,
) -> Result<WritingDto, String> {
    get_writing(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_create_writing(
    input: CreateWritingInput,
    state: State<'_, AppState>,
) -> Result<WritingDto, String> {
    create_writing(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_update_writing(
    id: i64,
    input: UpdateWritingInput,
    state: State<'_, AppState>,
) -> Result<WritingDto, String> {
    update_writing(&state.db, id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_publish_writing(
    id: i64,
    state: State<'_, AppState>,
) -> Result<WritingDto, String> {
    publish_writing(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_delete_writing(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    delete_writing(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

// Link Commands
// ============================================================================

#[tauri::command]
pub async fn kg_link_idea_reference(
    input: LinkIdeaReferenceInput,
    state: State<'_, AppState>,
) -> Result<IdeaReferenceLinkDto, String> {
    link_idea_reference(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_unlink_idea_reference(
    idea_id: i64,
    reference_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    unlink_idea_reference(&state.db, idea_id, reference_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_list_references_for_idea(
    idea_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<IdeaReferenceLinkDto>, String> {
    list_references_for_idea(&state.db, idea_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_list_ideas_for_reference(
    reference_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<IdeaReferenceLinkDto>, String> {
    list_ideas_for_reference(&state.db, reference_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_link_writing_idea(
    input: LinkWritingIdeaInput,
    state: State<'_, AppState>,
) -> Result<WritingIdeaLinkDto, String> {
    link_writing_idea(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_unlink_writing_idea(
    writing_id: i64,
    idea_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    unlink_writing_idea(&state.db, writing_id, idea_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_list_ideas_for_writing(
    writing_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<WritingIdeaLinkDto>, String> {
    list_ideas_for_writing(&state.db, writing_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_list_writings_for_idea(
    idea_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<WritingIdeaLinkDto>, String> {
    list_writings_for_idea(&state.db, idea_id)
        .await
        .map_err(|e| e.to_string())
}

// Notes Commands
// ============================================================================

#[tauri::command]
pub async fn kg_list_notes_for_entity(
    entity_type: String,
    entity_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<NoteDto>, String> {
    list_notes_for_entity(&state.db, entity_type, entity_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_get_note(
    id: i64,
    state: State<'_, AppState>,
) -> Result<NoteDto, String> {
    get_note(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_create_note(
    input: CreateNoteInput,
    state: State<'_, AppState>,
) -> Result<NoteDto, String> {
    create_note(&state.db, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_update_note(
    id: i64,
    input: UpdateNoteInput,
    state: State<'_, AppState>,
) -> Result<NoteDto, String> {
    update_note(&state.db, id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kg_delete_note(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    delete_note(&state.db, id)
        .await
        .map_err(|e| e.to_string())
}
