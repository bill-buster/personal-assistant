import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/**
 * Options for reading JSONL files.
 */
export interface ReadJsonlOptions<_T = unknown> {
    /**
     * Path to the JSONL file.
     */
    filePath: string;
    /**
     * Optional validator function. Entries failing this check are skipped (but not considered corrupt).
     */
    isValid?: (entry: unknown) => boolean;
    /**
     * Whether to quarantine corrupt lines to a separate file. Default: true.
     */
    quarantine?: boolean;
}

/**
 * Safely reads a JSONL file, handling corrupt lines.
 * Corrupt lines are logged and optionally moved to a .corrupt file.
 *
 * @param options Configuration options.
 * @returns Array of valid entries.
 */
export function readJsonlSafely<T>(options: ReadJsonlOptions<T>): T[] {
    const { filePath, isValid, quarantine = true } = options;

    if (!fs.existsSync(filePath)) {
        return [];
    }

    let raw: string;
    try {
        raw = fs.readFileSync(filePath, 'utf8');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`[JSONL Error] Failed to read file ${filePath}: ${message}`);
        return [];
    }

    const lines = raw.split(/\r?\n/);
    const entries: T[] = [];
    const corruptLines: string[] = [];

    // Optimize: limit warning spam for large files with many corrupt lines
    const maxWarnings = 10;
    let warningCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines

        try {
            const parsed = JSON.parse(line);
            if (!isValid || isValid(parsed)) {
                entries.push(parsed as T);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown parse error';
            // Only log first few warnings to avoid spam
            if (warningCount < maxWarnings) {
                console.warn(
                    `[JSONL Warning] Skipped corrupt line ${i + 1} in ${filePath}: ${message}`
                );
                warningCount++;
            }
            if (quarantine) {
                corruptLines.push(line);
            }
        }
    }

    if (corruptLines.length > 0 && quarantine) {
        const corruptPath = `${filePath}.corrupt`;
        try {
            // Append corrupt lines to the corrupt file
            const payload = corruptLines.join('\n') + '\n';
            fs.appendFileSync(corruptPath, payload, 'utf8');
            console.warn(
                `[JSONL Recovery] Quarantined ${corruptLines.length} corrupt line(s) to ${corruptPath}`
            );
        } catch (writeErr: unknown) {
            const message = writeErr instanceof Error ? writeErr.message : 'Unknown error';
            console.error(
                `[JSONL Error] Failed to write to quarantine file ${corruptPath}: ${message}`
            );
        }
    }

    return entries;
}

/**
 * Result type for JSONL operations.
 */
export type JsonlResult = { ok: true } | { ok: false; error: string };

/**
 * Atomically writes an array of entries to a JSONL file.
 * Writes to a temporary file first, then renames it to ensure data integrity.
 * Uses crypto.randomUUID() to prevent race conditions in concurrent writes.
 *
 * @param filePath Path to the destination file.
 * @param entries Array of data entries to write.
 * @returns Result indicating success or failure.
 */
export function writeJsonlAtomic<T>(filePath: string, entries: T[]): JsonlResult {
    // Ensure directory exists before writing (prevents crash if directory missing)
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Use UUID to prevent race conditions when multiple processes write simultaneously
    // Temp file must be in same directory for atomic rename to work cross-platform
    // (rename only works on same filesystem/device)
    const tempPath = path.join(dir, `${path.basename(filePath)}.tmp.${crypto.randomUUID()}`);

    // Optimize: for large arrays, pre-allocate string array to avoid repeated allocations
    let content: string;
    if (entries.length < 100) {
        // Small arrays: simple map+join is faster
        content = entries.map(e => JSON.stringify(e)).join('\n') + (entries.length > 0 ? '\n' : '');
    } else {
        // Large arrays: pre-allocate array to avoid repeated string concatenation
        const lines: string[] = new Array(entries.length);
        for (let i = 0; i < entries.length; i++) {
            lines[i] = JSON.stringify(entries[i]);
        }
        content = lines.join('\n') + '\n';
    }

    try {
        fs.writeFileSync(tempPath, content, 'utf8');
        // Atomic rename: works on same filesystem, same directory
        // On Windows (Node 12+), rename over existing file works correctly
        fs.renameSync(tempPath, filePath);
        return { ok: true };
    } catch (err: unknown) {
        try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {
            // Ignore cleanup error
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { ok: false, error: `Failed to write JSONL atomically to ${filePath}: ${message}` };
    }
}

/**
 * Appends a single entry to a JSONL file.
 * Ensures the entry is terminated with a newline.
 *
 * @param filePath Path to the destination file.
 * @param entry The data entry to append.
 * @returns Result indicating success or failure.
 */
export function appendJsonl<T>(filePath: string, entry: T): JsonlResult {
    const line = JSON.stringify(entry);
    try {
        // We assume the file properly ends with a newline from previous writes.
        // We strictly enforce that this write ends with a newline.
        fs.appendFileSync(filePath, `${line}\n`, 'utf8');
        return { ok: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { ok: false, error: `Failed to append to JSONL ${filePath}: ${message}` };
    }
}
