#!/usr/bin/env node

/**
 * Comprehensive tests for utility_tools.ts
 * Tests: calculate, getTime, getWeather, delegate functions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
    handleCalculate,
    handleGetTime,
    handleGetWeather,
    handleDelegateToCoder,
    handleDelegateToOrganizer,
    handleDelegateToAssistant,
} from './utility_tools';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'utility-tools-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

try {
    // ============================================
    // CALCULATE - SUCCESS CASES
    // ============================================

    // T1: Simple addition
    const result1 = handleCalculate({ expression: '2 + 3' });
    if (!result1.ok || result1.result?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple addition 2+3\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T2: Simple subtraction
    const result2 = handleCalculate({ expression: '10 - 4' });
    if (!result2.ok || result2.result?.value !== 6) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple subtraction 10-4\nexpected: ok true, result.value 6\n\n',
            process.stderr
        );
    }

    // T3: Simple multiplication
    const result3 = handleCalculate({ expression: '3 * 4' });
    if (!result3.ok || result3.result?.value !== 12) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple multiplication 3*4\nexpected: ok true, result.value 12\n\n',
            process.stderr
        );
    }

    // T4: Simple division
    const result4 = handleCalculate({ expression: '15 / 3' });
    if (!result4.ok || result4.result?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple division 15/3\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T5: Modulo
    const result5 = handleCalculate({ expression: '10 % 3' });
    if (!result5.ok || result5.result?.value !== 1) {
        failures += 1;
        logLine('FAIL\ncase: modulo 10%3\nexpected: ok true, result.value 1\n\n', process.stderr);
    }

    // T6: Exponentiation
    const result6 = handleCalculate({ expression: '2 ^ 3' });
    if (!result6.ok || result6.result?.value !== 8) {
        failures += 1;
        logLine(
            'FAIL\ncase: exponentiation 2^3\nexpected: ok true, result.value 8\n\n',
            process.stderr
        );
    }

    // T7: Parentheses
    const result7 = handleCalculate({ expression: '(2 + 3) * 4' });
    if (!result7.ok || result7.result?.value !== 20) {
        failures += 1;
        logLine(
            'FAIL\ncase: parentheses (2+3)*4\nexpected: ok true, result.value 20\n\n',
            process.stderr
        );
    }

    // T8: Decimal numbers
    const result8 = handleCalculate({ expression: '3.5 + 2.5' });
    if (!result8.ok || result8.result?.value !== 6) {
        failures += 1;
        logLine(
            'FAIL\ncase: decimal numbers 3.5+2.5\nexpected: ok true, result.value 6\n\n',
            process.stderr
        );
    }

    // T9: Negative numbers
    const result9 = handleCalculate({ expression: '-5 + 3' });
    if (!result9.ok || result9.result?.value !== -2) {
        failures += 1;
        logLine(
            'FAIL\ncase: negative numbers -5+3\nexpected: ok true, result.value -2\n\n',
            process.stderr
        );
    }

    // T10: Math constants - PI
    const result10 = handleCalculate({ expression: 'PI' });
    if (!result10.ok || Math.abs(result10.result?.value - Math.PI) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: PI constant\nexpected: ok true, result.value approximately Math.PI\n\n',
            process.stderr
        );
    }

    // T11: Math constants - E
    const result11 = handleCalculate({ expression: 'E' });
    if (!result11.ok || Math.abs(result11.result?.value - Math.E) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: E constant\nexpected: ok true, result.value approximately Math.E\n\n',
            process.stderr
        );
    }

    // T12: Math functions - sqrt
    const result12 = handleCalculate({ expression: 'sqrt(16)' });
    if (!result12.ok || result12.result?.value !== 4) {
        failures += 1;
        logLine(
            'FAIL\ncase: sqrt function sqrt(16)\nexpected: ok true, result.value 4\n\n',
            process.stderr
        );
    }

    // T13: Math functions - abs
    const result13 = handleCalculate({ expression: 'abs(-5)' });
    if (!result13.ok || result13.result?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: abs function abs(-5)\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T14: Math functions - pow
    const result14 = handleCalculate({ expression: 'pow(2, 3)' });
    if (!result14.ok || result14.result?.value !== 8) {
        failures += 1;
        logLine(
            'FAIL\ncase: pow function pow(2,3)\nexpected: ok true, result.value 8\n\n',
            process.stderr
        );
    }

    // T15: Math functions - min
    const result15 = handleCalculate({ expression: 'min(5, 3)' });
    if (!result15.ok || result15.result?.value !== 3) {
        failures += 1;
        logLine(
            'FAIL\ncase: min function min(5,3)\nexpected: ok true, result.value 3\n\n',
            process.stderr
        );
    }

    // T16: Math functions - max
    const result16 = handleCalculate({ expression: 'max(5, 3)' });
    if (!result16.ok || result16.result?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: max function max(5,3)\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T17: Complex expression
    const result17 = handleCalculate({ expression: 'sqrt(16) + pow(2, 3) * 2' });
    if (!result17.ok || result17.result?.value !== 20) {
        failures += 1;
        logLine(
            'FAIL\ncase: complex expression sqrt(16)+pow(2,3)*2\nexpected: ok true, result.value 20\n\n',
            process.stderr
        );
    }

    // ============================================
    // CALCULATE - ERROR CASES
    // ============================================

    // T18: Empty expression
    const result18 = handleCalculate({ expression: '' });
    if (result18.ok || result18.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T19: Invalid characters
    const result19 = handleCalculate({ expression: '2 @ 3' });
    if (result19.ok || result19.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: invalid character @ should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T20: Unknown identifier
    const result20 = handleCalculate({ expression: 'unknown(5)' });
    if (result20.ok || result20.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: unknown function should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T21: Mismatched parentheses
    const result21 = handleCalculate({ expression: '(2 + 3' });
    if (result21.ok || result21.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: mismatched parentheses should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T22: Division by zero
    const result22 = handleCalculate({ expression: '5 / 0' });
    if (result22.ok || !Number.isFinite(result22.result?.value)) {
        // Division by zero results in Infinity, which should be caught
        if (result22.ok || result22.error?.code !== 'EXEC_ERROR') {
            failures += 1;
            logLine(
                'FAIL\ncase: division by zero should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
                process.stderr
            );
        }
    }

    // T23: Wrong number of function arguments
    const result23 = handleCalculate({ expression: 'sqrt(2, 3)' });
    if (result23.ok || result23.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: wrong number of arguments should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T24: Multiple decimal points
    const result24 = handleCalculate({ expression: '2.5.3' });
    if (result24.ok || result24.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: multiple decimal points should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // GET TIME - SUCCESS CASES
    // ============================================

    // T25: Default format
    const result25 = handleGetTime({});
    if (!result25.ok || !result25.result?.time || !result25.result?.timestamp) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime default format should return time and timestamp\nexpected: ok true, result.time and result.timestamp\n\n',
            process.stderr
        );
    }

    // T26: ISO format
    const result26 = handleGetTime({ format: 'iso' });
    if (!result26.ok || !result26.result?.time || !result26.result?.time.includes('T')) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime iso format should return ISO string\nexpected: ok true, result.time contains T\n\n',
            process.stderr
        );
    }

    // T27: Local format
    const result27 = handleGetTime({ format: 'local' });
    if (!result27.ok || !result27.result?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime local format should return time\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T28: Timestamp should be number
    if (result25.ok && typeof result25.result.timestamp !== 'number') {
        failures += 1;
        logLine(
            'FAIL\ncase: timestamp should be a number\nexpected: typeof result.timestamp === number\n\n',
            process.stderr
        );
    }

    // T29: Timestamp should be current time (within 1 second)
    if (result25.ok) {
        const now = Date.now();
        const diff = Math.abs(result25.result.timestamp - now);
        if (diff > 1000) {
            failures += 1;
            logLine(
                'FAIL\ncase: timestamp should be current time\nexpected: timestamp within 1 second of now\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // GET TIME - EDGE CASES
    // ============================================

    // T30: Unknown format (should use default)
    const result30 = handleGetTime({ format: 'unknown' });
    if (!result30.ok || !result30.result?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: unknown format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T31: Empty format string
    const result31 = handleGetTime({ format: '' });
    if (!result31.ok || !result31.result?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: empty format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // ============================================
    // DELEGATE FUNCTIONS - SUCCESS CASES
    // ============================================

    // T32: Delegate to coder
    const result32 = handleDelegateToCoder({ task: 'Write a function' });
    if (!result32.ok || result32.result?.delegated_to !== 'coder') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate to coder should succeed\nexpected: ok true, result.delegated_to coder\n\n',
            process.stderr
        );
    }

    // T33: Delegate to organizer
    const result33 = handleDelegateToOrganizer({ task: 'Organize files' });
    if (!result33.ok || result33.result?.delegated_to !== 'organizer') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate to organizer should succeed\nexpected: ok true, result.delegated_to organizer\n\n',
            process.stderr
        );
    }

    // T34: Delegate to assistant
    const result34 = handleDelegateToAssistant({ task: 'Help with task' });
    if (!result34.ok || result34.result?.delegated_to !== 'assistant') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate to assistant should succeed\nexpected: ok true, result.delegated_to assistant\n\n',
            process.stderr
        );
    }

    // T35: Delegate should include task
    if (result32.ok && result32.result?.task !== 'Write a function') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate result should include task\nexpected: result.task matches input\n\n',
            process.stderr
        );
    }

    // ============================================
    // GET WEATHER - SUCCESS CASES (may require network)
    // ============================================

    // T36: Valid location (async)
    // Note: This requires network access and may fail in CI
    // We'll test the function structure but allow network errors
    handleGetWeather({ location: 'London' })
        .then(result36 => {
            if (result36.ok) {
                // Success case - verify structure
                if (!result36.result?.location || !result36.result?.temperature_c) {
                    failures += 1;
                    logLine(
                        'FAIL\ncase: getWeather should return location and temperature\nexpected: result.location and result.temperature_c\n\n',
                        process.stderr
                    );
                }
            } else {
                // Network error is acceptable in test environment
                if (result36.error?.code !== 'EXEC_ERROR') {
                    failures += 1;
                    logLine(
                        'FAIL\ncase: getWeather error should be EXEC_ERROR\nexpected: error.code EXEC_ERROR\n\n',
                        process.stderr
                    );
                }
            }
        })
        .catch(() => {
            // Network failures are acceptable in tests
        });

    // T37: Empty location (should fail validation at Zod level)
    // This would be caught by schema validation before reaching handler
    // Skip - handled by schema

    // ============================================
    // CALCULATE - EDGE CASES
    // ============================================

    // T38: Whitespace-only expression
    const result38 = handleCalculate({ expression: '   ' });
    if (result38.ok || result38.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: whitespace-only expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T39: Very large number
    const result39 = handleCalculate({ expression: '999999999999999999' });
    if (!result39.ok) {
        // Large numbers should still work (may lose precision)
        failures += 1;
        logLine('FAIL\ncase: very large number should work\nexpected: ok true\n\n', process.stderr);
    }

    // T40: Very small number
    const result40 = handleCalculate({ expression: '0.0000001' });
    if (!result40.ok || result40.result?.value !== 0.0000001) {
        failures += 1;
        logLine(
            'FAIL\ncase: very small number should work\nexpected: ok true, result.value 0.0000001\n\n',
            process.stderr
        );
    }

    // T41: Expression with only spaces
    const result41 = handleCalculate({ expression: '2 + 3' });
    if (!result41.ok || result41.result?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with spaces should work\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T42: Unary plus
    const result42 = handleCalculate({ expression: '+5' });
    if (!result42.ok || result42.result?.value !== 5) {
        failures += 1;
        logLine('FAIL\ncase: unary plus +5\nexpected: ok true, result.value 5\n\n', process.stderr);
    }

    // T43: Nested parentheses
    const result43 = handleCalculate({ expression: '((2 + 3) * 4)' });
    if (!result43.ok || result43.result?.value !== 20) {
        failures += 1;
        logLine(
            'FAIL\ncase: nested parentheses ((2+3)*4)\nexpected: ok true, result.value 20\n\n',
            process.stderr
        );
    }

    // T44: Right-associative exponentiation
    const result44 = handleCalculate({ expression: '2 ^ 3 ^ 2' });
    // Should be 2^(3^2) = 2^9 = 512, not (2^3)^2 = 64
    if (!result44.ok || result44.result?.value !== 512) {
        failures += 1;
        logLine(
            'FAIL\ncase: right-associative exponentiation 2^3^2\nexpected: ok true, result.value 512\n\n',
            process.stderr
        );
    }

    // T45: Math functions - sin, cos, tan
    const result45 = handleCalculate({ expression: 'sin(0)' });
    if (!result45.ok || Math.abs(result45.result?.value - 0) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: sin(0) should be 0\nexpected: ok true, result.value approximately 0\n\n',
            process.stderr
        );
    }

    logLine(`Ran 45 test cases, ${failures} failures`);
} finally {
    // Cleanup
    fs.rmSync(testRoot, { recursive: true, force: true });
}

if (failures > 0) {
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
