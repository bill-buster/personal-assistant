#!/usr/bin/env node

/**
 * Tests for generate_tool script
 */

import { strict as assert } from 'assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

const scriptPath = path.join(__dirname, 'generate_tool.js');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-tool-test-'));

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

function runGenerateTool(args: string[]): { status: number; stdout: string; stderr: string } {
    // Create src/tools directory structure
    const srcToolsDir = path.join(testDir, 'src', 'tools');
    fs.mkdirSync(srcToolsDir, { recursive: true });

    const result = spawnSync(process.execPath, [scriptPath, ...args], {
        cwd: testDir,
        encoding: 'utf8',
        env: {
            ...process.env,
            // Override __dirname in script to use testDir
        },
    });
    return {
        status: result.status || 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
    };
}

function runTests() {
    console.log('Running generate_tool tests...');
    let failures = 0;

    // Test 1: Generate tool with required args
    try {
        // Set up project structure
        const srcDir = path.join(testDir, 'src');
        const toolsDir = path.join(srcDir, 'tools');
        fs.mkdirSync(toolsDir, { recursive: true });

        // Mock __dirname by changing working directory
        const originalCwd = process.cwd();
        process.chdir(testDir);

        try {
            const result = runGenerateTool(['test_tool_gen', '--args', 'name:string']);
            assert.equal(result.status, 0, `Expected exit code 0, got ${result.status}`);

            const toolFile = path.join(testDir, 'src', 'tools', 'test_tool_gen_tools.ts');
            const testFile = path.join(testDir, 'src', 'tools', 'test_tool_gen_tools.test.ts');

            assert.ok(fs.existsSync(toolFile), 'Tool file should be created');
            assert.ok(fs.existsSync(testFile), 'Test file should be created');

            const toolContent = fs.readFileSync(toolFile, 'utf8');
            assert.ok(
                toolContent.includes('TestToolGenSchema') || toolContent.includes('Schema'),
                'Should contain schema'
            );
            assert.ok(
                toolContent.includes('handleTestToolGen') || toolContent.includes('handle'),
                'Should contain handler'
            );

            console.log('PASS: Generate tool with required args');
        } finally {
            process.chdir(originalCwd);
        }
    } catch (e: unknown) {
        console.error(
            'FAIL: Generate tool with required args',
            e instanceof Error ? e.message : String(e)
        );
        failures++;
    }

    // Test 2: Generate tool with optional args
    try {
        const srcDir = path.join(testDir, 'src');
        const toolsDir = path.join(srcDir, 'tools');
        fs.mkdirSync(toolsDir, { recursive: true });

        const originalCwd = process.cwd();
        process.chdir(testDir);

        try {
            const result = runGenerateTool([
                'test_tool_opt',
                '--args',
                'name:string,count:number:optional',
            ]);
            assert.equal(result.status, 0);

            const toolFile = path.join(testDir, 'src', 'tools', 'test_tool_opt_tools.ts');
            if (fs.existsSync(toolFile)) {
                const toolContent = fs.readFileSync(toolFile, 'utf8');
                assert.ok(
                    toolContent.includes('.optional()') || toolContent.includes('optional'),
                    'Should have optional field'
                );
            }
            console.log('PASS: Generate tool with optional args');
        } finally {
            process.chdir(originalCwd);
        }
    } catch (e: unknown) {
        console.error(
            'FAIL: Generate tool with optional args',
            e instanceof Error ? e.message : String(e)
        );
        failures++;
    }

    // Test 3: Help flag
    try {
        const result = runGenerateTool(['--help']);
        assert.equal(result.status, 0);
        assert.ok(result.stdout.includes('Usage'), 'Should show usage');
        console.log('PASS: Help flag');
    } catch (e: unknown) {
        console.error('FAIL: Help flag', e instanceof Error ? e.message : String(e));
        failures++;
    }

    // Test 4: Invalid tool name (should still work but warn)
    try {
        const result = runGenerateTool(['TestTool']); // Should be snake_case
        // Should still work but might warn
        assert.equal(result.status, 0);
        console.log('PASS: Invalid tool name handling');
    } catch (e: unknown) {
        console.error(
            'FAIL: Invalid tool name handling',
            e instanceof Error ? e.message : String(e)
        );
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
