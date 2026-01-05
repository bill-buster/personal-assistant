import * as fs from 'node:fs';
import * as path from 'node:path';
import { handleMemorySearch } from '../tools/memory_tools';
import { handleListFiles } from '../tools/file_tools';
import { nowMs } from '../core/debug';

const ITERATIONS = 100;
const BENCH_DIR = path.join(__dirname, 'bench_data');

if (!fs.existsSync(BENCH_DIR)) {
    fs.mkdirSync(BENCH_DIR);
}

// Setup dummy memory
const memoryPath = path.join(BENCH_DIR, 'memory.json');
const memoryData = {
    version: 1,
    entries: [] as any[],
};
for (let i = 0; i < 1000; i++) {
    memoryData.entries.push({ ts: '2026-01-01', text: `memory entry ${i} about benchmarking` });
}
fs.writeFileSync(memoryPath, JSON.stringify(memoryData));

// Setup dummy files
for (let i = 0; i < 100; i++) {
    fs.writeFileSync(path.join(BENCH_DIR, `file_${i}.txt`), 'content');
}

const context = {
    baseDir: BENCH_DIR,
    memoryLogPath: memoryPath,
    start: nowMs(),
    debug: {} as any,
    // Mocked helpers to match executor.ts implementation
    readJsonl: <T>(filePath: string, isValid: (entry: any) => boolean): T[] => {
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const entries: T[] = [];
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (isValid(parsed)) entries.push(parsed as T);
            } catch {}
        }
        return entries;
    },

    scoreEntry: (entry: any, needle: string, _terms: string[]) => {
        const text = typeof entry.text === 'string' ? entry.text.toLowerCase() : '';
        let score = 0;
        if (needle) {
            let index = text.indexOf(needle);
            while (index !== -1) {
                score += 1;
                index = text.indexOf(needle, index + needle.length);
            }
        }
        return score;
    },

    sortByScoreAndRecency: (entries: any[], _needle: string) => {
        return entries; // Simplified sort for bench to avoid full re-impl
    },

    permissions: { allowlist: null } as any, // allow all
    paths: {
        resolve: (p: string) => path.resolve(BENCH_DIR, p),
        assertAllowed: () => {},
        resolveAllowed: (p: string) => path.resolve(BENCH_DIR, p),
    },
    commands: {
        runAllowed: () => ({ ok: true, result: '' }),
    },
    requiresConfirmation: () => false,
} as any;

async function benchAsync(name: string, fn: () => Promise<void>) {
    const start = nowMs();
    for (let i = 0; i < ITERATIONS; i++) {
        await fn();
    }
    const end = nowMs();
    const duration = end - start;
    console.log(
        `${name}: ${duration.toFixed(2)}ms total, ${(duration / ITERATIONS).toFixed(4)}ms/op`
    );
}

(async () => {
    console.log(`Running executor benchmarks (${ITERATIONS} iterations)...`);

    await benchAsync('Memory Search (1k entries, File I/O)', async () => {
        // handleMemorySearch(null, toolCall, permissions, context)
        // Check signature... memory_tools exports handle(intent, toolCall, context)?
        // Wait, handleMemorySearch signature in memory_tools.ts?
        // It is: export async function handleMemorySearch(intent: string, toolCall: ToolCall, context: ExecutorContext)
        await handleMemorySearch({ query: 'benchmarking' }, context);
    });

    await benchAsync('List Files (100 files)', async () => {
        // handleListFiles(args, context)
        await handleListFiles({}, context);
    });

    // Cleanup
    fs.rmSync(BENCH_DIR, { recursive: true, force: true });
})();
