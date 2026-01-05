#!/usr/bin/env node

/**
 * Incremental code review tool - reviews files piece by piece over time.
 * Designed for overnight/scheduled reviews that process files incrementally.
 *
 * Usage:
 *   npm run build && node dist/scripts/incremental_review.js [options]
 *
 * Options:
 *   --batch-size N    Number of files to review per run (default: 3)
 *   --reset           Reset progress and start over
 *   --status          Show current progress status
 *   --target DIR      Target directory (default: src/)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Import review functions from code_review.ts
// We'll duplicate the core logic here to avoid circular dependencies

interface ReviewIssue {
    file: string;
    line: number;
    category:
        | 'security'
        | 'performance'
        | 'quality'
        | 'testing'
        | 'documentation'
        | 'error_handling';
    severity: 'critical' | 'high' | 'medium' | 'low';
    issue: string;
    suggestion: string;
    code?: string;
}

interface FileReview {
    file: string;
    issues: ReviewIssue[];
    score: number;
}

interface ReviewProgress {
    reviewedFiles: string[];
    totalFiles: number;
    currentBatch: number;
    totalBatches: number;
    lastUpdated: string;
    results: FileReview[];
    summary: {
        totalIssues: number;
        criticalIssues: number;
        averageScore: number;
    };
}

const REVIEW_CHECKLIST = {
    security: [
        {
            pattern: /path\.join\([^)]*userInput/gi,
            issue: 'Potential path traversal - use context.paths.resolveAllowed()',
        },
        {
            pattern: /exec\([^`]*`[^`]*\$\{/gi,
            issue: 'Potential shell injection - use context.commands.runAllowed()',
        },
        {
            pattern: /console\.(log|error)\([^)]*apiKey|password|secret/gi,
            issue: 'Secrets in logs - sanitize before logging',
        },
        { pattern: /\.\.\/\.\.\/\.\./g, issue: 'Path traversal pattern detected' },
        {
            pattern: /process\.env\.[A-Z_]+/g,
            issue: 'Environment variable access - ensure proper validation',
        },
    ],
    performance: [
        {
            pattern: /readFileSync|writeFileSync/g,
            issue: 'Synchronous file I/O - use async/await with fs.promises',
        },
        {
            pattern: /for\s*\([^)]+\)\s*\{[^}]*await\s/g,
            issue: 'Sequential async operations - consider Promise.all()',
        },
        {
            pattern: /new RegExp\([^)]+\)/g,
            issue: 'Regex compiled in code - pre-compile as constant',
        },
        {
            pattern: /\.match\(['"`][^'"`]+['"`]\)/g,
            issue: 'Regex compiled in loop - extract to constant',
        },
    ],
    quality: [
        { pattern: /:\s*any\s*[=:]/g, issue: 'Any type used - use proper TypeScript types' },
        { pattern: /export function \w+\([^)]*\)/g, issue: 'Missing JSDoc - add documentation' },
        {
            pattern: /if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{[^}]*if/g,
            issue: 'Deep nesting - use early returns',
        },
        {
            pattern: /\/\/ TODO|\/\/ FIXME|\/\/ HACK/g,
            issue: 'TODO/FIXME comment - address or remove',
        },
        { pattern: /console\.log\(/g, issue: 'Console.log - use proper logging or remove' },
    ],
    error_handling: [
        {
            pattern: /throw\s+new\s+Error\(/g,
            issue: 'Throw statement - return structured error instead',
        },
        {
            pattern: /try\s*\{[^}]*\}\s*(?!catch)/g,
            issue: 'Try without catch - add error handling',
        },
        {
            pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
            issue: 'Empty catch block - handle or log error',
        },
    ],
    testing: [
        { pattern: /export function handle\w+\(/g, issue: 'Tool handler - ensure tests exist' },
    ],
    documentation: [
        { pattern: /export function \w+\(/g, issue: 'Exported function - add JSDoc comment' },
        { pattern: /export const \w+Schema\s*=/g, issue: 'Schema definition - add description' },
    ],
};

function analyzeFile(filePath: string): ReviewIssue[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues: ReviewIssue[] = [];

    const isTestFile = filePath.includes('.test.ts');
    const isToolFile = filePath.includes('tools/') && !isTestFile;

    for (const [category, patterns] of Object.entries(REVIEW_CHECKLIST)) {
        for (const { pattern, issue } of patterns) {
            if (category === 'testing' && isTestFile) continue;

            const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));
            for (const match of matches) {
                if (!match.index) continue;

                const lineNum = content.substring(0, match.index).split('\n').length;
                const line = lines[lineNum - 1];

                let severity: ReviewIssue['severity'] = 'medium';
                if (category === 'security') severity = 'critical';
                else if (category === 'error_handling' && pattern.source.includes('throw'))
                    severity = 'high';
                else if (category === 'performance') severity = 'high';

                let suggestion = issue;
                if (pattern.source.includes('path\\.join')) {
                    suggestion = 'Use context.paths.resolveAllowed() for safe path resolution';
                } else if (pattern.source.includes('exec')) {
                    suggestion = 'Use context.commands.runAllowed() for safe command execution';
                } else if (pattern.source.includes('readFileSync')) {
                    suggestion = 'Use await fs.promises.readFile() for async file I/O';
                } else if (pattern.source.includes('throw')) {
                    suggestion = 'Return { ok: false, error: makeError(...) } instead of throwing';
                }

                issues.push({
                    file: filePath,
                    line: lineNum,
                    category: category as ReviewIssue['category'],
                    severity,
                    issue,
                    suggestion,
                    code: line.trim(),
                });
            }
        }
    }

    if (isToolFile) {
        if (!content.includes('makeError(') && content.includes('export function handle')) {
            issues.push({
                file: filePath,
                line: 1,
                category: 'error_handling',
                severity: 'high',
                issue: 'Tool handler may not use structured errors',
                suggestion: 'Ensure all errors use makeError() helper',
            });
        }

        if (content.includes('export function handle') && !content.includes('ExecutorContext')) {
            issues.push({
                file: filePath,
                line: 1,
                category: 'security',
                severity: 'medium',
                issue: 'Tool handler may not use ExecutorContext',
                suggestion: 'Use context.paths and context.commands for safe operations',
            });
        }
    }

    return issues;
}

function calculateScore(issues: ReviewIssue[]): number {
    if (issues.length === 0) return 100;

    let score = 100;
    for (const issue of issues) {
        switch (issue.severity) {
            case 'critical':
                score -= 10;
                break;
            case 'high':
                score -= 5;
                break;
            case 'medium':
                score -= 2;
                break;
            case 'low':
                score -= 1;
                break;
        }
    }

    return Math.max(0, score);
}

function findSourceFiles(dir: string): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (
                entry.name.startsWith('.') ||
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name === 'coverage' ||
                entry.name.includes('.test.ts')
            ) {
                continue;
            }

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
    }

    walk(dir);
    return files;
}

function getProgressPath(): string {
    const dataDir = path.join(os.homedir(), '.assistant-data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'review-progress.json');
}

function loadProgress(): ReviewProgress | null {
    const progressPath = getProgressPath();
    if (!fs.existsSync(progressPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(progressPath, 'utf8');
        return JSON.parse(content) as ReviewProgress;
    } catch {
        return null;
    }
}

function saveProgress(progress: ReviewProgress): void {
    const progressPath = getProgressPath();
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
}

function initializeProgress(targetDir: string): ReviewProgress {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const fullTarget = path.isAbsolute(targetDir) ? targetDir : path.join(projectRoot, targetDir);

    const files = findSourceFiles(fullTarget);

    return {
        reviewedFiles: [],
        totalFiles: files.length,
        currentBatch: 0,
        totalBatches: 0, // Will be calculated based on batch size
        lastUpdated: new Date().toISOString(),
        results: [],
        summary: {
            totalIssues: 0,
            criticalIssues: 0,
            averageScore: 0,
        },
    };
}

function getNextBatch(progress: ReviewProgress, batchSize: number): string[] {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const targetDir = path.join(projectRoot, 'src');
    const allFiles = findSourceFiles(targetDir);

    const remainingFiles = allFiles.filter(f => !progress.reviewedFiles.includes(f));
    return remainingFiles.slice(0, batchSize);
}

function updateSummary(progress: ReviewProgress): void {
    const totalIssues = progress.results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = progress.results.flatMap(r =>
        r.issues.filter(i => i.severity === 'critical')
    ).length;
    const avgScore =
        progress.results.length > 0
            ? progress.results.reduce((sum, r) => sum + r.score, 0) / progress.results.length
            : 0;

    progress.summary = {
        totalIssues,
        criticalIssues,
        averageScore: avgScore,
    };
}

function printStatus(progress: ReviewProgress): void {
    console.log('📊 Incremental Review Status\n');
    console.log('='.repeat(60));
    console.log(`Total files: ${progress.totalFiles}`);
    console.log(
        `Reviewed: ${progress.reviewedFiles.length} (${((progress.reviewedFiles.length / progress.totalFiles) * 100).toFixed(1)}%)`
    );
    console.log(`Remaining: ${progress.totalFiles - progress.reviewedFiles.length}`);
    console.log(`Last updated: ${progress.lastUpdated}`);
    console.log('');
    console.log('Summary:');
    console.log(`  Total issues: ${progress.summary.totalIssues}`);
    console.log(`  Critical issues: ${progress.summary.criticalIssues}`);
    console.log(`  Average score: ${progress.summary.averageScore.toFixed(1)}/100`);
    console.log('='.repeat(60));
}

function main() {
    const args = process.argv.slice(2);

    let batchSize = 3;
    let reset = false;
    let statusOnly = false;
    let targetDir = 'src';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--batch-size' && i + 1 < args.length) {
            batchSize = parseInt(args[i + 1], 10);
            if (isNaN(batchSize) || batchSize < 1) {
                console.error('Error: --batch-size must be a positive number');
                process.exit(1);
            }
            i++;
        } else if (args[i] === '--reset') {
            reset = true;
        } else if (args[i] === '--status') {
            statusOnly = true;
        } else if (args[i] === '--target' && i + 1 < args.length) {
            targetDir = args[i + 1];
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log(
                `
Incremental code review tool - reviews files piece by piece over time.

Usage:
  node dist/scripts/incremental_review.js [options]

Options:
  --batch-size N    Number of files to review per run (default: 3)
  --reset           Reset progress and start over
  --status          Show current progress status only
  --target DIR      Target directory (default: src/)

Examples:
  # Review 3 files (default)
  node dist/scripts/incremental_review.js

  # Review 5 files per run
  node dist/scripts/incremental_review.js --batch-size 5

  # Check status
  node dist/scripts/incremental_review.js --status

  # Reset and start over
  node dist/scripts/incremental_review.js --reset

This tool is designed for scheduled runs (e.g., cron jobs) that process
files incrementally over time. Progress is saved between runs.
            `.trim()
            );
            process.exit(0);
        }
    }

    // Load or initialize progress
    let progress = reset ? null : loadProgress();
    if (!progress || reset) {
        if (reset && progress) {
            console.log('🔄 Resetting progress...\n');
        }
        progress = initializeProgress(targetDir);
        saveProgress(progress);
    }

    // Show status only
    if (statusOnly) {
        printStatus(progress);
        return;
    }

    // Get next batch of files
    const nextBatch = getNextBatch(progress, batchSize);

    if (nextBatch.length === 0) {
        console.log('✅ All files have been reviewed!\n');
        printStatus(progress);
        console.log('\n💡 To start over, run with --reset');
        return;
    }

    console.log(`📋 Reviewing ${nextBatch.length} file(s)...\n`);

    // Review files in batch
    const batchResults: FileReview[] = [];
    for (const file of nextBatch) {
        try {
            const issues = analyzeFile(file);
            const score = calculateScore(issues);
            batchResults.push({ file, issues, score });

            const issueCount = issues.length;
            const criticalCount = issues.filter(i => i.severity === 'critical').length;
            console.log(
                `  ${file} - Score: ${score}/100 (${issueCount} issues, ${criticalCount} critical)`
            );
        } catch (err: any) {
            console.error(`  ⚠️  Error reviewing ${file}: ${err.message}`);
        }
    }

    // Update progress
    progress.reviewedFiles.push(...nextBatch);
    progress.results.push(...batchResults);
    progress.currentBatch++;
    progress.lastUpdated = new Date().toISOString();
    updateSummary(progress);

    // Calculate total batches
    const remaining = progress.totalFiles - progress.reviewedFiles.length;
    progress.totalBatches = Math.ceil(progress.totalFiles / batchSize);

    // Save progress
    saveProgress(progress);

    // Print summary
    console.log('\n📊 Progress Update:');
    console.log(`  Reviewed: ${progress.reviewedFiles.length}/${progress.totalFiles} files`);
    console.log(`  Remaining: ${remaining} files`);
    console.log(`  Estimated batches remaining: ${Math.ceil(remaining / batchSize)}`);
    console.log(`  Total issues found: ${progress.summary.totalIssues}`);
    console.log(`  Critical issues: ${progress.summary.criticalIssues}`);
    console.log(`  Average score: ${progress.summary.averageScore.toFixed(1)}/100`);

    if (remaining > 0) {
        console.log(`\n💡 Next run will review ${Math.min(batchSize, remaining)} more file(s)`);
    } else {
        console.log('\n✅ Review complete! All files have been reviewed.');
    }
}

if (require.main === module) {
    main();
}

export {};
