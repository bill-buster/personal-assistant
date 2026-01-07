import { makeError } from '../core/tool_contract';
import {
    CalculateArgs,
    DelegateArgs,
    GetTimeArgs,
    GetWeatherArgs,
    ToolResult,
} from '../core/types';

/**
 * Safe math expression evaluator.
 * Uses a tokenizer + recursive descent parser instead of eval/Function.
 * Only allows numbers, basic operators, and whitelisted Math functions.
 */

// Whitelisted Math functions (name -> arity)
const MATH_FUNCTIONS: Record<string, { fn: (...args: number[]) => number; arity: number }> = {
    sqrt: { fn: Math.sqrt, arity: 1 },
    abs: { fn: Math.abs, arity: 1 },
    sin: { fn: Math.sin, arity: 1 },
    cos: { fn: Math.cos, arity: 1 },
    tan: { fn: Math.tan, arity: 1 },
    log: { fn: Math.log, arity: 1 },
    log10: { fn: Math.log10, arity: 1 },
    exp: { fn: Math.exp, arity: 1 },
    floor: { fn: Math.floor, arity: 1 },
    ceil: { fn: Math.ceil, arity: 1 },
    round: { fn: Math.round, arity: 1 },
    pow: { fn: Math.pow, arity: 2 },
    min: { fn: Math.min, arity: 2 },
    max: { fn: Math.max, arity: 2 },
};

const MATH_CONSTANTS: Record<string, number> = {
    PI: Math.PI,
    E: Math.E,
};

// Pre-compiled regex patterns for performance
const RE_WHITESPACE = /\s/;
const RE_DIGIT = /[0-9]/;
const RE_DIGIT_OR_DOT = /[0-9.]/;
const RE_ALPHA_UNDERSCORE = /[a-zA-Z_]/;
const RE_ALPHANUMERIC_UNDERSCORE = /[a-zA-Z0-9_]/;

type Token =
    | { type: 'number'; value: number }
    | { type: 'operator'; value: string }
    | { type: 'function'; value: string }
    | { type: 'constant'; value: string }
    | { type: 'lparen' }
    | { type: 'rparen' }
    | { type: 'comma' };

function tokenize(expr: string): { ok: boolean; tokens?: Token[]; error?: string } {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
        const ch = expr[i];

        // Skip whitespace
        if (RE_WHITESPACE.test(ch)) {
            i++;
            continue;
        }

        // Number (including decimals)
        if (
            RE_DIGIT.test(ch) ||
            (ch === '.' && i + 1 < expr.length && RE_DIGIT.test(expr[i + 1]))
        ) {
            let numStr = '';
            let hasDecimal = false;
            while (i < expr.length && RE_DIGIT_OR_DOT.test(expr[i])) {
                if (expr[i] === '.') {
                    if (hasDecimal) {
                        return { ok: false, error: `Invalid number: multiple decimal points` };
                    }
                    hasDecimal = true;
                }
                numStr += expr[i++];
            }
            const value = parseFloat(numStr);
            if (isNaN(value)) {
                return { ok: false, error: `Invalid number: ${numStr}` };
            }
            tokens.push({ type: 'number', value });
            continue;
        }

        // Operators
        if ('+-*/%^'.includes(ch)) {
            tokens.push({ type: 'operator', value: ch });
            i++;
            continue;
        }

        // Parentheses
        if (ch === '(') {
            tokens.push({ type: 'lparen' });
            i++;
            continue;
        }
        if (ch === ')') {
            tokens.push({ type: 'rparen' });
            i++;
            continue;
        }

        // Comma (for multi-arg functions)
        if (ch === ',') {
            tokens.push({ type: 'comma' });
            i++;
            continue;
        }

        // Identifiers (functions or constants)
        if (RE_ALPHA_UNDERSCORE.test(ch)) {
            let ident = '';
            while (i < expr.length && RE_ALPHANUMERIC_UNDERSCORE.test(expr[i])) {
                ident += expr[i++];
            }

            // Check if it's a constant
            if (MATH_CONSTANTS[ident] !== undefined) {
                tokens.push({ type: 'constant', value: ident });
                continue;
            }

            // Check if it's a function
            if (MATH_FUNCTIONS[ident]) {
                tokens.push({ type: 'function', value: ident });
                continue;
            }

            return { ok: false, error: `Unknown identifier: ${ident}` };
        }

        return { ok: false, error: `Unexpected character: ${ch}` };
    }

    return { ok: true, tokens };
}

