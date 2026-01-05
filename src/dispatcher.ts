/**
 * Dispatcher - Routes requests to appropriate tools/agents with configurable behavior.
 *
 * The dispatcher sits between the REPL/router and the executor, providing:
 * - Intent-based routing (what tool should handle this request?)
 * - Action enforcement (if LLM says "I will do X", ensure it actually calls a tool)
 * - Automatic tool selection based on keywords/patterns
 *
 * @module dispatcher
 */

import { Agent, Message, ToolCall } from './core/types';
import { validateToolCall } from './core/tool_contract';

/**
 * Dispatcher options for controlling routing behavior.
 */
export interface DispatcherOptions {
    /**
     * Enable automatic tool dispatch based on intent detection.
     * When true, certain queries will skip LLM and go directly to tools.
     * @default true
     */
    autoDispatch: boolean;

    /**
     * Enforce that LLM responses include tool calls when appropriate.
     * If the LLM responds with "I will fetch X" without a tool call,
     * the dispatcher will attempt to make the appropriate tool call.
     * @default true
     */
    enforceActions: boolean;

    /**
     * Maximum number of automatic retries if the LLM fails to use a tool.
     * @default 2
     */
    maxAutoRetries: number;

    /**
     * Enable verbose logging of dispatcher decisions.
     * @default false
     */
    verbose: boolean;

    /**
     * Custom intent patterns for automatic dispatch.
     * Maps regex patterns to tool names.
     */
    intentPatterns?: IntentPattern[];
}

/**
 * Pattern for intent-based routing.
 */
export interface IntentPattern {
    /** Regex pattern to match against user input */
    pattern: RegExp;
    /** Tool to invoke when pattern matches */
    tool: string;
    /** Default arguments for the tool */
    defaultArgs?: Record<string, any>;
    /** Priority for pattern matching (higher = checked first) */
    priority?: number;
}

/**
 * Result of dispatch decision.
 */
export interface DispatchResult {
    /** How the request was handled */
    action: 'auto_dispatch' | 'llm_route' | 'enforced_dispatch';
    /** Tool call if auto-dispatched or enforced */
    toolCall?: ToolCall;
    /** Agent to route to (if not auto-dispatched) */
    agent?: Agent;
    /** Debug information */
    debug?: {
        matchedPattern?: string;
        enforceReason?: string;
        skippedLLM?: boolean;
    };
}

/**
 * Default intent patterns for common queries.
 */
