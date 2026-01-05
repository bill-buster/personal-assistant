#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

// When running from dist/, __dirname is dist/ but we need src/
const isDist = __dirname.includes('/dist') || __dirname.includes('\\dist');
const spikeDir = isDist 
    ? path.resolve(__dirname, '..', 'src')
    : path.resolve(__dirname);
const executorPath = path.join(spikeDir, 'app', 'executor.ts');
const tsNodeRegister = require.resolve('ts-node/register');
const baseArgs = ['-r', tsNodeRegister, executorPath];

// Create isolated temp directory for this test run
const rawTestTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contacts-test-'));
const testTmpDir = fs.realpathSync(rawTestTmpDir);

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
    } catch (err) {
        // Try to find the last valid JSON line
        const lines = output.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const json = JSON.parse(lines[i]);
                if (json && (typeof json.ok === 'boolean')) {
                    return json;
                }
            } catch (e) {
                // continue
            }
        }
        return null;
    }
}

function logLine(text: string) {
    process.stdout.write(text);
}

let failures = 0;

try {
    // 1. Add Contact
    const addPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'contact_add',
            args: { name: 'Test User', email: 'test@example.com', phone: '123-456-7890' },
        },
    };
    const addResult = runExecutor(addPayload);
    const addJson = parseOutput(addResult.stdout);

    if (!addJson || addJson.ok !== true) {
        failures++;
        logLine('FAIL: contact_add failed\n');
        console.error(addResult.stdout);
    } else {
        logLine('PASS: contact_add\n');
    }

    // 2. Verify Contact Exists (Search)
    const searchPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'contact_search',
            args: { query: 'Test User' },
        },
    };
    const searchResult = runExecutor(searchPayload);
    const searchJson = parseOutput(searchResult.stdout);

    if (!searchJson || searchJson.ok !== true || !searchJson.result || searchJson.result.length !== 1) {
        failures++;
        logLine('FAIL: contact_search failed or found incorrect number of results\n');
        console.error(searchResult.stdout);
    } else if (searchJson.result[0].name !== 'Test User') {
        failures++;
        logLine('FAIL: contact_search found wrong user\n');
    } else {
        logLine('PASS: contact_search\n');
    }

    // 3. Add Duplicate Contact (Should Fail)
    const dupResult = runExecutor(addPayload);
    const dupJson = parseOutput(dupResult.stdout);

    if (!dupJson || dupJson.ok !== false) {
        failures++;
        logLine('FAIL: Duplicate contact_add should fail\n');
        console.error(dupResult.stdout);
    } else if (!dupJson.error || !dupJson.error.message.includes('already exists')) {
        failures++;
        logLine('FAIL: Duplicate contact_add error message mismatch\n');
        console.error(dupJson.error);
    } else {
        logLine('PASS: Duplicate contact_add prevention\n');
    }

    // 4. Update Contact
    const updatePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'contact_update',
            args: { name: 'Test User', email: 'updated@example.com' },
        },
    };
    const updateResult = runExecutor(updatePayload);
    const updateJson = parseOutput(updateResult.stdout);

    if (!updateJson || updateJson.ok !== true) {
        failures++;
        logLine('FAIL: contact_update failed\n');
        console.error(updateResult.stdout);
    } else if (updateJson.result.contact.email !== 'updated@example.com') {
        failures++;
        logLine('FAIL: contact_update failed to update email\n');
    } else {
        logLine('PASS: contact_update\n');
    }

    // 5. Verify Update
    const searchUpdateResult = runExecutor(searchPayload);
    const searchUpdateJson = parseOutput(searchUpdateResult.stdout);
    if (searchUpdateJson.result[0].email !== 'updated@example.com') {
        failures++;
        logLine('FAIL: contact_search did not show updated email\n');
    } else {
        logLine('PASS: contact_update verification\n');
    }

} catch (err) {
    console.error('Test script error:', err);
    failures++;
} finally {
    // Cleanup temp dir
    try {
        fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch (e) {
        console.error('Failed to clean up temp dir:', e);
    }
}

if (failures > 0) {
    console.error(`\n${failures} tests failed.`);
    process.exit(1);
} else {
    console.log('\nAll contact tests passed.');
}
