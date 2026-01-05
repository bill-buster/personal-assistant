
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

// When running from dist/, __dirname is dist/ but we need src/
const isDist = __dirname.includes('/dist') || __dirname.includes('\\dist');
const spikeDir = isDist 
    ? path.resolve(__dirname, '..', 'src')
    : path.resolve(__dirname);
const executorPath = path.join(spikeDir, 'app', 'executor.ts');
const tsNodeRegister = require.resolve('ts-node/register');
const baseArgs = ['-r', tsNodeRegister, executorPath];

function runExecutor(payload: any) {
  const result = spawnSync(process.execPath, baseArgs, {
    input: JSON.stringify(payload),
    cwd: spikeDir,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function parseOutput(output: string) {
  try {
    return JSON.parse(output);
  } catch (err) {
    return null;
  }
}

// Setup
const calendarPath = path.join(spikeDir, 'calendar.jsonl');
if (fs.existsSync(calendarPath)) {
  fs.unlinkSync(calendarPath);
}

let failures = 0;
function logFailure(message: string) {
    failures++;
    console.error(`FAIL: ${message}`);
}

console.log('Starting Calendar Tool Verification...');

// 1. Test calendar_event_add
console.log('Testing calendar_event_add...');
const addPayload = {
  mode: 'tool_call',
  tool_call: {
    tool_name: 'calendar_event_add',
    args: {
        title: 'Meeting with Team',
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration_minutes: 60
    },
  },
};
const addResult = runExecutor(addPayload);
const addJson = parseOutput(addResult.stdout);

if (!addJson || addJson.ok !== true) {
    logFailure('calendar_event_add failed');
    console.error(addResult.stdout);
    console.error(addResult.stderr);
} else if (!addJson.result.event.id) {
    logFailure('calendar_event_add did not return an ID');
} else {
    console.log('  OK');
}

const eventId = addJson?.result?.event?.id;

// 2. Test calendar_list
if (eventId) {
    console.log('Testing calendar_list...');
    const listPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'calendar_list',
            args: { days: 7 },
        },
    };
    const listResult = runExecutor(listPayload);
    const listJson = parseOutput(listResult.stdout);

    if (!listJson || listJson.ok !== true) {
        logFailure('calendar_list failed');
    } else if (!Array.isArray(listJson.result) || listJson.result.length === 0) {
        logFailure('calendar_list returned empty or invalid result');
    } else {
        const found = listJson.result.find((e: any) => e.id === eventId);
        if (!found) {
            logFailure('calendar_list did not find the added event');
        } else {
            console.log('  OK');
        }
    }
}

// 3. Test calendar_event_update
if (eventId) {
    console.log('Testing calendar_event_update...');
    const updatePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'calendar_event_update',
            args: {
                id: eventId,
                title: 'Updated Meeting Title',
                start_time: new Date(Date.now() + 172800000).toISOString() // Day after tomorrow
            },
        },
    };
    const updateResult = runExecutor(updatePayload);
    const updateJson = parseOutput(updateResult.stdout);

    if (!updateJson || updateJson.ok !== true) {
        logFailure('calendar_event_update failed');
        console.error(updateResult.stdout);
    } else {
         // Verify update via list
        const listPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'calendar_list',
                args: { days: 7 },
            },
        };
        const listResult = runExecutor(listPayload);
        const listJson = parseOutput(listResult.stdout);
        const updatedEvent = listJson?.result?.find((e: any) => e.id === eventId);

        if (updatedEvent && updatedEvent.title === 'Updated Meeting Title') {
            console.log('  OK');
        } else {
            logFailure('calendar_event_update did not persist changes');
            console.log('Expected: Updated Meeting Title, Got:', updatedEvent?.title);
        }
    }
}

// Cleanup
if (fs.existsSync(calendarPath)) {
  fs.unlinkSync(calendarPath);
}

if (failures > 0) {
    console.error(`\n${failures} tests failed.`);
    process.exit(1);
} else {
    console.log('\nAll tests passed.');
}
