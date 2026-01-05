#!/usr/bin/env node
/**
 * Doctor: Diagnose configuration and environment
 *
 * Prints configuration, data directories, provider status, and permissions.
 * Useful for debugging and onboarding.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import { loadConfig, resolveConfig, getStoragePaths, loadPermissions } from '../core/config';

console.log('🩺 Personal Assistant Doctor\n');
console.log('═'.repeat(50));

// 1. Environment
console.log('\n📍 Environment\n');
console.log(`  Node.js:     ${process.version}`);
console.log(`  Platform:    ${process.platform} ${process.arch}`);
console.log(`  Home:        ${os.homedir()}`);
console.log(`  CWD:         ${process.cwd()}`);

// 2. Configuration
console.log('\n⚙️  Configuration\n');

const rawConfig = loadConfig();
const config = resolveConfig(rawConfig);

console.log(`  Config dir:  ${process.env.ASSISTANT_CONFIG_DIR || '~/.assistant/'}`);
console.log(`  Provider:    ${config.defaultProvider}`);
console.log(`  Model:       ${config.models[config.defaultProvider] || '(default)'}`);

// 3. API Keys
console.log('\n🔑 API Keys\n');
const hasGroq = !!config.apiKeys.groq;
const hasOpenRouter = !!config.apiKeys.openrouter;
console.log(`  Groq:        ${hasGroq ? '✓ configured' : '✗ not set (GROQ_API_KEY)'}`);
console.log(`  OpenRouter:  ${hasOpenRouter ? '✓ configured' : '✗ not set (OPENROUTER_API_KEY)'}`);

if (!hasGroq && !hasOpenRouter) {
    console.log('\n  ⚠️  No API keys configured. Use --mock for testing or set env vars.');
}

// 4. Data Directory
console.log('\n📁 Data Directory\n');
const storagePaths = getStoragePaths(rawConfig);
console.log(`  Base dir:    ${storagePaths.baseDir}`);
console.log(`  Memory:      ${storagePaths.memory}`);
console.log(`  Tasks:       ${storagePaths.tasks}`);
console.log(`  Reminders:   ${storagePaths.reminders}`);

const dataDirExists = fs.existsSync(storagePaths.baseDir);
console.log(`  Status:      ${dataDirExists ? '✓ exists' : '○ will be created on first use'}`);

if (process.env.ASSISTANT_DATA_DIR) {
    console.log(`  Override:    ASSISTANT_DATA_DIR=${process.env.ASSISTANT_DATA_DIR}`);
}

// 5. Permissions
console.log('\n🔒 Permissions\n');
const permissions = loadPermissions(config.fileBaseDir);
console.log(
    `  Allow paths:    ${permissions.allow_paths.length > 0 ? permissions.allow_paths.join(', ') : '(none - deny all)'}`
);
console.log(
    `  Allow commands: ${permissions.allow_commands.length > 0 ? permissions.allow_commands.join(', ') : '(none - deny all)'}`
);
console.log(
    `  Deny tools:     ${permissions.deny_tools.length > 0 ? permissions.deny_tools.join(', ') : '(none)'}`
);

// 6. File Limits
console.log('\n📏 Limits\n');
console.log(`  Max read:    ${(config.limits.maxReadSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Max write:   ${(config.limits.maxWriteSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`  History:     ${config.historyLimit} messages`);
console.log(`  Max retries: ${config.maxRetries}`);

// 7. Summary
console.log('\n' + '═'.repeat(50));

const issues: string[] = [];
if (!hasGroq && !hasOpenRouter) issues.push('No API keys configured');
if (permissions.allow_paths.length === 0) issues.push('All paths denied (no permissions.json)');

if (issues.length === 0) {
    console.log('✅ All systems operational\n');
} else {
    console.log(`⚠️  ${issues.length} issue(s) found:\n`);
    issues.forEach(issue => console.log(`   • ${issue}`));
    console.log('');
}
