# Caching System

The Personal Assistant includes two caching systems to speed up development:

## LLM Response Caching

### Overview

Automatically caches LLM API responses during development to avoid redundant calls. Disabled in production.

### How It Works

- **Cache Key**: Hash of (prompt + tools + recent history + system prompt + tool format)
- **Location**: `~/.assistant/.cache/`
- **TTL**: 24 hours (configurable)
- **Enabled**: Automatically in dev mode (`NODE_ENV !== 'production'`)

### Usage

```bash
# Cache is automatic - no configuration needed
npm run dev:watch

# Clear cache manually
assistant cache clear

# View cache statistics
assistant cache stats
```

### Cache Key Details

The cache key includes:

- Full prompt text
- Tool schemas (sorted keys for consistency)
- Last 3 messages from history (for conversation context)
- System prompt
- Tool format option ('standard' vs 'compact')

This ensures identical requests get cached responses, while different contexts get fresh calls.

### Disabling Cache

```bash
# Disable for single run
NODE_ENV=production npm run dev

# Or disable in code
createProvider(config, { enableCache: false })
```

## Test Result Caching

### Overview

Caches test results and skips tests that haven't changed since last successful run.

### How It Works

- **Detection**: Hashes test file + source file + common dependencies
- **Location**: `.test-results/`
- **TTL**: 1 hour (tests older than 1 hour re-run)
- **Smart**: Only skips if test passed and files unchanged

### Usage

```bash
# First run - all tests execute
npm test

# Second run - unchanged tests skip
npm test
# Output: ⏭️  executor.test.ts - skipped (cached pass)

# Parallel execution (default: 4 workers)
npm test
# Or explicitly:
TEST_PARALLEL=1 npm test

# Sequential execution (disable parallel)
TEST_PARALLEL=0 npm test

# Custom worker count
TEST_MAX_WORKERS=8 npm test

# Force run all tests (skip cache)
TEST_SKIP_CACHE=1 npm test

# Clear test cache
assistant cache test-clear
```

### Cache Files

```
.test-results/
├── results.jsonl      # All test run results
├── latest.json        # Summary of last full run
└── checksums.json     # File hashes for change detection
```

### What Gets Cached

- Test file hash
- Source file hash (e.g., `executor.test.ts` → `executor.ts`)
- Common dependencies (`core/types.ts`, `core/executor.ts`, etc.)

If any of these change, the test re-runs.

## Cache Management

### CLI Commands

```bash
# LLM cache
assistant cache clear        # Clear all LLM cache entries
assistant cache stats        # Show cache size and entry count

# Test cache
assistant cache test-clear   # Clear test result cache
```

### Programmatic Access

```typescript
import { FileCache, TestCache } from './core';

// LLM cache
const cache = new FileCache();
cache.clear();
const stats = cache.stats();

// Test cache
const testCache = new TestCache();
testCache.clear();
const summary = testCache.getSummary();
```

## Performance Impact

### LLM Caching

- **First call**: Normal API latency (~500ms-2s)
- **Cached call**: File read (~1-5ms)
- **Speedup**: 100-2000x faster
- **Cost savings**: Zero API calls for repeated prompts

### Test Caching

- **First run**: Full test suite (~10-30s)
- **Cached run**: Only changed tests (~1-5s)
- **Speedup**: 5-10x faster for small changes
- **Developer time**: Near-instant feedback

### Parallel Test Execution

- **Default**: 4 workers run tests concurrently
- **Speedup**: 3-5x faster for full test suite
- **Combined with caching**: Up to 20x faster for unchanged code
- **Configurable**: `TEST_MAX_WORKERS` env var (default: 4)

## Best Practices

1. **Don't commit cache directories** - Already in `.gitignore`
2. **Clear cache when debugging** - If behavior seems stale
3. **Use cache stats** - Monitor cache size
4. **Test cache is safe** - Always re-runs on file changes

## Troubleshooting

### Cache Not Working

```bash
# Check if cache is enabled
assistant cache stats

# Clear and retry
assistant cache clear
```

### Tests Always Running

```bash
# Check cache directory exists
ls -la .test-results/

# Verify file hashing works
# (Tests should skip if files unchanged)
```

### Stale Responses

```bash
# Clear cache if LLM responses seem outdated
assistant cache clear
```
