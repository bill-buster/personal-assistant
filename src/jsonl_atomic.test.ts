
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as assert from 'node:assert';
import { writeJsonlAtomic, appendJsonl } from './storage/jsonl';

const spikeDir = __dirname;
const tmpJsonl = path.join(spikeDir, 'tmp_test_atomic.jsonl');

console.log('Running JSONL Atomic Write Tests...');
let failures = 0;

const cleanup = () => {
    if (fs.existsSync(tmpJsonl)) fs.unlinkSync(tmpJsonl);
    // Cleanup any temp files left over
    const files = fs.readdirSync(spikeDir);
    for (const f of files) {
        if (f.startsWith('tmp_test_atomic.jsonl.tmp.')) {
            fs.unlinkSync(path.join(spikeDir, f));
        }
    }
};

try {
    // Test 1: Atomic Write
    cleanup();
    console.log('Test 1: Atomic Write...');
    const data = [{ id: 1 }, { id: 2 }];
    writeJsonlAtomic(tmpJsonl, data);
    
    const content = fs.readFileSync(tmpJsonl, 'utf8');
    const expected = '{"id":1}\n{"id":2}\n';
    assert.strictEqual(content, expected, 'File content should match expected JSONL');
    console.log('PASS');

    // Test 2: Append
    console.log('Test 2: Append...');
    appendJsonl(tmpJsonl, { id: 3 });
    const content2 = fs.readFileSync(tmpJsonl, 'utf8');
    const expected2 = '{"id":1}\n{"id":2}\n{"id":3}\n';
    assert.strictEqual(content2, expected2, 'File content should include appended item');
    console.log('PASS');

} catch (err: any) {
    console.error('FAIL:', err.message);
    failures++;
} finally {
    cleanup();
}

if (failures > 0) {
    process.exit(1);
}
console.log('All JSONL atomic tests passed.');
