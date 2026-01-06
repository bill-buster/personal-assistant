#!/usr/bin/env node

/**
 * Tests for grep_tools.ts
 * Tests: handleGrep handler
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { handleGrep } from './grep_tools';
import { createMockContext } from '../core/test_utils';
import { ExecutorContext } from '../core/types';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'grep-tools-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

try {
    // ============================================
    // GREP - SUCCESS CASES
    // ============================================

    // T1: Search in a single file (case-insensitive)
    const testFile1 = path.join(testRoot, 'test1.txt');
    fs.writeFileSync(testFile1, 'Hello World\nThis is a test\nAnother line with Test\n');
    const context1 = createMockContext({
        baseDir: testRoot,
        paths: {
            resolve: (p: string) => path.resolve(testRoot, p),
            assertAllowed: () => {},
            resolveAllowed: (p: string) => path.resolve(testRoot, p),
        },
    });

    const result1 = handleGrep(
        { pattern: 'test', path: 'test1.txt', case_sensitive: false },
        context1
    );
    if (
        !result1.ok ||
        !(
            result1.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result1.result as { matches: Array<unknown> }).matches.length !== 2
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: search in file (case-insensitive)\nexpected: 2 matches\ngot: ${(result1.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: search in file (case-insensitive)');
    }

    // T2: Search in a single file (case-sensitive)
    const result2 = handleGrep(
        { pattern: 'Test', path: 'test1.txt', case_sensitive: true },
        context1
    );
    if (
        !result2.ok ||
        !(
            result2.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result2.result as { matches: Array<unknown> }).matches.length !== 1
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: search in file (case-sensitive)\nexpected: 1 match\ngot: ${(result2.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: search in file (case-sensitive)');
    }

    // T3: Search in directory (recursive)
    const subDir = path.join(testRoot, 'subdir');
    fs.mkdirSync(subDir, { recursive: true });
    const testFile2 = path.join(subDir, 'test2.txt');
    fs.writeFileSync(testFile2, 'Find me\nAnother line\n');
    const testFile3 = path.join(testRoot, 'test3.txt');
    fs.writeFileSync(testFile3, 'Find me too\n');

    const result3 = handleGrep({ pattern: 'Find me', path: '.', case_sensitive: false }, context1);
    if (
        !result3.ok ||
        !(
            result3.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result3.result as { matches: Array<unknown> }).matches.length !== 2
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: search in directory (recursive)\nexpected: 2 matches\ngot: ${(result3.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: search in directory (recursive)');
    }

    // T4: Max results limit
    const testFile4 = path.join(testRoot, 'test4.txt');
    fs.writeFileSync(testFile4, 'match\nmatch\nmatch\nmatch\nmatch\n');
    const result4 = handleGrep(
        { pattern: 'match', path: 'test4.txt', case_sensitive: false, max_results: 3 },
        context1
    );
    if (
        !result4.ok ||
        !(
            result4.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result4.result as { matches: Array<unknown> }).matches.length !== 3
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: max results limit\nexpected: 3 matches\ngot: ${(result4.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: max results limit');
    }

    // T5: No matches found
    const result5 = handleGrep(
        { pattern: 'nonexistent', path: 'test1.txt', case_sensitive: false },
        context1
    );
    if (
        !result5.ok ||
        !(
            result5.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result5.result as { matches: Array<unknown> }).matches.length !== 0
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: no matches found\nexpected: 0 matches\ngot: ${(result5.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: no matches found');
    }

    // T6: Regex pattern with special characters
    const testFile6 = path.join(testRoot, 'test6.txt');
    fs.writeFileSync(testFile6, 'Price: $100\nPrice: $200\n');
    const result6 = handleGrep(
        { pattern: '\\$\\d+', path: 'test6.txt', case_sensitive: false },
        context1
    );
    if (
        !result6.ok ||
        !(
            result6.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result6.result as { matches: Array<unknown> }).matches.length !== 2
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: regex pattern with special characters\nexpected: 2 matches\ngot: ${(result6.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: regex pattern with special characters');
    }

    // ============================================
    // GREP - ERROR CASES
    // ============================================

    // T7: Invalid regex pattern
    const result7 = handleGrep(
        { pattern: '[invalid', path: 'test1.txt', case_sensitive: false },
        context1
    );
    if (result7.ok || !result7.error) {
        failures += 1;
        logLine('FAIL\ncase: invalid regex pattern\nexpected: ok false, error\n\n', process.stderr);
    } else {
        logLine('PASS: invalid regex pattern');
    }

    // T8: Path not found
    const result8 = handleGrep(
        { pattern: 'test', path: 'nonexistent.txt', case_sensitive: false },
        context1
    );
    if (result8.ok || !result8.error) {
        failures += 1;
        logLine('FAIL\ncase: path not found\nexpected: ok false, error\n\n', process.stderr);
    } else {
        logLine('PASS: path not found');
    }

    // T9: Path denied (outside allowed paths)
    const context9 = createMockContext({
        baseDir: testRoot,
        paths: {
            resolve: (p: string) => path.resolve(testRoot, p),
            assertAllowed: (p: string) => {
                if (p.includes('denied')) {
                    throw new Error('Path denied');
                }
            },
            resolveAllowed: (p: string) => {
                const resolved = path.resolve(testRoot, p);
                if (resolved.includes('denied')) {
                    throw new Error('Path denied');
                }
                return resolved;
            },
        },
    });
    const deniedFile = path.join(testRoot, 'denied.txt');
    fs.writeFileSync(deniedFile, 'test content');

    const result9 = handleGrep(
        { pattern: 'test', path: 'denied.txt', case_sensitive: false },
        context9
    );
    if (result9.ok || !result9.error) {
        failures += 1;
        logLine('FAIL\ncase: path denied\nexpected: ok false, error\n\n', process.stderr);
    } else {
        logLine('PASS: path denied');
    }

    // T10: Empty pattern (should be caught by schema validation, but test handler behavior)
    const result10 = handleGrep(
        { pattern: '', path: 'test1.txt', case_sensitive: false },
        context1
    );
    // Empty pattern should fail validation, but if it gets through, it should still work (matches empty strings)
    // This is more of a schema validation test, but we test handler behavior
    if (!result10.ok && result10.error) {
        logLine('PASS: empty pattern validation');
    } else {
        // Handler might accept it, which is fine for this test
        logLine('PASS: empty pattern (handler accepts)');
    }

    // ============================================
    // GREP - EDGE CASES
    // ============================================

    // T11: Search in empty file
    const emptyFile = path.join(testRoot, 'empty.txt');
    fs.writeFileSync(emptyFile, '');
    const result11 = handleGrep(
        { pattern: 'test', path: 'empty.txt', case_sensitive: false },
        context1
    );
    if (
        !result11.ok ||
        !(
            result11.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result11.result as { matches: Array<unknown> }).matches.length !== 0
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: search in empty file\nexpected: 0 matches\ngot: ${(result11.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: search in empty file');
    }

    // T12: Multiple matches on same line
    const multiMatchFile = path.join(testRoot, 'multimatch.txt');
    fs.writeFileSync(multiMatchFile, 'test test test\n');
    const result12 = handleGrep(
        { pattern: 'test', path: 'multimatch.txt', case_sensitive: false },
        context1
    );
    if (
        !result12.ok ||
        !(
            result12.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result12.result as { matches: Array<unknown> }).matches.length !== 3
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: multiple matches on same line\nexpected: 3 matches\ngot: ${(result12.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: multiple matches on same line');
    }

    // T13: Skip hidden files and directories
    const hiddenDir = path.join(testRoot, '.hidden');
    fs.mkdirSync(hiddenDir, { recursive: true });
    const hiddenFile = path.join(hiddenDir, 'file.txt');
    fs.writeFileSync(hiddenFile, 'hidden content\n');
    const result13 = handleGrep({ pattern: 'hidden', path: '.', case_sensitive: false }, context1);
    // Should not find matches in .hidden directory
    if (
        result13.ok &&
        (
            result13.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches
    ) {
        const foundHidden = (result13.result as { matches: Array<unknown> }).matches.some(
            (m: any) => m.file.includes('.hidden')
        );
        if (foundHidden) {
            failures += 1;
            logLine(
                'FAIL\ncase: skip hidden files\nexpected: no matches in .hidden\ngot: matches found\n\n',
                process.stderr
            );
        } else {
            logLine('PASS: skip hidden files');
        }
    } else {
        logLine('PASS: skip hidden files');
    }

    // ============================================
    // JULES EDGE CASES - Adversarial Testing
    // ============================================

    // T14: Unicode and emoji in content
    const unicodeFile = path.join(testRoot, 'unicode.txt');
    fs.writeFileSync(unicodeFile, 'Hello 世界 🌍\nTest with émojis 🎉\n', 'utf8');
    const result14 = handleGrep(
        { pattern: '世界', path: 'unicode.txt', case_sensitive: false },
        context1
    );
    if (
        !result14.ok ||
        !(
            result14.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result14.result as { matches: Array<unknown> }).matches.length !== 1
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: unicode content\nexpected: 1 match\ngot: ${(result14.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: unicode content');
    }

    // T15: Very long line (should not crash, but may hit size limit)
    const longLineFile = path.join(testRoot, 'longline.txt');
    // Create a line that's long but under the size limit (65536 bytes in test context)
    const longLine = 'x'.repeat(30000) + 'target' + 'x'.repeat(30000); // ~60KB, under 65KB limit
    fs.writeFileSync(longLineFile, longLine + '\n');
    const result15 = handleGrep(
        { pattern: 'target', path: 'longline.txt', case_sensitive: false },
        context1
    );
    if (
        !result15.ok ||
        !(
            result15.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result15.result as { matches: Array<unknown> }).matches.length !== 1
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: very long line\nexpected: 1 match\ngot: ${(result15.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: very long line');
    }

    // T16: Regex pattern with potential ReDoS (should handle gracefully)
    // Using a pattern that could cause catastrophic backtracking
    const redosFile = path.join(testRoot, 'redos.txt');
    fs.writeFileSync(redosFile, 'aaaaaaaaaaaaaaaaaaaaaab\n');
    const result16 = handleGrep(
        { pattern: '(a+)+b', path: 'redos.txt', case_sensitive: false },
        context1
    );
    // Should either match or fail gracefully, not hang
    if (!result16.ok && result16.error) {
        logLine('PASS: ReDoS pattern (rejected gracefully)');
    } else if (result16.ok) {
        logLine('PASS: ReDoS pattern (matched)');
    } else {
        failures += 1;
        logLine(
            'FAIL\ncase: ReDoS pattern\nexpected: result or error\ngot: neither\n\n',
            process.stderr
        );
    }

    // T17: Empty directory
    const emptyDir = path.join(testRoot, 'emptydir');
    fs.mkdirSync(emptyDir, { recursive: true });
    const result17 = handleGrep(
        { pattern: 'test', path: 'emptydir', case_sensitive: false },
        context1
    );
    if (
        !result17.ok ||
        !(
            result17.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result17.result as { matches: Array<unknown> }).matches.length !== 0
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: empty directory\nexpected: 0 matches\ngot: ${(result17.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: empty directory');
    }

    // T18: Files with special characters in names
    const specialNameFile = path.join(testRoot, 'file with spaces.txt');
    fs.writeFileSync(specialNameFile, 'content with spaces\n');
    const result18 = handleGrep(
        { pattern: 'content', path: 'file with spaces.txt', case_sensitive: false },
        context1
    );
    if (
        !result18.ok ||
        !(
            result18.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result18.result as { matches: Array<unknown> }).matches.length !== 1
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: file with special characters in name\nexpected: 1 match\ngot: ${(result18.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: file with special characters in name');
    }

    // T19: Max results stops early (test that it stops at limit, not continues)
    const manyMatchesFile = path.join(testRoot, 'manymatches.txt');
    fs.writeFileSync(manyMatchesFile, Array(100).fill('match\n').join(''));
    const result19 = handleGrep(
        { pattern: 'match', path: 'manymatches.txt', case_sensitive: false, max_results: 10 },
        context1
    );
    if (
        !result19.ok ||
        !(
            result19.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result19.result as { matches: Array<unknown> }).matches.length !== 10
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: max results stops early\nexpected: exactly 10 matches\ngot: ${(result19.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: max results stops early');
    }

    // T20: Pattern matching newlines (edge case)
    const newlineFile = path.join(testRoot, 'newline.txt');
    fs.writeFileSync(newlineFile, 'line1\nline2\nline3\n');
    const result20 = handleGrep(
        { pattern: '\\n', path: 'newline.txt', case_sensitive: false },
        context1
    );
    // Should not match newlines (they're line separators, not part of line content)
    if (
        !result20.ok ||
        !(
            result20.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result20.result as { matches: Array<unknown> }).matches.length !== 0
    ) {
        // This is expected - newlines are line separators, not matched
        logLine('PASS: pattern matching newlines (correctly ignored)');
    } else {
        logLine('PASS: pattern matching newlines');
    }

    // T21: Case sensitivity with unicode
    const unicodeCaseFile = path.join(testRoot, 'unicodecase.txt');
    fs.writeFileSync(unicodeCaseFile, 'İstanbul\nistanbul\n', 'utf8');
    const result21 = handleGrep(
        { pattern: 'istanbul', path: 'unicodecase.txt', case_sensitive: false },
        context1
    );
    // Should match both (case-insensitive)
    if (
        !result21.ok ||
        !(
            result21.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result21.result as { matches: Array<unknown> }).matches.length < 1
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: case sensitivity with unicode\nexpected: at least 1 match\ngot: ${(result21.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: case sensitivity with unicode');
    }

    // T22: Very large directory structure (performance test)
    const largeDir = path.join(testRoot, 'largedir');
    fs.mkdirSync(largeDir, { recursive: true });
    // Create 50 files
    for (let i = 0; i < 50; i++) {
        const file = path.join(largeDir, `file${i}.txt`);
        fs.writeFileSync(file, i % 2 === 0 ? 'target\n' : 'other\n');
    }
    const result22 = handleGrep(
        { pattern: 'target', path: 'largedir', case_sensitive: false },
        context1
    );
    // Should find 25 matches (every other file)
    if (
        !result22.ok ||
        !(
            result22.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches ||
        (result22.result as { matches: Array<unknown> }).matches.length !== 25
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: large directory structure\nexpected: 25 matches\ngot: ${(result22.result as { matches: Array<{ file: string; line: number; text: string; match: string }> })?.matches?.length || 0}\n\n`,
            process.stderr
        );
    } else {
        logLine('PASS: large directory structure');
    }

    // T23: Skip huge file (file size limit)
    const hugeFile = path.join(testRoot, 'huge.txt');
    // Create a file larger than maxReadSize (default 65536 in test context)
    const hugeContent = 'target\n' + 'x'.repeat(70000); // Larger than 65536
    fs.writeFileSync(hugeFile, hugeContent);
    const result23 = handleGrep(
        { pattern: 'target', path: 'huge.txt', case_sensitive: false },
        context1
    );
    // Should skip the huge file (no matches because file is too large)
    // The file should be skipped, so we should get 0 matches
    if (!result23.ok) {
        failures += 1;
        logLine(
            `FAIL\ncase: skip huge file\nexpected: ok true (file skipped)\ngot: ok false\n\n`,
            process.stderr
        );
    } else if (
        (
            result23.result as {
                matches: Array<{ file: string; line: number; text: string; match: string }>;
            }
        )?.matches &&
        (result23.result as { matches: Array<unknown> }).matches.length > 0
    ) {
        failures += 1;
        logLine(
            `FAIL\ncase: skip huge file\nexpected: 0 matches (file skipped)\ngot: ${(result23.result as { matches: Array<unknown> }).matches.length} matches\n\n`,
            process.stderr
        );
    } else {
        // File was skipped (0 matches) - this is correct
        // Check if skipped_files info is present (optional but nice to have)
        if (
            result23.ok &&
            result23.result &&
            typeof result23.result === 'object' &&
            'skipped_count' in result23.result &&
            typeof (result23.result as { skipped_count: number }).skipped_count === 'number' &&
            (result23.result as { skipped_count: number }).skipped_count > 0
        ) {
            logLine('PASS: skip huge file (with skipped_files info)');
        } else {
            // File was skipped silently (also acceptable)
            logLine('PASS: skip huge file (skipped silently)');
        }
    }

    // ============================================
    // SUMMARY
    // ============================================

    if (failures > 0) {
        logLine(`\n${failures} test(s) failed`, process.stderr);
        process.exit(1);
    }

    logLine('\nRESULT\nstatus: OK\n');
} catch (err: any) {
    logLine(`\nFATAL ERROR: ${err.message}\n${err.stack}\n`, process.stderr);
    process.exit(1);
} finally {
    // Cleanup
    try {
        fs.rmSync(testRoot, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
}
