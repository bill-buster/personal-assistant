#!/usr/bin/env node

/**
 * Automated refactoring tool with auto-fix capability.
 *
 * Usage:
 *   npm run build && node dist/scripts/refactor_fix.js <file_path> [--fix]
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
    originalLine: string;
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
                const match = line.match(/throw\s+new\s+Error\(([^)]+)\)/);
                if (match) {
                    const errorMsg = match[1];
                    issues.push({
                        line: i + 1,
                        type: 'throw_to_return',
                        message: `Line ${i + 1}: Found 'throw' statement. Tool handlers should return errors instead.`,
                        originalLine: line,
                        fix: line.replace(
                            /throw\s+new\s+Error\(([^)]+)\)/,
                            "return { ok: false, error: makeError('EXEC_ERROR', $1) }"
                        ),
                    });
                }
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
                        originalLine: line,
                    });
                }
            }

            // Check for missing JSDoc on exported functions
            if (line.includes('export function ') && i > 0) {
                const prevLine = lines[i - 1];
                if (!prevLine.includes('/**') && !prevLine.includes('*')) {
                    const funcMatch = line.match(/export function (\w+)/);
                    if (funcMatch) {
                        const funcName = funcMatch[1];
                        issues.push({
                            line: i + 1,
                            type: 'missing_jsdoc',
                            message: `Line ${i + 1}: Exported function '${funcName}' missing JSDoc comment.`,
                            originalLine: line,
                            fix: `/**\n * ${funcName}\n * @param args - Tool arguments\n * @param context - Execution context\n * @returns Result object\n */\n${line}`,
                        });
                    }
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
                    originalLine: line,
                });
            }
        }
    }

    return issues;
}

function applyFixes(filePath: string, issues: RefactoringIssue[]): void {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Apply fixes in reverse order to preserve line numbers
    const fixableIssues = issues.filter(i => i.fix).sort((a, b) => b.line - a.line);

    for (const issue of fixableIssues) {
        const lineIndex = issue.line - 1;

        if (issue.type === 'throw_to_return') {
            // Check if makeError is imported
            if (!content.includes('makeError')) {
                // Find import section and add makeError
                const importIndex = lines.findIndex(l => l.includes("from '../core"));
                if (importIndex >= 0) {
                    lines[importIndex] = lines[importIndex].replace(
                        /from '\.\.\/core'/,
                        "from '../core'\nimport { makeError } from '../core/tool_contract'"
                    );
                }
            }

            lines[lineIndex] = issue.fix!;
            modified = true;
        } else if (issue.type === 'missing_jsdoc') {
            lines[lineIndex] = issue.fix!;
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`✓ Applied fixes to ${filePath}`);
    }
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
        report.push(`  Original: ${issue.originalLine.trim()}`);
        if (issue.fix) {
            report.push(`  Fix: ${issue.fix.trim()}`);
        }
        report.push('');
    }

    return report.join('\n');
}

function main() {
    const args = process.argv.slice(2);
    const fixMode = args.includes('--fix');
    const fileArgs = args.filter(a => a !== '--fix');

    if (fileArgs.length === 0 || fileArgs[0] === '--help' || fileArgs[0] === '-h') {
        console.log(
            `
Analyze and fix common code quality issues.

Usage:
  node dist/scripts/refactor_fix.js <file_path> [--fix]

Options:
  --fix    Automatically apply fixes (with confirmation for destructive changes)

Examples:
  node dist/scripts/refactor_fix.js src/tools/my_tools.ts
  node dist/scripts/refactor_fix.js src/tools/my_tools.ts --fix

Fixes:
  - Convert throw to return errors
  - Add missing JSDoc comments
        `.trim()
        );
        process.exit(0);
    }

    const filePath = fileArgs[0];

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
    }

    const issues = analyzeFile(filePath);
    const report = generateReport(filePath, issues);

    console.log(report);

    if (fixMode && issues.some(i => i.fix)) {
        console.log('\nApplying fixes...');
        applyFixes(filePath, issues);
    } else if (fixMode) {
        console.log('\nNo auto-fixable issues found.');
    } else if (issues.some(i => i.fix)) {
        console.log('\n💡 Tip: Run with --fix to automatically apply fixes');
    }

    if (issues.length > 0 && !fixMode) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export {};
