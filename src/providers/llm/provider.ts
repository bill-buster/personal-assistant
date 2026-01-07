/**
 * LLM Provider Interface
 *
 * Defines the contract for LLM providers (Groq, OpenRouter, etc.)
 *
 * @module llm/provider
 */

import { ToolSpec, ToolCall, Message, TokenUsage } from '../../core/types';

/**
 * Result from an LLM completion request.
 */
export interface CompletionResult {
    ok: boolean;
    toolCall?: ToolCall | null; // Structured tool call (if LLM chose a tool)
    reply?: string | null; // Conversational reply (if no tool)
    error?: string;
    usage?: TokenUsage | null; // Token usage statistics
    raw?: unknown; // Raw API response (for debugging)
}

/**
 * Chunk from streaming completion
 */
export interface StreamChunk {
    content: string;
    done: boolean;
}

/**
 * LLM Provider interface.
 * Implement this for each supported LLM backend.
 */
export interface LLMProvider {
    complete(
        prompt: string,
        tools: Record<string, ToolSpec>,
        history?: Message[],
        verbose?: boolean,
        systemPrompt?: string,
        options?: { toolFormat?: 'standard' | 'compact' }
    ): Promise<CompletionResult>;

    /**
     * Stream completion for conversational replies.
     * Note: Streaming does not support tool calls - use complete() for that.
     */
    completeStream?(
        prompt: string,
        history?: Message[],
        verbose?: boolean,
        systemPrompt?: string
    ): AsyncGenerator<StreamChunk, void, unknown>;
}
