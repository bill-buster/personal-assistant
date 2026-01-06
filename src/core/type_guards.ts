/**
 * Type Guard Helpers
 *
 * Provides reusable type guard functions for runtime type checking.
 * These guards are used with readJsonl validators and result type checking.
 *
 * @module type_guards
 */

import { Task, Reminder, MemoryEntry } from './types';

/**
 * Type guard for Task entries.
 */
export function isTask(entry: unknown): entry is Task {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        'text' in entry &&
        'done' in entry &&
        'created_at' in entry &&
        typeof (entry as { id: unknown }).id === 'number' &&
        typeof (entry as { text: unknown }).text === 'string' &&
        typeof (entry as { done: unknown }).done === 'boolean' &&
        typeof (entry as { created_at: unknown }).created_at === 'string'
    );
}

/**
 * Type guard for Reminder entries.
 */
export function isReminder(entry: unknown): entry is Reminder {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        'text' in entry &&
        'due_at' in entry &&
        'done' in entry &&
        'created_at' in entry &&
        typeof (entry as { id: unknown }).id === 'number' &&
        typeof (entry as { text: unknown }).text === 'string' &&
        typeof (entry as { due_at: unknown }).due_at === 'string' &&
        typeof (entry as { done: unknown }).done === 'boolean' &&
        typeof (entry as { created_at: unknown }).created_at === 'string'
    );
}

/**
 * Type guard for MemoryEntry.
 */
export function isMemoryEntry(entry: unknown): entry is MemoryEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'text' in entry &&
        'ts' in entry &&
        typeof (entry as { text: unknown }).text === 'string' &&
        typeof (entry as { ts: unknown }).ts === 'string'
    );
}

/**
 * Contact type definition.
 */
export interface Contact {
    name: string;
    email?: string;
    phone?: string;
    ts?: string;
}

/**
 * Type guard for Contact entries.
 */
export function isContact(entry: unknown): entry is Contact {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'name' in entry &&
        typeof (entry as { name: unknown }).name === 'string'
    );
}

/**
 * CalendarEvent type definition.
 */
export interface CalendarEvent {
    id: string;
    title: string;
    start_time: string;
    duration_minutes?: number;
    ts?: string;
}

/**
 * Type guard for CalendarEvent entries.
 */
export function isCalendarEvent(entry: unknown): entry is CalendarEvent {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        'title' in entry &&
        'start_time' in entry &&
        typeof (entry as { id: unknown }).id === 'string' &&
        typeof (entry as { title: unknown }).title === 'string' &&
        typeof (entry as { start_time: unknown }).start_time === 'string'
    );
}

/**
 * EmailEntry type definition.
 */
export interface EmailEntry {
    id: string;
    from: string;
    to?: string;
    subject?: string;
    body?: string;
    snippet?: string;
    ts?: string;
}

/**
 * Type guard for EmailEntry.
 */
export function isEmailEntry(entry: unknown): entry is EmailEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry &&
        typeof (entry as { id: unknown }).id === 'string'
    );
}

/**
 * MessageEntry type definition.
 */
export interface MessageEntry {
    id: string;
    to: string;
    body: string;
    ts: string;
    sent_via?: string;
}

/**
 * Type guard for MessageEntry.
 */
export function isMessageEntry(entry: unknown): entry is MessageEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'to' in entry &&
        'body' in entry &&
        'ts' in entry &&
        typeof (entry as { to: unknown }).to === 'string' &&
        typeof (entry as { body: unknown }).body === 'string' &&
        typeof (entry as { ts: unknown }).ts === 'string'
    );
}

// Tool Result Type Guards

/**
 * Type guard for calculate tool result.
 */
export function isCalculateResult(
    result: unknown
): result is { expression: string; value: number } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'expression' in result &&
        'value' in result &&
        typeof (result as { expression: unknown }).expression === 'string' &&
        typeof (result as { value: unknown }).value === 'number'
    );
}

/**
 * Type guard for get_time tool result.
 */
