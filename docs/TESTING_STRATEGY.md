# Comprehensive Testing Strategy

## Overview

This document outlines the complete testing strategy for the Personal Assistant project, including how to properly test everything and improvements through Cursor.

## Current Testing Infrastructure

### Test Runner

- **Custom test runner**: `src/run_tests.ts`
- **Parallel execution**: 4 workers by default
- **Test caching**: Skips unchanged tests
- **Coverage**: c8 with HTML/LCOV reports

### Test Files

- **19 test files** covering core functionality
- **Colocated**: Tests next to source files (`*.test.ts`)
- **Categories**: Unit, integration, E2E, security

### Coverage Status

**Current Coverage**:

- Overall: ~70% (varies by module)
- Scripts: 0% (needs tests)
- Some tools: Low coverage (14-25%)

**Target Coverage**:

- Minimum: 80% for all metrics
- Critical files: 90%+

## Testing Everything

### 1. Unit Tests ✅

**What to Test**:

- Individual functions
- Parsers
- Validators
- Utilities

**Example**:

```typescript
// src/parsers/task_parser.test.ts
const result = parseTaskCommand('task add buy milk');
assert.equal(result?.tool?.name, 'task_add');
```

**Status**: ✅ Good coverage for parsers and core utilities

### 2. Integration Tests ✅

**What to Test**:

- Tool execution through Executor
- Router → Executor flow
- Storage operations

**Example**:

```typescript
// src/executor.test.ts
const result = await executor.execute('remember', { text: 'test' });
assert.ok(result.ok);
```

**Status**: ✅ Good coverage for executor and router

### 3. E2E Tests ✅ NEW

**What to Test**:

- Full CLI commands
- 100x features (generate, profile)
- Cache operations
- Plugin system

**Example**:

```typescript
// src/app/cli_e2e.test.ts
const result = runCli(['generate', 'tool', 'my_tool', '--args', 'text:string']);
assert.ok(result.json.ok);
```

**Status**: ✅ New E2E tests added

### 4. Script Tests ✅ NEW

**What to Test**:

- Code generation scripts
- Test generation scripts
- Refactoring scripts

**Example**:

```typescript
// src/scripts/generate_tool.test.ts
const result = runGenerateTool(['test_tool', '--args', 'name:string']);
assert.ok(fs.existsSync('src/tools/test_tool_tools.ts'));
```

**Status**: ✅ New script tests added

### 5. Security Tests ✅

**What to Test**:

- Path validation
- Command allowlist
- Permission enforcement

**Example**:

```typescript
// src/permissions.test.ts
const result = executor.execute('run_cmd', { cmd: 'rm', args: ['-rf', '/'] });
assertError(result, 'DENIED_COMMAND_ALLOWLIST');
```

**Status**: ✅ Good coverage

## Test Utilities ✅ NEW

Created `src/core/test_utils.ts` with helpers:

```typescript
import {
    createMockContext, // Create test context
    runCli, // Run CLI commands
    assertSuccess, // Assert success
    assertError, // Assert error code
    createTestDir, // Create temp dir
    cleanupTestDir, // Cleanup
} from '../core/test_utils';
```

**Benefits**:

- Consistent test setup
- Easier test writing
- Less boilerplate

## Coverage Analysis ✅ NEW

New script: `src/scripts/test_coverage_report.ts`

**Usage**:

```bash
npm run test:coverage:report
```

**Output**:

- Lists files with 0% coverage
- Lists files below 80% coverage
- Provides recommendations
- Shows summary statistics

## Cursor-Specific Testing Improvements

### 1. Test Generation from Code

**How Cursor Helps**:

- Select function → Ask: "Generate tests for this"
- Cursor suggests test cases
- Cursor generates test structure

**Example**:

```
User: "Generate tests for handleRemember function"
Cursor: Generates test file with success/error cases
```

### 2. Test Suggestions

**How Cursor Helps**:

- Analyzes code coverage
- Suggests missing test cases
- Identifies edge cases
- Suggests integration tests

### 3. Test-Driven Development

**Workflow**:

1. Write test first (Cursor helps structure)
2. Implement feature (Cursor suggests code)
3. Run tests (Cursor shows results)
4. Refactor (Cursor suggests improvements)

