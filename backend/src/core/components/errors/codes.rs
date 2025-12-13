//! Error code definitions for categorization and frontend display
//!
//! Provides numeric error codes organized by domain for consistent
//! error identification across the application.

/// Error codes for frontend display and error categorization
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    // Configuration: 1xxx
    ConfigInvalid = 1001,
    ConfigValidationFailed = 1002,

    // Database: 2xxx
    DatabaseConnection = 2001,
    DatabaseQuery = 2002,
    DatabaseMigration = 2003,
    DatabaseConstraint = 2004,

    // Storage: 3xxx
    StorageLimitExceeded = 3001,
    StorageOperationFailed = 3002,

    // API/Network: 4xxx
    ApiRateLimit = 4001,
    ApiRequestFailed = 4002,
    NetworkError = 4003,

    // Crypto: 5xxx
    CryptoEncryptionFailed = 5001,
    CryptoInvalidKey = 5002,

    // File I/O: 6xxx
    FileOperationFailed = 6001,
    FileNotFound = 6002,
    PermissionDenied = 6003,

    // Validation: 7xxx
    ValidationFailed = 7001,

    // Generic: 9xxx
    Unknown = 9999,
}

impl ErrorCode {
    /// Get the error code as an integer
    pub fn as_u32(self) -> u32 {
        self as u32
    }

    /// Get the error code as a string (e.g., "E2001")
    pub fn as_string(self) -> String {
        format!("E{:04}", self as u32)
    }
}
