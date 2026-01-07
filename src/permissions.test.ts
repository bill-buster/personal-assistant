import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfig, resolveConfig } from './core/config';
import { ErrorCode } from './core/tool_contract';
import { Permissions } from './core/types';
import { buildRuntime } from './runtime';

describe('Executor Permissions (In-Process)', () => {
    let tempRoot: string;
    let baseDir: string;

    beforeEach(() => {
        // Create a unique temp directory for each test
        const rawTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-perms-test-'));
        tempRoot = fs.realpathSync(rawTemp); // Canonicalize to manage symlinks (Mac /var -> /private/var)
        baseDir = path.join(tempRoot, 'project');
        fs.mkdirSync(baseDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up temp directory
        try {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        } catch {}
    });

    /**
     * Helper to create a runtime with specific permissions
     */
    function createTestRuntime(permissions: Partial<Permissions>) {
        const fullPermissions: Permissions = {
            version: 1,
            allow_paths: [],
            allow_commands: [],
            require_confirmation_for: [],
            deny_tools: [],
            ...permissions,
        };

        const permPath = path.join(baseDir, 'permissions.json');
        fs.writeFileSync(permPath, JSON.stringify(fullPermissions));

        // Create minimal config pointing to tempDir
        const rawConfig: AppConfig = {
            defaultProvider: 'mock',
            apiKeys: { mock: 'mock' },
            storage: {
                baseDir: baseDir,
                memory: 'memory.json',
                tasks: 'tasks.jsonl',
                reminders: 'reminders.jsonl',
                memoryLog: 'memory.jsonl',
            },
            fileBaseDir: baseDir,
        };

        const resolveResult = resolveConfig(rawConfig);
        if (!resolveResult.ok) throw new Error(resolveResult.error);

        return buildRuntime(resolveResult.config, {
            permissionsPath: permPath,
            includeProvider: false, // executor tests don't need LLM
        });
    }

    describe('Path Permissions', () => {
        it('should allow writing to permitted paths', async () => {
            const runtime = createTestRuntime({ allow_paths: ['.'] });

            const result = await runtime.executor.execute('write_file', {
                path: 'test.txt',
                content: 'hello',
            });

            if (!result.ok) console.error('Write failed:', result.error);
            expect(result.ok).toBe(true);
            expect(fs.existsSync(path.join(baseDir, 'test.txt'))).toBe(true);
            expect(fs.readFileSync(path.join(baseDir, 'test.txt'), 'utf8')).toBe('hello');
        });

        it('should deny writing to non-permitted paths', async () => {
            const runtime = createTestRuntime({ allow_paths: [] }); // No paths allowed

            const result = await runtime.executor.execute('write_file', {
                path: 'test.txt',
                content: 'hello',
            });

            expect(result.ok).toBe(false);
            expect(result.error?.code).toBe(ErrorCode.DENIED_PATH_ALLOWLIST);
            expect(fs.existsSync(path.join(baseDir, 'test.txt'))).toBe(false);
        });

        it('should block path traversal', async () => {
            const runtime = createTestRuntime({ allow_paths: ['.'] });

            // Try to write outside baseDir
            const result = await runtime.executor.execute('write_file', {
                path: '../outside.txt',
                content: 'bad',
            });

            expect(result.ok).toBe(false);
            expect(result.error?.code).toBe(ErrorCode.DENIED_PATH_ALLOWLIST);
        });

        it('should block absolute paths outside baseDir', async () => {
            const runtime = createTestRuntime({ allow_paths: ['.'] });

            const outsidePath = path.join(tempRoot, 'outside.txt');
            const result = await runtime.executor.execute('write_file', {
                path: outsidePath,
                content: 'bad',
            });

            expect(result.ok).toBe(false);
            expect(result.error?.code).toBe(ErrorCode.DENIED_PATH_ALLOWLIST);
        });
    });

    describe('Command Permissions', () => {
        it('should allow permitted commands', async () => {
            const runtime = createTestRuntime({
                allow_commands: ['echo'],
                // Needed for tests running in environments where echo is a binary (or fallback)
                allow_paths: [],
            });

            const result = await runtime.executor.execute('run_cmd', {
                command: 'echo hello',
            });

            // Note: run_cmd might fail if 'echo' isn't in PATH or handled internally.
            // But checking permissions should pass.
            // If the command executes, result.ok is true.

            expect(result.ok).toBe(true);
            expect(result.result).toContain('hello');
        });

        it('should deny non-permitted commands', async () => {
            const runtime = createTestRuntime({
                allow_commands: ['ls'], // echo not allowed
            });

            const result = await runtime.executor.execute('run_cmd', {
                command: 'echo hello',
            });

            expect(result.ok).toBe(false);
            expect(result.error?.code).toBe(ErrorCode.DENIED_COMMAND_ALLOWLIST);
        });

        it('should allow ls by default if permitted', async () => {
            const runtime = createTestRuntime({
                allow_commands: ['ls'],
                allow_paths: ['.'],
            });

            const result = await runtime.executor.execute('run_cmd', {
                command: 'ls',
            });

            expect(result.ok).toBe(true);
        });
    });

    describe('Tool Blocklist', () => {
        it('should deny specific tools even if technically possible', async () => {
            const runtime = createTestRuntime({
                deny_tools: ['read_file'],
                allow_paths: ['.'],
            });

            // Create file to read
            fs.writeFileSync(path.join(baseDir, 'test.txt'), 'hello');

            const result = await runtime.executor.execute('read_file', {
                path: 'test.txt',
            });

            expect(result.ok).toBe(false);
            expect(result.error?.code).toBe(ErrorCode.DENIED_TOOL_BLOCKLIST);
        });
    });

    describe('Defaults', () => {
        it('should default to Deny All if no permissions provided', async () => {
            // Create runtime without creating permissions.json (loadPermissions defaults to DENY_ALL)
            // But createTestRuntime enforces writing a file.
            // We can simulate missing file by passing a path that doesn't exist?
            // Or passing empty permissions object to createTestRuntime which writes empty lists.
            // Let's test "Empty Lists" behavior.

            const runtime = createTestRuntime({
                allow_paths: [],
                allow_commands: [],
            });

            const pathResult = await runtime.executor.execute('write_file', {
                path: 't.txt',
                content: 'x',
            });
            expect(pathResult.ok).toBe(false);

            const cmdResult = await runtime.executor.execute('run_cmd', { command: 'ls' });
            expect(cmdResult.ok).toBe(false);
        });
    });
});
