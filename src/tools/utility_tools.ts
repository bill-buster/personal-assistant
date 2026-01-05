import {
    ToolResult,
    CalculateArgs,
    GetTimeArgs,
    GetWeatherArgs,
    DelegateArgs,
} from '../core/types';
import { makeError } from '../core/tool_contract';

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

type Token =
    | { type: 'number'; value: number }
    | { type: 'operator'; value: string }
    | { type: 'function'; value: string }
    | { type: 'constant'; value: string }
    | { type: 'lparen' }
    | { type: 'rparen' }
    | { type: 'comma' };

function tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
        const ch = expr[i];

        // Skip whitespace
        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // Number (including decimals)
        if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < expr.length && /[0-9]/.test(expr[i + 1]))) {
            let numStr = '';
            let hasDecimal = false;
            while (i < expr.length && /[0-9.]/.test(expr[i])) {
                if (expr[i] === '.') {
                    if (hasDecimal) {
                        throw new Error(`Invalid number: multiple decimal points`);
                    }
                    hasDecimal = true;
                }
                numStr += expr[i++];
            }
            const value = parseFloat(numStr);
            if (isNaN(value)) throw new Error(`Invalid number: ${numStr}`);
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
        if (/[a-zA-Z_]/.test(ch)) {
            let ident = '';
            while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
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

            throw new Error(`Unknown identifier: ${ident}`);
        }

        throw new Error(`Unexpected character: ${ch}`);
    }

    return tokens;
}

// Recursive descent parser
class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): number {
        const result = this.parseExpression();
        if (this.pos < this.tokens.length) {
            throw new Error('Unexpected tokens after expression');
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
    private parseExpression(): number {
        let left = this.parseTerm();

        while (this.peek()?.type === 'operator') {
            const opValue = (this.peek() as { type: 'operator'; value: string }).value;
            if (opValue !== '+' && opValue !== '-') break;
            this.consume();
            const right = this.parseTerm();
            left = opValue === '+' ? left + right : left - right;
        }

        return left;
    }

    // term = power (('*' | '/' | '%') power)*
    private parseTerm(): number {
        let left = this.parsePower();

        while (
            this.peek()?.type === 'operator' &&
            ['*', '/', '%'].includes((this.peek() as { type: 'operator'; value: string }).value)
        ) {
            const op = (this.consume() as { type: 'operator'; value: string }).value;
            const right = this.parsePower();
            if (op === '*') left *= right;
            else if (op === '/') left /= right;
            else left %= right;
        }

        return left;
    }

    // power = unary ('^' power)?
    private parsePower(): number {
        let left = this.parseUnary();

        if (
            this.peek()?.type === 'operator' &&
            (this.peek() as { type: 'operator'; value: string }).value === '^'
        ) {
            this.consume();
            const right = this.parsePower(); // Right-associative
            left = Math.pow(left, right);
        }

        return left;
    }

    // unary = ('-' | '+') unary | primary
    private parseUnary(): number {
        const tok = this.peek();
        if (
            tok?.type === 'operator' &&
            ((tok as { type: 'operator'; value: string }).value === '-' ||
                (tok as { type: 'operator'; value: string }).value === '+')
        ) {
            const op = (this.consume() as { type: 'operator'; value: string }).value;
            const val = this.parseUnary();
            return op === '-' ? -val : val;
        }
        return this.parsePrimary();
    }

    // primary = number | constant | function '(' args ')' | '(' expression ')'
    private parsePrimary(): number {
        const tok = this.peek();

        if (!tok) throw new Error('Unexpected end of expression');

        if (tok.type === 'number') {
            this.consume();
            return tok.value;
        }

        if (tok.type === 'constant') {
            this.consume();
            return MATH_CONSTANTS[tok.value];
        }

        if (tok.type === 'function') {
            this.consume();
            const fnName = tok.value;
            const fnInfo = MATH_FUNCTIONS[fnName];

            // Expect '('
            const lparen = this.consume();
            if (lparen?.type !== 'lparen') {
                throw new Error(`Expected '(' after function ${fnName}`);
            }

            // Parse arguments
            const args: number[] = [];
            if (this.peek()?.type !== 'rparen') {
                args.push(this.parseExpression());
                while (this.peek()?.type === 'comma') {
                    this.consume();
                    args.push(this.parseExpression());
                }
            }

            // Expect ')'
            const rparen = this.consume();
            if (rparen?.type !== 'rparen') {
                throw new Error(`Expected ')' after function arguments`);
            }

            if (args.length !== fnInfo.arity) {
                throw new Error(
                    `Function ${fnName} expects ${fnInfo.arity} argument(s), got ${args.length}`
                );
            }

            return fnInfo.fn(...args);
        }

        if (tok.type === 'lparen') {
            this.consume();
            const value = this.parseExpression();
            const rparen = this.consume();
            if (rparen?.type !== 'rparen') {
                throw new Error("Expected ')'");
            }
            return value;
        }

        throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
    }
}

function safeEvaluate(expression: string): number {
    const tokens = tokenize(expression);
    if (tokens.length === 0) {
        throw new Error('Empty expression');
    }
    const parser = new Parser(tokens);
    return parser.parse();
}

/**
 * Handle a calculation request.
 * Uses a safe tokenizer + recursive descent parser (no eval/Function).
 */
export function handleCalculate(args: CalculateArgs): ToolResult {
    const { expression } = args;

    try {
        const result = safeEvaluate(expression);

        if (typeof result !== 'number' || !Number.isFinite(result)) {
            return {
                ok: false,
                error: makeError('EXEC_ERROR', 'Expression did not result in a valid number.'),
            };
        }

        return { ok: true, result: { expression, value: result } };
    } catch (err: any) {
        return { ok: false, error: makeError('EXEC_ERROR', `Calculation error: ${err.message}`) };
    }
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
    const TIMEOUT_MS = 6000; // 6 second timeout
    const MAX_RETRIES = 1;

    const encodedLocation = encodeURIComponent(location);
    const url = `https://wttr.in/${encodedLocation}?format=j1`;

    async function fetchWithTimeout(retryCount = 0): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            // Retry once on 5xx errors
            if (response.status >= 500 && retryCount < MAX_RETRIES) {
                return fetchWithTimeout(retryCount + 1);
            }

            return response;
        } catch (err: any) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    try {
        const response = await fetchWithTimeout();

        if (!response.ok) {
            return {
                ok: false,
                error: makeError('EXEC_ERROR', `Weather API error: ${response.status}`),
            };
        }

        const data = await response.json();

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
    } catch (err: any) {
        if (err.name === 'AbortError') {
            return { ok: false, error: makeError('EXEC_ERROR', 'Weather request timed out.') };
        }
        return { ok: false, error: makeError('EXEC_ERROR', `Weather error: ${err.message}`) };
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
