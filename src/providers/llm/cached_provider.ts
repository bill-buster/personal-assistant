/**
 * Caching wrapper for LLM providers.
 * Caches responses during development to avoid redundant API calls.
 *
 * @module providers/llm/cached_provider
 */

import type { LLMProvider, CompletionResult, StreamChunk } from './provider';
import type { ToolSpec, Message } from '../../core/types';
import { FileCache, createCacheKey } from '../../core/cache';

export interface CachedProviderOptions {
    /** Underlying provider to wrap */
    provider: LLMProvider;

    /** Enable caching (default: true in dev) */
    enabled?: boolean;

    /** Cache TTL in milliseconds (default: 24 hours) */
    ttl?: number;
}

/**
 * LLM Provider wrapper that caches responses.
 *
 * Cache key is based on:
 * - Prompt text
 * - Tool schemas (sorted keys)
 * - History (last 3 messages for determinism)
 * - System prompt
 * - Tool format option
 */
export class CachedLLMProvider implements LLMProvider {
    private provider: LLMProvider;
    private cache: FileCache<CompletionResult>;
    private enabled: boolean;

    constructor(options: CachedProviderOptions) {
        this.provider = options.provider;
        this.enabled = options.enabled ?? process.env.NODE_ENV !== 'production';

        this.cache = new FileCache<CompletionResult>({
            enabled: this.enabled,
            ttl: options.ttl,
            cacheDir: undefined, // Use default ~/.assistant/.cache
        });
    }

    /**
     * Create cache key from request parameters.
     */
    private createCacheKey(
        prompt: string,
        tools: Record<string, ToolSpec>,
        history: Message[],
        systemPrompt?: string,
        options?: { toolFormat?: 'standard' | 'compact' }
    ): string {
        // Use last 3 messages for cache key (to handle conversation context)
        const recentHistory = history.slice(-3);

        // Sort tool keys for consistent hashing
        const toolKeys = Object.keys(tools).sort();
        const toolsHash = JSON.stringify(toolKeys.map(k => ({ name: k, spec: tools[k] })));

        return createCacheKey(
            prompt,
            toolsHash,
            JSON.stringify(recentHistory),
            systemPrompt || '',
            options?.toolFormat || 'compact'
        );
    }

    async complete(
        prompt: string,
        tools: Record<string, ToolSpec>,
        history: Message[] = [],
        verbose?: boolean,
        systemPrompt?: string,
        options?: { toolFormat?: 'standard' | 'compact' }
    ): Promise<CompletionResult> {
        if (!this.enabled) {
            return this.provider.complete(prompt, tools, history, verbose, systemPrompt, options);
        }

        const cacheKey = this.createCacheKey(prompt, tools, history, systemPrompt, options);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached) {
            if (verbose) {
                console.log('[Cache] Hit - using cached response');
            }
            return cached;
        }

        // Cache miss - call provider
        if (verbose) {
            console.log('[Cache] Miss - calling provider');
        }

        const result = await this.provider.complete(
            prompt,
            tools,
            history,
            verbose,
            systemPrompt,
            options
        );

        // Cache successful results only
        if (result.ok) {
            this.cache.set(cacheKey, result);
        }

        return result;
    }

    async *completeStream(
        prompt: string,
        history: Message[] = [],
        verbose?: boolean,
        systemPrompt?: string
    ): AsyncGenerator<StreamChunk, void, unknown> {
        // Streaming responses are not cached (they're real-time)
        yield* this.provider.completeStream!(prompt, history, verbose, systemPrompt);
    }
}
