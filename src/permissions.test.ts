#!/usr/bin/env node

/**
 * Integration tests for permissions enforcement.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

// When running from dist/, use compiled JS; otherwise use ts-node
const isDist = __dirname.includes('/dist') || __dirname.includes('\\dist');
const baseDir = isDist 
    ? path.resolve(__dirname)  // dist/
    : path.resolve(__dirname); // src/
const executorPath = isDist
    ? path.join(baseDir, 'app', 'executor.js')
    : path.join(baseDir, 'app', 'executor.ts');
const permissionsFile = 'permissions.test.json';
const permissionsFilePath = path.join(baseDir, permissionsFile);
const testFile = 'test-write.txt';
const testFilePath = path.join(baseDir, testFile);

let failures = 0;

function runExecutor(input: string, extraArgs: string[] = []) {
    // In dist mode, run compiled JS directly; otherwise use ts-node
    const execArgs = isDist
        ? [executorPath, '--permissions-path', permissionsFile, ...extraArgs]
        : ['-r', require.resolve('ts-node/register'), executorPath, '--permissions-path', permissionsFile, ...extraArgs];
    
    const result = spawnSync(
        process.execPath,
        execArgs,
        {
            input,
            cwd: baseDir,
            encoding: 'utf8',
            env: {
                ...process.env,
                // Use base directory for data isolation per D011
                ASSISTANT_DATA_DIR: baseDir,
            },
        }
    );
    return {
        status: result.status,
        stdout: (result.stdout || '').trim(),
        stderr: (result.stderr || '').trim(),
    };
}

function parseOutput(output: string) {
    try {
        // Extract JSON from output (may have log messages before JSON)
        // Find the last complete JSON object in the output
        const lines = output.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    // Try parsing from this line to the end
                    const jsonStr = lines.slice(i).join('\n');
                    try {
                        return JSON.parse(jsonStr);
                    } catch (e2) {
                        continue;
                    }
                }
            }
        }
        // Fallback: try parsing the entire output
        return JSON.parse(output);
    } catch (err) {
        return null;
    }
}

// Setup: create restrictive permissions file
const testPermissions = {
    allow_paths: [`./${testFile}`],
    require_confirmation_for: ['write_file'],
};
fs.writeFileSync(permissionsFilePath, JSON.stringify(testPermissions), 'utf8');

// Test 1: Write to allowed path WITHOUT confirmation should fail
const noConfirmPayload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'write_file',
        args: { path: `./${testFile}`, content: 'hello' },
    },
});

const noConfirmResult = runExecutor(noConfirmPayload);
const noConfirmJson = parseOutput(noConfirmResult.stdout);
if (!noConfirmJson || noConfirmJson.ok !== false) {
    failures += 1;
    process.stderr.write('FAIL\ncase: write without confirmation\nexpected: ok false\n\n');
}
if (!noConfirmJson || !noConfirmJson.error || !noConfirmJson.error.message.includes('requires confirmation')) {
    failures += 1;
    process.stderr.write(`FAIL\ncase: write without confirmation\nexpected message to include: requires confirmation\ngot: ${noConfirmJson?.error?.message}\n\n`);
}
if (!noConfirmJson || !noConfirmJson.error || !noConfirmJson.error.message.includes(permissionsFile)) {
    failures += 1;
    process.stderr.write(`FAIL\ncase: write without confirmation\nexpected message to include permissions file path\ngot: ${noConfirmJson?.error?.message}\n\n`);
}

// Test 2: Write to allowed path WITH confirmation should succeed
const withConfirmPayload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'write_file',
        args: { path: `./${testFile}`, content: 'hello', confirm: true },
    },
});

const withConfirmResult = runExecutor(withConfirmPayload);
const withConfirmJson = parseOutput(withConfirmResult.stdout);
if (!withConfirmJson || withConfirmJson.ok !== true) {
    failures += 1;
    process.stderr.write('FAIL\ncase: write with confirmation\nexpected: ok true\n\n');
}
if (!fs.existsSync(testFilePath)) {
    failures += 1;
    process.stderr.write('FAIL\ncase: write with confirmation\nexpected: file exists\n\n');
}

// Cleanup test file
if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
}

// Test 3: Write to DISALLOWED path should fail
const disallowedPayload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'write_file',
        args: { path: './not-allowed.txt', content: 'hello', confirm: true },
    },
});

const disallowedResult = runExecutor(disallowedPayload);
const disallowedJson = parseOutput(disallowedResult.stdout);
if (!disallowedJson || disallowedJson.ok !== false) {
    failures += 1;
    process.stderr.write('FAIL\ncase: write to disallowed path\nexpected: ok false\n\n');
}
if (!disallowedJson || !disallowedJson.error || !disallowedJson.error.message.includes('Tool \'write_file\' was blocked')) {
    failures += 1;
    process.stderr.write(`FAIL\ncase: write to disallowed path\nexpected message to include: Tool 'write_file' was blocked\ngot: ${disallowedJson?.error?.message}\n\n`);
}
if (!disallowedJson || !disallowedJson.error || !disallowedJson.error.message.includes('To unblock, add this path')) {
    failures += 1;
    process.stderr.write(`FAIL\ncase: write to disallowed path\nexpected message to include unblock instructions\ngot: ${disallowedJson?.error?.message}\n\n`);
}

// Cleanup permissions file
if (fs.existsSync(permissionsFilePath)) {
    fs.unlinkSync(permissionsFilePath);
}

// T1: default deny if no permissions.json
const noPermsFile = 'permissions.missing.json';
const noPermsFilePath = path.join(baseDir, noPermsFile);
// Ensure it doesn't exist
if (fs.existsSync(noPermsFilePath)) {
    fs.unlinkSync(noPermsFilePath);
}

const t1Payload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'run_cmd',
        args: { command: 'ls' },
    },
});

const t1Result = runExecutor(t1Payload, ['--permissions-path', noPermsFile]);
const t1Json = parseOutput(t1Result.stdout);
if (!t1Json || t1Json.ok !== false) {
    failures += 1;
    process.stderr.write('FAIL\nT1: default deny if no permissions.json\nexpected: ok false\n\n');
}
// Error code is at top level (errorCode) not nested in error object
const t1ErrorCode = t1Json?.errorCode || t1Json?.error?.code;
if (!t1ErrorCode || !t1ErrorCode.includes('DENIED_COMMAND_ALLOWLIST')) {
    failures += 1;
    process.stderr.write(`FAIL\nT1: default deny if no permissions.json\nexpected error code: DENIED_COMMAND_ALLOWLIST\ngot: ${t1ErrorCode}\n\n`);
}

// T2: allow_commands ["ls"] allows ls, denies pwd
const t2Perms = {
    allow_commands: ['ls'],
    allow_paths: [],
    deny_tools: [],
    require_confirmation_for: [],
};
fs.writeFileSync(permissionsFilePath, JSON.stringify(t2Perms), 'utf8');

const t2aPayload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'run_cmd',
        args: { command: 'ls' },
    },
});
const t2aResult = runExecutor(t2aPayload);
const t2aJson = parseOutput(t2aResult.stdout);
if (!t2aJson || t2aJson.ok !== true) {
    failures += 1;
    process.stderr.write('FAIL\nT2a: allow_commands ["ls"] allows ls\nexpected: ok true\n\n');
}

const t2bPayload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'run_cmd',
        args: { command: 'pwd' },
    },
});
const t2bResult = runExecutor(t2bPayload);
const t2bJson = parseOutput(t2bResult.stdout);
if (!t2bJson || t2bJson.ok !== false) {
    failures += 1;
    process.stderr.write('FAIL\nT2b: allow_commands ["ls"] denies pwd\nexpected: ok false\n\n');
}
// Error code is at top level (errorCode) not nested in error object
const t2bErrorCode = t2bJson?.errorCode || t2bJson?.error?.code;
if (!t2bErrorCode || !t2bErrorCode.includes('DENIED_COMMAND_ALLOWLIST')) {
    failures += 1;
    process.stderr.write(`FAIL\nT2b: allow_commands ["ls"] denies pwd\nexpected error code: DENIED_COMMAND_ALLOWLIST\ngot: ${t2bErrorCode}\n\n`);
}

// T3: allow_paths ["."] blocks ../ traversal
const t3TestFile = 't3-test.txt';
const t3TestFilePath = path.join(baseDir, t3TestFile);
fs.writeFileSync(t3TestFilePath, 'test content', 'utf8');

const t3Perms = {
    allow_paths: ['.'],
    allow_commands: [],
    deny_tools: [],
    require_confirmation_for: [],
};
fs.writeFileSync(permissionsFilePath, JSON.stringify(t3Perms), 'utf8');

const t3Payload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'read_file',
        args: { path: '../' + t3TestFile },
    },
});
const t3Result = runExecutor(t3Payload);
const t3Json = parseOutput(t3Result.stdout);
if (!t3Json || t3Json.ok !== false) {
    failures += 1;
    process.stderr.write('FAIL\nT3: allow_paths ["."] blocks ../ traversal\nexpected: ok false\n\n');
}
if (!t3Json || !t3Json.error || !t3Json.error.code || !t3Json.error.code.includes('DENIED_PATH_ALLOWLIST')) {
    failures += 1;
    process.stderr.write(`FAIL\nT3: allow_paths ["."] blocks ../ traversal\nexpected error code: DENIED_PATH_ALLOWLIST\ngot: ${t3Json?.error?.code}\n\n`);
}

// Cleanup T3 test file
if (fs.existsSync(t3TestFilePath)) {
    fs.unlinkSync(t3TestFilePath);
}

// T4: deny_tools ["write_file"] blocks even if agent allows
const t4Perms = {
    allow_paths: ['.'],
    allow_commands: [],
    deny_tools: ['write_file'],
    require_confirmation_for: [],
};
fs.writeFileSync(permissionsFilePath, JSON.stringify(t4Perms), 'utf8');

const t4Payload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'write_file',
        args: { path: './t4-test.txt', content: 'test' },
    },
});
const t4Result = runExecutor(t4Payload);
const t4Json = parseOutput(t4Result.stdout);
if (!t4Json || t4Json.ok !== false) {
    failures += 1;
    process.stderr.write('FAIL\nT4: deny_tools ["write_file"] blocks even if agent allows\nexpected: ok false\n\n');
}
if (!t4Json || !t4Json.error || !t4Json.error.code || !t4Json.error.code.includes('DENIED_TOOL_BLOCKLIST')) {
    failures += 1;
    process.stderr.write(`FAIL\nT4: deny_tools ["write_file"] blocks even if agent allows\nexpected error code: DENIED_TOOL_BLOCKLIST\ngot: ${t4Json?.error?.code}\n\n`);
}

// T5: regression: allow_commands ["cat"], allow_paths ["file.txt"] => cat file.txt succeeds (no crash)
const t5TestFile = 'file.txt';
const t5TestFilePath = path.join(baseDir, t5TestFile);
fs.writeFileSync(t5TestFilePath, 'test content for cat', 'utf8');

const t5Perms = {
    allow_commands: ['cat'],
    allow_paths: [t5TestFile],
    deny_tools: [],
    require_confirmation_for: [],
};
fs.writeFileSync(permissionsFilePath, JSON.stringify(t5Perms), 'utf8');

const t5Payload = JSON.stringify({
    mode: 'tool_call',
    tool_call: {
        tool_name: 'run_cmd',
        args: { command: `cat ${t5TestFile}` },
    },
});
const t5Result = runExecutor(t5Payload);
const t5Json = parseOutput(t5Result.stdout);
if (!t5Json || t5Json.ok !== true) {
    failures += 1;
    process.stderr.write(`FAIL\nT5: regression: allow_commands ["cat"], allow_paths ["file.txt"] => cat file.txt succeeds\nexpected: ok true\ngot: ok ${t5Json?.ok}, error: ${t5Json?.error?.message || 'none'}\n\n`);
}
if (t5Json && t5Json.ok && (!t5Json.result || !t5Json.result.includes('test content for cat'))) {
    failures += 1;
    process.stderr.write(`FAIL\nT5: regression: cat file.txt should return file content\ngot: ${t5Json.result}\n\n`);
}

// Cleanup T5 test file
if (fs.existsSync(t5TestFilePath)) {
    fs.unlinkSync(t5TestFilePath);
}

// Final cleanup permissions file
if (fs.existsSync(permissionsFilePath)) {
    fs.unlinkSync(permissionsFilePath);
}

if (failures > 0) {
    process.stdout.write(`RESULT\nstatus: FAIL (${failures} failures)\n`);
    process.exit(1);
}

process.stdout.write('RESULT\nstatus: OK\n');
export { };