// Recursive descent parser
class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): { ok: boolean; value?: number; error?: string } {
        const result = this.parseExpression();
        if (!result.ok) {
            return result;
        }
        if (this.pos < this.tokens.length) {
            return { ok: false, error: 'Unexpected tokens after expression' };
        }
        return result;
    }

    private peek(): Token | undefined {
        return this.tokens[this.pos];
    }

    private consume(): Token {
        return this.tokens[this.pos++];
    }

    // expression = term (('+' | '-') term)*
    private parseExpression(): { ok: boolean; value?: number; error?: string } {
        const leftResult = this.parseTerm();
        if (!leftResult.ok) {
            return leftResult;
        }
        let left = leftResult.value!;

        while (this.peek()?.type === 'operator') {
            const peeked = this.peek();
            if (peeked?.type !== 'operator') break;
            const opValue = peeked.value;
            if (opValue !== '+' && opValue !== '-') break;
            this.consume();
            const rightResult = this.parseTerm();
            if (!rightResult.ok) {
                return rightResult;
            }
            const right = rightResult.value!;
            left = opValue === '+' ? left + right : left - right;
        }

        return { ok: true, value: left };
    }

    // term = power (('*' | '/' | '%') power)*
    private parseTerm(): { ok: boolean; value?: number; error?: string } {
        const leftResult = this.parsePower();
        if (!leftResult.ok) {
            return leftResult;
        }
        let left = leftResult.value!;

        while (this.peek()?.type === 'operator') {
            const peeked = this.peek();
            if (peeked?.type !== 'operator') break;
            const opValue = peeked.value;
            if (!['*', '/', '%'].includes(opValue)) break;
            this.consume();
            const rightResult = this.parsePower();
            if (!rightResult.ok) {
                return rightResult;
            }
            const right = rightResult.value!;
            if (opValue === '*') left *= right;
            else if (opValue === '/') {
                if (right === 0) {
                    return { ok: false, error: 'Division by zero' };
                }
                left /= right;
            } else left %= right;
        }

        return { ok: true, value: left };
    }

    // power = unary ('^' power)?
    private parsePower(): { ok: boolean; value?: number; error?: string } {
        const leftResult = this.parseUnary();
        if (!leftResult.ok) {
            return leftResult;
        }
        let left = leftResult.value!;

        const peeked = this.peek();
        if (peeked?.type === 'operator' && peeked.value === '^') {
            this.consume();
            const rightResult = this.parsePower(); // Right-associative
            if (!rightResult.ok) {
                return rightResult;
            }
            const right = rightResult.value!;
            left = Math.pow(left, right);
        }

        return { ok: true, value: left };
    }

    // unary = ('-' | '+') unary | primary
    private parseUnary(): { ok: boolean; value?: number; error?: string } {
        const tok = this.peek();
        if (tok?.type === 'operator' && (tok.value === '-' || tok.value === '+')) {
            const op = tok.value;
            this.consume();
            const valResult = this.parseUnary();
            if (!valResult.ok) {
                return valResult;
            }
            const val = valResult.value!;
            return { ok: true, value: op === '-' ? -val : val };
        }
        return this.parsePrimary();
    }

    // primary = number | constant | function '(' args ')' | '(' expression ')'
    private parsePrimary(): { ok: boolean; value?: number; error?: string } {
        const tok = this.peek();

        if (!tok) {
            return { ok: false, error: 'Unexpected end of expression' };
        }

        if (tok.type === 'number') {
            this.consume();
            return { ok: true, value: tok.value };
        }

        if (tok.type === 'constant') {
            this.consume();
            return { ok: true, value: MATH_CONSTANTS[tok.value] };
        }

        if (tok.type === 'function') {
            this.consume();
            const fnName = tok.value;
            const fnInfo = MATH_FUNCTIONS[fnName];

            // Expect '('
            const lparen = this.consume();
            if (lparen?.type !== 'lparen') {
                return { ok: false, error: `Expected '(' after function ${fnName}` };
            }

            // Parse arguments
            const args: number[] = [];
            if (this.peek()?.type !== 'rparen') {
                const arg1Result = this.parseExpression();
                if (!arg1Result.ok) {
                    return arg1Result;
                }
                args.push(arg1Result.value!);
                while (this.peek()?.type === 'comma') {
                    this.consume();
                    const argResult = this.parseExpression();
                    if (!argResult.ok) {
                        return argResult;
                    }
                    args.push(argResult.value!);
                }
            }

            // Expect ')'
            const rparen = this.consume();
            if (rparen?.type !== 'rparen') {
                return { ok: false, error: `Expected ')' after function arguments` };
            }

            if (args.length !== fnInfo.arity) {
                return {
                    ok: false,
                    error: `Function ${fnName} expects ${fnInfo.arity} argument(s), got ${args.length}`,
                };
            }

            return { ok: true, value: fnInfo.fn(...args) };
        }

        if (tok.type === 'lparen') {
            this.consume();
            const valueResult = this.parseExpression();
            if (!valueResult.ok) {
                return valueResult;
            }
            const rparen = this.consume();
            if (rparen?.type !== 'rparen') {
                return { ok: false, error: "Expected ')'" };
            }
            return valueResult;
        }

        return { ok: false, error: `Unexpected token: ${JSON.stringify(tok)}` };
    }
}

