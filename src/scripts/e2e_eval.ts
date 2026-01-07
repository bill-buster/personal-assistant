#!/usr/bin/env node
/**
 * E2E Evaluation Runner for Real-World Queries
 *
 * Runs multi-step test cases through the full pipeline:
 * router -> executor -> output validation
 *
 * Features:
 * - Multi-step tests with persistent state (tasks, memory)
 * - Tool execution (not just routing)
 * - Tool result validation (keys exist)
 * - Final output validation (contains_any checks)
 * - Error expectations
 *
 * Usage:
 *   node dist/scripts/e2e_eval.js [dataset.json]
 *
 * @module scripts/e2e_eval
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { AGENTS } from '../agents';
import { route } from '../app/router';
import { loadConfig, resolveConfig } from '../core';
import type { Agent, RouteResult, ToolResult } from '../core/types';
import { buildRuntime } from '../runtime';

// New schema interfaces
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

interface StepResult {
    input: string;
    passed: boolean;
    failures: string[];
    toolCalled: string | null;
    toolResult: ToolResult | null;
    finalOutput: string;
}

interface TestResult {
    name: string;
    category: string;
    passed: boolean;
    stepResults: StepResult[];
    latency_ms: number;
}

/**
 * Create an isolated temp directory for test storage.
 */
