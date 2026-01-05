#!/usr/bin/env node

/**
 * Assistant CLI - Unified entry point
 * 
 * Subcommands:
 *   remember <text>     - Store in memory
 *   recall <query>      - Search memory
 *   task add <text>     - Add a task
 *   task list           - List tasks
 *   task done <id>      - Complete task
 *   remind add <text> --in <duration>  - Add reminder
 *   run <command>       - Execute safe shell command
 *   repl                - Interactive mode
 *   demo                - Run demo flow
 * 
 * Flags:
 *   --human             - Human-readable output (default: JSON)
 *   --help              - Show help
 *   --version           - Show version
 * 
 * @module cli
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    Executor,
    printResult,
    setHumanMode,
    parseArgs,
    getPackageVersion,
} from '../core';
import type { ToolResult, CLIResult, ResolvedConfig } from '../core';
import { route } from './router';
import { isRouteError, isRouteToolCall, isRouteReply } from '../core';
import { initializeRuntime } from '../runtime';
import type { Runtime } from '../runtime';

/**
 * Convert executor ToolResult to CLI-friendly format
 */
function toCliResult(result: ToolResult): CLIResult {
    return {
        ok: result.ok,
        result: result.result,
        error: result.error ? result.error.message : undefined,
        _debug: result._debug
    };
}

const VERSION = getPackageVersion();

const USAGE = `
Assistant CLI v${VERSION}

Usage: assistant <command> [options]

Commands:
  remember <text>              Store information in memory
  recall <query>               Search memory
  task add <text>              Add a new task
  task list [--status open|done|all]  List tasks
  task done <id>               Mark task as done
  remind add <text> --in <seconds>    Add a reminder
  run <command>                Execute shell command (ls|pwd|cat|du)
  git status                   Show git working tree status
  git diff [--staged]          Show changes
  git log [--limit N]          Show recent commits
  audit [--limit N]            View audit trail
  web [--port N]               Start web dashboard
  repl                         Start interactive mode
  demo                         Run demonstration flow

Options:
  --human                      Human-readable output (default: JSON)
  --verbose                    Verbose output
  --help                       Show this help
  --version                    Show version

Examples:
  assistant remember "Meeting at 3pm with Alice"
  assistant recall "meeting Alice"
  assistant task add "Review PR #123"
  assistant task list --human
  assistant git status --human
  assistant demo
`.trim();

interface ParsedArgs {
    command: string;
    subcommand: string | null;
    args: string[];
    flags: Record<string, string | boolean>;
}

/**
 * Parse CLI arguments using the shared arg_parser.
 * Maps to the CLI-specific ParsedArgs structure.
 */
function parseCliArgs(argv: string[]): ParsedArgs {
    const { flags, positionals } = parseArgs(argv, {
        valueFlags: ['in', 'status', 'limit', 'port'],
        booleanFlags: ['human', 'verbose', 'help', 'version', 'staged', 'mock']
    });

    const command = positionals[0] || '';
    let subcommand: string | null = null;
    let args = positionals.slice(1);

    // Handle compound commands like "task add", "git status"
    if (['task', 'remind', 'git'].includes(command) && positionals.length > 1) {
        subcommand = positionals[1];
        args = positionals.slice(2);
    }

    return { command, subcommand, args, flags };
}

