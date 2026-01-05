
import { strict as assert } from 'assert';
import { handleMessageList, handleMessageSend } from './comms_tools';
import * as child_process from 'child_process';
import { ExecutorContext, ToolResult } from '../core/types';

// Simple mock context
const mockContext: ExecutorContext = {
    paths: {
        resolve: (p: string) => p,
        assertAllowed: () => {},
        resolveAllowed: (p: string) => p,
    },
    commands: {
        runAllowed: () => ({ ok: true, result: '' }),
    },
    readJsonl: () => [],
    appendJsonl: () => {},
    // ... other stubbed methods
} as unknown as ExecutorContext;

// Mock child_process.spawnSync
const originalSpawnSync = child_process.spawnSync;
let mockSpawnSync: any = null;

// Mock process.platform
const originalPlatform = process.platform;
let mockPlatform = 'darwin';

Object.defineProperty(process, 'platform', {
    get: () => mockPlatform
});

// Monkey patch spawnSync
(child_process as any).spawnSync = (...args: any[]) => {
    if (mockSpawnSync) {
        return mockSpawnSync(...args);
    }
    return originalSpawnSync(...args as [string, string[], any]);
};

function runTests() {
    console.log('Running comms_tools tests...');
    let failures = 0;

    // Helper to reset mocks
    const reset = () => {
        mockSpawnSync = null;
        mockPlatform = 'darwin';
    };

    // Test 1: handleMessageList on non-macOS
    try {
        reset();
        mockPlatform = 'linux';
        const result = handleMessageList({ limit: 5 }, mockContext);
        assert.equal(result.ok, false);
        assert.ok(result.error?.message.includes('macOS'));
        console.log('PASS: handleMessageList on non-macOS');
    } catch (e: any) {
        console.error('FAIL: handleMessageList on non-macOS', e.message);
        failures++;
    }

    // Test 2: handleMessageList on macOS (Success)
    try {
        reset();
        mockPlatform = 'darwin';
        mockSpawnSync = (cmd: string, args: string[]) => {
            if (cmd === 'sqlite3') {
                // Verify args
                assert.ok(args.includes(process.env.HOME + '/Library/Messages/chat.db'));
                return {
                    status: 0,
                    stdout: JSON.stringify([
                        { text: 'Hello', date: 725846400000000000, is_from_me: 1, id: '+1234567890' },
                        { text: 'Hi back', date: 725846500000000000, is_from_me: 0, id: '+1234567890' }
                    ]),
                    stderr: ''
                };
            }
            return { status: 1, error: new Error('Unknown command') };
        };

        const result = handleMessageList({ limit: 2 }, mockContext);
        assert.equal(result.ok, true);
        assert.equal(result.result.length, 2);
        assert.equal(result.result[0].body, 'Hello');
        assert.equal(result.result[0].from, 'me');
        assert.equal(result.result[1].from, '+1234567890');
        console.log('PASS: handleMessageList on macOS');
    } catch (e: any) {
        console.error('FAIL: handleMessageList on macOS', e.message);
        failures++;
    }

    // Test 3: handleMessageSend on non-macOS
    try {
        reset();
        mockPlatform = 'linux';
        const result = handleMessageSend({ to: '123', body: 'test' }, mockContext);
        assert.equal(result.ok, false);
        assert.ok(result.error?.message.includes('macOS'));
        console.log('PASS: handleMessageSend on non-macOS');
    } catch (e: any) {
        console.error('FAIL: handleMessageSend on non-macOS', e.message);
        failures++;
    }

    // Test 4: handleMessageSend on macOS (Success)
    try {
        reset();
        mockPlatform = 'darwin';
        let capturedArgs: string[] = [];
        mockSpawnSync = (cmd: string, args: string[]) => {
            if (cmd === 'osascript') {
                capturedArgs = args;
                return { status: 0, stdout: '', stderr: '' };
            }
            return { status: 1 };
        };

        const result = handleMessageSend({ to: '+15551234', body: 'Hello world' }, mockContext);
        assert.equal(result.ok, true);
        assert.ok(capturedArgs[1].includes('tell application "Messages"'));
        assert.ok(capturedArgs[1].includes('send "Hello world" to buddy "+15551234"'));
        console.log('PASS: handleMessageSend on macOS');
    } catch (e: any) {
        console.error('FAIL: handleMessageSend on macOS', e.message);
        failures++;
    }

    // Restore original platform just in case
    Object.defineProperty(process, 'platform', { get: () => originalPlatform });

    if (failures > 0) {
        console.error(`\n${failures} tests failed.`);
        process.exit(1);
    } else {
        console.log('\nAll tests passed.');
    }
}

runTests();
