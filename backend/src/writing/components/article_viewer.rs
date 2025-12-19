use crate::core::components::errors::AppError;
use crate::AppState;
use sea_orm::*;
use tauri::{AppHandle, Emitter, WebviewUrl, WebviewWindowBuilder};
use tracing::info;

// Context menu injection script with full prevention and debugging
const CONTEXT_MENU_SCRIPT: &str = r#"
(function() {
    console.log('[Article Viewer] Script loaded! Idea ID:', window.__TAURI_IDEA_ID);
    
    // Remove any existing custom menu
    const existingMenu = document.getElementById('cockpit-notes-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create custom context menu element with enhanced styling
    const menuEl = document.createElement('div');
    menuEl.id = 'cockpit-notes-menu';
    menuEl.style.cssText = `
        display: none;
        position: fixed;
        z-index: 2147483647;
        background: #1a1a1a;
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
        user-select: none;
        pointer-events: auto;
        transition: background 0.15s ease;
    `;
    menuEl.innerHTML = '<span style="margin-right: 8px;">✓</span>Add to Notes';
    
    // Add hover effect
    menuEl.addEventListener('mouseenter', function() {
        menuEl.style.background = '#2a2a2a';
    });
    menuEl.addEventListener('mouseleave', function() {
        menuEl.style.background = '#1a1a1a';
    });
    
    // Append to body when it's ready
    if (document.body) {
        document.body.appendChild(menuEl);
        console.log('[Article Viewer] Menu element attached to body');
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            document.body.appendChild(menuEl);
            console.log('[Article Viewer] Menu element attached to body (after DOMContentLoaded)');
        });
    }
    
    let currentSelection = '';
    
    // FULLY prevent native context menu ALWAYS (not just when text is selected)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Article Viewer] Context menu event triggered');
        
        // Get current selection
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';
        
        console.log('[Article Viewer] Selected text length:', selectedText.length);
        
        if (selectedText.length > 0) {
            currentSelection = selectedText;
            
            // Position menu at cursor
            const x = e.pageX;
            const y = e.pageY;
            
            menuEl.style.display = 'block';
            menuEl.style.left = x + 'px';
            menuEl.style.top = y + 'px';
            
            console.log('[Article Viewer] Custom menu shown at', x, y);
        } else {
            menuEl.style.display = 'none';
            console.log('[Article Viewer] No text selected, hiding menu');
        }
        
        return false;
    }, true); // Use capture phase
    
    // Hide menu on any click outside
    document.addEventListener('click', function(e) {
        if (e.target !== menuEl && !menuEl.contains(e.target)) {
            menuEl.style.display = 'none';
            console.log('[Article Viewer] Menu hidden (clicked outside)');
        }
    }, true);
    
    // Hide menu on scroll
    document.addEventListener('scroll', function() {
        menuEl.style.display = 'none';
    }, true);
    
    // Handle menu click - send selection to backend
    menuEl.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[Article Viewer] Menu clicked, text length:', currentSelection.length);
        
        if (currentSelection.trim()) {
            console.log('[Article Viewer] Invoking add_highlight command');
            console.log('[Article Viewer] Idea ID:', window.__TAURI_IDEA_ID);
            console.log('[Article Viewer] Text preview:', currentSelection.substring(0, 100) + '...');
            
            window.__TAURI__.core.invoke('add_highlight', { 
                ideaId: window.__TAURI_IDEA_ID, 
                text: currentSelection.trim() 
            }).then(() => {
                console.log('[Article Viewer] ✓ Highlight saved successfully');
                // Visual feedback
                menuEl.innerHTML = '<span style="margin-right: 8px;">✓</span>Added!';
                menuEl.style.background = '#0d7c4d';
                setTimeout(() => {
                    menuEl.innerHTML = '<span style="margin-right: 8px;">✓</span>Add to Notes';
                    menuEl.style.background = '#1a1a1a';
                    menuEl.style.display = 'none';
                    currentSelection = '';
                }, 1500);
            }).catch(err => {
                console.error('[Article Viewer] ✗ Failed to save highlight:', err);
                menuEl.innerHTML = '<span style="margin-right: 8px;">✗</span>Error';
                menuEl.style.background = '#b91c1c';
                setTimeout(() => {
                    menuEl.innerHTML = '<span style="margin-right: 8px;">✓</span>Add to Notes';
                    menuEl.style.background = '#1a1a1a';
                    menuEl.style.display = 'none';
                    currentSelection = '';
                }, 2000);
            });
        }
        
        // Clear selection
        window.getSelection()?.removeAllRanges();
    });
    
    console.log('[Article Viewer] ✓ Context menu initialized successfully');
    
    // Debug test - verify menu is in DOM
    setTimeout(() => {
        const testMenu = document.getElementById('cockpit-notes-menu');
        console.log('[Article Viewer] Menu in DOM check:', testMenu ? 'YES' : 'NO');
        if (testMenu) {
            console.log('[Article Viewer] Menu styles:', {
                display: testMenu.style.display,
                zIndex: testMenu.style.zIndex,
                position: testMenu.style.position
            });
        }
    }, 1000);
})();
"#;

