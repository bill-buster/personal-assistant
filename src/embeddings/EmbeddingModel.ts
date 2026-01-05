/**
 * EmbeddingModel Interface
 *
 * Defines the contract for text embedding providers.
 * Implementations can be OpenAI, Ollama, local models, etc.
 *
 * Design goals:
 * - Provider-agnostic: code using EmbeddingModel doesn't care about backend
 * - Batch support: efficient for indexing multiple documents
 * - Dimension-aware: consumers can handle different embedding sizes
 *
 * @module embeddings/EmbeddingModel
 */

/**
 * Result from embedding a single text.
 */
export interface EmbeddingResult {
    ok: boolean;

    /** Vector embedding */
    embedding?: number[];

    /** Error message if failed */
    error?: string;

    /** Dimensions of the embedding */
    dimensions?: number;
}

/**
 * Result from batch embedding.
 */
export interface BatchEmbeddingResult {
    ok: boolean;

    /** Array of embeddings in same order as input */
    embeddings?: number[][];

    /** Error message if failed */
    error?: string;

    /** Dimensions of embeddings */
    dimensions?: number;
}

/**
 * Embedding model interface.
 *
 * Implement this for each embedding provider.
 */
export interface EmbeddingModel {
    /** Provider name for logging/debugging */
    readonly name: string;

    /** Embedding dimensions (if known) */
    readonly dimensions?: number;

    /**
     * Embed a single text.
     */
    embed(text: string): Promise<EmbeddingResult>;

    /**
     * Embed multiple texts in batch (optional, but more efficient).
     * Default implementation calls embed() in sequence.
     */
    embedBatch?(texts: string[]): Promise<BatchEmbeddingResult>;

    /**
     * Check if provider is available/configured.
     */
    isAvailable?(): boolean;
}

/**
 * Calculate cosine similarity between two vectors.
 * Utility function for similarity search.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

/**
 * Simple local embedding fallback.
 * Uses TF-IDF-like hashing for offline operation.
 * Lower quality than neural embeddings, but works without API.
 */
export function localEmbed(text: string, vocabSize: number = 128): number[] {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const embedding = new Array(vocabSize).fill(0);

    for (const word of words) {
        // Hash word to bucket
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
        }
        const bucket = Math.abs(hash) % vocabSize;
        embedding[bucket] += 1;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] /= norm;
        }
    }

    return embedding;
}

/**
 * Local embedding provider.
 * Uses simple TF-IDF hashing for offline operation.
 */
export class LocalEmbeddingModel implements EmbeddingModel {
    readonly name = 'local';
    readonly dimensions: number;

    constructor(dimensions: number = 128) {
        this.dimensions = dimensions;
    }

    async embed(text: string): Promise<EmbeddingResult> {
        return {
            ok: true,
            embedding: localEmbed(text, this.dimensions),
            dimensions: this.dimensions,
        };
    }

    async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
        return {
            ok: true,
            embeddings: texts.map(t => localEmbed(t, this.dimensions)),
            dimensions: this.dimensions,
        };
    }

    isAvailable(): boolean {
        return true; // Always available (no API needed)
    }
}
