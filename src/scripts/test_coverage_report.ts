#!/usr/bin/env node

/**
 * Generate test coverage report and identify gaps
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

interface CoverageData {
    file: string;
    lines: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
}

function parseCoverageReport(): CoverageData[] {
    const coveragePath = path.join(__dirname, '..', '..', 'coverage', 'lcov.info');
    if (!fs.existsSync(coveragePath)) {
        console.error('Coverage report not found. Run: npm run test:coverage');
        process.exit(1);
    }

    const content = fs.readFileSync(coveragePath, 'utf8');
    const files: CoverageData[] = [];
    const lines = content.split('\n');

    let currentFile: Partial<CoverageData> | null = null;

    for (const line of lines) {
        if (line.startsWith('SF:')) {
            if (currentFile) {
                files.push(currentFile as CoverageData);
            }
            const filePath = line.substring(3);
            currentFile = {
                file: filePath,
                lines: { total: 0, covered: 0, percentage: 0 },
                functions: { total: 0, covered: 0, percentage: 0 },
                branches: { total: 0, covered: 0, percentage: 0 },
                statements: { total: 0, covered: 0, percentage: 0 },
            };
        } else if (line.startsWith('LF:') && currentFile) {
            currentFile.lines!.total = parseInt(line.substring(3), 10);
        } else if (line.startsWith('LH:') && currentFile) {
            currentFile.lines!.covered = parseInt(line.substring(3), 10);
        } else if (line.startsWith('FNF:') && currentFile) {
            currentFile.functions!.total = parseInt(line.substring(4), 10);
        } else if (line.startsWith('FNH:') && currentFile) {
            currentFile.functions!.covered = parseInt(line.substring(4), 10);
        } else if (line.startsWith('BRF:') && currentFile) {
            currentFile.branches!.total = parseInt(line.substring(4), 10);
        } else if (line.startsWith('BRH:') && currentFile) {
            currentFile.branches!.covered = parseInt(line.substring(4), 10);
        }
    }

    if (currentFile) {
        files.push(currentFile as CoverageData);
    }

    // Calculate percentages
    for (const file of files) {
        file.lines.percentage =
            file.lines.total > 0 ? (file.lines.covered / file.lines.total) * 100 : 0;
        file.functions.percentage =
            file.functions.total > 0 ? (file.functions.covered / file.functions.total) * 100 : 0;
        file.branches.percentage =
            file.branches.total > 0 ? (file.branches.covered / file.branches.total) * 100 : 0;
        // Statements use lines as proxy (LCOV doesn't have separate statement count)
        file.statements.percentage = file.lines.percentage;
    }

    return files;
}

function generateReport() {
    console.log('Analyzing test coverage...\n');

    // Run coverage if not exists
    const coveragePath = path.join(__dirname, '..', '..', 'coverage', 'lcov.info');
    if (!fs.existsSync(coveragePath)) {
        console.log('Running test coverage...');
        spawnSync('npm', ['run', 'test:coverage'], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..', '..'),
        });
    }

    const files = parseCoverageReport();

    // Filter to source files only (LCOV uses src/ paths, not dist/)
    const sourceFiles = files.filter(
        f =>
            (f.file.includes('src/') || f.file.includes('dist/')) &&
            !f.file.includes('.test.') &&
            !f.file.includes('run_tests') &&
            !f.file.includes('test_utils') &&
            f.lines.total > 0 // Only files with actual code
    );

    // Sort by coverage (lowest first)
    sourceFiles.sort((a, b) => a.lines.percentage - b.lines.percentage);

    console.log('📊 Coverage Report\n');
    console.log('Files needing more tests (sorted by coverage):\n');

    const lowCoverage = sourceFiles.filter(f => f.lines.percentage < 80);
    const noCoverage = sourceFiles.filter(f => f.lines.percentage === 0);

    if (noCoverage.length > 0) {
        console.log('❌ No Coverage (0%):');
        for (const file of noCoverage.slice(0, 20)) {
            // Limit to top 20
            const relPath = file.file.replace(/.*(src|dist)\//, '');
            console.log(`   ${relPath}`);
        }
        if (noCoverage.length > 20) {
            console.log(`   ... and ${noCoverage.length - 20} more`);
        }
        console.log('');
    }

    if (lowCoverage.length > 0) {
        console.log('⚠️  Low Coverage (<80%):');
        const lowCoverageList = lowCoverage.filter(f => f.lines.percentage > 0).slice(0, 20);
        for (const file of lowCoverageList) {
            const relPath = file.file.replace(/.*(src|dist)\//, '');
            console.log(`   ${relPath}: ${file.lines.percentage.toFixed(1)}%`);
        }
        if (lowCoverage.length > 20) {
            console.log(`   ... and ${lowCoverage.length - 20} more`);
        }
        console.log('');
    }

    // Summary
    const totalFiles = sourceFiles.length;
    const coveredFiles = sourceFiles.filter(f => f.lines.percentage > 0).length;
    const avgCoverage = sourceFiles.reduce((sum, f) => sum + f.lines.percentage, 0) / totalFiles;

    console.log('📈 Summary:');
    console.log(`   Total files: ${totalFiles}`);
    console.log(`   Files with tests: ${coveredFiles}`);
    console.log(`   Files without tests: ${noCoverage.length}`);
    console.log(`   Average coverage: ${avgCoverage.toFixed(1)}%`);
    console.log('');

    // Recommendations
    console.log('💡 Recommendations:');
    if (noCoverage.length > 0) {
        console.log(`   1. Add tests for ${noCoverage.length} file(s) with 0% coverage`);
    }
    if (lowCoverage.length > 0) {
        console.log(`   2. Improve coverage for ${lowCoverage.length} file(s) below 80%`);
    }
    console.log('   3. Use: assistant generate tests <tool_name> to generate test templates');
    console.log('   4. Run: npm run test:coverage:open to view detailed HTML report');
}

if (require.main === module) {
    generateReport();
}

export {};
