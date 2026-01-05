#!/usr/bin/env node

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

// Create temp directory for test data (executor baseDir)
const testDataDir = path.join(spikeDir, `tmp_comms_test_${Date.now()}`);
const testConfigDir = path.join(spikeDir, `tmp_comms_config_${Date.now()}`);
const testDir = path.join(spikeDir, 'tmp_comms_test');
const binDir = path.join(testDir, 'bin');
const osascriptLogPath = path.join(testDir, 'osascript.log');
const osascriptBin = path.join(binDir, 'osascript');

// Clean/Prep
if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(testDataDir, { recursive: true });
fs.mkdirSync(testConfigDir, { recursive: true });

// Create config file with fileBaseDir pointing to test data directory
const configFile = path.join(testConfigDir, 'config.json');
fs.writeFileSync(configFile, JSON.stringify({
    version: 1,
    fileBaseDir: testDataDir,
}, null, 2), 'utf8');

// Create fake osascript
// It writes its args to a log file
const osascriptContent = `#!/bin/sh
echo "$@" >> "${osascriptLogPath}"
`;
fs.writeFileSync(osascriptBin, osascriptContent, { mode: 0o755 });

function runExecutor(payload: any, envOverrides: any = {}) {
    // Add binDir to PATH and set ASSISTANT_CONFIG_DIR
    const env = {
        ...process.env,
        ...envOverrides,
        PATH: `${binDir}:${process.env.PATH || ''}`,
        ASSISTANT_CONFIG_DIR: testConfigDir,
    };

    const result = spawnSync(process.execPath, baseArgs, {
        input: JSON.stringify(payload),
        cwd: testDir, // run in test dir
        encoding: 'utf8',
        env
    });

    return {
        status: result.status,
        stdout: (result.stdout || '').trim(),
        stderr: (result.stderr || '').trim()
    };
}

let failures = 0;

function assert(condition: boolean, msg: string, info?: any) {
    if (!condition) {
        console.error(`FAIL: ${msg}`);
        if (info !== undefined) console.error('Info:', JSON.stringify(info, null, 2));
        failures++;
    } else {
        console.log(`PASS: ${msg}`);
    }
}

// === Test 1: Should fail on non-macOS (simulated) ===
const payloadFail = {
    mode: 'tool_call',
    tool_call: {
        tool_name: 'message_send',
        args: { to: 'bob', body: 'test' }
    }
};

const resultFail = runExecutor(payloadFail, { _TEST_PLATFORM_OVERRIDE: 'linux' });
const jsonFail = JSON.parse(resultFail.stdout || '{}');

assert(jsonFail.ok === false, 'Should fail on linux', jsonFail);
assert(jsonFail.error?.message?.includes('available on macOS'), 'Error message should mention macOS', jsonFail.error);


// === Test 2: Should succeed with override and use secure args ===
const payloadOk = {
    mode: 'tool_call',
    tool_call: {
        tool_name: 'message_send',
        args: { to: 'alice', body: 'hello "world"' }
    }
};

    const realMessagesPath = path.join(testDataDir, 'messages.jsonl');

try {
    const resultOk = runExecutor(payloadOk, { _TEST_PLATFORM_OVERRIDE: 'darwin' });

    const jsonOk = JSON.parse(resultOk.stdout || '{}');
    assert(jsonOk.ok === true, 'Should succeed with override', jsonOk);
    assert(jsonOk.result?.message?.includes('via iMessage'), 'Result message should confirm iMessage', jsonOk);

    // Check osascript log
    if (fs.existsSync(osascriptLogPath)) {
        const logContent = fs.readFileSync(osascriptLogPath, 'utf8');
        // The args should be passed after '--'
        // Format of echo "$@" depends on shell, but usually space separated.
        // We passed: -e script -- to body
        assert(logContent.includes('-- alice hello "world"'), 'Arguments should be passed safely after --', logContent);
        assert(!logContent.includes('tell application "Messages" to send "hello \\"world\\""'), 'Should NOT use interpolation', logContent);
    } else {
        assert(false, 'osascript was not called (log missing)');
    }

    // Check messages.jsonl
    if (fs.existsSync(realMessagesPath)) {
        const messagesContent = fs.readFileSync(realMessagesPath, 'utf8');
        const lastLine = messagesContent.trim().split('\n').pop();
        if (lastLine) {
            const entry = JSON.parse(lastLine);
            assert(entry.to === 'alice', 'Logged entry "to" matches');
            assert(entry.body === 'hello "world"', 'Logged entry "body" matches');
        } else {
            assert(false, 'messages.jsonl is empty');
        }
    } else {
        assert(false, 'messages.jsonl was not created');
    }

} finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
}

if (failures > 0) {
    console.error(`\nFAILED with ${failures} errors.`);
    process.exit(1);
} else {
    console.log('\nAll tests passed.');
}
