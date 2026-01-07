import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutorContext } from '../core/types';

// Mock child_process module using vi.mock
vi.mock('child_process', async () => {
    const actual = await vi.importActual<typeof import('child_process')>('child_process');
    return {
        ...actual,
        spawnSync: vi.fn().mockReturnValue({
            status: 0,
            stdout: '',
            stderr: '',
        }),
    };
});

describe('Comms Tools', () => {
    let handleMessageList: typeof import('./comms_tools').handleMessageList;
    let handleMessageSend: typeof import('./comms_tools').handleMessageSend;
    let spawnSyncMock: ReturnType<typeof vi.fn>;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(async () => {
        originalEnv = { ...process.env };

        // Import the module fresh for each test
        vi.resetModules();
        const commsModule = await import('./comms_tools');
        handleMessageList = commsModule.handleMessageList;
        handleMessageSend = commsModule.handleMessageSend;

        const childProcess = await import('child_process');
        spawnSyncMock = childProcess.spawnSync as ReturnType<typeof vi.fn>;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        process.env = originalEnv;
    });

    const createMockContext = (): ExecutorContext =>
        ({
            paths: {
                resolve: (p: string) => p,
                assertAllowed: () => {},
                resolveAllowed: (p: string) => p,
            },
            commands: {
                runAllowed: () => ({ ok: true, result: '' }),
            },
            permissions: {
                allow_commands: ['osascript'],
                allow_paths: [],
            },
            readJsonl: () => [],
            appendJsonl: () => {},
            messagesPath: '/tmp/messages.jsonl',
            emailsPath: '/tmp/emails.jsonl',
        }) as unknown as ExecutorContext;

    describe('handleMessageList', () => {
        it('should return messages from JSONL', () => {
            const mockMessages = [
                { to: 'alice', body: 'hello', ts: '2024-01-01T00:00:00Z' },
                { to: 'bob', body: 'world', ts: '2024-01-02T00:00:00Z' },
            ];
            const mockContext = {
                ...createMockContext(),
                readJsonl: () => mockMessages,
            } as unknown as ExecutorContext;

            const result = handleMessageList({ limit: 5 }, mockContext);

            expect(result.ok).toBe(true);
            expect(Array.isArray(result.result)).toBe(true);
        });

        it('should limit results', () => {
            const mockMessages = [
                { to: 'a', body: '1', ts: '2024-01-01T00:00:00Z' },
                { to: 'b', body: '2', ts: '2024-01-02T00:00:00Z' },
                { to: 'c', body: '3', ts: '2024-01-03T00:00:00Z' },
            ];
            const mockContext = {
                ...createMockContext(),
                readJsonl: () => mockMessages,
            } as unknown as ExecutorContext;

            const result = handleMessageList({ limit: 2 }, mockContext);

            expect(result.ok).toBe(true);
            expect((result.result as unknown[]).length).toBe(2);
        });
    });

    describe('handleMessageSend', () => {
        it('should fail on non-macOS (using env override)', () => {
            process.env._TEST_PLATFORM_OVERRIDE = 'linux';

            const mockContext = createMockContext();
            const result = handleMessageSend({ to: '123', body: 'test' }, mockContext);

            expect(result.ok).toBe(false);
            expect(result.error?.message).toContain('macOS');
        });

        it('should succeed on macOS (using env override)', () => {
            process.env._TEST_PLATFORM_OVERRIDE = 'darwin';

            spawnSyncMock.mockReturnValue({
                status: 0,
                stdout: '',
                stderr: '',
            });

            const mockContext = createMockContext();
            const result = handleMessageSend({ to: '+15551234', body: 'Hello world' }, mockContext);

            expect(result.ok).toBe(true);
            expect((result.result as { message: string })?.message).toContain('via iMessage');
        });

        it('should fail if osascript is not in allowlist', () => {
            process.env._TEST_PLATFORM_OVERRIDE = 'darwin';

            const mockContext = {
                ...createMockContext(),
                permissions: {
                    allow_commands: [], // osascript not allowed
                    allow_paths: [],
                },
            } as unknown as ExecutorContext;

            const result = handleMessageSend({ to: '123', body: 'test' }, mockContext);

            expect(result.ok).toBe(false);
            expect(result.error?.code).toBe('DENIED_COMMAND_ALLOWLIST');
        });
    });
});
