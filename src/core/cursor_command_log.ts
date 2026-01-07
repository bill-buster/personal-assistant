/**
 * Cursor IDE command logging system.
 * Tracks VS Code/Cursor command execution for analytics.
 * Shared between VS Code extension and CLI.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface CursorCommandLogEntry {
    ts: string;
    command_id: string;
    command_title?: string;
    category?: string;
    success: boolean;
    error?: string;
    duration_ms?: number;
    context?: {
        active_file?: string;
        selection?: string;
        workspace_folder?: string;
    };
}

export class CursorCommandLogger {
    private logPath: string;
    private enabled: boolean;
    private commandStartTimes: Map<string, number> = new Map();

    constructor(logPath?: string, enabled: boolean = true) {
        // Default to ~/.assistant-data/cursor_command_log.jsonl
        this.logPath =
            logPath || path.join(os.homedir(), '.assistant-data', 'cursor_command_log.jsonl');
        this.enabled = enabled;

        if (enabled) {
            const dir = path.dirname(this.logPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Log command start (for timing).
     */
    logCommandStart(commandId: string): void {
        if (!this.enabled) return;
        this.commandStartTimes.set(commandId, Date.now());
    }

    /**
     * Log command execution.
     */
    logCommand(
        commandId: string,
        success: boolean,
        error?: string,
        metadata?: {
            commandTitle?: string;
            category?: string;
            durationMs?: number;
            context?: {
                activeFile?: string;
                selection?: string;
                workspaceFolder?: string;
            };
        }
    ): void {
        if (!this.enabled) return;

        try {
            const startTime = this.commandStartTimes.get(commandId);
            const duration =
                metadata?.durationMs || (startTime ? Date.now() - startTime : undefined);
            if (startTime) {
                this.commandStartTimes.delete(commandId);
            }

            const entry: CursorCommandLogEntry = {
                ts: new Date().toISOString(),
                command_id: commandId,
                command_title: metadata?.commandTitle,
                category: metadata?.category || this.classifyCategory(commandId),
                success,
                error,
                duration_ms: duration,
                context: metadata?.context,
            };

            fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf8');
        } catch (_err) {
            // Silently ignore logging failures
        }
    }

    /**
     * Classify command category based on command ID.
     */
    private classifyCategory(commandId: string): string {
        if (commandId.startsWith('personal-assistant.')) return 'assistant';
        if (commandId.includes('cursor') || commandId.includes('ai')) return 'cursor_ai';
        if (commandId.includes('git')) return 'git';
        if (commandId.includes('file') || commandId.includes('editor')) return 'editor';
        if (commandId.includes('search') || commandId.includes('find')) return 'search';
        if (commandId.includes('terminal')) return 'terminal';
        if (commandId.includes('debug')) return 'debug';
        return 'general';
    }

    /**
     * Read command logs.
     */
    readLogs(limit?: number): CursorCommandLogEntry[] {
        if (!fs.existsSync(this.logPath)) return [];

        try {
            const content = fs.readFileSync(this.logPath, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);
            const entries = lines.map(line => JSON.parse(line) as CursorCommandLogEntry);

            // Sort by timestamp (newest first)
            entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

            return limit ? entries.slice(0, limit) : entries;
        } catch (_err) {
            return [];
        }
    }

    /**
     * Get statistics from logs.
     */
    getStats(entries?: CursorCommandLogEntry[]): {
        total: number;
        success: number;
        error: number;
        success_rate: string;
        avg_latency_ms: number;
        by_category: Record<string, { total: number; success: number; error: number }>;
        by_command: Record<string, { total: number; success: number; error: number }>;
    } {
        const logs = entries || this.readLogs();

        const stats = {
            total: logs.length,
            success: 0,
            error: 0,
            success_rate: '0%',
            avg_latency_ms: 0,
            by_category: {} as Record<string, { total: number; success: number; error: number }>,
            by_command: {} as Record<string, { total: number; success: number; error: number }>,
        };

        let totalLatency = 0;
        let latencyCount = 0;

        for (const entry of logs) {
            // Count outcomes
            if (entry.success) stats.success++;
            else stats.error++;

            // Count by category
            const cat = entry.category || 'unknown';
            if (!stats.by_category[cat]) {
                stats.by_category[cat] = { total: 0, success: 0, error: 0 };
            }
            stats.by_category[cat].total++;
            if (entry.success) stats.by_category[cat].success++;
            else stats.by_category[cat].error++;

            // Count by command
            const cmd = entry.command_id;
            if (!stats.by_command[cmd]) {
                stats.by_command[cmd] = { total: 0, success: 0, error: 0 };
            }
            stats.by_command[cmd].total++;
            if (entry.success) stats.by_command[cmd].success++;
            else stats.by_command[cmd].error++;

            // Calculate latency
            if (entry.duration_ms) {
                totalLatency += entry.duration_ms;
                latencyCount++;
            }
        }

        stats.avg_latency_ms = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
        stats.success_rate =
            stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) + '%' : '0%';

        return stats;
    }
}
