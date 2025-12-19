import { invoke } from '@tauri-apps/api/core';

/**
 * Invoke a Tauri command that accepts a single `input` DTO argument.
 * Keeps frontend payloads camelCase and avoids per-command arg-shape drift.
 */
export async function invokeInput<T, I>(command: string, input: I): Promise<T> {
  return invoke<T>(command, { input });
}

/**
 * Invoke a Tauri command with no arguments.
 */
export async function invokeNoArgs<T>(command: string): Promise<T> {
  return invoke<T>(command);
}
