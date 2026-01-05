/**
 * Simple file-based cache for development.
 * Caches responses by content hash to avoid redundant API calls.
 *
 * @module core/cache
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';

export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    expiresAt?: number;
}

export interface CacheOptions {
    /** Cache directory (default: ~/.assistant/.cache) */
    cacheDir?: string;

    /** TTL in milliseconds (default: 24 hours) */
    ttl?: number;

    /** Enable cache (default: true in dev, false in prod) */
    enabled?: boolean;
}

/**
 * Simple file-based cache.
 */
export class FileCache<T> {
    private cacheDir: string;
    private ttl: number;
    private enabled: boolean;

    constructor(options: CacheOptions = {}) {
        this.cacheDir = options.cacheDir || path.join(os.homedir(), '.assistant', '.cache');
        this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours
        this.enabled = options.enabled ?? process.env.NODE_ENV !== 'production';

        if (this.enabled && !fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Generate cache key from content.
     */
    private hash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Get cache file path for a key.
     */
    private getCachePath(key: string): string {
        return path.join(this.cacheDir, `${key}.json`);
    }

    /**
     * Get value from cache.
     */
    get(key: string): T | null {
        if (!this.enabled) return null;

        const cachePath = this.getCachePath(this.hash(key));

        if (!fs.existsSync(cachePath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(cachePath, 'utf8');
            const entry: CacheEntry<T> = JSON.parse(content);

            // Check expiration
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                fs.unlinkSync(cachePath);
                return null;
            }

            return entry.value;
        } catch {
            // Corrupt cache file, remove it
            try {
                fs.unlinkSync(cachePath);
            } catch {
                // Ignore cleanup errors
            }
            return null;
        }
    }

    /**
     * Set value in cache.
     */
    set(key: string, value: T, customTtl?: number): void {
        if (!this.enabled) return;

        const entry: CacheEntry<T> = {
            key: this.hash(key),
            value,
            timestamp: Date.now(),
            expiresAt: Date.now() + (customTtl || this.ttl),
        };

        const cachePath = this.getCachePath(entry.key);

        try {
            fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf8');
        } catch (err: any) {
            // Cache write failures are non-fatal
            if (process.env.VERBOSE) {
                console.warn(`[Cache] Failed to write cache: ${err.message}`);
            }
        }
    }

    /**
     * Check if key exists in cache.
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Clear all cache entries.
     */
    clear(): void {
        if (!this.enabled || !fs.existsSync(this.cacheDir)) return;

        try {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(this.cacheDir, file));
                }
            }
        } catch (err: any) {
            if (process.env.VERBOSE) {
                console.warn(`[Cache] Failed to clear cache: ${err.message}`);
            }
        }
    }

    /**
     * Clear expired entries.
     */
    prune(): number {
        if (!this.enabled || !fs.existsSync(this.cacheDir)) return 0;

        let pruned = 0;
        try {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const cachePath = path.join(this.cacheDir, file);
                try {
                    const content = fs.readFileSync(cachePath, 'utf8');
                    const entry: CacheEntry<T> = JSON.parse(content);

                    if (entry.expiresAt && Date.now() > entry.expiresAt) {
                        fs.unlinkSync(cachePath);
                        pruned++;
                    }
                } catch {
                    // Corrupt file, remove it
                    fs.unlinkSync(cachePath);
                    pruned++;
                }
            }
        } catch {
            // Ignore errors
        }

        return pruned;
    }

    /**
     * Get cache statistics.
     */
    stats(): { total: number; size: number } {
        if (!this.enabled || !fs.existsSync(this.cacheDir)) {
            return { total: 0, size: 0 };
        }

        let total = 0;
        let size = 0;

        try {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    total++;
                    const filePath = path.join(this.cacheDir, file);
                    try {
                        const stat = fs.statSync(filePath);
                        size += stat.size;
                    } catch {
                        // Ignore stat errors
                    }
                }
            }
        } catch {
            // Ignore errors
        }

        return { total, size };
    }
}

/**
 * Create a cache key from multiple values.
 */
export function createCacheKey(...parts: (string | number | boolean | null | undefined)[]): string {
    return parts
        .filter(p => p !== null && p !== undefined)
        .map(p => String(p))
        .join('::');
}
