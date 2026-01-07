/**
 * Comprehensive tests for cache.ts
 * Tests: FileCache get, set, has, clear, prune, stats, createCacheKey
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileCache, createCacheKey } from './cache';

describe('FileCache', () => {
    let testRoot: string;

    beforeEach(() => {
        testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
    });

    afterEach(() => {
        fs.rmSync(testRoot, { recursive: true, force: true });
    });

    describe('Basic Operations', () => {
        it('should create cache directory', () => {
            const cacheDir = path.join(testRoot, 'cache');
            new FileCache<string>({ cacheDir });
            expect(fs.existsSync(cacheDir)).toBe(true);
        });

        it('should set and get values', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache') });
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return null for non-existent keys', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache') });
            expect(cache.get('nonexistent')).toBeNull();
        });

        it('should return true/false for has()', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache') });
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('nonexistent')).toBe(false);
        });

        it('should overwrite existing keys', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache') });
            cache.set('key1', 'value1');
            cache.set('key1', 'value1_updated');
            expect(cache.get('key1')).toBe('value1_updated');
        });
    });

    describe('Different Value Types', () => {
        it('should store numbers', () => {
            const cache = new FileCache<number>({ cacheDir: path.join(testRoot, 'cache-number') });
            cache.set('num', 42);
            expect(cache.get('num')).toBe(42);
        });

        it('should store objects', () => {
            const cache = new FileCache<{ name: string; age: number }>({
                cacheDir: path.join(testRoot, 'cache-object'),
            });
            const testObj = { name: 'John', age: 30 };
            cache.set('obj', testObj);
            expect(cache.get('obj')).toEqual(testObj);
        });

        it('should store arrays', () => {
            const cache = new FileCache<string[]>({ cacheDir: path.join(testRoot, 'cache-array') });
            const testArray = ['a', 'b', 'c'];
            cache.set('arr', testArray);
            expect(cache.get('arr')).toEqual(testArray);
        });
    });

    describe('TTL and Expiration', () => {
        it('should respect custom TTL', async () => {
            const cache = new FileCache<string>({
                cacheDir: path.join(testRoot, 'cache-ttl'),
                ttl: 10, // 10ms
            });
            cache.set('ttl_key', 'ttl_value');
            expect(cache.get('ttl_key')).toBe('ttl_value');

            await new Promise(resolve => setTimeout(resolve, 20));
            expect(cache.get('ttl_key')).toBeNull();
        });

        it('should respect per-set custom TTL', async () => {
            const cache = new FileCache<string>({
                cacheDir: path.join(testRoot, 'cache-custom-ttl'),
                ttl: 1000,
            });
            cache.set('custom', 'value', 10); // 10ms custom TTL

            await new Promise(resolve => setTimeout(resolve, 30));
            expect(cache.get('custom')).toBeNull();
        });
    });

    describe('Clear & Prune', () => {
        it('should clear all entries', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-clear') });
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });

        it('should clear empty cache without error', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-empty') });
            expect(() => cache.clear()).not.toThrow();
        });

        it('should prune expired entries', async () => {
            const cache = new FileCache<string>({
                cacheDir: path.join(testRoot, 'cache-prune'),
                ttl: 10,
            });
            cache.set('expired', 'value1');
            cache.set('valid', 'value2', 1000); // Long TTL

            await new Promise(resolve => setTimeout(resolve, 20));

            const pruned = cache.prune();
            expect(pruned).toBe(1);
            expect(cache.get('expired')).toBeNull();
            expect(cache.get('valid')).toBe('value2');
        });
    });

    describe('Stats', () => {
        it('should return correct stats', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-stats') });
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            const stats = cache.stats();
            expect(stats.total).toBe(2);
            expect(stats.size).toBeGreaterThan(0);
        });

        it('should return empty stats for empty cache', () => {
            const cache = new FileCache<string>({
                cacheDir: path.join(testRoot, 'cache-stats-empty'),
            });
            const stats = cache.stats();
            expect(stats.total).toBe(0);
            expect(stats.size).toBe(0);
        });
    });

    describe('Disabled Cache', () => {
        it('should not store values if disabled', () => {
            const cache = new FileCache<string>({
                cacheDir: path.join(testRoot, 'cache-disabled'),
                enabled: false,
            });
            cache.set('key', 'value');
            expect(cache.get('key')).toBeNull();
            expect(cache.has('key')).toBe(false);
            expect(cache.stats().total).toBe(0);
        });
    });

    describe('Corrupt File Handling', () => {
        it('should handle corrupt cache files gracefully', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-corrupt') });
            cache.set('key', 'value');

            // Corrupt the file manually
            const files = fs.readdirSync(path.join(testRoot, 'cache-corrupt'));
            const corruptFile = path.join(testRoot, 'cache-corrupt', files[0]);
            fs.writeFileSync(corruptFile, 'invalid json', 'utf8');

            expect(cache.get('key')).toBeNull();
            // Should have cleaned up the file (implementation detail, but good to check)
            // Re-setting should work
            cache.set('key', 'new_value');
            expect(cache.get('key')).toBe('new_value');
        });
    });

    describe('createCacheKey', () => {
        it('should create key from strings', () => {
            expect(createCacheKey('part1', 'part2')).toBe('part1::part2');
        });

        it('should create key from mixed types', () => {
            expect(createCacheKey('str', 123, true)).toBe('str::123::true');
        });

        it('should filter null and undefined', () => {
            expect(createCacheKey('part1', null, 'part2', undefined)).toBe('part1::part2');
        });

        it('should return empty string for empty args', () => {
            expect(createCacheKey()).toBe('');
            expect(createCacheKey(null, undefined)).toBe('');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long keys', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-edge') });
            const longKey = 'x'.repeat(1000);
            cache.set(longKey, 'value');
            expect(cache.get(longKey)).toBe('value');
        });

        it('should handle special characters in keys', () => {
            const cache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-edge') });
            const specialKey = 'key!@#$%^&*()';
            cache.set(specialKey, 'value');
            expect(cache.get(specialKey)).toBe('value');
        });
    });
});
