//! Encryption and decryption utilities using AES-256-GCM
//!
//! This module provides secure encryption for sensitive data like API keys.
//! 
//! ## Security Design
//! 
//! - **Algorithm**: AES-256-GCM (authenticated encryption)
//! - **Key Size**: 256 bits (32 bytes)
//! - **Nonce Size**: 96 bits (12 bytes)
//! - **Nonce Generation**: Random, cryptographically secure
//! - **Key Zeroization**: Keys are zeroed from memory after use
//! 
//! ## Storage Format
//! 
//! Encrypted data is stored as: `[12-byte nonce][ciphertext + auth tag]`
//! 
//! ## Environment Variable
//! 
//! Requires `COCKPIT_MASTER_KEY` environment variable:
//! - Must be a 64-character hex string (32 bytes)
//! - Generate with: `openssl rand -hex 32`
//! - Store securely, never commit to version control
//! 
//! ## Nonce Uniqueness
//! 
//! Each encryption operation generates a fresh random nonce.
//! For production use with high volume, consider implementing:
//! - Nonce collision detection
//! - Key rotation policies
//! - Periodic master key derivation

use aes_gcm::{aead::Aead, aead::KeyInit, Aes256Gcm, Nonce};
use rand::RngCore;
use std::env;
use zeroize::Zeroize;

const MASTER_KEY_ENV: &str = "COCKPIT_MASTER_KEY";
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

/// Load and validate master encryption key from environment
/// 
/// The key is expected to be a 64-character hex string representing 32 bytes.
/// After loading, the hex string representation is zeroized for security.
fn load_master_key() -> Result<[u8; KEY_LEN], String> {
    let mut raw = env::var(MASTER_KEY_ENV)
        .map_err(|_| format!("missing {MASTER_KEY_ENV} env var for encryption key"))?;
    
    let mut bytes = hex::decode(raw.trim()).map_err(|e| format!("invalid master key hex: {e}"))?;
    
    // Zeroize the hex string from memory
    raw.zeroize();
    
    if bytes.len() != KEY_LEN {
        bytes.zeroize(); // Clean up before returning error
        return Err(format!(
            "invalid master key length: expected {KEY_LEN} bytes, got {}",
            bytes.len()
        ));
    }
    
    let mut arr = [0u8; KEY_LEN];
    arr.copy_from_slice(&bytes);
    
    // Zeroize temporary buffer
    bytes.zeroize();
    
    Ok(arr)
}

/// Encrypt plaintext using AES-256-GCM
/// 
/// Generates a random 12-byte nonce and encrypts the plaintext.
/// Returns: `[nonce][ciphertext+tag]` as a single byte vector.
/// 
/// # Security Notes
/// 
/// - Each encryption uses a fresh random nonce
/// - Master key is zeroized after use
/// - For very high volume (>2^32 encryptions), consider key rotation
pub fn encrypt_api_key(plaintext: &str) -> Result<Vec<u8>, String> {
    let mut key = load_master_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    
    // Zeroize key after cipher creation
    key.zeroize();

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let mut out = nonce_bytes.to_vec();
    let cipher_text = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;
    out.extend_from_slice(&cipher_text);
    Ok(out)
}

/// Decrypt ciphertext using AES-256-GCM
/// 
/// Expects input format: `[12-byte nonce][ciphertext+tag]`
/// 
/// # Security Notes
/// 
/// - Master key is zeroized after use
/// - Decrypted plaintext is returned as String (caller must zeroize if needed)
/// - Authentication tag is verified automatically by GCM mode
pub fn decrypt_api_key(data: &[u8]) -> Result<String, String> {
    if data.len() <= NONCE_LEN {
        return Err("ciphertext too short".into());
    }
    
    let mut key = load_master_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    
    // Zeroize key after cipher creation
    key.zeroize();

    let (nonce_bytes, cipher_text) = data.split_at(NONCE_LEN);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plain = cipher
        .decrypt(nonce, cipher_text)
        .map_err(|e| e.to_string())?;
    String::from_utf8(plain).map_err(|e| e.to_string())
}
