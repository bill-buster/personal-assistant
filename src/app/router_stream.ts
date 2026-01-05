/**
 * Streaming router for conversational replies.
 * Streams LLM responses directly to output without waiting for full completion.
 *
 * @module router_stream
 */

import type { LLMProvider, StreamChunk } from '../providers/llm/provider';
import type { Message } from '../core/types';
import type { Agent } from '../core/types';
import { AGENTS } from '../agents';

/**
 * Stream a conversational reply from the LLM.
 * Only works for replies (not tool calls).
 *
 * @param input - User input
 * @param history - Conversation history
 * @param agent - Agent to use (defaults to Supervisor)
 * @param provider - LLM provider (must support completeStream)
 * @param systemPrompt - Optional system prompt override
 * @param verbose - Enable verbose logging
 * @returns Async generator yielding stream chunks
 */
export async function* streamReply(
    input: string,
    history: Message[] = [],
    agent: Agent = AGENTS.supervisor,
    provider: LLMProvider,
    systemPrompt?: string,
    verbose: boolean = false
): AsyncGenerator<StreamChunk, void, unknown> {
    if (!provider.completeStream) {
        throw new Error('Provider does not support streaming');
    }

    const finalSystemPrompt = systemPrompt || agent.systemPrompt;

    try {
        yield* provider.completeStream(input, history, verbose, finalSystemPrompt);
    } catch (err: any) {
        yield {
            content: `\n[Error] ${err.message || 'Streaming failed'}`,
            done: true,
        };
    }
}
