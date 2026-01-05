/**
 * Mock Embedding Model
 *
 * Deterministic mock implementation of EmbeddingModel for testing.
 * Returns consistent embeddings based on text hashing.
 *
 * @module embeddings/providers/MockEmbeddingModel
 */

import type { EmbeddingModel, EmbeddingResult, BatchEmbeddingResult } from '../EmbeddingModel';

/**
 * Mock EmbeddingModel implementation for testing.
 *
 * Uses simple hashing to generate deterministic embeddings.
 * Same text always produces the same embedding.
 */
export class MockEmbeddingModel implements EmbeddingModel {
    readonly name = 'mock';
    readonly dimensions: number;

    private callCount = 0;

    constructor(dimensions: number = 128) {
        this.dimensions = dimensions;
    }

    async embed(text: string): Promise<EmbeddingResult> {
        this.callCount++;

        // Generate deterministic embedding from text hash
        const embedding = this.hashToEmbedding(text);

        return {
            ok: true,
            embedding,
            dimensions: this.dimensions,
        };
    }

    async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
        this.callCount += texts.length;

        const embeddings = texts.map(text => this.hashToEmbedding(text));

        return {
            ok: true,
            embeddings,
            dimensions: this.dimensions,
        };
    }

    isAvailable(): boolean {
        return true;
    }

    /**
     * Convert text to a deterministic embedding via hashing.
     */
    private hashToEmbedding(text: string): number[] {
        const embedding = new Array(this.dimensions).fill(0);
        const normalizedText = text.toLowerCase().trim();

        // Simple hash-based embedding
        for (let i = 0; i < normalizedText.length; i++) {
            const charCode = normalizedText.charCodeAt(i);
            const bucket = (charCode * (i + 1)) % this.dimensions;
            embedding[bucket] += 1 / Math.sqrt(normalizedText.length);
        }

        // Normalize to unit vector
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < this.dimensions; i++) {
                embedding[i] /= norm;
            }
        }

        return embedding;
    }

    // Test utilities
    getCallCount(): number {
        return this.callCount;
    }

    reset(): void {
        this.callCount = 0;
    }
}
