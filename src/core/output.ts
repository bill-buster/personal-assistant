/**
 * Output Formatter
 *
 * Provides consistent JSON and human-readable output formatting.
 * All CLI commands use this for their output.
 *
 * @module output
 */

import { DebugInfo, Task, MemoryEntry } from './types';

export interface CLIResult {
    ok: boolean;
    result?: unknown;
    error?: string;
    _debug?: DebugInfo | null;
}

/**
 * Format a result for CLI output.
 * @param result - The tool/command result
 * @param human - If true, format for human readability
 */
export function formatOutput(result: CLIResult, human: boolean = false): string {
    if (human) {
        return formatHuman(result);
    }
    return JSON.stringify(result);
}

/**
 * Human-readable formatting
 */
function formatHuman(result: CLIResult): string {
    if (!result.ok) {
        return `❌ Error: ${result.error || 'Unknown error'}`;
    }

    const data = result.result;

    // Handle different result types
    if (data === null || data === undefined) {
        return '✓ Done';
    }

    if (typeof data === 'string') {
        return data;
    }

    if (Array.isArray(data)) {
        if (data.length === 0) return '(empty list)';
        return data.map((item, i) => formatListItem(item, i + 1)).join('\n');
    }

    if (typeof data === 'object') {
        // Check for common patterns
        if ('entries' in data && Array.isArray(data.entries)) {
            if (data.entries.length === 0) return '(no entries found)';
            return data.entries.map((e: unknown, i: number) => formatListItem(e, i + 1)).join('\n');
        }
        if ('tasks' in data && Array.isArray(data.tasks)) {
            if (data.tasks.length === 0) return '(no tasks)';
            return data.tasks.map((t: unknown) => formatTask(t)).join('\n');
        }
        if ('message' in data) {
            return `✓ ${data.message}`;
        }
        if ('value' in data) {
            return `→ ${data.value}`;
        }
        // Default object formatting
        return JSON.stringify(data, null, 2);
    }

    return String(data);
}

function formatListItem(item: unknown, index: number): string {
    if (typeof item === 'string') {
        return `${index}. ${item}`;
    }
    if (typeof item === 'object' && item !== null) {
        const entry = item as MemoryEntry;
        if ('text' in entry && typeof entry.text === 'string') {
            const ts = entry.ts ? ` (${entry.ts})` : '';
            return `${index}. ${entry.text}${ts}`;
        }
    }
    return `${index}. ${JSON.stringify(item)}`;
}

function formatTask(task: unknown): string {
    if (typeof task !== 'object' || task === null) {
        return `${JSON.stringify(task)}`;
    }
    const t = task as Task;
    const status = t.done ? '✓' : '○';
    const priority = t.priority ? ` [${t.priority}]` : '';
    const due = t.due ? ` (due: ${t.due})` : '';
    return `${status} #${t.id}: ${t.text}${priority}${due}`;
}

/**
 * Print result to stdout with appropriate formatting
 */
export function printResult(result: CLIResult, human: boolean = false): void {
    const output = formatOutput(result, human);
    console.log(output);
}

/**
 * Print an error and exit
 */
export function printError(message: string, code: number = 1): never {
    console.error(human ? `❌ ${message}` : JSON.stringify({ ok: false, error: message }));
    process.exit(code);
}

// Track human mode globally for printError
let human = false;
export function setHumanMode(value: boolean) {
    human = value;
}
