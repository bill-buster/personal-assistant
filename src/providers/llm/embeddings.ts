/**
 * Embeddings Module
 * 
 * Provides text embedding generation and similarity search
 * for semantic memory recall.
 * 
 * Uses OpenAI-compatible embedding endpoints.
 * 
 * @module llm/embeddings
 */

import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

export interface EmbeddingResult {
    ok: boolean;
    embedding?: number[];
    error?: string;
}

export interface EmbeddingProvider {
    embed(text: string): Promise<EmbeddingResult>;
}

/**
 * Calculate cosine similarity between two vectors.
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
 * OpenAI-compatible embedding provider.
 * Works with OpenAI, Groq, and other compatible APIs.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    constructor(
        private apiKey: string,
        private baseUrl: string = 'https://api.openai.com/v1',
        private model: string = 'text-embedding-3-small'
    ) { }

    async embed(text: string): Promise<EmbeddingResult> {
        try {
            const urlObj = new URL(`${this.baseUrl}/embeddings`);

            const bodyStr = JSON.stringify({
                model: this.model,
                input: text
            });

            const response = await new Promise<any>((resolve, reject) => {
                const req = httpsRequest({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    path: `${urlObj.pathname}${urlObj.search}`,
                }, (res) => {
                    let data = '';
                    res.setEncoding('utf8');
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({
                            ok: res.statusCode! >= 200 && res.statusCode! < 300,
                            status: res.statusCode,
                            data
                        });
                    });
                });

                req.on('error', reject);
                req.write(bodyStr);
                req.end();
            });

            if (!response.ok) {
                return { ok: false, error: `API Error ${response.status}` };
            }

            const parsed = JSON.parse(response.data);
            const embedding = parsed.data?.[0]?.embedding;

            if (!embedding) {
                return { ok: false, error: 'No embedding in response' };
            }

            return { ok: true, embedding };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}

/**
 * Simple TF-IDF-like local embedding for when API is unavailable.
 * This is a fallback that works offline but has lower quality.
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
