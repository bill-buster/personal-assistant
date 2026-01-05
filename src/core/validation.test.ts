#!/usr/bin/env node

/**
 * Comprehensive tests for validation.ts
 * Tests: validateInput, validatePath, validateCommand, validateToolArgs, formatValidationError
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';
import {
    validateInput,
    validatePath,
    validateCommand,
    validateToolArgs,
    formatValidationError,
} from './validation';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

try {
    // ============================================
    // VALIDATE INPUT - SUCCESS CASES
    // ============================================

    // T1: Valid string input
    const result1 = validateInput('hello world');
    if (!result1.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid string input should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T2: Long but valid input (under limit)
    const longInput = 'x'.repeat(9999);
    const result2 = validateInput(longInput);
    if (!result2.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: long but valid input should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T3: Input with special characters
    const result3 = validateInput('hello@world.com');
    if (!result3.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: input with special characters should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T4: Input with newlines
    const result4 = validateInput('line1\nline2\nline3');
    if (!result4.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: input with newlines should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE INPUT - ERROR CASES
    // ============================================

    // T5: Empty string
    const result5 = validateInput('');
    if (result5.ok || result5.error?.code !== 'INPUT_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty string should return INPUT_ERROR\nexpected: ok false, error.code INPUT_ERROR\n\n',
            process.stderr
        );
    }

    // T6: Whitespace-only string
    const result6 = validateInput('   ');
    if (result6.ok || result6.error?.code !== 'INPUT_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: whitespace-only string should return INPUT_ERROR\nexpected: ok false, error.code INPUT_ERROR\n\n',
            process.stderr
        );
    }

    // T7: Input exceeds maximum length
    const tooLongInput = 'x'.repeat(10001);
    const result7 = validateInput(tooLongInput);
    if (result7.ok || result7.error?.code !== 'INPUT_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: input exceeding max length should return INPUT_ERROR\nexpected: ok false, error.code INPUT_ERROR\n\n',
            process.stderr
        );
    }

    // T8: Null input (runtime check)
    const result8 = validateInput(null as any);
    if (result8.ok || result8.error?.code !== 'INPUT_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: null input should return INPUT_ERROR\nexpected: ok false, error.code INPUT_ERROR\n\n',
            process.stderr
        );
    }

    // T9: Non-string input
    const result9 = validateInput(123 as any);
    if (result9.ok || result9.error?.code !== 'INPUT_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: non-string input should return INPUT_ERROR\nexpected: ok false, error.code INPUT_ERROR\n\n',
            process.stderr
        );
    }

    // T10: Undefined input
    const result10 = validateInput(undefined as any);
    if (result10.ok || result10.error?.code !== 'INPUT_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: undefined input should return INPUT_ERROR\nexpected: ok false, error.code INPUT_ERROR\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE PATH - SUCCESS CASES
    // ============================================

    // T11: Valid relative path
    const result11 = validatePath('file.txt');
    if (!result11.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid relative path should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T12: Valid relative path with subdirectory
    const result12 = validatePath('subdir/file.txt');
    if (!result12.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid relative path with subdirectory should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T13: Valid path with multiple levels
    const result13 = validatePath('a/b/c/file.txt');
    if (!result13.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid multi-level path should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE PATH - ERROR CASES
    // ============================================

    // T14: Path with path traversal
    const result14 = validatePath('../file.txt');
    if (result14.ok || result14.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: path with .. should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T15: Path with path traversal in middle
    const result15 = validatePath('a/../b/file.txt');
    if (result15.ok || result15.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: path with .. in middle should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T16: Absolute Unix path
    const result16 = validatePath('/etc/passwd');
    if (result16.ok || result16.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: absolute Unix path should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T17: Absolute Windows path (drive letter)
    const result17 = validatePath('C:\\Windows\\System32');
    if (result17.ok || result17.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: absolute Windows path should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T18: Empty path
    const result18 = validatePath('');
    if (result18.ok || result18.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty path should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T19: Null path
    const result19 = validatePath(null as any);
    if (result19.ok || result19.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: null path should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T20: Non-string path
    const result20 = validatePath(123 as any);
    if (result20.ok || result20.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: non-string path should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T21: Path field should be set in error
    if (!result14.ok && result14.error && !result14.error.field) {
        failures += 1;
        logLine(
            'FAIL\ncase: path error should include field\nexpected: error.field === path\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE COMMAND - SUCCESS CASES
    // ============================================

    // T22: Valid simple command
    const result22 = validateCommand('ls');
    if (!result22.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid simple command should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T23: Valid command with arguments
    const result23 = validateCommand('git status');
    if (!result23.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid command with arguments should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T24: Valid command with flags
    const result24 = validateCommand('npm install --save-dev');
    if (!result24.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid command with flags should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE COMMAND - ERROR CASES
    // ============================================

    // T25: Command with semicolon (shell metacharacter)
    const result25 = validateCommand('ls; rm -rf /');
    if (result25.ok || result25.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with semicolon should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T26: Command with pipe
    const result26 = validateCommand('ls | grep test');
    if (result26.ok || result26.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with pipe should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T27: Command with backtick
    const result27 = validateCommand('ls `echo test`');
    if (result27.ok || result27.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with backtick should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T28: Command with dollar sign
    const result28 = validateCommand('echo $HOME');
    if (result28.ok || result28.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with dollar sign should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T29: Command with path traversal
    const result29 = validateCommand('cat ../file.txt');
    if (result29.ok || result29.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with .. should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T30: Command with recursive flag
    const result30 = validateCommand('rm -rf /');
    if (result30.ok || result30.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with recursive flag should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    // T31: Empty command
    const result31 = validateCommand('');
    if (result31.ok || result31.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty command should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T32: Null command
    const result32 = validateCommand(null as any);
    if (result32.ok || result32.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: null command should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T33: Command field should be set in error
    if (!result25.ok && result25.error && !result25.error.field) {
        failures += 1;
        logLine(
            'FAIL\ncase: command error should include field\nexpected: error.field === command\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE TOOL ARGS - SUCCESS CASES
    // ============================================

    // T34: Valid args matching schema
    const TestSchema = z.object({
        name: z.string().min(1),
        age: z.number().int().positive(),
    });
    const result34 = validateToolArgs('test_tool', { name: 'John', age: 30 }, TestSchema);
    if (!result34.ok || !result34.data || result34.data.name !== 'John') {
        failures += 1;
        logLine(
            'FAIL\ncase: valid args should succeed and return data\nexpected: ok true, data.name John\n\n',
            process.stderr
        );
    }

    // T35: Valid args with optional fields
    const OptionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
    });
    const result35 = validateToolArgs('test_tool', { required: 'value' }, OptionalSchema);
    if (!result35.ok || !result35.data) {
        failures += 1;
        logLine(
            'FAIL\ncase: valid args with optional fields should succeed\nexpected: ok true, data\n\n',
            process.stderr
        );
    }

    // ============================================
    // VALIDATE TOOL ARGS - ERROR CASES
    // ============================================

    // T36: Missing required field
    const result36 = validateToolArgs('test_tool', { age: 30 }, TestSchema);
    if (result36.ok || result36.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: missing required field should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T37: Wrong type
    const result37 = validateToolArgs('test_tool', { name: 'John', age: 'thirty' }, TestSchema);
    if (result37.ok || result37.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: wrong type should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T38: Invalid value (negative number)
    const result38 = validateToolArgs('test_tool', { name: 'John', age: -5 }, TestSchema);
    if (result38.ok || result38.error?.code !== 'VALIDATION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: invalid value should return VALIDATION_ERROR\nexpected: ok false, error.code VALIDATION_ERROR\n\n',
            process.stderr
        );
    }

    // T39: Error message should include tool name
    if (!result36.ok && result36.error && !result36.error.message.includes('test_tool')) {
        failures += 1;
        logLine(
            'FAIL\ncase: error message should include tool name\nexpected: error.message contains test_tool\n\n',
            process.stderr
        );
    }

    // T40: Error should include field path
    if (!result36.ok && result36.error && !result36.error.field) {
        failures += 1;
        logLine(
            'FAIL\ncase: error should include field path\nexpected: error.field is set\n\n',
            process.stderr
        );
    }

    // ============================================
    // FORMAT VALIDATION ERROR - SUCCESS CASES
    // ============================================

    // T41: Format PERMISSION_ERROR
    const permError = {
        ok: false,
        error: { code: 'PERMISSION_ERROR' as const, message: 'Access denied' },
    };
    const formatted41 = formatValidationError(permError);
    if (!formatted41.includes('Permission denied') || !formatted41.includes('Access denied')) {
        failures += 1;
        logLine(
            'FAIL\ncase: format PERMISSION_ERROR should include Permission denied\nexpected: formatted includes Permission denied and message\n\n',
            process.stderr
        );
    }

    // T42: Format VALIDATION_ERROR
    const valError = {
        ok: false,
        error: { code: 'VALIDATION_ERROR' as const, message: 'Invalid input' },
    };
    const formatted42 = formatValidationError(valError);
    if (!formatted42.includes('Validation error') || !formatted42.includes('Invalid input')) {
        failures += 1;
        logLine(
            'FAIL\ncase: format VALIDATION_ERROR should include Validation error\nexpected: formatted includes Validation error and message\n\n',
            process.stderr
        );
    }

    // T43: Format with field
    const fieldError = {
        ok: false,
        error: { code: 'VALIDATION_ERROR' as const, message: 'Invalid', field: 'path' },
    };
    const formatted43 = formatValidationError(fieldError);
    if (!formatted43.includes('(path)')) {
        failures += 1;
        logLine(
            'FAIL\ncase: format with field should include field in parentheses\nexpected: formatted includes (path)\n\n',
            process.stderr
        );
    }

    // T44: Format successful result (should return empty)
    const success = { ok: true };
    const formatted44 = formatValidationError(success);
    if (formatted44 !== '') {
        failures += 1;
        logLine(
            'FAIL\ncase: format successful result should return empty string\nexpected: formatted === \n\n',
            process.stderr
        );
    }

    // T45: Format result without error (should return empty)
    const noError = { ok: false };
    const formatted45 = formatValidationError(noError);
    if (formatted45 !== '') {
        failures += 1;
        logLine(
            'FAIL\ncase: format result without error should return empty string\nexpected: formatted === \n\n',
            process.stderr
        );
    }

    // ============================================
    // EDGE CASES
    // ============================================

    // T46: Input at exactly max length
    const maxLengthInput = 'x'.repeat(10000);
    const result46 = validateInput(maxLengthInput);
    if (!result46.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: input at exactly max length should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T47: Path with just filename
    const result47 = validatePath('file');
    if (!result47.ok) {
        failures += 1;
        logLine(
            'FAIL\ncase: path with just filename should succeed\nexpected: ok true\n\n',
            process.stderr
        );
    }

    // T48: Command with ampersand (should be blocked)
    const result48 = validateCommand('ls & rm');
    if (result48.ok || result48.error?.code !== 'PERMISSION_ERROR') {
        failures += 1;
        logLine(
            'FAIL\ncase: command with ampersand should return PERMISSION_ERROR\nexpected: ok false, error.code PERMISSION_ERROR\n\n',
            process.stderr
        );
    }

    logLine(`Ran 48 test cases, ${failures} failures`);
} finally {
    // Cleanup
    fs.rmSync(testRoot, { recursive: true, force: true });
}

if (failures > 0) {
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
