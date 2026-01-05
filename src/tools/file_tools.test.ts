#!/usr/bin/env node

/**
 * Tests for file_tools.ts
 * Tests: delete_file handler
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { handleDeleteFile, handleMoveFile, handleCopyFile, handleFileInfo } from './file_tools';
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
    // MOVE_FILE - SUCCESS CASES
    // ============================================

    // T6: Move file successfully
    const testFile6 = path.join(testRoot, 'source.txt');
    const testDest6 = path.join(testRoot, 'dest.txt');
    fs.writeFileSync(testFile6, 'test content');
    const context6 = {
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

    const result6 = handleMoveFile(
        { source: 'source.txt', destination: 'dest.txt', confirm: true },
        context6
    );
    if (!result6.ok || !result6.result?.source || !result6.result?.destination) {
        failures += 1;
        logLine(
            'FAIL\ncase: move file successfully\nexpected: ok true, result.source and result.destination\n\n',
            process.stderr
        );
    } else if (fs.existsSync(testFile6) || !fs.existsSync(testDest6)) {
        failures += 1;
        logLine(
            'FAIL\ncase: move file successfully\nexpected: source should not exist, destination should exist\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: move file successfully');
    }

    // T7: Move file to new directory (create parent directories)
    const testFile7 = path.join(testRoot, 'file7.txt');
    const testDest7 = path.join(testRoot, 'subdir', 'file7.txt');
    fs.writeFileSync(testFile7, 'test content');
    const context7 = {
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

    const result7 = handleMoveFile(
        { source: 'file7.txt', destination: 'subdir/file7.txt', confirm: true },
        context7
    );
    if (!result7.ok || !fs.existsSync(testDest7) || fs.existsSync(testFile7)) {
        failures += 1;
        logLine(
            'FAIL\ncase: move file to new directory\nexpected: ok true, destination exists, source removed\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: move file to new directory');
    }

    // T8: Move file overwriting existing file
    const testFile8 = path.join(testRoot, 'source8.txt');
    const testDest8 = path.join(testRoot, 'dest8.txt');
    fs.writeFileSync(testFile8, 'source content');
    fs.writeFileSync(testDest8, 'old content');
    const context8 = {
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

    const result8 = handleMoveFile(
        { source: 'source8.txt', destination: 'dest8.txt', confirm: true },
        context8
    );
    if (!result8.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: move file overwriting existing\nexpected: ok true\n\n',
            process.stderr
        );
    } else {
        const destContent = fs.readFileSync(testDest8, 'utf8');
        if (destContent !== 'source content' || fs.existsSync(testFile8)) {
            failures += 1;
            logLine(
                'FAIL\ncase: move file overwriting existing\nexpected: destination has source content, source removed\n\n',
                process.stderr
            );
        } else {
            logLine('PASS: move file overwriting existing');
        }
    }

    // ============================================
    // MOVE_FILE - ERROR CASES
    // ============================================

    // T9: Require confirmation (no confirm flag)
    const context9 = {
        ...createMockContext({
            baseDir: testRoot,
            permissions: {
                allow_paths: [],
                allow_commands: [],
                require_confirmation_for: ['move_file'],
                deny_tools: [],
            },
            permissionsPath: path.join(testRoot, 'permissions.json'),
        }),
        requiresConfirmation: (toolName: string) => toolName === 'move_file',
    } as ExecutorContext;

    const result9 = handleMoveFile({ source: 'test9.txt', destination: 'dest9.txt' }, context9);
    if (result9.ok || result9.error?.code !== 'CONFIRMATION_REQUIRED') {
        failures += 1;
        logLine(
            'FAIL\ncase: require confirmation\nexpected: ok false, error.code CONFIRMATION_REQUIRED\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: require confirmation');
    }

    // T10: Source file not found
    const context10 = {
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

    const result10 = handleMoveFile(
        { source: 'nonexistent.txt', destination: 'dest10.txt', confirm: true },
        context10
    );
    if (result10.ok || result10.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: source file not found\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: source file not found');
    }

    // T11: Source is directory (not file)
    const testDir11 = path.join(testRoot, 'sourcedir');
    fs.mkdirSync(testDir11, { recursive: true });
    const context11 = {
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

    const result11 = handleMoveFile(
        { source: 'sourcedir', destination: 'destdir', confirm: true },
        context11
    );
    if (result11.ok || !result11.error?.message.includes('directory')) {
        failures += 1;
        logLine(
            'FAIL\ncase: source is directory\nexpected: ok false, error mentions directory\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: source is directory');
    }

    // T12: Destination is directory (not file)
    const testFile12 = path.join(testRoot, 'source12.txt');
    const testDir12 = path.join(testRoot, 'destdir12');
    fs.writeFileSync(testFile12, 'test content');
    fs.mkdirSync(testDir12, { recursive: true });
    const context12 = {
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

    const result12 = handleMoveFile(
        { source: 'source12.txt', destination: 'destdir12', confirm: true },
        context12
    );
    if (result12.ok || !result12.error?.message.includes('directory')) {
        failures += 1;
        logLine(
            'FAIL\ncase: destination is directory\nexpected: ok false, error mentions directory\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: destination is directory');
    }

    // T13: Source path outside baseDir (security check)
    const context13 = {
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

    const result13 = handleMoveFile(
        { source: '../../etc/passwd', destination: 'dest13.txt', confirm: true },
        context13
    );
    if (result13.ok || result13.error?.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: source path outside baseDir\nexpected: ok false, error.code DENIED_PATH_ALLOWLIST\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: source path outside baseDir');
    }

    // T14: Destination path outside baseDir (security check)
    const testFile14 = path.join(testRoot, 'source14.txt');
    fs.writeFileSync(testFile14, 'test content');
    const context14 = {
        ...createMockContext({
            baseDir: testRoot,
            paths: {
                resolve: (p: string) => {
                    if (p === 'source14.txt') {
                        return path.resolve(testRoot, p);
                    }
                    throw new Error('Path traversal detected');
                },
                assertAllowed: (p: string) => {
                    if (p === path.resolve(testRoot, 'source14.txt')) {
                        return;
                    }
                    throw new Error('Path not allowed');
                },
                resolveAllowed: (p: string) => {
                    if (p === 'source14.txt') {
                        return path.resolve(testRoot, p);
                    }
                    throw new Error('Path not allowed');
                },
            },
        }),
        requiresConfirmation: () => false,
    } as ExecutorContext;

    const result14 = handleMoveFile(
        { source: 'source14.txt', destination: '../../etc/passwd', confirm: true },
        context14
    );
    if (result14.ok || result14.error?.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: destination path outside baseDir\nexpected: ok false, error.code DENIED_PATH_ALLOWLIST\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: destination path outside baseDir');
    }

    // ============================================
    // COPY_FILE - SUCCESS CASES
    // ============================================

    // T15: Copy file successfully
    const testFile15 = path.join(testRoot, 'source15.txt');
    const testDest15 = path.join(testRoot, 'dest15.txt');
    fs.writeFileSync(testFile15, 'test content');
    const context15 = {
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

    const result15 = handleCopyFile(
        { source: 'source15.txt', destination: 'dest15.txt', confirm: true },
        context15
    );
    if (!result15.ok || !result15.result?.source || !result15.result?.destination) {
        failures += 1;
        logLine(
            'FAIL\ncase: copy file successfully\nexpected: ok true, result.source and result.destination\n\n',
            process.stderr
        );
    } else if (!fs.existsSync(testFile15) || !fs.existsSync(testDest15)) {
        failures += 1;
        logLine(
            'FAIL\ncase: copy file successfully\nexpected: both source and destination should exist\n\n',
            process.stderr
        );
    } else {
        const sourceContent = fs.readFileSync(testFile15, 'utf8');
        const destContent = fs.readFileSync(testDest15, 'utf8');
        if (sourceContent !== destContent || sourceContent !== 'test content') {
            failures += 1;
            logLine(
                'FAIL\ncase: copy file successfully\nexpected: source and destination have same content\n\n',
                process.stderr
            );
        } else {
            logLine('PASS: copy file successfully');
        }
    }

    // T16: Copy file to new directory (create parent directories)
    const testFile16 = path.join(testRoot, 'file16.txt');
    const testDest16 = path.join(testRoot, 'subdir2', 'file16.txt');
    fs.writeFileSync(testFile16, 'test content');
    const context16 = {
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

    const result16 = handleCopyFile(
        { source: 'file16.txt', destination: 'subdir2/file16.txt', confirm: true },
        context16
    );
    if (!result16.ok || !fs.existsSync(testDest16) || !fs.existsSync(testFile16)) {
        failures += 1;
        logLine(
            'FAIL\ncase: copy file to new directory\nexpected: ok true, both files exist\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: copy file to new directory');
    }

    // T17: Copy file overwriting existing file
    const testFile17 = path.join(testRoot, 'source17.txt');
    const testDest17 = path.join(testRoot, 'dest17.txt');
    fs.writeFileSync(testFile17, 'source content');
    fs.writeFileSync(testDest17, 'old content');
    const context17 = {
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

    const result17 = handleCopyFile(
        { source: 'source17.txt', destination: 'dest17.txt', confirm: true },
        context17
    );
    if (!result17.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: copy file overwriting existing\nexpected: ok true\n\n',
            process.stderr
        );
    } else {
        const sourceContent = fs.readFileSync(testFile17, 'utf8');
        const destContent = fs.readFileSync(testDest17, 'utf8');
        if (
            destContent !== 'source content' ||
            sourceContent !== 'source content' ||
            !fs.existsSync(testFile17)
        ) {
            failures += 1;
            logLine(
                'FAIL\ncase: copy file overwriting existing\nexpected: destination has source content, source still exists\n\n',
                process.stderr
            );
        } else {
            logLine('PASS: copy file overwriting existing');
        }
    }

    // ============================================
    // COPY_FILE - ERROR CASES
    // ============================================

    // T18: Require confirmation (no confirm flag)
    const context18 = {
        ...createMockContext({
            baseDir: testRoot,
            permissions: {
                allow_paths: [],
                allow_commands: [],
                require_confirmation_for: ['copy_file'],
                deny_tools: [],
            },
            permissionsPath: path.join(testRoot, 'permissions.json'),
        }),
        requiresConfirmation: (toolName: string) => toolName === 'copy_file',
    } as ExecutorContext;

    const result18 = handleCopyFile({ source: 'test18.txt', destination: 'dest18.txt' }, context18);
    if (result18.ok || result18.error?.code !== 'CONFIRMATION_REQUIRED') {
        failures += 1;
        logLine(
            'FAIL\ncase: require confirmation\nexpected: ok false, error.code CONFIRMATION_REQUIRED\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: require confirmation');
    }

    // T19: Source file not found
    const context19 = {
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

    const result19 = handleCopyFile(
        { source: 'nonexistent19.txt', destination: 'dest19.txt', confirm: true },
        context19
    );
    if (result19.ok || result19.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: source file not found\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: source file not found');
    }

    // T20: Source is directory (not file)
    const testDir20 = path.join(testRoot, 'sourcedir20');
    fs.mkdirSync(testDir20, { recursive: true });
    const context20 = {
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

    const result20 = handleCopyFile(
        { source: 'sourcedir20', destination: 'destdir20', confirm: true },
        context20
    );
    if (result20.ok || !result20.error?.message.includes('directory')) {
        failures += 1;
        logLine(
            'FAIL\ncase: source is directory\nexpected: ok false, error mentions directory\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: source is directory');
    }

    // T21: Destination is directory (not file)
    const testFile21 = path.join(testRoot, 'source21.txt');
    const testDir21 = path.join(testRoot, 'destdir21');
    fs.writeFileSync(testFile21, 'test content');
    fs.mkdirSync(testDir21, { recursive: true });
    const context21 = {
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

    const result21 = handleCopyFile(
        { source: 'source21.txt', destination: 'destdir21', confirm: true },
        context21
    );
    if (result21.ok || !result21.error?.message.includes('directory')) {
        failures += 1;
        logLine(
            'FAIL\ncase: destination is directory\nexpected: ok false, error mentions directory\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: destination is directory');
    }

    // T22: Source path outside baseDir (security check)
    const context22 = {
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

    const result22 = handleCopyFile(
        { source: '../../etc/passwd', destination: 'dest22.txt', confirm: true },
        context22
    );
    if (result22.ok || result22.error?.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: source path outside baseDir\nexpected: ok false, error.code DENIED_PATH_ALLOWLIST\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: source path outside baseDir');
    }

    // T23: Destination path outside baseDir (security check)
    const testFile23 = path.join(testRoot, 'source23.txt');
    fs.writeFileSync(testFile23, 'test content');
    const context23 = {
        ...createMockContext({
            baseDir: testRoot,
            paths: {
                resolve: (p: string) => {
                    if (p === 'source23.txt') {
                        return path.resolve(testRoot, p);
                    }
                    throw new Error('Path traversal detected');
                },
                assertAllowed: (p: string) => {
                    if (p === path.resolve(testRoot, 'source23.txt')) {
                        return;
                    }
                    throw new Error('Path not allowed');
                },
                resolveAllowed: (p: string) => {
                    if (p === 'source23.txt') {
                        return path.resolve(testRoot, p);
                    }
                    throw new Error('Path not allowed');
                },
            },
        }),
        requiresConfirmation: () => false,
    } as ExecutorContext;

    const result23 = handleCopyFile(
        { source: 'source23.txt', destination: '../../etc/passwd', confirm: true },
        context23
    );
    if (result23.ok || result23.error?.code !== 'DENIED_PATH_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: destination path outside baseDir\nexpected: ok false, error.code DENIED_PATH_ALLOWLIST\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: destination path outside baseDir');
    }

    // ============================================
    // FILE_INFO - SUCCESS CASES
    // ============================================

    // T24: Get file info for regular file
    const testFile24 = path.join(testRoot, 'test24.txt');
    fs.writeFileSync(testFile24, 'test content');
    const context24 = {
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

    const result24 = handleFileInfo({ path: 'test24.txt' }, context24);
    if (!result24.ok || !result24.result?.type || !result24.result?.size) {
        failures += 1;
        logLine(
            'FAIL\ncase: get file info for file\nexpected: ok true, result.type and result.size\n\n',
            process.stderr
        );
    } else if (result24.result.type !== 'file' || !result24.result.isFile) {
        failures += 1;
        logLine(
            'FAIL\ncase: get file info for file\nexpected: type is file, isFile is true\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: get file info for file');
    }

    // T25: Get file info for directory
    const testDir25 = path.join(testRoot, 'testdir25');
    fs.mkdirSync(testDir25, { recursive: true });
    const context25 = {
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

    const result25 = handleFileInfo({ path: 'testdir25' }, context25);
    if (!result25.ok || result25.result?.type !== 'directory' || !result25.result?.isDirectory) {
        failures += 1;
        logLine(
            'FAIL\ncase: get file info for directory\nexpected: ok true, type is directory, isDirectory is true\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: get file info for directory');
    }

    // T26: Verify file info contains all expected fields
    const testFile26 = path.join(testRoot, 'test26.txt');
    fs.writeFileSync(testFile26, 'content');
    const context26 = {
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

    const result26 = handleFileInfo({ path: 'test26.txt' }, context26);
    if (!result26.ok) {
        failures += 1;
        logLine('FAIL\ncase: verify file info fields\nexpected: ok true\n\n', process.stderr);
    } else {
        const info = result26.result;
        const hasAllFields =
            info?.path !== undefined &&
            info?.type !== undefined &&
            info?.size !== undefined &&
            info?.modified !== undefined &&
            info?.permissions !== undefined &&
            info?.isFile !== undefined &&
            info?.isDirectory !== undefined &&
            info?.isSymbolicLink !== undefined;
        if (!hasAllFields) {
            failures += 1;
            logLine(
                'FAIL\ncase: verify file info fields\nexpected: all fields present\n\n',
                process.stderr
            );
        } else {
            logLine('PASS: verify file info fields');
        }
    }

    // ============================================
    // FILE_INFO - ERROR CASES
    // ============================================

    // T27: File not found
    const context27 = {
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

    const result27 = handleFileInfo({ path: 'nonexistent27.txt' }, context27);
    if (result27.ok || result27.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: file not found\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    } else {
        logLine('PASS: file not found');
    }

    // T28: Path outside baseDir (security check)
    const context28 = {
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

    const result28 = handleFileInfo({ path: '../../etc/passwd' }, context28);
    if (result28.ok || result28.error?.code !== 'DENIED_PATH_ALLOWLIST') {
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
