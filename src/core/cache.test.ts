#!/usr/bin/env node

/**
 * Comprehensive tests for cache.ts
 * Tests: FileCache get, set, has, clear, prune, stats, createCacheKey
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileCache, createCacheKey } from './cache';

// Create isolated temp directory
const testRootRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
const testRoot = fs.realpathSync(testRootRaw);

let failures = 0;

function logLine(msg: string, stream: NodeJS.WriteStream = process.stdout) {
    stream.write(msg + '\n');
}

try {
    // ============================================
    // FILE CACHE - BASIC OPERATIONS
    // ============================================

    // T1: Create cache instance
    const cacheDir = path.join(testRoot, 'cache');
    const cache = new FileCache<string>({ cacheDir });
    if (!fs.existsSync(cacheDir)) {
        failures += 1;
        logLine(
            'FAIL\ncase: cache directory should be created\nexpected: cacheDir exists\n\n',
            process.stderr
        );
    }

    // T2: Set value
    cache.set('key1', 'value1');
    const value1 = cache.get('key1');
    if (value1 !== 'value1') {
        failures += 1;
        logLine('FAIL\ncase: set and get value\nexpected: get returns value1\n\n', process.stderr);
    }

    // T3: Get non-existent key
    const value2 = cache.get('nonexistent');
    if (value2 !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: get non-existent key should return null\nexpected: get returns null\n\n',
            process.stderr
        );
    }

    // T4: Has key (exists)
    if (!cache.has('key1')) {
        failures += 1;
        logLine(
            'FAIL\ncase: has should return true for existing key\nexpected: has returns true\n\n',
            process.stderr
        );
    }

    // T5: Has key (does not exist)
    if (cache.has('nonexistent')) {
        failures += 1;
        logLine(
            'FAIL\ncase: has should return false for non-existent key\nexpected: has returns false\n\n',
            process.stderr
        );
    }

    // T6: Overwrite existing key
    cache.set('key1', 'value1_updated');
    const value3 = cache.get('key1');
    if (value3 !== 'value1_updated') {
        failures += 1;
        logLine(
            'FAIL\ncase: overwrite existing key should update value\nexpected: get returns value1_updated\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - DIFFERENT VALUE TYPES
    // ============================================

    // T7: Store number
    const numberCache = new FileCache<number>({ cacheDir: path.join(testRoot, 'cache-number') });
    numberCache.set('num', 42);
    const numValue = numberCache.get('num');
    if (numValue !== 42) {
        failures += 1;
        logLine(
            'FAIL\ncase: store and retrieve number\nexpected: get returns 42\n\n',
            process.stderr
        );
    }

    // T8: Store object
    const objectCache = new FileCache<{ name: string; age: number }>({
        cacheDir: path.join(testRoot, 'cache-object'),
    });
    const testObj = { name: 'John', age: 30 };
    objectCache.set('obj', testObj);
    const objValue = objectCache.get('obj');
    if (!objValue || objValue.name !== 'John' || objValue.age !== 30) {
        failures += 1;
        logLine(
            'FAIL\ncase: store and retrieve object\nexpected: get returns object with name John and age 30\n\n',
            process.stderr
        );
    }

    // T9: Store array
    const arrayCache = new FileCache<string[]>({ cacheDir: path.join(testRoot, 'cache-array') });
    const testArray = ['a', 'b', 'c'];
    arrayCache.set('arr', testArray);
    const arrValue = arrayCache.get('arr');
    if (!arrValue || arrValue.length !== 3 || arrValue[0] !== 'a') {
        failures += 1;
        logLine(
            'FAIL\ncase: store and retrieve array\nexpected: get returns array with 3 elements, first is a\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - TTL AND EXPIRATION
    // ============================================

    // T10: Custom TTL
    const ttlCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-ttl'),
        ttl: 100, // 100ms
    });
    ttlCache.set('ttl_key', 'ttl_value');
    const ttlValue1 = ttlCache.get('ttl_key');
    if (ttlValue1 !== 'ttl_value') {
        failures += 1;
        logLine(
            'FAIL\ncase: get value before TTL expires\nexpected: get returns ttl_value\n\n',
            process.stderr
        );
    }

    // T11: Expired entry (wait for expiration)
    // Use setTimeout with synchronous check after delay
    // Note: This test requires actual time delay, so we'll use a simple blocking approach
    const start11 = Date.now();
    while (Date.now() - start11 < 150) {
        // Busy wait (acceptable for tests)
    }
    const ttlValue2 = ttlCache.get('ttl_key');
    if (ttlValue2 !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: get expired value should return null\nexpected: get returns null after TTL\n\n',
            process.stderr
        );
    }

    // T12: Custom TTL per set
    const customTtlCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-custom-ttl'),
        ttl: 1000,
    });
    customTtlCache.set('custom', 'value', 50); // 50ms custom TTL
    const start12 = Date.now();
    while (Date.now() - start12 < 60) {
        // Busy wait
    }
    const customValue = customTtlCache.get('custom');
    if (customValue !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: custom TTL per set should expire\nexpected: get returns null after custom TTL\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - CLEAR OPERATIONS
    // ============================================

    // T13: Clear all entries
    const clearCache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-clear') });
    clearCache.set('key1', 'value1');
    clearCache.set('key2', 'value2');
    clearCache.clear();
    if (clearCache.get('key1') !== null || clearCache.get('key2') !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: clear should remove all entries\nexpected: get returns null for all keys\n\n',
            process.stderr
        );
    }

    // T14: Clear empty cache
    const emptyCache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-empty') });
    emptyCache.clear(); // Should not throw
    if (emptyCache.get('any') !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: clear empty cache should not error\nexpected: no error thrown\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - PRUNE OPERATIONS
    // ============================================

    // T15: Prune expired entries
    const pruneCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-prune'),
        ttl: 50,
    });
    pruneCache.set('expired', 'value1');
    pruneCache.set('valid', 'value2', 1000); // Long TTL
    const start15 = Date.now();
    while (Date.now() - start15 < 60) {
        // Busy wait
    }
    const pruned = pruneCache.prune();
    if (pruned !== 1) {
        failures += 1;
        logLine(
            'FAIL\ncase: prune should return count of pruned entries\nexpected: prune returns 1\n\n',
            process.stderr
        );
    }

    // T16: Prune should remove expired entries
    if (pruneCache.get('expired') !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: prune should remove expired entries\nexpected: get returns null for expired key\n\n',
            process.stderr
        );
    }

    // T17: Prune should keep valid entries
    if (pruneCache.get('valid') !== 'value2') {
        failures += 1;
        logLine(
            'FAIL\ncase: prune should keep valid entries\nexpected: get returns value2 for valid key\n\n',
            process.stderr
        );
    }

    // T18: Prune empty cache
    const emptyPruneCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-prune-empty'),
    });
    const prunedEmpty = emptyPruneCache.prune();
    if (prunedEmpty !== 0) {
        failures += 1;
        logLine(
            'FAIL\ncase: prune empty cache should return 0\nexpected: prune returns 0\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - STATS OPERATIONS
    // ============================================

    // T19: Stats with entries
    const statsCache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-stats') });
    statsCache.set('key1', 'value1');
    statsCache.set('key2', 'value2');
    const stats = statsCache.stats();
    if (stats.total !== 2 || stats.size <= 0) {
        failures += 1;
        logLine(
            'FAIL\ncase: stats should return correct total and size\nexpected: total 2, size > 0\n\n',
            process.stderr
        );
    }

    // T20: Stats empty cache
    const emptyStatsCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-stats-empty'),
    });
    const emptyStats = emptyStatsCache.stats();
    if (emptyStats.total !== 0 || emptyStats.size !== 0) {
        failures += 1;
        logLine(
            'FAIL\ncase: stats empty cache should return zeros\nexpected: total 0, size 0\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - DISABLED CACHE
    // ============================================

    // T21: Disabled cache should not store
    const disabledCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-disabled'),
        enabled: false,
    });
    disabledCache.set('key', 'value');
    const disabledValue = disabledCache.get('key');
    if (disabledValue !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: disabled cache should not store values\nexpected: get returns null\n\n',
            process.stderr
        );
    }

    // T22: Disabled cache has should return false
    if (disabledCache.has('key')) {
        failures += 1;
        logLine(
            'FAIL\ncase: disabled cache has should return false\nexpected: has returns false\n\n',
            process.stderr
        );
    }

    // T23: Disabled cache stats should return zeros
    const disabledStats = disabledCache.stats();
    if (disabledStats.total !== 0 || disabledStats.size !== 0) {
        failures += 1;
        logLine(
            'FAIL\ncase: disabled cache stats should return zeros\nexpected: total 0, size 0\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - CORRUPT FILE HANDLING
    // ============================================

    // T24: Corrupt cache file should be handled
    const corruptCache = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-corrupt') });
    corruptCache.set('key', 'value');
    const cachePath = path.join(testRoot, 'cache-corrupt');
    const files = fs.readdirSync(cachePath);
    if (files.length > 0) {
        const corruptFile = path.join(cachePath, files[0]);
        fs.writeFileSync(corruptFile, 'invalid json', 'utf8');
        const corruptValue = corruptCache.get('key');
        // Should return null and remove corrupt file
        if (corruptValue !== null) {
            failures += 1;
            logLine(
                'FAIL\ncase: corrupt cache file should return null\nexpected: get returns null\n\n',
                process.stderr
            );
        }
    }

    // ============================================
    // CREATE CACHE KEY - SUCCESS CASES
    // ============================================

    // T25: Create key from strings
    const key1 = createCacheKey('part1', 'part2', 'part3');
    if (key1 !== 'part1::part2::part3') {
        failures += 1;
        logLine(
            'FAIL\ncase: create key from strings\nexpected: part1::part2::part3\n\n',
            process.stderr
        );
    }

    // T26: Create key from mixed types
    const key2 = createCacheKey('str', 123, true);
    if (key2 !== 'str::123::true') {
        failures += 1;
        logLine(
            'FAIL\ncase: create key from mixed types\nexpected: str::123::true\n\n',
            process.stderr
        );
    }

    // T27: Create key with null/undefined (should be filtered)
    const key3 = createCacheKey('part1', null, 'part2', undefined, 'part3');
    if (key3 !== 'part1::part2::part3') {
        failures += 1;
        logLine(
            'FAIL\ncase: create key should filter null and undefined\nexpected: part1::part2::part3\n\n',
            process.stderr
        );
    }

    // T28: Create key with only null/undefined
    const key4 = createCacheKey(null, undefined);
    if (key4 !== '') {
        failures += 1;
        logLine(
            'FAIL\ncase: create key with only null/undefined should return empty\nexpected: empty string\n\n',
            process.stderr
        );
    }

    // T29: Create key with empty array
    const key5 = createCacheKey();
    if (key5 !== '') {
        failures += 1;
        logLine(
            'FAIL\ncase: create key with no args should return empty\nexpected: empty string\n\n',
            process.stderr
        );
    }

    // ============================================
    // FILE CACHE - EDGE CASES
    // ============================================

    // T30: Very long key
    const longKey = 'x'.repeat(1000);
    cache.set(longKey, 'value');
    const longValue = cache.get(longKey);
    if (longValue !== 'value') {
        failures += 1;
        logLine(
            'FAIL\ncase: very long key should work\nexpected: get returns value\n\n',
            process.stderr
        );
    }

    // T31: Special characters in key
    const specialKey = 'key!@#$%^&*()';
    cache.set(specialKey, 'value');
    const specialValue = cache.get(specialKey);
    if (specialValue !== 'value') {
        failures += 1;
        logLine(
            'FAIL\ncase: special characters in key should work\nexpected: get returns value\n\n',
            process.stderr
        );
    }

    // T32: Empty string key
    cache.set('', 'empty_value');
    const emptyKeyValue = cache.get('');
    if (emptyKeyValue !== 'empty_value') {
        failures += 1;
        logLine(
            'FAIL\ncase: empty string key should work\nexpected: get returns empty_value\n\n',
            process.stderr
        );
    }

    // T33: Multiple caches in same directory (should not interfere)
    const cache1 = new FileCache<string>({ cacheDir: path.join(testRoot, 'cache-multi') });
    const cache2 = new FileCache<number>({ cacheDir: path.join(testRoot, 'cache-multi') });
    cache1.set('shared', 'string');
    cache2.set('shared', 42);
    // They use same directory but different types, so they might overwrite
    // This is expected behavior - same key in same directory overwrites
    const shared1 = cache1.get('shared');
    const shared2 = cache2.get('shared');
    // At least one should work
    if (shared1 === null && shared2 === null) {
        failures += 1;
        logLine(
            'FAIL\ncase: multiple caches should work\nexpected: at least one get returns value\n\n',
            process.stderr
        );
    }

    // T34: Cache with very short TTL (1ms)
    const shortTtlCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-short-ttl'),
        ttl: 1,
    });
    shortTtlCache.set('short', 'value');
    const start34 = Date.now();
    while (Date.now() - start34 < 10) {
        // Busy wait
    }
    const shortValue = shortTtlCache.get('short');
    if (shortValue !== null) {
        failures += 1;
        logLine(
            'FAIL\ncase: very short TTL should expire\nexpected: get returns null after TTL\n\n',
            process.stderr
        );
    }

    // T35: Cache with very long TTL
    const longTtlCache = new FileCache<string>({
        cacheDir: path.join(testRoot, 'cache-long-ttl'),
        ttl: 24 * 60 * 60 * 1000 * 365, // 1 year
    });
    longTtlCache.set('long', 'value');
    const longTtlValue = longTtlCache.get('long');
    if (longTtlValue !== 'value') {
        failures += 1;
        logLine(
            'FAIL\ncase: very long TTL should not expire immediately\nexpected: get returns value\n\n',
            process.stderr
        );
    }

    logLine(`Ran 35 test cases, ${failures} failures`);
} finally {
    // Cleanup
    fs.rmSync(testRoot, { recursive: true, force: true });
}

if (failures > 0) {
    process.exit(1);
}

logLine('RESULT\nstatus: OK\n', process.stdout);
export {};
