import { LLMProvider, CompletionResult, StreamChunk } from './provider';
import { ToolSpec, Message } from '../../core/types';

interface MockResponse {
    toolCall?: {
        tool_name: string;
        args: any;
    };
    reply?: string;
    error?: string;
}

export class MockLLMProvider implements LLMProvider {
    private responses: Record<string, MockResponse> = {};
    private defaultResponse: MockResponse = {
        error: "MockLLMProvider: No matching response for input"
    };

    constructor(responses?: Record<string, MockResponse>) {
        if (responses) {
            this.responses = responses;
        }
    }

    setResponses(responses: Record<string, MockResponse>) {
        this.responses = responses;
    }

    async complete(
        prompt: string,
        tools: Record<string, ToolSpec>,
        history: Message[] = [],
        verbose: boolean = false,
        systemPrompt?: string,
        options?: { toolFormat?: 'standard' | 'compact' }
    ): Promise<CompletionResult> {
        // If prompt is empty, use the last message in history as the key
        const lastMessageContent = history.length > 0 ? (history[history.length - 1].content || '') : '';
        const lookupKey = prompt || lastMessageContent;
        const response = (this.responses as any)[lookupKey] || this.defaultResponse;

        if (verbose) {
            console.log(`[MockProvider] Prompt: "${prompt}" | Lookup Key: "${lookupKey}"`);
            console.log(`[MockProvider] Matched:`, response);
        }

        if (response.error) {
            return { ok: false, error: response.error };
        }

        if (response.toolCall) {
            return {
                ok: true,
                toolCall: {
                    tool_name: response.toolCall.tool_name,
                    args: response.toolCall.args,
                    _debug: null
                }
            };
        }

        if (response.reply) {
            return {
                ok: true,
                reply: response.reply
            };
        }

        return { ok: false, error: "Empty mock response" };
    }

    async *completeStream(
        prompt: string,
        history: Message[] = [],
        verbose: boolean = false,
        systemPrompt?: string
    ): AsyncGenerator<StreamChunk, void, unknown> {
        const lastMessageContent = history.length > 0 ? (history[history.length - 1].content || '') : '';
        const lookupKey = prompt || lastMessageContent;
        const response = (this.responses as any)[lookupKey] || this.defaultResponse;

        if (response.reply) {
            yield { content: response.reply, done: true };
        } else {
            yield { content: "[Mock] No stream response available", done: true };
        }
    }
}
