import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

import { Dispatcher } from './dispatcher';
import { AGENTS } from './agents';
import { route } from './app/router';

// When running from dist/, __dirname is dist/ but we need src/
const isDist = __dirname.includes('/dist') || __dirname.includes('\\dist');
const spikeDir = isDist 
    ? path.resolve(__dirname, '..', 'src')
    : path.resolve(__dirname);
const cliPath = path.join(spikeDir, 'app', 'cli.ts');
const tsNodeRegister = require.resolve('ts-node/register');

// Create isolated temp directory
const tmpRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'extended-system-test-'));
const tmpRoot = fs.realpathSync(tmpRootRaw);

const dataDir = path.join(tmpRoot, 'data');
const configDir = path.join(tmpRoot, 'config');
const configDataDir = path.join(configDir, 'data');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(configDir, { recursive: true });
fs.mkdirSync(configDataDir, { recursive: true });

// Create permissions.json
fs.writeFileSync(path.join(dataDir, 'permissions.json'), JSON.stringify({
    version: 1,
    allow_paths: ['.'],
    allow_commands: ['pwd'], // Allowed for 'run pwd' test
    require_confirmation_for: [],
    deny_tools: []
}), 'utf8');

const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ASSISTANT_DATA_DIR: dataDir,
    ASSISTANT_CONFIG_DIR: configDir,
    FORCE_COLOR: '0',
};
delete baseEnv.ASSISTANT_PERMISSIONS_PATH;

