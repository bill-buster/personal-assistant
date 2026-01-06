#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

// When running from dist/, __dirname is dist/ but we need src/ for TS mode
// In dist mode, use the compiled JS files directly
const isDist = __dirname.includes('/dist') || __dirname.includes('\\dist');
const spikeDir = isDist
    ? path.resolve(__dirname) // Use dist/ directory in dist mode
    : path.resolve(__dirname);
const executorPath = isDist
    ? path.join(spikeDir, 'app', 'executor.js')
    : path.join(spikeDir, 'app', 'executor.ts');
const routerPath = isDist
    ? path.join(spikeDir, 'app', 'router.js')
    : path.join(spikeDir, 'app', 'router.ts');
const baseArgs = isDist
    ? [executorPath, '--agent', 'system']
    : ['-r', require.resolve('ts-node/register'), executorPath, '--agent', 'system'];
const routerArgs = isDist ? [routerPath] : ['-r', require.resolve('ts-node/register'), routerPath];

// Create isolated temp directory for this test run
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'executor-test-'));
const testRoot = fs.realpathSync(testRootRaw);

const testDataDir = path.join(testRoot, 'data');
const testConfigDir = path.join(testRoot, 'config');
fs.mkdirSync(testDataDir, { recursive: true });
fs.mkdirSync(testConfigDir, { recursive: true });

// Create config file with fileBaseDir pointing to test data directory
const configFile = path.join(testConfigDir, 'config.json');
fs.writeFileSync(
    configFile,
    JSON.stringify(
        {
            version: 1,
            fileBaseDir: testDataDir,
        },
        null,
        2
    ),
    'utf8'
);

// Set up environment
const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ASSISTANT_CONFIG_DIR: testConfigDir,
    ASSISTANT_DATA_DIR: testDataDir,
};
// Ensure we don't inherit a permissions path override
delete testEnv.ASSISTANT_PERMISSIONS_PATH;

function runRouter(args: string[]) {
    return spawnSync(process.execPath, [...routerArgs, ...args], {
        cwd: spikeDir,
        encoding: 'utf8',
        env: testEnv,
    });
}
const testFile = 'tmp-executor-test.txt';
const testFilePath = path.join(testDataDir, testFile);
const testDir = 'tmp-executor-dir';
const testDirPath = path.join(testDataDir, testDir);
const testBinDir = path.join(testDataDir, 'tmp-executor-bin');
const signalCatPath = path.join(testBinDir, 'cat');
const memoryErrorFile = 'tmp-executor-memory-error.json';
const memoryErrorPath = path.join(testDataDir, memoryErrorFile);
const readDir = 'tmp-executor-read-dir';
const readDirPath = path.join(testDataDir, readDir);
const logPath = path.join(spikeDir, 'executor.test.output.txt');
const memoryPath = path.join(testDataDir, 'memory.json');
const permissionsPath = path.join(testDataDir, 'permissions.json');
const tasksPath = path.join(testDataDir, 'tasks.jsonl');
const memoryLogPath = path.join(testDataDir, 'memory.jsonl');
const remindersPath = path.join(testDataDir, 'reminders.jsonl');
const memoryLimitFile = 'tmp-executor-memory-limit.json';
const memoryLimitPath = path.join(testDataDir, memoryLimitFile);

function runExecutor(payload: any) {
    const result = spawnSync(process.execPath, baseArgs, {
        input: JSON.stringify(payload),
        cwd: spikeDir,
        encoding: 'utf8',
        env: testEnv,
    });
    return {
        status: result.status,
        stdout: (result.stdout || '').trim(),
    };
}

function runExecutorWithArgs(args: string[], payload: any) {
    const result = spawnSync(process.execPath, [...baseArgs, ...args], {
        input: JSON.stringify(payload),
        cwd: spikeDir,
        encoding: 'utf8',
        env: testEnv,
    });
    return {
        status: result.status,
        stdout: (result.stdout || '').trim(),
    };
}

function runExecutorRaw(input: string) {
    const result = spawnSync(process.execPath, baseArgs, {
        input,
        cwd: spikeDir,
        encoding: 'utf8',
        env: testEnv,
    });
    return {
        status: result.status,
        stdout: (result.stdout || '').trim(),
    };
}

function runExecutorWithEnv(envOverrides: any, payload: any) {
    const result = spawnSync(process.execPath, baseArgs, {
        input: JSON.stringify(payload),
        cwd: spikeDir,
        encoding: 'utf8',
        env: { ...testEnv, ...envOverrides },
    });
    return {
        status: result.status,
        stdout: (result.stdout || '').trim(),
    };
}

