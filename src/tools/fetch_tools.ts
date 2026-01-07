import { ToolResult, ReadUrlArgs, ExecutorContext } from '../core/types';
import { makeError, ErrorCode } from '../core/tool_contract';

/**
 * Handle reading content from a URL using native fetch.
 * Includes SSRF protection to block localhost and private IP ranges.
 */
export async function handleReadUrl(
    args: ReadUrlArgs,
    _context: ExecutorContext
): Promise<ToolResult> {
    const { url } = args;

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

        // SSRF protection: Block localhost and private IP ranges
        const hostname = urlObj.hostname.toLowerCase();

        // Block localhost hostnames
        const localhostPatterns = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::]', '[::1]'];
        if (localhostPatterns.includes(hostname)) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.VALIDATION_ERROR,
                    'Access to localhost is not allowed (SSRF protection)'
                ),
            };
        }

        // Block private IP ranges (IPv4)
        const privateIpv4Regex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
        if (privateIpv4Regex.test(hostname)) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.VALIDATION_ERROR,
                    'Access to private IP ranges is not allowed (SSRF protection)'
                ),
            };
        }

        // Block link-local and multicast IPv6 ranges
        if (
            hostname.startsWith('fe80:') ||
            hostname.startsWith('fc00:') ||
            hostname.startsWith('fd00:')
        ) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.VALIDATION_ERROR,
                    'Access to private IPv6 ranges is not allowed (SSRF protection)'
                ),
            };
        }
    } catch (err: unknown) {
        // Invalid URL format
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            error: makeError(ErrorCode.VALIDATION_ERROR, `Invalid URL format: ${message}`),
        };
    }

    try {
        // Use native fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

        let response: Response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': 'PersonalAssistant/1.0',
                },
            });
            clearTimeout(timeoutId);
        } catch (err: unknown) {
            clearTimeout(timeoutId);
            const message = err instanceof Error ? err.message : 'Unknown network error';
            return {
                ok: false,
                error: makeError(ErrorCode.EXEC_ERROR, `Failed to fetch URL: ${message}`),
            };
        }

        if (!response.ok) {
            return {
                ok: false,
                error: makeError(
                    ErrorCode.EXEC_ERROR,
                    `HTTP ${response.status}: ${response.statusText}`
                ),
            };
        }

        // Limit response size to 10MB
        const MAX_SIZE = 10 * 1024 * 1024;
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
            return {
                ok: false,
                error: makeError(ErrorCode.EXEC_ERROR, 'Response too large (max 10MB)'),
            };
        }

        const html = await response.text();

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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            error: makeError(ErrorCode.EXEC_ERROR, `System error: ${message}`),
        };
    }
}
