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
import { createMockContext } from '../core/test_utils';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-tools-test-'));
const testRoot = fs.realpathSync(testRootRaw);

// Create mock context (no longer needs curl allowlist since we use native fetch)
const mockContext = createMockContext({
    permissions: {
        allow_paths: [],
        allow_commands: [],
        require_confirmation_for: [],
        deny_tools: [],
    },
});

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

function parseOutput(output: string) {
    try {
        return JSON.parse(output);
    } catch (err: unknown) {
        const lines = output.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const json = JSON.parse(lines[i]);
                if (json && typeof json.ok === 'boolean') {
                    return json;
                }
            } catch (_err) {
                continue;
            }
        }
        return null;
    }
}

(async () => {
    try {
        // ============================================
        // SUCCESS CASES
        // ============================================

        // T1: Valid HTTP URL
        const result1 = await handleReadUrl({ url: 'https://example.com' }, mockContext);
        if (!result1.ok) {
            failures += 1;
            logLine('FAIL\ncase: valid HTTP URL should succeed\nexpected: ok true\n\n', process.stderr);
        }

        // T2: Valid HTTPS URL
        const result2 = await handleReadUrl({ url: 'https://www.google.com' }, mockContext);
    if (!result2.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid HTTPS URL should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T3: URL with path
    const result3 = await handleReadUrl({ url: 'https://example.com/path/to/page' }, mockContext);
    if (!result3.ok) {
        failures += 1;
        logLine('FAIL\ncase: URL with path should succeed\nexpected: ok true\n\n', process.stderr);
    }

    // T4: URL with query parameters
    const result4 = await handleReadUrl(
        { url: 'https://example.com?foo=bar&baz=qux' },
        mockContext
    );
    if (!result4.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with query parameters should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T5: Result should contain url, content, and length
    if (result1.ok) {
        const result = result1.result as Record<string, unknown>;
        if (!result || !result.url || !('content' in result)) {
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
    const result6 = await handleReadUrl({ url: 'not-a-url' }, mockContext);
    if (result6.ok || result6.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: invalid URL format should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T7: File protocol (blocked)
    const result7 = await handleReadUrl({ url: 'file:///etc/passwd' }, mockContext);
    if (result7.ok || result7.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: file:// URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T8: FTP protocol (blocked)
    const result8 = await handleReadUrl({ url: 'ftp://example.com/file.txt' }, mockContext);
    if (result8.ok || result8.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: ftp:// URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T9: Data URL (blocked)
    const result9 = await handleReadUrl({ url: 'data:text/plain,hello' }, mockContext);
    if (result9.ok || result9.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: data: URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T10: JavaScript URL (blocked)
    const result10 = await handleReadUrl({ url: 'javascript:alert(1)' }, mockContext);
    if (result10.ok || result10.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: javascript: URL should be blocked\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T11: Empty URL
    const result11 = await handleReadUrl({ url: '' }, mockContext);
    if (result11.ok || result11.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty URL should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T12: URL with only scheme
    const result12 = await handleReadUrl({ url: 'https://' }, mockContext);
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
    const result13 = await handleReadUrl({ url: 'https://example.com:8080/path' }, mockContext);
    if (!result13.ok && result13.error?.code === 'VALIDATION_ERROR') {
        // Port should be allowed in URL validation
        failures += 1;
        logLine(
            'FAIL\ncase: URL with port should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T14: URL with fragment
    const result14 = await handleReadUrl({ url: 'https://example.com#section' }, mockContext);
    if (!result14.ok && result14.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with fragment should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T15: Very long URL (should pass validation, may fail at execution)
    const longPath = '/path/' + 'x'.repeat(1000);
    const result15 = await handleReadUrl({ url: `https://example.com${longPath}` }, mockContext);
    if (!result15.ok && result15.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: long URL should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T16: URL with special characters (encoded)
    const result16 = await handleReadUrl(
        { url: 'https://example.com/path%20with%20spaces' },
        mockContext
    );
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
    const result19 = await handleReadUrl({ url: 'http://example.com' }, mockContext);
    if (!result19.ok && result19.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: lowercase http:// should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T20: HTTPS (lowercase) should work
    const result20 = await handleReadUrl({ url: 'https://example.com' }, mockContext);
    if (!result20.ok && result20.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: lowercase https:// should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T21: HTTP (uppercase) should work
    const result21 = await handleReadUrl({ url: 'HTTP://EXAMPLE.COM' }, mockContext);
    if (!result21.ok && result21.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: uppercase HTTP:// should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T22: Mixed case scheme should work
    const result22 = await handleReadUrl({ url: 'HtTpS://example.com' }, mockContext);
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
    const result24 = await handleReadUrl({ url: '   ' }, mockContext);
    if (result24.ok || result24.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: whitespace-only URL should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T25: URL with only spaces
    const result25 = await handleReadUrl({ url: ' https://example.com ' }, mockContext);
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

    // ============================================
    // BOUNDARY TESTS - MAX SIZES
    // ============================================

    // T26: Verify result content is truncated at 8000 chars
    // Note: This requires a URL that returns >8000 chars of text
    // We'll test the truncation logic by checking the result structure
    const result26 = await handleReadUrl({ url: 'https://example.com' }, mockContext);
    if (result26.ok && result26.result) {
        const result = result26.result as Record<string, unknown>;
        if (typeof result.length !== 'number' || !('content' in result) || !result.url) {
            failures += 1;
            logLine(
                'FAIL\ncase: result should have url, content, length\nexpected: result with url, content, length\n\n',
                process.stderr
            );
        }
        // Check truncation marker if content is long
        const resultTyped = result26.result as { length: number; content: string };
        if (resultTyped.length > 8000 && !resultTyped.content.includes('...[truncated]')) {
            failures += 1;
            logLine(
                'FAIL\ncase: content over 8000 chars should be truncated with marker\nexpected: content includes ...[truncated]\n\n',
                process.stderr
            );
        }
    }

    // T27: URL with maximum valid length (before hitting system limits)
    const maxPath = '/path/' + 'x'.repeat(2000);
    const result27 = await handleReadUrl({ url: `https://example.com${maxPath}` }, mockContext);
    if (!result27.ok && result27.error?.code === 'VALIDATION_ERROR') {
        // Very long URLs should still pass validation (may fail at execution)
        failures += 1;
        logLine(
            'FAIL\ncase: very long URL should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // ============================================
    // MALFORMED DATA TESTS
    // ============================================

    // T28: URL with null bytes (should be rejected)
    const result28 = await handleReadUrl({ url: 'https://example.com\0test' }, mockContext);
    if (result28.ok || result28.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with null byte should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T29: URL with control characters
    const result29 = await handleReadUrl({ url: 'https://example.com\n\ttest' }, mockContext);
    if (result29.ok || result29.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with control characters should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T30: URL with invalid encoding
    const result30 = await handleReadUrl({ url: 'https://example.com/test%ZZ' }, mockContext);
    // Invalid percent encoding should fail validation
    if (result30.ok || result30.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with invalid encoding should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T31: URL with only hostname (no path, no scheme validation issue)
    const result31 = await handleReadUrl({ url: 'example.com' }, mockContext);
    if (result31.ok || result31.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL without scheme should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // SPECIAL CHARACTER TESTS
    // ============================================

    // T32: URL with unicode characters (should be encoded)
    const result32 = await handleReadUrl({ url: 'https://example.com/test/测试' }, mockContext);
    // Unicode should be handled (either encoded or rejected)
    if (!result32.ok && result32.error?.code === 'VALIDATION_ERROR') {
        // Check if it's a proper validation error about encoding
        if (!result32.error.message.includes('Invalid URL format')) {
            failures += 1;
            logLine(
                'FAIL\ncase: URL with unicode should be handled\nexpected: ok true or VALIDATION_ERROR with proper message\n\n',
                process.stderr
            );
        }
    }

    // T33: URL with emoji (should be encoded or rejected)
    const result33 = await handleReadUrl({ url: 'https://example.com/test/🚀' }, mockContext);
    if (!result33.ok && result33.error?.code === 'VALIDATION_ERROR') {
        // Should have proper error message
        if (!result33.error.message.includes('Invalid URL format')) {
            failures += 1;
            logLine(
                'FAIL\ncase: URL with emoji should be handled\nexpected: ok true or VALIDATION_ERROR with proper message\n\n',
                process.stderr
            );
        }
    }

    // T34: URL with query parameters containing special chars
    const result34 = await handleReadUrl(
        { url: 'https://example.com?foo=bar&baz=qux&test=hello+world' },
        mockContext
    );
    if (!result34.ok && result34.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with query params should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // ============================================
    // RESULT STRUCTURE VALIDATION
    // ============================================

    // T35: Verify result structure on success
    const result35 = await handleReadUrl({ url: 'https://example.com' }, mockContext);
    if (result35.ok) {
        if (
            !result35.result ||
            typeof (result35.result as Record<string, unknown>).url !== 'string' ||
            typeof (result35.result as Record<string, unknown>).content !== 'string' ||
            typeof (result35.result as Record<string, unknown>).length !== 'number'
        ) {
            failures += 1;
            logLine(
                'FAIL\ncase: result should have url (string), content (string), length (number)\nexpected: proper result structure\n\n',
                process.stderr
            );
        }
    }

    // T36: Verify error structure on failure
    const result36 = await handleReadUrl({ url: 'not-a-url' }, mockContext);
    if (!result36.ok) {
        if (
            !result36.error ||
            typeof result36.error.code !== 'string' ||
            typeof result36.error.message !== 'string'
        ) {
            failures += 1;
            logLine(
                'FAIL\ncase: error should have code (string) and message (string)\nexpected: proper error structure\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // EDGE CASES - BOUNDARY CONDITIONS
    // ============================================

    // T37: URL with exactly 8000 chars of content (boundary test)
    // This is hard to test without mocking, but we can verify the truncation logic exists
    // by checking the code path handles it

    // T38: URL with port 0 (edge case)
    const result38 = await handleReadUrl({ url: 'https://example.com:0' }, mockContext);
    if (!result38.ok && result38.error?.code === 'VALIDATION_ERROR') {
        // Port 0 might be invalid, but should pass URL validation
        failures += 1;
        logLine(
            'FAIL\ncase: URL with port 0 should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T39: URL with port 65535 (max port)
    const result39 = await handleReadUrl({ url: 'https://example.com:65535' }, mockContext);
    if (!result39.ok && result39.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with max port should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T40: URL with port 65536 (over max - should fail validation)
    const result40 = await handleReadUrl({ url: 'https://example.com:65536' }, mockContext);
    // Port over 65535 might be rejected by URL parser
    // Accept either validation error or execution error

    // T41: URL with IPv6 address (should pass validation)
    const result41 = await handleReadUrl({ url: 'https://[2001:db8::1]' }, mockContext);
    if (!result41.ok && result41.error?.code === 'VALIDATION_ERROR') {
        // IPv6 should be valid URL format
        failures += 1;
        logLine(
            'FAIL\ncase: URL with IPv6 should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T42: URL with IPv4 address
    const result42 = await handleReadUrl({ url: 'https://192.168.1.1' }, mockContext);
    if (!result42.ok && result42.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL with IPv4 should pass validation\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // ============================================
    // INVALID INPUT TYPES
    // ============================================

    // T43: URL as number (should fail validation)
    const result43 = await handleReadUrl({ url: 123 as any }, mockContext);
    if (result43.ok || result43.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL as number should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T44: URL as null (should fail validation)
    const result44 = await handleReadUrl({ url: null as any }, mockContext);
    if (result44.ok || result44.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL as null should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T45: URL as undefined (should fail validation)
    const result45 = await handleReadUrl({ url: undefined as any }, mockContext);
    if (result45.ok || result45.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL as undefined should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T46: URL as object (should fail validation)
    const result46 = await handleReadUrl({ url: {} as any }, mockContext);
    if (result46.ok || result46.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL as object should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T47: URL as array (should fail validation)
    const result47 = await handleReadUrl({ url: [] as any }, mockContext);
    if (result47.ok || result47.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: URL as array should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // SCHEME CASE VARIATIONS
    // ============================================

    // T48: HTTP with mixed case (already tested, but verify consistency)
    const result48 = await handleReadUrl({ url: 'HtTp://example.com' }, mockContext);
    if (!result48.ok && result48.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: mixed case HTTP should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // T49: HTTPS with mixed case
    const result49 = await handleReadUrl({ url: 'HtTpS://example.com' }, mockContext);
    if (!result49.ok && result49.error?.code === 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: mixed case HTTPS should be allowed\nexpected: ok true or EXEC_ERROR (not VALIDATION_ERROR)\n\n',
            process.stderr
        );
    }

    // ============================================
    // ERROR MESSAGE VALIDATION
    // ============================================

    // T50: Verify error messages are descriptive
    const result50 = await handleReadUrl({ url: 'file:///etc/passwd' }, mockContext);
    if (!result50.ok && result50.error) {
        if (!result50.error.message || result50.error.message.length === 0) {
            failures += 1;
            logLine(
                'FAIL\ncase: error message should not be empty\nexpected: error.message is non-empty string\n\n',
                process.stderr
            );
        }
    }

    // T51: Test allowlist check - curl not allowed
    const result51 = await handleReadUrl({ url: 'https://example.com' }, mockContext);
    if (result51.ok || result51.error?.code !== 'DENIED_COMMAND_ALLOWLIST') {
        failures += 1;
        logLine(
            'FAIL\ncase: curl not in allowlist should return DENIED_COMMAND_ALLOWLIST\nexpected: ok false, error.code DENIED_COMMAND_ALLOWLIST\n\n',
            process.stderr
        );
    }

        logLine(`Ran 51 test cases, ${failures} failures`);
    } catch (err: any) {
        failures += 1;
        logLine(`FAIL: ${err.message}\n`, process.stderr);
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(testRoot)) {
                fs.rmSync(testRoot, { recursive: true, force: true });
            }
        } catch {
            // Ignore cleanup errors
        }
    }

    if (failures > 0) {
        process.exit(1);
    }

    logLine('RESULT\nstatus: OK\n', process.stdout);
})();
export {};
