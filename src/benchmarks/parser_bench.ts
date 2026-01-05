
import { parseTaskCommand } from '../parsers/task_parser';
import { parseHeuristicCommand } from '../parsers/heuristic_parser';
import { parseMemoryCommand } from '../parsers/memory_parser';
import { nowMs } from '../core/debug';

const ITERATIONS = 10000;

function bench(name: string, fn: () => void) {
    const start = nowMs();
    for (let i = 0; i < ITERATIONS; i++) {
        fn();
    }
    const end = nowMs();
    const duration = end - start;
    console.log(`${name}: ${duration.toFixed(2)}ms total, ${(duration / ITERATIONS).toFixed(4)}ms/op`);
}

const taskInput = 'task add create benchmark --due 2026-01-01';
const heuristicInput = 'write to ./test.txt: hello world';
const memoryInput = 'remember buy oat milk';

console.log(`Running benchmarks (${ITERATIONS} iterations)...`);

bench('Task Parser (Regex+Logic)', () => {
    parseTaskCommand(taskInput);
});

bench('Heuristic Parser (Complex Regex)', () => {
    parseHeuristicCommand(heuristicInput);
});

bench('Memory Parser (Prefix Check)', () => {
    parseMemoryCommand(memoryInput);
});
