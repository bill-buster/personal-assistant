import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // Allow global `expect`, `describe`, `it`
        environment: 'node',
        include: ['src/core/cache.test.ts', 'src/**/*.test.ts'],
        exclude: [
            'dist/**',
            'node_modules/**',
            // Exclude legacy script-style tests that use process.exit
            // These tests work when run standalone but fail with vitest
            // TODO: Migrate these to vitest format
            'src/tools/e2e_test_tool_tools.test.ts',
            'src/tools/e2e_test_tool2_tools.test.ts',
            'src/tools/file_tools.test.ts',
            'src/tools/git_tools.test.ts',
            'src/tools/utility_tools.test.ts',
            'src/tools/fetch_tools.test.ts',
            'src/tools/grep_tools.test.ts',
            'src/scripts/generate_tests.test.ts',
            'src/scripts/generate_tool.test.ts',
            'src/scripts/refactor.test.ts',
            'src/app/cli_e2e.test.ts',
            'src/core/validation.test.ts',
            'src/parsers/heuristic_parser.test.ts',
            'src/evals/real_world_eval.test.ts',
            // Additional legacy tests without describe/it blocks
            'src/capability_api.test.ts',
            'src/config.test.ts',
            'src/edge_cases.test.ts',
            'src/intent_routing.test.ts',
            'src/jsonl_atomic.test.ts',
            'src/jsonl_recovery.test.ts',
            'src/memory_store.test.ts',
            'src/router_security.test.ts',
            'src/task_parser_alias.test.ts',
        ],
        testTimeout: 10000,
        hookTimeout: 10000,
    },
});
