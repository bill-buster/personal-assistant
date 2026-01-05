/**
 * LRU cache for file stats to reduce repeated stat calls.
 * @module core/stat_cache
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface StatCacheEntry {
    stats: fs.Stats;
    timestamp: number;
}

/**
 * Simple LRU cache for file stats.
 * Reduces repeated stat calls which can be expensive on slow filesystems.
 */
export class StatCache {
    private cache: Map<string, StatCacheEntry>;
    private maxSize: number;
    private ttl: number; // TTL in milliseconds

    constructor(maxSize: number = 100, ttl: number = 5000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl; // 5 seconds default TTL
    }

    /**
     * Normalize path for cache key (resolve to absolute, normalize separators).
     */
    private normalizePath(filePath: string): string {
        try {
            return path.resolve(filePath);
        } catch {
            return filePath;
        }
    }

    /**
     * Check if entry is expired.
     */
    private isExpired(entry: StatCacheEntry): boolean {
        return Date.now() - entry.timestamp > this.ttl;
    }

    /**
     * Get file stats with caching.
     * Returns null if file doesn't exist or stat fails.
     */
    get(filePath: string): fs.Stats | null {
        const normalized = this.normalizePath(filePath);
        const entry = this.cache.get(normalized);

        if (entry && !this.isExpired(entry)) {
            // Move to end (LRU)
            this.cache.delete(normalized);
            this.cache.set(normalized, entry);
            return entry.stats;
        }

        // Cache miss or expired - stat file
        try {
            const stats = fs.statSync(normalized);
            this.set(normalized, stats);
            return stats;
        } catch {
            // File doesn't exist or stat failed
            return null;
        }
    }

    /**
     * Set file stats in cache.
     */
    private set(filePath: string, stats: fs.Stats): void {
        const normalized = this.normalizePath(filePath);

        // Remove if already exists (will re-add at end)
        if (this.cache.has(normalized)) {
            this.cache.delete(normalized);
        }

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(normalized, {
            stats,
            timestamp: Date.now(),
        });
    }

    /**
     * Invalidate cache entry for a path.
     */
    invalidate(filePath: string): void {
        const normalized = this.normalizePath(filePath);
        this.cache.delete(normalized);
    }

    /**
     * Invalidate all entries for a directory (and subdirectories).
     */
    invalidateDir(dirPath: string): void {
        const normalized = this.normalizePath(dirPath);
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(normalized + path.sep) || key === normalized) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.cache.delete(key);
        }
    }

    /**
     * Clear all cache entries.
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics.
     */
    stats(): { size: number; maxSize: number; hitRate?: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
        };
    }
}

/**
 * Global stat cache instance (shared across tool handlers).
 * Can be disabled by setting maxSize to 0.
 */
let globalStatCache: StatCache | null = null;

/**
 * Get or create global stat cache.
 * Note: Parameters (maxSize, ttl) are only used on first call.
 * Subsequent calls return the existing cache instance with its original configuration.
 * @param maxSize - Maximum cache size (default: 100). Only used on first call.
 * @param ttl - Time-to-live in milliseconds (default: 5000). Only used on first call.
 * @returns Global stat cache instance.
 */
export function getStatCache(maxSize: number = 100, ttl: number = 5000): StatCache {
    if (!globalStatCache) {
        globalStatCache = new StatCache(maxSize, ttl);
    }
    return globalStatCache;
}

/**
 * Reset global stat cache (useful for testing).
 */
export function resetStatCache(): void {
    globalStatCache = null;
}
