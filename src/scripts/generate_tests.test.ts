#!/usr/bin/env node

/**
 * Tests for generate_tests script
 */

import { strict as assert } from 'assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

const scriptPath = path.join(__dirname, 'generate_tests.js');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-tests-test-'));

// Create a mock tool file for testing
const mockToolFile = path.join(testDir, 'src', 'tools', 'mock_tool_tools.ts');
fs.mkdirSync(path.dirname(mockToolFile), { recursive: true });

const mockToolContent = `import { z } from 'zod';

export const MockToolSchema = z.object({
    text: z.string(),
    limit: z.number().optional(),
});

export type MockToolArgs = z.infer<typeof MockToolSchema>;

export function handleMockTool(args: MockToolArgs, context: any): any {
    return { ok: true, result: {} };
}
`;

fs.writeFileSync(mockToolFile, mockToolContent);

function cleanup() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
});

function runGenerateTests(toolName: string): { status: number; stdout: string; stderr: string } {
    const result = spawnSync(process.execPath, [scriptPath, toolName], {
        cwd: testDir,
        encoding: 'utf8',
        env: { ...process.env },
    });
    return {
        status: result.status || 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
    };
}

function runTests() {
    console.log('Running generate_tests tests...');
    let failures = 0;

    // Test 1: Generate tests for existing tool
    try {
        const result = runGenerateTests('mock_tool');
        assert.equal(result.status, 0, `Expected exit code 0, got ${result.status}`);

        const testFile = path.join(testDir, 'src', 'tools', 'mock_tool_tools.test.ts');
        assert.ok(fs.existsSync(testFile), 'Test file should be created');

        const testContent = fs.readFileSync(testFile, 'utf8');
        assert.ok(testContent.includes('handleMockTool'), 'Should import handler');
        assert.ok(testContent.includes('Success case'), 'Should have success test');
        assert.ok(testContent.includes('Missing required arg'), 'Should have validation tests');

        console.log('PASS: Generate tests for existing tool');
    } catch (e: any) {
        console.error('FAIL: Generate tests for existing tool', e.message);
        failures++;
    }

    // Test 2: Tool not found
    try {
        const result = runGenerateTests('nonexistent_tool');
        assert.notEqual(result.status, 0, 'Should fail for nonexistent tool');
        assert.ok(result.stderr.includes('not found') || result.stdout.includes('not found'));
        console.log('PASS: Tool not found error');
    } catch (e: any) {
        console.error('FAIL: Tool not found error', e.message);
        failures++;
    }

    if (failures > 0) {
        console.error(`\n${failures} test(s) failed`);
        process.exit(1);
    }

    console.log('RESULT\nstatus: OK\n');
}

runTests();
export {};