function runCli(args: string[], input?: string) {
    return spawnSync(process.execPath, ['-r', tsNodeRegister, cliPath, ...args], {
        cwd: spikeDir,
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

async function run() {
    try {
        // CLI: remember + recall
        const rememberResult = runCli(['remember', 'Meeting at 3pm with Alice']);
        assert.strictEqual(rememberResult.status, 0, rememberResult.stderr);
        const rememberJson = parseLastJson(rememberResult.stdout);
        assert.strictEqual(rememberJson.ok, true);

        const recallResult = runCli(['recall', 'Meeting']);
        assert.strictEqual(recallResult.status, 0, recallResult.stderr);
        const recallJson = parseLastJson(recallResult.stdout);
        assert.strictEqual(recallJson.ok, true);
        assert.ok(
            Array.isArray(recallJson.result.entries),
            'recall should return entries array'
        );
        assert.ok(
            recallJson.result.entries.some((entry: any) => entry.text.includes('Meeting at 3pm')),
            'recall should include remembered text'
        );

        // CLI: task add/list/done + human output
        const taskAdd = runCli(['task', 'add', 'Review PR #123']);
        assert.strictEqual(taskAdd.status, 0, taskAdd.stderr);
        const taskAddJson = parseLastJson(taskAdd.stdout);
        assert.strictEqual(taskAddJson.ok, true);

        const taskList = runCli(['task', 'list']);
        assert.strictEqual(taskList.status, 0, taskList.stderr);
        const taskListJson = parseLastJson(taskList.stdout);
        assert.strictEqual(taskListJson.ok, true);
        assert.ok(
            taskListJson.result.entries.some((task: any) => task.text.includes('Review PR')),
            'task list should include added task'
        );

        const taskDone = runCli(['task', 'done', '1']);
        assert.strictEqual(taskDone.status, 0, taskDone.stderr);
        const taskDoneJson = parseLastJson(taskDone.stdout);
        assert.strictEqual(taskDoneJson.ok, true);

        const taskDoneList = runCli(['task', 'list', '--status', 'done']);
        assert.strictEqual(taskDoneList.status, 0, taskDoneList.stderr);
        const taskDoneListJson = parseLastJson(taskDoneList.stdout);
        assert.strictEqual(taskDoneListJson.ok, true);
        assert.ok(
            taskDoneListJson.result.entries.some((task: any) => task.done === true),
            'task list --status done should include done tasks'
        );

        const taskListHuman = runCli(['task', 'list', '--human']);
        assert.strictEqual(taskListHuman.status, 0, taskListHuman.stderr);
        assert.ok(taskListHuman.stdout.includes('Review PR #123'), 'human task list should include task text');

        // CLI: reminder add
        const remindAdd = runCli(['remind', 'add', 'Check groceries', '--in', '5']);
        assert.strictEqual(remindAdd.status, 0, remindAdd.stderr);
        const remindAddJson = parseLastJson(remindAdd.stdout);
        assert.strictEqual(remindAddJson.ok, true);

        // CLI: run command
        const runCmd = runCli(['run', 'pwd']);
        assert.strictEqual(runCmd.status, 0, runCmd.stderr);
        const runCmdJson = parseLastJson(runCmd.stdout);
        assert.strictEqual(runCmdJson.ok, true);

        // CLI: demo flow
        const demo = runCli(['demo']);
        assert.strictEqual(demo.status, 0, demo.stderr);
        assert.ok(demo.stdout.includes('{"demo": "starting"}'), 'demo should emit start marker');
        assert.ok(demo.stdout.includes('{"demo": "complete"}'), 'demo should emit completion marker');

        // Router surface
        const routerResult = await route('remember: test note', 'spike', null, [], false, undefined, undefined);
        if ('mode' in routerResult && routerResult.mode === 'tool_call') {
            assert.strictEqual(routerResult.tool_call.tool_name, 'remember');
        } else {
            assert.fail('Expected tool_call mode');
        }

        // Dispatcher surface: auto-dispatch + enforcement
        const dispatcher = new Dispatcher({ verbose: false, autoDispatch: true, enforceActions: true });
        const autoDispatch = dispatcher.analyze('what time is it', AGENTS.supervisor, []);
        assert.strictEqual(autoDispatch.action, 'auto_dispatch');
        assert.strictEqual(autoDispatch.toolCall?.tool_name, 'get_time');

        // Memory query auto-dispatch: "how old am I"
        const ageDispatch = dispatcher.analyze('how old am I', AGENTS.supervisor, []);
        assert.strictEqual(ageDispatch.action, 'auto_dispatch', '"how old am I" should auto-dispatch');
        assert.strictEqual(ageDispatch.toolCall?.tool_name, 'recall', 'should dispatch to recall tool');
        assert.strictEqual(ageDispatch.toolCall?.args.query, 'age', 'query should be "age"');

        // Memory query auto-dispatch: "what's my birthday"  
        const birthdayDispatch = dispatcher.analyze("what's my birthday", AGENTS.supervisor, []);
        assert.strictEqual(birthdayDispatch.action, 'auto_dispatch', '"what\'s my birthday" should auto-dispatch');
        assert.strictEqual(birthdayDispatch.toolCall?.tool_name, 'recall');
        assert.strictEqual(birthdayDispatch.toolCall?.args.query, 'birthday');

        // Memory query auto-dispatch: "do you remember my doctor's name"
        const doYouRememberDispatch = dispatcher.analyze("do you remember my doctor's name", AGENTS.supervisor, []);
        assert.strictEqual(doYouRememberDispatch.action, 'auto_dispatch');
        assert.strictEqual(doYouRememberDispatch.toolCall?.tool_name, 'recall');
        assert.ok(doYouRememberDispatch.toolCall?.args.query.includes('doctor'), 'query should include doctor');

        const enforceWeather = dispatcher.enforceAction('I will check the weather in Paris.', 'whats the weather', AGENTS.supervisor);
        assert.strictEqual(enforceWeather?.action, 'enforced_dispatch');
        assert.strictEqual(enforceWeather?.toolCall?.tool_name, 'get_weather');
        assert.strictEqual(enforceWeather?.toolCall?.args.location, 'Paris');

        const enforceRecall = dispatcher.enforceAction('I will check what I remember.', 'what do you remember', AGENTS.supervisor);
        assert.strictEqual(enforceRecall?.toolCall?.tool_name, 'recall');
        assert.strictEqual(enforceRecall?.toolCall?.args.query, 'recent items');

        const enforceWeatherMissing = dispatcher.enforceAction('I will check the weather.', 'whats the weather', AGENTS.supervisor);
        assert.strictEqual(enforceWeatherMissing, null);

        // REPL surface: auto-dispatch without LLM
        const replInput = [
            'what time is it',
            'what do you remember about groceries',
            '/tools',
            '/exit',
        ].join('\n');
        const repl = runCli(['repl', '--mock'], replInput);
        assert.strictEqual(repl.status, 0, repl.stderr);
        assert.ok(repl.stdout.includes('Auto-dispatch: get_time'), 'REPL should auto-dispatch time');
        assert.ok(repl.stdout.includes('Auto-dispatch: recall'), 'REPL should auto-dispatch recall');
        assert.ok(repl.stdout.includes('Available Tools'), 'REPL /tools should list tools');
        assert.ok(repl.stdout.includes('remember') || repl.stdout.includes('recall'), 'REPL /tools should show memory tools');

        // Test: Retry Utility
        const { withRetry, isRetryableError } = await import('./providers/llm/retry');

        // Test exponential backoff with mock that fails then succeeds
        let retryAttempts = 0;
        const retriedResult = await withRetry(
            async () => {
                retryAttempts++;
                if (retryAttempts < 3) {
                    const error = new Error('Mock error') as any;
                    error.status = 503;
                    throw error;
                }
                return 'success';
            },
            { maxRetries: 3, baseDelayMs: 10 } // Fast delays for testing
        );
        assert.strictEqual(retriedResult, 'success', 'withRetry should eventually succeed');
        assert.strictEqual(retryAttempts, 3, 'withRetry should have retried twice before succeeding');

        // Test isRetryableError
        assert.strictEqual(isRetryableError({ status: 429 } as any), true, '429 should be retryable');
        assert.strictEqual(isRetryableError({ status: 500 } as any), true, '500 should be retryable');
        assert.strictEqual(isRetryableError({ status: 400 } as any), false, '400 should not be retryable');
        assert.strictEqual(isRetryableError({ message: 'ECONNRESET' } as any), true, 'network errors should be retryable');

        // Test: Validation Module
        const { validateInput, validatePath, validateCommand, formatValidationError } = await import('./core/validation');

        const emptyInputResult = validateInput('');
        assert.strictEqual(emptyInputResult.ok, false, 'Empty input should fail validation');
        assert.strictEqual(emptyInputResult.error?.code, 'INPUT_ERROR');

        const validInputResult = validateInput('hello world');
        assert.strictEqual(validInputResult.ok, true, 'Valid input should pass');

        const traversalPathResult = validatePath('../etc/passwd');
        assert.strictEqual(traversalPathResult.ok, false, 'Path traversal should fail');
        assert.strictEqual(traversalPathResult.error?.code, 'PERMISSION_ERROR');

        const validPathResult = validatePath('subdir/file.txt');
        assert.strictEqual(validPathResult.ok, true, 'Valid relative path should pass');

        const dangerousCommandResult = validateCommand('rm -rf /');
        assert.strictEqual(dangerousCommandResult.ok, false, 'Dangerous command should fail');

        // Test: Structured Logger
        const { generateCorrelationId, createChildLogger, logger, LogLevel, setLogLevel } = await import('./core/logger');

        const corrId = generateCorrelationId();
        assert.ok(corrId.includes('-'), 'Correlation ID should contain a separator');
        assert.ok(corrId.length > 10, 'Correlation ID should be reasonably long');

        const childLogger = createChildLogger({ correlationId: corrId, agent: 'test' });
        assert.ok(typeof childLogger.info === 'function', 'Child logger should have info method');

        // Test: Delegation enforcement continues on buildToolCall failure
        // (This tests the fix we made to dispatcher.ts)
        const enforceNull = dispatcher.enforceAction('I will delegate.', 'delegate task', AGENTS.supervisor);
        // Should be null because no valid delegation target was specified, but should NOT throw
        // The fix ensures we continue to try other mappings instead of early return null

        console.log('All extended CLI/REPL/dispatcher tests passed.');
    } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
}

run().catch((err) => {
    console.error('FAIL', err);
    process.exit(1);
});
