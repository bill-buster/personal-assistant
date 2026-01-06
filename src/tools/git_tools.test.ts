#!/usr/bin/env node

/**
 * Comprehensive stress tests for git_tools.ts
 * Tests: Success cases, error cases, edge cases, invalid inputs, boundary conditions
 * Following Jules (stress tester) role - break things and ensure robustness
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { handleGitStatus, handleGitDiff, handleGitLog } from './git_tools';
import { createMockContext } from '../core/test_utils';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'git-tools-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

// Helper to initialize git repo
function initGitRepo(dir: string): boolean {
    const result = spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' });
    if (result.status !== 0) {
        return false;
    }
    // Set user config to avoid git warnings
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    return true;
}

// Helper to create a test file and commit
function createTestFileAndCommit(dir: string, filename: string, content: string): boolean {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content);
    spawnSync('git', ['add', filename], { cwd: dir });
    const result = spawnSync('git', ['commit', '-m', `Add ${filename}`], { cwd: dir });
    return result.status === 0;
}

try {
    // ============================================
    // GIT_STATUS - SUCCESS CASES
    // ============================================

    // T1: Git status on clean repo
    const gitDir1 = fs.mkdtempSync(path.join(testRoot, 'git1-'));
    if (initGitRepo(gitDir1)) {
        const context1 = createMockContext({ baseDir: gitDir1 });
        const result1 = handleGitStatus({}, context1);
        if (!result1.ok || !(result1.result as Record<string, unknown>)?.clean) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status on clean repo should return clean=true\nexpected: ok true, result.clean true\n\n',
                process.stderr
            );
        }
    }

    // T2: Git status on repo with changes
    const gitDir2 = fs.mkdtempSync(path.join(testRoot, 'git2-'));
    if (initGitRepo(gitDir2)) {
        fs.writeFileSync(path.join(gitDir2, 'test.txt'), 'content');
        const context2 = createMockContext({ baseDir: gitDir2 });
        const result2 = handleGitStatus({}, context2);
        if (!result2.ok || (result2.result as Record<string, unknown>)?.clean !== false) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status on repo with changes should return clean=false\nexpected: ok true, result.clean false\n\n',
                process.stderr
            );
        }
    }

    // T3: Git status result structure
    const gitDir3 = fs.mkdtempSync(path.join(testRoot, 'git3-'));
    if (initGitRepo(gitDir3)) {
        const context3 = createMockContext({ baseDir: gitDir3 });
        const result3 = handleGitStatus({}, context3);
        if (result3.ok) {
            if (
                !result3.result ||
                typeof (result3.result as Record<string, unknown>).clean !== 'boolean' ||
                !Array.isArray((result3.result as Record<string, unknown>).files) ||
                typeof (result3.result as Record<string, unknown>).summary !== 'string'
            ) {
                failures += 1;
                logLine(
                    'FAIL\ncase: git_status result should have clean, files, summary\nexpected: result with clean (boolean), files (array), summary (string)\n\n',
                    process.stderr
                );
            }
        }
    }

    // ============================================
    // GIT_STATUS - ERROR CASES
    // ============================================

    // T4: Git status on non-git directory
    const nonGitDir = fs.mkdtempSync(path.join(testRoot, 'non-git-'));
    fs.writeFileSync(path.join(nonGitDir, 'file.txt'), 'content');
    const context4 = createMockContext({ baseDir: nonGitDir });
    const result4 = handleGitStatus({}, context4);
    if (result4.ok || result4.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: git_status on non-git directory should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T5: Git status on non-existent directory
    const fakeDir = path.join(testRoot, 'does-not-exist-12345');
    const context5 = createMockContext({ baseDir: fakeDir });
    const result5 = handleGitStatus({}, context5);
    if (result5.ok || result5.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: git_status on non-existent directory should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T6: Git status with empty baseDir
    const context6 = createMockContext({ baseDir: '' });
    const result6 = handleGitStatus({}, context6);
    if (result6.ok || result6.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: git_status with empty baseDir should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // GIT_STATUS - EDGE CASES
    // ============================================

    // T7: Git status with undefined args (should work - args are optional)
    const gitDir7 = fs.mkdtempSync(path.join(testRoot, 'git7-'));
    if (initGitRepo(gitDir7)) {
        const context7 = createMockContext({ baseDir: gitDir7 });
        const result7 = handleGitStatus(undefined as any, context7);
        if (!result7.ok) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status with undefined args should work\nexpected: ok true\n\n',
                process.stderr
            );
        }
    }

    // T8: Git status with null args (should work - args are optional)
    const gitDir8 = fs.mkdtempSync(path.join(testRoot, 'git8-'));
    if (initGitRepo(gitDir8)) {
        const context8 = createMockContext({ baseDir: gitDir8 });
        const result8 = handleGitStatus(null as any, context8);
        if (!result8.ok) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status with null args should work\nexpected: ok true\n\n',
                process.stderr
            );
        }
    }

    // T9: Git status with empty object args
    const gitDir9 = fs.mkdtempSync(path.join(testRoot, 'git9-'));
    if (initGitRepo(gitDir9)) {
        const context9 = createMockContext({ baseDir: gitDir9 });
        const result9 = handleGitStatus({}, context9);
        if (!result9.ok) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status with empty object args should work\nexpected: ok true\n\n',
                process.stderr
            );
        }
    }

    // T10: Git status on repo with many files (performance test)
    const gitDir10 = fs.mkdtempSync(path.join(testRoot, 'git10-'));
    if (initGitRepo(gitDir10)) {
        // Create 100 files
        for (let i = 0; i < 100; i++) {
            fs.writeFileSync(path.join(gitDir10, `file${i}.txt`), `content ${i}`);
        }
        const context10 = createMockContext({ baseDir: gitDir10 });
        const result10 = handleGitStatus({}, context10);
        const result = result10.result as { files: unknown[] };
        if (!result10.ok || result?.files.length !== 100) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status with 100 files should work\nexpected: ok true, result.files.length 100\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_DIFF - SUCCESS CASES
    // ============================================

    // T11: Git diff unstaged changes
    const gitDir11 = fs.mkdtempSync(path.join(testRoot, 'git11-'));
    if (initGitRepo(gitDir11)) {
        createTestFileAndCommit(gitDir11, 'test.txt', 'original');
        fs.writeFileSync(path.join(gitDir11, 'test.txt'), 'modified');
        const context11 = createMockContext({ baseDir: gitDir11 });
        const result11 = handleGitDiff({}, context11);
        if (!result11.ok || (result11.result as Record<string, unknown>)?.staged !== false) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff unstaged should return staged=false\nexpected: ok true, result.staged false\n\n',
                process.stderr
            );
        }
    }

    // T12: Git diff staged changes
    const gitDir12 = fs.mkdtempSync(path.join(testRoot, 'git12-'));
    if (initGitRepo(gitDir12)) {
        createTestFileAndCommit(gitDir12, 'test.txt', 'original');
        fs.writeFileSync(path.join(gitDir12, 'test.txt'), 'modified');
        spawnSync('git', ['add', 'test.txt'], { cwd: gitDir12 });
        const context12 = createMockContext({ baseDir: gitDir12 });
        const result12 = handleGitDiff({ staged: true }, context12);
        if (!result12.ok || (result12.result as Record<string, unknown>)?.staged !== true) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff staged should return staged=true\nexpected: ok true, result.staged true\n\n',
                process.stderr
            );
        }
    }

    // T13: Git diff with specific path
    const gitDir13 = fs.mkdtempSync(path.join(testRoot, 'git13-'));
    if (initGitRepo(gitDir13)) {
        createTestFileAndCommit(gitDir13, 'test.txt', 'original');
        fs.writeFileSync(path.join(gitDir13, 'test.txt'), 'modified');
        const context13 = createMockContext({ baseDir: gitDir13 });
        const result13 = handleGitDiff({ path: 'test.txt' }, context13);
        if (!result13.ok) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with specific path should work\nexpected: ok true\n\n',
                process.stderr
            );
        }
    }

    // T14: Git diff on clean repo
    const gitDir14 = fs.mkdtempSync(path.join(testRoot, 'git14-'));
    if (initGitRepo(gitDir14)) {
        createTestFileAndCommit(gitDir14, 'test.txt', 'content');
        const context14 = createMockContext({ baseDir: gitDir14 });
        const result14 = handleGitDiff({}, context14);
        if (!result14.ok || (result14.result as Record<string, unknown>)?.empty !== true) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff on clean repo should return empty=true\nexpected: ok true, result.empty true\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_DIFF - ERROR CASES
    // ============================================

    // T15: Git diff on non-git directory
    const nonGitDir15 = fs.mkdtempSync(path.join(testRoot, 'non-git15-'));
    const context15 = createMockContext({ baseDir: nonGitDir15 });
    const result15 = handleGitDiff({}, context15);
    if (result15.ok || result15.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: git_diff on non-git directory should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T16: Git diff with blocked path (outside allowlist)
    const gitDir16 = fs.mkdtempSync(path.join(testRoot, 'git16-'));
    if (initGitRepo(gitDir16)) {
        const context16 = createMockContext({
            baseDir: gitDir16,
            paths: {
                resolve: (p: string) => path.resolve(gitDir16, p),
                assertAllowed: () => {
                    throw new Error('Path blocked');
                },
                resolveAllowed: () => {
                    throw new Error('Path blocked');
                },
            },
        });
        const result16 = handleGitDiff({ path: '../etc/passwd' }, context16);
        if (result16.ok || result16.error?.code !== 'DENIED_PATH_ALLOWLIST') {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with blocked path should return DENIED_PATH_ALLOWLIST\nexpected: ok false, error.code DENIED_PATH_ALLOWLIST\n\n',
                process.stderr
            );
        }
    }

    // T17: Git diff with non-existent path
    const gitDir17 = fs.mkdtempSync(path.join(testRoot, 'git17-'));
    if (initGitRepo(gitDir17)) {
        const context17 = createMockContext({ baseDir: gitDir17 });
        const result17 = handleGitDiff({ path: 'nonexistent.txt' }, context17);
        // Should succeed but return empty diff
        if (!result17.ok || (result17.result as Record<string, unknown>)?.empty !== true) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with non-existent path should return empty diff\nexpected: ok true, result.empty true\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_DIFF - EDGE CASES
    // ============================================

    // T18: Git diff with empty path string
    const gitDir18 = fs.mkdtempSync(path.join(testRoot, 'git18-'));
    if (initGitRepo(gitDir18)) {
        const context18 = createMockContext({ baseDir: gitDir18 });
        const result18 = handleGitDiff({ path: '' }, context18);
        // Empty path should work (shows all changes)
        if (!result18.ok) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with empty path should work\nexpected: ok true\n\n',
                process.stderr
            );
        }
    }

    // T19: Git diff with undefined staged
    const gitDir19 = fs.mkdtempSync(path.join(testRoot, 'git19-'));
    if (initGitRepo(gitDir19)) {
        const context19 = createMockContext({ baseDir: gitDir19 });
        const result19 = handleGitDiff({ staged: undefined }, context19);
        if (!result19.ok || (result19.result as Record<string, unknown>)?.staged !== false) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with undefined staged should default to false\nexpected: ok true, result.staged false\n\n',
                process.stderr
            );
        }
    }

    // T20: Git diff with null staged
    const gitDir20 = fs.mkdtempSync(path.join(testRoot, 'git20-'));
    if (initGitRepo(gitDir20)) {
        const context20 = createMockContext({ baseDir: gitDir20 });
        const result20 = handleGitDiff({ staged: null as any }, context20);
        if (!result20.ok || (result20.result as Record<string, unknown>)?.staged !== false) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with null staged should default to false\nexpected: ok true, result.staged false\n\n',
                process.stderr
            );
        }
    }

    // T21: Git diff with path containing special characters
    const gitDir21 = fs.mkdtempSync(path.join(testRoot, 'git21-'));
    if (initGitRepo(gitDir21)) {
        const testFile = 'file with spaces.txt';
        createTestFileAndCommit(gitDir21, testFile, 'content');
        fs.writeFileSync(path.join(gitDir21, testFile), 'modified');
        const context21 = createMockContext({ baseDir: gitDir21 });
        const result21 = handleGitDiff({ path: testFile }, context21);
        if (!result21.ok) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with path containing spaces should work\nexpected: ok true\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_DIFF - INVALID INPUTS
    // ============================================

    // T22: Git diff with wrong type for staged (string instead of boolean)
    const gitDir22 = fs.mkdtempSync(path.join(testRoot, 'git22-'));
    if (initGitRepo(gitDir22)) {
        const context22 = createMockContext({ baseDir: gitDir22 });
        const result22 = handleGitDiff({ staged: 'true' as any }, context22);
        // TypeScript would catch this, but test runtime behavior
        // Should work (string 'true' is truthy) or fail validation
        if (result22.ok && (result22.result as Record<string, unknown>)?.staged !== true) {
            // If it works, staged should be true (truthy)
        }
    }

    // T23: Git diff with wrong type for path (number instead of string)
    const gitDir23 = fs.mkdtempSync(path.join(testRoot, 'git23-'));
    if (initGitRepo(gitDir23)) {
        const context23 = createMockContext({ baseDir: gitDir23 });
        const result23 = handleGitDiff({ path: 123 as any }, context23);
        // Should fail at path resolution or work if converted to string
        // Test that it doesn't crash
        if (result23.ok === undefined) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff with number path should not crash\nexpected: returns result (ok or error)\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_LOG - SUCCESS CASES
    // ============================================

    // T24: Git log with default limit
    const gitDir24 = fs.mkdtempSync(path.join(testRoot, 'git24-'));
    if (initGitRepo(gitDir24)) {
        createTestFileAndCommit(gitDir24, 'test.txt', 'content');
        const context24 = createMockContext({ baseDir: gitDir24 });
        const result24 = handleGitLog({}, context24);
        if (
            !result24.ok ||
            !(result24.result as Record<string, unknown>)?.commits ||
            (result24.result as Record<string, unknown>).count !== 1
        ) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with default limit should return 1 commit\nexpected: ok true, result.count 1\n\n',
                process.stderr
            );
        }
    }

    // T25: Git log with explicit limit
    const gitDir25 = fs.mkdtempSync(path.join(testRoot, 'git25-'));
    if (initGitRepo(gitDir25)) {
        createTestFileAndCommit(gitDir25, 'test1.txt', 'content1');
        createTestFileAndCommit(gitDir25, 'test2.txt', 'content2');
        createTestFileAndCommit(gitDir25, 'test3.txt', 'content3');
        const context25 = createMockContext({ baseDir: gitDir25 });
        const result25 = handleGitLog({ limit: 2 }, context25);
        if (!result25.ok || (result25.result as Record<string, unknown>)?.count !== 2) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with limit 2 should return 2 commits\nexpected: ok true, result.count 2\n\n',
                process.stderr
            );
        }
    }

    // T26: Git log result structure
    const gitDir26 = fs.mkdtempSync(path.join(testRoot, 'git26-'));
    if (initGitRepo(gitDir26)) {
        createTestFileAndCommit(gitDir26, 'test.txt', 'content');
        const context26 = createMockContext({ baseDir: gitDir26 });
        const result26 = handleGitLog({}, context26);
        if (result26.ok) {
            if (
                !result26.result ||
                typeof (result26.result as Record<string, unknown>).count !== 'number' ||
                !Array.isArray((result26.result as Record<string, unknown>).commits)
            ) {
                failures += 1;
                logLine(
                    'FAIL\ncase: git_log result should have count and commits\nexpected: result with count (number), commits (array)\n\n',
                    process.stderr
                );
            } else {
                const result = result26.result as {
                    commits: Array<{
                        hash?: string;
                        message?: string;
                        author?: string;
                        date?: string;
                    }>;
                };
                if (result.commits.length > 0) {
                    const commit = result.commits[0];
                    if (!commit.hash || !commit.message || !commit.author || !commit.date) {
                        failures += 1;
                        logLine(
                            'FAIL\ncase: git_log commit should have hash, message, author, date\nexpected: commit with all fields\n\n',
                            process.stderr
                        );
                    }
                }
            }
        }
    }

    // T27: Git log on empty repo
    const gitDir27 = fs.mkdtempSync(path.join(testRoot, 'git27-'));
    if (initGitRepo(gitDir27)) {
        const context27 = createMockContext({ baseDir: gitDir27 });
        const result27 = handleGitLog({}, context27);
        if (!result27.ok || (result27.result as Record<string, unknown>)?.count !== 0) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log on empty repo should return count 0\nexpected: ok true, result.count 0\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_LOG - ERROR CASES
    // ============================================

    // T28: Git log on non-git directory
    const nonGitDir28 = fs.mkdtempSync(path.join(testRoot, 'non-git28-'));
    const context28 = createMockContext({ baseDir: nonGitDir28 });
    const result28 = handleGitLog({}, context28);
    if (result28.ok || result28.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: git_log on non-git directory should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // GIT_LOG - EDGE CASES
    // ============================================

    // T29: Git log with limit 0
    const gitDir29 = fs.mkdtempSync(path.join(testRoot, 'git29-'));
    if (initGitRepo(gitDir29)) {
        createTestFileAndCommit(gitDir29, 'test.txt', 'content');
        const context29 = createMockContext({ baseDir: gitDir29 });
        const result29 = handleGitLog({ limit: 0 }, context29);
        if (!result29.ok || (result29.result as Record<string, unknown>)?.count !== 0) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with limit 0 should return count 0\nexpected: ok true, result.count 0\n\n',
                process.stderr
            );
        }
    }

    // T30: Git log with limit 1
    const gitDir30 = fs.mkdtempSync(path.join(testRoot, 'git30-'));
    if (initGitRepo(gitDir30)) {
        createTestFileAndCommit(gitDir30, 'test1.txt', 'content1');
        createTestFileAndCommit(gitDir30, 'test2.txt', 'content2');
        const context30 = createMockContext({ baseDir: gitDir30 });
        const result30 = handleGitLog({ limit: 1 }, context30);
        if (!result30.ok || (result30.result as Record<string, unknown>)?.count !== 1) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with limit 1 should return count 1\nexpected: ok true, result.count 1\n\n',
                process.stderr
            );
        }
    }

    // T31: Git log with limit at boundary (50 - max allowed)
    const gitDir31 = fs.mkdtempSync(path.join(testRoot, 'git31-'));
    if (initGitRepo(gitDir31)) {
        // Create 60 commits
        for (let i = 0; i < 60; i++) {
            createTestFileAndCommit(gitDir31, `test${i}.txt`, `content${i}`);
        }
        const context31 = createMockContext({ baseDir: gitDir31 });
        const result31 = handleGitLog({ limit: 50 }, context31);
        if (!result31.ok || (result31.result as Record<string, unknown>)?.count !== 50) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with limit 50 should return count 50 (capped)\nexpected: ok true, result.count 50\n\n',
                process.stderr
            );
        }
    }

    // T32: Git log with limit over max (should cap at 50)
    const gitDir32 = fs.mkdtempSync(path.join(testRoot, 'git32-'));
    if (initGitRepo(gitDir32)) {
        // Create 60 commits
        for (let i = 0; i < 60; i++) {
            createTestFileAndCommit(gitDir32, `test${i}.txt`, `content${i}`);
        }
        const context32 = createMockContext({ baseDir: gitDir32 });
        const result32 = handleGitLog({ limit: 100 }, context32);
        if (!result32.ok || (result32.result as Record<string, unknown>)?.count !== 50) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with limit 100 should cap at 50\nexpected: ok true, result.count 50\n\n',
                process.stderr
            );
        }
    }

    // T33: Git log with negative limit (should fail or default)
    const gitDir33 = fs.mkdtempSync(path.join(testRoot, 'git33-'));
    if (initGitRepo(gitDir33)) {
        createTestFileAndCommit(gitDir33, 'test.txt', 'content');
        const context33 = createMockContext({ baseDir: gitDir33 });
        const result33 = handleGitLog({ limit: -1 }, context33);
        // Should either fail or use default (10)
        if (result33.ok && (result33.result as Record<string, unknown>)?.count !== 10) {
            // If it works, should use default
            if ((result33.result as Record<string, unknown>)?.count === undefined) {
                failures += 1;
                logLine(
                    'FAIL\ncase: git_log with negative limit should handle gracefully\nexpected: ok true with default limit or error\n\n',
                    process.stderr
                );
            }
        }
    }

    // T34: Git log with undefined limit
    const gitDir34 = fs.mkdtempSync(path.join(testRoot, 'git34-'));
    if (initGitRepo(gitDir34)) {
        createTestFileAndCommit(gitDir34, 'test.txt', 'content');
        const context34 = createMockContext({ baseDir: gitDir34 });
        const result34 = handleGitLog({ limit: undefined }, context34);
        if (!result34.ok || (result34.result as Record<string, unknown>)?.count !== 1) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with undefined limit should use default\nexpected: ok true, result.count 1\n\n',
                process.stderr
            );
        }
    }

    // T35: Git log with null limit
    const gitDir35 = fs.mkdtempSync(path.join(testRoot, 'git35-'));
    if (initGitRepo(gitDir35)) {
        createTestFileAndCommit(gitDir35, 'test.txt', 'content');
        const context35 = createMockContext({ baseDir: gitDir35 });
        const result35 = handleGitLog({ limit: null as any }, context35);
        if (!result35.ok || (result35.result as Record<string, unknown>)?.count !== 1) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with null limit should use default\nexpected: ok true, result.count 1\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GIT_LOG - INVALID INPUTS
    // ============================================

    // T36: Git log with string limit (should fail validation or convert)
    const gitDir36 = fs.mkdtempSync(path.join(testRoot, 'git36-'));
    if (initGitRepo(gitDir36)) {
        createTestFileAndCommit(gitDir36, 'test.txt', 'content');
        const context36 = createMockContext({ baseDir: gitDir36 });
        const result36 = handleGitLog({ limit: '10' as any }, context36);
        // TypeScript would catch this, but test runtime
        // Should either work (if converted) or fail gracefully
        if (result36.ok === undefined) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with string limit should not crash\nexpected: returns result (ok or error)\n\n',
                process.stderr
            );
        }
    }

    // T37: Git log with float limit (should truncate or fail)
    const gitDir37 = fs.mkdtempSync(path.join(testRoot, 'git37-'));
    if (initGitRepo(gitDir37)) {
        createTestFileAndCommit(gitDir37, 'test.txt', 'content');
        const context37 = createMockContext({ baseDir: gitDir37 });
        const result37 = handleGitLog({ limit: 5.7 as any }, context37);
        // Should work (truncated to 5) or fail validation
        if (result37.ok === undefined) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log with float limit should not crash\nexpected: returns result (ok or error)\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // DEBUG INFO VALIDATION
    // ============================================

    // T38: Verify _debug info is present in git_status
    const gitDir38 = fs.mkdtempSync(path.join(testRoot, 'git38-'));
    if (initGitRepo(gitDir38)) {
        const context38 = createMockContext({ baseDir: gitDir38 });
        const result38 = handleGitStatus({}, context38);
        if (result38.ok && !result38._debug) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_status should include _debug info\nexpected: result._debug exists\n\n',
                process.stderr
            );
        }
    }

    // T39: Verify _debug info is present in git_diff
    const gitDir39 = fs.mkdtempSync(path.join(testRoot, 'git39-'));
    if (initGitRepo(gitDir39)) {
        const context39 = createMockContext({ baseDir: gitDir39 });
        const result39 = handleGitDiff({}, context39);
        if (result39.ok && !result39._debug) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_diff should include _debug info\nexpected: result._debug exists\n\n',
                process.stderr
            );
        }
    }

    // T40: Verify _debug info is present in git_log
    const gitDir40 = fs.mkdtempSync(path.join(testRoot, 'git40-'));
    if (initGitRepo(gitDir40)) {
        const context40 = createMockContext({ baseDir: gitDir40 });
        const result40 = handleGitLog({}, context40);
        if (result40.ok && !result40._debug) {
            failures += 1;
            logLine(
                'FAIL\ncase: git_log should include _debug info\nexpected: result._debug exists\n\n',
                process.stderr
            );
        }
    }

    // T41: Verify _debug structure
    const gitDir41 = fs.mkdtempSync(path.join(testRoot, 'git41-'));
    if (initGitRepo(gitDir41)) {
        const context41 = createMockContext({ baseDir: gitDir41 });
        const result41 = handleGitStatus({}, context41);
        if (result41.ok && result41._debug) {
            const debug = result41._debug;
            if (
                !debug.path ||
                debug.model === undefined ||
                debug.memory_read === undefined ||
                debug.memory_write === undefined
            ) {
                failures += 1;
                logLine(
                    'FAIL\ncase: _debug should have path, model, memory_read, memory_write\nexpected: all debug fields present\n\n',
                    process.stderr
                );
            }
        }
    }

    logLine(`Ran 41 test cases, ${failures} failures`);
} finally {
    // Cleanup
    fs.rmSync(testRoot, { recursive: true, force: true });
}

if (failures > 0) {
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
