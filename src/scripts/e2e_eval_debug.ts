#!/usr/bin/env node
/**
 * E2E Eval Debug Runner - Single Test Case Mode
 *
 * Run a single test case with verbose output for debugging.
 *
 * Usage:
 *   node dist/scripts/e2e_eval_debug.js "test name"
 *   node dist/scripts/e2e_eval_debug.js 0  # Run first test by index
 *
 * @module scripts/e2e_eval_debug
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { AGENTS } from '../agents';
import { route } from '../app/router';
import { loadConfig, resolveConfig } from '../core';
import type { Agent, RouteResult, ToolResult } from '../core/types';
import { buildRuntime } from '../runtime';

// Schema interfaces (same as e2e_eval.ts)
interface ToolExpect {
    name?: string;
    none?: boolean;
}

interface ToolResultExpect {
    keys?: string[];
}

interface FinalExpect {
    contains_any?: string[];
}

interface ErrorExpect {
    code?: string;
}

interface StepExpect {
    tool?: ToolExpect;
    tool_result?: ToolResultExpect;
    final?: FinalExpect;
    error?: ErrorExpect;
    note?: string;
    allow_any_final?: boolean;
}

interface TestStep {
    input: string;
    expect: StepExpect;
}

interface TestCase {
    name: string;
    category: string;
    steps: TestStep[];
}

/**
 * Create an isolated temp directory for test storage.
 */
function createTempDataDir(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-eval-debug-'));
    fs.writeFileSync(path.join(tempDir, 'memory.json'), JSON.stringify({ entries: [] }));
    fs.writeFileSync(path.join(tempDir, 'tasks.jsonl'), '');
    fs.writeFileSync(path.join(tempDir, 'reminders.jsonl'), '');
    fs.writeFileSync(
        path.join(tempDir, 'permissions.json'),
        JSON.stringify({
            version: 1,
            allow_paths: ['.', tempDir],
            allow_commands: ['ls', 'pwd', 'cat', 'du'],
        })
    );
    return tempDir;
}

/**
 * Clean up temp directory.
 */
function cleanupTempDir(tempDir: string): void {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
}

/**
 * Debug a single step with verbose output.
 */
