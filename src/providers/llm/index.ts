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
import * as fs from 'node:fs';
import * as path from 'node:path';

export * from './provider';

/**
 * Create an LLM provider based on the app configuration.
 * 
 * @param config - Application configuration with API keys and provider settings
 * @returns LLMProvider instance ready to make completions
 * @throws Error if the required API key is missing or provider is unknown
 */
export function createProvider(config: AppConfig): LLMProvider {
    const providerName = config.defaultProvider;

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
            } catch (e) {
                console.warn(`[Warn] Failed to load mock responses from ${mockResponsesPath}`);
            }
            return new MockLLMProvider(responses);
        }

        case 'groq':
            // Groq: Fast inference, generous free tier
            // Default model: llama3-70b-8192 (good balance of speed/quality)
            if (!config.apiKeys.groq) throw new Error('Missing Groq API Key');
            return new OpenAICompatibleProvider(
                config.apiKeys.groq,
                'https://api.groq.com/openai/v1',
                config.models?.groq || 'llama-3.3-70b-versatile',
                config.maxRetries
            );

        case 'openrouter':
            // OpenRouter: Access to many models (OpenAI, Anthropic, etc.)
            // Default: gpt-3.5-turbo for cost efficiency
            if (!config.apiKeys.openrouter) throw new Error('Missing OpenRouter API Key');
            return new OpenAICompatibleProvider(
                config.apiKeys.openrouter,
                'https://openrouter.ai/api/v1',
                config.models?.openrouter || 'openai/gpt-3.5-turbo',
                config.maxRetries
            );

        default:
            throw new Error(`Unknown provider: ${providerName}. Supported: groq, openrouter, mock`);
    }
}
