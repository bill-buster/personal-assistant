#!/usr/bin/env node

/**
 * Systematic code review tool - reviews files using code review checklist.
 * Reviews files in isolation (no context of other files) for systematic analysis.
 *
 * Usage:
 *   npm run build && node dist/scripts/code_review.js [file_or_directory]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

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
    score: number; // 0-100
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

    // Skip test files for certain checks
    const isTestFile = filePath.includes('.test.ts');
    const isToolFile = filePath.includes('tools/') && !isTestFile;

    // Check each category
    for (const [category, patterns] of Object.entries(REVIEW_CHECKLIST)) {
        for (const { pattern, issue } of patterns) {
            // Skip testing checks for test files
            if (category === 'testing' && isTestFile) continue;

            const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));
            for (const match of matches) {
                if (!match.index) continue;

                // Find line number
                const lineNum = content.substring(0, match.index).split('\n').length;
                const line = lines[lineNum - 1];

                // Determine severity
                let severity: ReviewIssue['severity'] = 'medium';
                if (category === 'security') severity = 'critical';
                else if (category === 'error_handling' && pattern.source.includes('throw'))
                    severity = 'high';
                else if (category === 'performance') severity = 'high';

                // Generate suggestion
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

    // Additional context-aware checks
    if (isToolFile) {
        // Check for proper error return pattern
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

        // Check for context usage
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

function generateReport(reviews: FileReview[]): string {
    const report: string[] = [];

    report.push('📋 Code Review Report\n');
    report.push('='.repeat(80));
    report.push('');

    // Summary
    const totalFiles = reviews.length;
    const totalIssues = reviews.reduce((sum, r) => sum + r.issues.length, 0);
    const avgScore = reviews.reduce((sum, r) => sum + r.score, 0) / totalFiles;
    const criticalIssues = reviews.flatMap(r => r.issues.filter(i => i.severity === 'critical'));

    report.push(`Summary:`);
    report.push(`  Files reviewed: ${totalFiles}`);
    report.push(`  Total issues: ${totalIssues}`);
    report.push(`  Critical issues: ${criticalIssues.length}`);
    report.push(`  Average score: ${avgScore.toFixed(1)}/100`);
    report.push('');

    // Group by category
    const byCategory: Record<string, ReviewIssue[]> = {};
    for (const review of reviews) {
        for (const issue of review.issues) {
            if (!byCategory[issue.category]) {
                byCategory[issue.category] = [];
            }
            byCategory[issue.category].push(issue);
        }
    }

    report.push('Issues by Category:');
    for (const [category, issues] of Object.entries(byCategory)) {
        const critical = issues.filter(i => i.severity === 'critical').length;
        const high = issues.filter(i => i.severity === 'high').length;
        report.push(`  ${category}: ${issues.length} (${critical} critical, ${high} high)`);
    }
    report.push('');

    // Files with issues
    const filesWithIssues = reviews.filter(r => r.issues.length > 0);
    if (filesWithIssues.length > 0) {
        report.push('Files Needing Attention:');
        report.push('');

        for (const review of filesWithIssues
            .sort((a, b) => b.issues.length - a.issues.length)
            .slice(0, 20)) {
            report.push(`${review.file} (Score: ${review.score}/100)`);
            report.push(`  Issues: ${review.issues.length}`);

            // Group by severity
            const bySeverity: Record<string, number> = {};
            for (const issue of review.issues) {
                bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
            }
            const severityStr = Object.entries(bySeverity)
                .map(([s, c]) => `${c} ${s}`)
                .join(', ');
            report.push(`  Severity: ${severityStr}`);
            report.push('');
        }
    }

    // Critical issues
    if (criticalIssues.length > 0) {
        report.push('🚨 Critical Issues:');
        report.push('');
        for (const issue of criticalIssues.slice(0, 10)) {
            report.push(`${issue.file}:${issue.line}`);
            report.push(`  [${issue.category.toUpperCase()}] ${issue.issue}`);
            report.push(`  Suggestion: ${issue.suggestion}`);
            if (issue.code) {
                report.push(`  Code: ${issue.code.substring(0, 60)}...`);
            }
            report.push('');
        }
    }

    report.push('='.repeat(80));
    report.push('');
    report.push('💡 Next Steps:');
    report.push('  1. Review critical issues first');
    report.push('  2. Use Cursor to fix issues: "Fix [issue] in [file]"');
    report.push('  3. Run: npm run review:fix to auto-fix some issues');
    report.push('  4. Re-run review to verify fixes');

    return report.join('\n');
}

function findSourceFiles(dir: string): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            // Skip
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

function main() {
    const args = process.argv.slice(2);

    // Resolve project root (go up from dist/scripts to project root)
    const projectRoot = path.resolve(__dirname, '..', '..');

    let target: string;
    if (args.length === 0) {
        target = path.join(projectRoot, 'src');
    } else if (args[0] === '--help' || args[0] === '-h') {
        console.log(
            `
Systematic code review tool - reviews files using code review checklist.

Usage:
  node dist/scripts/code_review.js [file_or_directory]

Examples:
  node dist/scripts/code_review.js                    # Review entire src/
  node dist/scripts/code_review.js src/tools/         # Review tools directory
  node dist/scripts/code_review.js src/tools/file_tools.ts  # Review single file

Reviews for:
  - Security issues (path traversal, shell injection, secrets)
  - Performance issues (sync I/O, sequential async, regex)
  - Code quality (any types, missing docs, nesting)
  - Error handling (throw statements, empty catch)
  - Testing (missing tests)
  - Documentation (missing JSDoc)
        `.trim()
        );
        process.exit(0);
    } else {
        target = args[0];
    }

    if (!fs.existsSync(target)) {
        console.error(`Error: Path not found: ${target}`);
        process.exit(1);
    }

    const stat = fs.statSync(target);
    const files = stat.isDirectory() ? findSourceFiles(target) : [target];

    console.log(`Reviewing ${files.length} file(s)...\n`);

    const reviews: FileReview[] = [];
    for (const file of files) {
        const issues = analyzeFile(file);
        const score = calculateScore(issues);
        reviews.push({ file, issues, score });
    }

    const report = generateReport(reviews);
    console.log(report);

    // Exit with error if critical issues found
    const hasCritical = reviews.some(r => r.issues.some(i => i.severity === 'critical'));
    process.exit(hasCritical ? 1 : 0);
}

if (require.main === module) {
    main();
}

export {};
