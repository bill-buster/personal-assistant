import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

// When running from dist/, use the compiled JS files directly
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
const logPath = path.join(spikeDir, 'calendar.test.output.txt');

// Create isolated temp directory for this test run
const rawTestTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-test-'));
const testTmpDir = fs.realpathSync(rawTestTmpDir);
const calendarPath = path.join(testTmpDir, 'calendar.jsonl');

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

// No need to unlink calendarPath manually as we are in a fresh temp dir

let failures = 0;

try {
    // Test 1: Add Event
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

    if (!addJson || addJson.ok !== true || !addJson.result.event.id) {
        failures += 1;
        logLine(
            'FAIL\ncase: calendar_event_add\nexpected: ok true with event id\n\n',
            process.stderr
        );
        console.error('Actual stdout:', addResult.stdout);
    }

    const eventId = addJson?.result?.event?.id;

    // Test 2: List Events
    const listPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'calendar_list',
            args: { days: 7 },
        },
    };

    const listResult = runExecutor(listPayload);
    const listJson = parseOutput(listResult.stdout);

    if (
        !listJson ||
        listJson.ok !== true ||
        !Array.isArray(listJson.result) ||
        listJson.result.length !== 1
    ) {
        failures += 1;
        logLine('FAIL\ncase: calendar_list\nexpected: array with 1 event\n\n', process.stderr);
    } else if (listJson.result[0].title !== 'Test Meeting') {
        failures += 1;
        logLine('FAIL\ncase: calendar_list\nexpected: title match\n\n', process.stderr);
    }

    // Test 3: Update Event
    if (eventId) {
        const updatePayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'calendar_event_update',
                args: {
                    id: eventId,
                    title: 'Updated Meeting',
                },
            },
        };

        const updateResult = runExecutor(updatePayload);
        const updateJson = parseOutput(updateResult.stdout);

        if (!updateJson || updateJson.ok !== true) {
            failures += 1;
            logLine('FAIL\ncase: calendar_event_update\nexpected: ok true\n\n', process.stderr);
        }

        // Verify update
        const verifyResult = runExecutor(listPayload);
        const verifyJson = parseOutput(verifyResult.stdout);
        if (!verifyJson || verifyJson.result[0].title !== 'Updated Meeting') {
            failures += 1;
            logLine('FAIL\ncase: verify update\nexpected: new title\n\n', process.stderr);
        }
    }

    // Test 4: Invalid Update (Not Found)
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

    if (
        !invalidUpdateJson ||
        invalidUpdateJson.ok !== false ||
        invalidUpdateJson.error.code !== 'NOT_FOUND'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: calendar_event_update not found\nexpected: NOT_FOUND error\n\n',
            process.stderr
        );
    }
} finally {
    // Cleanup temp dir
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
