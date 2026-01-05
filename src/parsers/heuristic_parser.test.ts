#!/usr/bin/env node

/**
 * Unit tests for parseHeuristicCommand
 * @module parsers/heuristic_parser.test
 */

import { parseHeuristicCommand } from './heuristic_parser';

interface TestCase {
    input: string;
    expectedTool: string | null;
    expectedArgs?: Record<string, any>;
    description: string;
}

const testCases: TestCase[] = [
    // Task Management
    {
        input: 'list my tasks',
        expectedTool: 'task_list',
        expectedArgs: { status: 'all' },
        description: 'list my tasks -> task_list'
    },
    {
        input: 'show my tasks',
        expectedTool: 'task_list',
        expectedArgs: { status: 'all' },
        description: 'show my tasks -> task_list'
    },
    {
        input: 'add task buy milk',
        expectedTool: 'task_add',
        expectedArgs: { text: 'buy milk' },
        description: 'add task -> task_add'
    },
    {
        input: 'list open tasks',
        expectedTool: 'task_list',
        expectedArgs: { status: 'open' },
        description: 'list open tasks -> task_list with status open'
    },
    {
        input: 'complete task 5',
        expectedTool: 'task_done',
        expectedArgs: { id: 5 },
        description: 'complete task N -> task_done'
    },
    {
        input: 'done task 10',
        expectedTool: 'task_done',
        expectedArgs: { id: 10 },
        description: 'done task N -> task_done'
    },

    // Read File Aliases
    {
        input: 'read file notes.txt',
        expectedTool: 'read_file',
        expectedArgs: { path: 'notes.txt' },
        description: 'read file X -> read_file'
    },
    {
        input: 'read notes.txt',
        expectedTool: 'read_file',
        expectedArgs: { path: 'notes.txt' },
        description: 'read X -> read_file'
    },
    {
        input: 'cat README.md',
        expectedTool: 'read_file',
        expectedArgs: { path: 'README.md' },
        description: 'cat X -> read_file'
    },
    {
        input: 'show me config.json',
        expectedTool: 'read_file',
        expectedArgs: { path: 'config.json' },
        description: 'show me X -> read_file'
    },
    {
        input: "what's in file notes.txt",
        expectedTool: 'read_file',
        expectedArgs: { path: 'notes.txt' },
        description: "what's in file X -> read_file"
    },
    {
        input: 'what is in document.md',
        expectedTool: 'read_file',
        expectedArgs: { path: 'document.md' },
        description: 'what is in X -> read_file'
    },

    // Write File Aliases
    {
        input: 'write to notes.txt: hello world',
        expectedTool: 'write_file',
        expectedArgs: { path: 'notes.txt', content: 'hello world' },
        description: 'write to X: Y -> write_file'
    },
    {
        input: 'save important data to backup.txt',
        expectedTool: 'write_file',
        expectedArgs: { path: 'backup.txt', content: 'important data' },
        description: 'save Y to X -> write_file'
    },

    // List Files
    {
        input: 'list files',
        expectedTool: 'list_files',
        expectedArgs: {},
        description: 'list files -> list_files'
    },
    {
        input: 'list',
        expectedTool: 'list_files',
        expectedArgs: {},
        description: 'list -> list_files'
    },

    // Memory / Remember
    {
        input: 'save this: important meeting tomorrow',
        expectedTool: 'remember',
        expectedArgs: { text: 'important meeting tomorrow' },
        description: 'save this: X -> remember'
    },
    {
        input: 'note: call mom later',
        expectedTool: 'remember',
        expectedArgs: { text: 'call mom later' },
        description: 'note: X -> remember'
    },

    // Memory Search
    {
        input: 'find memory roadmap',
        expectedTool: 'memory_search',
        expectedArgs: { query: 'roadmap' },
        description: 'find memory X -> memory_search'
    },
    {
        input: 'search memory project notes',
        expectedTool: 'memory_search',
        expectedArgs: { query: 'project notes' },
        description: 'search memory X -> memory_search'
    },

    // Utility Tools
    {
        input: 'what time is it',
        expectedTool: 'get_time',
        expectedArgs: {},
        description: 'what time is it -> get_time'
    },
    {
        input: 'current time',
        expectedTool: 'get_time',
        expectedArgs: {},
        description: 'current time -> get_time'
    },
    {
        input: 'time now',
        expectedTool: 'get_time',
        expectedArgs: {},
        description: 'time now -> get_time'
    },
    {
        input: 'calculate 15 * 8',
        expectedTool: 'calculate',
        expectedArgs: { expression: '15 * 8' },
        description: 'calculate X -> calculate'
    },
    {
        input: 'calc 100 / 4',
        expectedTool: 'calculate',
        expectedArgs: { expression: '100 / 4' },
        description: 'calc X -> calculate'
    },
    {
        input: 'compute 2 + 2',
        expectedTool: 'calculate',
        expectedArgs: { expression: '2 + 2' },
        description: 'compute X -> calculate'
    },

    // Calendar Aliases
    {
        input: 'check my calendar',
        expectedTool: 'calendar_list',
        expectedArgs: {},
        description: 'check my calendar -> calendar_list'
    },
    {
        input: "what's on my calendar",
        expectedTool: 'calendar_list',
        expectedArgs: {},
        description: "what's on my calendar -> calendar_list"
    },

    // Contact Aliases
    {
        input: 'find contact John',
        expectedTool: 'contact_search',
        expectedArgs: { query: 'John' },
        description: 'find contact X -> contact_search'
    },
    {
        input: 'lookup contact Alice Smith',
        expectedTool: 'contact_search',
        expectedArgs: { query: 'Alice Smith' },
        description: 'lookup contact X -> contact_search'
    },

    // No Match Cases
    {
        input: 'hello world',
        expectedTool: null,
        description: 'random text -> null'
    },
    {
        input: 'please help me',
        expectedTool: null,
        description: 'help request -> null'
    },
    {
        input: 'explain how caching works',
        expectedTool: null,
        description: 'explanation request -> null'
    }
];

let failures = 0;

for (const testCase of testCases) {
    const result = parseHeuristicCommand(testCase.input);

    if (testCase.expectedTool === null) {
        if (result !== null) {
            failures++;
            console.error(`FAIL: ${testCase.description}`);
            console.error(`  Input: "${testCase.input}"`);
            console.error(`  Expected: null`);
            console.error(`  Got: ${JSON.stringify(result)}`);
        }
        continue;
    }

    if (!result || !result.tool) {
        failures++;
        console.error(`FAIL: ${testCase.description}`);
        console.error(`  Input: "${testCase.input}"`);
        console.error(`  Expected tool: ${testCase.expectedTool}`);
        console.error(`  Got: null`);
        continue;
    }

    if (result.tool.name !== testCase.expectedTool) {
        failures++;
        console.error(`FAIL: ${testCase.description}`);
        console.error(`  Input: "${testCase.input}"`);
        console.error(`  Expected tool: ${testCase.expectedTool}`);
        console.error(`  Got tool: ${result.tool.name}`);
        continue;
    }

    if (testCase.expectedArgs) {
        const expectedJson = JSON.stringify(testCase.expectedArgs);
        const actualJson = JSON.stringify(result.tool.args);
        if (expectedJson !== actualJson) {
            failures++;
            console.error(`FAIL: ${testCase.description}`);
            console.error(`  Input: "${testCase.input}"`);
            console.error(`  Expected args: ${expectedJson}`);
            console.error(`  Got args: ${actualJson}`);
            continue;
        }
    }
}

if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
}

console.log('OK');
export { };
