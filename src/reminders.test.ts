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

describe('Reminders', () => {
    let testTmpDir: string;

    beforeAll(() => {
        testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reminders-test-'));
        testTmpDir = fs.realpathSync(testTmpDir);

        // Create permissions.json in the test directory
        fs.writeFileSync(
            path.join(testTmpDir, 'permissions.json'),
            JSON.stringify({
                version: 1,
                allow_paths: ['./'],
                allow_commands: [],
                require_confirmation_for: [],
                deny_tools: [],
            }),
            'utf8'
        );
    });

    afterAll(() => {
        try {
            fs.rmSync(testTmpDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup error
        }
    });

    function runExecutor(payload: unknown) {
        return spawnSync(process.execPath, baseArgs, {
            input: JSON.stringify(payload),
            cwd: distDir,
            encoding: 'utf8',
            env: {
                ...process.env,
                ASSISTANT_DATA_DIR: testTmpDir,
                ASSISTANT_PERMISSIONS_PATH: path.join(testTmpDir, 'permissions.json'),
            },
        });
    }

    function parseOutput(output: string) {
        try {
            return JSON.parse(output);
        } catch {
            const lines = output.trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                try {
                    const json = JSON.parse(lines[i]);
                    if (json && typeof json.ok === 'boolean') {
                        return json;
                    }
                } catch {
                    // continue
                }
            }
            return null;
        }
    }

    it('should add a reminder', () => {
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'reminder_add',
                args: {
                    text: 'Test Reminder',
                    in_seconds: 60,
                },
            },
        };

        const addResult = runExecutor(addPayload);
        const addJson = parseOutput(addResult.stdout?.trim() || '');

        expect(addJson).not.toBeNull();
        expect(addJson?.ok).toBe(true);
        expect(addJson?.result?.reminder?.id).toBeDefined();
    });

    it('should list reminders', () => {
        // First add a reminder
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'reminder_add',
                args: {
                    text: 'List Test Reminder',
                    in_seconds: 60,
                },
            },
        };
        runExecutor(addPayload);

        const listPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'reminder_list',
                args: {},
            },
        };

        const listResult = runExecutor(listPayload);
        const listJson = parseOutput(listResult.stdout?.trim() || '');

        expect(listJson).not.toBeNull();
        expect(listJson?.ok).toBe(true);
        expect(Array.isArray(listJson?.result?.entries)).toBe(true);
    });
});
