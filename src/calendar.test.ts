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

describe('Calendar', () => {
    let testTmpDir: string;

    beforeAll(() => {
        testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-test-'));
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
        const result = spawnSync(process.execPath, baseArgs, {
            input: JSON.stringify(payload),
            cwd: distDir,
            encoding: 'utf8',
            env: {
                ...process.env,
                ASSISTANT_DATA_DIR: testTmpDir,
                ASSISTANT_PERMISSIONS_PATH: path.join(testTmpDir, 'permissions.json'),
            },
        });
        return {
            status: result.status,
            stdout: (result.stdout || '').trim(),
        };
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

    it('should add a calendar event', () => {
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'calendar_event_add',
                args: {
                    title: 'Test Meeting',
                    start_time: new Date(Date.now() + 86400000).toISOString(),
                    duration_minutes: 60,
                },
            },
        };

        const addResult = runExecutor(addPayload);
        const addJson = parseOutput(addResult.stdout);

        expect(addJson).not.toBeNull();
        expect(addJson?.ok).toBe(true);
        expect(addJson?.result?.event?.id).toBeDefined();
    });

    it('should list calendar events', () => {
        // First add an event
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'calendar_event_add',
                args: {
                    title: 'List Test Meeting',
                    start_time: new Date(Date.now() + 86400000).toISOString(),
                    duration_minutes: 60,
                },
            },
        };
        runExecutor(addPayload);

        const listPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'calendar_list',
                args: { days: 7 },
            },
        };

        const listResult = runExecutor(listPayload);
        const listJson = parseOutput(listResult.stdout);

        expect(listJson).not.toBeNull();
        expect(listJson?.ok).toBe(true);
        expect(Array.isArray(listJson?.result)).toBe(true);
    });

    it('should fail to update non-existent event', () => {
        const invalidUpdatePayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'calendar_event_update',
                args: {
                    id: 'non_existent_id',
                    title: 'Should Fail',
                },
            },
        };

        const invalidUpdateResult = runExecutor(invalidUpdatePayload);
        const invalidUpdateJson = parseOutput(invalidUpdateResult.stdout);

        expect(invalidUpdateJson).not.toBeNull();
        expect(invalidUpdateJson?.ok).toBe(false);
        expect(invalidUpdateJson?.error?.code).toBe('NOT_FOUND');
    });
});
