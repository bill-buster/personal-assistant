/**
 * Real-World Eval Integration Tests
 *
 * Runs the real_world_queries.json dataset through the router
 * and validates routing decisions.
 *
 * @module evals/real_world_eval.test
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { AGENTS } from '../agents';
import { route } from '../app/router';
import type { RouteResult } from '../core/types';

interface Expectation {
    tool?: string;
    args_contain?: Record<string, unknown>;
    no_tool?: boolean;
    error?: boolean;
}

interface TestCase {
    name: string;
    input: string;
    expect: Expectation;
    category?: string;
}

// Test state
let tempDir: string;
let originalDataDir: string | undefined;

/**
 * Create isolated test storage.
 */
function setupTestEnv(): void {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-eval-test-'));
    fs.writeFileSync(path.join(tempDir, 'memory.json'), JSON.stringify({ entries: [] }));
    fs.writeFileSync(path.join(tempDir, 'tasks.jsonl'), '');
    fs.writeFileSync(path.join(tempDir, 'reminders.jsonl'), '');
    fs.writeFileSync(
        path.join(tempDir, 'permissions.json'),
        JSON.stringify({ version: 1, allow_paths: ['.'], allow_commands: [] })
    );
    originalDataDir = process.env.ASSISTANT_DATA_DIR;
    process.env.ASSISTANT_DATA_DIR = tempDir;
}

/**
 * Cleanup test storage.
 */
function teardownTestEnv(): void {
    process.env.ASSISTANT_DATA_DIR = originalDataDir;
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
}

/**
 * Load test dataset.
 */
function loadDataset(): TestCase[] {
    const datasetPath = path.resolve(__dirname, '../../evals/real_world_queries.json');
    const content = fs.readFileSync(datasetPath, 'utf8');
    return JSON.parse(content);
}

/**
 * Evaluate routing for a test case.
 */
async function evaluateRouting(
    input: string,
    expectation: Expectation
): Promise<{ passed: boolean; actual: string; expected: string }> {
    const result: RouteResult = await route(
        input,
        'spike',
        null,
        [],
        false,
        AGENTS.system,
        undefined // No LLM - heuristic only
    );

    let actualTool: string | null = null;
    let isError = false;
    let isReply = false;

    if ('error' in result) {
        isError = true;
    } else if (result.mode === 'tool_call' && result.tool_call) {
        actualTool = result.tool_call.tool_name;
    } else if (result.mode === 'reply') {
        isReply = true;
    }

    if (expectation.error) {
        return {
            passed: isError,
            expected: 'error',
            actual: isError ? 'error' : actualTool ? `tool:${actualTool}` : 'reply',
        };
    }

    if (expectation.no_tool) {
        return {
            passed: isError || isReply,
            expected: 'no_tool',
            actual: isError ? 'error' : isReply ? 'reply' : `tool:${actualTool}`,
        };
    }

    if (expectation.tool) {
        const toolMatched = actualTool === expectation.tool;
        return {
            passed: toolMatched,
            expected: `tool:${expectation.tool}`,
            actual: actualTool ? `tool:${actualTool}` : isError ? 'error' : 'reply',
        };
    }

    return { passed: false, expected: 'unknown', actual: 'unknown' };
}

// Main test runner
export async function runTests(): Promise<{ passed: number; failed: number; results: string[] }> {
    const results: string[] = [];
    let passed = 0;
    let failed = 0;

    setupTestEnv();

    try {
        const testCases = loadDataset();

        for (const testCase of testCases) {
            try {
                const evaluation = await evaluateRouting(testCase.input, testCase.expect);

                if (evaluation.passed) {
                    passed++;
                    results.push(`✓ ${testCase.name}`);
                } else {
                    failed++;
                    results.push(
                        `✗ ${testCase.name}: expected ${evaluation.expected}, got ${evaluation.actual}`
                    );
                }
            } catch (err: unknown) {
                failed++;
                const message = err instanceof Error ? err.message : String(err);
                results.push(`✗ ${testCase.name}: exception - ${message}`);
            }
        }
    } finally {
        teardownTestEnv();
    }

    return { passed, failed, results };
}

// Export for test runner integration
export const test = {
    name: 'real_world_eval',
    run: async (): Promise<boolean> => {
        const { passed, failed, results } = await runTests();

        console.log('\n📋 Real-World Query Eval Results:');
        for (const r of results) {
            console.log(`  ${r}`);
        }
        console.log(`\n  Total: ${passed} passed, ${failed} failed\n`);

        return failed === 0;
    },
};
