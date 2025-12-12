//! Encryption and decryption utilities using AES-256-GCM
//!
//! This module provides secure encryption for sensitive data like API keys.
//! Requires COCKPIT_MASTER_KEY environment variable (32-byte hex string).

use aes_gcm::{aead::Aead, aead::KeyInit, Aes256Gcm, Nonce};
use rand::RngCore;
use std::env;

const MASTER_KEY_ENV: &str = "COCKPIT_MASTER_KEY";
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

fn load_master_key() -> Result<[u8; KEY_LEN], String> {
    let raw = env::var(MASTER_KEY_ENV)
        .map_err(|_| format!("missing {MASTER_KEY_ENV} env var for encryption key"))?;
    let bytes = hex::decode(raw.trim()).map_err(|e| format!("invalid master key hex: {e}"))?;
    if bytes.len() != KEY_LEN {
        return Err(format!(
            "invalid master key length: expected {KEY_LEN} bytes, got {}",
            bytes.len()
        ));
    }
    let mut arr = [0u8; KEY_LEN];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

pub fn encrypt_api_key(plaintext: &str) -> Result<Vec<u8>, String> {
    let key = load_master_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let mut out = nonce_bytes.to_vec();
    let cipher_text = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;
    out.extend_from_slice(&cipher_text);
    Ok(out)
}

pub fn decrypt_api_key(data: &[u8]) -> Result<String, String> {
    if data.len() <= NONCE_LEN {
        return Err("ciphertext too short".into());
    }
    let key = load_master_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let (nonce_bytes, cipher_text) = data.split_at(NONCE_LEN);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plain = cipher
        .decrypt(nonce, cipher_text)
        .map_err(|e| e.to_string())?;
    String::from_utf8(plain).map_err(|e| e.to_string())
}
