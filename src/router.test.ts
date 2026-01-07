import { describe, expect, it } from 'vitest';
import { route, runParseArgs } from './app/router';
import { ResolvedConfig } from './core/config';
import { LLMProvider } from './runtime';

// Minimal mock config for routing
const mockConfig = {
    fileBaseDir: '/tmp',
    defaultProvider: 'mock',
    toolSchemas: {}, // Add if needed
} as unknown as ResolvedConfig;

// Mock provider that never gets called for regex/heuristic tests
const mockProvider = {
    complete: async () => ({ ok: false, error: 'Mock provider should not be called' }),
} as unknown as LLMProvider;

// Mock SYSTEM agent locally to avoid circular dependencies during testing
const MOCK_SYSTEM_AGENT = {
    name: 'System',
    description: 'Direct CLI access with all tools.',
    systemPrompt: 'You are a helpful assistant.',
    tools: [
        'read_file',
        'write_file',
        'list_files',
        'delete_file',
        'move_file',
        'copy_file',
        'file_info',
        'count_words',
        'create_directory',
        'delete_directory',
        'run_cmd',
        'remember',
        'recall',
        'memory_add',
        'memory_search',
        'task_add',
        'task_list',
        'task_done',
        'calculate',
        'get_time',
        'get_weather',
        'git_status',
        'git_diff',
        'git_log',
        'read_url',
        'cursor_command_eval',
        'grep',
        'reminder_add',
    ],
    kind: 'system' as const,
};

describe('Router CLI Args', () => {
    it('should parse basic input', () => {
        const { rawInput, error } = runParseArgs(['fix: bug']);
        expect(rawInput).toBe('fix: bug');
        expect(error).toBeFalsy();
    });

    it('should parse intent flag', () => {
        const { forcedIntent, rawInput } = runParseArgs(['--intent', 'explain', 'why']);
        expect(forcedIntent).toBe('explain');
        expect(rawInput).toBe('why');
    });

    it('should handle flags', () => {
        const { jsonOutput, toolJsonOutput } = runParseArgs(['--json', '--tool-json', 'input']);
        expect(jsonOutput).toBe(true);
        expect(toolJsonOutput).toBe(true);
    });

    it('should return error for missing intent value', () => {
        const { error } = runParseArgs(['--intent']);
        expect(error).toContain('requires a value');
    });

    it('should return error for unknown intent is handled in main, but args parsing passes', () => {
        // runParseArgs just extracts strings, validation of valid intent strings happens in main
        const { forcedIntent } = runParseArgs(['--intent', 'unknown', 'input']);
        expect(forcedIntent).toBe('unknown');
    });
});

describe('Router Logic', () => {
    // Re-using test cases from original router.test.ts where applicable
    // Adapted for direct route() call testing

    // Helper to call route wrapper
    const runRoute = async (
        input: string,
        intent: string = 'spike',
        forcedInstruction: string | null = null,
        _toolJson: boolean = false
    ) => {
        const agent = MOCK_SYSTEM_AGENT;

        return route(
            input,
            intent,
            forcedInstruction,
            [], // history
            true, // verbose: true
            agent,
            mockProvider,
            { enableRegex: true, toolFormat: 'compact' },
            mockConfig
        );
    };

    const cases = [
        {
            name: 'Weather regex',
            input: 'weather in London',
            expectedTool: 'get_weather',
            expectedArgs: { location: 'London' },
        },
        {
            name: 'Remember regex',
            input: 'remember: buy milk',
            expectedTool: 'remember',
            expectedArgs: { text: 'buy milk' },
        },
        {
            name: 'Recall regex',
            input: 'recall: milk',
            expectedTool: 'recall',
            expectedArgs: { query: 'milk' },
        },
        {
            name: 'Read URL regex',
            input: 'read url https://example.com',
            expectedTool: 'read_url',
            expectedArgs: { url: 'https://example.com' },
        },
        {
            name: 'Read bare domain regex',
            input: 'read example.com',
            expectedTool: 'read_url',
            expectedArgs: { url: 'https://example.com' },
        },
        {
            name: 'Write regex',
            input: 'write ./note.txt hello world',
            expectedTool: 'write_file',
            expectedArgs: { path: './note.txt', content: 'hello world' },
        },
        {
            name: 'Task add heuristic',
            input: 'task add buy milk',
            expectedTool: 'task_add',
            expectedArgs: { text: 'buy milk' },
        },
        {
            name: 'Task list heuristic',
            input: 'task list --status open',
            expectedTool: 'task_list',
            expectedArgs: { status: 'open' },
        },
        {
            name: 'Remind me heuristic',
            input: 'remind me in 10 minutes to stretch',
            expectedTool: 'reminder_add',
            expectedArgs: { text: 'stretch', in_seconds: 600 },
        },
        {
            name: 'Calc regex',
            input: 'calc: 2+2',
            expectedTool: 'calculate',
            expectedArgs: { expression: '2+2' },
        },
        {
            name: 'Time regex',
            input: 'what time is it',
            expectedTool: 'get_time',
            expectedArgs: {},
        },
    ];

    it.each(cases)('$name', async ({ input, expectedTool, expectedArgs }) => {
        const result = await runRoute(input);

        if ('error' in result) {
            console.log(`FAIL case ${input}:`, result.error);
        } else if (result.mode !== 'tool_call' || result.tool_call?.tool_name !== expectedTool) {
            console.log(`FAIL case ${input}:`, JSON.stringify(result, null, 2));
        }

        expect(result).toMatchObject({
            mode: 'tool_call',
            tool_call: {
                tool_name: expectedTool,
                args: expectedArgs,
            },
        });

        // Check for debug path
        if ('_debug' in result && result._debug) {
            expect(result._debug.path).toBeDefined();
        }
    });

    it('should result in reply input does not match tool', async () => {
        // 'spike' intent errors on no tool match, so use 'explain' to trigger reply
        const result = await runRoute('unmatched input', 'explain');
        if ('error' in result) throw new Error(result.error);
        expect(result.mode).toBe('reply');
        if (result.mode === 'reply') {
            expect(result.reply.content).toBe('unmatched input');
            expect(result.reply.instruction).toBe('Implement the simplest viable solution.');
        }
    });

    it('should respect custom intent', async () => {
        // In production handling, runParseArgs -> parseInput strips "intent:"
        // So we pass "code" as content here to simulate what route() receives
        const result = await runRoute('code', 'explain', 'Explain code');
        if ('error' in result) throw new Error(result.error);
        expect(result.mode).toBe('reply');
        if (result.mode === 'reply') {
            expect(result.reply.instruction).toBe('Explain code');
            expect(result.reply.content).toBe('code');
        }
    });
});
