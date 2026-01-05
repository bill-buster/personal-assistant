/**
 * Git Tools
 *
 * Safe git operations for version control within the CLI.
 * All operations are read-only for safety.
 *
 * @module tools/git_tools
 */

import { spawnSync } from 'node:child_process';
import { ExecutorContext, ToolResult, GitStatusArgs, GitDiffArgs, GitLogArgs } from '../core/types';
import { makeDebug } from '../core/debug';
import { makeError, ErrorCode } from '../core/tool_contract';

/**
 * Execute a git command safely
 */
function runGitCommand(
    args: string[],
    cwd: string
): { ok: boolean; output?: string; error?: string } {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10000 });

    if (result.error) {
        return { ok: false, error: result.error.message };
    }

    if (result.status !== 0) {
        const error = result.stderr.trim() || `git ${args[0]} failed with status ${result.status}`;
        return { ok: false, error };
    }

    return { ok: true, output: result.stdout.trim() };
}

/**
 * git_status - Show working tree status
 */
export function handleGitStatus(args: GitStatusArgs, context: ExecutorContext): ToolResult {
    const start = context.start;

    const result = runGitCommand(['status', '--short'], context.baseDir);

    if (!result.ok) {
        return {
            ok: false,
            error: makeError(ErrorCode.EXEC_ERROR, result.error || 'git status failed'),
            _debug: makeDebug({
                path: 'git_status',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    const lines = result.output?.split('\n').filter(Boolean) || [];
    const status = {
        clean: lines.length === 0,
        files: lines.map(line => ({
            status: line.substring(0, 2).trim(),
            path: line.substring(3),
        })),
        summary: lines.length === 0 ? 'Working tree clean' : `${lines.length} file(s) changed`,
    };

    return {
        ok: true,
        result: status,
        _debug: makeDebug({
            path: 'git_status',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        }),
    };
}

/**
 * git_diff - Show changes (staged or unstaged)
 */
export function handleGitDiff(args: GitDiffArgs, context: ExecutorContext): ToolResult {
    const start = context.start;

    const gitArgs = ['diff'];
    if (args.staged) {
        gitArgs.push('--staged');
    }
    gitArgs.push('--stat'); // Summary by default

    if (args.path) {
        // Validate path is within baseDir AND in the allowlist (blocks .git, .env, node_modules)
        try {
            context.paths.resolveAllowed(args.path, 'read');
        } catch {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.DENIED_PATH_ALLOWLIST,
                    'Path outside allowed directory or blocked'
                ),
                _debug: makeDebug({
                    path: 'git_diff',
                    start,
                    model: null,
                    memory_read: false,
                    memory_write: false,
                }),
            };
        }
        gitArgs.push('--', args.path);
    }

    const result = runGitCommand(gitArgs, context.baseDir);

    if (!result.ok) {
        return {
            ok: false,
            error: makeError(ErrorCode.EXEC_ERROR, result.error || 'git diff failed'),
            _debug: makeDebug({
                path: 'git_diff',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    return {
        ok: true,
        result: {
            staged: args.staged || false,
            diff: result.output || '(no changes)',
            empty: !result.output || result.output.trim() === '',
        },
        _debug: makeDebug({
            path: 'git_diff',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        }),
    };
}

/**
 * git_log - Show recent commits
 */
export function handleGitLog(args: GitLogArgs, context: ExecutorContext): ToolResult {
    const start = context.start;
    const limit = Math.min(args.limit || 10, 50); // Cap at 50

    const result = runGitCommand(
        ['log', `--oneline`, `-${limit}`, '--format=%h|%s|%an|%ar'],
        context.baseDir
    );

    if (!result.ok) {
        return {
            ok: false,
            error: makeError(ErrorCode.EXEC_ERROR, result.error || 'git log failed'),
            _debug: makeDebug({
                path: 'git_log',
                start,
                model: null,
                memory_read: false,
                memory_write: false,
            }),
        };
    }

    const lines = result.output?.split('\n').filter(Boolean) || [];
    const commits = lines.map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
    });

    return {
        ok: true,
        result: {
            count: commits.length,
            commits,
        },
        _debug: makeDebug({
            path: 'git_log',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        }),
    };
}
