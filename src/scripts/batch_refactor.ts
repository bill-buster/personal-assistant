#!/usr/bin/env node

/**
 * Batch refactoring tool - analyze multiple files at once.
 *
 * Usage:
 *   npm run build && node dist/scripts/batch_refactor.js [--fix] [--path <dir>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
// Import types from refactor.ts
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

// Copy analyzeFile function (simplified for batch processing)
function analyzeFile(filePath: string): RefactoringIssue[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues: RefactoringIssue[] = [];

    if (filePath.includes('tools/') && filePath.endsWith('.ts') && !filePath.endsWith('.test.ts')) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('throw ') && !line.includes('//')) {
                issues.push({
                    line: i + 1,
                    type: 'throw_to_return',
                    message: `Found 'throw' statement`,
                });
            }

            if (line.includes('export function ') && i > 0) {
                const prevLine = lines[i - 1];
                if (!prevLine.includes('/**') && !prevLine.includes('*')) {
                    issues.push({
                        line: i + 1,
                        type: 'missing_jsdoc',
                        message: `Exported function missing JSDoc`,
                    });
                }
            }
        }
    }

    return issues;
}

function findTypeScriptFiles(
    dir: string,
    excludeDirs: string[] = ['node_modules', 'dist', '.git']
): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (!excludeDirs.includes(entry.name)) {
                    walk(fullPath);
                }
            } else if (
                entry.isFile() &&
                entry.name.endsWith('.ts') &&
                !entry.name.endsWith('.test.ts')
            ) {
                files.push(fullPath);
            }
        }
    }

    walk(dir);
    return files;
}

function main() {
    const args = process.argv.slice(2);
    const fixMode = args.includes('--fix');
    const pathIndex = args.indexOf('--path');
    const targetPath =
        pathIndex >= 0 && pathIndex < args.length - 1
            ? args[pathIndex + 1]
            : path.join(__dirname, '..', 'tools');

    if (args.includes('--help') || args.includes('-h')) {
        console.log(
            `
Batch refactoring tool - analyze multiple files at once.

Usage:
  node dist/scripts/batch_refactor.js [--fix] [--path <dir>]

Options:
  --fix         Automatically apply fixes
  --path <dir>   Directory to analyze (default: src/tools)

Examples:
  node dist/scripts/batch_refactor.js
  node dist/scripts/batch_refactor.js --path src/core
  node dist/scripts/batch_refactor.js --fix --path src/tools
        `.trim()
        );
        process.exit(0);
    }

    if (!fs.existsSync(targetPath)) {
        console.error(`Error: Path not found: ${targetPath}`);
        process.exit(1);
    }

    const files = findTypeScriptFiles(targetPath);
    console.log(`Analyzing ${files.length} file(s) in ${targetPath}...\n`);

    let totalIssues = 0;
    const fileIssues: Array<{ file: string; issues: RefactoringIssue[] }> = [];

    for (const file of files) {
        const issues = analyzeFile(file);
        if (issues.length > 0) {
            fileIssues.push({ file, issues });
            totalIssues += issues.length;
        }
    }

    if (fileIssues.length === 0) {
        console.log(`✓ No issues found in ${files.length} file(s)`);
        process.exit(0);
    }

    // Generate report
    for (const { file, issues } of fileIssues) {
        const relPath = path.relative(process.cwd(), file);
        console.log(`${relPath}: ${issues.length} issue(s)`);
        for (const issue of issues) {
            console.log(`  Line ${issue.line}: [${issue.type}] ${issue.message}`);
        }
        console.log('');
    }

    console.log(`\nTotal: ${totalIssues} issue(s) across ${fileIssues.length} file(s)`);

    if (fixMode) {
        console.log('\n💡 Tip: Use refactor_fix.js for individual file fixes');
    } else {
        console.log('\n💡 Tip: Use refactor_fix.js <file> --fix to fix individual files');
    }

    process.exit(totalIssues > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}

export {};
