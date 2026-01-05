/**
 * Command execution tool handlers.
 * @module tools/cmd_tools
 */

import { makeError, ErrorCode } from '../core/tool_contract';
import { makeDebug } from '../core/debug';
import { ExecutorContext, ToolResult, RunCmdArgs } from '../core/types';
import { parseShellArgs } from '../core/arg_parser';

/**
 * Handle run_cmd tool.
 * @param {RunCmdArgs} args - Tool arguments containing command.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleRunCmd(args: RunCmdArgs, context: ExecutorContext): ToolResult {
    const { commands, requiresConfirmation, start } = context;
    const commandText = args.command?.trim() ?? '';

    // Validate command is not empty/whitespace-only
    if (!commandText) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.VALIDATION_ERROR, 'Command cannot be empty.'),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    if (requiresConfirmation('run_cmd') && args.confirm !== true) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.VALIDATION_ERROR, 'Confirmation required.'),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    // Parse command into cmd and args (respecting quoted strings)
    const parseResult = parseShellArgs(commandText.trim());
    if (!parseResult.ok) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.VALIDATION_ERROR, parseResult.error),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }
    const parts = parseResult.args;
    if (parts.length === 0) {
        return {
            ok: false,
            result: null,
            error: makeError(ErrorCode.VALIDATION_ERROR, 'Command cannot be empty.'),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }
    const cmd = parts[0];
    const cmdArgs = parts.slice(1);

    const cmdResult = commands.runAllowed(cmd, cmdArgs, { confirm: args.confirm });
    // Preserve error code from runAllowed (DENIED_COMMAND_ALLOWLIST, DENIED_PATH_ALLOWLIST)
    // Only use EXEC_ERROR for allowed commands that fail to run
    const error = cmdResult.ok ? null : makeError(
        cmdResult.errorCode || ErrorCode.EXEC_ERROR,
        cmdResult.error || 'Unknown error'
    );

    return {
        ok: cmdResult.ok,
        result: cmdResult.result,
        error,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}
