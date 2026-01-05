/**
 * File operation tool handlers.
 * @module tools/file_tools
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    makeError,
    makePermissionError,
    makeConfirmationError,
    ErrorCode,
} from '../core/tool_contract';
import { makeDebug } from '../core/debug';
import {
    ExecutorContext,
    ToolResult,
    WriteFileArgs,
    ReadFileArgs,
    ListFilesArgs,
} from '../core/types';

/**
 * Handle write_file tool.
 * @param {WriteFileArgs} args - Tool arguments containing path and content.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleWriteFile(args: WriteFileArgs, context: ExecutorContext): ToolResult {
    const { paths, requiresConfirmation, permissionsPath, start } = context;

    // Precedence: deny_tools (checked in executor) -> require_confirmation_for -> allow_paths
    // Check confirmation BEFORE path check
    if (requiresConfirmation('write_file') && args.confirm !== true) {
        return {
            ok: false,
            result: null,
            error: makeConfirmationError('write_file', permissionsPath),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    let targetPath: string;
    try {
        targetPath = paths.resolveAllowed(args.path, 'write');
    } catch {
        // Path resolution or permission check failed
        return {
            ok: false,
            result: null,
            error: makePermissionError(
                'write_file',
                args.path,
                permissionsPath,
                ErrorCode.DENIED_PATH_ALLOWLIST
            ),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    const content = args.content;

    // Defensive check: ensure limits exists before destructuring
    if (!context.limits) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, 'Internal error: limits not configured'),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    const { maxWriteSize } = context.limits;
    // Check file size limit
    if (content.length > maxWriteSize) {
        return {
            ok: false,
            result: null,
            error: makeError(
                ErrorCode.VALIDATION_ERROR,
                `Content exceeds maximum size of ${maxWriteSize} bytes.`
            ),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content, 'utf8');
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, `Failed to write file: ${err.message}`),
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
        result: { bytes: content.length },
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
 * Handle read_file tool with pagination support.
 * @param {ReadFileArgs} args - Tool arguments containing path, offset, limit.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleReadFile(args: ReadFileArgs, context: ExecutorContext): ToolResult {
    const { paths, permissionsPath, start } = context;

    let targetPath: string;
    try {
        targetPath = paths.resolveAllowed(args.path, 'read');
    } catch {
        // Path resolution or permission check failed
        return {
            ok: false,
            result: null,
            error: makePermissionError(
                'read_file',
                args.path,
                permissionsPath,
                ErrorCode.DENIED_PATH_ALLOWLIST
            ),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    // Get file stats
    let fileSize: number;
    try {
        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
            return {
                ok: false,
                result: null,
                error: makeError(
                    ErrorCode.EXEC_ERROR,
                    `Path '${args.path}' is a directory, not a file.`
                ),
                _debug: makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                }),
            };
        }
        fileSize = stats.size;
    } catch (statErr: any) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, `Failed to stat file: ${statErr.message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    // Use provided offset and limit (validated by Zod schema)
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 8192;

    // Calculate actual bytes to read
    const bytesAvailable = Math.max(0, fileSize - offset);
    const bytesToRead = Math.min(limit, bytesAvailable);

    // If offset is beyond file end, return empty content with eof
    if (offset >= fileSize) {
        return {
            ok: true,
            result: {
                content: '',
                bytesRead: 0,
                nextOffset: offset,
                eof: true,
                fileSize,
            },
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

    // Read the specified byte range
    let content: string;
    let bytesRead: number;
    try {
        const fd = fs.openSync(targetPath, 'r');
        try {
            const buffer = Buffer.alloc(bytesToRead);
            bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, offset);
            content = buffer.slice(0, bytesRead).toString('utf8');
        } finally {
            fs.closeSync(fd);
        }
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, `Failed to read file: ${err.message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    const nextOffset = offset + bytesRead;
    const eof = nextOffset >= fileSize;

    return {
        ok: true,
        result: {
            content,
            bytesRead,
            nextOffset,
            eof,
            fileSize,
        },
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
 * Handle list_files tool.
 * @param {ListFilesArgs} args - Tool arguments with optional path.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleListFiles(args: ListFilesArgs, context: ExecutorContext): ToolResult {
    const { baseDir, paths, permissionsPath, start } = context;

    // Resolve target directory - default to baseDir if no path provided
    let targetDir: string;
    if (args?.path) {
        let resolved: string;
        try {
            resolved = paths.resolveAllowed(args.path, 'list');
        } catch {
            // Path resolution or permission check failed
            return {
                ok: false,
                result: null,
                error: makePermissionError(
                    'list_files',
                    args.path,
                    permissionsPath,
                    ErrorCode.DENIED_PATH_ALLOWLIST
                ),
                _debug: makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                }),
            };
        }
        // Verify it's a directory
        try {
            const stats = fs.statSync(resolved);
            if (!stats.isDirectory()) {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.VALIDATION_ERROR,
                        `Path '${args.path}' is not a directory.`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start,
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
        } catch (err: any) {
            return {
                ok: false,
                result: null,
                error: makeError(
                    ErrorCode.EXEC_ERROR,
                    `Failed to access path '${args.path}': ${err.message}`
                ),
                _debug: makeDebug({
                    path: 'tool_json',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                }),
            };
        }
        targetDir = resolved;
    } else {
        targetDir = baseDir;
    }

    // Read directory with file types
    let dirEntries: fs.Dirent[];
    try {
        dirEntries = fs.readdirSync(targetDir, { withFileTypes: true });
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, `Failed to list files: ${err.message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    // Filter entries and add type info (optimized: single pass instead of filter+map)
    // Exclude hidden files (starting with .) for security - they may contain sensitive data
    // like .npmrc, .bash_history, .ssh, etc.
    const entries: Array<{ name: string; type: 'file' | 'directory' }> = [];
    for (const dirent of dirEntries) {
        // Skip hidden files/directories (those starting with .)
        if (dirent.name.startsWith('.')) {
            continue;
        }
        const entryPath = path.join(targetDir, dirent.name);
        try {
            paths.assertAllowed(entryPath, 'list');
            entries.push({
                name: dirent.name,
                type: dirent.isDirectory() ? 'directory' : 'file',
            });
        } catch {
            // Skip entries that aren't allowed
        }
    }
    // Sort entries by name
    entries.sort((a, b) => a.name.localeCompare(b.name));

    return {
        ok: true,
        result: { entries },
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