export const DEFAULT_INTENT_PATTERNS: IntentPattern[] = [
    // Task queries - high priority
    {
        pattern: /\b(what('s| is| are)?|show|list|get|check|see|view)\b.*(task|todo|to-?do|to do)/i,
        tool: 'task_list',
        defaultArgs: { status: 'open' },
        priority: 100,
    },
    {
        pattern: /\b(my|the)\s*(task|todo)s?\b/i,
        tool: 'task_list',
        defaultArgs: { status: 'open' },
        priority: 90,
    },
    {
        pattern: /\bwhat\s+(do\s+i\s+have\s+to|should\s+i|need\s+to)\b/i,
        tool: 'task_list',
        defaultArgs: { status: 'open' },
        priority: 85,
    },

    // Time queries
    {
        pattern: /\b(what|current|tell\s+me)\b.*\b(time|date)\b/i,
        tool: 'get_time',
        defaultArgs: {},
        priority: 80,
    },

    // Memory recall queries
    {
        pattern: /\b(what|do\s+you)\s+(know|remember)\s+(about|regarding)\b/i,
        tool: 'recall',
        priority: 70,
    },
    // "how old am I", "what is my age", "what's my X"
    {
        pattern: /\b(how\s+old\s+am\s+i|what('?s|\s+is)\s+my\s+\w+)\b/i,
        tool: 'recall',
        priority: 75,
    },
    // "do you remember X", "when did I X" (exclude "remember to" for reminders)
    {
        pattern: /\b(do\s+you\s+remember(?!\s+to\b)|when\s+did\s+i)\b/i,
        tool: 'recall',
        priority: 72,
    },
    // "my age", "my birthday", etc. (Strict end of string or question mark)
    {
        pattern: /^my\s+(age|birthday|name|address|phone|email)[?]?$/i,
        tool: 'recall',
        priority: 68,
    },
];

/**
 * Phrases that indicate intent to act but may not result in a tool call.
 * Used for action enforcement.
 */
const ACTION_INTENT_PHRASES = [
    /I('ll| will)\s+(fetch|get|check|list|look up|find|retrieve|delegate|ask)/i,
    /Let me\s+(fetch|get|check|list|look up|find|retrieve|delegate|ask)/i,
    /I('m going to|'ll)\s+(fetch|get|check|list|delegate)/i,
    /Just a moment/i,
    /One moment/i,
    /Checking/i,
];

/**
 * Maps action intent phrases to likely tools.
 */
const INTENT_TO_TOOL_MAP: Array<{ pattern: RegExp; hints: string[]; tool: string }> = [
    { pattern: /task|todo|to-?do/i, hints: ['task', 'todo'], tool: 'task_list' },
    { pattern: /time|clock/i, hints: ['time'], tool: 'get_time' },
    { pattern: /weather/i, hints: ['weather'], tool: 'get_weather' },
    { pattern: /memory|remember/i, hints: ['remember', 'recall'], tool: 'recall' },
    { pattern: /delegate.*coder/i, hints: ['delegate', 'coder'], tool: 'delegate_to_coder' },
    {
        pattern: /delegate.*organizer/i,
        hints: ['delegate', 'organizer'],
        tool: 'delegate_to_organizer',
    },
    {
        pattern: /delegate.*assistant/i,
        hints: ['delegate', 'assistant'],
        tool: 'delegate_to_assistant',
    },
];

/**
 * Default dispatcher options.
 */
export const DEFAULT_DISPATCHER_OPTIONS: DispatcherOptions = {
    autoDispatch: true,
    enforceActions: true,
    maxAutoRetries: 2,
    verbose: false,
    intentPatterns: DEFAULT_INTENT_PATTERNS,
};

/**
 * Dispatcher class for intelligent request routing.
 */
export class Dispatcher {
    private options: DispatcherOptions;

    constructor(options: Partial<DispatcherOptions> = {}) {
        this.options = { ...DEFAULT_DISPATCHER_OPTIONS, ...options };

        // Sort patterns by priority (descending)
        if (this.options.intentPatterns) {
            this.options.intentPatterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        }
    }

    /**
     * Analyze user input and determine how to dispatch it.
     *
     * @param input - User's input text
     * @param currentAgent - Currently active agent
     * @param history - Conversation history (for context)
     * @returns DispatchResult with routing decision
     */
    analyze(input: string, currentAgent: Agent, _history: Message[] = []): DispatchResult {
        if (this.options.verbose) {
            console.log(`[Dispatcher] Analyzing: "${input.substring(0, 50)}..."`);
        }

        // Check if this matches an auto-dispatch pattern
        if (this.options.autoDispatch) {
            const autoResult = this.tryAutoDispatch(input, currentAgent);
            if (autoResult) {
                return autoResult;
            }
        }

        // Default: route through LLM
        return {
            action: 'llm_route',
            agent: currentAgent,
            debug: { skippedLLM: false },
        };
    }

    /**
     * Check if an LLM response should have included a tool call but didn't.
     * If so, attempt to determine the appropriate tool to call.
     *
     * @param llmResponse - The LLM's text response
     * @param originalInput - The user's original query
     * @param currentAgent - Currently active agent
     * @returns DispatchResult if a tool should be enforced, null otherwise
     */
    enforceAction(
        llmResponse: string,
        originalInput: string,
        currentAgent: Agent
    ): DispatchResult | null {
        if (!this.options.enforceActions) {
            return null;
        }

        // Check if the response indicates intent to act
        const hasActionIntent = ACTION_INTENT_PHRASES.some(p => p.test(llmResponse));

        if (!hasActionIntent) {
            return null;
        }

        if (this.options.verbose) {
            console.log(
                `[Dispatcher] Detected unfulfilled action intent in: "${llmResponse.substring(0, 50)}..."`
            );
        }

        // Try to infer the intended tool from context
        const combinedContext = `${originalInput} ${llmResponse}`.toLowerCase();

        for (const mapping of INTENT_TO_TOOL_MAP) {
            if (mapping.pattern.test(combinedContext)) {
                // Check if agent has access to this tool
                if (currentAgent.tools.includes(mapping.tool)) {
                    // Extract args from the LLM response (or input)
                    const responseArgs = this.extractArgsFromText(llmResponse, mapping.tool);
                    const inputArgs = this.extractArgsFromText(originalInput, mapping.tool);
                    const args = Object.keys(responseArgs).length > 0 ? responseArgs : inputArgs;
                    const toolCall = this.buildToolCall(mapping.tool, args);

                    if (!toolCall) {
                        if (this.options.verbose) {
                            console.log(
                                `[Dispatcher] Skipping enforcement for ${mapping.tool}: missing/invalid args`
                            );
                        }
                        continue; // Try other mappings instead of bailing out
                    }

                    return {
                        action: 'enforced_dispatch',
                        toolCall,
                        debug: {
                            enforceReason: `LLM said "${llmResponse.substring(0, 30)}..." without calling tool`,
                            matchedPattern: mapping.pattern.source,
                        },
                    };
                }
            }
        }

        return null;
    }

    /**
     * Try to auto-dispatch based on intent patterns.
     */
    private tryAutoDispatch(input: string, currentAgent: Agent): DispatchResult | null {
        const patterns = this.options.intentPatterns || [];

        for (const pattern of patterns) {
            if (pattern.pattern.test(input)) {
                // Check if the current agent has access to this tool
                if (currentAgent.tools.includes(pattern.tool)) {
                    const args = {
                        ...pattern.defaultArgs,
                        ...this.extractArgsFromText(input, pattern.tool),
                    };
                    const toolCall = this.buildToolCall(pattern.tool, args);

                    if (this.options.verbose) {
                        console.log(
                            `[Dispatcher] Auto-dispatch: ${pattern.tool} (pattern: ${pattern.pattern.source})`
                        );
                    }

                    if (!toolCall) {
                        if (this.options.verbose) {
                            console.log(
                                `[Dispatcher] Skipping auto-dispatch for ${pattern.tool}: missing/invalid args`
                            );
                        }
                        continue;
                    }

                    return {
                        action: 'auto_dispatch',
                        toolCall,
                        debug: {
                            matchedPattern: pattern.pattern.source,
                            skippedLLM: true,
                        },
                    };
                }
            }
        }

        return null;
    }

    /**
     * Extract arguments from text for a given tool.
     */
    private extractArgsFromText(text: string, toolName: string): Record<string, any> {
        const args: Record<string, any> = {};

        // For recall tool, extract the query
        if (toolName === 'recall') {
            // "how old am I" → query "age"
            const ageMatch = text.match(/\bhow\s+old\s+am\s+i\b/i);
            if (ageMatch) {
                args.query = 'age';
                return args;
            }

            // "what's my age", "what is my birthday" → query "age", "birthday"
            const whatsMyMatch = text.match(/\bwhat(?:'?s|\s+is)\s+my\s+((?:\w+\s*)+)/i);
            if (whatsMyMatch) {
                args.query = whatsMyMatch[1].trim().toLowerCase();
                return args;
            }

            // "my age", "my birthday" → query "age", "birthday"
            const myXMatch = text.match(/^my\s+((?:\w+\s*)+)/i);
            if (myXMatch) {
                args.query = myXMatch[1].trim().toLowerCase();
                return args;
            }

            // "do you remember X" → query "X"
            const doYouRememberMatch = text.match(/\bdo\s+you\s+remember\s+(.+)/i);
            if (doYouRememberMatch) {
                args.query = doYouRememberMatch[1].trim().replace(/[?.!]+$/, '');
                return args;
            }

            // "when did I X" → query "X"
            const whenDidIMatch = text.match(/\bwhen\s+did\s+i\s+(.+)/i);
            if (whenDidIMatch) {
                args.query = whenDidIMatch[1].trim().replace(/[?.!]+$/, '');
                return args;
            }

            // "what do you know/remember about X" → query "X"
            const match = text.match(/(?:about|regarding)\s+(.+)/i);
            if (match) {
                args.query = match[1].trim();
            }
            if (!args.query) {
                const recallMatch = text.match(/recall\s+(.+)/i);
                if (recallMatch) {
                    args.query = recallMatch[1].trim();
                }
            }
        } else if (toolName === 'get_weather') {
            const match =
                text.match(/\bweather\b.*\b(?:in|for|at)\s+(.+)/i) ||
                text.match(/^(.+?)\s+weather\b/i);
            if (match) {
                const candidate = match[1].trim().replace(/[?.!]+$/, '');
                if (this.isLikelyLocation(candidate)) {
                    args.location = candidate;
                }
            }
        }
        // For delegation, extract the task
        else if (toolName.startsWith('delegate_to_')) {
            // "delegate the task of listing files to..."
            // "delegate listing files to..."
            const match =
                text.match(/delegate.*(?:task of|task|job of)?\s+(.+?)\s+(?:to|with)/i) ||
                text.match(/delegate\s+(.+?)\s+(?:to|with)/i);
            if (match) {
                // Clean up common artifacts
                let task = match[1].trim();
                task = task.replace(/^the\s+/, '');
                if (task) {
                    args.task = task;
                }
            }
        }

        return args;
    }

    /**
     * Get default arguments for a tool.
     */
    private getDefaultArgsForTool(toolName: string): Record<string, any> {
        switch (toolName) {
            case 'task_list':
                return { status: 'open' };
            case 'get_time':
                return {};
            case 'recall':
                // Default to a query that likely yields 0 matches but satisfies schema,
                // resulting in recency-based sort (showing latest memories).
                return { query: 'recent items' };
            default:
                return {};
        }
    }

    /**
     * Heuristic filter for location-like strings.
     */
    private isLikelyLocation(value: string): boolean {
        if (!value) return false;
        const lowered = value.toLowerCase();
        const blocked = /(\b)(you|me|us|them|here|there|today|now|tomorrow)(\b)/;
        const verbs =
            /(\b)(check|get|look|tell|find|fetch|see|weather|will|going|moment|please|what|whats|how|where)(\b)/;
        if (blocked.test(lowered)) return false;
        if (verbs.test(lowered)) return false;
        return true;
    }

    /**
     * Build a validated tool call, applying defaults where appropriate.
     */
    private buildToolCall(toolName: string, args: Record<string, any>): ToolCall | null {
        const mergedArgs = { ...this.getDefaultArgsForTool(toolName), ...args };
        const validation = validateToolCall({ tool_name: toolName, args: mergedArgs });
        if (!validation.ok) {
            return null;
        }
        return { tool_name: toolName, args: mergedArgs };
    }

    /**
     * Update dispatcher options at runtime.
     */
    updateOptions(options: Partial<DispatcherOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get current options (for debugging/inspection).
     */
    getOptions(): DispatcherOptions {
        return { ...this.options };
    }

    /**
     * Add a custom intent pattern.
     */
    addPattern(pattern: IntentPattern): void {
        if (!this.options.intentPatterns) {
            this.options.intentPatterns = [];
        }
        this.options.intentPatterns.push(pattern);
        this.options.intentPatterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * Remove an intent pattern by tool name.
     */
    removePattern(toolName: string): void {
        if (this.options.intentPatterns) {
            this.options.intentPatterns = this.options.intentPatterns.filter(
                p => p.tool !== toolName
            );
        }
    }
}

/**
 * Create a dispatcher with default options.
 */
export function createDispatcher(options?: Partial<DispatcherOptions>): Dispatcher {
    return new Dispatcher(options);
}
