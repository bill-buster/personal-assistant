import { spawnSync } from 'node:child_process';
import { ToolResult, ReadUrlArgs, ExecutorContext } from '../core/types';
import { makeError, ErrorCode } from '../core/tool_contract';

/**
 * Handle reading content from a URL using curl (sync).
 * Checks allow_commands before executing.
 */
export function handleReadUrl(args: ReadUrlArgs, context: ExecutorContext): ToolResult {
    const { url } = args;

    // Security: Check if curl is in the allowlist
    if (!context.permissions.allow_commands.includes('curl')) {
        return {
            ok: false,
            error: makeError(
                ErrorCode.DENIED_COMMAND_ALLOWLIST,
                `Command 'curl' is not allowed. Listed in permissions.json: ${context.permissions.allow_commands.join(', ')}`
            ),
        };
    }

    // Security: Block file:// and only allow http/https
    try {
        const urlObj = new URL(url);
        const allowedSchemes = ['http:', 'https:'];
        if (!allowedSchemes.includes(urlObj.protocol)) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.VALIDATION_ERROR,
                    `URL scheme '${urlObj.protocol}' is not allowed. Only http:// and https:// are permitted.`
                ),
            };
        }
    } catch (err: any) {
        // Invalid URL format
        return {
            ok: false,
            error: makeError(ErrorCode.VALIDATION_ERROR, `Invalid URL format: ${err.message}`),
        };
    }

    try {
        // Use curl to fetch the content synchronously
        const result = spawnSync('curl', ['-s', '-L', url], {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
        });

        if (result.error) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.EXEC_ERROR,
                    `Failed to execute curl: ${result.error.message}`
                ),
            };
        }

        if (result.status !== 0) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.EXEC_ERROR,
                    `curl failed with status ${result.status}: ${result.stderr}`
                ),
            };
        }

        const html = result.stdout;

        // Basic HTML stripping to get text content
        // Security: Improved regex to handle edge cases (spaces, case variations)
        const text = html
            // Remove scripts and styles first (handle spaces and case variations)
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gim, '')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gim, '')
            // Replace <br>, <p>, <div> endings with newlines to preserve some structure
            .replace(/<br\s*\/?>/gim, '\n')
            .replace(/<\/p>/gim, '\n')
            .replace(/<\/div>/gim, '\n')
            // Remove remaining tags
            .replace(/<[^>]+>/g, ' ')
            // Normalize whitespace (collapse multiple spaces/newlines)
            .replace(/\s+/g, ' ')
            .trim();

        // Limit the output size
        const MAX_LENGTH = 8000;
        const truncated =
            text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) + '...[truncated]' : text;

        return {
            ok: true,
            result: {
                url,
                content: truncated,
                length: text.length,
            },
        };
    } catch (err: any) {
        return {
            ok: false,
            error: makeError(ErrorCode.EXEC_ERROR, `System error: ${err.message}`),
        };
    }
}
