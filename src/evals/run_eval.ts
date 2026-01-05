#!/usr/bin/env node
/**
 * Evaluation Runner for Routing Accuracy
 * 
 * Runs test cases against the router and reports accuracy metrics.
 * 
 * Usage:
 *   node dist/evals/run_eval.js [dataset.jsonl] [--use-llm] [--agent name] [--system-prompt file] [--mock-responses file]
 * 
 * @module evals/run_eval
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Import from compiled dist
const { route } = require('../../dist/router');
const { MockLLMProvider } = require('../../dist/llm/mock_provider');
const { AGENTS } = require('../../dist/agents');

interface TestCase {
    input: string;
    expected_tool?: string;
    expected_path?: string;
    expected_error?: boolean;
    expected_reply?: boolean; // Expecting a reply instead of a tool call
    category?: string;
    note?: string;
}

interface EvalResult {
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    category: string;
    latency: number;
}

interface EvalStats {
    total: number;
    passed: number;
    totalLatency: number;
}

async function runEval(
    datasetPath: string,
    useLlm: boolean,
    agentName: string,
    systemPromptPath?: string,
    mockResponsesPath?: string
): Promise<void> {
    console.log(`\n🧪 Running Eval: ${path.basename(datasetPath)}`);
    if (useLlm) console.log(`   Mode: LLM Enabled`);
    console.log(`   Agent: ${agentName}`);
    if (systemPromptPath) console.log(`   System Prompt: Custom (${path.basename(systemPromptPath)})`);
    if (mockResponsesPath) console.log(`   Mock Responses: ${path.basename(mockResponsesPath)}`);
    console.log('─'.repeat(60));

    const content = fs.readFileSync(datasetPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const testCases: TestCase[] = lines.map(line => JSON.parse(line));

    // Setup Agent
    let agent = AGENTS[agentName.toLowerCase()];
    if (!agent) {
        console.warn(`Warning: Agent '${agentName}' not found, falling back to 'system'`);
        agent = AGENTS.system;
    }

    // Override System Prompt if provided
    if (systemPromptPath) {
        const promptContent = fs.readFileSync(systemPromptPath, 'utf8');
        agent = { ...agent, systemPrompt: promptContent };
    }

    // Setup Provider
    let injectedProvider = undefined;
    if (mockResponsesPath) {
        const mockData = fs.readFileSync(mockResponsesPath, 'utf8');
        const responses = JSON.parse(mockData);
        injectedProvider = new MockLLMProvider(responses);
    }
    // If not mocking, we rely on standard router behavior (reading config)
    // BUT we need to make sure the router knows we WANT to use LLM if fallback happens.
    // The router automatically uses LLM if keys exist.
    // However, if we are in a test environment without keys, we might need a mock even if not specified?
    // For now, let's assume if useLlm is true, user either has keys or supplied a mock.

    // Actually, to FORCE LLM usage in the router (or at least attempt it),
    // we need to make sure we don't just rely on heuristics.
    // The router logic tries heuristics FIRST.
    // So 'useLlm' basically just means "we expect the LLM path to be exercised for some queries".

    // Wait, the router ALWAYS tries heuristics first.
    // If we want to TEST the LLM, we should use queries that FAIL heuristics.

    const results: EvalResult[] = [];
    const categoryStats: Record<string, EvalStats> = {};

    for (const testCase of testCases) {
        const result = await evaluateCase(testCase, agent, injectedProvider);
        results.push(result);

        // Track by category
        const cat = result.category || 'general';
        if (!categoryStats[cat]) categoryStats[cat] = { passed: 0, total: 0, totalLatency: 0 };
        categoryStats[cat].total++;
        categoryStats[cat].totalLatency += result.latency;
        if (result.passed) categoryStats[cat].passed++;
    }

    // Print results
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed);
    const totalLatency = results.reduce((acc, r) => acc + r.latency, 0);
    const avgLatency = results.length > 0 ? (totalLatency / results.length).toFixed(0) : 0;

    console.log(`\n📊 Results: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`);
    console.log(`   Avg Latency: ${avgLatency}ms\n`);

    // Category breakdown
    console.log('By Category:');
    for (const [cat, stats] of Object.entries(categoryStats)) {
        const pct = ((stats.passed / stats.total) * 100).toFixed(0);
        const avg = (stats.totalLatency / stats.total).toFixed(0);
        const bar = '█'.repeat(Math.round(stats.passed / stats.total * 10)) + '░'.repeat(10 - Math.round(stats.passed / stats.total * 10));
        console.log(`  ${cat.padEnd(15)} ${bar} ${stats.passed}/${stats.total} (${pct}%) - Avg: ${avg}ms`);
    }

    // Show failures
    if (failed.length > 0) {
        console.log(`\n❌ Failures (${failed.length}):`);
        for (const f of failed.slice(0, 10)) { // Show first 10
            console.log(`  Input: "${f.input}"`);
            console.log(`    Expected: ${f.expected}`);
            console.log(`    Actual:   ${f.actual}`);
            console.log('');
        }
        if (failed.length > 10) {
            console.log(`  ... and ${failed.length - 10} more`);
        }
    }

    console.log('─'.repeat(60));
}

async function evaluateCase(testCase: TestCase, agent: any, provider: any): Promise<EvalResult> {
    const { input, expected_tool, expected_path, expected_error, expected_reply, category } = testCase;

    // Capture start time if router doesn't return it
    const startTs = Date.now();

    try {
        // Route
        const result = await route(input, 'spike', null, [], false, agent, provider);
        const endTs = Date.now();
        const latency = result._debug?.duration || (endTs - startTs);

        if (expected_error) {
            const passed = !!result.error;
            return {
                passed,
                input,
                expected: 'error',
                actual: result.error ? 'error' : (result.tool_call ? `tool:${result.tool_call.tool_name}` : 'reply'),
                category: category || 'unknown',
                latency
            };
        }

        // Check tool match
        const actualTool = result.tool_call?.tool_name || null;
        const actualPath = result._debug?.path || null;
        const isReply = result.mode === 'reply';

        if (expected_reply) {
             const passed = isReply && !result.error;
             return {
                passed,
                input,
                expected: 'reply',
                actual: result.error ? `error:${result.error}` : (isReply ? 'reply' : `tool:${actualTool}`),
                category: category || 'unknown',
                latency
             };
        }

        const toolMatch = !expected_tool || actualTool === expected_tool;
        const pathMatch = !expected_path || actualPath === expected_path;

        return {
            passed: toolMatch && pathMatch && !result.error,
            input,
            expected: `${expected_tool || '*'}@${expected_path || '*'}`,
            actual: result.error ? `error:${result.error}` : `${actualTool}@${actualPath}`,
            category: category || 'unknown',
            latency
        };

    } catch (err: any) {
        return {
            passed: !!expected_error,
            input,
            expected: expected_error ? 'error' : `${expected_tool}`,
            actual: `exception:${err.message}`,
            category: category || 'unknown',
            latency: Date.now() - startTs
        };
    }
}

// CLI entry point
const args = process.argv.slice(2);

// Simple arg parsing
const flags: Record<string, string | boolean> = {};
const positionals: string[] = [];
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
        const key = arg.slice(2);
        if (['agent', 'system-prompt', 'mock-responses'].includes(key)) {
            flags[key] = args[i + 1];
            i++;
        } else {
            flags[key] = true;
        }
    } else {
        positionals.push(arg);
    }
}

const evalDir = path.dirname(__filename);
const dataset = positionals[0] || path.join(evalDir, 'routing_accuracy.jsonl');

if (!fs.existsSync(dataset)) {
    console.error(`Dataset not found: ${dataset}`);
    console.error(`Try: node dist/evals/run_eval.js packages/personal-assistant/src/evals/routing_accuracy.jsonl`);
    process.exit(1);
}

const useLlm = !!flags['use-llm'];
const agentName = (flags['agent'] as string) || 'system';
const systemPromptPath = flags['system-prompt'] as string | undefined;
const mockResponsesPath = flags['mock-responses'] as string | undefined;

runEval(dataset, useLlm, agentName, systemPromptPath, mockResponsesPath).catch(err => {
    console.error('Eval failed:', err);
    process.exit(1);
});
