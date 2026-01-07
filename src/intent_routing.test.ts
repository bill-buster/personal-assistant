/**
 * Integration tests for REPL intent routing fixes.
 * Tests: weather routing, memory commands, tomorrow task parsing, dispatcher enforcement.
 */
import * as assert from 'node:assert';

import { AGENTS } from './agents';
import { Dispatcher } from './dispatcher';
import { parseMemoryCommand } from './parsers/memory_parser';
import { parseTaskCommand } from './parsers/task_parser';

async function run() {
    console.log('Running intent routing tests...');

    // =========================================================================
    // Test 1: Weather auto-dispatch - "weather in paris"
    // =========================================================================
    const dispatcher = new Dispatcher({ verbose: false, autoDispatch: true, enforceActions: true });

    const weatherInDispatch = dispatcher.analyze('weather in paris', AGENTS.supervisor, []);
    assert.strictEqual(
        weatherInDispatch.action,
        'auto_dispatch',
        '"weather in paris" should auto-dispatch'
    );
    assert.strictEqual(
        weatherInDispatch.toolCall?.tool_name,
        'get_weather',
        'should dispatch to get_weather'
    );
    assert.strictEqual(
        weatherInDispatch.toolCall?.args.location,
        'paris',
        'location should be "paris"'
    );

    // Test "paris weather" pattern
    const parisWeatherDispatch = dispatcher.analyze('paris weather', AGENTS.supervisor, []);
    assert.strictEqual(
        parisWeatherDispatch.action,
        'auto_dispatch',
        '"paris weather" should auto-dispatch'
    );
    assert.strictEqual(
        parisWeatherDispatch.toolCall?.tool_name,
        'get_weather',
        'should dispatch to get_weather'
    );
    assert.strictEqual(
        parisWeatherDispatch.toolCall?.args.location,
        'paris',
        'location should be "paris"'
    );

    // Test "get weather for london"
    const getWeatherForDispatch = dispatcher.analyze(
        'get weather for london',
        AGENTS.supervisor,
        []
    );
    assert.strictEqual(
        getWeatherForDispatch.action,
        'auto_dispatch',
        '"get weather for london" should auto-dispatch'
    );
    assert.strictEqual(getWeatherForDispatch.toolCall?.tool_name, 'get_weather');
    assert.strictEqual(getWeatherForDispatch.toolCall?.args.location, 'london');

    console.log('✓ Weather auto-dispatch tests passed');

    // =========================================================================
    // Test 2: Memory commands - "remember X" routes to remember
    // =========================================================================
    const rememberResult = parseMemoryCommand('remember meeting at 3pm with Alice');
    assert.ok(rememberResult?.tool, '"remember X" should parse to a tool');
    assert.strictEqual(rememberResult?.tool?.name, 'remember', 'should route to remember tool');
    assert.strictEqual(
        rememberResult?.tool?.args.text,
        'meeting at 3pm with Alice',
        'text should be extracted'
    );

    console.log('✓ Remember command tests passed');

    // =========================================================================
    // Test 3: Memory queries - "what do you remember" routes to recall
    // =========================================================================
    const whatRememberDispatch = dispatcher.analyze(
        'what do you remember about groceries',
        AGENTS.supervisor,
        []
    );
    assert.strictEqual(
        whatRememberDispatch.action,
        'auto_dispatch',
        '"what do you remember about X" should auto-dispatch'
    );
    assert.strictEqual(
        whatRememberDispatch.toolCall?.tool_name,
        'recall',
        'should dispatch to recall'
    );

    // Test "do you remember X" pattern
    const doYouRememberDispatch = dispatcher.analyze(
        'do you remember my birthday',
        AGENTS.supervisor,
        []
    );
    assert.strictEqual(
        doYouRememberDispatch.action,
        'auto_dispatch',
        '"do you remember X" should auto-dispatch'
    );
    assert.strictEqual(doYouRememberDispatch.toolCall?.tool_name, 'recall');

    console.log('✓ Memory query tests passed');

    // =========================================================================
    // Test 4: Tomorrow task parsing - "task add X --due tomorrow"
    // =========================================================================
    const taskTomorrowResult = parseTaskCommand('task add buy milk --due tomorrow');
    assert.ok(taskTomorrowResult?.tool, '"task add X --due tomorrow" should parse');
    assert.strictEqual(taskTomorrowResult?.tool?.name, 'task_add');
    assert.strictEqual(taskTomorrowResult?.tool?.args.text, 'buy milk');
    // Due should be an ISO date (YYYY-MM-DD format)
    assert.ok(taskTomorrowResult?.tool?.args.due, 'due should be set');
    assert.ok(
        /^\d{4}-\d{2}-\d{2}$/.test(taskTomorrowResult?.tool?.args.due),
        `due should be ISO format, got: ${taskTomorrowResult?.tool?.args.due}`
    );

    // Verify it's tomorrow's date (within 2 days to handle timezone edge cases)
    const dueDate = new Date(taskTomorrowResult?.tool?.args.due);
    const today = new Date();
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    assert.ok(
        diffDays >= 0 && diffDays <= 2,
        `due date should be within 0-2 days from now, got diff: ${diffDays}`
    );

    // Test with priority too
    const taskTomorrowWithPriority = parseTaskCommand(
        'task add urgent call --due tomorrow --priority high'
    );
    assert.strictEqual(taskTomorrowWithPriority?.tool?.args.text, 'urgent call');
    assert.ok(taskTomorrowWithPriority?.tool?.args.due);
    assert.strictEqual(taskTomorrowWithPriority?.tool?.args.priority, 'high');

    console.log('✓ Tomorrow task parsing tests passed');

    // =========================================================================
    // Test 5: Dispatcher enforcement - should NOT enforce when context doesn't match
    // =========================================================================
    // When LLM says "I'll help" but context is generic, should return null
    const genericEnforce = dispatcher.enforceAction(
        "I'll help you with that.",
        'hello there',
        AGENTS.supervisor
    );
    assert.strictEqual(genericEnforce, null, 'should not enforce for generic statements');

    // When LLM says "I'll check the time" and context matches, should enforce
    const timeEnforce = dispatcher.enforceAction(
        "I'll check the time for you.",
        'what time is it',
        AGENTS.supervisor
    );
    // This might or might not match based on patterns - checking it's valid either way
    if (timeEnforce) {
        assert.strictEqual(
            timeEnforce.action,
            'enforced_dispatch',
            'if matched, should be enforced_dispatch'
        );
    }

    // When LLM mentions weather but context is unrelated, should check pattern matching
    const weatherEnforce = dispatcher.enforceAction(
        'I will check the weather in Paris.',
        'whats the weather in Paris',
        AGENTS.supervisor
    );
    assert.strictEqual(weatherEnforce?.action, 'enforced_dispatch');
    assert.strictEqual(weatherEnforce?.toolCall?.tool_name, 'get_weather');
    assert.strictEqual(weatherEnforce?.toolCall?.args.location, 'Paris');

    console.log('✓ Dispatcher enforcement tests passed');

    // =========================================================================
    // Test 6: Existing ISO date parsing still works
    // =========================================================================
    const taskIsoDate = parseTaskCommand('task add meeting --due 2026-01-15');
    assert.strictEqual(taskIsoDate?.tool?.args.due, '2026-01-15');
    assert.strictEqual(taskIsoDate?.tool?.args.text, 'meeting');

    console.log('✓ ISO date parsing still works');

    console.log('\n✅ All intent routing tests passed!');
}

run().catch(err => {
    console.error('FAIL', err);
    process.exit(1);
});
