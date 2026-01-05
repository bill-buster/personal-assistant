/**
 * Mock Chat Model
 *
 * Deterministic mock implementation of ChatModel for testing.
 * Returns predictable responses based on input patterns.
 *
 * @module llm/providers/MockChatModel
 */

import type { ChatModel, ChatRequest, ChatResponse, ChatChunk } from '../ChatModel';

/**
 * Mock responses keyed by pattern.
 */
export interface MockResponses {
    [pattern: string]: {
        toolCall?: { tool_name: string; args: Record<string, unknown> };
        reply?: string;
    };
}

/**
 * Default mock responses for common patterns.
 */
export const DEFAULT_MOCK_RESPONSES: MockResponses = {
    task: { toolCall: { tool_name: 'task_list', args: { status: 'open' } } },
    remember: { reply: "I'll remember that for you." },
    recall: { toolCall: { tool_name: 'recall', args: { query: 'recent' } } },
    time: { toolCall: { tool_name: 'get_time', args: {} } },
    help: { reply: 'I can help with tasks, memory, and more. Try "task list" or "remember X".' },
};

/**
 * Mock ChatModel implementation for testing.
 */
export class MockChatModel implements ChatModel {
    readonly name = 'mock';

    private responses: MockResponses;
    private callCount = 0;
    private lastRequest: ChatRequest | null = null;

    constructor(responses: MockResponses = DEFAULT_MOCK_RESPONSES) {
        this.responses = responses;
    }

    async chat(request: ChatRequest): Promise<ChatResponse> {
        this.callCount++;
        this.lastRequest = request;

        const prompt = request.prompt.toLowerCase();

        // Check for matching pattern
        for (const [pattern, response] of Object.entries(this.responses)) {
            if (prompt.includes(pattern.toLowerCase())) {
                if (response.toolCall) {
                    return {
                        ok: true,
                        toolCall: response.toolCall,
                        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                    };
                }
                if (response.reply) {
                    return {
                        ok: true,
                        reply: response.reply,
                        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
                    };
                }
            }
        }

        // Default fallback
        return {
            ok: true,
            reply: `Mock response for: ${request.prompt.substring(0, 50)}...`,
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        };
    }

    async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk, void, unknown> {
        const response = await this.chat(request);
        const content = response.reply || 'Mock stream response';

        // Simulate streaming by yielding word by word
        const words = content.split(' ');
        for (let i = 0; i < words.length; i++) {
            yield {
                content: words[i] + (i < words.length - 1 ? ' ' : ''),
                done: false,
            };
        }
        yield { content: '', done: true };
    }

    isAvailable(): boolean {
        return true;
    }

    // Test utilities
    getCallCount(): number {
        return this.callCount;
    }

    getLastRequest(): ChatRequest | null {
        return this.lastRequest;
    }

    reset(): void {
        this.callCount = 0;
        this.lastRequest = null;
    }

    setResponses(responses: MockResponses): void {
        this.responses = responses;
    }
}
