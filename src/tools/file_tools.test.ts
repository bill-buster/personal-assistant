#!/usr/bin/env node

/**
 * Tests for file_tools.ts
 * Tests: delete_file handler
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { handleDeleteFile } from './file_tools';
import { createMockContext } from '../core/test_utils';
import { ExecutorContext } from '../core/types';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'file-tools-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

try {
    // ============================================
    // DELETE_FILE - SUCCESS CASES
    // ============================================

    // T1: Delete file successfully
    const testFile1 = path.join(testRoot, 'test1.txt');
    fs.writeFileSync(testFile1, 'test content');
    const context1 = {
        ...createMockContext({
            baseDir: testRoot,
            paths: {
                resolve: (p: string) => path.resolve(testRoot, p),
                assertAllowed: () => {},
                resolveAllowed: (p: string) => path.resolve(testRoot, p),
            },
        }),
        requiresConfirmation: () => false,
    } as ExecutorContext;

    const result1 = handleDeleteFile({ path: 'test1.txt', confirm: true }, context1);
    if (!result1.ok || !result1.result?.deleted) {
        failures += 1;
        logLine(
            'FAIL\ncase: delete file successfully\nexpected: ok true, result.deleted\n\n',
            process.stderr
        );
    } else if (fs.existsSync(testFile1)) {
        failures += 1;
        logLine(
            'FAIL\ncase: delete file successfully\nexpected: file should not exist\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: delete file successfully');
    }

    // ============================================
    // DELETE_FILE - ERROR CASES
    // ============================================

    // T2: Require confirmation (no confirm flag)
    const context2 = {
        ...createMockContext({
            baseDir: testRoot,
            permissions: {
                allow_paths: [],
                allow_commands: [],
                require_confirmation_for: ['delete_file'],
                deny_tools: [],
            },
            permissionsPath: path.join(testRoot, 'permissions.json'),
        }),
        requiresConfirmation: (toolName: string) => toolName === 'delete_file',
    } as ExecutorContext;

    const result2 = handleDeleteFile({ path: 'test2.txt' }, context2);
    if (result2.ok || result2.error?.code !== 'CONFIRMATION_REQUIRED') {
        failures += 1;
        logLine(
            'FAIL\ncase: require confirmation\nexpected: ok false, error.code CONFIRMATION_REQUIRED\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: require confirmation');
    }

    // T3: File not found
    const context3 = {
        ...createMockContext({
            baseDir: testRoot,
            paths: {
                resolve: (p: string) => path.resolve(testRoot, p),
                assertAllowed: () => {},
                resolveAllowed: (p: string) => path.resolve(testRoot, p),
            },
        }),
        requiresConfirmation: () => false,
    } as ExecutorContext;

    const result3 = handleDeleteFile({ path: 'nonexistent.txt', confirm: true }, context3);
    if (result3.ok || result3.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: file not found\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: file not found');
    }

    // T4: Path is directory (not file)
    const testDir = path.join(testRoot, 'testdir');
    fs.mkdirSync(testDir, { recursive: true });
    const context4 = {
        ...createMockContext({
            baseDir: testRoot,
            paths: {
                resolve: (p: string) => path.resolve(testRoot, p),
                assertAllowed: () => {},
                resolveAllowed: (p: string) => path.resolve(testRoot, p),
            },
        }),
        requiresConfirmation: () => false,
    } as ExecutorContext;

    const result4 = handleDeleteFile({ path: 'testdir', confirm: true }, context4);
    if (result4.ok || !result4.error?.message.includes('directory')) {
        failures += 1;
        logLine(
            'FAIL\ncase: path is directory\nexpected: ok false, error mentions directory\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: path is directory');
    }

    // T5: Path outside baseDir (security check)
    const context5 = {
        ...createMockContext({
            baseDir: testRoot,
            paths: {
                resolve: (p: string) => {
                    throw new Error('Path traversal detected');
                },
                assertAllowed: () => {
                    throw new Error('Path not allowed');
                },
                resolveAllowed: () => {
                    throw new Error('Path not allowed');
                },
            },
        }),
        requiresConfirmation: () => false,
    } as ExecutorContext;

    const result5 = handleDeleteFile({ path: '../../etc/passwd', confirm: true }, context5);
    if (result5.ok || result5.error?.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: path outside baseDir\nexpected: ok false, error.code DENIED_PATH_ALLOWLIST\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: path outside baseDir');
    }

    // ============================================
    // CLEANUP
    // ============================================

    // Cleanup test directory
    try {
        fs.rmSync(testRoot, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }

    if (failures > 0) {
        logLine(`\n${failures} test(s) failed\n`, process.stderr);
        process.exit(1);
    }

    logLine('RESULT\nstatus: OK\n');
} catch (e: any) {
    logLine(`\nUNEXPECTED ERROR: ${e.message}\n${e.stack}\n`, process.stderr);
    process.exit(1);
}

export {};
