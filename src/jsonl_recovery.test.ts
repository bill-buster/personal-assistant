import * as fs from 'node:fs';
import * as path from 'node:path';
import * as assert from 'node:assert';
import { readJsonlSafely } from './storage/jsonl';

const spikeDir = __dirname;
const tmpJsonl = path.join(spikeDir, 'tmp_test_recovery.jsonl');
const tmpCorrupt = path.join(spikeDir, 'tmp_test_recovery.jsonl.corrupt');

console.log('Running JSONL Recovery Tests...');
let failures = 0;

const cleanup = () => {
    if (fs.existsSync(tmpJsonl)) fs.unlinkSync(tmpJsonl);
    if (fs.existsSync(tmpCorrupt)) fs.unlinkSync(tmpCorrupt);
};

try {
    // Test 1: Valid and Corrupt Mixed
    cleanup();
    console.log('Test 1: Mixed valid and corrupt lines...');
    const content = [
        '{"id": 1, "text": "valid1"}',
        'CORRUPT_LINE_HERE',
        '{"id": 2, "text": "valid2"}',
        '{ BROKEN JSON }',
        '', // Empty line
        '{"id": 3, "text": "valid3"}',
    ].join('\n');
    fs.writeFileSync(tmpJsonl, content, 'utf8');

    const results = readJsonlSafely<{ id: number; text: string }>({
        filePath: tmpJsonl,
        isValid: (entry: unknown) => {
            const e = entry as { id?: unknown };
            return typeof e?.id === 'number';
        },
    });

    assert.strictEqual(results.length, 3, 'Should have 3 valid entries');
    assert.strictEqual(results[0].text, 'valid1');
    assert.strictEqual(results[1].text, 'valid2');
    assert.strictEqual(results[2].text, 'valid3');

    assert.strictEqual(fs.existsSync(tmpCorrupt), true, 'Corrupt file should exist');
    const corruptContent = fs.readFileSync(tmpCorrupt, 'utf8').trim().split('\n');
    assert.strictEqual(corruptContent.length, 2, 'Should have 2 corrupt lines');
    assert.strictEqual(corruptContent[0], 'CORRUPT_LINE_HERE');
    assert.strictEqual(corruptContent[1], '{ BROKEN JSON }');
    console.log('PASS');

    // Test 2: File Not Found
    cleanup();
    console.log('Test 2: File not found...');
    const results2 = readJsonlSafely({ filePath: 'non_existent_file.jsonl' });
    assert.deepStrictEqual(results2, [], 'Should return empty array for non-existent file');
    console.log('PASS');

    // Test 3: No Corruption
    cleanup();
    console.log('Test 3: No corruption...');
    const content3 = '{"id": 1}\n{"id": 2}';
    fs.writeFileSync(tmpJsonl, content3, 'utf8');
    readJsonlSafely({ filePath: tmpJsonl });
    assert.strictEqual(fs.existsSync(tmpCorrupt), false, 'Corrupt file should not exist');
    console.log('PASS');
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('FAIL:', message);
    failures++;
} finally {
    cleanup();
}

if (failures > 0) {
    process.exit(1);
}
console.log('All JSONL recovery tests passed.');
