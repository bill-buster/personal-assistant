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

describe('Contacts', () => {
    let testTmpDir: string;

    beforeAll(() => {
        testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contacts-test-'));
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

    it('should add a contact', () => {
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'contact_add',
                args: { name: 'Test User', email: 'test@example.com', phone: '123-456-7890' },
            },
        };
        const addResult = runExecutor(addPayload);
        const addJson = parseOutput(addResult.stdout);

        expect(addJson).not.toBeNull();
        expect(addJson?.ok).toBe(true);
    });

    it('should search for a contact', () => {
        // First add a contact
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'contact_add',
                args: { name: 'Search User', email: 'search@example.com', phone: '555-555-5555' },
            },
        };
        runExecutor(addPayload);

        const searchPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'contact_search',
                args: { query: 'Search User' },
            },
        };
        const searchResult = runExecutor(searchPayload);
        const searchJson = parseOutput(searchResult.stdout);

        expect(searchJson).not.toBeNull();
        expect(searchJson?.ok).toBe(true);
        expect(searchJson?.result?.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent duplicate contacts', () => {
        const addPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'contact_add',
                args: { name: 'Duplicate User', email: 'dup@example.com' },
            },
        };
        runExecutor(addPayload);

        // Try to add the same contact again
        const dupResult = runExecutor(addPayload);
        const dupJson = parseOutput(dupResult.stdout);

        expect(dupJson).not.toBeNull();
        expect(dupJson?.ok).toBe(false);
        expect(dupJson?.error?.message).toContain('already exists');
    });
});
