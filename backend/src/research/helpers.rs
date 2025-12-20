use crate::research::dto::ResearchCapability;
use crate::research::entities::accounts;
use crate::connectors::Connector;
use chrono::NaiveDateTime;

pub fn format_naive(dt: NaiveDateTime) -> String {
    // Use a fallible conversion to avoid panics on out-of-range datetimes
    dt.and_utc().to_rfc3339()
}

/// Check if account is enabled and allows the required capability; also check connector support.
// TODO: remove allow(dead_code) when capability guard is fully wired through commands
#[allow(dead_code)]
pub fn ensure_capability(
    account: &accounts::Model,
    connector: &dyn Connector,
    cap: ResearchCapability,
) -> Result<(), String> {
    if !account.enabled {
        return Err("Account disabled".into());
    }
    let allowed: Vec<ResearchCapability> =
        serde_json::from_str(&account.allowed_caps_json).unwrap_or_default();
    if !allowed.contains(&cap) {
        return Err("Capability not allowed for this account".into());
    }
    if !connector.supported_capabilities().contains(&cap) {
        return Err("Connector does not support this capability".into());
    }
    Ok(())
}
