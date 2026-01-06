/**
 * Tests for configuration module
 */

import * as assert from 'node:assert';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { loadConfig, saveConfig, getStoragePaths, resolveConfig } from './core/config';

// Use temp dir for testing
const tmpDir = path.join(os.tmpdir(), 'prompt-router-config-test-' + Date.now());
process.env.ASSISTANT_CONFIG_DIR = path.join(tmpDir, '.prompt-router');

try {
    console.log('Running config tests...');

    // Setup
    fs.mkdirSync(process.env.ASSISTANT_CONFIG_DIR!, { recursive: true });

    // Test 1: Default provider is groq
    let config = loadConfig();
    assert.strictEqual(config.defaultProvider, 'groq');
    assert.deepStrictEqual(config.apiKeys, {});

    // Test 2: Env Vars Override
    process.env.GROQ_API_KEY = 'test-groq-key';
    config = loadConfig();
    assert.strictEqual(config.apiKeys.groq, 'test-groq-key');
    delete process.env.GROQ_API_KEY;

    // Test 3: Save and Load with OpenRouter
    saveConfig({
        defaultProvider: 'openrouter',
        apiKeys: { openrouter: 'test-openrouter-key' },
    });

    config = loadConfig();
    assert.strictEqual(config.defaultProvider, 'openrouter');
    assert.strictEqual(config.apiKeys.openrouter, 'test-openrouter-key');

    // Verify file persistence
    const fileContent = fs.readFileSync(
        path.join(process.env.ASSISTANT_CONFIG_DIR!, 'config.json'),
        'utf8'
    );
    assert.ok(fileContent.includes('test-openrouter-key'));

    // Cleanup previous tests
    delete process.env.ASSISTANT_CONFIG_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // Test 4: Relative Config Path Resolution
    console.log('Testing relative config path resolution...');
    const relativeConfigDir = '.assistant-test-relative-' + Date.now();
    process.env.ASSISTANT_CONFIG_DIR = relativeConfigDir;

    // We expect config path to be relative to homedir
    const expectedConfigPath = path.join(os.homedir(), relativeConfigDir);

    // The original test checked getStoragePaths().baseDir.
    // Now getStoragePaths() defaults to package dir, NOT config dir.

    const paths = getStoragePaths();
    // Verify it is NOT the config dir (decoupling check)
    assert.notStrictEqual(paths.baseDir, path.join(expectedConfigPath, 'data'));
    // Verify it IS absolute
    assert.ok(path.isAbsolute(paths.baseDir));

    delete process.env.ASSISTANT_CONFIG_DIR;

    // Test 5: Relative Data Dir Resolution
    console.log('Testing relative data dir resolution...');
    const relativeDataDir = 'data-test-relative-' + Date.now();
    process.env.ASSISTANT_DATA_DIR = relativeDataDir;

    const configWithData = loadConfig();
    // Verify storage.baseDir in the loaded config
    const expectedDataPath = path.join(os.homedir(), relativeDataDir);

    assert.ok(configWithData.storage);
    assert.strictEqual(configWithData.storage!.baseDir, expectedDataPath);

    delete process.env.ASSISTANT_DATA_DIR;

    // Test 6: maxRetries configuration
    console.log('Testing maxRetries configuration...');

    // 6a. Default value
    // Reset config dir to temp
    process.env.ASSISTANT_CONFIG_DIR = path.join(tmpDir, '.prompt-router-retries');
    fs.mkdirSync(process.env.ASSISTANT_CONFIG_DIR, { recursive: true });

    // Clear config file if exists
    const configFile = path.join(process.env.ASSISTANT_CONFIG_DIR, 'config.json');
    if (fs.existsSync(configFile)) fs.unlinkSync(configFile);

    const defaultConfig = loadConfig();
    const resolvedDefaultResult = resolveConfig(defaultConfig);
    assert.ok(resolvedDefaultResult.ok, 'Should resolve default config');
    assert.strictEqual(
        resolvedDefaultResult.config.maxRetries,
        3,
        'Default maxRetries should be 3'
    );

    // 6b. Valid value
    saveConfig({ maxRetries: 5 });
    const validConfig = loadConfig();
    const resolvedValidResult = resolveConfig(validConfig);
    assert.ok(resolvedValidResult.ok, 'Should resolve valid config');
    assert.strictEqual(resolvedValidResult.config.maxRetries, 5, 'Should accept valid maxRetries');

    // 6c. Invalid value (too high) - schema validation should fail
    // We can't use saveConfig here because it reads first, and we want to write raw invalid json
    // to test schema validation on load.
    // However, saveConfig doesn't validate on write, it just merges and writes.
    // So we can use saveConfig to write invalid value (types permitting? TS might complain if I pass invalid type but here it is number so 20 is number)
    // Actually saveConfig takes Partial<AppConfig>, and AppConfig defines maxRetries as number.
    // The schema validation happens on LOAD.

    // Write directly to file to avoid TS issues if I want to bypass type checking (though 20 is number)
    // But AppConfig type doesn't constrain range, only Zod schema does.
    fs.writeFileSync(configFile, JSON.stringify({ maxRetries: 20 }));

    // Redirect console.warn to suppress expected warning
    const originalWarn = console.warn;
    let warningCalled = false;
    console.warn = (...args) => {
        if (
            args[0] &&
            typeof args[0] === 'string' &&
            args[0].includes('Config validation failed')
        ) {
            warningCalled = true;
        }
    };

    const invalidConfig = loadConfig();
    console.warn = originalWarn;

    // Should have reverted to defaults because validation failed
    assert.ok(warningCalled, 'Should warn about validation failure');
    const resolvedInvalidResult = resolveConfig(invalidConfig);
    assert.ok(resolvedInvalidResult.ok, 'Should resolve invalid config (with defaults)');
    assert.strictEqual(
        resolvedInvalidResult.config.maxRetries,
        3,
        'Should fallback to default 3 when validation fails'
    );

    delete process.env.ASSISTANT_CONFIG_DIR;

    console.log('Config tests passed!');
} catch (err) {
    console.error('Config tests failed:', err);
    process.exit(1);
} finally {
    // Cleanup in case of failure
    if (process.env.ASSISTANT_CONFIG_DIR) {
        // If it was absolute temp dir
        if (
            path.isAbsolute(process.env.ASSISTANT_CONFIG_DIR) &&
            process.env.ASSISTANT_CONFIG_DIR.includes('tmp')
        ) {
            fs.rmSync(process.env.ASSISTANT_CONFIG_DIR, { recursive: true, force: true });
        }
    }
    // We don't want to delete random relative dirs in home if they weren't created.
    // The tests above don't actually create files in homedir, they just test resolution.
    // So no cleanup needed for Test 4 & 5 side effects on disk.
}
