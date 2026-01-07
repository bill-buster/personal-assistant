import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { MemoryEntry } from '../core/types';

function normalizeMemory(raw: unknown): { version: number; entries: MemoryEntry[] } {
    if (Array.isArray(raw)) {
        return { version: 1, entries: raw };
    }
    if (raw && typeof raw === 'object' && 'entries' in raw && Array.isArray(raw.entries)) {
        const obj = raw as { version?: number; entries: MemoryEntry[] };
        return { version: obj.version || 1, entries: obj.entries };
    }
    return { version: 1, entries: [] };
}

export function readMemory(filePath: string): { version: number; entries: MemoryEntry[] } {
    if (!fs.existsSync(filePath)) {
        return { version: 1, entries: [] };
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return normalizeMemory(parsed);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Memory Error] Failed to parse memory file: ${message}`);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const corruptPath = `${filePath}.corrupt.${ts}`;
        try {
            fs.renameSync(filePath, corruptPath);
            console.error(
                `[Memory Recovery] Moving corrupt file to ${corruptPath} and starting fresh.`
            );
        } catch {
            // If rename fails, fall through and start fresh.
        }
        return { version: 1, entries: [] };
    }
}

export function writeMemory(
    filePath: string,
    memory: { entries: MemoryEntry[]; version?: number }
): void {
    const normalized = normalizeMemory(memory);
    const payload = `${JSON.stringify(normalized, null, 2)}\n`;
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    // Use UUID to prevent race conditions when multiple processes write simultaneously
    const tmpPath = `${filePath}.tmp.${crypto.randomUUID()}`;
    try {
        fs.writeFileSync(tmpPath, payload, 'utf8');
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        // Clean up temp file on failure
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {
            // Ignore cleanup error
        }
        throw err;
    }
}
