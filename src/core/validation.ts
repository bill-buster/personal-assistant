/**
 * Centralized Input Validation Layer
 * 
 * Provides consistent validation and error formatting across the CLI.
 * All validation functions return a standardized result object.
 * 
 * @module validation
 */

import { z } from 'zod';

export interface ValidationResult {
    ok: boolean;
    error?: {
        code: 'VALIDATION_ERROR' | 'INPUT_ERROR' | 'PERMISSION_ERROR';
        message: string;
        field?: string;
    };
}

/**
 * Maximum input length for commands (prevent DoS).
 */
const MAX_INPUT_LENGTH = 10000;

/**
 * Dangerous shell patterns that should be blocked.
 */
const DANGEROUS_PATTERNS = [
    /[;&|`$]/,        // Shell metacharacters
    /\.\./,           // Path traversal
    /\s-[a-zA-Z]*r/,  // Recursive flags like -rf
];

/**
 * Validate raw user input for basic sanity.
 */
export function validateInput(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
        return {
            ok: false,
            error: {
                code: 'INPUT_ERROR',
                message: 'Input is required and must be a string.',
            },
        };
    }

    const trimmed = input.trim();

    if (trimmed.length === 0) {
        return {
            ok: false,
            error: {
                code: 'INPUT_ERROR',
                message: 'Input cannot be empty.',
            },
        };
    }

    if (trimmed.length > MAX_INPUT_LENGTH) {
        return {
            ok: false,
            error: {
                code: 'INPUT_ERROR',
                message: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`,
            },
        };
    }

    return { ok: true };
}

/**
 * Validate a file path for safety.
 */
export function validatePath(filePath: string): ValidationResult {
    if (!filePath || typeof filePath !== 'string') {
        return {
            ok: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Path is required.',
                field: 'path',
            },
        };
    }

    // Block path traversal
    if (filePath.includes('..')) {
        return {
            ok: false,
            error: {
                code: 'PERMISSION_ERROR',
                message: 'Path traversal (..) is not allowed.',
                field: 'path',
            },
        };
    }

    // Block absolute paths
    if (filePath.startsWith('/') || filePath.match(/^[A-Za-z]:/)) {
        return {
            ok: false,
            error: {
                code: 'PERMISSION_ERROR',
                message: 'Absolute paths are not allowed.',
                field: 'path',
            },
        };
    }

    return { ok: true };
}

/**
 * Validate a shell command for dangerous patterns.
 */
export function validateCommand(command: string): ValidationResult {
    if (!command || typeof command !== 'string') {
        return {
            ok: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Command is required.',
                field: 'command',
            },
        };
    }

    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
            return {
                ok: false,
                error: {
                    code: 'PERMISSION_ERROR',
                    message: 'Command contains potentially dangerous characters.',
                    field: 'command',
                },
            };
        }
    }

    return { ok: true };
}

/**
 * Validate tool arguments against a Zod schema.
 */
export function validateToolArgs<T>(
    toolName: string,
    args: unknown,
    schema: z.ZodType<T>
): ValidationResult & { data?: T } {
    const result = schema.safeParse(args);

    if (!result.success) {
        const firstError = result.error.issues[0];
        return {
            ok: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: `Invalid arguments for ${toolName}: ${firstError.message}`,
                field: firstError.path.join('.'),
            },
        };
    }

    return { ok: true, data: result.data };
}

/**
 * Create a consistent error response from a ValidationResult.
 */
export function formatValidationError(result: ValidationResult): string {
    if (result.ok || !result.error) {
        return '';
    }

    const { code, message, field } = result.error;
    const prefix = code === 'PERMISSION_ERROR' ? 'Permission denied' : 'Validation error';
    const fieldInfo = field ? ` (${field})` : '';

    return `${prefix}${fieldInfo}: ${message}`;
}
