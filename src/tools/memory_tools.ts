/**
 * Memory operation tool handlers.
 * @module tools/memory_tools
 */

import { makeError } from '../core/tool_contract';
import { makeDebug } from '../core/debug';
import {
    ExecutorContext,
    ToolResult,
    RememberArgs,
    RecallArgs,
    MemoryAddArgs,
    MemorySearchArgs,
    MemoryEntry,
} from '../core/types';

/**
 * Handle remember tool.
 * @param {RememberArgs} args - Tool arguments containing text.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleRemember(args: RememberArgs, context: ExecutorContext): ToolResult {
    const { readMemory, writeMemory, memoryPath, memoryLimit, start } = context;
    const text = args.text.trim();

    let memory;
    try {
        memory = readMemory(memoryPath);
        // Check limit BEFORE pushing to prevent off-by-one
        if (memoryLimit && memory.entries.length >= memoryLimit) {
            // Trim oldest entries to make room
            memory.entries = memory.entries.slice(-(memoryLimit - 1));
        }
        memory.entries.push({ ts: new Date().toISOString(), text });
        writeMemory(memoryPath, memory);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            result: null,
            error: makeError('EXEC_ERROR', `Failed to update memory: ${message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: true,
                memory_write: true,
            }),
        };
    }

    return {
        ok: true,
        result: { count: memory.entries.length },
        error: null,
        _debug: makeDebug({
            path: 'tool_json',
            start,
            model: null,
            memory_read: true,
            memory_write: true,
        }),
    };
}

/**
 * Handle recall tool.
 * @param {RecallArgs} args - Tool arguments containing query.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleRecall(args: RecallArgs, context: ExecutorContext): ToolResult {
    const { readMemory, memoryPath, memoryLimit, scoreEntry, sortByScoreAndRecency, start } =
        context;
    const query = args.query.trim();

    let entries;
    try {
        entries = readMemory(memoryPath).entries;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            result: null,
            error: makeError('EXEC_ERROR', `Failed to read memory: ${message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: true,
                memory_write: false,
            }),
        };
    }

    const needle = query.toLowerCase();
    const terms = needle.split(/\s+/).filter(Boolean);
    const recallLimit = memoryLimit ? Math.min(5, memoryLimit) : 5;
    const matches = sortByScoreAndRecency(entries, needle, terms)
        .filter(entry => scoreEntry(entry, needle, terms) > 0)
        .slice(0, recallLimit);

    return {
        ok: true,
        result: { entries: matches },
        error: null,
        _debug: makeDebug({
            path: 'tool_json',
            start,
            model: null,
            memory_read: true,
            memory_write: false,
        }),
    };
}

/**
 * Handle memory_add tool (append-only memory log).
 * @param {MemoryAddArgs} args - Tool arguments containing text.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleMemoryAdd(args: MemoryAddArgs, context: ExecutorContext): ToolResult {
    const { appendJsonl, memoryLogPath, start } = context;
    const text = args.text.trim();

    const entry = { ts: new Date().toISOString(), text };
    try {
        appendJsonl(memoryLogPath, entry);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            result: null,
            error: makeError('EXEC_ERROR', `Failed to write memory: ${message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    return {
        ok: true,
        result: { entry },
        error: null,
        _debug: makeDebug({
            path: 'tool_json',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        }),
    };
}

/**
 * Handle memory_search tool.
 * @param {MemorySearchArgs} args - Tool arguments containing query, limit, offset.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleMemorySearch(args: MemorySearchArgs, context: ExecutorContext): ToolResult {
    const { readMemory, memoryPath, sortByScoreAndRecency, start } = context;
    const query = args.query.trim();

    const limit = args.limit || 5;
    const offset = args.offset || 0;

    // Zod schema ensures limit is integer. Check for negative logic if needed (schema handles int).
    if (limit <= 0) {
        return {
            ok: false,
            result: null,
            error: makeError('VALIDATION_ERROR', 'Invalid limit.'),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    if (offset < 0) {
        return {
            ok: false,
            result: null,
            error: makeError('VALIDATION_ERROR', 'Invalid offset.'),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    const entries = readMemory(memoryPath).entries;

    const needle = query.toLowerCase();
    const matches = entries.filter(entry => entry.text.toLowerCase().includes(needle));
    const ordered = sortByScoreAndRecency(matches, needle);
    const paged = ordered.slice(offset, offset + limit);

    return {
        ok: true,
        result: { entries: paged },
        error: null,
        _debug: makeDebug({
            path: 'tool_json',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        }),
    };
}
