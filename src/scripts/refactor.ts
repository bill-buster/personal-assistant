#!/usr/bin/env node

/**
 * Automated refactoring tool to fix common code quality issues.
 *
 * Usage:
 *   npm run build && node dist/scripts/refactor.js <file_path>
 */

import * as fs from 'node:fs';

/**
 * Types of refactoring issues that can be detected.
 */
type IssueType =
    | 'throw_to_return'
    | 'missing_error_handling'
    | 'missing_validation'
    | 'missing_jsdoc'
    | 'sync_to_async';

/**
 * Represents a code quality issue found during analysis.
 */
interface RefactoringIssue {
    line: number;
    type: IssueType;
    message: string;
    fix?: string;
}

/**
 * Constants for analysis configuration.
 */
const MAX_CATCH_SEARCH_DISTANCE = 50;
const TOOLS_DIR = 'tools/';
const TEST_FILE_SUFFIX = '.test.ts';
const TS_FILE_SUFFIX = '.ts';

/**
 * Check if a file is a tool handler that should be analyzed.
 */
function isToolHandlerFile(filePath: string): boolean {
    return (
        filePath.includes(TOOLS_DIR) &&
        filePath.endsWith(TS_FILE_SUFFIX) &&
        !filePath.endsWith(TEST_FILE_SUFFIX)
    );
}

/**
 * Check if a line is a comment.
 */
function isCommentLine(line: string): boolean {
    return line.trim().startsWith('//') || line.trim().startsWith('*');
}

/**
 * Check if a line contains a throw statement.
 */
function hasThrowStatement(line: string): boolean {
    return line.includes('throw ') && !isCommentLine(line);
}

/**
 * Generate a fix suggestion for a throw statement.
 */
function generateThrowFix(line: string): string {
    // Match: throw new Error("message")
    const errorMatch = line.match(/throw\s+new\s+Error\((['"`])(.*?)\1\)/);
    if (errorMatch) {
        const errorMessage = errorMatch[2];
        return line.replace(
            /throw\s+new\s+Error\(['"`].*?['"`]\)/,
            `return { ok: false, error: makeError('EXEC_ERROR', '${errorMessage}') }`
        );
    }

    // Match: throw new Error(message)
    const varMatch = line.match(/throw\s+new\s+Error\((\w+)\)/);
    if (varMatch) {
        const varName = varMatch[1];
        return line.replace(
            /throw\s+new\s+Error\(\w+\)/,
            `return { ok: false, error: makeError('EXEC_ERROR', ${varName}) }`
        );
    }

    // Generic fallback
    return line.replace(/throw\s+/, "return { ok: false, error: makeError('EXEC_ERROR', ");
}

/**
 * Check if a try block has a corresponding catch block.
 */
function hasCatchBlock(lines: string[], tryLineIndex: number): boolean {
    const searchEnd = Math.min(tryLineIndex + MAX_CATCH_SEARCH_DISTANCE, lines.length);
    for (let j = tryLineIndex + 1; j < searchEnd; j++) {
        if (lines[j].includes('catch')) {
            return true;
        }
    }
    return false;
}

/**
 * Check if a function has JSDoc documentation.
 */
function hasJSDoc(lines: string[], functionLineIndex: number): boolean {
    if (functionLineIndex === 0) {
        return false;
    }
    const prevLine = lines[functionLineIndex - 1];
    return prevLine.includes('/**') || prevLine.includes('*');
}

/**
 * Check if a line contains synchronous file operations.
 */
function hasSyncFileOperation(line: string): boolean {
    return (
        (line.includes('readFileSync') || line.includes('writeFileSync')) && !isCommentLine(line)
    );
}

/**
 * Analyze a file for code quality issues.
 * @param filePath - Path to the file to analyze.
 * @returns Array of refactoring issues found.
 */
function analyzeFile(filePath: string): RefactoringIssue[] {
    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`Error reading file ${filePath}: ${error.message}`);
        return [];
    }

    const lines = content.split('\n');
    const issues: RefactoringIssue[] = [];

    if (!isToolHandlerFile(filePath)) {
        return issues;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for throw statements
        if (hasThrowStatement(line)) {
            issues.push({
                line: lineNumber,
                type: 'throw_to_return',
                message: `Line ${lineNumber}: Found 'throw' statement. Tool handlers should return errors instead.`,
                fix: generateThrowFix(line),
            });
        }

        // Check for missing error handling in try-catch
        if (line.includes('try {') && i + 1 < lines.length) {
            if (!hasCatchBlock(lines, i)) {
                issues.push({
                    line: lineNumber,
                    type: 'missing_error_handling',
                    message: `Line ${lineNumber}: Try block without catch. Add error handling.`,
                });
            }
        }

        // Check for missing JSDoc on exported functions
        if (line.includes('export function ') && !hasJSDoc(lines, i)) {
            issues.push({
                line: lineNumber,
                type: 'missing_jsdoc',
                message: `Line ${lineNumber}: Exported function missing JSDoc comment.`,
            });
        }

        // Check for synchronous file operations
        if (hasSyncFileOperation(line)) {
            issues.push({
                line: lineNumber,
                type: 'sync_to_async',
                message: `Line ${lineNumber}: Synchronous file operation. Consider using async/await with fs.promises.`,
            });
        }
    }

    return issues;
}

/**
 * Generate a human-readable report of refactoring issues.
 * @param filePath - Path to the analyzed file.
 * @param issues - Array of issues found.
 * @returns Formatted report string.
 */
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

/**
 * Display usage information.
 */
function showUsage(): void {
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
}

/**
 * Validate that a file exists and is readable.
 * @param filePath - Path to validate.
 * @returns True if file exists and is readable, false otherwise.
 */
function validateFile(filePath: string): boolean {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            return false;
        }

        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            console.error(`Error: Path is not a file: ${filePath}`);
            return false;
        }

        return true;
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`Error accessing file ${filePath}: ${error.message}`);
        return false;
    }
}

/**
 * Main entry point for the refactoring tool.
 */
function main(): void {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showUsage();
        process.exit(0);
    }

    const filePath = args[0];

    if (!validateFile(filePath)) {
        process.exit(1);
    }

    const issues = analyzeFile(filePath);
    const report = generateReport(filePath, issues);

    console.log(report);

    // Exit with error code if issues found
    if (issues.length > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

// Export functions for testing
export {
    isToolHandlerFile,
    isCommentLine,
    hasThrowStatement,
    generateThrowFix,
    hasCatchBlock,
    hasJSDoc,
    hasSyncFileOperation,
    analyzeFile,
    generateReport,
    validateFile,
};