function createTempDataDir(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-eval-'));
    fs.writeFileSync(path.join(tempDir, 'memory.json'), JSON.stringify({ entries: [] }));
    fs.writeFileSync(path.join(tempDir, 'tasks.jsonl'), '');
    fs.writeFileSync(path.join(tempDir, 'reminders.jsonl'), '');
    fs.writeFileSync(
        path.join(tempDir, 'permissions.json'),
        JSON.stringify({
            version: 1,
            allow_paths: ['.', tempDir],
            allow_commands: ['ls', 'pwd', 'cat', 'du', 'git'],
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
 * Evaluate a single step.
 */
async function evaluateStep(
    step: TestStep,
    agent: Agent,
    runtime: ReturnType<typeof buildRuntime>
): Promise<StepResult> {
    const { input, expect: expectation } = step;
    const failures: string[] = [];
    let toolCalled: string | null = null;
    let toolResult: ToolResult | null = null;
    let finalOutput = '';

    try {
        // Route the input
        const routeResult: RouteResult = await route(
            input,
            'spike',
            null,
            [],
            false,
            agent,
            runtime.provider,
            { enableRegex: true, toolFormat: 'compact', toolSchemas: runtime.toolSchemas }
        );

        // Check for routing errors
        if ('error' in routeResult) {
            finalOutput = routeResult.error;

            // Check if we expected no tool
            if (expectation.tool?.none) {
                // This is acceptable - no tool was called
            } else if (expectation.error) {
                // Expected an error - check code if specified
                if (expectation.error.code && !finalOutput.includes(expectation.error.code)) {
                    failures.push(
                        `Expected error code ${expectation.error.code}, got: ${finalOutput}`
                    );
                }
            } else if (expectation.tool?.name) {
                failures.push(`Expected tool ${expectation.tool.name}, got error: ${finalOutput}`);
            }
        } else if (routeResult.mode === 'tool_call' && routeResult.tool_call) {
            toolCalled = routeResult.tool_call.tool_name;

            // Check tool name expectation
            if (expectation.tool?.none) {
                failures.push(`Expected no tool, but got: ${toolCalled}`);
            } else if (expectation.tool?.name && expectation.tool.name !== toolCalled) {
                failures.push(`Expected tool ${expectation.tool.name}, got: ${toolCalled}`);
            }

            // Execute the tool
            toolResult = await runtime.executor.execute(
                routeResult.tool_call.tool_name,
                routeResult.tool_call.args
            );

            // Build final output from tool result
            if (toolResult.ok) {
                finalOutput = JSON.stringify(toolResult.result, null, 2);
            } else {
                finalOutput = toolResult.error
                    ? `${toolResult.error.code}: ${toolResult.error.message}`
                    : 'Unknown error';

                // Check error expectation
                if (expectation.error?.code) {
                    if (!toolResult.error || toolResult.error.code !== expectation.error.code) {
                        failures.push(
                            `Expected error code ${expectation.error.code}, got: ${toolResult.error?.code || 'none'}`
                        );
                    }
                }
            }

            // Check tool_result keys expectation
            if (expectation.tool_result?.keys && toolResult.ok && toolResult.result) {
                const result = toolResult.result as Record<string, unknown>;
                for (const key of expectation.tool_result.keys) {
                    if (!(key in result)) {
                        failures.push(`Expected key "${key}" in tool result, not found`);
                    }
                }
            }
        } else if (routeResult.mode === 'reply') {
            finalOutput = routeResult.reply?.content || '';

            // Check if we expected a tool
            if (expectation.tool?.name) {
                failures.push(
                    `Expected tool ${expectation.tool.name}, got reply: ${finalOutput.slice(0, 50)}...`
                );
            }
            // If expecting no tool, this is fine
        }

        // Check final output expectation
        if (expectation.final?.contains_any && !expectation.allow_any_final) {
            const hasMatch = expectation.final.contains_any.some(needle =>
                finalOutput.includes(needle)
            );
            if (!hasMatch) {
                failures.push(
                    `Final output should contain one of: [${expectation.final.contains_any.join(', ')}], got: ${finalOutput.slice(0, 100)}...`
                );
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`Exception: ${message}`);
        finalOutput = `Exception: ${message}`;
    }

    return {
        input,
        passed: failures.length === 0,
        failures,
        toolCalled,
        toolResult,
        finalOutput,
    };
}

/**
 * Evaluate a full test case (all steps).
 */
async function evaluateCase(
    testCase: TestCase,
    agent: Agent,
    runtime: ReturnType<typeof buildRuntime>
): Promise<TestResult> {
    const start = Date.now();
    const stepResults: StepResult[] = [];
    let allPassed = true;

    for (const step of testCase.steps) {
        const stepResult = await evaluateStep(step, agent, runtime);
        stepResults.push(stepResult);
        if (!stepResult.passed) {
            allPassed = false;
        }
    }

    return {
        name: testCase.name,
        category: testCase.category,
        passed: allPassed,
        stepResults,
        latency_ms: Date.now() - start,
    };
}

/**
 * Run all test cases and print report.
 */
async function runEval(datasetPath: string): Promise<void> {
    console.log(`\n🧪 E2E Eval Runner (Full Pipeline)`);
    console.log(`   Dataset: ${path.basename(datasetPath)}`);
    console.log('─'.repeat(70));

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

    // Create isolated storage
    const tempDir = createTempDataDir();
    const originalDataDir = process.env.ASSISTANT_DATA_DIR;
    process.env.ASSISTANT_DATA_DIR = tempDir;

    if (process.env.DEBUG) {
        console.log(`   Temp Dir: ${tempDir}`);
    }

    // Build runtime with executor
    const runtime = buildRuntime(configResult.config, {
        permissionsPath: path.join(tempDir, 'permissions.json'),
    });

    // Use SYSTEM agent for full tool access
    const agent = AGENTS.system;
    console.log(`   Agent: ${agent.name}`);
    console.log('─'.repeat(70));

    // Run tests
    const results: TestResult[] = [];
    const categoryStats: Record<string, { passed: number; total: number; latency: number }> = {};

    for (const testCase of testCases) {
        const result = await evaluateCase(testCase, agent, runtime);
        results.push(result);

        // Track category stats
        const cat = result.category;
        if (!categoryStats[cat]) {
            categoryStats[cat] = { passed: 0, total: 0, latency: 0 };
        }
        categoryStats[cat].total++;
        categoryStats[cat].latency += result.latency_ms;
        if (result.passed) categoryStats[cat].passed++;

        // Print progress
        const icon = result.passed ? '✓' : '✗';
        const color = result.passed ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        const stepCount = result.stepResults.length;
        const passedSteps = result.stepResults.filter(s => s.passed).length;
        console.log(`${color}${icon}${reset} ${result.name} (${passedSteps}/${stepCount} steps)`);

        // Show failures inline if any
        if (!result.passed) {
            for (const stepResult of result.stepResults) {
                if (!stepResult.passed) {
                    for (const failure of stepResult.failures) {
                        console.log(`    └─ ${stepResult.input}: ${failure}`);
                    }
                }
            }
        }
    }

    // Restore original data dir and cleanup
    process.env.ASSISTANT_DATA_DIR = originalDataDir;
    cleanupTempDir(tempDir);

    // Print summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed);
    const totalLatency = results.reduce((acc, r) => acc + r.latency_ms, 0);
    const avgLatency = results.length > 0 ? (totalLatency / results.length).toFixed(0) : '0';

    console.log('\n' + '─'.repeat(70));
    console.log(
        `📊 Results: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`
    );
    console.log(`   Avg Latency: ${avgLatency}ms\n`);

    // Category breakdown
    console.log('By Category:');
    for (const [cat, stats] of Object.entries(categoryStats)) {
        const pct = ((stats.passed / stats.total) * 100).toFixed(0);
        const avg = (stats.latency / stats.total).toFixed(0);
        const filled = Math.round((stats.passed / stats.total) * 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        console.log(
            `  ${cat.padEnd(12)} ${bar} ${stats.passed}/${stats.total} (${pct}%) - ${avg}ms`
        );
    }

    console.log('\n' + '─'.repeat(70));

    // Exit with error code if any failures
    if (failed.length > 0) {
        process.exit(1);
    }
}

// CLI entry point
const args = process.argv.slice(2);
const scriptDir = __dirname;
const defaultDataset = path.resolve(scriptDir, '../../evals/real_world_queries.json');
const dataset = args[0] || defaultDataset;

if (!fs.existsSync(dataset)) {
    console.error(`Dataset not found: ${dataset}`);
    console.error(`Try: npm run eval:e2e`);
    process.exit(1);
}

runEval(dataset).catch(err => {
    console.error('Eval failed:', err);
    process.exit(1);
});
