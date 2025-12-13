//! Sensitive data sanitization utilities
//!
//! Provides functions to redact API keys, tokens, and other sensitive
//! information from URLs, request bodies, and log output.

/// Sanitize URLs by redacting API keys in query parameters
pub(crate) fn sanitize_url(raw: &str) -> String {
    if let Some(idx) = raw.find('?') {
        let (base, query) = raw.split_at(idx + 1);
        let mut pairs = Vec::new();
        for part in query.split('&') {
            let mut split = part.splitn(2, '=');
            let key = split.next().unwrap_or_default();
            let val = split.next().unwrap_or_default();
            let redacted = matches!(
                key.to_ascii_lowercase().as_str(),
                "apikey" | "api_key" | "token" | "key"
            );
            pairs.push(format!("{}={}", key, if redacted { "[REDACTED]" } else { val }));
        }
        format!("{}{}", base, pairs.join("&"))
    } else {
        raw.to_string()
    }
}

/// Sanitize JSON/form bodies by redacting API keys
pub(crate) fn sanitize_body(raw: &str) -> String {
    let mut s = raw.to_string();
    for marker in ["apikey\":\"", "api_key\":\"", "token\":\""] {
        if let Some(idx) = s.find(marker) {
            let start = idx + marker.len();
            if let Some(end) = s[start..].find('"') {
                s.replace_range(start..start + end, "[REDACTED]");
            }
        }
    }
    for marker in ["apikey=", "api_key=", "token="] {
        if let Some(idx) = s.find(marker) {
            let start = idx + marker.len();
            let end = s[start..]
                .find(|c: char| c == '&' || c == ' ' || c == '\n')
                .map(|e| start + e)
                .unwrap_or_else(|| s.len());
            s.replace_range(start..end, "[REDACTED]");
        }
    }
    s
}
