/**
 * Debug utilities for tracking execution timing.
 * @module debug
 */

/**
 * Get current time in milliseconds (high resolution).
 * @returns {number} Current time in milliseconds.
 */
export function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

/**
 * Create a debug information object.
 * @param {Object} options - Debug options.
 * @param {string} [options.path='fallback'] - Execution path taken.
 * @param {number|null} [options.start=null] - Start time in milliseconds.
 * @param {string|null} [options.model=null] - Model used (if any).
 * @param {boolean} [options.memory_read=false] - Whether memory was read.
 * @param {boolean} [options.memory_write=false] - Whether memory was written.
 * @returns {Object} Debug object with path, duration_ms, model, memory_read, memory_write.
 */
import { DebugInfo } from './types';

export function makeDebug(options: Partial<DebugInfo>): DebugInfo {
  const start = options && typeof options.start === 'number' ? options.start : undefined;
  const durationMs = start === undefined ? null : Math.max(0, Math.round(nowMs() - start));
  return {
    path: options.path || 'fallback',
    duration_ms: durationMs,
    model: options.model || null,
    memory_read: Boolean(options.memory_read),
    memory_write: Boolean(options.memory_write),
  };
}

