import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AGENTS, SYSTEM } from './agents';
import { route } from './app/router';
import { Dispatcher } from './dispatcher';

// Always use dist/ for spawned processes
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const cliPath = path.join(distDir, 'app', 'cli.js');
const execArgs = [cliPath];

describe('Extended System', () => {
    let tmpRoot: string;
    let dataDir: string;
    let configDir: string;
    let configDataDir: string;
    let baseEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        // Create isolated temp directory
        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'extended-system-test-'));
        tmpRoot = fs.realpathSync(tmpRoot);

        dataDir = path.join(tmpRoot, 'data');
        configDir = path.join(tmpRoot, 'config');
        configDataDir = path.join(configDir, 'data');

        fs.mkdirSync(dataDir, { recursive: true });
        fs.mkdirSync(configDir, { recursive: true });
        fs.mkdirSync(configDataDir, { recursive: true });

        // Create permissions.json
        fs.writeFileSync(
            path.join(dataDir, 'permissions.json'),
            JSON.stringify({
                version: 1,
                allow_paths: ['.'],
                allow_commands: ['pwd'],
                require_confirmation_for: [],
                deny_tools: [],
            }),
            'utf8'
        );

        baseEnv = {
            ...process.env,
            ASSISTANT_DATA_DIR: dataDir,
            ASSISTANT_CONFIG_DIR: configDir,
            FORCE_COLOR: '0',
        };
        delete baseEnv.ASSISTANT_PERMISSIONS_PATH;
    });

    afterAll(() => {
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch {
            // Ignore
        }
    });

    function runCli(args: string[], input?: string) {
        return spawnSync(process.execPath, [...execArgs, ...args], {
            cwd: distDir,
            encoding: 'utf8',
            env: baseEnv,
            input,
        });
    }

    function parseLastJson(stdout: string) {
        const lines = stdout.trim().split('\n').filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') || line.startsWith('[')) {
                return JSON.parse(line);
            }
        }
        throw new Error(`No JSON found in output:\n${stdout}`);
    }

    it('should remember and recall', () => {
        const rememberResult = runCli(['remember', 'Meeting at 3pm with Alice']);
        expect(rememberResult.status).toBe(0);
        const rememberJson = parseLastJson(rememberResult.stdout);
        expect(rememberJson.ok).toBe(true);

        const recallResult = runCli(['recall', 'Meeting']);
        expect(recallResult.status).toBe(0);
        const recallJson = parseLastJson(recallResult.stdout);
        expect(recallJson.ok).toBe(true);
        expect(Array.isArray(recallJson.result.entries)).toBe(true);
    });

    it('should add, list, and complete tasks', () => {
        const taskAdd = runCli(['task', 'add', 'Review PR #123']);
        expect(taskAdd.status).toBe(0);
        const taskAddJson = parseLastJson(taskAdd.stdout);
        expect(taskAddJson.ok).toBe(true);

        const taskList = runCli(['task', 'list']);
        expect(taskList.status).toBe(0);
        const taskListJson = parseLastJson(taskList.stdout);
        expect(taskListJson.ok).toBe(true);

        const taskDone = runCli(['task', 'done', '1']);
        expect(taskDone.status).toBe(0);
    });

    it('should add a reminder', () => {
        const remindAdd = runCli(['remind', 'add', 'Check groceries', '--in', '5']);
        expect(remindAdd.status).toBe(0);
        const remindAddJson = parseLastJson(remindAdd.stdout);
        expect(remindAddJson.ok).toBe(true);
    });

    it('should run demo', () => {
        const demo = runCli(['demo']);
        expect(demo.status).toBe(0);
        expect(demo.stdout).toContain('{"demo": "starting"}');
        expect(demo.stdout).toContain('{"demo": "complete"}');
    });

    it('should route remember command correctly', async () => {
        const routerResult = await route(
            'remember: test note',
            'spike',
            null,
            [],
            false,
            SYSTEM,
            undefined
        );
        if ('mode' in routerResult && routerResult.mode === 'tool_call') {
            expect(routerResult.tool_call.tool_name).toBe('remember');
        } else {
            throw new Error('Expected tool_call mode');
        }
    });

    it('should auto-dispatch time queries', () => {
        const dispatcher = new Dispatcher({
            verbose: false,
            autoDispatch: true,
            enforceActions: true,
        });
        const autoDispatch = dispatcher.analyze('what time is it', AGENTS.supervisor, []);
        expect(autoDispatch.action).toBe('auto_dispatch');
        expect(autoDispatch.toolCall?.tool_name).toBe('get_time');
    });

    it('should auto-dispatch memory queries', () => {
        const dispatcher = new Dispatcher({
            verbose: false,
            autoDispatch: true,
            enforceActions: true,
        });
        const ageDispatch = dispatcher.analyze('how old am I', AGENTS.supervisor, []);
        expect(ageDispatch.action).toBe('auto_dispatch');
        expect(ageDispatch.toolCall?.tool_name).toBe('recall');
    });

    it('should enforce weather actions', () => {
        const dispatcher = new Dispatcher({
            verbose: false,
            autoDispatch: true,
            enforceActions: true,
        });
        const enforceWeather = dispatcher.enforceAction(
            'I will check the weather in Paris.',
            'whats the weather',
            AGENTS.supervisor
        );
        expect(enforceWeather?.action).toBe('enforced_dispatch');
        expect(enforceWeather?.toolCall?.tool_name).toBe('get_weather');
        expect(enforceWeather?.toolCall?.args.location).toBe('Paris');
    });

    it('should handle retry logic', async () => {
        const { withRetry, isRetryableError } = await import('./providers/llm/retry');

        let retryAttempts = 0;
        const retriedResult = await withRetry(
            async () => {
                retryAttempts++;
                if (retryAttempts < 3) {
                    const error = new Error('Mock error') as Error & { status: number };
                    error.status = 503;
                    throw error;
                }
                return 'success';
            },
            { maxRetries: 3, baseDelayMs: 10 }
        );
        expect(retriedResult).toBe('success');
        expect(retryAttempts).toBe(3);

        expect(isRetryableError({ status: 429 } as Error & { status: number })).toBe(true);
        expect(isRetryableError({ status: 500 } as Error & { status: number })).toBe(true);
        expect(isRetryableError({ status: 400 } as Error & { status: number })).toBe(false);
    });

    it('should validate inputs correctly', async () => {
        const { validateInput, validatePath, validateCommand } = await import('./core/validation');

        const emptyInputResult = validateInput('');
        expect(emptyInputResult.ok).toBe(false);

        const validInputResult = validateInput('hello world');
        expect(validInputResult.ok).toBe(true);

        const traversalPathResult = validatePath('../etc/passwd');
        expect(traversalPathResult.ok).toBe(false);

        const dangerousCommandResult = validateCommand('rm -rf /');
        expect(dangerousCommandResult.ok).toBe(false);
    });
});
