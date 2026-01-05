import { ToolError, DebugInfo } from './types';
import { TOOL_SCHEMAS } from '../tools/schemas';

// Stable denial codes for permissions enforcement
export enum ErrorCode {
  // Permission Errors
  DENIED_COMMAND_ALLOWLIST = 'DENIED_COMMAND_ALLOWLIST',
  DENIED_PATH_ALLOWLIST = 'DENIED_PATH_ALLOWLIST',
  DENIED_TOOL_BLOCKLIST = 'DENIED_TOOL_BLOCKLIST',
  DENIED_AGENT_TOOLSET = 'DENIED_AGENT_TOOLSET',
  CONFIRMATION_REQUIRED = 'CONFIRMATION_REQUIRED',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  MISSING_ARGUMENT = 'MISSING_ARGUMENT',
  UNKNOWN_TOOL = 'UNKNOWN_TOOL',

  // Execution Errors
  EXEC_ERROR = 'EXEC_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export const DENIED_COMMAND_ALLOWLIST = ErrorCode.DENIED_COMMAND_ALLOWLIST;
export const DENIED_PATH_ALLOWLIST = ErrorCode.DENIED_PATH_ALLOWLIST;
export const DENIED_TOOL_BLOCKLIST = ErrorCode.DENIED_TOOL_BLOCKLIST;
export const DENIED_AGENT_TOOLSET = ErrorCode.DENIED_AGENT_TOOLSET;

/**
 * Create a standardized error object.
 * @param code - Error code (e.g., 'VALIDATION_ERROR', 'EXEC_ERROR').
 * @param message - Human-readable error message.
 * @param details - Additional error details.
 * @returns Error object with code, message, and details.
 */
export function makeError(code: string, message: string, details?: unknown): ToolError {
  return { code, message, details: details || null };
}

/**
 * Create a standardized permission denied error.
 */
export function makePermissionError(toolName: string, path: string | undefined, permissionsPath: string, code?: string): ToolError {
  let message = `Tool '${toolName}' was blocked.`;
  if (path) {
    message += ` Path '${path}' is not allowed.`;
    message += ` To unblock, add this path to 'allow_paths' in the permissions file: ${permissionsPath}`;
  } else {
    message += ` Command is not allowed.`;
  }
  return makeError(code || ErrorCode.VALIDATION_ERROR, message);
}

/**
 * Create a standardized confirmation required error.
 */
export function makeConfirmationError(toolName: string, permissionsPath: string): ToolError {
  return makeError(
    ErrorCode.CONFIRMATION_REQUIRED,
    `Tool '${toolName}' requires confirmation. Please retry with 'confirm: true' or remove '${toolName}' from 'require_confirmation_for' in: ${permissionsPath}`
  );
}

/**
 * Create a tool call object.
 * @param toolName - Name of the tool to call.
 * @param args - Arguments for the tool.
 * @param debug - Debug information.
 * @returns Tool call object with tool_name, args, and _debug.
 */
export function makeToolCall(toolName: string, args?: Record<string, unknown>, debug?: DebugInfo | null): { tool_name: string; args: Record<string, unknown>; _debug: DebugInfo | null } {
  return {
    tool_name: toolName,
    args: args || {},
    _debug: debug || null,
  };
}

/**
 * Validate a tool call against the tool specifications.
 * Uses TOOL_SCHEMAS from tools/schemas.ts as the single source of truth (per D007).
 * @param input - Tool call input to validate.
 * @returns Validation result with ok flag and either value or error.
 */
export function validateToolCall(input: unknown): { ok: boolean; value?: { tool_name: string; args: Record<string, unknown>; _debug: DebugInfo | null }; error?: ToolError } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: makeError(ErrorCode.VALIDATION_ERROR, 'tool_call must be an object.') };
  }

  const inputObj = input as Record<string, unknown>;
  const toolName = inputObj.tool_name;
  if (!toolName || typeof toolName !== 'string') {
    return { ok: false, error: makeError(ErrorCode.VALIDATION_ERROR, 'tool_name must be a string.') };
  }

  const spec = TOOL_SCHEMAS[toolName];
  if (!spec) {
    return { ok: false, error: makeError(ErrorCode.UNKNOWN_TOOL, `Unknown tool_name: ${toolName}.`) };
  }

  const args = inputObj.args;
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, error: makeError(ErrorCode.VALIDATION_ERROR, 'args must be an object.') };
  }

  const argsObj = args as Record<string, unknown>;

  // Check required parameters
  for (const key of spec.required) {
    if (!(key in argsObj)) {
      return {
        ok: false,
        error: makeError(ErrorCode.MISSING_ARGUMENT, `Missing required arg: ${key}.`),
      };
    }
  }

  // Type validation for provided args
  for (const [key, paramSpec] of Object.entries(spec.parameters)) {
    if (key in argsObj) {
      const value = argsObj[key];
      const expectedType = paramSpec.type;

      // Map our types to JavaScript typeof results
      let valid = false;
      if (expectedType === 'string') valid = typeof value === 'string';
      else if (expectedType === 'integer') valid = Number.isInteger(value);
      else if (expectedType === 'number') valid = typeof value === 'number';
      else if (expectedType === 'boolean') valid = typeof value === 'boolean';

      if (!valid) {
        return {
          ok: false,
          error: makeError(ErrorCode.INVALID_ARGUMENT, `Invalid type for arg: ${key}. Expected ${expectedType}.`),
        };
      }
    }
  }

  return {
    ok: true,
    value: {
      tool_name: toolName,
      args: argsObj,
      _debug: (inputObj._debug as DebugInfo) || null,
    },
  };
}
