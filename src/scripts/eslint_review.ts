#!/usr/bin/env node

/**
 * ESLint-based code review - uses ESLint programmatically for code review.
 * Much more accurate than pattern matching, uses AST parsing.
 *
 * Usage:
 *   npm run build && node dist/scripts/eslint_review.js [file_or_directory]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ESLint } from 'eslint';

interface ReviewIssue {
    file: string;
    line: number;
    column: number;
    category: 'security' | 'performance' | 'quality' | 'error_handling' | 'testing' | 'documentation';
    severity: 'critical' | 'high' | 'medium' | 'low';
    rule: string;
    message: string;
    suggestion?: string;
    code?: string;
}

interface FileReview {
    file: string;
    issues: ReviewIssue[];
    score: number;
}

// Map ESLint rules to our categories
const RULE_CATEGORIES: Record<string, ReviewIssue['category']> = {
    // Security
    '@typescript-eslint/no-unsafe-assignment': 'security',
    '@typescript-eslint/no-unsafe-member-access': 'security',
    '@typescript-eslint/no-unsafe-call': 'security',
    '@typescript-eslint/no-unsafe-return': 'security',
    '@typescript-eslint/no-explicit-any': 'security',
    'no-eval': 'security',
    'no-implied-eval': 'security',
    
    // Performance
    'no-await-in-loop': 'performance',
    '@typescript-eslint/no-floating-promises': 'performance',
    
    // Quality
    '@typescript-eslint/no-unused-vars': 'quality',
    'prefer-const': 'quality',
    'no-var': 'quality',
    '@typescript-eslint/prefer-nullish-coalescing': 'quality',
    '@typescript-eslint/prefer-optional-chain': 'quality',
    
    // Error handling
    'no-throw-literal': 'error_handling',
    '@typescript-eslint/no-throw-literal': 'error_handling',
    'no-empty': 'error_handling',
    
    // Default
    default: 'quality',
};

// Map ESLint severity to our severity
function mapSeverity(eslintSeverity: number): ReviewIssue['severity'] {
    if (eslintSeverity === 2) return 'high'; // error
    if (eslintSeverity === 1) return 'medium'; // warning
    return 'low'; // off or other
}

async function analyzeFileWithESLint(filePath: string): Promise<ReviewIssue[]> {
    // ESLint 9+ uses flat config - it will automatically find eslint.config.mjs
    const eslint = new ESLint({
        cwd: path.resolve(__dirname, '..', '..'),
    });

    try {
        const results = await eslint.lintFiles([filePath]);
        const issues: ReviewIssue[] = [];

        for (const result of results) {
            if (!result.messages) continue;

            const fileContent = fs.readFileSync(result.filePath, 'utf8');
            const lines = fileContent.split('\n');

            for (const message of result.messages) {
                const category = RULE_CATEGORIES[message.ruleId || ''] || RULE_CATEGORIES.default;
                const severity = mapSeverity(message.severity);
                
                // Skip low severity issues unless they're security-related
                if (severity === 'low' && category !== 'security') continue;

                const line = message.line || 1;
                const column = message.column || 1;
                const codeLine = lines[line - 1] || '';

                issues.push({
                    file: result.filePath,
                    line,
                    column,
                    category,
                    severity: category === 'security' ? 'critical' : severity,
                    rule: message.ruleId || 'unknown',
                    message: message.message,
                    suggestion: message.fix ? 'Auto-fixable: run npm run lint:fix' : undefined,
                    code: codeLine.trim(),
                });
            }
        }

        return issues;
    } catch (err: any) {
        console.error(`Error analyzing ${filePath}: ${err.message}`);
        return [];
    }
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
                entry.name === 'coverage'
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

    report.push('📋 ESLint Code Review Report\n');
    report.push('='.repeat(80));
    report.push('');

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

    // Critical issues
    if (criticalIssues.length > 0) {
        report.push('🚨 Critical Issues:');
        report.push('');
        for (const issue of criticalIssues.slice(0, 20)) {
            report.push(`${issue.file}:${issue.line}:${issue.column}`);
            report.push(`  [${issue.rule}] ${issue.message}`);
            if (issue.suggestion) {
                report.push(`  💡 ${issue.suggestion}`);
            }
            if (issue.code) {
                report.push(`  Code: ${issue.code.substring(0, 60)}...`);
            }
            report.push('');
        }
    }

    report.push('='.repeat(80));
    report.push('');
    report.push('💡 Next Steps:');
    report.push('  1. Auto-fix issues: npm run lint:fix');
    report.push('  2. Review critical issues manually');
    report.push('  3. Run: npm run lint to see all issues');

    return report.join('\n');
}

async function main() {
    const args = process.argv.slice(2);

    const projectRoot = path.resolve(__dirname, '..', '..');
    let target: string;

    if (args.length === 0) {
        target = path.join(projectRoot, 'src');
    } else if (args[0] === '--help' || args[0] === '-h') {
        console.log(
            `
ESLint-based code review - uses AST parsing for accurate analysis.

Usage:
  node dist/scripts/eslint_review.js [file_or_directory]

Examples:
  node dist/scripts/eslint_review.js                    # Review entire src/
  node dist/scripts/eslint_review.js src/tools/         # Review tools directory
  node dist/scripts/eslint_review.js src/tools/file_tools.ts  # Review single file

Benefits over pattern matching:
  - AST-based analysis (more accurate)
  - Understands code structure
  - Type-aware checks
  - Auto-fixable issues detected
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

    console.log(`Reviewing ${files.length} file(s) with ESLint...\n`);

    const reviews: FileReview[] = [];
    for (const file of files) {
        const issues = await analyzeFileWithESLint(file);
        const score = calculateScore(issues);
        reviews.push({ file, issues, score });
    }

    const report = generateReport(reviews);
    console.log(report);

    const hasCritical = reviews.some(r => r.issues.some(i => i.severity === 'critical'));
    process.exit(hasCritical ? 1 : 0);
}

if (require.main === module) {
    main().catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}

export {};

