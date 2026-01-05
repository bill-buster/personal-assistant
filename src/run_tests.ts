#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

const baseDir = __dirname;
// Detect dist mode: either via env var or if running as compiled JS
const isDist = process.env.TEST_DIST === '1' || __filename.endsWith('.js');
const tsNodeRegister = !isDist ? require.resolve('ts-node/register') : null;

function findTestFiles(dir: string): string[] {
    const files = fs.readdirSync(dir);
    const testFiles: string[] = [];
    const testExt = isDist ? '.test.js' : '.test.ts';
    const runnerName = isDist ? 'run_tests.js' : 'run_tests.ts';
    
    for (const file of files) {
        if (file.endsWith(testExt) && file !== runnerName) {
            testFiles.push(path.join(dir, file));
        }
    }
    return testFiles;
}

function runTest(filePath: string): boolean {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`Running ${relativePath}...`);

    // In dist mode, run with plain node (no loaders)
    // In TS mode, use ts-node/register
    // Limit child process memory to 256MB to stay within 8GB total RAM
    const memLimit = process.env.TEST_MAX_MEM || '256';
    const execArgs = isDist 
        ? [`--max-old-space-size=${memLimit}`, filePath]
        : [`--max-old-space-size=${memLimit}`, '-r', tsNodeRegister!, filePath];
    
    const result = spawnSync(process.execPath, execArgs, {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '1' }
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.status !== 0) {
        console.error(`❌ ${relativePath} failed with exit code ${result.status}`);
        return false;
    }

    console.log(`✅ ${relativePath} passed`);
    return true;
}

const allTestFiles = findTestFiles(baseDir);

if (allTestFiles.length === 0) {
    console.error('No test files found!');
    process.exit(1);
}

// Filter tests based on CLI args if provided
const args = process.argv.slice(2);
let testFiles: string[];

if (args.length > 0) {
    // Filter to only specified test files
    // In dist mode, map .ts extensions to .js
    const requestedTests = args.map(arg => {
        let mappedArg = arg;
        
        if (isDist) {
            // Map .ts extensions to .js in dist mode
            if (arg.endsWith('.test.ts')) {
                mappedArg = arg.replace(/\.test\.ts$/, '.test.js');
            } else if (arg.endsWith('.ts')) {
                mappedArg = arg.replace(/\.ts$/, '.js');
            } else {
                // No extension: assume test name, add .test.js
                mappedArg = `${arg}.test.js`;
            }
        } else {
            // TS mode: handle .test.ts, .ts, or bare name
            if (arg.endsWith('.test.ts')) {
                mappedArg = arg;
            } else if (arg.endsWith('.ts')) {
                mappedArg = arg;
            } else {
                // Assume it's a test name without extension
                mappedArg = `${arg}.test.ts`;
            }
        }
        
        return path.join(baseDir, mappedArg);
    });
    
    // Only include files that exist and are in the discovered test files
    testFiles = requestedTests.filter(file => {
        const exists = fs.existsSync(file);
        const isTestFile = allTestFiles.includes(file);
        return exists && isTestFile;
    });
    
    if (testFiles.length === 0) {
        console.error(`No matching test files found for: ${args.join(', ')}`);
        console.error(`Available test files: ${allTestFiles.map(f => path.basename(f)).join(', ')}`);
        process.exit(1);
    }
} else {
    // Run all discovered tests
    testFiles = allTestFiles;
}

console.log(`Running ${testFiles.length} test file(s).`);

let failed = 0;
for (const file of testFiles) {
    if (!runTest(file)) {
        failed++;
    }
}

if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
}

console.log('\nAll tests passed!');
process.exit(0);
