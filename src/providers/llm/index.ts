/**
 * LLM Provider Factory
 *
 * Creates the appropriate LLM provider based on configuration.
 * Currently supports:
 *   - Groq (fast, free tier available)
 *   - OpenRouter (access to many models)
 *
 * @module llm
 */

import { AppConfig } from '../../core/config';
import { LLMProvider } from './provider';
import { OpenAICompatibleProvider } from './openai_compatible';
import { MockLLMProvider } from './mock_provider';
import { CachedLLMProvider } from './cached_provider';
import * as fs from 'node:fs';
import * as path from 'node:path';

export * from './provider';

/**
 * Result type for provider creation.
 */
export type ProviderResult = { ok: true; provider: LLMProvider } | { ok: false; error: string };

/**
 * Create an LLM provider based on the app configuration.
 *
 * @param config - Application configuration with API keys and provider settings
 * @param options - Optional configuration
 * @param options.enableCache - Enable response caching (default: true in dev, false in prod)
 * @returns Result with provider instance or error message
 */
export function createProvider(
    config: AppConfig,
    options: { enableCache?: boolean } = {}
): ProviderResult {
    const providerName = config.defaultProvider;
    const enableCache = options.enableCache ?? process.env.NODE_ENV !== 'production';

    let provider: LLMProvider;

    switch (providerName) {
        case 'mock': {
            // Mock provider for development/testing
            // Use evals directory relative to package src
            const mockResponsesPath = path.join(__dirname, '..', 'evals', 'mock_responses.json');
            let responses = {};
            try {
                if (fs.existsSync(mockResponsesPath)) {
                    responses = JSON.parse(fs.readFileSync(mockResponsesPath, 'utf8'));
                }
            } catch {
                console.warn(`[Warn] Failed to load mock responses from ${mockResponsesPath}`);
            }
            provider = new MockLLMProvider(responses);
            break;
        }

        case 'groq':
            // Groq: Fast inference, generous free tier
            // Default model: llama3-70b-8192 (good balance of speed/quality)
            if (!config.apiKeys.groq) {
                return { ok: false, error: 'Missing Groq API Key' };
            }
            provider = new OpenAICompatibleProvider(
                config.apiKeys.groq,
                'https://api.groq.com/openai/v1',
                config.models?.groq || 'llama-3.3-70b-versatile',
                config.maxRetries
            );
            break;

        case 'openrouter':
            // OpenRouter: Access to many models (OpenAI, Anthropic, etc.)
            // Default: gpt-3.5-turbo for cost efficiency
            if (!config.apiKeys.openrouter) {
                return { ok: false, error: 'Missing OpenRouter API Key' };
            }
            provider = new OpenAICompatibleProvider(
                config.apiKeys.openrouter,
                'https://openrouter.ai/api/v1',
                config.models?.openrouter || 'openai/gpt-3.5-turbo',
                config.maxRetries
            );
            break;

        default:
            return {
                ok: false,
                error: `Unknown provider: ${providerName}. Supported: groq, openrouter, mock`,
            };
    }

    // Wrap with cache if enabled
    if (enableCache && providerName !== 'mock') {
        return {
            ok: true,
            provider: new CachedLLMProvider({
                provider,
                enabled: true,
                ttl: 24 * 60 * 60 * 1000, // 24 hours
            }),
        };
    }

    return { ok: true, provider };
}
