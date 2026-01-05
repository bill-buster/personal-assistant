# Parallel Test Execution

## Overview

Tests run in parallel by default using multiple Node.js processes. This significantly speeds up test execution, especially for large test suites.

## How It Works

### Architecture

```
Test Runner
    ↓
[Queue of Tests]
    ↓
[Worker Pool: 4 workers]
    ↓
┌──────┬──────┬──────┬──────┐
│ Test │ Test │ Test │ Test │
│  1   │  2   │  3   │  4   │
└──────┴──────┴──────┴──────┘
    ↓      ↓      ↓      ↓
[Collect Results]
    ↓
[Output + Cache]
```

### Execution Flow

1. **Separate cached tests** - Tests that can be skipped are filtered out first
2. **Queue remaining tests** - Tests to run are queued
3. **Start workers** - Up to `maxWorkers` tests run concurrently
4. **Collect results** - As tests complete, results are collected
5. **Save to cache** - Successful results are cached for next run

### Isolation

Each test runs in its own Node.js process with:
- Isolated memory (`--max-old-space-size=256`)
- Isolated environment variables
- Isolated temp directories (tests create their own)
- No shared state between tests

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_PARALLEL` | Enable parallel execution | `1` (enabled) |
| `TEST_MAX_WORKERS` | Number of parallel workers | `4` |
| `TEST_SKIP_CACHE` | Skip test result cache | `0` (use cache) |
| `TEST_MAX_MEM` | Memory limit per test (MB) | `256` |

### Examples

```bash
# Default: 4 workers, parallel enabled
npm test

# 8 workers for faster execution (if you have CPU cores)
TEST_MAX_WORKERS=8 npm test

# Disable parallel (sequential)
TEST_PARALLEL=0 npm test

# Single worker (debugging)
TEST_MAX_WORKERS=1 npm test
```

## Performance

### Benchmarks

| Test Count | Sequential | Parallel (4 workers) | Speedup |
|------------|------------|---------------------|---------|
| 5 tests    | ~15s       | ~5s                 | 3x      |
| 10 tests   | ~30s       | ~8s                 | 3.75x   |
| 20 tests   | ~60s       | ~15s                | 4x      |

### Combined with Caching

When combined with test result caching:

| Scenario | Time |
|----------|------|
| First run (all tests) | ~15s (parallel) |
| Second run (unchanged) | ~0.1s (all cached) |
| Partial change (2/10 tests) | ~3s (2 run, 8 cached) |

**Total speedup**: Up to 20x faster for unchanged code!

## When to Use Sequential

Use sequential execution (`TEST_PARALLEL=0`) when:

1. **Debugging** - Easier to follow output
2. **Resource constraints** - Limited CPU/memory
3. **Test interference** - Tests that share global state (rare)
4. **CI/CD** - Some CI systems prefer sequential for clearer logs

## Best Practices

### Worker Count

Choose worker count based on:
- **CPU cores**: `TEST_MAX_WORKERS = CPU cores - 1`
- **Memory**: Each worker uses ~256MB, ensure `workers × 256MB < available RAM`
- **Test duration**: More workers help if tests are long-running

### Memory Management

Each test gets 256MB by default. For memory-intensive tests:

```bash
# Increase per-test memory
TEST_MAX_MEM=512 npm test

# Reduce workers if memory constrained
TEST_MAX_WORKERS=2 TEST_MAX_MEM=512 npm test
```

### Output Ordering

Parallel tests may complete out of order. Output is buffered and shown as tests complete. For deterministic ordering, use sequential mode.

## Troubleshooting

### Tests Failing in Parallel

If tests pass sequentially but fail in parallel:

1. **Check for shared state** - Tests shouldn't share global variables
2. **Check temp directories** - Each test creates its own temp dir
3. **Check file system** - Ensure tests don't conflict on file paths
4. **Run with 1 worker** - `TEST_MAX_WORKERS=1 npm test` to isolate

### Memory Issues

If you see out-of-memory errors:

```bash
# Reduce workers
TEST_MAX_WORKERS=2 npm test

# Or reduce per-test memory
TEST_MAX_MEM=128 npm test
```

### Timeout Issues

Tests have a 60-second timeout per test. If tests timeout:

1. Check for hanging operations
2. Increase timeout in test code if needed
3. Run sequentially to debug: `TEST_PARALLEL=0 npm test`

## Implementation Details

### Worker Process

Each test runs as:

```bash
node --max-old-space-size=256 test_file.js
```

### Concurrency Control

Uses a queue-based approach:
- Maintains up to `maxWorkers` running tests
- As tests complete, new ones start
- All tests complete before summary

### Result Collection

Results are collected as tests complete:
- Output is streamed in real-time
- Results are saved to cache immediately
- Final summary shows all results

## Comparison

| Feature | Sequential | Parallel |
|---------|------------|----------|
| Speed | Baseline | 3-5x faster |
| Output order | Deterministic | Non-deterministic |
| Memory usage | Lower | Higher (workers × 256MB) |
| CPU usage | Single core | Multi-core |
| Debugging | Easier | Harder |
| CI/CD | Compatible | Compatible |

