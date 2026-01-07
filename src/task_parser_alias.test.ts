import * as assert from 'node:assert';
import { parseTaskCommand } from './parsers/task_parser';

console.log('Running Task Parser Alias Tests...');
let failures = 0;

try {
    // Test 1: Explicit "todo add"
    console.log('Test 1: todo add <text>...');
    const res1 = parseTaskCommand('todo add buy milk');
    assert.deepStrictEqual(res1?.tool?.name, 'task_add');
    assert.deepStrictEqual(res1?.tool?.args?.text, 'buy milk');
    console.log('PASS');

    // Test 2: Implicit "todo <text>"
    console.log('Test 2: todo <text> (implicit add)...');
    const res2 = parseTaskCommand('todo buy eggs');
    assert.deepStrictEqual(res2?.tool?.name, 'task_add');
    assert.deepStrictEqual(res2?.tool?.args?.text, 'buy eggs');
    console.log('PASS');

    // Test 3: todo list
    console.log('Test 3: todo list...');
    const res3 = parseTaskCommand('todo list');
    assert.deepStrictEqual(res3?.tool?.name, 'task_list');
    assert.deepStrictEqual(res3?.tool?.args?.status, 'all');
    console.log('PASS');

    // Test 4: todo done <id>
    console.log('Test 4: todo done <id>...');
    const res4 = parseTaskCommand('todo done 5');
    assert.deepStrictEqual(res4?.tool?.name, 'task_done');
    assert.deepStrictEqual(res4?.tool?.args?.id, 5);
    console.log('PASS');

    // Test 5: Original "task add" still works
    console.log('Test 5: task add <text> (regression check)...');
    const res5 = parseTaskCommand('task add clean room');
    assert.deepStrictEqual(res5?.tool?.name, 'task_add');
    assert.deepStrictEqual(res5?.tool?.args?.text, 'clean room');
    console.log('PASS');
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('FAIL:', message);
    failures++;
}

if (failures > 0) {
    process.exit(1);
}
console.log('All Task Parser alias tests passed.');
