//! Handlers for idea reference operations

use crate::core::components::errors::{AppError, AppResult};
use crate::AppState;
use sea_orm::*;
use tracing::{info, instrument};

use super::entities::idea_references::{
    ActiveModel as ActiveReference, Column as ReferenceColumn, Entity as References,
    Model as ReferenceModel,
};
use super::types::{AddReferenceInput, IdeaReferenceDto, UpdateReferenceNotesInput};

/// List all references for an idea
#[instrument(skip(state))]
pub async fn list_idea_references_handler(
    idea_id: i64,
    state: &AppState,
) -> AppResult<Vec<IdeaReferenceDto>> {
    info!("Listing references for idea {}", idea_id);

    let references = References::find()
        .filter(ReferenceColumn::IdeaId.eq(idea_id))
        .order_by_desc(ReferenceColumn::AddedAt)
        .all(&state.db)
        .await?;

    let dtos = references
        .into_iter()
        .map(reference_to_dto)
        .collect();

    Ok(dtos)
}

/// Add a reference to an idea
#[instrument(skip(state))]
pub async fn add_reference_to_idea_handler(
    input: AddReferenceInput,
    state: &AppState,
) -> AppResult<IdeaReferenceDto> {
    info!("Adding reference to idea {}: {:?}", input.idea_id, input.reference_type);

    // Validate reference type
    if !["article", "manual", "url"].contains(&input.reference_type.as_str()) {
        return Err(AppError::other(format!(
            "Invalid reference type: {}",
            input.reference_type
        )));
    }

    // Validate required fields based on type
    match input.reference_type.as_str() {
        "article" => {
            if input.news_article_id.is_none() {
                return Err(AppError::other("news_article_id required for article references"));
            }
        }
        "manual" | "url" => {
            if input.title.is_none() || input.url.is_none() {
                return Err(AppError::other("title and url required for manual/url references"));
            }
        }
        _ => {}
    }

    // Create the reference
    let now = chrono::Utc::now().naive_utc();
    let new_reference = ActiveReference {
        idea_id: Set(input.idea_id),
        reference_type: Set(input.reference_type),
        news_article_id: Set(input.news_article_id),
        title: Set(input.title),
        url: Set(input.url),
        description: Set(input.description),
        source_id: Set(input.source_id),
        notes_markdown: Set(None),
        added_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    };

    let result = new_reference.insert(&state.db).await?;

    info!("Reference {} created for idea {}", result.id, input.idea_id);

    Ok(reference_to_dto(result))
}

/// Remove a reference from an idea
#[instrument(skip(state))]
pub async fn remove_reference_handler(
    reference_id: i64,
    state: &AppState,
) -> AppResult<()> {
    info!("Removing reference {}", reference_id);

    let result = References::delete_by_id(reference_id)
        .exec(&state.db)
        .await?;

    if result.rows_affected == 0 {
        return Err(AppError::other(format!(
            "Reference {} not found",
            reference_id
        )));
    }

    info!("Reference {} removed successfully", reference_id);

    Ok(())
}

/// Update reference notes
#[instrument(skip(state))]
pub async fn update_reference_notes_handler(
    input: UpdateReferenceNotesInput,
    state: &AppState,
) -> AppResult<IdeaReferenceDto> {
    info!("Updating notes for reference {}", input.reference_id);

    // Find the reference
    let reference = References::find_by_id(input.reference_id)
        .one(&state.db)
        .await?
        .ok_or_else(|| {
            AppError::other(format!("Reference {} not found", input.reference_id))
        })?;

    // Update notes and timestamp
    let mut active: ActiveReference = reference.clone().into();
    active.notes_markdown = Set(input.notes_markdown);
    active.updated_at = Set(chrono::Utc::now().naive_utc());

    let updated = active.update(&state.db).await?;

    // Update parent idea's date_updated timestamp
    use super::types::{Entity as Ideas, ActiveModel as ActiveIdea};
    let parent_idea = Ideas::find_by_id(reference.idea_id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Parent idea {} not found", reference.idea_id)))?;
    
    let mut idea_active: ActiveIdea = parent_idea.into();
    idea_active.date_updated = Set(chrono::Utc::now());
    idea_active.update(&state.db).await?;

    info!("Reference {} notes updated", input.reference_id);

    Ok(reference_to_dto(updated))
}

/// Convert database model to DTO
fn reference_to_dto(model: ReferenceModel) -> IdeaReferenceDto {
    IdeaReferenceDto {
        id: model.id,
        idea_id: model.idea_id,
        reference_type: model.reference_type,
        news_article_id: model.news_article_id,
        title: model.title,
        url: model.url,
        description: model.description,
        notes_markdown: model.notes_markdown,
        source_id: model.source_id,
        added_at: model.added_at.to_string(),
        updated_at: model.updated_at.to_string(),
    }
}
