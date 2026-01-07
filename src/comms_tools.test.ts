import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Always use dist/ for spawned processes
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const executorPath = path.join(distDir, 'app', 'executor.js');
const baseArgs = [executorPath];

describe('Comms Tools', () => {
    let testDir: string;
    let testDataDir: string;
    let testConfigDir: string;
    let binDir: string;
    let osascriptLogPath: string;
    let osascriptBin: string;

    beforeAll(() => {
        // Create temp directories
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comms-test-'));
        testDir = fs.realpathSync(testDir);
        binDir = path.join(testDir, 'bin');
        testDataDir = path.join(testDir, 'data');
        testConfigDir = path.join(testDir, 'config');
        osascriptLogPath = path.join(testDir, 'osascript.log');
        osascriptBin = path.join(binDir, 'osascript');

        fs.mkdirSync(binDir, { recursive: true });
        fs.mkdirSync(testDataDir, { recursive: true });
        fs.mkdirSync(testConfigDir, { recursive: true });

        // Create config file
        const configFile = path.join(testConfigDir, 'config.json');
        fs.writeFileSync(
            configFile,
            JSON.stringify({ version: 1, fileBaseDir: testDataDir }, null, 2),
            'utf8'
        );

        // Create permissions file
        const permissionsFile = path.join(testDataDir, 'permissions.json');
        fs.writeFileSync(
            permissionsFile,
            JSON.stringify(
                {
                    version: 1,
                    allow_paths: ['./', '~/'],
                    allow_commands: ['osascript'],
                    require_confirmation_for: [],
                    deny_tools: [],
                },
                null,
                2
            ),
            'utf8'
        );

        // Create fake osascript
        const osascriptContent = `#!/bin/sh\necho "$@" >> "${osascriptLogPath}"\n`;
        fs.writeFileSync(osascriptBin, osascriptContent, { mode: 0o755 });
    });

    afterAll(() => {
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup error
        }
    });

    function runExecutor(payload: unknown, envOverrides: Record<string, string> = {}) {
        const env = {
            ...process.env,
            ...envOverrides,
            PATH: `${binDir}:${process.env.PATH || ''}`,
            ASSISTANT_CONFIG_DIR: testConfigDir,
            ASSISTANT_DATA_DIR: testDataDir,
            ASSISTANT_PERMISSIONS_PATH: path.join(testDataDir, 'permissions.json'),
        };

        const result = spawnSync(process.execPath, baseArgs, {
            input: JSON.stringify(payload),
            cwd: testDir,
            encoding: 'utf8',
            env,
        });

        return {
            status: result.status,
            stdout: (result.stdout || '').trim(),
            stderr: (result.stderr || '').trim(),
        };
    }

    function parseLastJson(stdout: string) {
        const lines = stdout.split('\n').filter((l: string) => l.trim());
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                return JSON.parse(lines[i]);
            } catch {
                // continue
            }
        }
        return null;
    }

    it('should fail on non-macOS (simulated)', () => {
        const payload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'message_send',
                args: { to: 'bob', body: 'test' },
            },
        };

        const result = runExecutor(payload, { _TEST_PLATFORM_OVERRIDE: 'linux' });
        const json = parseLastJson(result.stdout);

        expect(json?.ok).toBe(false);
        expect(json?.error?.message).toContain('available on macOS');
    });

    it('should succeed with darwin override', () => {
        const payload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'message_send',
                args: { to: 'alice', body: 'hello world' },
            },
        };

        const result = runExecutor(payload, { _TEST_PLATFORM_OVERRIDE: 'darwin' });
        const json = parseLastJson(result.stdout);

        expect(json?.ok).toBe(true);
        expect(json?.result?.message).toContain('via iMessage');
    });
});
