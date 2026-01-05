/**
 * ChatModel Interface
 * 
 * Defines the contract for chat/completion providers.
 * Implementations can be Groq, OpenRouter, Ollama, llama.cpp, etc.
 * 
 * Design goals:
 * - Provider-agnostic: code using ChatModel doesn't know if it's Groq or local
 * - Structured output: tool calling support built-in
 * - Observable: usage tracking hooks for cost management
 * 
 * @module llm/ChatModel
 */

import type { ToolSpec, Message, TokenUsage } from '../core/types';

/**
 * Request to the chat model.
 */
export interface ChatRequest {
    /** Current user message (can be empty if continuing from history) */
    prompt: string;
    
    /** Available tools for function calling */
    tools?: Record<string, ToolSpec>;
    
    /** Conversation history */
    history?: Message[];
    
    /** System prompt / persona */
    systemPrompt?: string;
    
    /** Model-specific options */
    options?: ChatOptions;
}

/**
 * Model-specific options.
 */
export interface ChatOptions {
    /** Tool schema format: 'standard' (OpenAI) or 'compact' (token-efficient) */
    toolFormat?: 'standard' | 'compact';
    
    /** Enable verbose logging */
    verbose?: boolean;
    
    /** Maximum tokens to generate */
    maxTokens?: number;
    
    /** Temperature for sampling (0-2) */
    temperature?: number;
}

/**
 * Tool call from the model.
 */
export interface ToolCall {
    tool_name: string;
    args: Record<string, unknown>;
}

/**
 * Response from the chat model.
 */
export interface ChatResponse {
    ok: boolean;
    
    /** Tool call if model chose to invoke a tool */
    toolCall?: ToolCall | null;
    
    /** Text reply if model responded conversationally */
    reply?: string | null;
    
    /** Error message if request failed */
    error?: string;
    
    /** Token usage statistics */
    usage?: TokenUsage | null;
    
    /** Raw response for debugging */
    raw?: unknown;
}

/**
 * Chunk from streaming response.
 */
export interface ChatChunk {
    /** Partial content */
    content: string;
    
    /** Whether this is the final chunk */
    done: boolean;
    
    /** Error if stream failed */
    error?: {
        message: string;
        code: string;
    };
}

/**
 * Chat model interface.
 * 
 * Implement this for each LLM provider.
 */
export interface ChatModel {
    /** Provider name for logging/debugging */
    readonly name: string;
    
    /**
     * Send a chat completion request.
     */
    chat(request: ChatRequest): Promise<ChatResponse>;
    
    /**
     * Stream a chat completion (optional).
     * Not all providers support streaming.
     */
    chatStream?(request: ChatRequest): AsyncGenerator<ChatChunk, void, unknown>;
    
    /**
     * Check if provider is available/configured.
     * Useful for fallback logic.
     */
    isAvailable?(): boolean;
}

/**
 * Usage tracking hook (optional).
 * Called after each request for cost tracking.
 */
export type UsageHook = (usage: TokenUsage, model: string) => void;

/**
 * Spend limits configuration.
 */
export interface SpendLimits {
    /** Maximum tokens per request */
    maxTokensPerRequest?: number;
    
    /** Maximum tokens per day */
    maxTokensPerDay?: number;
    
    /** Maximum cost per day (requires price info) */
    maxCostPerDay?: number;
}

