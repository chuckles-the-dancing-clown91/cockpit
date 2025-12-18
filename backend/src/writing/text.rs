//! Text extraction utilities for TipTap editor JSON
//!
//! Provides functions to extract plain text from TipTap/ProseMirror JSON
//! for search indexing and word count calculations.

use serde_json::Value as JsonValue;

/// Extracts plain text from TipTap editor JSON format
///
/// Recursively walks the document tree and concatenates all text nodes
/// with spaces between them.
///
/// # Arguments
/// * `doc` - TipTap JSON document structure
///
/// # Returns
/// Plain text string with words separated by spaces
pub fn extract_plain_text(doc: &JsonValue) -> String {
    let mut out = String::new();
    walk(doc, &mut out);
    out.trim().to_string()
}

/// Recursive walker for JSON document tree
fn walk(v: &JsonValue, out: &mut String) {
    match v {
        JsonValue::Object(map) => {
            // Extract text nodes (TipTap text marks)
            if let Some(JsonValue::String(t)) = map.get("text") {
                if !out.is_empty() {
                    out.push(' ');
                }
                out.push_str(t);
            }
            
            // Walk content arrays (common in TipTap nodes)
            if let Some(JsonValue::Array(content)) = map.get("content") {
                for c in content {
                    walk(c, out);
                }
            }
            
            // Walk all other nested objects/arrays
            for (_k, child) in map.iter() {
                if matches!(child, JsonValue::Object(_) | JsonValue::Array(_)) {
                    walk(child, out);
                }
            }
        }
        JsonValue::Array(arr) => {
            for c in arr {
                walk(c, out);
            }
        }
        _ => {}
    }
}

/// Calculates word count from plain text
///
/// # Arguments
/// * `text` - Plain text string
///
/// # Returns
/// Number of words (split by whitespace)
pub fn word_count(text: &str) -> i32 {
    text.split_whitespace().count() as i32
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_extract_simple_text() {
        let doc = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "Hello world" }
                    ]
                }
            ]
        });
        
        assert_eq!(extract_plain_text(&doc), "Hello world");
    }

    #[test]
    fn test_extract_multiple_paragraphs() {
        let doc = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "First paragraph" }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "Second paragraph" }
                    ]
                }
            ]
        });
        
        assert_eq!(extract_plain_text(&doc), "First paragraph Second paragraph");
    }

    #[test]
    fn test_word_count() {
        assert_eq!(word_count("Hello world"), 2);
        assert_eq!(word_count("  Multiple   spaces  "), 2);
        assert_eq!(word_count(""), 0);
    }
}