async function main() {
    const argv = process.argv.slice(2);
    const { command, subcommand, args, flags } = parseCliArgs(argv);

    const human = !!flags['human'];
    const verbose = !!flags['verbose'];
    const mock = !!flags['mock'];
    setHumanMode(human);

    // Handle global flags
    if (flags['help'] || command === 'help') {
        console.log(USAGE);
        process.exit(0);
    }

    if (flags['version'] || command === 'version') {
        console.log(VERSION);
        process.exit(0);
    }

    if (!command) {
        console.log(USAGE);
        process.exit(0);
    }

    // Build runtime via composition root (single place for wiring)
    const runtime = initializeRuntime({ mock });
    const { config: resolvedConfig } = runtime;

    // Route to command handlers
    let result: CLIResult;

    switch (command) {
        case 'remember':
            result = await handleRemember(runtime, args, verbose);
            break;

        case 'recall':
            result = await handleRecall(runtime, args, verbose);
            break;

        case 'task':
            result = await handleTask(runtime, subcommand, args, flags, verbose);
            break;

        case 'remind':
            result = await handleRemind(runtime, subcommand, args, flags, verbose);
            break;

        case 'run':
            result = await handleRun(runtime, args, verbose);
            break;

        case 'git':
            result = await handleGit(runtime, subcommand, flags, verbose);
            break;

        case 'audit':
            result = handleAudit(flags, resolvedConfig); // Audit is synchronous (reads file directly)
            break;

        case 'web': {
            const webPort = flags['port'] ? parseInt(flags['port'] as string, 10) : 3000;
            const { startWebServer } = require('./web/server');
            startWebServer({ port: webPort, baseDir: resolvedConfig.fileBaseDir });
            return; // Server keeps process alive
        }

        case 'repl': {
            // Lazy import to avoid circular dependencies
            const { startRepl } = require('./repl');
            startRepl({ verbose });
            return; // REPL keeps process alive
        }

        case 'demo':
            await handleDemo(runtime.executor, human);
            return;

        default:
            result = { ok: false, error: `Unknown command: ${command}. Use --help for usage.` };
    }

    printResult(result, human);
    process.exit(result.ok ? 0 : 1);
}

// Helper: Route CLI command through Router and execute
async function routeAndExecute(input: string, runtime: Runtime, verbose: boolean = false): Promise<CLIResult> {
    try {
        const routed = await route(input, 'spike', null, [], verbose, runtime.defaultAgent, runtime.provider, { enableRegex: true, toolFormat: 'compact', toolSchemas: runtime.toolSchemas }, runtime.config);

        if (isRouteError(routed)) {
            return { ok: false, error: routed.error };
        }

        if (isRouteToolCall(routed)) {
            const execResult = await runtime.executor.execute(routed.tool_call.tool_name, routed.tool_call.args);
            return toCliResult(execResult);
        } else if (isRouteReply(routed)) {
            // Router returned a reply instead of a tool call
            return { ok: true, result: routed.reply.content || 'No response' };
        } else {
            return { ok: false, error: 'Router did not return a tool call or reply' };
        }
    } catch (err: any) {
        return { ok: false, error: err.message || 'Routing failed' };
    }
}

// Command Handlers

async function handleRemember(runtime: Runtime, args: string[], verbose: boolean): Promise<CLIResult> {
    const text = args.join(' ').trim();
    if (!text) {
        return { ok: false, error: 'Usage: assistant remember <text>' };
    }
    return await routeAndExecute(`remember: ${text}`, runtime, verbose);
}

async function handleRecall(runtime: Runtime, args: string[], verbose: boolean): Promise<CLIResult> {
    const query = args.join(' ').trim();
    if (!query) {
        return { ok: false, error: 'Usage: assistant recall <query>' };
    }
    return await routeAndExecute(`recall: ${query}`, runtime, verbose);
}

async function handleTask(
    runtime: Runtime,
    subcommand: string | null,
    args: string[],
    flags: Record<string, string | boolean>,
    verbose: boolean
): Promise<CLIResult> {
    switch (subcommand) {
        case 'add': {
            const text = args.join(' ').trim();
            if (!text) {
                return { ok: false, error: 'Usage: assistant task add <text>' };
            }
            return await routeAndExecute(`task add ${text}`, runtime, verbose);
        }

        case 'list': {
            const status = (flags['status'] as string) || 'all';
            const input = status === 'all' ? 'task list' : `task list --status ${status}`;
            return await routeAndExecute(input, runtime, verbose);
        }

        case 'done': {
            const id = parseInt(args[0], 10);
            if (isNaN(id)) {
                return { ok: false, error: 'Usage: assistant task done <id>' };
            }
            return await routeAndExecute(`task done ${id}`, runtime, verbose);
        }

        default:
            return { ok: false, error: 'Usage: assistant task <add|list|done> [args]' };
    }
}

