/**
 * grep tool handler.
 * Search for text patterns in files using regex.
 * @module tools/grep_tools
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { makeError, ErrorCode } from '../core/tool_contract';
import { makeDebug } from '../core/debug';
import { ExecutorContext, ToolResult, ToolSpec, PathOp } from '../core/types';

export const GrepSchema = z.object({
    pattern: z.string().min(1),
    path: z.string().min(1),
    case_sensitive: z.boolean().optional().default(false),
    max_results: z.number().int().positive().optional(),
});

export type GrepArgs = z.infer<typeof GrepSchema>;

export const GREP_TOOL_SPEC: ToolSpec = {
    status: 'ready',
    description: 'Search for text patterns in files (fast regex search across files).',
    required: ['pattern', 'path'],
    parameters: {
        pattern: {
            type: 'string',
            description: 'Regex pattern to search for.',
        },
        path: {
            type: 'string',
            description: 'File or directory path to search in.',
        },
        case_sensitive: {
            type: 'boolean',
            description: 'Whether search is case-sensitive (default: false).',
        },
        max_results: {
            type: 'number',
            description: 'Maximum number of results to return (optional).',
        },
    },
};

interface Match {
    file: string;
    line: number;
    text: string;
    match: string;
}

/**
 * Recursively find all files in a directory.
 * @param dirPath - Directory path to search.
 * @param allowedPaths - Path validator function.
 * @returns Array of file paths.
 */
function findFilesRecursive(
    dirPath: string,
    allowedPaths: { assertAllowed: (p: string, op: PathOp) => void }
): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        // Skip hidden files/directories and common build/cache directories
        // Note: This is a blacklist approach (consistent with list_files tool behavior).
        // It skips common build artifacts to avoid searching large generated directories.
        // Legitimate directories with these names inside allowed workspace are also skipped
        // (e.g., a user folder named "dist" would be skipped - this is intentional to avoid
        // searching build artifacts).
        if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'coverage' ||
            entry.name === '.git'
        ) {
            continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        try {
            allowedPaths.assertAllowed(fullPath, 'read');
        } catch {
            // Skip entries that aren't allowed
            continue;
        }

        if (entry.isDirectory()) {
            files.push(...findFilesRecursive(fullPath, allowedPaths));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Search for pattern in a single file.
 * @param filePath - File path to search.
 * @param pattern - Regex pattern.
 * @param caseSensitive - Whether search is case-sensitive.
 * @param maxFileSize - Maximum file size to read (bytes). Files larger than this are skipped.
 * @returns Array of matches, or null if file is too large.
 */
function searchInFile(
    filePath: string,
    pattern: string,
    caseSensitive: boolean,
    maxFileSize: number
): Match[] | null {
    const matches: Match[] = [];

    try {
        // Check file size before reading
        const stats = fs.statSync(filePath);
        if (stats.size > maxFileSize) {
            // File too large - return null to indicate skip
            return null;
        }

        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);

        // Create regex with flags
        const flags = caseSensitive ? 'g' : 'gi';
        let regex: RegExp;
        try {
            regex = new RegExp(pattern, flags);
        } catch (err: any) {
            // Invalid regex pattern
            throw new Error(`Invalid regex pattern: ${err.message}`);
        }

        // Search each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineMatches = line.matchAll(regex);

            for (const match of lineMatches) {
                matches.push({
                    file: filePath,
                    line: i + 1, // 1-indexed line numbers
                    text: line,
                    match: match[0],
                });
            }
        }
    } catch (err: any) {
        // Skip files that can't be read:
        // - Binary files (encoding errors when reading as UTF-8)
        // - Permission errors
        // - Other I/O errors
        // Don't throw - just skip silently (consistent with grep behavior)
        return [];
    }

    return matches;
}

/**
 * Handle grep tool.
 * @param args - Tool arguments containing pattern, path, and options.
 * @param context - Execution context.
 * @returns Result object with ok, result, error, debug.
 */
export function handleGrep(args: GrepArgs, context: ExecutorContext): ToolResult {
    const { paths, start, limits } = context;
    const { pattern, path: searchPath, case_sensitive = false, max_results } = args;

    // Get max file size from context limits (default to 1MB if not configured)
    const maxFileSize = limits?.maxReadSize ?? 1024 * 1024;

    // Validate and resolve path
    let targetPath: string;
    try {
        targetPath = paths.resolveAllowed(searchPath, 'read');
    } catch {
        return {
            ok: false,
            result: null,
            error: makeError(
                ErrorCode.DENIED_PATH_ALLOWLIST,
                `Path '${searchPath}' is not allowed for reading.`
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

    // Check if path exists
    let stats: fs.Stats;
    try {
        stats = fs.statSync(targetPath);
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, `Path not found: ${err.message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    // Validate regex pattern
    try {
        new RegExp(pattern, case_sensitive ? 'g' : 'gi');
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.EXEC_ERROR, `Invalid regex pattern: ${err.message}`),
            _debug: makeDebug({
                path: 'tool_json',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    // Collect all files to search
    const filesToSearch: string[] = [];
    if (stats.isFile()) {
        filesToSearch.push(targetPath);
    } else if (stats.isDirectory()) {
        filesToSearch.push(...findFilesRecursive(targetPath, paths));
    } else {
        return {
            ok: false,
            result: null,
            error: makeError(
                ErrorCode.EXEC_ERROR,
                `Path '${searchPath}' is not a file or directory.`
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

    // Search all files
    const allMatches: Match[] = [];
    const skippedFiles: string[] = [];
    for (const filePath of filesToSearch) {
        const matches = searchInFile(filePath, pattern, case_sensitive, maxFileSize);

        if (matches === null) {
            // File too large - skip it
            skippedFiles.push(path.relative(context.baseDir, filePath));
            continue;
        }

        allMatches.push(...matches);

        // Stop if we've reached max_results
        if (max_results && allMatches.length >= max_results) {
            allMatches.splice(max_results);
            break;
        }
    }

    // Format results relative to baseDir for readability
    const baseDir = context.baseDir;
    const formattedMatches = allMatches.map(match => ({
        file: path.relative(baseDir, match.file),
        line: match.line,
        text: match.text.trim(),
        match: match.match,
    }));

    return {
        ok: true,
        result: {
            matches: formattedMatches,
            count: formattedMatches.length,
            pattern,
            case_sensitive,
            skipped_files: skippedFiles.length > 0 ? skippedFiles : undefined,
            skipped_count: skippedFiles.length > 0 ? skippedFiles.length : undefined,
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
