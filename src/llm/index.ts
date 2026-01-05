/**
 * LLM Module
 *
 * Provides chat model interfaces and provider adapters.
 *
 * @module llm
 */

export * from './ChatModel';

// Re-export legacy provider for backward compatibility during migration
// TODO: Migrate callers to use ChatModel interface directly
export { createProvider, LLMProvider } from '../providers/llm';
