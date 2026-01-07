import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // Allow global `expect`, `describe`, `it`
        environment: 'node',
        include: ['src/core/cache.test.ts', 'src/**/*.test.ts'],
        exclude: ['dist/**', 'node_modules/**'],
        testTimeout: 10000,
        hookTimeout: 10000,
    },
});
