#!/usr/bin/env node

/**
 * Auto-fix code review issues where possible.
 *
 * Usage:
 *   npm run build && node dist/scripts/code_review_fix.js [file_or_directory]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface Fix {
    file: string;
    line: number;
    old: string;
    new: string;
    description: string;
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

function autoFixFile(filePath: string): Fix[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fixes: Fix[] = [];
    const isTestFile = filePath.includes('.test.ts');

    // Fix 1: Add missing JSDoc to exported functions
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^export function \w+\(/)) {
            const prevLine = i > 0 ? lines[i - 1] : '';
            if (!prevLine.includes('/**') && !prevLine.includes('*')) {
                const funcMatch = line.match(/export function (\w+)\(([^)]*)\)/);
                if (funcMatch) {
                    const funcName = funcMatch[1];
                    const params = funcMatch[2];
                    const jsdoc = `/**\n * ${funcName} description.\n${
                        params
                            ? ` * @param ${params
                                  .split(',')
                                  .map(p => p.trim().split(':')[0])
                                  .join(' ')} - Parameters\n`
                            : ''
                    } * @returns Result\n */`;

                    fixes.push({
                        file: filePath,
                        line: i + 1,
                        old: line,
                        new: jsdoc + '\n' + line,
                        description: `Add JSDoc to ${funcName}`,
                    });

                    lines.splice(
                        i,
                        0,
                        jsdoc.split('\n')[0],
                        jsdoc.split('\n')[1],
                        jsdoc.split('\n')[2]
                    );
                    i += 3;
                }
            }
        }
    }

    // Fix 2: Replace throw with return error (simple cases)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('throw new Error(') && !isTestFile) {
            const errorMatch = line.match(/throw new Error\((['"`])([^'"`]+)\1\)/);
            if (errorMatch) {
                const errorMsg = errorMatch[2];
                const newLine = line.replace(
                    /throw new Error\((['"`])([^'"`]+)\1\)/,
                    `return { ok: false, error: makeError('EXEC_ERROR', '${errorMsg}') }`
                );

                fixes.push({
                    file: filePath,
                    line: i + 1,
                    old: line,
                    new: newLine,
                    description: 'Replace throw with structured error return',
                });

                lines[i] = newLine;
            }
        }
    }

    return fixes;
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
Auto-fix code review issues where possible.

Usage:
  node dist/scripts/code_review_fix.js [file_or_directory]

Examples:
  node dist/scripts/code_review_fix.js                    # Fix entire src/
  node dist/scripts/code_review_fix.js src/tools/         # Fix tools directory
  node dist/scripts/code_review_fix.js src/tools/file_tools.ts  # Fix single file

Auto-fixes:
  - Adds missing JSDoc to exported functions
  - Replaces throw statements with structured errors (simple cases)
  - More fixes coming...

Note: Review changes before committing!
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

    console.log(`Auto-fixing ${files.length} file(s)...\n`);

    const allFixes: Fix[] = [];
    for (const file of files) {
        const fixes = autoFixFile(file);
        allFixes.push(...fixes);
    }

    if (allFixes.length === 0) {
        console.log('✓ No auto-fixable issues found');
        return;
    }

    console.log(`Found ${allFixes.length} fix(es):\n`);
    for (const fix of allFixes) {
        console.log(`${fix.file}:${fix.line}`);
        console.log(`  ${fix.description}`);
        console.log(`  - ${fix.old.trim()}`);
        console.log(`  + ${fix.new.trim()}`);
        console.log('');
    }

    console.log('⚠️  Auto-fix is experimental. Review changes carefully before committing!');
    console.log('💡 Use Cursor to review and apply fixes: "Review and fix issues in [file]"');
}

if (require.main === module) {
    main();
}

export {};
