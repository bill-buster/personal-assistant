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

// Whitelist patterns - known safe patterns that should not be flagged
const WHITELIST_PATTERNS = [
    // Safe path.join patterns
    /path\.join\(__dirname/,
    /path\.join\(__filename/,
    /path\.join\(process\.cwd\(\)/,
    /path\.join\([^,)]+,\s*['"][^'"]+['"]\)/, // path.join(base, 'static')
    /path\.join\([^,)]+,\s*['"][^'"]+['"],\s*['"][^'"]+['"]\)/, // path.join(base, 'dir', 'file')
    /context\.paths\.resolveAllowed/, // Safe context usage
    // Safe console.log patterns
    /console\.(log|error)\(['"][^'"]*(Info|Debug|Warn|Error|Trace)/, // console.log('[Info] ...')
    /console\.(log|error)\(['"]\[/, // console.log('[...')
    // Safe process.env patterns (with validation or fallback)
    /process\.env\.[A-Z_]+\s*\|\|/, // process.env.KEY || 'default'
    /process\.env\.[A-Z_]+\s*\?\?/, // process.env.KEY ?? 'default'
    /if\s*\(!process\.env\.[A-Z_]+\)/, // if (!process.env.KEY)
    /if\s*\(process\.env\.[A-Z_]+\s*===/, // if (process.env.KEY === ...)
    // Safe sync I/O in specific contexts
    /readFileSync\(__dirname/, // Reading from __dirname is usually safe
    /readFileSync\(__filename/, // Reading from __filename is usually safe
    /readFileSync\(['"][^'"]+package\.json['"]/, // Reading package.json
    /readFileSync\(['"][^'"]+tsconfig\.json['"]/, // Reading tsconfig.json
];

interface PatternCheck {
    pattern: RegExp;
    issue: string;
    whitelist?: RegExp[]; // Patterns that make this safe
    contextCheck?: (content: string, matchIndex: number) => boolean; // Additional context validation
}

const REVIEW_CHECKLIST: Record<string, PatternCheck[]> = {
    security: [
        {
            pattern: /path\.join\([^,)]+,\s*[^,)]*[uU]ser[Ii]nput|[uU]ser[Dd]ata|[uU]ser[Pp]rovided/gi,
            issue: 'Potential path traversal - use context.paths.resolveAllowed()',
            whitelist: [/context\.paths\.resolveAllowed/, /path\.join\(__dirname/, /path\.join\(process\.cwd\(\)/],
        },
        {
            pattern: /exec\([^`]*`[^`]*\$\{[^}]*[uU]ser[Ii]nput|[uU]ser[Dd]ata/gi,
            issue: 'Potential shell injection - use context.commands.runAllowed()',
            whitelist: [/context\.commands\.runAllowed/],
        },
        {
            pattern: /console\.(log|error|warn)\([^)]*(apiKey|password|secret|token|credential)[^)]*[=:]/gi,
            issue: 'Secrets in logs - sanitize before logging',
            contextCheck: (content, index) => {
                // Check if it's in a comment or string literal
                const before = content.substring(Math.max(0, index - 50), index);
                return !before.includes('//') && !before.match(/['"`][^'"`]*$/);
            },
        },
        {
            pattern: /\.\.\/\.\.\/\.\./g,
            issue: 'Path traversal pattern detected',
            whitelist: [/['"`]\.\.\/\.\.\/\.\.['"`]/, /\/\/.*\.\.\/\.\.\/\.\./], // In strings or comments is OK
        },
        {
            pattern: /process\.env\.[A-Z_]+/g,
            issue: 'Environment variable access - ensure proper validation',
            contextCheck: (content, index) => {
                // Check if there's validation nearby (within 5 lines)
                const start = Math.max(0, index - 500);
                const end = Math.min(content.length, index + 500);
                const context = content.substring(start, end);
                // Look for validation patterns
                return !(
                    context.includes('||') ||
                    context.includes('??') ||
                    context.match(/if\s*\([^)]*process\.env/) ||
                    context.match(/if\s*\(![^)]*process\.env/)
                );
            },
        },
    ],
    performance: [
        {
            pattern: /readFileSync|writeFileSync/g,
            issue: 'Synchronous file I/O - use async/await with fs.promises',
            whitelist: [
                /readFileSync\(__dirname/,
                /readFileSync\(__filename/,
                /readFileSync\(['"][^'"]+package\.json['"]/,
                /readFileSync\(['"][^'"]+tsconfig\.json['"]/,
                /readFileSync\(['"][^'"]+\.json['"]\s*,\s*['"]utf8['"]\)/, // Small config files
            ],
        },
        {
            pattern: /for\s*\([^)]+\)\s*\{[^}]*await\s/g,
            issue: 'Sequential async operations - consider Promise.all()',
            contextCheck: (content, index) => {
                // Check if it's a small loop (less likely to be a problem)
                const context = content.substring(Math.max(0, index - 200), Math.min(content.length, index + 200));
                const loopMatch = context.match(/for\s*\([^)]+\)\s*\{/);
                if (!loopMatch) return true;
                // Count await statements - if only 1, might be OK
                const awaitCount = (context.match(/\bawait\s+/g) || []).length;
                return awaitCount > 1; // Only flag if multiple awaits
            },
        },
        {
            pattern: /new RegExp\([^)]+\)/g,
            issue: 'Regex compiled in code - pre-compile as constant',
            whitelist: [/const\s+\w+\s*=\s*new RegExp/, /RE_\w+\s*=\s*new RegExp/], // If it's already a constant
        },
        {
            pattern: /\.match\(['"`][^'"`]+['"`]\)/g,
            issue: 'Regex compiled in loop - extract to constant',
            contextCheck: (content, index) => {
                // Check if it's inside a loop
                const before = content.substring(Math.max(0, index - 300), index);
                return before.match(/for\s*\(|while\s*\(/) !== null; // Only flag if in a loop
            },
        },
    ],
    quality: [
        {
            pattern: /:\s*any\s*[=:;)/]/g,
            issue: 'Any type used - use proper TypeScript types',
            whitelist: [/\/\/.*:\s*any/, /catch\s*\([^)]*:\s*any/], // In comments or catch blocks is sometimes OK
        },
        {
            pattern: /export\s+(async\s+)?function\s+\w+\([^)]*\)/g,
            issue: 'Missing JSDoc - add documentation',
            contextCheck: (content, index) => {
                // Check if JSDoc exists before this function
                const before = content.substring(Math.max(0, index - 200), index);
                return !before.match(/\/\*\*[\s\S]{0,200}\*\/\s*export/); // No JSDoc found
            },
        },
        {
            pattern: /if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{[^}]*if\s*\([^)]+\)\s*\{/g,
            issue: 'Deep nesting - use early returns',
        },
        {
            pattern: /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)/gi,
            issue: 'TODO/FIXME comment - address or remove',
        },
        {
            pattern: /console\.(log|debug|info)\(/g,
            issue: 'Console.log - use proper logging or remove',
            whitelist: [
                /console\.(log|debug|info)\(['"][^'"]*(Info|Debug|Warn|Error|Trace)/,
                /console\.(log|debug|info)\(['"]\[/,
            ],
            contextCheck: (content, index) => {
                // Check if it's in a test file or debug context
                const before = content.substring(Math.max(0, index - 100), index);
                return !before.includes('// Debug:') && !before.includes('// Test:');
            },
        },
    ],
    error_handling: [
        {
            pattern: /throw\s+new\s+Error\(/g,
            issue: 'Throw statement - return structured error instead',
            whitelist: [/\/\/.*throw/, /catch\s*\{[^}]*throw/], // In comments or re-throwing in catch
        },
        {
            pattern: /try\s*\{[^}]*\}\s*(?!catch)/g,
            issue: 'Try without catch - add error handling',
            contextCheck: (content, index) => {
                // Check if there's a finally block
                const after = content.substring(index, Math.min(content.length, index + 200));
                return !after.match(/finally\s*\{/); // Only flag if no finally
            },
        },
        {
            pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
            issue: 'Empty catch block - handle or log error',
        },
    ],
    testing: [
        {
            pattern: /export\s+(async\s+)?function\s+handle\w+\(/g,
            issue: 'Tool handler - ensure tests exist',
        },
    ],
    documentation: [
        {
            pattern: /export\s+(async\s+)?function\s+\w+\(/g,
            issue: 'Exported function - add JSDoc comment',
            contextCheck: (content, index) => {
                // Check if JSDoc exists
                const before = content.substring(Math.max(0, index - 200), index);
                return !before.match(/\/\*\*[\s\S]{0,200}\*\/\s*export/);
            },
        },
        {
            pattern: /export\s+const\s+\w+Schema\s*=/g,
            issue: 'Schema definition - add description',
            contextCheck: (content, index) => {
                // Check if description exists in schema
                const after = content.substring(index, Math.min(content.length, index + 500));
                return !after.match(/\.describe\(/); // No description found
            },
        },
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
        for (const check of patterns) {
            const { pattern, issue, whitelist, contextCheck } = check;
            
            // Skip testing checks for test files
            if (category === 'testing' && isTestFile) continue;

            const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));
            for (const match of matches) {
                if (match.index === undefined) continue;

                const matchIndex = match.index;
                const matchText = match[0];

                // Check whitelist patterns
                if (whitelist) {
                    let isWhitelisted = false;
                    for (const whitelistPattern of whitelist) {
                        // Check if whitelist pattern matches nearby context
                        const contextStart = Math.max(0, matchIndex - 200);
                        const contextEnd = Math.min(content.length, matchIndex + matchText.length + 200);
                        const context = content.substring(contextStart, contextEnd);
                        
                        if (whitelistPattern.test(context)) {
                            isWhitelisted = true;
                            break;
                        }
                    }
                    if (isWhitelisted) continue;
                }

                // Check global whitelist
                let isGloballyWhitelisted = false;
                for (const globalWhitelist of WHITELIST_PATTERNS) {
                    const contextStart = Math.max(0, matchIndex - 200);
                    const contextEnd = Math.min(content.length, matchIndex + matchText.length + 200);
                    const context = content.substring(contextStart, contextEnd);
                    
                    if (globalWhitelist.test(context)) {
                        isGloballyWhitelisted = true;
                        break;
                    }
                }
                if (isGloballyWhitelisted) continue;

                // Check context-specific validation
                if (contextCheck && !contextCheck(content, matchIndex)) {
                    continue; // Context check says it's safe
                }

                // Find line number
                const lineNum = content.substring(0, matchIndex).split('\n').length;
                const line = lines[lineNum - 1];

                // Skip if in comment (basic check)
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                    continue;
                }

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