async function handleRemind(
    runtime: Runtime,
    subcommand: string | null,
    args: string[],
    flags: Record<string, string | boolean>,
    verbose: boolean
): Promise<CLIResult> {
    if (subcommand !== 'add') {
        return { ok: false, error: 'Usage: assistant remind add <text> --in <seconds>' };
    }

    const text = args.join(' ').trim();
    const inSeconds = parseInt(flags['in'] as string, 10);

    if (!text || isNaN(inSeconds)) {
        return { ok: false, error: 'Usage: assistant remind add <text> --in <seconds>' };
    }

    // Convert seconds to appropriate unit for Router's task parser
    let unit = 'second';
    let amount = inSeconds;
    if (inSeconds >= 3600 && inSeconds % 3600 === 0) {
        unit = 'hour';
        amount = inSeconds / 3600;
    } else if (inSeconds >= 60 && inSeconds % 60 === 0) {
        unit = 'minute';
        amount = inSeconds / 60;
    }

    // Format for Router's task parser: "remind me in X seconds/minutes/hours to Y"
    const routerInput = `remind me in ${amount} ${unit}${amount !== 1 ? 's' : ''} to ${text}`;
    return await routeAndExecute(routerInput, runtime, verbose);
}

async function handleRun(runtime: Runtime, args: string[], verbose: boolean): Promise<CLIResult> {
    const command = args.join(' ').trim();
    if (!command) {
        return { ok: false, error: 'Usage: assistant run <command>' };
    }
    return await routeAndExecute(`run ${command}`, runtime, verbose);
}

async function handleGit(
    runtime: Runtime,
    subcommand: string | null,
    flags: Record<string, string | boolean>,
    verbose: boolean
): Promise<CLIResult> {
    switch (subcommand) {
        case 'status':
            return await routeAndExecute('git status', runtime, verbose);

        case 'diff': {
            const stagedFlag = flags['staged'] ? ' --staged' : '';
            return await routeAndExecute(`git diff${stagedFlag}`, runtime, verbose);
        }

        case 'log': {
            const limit = flags['limit'] ? parseInt(flags['limit'] as string, 10) : 10;
            return await routeAndExecute(`git log --limit ${limit}`, runtime, verbose);
        }

        default:
            return { ok: false, error: 'Usage: assistant git <status|diff|log> [options]' };
    }
}

function handleAudit(flags: Record<string, string | boolean>, config: ResolvedConfig): CLIResult {
    const limit = flags['limit'] ? parseInt(flags['limit'] as string, 10) : 20;
    const baseDir = config.fileBaseDir;
    const auditPath = path.join(baseDir, 'audit.jsonl');

    if (!fs.existsSync(auditPath)) {
        return { ok: true, result: { entries: [], message: 'No audit entries yet' } };
    }

    try {
        const lines = fs.readFileSync(auditPath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .slice(-limit);

        const entries = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(Boolean);

        return { ok: true, result: { count: entries.length, entries } };
    } catch (e: any) {
        return { ok: false, error: `Failed to read audit log: ${e.message}` };
    }
}

async function handleDemo(executor: Executor, human: boolean): Promise<void> {
    console.log(human ? '🎬 Assistant Demo\n' : '{"demo": "starting"}');

    const steps = [
        { label: 'Creating task', tool: 'task_add', args: { text: 'Buy groceries' } },
        { label: 'Storing note', tool: 'remember', args: { text: 'Shopping list: eggs, milk, bread' } },
        { label: 'Recalling note', tool: 'recall', args: { query: 'shopping list' } },
        { label: 'Listing tasks', tool: 'task_list', args: {} },
        { label: 'Completing task', tool: 'task_done', args: { id: 1 } },
        { label: 'Setting reminder', tool: 'reminder_add', args: { text: 'Check groceries delivered', in_seconds: 3600 } },
    ];

    for (const step of steps) {
        if (human) {
            process.stdout.write(`${step.label}... `);
        }

        const result = await executor.execute(step.tool, step.args);

        if (human) {
            console.log(result.ok ? '✓' : '✗');
            if (result.result && step.tool === 'recall') {
                console.log(`   → Found: ${JSON.stringify(result.result.entries?.slice(0, 2))}`);
            }
        } else {
            console.log(JSON.stringify({ step: step.label, ...result }));
        }
    }

    console.log(human ? '\n✅ Demo complete!' : '{"demo": "complete"}');
    process.exit(0);
}

// Run CLI
main().catch((err) => {
    const verbose = process.argv.includes('--verbose');
    
    if (verbose && err.stack) {
        // Print stack trace to stderr when --verbose is set
        console.error(err.stack);
    }
    
    // Always print the error message (current behavior)
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
});
