#!/usr/bin/env node

/**
 * Automated refactoring tool to fix common code quality issues.
 *
 * Usage:
 *   npm run build && node dist/scripts/refactor.js <file_path>
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface RefactoringIssue {
    line: number;
    type:
        | 'throw_to_return'
        | 'missing_error_handling'
        | 'missing_validation'
        | 'missing_jsdoc'
        | 'sync_to_async';
    message: string;
    fix?: string;
}

function analyzeFile(filePath: string): RefactoringIssue[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues: RefactoringIssue[] = [];

    // Check for throw statements in tool handlers
    if (filePath.includes('tools/') && filePath.endsWith('.ts') && !filePath.endsWith('.test.ts')) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for throw statements
            if (line.includes('throw ') && !line.includes('//')) {
                issues.push({
                    line: i + 1,
                    type: 'throw_to_return',
                    message: `Line ${i + 1}: Found 'throw' statement. Tool handlers should return errors instead.`,
                    fix: line.replace(
                        /throw\s+new\s+Error\(([^)]+)\)/,
                        "return { ok: false, error: makeError('EXEC_ERROR', $1) }"
                    ),
                });
            }

            // Check for missing error handling in try-catch
            if (line.includes('try {') && i + 1 < lines.length) {
                let foundCatch = false;
                for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
                    if (lines[j].includes('catch')) {
                        foundCatch = true;
                        break;
                    }
                }
                if (!foundCatch) {
                    issues.push({
                        line: i + 1,
                        type: 'missing_error_handling',
                        message: `Line ${i + 1}: Try block without catch. Add error handling.`,
                    });
                }
            }

            // Check for missing JSDoc on exported functions
            if (line.includes('export function ') && i > 0) {
                const prevLine = lines[i - 1];
                if (!prevLine.includes('/**') && !prevLine.includes('*')) {
                    issues.push({
                        line: i + 1,
                        type: 'missing_jsdoc',
                        message: `Line ${i + 1}: Exported function missing JSDoc comment.`,
                    });
                }
            }

            // Check for synchronous file operations
            if (
                (line.includes('readFileSync') || line.includes('writeFileSync')) &&
                filePath.includes('tools/') &&
                !line.includes('//')
            ) {
                issues.push({
                    line: i + 1,
                    type: 'sync_to_async',
                    message: `Line ${i + 1}: Synchronous file operation. Consider using async/await with fs.promises.`,
                });
            }
        }
    }

    return issues;
}

function generateReport(filePath: string, issues: RefactoringIssue[]): string {
    if (issues.length === 0) {
        return `✓ No issues found in ${filePath}`;
    }

    const report: string[] = [];
    report.push(`Found ${issues.length} issue(s) in ${filePath}:\n`);

    for (const issue of issues) {
        report.push(`Line ${issue.line}: [${issue.type}]`);
        report.push(`  ${issue.message}`);
        if (issue.fix) {
            report.push(`  Suggested fix: ${issue.fix}`);
        }
        report.push('');
    }

    return report.join('\n');
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(
            `
Analyze and suggest fixes for common code quality issues.

Usage:
  node dist/scripts/refactor.js <file_path>

Examples:
  node dist/scripts/refactor.js src/tools/my_tools.ts
  node dist/scripts/refactor.js src/core/executor.ts

Checks for:
  - Throw statements (should return errors)
  - Missing error handling
  - Missing JSDoc on exports
  - Synchronous file operations
        `.trim()
        );
        process.exit(0);
    }

    const filePath = args[0];

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
    }

    const issues = analyzeFile(filePath);
    const report = generateReport(filePath, issues);

    console.log(report);

    if (issues.length > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export {};