/// Open an article in a modal window with context menu for highlighting
/// Loads external URL directly in WebviewWindow and injects context menu script
pub async fn open_article_modal(
    app: AppHandle,
    idea_id: i64,
    url: String,
) -> Result<(), AppError> {
    info!("Opening article modal: idea_id={}, url={}", idea_id, url);

    let label = format!("article-idea-{}", idea_id);

    // Prepare script with IDEA_ID embedded
    let script_with_id = CONTEXT_MENU_SCRIPT.replace("window.__TAURI_IDEA_ID", &idea_id.to_string());

    // Create WebviewWindow that loads the external URL directly
    let webview_url = WebviewUrl::External(url.parse().map_err(|e| {
        AppError::other(format!("Invalid URL: {}", e))
    })?);

    let _window = WebviewWindowBuilder::new(&app, &label, webview_url)
        .title("Article Preview")
        .inner_size(1200.0, 800.0)
        .resizable(true)
        .initialization_script(&script_with_id)
        .build()
        .map_err(|e| AppError::other(format!("Failed to create window: {}", e)))?;

    info!("Article window created successfully");
    Ok(())
}

/// Add a highlight to an idea's notes (via reference ID which maps to an idea)
/// For now, we'll store highlights directly in the idea's notes
/// The ref_id parameter is actually the idea_id in the current schema
pub async fn add_highlight(
    app: AppHandle,
    state: &AppState,
    idea_id: i64,
    text: String,
) -> Result<(), AppError> {
    use super::ideas::types::Entity as Ideas;

    info!("Adding highlight to idea {}: {} chars", idea_id, text.len());

    // Find the idea
    let idea = Ideas::find_by_id(idea_id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::other(format!("Idea {} not found", idea_id)))?;

    // Append to notes with separator
    let updated_notes = if let Some(existing_notes) = idea.notes_markdown.as_ref() {
        if existing_notes.trim().is_empty() {
            text.clone()
        } else {
            format!("{}\n\n---\n\n{}", existing_notes, text)
        }
    } else {
        text.clone()
    };

    // Update the idea
    let mut active: super::ideas::types::ActiveModel = idea.into();
    active.notes_markdown = Set(Some(updated_notes.clone()));
    active.update(&state.db).await?;

    info!("Highlight added successfully to idea {}", idea_id);

    // Emit event to notify frontend
    #[derive(Clone, serde::Serialize)]
    struct HighlightPayload {
        idea_id: i64,
        text: String,
    }

    app.emit(
        "highlight-added",
        HighlightPayload {
            idea_id,
            text: text.clone(),
        },
    )
    .map_err(|e| AppError::other(format!("Failed to emit event: {}", e)))?;

    info!("Event emitted for highlight added to idea {}", idea_id);
    Ok(())
}