export function isGetTimeResult(result: unknown): result is { time: string; timestamp: number } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'time' in result &&
        'timestamp' in result &&
        typeof (result as { time: unknown }).time === 'string' &&
        typeof (result as { timestamp: unknown }).timestamp === 'number'
    );
}

/**
 * Type guard for delegate tool result.
 */
export function isDelegateResult(
    result: unknown
): result is { task: string; delegated_to: string } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'task' in result &&
        'delegated_to' in result &&
        typeof (result as { task: unknown }).task === 'string' &&
        typeof (result as { delegated_to: unknown }).delegated_to === 'string'
    );
}

/**
 * Type guard for get_weather tool result.
 */
export function isGetWeatherResult(result: unknown): result is {
    location: string;
    region: string;
    country: string;
    temperature_f: number;
    temperature_c: number;
    feels_like_f: number;
    feels_like_c: number;
    humidity: number;
    condition: string;
    wind_mph: number;
    wind_dir: string;
    visibility_miles: number;
    uv_index: number;
} {
    return (
        typeof result === 'object' &&
        result !== null &&
        'location' in result &&
        'temperature_c' in result &&
        typeof (result as { location: unknown }).location === 'string' &&
        typeof (result as { temperature_c: unknown }).temperature_c === 'number'
    );
}

/**
 * Type guard for file operation results (delete_file, move_file, copy_file).
 */
export function isFileOperationResult(
    result: unknown
): result is { deleted?: boolean; source?: string; destination?: string; created?: boolean } {
    return typeof result === 'object' && result !== null;
}

/**
 * Type guard for file_info tool result.
 */
export function isFileInfoResult(result: unknown): result is {
    path: string;
    type: string;
    size: number;
    modified: string;
    permissions: string;
    isFile: boolean;
    isDirectory: boolean;
    isSymbolicLink: boolean;
} {
    return (
        typeof result === 'object' &&
        result !== null &&
        'path' in result &&
        'type' in result &&
        'size' in result &&
        typeof (result as { path: unknown }).path === 'string' &&
        typeof (result as { type: unknown }).type === 'string' &&
        typeof (result as { size: unknown }).size === 'number'
    );
}

/**
 * Type guard for count_words tool result.
 */
export function isCountWordsResult(
    result: unknown
): result is { words: number; lines: number; characters: number } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'words' in result &&
        'lines' in result &&
        'characters' in result &&
        typeof (result as { words: unknown }).words === 'number' &&
        typeof (result as { lines: unknown }).lines === 'number' &&
        typeof (result as { characters: unknown }).characters === 'number'
    );
}

/**
 * Type guard for git_status tool result.
 */
export function isGitStatusResult(result: unknown): result is {
    clean: boolean;
    files?: string[];
    summary?: string;
    staged?: string[];
    empty?: boolean;
} {
    return typeof result === 'object' && result !== null && 'clean' in result;
}

/**
 * Type guard for git_log tool result.
 */
export function isGitLogResult(result: unknown): result is { commits: unknown[]; count: number } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'commits' in result &&
        'count' in result &&
        Array.isArray((result as { commits: unknown }).commits) &&
        typeof (result as { count: unknown }).count === 'number'
    );
}

/**
 * Type guard for git_diff tool result.
 */
export function isGitDiffResult(
    result: unknown
): result is { staged?: string[]; files?: string[] } {
    return typeof result === 'object' && result !== null;
}

/**
 * Type guard for grep tool result.
 */
export function isGrepResult(
    result: unknown
): result is { matches: unknown[]; skipped_count?: number } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'matches' in result &&
        Array.isArray((result as { matches: unknown }).matches)
    );
}

/**
 * Type guard for read_url tool result.
 */
export function isReadUrlResult(
    result: unknown
): result is { url: string; content: string; length: number } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'url' in result &&
        'content' in result &&
        'length' in result &&
        typeof (result as { url: unknown }).url === 'string' &&
        typeof (result as { content: unknown }).content === 'string' &&
        typeof (result as { length: unknown }).length === 'number'
    );
}
