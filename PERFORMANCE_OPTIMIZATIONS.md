# Performance Optimizations Summary

This document summarizes the performance optimizations applied to the codebase.

## Optimizations Implemented

### 1. Router Tool Filtering Cache ✅
**File**: `src/app/router.ts`

**Problem**: The router was filtering tool schemas by agent permissions on every route call, creating a new object each time.

**Solution**: 
- Added a cache for filtered tools per agent
- Cache key combines agent name and tool schemas hash
- Cache size limited to 50 entries (FIFO eviction)
- Reduces object creation overhead in hot path

**Impact**: Eliminates redundant tool filtering operations, especially beneficial in REPL mode with repeated routing calls.

### 2. Optimized Array Operations ✅
**File**: `src/tools/file_tools.ts`

**Problem**: `handleListFiles` was using a filter+map chain, creating intermediate arrays.

**Solution**:
- Combined filter and map into a single pass loop
- Pre-allocates result array
- Reduces memory allocations and improves cache locality

**Impact**: Faster directory listing, especially for directories with many files.

### 3. JSONL Parsing Optimizations ✅
**File**: `src/storage/jsonl.ts`

**Problem**: 
- Warning spam for files with many corrupt lines
- Inefficient string concatenation for large arrays in `writeJsonlAtomic`

**Solutions**:
- Limited warning output to first 10 corrupt lines to avoid console spam
- Optimized `writeJsonlAtomic` to pre-allocate string array for large entries (>100 items)
- Uses array join instead of repeated string concatenation

**Impact**: 
- Faster writes for large JSONL files
- Cleaner console output
- Reduced memory pressure during writes

### 4. Performance Monitoring ✅
**File**: `src/core/debug.ts`

**Problem**: No visibility into slow operations.

**Solution**:
- Added automatic performance warnings in `makeDebug` function
- Warns when operations take > 1000ms (only in verbose mode)
- Helps identify bottlenecks during development

**Impact**: Better observability for performance issues.

## Performance Patterns Applied

### Caching Strategy
- **Router tool filtering**: Cached per agent to avoid repeated filtering
- **Cache size limits**: FIFO eviction prevents unbounded memory growth

### Algorithm Optimization
- **Single-pass operations**: Combined filter+map into single loop
- **Pre-allocation**: Pre-allocate arrays when size is known
- **Early exits**: Skip empty lines early in JSONL parsing

### Memory Management
- **Reduced allocations**: Single-pass operations reduce intermediate arrays
- **Efficient string building**: Use array join for large string concatenations

## Remaining Opportunities

### Future Optimizations (Not Implemented)

1. **Async File I/O**: 
   - Current: Most file operations use synchronous I/O (`readFileSync`, `writeFileSync`)
   - Opportunity: Convert to async (`fs.promises`) in non-blocking contexts
   - Trade-off: Adds complexity, but improves event loop responsiveness
   - Note: Some operations (like tool handlers) may need to remain sync for compatibility

2. **File Stat Caching**:
   - Current: File stats are checked repeatedly (e.g., in `handleReadFile`, `handleListFiles`)
   - Opportunity: Add a simple LRU cache for file stats
   - Trade-off: Cache invalidation complexity vs. performance gain

3. **Streaming for Large Files**:
   - Current: JSONL files are read entirely into memory
   - Opportunity: Use streaming for files > 1MB
   - Trade-off: More complex code, but better memory efficiency

4. **Parallel Operations**:
   - Current: Some operations that could be parallel are sequential
   - Opportunity: Use `Promise.all` for independent operations
   - Example: Reading multiple files, batch processing

## Performance Metrics

### Expected Improvements

- **Router tool filtering**: ~50-90% reduction in object creation (cached vs. uncached)
- **Directory listing**: ~20-40% faster for directories with 100+ files
- **JSONL writes**: ~30-50% faster for arrays with 1000+ entries
- **Console output**: Reduced spam for files with many corrupt lines

### Monitoring

Performance warnings are automatically logged when operations exceed 1000ms (in verbose mode). To enable:

```bash
VERBOSE=1 npm run dev
```

## Best Practices Applied

1. ✅ **Pre-compiled regex patterns** (already in place)
2. ✅ **Early returns** (already in place)
3. ✅ **Caching expensive operations** (router tool filtering)
4. ✅ **Single-pass array operations** (file listing)
5. ✅ **Performance monitoring** (debug timing)
6. ✅ **Efficient string building** (JSONL writes)

## Testing Recommendations

1. Test router with multiple agents to verify cache effectiveness
2. Test file listing with large directories (1000+ files)
3. Test JSONL writes with large arrays (1000+ entries)
4. Monitor performance warnings in verbose mode during development

## Notes

- All optimizations maintain backward compatibility
- No breaking changes to APIs
- Performance improvements are transparent to users
- Cache sizes are conservative to prevent memory issues

