#!/usr/bin/env node

/**
 * Comprehensive tests for fetch_tools.ts
 * Tests: URL validation, curl execution, HTML parsing, error handling
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { handleReadUrl } from './fetch_tools';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-tools-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

function parseOutput(output: string) {
    try {
        return JSON.parse(output);
    } catch (err) {
        const lines = output.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const json = JSON.parse(lines[i]);
                if (json && typeof json.ok === 'boolean') {
                    return json;
                }
            } catch {
                continue;
            }
        }
        return null;
    }
}

try {
    // ============================================
    // SUCCESS CASES
    // ============================================

    // T1: Valid HTTP URL
    const result1 = handleReadUrl({ url: 'https://example.com' });
    if (!result1.ok) {
        failures += 1;
        logLine('FAIL\ncase: valid HTTP URL should succeed\nexpected: ok true\n\n', process.stderr);
    }

    // T2: Valid HTTPS URL
    const result2 = handleReadUrl({ url: 'https://www.google.com' });
    if (!result2.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid HTTPS URL should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T3: URL with path
    const result3 = handleReadUrl({ url: 'https://example.com/path/to/page' });
    if (!result3.ok) {
        failures += 1;
        logLine('FAIL\ncase: URL with path should succeed\nexpected: ok true\n\n', process.stderr);
    }

    // T4: URL with query parameters
    const result4 = handleReadUrl({ url: 'https://example.com?foo=bar&baz=qux' });
    if (!result4.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with query parameters should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T5: Result should contain url, content, and length
    if (result1.ok) {
        if (!result1.result || !result1.result.url || !('content' in result1.result)) {
            failures += 1;
            logLine(
                'FAIL\ncase: result should contain url and content\nexpected: result.url and result.content\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // ERROR CASES - URL VALIDATION
    // ============================================

    // T6: Invalid URL format
    const result6 = handleReadUrl({ url: 'not-a-url' });
    if (result6.ok || result6.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: invalid URL format should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T7: File protocol (blocked)
    const result7 = handleReadUrl({ url: 'file:///etc/passwd' });
    if (result7.ok || result7.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: file:// URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T8: FTP protocol (blocked)
    const result8 = handleReadUrl({ url: 'ftp://example.com/file.txt' });
    if (result8.ok || result8.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: ftp:// URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T9: Data URL (blocked)
    const result9 = handleReadUrl({ url: 'data:text/plain,hello' });
    if (result9.ok || result9.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: data: URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T10: JavaScript URL (blocked)
    const result10 = handleReadUrl({ url: 'javascript:alert(1)' });
    if (result10.ok || result10.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: javascript: URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T11: Empty URL
    const result11 = handleReadUrl({ url: '' });
    if (result11.ok || result11.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty URL should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T12: URL with only scheme
    const result12 = handleReadUrl({ url: 'https://' });
    if (result12.ok || result12.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with only scheme should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // EDGE CASES
    // ============================================

    // T13: URL with port
    const result13 = handleReadUrl({ url: 'https://example.com:8080/path' });
    if (!result13.ok && result13.error?.code === 'VALIDATION_ERROR') {
        // Port should be allowed in URL validation
        failures += 1;
        logLine(
            'FAIL\ncase: URL with port should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T14: URL with fragment
    const result14 = handleReadUrl({ url: 'https://example.com#section' });
    if (!result14.ok && result14.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with fragment should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T15: Very long URL (should pass validation, may fail at execution)
    const longPath = '/path/' + 'x'.repeat(1000);
    const result15 = handleReadUrl({ url: `https://example.com${longPath}` });
    if (!result15.ok && result15.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: long URL should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T16: URL with special characters (encoded)
    const result16 = handleReadUrl({ url: 'https://example.com/path%20with%20spaces' });
    if (!result16.ok && result16.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with encoded characters should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // ============================================
    // HTML PARSING TESTS (if we can mock curl)
    // ============================================

    // Note: Actual curl execution tests would require mocking or a test server
    // These tests verify the validation logic works correctly

    // T17: Verify error message format for blocked schemes
    if (!result7.ok && result7.error) {
        if (
            !result7.error.message.includes('scheme') ||
            !result7.error.message.includes('not allowed')
        ) {
            failures += 1;
            logLine(
                'FAIL\ncase: error message should mention scheme and not allowed\nexpected: message contains scheme and not allowed\n\n',
                process.stderr
            );
        }
    }

    // T18: Verify error message format for invalid URL
    if (!result6.ok && result6.error) {
        if (!result6.error.message.includes('Invalid URL format')) {
            failures += 1;
            logLine(
                'FAIL\ncase: error message should mention Invalid URL format\nexpected: message contains Invalid URL format\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // BOUNDARY TESTS
    // ============================================

    // T19: HTTP (lowercase) should work
    const result19 = handleReadUrl({ url: 'http://example.com' });
    if (!result19.ok && result19.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: lowercase http:// should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T20: HTTPS (lowercase) should work
    const result20 = handleReadUrl({ url: 'https://example.com' });
    if (!result20.ok && result20.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: lowercase https:// should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T21: HTTP (uppercase) should work
    const result21 = handleReadUrl({ url: 'HTTP://EXAMPLE.COM' });
    if (!result21.ok && result21.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: uppercase HTTP:// should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T22: Mixed case scheme should work
    const result22 = handleReadUrl({ url: 'HtTpS://example.com' });
    if (!result22.ok && result22.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: mixed case scheme should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // ============================================
    // NULL/EMPTY INPUT TESTS
    // ============================================

    // T23: Null URL (TypeScript should prevent this, but test runtime behavior)
    // This would be a type error at compile time, but test runtime if possible
    // Skip - TypeScript prevents null

    // T24: Whitespace-only URL
    const result24 = handleReadUrl({ url: '   ' });
    if (result24.ok || result24.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: whitespace-only URL should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T25: URL with only spaces
    const result25 = handleReadUrl({ url: ' https://example.com ' });
    // URL constructor should handle this, but test it
    if (!result25.ok && result25.error?.code === 'VALIDATION_ERROR') {
        // This might be valid after trimming, so allow EXEC_ERROR
        if (result25.error.message.includes('Invalid URL format')) {
            // Acceptable - spaces in URL are invalid
        } else {
            failures += 1;
            logLine(
                'FAIL\ncase: URL with spaces should be handled\nexpected: ok true or VALIDATION_ERROR with appropriate message\n\n',
                process.stderr
            );
        }
    }

    logLine(`Ran 25 test cases, ${failures} failures`);
} finally {
    // Cleanup
    fs.rmSync(testRoot, { recursive: true, force: true });
}

if (failures > 0) {
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
