import { route } from './app/router';
import { MockLLMProvider } from './providers/llm/mock_provider';
import { Agent } from './core/types';

// Mock Agent with limited tools
const RESTRICTED_AGENT: Agent = {
    name: 'RestrictedAgent',
    description: 'An agent that is only allowed to use read_file',
    systemPrompt: 'You are a restricted agent.',
    tools: ['read_file'], // strictly allows only read_file
};

async function runSecurityTest() {
    console.log('Running Router Security Verification...');

    // Setup Mock Provider to return a forbidden tool call
    const mockProvider = new MockLLMProvider();
    mockProvider.setResponses({
        'hack the system': {
            toolCall: {
                tool_name: 'write_file', // This tool is NOT in the allowed list
                args: { path: 'exploit.js', content: 'malware' },
            },
        },
        'read the docs': {
            toolCall: {
                tool_name: 'read_file', // This tool IS allowed
                args: { path: 'docs.txt' },
            },
        },
    });

    let failures = 0;

    // Test 1: Forbidden Tool
    console.log('Test 1: LLM returns forbidden tool (write_file)...');
    const result1 = await route(
        'hack the system',
        'spike',
        null,
        [],
        false,
        RESTRICTED_AGENT,
        mockProvider
    );

    if (
        'error' in result1 &&
        result1.error.includes("is not allowed for agent 'RestrictedAgent'")
    ) {
        console.log('✅ Passed: Forbidden tool was blocked.');
    } else {
        console.error('❌ Failed: Forbidden tool was NOT blocked or wrong error.');
        console.error('Result:', JSON.stringify(result1, null, 2));
        failures++;
    }

    // Test 2: Allowed Tool
    console.log('Test 2: LLM returns allowed tool (read_file)...');
    const result2 = await route(
        'read the docs',
        'spike',
        null,
        [],
        false,
        RESTRICTED_AGENT,
        mockProvider
    );

    if (
        'mode' in result2 &&
        result2.mode === 'tool_call' &&
        result2.tool_call?.tool_name === 'read_file'
    ) {
        console.log('✅ Passed: Allowed tool was accepted.');
    } else {
        console.error('❌ Failed: Allowed tool was not accepted correctly.');
        console.error('Result:', JSON.stringify(result2, null, 2));
        failures++;
    }

    if (failures > 0) {
        console.error(`\n${failures} Security Tests Failed.`);
        process.exit(1);
    } else {
        console.log('\nAll Security Tests Passed.');
    }
}

runSecurityTest().catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
});
