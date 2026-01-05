# Test Coverage Improvement Plan

## Current Status

**Overall Coverage**: 50.8% average
- **Total files**: 68
- **Files with tests**: 48
- **Files without tests**: 20
- **Files below 80%**: 45

## Priority Files for Testing

### ❌ No Coverage (0%) - 20 files

**Scripts** (Priority: Medium):
- `scripts/batch_refactor.ts`
- `scripts/doctor.ts`
- `scripts/generate_tests.ts`
- `scripts/generate_tool.ts`
- `scripts/refactor.ts`
- `scripts/refactor_fix.ts`
- `scripts/test_coverage_report.ts`

**Tools** (Priority: High):
- `tools/TestTool_tools.ts` (test tool)
- `tools/e2e_test_tool2_tools.ts` (test tool)
- `tools/e2e_test_tool_tools.ts` (test tool)
- `tools/test_tool_gen_tools.ts` (test tool)
- `tools/test_tool_opt_tools.ts` (test tool)

**Providers** (Priority: Low - mostly unused):
- `providers/llm/embeddings.ts`
- `llm/index.ts`
- `llm/providers/MockChatModel.ts`

**Other**:
- `app/router_stream.ts`
- `core/test_utils.ts` (new, may not need tests)

### ⚠️ Low Coverage (<80%) - Top Priority

**Critical Tools** (Priority: High):
1. `tools/fetch_tools.ts` - **7.4%** ⚠️
2. `tools/git_tools.ts` - **14.9%** ⚠️
3. `tools/utility_tools.ts` - **25.3%** ⚠️
4. `tools/comms_tools.ts` - **53.9%**

**Core Components** (Priority: High):
1. `app/cli.ts` - **52.7%**
2. `app/repl.ts` - **35.6%**
3. `core/validation.ts` - **57.8%**
4. `core/cache.ts` - **37.5%**

**Providers** (Priority: Medium):
1. `providers/llm/openai_compatible.ts` - **9.5%**
2. `providers/llm/index.ts` - **31.6%**

## Improvement Strategy

### Phase 1: Critical Tools (Week 1)

**Goal**: Get all tools to 80%+ coverage

1. **fetch_tools.ts** (7.4% → 80%)
   - Test: fetch URL, handle errors, validate URLs
   - Use: `assistant generate tests fetch_tools`

2. **git_tools.ts** (14.9% → 80%)
   - Test: git status, git log, git diff
   - Use: `assistant generate tests git_tools`

3. **utility_tools.ts** (25.3% → 80%)
   - Test: calculate expressions, get_time, get_weather
   - Use: `assistant generate tests utility_tools`

4. **comms_tools.ts** (53.9% → 80%)
   - Test: send_message, read_messages
   - Use: `assistant generate tests comms_tools`

### Phase 2: Core Components (Week 2)

**Goal**: Get core components to 80%+ coverage

1. **app/cli.ts** (52.7% → 80%)
   - Test: All CLI commands
   - E2E tests already cover some, add unit tests

2. **app/repl.ts** (35.6% → 80%)
   - Test: REPL commands, command parsing
   - Integration tests

3. **core/validation.ts** (57.8% → 80%)
   - Test: All validation functions
   - Edge cases, error handling

4. **core/cache.ts** (37.5% → 80%)
   - Test: Cache operations, expiration, cleanup

### Phase 3: Scripts (Week 3)

**Goal**: Add tests for 100x features

1. **generate_tool.ts** - Test tool generation
2. **generate_tests.ts** - Test test generation
3. **refactor.ts** - Test refactoring detection
4. **refactor_fix.ts** - Test auto-fix
5. **batch_refactor.ts** - Test batch operations
6. **test_coverage_report.ts** - Test coverage analysis

**Note**: E2E tests already verify functionality, but unit tests needed for coverage

### Phase 4: Providers (Week 4)

**Goal**: Test LLM providers (if used)

1. **providers/llm/openai_compatible.ts** (9.5% → 80%)
2. **providers/llm/index.ts** (31.6% → 80%)

**Note**: Lower priority if not actively used

## Using Cursor to Improve Coverage

### 1. Generate Tests for Low-Coverage Files

**Workflow**:
```
1. Run: npm run test:coverage:report
2. Identify low-coverage file
3. Ask Cursor: "Generate comprehensive tests for [file]"
4. Review and customize generated tests
5. Run tests and verify coverage improved
```

### 2. Identify Missing Test Cases

**Workflow**:
```
1. Open low-coverage file
2. Ask Cursor: "What test cases are missing for this file?"
3. Cursor analyzes code and suggests:
   - Success cases
   - Error cases
   - Edge cases
   - Integration tests
```

### 3. Improve Existing Tests

**Workflow**:
```
1. Open test file
2. Ask Cursor: "How can I improve these tests?"
3. Cursor suggests:
   - Better assertions
   - Missing edge cases
   - Test organization
   - Mock improvements
```

### 4. Coverage-Driven Development

**Workflow**:
```
1. Write code
2. Run: npm run test:coverage:report
3. Ask Cursor: "What tests are needed for this code?"
4. Generate tests
5. Verify coverage improved
```

## Quick Commands

```bash
# Check coverage gaps
npm run test:coverage:report

# Generate tests for tool
assistant generate tests utility_tools

# Run specific test
npm run test:single utility_tools

# Check coverage after adding tests
npm run test:coverage:open
```

## Coverage Goals

### Short Term (1 month)
- **All tools**: 80%+ coverage
- **Core components**: 80%+ coverage
- **Scripts**: 70%+ coverage

### Medium Term (3 months)
- **Overall**: 75%+ average coverage
- **Critical files**: 90%+ coverage
- **All files**: 70%+ minimum

### Long Term (6 months)
- **Overall**: 85%+ average coverage
- **All files**: 80%+ minimum
- **Critical files**: 95%+ coverage

## Tracking Progress

### Weekly Checklist

- [ ] Run coverage report
- [ ] Identify top 5 low-coverage files
- [ ] Generate tests for 2-3 files
- [ ] Verify coverage improved
- [ ] Update this document

### Monthly Review

- [ ] Review overall coverage trend
- [ ] Identify blockers
- [ ] Adjust priorities
- [ ] Celebrate improvements! 🎉

## Resources

- **Test Utilities**: `src/core/test_utils.ts`
- **Testing Guide**: `docs/TESTING_STRATEGY.md`
- **Cursor Patterns**: `.cursor/rules/testing_improvements.mdc`
- **Test Generation**: `assistant generate tests <tool>`

## Next Steps

1. ✅ **Coverage report working** - Fixed parser
2. 📋 **Generate tests for fetch_tools** - Priority 1
3. 📋 **Generate tests for git_tools** - Priority 2
4. 📋 **Generate tests for utility_tools** - Priority 3
5. 📋 **Add script tests** - Priority 4

**Start Now**:
```bash
# See current gaps
npm run test:coverage:report

# Generate tests for top priority file
assistant generate tests fetch_tools

# Run tests
npm run test:single fetch_tools

# Check coverage improved
npm run test:coverage:open
```

