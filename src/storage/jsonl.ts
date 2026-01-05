import * as fs from 'node:fs';
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
    isValid?: (entry: any) => boolean;
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
    } catch (err: any) {
        console.warn(`[JSONL Error] Failed to read file ${filePath}: ${err.message}`);
        return [];
    }

    const lines = raw.split(/\r?\n/);
    const entries: T[] = [];
    const corruptLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines

        try {
            const parsed = JSON.parse(line);
            if (!isValid || isValid(parsed)) {
                entries.push(parsed as T);
            }
        } catch (err: any) {
            console.warn(
                `[JSONL Warning] Skipped corrupt line ${i + 1} in ${filePath}: ${err.message}`
            );
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
        } catch (writeErr: any) {
            console.error(
                `[JSONL Error] Failed to write to quarantine file ${corruptPath}: ${writeErr.message}`
            );
        }
    }

    return entries;
}

/**
 * Atomically writes an array of entries to a JSONL file.
 * Writes to a temporary file first, then renames it to ensure data integrity.
 * Uses crypto.randomUUID() to prevent race conditions in concurrent writes.
 *
 * @param filePath Path to the destination file.
 * @param entries Array of data entries to write.
 */
export function writeJsonlAtomic<T>(filePath: string, entries: T[]): void {
    // Use UUID to prevent race conditions when multiple processes write simultaneously
    const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;
    // Ensure every file ends with a newline if it has content
    const content =
        entries.map(e => JSON.stringify(e)).join('\n') + (entries.length > 0 ? '\n' : '');

    try {
        fs.writeFileSync(tempPath, content, 'utf8');
        fs.renameSync(tempPath, filePath);
    } catch (err: any) {
        try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {
            // Ignore cleanup error
        }
        throw new Error(`Failed to write JSONL atomically to ${filePath}: ${err.message}`);
    }
}

/**
 * Appends a single entry to a JSONL file.
 * Ensures the entry is terminated with a newline.
 *
 * @param filePath Path to the destination file.
 * @param entry The data entry to append.
 */
export function appendJsonl<T>(filePath: string, entry: T): void {
    const line = JSON.stringify(entry);
    try {
        // We assume the file properly ends with a newline from previous writes.
        // We strictly enforce that this write ends with a newline.
        fs.appendFileSync(filePath, `${line}\n`, 'utf8');
    } catch (err: any) {
        throw new Error(`Failed to append to JSONL ${filePath}: ${err.message}`);
    }
}
