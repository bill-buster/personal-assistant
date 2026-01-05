/**
 * Test result caching system.
 * Caches test results to avoid re-running unchanged tests.
 *
 * @module core/test_cache
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface TestResult {
    file: string;
    timestamp: string;
    passed: boolean;
    failures: number;
    duration_ms: number;
    filesHashed?: string[];
    error?: string;
}

export interface TestSummary {
    timestamp: string;
    passed: boolean;
    total: number;
    failed: number;
    skipped: number;
    duration_ms: number;
}

/**
 * Get file hash for change detection.
 */
function hashFile(filePath: string): string | null {
    try {
        if (!fs.existsSync(filePath)) return null;
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
        return null;
    }
}

/**
 * Get hash of test file and its dependencies.
 */
function getTestHash(testFile: string, sourceDir: string): string {
    const hashes: string[] = [];

    // Hash test file itself
    const testHash = hashFile(testFile);
    if (testHash) hashes.push(testHash);

    // Hash related source files (heuristic: same name without .test)
    const testName = path.basename(testFile, '.test.ts');
    const sourceFile = path.join(sourceDir, testName.replace('_test', '.ts'));
    const sourceHash = hashFile(sourceFile);
    if (sourceHash) hashes.push(sourceHash);

    // Hash common dependencies
    const commonFiles = ['core/types.ts', 'core/executor.ts', 'core/tool_registry.ts'];

    for (const relPath of commonFiles) {
        const fullPath = path.join(sourceDir, relPath);
        const h = hashFile(fullPath);
        if (h) hashes.push(h);
    }

    return crypto.createHash('sha256').update(hashes.join('::')).digest('hex');
}

/**
 * Test result cache manager.
 */
export class TestCache {
    private resultsDir: string;
    private resultsFile: string;
    private summaryFile: string;
    private checksumsFile: string;

    constructor(resultsDir: string = '.test-results') {
        this.resultsDir = resultsDir;
        this.resultsFile = path.join(resultsDir, 'results.jsonl');
        this.summaryFile = path.join(resultsDir, 'latest.json');
        this.checksumsFile = path.join(resultsDir, 'checksums.json');

        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
    }

    /**
     * Check if test should be skipped (cached result exists and is recent).
     */
    shouldSkipTest(testFile: string, sourceDir: string, maxAgeMs: number = 3600000): boolean {
        const testHash = getTestHash(testFile, sourceDir);

        // Load checksums
        let checksums: Record<string, string> = {};
        if (fs.existsSync(this.checksumsFile)) {
            try {
                checksums = JSON.parse(fs.readFileSync(this.checksumsFile, 'utf8'));
            } catch {
                // Invalid checksums file, ignore
            }
        }

        // Check if file changed
        if (checksums[testFile] !== testHash) {
            return false; // File changed, need to run
        }

        // Check if recent result exists
        if (!fs.existsSync(this.resultsFile)) {
            return false;
        }

        const lines = fs.readFileSync(this.resultsFile, 'utf8').trim().split('\n').filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const result: TestResult = JSON.parse(lines[i]);
                if (result.file === path.basename(testFile) && result.passed) {
                    const resultTime = new Date(result.timestamp).getTime();
                    const age = Date.now() - resultTime;
                    if (age < maxAgeMs) {
                        return true; // Recent pass, skip
                    }
                }
            } catch {
                // Invalid line, continue
            }
        }

        return false;
    }

    /**
     * Save test result.
     */
    saveResult(result: TestResult, sourceDir: string): void {
        // Append to results file
        fs.appendFileSync(this.resultsFile, JSON.stringify(result) + '\n', 'utf8');

        // Update checksum
        const testHash = getTestHash(result.file.replace('.test.ts', ''), sourceDir);
        let checksums: Record<string, string> = {};
        if (fs.existsSync(this.checksumsFile)) {
            try {
                checksums = JSON.parse(fs.readFileSync(this.checksumsFile, 'utf8'));
            } catch {
                // Invalid, start fresh
            }
        }
        checksums[result.file] = testHash;
        fs.writeFileSync(this.checksumsFile, JSON.stringify(checksums, null, 2), 'utf8');
    }

    /**
     * Update summary after full test run.
     */
    updateSummary(summary: TestSummary): void {
        fs.writeFileSync(this.summaryFile, JSON.stringify(summary, null, 2), 'utf8');
    }

    /**
     * Get latest summary.
     */
    getSummary(): TestSummary | null {
        if (!fs.existsSync(this.summaryFile)) {
            return null;
        }

        try {
            return JSON.parse(fs.readFileSync(this.summaryFile, 'utf8'));
        } catch {
            return null;
        }
    }

    /**
     * Clear all cached results.
     */
    clear(): void {
        if (fs.existsSync(this.resultsFile)) {
            fs.unlinkSync(this.resultsFile);
        }
        if (fs.existsSync(this.summaryFile)) {
            fs.unlinkSync(this.summaryFile);
        }
        if (fs.existsSync(this.checksumsFile)) {
            fs.unlinkSync(this.checksumsFile);
        }
    }
}
