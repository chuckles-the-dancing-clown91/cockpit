-- Migration 002 Down: Remove app_settings table

DROP INDEX IF EXISTS idx_app_settings_category;
DROP INDEX IF EXISTS idx_app_settings_key;
DROP TABLE IF EXISTS app_settings;
