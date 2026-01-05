/**
 * Embeddings Module
 *
 * Provides embedding model interfaces and provider adapters.
 *
 * @module embeddings
 */

export * from './EmbeddingModel';

// Re-export legacy embedding provider for backward compatibility
export {
    OpenAIEmbeddingProvider,
    cosineSimilarity as legacyCosineSimilarity,
} from '../providers/llm/embeddings';
