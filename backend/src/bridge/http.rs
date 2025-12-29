use super::dispatch::{
    dispatch, ApiError, BridgeContext, CommandRequest, CommandResponse, ErrorResponse,
};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use serde_json::json;

pub fn router(ctx: BridgeContext) -> Router {
    Router::new()
        .route("/api/command", post(handle_command))
        .with_state(ctx)
}

async fn handle_command(
    State(ctx): State<BridgeContext>,
    Json(req): Json<CommandRequest>,
) -> Result<Json<CommandResponse>, ApiErrorWrapper> {
    let result = dispatch(&req.command, req.payload, &ctx).await?;
    Ok(Json(CommandResponse { result }))
}

#[derive(Debug)]
pub struct ApiErrorWrapper(pub ApiError);

impl IntoResponse for ApiErrorWrapper {
    fn into_response(self) -> Response {
        let status = match self.0 {
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ApiError::Handler(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::Serde(_) => StatusCode::BAD_REQUEST,
        };
        let body = Json(json!(ErrorResponse {
            message: self.0.to_string()
        }));
        (status, body).into_response()
    }
}

impl From<ApiError> for ApiErrorWrapper {
    fn from(err: ApiError) -> Self {
        ApiErrorWrapper(err)
    }
}