async function debugStep(
    step: TestStep,
    agent: Agent,
    runtime: ReturnType<typeof buildRuntime>
): Promise<void> {
    const { input, expect: expectation } = step;

    console.log('\n' + '='.repeat(70));
    console.log(`INPUT: "${input}"`);
    console.log('='.repeat(70));

    try {
        // Route the input
        console.log('\n📍 ROUTING...');
        const routeResult: RouteResult = await route(
            input,
            'spike',
            null,
            [],
            true, // verbose = true
            agent,
            runtime.provider,
            { enableRegex: true, toolFormat: 'compact', toolSchemas: runtime.toolSchemas }
        );

        console.log('\n📋 ROUTE RESULT:');
        console.log(JSON.stringify(routeResult, null, 2));

        // Check for routing errors
        if ('error' in routeResult) {
            console.log('\n❌ ROUTING ERROR:', routeResult.error);
            console.log('\n📊 EXPECTATIONS:');
            console.log('  Expected:', JSON.stringify(expectation, null, 2));
            return;
        }

        if (routeResult.mode === 'tool_call' && routeResult.tool_call) {
            const toolCalled = routeResult.tool_call.tool_name;
            console.log(`\n🔧 TOOL CALLED: ${toolCalled}`);
            console.log('   Args:', JSON.stringify(routeResult.tool_call.args, null, 2));

            // Execute the tool
            console.log('\n⚙️  EXECUTING TOOL...');
            const toolResult: ToolResult = await runtime.executor.execute(
                routeResult.tool_call.tool_name,
                routeResult.tool_call.args
            );

            console.log('\n📦 TOOL RESULT:');
            console.log(JSON.stringify(toolResult, null, 2));

            if (toolResult.ok) {
                console.log('\n✅ TOOL EXECUTION: SUCCESS');
                console.log('   Result:', JSON.stringify(toolResult.result, null, 2));
            } else {
                console.log('\n❌ TOOL EXECUTION: FAILED');
                console.log('   Error:', toolResult.error);
            }
        } else if (routeResult.mode === 'reply') {
            console.log('\n💬 LLM REPLY:');
            console.log(routeResult.reply?.content || '(empty)');
        }

        console.log('\n📊 EXPECTATIONS:');
        console.log(JSON.stringify(expectation, null, 2));

        // Check expectations
        console.log('\n🔍 VALIDATION:');
        if (expectation.tool?.name) {
            const actualTool =
                routeResult.mode === 'tool_call' && routeResult.tool_call
                    ? routeResult.tool_call.tool_name
                    : null;
            if (actualTool === expectation.tool.name) {
                console.log(`  ✅ Tool matches: ${expectation.tool.name}`);
            } else {
                console.log(
                    `  ❌ Tool mismatch: expected ${expectation.tool.name}, got ${actualTool || 'none'}`
                );
            }
        }

        if (expectation.tool?.none) {
            const hasTool = routeResult.mode === 'tool_call' && routeResult.tool_call;
            if (!hasTool) {
                console.log('  ✅ No tool called (as expected)');
            } else {
                console.log(
                    `  ❌ Tool was called: ${routeResult.mode === 'tool_call' && routeResult.tool_call ? routeResult.tool_call.tool_name : 'unknown'}`
                );
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log('\n💥 EXCEPTION:', message);
        if (err instanceof Error && err.stack) {
            console.log('\nStack trace:');
            console.log(err.stack);
        }
    }

    console.log('\n' + '='.repeat(70));
}

/**
 * Run debug mode for a single test case.
 */
async function runDebug(datasetPath: string, testIdentifier: string): Promise<void> {
    console.log(`\n🐛 E2E Eval Debug Mode`);
    console.log(`   Dataset: ${path.basename(datasetPath)}`);
    console.log(`   Test: ${testIdentifier}`);

    // Load config
    const rawConfig = loadConfig();
    const configResult = resolveConfig(rawConfig);
    if (!configResult.ok) {
        console.error(`Config error: ${configResult.error}`);
        process.exit(1);
    }

    // Load dataset
    const content = fs.readFileSync(datasetPath, 'utf8');
    const testCases: TestCase[] = JSON.parse(content);

    // Find the test case
    let testCase: TestCase | undefined;
    const testIndex = parseInt(testIdentifier, 10);
    if (!isNaN(testIndex) && testIndex >= 0 && testIndex < testCases.length) {
        testCase = testCases[testIndex];
    } else {
        testCase = testCases.find(tc =>
            tc.name.toLowerCase().includes(testIdentifier.toLowerCase())
        );
    }

    if (!testCase) {
        console.error(`\n❌ Test not found: "${testIdentifier}"`);
        console.error('\nAvailable tests:');
        testCases.forEach((tc, idx) => {
            console.error(`  [${idx}] ${tc.name}`);
        });
        process.exit(1);
    }

    console.log(`   Found: ${testCase.name}`);
    console.log(`   Category: ${testCase.category}`);
    console.log(`   Steps: ${testCase.steps.length}`);

    // Create isolated storage
    const tempDir = createTempDataDir();
    const originalDataDir = process.env.ASSISTANT_DATA_DIR;
    process.env.ASSISTANT_DATA_DIR = tempDir;

    console.log(`   Temp Dir: ${tempDir}`);

    // Build runtime with executor
    const runtime = buildRuntime(configResult.config);

    // Use SYSTEM agent for full tool access
    const agent = AGENTS.system;
    console.log(`   Agent: ${agent.name}`);

    // Run each step
    for (let i = 0; i < testCase.steps.length; i++) {
        console.log(`\n\n${'#'.repeat(70)}`);
        console.log(`STEP ${i + 1}/${testCase.steps.length}`);
        console.log('#'.repeat(70));
        await debugStep(testCase.steps[i], agent, runtime);
    }

    // Restore original data dir and cleanup
    process.env.ASSISTANT_DATA_DIR = originalDataDir;
    cleanupTempDir(tempDir);

    console.log('\n\n✨ Debug session complete\n');
}

// CLI entry point
const args = process.argv.slice(2);
const scriptDir = __dirname;
const defaultDataset = path.resolve(scriptDir, '../../evals/real_world_queries.json');
const dataset = defaultDataset;

if (args.length === 0) {
    console.error('Usage: node dist/scripts/e2e_eval_debug.js <test-name-or-index>');
    console.error('\nExamples:');
    console.error('  node dist/scripts/e2e_eval_debug.js "weather"');
    console.error('  node dist/scripts/e2e_eval_debug.js 0');
    process.exit(1);
}

const testIdentifier = args[0];

runDebug(dataset, testIdentifier).catch(err => {
    console.error('Debug failed:', err);
    process.exit(1);
});