function safeEvaluate(expression: string): { ok: boolean; value?: number; error?: string } {
    const tokenResult = tokenize(expression);
    if (!tokenResult.ok) {
        return tokenResult;
    }
    if (!tokenResult.tokens || tokenResult.tokens.length === 0) {
        return { ok: false, error: 'Empty expression' };
    }
    const parser = new Parser(tokenResult.tokens);
    return parser.parse();
}

/**
 * Handle a calculation request.
 * Uses a safe tokenizer + recursive descent parser (no eval/Function).
 */
export function handleCalculate(args: CalculateArgs): ToolResult {
    const { expression } = args;

    const evalResult = safeEvaluate(expression);

    if (!evalResult.ok) {
        return {
            ok: false,
            error: makeError(
                'EXEC_ERROR',
                `Calculation error: ${evalResult.error || 'Unknown error'}`
            ),
        };
    }

    if (typeof evalResult.value !== 'number' || !Number.isFinite(evalResult.value)) {
        return {
            ok: false,
            error: makeError('EXEC_ERROR', 'Expression did not result in a valid number.'),
        };
    }

    return { ok: true, result: { expression, value: evalResult.value } };
}

/**
 * Handle a request for current time/date.
 */
export function handleGetTime(args: GetTimeArgs): ToolResult {
    const { format } = args;
    const now = new Date();

    let formatted: string;
    if (format === 'iso') {
        formatted = now.toISOString();
    } else if (format === 'local') {
        formatted = now.toLocaleString();
    } else {
        // Default readable format
        formatted = now.toString();
    }

    return { ok: true, result: { time: formatted, timestamp: now.getTime() } };
}

/**
 * Handle a request for weather information.
 * Uses wttr.in for free weather data (no API key required).
 * Includes timeout handling and retry for transient 5xx errors.
 */
export async function handleGetWeather(args: GetWeatherArgs): Promise<ToolResult> {
    const { location } = args;
    const TIMEOUT_MS = 15000; // 15 second timeout
    const MAX_RETRIES = 1;

    const encodedLocation = encodeURIComponent(location);
    const url = `https://wttr.in/${encodedLocation}?format=j1`;

    async function fetchWithTimeout(
        retryCount = 0
    ): Promise<{ ok: boolean; response?: Response; error?: string }> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            // Retry once on 5xx errors
            if (response.status >= 500 && retryCount < MAX_RETRIES) {
                return fetchWithTimeout(retryCount + 1);
            }

            return { ok: true, response };
        } catch (err: unknown) {
            clearTimeout(timeoutId);
            const message = err instanceof Error ? err.message : 'Unknown network error';
            return { ok: false, error: message };
        }
    }

    const fetchResult = await fetchWithTimeout();

    if (!fetchResult.ok) {
        return {
            ok: false,
            error: makeError(
                'EXEC_ERROR',
                `Weather request failed: ${fetchResult.error || 'Unknown error'}`
            ),
        };
    }

    if (!fetchResult.response) {
        return {
            ok: false,
            error: makeError('EXEC_ERROR', 'Weather request failed: No response received'),
        };
    }

    try {
        if (!fetchResult.response.ok) {
            return {
                ok: false,
                error: makeError('EXEC_ERROR', `Weather API error: ${fetchResult.response.status}`),
            };
        }

        const data = await fetchResult.response.json();

        // Extract key weather info
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];

        if (!current) {
            return { ok: false, error: makeError('EXEC_ERROR', 'Unable to parse weather data.') };
        }

        const result = {
            location: area?.areaName?.[0]?.value || location,
            region: area?.region?.[0]?.value || '',
            country: area?.country?.[0]?.value || '',
            temperature_f: current.temp_F,
            temperature_c: current.temp_C,
            feels_like_f: current.FeelsLikeF,
            feels_like_c: current.FeelsLikeC,
            humidity: current.humidity,
            condition: current.weatherDesc?.[0]?.value || 'Unknown',
            wind_mph: current.windspeedMiles,
            wind_dir: current.winddir16Point,
            visibility_miles: current.visibilityMiles,
            uv_index: current.uvIndex,
        };

        return { ok: true, result };
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
            return { ok: false, error: makeError('EXEC_ERROR', 'Weather request timed out.') };
        }
        const message = err instanceof Error ? err.message : 'Unknown weather error';
        return { ok: false, error: makeError('EXEC_ERROR', `Weather error: ${message}`) };
    }
}

function handleDelegate(target: string, args: DelegateArgs): ToolResult {
    const task = args.task;
    // Task validation handled by Zod
    return {
        ok: true,
        result: { delegated_to: target, task },
    };
}

export function handleDelegateToCoder(args: DelegateArgs): ToolResult {
    return handleDelegate('coder', args);
}

export function handleDelegateToOrganizer(args: DelegateArgs): ToolResult {
    return handleDelegate('organizer', args);
}

export function handleDelegateToAssistant(args: DelegateArgs): ToolResult {
    return handleDelegate('assistant', args);
}
