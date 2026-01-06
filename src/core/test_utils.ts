/**
 * Test utilities for easier test writing
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import type { ExecutorContext, ToolResult } from './types';

/**
 * Create a mock ExecutorContext for testing
 */
export function createMockContext(overrides: Partial<ExecutorContext> = {}): ExecutorContext {
    const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    const dataDir = path.join(testRoot, 'data');
    const configDir = path.join(testRoot, 'config');

    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(configDir, { recursive: true });

    return {
        paths: {
            resolve: (p: string) => path.resolve(testRoot, p),
            assertAllowed: () => {},
            resolveAllowed: (p: string) => path.resolve(testRoot, p),
        },
        commands: {
            runAllowed: () => ({ ok: true, result: '' }),
        },
        readJsonl: () => [],
        appendJsonl: () => {},
        readMemory: () => ({ entries: [] }),
        writeMemory: () => {},
        memoryPath: path.join(dataDir, 'memory.json'),
        tasksPath: path.join(dataDir, 'tasks.jsonl'),
        memoryLogPath: path.join(dataDir, 'memory.jsonl'),
        remindersPath: path.join(dataDir, 'reminders.jsonl'),
        emailsPath: path.join(dataDir, 'emails.jsonl'),
        messagesPath: path.join(dataDir, 'messages.jsonl'),
        contactsPath: path.join(dataDir, 'contacts.jsonl'),
        calendarPath: path.join(dataDir, 'calendar.jsonl'),
        permissionsPath: path.join(configDir, 'permissions.json'),
        auditPath: path.join(dataDir, 'audit.jsonl'),
        memoryLimit: 1000,
        scoreEntry: () => 0,
        sortByScoreAndRecency: () => [],
        limits: {
            maxReadSize: 65536,
            maxWriteSize: 65536,
        },
        permissions: {
            allow_paths: [],
            allow_commands: [],
            require_confirmation_for: [],
            deny_tools: [],
        },
        start: Date.now(),
        ...overrides,
    } as ExecutorContext;
}

/**
 * Run CLI command and parse JSON output
 */
export function runCli(
    args: string[],
    env: NodeJS.ProcessEnv = {}
): {
    status: number;
    stdout: string;
    stderr: string;
    json: unknown;
} {
    const cliPath = path.join(__dirname, '..', '..', 'dist', 'app', 'cli.js');
    const result = spawnSync(process.execPath, [cliPath, ...args], {
        encoding: 'utf8',
        env: { ...process.env, ...env },
    });

    const output = result.stdout || '';
    const json = parseJsonOutput(output);

    return {
        status: result.status || 0,
        stdout: output,
        stderr: result.stderr || '',
        json,
    };
}

/**
 * Parse JSON from CLI output (handles mixed output)
 */
export function parseJsonOutput(output: string): unknown {
    const lines = output.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const parsed = JSON.parse(lines[i]);
            if (parsed && typeof parsed === 'object' && ('ok' in parsed || 'result' in parsed)) {
                return parsed;
            }
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * Assert tool result is successful
 */
export function assertSuccess(result: ToolResult, message?: string): void {
    if (!result.ok) {
        throw new Error(
            message || `Expected success but got error: ${result.error?.message || 'unknown'}`
        );
    }
}

/**
 * Assert tool result failed with specific error code
 */
export function assertError(result: ToolResult, expectedCode: string, message?: string): void {
    if (result.ok) {
        throw new Error(message || `Expected error but got success`);
    }
    if (result.error?.code !== expectedCode) {
        throw new Error(
            message ||
                `Expected error code '${expectedCode}' but got '${result.error?.code || 'unknown'}'`
        );
    }
}

/**
 * Create temporary test directory
 */
export function createTestDir(prefix: string = 'test-'): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Cleanup test directory
 */
export function cleanupTestDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}
