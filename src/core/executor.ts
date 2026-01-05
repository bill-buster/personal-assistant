/**
 * Tool executor - validates and executes tool calls.
 * @module core/executor
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
    makeError,
    makePermissionError,
    DENIED_TOOL_BLOCKLIST,
    DENIED_AGENT_TOOLSET,
    ErrorCode,
} from './tool_contract';
import { readMemory, writeMemory } from '../storage/memory_store';
import { makeDebug, nowMs } from './debug';
import { parseShellArgs, buildShellCommand } from './arg_parser';
import {
    ExecutorContext,
    Permissions,
    MemoryEntry,
    ToolResult,
    ToolRegistry,
    Agent,
    Limits,
    PathOp,
    PathCapabilities,
    CommandCapabilities,
    SAFE_TOOLS,
} from './types';
import { loadPermissions } from './config';
import { readJsonlSafely, writeJsonlAtomic, appendJsonl } from '../storage/jsonl';
import { createNodeToolRegistry } from './tool_registry';

export interface ExecutorConfig {
    baseDir: string;
    memoryPath?: string;
    tasksPath?: string;
    memoryLogPath?: string;
    remindersPath?: string;
    emailsPath?: string;
    messagesPath?: string;
    contactsPath?: string;
    calendarPath?: string;
    permissionsPath?: string;
    auditPath?: string;
    auditEnabled?: boolean;
    memoryLimit?: number;
    limits: Limits;
    agent?: Agent;
    registry?: ToolRegistry;
}

export class Executor {
    private baseDir: string;
    private memoryPath: string;
    private tasksPath: string;
    private memoryLogPath: string;
    private remindersPath: string;
    private emailsPath: string;
    private messagesPath: string;
    private contactsPath: string;
    private calendarPath: string;
    private permissionsPath: string;
    private auditPath: string;
    private auditEnabled: boolean;
    private memoryLimit: number | null;
    private permissions: Permissions;
    private allowedPaths: Array<{ path: string; isDir: boolean }> = []; // Cache for normalized paths
    private agent: Agent | undefined;
    private registry: ToolRegistry;
    private limits: { maxReadSize: number; maxWriteSize: number };

    constructor(config: ExecutorConfig) {
        this.baseDir = config.baseDir;
        this.memoryPath = config.memoryPath || path.join(this.baseDir, 'memory.json');
        this.tasksPath = config.tasksPath || path.join(this.baseDir, 'tasks.jsonl');
        this.memoryLogPath = config.memoryLogPath || path.join(this.baseDir, 'memory.jsonl');
        this.remindersPath = config.remindersPath || path.join(this.baseDir, 'reminders.jsonl');
        this.emailsPath = config.emailsPath || path.join(this.baseDir, 'emails.jsonl');
        this.messagesPath = config.messagesPath || path.join(this.baseDir, 'messages.jsonl');
        this.contactsPath = config.contactsPath || path.join(this.baseDir, 'contacts.jsonl');
        this.calendarPath = config.calendarPath || path.join(this.baseDir, 'calendar.jsonl');
        this.permissionsPath =
            config.permissionsPath || path.join(this.baseDir, 'permissions.json');
        this.auditPath =
            config.auditPath || path.join(os.homedir(), '.assistant', 'data', 'audit.jsonl');
        this.auditEnabled = config.auditEnabled !== false; // Default enabled
        this.memoryLimit = config.memoryLimit || null;
        // Limits are always provided by resolvedConfig (no fallback needed)
        // Defensive check: ensure limits exists, provide defaults if missing
        if (!config.limits) {
            const error = makeError(ErrorCode.EXEC_ERROR, 'ExecutorConfig must include limits');
            throw error;
        }
        this.limits = config.limits;

        // Load permissions from config, using custom path if provided
        this.permissions = loadPermissions(this.baseDir, config.permissionsPath);

        // Normalize allow_paths for fast checking
        this.allowedPaths = [];
        for (const p of this.permissions.allow_paths) {
            const resolved = this.safeResolve(p);
            if (!resolved) continue;
            let isDir = false;
            if (resolved.endsWith(path.sep)) {
                isDir = true;
            } else {
                try {
                    isDir = fs.existsSync(resolved) && fs.lstatSync(resolved).isDirectory();
                } catch {
                    isDir = false;
                }
            }
            // Normalize: strip trailing slash if directory
            const normalized =
                isDir && resolved.endsWith(path.sep) ? resolved.slice(0, -1) : resolved;
            this.allowedPaths.push({ path: normalized, isDir });
        }

        this.agent = config.agent;

        // Use provided registry or create default NodeToolRegistry
        this.registry = config.registry || createNodeToolRegistry();
    }

    // Helper methods from original file
    private safeResolve(relPath: unknown): string | null {
        if (!relPath || typeof relPath !== 'string') return null;
        if (path.isAbsolute(relPath)) return null;
        if (relPath.includes('..')) return null;
        const resolved = path.resolve(this.baseDir, relPath);
        // Allow exact baseDir match (for '.') or paths under baseDir
        if (resolved !== this.baseDir && !resolved.startsWith(this.baseDir + path.sep)) return null;
        // Canonicalize to prevent symlink bypass attacks
        try {
            const canonical = fs.realpathSync(resolved);
            // Allow exact baseDir match or paths under baseDir
            if (canonical !== this.baseDir && !canonical.startsWith(this.baseDir + path.sep))
                return null;
            return canonical;
        } catch {
            // Path doesn't exist yet (e.g., for write operations) - return resolved
            // but verify parent directory is within baseDir
            const parentDir = path.dirname(resolved);
            try {
                const canonicalParent = fs.realpathSync(parentDir);
                if (
                    !canonicalParent.startsWith(this.baseDir + path.sep) &&
                    canonicalParent !== this.baseDir
                )
                    return null;
            } catch {
                // Parent doesn't exist either - allow if resolved is still under baseDir
            }
            return resolved;
        }
    }

    private isAllowedPath(targetPath: string): boolean {
        // Hardcoded security blocks
        const relPath = path.relative(this.baseDir, targetPath);
        const parts = relPath.split(path.sep);
        // Block sensitive directories and files (case-insensitive to prevent bypass on case-insensitive filesystems)
        if (
            parts.some(p => {
                const lower = p.toLowerCase();
                return lower === '.git' || lower === '.env' || lower === 'node_modules';
            })
        )
            return false;

        // Use cached allowedPaths
        if (this.allowedPaths.length === 0) return false; // Fail closed if no paths allowed

        const isCaseInsensitive = os.platform() === 'darwin' || os.platform() === 'win32';

        for (const entry of this.allowedPaths) {
            if (entry.isDir) {
                if (isCaseInsensitive) {
                    const targetLower = targetPath.toLowerCase();
                    const entryLower = entry.path.toLowerCase();
                    if (targetLower === entryLower || targetLower.startsWith(entryLower + path.sep))
                        return true;
                } else {
                    // Allow if exact match or inside directory (ensure separator check)
                    if (targetPath === entry.path || targetPath.startsWith(entry.path + path.sep))
                        return true;
                }
            } else {
                if (isCaseInsensitive) {
                    if (targetPath.toLowerCase() === entry.path.toLowerCase()) return true;
                } else {
                    if (targetPath === entry.path) return true;
                }
            }
        }
        return false;
    }

    /**
     * Path capability helpers (throw-based API).
     *
     * NOTE: These methods use a throw-based API for historical reasons.
     * Tools are designed to catch these throws and convert to ToolResult.
     *
     * Future refactoring: Convert to return structured errors ({ ok: false, error })
     * instead of throwing. This requires:
     * 1. Changing PathCapabilities interface to return Result types
     * 2. Updating all tool handlers that use these methods
     * 3. Removing try/catch blocks in ~20+ tool handlers
     *
     * This is deferred because the conversion is non-trivial and the current
     * throw-based API works correctly with proper error handling in tools.
     */
    private pathResolve(requestedPath: string): string {
        const resolved = this.safeResolve(requestedPath);
        if (resolved === null) {
            // Note: This throw is part of a documented throw-based API
            // Tools are designed to catch these throws and convert to ToolResult
            throw makeError(
                ErrorCode.DENIED_PATH_ALLOWLIST,
                `Path '${requestedPath}' is invalid or outside baseDir`
            );
        }
        return resolved;
    }

    private pathAssertAllowed(targetPath: string, op: PathOp): void {
        if (!this.isAllowedPath(targetPath)) {
            // Note: This throw is part of a documented throw-based API
            // Tools are designed to catch these throws and convert to ToolResult
            throw makeError(
                ErrorCode.DENIED_PATH_ALLOWLIST,
                `Path '${targetPath}' is not allowed for ${op} operation`
            );
        }
    }

    private pathResolveAllowed(requestedPath: string, op: PathOp): string {
        const resolved = this.pathResolve(requestedPath);
        this.pathAssertAllowed(resolved, op);
        return resolved;
    }

    private createPathCapabilities(): PathCapabilities {
        return {
            resolve: this.pathResolve.bind(this),
            assertAllowed: this.pathAssertAllowed.bind(this),
            resolveAllowed: this.pathResolveAllowed.bind(this),
        };
    }

    // Command capability helpers (throw-based API)
    private commandRunAllowed(
        cmd: string,
        args: string[] = [],
        _opts?: { confirm?: boolean }
    ): { ok: boolean; result?: string; error?: string; errorCode?: string } {
        // Build command string for runAllowedCommand, properly quoting arguments
        const commandText = buildShellCommand(cmd, args);
        return this.runAllowedCommand(commandText);
    }

    private createCommandCapabilities(): CommandCapabilities {
        return {
            runAllowed: this.commandRunAllowed.bind(this),
        };
    }

    private requiresConfirmation(toolName: string): boolean {
        const list = this.permissions.require_confirmation_for;
        if (!list || !Array.isArray(list)) return false;
        return list.includes(toolName);
    }

    // File System Helpers
    private readJsonl<T>(filePath: string, isValid: (entry: any) => boolean): T[] {
        return readJsonlSafely<T>({ filePath, isValid });
    }

    private writeJsonl<T>(filePath: string, entries: T[]): void {
        writeJsonlAtomic(filePath, entries);
    }

    private appendJsonl<T>(filePath: string, entry: T): void {
        appendJsonl(filePath, entry);
    }

    // Scoring Helpers
    private scoreEntry(entry: MemoryEntry, needle: string, terms: string[]): number {
        const text = typeof entry.text === 'string' ? entry.text.toLowerCase() : '';
        let score = 0;
        if (needle) {
            let index = text.indexOf(needle);
            while (index !== -1) {
                score += 1;
                index = text.indexOf(needle, index + needle.length);
            }
        }
        for (const term of terms) {
            let index = text.indexOf(term);
            while (index !== -1) {
                score += 1;
                index = text.indexOf(term, index + term.length);
            }
        }
        return score;
    }

    private sortByScoreAndRecency(
        entries: MemoryEntry[],
        needle: string,
        terms?: string[]
    ): MemoryEntry[] {
        const normalizedTerms =
            terms && terms.length > 0 ? terms : needle.split(/\s+/).filter(Boolean);

        // Optimization: Schwartzian transform (Decorate-Sort-Undecorate)
        // Pre-calculate scores and timestamps to avoid repeated work during sort
        const decorated = entries.map(entry => ({
            entry,
            score: this.scoreEntry(entry, needle, normalizedTerms),
            time: Date.parse(entry.ts || '') || 0,
        }));

        decorated.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return b.time - a.time;
        });

        return decorated.map(d => d.entry);
    }

    private runAllowedCommand(commandText: string): {
        ok: boolean;
        result?: string;
        error?: string;
        errorCode?: string;
    } {
        const parseResult = parseShellArgs(commandText.trim());
        if (!parseResult.ok) {
            return { ok: false, error: parseResult.error, errorCode: ErrorCode.VALIDATION_ERROR };
        }
        const parts = parseResult.args;
        if (parts.length === 0) {
            return { ok: false, error: 'Empty command.', errorCode: ErrorCode.VALIDATION_ERROR };
        }
        const cmd = parts[0];
        const args = parts.slice(1);

        // Check externalized allowlist via permissions.json
        const allowedCommands = this.permissions.allow_commands;
        if (!allowedCommands.includes(cmd)) {
            const err = makeError(
                ErrorCode.DENIED_COMMAND_ALLOWLIST,
                `Command '${cmd}' is not allowed. Listed in permissions.json: ${allowedCommands.join(', ')}`
            );
            return { ok: false, error: err.message, errorCode: ErrorCode.DENIED_COMMAND_ALLOWLIST };
        }

        if (cmd === 'ls') {
            // Safe flags that don't pose security risks
            const allowedChars = new Set(['a', 'l', 'R', '1', 'h', 'A', 'F']);
            const safeArgs: string[] = [];

            for (const arg of args) {
                if (arg.startsWith('-')) {
                    // Validate each character in the flag string
                    for (let i = 1; i < arg.length; i++) {
                        if (!allowedChars.has(arg[i])) {
                            return {
                                ok: false,
                                error: `ls flag '${arg}' contains unsafe character '${arg[i]}'. Allowed: a, l, R, 1, h, A, F`,
                                errorCode: ErrorCode.INVALID_ARGUMENT,
                            };
                        }
                    }
                    safeArgs.push(arg);
                } else {
                    // It's a path - validate it
                    const safePath = this.safeResolve(arg);
                    if (!safePath)
                        return {
                            ok: false,
                            error: `Invalid path for ls: ${arg}`,
                            errorCode: ErrorCode.INVALID_ARGUMENT,
                        };
                    if (!this.isAllowedPath(safePath)) {
                        const err = makePermissionError(
                            'run_cmd',
                            safePath,
                            this.permissionsPath,
                            ErrorCode.DENIED_PATH_ALLOWLIST
                        );
                        return {
                            ok: false,
                            error: err.message,
                            errorCode: ErrorCode.DENIED_PATH_ALLOWLIST,
                        };
                    }
                    safeArgs.push(safePath);
                }
            }

            const result = spawnSync('ls', safeArgs, { cwd: this.baseDir, encoding: 'utf8' });
            if (result.error) return { ok: false, error: result.error.message || 'ls failed' };
            if (result.status !== 0) {
                const message =
                    result.stderr.trim() ||
                    (result.signal ? `ls terminated by signal ${result.signal}` : 'ls failed');
                return { ok: false, error: message };
            }
            return { ok: true, result: result.stdout.trim() };
        }
        if (cmd === 'pwd') {
            const result = spawnSync('pwd', [], { cwd: this.baseDir, encoding: 'utf8' });
            if (result.error) return { ok: false, error: result.error.message || 'pwd failed' };
            if (result.status !== 0) {
                const message =
                    result.stderr.trim() ||
                    (result.signal ? `pwd terminated by signal ${result.signal}` : 'pwd failed');
                return { ok: false, error: message };
            }
            return { ok: true, result: result.stdout.trim() };
        }
        if (cmd === 'cat') {
            if (args.length !== 1)
                return {
                    ok: false,
                    error: 'cat requires exactly one path.',
                    errorCode: ErrorCode.MISSING_ARGUMENT,
                };
            if (args[0].startsWith('-'))
                return {
                    ok: false,
                    error: 'cat flags are not allowed.',
                    errorCode: ErrorCode.INVALID_ARGUMENT,
                };
            const safePath = this.safeResolve(args[0] || '');
            if (!safePath)
                return {
                    ok: false,
                    error: 'Invalid path for cat.',
                    errorCode: ErrorCode.INVALID_ARGUMENT,
                };
            if (!this.isAllowedPath(safePath)) {
                const err = makePermissionError(
                    'run_cmd',
                    safePath,
                    this.permissionsPath,
                    ErrorCode.DENIED_PATH_ALLOWLIST
                );
                return {
                    ok: false,
                    error: err.message,
                    errorCode: ErrorCode.DENIED_PATH_ALLOWLIST,
                };
            }
            const result = spawnSync('cat', [safePath], { cwd: this.baseDir, encoding: 'utf8' });
            if (result.error) return { ok: false, error: result.error.message || 'cat failed' };
            if (result.status !== 0) {
                const message =
                    result.stderr.trim() ||
                    (result.signal ? `cat terminated by signal ${result.signal}` : 'cat failed');
                return { ok: false, error: message };
            }
            return { ok: true, result: result.stdout };
        }
        if (cmd === 'du') {
            // Tightened: only allow -h, -s, -d N (N=0-5), and -t THRESHOLD with required path
            const safeArgs: string[] = [];
            let pathArg: string | null = null;

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (arg === '-h' || arg === '-s') {
                    safeArgs.push(arg);
                } else if (arg === '-d' || arg === '--max-depth') {
                    const next = args[i + 1];
                    if (!next || !/^[0-5]$/.test(next)) {
                        return {
                            ok: false,
                            error: 'du -d requires depth 0-5.',
                            errorCode: ErrorCode.INVALID_ARGUMENT,
                        };
                    }
                    // depth value validated, add to args
                    safeArgs.push('-d', next);
                    i++;
                } else if (arg === '-t' || arg === '--threshold') {
                    const next = args[i + 1];
                    // Simple validation for threshold (number + optional unit k/M/G/T)
                    if (!next || !/^-?[0-9]+[kMGT]?$/.test(next)) {
                        return {
                            ok: false,
                            error: 'du -t requires valid threshold.',
                            errorCode: ErrorCode.INVALID_ARGUMENT,
                        };
                    }
                    safeArgs.push('-t', next);
                    i++;
                } else if (arg.startsWith('-')) {
                    return {
                        ok: false,
                        error: `du flag '${arg}' is not allowed. Allowed: -h, -s, -d N (N=0-5), -t SIZE`,
                        errorCode: ErrorCode.INVALID_ARGUMENT,
                    };
                } else {
                    // Path argument
                    const safePath = this.safeResolve(arg);
                    if (!safePath)
                        return {
                            ok: false,
                            error: `Invalid path for du: ${arg}`,
                            errorCode: ErrorCode.INVALID_ARGUMENT,
                        };
                    if (!this.isAllowedPath(safePath)) {
                        const err = makePermissionError(
                            'run_cmd',
                            safePath,
                            this.permissionsPath,
                            ErrorCode.DENIED_PATH_ALLOWLIST
                        );
                        return {
                            ok: false,
                            error: err.message,
                            errorCode: ErrorCode.DENIED_PATH_ALLOWLIST,
                        };
                    }
                    pathArg = safePath;
                    safeArgs.push(safePath);
                }
            }

            // Path is required
            if (!pathArg) {
                return {
                    ok: false,
                    error: 'du requires a path argument.',
                    errorCode: ErrorCode.MISSING_ARGUMENT,
                };
            }

            const result = spawnSync('du', safeArgs, { cwd: this.baseDir, encoding: 'utf8' });
            if (result.error) return { ok: false, error: result.error.message || 'du failed' };
            if (result.status !== 0) {
                const message =
                    result.stderr.trim() ||
                    (result.signal ? `du terminated by signal ${result.signal}` : 'du failed');
                return { ok: false, error: message };
            }
            return { ok: true, result: result.stdout.trim() };
        }
        return {
            ok: false,
            error: makePermissionError('run_cmd', undefined, this.permissionsPath).message,
        };
    }

    public async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        // 1. Enforce agent permissions BEFORE any execution
        if (this.agent) {
            // System agents (kind='system') get access to all tools (for CLI usage)
            // Check by kind to prevent spoofing via name string
            if (this.agent.kind === 'system') {
                // Allow any tool that exists in TOOL_HANDLERS
                // deny_tools still applies (checked below)
            } else {
                // Other agents: check allowlist
                if (!this.agent.tools.includes(toolName)) {
                    return {
                        ok: false,
                        result: null,
                        error: makeError(
                            DENIED_AGENT_TOOLSET,
                            `Permission denied: agent '${this.agent.name}' cannot use tool '${toolName}'`
                        ),
                        _debug: makeDebug({
                            path: 'tool_json',
                            start: nowMs(),
                            model: null,
                            memory_read: false,
                            memory_write: false,
                        }),
                    };
                }
            }
        }

        // 2. Enforce global Deny List
        if (this.permissions.deny_tools.includes(toolName)) {
            return {
                ok: false,
                result: null,
                error: makeError(
                    DENIED_TOOL_BLOCKLIST,
                    `Tool '${toolName}' is explicitly denied in permissions configuration.`
                ),
                _debug: makeDebug({
                    path: 'tool_json',
                    start: nowMs(),
                    model: null,
                    memory_read: false,
                    memory_write: false,
                }),
            };
        }

        // 3. No agent: enforce minimal safe default (fail-closed security)
        if (!this.agent) {
            // Sensitive tools: filesystem, shell, network, data modification
            // All other tools are denied when no agent is provided
            // Type assertion needed because SAFE_TOOLS is a const array with literal types
            if (!(SAFE_TOOLS as readonly string[]).includes(toolName)) {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.DENIED_AGENT_TOOLSET,
                        `Permission denied: tool '${toolName}' requires agent context`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start: nowMs(),
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
        }

        // 4. Validate args with Zod Schema if available
        const schema = this.registry.getSchema(toolName);
        let validatedArgs: Record<string, unknown> = args;

        if (schema) {
            const parseResult = schema.safeParse(args || {});
            if (!parseResult.success) {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.VALIDATION_ERROR,
                        `Invalid arguments for ${toolName}: ${parseResult.error.message}`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start: nowMs(),
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
            // After safeParse success, data is validated and can be safely cast
            validatedArgs = parseResult.data as Record<string, unknown>;
        }

        // 5. Build context
        const context: ExecutorContext = {
            start: nowMs(),
            baseDir: this.baseDir,
            memoryPath: this.memoryPath,
            memoryLimit: this.memoryLimit,
            tasksPath: this.tasksPath,
            memoryLogPath: this.memoryLogPath,
            remindersPath: this.remindersPath,
            emailsPath: this.emailsPath,
            messagesPath: this.messagesPath,
            contactsPath: this.contactsPath,
            calendarPath: this.calendarPath,
            permissionsPath: this.permissionsPath,
            auditPath: this.auditPath,
            auditEnabled: this.auditEnabled,
            permissions: this.permissions,
            limits: this.limits,
            requiresConfirmation: this.requiresConfirmation.bind(this),
            // Capability-based API
            paths: this.createPathCapabilities(),
            commands: this.createCommandCapabilities(),
            readMemory,
            writeMemory,
            readJsonl: this.readJsonl.bind(this),
            writeJsonl: this.writeJsonl.bind(this),
            appendJsonl: this.appendJsonl.bind(this),
            scoreEntry: this.scoreEntry.bind(this),
            sortByScoreAndRecency: this.sortByScoreAndRecency.bind(this),
        };

        const handler = this.registry.getHandler(toolName);
        if (handler) {
            const result = await Promise.resolve(handler(validatedArgs, context));
            // Fail-closed: ensure handler always returns a ToolResult
            if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean') {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.EXEC_ERROR,
                        `Internal error: tool '${toolName}' returned no result`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start: nowMs(),
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
            this.logAudit(toolName, validatedArgs, result);
            return result;
        }
        // Build dynamic list of common tools (first 6) for suggestion
        const availableTools = this.registry.listTools().slice(0, 6).join(', ');
        return {
            ok: false,
            result: null,
            error: makeError(
                ErrorCode.UNKNOWN_TOOL,
                `Unknown tool '${toolName}'. Try: ${availableTools}. Use /tools in REPL for full list.`
            ),
            _debug: null,
        };
    }

    /**
     * Log tool execution to audit trail.
     */
    private logAudit(toolName: string, args: Record<string, unknown>, result: ToolResult): void {
        if (!this.auditEnabled) return;

        try {
            const dir = path.dirname(this.auditPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const entry = {
                ts: new Date().toISOString(),
                tool: toolName,
                args: this.sanitizeArgs(args),
                ok: result.ok,
                error: result.error?.message || null,
                duration_ms: result._debug?.duration_ms || null,
            };

            fs.appendFileSync(this.auditPath, JSON.stringify(entry) + '\n', 'utf8');
        } catch {
            // Silently ignore audit failures to not break tool execution
        }
    }

    /**
     * Sanitize args to avoid logging sensitive data.
     */
    private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
        if (!args || typeof args !== 'object') return args;

        const sanitized = { ...args };
        // Truncate long content to avoid huge logs
        if (
            sanitized.content &&
            typeof sanitized.content === 'string' &&
            sanitized.content.length > 100
        ) {
            sanitized.content = sanitized.content.substring(0, 100) + '...[truncated]';
        }
        return sanitized;
    }
} // End Executor class

/**
 * Main executor function.
 */
/**
 * Read stdin as a string.
 */