function runExecutorScript(script: string, args: string[], payload: any) {
    const fullArgs = args && args.length > 0 ? ['--', ...args] : [];
    // In dist mode, adjust the script to use .js extensions and don't use ts-node
    const adjustedScript = isDist
        ? script.replace(/\.ts'/g, ".js'").replace(/\.ts"/g, '.js"')
        : script;
    const execArgs = isDist
        ? ['-e', adjustedScript, ...fullArgs]
        : ['-r', require.resolve('ts-node/register'), '-e', adjustedScript, ...fullArgs];
    const result = spawnSync(process.execPath, execArgs, {
        cwd: spikeDir,
        input: JSON.stringify(payload),
        encoding: 'utf8',
        env: testEnv, // Ensure env is passed here too
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

function checkDebug(debug: any, expected: any) {
    const keys = ['path', 'duration_ms', 'model', 'memory_read', 'memory_write'];
    if (!debug || typeof debug !== 'object') {
        failures += 1;
        logLine('FAIL\ncase: debug\nexpected: object\n\n', process.stderr);
        return;
    }
    for (const key of keys) {
        if (!(key in debug)) {
            failures += 1;
            logLine(`FAIL\ncase: debug\nmissing: ${key}\n\n`, process.stderr);
            return;
        }
    }
    if (expected && 'memory_read' in expected && debug.memory_read !== expected.memory_read) {
        failures += 1;
        logLine('FAIL\ncase: debug\nmemory_read mismatch\n\n', process.stderr);
    }
    if (expected && 'memory_write' in expected && debug.memory_write !== expected.memory_write) {
        failures += 1;
        logLine('FAIL\ncase: debug\nmemory_write mismatch\n\n', process.stderr);
    }
    if (expected && expected.path && debug.path !== expected.path) {
        failures += 1;
        logLine('FAIL\ncase: debug\npath mismatch\n\n', process.stderr);
    }
}
const startedAt = new Date().toISOString();
const cmd = `node ${path.basename(process.argv[1])}`;
fs.writeFileSync(logPath, `started_at: ${startedAt}\ncmd: ${cmd}\n\n`, 'utf8');

// Create initial permissions.json that allows the test directory
// This enables early tests to work before specific permission tests override it
fs.writeFileSync(
    permissionsPath,
    JSON.stringify({
        version: 1,
        allow_paths: ['.'],
        allow_commands: ['cat', 'ls', 'pwd', 'du'],
        require_confirmation_for: [],
        deny_tools: [],
    }),
    'utf8'
);

function logLine(text: string, stream?: any) {
    fs.appendFileSync(logPath, text, 'utf8');
    if (stream) {
        stream.write(text);
    }
}

let failures = 0;

try {
    // write_file writes and read_file reads back
    const writePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'write_file',
            args: { path: testFile, content: 'hello world' },
        },
    };
    const writeResult = runExecutor(writePayload);
    const writeJson = parseOutput(writeResult.stdout);
    if (!writeJson || writeJson.ok !== true || writeJson.tool_name !== 'write_file') {
        failures += 1;
        logLine(
            'FAIL\ncase: write_file\nexpected: ok true\ngot: ' +
                JSON.stringify(writeJson) +
                '\nraw: ' +
                writeResult.stdout +
                '\n\n',
            process.stderr
        );
    }
    if (writeJson) {
        checkDebug(writeJson._debug, {
            memory_read: false,
            memory_write: false,
            path: 'tool_json',
        });
    }

    const readPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: testFile },
        },
    };
    const readResult = runExecutor(readPayload);
    const readJson = parseOutput(readResult.stdout);
    if (!readJson || readJson.ok !== true || readJson.result.content !== 'hello world') {
        failures += 1;
        logLine('FAIL\ncase: read_file\nexpected: content match\n\n', process.stderr);
    }

    // read_file missing returns EXEC_ERROR
    const missingReadPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: 'missing-read.txt' },
        },
    };
    const missingReadResult = runExecutor(missingReadPayload);
    const missingReadJson = parseOutput(missingReadResult.stdout);
    if (!missingReadJson || missingReadJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: read_file missing\nexpected: ok false\n\n', process.stderr);
    }
    if (!missingReadJson || !missingReadJson.error || missingReadJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: read_file missing\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !missingReadJson ||
        !missingReadJson.error ||
        !missingReadJson.error.message ||
        !missingReadJson.error.message.includes('missing-read.txt')
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: read_file missing\nexpected: path in error message\n\n',
            process.stderr
        );
    }

    // read_file directory returns EXEC_ERROR
    if (!fs.existsSync(readDirPath)) {
        fs.mkdirSync(readDirPath);
    }
    const readDirPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: readDir },
        },
    };
    const readDirResult = runExecutor(readDirPayload);
    const readDirJson = parseOutput(readDirResult.stdout);
    if (!readDirJson || readDirJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: read_file directory\nexpected: ok false\n\n', process.stderr);
    }
    if (!readDirJson || !readDirJson.error || readDirJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: read_file directory\nexpected: EXEC_ERROR\n\n', process.stderr);
    }

    // write_file to directory returns EXEC_ERROR
    if (!fs.existsSync(testDirPath)) {
        fs.mkdirSync(testDirPath);
    }
    const writeDirPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'write_file',
            args: { path: testDir, content: 'nope' },
        },
    };
    const writeDirResult = runExecutor(writeDirPayload);
    const writeDirJson = parseOutput(writeDirResult.stdout);
    if (!writeDirJson || writeDirJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: write_file directory\nexpected: ok false\n\n', process.stderr);
    }
    if (!writeDirJson || !writeDirJson.error || writeDirJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: write_file directory\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !writeDirJson ||
        !writeDirJson.error ||
        !writeDirJson.error.message ||
        !writeDirJson.error.message.includes(testDir)
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: write_file directory\nexpected: path in error message\n\n',
            process.stderr
        );
    }

    // run_cmd cat allowed
    const catPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: `cat ${testFile}` },
        },
    };
    const catResult = runExecutor(catPayload);
    const catJson = parseOutput(catResult.stdout);
    if (!catJson || catJson.ok !== true || catJson.result.trim() !== 'hello world') {
        failures += 1;
        logLine('FAIL\ncase: run_cmd cat\nexpected: content match\n\n', process.stderr);
    }

    // run_cmd cat missing surfaces stderr text
    const catMissingPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'cat missing-run-cmd.txt' },
        },
    };
    const catMissingResult = runExecutor(catMissingPayload);
    const catMissingJson = parseOutput(catMissingResult.stdout);
    if (!catMissingJson || catMissingJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd cat missing\nexpected: ok false\n\n', process.stderr);
    }
    if (!catMissingJson || !catMissingJson.error || catMissingJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: run_cmd cat missing\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !catMissingJson ||
        !catMissingJson.error ||
        !catMissingJson.error.message ||
        !catMissingJson.error.message.includes('missing-run-cmd.txt')
    ) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd cat missing\nexpected: stderr text\n\n', process.stderr);
    }

    // P1: run_cmd with double-quoted filename containing spaces
    const quotedFileContent = 'content with spaces test';
    const quotedFileName = 'test file with spaces.txt';
    const quotedFilePath = path.join(testDataDir, quotedFileName);
    fs.writeFileSync(quotedFilePath, quotedFileContent, 'utf8');

    const catDoubleQuotePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: `cat "${quotedFileName}"` },
        },
    };
    const catDoubleQuoteResult = runExecutor(catDoubleQuotePayload);
    const catDoubleQuoteJson = parseOutput(catDoubleQuoteResult.stdout);
    if (
        !catDoubleQuoteJson ||
        catDoubleQuoteJson.ok !== true ||
        catDoubleQuoteJson.result?.trim() !== quotedFileContent
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd cat double-quoted\nexpected: content match\n\n',
            process.stderr
        );
    }

    // P1: run_cmd with single-quoted filename containing spaces
    const catSingleQuotePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: `cat '${quotedFileName}'` },
        },
    };
    const catSingleQuoteResult = runExecutor(catSingleQuotePayload);
    const catSingleQuoteJson = parseOutput(catSingleQuoteResult.stdout);
    if (
        !catSingleQuoteJson ||
        catSingleQuoteJson.ok !== true ||
        catSingleQuoteJson.result?.trim() !== quotedFileContent
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd cat single-quoted\nexpected: content match\n\n',
            process.stderr
        );
    }

    // P1: run_cmd with unterminated double quote returns VALIDATION_ERROR
    const unterminatedDoubleQuotePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'cat "test file.txt' },
        },
    };
    const unterminatedDoubleQuoteResult = runExecutor(unterminatedDoubleQuotePayload);
    const unterminatedDoubleQuoteJson = parseOutput(unterminatedDoubleQuoteResult.stdout);
    if (!unterminatedDoubleQuoteJson || unterminatedDoubleQuoteJson.ok !== false) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd unterminated double quote\nexpected: ok false\n\n',
            process.stderr
        );
    }
    if (
        !unterminatedDoubleQuoteJson ||
        !unterminatedDoubleQuoteJson.error ||
        unterminatedDoubleQuoteJson.error.code !== 'VALIDATION_ERROR'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd unterminated double quote\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // P1: run_cmd with unterminated single quote returns VALIDATION_ERROR
    const unterminatedSingleQuotePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: "cat 'test file.txt" },
        },
    };
    const unterminatedSingleQuoteResult = runExecutor(unterminatedSingleQuotePayload);
    const unterminatedSingleQuoteJson = parseOutput(unterminatedSingleQuoteResult.stdout);
    if (!unterminatedSingleQuoteJson || unterminatedSingleQuoteJson.ok !== false) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd unterminated single quote\nexpected: ok false\n\n',
            process.stderr
        );
    }
    if (
        !unterminatedSingleQuoteJson ||
        !unterminatedSingleQuoteJson.error ||
        unterminatedSingleQuoteJson.error.code !== 'VALIDATION_ERROR'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd unterminated single quote\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // run_cmd allowed
    const pwdPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'pwd' },
        },
    };
    const pwdResult = runExecutor(pwdPayload);
    const pwdJson = parseOutput(pwdResult.stdout);
    if (!pwdJson || pwdJson.ok !== true || !pwdJson.result) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd allowed\nexpected: ok true\n\n', process.stderr);
    }

    // run_cmd du depth allowed
    const duDepthPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: `du -d 0 ${testDir}` },
        },
    };
    const duDepthResult = runExecutor(duDepthPayload);
    const duDepthJson = parseOutput(duDepthResult.stdout);
    if (!duDepthJson || duDepthJson.ok !== true) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd du depth\nexpected: ok true\ngot: ' +
                JSON.stringify(duDepthJson) +
                '\nraw: ' +
                duDepthResult.stdout +
                '\n\n',
            process.stderr
        );
    }

    // run_cmd du threshold allowed
    const duThresholdPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: `du -t 1 ${testDir}` },
        },
    };
    const duThresholdResult = runExecutor(duThresholdPayload);
    const duThresholdJson = parseOutput(duThresholdResult.stdout);
    if (!duThresholdJson || duThresholdJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd du threshold\nexpected: ok true\n\n', process.stderr);
    }

    // run_cmd combined flags allowed
    const combinedFlagsPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'ls -la' },
        },
    };
    const combinedFlagsResult = runExecutor(combinedFlagsPayload);
    const combinedFlagsJson = parseOutput(combinedFlagsResult.stdout);
    if (!combinedFlagsJson || combinedFlagsJson.ok !== true) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd combined flags\nexpected: ok true\ngot: ' +
                JSON.stringify(combinedFlagsJson) +
                '\n\n',
            process.stderr
        );
    }

    // run_cmd signal termination returns EXEC_ERROR with signal message
    if (!fs.existsSync(testBinDir)) {
        fs.mkdirSync(testBinDir);
    }
    fs.writeFileSync(signalCatPath, '#!/bin/sh\nkill -TERM $$\n', 'utf8');
    fs.chmodSync(signalCatPath, 0o755);
    const signalPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: `cat ${testFile} ` },
        },
    };
    const signalResult = runExecutorWithEnv({ PATH: testBinDir }, signalPayload);
    const signalJson = parseOutput(signalResult.stdout);
    if (!signalJson || signalJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd signal\nexpected: ok false\n\n', process.stderr);
    }
    if (!signalJson || !signalJson.error || signalJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: run_cmd signal\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !signalJson ||
        !signalJson.error ||
        !/terminated by signal/i.test(signalJson.error.message || '')
    ) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd signal\nexpected: signal message\n\n', process.stderr);
    }
    if (signalResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd signal\nexpected: non-zero exit\n\n', process.stderr);
    }

    // run_cmd spawn failure returns EXEC_ERROR with OS error text
    const spawnFailPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'ls' },
        },
    };
    const spawnFailResult = runExecutorWithEnv({ PATH: '' }, spawnFailPayload);
    const spawnFailJson = parseOutput(spawnFailResult.stdout);
    if (!spawnFailJson || spawnFailJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd spawn failure\nexpected: ok false\n\n', process.stderr);
    }
    if (!spawnFailJson || !spawnFailJson.error || spawnFailJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: run_cmd spawn failure\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !spawnFailJson ||
        !spawnFailJson.error ||
        !/ENOENT|not found/i.test(spawnFailJson.error.message || '')
    ) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd spawn failure\nexpected: OS error text\n\n', process.stderr);
    }
    if (spawnFailResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd spawn failure\nexpected: non-zero exit\n\n', process.stderr);
    }

    // run_cmd disallowed
    const disallowedPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'rm -rf /' },
        },
    };
    const disallowedResult = runExecutor(disallowedPayload);
    const disallowedJson = parseOutput(disallowedResult.stdout);
    if (!disallowedJson || disallowedJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd disallowed\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !disallowedJson ||
        !disallowedJson.error ||
        disallowedJson.error.code !== 'DENIED_COMMAND_ALLOWLIST'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: run_cmd disallowed\nexpected: DENIED_COMMAND_ALLOWLIST\n\n',
            process.stderr
        );
    }

    // path traversal fails
    const traversalPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: '../AGENTS.md' },
        },
    };
    const traversalResult = runExecutor(traversalPayload);
    const traversalJson = parseOutput(traversalResult.stdout);
    if (!traversalJson || traversalJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: path traversal\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !traversalJson ||
        !traversalJson.error ||
        traversalJson.error.code !== 'DENIED_PATH_ALLOWLIST'
    ) {
        failures += 1;
        logLine('FAIL\ncase: path traversal\nexpected: VALIDATION_ERROR\n\n', process.stderr);
    }

    // absolute path rejected for write_file
    const absPathPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'write_file',
            args: { path: '/tmp/abs.txt', content: 'x' },
        },
    };
    const absPathResult = runExecutor(absPathPayload);
    const absPathJson = parseOutput(absPathResult.stdout);
    if (!absPathJson || absPathJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: write_file absolute path\nexpected: ok false\n\n', process.stderr);
    }
    if (!absPathJson || !absPathJson.error || absPathJson.error.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: write_file absolute path\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // absolute path rejected for read_file
    const absReadPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: '/tmp/abs.txt' },
        },
    };
    const absReadResult = runExecutor(absReadPayload);
    const absReadJson = parseOutput(absReadResult.stdout);
    if (!absReadJson || absReadJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: read_file absolute path\nexpected: ok false\n\n', process.stderr);
    }
    if (!absReadJson || !absReadJson.error || absReadJson.error.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: read_file absolute path\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // case-insensitive blocklist: .GIT/config should be rejected (prevents bypass on case-insensitive filesystems)
    const gitDirPath = path.join(testDataDir, '.GIT');
    const gitConfigPath = path.join(gitDirPath, 'config');
    if (!fs.existsSync(gitDirPath)) {
        fs.mkdirSync(gitDirPath, { recursive: true });
    }
    fs.writeFileSync(gitConfigPath, '[core]\nrepositoryformatversion = 0\n', 'utf8');
    const caseInsensitivePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: '.GIT/config' },
        },
    };
    const caseInsensitiveResult = runExecutor(caseInsensitivePayload);
    const caseInsensitiveJson = parseOutput(caseInsensitiveResult.stdout);
    if (!caseInsensitiveJson || caseInsensitiveJson.ok !== false) {
        failures += 1;
        logLine(
            'FAIL\ncase: case-insensitive blocklist .GIT/config\nexpected: ok false\n\n',
            process.stderr
        );
    }
    if (
        !caseInsensitiveJson ||
        !caseInsensitiveJson.error ||
        caseInsensitiveJson.error.code !== 'DENIED_PATH_ALLOWLIST'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: case-insensitive blocklist .GIT/config\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // recall on empty/missing memory.json returns empty list
    const recallEmptyPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'recall',
            args: { query: 'anything' },
        },
    };
    const recallEmptyResult = runExecutor(recallEmptyPayload);
    const recallEmptyJson = parseOutput(recallEmptyResult.stdout);
    if (
        !recallEmptyJson ||
        recallEmptyJson.ok !== true ||
        !recallEmptyJson.result ||
        !Array.isArray(recallEmptyJson.result.entries) ||
        recallEmptyJson.result.entries.length !== 0
    ) {
        failures += 1;
        logLine('FAIL\ncase: recall empty\nexpected: empty entries\n\n', process.stderr);
    }

    // remember then recall returns the remembered text
    const rememberPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'remember',
            args: { text: 'remember this line' },
        },
    };
    const rememberResult = runExecutor(rememberPayload);
    const rememberJson = parseOutput(rememberResult.stdout);
    if (!rememberJson || rememberJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: remember\nexpected: ok true\n\n', process.stderr);
    }
    if (rememberJson) {
        checkDebug(rememberJson._debug, {
            memory_read: true,
            memory_write: true,
            path: 'tool_json',
        });
    }

    const recallPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'recall',
            args: { query: 'remember' },
        },
    };
    const recallResult = runExecutor(recallPayload);
    const recallJson = parseOutput(recallResult.stdout);
    const recallEntries = recallJson && recallJson.result ? recallJson.result.entries : null;
    const recallText = recallEntries && recallEntries[0] ? recallEntries[0].text : null;
    if (!recallJson || recallJson.ok !== true || recallText !== 'remember this line') {
        failures += 1;
        logLine('FAIL\ncase: recall\nexpected: remembered text\n\n', process.stderr);
    }
    if (recallJson) {
        checkDebug(recallJson._debug, {
            memory_read: true,
            memory_write: false,
            path: 'tool_json',
        });
    }

    // recall ranks by score before recency
    const recallRankPayloads = [
        {
            mode: 'tool_call',
            tool_call: { tool_name: 'remember', args: { text: 'milk bread' } },
        },
        {
            mode: 'tool_call',
            tool_call: { tool_name: 'remember', args: { text: 'milk milk bread' } },
        },
        {
            mode: 'tool_call',
            tool_call: { tool_name: 'remember', args: { text: 'bread only' } },
        },
    ];
    for (const payload of recallRankPayloads) {
        const result = runExecutor(payload);
        const json = parseOutput(result.stdout);
        if (!json || json.ok !== true) {
            failures += 1;
            logLine('FAIL\ncase: recall ranking remember\nexpected: ok true\n\n', process.stderr);
        }
    }
    const recallRankPayload = {
        mode: 'tool_call',
        tool_call: { tool_name: 'recall', args: { query: 'milk bread' } },
    };
    const recallRankResult = runExecutor(recallRankPayload);
    const recallRankJson = parseOutput(recallRankResult.stdout);
    const recallRankEntries =
        recallRankJson && recallRankJson.result ? recallRankJson.result.entries : null;
    const recallRankText =
        recallRankEntries && recallRankEntries[0] ? recallRankEntries[0].text : null;
    if (!recallRankJson || recallRankJson.ok !== true || recallRankText !== 'milk milk bread') {
        failures += 1;
        logLine('FAIL\ncase: recall ranking\nexpected: highest score first\n\n', process.stderr);
    }

    const memoryLimitArgs = ['--memory-path', memoryLimitFile, '--memory-limit', '1'];
    const limitedRememberPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'remember',
            args: { text: 'first line' },
        },
    };
    const limitedRememberResult = runExecutorWithArgs(memoryLimitArgs, limitedRememberPayload);
    const limitedRememberJson = parseOutput(limitedRememberResult.stdout);
    if (!limitedRememberJson || limitedRememberJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: memory limit remember 1\nexpected: ok true\n\n', process.stderr);
    }

    const limitedRememberPayloadTwo = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'remember',
            args: { text: 'second line' },
        },
    };
    const limitedRememberResultTwo = runExecutorWithArgs(
        memoryLimitArgs,
        limitedRememberPayloadTwo
    );
    const limitedRememberJsonTwo = parseOutput(limitedRememberResultTwo.stdout);
    if (!limitedRememberJsonTwo || limitedRememberJsonTwo.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: memory limit remember 2\nexpected: ok true\n\n', process.stderr);
    }

    const limitedRecallPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'recall',
            args: { query: 'line' },
        },
    };
    const limitedRecallResult = runExecutorWithArgs(memoryLimitArgs, limitedRecallPayload);
    const limitedRecallJson = parseOutput(limitedRecallResult.stdout);
    const limitedEntries =
        limitedRecallJson && limitedRecallJson.result ? limitedRecallJson.result.entries : null;
    const limitedText = limitedEntries && limitedEntries[0] ? limitedEntries[0].text : null;
    if (
        !limitedRecallJson ||
        limitedRecallJson.ok !== true ||
        !Array.isArray(limitedEntries) ||
        limitedEntries.length !== 1 ||
        limitedText !== 'second line'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: memory limit recall\nexpected: latest single entry\n\n',
            process.stderr
        );
    }

    const taskAddPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'task_add',
            args: { text: 'buy milk', priority: 'high', due: '2026-01-02' },
        },
    };
    const taskAddResult = runExecutor(taskAddPayload);
    const taskAddJson = parseOutput(taskAddResult.stdout);
    if (
        !taskAddJson ||
        taskAddJson.ok !== true ||
        !taskAddJson.result ||
        !taskAddJson.result.task
    ) {
        failures += 1;
        logLine('FAIL\ncase: task_add\nexpected: ok true\n\n', process.stderr);
    }

    const taskListPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'task_list',
            args: { status: 'open' },
        },
    };
    const taskListResult = runExecutor(taskListPayload);
    const taskListJson = parseOutput(taskListResult.stdout);
    const taskListEntries =
        taskListJson && taskListJson.result ? taskListJson.result.entries : null;
    if (!taskListJson || taskListJson.ok !== true || !Array.isArray(taskListEntries)) {
        failures += 1;
        logLine('FAIL\ncase: task_list\nexpected: entries array\n\n', process.stderr);
    } else if (taskListEntries.length !== 1 || taskListEntries[0].text !== 'buy milk') {
        failures += 1;
        logLine('FAIL\ncase: task_list\nexpected: task entry\n\n', process.stderr);
    }

    const taskDonePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'task_done',
            args: { id: 1 },
        },
    };
    const taskDoneResult = runExecutor(taskDonePayload);
    const taskDoneJson = parseOutput(taskDoneResult.stdout);
    if (
        !taskDoneJson ||
        taskDoneJson.ok !== true ||
        !taskDoneJson.result ||
        !taskDoneJson.result.task
    ) {
        failures += 1;
        logLine('FAIL\ncase: task_done\nexpected: ok true\n\n', process.stderr);
    }

    const memoryAddPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'memory_add',
            args: { text: 'met with Sam about roadmap' },
        },
    };
    const memoryAddResult = runExecutor(memoryAddPayload);
    const memoryAddJson = parseOutput(memoryAddResult.stdout);
    if (!memoryAddJson || memoryAddJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: memory_add\nexpected: ok true\n\n', process.stderr);
    }

    const memorySearchPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'memory_search',
            args: { query: 'roadmap', limit: 5, offset: 0 },
        },
    };
    const memorySearchResult = runExecutor(memorySearchPayload);
    const memorySearchJson = parseOutput(memorySearchResult.stdout);
    const memorySearchEntries =
        memorySearchJson && memorySearchJson.result ? memorySearchJson.result.entries : null;
    if (!memorySearchJson || memorySearchJson.ok !== true || !Array.isArray(memorySearchEntries)) {
        failures += 1;
        logLine('FAIL\ncase: memory_search\nexpected: entries array\n\n', process.stderr);
    } else if (
        memorySearchEntries.length === 0 ||
        !memorySearchEntries[0].text.includes('roadmap')
    ) {
        failures += 1;
        logLine('FAIL\ncase: memory_search\nexpected: matching entry\n\n', process.stderr);
    }

    const allowedFile = 'allowed.txt';
    const blockedFile = 'blocked.txt';
    fs.writeFileSync(path.join(testDataDir, allowedFile), 'allowed', 'utf8');
    fs.writeFileSync(path.join(testDataDir, blockedFile), 'blocked', 'utf8');
    // Fixed typo: removed spaces in allow_paths
    fs.writeFileSync(
        permissionsPath,
        JSON.stringify({
            allow_paths: [`./${allowedFile}`],
            allow_commands: ['du'],
            require_confirmation_for: ['write_file'],
        }),
        'utf8'
    );

    const readAllowedPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: allowedFile },
        },
    };
    const readAllowedResult = runExecutor(readAllowedPayload);
    const readAllowedJson = parseOutput(readAllowedResult.stdout);
    if (!readAllowedJson || readAllowedJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: permissions read allowed\nexpected: ok true\n\n', process.stderr);
    }

    const readBlockedPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: blockedFile },
        },
    };
    const readBlockedResult = runExecutor(readBlockedPayload);
    const readBlockedJson = parseOutput(readBlockedResult.stdout);
    if (!readBlockedJson || readBlockedJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: permissions read blocked\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !readBlockedJson ||
        !readBlockedJson.error ||
        readBlockedJson.error.code !== 'DENIED_PATH_ALLOWLIST'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: permissions read blocked\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // Test case-insensitive blocklist: .GIT should be blocked like .git
    const gitDir = path.join(testDataDir, '.GIT');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'config'), 'test config', 'utf8');
    const readGitConfigPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'read_file',
            args: { path: '.GIT/config' },
        },
    };
    const readGitConfigResult = runExecutor(readGitConfigPayload);
    const readGitConfigJson = parseOutput(readGitConfigResult.stdout);
    if (!readGitConfigJson || readGitConfigJson.ok !== false) {
        failures += 1;
        logLine(
            'FAIL\ncase: case-insensitive blocklist (.GIT/config)\nexpected: ok false\n\n',
            process.stderr
        );
    }
    if (
        !readGitConfigJson ||
        !readGitConfigJson.error ||
        readGitConfigJson.error.code !== 'DENIED_PATH_ALLOWLIST'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: case-insensitive blocklist (.GIT/config)\nexpected: VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    const writeBlockedPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'write_file',
            args: { path: allowedFile, content: 'update' },
        },
    };
    const writeBlockedResult = runExecutor(writeBlockedPayload);
    const writeBlockedJson = parseOutput(writeBlockedResult.stdout);
    if (!writeBlockedJson || writeBlockedJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: permissions write confirm\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !writeBlockedJson ||
        !writeBlockedJson.error ||
        writeBlockedJson.error.code !== 'CONFIRMATION_REQUIRED'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: permissions write confirm\nexpected: CONFIRMATION_REQUIRED\ngot: ' +
                JSON.stringify(writeBlockedJson) +
                '\n\n',
            process.stderr
        );
    }

    const writeAllowedPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'write_file',
            args: { path: allowedFile, content: 'update', confirm: true },
        },
    };
    const writeAllowedResult = runExecutor(writeAllowedPayload);
    const writeAllowedJson = parseOutput(writeAllowedResult.stdout);
    if (!writeAllowedJson || writeAllowedJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: permissions write allowed\nexpected: ok true\n\n', process.stderr);
    }

    const duBlockedPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: 'du -d 0' },
        },
    };
    const duBlockedResult = runExecutor(duBlockedPayload);
    const duBlockedJson = parseOutput(duBlockedResult.stdout);
    if (!duBlockedJson || duBlockedJson.ok !== false) {
        failures += 1;
        logLine(
            'FAIL\ncase: permissions du no path\nexpected: ok false\ngot: ' +
                JSON.stringify(duBlockedJson) +
                '\nraw: ' +
                duBlockedResult.stdout +
                '\n\n',
            process.stderr
        );
    }
    if (!duBlockedJson || !duBlockedJson.error || duBlockedJson.error.code !== 'MISSING_ARGUMENT') {
        failures += 1;
        logLine(
            'FAIL\ncase: permissions du no path\nexpected: MISSING_ARGUMENT\ngot: ' +
                JSON.stringify(duBlockedJson) +
                '\n\n',
            process.stderr
        );
    }
    if (
        !duBlockedJson ||
        !duBlockedJson.error ||
        !duBlockedJson.error.message ||
        !duBlockedJson.error.message.includes('du requires a path argument')
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: permissions du no path\nexpected: path argument error\n\n',
            process.stderr
        );
    }

    const reminderAddPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'reminder_add',
            args: { text: 'stand up', in_seconds: 5 },
        },
    };
    const reminderAddResult = runExecutor(reminderAddPayload);
    const reminderAddJson = parseOutput(reminderAddResult.stdout);
    if (!reminderAddJson || reminderAddJson.ok !== true || !reminderAddJson.result) {
        failures += 1;
        logLine('FAIL\ncase: reminder_add\nexpected: ok true\n\n', process.stderr);
    }

    // Restore permissions for remaining tests
    fs.writeFileSync(
        permissionsPath,
        JSON.stringify({
            version: 1,
            allow_paths: ['.'],
            allow_commands: ['cat', 'ls', 'pwd', 'du'],
            require_confirmation_for: [],
            deny_tools: [],
        }),
        'utf8'
    );

    // list_files lists files in baseDir
    // Note: This test may run after other tests that create files (like allowed.txt),
    // so we check that list_files returns an array and contains at least one file
    const listPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'list_files',
            args: {},
        },
    };
    const listResult = runExecutor(listPayload);
    const listJson = parseOutput(listResult.stdout);
    const listEntries = listJson && listJson.result ? listJson.result.entries : null;
    if (!listJson || listJson.ok !== true || !Array.isArray(listEntries)) {
        failures += 1;
        logLine(
            `FAIL\ncase: list_files\nexpected: entries array, got: ${JSON.stringify(listJson)} \n\n`,
            process.stderr
        );
    } else if (listEntries.length === 0) {
        failures += 1;
        logLine('FAIL\ncase: list_files\nexpected: at least one entry in list\n\n', process.stderr);
    } else {
        // Verify entries are objects with name and type
        const validEntries = listEntries.every(
            (entry: any) =>
                typeof entry === 'object' &&
                typeof entry.name === 'string' &&
                (entry.type === 'file' || entry.type === 'directory')
        );
        if (!validEntries) {
            failures += 1;
            const invalid = listEntries.find(
                (entry: any) =>
                    typeof entry !== 'object' ||
                    typeof entry.name !== 'string' ||
                    (entry.type !== 'file' && entry.type !== 'directory')
            );
            logLine(
                `FAIL\ncase: list_files\nexpected: objects with name and type\nfound invalid: ${JSON.stringify(invalid)}\n\n`,
                process.stderr
            );
        }
    }

    // run_cmd rejects whitespace-only command
    const blankCmdPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'run_cmd',
            args: { command: '   ' },
        },
    };
    const blankCmdResult = runExecutor(blankCmdPayload);
    const blankCmdJson = parseOutput(blankCmdResult.stdout);
    if (!blankCmdJson || blankCmdJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: run_cmd blank\nexpected: ok false\n\n', process.stderr);
    }
    if (!blankCmdJson || !blankCmdJson.error || blankCmdJson.error.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: run_cmd blank\nexpected: VALIDATION_ERROR\n\n', process.stderr);
    }

    // recall memory failure surfaces path
    const memory_readScript = [
        "const path = require('path');",
        `const memoryPath = path.join(process.cwd(), '${memoryErrorFile}'); `,
        "const modulePath = path.join(process.cwd(), 'storage', 'memory_store.ts');",
        'require.cache[modulePath] = {',
        '  id: modulePath,',
        '  filename: modulePath,',
        '  loaded: true,',
        '  exports: {',
        "    readMemory: () => { throw new Error('read failed at ' + memoryPath); },",
        "    writeMemory: () => { throw new Error('write failed at ' + memoryPath); },",
        '  },',
        '};',
        "require(path.join(process.cwd(), 'app', 'executor.ts')).runCLI();",
    ].join(' ');
    const memory_readPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'recall',
            args: { query: 'x' },
        },
    };
    const memory_readResult = runExecutorScript(
        memory_readScript,
        ['--memory-path', memoryErrorFile],
        memory_readPayload
    );
    const memory_readJson = parseOutput(memory_readResult.stdout);
    if (!memory_readJson || memory_readJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: memory read error\nexpected: ok false\n\n', process.stderr);
    }
    if (!memory_readJson || !memory_readJson.error || memory_readJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: memory read error\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !memory_readJson ||
        !memory_readJson.error ||
        !memory_readJson.error.message ||
        (!memory_readJson.error.message.includes(memoryErrorPath) &&
            !memory_readJson.error.message.includes(memoryErrorFile))
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: memory read error\nexpected: path in error message\n\n',
            process.stderr
        );
    }
    if (memory_readResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: memory read error\nexpected: non-zero exit\n\n', process.stderr);
    }

    // remember memory failure surfaces path
    const memory_writeScript = [
        "const path = require('path');",
        `const memoryPath = path.join(process.cwd(), '${memoryErrorFile}'); `,
        "const modulePath = path.join(process.cwd(), 'storage', 'memory_store.ts');",
        'require.cache[modulePath] = {',
        '  id: modulePath,',
        '  filename: modulePath,',
        '  loaded: true,',
        '  exports: {',
        '    readMemory: () => ({ version: 1, entries: [] }),',
        "    writeMemory: () => { throw new Error('write failed at ' + memoryPath); },",
        '  },',
        '};',
        "require(path.join(process.cwd(), 'app', 'executor.ts')).runCLI();",
    ].join(' ');
    const memory_writePayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'remember',
            args: { text: 'x' },
        },
    };
    const memory_writeResult = runExecutorScript(
        memory_writeScript,
        ['--memory-path', memoryErrorFile],
        memory_writePayload
    );
    const memory_writeJson = parseOutput(memory_writeResult.stdout);
    if (!memory_writeJson || memory_writeJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: memory write error\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !memory_writeJson ||
        !memory_writeJson.error ||
        memory_writeJson.error.code !== 'EXEC_ERROR'
    ) {
        failures += 1;
        logLine('FAIL\ncase: memory write error\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (
        !memory_writeJson ||
        !memory_writeJson.error ||
        !memory_writeJson.error.message ||
        (!memory_writeJson.error.message.includes(memoryErrorPath) &&
            !memory_writeJson.error.message.includes(memoryErrorFile))
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: memory write error\nexpected: path in error message\n\n',
            process.stderr
        );
    }
    if (memory_writeResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: memory write error\nexpected: non-zero exit\n\n', process.stderr);
    }

    // missing required args
    const missingArgsPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'write_file',
            args: { path: testFile },
        },
    };
    const missingArgsResult = runExecutor(missingArgsPayload);
    const missingArgsJson = parseOutput(missingArgsResult.stdout);
    if (!missingArgsJson || missingArgsJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: missing args\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !missingArgsJson ||
        !missingArgsJson.error ||
        missingArgsJson.error.code !== 'MISSING_ARGUMENT'
    ) {
        failures += 1;
        logLine('FAIL\ncase: missing args\nexpected: VALIDATION_ERROR\n\n', process.stderr);
    }

    const validationCases = [
        {
            name: 'tool_call not object',
            payload: { mode: 'tool_call', tool_call: 'nope' },
            code: 'VALIDATION_ERROR',
        },
        {
            name: 'tool_name not string',
            payload: { mode: 'tool_call', tool_call: { tool_name: 42, args: {} } },
            code: 'VALIDATION_ERROR',
        },
        {
            name: 'args not object',
            payload: { mode: 'tool_call', tool_call: { tool_name: 'read_file', args: 'nope' } },
            code: 'VALIDATION_ERROR',
        },
        {
            name: 'arg type mismatch',
            payload: {
                mode: 'tool_call',
                tool_call: { tool_name: 'read_file', args: { path: 123 } },
            },
            code: 'INVALID_ARGUMENT',
        },
    ];

    for (const testCase of validationCases) {
        const result = runExecutor(testCase.payload);
        const json = parseOutput(result.stdout);
        if (!json || json.ok !== false) {
            failures += 1;
            logLine(`FAIL\ncase: ${testCase.name} \nexpected: ok false\n\n`, process.stderr);
            continue;
        }
        if (!json.error || json.error.code !== testCase.code) {
            failures += 1;
            logLine(
                `FAIL\ncase: ${testCase.name} \nexpected: ${testCase.code} got ${json.error?.code}\n\n`,
                process.stderr
            );
        }
    }

    // integration: router --tool-json -> executor for memory
    const routerRemember = runRouter(['--tool-json', 'remember: integration line']);
    const routerRememberExec = runExecutorRaw(routerRemember.stdout);
    const routerRememberJson = parseOutput(routerRememberExec.stdout);
    if (!routerRememberJson || routerRememberJson.ok !== true) {
        failures += 1;
        logLine('FAIL\ncase: integration remember\nexpected: ok true\n\n', process.stderr);
    }

    const routerRecall = runRouter(['--tool-json', 'recall: integration']);
    const routerRecallExec = runExecutorRaw(routerRecall.stdout);
    const routerRecallJson = parseOutput(routerRecallExec.stdout);
    const routerRecallEntries =
        routerRecallJson && routerRecallJson.result ? routerRecallJson.result.entries : null;
    const routerRecallText =
        routerRecallEntries && routerRecallEntries[0] ? routerRecallEntries[0].text : null;
    if (
        !routerRecallJson ||
        routerRecallJson.ok !== true ||
        routerRecallText !== 'integration line'
    ) {
        failures += 1;
        logLine('FAIL\ncase: integration recall\nexpected: remembered text\n\n', process.stderr);
    }

    // malformed JSON input returns ok false
    const malformedResult = runExecutorRaw('{not-json');
    const malformedJson = parseOutput(malformedResult.stdout);
    if (!malformedJson || malformedJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: malformed json\nexpected: ok false\n\n', process.stderr);
    }
    if (!malformedJson || !malformedJson.error || malformedJson.error.code !== 'PARSE_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: malformed json\nexpected: PARSE_ERROR\n\n', process.stderr);
    }
    if (malformedResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: malformed json\nexpected: non-zero exit\n\n', process.stderr);
    }

    // stdin error returns EXEC_ERROR
    const stdinErrorScriptExt = isDist ? 'executor.js' : 'executor.ts';
    const stdinErrorScript = [
        "const { Readable } = require('stream');",
        "const path = require('path');",
        'const input = new Readable({ read() {} });',
        "Object.defineProperty(process, 'stdin', { value: input });",
        "setImmediate(() => input.emit('error', new Error('boom')));",
        `require(path.join(process.cwd(), 'app', '${stdinErrorScriptExt}')).runCLI();`,
    ].join(' ');
    const stdinExecArgs = isDist
        ? ['-e', stdinErrorScript]
        : ['-r', require.resolve('ts-node/register'), '-e', stdinErrorScript];
    const stdinErrorResult = spawnSync(process.execPath, stdinExecArgs, {
        cwd: spikeDir,
        encoding: 'utf8',
    });
    const stdinErrorJson = parseOutput((stdinErrorResult.stdout || '').trim());
    if (!stdinErrorJson || stdinErrorJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: stdin error\nexpected: ok false\n\n', process.stderr);
    }
    if (!stdinErrorJson || !stdinErrorJson.error || stdinErrorJson.error.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine('FAIL\ncase: stdin error\nexpected: EXEC_ERROR\n\n', process.stderr);
    }
    if (stdinErrorResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: stdin error\nexpected: non-zero exit\n\n', process.stderr);
    }

    // unknown tool rejected
    const unknownToolPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'nope',
            args: {},
        },
    };
    const unknownToolResult = runExecutor(unknownToolPayload);
    const unknownToolJson = parseOutput(unknownToolResult.stdout);
    if (!unknownToolJson || unknownToolJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: unknown tool\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !unknownToolJson ||
        !unknownToolJson.error ||
        unknownToolJson.error.code !== 'UNKNOWN_TOOL'
    ) {
        failures += 1;
        logLine('FAIL\ncase: unknown tool\nexpected: VALIDATION_ERROR\n\n', process.stderr);
    }

    // invalid memory path override rejected
    const memoryPathPayload = {
        mode: 'tool_call',
        tool_call: {
            tool_name: 'recall',
            args: { query: 'x' },
        },
    };
    const memoryPathResult = runExecutorWithArgs(
        ['--memory-path', '../bad.json'],
        memoryPathPayload
    );
    const memoryPathJson = parseOutput(memoryPathResult.stdout);
    if (!memoryPathJson || memoryPathJson.ok !== false) {
        failures += 1;
        logLine('FAIL\ncase: memory path\nexpected: ok false\n\n', process.stderr);
    }
    if (
        !memoryPathJson ||
        !memoryPathJson.error ||
        memoryPathJson.error.code !== 'VALIDATION_ERROR'
    ) {
        failures += 1;
        logLine('FAIL\ncase: memory path\nexpected: VALIDATION_ERROR\n\n', process.stderr);
    }
    if (memoryPathResult.status === 0) {
        failures += 1;
        logLine('FAIL\ncase: memory path\nexpected: non-zero exit\n\n', process.stderr);
    }

    // JSONL recovery test
    // Use a unique temp directory for this test to avoid parallel test collisions
    const recoveryTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-jsonl-recovery-'));
    const recoveryConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-recovery-config-'));
    const corruptTasksPath = path.join(recoveryTestDir, 'tasks.jsonl');
    const corruptQuarantinePath = path.join(recoveryTestDir, 'tasks.jsonl.corrupt');

    try {
        // Ensure directory exists
        fs.mkdirSync(recoveryTestDir, { recursive: true });

        // Clean up any existing quarantine file
        if (fs.existsSync(corruptQuarantinePath)) fs.unlinkSync(corruptQuarantinePath);

        // Write mixed content: valid line, corrupt line, valid line
        // Note: Tasks require created_at field (per isTask validator)
        const now = new Date().toISOString();
        fs.writeFileSync(
            corruptTasksPath,
            `{"id":1,"text":"valid 1","done":false,"created_at":"${now}"}\nTHIS IS NOT JSON\n{"id":2,"text":"valid 2","done":false,"created_at":"${now}"}\n`,
            'utf8'
        );

        // Create a custom config for this test that points to the recovery test directory
        const recoveryConfigFile = path.join(recoveryConfigDir, 'config.json');
        fs.mkdirSync(recoveryConfigDir, { recursive: true });
        fs.writeFileSync(
            recoveryConfigFile,
            JSON.stringify(
                {
                    version: 1,
                    fileBaseDir: recoveryTestDir,
                },
                null,
                2
            ),
            'utf8'
        );

        const recoveryEnv: NodeJS.ProcessEnv = {
            ...testEnv,
            ASSISTANT_CONFIG_DIR: recoveryConfigDir,
            ASSISTANT_DATA_DIR: recoveryTestDir,
        };
        delete recoveryEnv.ASSISTANT_PERMISSIONS_PATH;

        const recoveryPayload = {
            mode: 'tool_call',
            tool_call: {
                tool_name: 'task_list',
                args: { status: 'open' },
            },
        };

        const recoverySpawnResult = spawnSync(process.execPath, baseArgs, {
            input: JSON.stringify(recoveryPayload),
            cwd: spikeDir,
            encoding: 'utf8',
            env: recoveryEnv,
        });
        const recoveryResult = {
            status: recoverySpawnResult.status,
            stdout: (recoverySpawnResult.stdout || '').trim(),
        };
        const recoveryJson = parseOutput(recoveryResult.stdout);

        if (!recoveryJson || recoveryJson.ok !== true) {
            failures += 1;
            logLine('FAIL\ncase: jsonl recovery\nexpected: ok true\n\n', process.stderr);
        } else {
            const entries = recoveryJson.result.entries || [];
            if (entries.length !== 2) {
                failures += 1;
                logLine(
                    `FAIL\ncase: jsonl recovery\nexpected: 2 valid entries, got ${entries.length} \n\n`,
                    process.stderr
                );
            }
        }

        // Verify quarantine file
        if (!fs.existsSync(corruptQuarantinePath)) {
            failures += 1;
            logLine(
                'FAIL\ncase: jsonl recovery\nexpected: quarantine file created\n\n',
                process.stderr
            );
        } else {
            const corruptContent = fs.readFileSync(corruptQuarantinePath, 'utf8');
            if (corruptContent.trim() !== 'THIS IS NOT JSON') {
                failures += 1;
                logLine(
                    `FAIL\ncase: jsonl recovery\nexpected: "THIS IS NOT JSON", got "${corruptContent.trim()}"\n\n`,
                    process.stderr
                );
            }
        }
    } finally {
        // Cleanup: remove entire recovery test directory and config directory
        try {
            if (fs.existsSync(corruptQuarantinePath)) fs.unlinkSync(corruptQuarantinePath);
            if (fs.existsSync(corruptTasksPath)) fs.unlinkSync(corruptTasksPath);
            if (fs.existsSync(recoveryTestDir)) {
                try {
                    // Try modern API first (Node 14.14+)
                    if (typeof fs.rmSync === 'function') {
                        fs.rmSync(recoveryTestDir, { recursive: true, force: true });
                    } else {
                        // Fallback: remove files then directory
                        const files = fs.readdirSync(recoveryTestDir);
                        for (const file of files) {
                            fs.unlinkSync(path.join(recoveryTestDir, file));
                        }
                        fs.rmdirSync(recoveryTestDir);
                    }
                } catch {
                    // Ignore cleanup errors
                }
            }
            if (fs.existsSync(recoveryConfigDir)) {
                try {
                    // Try modern API first (Node 14.14+)
                    if (typeof fs.rmSync === 'function') {
                        fs.rmSync(recoveryConfigDir, { recursive: true, force: true });
                    } else {
                        // Fallback: remove files then directory
                        const files = fs.readdirSync(recoveryConfigDir);
                        for (const file of files) {
                            fs.unlinkSync(path.join(recoveryConfigDir, file));
                        }
                        fs.rmdirSync(recoveryConfigDir);
                    }
                } catch {
                    // Ignore cleanup errors
                }
            }
        } catch {
            // Ignore cleanup errors
        }
    }

    // Test read_file offset > size
    const offsetPayload = {
        mode: 'tool_call',
        tool_call: { tool_name: 'read_file', args: { path: testFile, offset: 10000 } },
    };
    const offsetResult = runExecutor(offsetPayload);
    const offsetJson = parseOutput(offsetResult.stdout);
    if (
        !offsetJson ||
        offsetJson.ok !== true ||
        offsetJson.result.content !== '' ||
        offsetJson.result.eof !== true
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: read_file huge offset\nexpected: empty content eof true\ngot: ' +
                JSON.stringify(offsetJson) +
                '\n\n',
            process.stderr
        );
    }
    // Test node_modules block
    const nodeModulesPayload = {
        mode: 'tool_call',
        tool_call: { tool_name: 'run_cmd', args: { command: 'ls node_modules' } },
    };
    const nmResult = runExecutor(nodeModulesPayload);
    const nmJson = parseOutput(nmResult.stdout);
    if (!nmJson || !nmJson.error || nmJson.error.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: node_modules block\nexpected: DENIED_PATH_ALLOWLIST\ngot: ' +
                JSON.stringify(nmJson) +
                '\n\n',
            process.stderr
        );
    }
} finally {
    // Cleanup temp dir
    try {
        fs.rmSync(testRoot, { recursive: true, force: true });
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
