#!/usr/bin/env node

/**
 * Executor CLI - validates and executes tool calls from stdin.
 *
 * This is the CLI entrypoint for the executor. It handles:
 *   - Argument parsing
 *   - Config loading
 *   - Runtime construction
 *   - Tool execution
 *
 * @module app/executor
 */

import * as path from 'node:path';
import {
    parseArgs,
    makeError,
    validateToolCall,
    makeDebug,
    nowMs,
    getPackageVersion,
    loadConfig,
    resolveConfig,
} from '../core';
import type { DebugInfo, ToolError } from '../core';
import { buildRuntime } from '../runtime';

const VERSION = getPackageVersion();

function readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
            data += chunk;
        });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
    });
}

function jsonResult(
    ok: boolean,
    toolName: string | null | undefined,
    result: any,
    error: ToolError | null | undefined,
    debug: DebugInfo | null
): string {
    return (
        JSON.stringify({
            ok,
            tool_name: toolName ?? null,
            result: result ?? null,
            error: error ?? null,
            _debug: debug,
        }) + '\n'
    );
}

function exitCodeForError(error: ToolError | null | undefined): number {
    if (!error || !error.code) return 1;
    if (
        error.code === 'PARSE_ERROR' ||
        error.code === 'VALIDATION_ERROR' ||
        error.code === 'ROUTE_ERROR'
    )
        return 2;
    return 1;
}

function writeResult(
    ok: boolean,
    toolName: string | null | undefined,
    result: any,
    error: ToolError | null | undefined,
    debug: DebugInfo | null
): void {
    process.stdout.write(jsonResult(ok, toolName, result, error, debug));
    if (!ok) process.exitCode = exitCodeForError(error);
}

export async function runCLI() {
    const start = nowMs();
    const { flags, error: parseError } = parseArgs(process.argv.slice(2), {
        valueFlags: ['memory-path', 'permissions-path', 'memory-limit'],
        booleanFlags: ['version'],
    });

    if (flags['version']) {
        process.stdout.write(`${VERSION}\n`);
        return;
    }

    if (parseError) {
        writeResult(
            false,
            null,
            null,
            makeError('VALIDATION_ERROR', parseError),
            makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            })
        );
        return;
    }

    // Load and resolve config at entrypoint (single source of defaults)
    const rawConfig = loadConfig();
    const resolvedConfig = resolveConfig(rawConfig);
    const baseDir = resolvedConfig.fileBaseDir;

    // Validate and resolve optional CLI paths
    let memoryPath: string | undefined;
    const memoryPathFlag = flags['memory-path'] as string;
    if (memoryPathFlag) {
        if (path.isAbsolute(memoryPathFlag) || memoryPathFlag.includes('..')) {
            writeResult(
                false,
                null,
                null,
                makeError(
                    'VALIDATION_ERROR',
                    'Error: --memory-path must be a relative path within the spike folder.'
                ),
                makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                })
            );
            return;
        }
        const resolved = path.resolve(baseDir, memoryPathFlag);
        if (!resolved.startsWith(baseDir + path.sep)) {
            writeResult(
                false,
                null,
                null,
                makeError(
                    'VALIDATION_ERROR',
                    'Error: --memory-path must be a relative path within the spike folder.'
                ),
                makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                })
            );
            return;
        }
        memoryPath = resolved;
    }

    let permissionsPath: string | undefined;
    const permissionsPathFlag = flags['permissions-path'] as string;
    if (permissionsPathFlag) {
        if (path.isAbsolute(permissionsPathFlag) || permissionsPathFlag.includes('..')) {
            writeResult(
                false,
                null,
                null,
                makeError(
                    'VALIDATION_ERROR',
                    'Error: --permissions-path must be a relative path within the spike folder.'
                ),
                makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                })
            );
            return;
        }
        const resolved = path.resolve(baseDir, permissionsPathFlag);
        if (!resolved.startsWith(baseDir + path.sep)) {
            writeResult(
                false,
                null,
                null,
                makeError(
                    'VALIDATION_ERROR',
                    'Error: --permissions-path must be a relative path within the spike folder.'
                ),
                makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                })
            );
            return;
        }
        permissionsPath = resolved;
    }

    let input = '';
    try {
        input = (await readStdin()).trim();
    } catch (err: any) {
        writeResult(
            false,
            null,
            null,
            makeError('EXEC_ERROR', `Failed to read stdin: ${err.message}`),
            makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            })
        );
        return;
    }

    if (!input) {
        writeResult(
            false,
            null,
            null,
            makeError('PARSE_ERROR', 'Missing JSON input.'),
            makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            })
        );
        return;
    }

    let payload;
    try {
        payload = JSON.parse(input);
    } catch {
        writeResult(
            false,
            null,
            null,
            makeError('PARSE_ERROR', 'Invalid JSON input.'),
            makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            })
        );
        return;
    }

    if (!payload || payload.mode !== 'tool_call' || !payload.tool_call) {
        writeResult(
            false,
            null,
            null,
            makeError('ROUTE_ERROR', 'No tool_call to execute.'),
            makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            })
        );
        return;
    }

    const validation = validateToolCall(payload.tool_call);
    if (!validation.ok || !validation.value) {
        writeResult(
            false,
            payload.tool_call.tool_name || null,
            null,
            validation.error,
            makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            })
        );
        return;
    }

    // Build runtime via composition root (single place for wiring)
    // Executor CLI doesn't need LLM provider (executor-only commands)
    const runtime = buildRuntime(resolvedConfig, {
        includeProvider: false,
        storagePaths: memoryPath ? { memory: memoryPath } : undefined,
        permissionsPath,
        memoryLimit: flags['memory-limit'] ? Number(flags['memory-limit']) : undefined,
    });

    const { tool_name: toolName, args } = validation.value;
    const result = await runtime.executor.execute(toolName, args as Record<string, unknown>);
    writeResult(result.ok, toolName, result.result, result.error, result._debug || null);
}

if (require.main === module) {
    runCLI();
}
