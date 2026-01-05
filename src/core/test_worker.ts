/**
 * Parallel test execution utilities.
 * Runs multiple test files concurrently with limited concurrency.
 *
 * @module core/test_worker
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';

export interface TestResult {
    file: string;
    passed: boolean;
    duration_ms: number;
    stdout: string;
    stderr: string;
    exitCode: number;
}

export interface ParallelTestOptions {
    /** Test file path */
    filePath: string;
    /** Base directory for test execution */
    baseDir: string;
    /** Memory limit in MB */
    memLimit?: string;
    /** Whether running in dist mode */
    isDist: boolean;
    /** ts-node register path (if not dist mode) */
    tsNodeRegister?: string;
}

/**
 * Run a single test file asynchronously.
 */
export function runTestAsync(options: ParallelTestOptions): Promise<TestResult> {
    return new Promise(resolve => {
        const { filePath, baseDir, memLimit = '256', isDist, tsNodeRegister } = options;
        const startTime = Date.now();

        // Build exec args
        const execArgs = isDist
            ? [`--max-old-space-size=${memLimit}`, filePath]
            : [`--max-old-space-size=${memLimit}`, '-r', tsNodeRegister!, filePath];

        let stdout = '';
        let stderr = '';

        const child = spawn(process.execPath, execArgs, {
            cwd: baseDir,
            env: { ...process.env, FORCE_COLOR: '1' },
        });

        child.stdout?.on('data', data => {
            stdout += data.toString();
        });

        child.stderr?.on('data', data => {
            stderr += data.toString();
        });

        child.on('close', code => {
            const duration = Date.now() - startTime;
            resolve({
                file: path.basename(filePath),
                passed: code === 0,
                duration_ms: duration,
                stdout,
                stderr,
                exitCode: code || 0,
            });
        });

        child.on('error', err => {
            const duration = Date.now() - startTime;
            resolve({
                file: path.basename(filePath),
                passed: false,
                duration_ms: duration,
                stdout,
                stderr: err.message,
                exitCode: 1,
            });
        });
    });
}

/**
 * Run tests in parallel with limited concurrency.
 */
export async function runTestsInParallel(
    testFiles: string[],
    options: {
        baseDir: string;
        isDist: boolean;
        tsNodeRegister?: string;
        maxWorkers?: number;
        memLimit?: string;
    }
): Promise<TestResult[]> {
    const { baseDir, isDist, tsNodeRegister, maxWorkers = 4, memLimit } = options;

    // Limit workers to number of test files
    const numWorkers = Math.min(maxWorkers, testFiles.length);

    const results: TestResult[] = [];
    const queue = [...testFiles];
    const running = new Set<Promise<void>>();

    // Process queue with limited concurrency
    while (queue.length > 0 || running.size > 0) {
        // Start new tests up to limit
        while (running.size < numWorkers && queue.length > 0) {
            const filePath = queue.shift()!;

            // Create promise and track it for cleanup
            // Use a wrapper to avoid self-reference issue
            let promiseRef: Promise<void> | null = null;
            const promise = (async () => {
                try {
                    const result = await runTestAsync({
                        filePath,
                        baseDir,
                        memLimit,
                        isDist,
                        tsNodeRegister,
                    });
                    results.push(result);
                } finally {
                    // Remove from running set when done
                    if (promiseRef) {
                        running.delete(promiseRef);
                    }
                }
            })();
            promiseRef = promise;

            running.add(promise);
        }

        // Wait for at least one test to finish
        if (running.size > 0) {
            await Promise.race(Array.from(running));
        }
    }

    return results;
}
