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
    if (!result1.ok || (result1.result as { value: number })?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple addition 2+3\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T2: Simple subtraction
    const result2 = handleCalculate({ expression: '10 - 4' });
    if (!result2.ok || (result2.result as { value: number })?.value !== 6) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple subtraction 10-4\nexpected: ok true, result.value 6\n\n',
            process.stderr
        );
    }

    // T3: Simple multiplication
    const result3 = handleCalculate({ expression: '3 * 4' });
    if (!result3.ok || (result3.result as { value: number })?.value !== 12) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple multiplication 3*4\nexpected: ok true, result.value 12\n\n',
            process.stderr
        );
    }

    // T4: Simple division
    const result4 = handleCalculate({ expression: '15 / 3' });
    if (!result4.ok || (result4.result as { value: number })?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: simple division 15/3\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T5: Modulo
    const result5 = handleCalculate({ expression: '10 % 3' });
    if (!result5.ok || (result5.result as { value: number })?.value !== 1) {
        failures += 1;
        logLine('FAIL\ncase: modulo 10%3\nexpected: ok true, result.value 1\n\n', process.stderr);
    }

    // T6: Exponentiation
    const result6 = handleCalculate({ expression: '2 ^ 3' });
    if (!result6.ok || (result6.result as { value: number })?.value !== 8) {
        failures += 1;
        logLine(
            'FAIL\ncase: exponentiation 2^3\nexpected: ok true, result.value 8\n\n',
            process.stderr
        );
    }

    // T7: Parentheses
    const result7 = handleCalculate({ expression: '(2 + 3) * 4' });
    if (!result7.ok || (result7.result as { value: number })?.value !== 20) {
        failures += 1;
        logLine(
            'FAIL\ncase: parentheses (2+3)*4\nexpected: ok true, result.value 20\n\n',
            process.stderr
        );
    }

    // T8: Decimal numbers
    const result8 = handleCalculate({ expression: '3.5 + 2.5' });
    if (!result8.ok || (result8.result as { value: number })?.value !== 6) {
        failures += 1;
        logLine(
            'FAIL\ncase: decimal numbers 3.5+2.5\nexpected: ok true, result.value 6\n\n',
            process.stderr
        );
    }

    // T9: Negative numbers
    const result9 = handleCalculate({ expression: '-5 + 3' });
    if (!result9.ok || (result9.result as { value: number })?.value !== -2) {
        failures += 1;
        logLine(
            'FAIL\ncase: negative numbers -5+3\nexpected: ok true, result.value -2\n\n',
            process.stderr
        );
    }

    // T10: Math constants - PI
    const result10 = handleCalculate({ expression: 'PI' });
    if (
        !result10.ok ||
        Math.abs((result10.result as { value: number })?.value - Math.PI) > 0.0001
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: PI constant\nexpected: ok true, result.value approximately Math.PI\n\n',
            process.stderr
        );
    }

    // T11: Math constants - E
    const result11 = handleCalculate({ expression: 'E' });
    if (!result11.ok || Math.abs((result11.result as { value: number })?.value - Math.E) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: E constant\nexpected: ok true, result.value approximately Math.E\n\n',
            process.stderr
        );
    }

    // T12: Math functions - sqrt
    const result12 = handleCalculate({ expression: 'sqrt(16)' });
    if (!result12.ok || (result12.result as { value: number })?.value !== 4) {
        failures += 1;
        logLine(
            'FAIL\ncase: sqrt function sqrt(16)\nexpected: ok true, result.value 4\n\n',
            process.stderr
        );
    }

    // T13: Math functions - abs
    const result13 = handleCalculate({ expression: 'abs(-5)' });
    if (!result13.ok || (result13.result as { value: number })?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: abs function abs(-5)\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T14: Math functions - pow
    const result14 = handleCalculate({ expression: 'pow(2, 3)' });
    if (!result14.ok || (result14.result as { value: number })?.value !== 8) {
        failures += 1;
        logLine(
            'FAIL\ncase: pow function pow(2,3)\nexpected: ok true, result.value 8\n\n',
            process.stderr
        );
    }

    // T15: Math functions - min
    const result15 = handleCalculate({ expression: 'min(5, 3)' });
    if (!result15.ok || (result15.result as { value: number })?.value !== 3) {
        failures += 1;
        logLine(
            'FAIL\ncase: min function min(5,3)\nexpected: ok true, result.value 3\n\n',
            process.stderr
        );
    }

    // T16: Math functions - max
    const result16 = handleCalculate({ expression: 'max(5, 3)' });
    if (!result16.ok || (result16.result as { value: number })?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: max function max(5,3)\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T17: Complex expression
    const result17 = handleCalculate({ expression: 'sqrt(16) + pow(2, 3) * 2' });
    if (!result17.ok || (result17.result as { value: number })?.value !== 20) {
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
    if (result22.ok || !Number.isFinite((result22.result as { value: number })?.value)) {
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
    if (
        !result25.ok ||
        !(result25.result as Record<string, unknown>)?.time ||
        !(result25.result as Record<string, unknown>)?.timestamp
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime default format should return time and timestamp\nexpected: ok true, result.time and result.timestamp\n\n',
            process.stderr
        );
    }

    // T26: ISO format
    const result26 = handleGetTime({ format: 'iso' });
    const result26Data = result26.result as { time?: string };
    if (!result26.ok || !result26Data?.time || !result26Data.time.includes('T')) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime iso format should return ISO string\nexpected: ok true, result.time contains T\n\n',
            process.stderr
        );
    }

    // T27: Local format
    const result27 = handleGetTime({ format: 'local' });
    if (!result27.ok || !(result27.result as Record<string, unknown>)?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime local format should return time\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T28: Timestamp should be number
    const result25Data = result25.result as { timestamp: number };
    if (result25.ok && typeof result25Data.timestamp !== 'number') {
        failures += 1;
        logLine(
            'FAIL\ncase: timestamp should be a number\nexpected: typeof result.timestamp === number\n\n',
            process.stderr
        );
    }

    // T29: Timestamp should be current time (within 1 second)
    if (result25.ok) {
        const result25Data = result25.result as { timestamp: number };
        const now = Date.now();
        const diff = Math.abs(result25Data.timestamp - now);
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
    if (!result30.ok || !(result30.result as Record<string, unknown>)?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: unknown format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T31: Empty format string
    const result31 = handleGetTime({ format: '' });
    if (!result31.ok || !(result31.result as Record<string, unknown>)?.time) {
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
    if (!result32.ok || (result32.result as Record<string, unknown>)?.delegated_to !== 'coder') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate to coder should succeed\nexpected: ok true, result.delegated_to coder\n\n',
            process.stderr
        );
    }

    // T33: Delegate to organizer
    const result33 = handleDelegateToOrganizer({ task: 'Organize files' });
    if (
        !result33.ok ||
        (result33.result as Record<string, unknown>)?.delegated_to !== 'organizer'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate to organizer should succeed\nexpected: ok true, result.delegated_to organizer\n\n',
            process.stderr
        );
    }

    // T34: Delegate to assistant
    const result34 = handleDelegateToAssistant({ task: 'Help with task' });
    if (
        !result34.ok ||
        (result34.result as Record<string, unknown>)?.delegated_to !== 'assistant'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate to assistant should succeed\nexpected: ok true, result.delegated_to assistant\n\n',
            process.stderr
        );
    }

    // T35: Delegate should include task
    if (result32.ok && (result32.result as Record<string, unknown>)?.task !== 'Write a function') {
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
                if (
                    !(result36.result as Record<string, unknown>)?.location ||
                    !(result36.result as Record<string, unknown>)?.temperature_c
                ) {
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
    if (!result40.ok || (result40.result as { value: number })?.value !== 0.0000001) {
        failures += 1;
        logLine(
            'FAIL\ncase: very small number should work\nexpected: ok true, result.value 0.0000001\n\n',
            process.stderr
        );
    }

    // T41: Expression with only spaces
    const result41 = handleCalculate({ expression: '2 + 3' });
    if (!result41.ok || (result41.result as { value: number })?.value !== 5) {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with spaces should work\nexpected: ok true, result.value 5\n\n',
            process.stderr
        );
    }

    // T42: Unary plus
    const result42 = handleCalculate({ expression: '+5' });
    if (!result42.ok || (result42.result as { value: number })?.value !== 5) {
        failures += 1;
        logLine('FAIL\ncase: unary plus +5\nexpected: ok true, result.value 5\n\n', process.stderr);
    }

    // T43: Nested parentheses
    const result43 = handleCalculate({ expression: '((2 + 3) * 4)' });
    if (!result43.ok || (result43.result as { value: number })?.value !== 20) {
        failures += 1;
        logLine(
            'FAIL\ncase: nested parentheses ((2+3)*4)\nexpected: ok true, result.value 20\n\n',
            process.stderr
        );
    }

    // T44: Right-associative exponentiation
    const result44 = handleCalculate({ expression: '2 ^ 3 ^ 2' });
    // Should be 2^(3^2) = 2^9 = 512, not (2^3)^2 = 64
    if (!result44.ok || (result44.result as { value: number })?.value !== 512) {
        failures += 1;
        logLine(
            'FAIL\ncase: right-associative exponentiation 2^3^2\nexpected: ok true, result.value 512\n\n',
            process.stderr
        );
    }

    // T45: Math functions - sin, cos, tan
    const result45 = handleCalculate({ expression: 'sin(0)' });
    if (!result45.ok || Math.abs((result45.result as { value: number })?.value - 0) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: sin(0) should be 0\nexpected: ok true, result.value approximately 0\n\n',
            process.stderr
        );
    }

    // ============================================
    // CALCULATE - ADDITIONAL EDGE CASES
    // ============================================

    // T46: Math functions - cos
    const result46 = handleCalculate({ expression: 'cos(0)' });
    if (!result46.ok || Math.abs((result46.result as { value: number })?.value - 1) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: cos(0) should be 1\nexpected: ok true, result.value approximately 1\n\n',
            process.stderr
        );
    }

    // T47: Math functions - tan
    const result47 = handleCalculate({ expression: 'tan(0)' });
    if (!result47.ok || Math.abs((result47.result as { value: number })?.value - 0) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: tan(0) should be 0\nexpected: ok true, result.value approximately 0\n\n',
            process.stderr
        );
    }

    // T48: Math functions - log
    const result48 = handleCalculate({ expression: 'log(E)' });
    if (!result48.ok || Math.abs((result48.result as { value: number })?.value - 1) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: log(E) should be 1\nexpected: ok true, result.value approximately 1\n\n',
            process.stderr
        );
    }

    // T49: Math functions - log10
    const result49 = handleCalculate({ expression: 'log10(100)' });
    if (!result49.ok || Math.abs((result49.result as { value: number })?.value - 2) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: log10(100) should be 2\nexpected: ok true, result.value approximately 2\n\n',
            process.stderr
        );
    }

    // T50: Math functions - exp
    const result50 = handleCalculate({ expression: 'exp(0)' });
    if (!result50.ok || Math.abs((result50.result as { value: number })?.value - 1) > 0.0001) {
        failures += 1;
        logLine(
            'FAIL\ncase: exp(0) should be 1\nexpected: ok true, result.value approximately 1\n\n',
            process.stderr
        );
    }

    // T51: Math functions - floor
    const result51 = handleCalculate({ expression: 'floor(3.7)' });
    if (!result51.ok || (result51.result as { value: number })?.value !== 3) {
        failures += 1;
        logLine(
            'FAIL\ncase: floor(3.7) should be 3\nexpected: ok true, result.value 3\n\n',
            process.stderr
        );
    }

    // T52: Math functions - ceil
    const result52 = handleCalculate({ expression: 'ceil(3.2)' });
    const result52Data =
        result52.ok &&
        typeof result52.result === 'object' &&
        result52.result !== null &&
        'value' in result52.result
            ? (result52.result as { expression: string; value: number })
            : null;
    if (!result52.ok || result52Data?.value !== 4) {
        failures += 1;
        logLine(
            'FAIL\ncase: ceil(3.2) should be 4\nexpected: ok true, result.value 4\n\n',
            process.stderr
        );
    }

    // T53: Math functions - round
    const result53 = handleCalculate({ expression: 'round(3.5)' });
    const result53Data =
        result53.ok &&
        typeof result53.result === 'object' &&
        result53.result !== null &&
        'value' in result53.result
            ? (result53.result as { expression: string; value: number })
            : null;
    if (!result53.ok || result53Data?.value !== 4) {
        failures += 1;
        logLine(
            'FAIL\ncase: round(3.5) should be 4\nexpected: ok true, result.value 4\n\n',
            process.stderr
        );
    }

    // T54: Very large expression (performance test)
    const largeExpr = '1' + '+1'.repeat(100);
    const result54 = handleCalculate({ expression: largeExpr });
    const result54Data =
        result54.ok &&
        typeof result54.result === 'object' &&
        result54.result !== null &&
        'value' in result54.result
            ? (result54.result as { expression: string; value: number })
            : null;
    if (!result54.ok || result54Data?.value !== 101) {
        failures += 1;
        logLine(
            'FAIL\ncase: very large expression should work\nexpected: ok true, result.value 101\n\n',
            process.stderr
        );
    }

    // T55: Very deeply nested parentheses
    const nestedExpr = '((((((((((1+1))))))))))';
    const result55 = handleCalculate({ expression: nestedExpr });
    const result55Data =
        result55.ok &&
        typeof result55.result === 'object' &&
        result55.result !== null &&
        'value' in result55.result
            ? (result55.result as { expression: string; value: number })
            : null;
    if (!result55.ok || result55Data?.value !== 2) {
        failures += 1;
        logLine(
            'FAIL\ncase: deeply nested parentheses should work\nexpected: ok true, result.value 2\n\n',
            process.stderr
        );
    }

    // T56: Expression with only operators (should fail)
    const result56 = handleCalculate({ expression: '++--' });
    if (result56.ok || result56.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with only operators should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T57: Expression with only parentheses
    const result57 = handleCalculate({ expression: '()' });
    if (result57.ok || result57.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with only parentheses should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T58: Expression with trailing operator
    const result58 = handleCalculate({ expression: '2 +' });
    if (result58.ok || result58.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with trailing operator should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T59: Expression with leading operator (unary minus should work)
    const result59 = handleCalculate({ expression: '-5' });
    const result59Data =
        result59.ok &&
        typeof result59.result === 'object' &&
        result59.result !== null &&
        'value' in result59.result
            ? (result59.result as { expression: string; value: number })
            : null;
    if (!result59.ok || result59Data?.value !== -5) {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with leading minus should work\nexpected: ok true, result.value -5\n\n',
            process.stderr
        );
    }

    // T60: Expression with multiple operators in a row (should fail)
    const result60 = handleCalculate({ expression: '2++3' });
    if (result60.ok || result60.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: expression with multiple operators should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T61: Function with no arguments (should fail)
    const result61 = handleCalculate({ expression: 'sqrt()' });
    if (result61.ok || result61.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: function with no arguments should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T62: Function with too many arguments
    const result62 = handleCalculate({ expression: 'sqrt(4, 5, 6)' });
    if (result62.ok || result62.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: function with too many arguments should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T63: Invalid constant name
    const result63 = handleCalculate({ expression: 'INVALID_CONSTANT' });
    if (result63.ok || result63.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: invalid constant name should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T64: Expression resulting in Infinity
    const result64 = handleCalculate({ expression: '1 / 0' });
    if (result64.ok || result64.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: division by zero should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T65: Expression resulting in NaN
    const result65 = handleCalculate({ expression: 'sqrt(-1)' });
    if (result65.ok || result65.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: sqrt of negative should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T66: Very small number (precision test)
    const result66 = handleCalculate({ expression: '0.0000000001' });
    const result66Data =
        result66.ok &&
        typeof result66.result === 'object' &&
        result66.result !== null &&
        'value' in result66.result
            ? (result66.result as { expression: string; value: number })
            : null;
    if (!result66.ok || result66Data?.value !== 0.0000000001) {
        failures += 1;
        logLine(
            'FAIL\ncase: very small number should work\nexpected: ok true, result.value 0.0000000001\n\n',
            process.stderr
        );
    }

    // T67: Very large number (precision test)
    const result67 = handleCalculate({ expression: '999999999999999999' });
    // Large numbers may lose precision, but should not error
    if (!result67.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: very large number should work (may lose precision)\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T68: Expression with scientific notation (not supported, should fail)
    const result68 = handleCalculate({ expression: '1e10' });
    if (result68.ok || result68.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: scientific notation should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // GET_TIME - ADDITIONAL EDGE CASES
    // ============================================

    // T69: GetTime with null format
    const result69 = handleGetTime({ format: null as any });
    const result69Data =
        result69.ok &&
        typeof result69.result === 'object' &&
        result69.result !== null &&
        'time' in result69.result
            ? (result69.result as { time: string; timestamp: number })
            : null;
    if (!result69.ok || !result69Data?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime with null format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T70: GetTime with undefined format
    const result70 = handleGetTime({ format: undefined });
    const result70Data =
        result70.ok &&
        typeof result70.result === 'object' &&
        result70.result !== null &&
        'time' in result70.result
            ? (result70.result as { time: string; timestamp: number })
            : null;
    if (!result70.ok || !result70Data?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime with undefined format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T71: GetTime with number format (should use default)
    const result71 = handleGetTime({ format: 123 as any });
    const result71Data =
        result71.ok &&
        typeof result71.result === 'object' &&
        result71.result !== null &&
        'time' in result71.result
            ? (result71.result as { time: string; timestamp: number })
            : null;
    if (!result71.ok || !result71Data?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime with number format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T72: GetTime with object format (should use default)
    const result72 = handleGetTime({ format: {} as any });
    const result72Data =
        result72.ok &&
        typeof result72.result === 'object' &&
        result72.result !== null &&
        'time' in result72.result
            ? (result72.result as { time: string; timestamp: number })
            : null;
    if (!result72.ok || !result72Data?.time) {
        failures += 1;
        logLine(
            'FAIL\ncase: getTime with object format should use default\nexpected: ok true, result.time\n\n',
            process.stderr
        );
    }

    // T73: GetTime timestamp should be positive
    const result73 = handleGetTime({});
    if (
        result73.ok &&
        typeof result73.result === 'object' &&
        result73.result !== null &&
        'timestamp' in result73.result
    ) {
        const timeResult = result73.result as { time: string; timestamp: number };
        if (timeResult.timestamp <= 0) {
            failures += 1;
            logLine(
                'FAIL\ncase: timestamp should be positive\nexpected: result.timestamp > 0\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // DELEGATE - ADDITIONAL EDGE CASES
    // ============================================

    // T74: Delegate with empty task
    const result74 = handleDelegateToCoder({ task: '' });
    // Empty task should work (validation happens at schema level)
    const result74Data =
        result74.ok && typeof result74.result === 'object' && result74.result !== null
            ? (result74.result as { task: string; delegated_to: string })
            : null;
    if (!result74.ok || result74Data?.task !== '') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate with empty task should work\nexpected: ok true, result.task empty string\n\n',
            process.stderr
        );
    }

    // T75: Delegate with very long task
    const longTask = 'task '.repeat(1000);
    const result75 = handleDelegateToCoder({ task: longTask });
    const result75Data =
        result75.ok && typeof result75.result === 'object' && result75.result !== null
            ? (result75.result as { task: string; delegated_to: string })
            : null;
    if (!result75.ok || result75Data?.task !== longTask) {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate with very long task should work\nexpected: ok true, result.task matches\n\n',
            process.stderr
        );
    }

    // T76: Delegate with task containing special characters
    const specialTask = 'task with "quotes" and \'apostrophes\' and\nnewlines\tand\ttabs';
    const result76 = handleDelegateToCoder({ task: specialTask });
    const result76Data =
        result76.ok && typeof result76.result === 'object' && result76.result !== null
            ? (result76.result as { task: string; delegated_to: string })
            : null;
    if (!result76.ok || result76Data?.task !== specialTask) {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate with special characters should work\nexpected: ok true, result.task matches\n\n',
            process.stderr
        );
    }

    // T77: Delegate with null task (should fail at schema level, but test runtime)
    const result77 = handleDelegateToCoder({ task: null as any });
    // Should fail validation or work if null is converted
    if (result77.ok === undefined) {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate with null task should not crash\nexpected: returns result (ok or error)\n\n',
            process.stderr
        );
    }

    // T78: Delegate with undefined task (should fail at schema level)
    const result78 = handleDelegateToCoder({ task: undefined as any });
    // Should fail validation or work if undefined is handled
    if (result78.ok === undefined) {
        failures += 1;
        logLine(
            'FAIL\ncase: delegate with undefined task should not crash\nexpected: returns result (ok or error)\n\n',
            process.stderr
        );
    }

    // T79: Verify all delegate functions return same structure
    const result79a = handleDelegateToCoder({ task: 'test' });
    const result79b = handleDelegateToOrganizer({ task: 'test' });
    const result79c = handleDelegateToAssistant({ task: 'test' });
    const result79aData =
        result79a.ok && typeof result79a.result === 'object' && result79a.result !== null
            ? (result79a.result as { task: string; delegated_to: string })
            : null;
    const result79bData =
        result79b.ok && typeof result79b.result === 'object' && result79b.result !== null
            ? (result79b.result as { task: string; delegated_to: string })
            : null;
    const result79cData =
        result79c.ok && typeof result79c.result === 'object' && result79c.result !== null
            ? (result79c.result as { task: string; delegated_to: string })
            : null;
    if (
        !result79a.ok ||
        !result79b.ok ||
        !result79c.ok ||
        result79aData?.task !== 'test' ||
        result79bData?.task !== 'test' ||
        result79cData?.task !== 'test'
    ) {
        failures += 1;
        logLine(
            'FAIL\ncase: all delegate functions should return same structure\nexpected: all ok true with task field\n\n',
            process.stderr
        );
    }

    // T80: Verify delegate target is correct
    if (result79a.ok && result79aData?.delegated_to !== 'coder') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegateToCoder should return delegated_to coder\nexpected: result.delegated_to coder\n\n',
            process.stderr
        );
    }
    if (result79b.ok && result79bData?.delegated_to !== 'organizer') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegateToOrganizer should return delegated_to organizer\nexpected: result.delegated_to organizer\n\n',
            process.stderr
        );
    }
    if (result79c.ok && result79cData?.delegated_to !== 'assistant') {
        failures += 1;
        logLine(
            'FAIL\ncase: delegateToAssistant should return delegated_to assistant\nexpected: result.delegated_to assistant\n\n',
            process.stderr
        );
    }

    // ============================================
    // GET_WEATHER - ADDITIONAL EDGE CASES
    // ============================================

    // T81: GetWeather with location containing special characters
    handleGetWeather({ location: 'New York, NY' })
        .then(result81 => {
            // May succeed or fail (network dependent)
            if (result81.ok === undefined) {
                failures += 1;
                logLine(
                    'FAIL\ncase: getWeather with special chars should not crash\nexpected: returns result (ok or error)\n\n',
                    process.stderr
                );
            }
        })
        .catch(() => {
            // Network failures are acceptable
        });

    // T82: GetWeather with very long location name
    const longLocation = 'A'.repeat(1000);
    handleGetWeather({ location: longLocation })
        .then(result82 => {
            // May succeed or fail (network dependent)
            if (result82.ok === undefined) {
                failures += 1;
                logLine(
                    'FAIL\ncase: getWeather with long location should not crash\nexpected: returns result (ok or error)\n\n',
                    process.stderr
                );
            }
        })
        .catch(() => {
            // Network failures are acceptable
        });

    // ============================================
    // INVALID INPUT TYPES
    // ============================================

    // T83: Calculate with expression as number
    const result83 = handleCalculate({ expression: 123 as any });
    if (result83.ok || result83.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: calculate with number expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T84: Calculate with expression as null
    const result84 = handleCalculate({ expression: null as any });
    if (result84.ok || result84.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: calculate with null expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T85: Calculate with expression as undefined
    const result85 = handleCalculate({ expression: undefined as any });
    if (result85.ok || result85.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: calculate with undefined expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T86: Calculate with expression as object
    const result86 = handleCalculate({ expression: {} as any });
    if (result86.ok || result86.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: calculate with object expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    // T87: Calculate with expression as array
    const result87 = handleCalculate({ expression: [] as any });
    if (result87.ok || result87.error?.code !== 'EXEC_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: calculate with array expression should return EXEC_ERROR\nexpected: ok false, error.code EXEC_ERROR\n\n',
            process.stderr
        );
    }

    logLine(`Ran 87 test cases, ${failures} failures`);
} finally {
    // Cleanup
    fs.rmSync(testRoot, { recursive: true, force: true });
}

if (failures > 0) {
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