### 4. Test Review

**How Cursor Helps**:

- Reviews test quality
- Suggests improvements
- Identifies flaky tests
- Suggests better assertions

## Testing Commands

### Run All Tests

```bash
npm test                    # Full suite (parallel + caching)
npm run test:parallel       # Explicit parallel
npm run test:sequential     # Sequential execution
```

### Run Specific Tests

```bash
npm run test:single executor
npm run test:single cli_e2e
npm run test:single generate_tool
```

### Coverage

```bash
npm run test:coverage              # Generate coverage
npm run test:coverage:open         # Open HTML report
npm run test:coverage:report       # Analyze gaps
```

### E2E Tests

```bash
npm run test:e2e                  # Run E2E tests
```

### Watch Mode

```bash
npm run test:watch                # Auto-rerun on changes
```

## Test Checklist

### Before Committing

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets minimum (80%)
- [ ] New features have tests
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No flaky tests

### For New Features

- [ ] Unit tests for functions
- [ ] Integration tests for flows
- [ ] E2E tests for CLI commands
- [ ] Error case tests
- [ ] Edge case tests

### For Bug Fixes

- [ ] Test for bug (fails before fix)
- [ ] Test passes after fix
- [ ] Regression tests added

## Coverage Goals by Module

| Module         | Current | Target | Priority |
| -------------- | ------- | ------ | -------- |
| `src/core/`    | ~85%    | 90%    | High     |
| `src/tools/`   | ~62%    | 80%    | High     |
| `src/app/`     | ~75%    | 85%    | Medium   |
| `src/scripts/` | 0%      | 70%    | Medium   |
| `src/parsers/` | ~80%    | 85%    | Medium   |
| `src/storage/` | ~84%    | 85%    | Low      |

## Testing Improvements Roadmap

### ✅ Completed

1. **Test Utilities** - Created `test_utils.ts`
2. **E2E Tests** - Added `cli_e2e.test.ts`
3. **Script Tests** - Added tests for generate scripts
4. **Coverage Analysis** - Added coverage report script
5. **Cursor Rules** - Added `testing_improvements.mdc`

### 🔮 Future Enhancements

1. **Snapshot Testing**
    - Test output snapshots
    - Schema validation snapshots

2. **Property-Based Testing**
    - Generate test inputs
    - Fuzz testing

3. **Mutation Testing**
    - Test quality validation
    - Identify weak tests

4. **Visual Test Results**
    - HTML test dashboard
    - Test timeline visualization

5. **Test Performance Monitoring**
    - Track test execution time
    - Identify slow tests

6. **CI/CD Integration**
    - Automated test runs
    - Coverage reporting
    - Test result notifications

## Best Practices

### ✅ Do This

- Use test utilities for consistency
- Test success and error cases
- Test edge cases
- Clean up test data
- Use descriptive test names
- Group related tests
- Mock external dependencies

### ❌ Don't Do This

- Don't rely on repo files for test data
- Don't skip cleanup
- Don't use real API keys
- Don't test implementation details
- Don't write flaky tests
- Don't ignore coverage gaps

## Quick Reference

```bash
# Full test suite
npm test

# Specific test
npm run test:single executor

# Coverage
npm run test:coverage:report

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Generate tests for tool
assistant generate tests my_tool
```

## Integration with Cursor

### Using Cursor for Testing

1. **Generate Tests**: Select code → Ask Cursor to generate tests
2. **Improve Tests**: Ask Cursor to suggest improvements
3. **Find Gaps**: Ask Cursor to identify missing test cases
4. **Debug Tests**: Use Cursor to understand test failures

### Cursor Rules

- `.cursor/rules/testing.mdc` - Testing patterns
- `.cursor/rules/testing_improvements.mdc` - Cursor-specific patterns

## Conclusion

The testing infrastructure is comprehensive with:

- ✅ Unit, integration, E2E, and script tests
- ✅ Test utilities for easier writing
- ✅ Coverage analysis and reporting
- ✅ Cursor-specific improvements
- ✅ Parallel execution and caching

**Next Steps**:

1. Run `npm run test:coverage:report` to see gaps
2. Add tests for files with 0% coverage
3. Improve coverage for low-coverage files
4. Use Cursor to generate and improve tests
