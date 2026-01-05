/**
 * LLM Module
 *
 * Provides chat model interfaces and provider adapters.
 *
 * @module llm
 */

export * from './ChatModel';

/**
 * Legacy LLM Provider exports (backward compatibility).
 *
 * MIGRATION STATUS: In progress
 *
 * The codebase is migrating from LLMProvider to ChatModel interface:
 * - ChatModel: New provider-agnostic interface (preferred)
 * - LLMProvider: Legacy interface (still in use)
 *
 * Current usage:
 * - router.ts, router_stream.ts: Use LLMProvider type
 * - runtime.ts: Creates provider via createProvider()
 * - Tests: Use MockLLMProvider
 *
 * Migration plan:
 * 1. Create ChatModel adapters for existing providers
 * 2. Update router/router_stream to accept ChatModel
 * 3. Update runtime to create ChatModel instances
 * 4. Remove LLMProvider exports once migration complete
 *
 * These exports are kept for backward compatibility during migration.
 */
export { createProvider, LLMProvider } from '../providers/llm';
