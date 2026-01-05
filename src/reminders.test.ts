import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

// When running from dist/, __dirname is dist/ but we need src/
const isDist = __dirname.includes('/dist') || __dirname.includes('\\dist');
const spikeDir = isDist
    ? path.resolve(__dirname) // Use dist/ directory in dist mode
    : path.resolve(__dirname);
const executorPath = isDist
    ? path.join(spikeDir, 'app', 'executor.js')
    : path.join(spikeDir, 'app', 'executor.ts');
const baseArgs = isDist
    ? [executorPath]
    : ['-r', require.resolve('ts-node/register'), executorPath];
const logPath = path.join(spikeDir, 'reminders.test.output.txt');

// Create isolated temp directory for this test run
const testTmpDirRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'reminders-test-'));
const testTmpDir = fs.realpathSync(testTmpDirRaw);
const remindersPath = path.join(testTmpDir, 'reminders.jsonl');

function runExecutor(payload: any) {
    // Use ASSISTANT_DATA_DIR to isolate test data in temp directory
    const result = spawnSync(process.execPath, baseArgs, {
        input: JSON.stringify(payload),
        cwd: spikeDir,
        encoding: 'utf8',
        env: {
            ...process.env,
            // Use temp directory for data isolation
            ASSISTANT_DATA_DIR: testTmpDir,
            // Point to permissions.json in spike directory
            ASSISTANT_PERMISSIONS_PATH: path.join(spikeDir, 'permissions.json'),
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
        // Try to find the last valid JSON line
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

function logLine(text: string, stream?: any) {
    fs.appendFileSync(logPath, text, 'utf8');
    if (stream) {
        stream.write(text);
    }
}

// Setup
const startedAt = new Date().toISOString();
const cmd = `node ${path.basename(process.argv[1])}`;
fs.writeFileSync(logPath, `started_at: ${startedAt}\ncmd: ${cmd}\n\n`, 'utf8');

let failures = 0;

try {
    // Test 1: Add Reminder
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
    const addJson = parseOutput(addResult.stdout);

    if (!addJson || addJson.ok !== true || !addJson.result.reminder.id) {
        failures += 1;
        logLine('FAIL\ncase: reminder_add\nexpected: ok true with reminder id\n\n', process.stderr);
    }

    const reminderId = addJson?.result?.reminder?.id;

    // Test 2: List Reminders
    const listPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'reminder_list',
            args: {},
        },
    };

    const listResult = runExecutor(listPayload);
    const listJson = parseOutput(listResult.stdout);
    logLine(`listJson: ${JSON.stringify(listJson, null, 2)}\n`);

    if (
        !listJson ||
        listJson.ok !== true ||
        !Array.isArray(listJson.result.entries) ||
        listJson.result.entries.length !== 1
    ) {
        failures += 1;
        logLine('FAIL\ncase: reminder_list\nexpected: array with 1 reminder\n\n', process.stderr);
    } else if (listJson.result.entries[0].text !== 'Test Reminder') {
        failures += 1;
        logLine('FAIL\ncase: reminder_list\nexpected: text match\n\n', process.stderr);
    }

    // Test 3: List Reminders with startTime
    const listWithStartPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'reminder_list',
            args: {
                start_time: new Date(Date.now() + 30000).toISOString(),
            },
        },
    };

    const listWithStartResult = runExecutor(listWithStartPayload);
    const listWithStartJson = parseOutput(listWithStartResult.stdout);

    if (
        !listWithStartJson ||
        listWithStartJson.ok !== true ||
        !Array.isArray(listWithStartJson.result.entries) ||
        listWithStartJson.result.entries.length !== 1
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: reminder_list with start_time\nexpected: array with 1 reminder\n\n',
            process.stderr
        );
    }

    // Test 4: List Reminders with future startTime
    const listWithFutureStartPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'reminder_list',
            args: {
                start_time: new Date(Date.now() + 90000).toISOString(),
            },
        },
    };

    const listWithFutureStartResult = runExecutor(listWithFutureStartPayload);
    const listWithFutureStartJson = parseOutput(listWithFutureStartResult.stdout);

    if (
        !listWithFutureStartJson ||
        listWithFutureStartJson.ok !== true ||
        !Array.isArray(listWithFutureStartJson.result.entries) ||
        listWithFutureStartJson.result.entries.length !== 0
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: reminder_list with future start_time\nexpected: array with 0 reminders\n\n',
            process.stderr
        );
    }
} finally {
    // Cleanup
    try {
        fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch {
        // Ignore cleanup error
    }
}

if (failures > 0) {
    logLine('RESULT\nstatus: FAIL\n', process.stderr);
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
