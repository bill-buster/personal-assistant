import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfig, resolveConfig } from './core/config';
import { buildRuntime, SYSTEM } from './runtime';

interface FileReadResult {
    content: string;
}

interface FileListResult {
    entries: { name: string }[];
}

interface TaskListResult {
    entries: { text: string; priority?: string }[];
}

interface MemoryRecallResult {
    entries: { text: string }[];
}

interface GitStatusResult {
    clean: boolean;
    files: { path: string }[];
}

describe('Executor (In-Process)', () => {
    let tempRoot: string;
    let baseDir: string;

    beforeEach(() => {
        const rawTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-exec-test-'));
        tempRoot = fs.realpathSync(rawTemp);
        baseDir = path.join(tempRoot, 'project');
        fs.mkdirSync(baseDir, { recursive: true });
    });

    afterEach(() => {
        try {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        } catch {}
    });

    function createTestRuntime() {
        // Create full permissions file
        const perms = {
            version: 1,
            allow_paths: ['.'], // Allow relative paths in baseDir
            allow_commands: ['ls', 'echo', 'cat', 'pwd', 'du', 'grep', 'git'],
            require_confirmation_for: [],
            deny_tools: [],
        };
        const permPath = path.join(baseDir, 'permissions.json');
        fs.writeFileSync(permPath, JSON.stringify(perms));

        if (!fs.existsSync(permPath)) {
            console.error('CRITICAL: Permissions file not written:', permPath);
        }

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
            includeProvider: false,
            agent: SYSTEM,
        });
    }

    describe('File Tools', () => {
        it('should write and read files', async () => {
            const runtime = createTestRuntime();
            const writeRes = await runtime.executor.execute('write_file', {
                path: 'test.txt',
                content: 'hello world',
            });
            if (!writeRes.ok) console.error('Write failed:', writeRes.error);
            expect(writeRes.ok).toBe(true);

            const readRes = await runtime.executor.execute('read_file', {
                path: 'test.txt',
            });
            if (!readRes.ok) console.error('Read failed:', readRes.error);
            expect(readRes.ok).toBe(true);
            expect((readRes.result as unknown as FileReadResult).content).toBe('hello world');
        });

        it('should list files', async () => {
            const runtime = createTestRuntime();
            await runtime.executor.execute('write_file', { path: 'a.txt', content: 'a' });
            await runtime.executor.execute('write_file', { path: 'b.txt', content: 'b' });

            const listRes = await runtime.executor.execute('list_files', {});
            if (!listRes.ok) console.error('List failed:', listRes.error);
            expect(listRes.ok).toBe(true);
            const entries = (listRes.result as unknown as FileListResult).entries.map(e => e.name);
            expect(entries).toContain('a.txt');
            expect(entries).toContain('b.txt');
        });

        it('should fail reading non-existent file', async () => {
            const runtime = createTestRuntime();
            const res = await runtime.executor.execute('read_file', { path: 'missing.txt' });
            expect(res.ok).toBe(false);
            expect((res.error?.message || '').toLowerCase()).toContain('not found');
        });
    });

    describe('Command Tools', () => {
        it('should run permitted commands', async () => {
            const runtime = createTestRuntime();
            const res = await runtime.executor.execute('run_cmd', { command: 'echo hello' });
            if (!res.ok) console.error('Run cmd failed:', res.error);
            expect(res.ok).toBe(true);
            expect((res.result as string)?.trim()).toBe('hello');
        });

        it('should run ls', async () => {
            const runtime = createTestRuntime();
            await runtime.executor.execute('write_file', { path: 'file.txt', content: '' });
            const res = await runtime.executor.execute('run_cmd', { command: 'ls' });
            if (!res.ok) console.error('ls failed:', res.error);
            expect(res.ok).toBe(true);
            expect(res.result).toContain('file.txt');
        });
    });

    describe('Task Tools', () => {
        it('should add and list tasks', async () => {
            const runtime = createTestRuntime();
            const addRes = await runtime.executor.execute('task_add', {
                text: 'buy milk',
                priority: 'high',
            });
            if (!addRes.ok) console.error('Task add failed:', addRes.error);
            expect(addRes.ok).toBe(true);

            const listRes = await runtime.executor.execute('task_list', { status: 'open' });
            expect(listRes.ok).toBe(true);
            const entries = (listRes.result as unknown as TaskListResult).entries;
            expect(entries.some(t => t.text === 'buy milk')).toBe(true);
            expect(entries.some(t => t.priority === 'high')).toBe(true);
        });

        it('should complete tasks', async () => {
            const runtime = createTestRuntime();
            await runtime.executor.execute('task_add', { text: 'test task' });

            // ID logic depends on storage implementation. Usually 1-indexed auto-increment.
            const doneRes = await runtime.executor.execute('task_done', { id: 1 });
            if (!doneRes.ok) console.error('Task done failed:', doneRes.error);
            expect(doneRes.ok).toBe(true);

            const listRes = await runtime.executor.execute('task_list', { status: 'done' });
            const entries = (listRes.result as unknown as TaskListResult).entries;
            expect(entries.some(t => t.text === 'test task')).toBe(true);
        });
    });

    describe('Memory Tools', () => {
        it('should remember and recall', async () => {
            const runtime = createTestRuntime();
            const memRes = await runtime.executor.execute('remember', {
                text: 'My cat is named Luna',
            });
            if (!memRes.ok) console.error('Remember failed:', memRes.error);

            const recallRes = await runtime.executor.execute('recall', { query: 'cat' });
            expect(recallRes.ok).toBe(true);
            const entries = (recallRes.result as unknown as MemoryRecallResult).entries;
            expect(entries.some(e => e.text.includes('Luna'))).toBe(true);
        });
    });

    describe('Git Tools', () => {
        it('should init checks (status)', async () => {
            const runtime = createTestRuntime();

            // Initialize git repo manually via run_cmd first
            await runtime.executor.execute('run_cmd', { command: 'git init' });
            await runtime.executor.execute('run_cmd', {
                command: 'git config user.email "test@example.com"',
            });
            await runtime.executor.execute('run_cmd', {
                command: 'git config user.name "Test User"',
            });

            const statusRes = await runtime.executor.execute('git_status', {});
            if (!statusRes.ok) console.error('Git status failed:', statusRes.error);
            expect(statusRes.ok).toBe(true);
            expect((statusRes.result as unknown as GitStatusResult).clean).toBe(false);
            expect((statusRes.result as unknown as GitStatusResult).files[0].path).toBe(
                'permissions.json'
            );
        });
    });

    describe('Path Invariants', () => {
        it('should handle symlinked baseDir (macOS /tmp invariant)', async () => {
            // Create a real directory
            const realDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-real-'));
            const linkDir = path.join(os.tmpdir(), 'pa-link-' + Date.now());

            // Create symlink: linkDir -> realDir
            try {
                fs.symlinkSync(realDir, linkDir);
            } catch (err) {
                // Skip if symlinks not supported (e.g. some Windows setups without permissions)
                console.warn('Skipping symlink test:', err);
                return;
            }

            try {
                // Initialize runtime with the SYMLINK path as baseDir
                const permissions = {
                    version: 1,
                    allow_paths: ['.'],
                    allow_commands: ['ls'],
                    deny_tools: [],
                    require_confirmation_for: [],
                };
                const permPath = path.join(realDir, 'permissions.json'); // write to real dir
                fs.writeFileSync(permPath, JSON.stringify(permissions));

                const rawConfig: AppConfig = {
                    defaultProvider: 'mock',
                    apiKeys: { mock: 'mock' },
                    storage: {
                        baseDir: linkDir, // Use the symlink here!
                        memory: 'memory.json',
                        tasks: 'tasks.jsonl',
                        reminders: 'reminders.jsonl',
                        memoryLog: 'memory.jsonl',
                    },
                    fileBaseDir: linkDir, // Use the symlink here!
                };

                const resolveResult = resolveConfig(rawConfig);
                expect(resolveResult.ok).toBe(true);
                if (!resolveResult.ok) return;

                const runtime = buildRuntime(resolveResult.config, {
                    permissionsPath: permPath,
                    includeProvider: false,
                    agent: SYSTEM,
                });

                // Write file to "." (which is allowed)
                const writeRes = await runtime.executor.execute('write_file', {
                    path: 'test.txt',
                    content: 'invariant',
                });
                expect(writeRes.ok).toBe(true);

                // Check file existence in REAL location
                expect(fs.existsSync(path.join(realDir, 'test.txt'))).toBe(true);
            } finally {
                // Cleanup
                try {
                    fs.unlinkSync(linkDir);
                    fs.rmSync(realDir, { recursive: true, force: true });
                } catch {}
            }
        });

        it('should resolve "." to canonical baseDir', async () => {
            const runtime = createTestRuntime();
            // "." is allowed in createTestRuntime
            const res = await runtime.executor.execute('write_file', {
                path: 'dotfile.txt',
                content: '.',
            });
            expect(res.ok).toBe(true);
        });

        it('should block traversal even with canonical baseDir', async () => {
            const runtime = createTestRuntime();
            const res = await runtime.executor.execute('write_file', {
                path: '../outside.txt',
                content: 'bad',
            });
            expect(res.ok).toBe(false);
            expect(res.error?.code).toBe('DENIED_PATH_ALLOWLIST');
        });
    });
});
