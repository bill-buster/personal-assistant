**Status**: Reference-only  
**Canonical**: [docs/TESTING.md](TESTING.md) for complete testing guide

---

# Testing Guide - New Features & Commands

*This document covers testing specific features. For the complete testing guide, see [TESTING.md](TESTING.md).*

This guide covers how to test the new features we added, especially the security improvements and explain mode.

## Quick Test Commands

### 1. **Explain Mode** (New Feature)

Test the new `explain` command that shows routing decisions:

```bash
# Test explain mode with a simple command
./dist/app/cli.js explain "remember: test memory"

# Test explain mode with a file operation
./dist/app/cli.js explain "write notes/test.md: hello world"

# Test explain mode with a safe tool (no agent required)
./dist/app/cli.js explain "calculate 2+2"

# Test explain mode with a tool that requires agent
./dist/app/cli.js explain "write_file notes/test.md: content"
```

**Expected Output:**
- Shows routing stage (regex_fast_path, heuristic_parse, llm_fallback)
- Shows tool call that would be made
- Shows validation status
- Shows permission checks (agent access)

### 2. **Router/Executor Alignment** (Security Fix)

Test that router and executor are aligned when no agent is provided:

```bash
# These should work (SAFE_TOOLS)
./dist/app/cli.js calculate "2+2"
./dist/app/cli.js --help | grep "get_time"  # Check if available

# These should fail gracefully (not in SAFE_TOOLS, no agent)
./dist/app/cli.js remember "test"  # Should fail with permission error
./dist/app/cli.js write notes/test.md "content"  # Should fail
```

**Expected Behavior:**
- Safe tools work without agent
- Non-safe tools fail with clear error: "Permission denied: tool 'X' requires agent context"

### 3. **Agent Kind Enum** (Security Fix)

Test that system agent trust works correctly:

```bash
# System agent should have full access (via CLI)
./dist/app/cli.js remember "test with system agent"
./dist/app/cli.js task add "test task"
./dist/app/cli.js git status

# All should work because CLI uses SYSTEM agent (kind='system')
```

### 4. **JSONL Hardening** (Reliability Fix)

Test atomic writes work correctly:

```bash
# Create a task (uses JSONL write)
./dist/app/cli.js task add "test atomic write"

# Verify file exists and is valid JSONL
cat ~/.assistant-data/tasks.jsonl | tail -1 | jq .

# Should show valid JSON entry
```

### 5. **Plugin Schema Warnings** (Visibility Fix)

If you have plugins, test schema conversion warnings:

```bash
# List plugins
./dist/app/cli.js plugins list

# If a plugin has invalid schema, you should see warnings in console
```

---

## Comprehensive Testing Checklist

### ✅ **Core Functionality**

#### Memory Operations
```bash
# Store memory
./dist/app/cli.js remember "Meeting at 3pm with Alice"

# Recall memory
./dist/app/cli.js recall "meeting"

# Verify it found the memory
./dist/app/cli.js recall "Alice" --human
```

#### Task Operations
```bash
# Add task
./dist/app/cli.js task add "Review PR #123"

# List tasks
./dist/app/cli.js task list --human

# Mark task done
./dist/app/cli.js task done 1

# List done tasks
./dist/app/cli.js task list --status done
```

#### File Operations
```bash
# Read file (if in allow_paths)
./dist/app/cli.js read notes/test.md

# Write file (if in allow_paths)
./dist/app/cli.js write notes/test.md "content here"

# List files
./dist/app/cli.js list
```

#### Git Operations
```bash
# Git status
./dist/app/cli.js git status --human

# Git diff
./dist/app/cli.js git diff

# Git log
./dist/app/cli.js git log --limit 5
```

### ✅ **New Features to Test**

#### 1. Explain Mode
```bash
# Test with regex fast path
./dist/app/cli.js explain "remember: test"

# Test with heuristic parser
./dist/app/cli.js explain "add task test"

# Test with LLM fallback (if provider configured)
./dist/app/cli.js explain "what's the weather like?"

# Test with validation errors
./dist/app/cli.js explain "task add"  # Missing text
```

**Check Output For:**
- `routing_result.stage` - Should show which stage matched
- `tool_call` - Should show tool that would be called
- `validation.valid` - Should show if args are valid
- `permissions.has_access` - Should show if agent can use tool

#### 2. Router/Executor Alignment
```bash
# Test agentless behavior
# These should work (SAFE_TOOLS):
./dist/app/cli.js calculate "2+2"
./dist/app/cli.js --help | grep "get_time"

# These should fail (not SAFE_TOOLS):
./dist/app/cli.js remember "test" 2>&1 | grep "requires agent context"
./dist/app/cli.js write notes/test.md "content" 2>&1 | grep "requires agent context"
```

#### 3. Agent Kind Security
```bash
# All these should work (SYSTEM agent has kind='system'):
./dist/app/cli.js remember "test"
./dist/app/cli.js task add "test"
./dist/app/cli.js git status

# Verify system agent is used
./dist/app/cli.js explain "remember: test" | jq '.permissions.agent_kind'
# Should output: "system"
```

### ✅ **Error Handling**

#### Invalid Commands
```bash
# Unknown command
./dist/app/cli.js unknown-command
# Should show usage/help

# Missing arguments
./dist/app/cli.js remember
# Should show error: "Usage: assistant remember <text>"

# Invalid task ID
./dist/app/cli.js task done 999
# Should show error
```

#### Permission Errors
```bash
# Try to access blocked path (if configured)
./dist/app/cli.js read /etc/passwd
# Should show permission error

# Try to run blocked command
./dist/app/cli.js run rm -rf /
# Should show command not allowed
```

### ✅ **Performance Features**

#### Profile Command
```bash
# Profile a simple command
./dist/app/cli.js profile "remember: test"

# Check output for:
# - total_time_ms
# - routing_time_ms
# - execution_time_ms
# - cache_hit
# - llm_used
```

#### Cache Operations
```bash
# Check cache stats
./dist/app/cli.js cache stats

# Clear cache
./dist/app/cli.js cache clear

# Verify cache cleared
./dist/app/cli.js cache stats
```

---

## Automated Testing

### Run All Tests

```bash
# Full test suite
npm test

# Single test file
npm run test:single router.test.ts

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Test New Features Programmatically

Create a test file `src/app/explain_mode.test.ts`:

```typescript
import { runCli } from '../core/test_utils';

function testExplainMode() {
    console.log('Testing explain mode...');
    let failures = 0;

    // Test 1: Explain with regex fast path
    const result1 = runCli(['explain', 'remember: test']);
    if (!result1.json?.ok) {
        console.error('FAIL: explain should succeed');
        failures++;
    } else {
        const stage = result1.json.result.routing_result.stage;
        if (stage !== 'regex_fast_path') {
            console.error(`FAIL: Expected regex_fast_path, got ${stage}`);
            failures++;
        } else {
            console.log('PASS: Explain mode shows regex_fast_path');
        }
    }

    // Test 2: Explain shows tool call
    if (!result1.json?.result?.tool_call) {
        console.error('FAIL: Explain should show tool_call');
        failures++;
    } else {
        console.log('PASS: Explain shows tool_call');
    }

    // Test 3: Explain shows permissions
    if (!result1.json?.result?.permissions) {
        console.error('FAIL: Explain should show permissions');
        failures++;
    } else {
        console.log('PASS: Explain shows permissions');
    }

    // Test 4: Explain with safe tool (no agent)
    const result2 = runCli(['explain', 'calculate 2+2']);
    if (!result2.json?.ok) {
        console.error('FAIL: Explain with safe tool should succeed');
        failures++;
    } else {
        const hasAccess = result2.json.result.permissions?.has_access;
        if (hasAccess !== true) {
            console.error('FAIL: Safe tool should have access');
            failures++;
        } else {
            console.log('PASS: Safe tool shows has_access=true');
        }
    }

    if (failures > 0) {
        console.error(`\n${failures} test(s) failed`);
        process.exit(1);
    }

    console.log('RESULT\nstatus: OK\n');
}

testExplainMode();
```

### Test Router/Executor Alignment

Add to `src/router_security.test.ts`:

```typescript
// Test agentless behavior
const result = await route(
    'remember: test',
    'spike',
    null,
    [],
    false,
    undefined, // No agent
    undefined  // No provider
);

// Should return error or only allow SAFE_TOOLS
if ('error' in result) {
    console.log('PASS: Router correctly blocks non-safe tool when agent undefined');
} else if (result.tool_call.tool_name === 'remember') {
    console.error('FAIL: Router should not allow remember when agent undefined');
    failures++;
}
```

---

## Manual Testing Workflow

### 1. **Start Development Environment**

```bash
# Terminal 1: Watch build
npm run build:watch

# Terminal 2: REPL for interactive testing
npm run repl

# Terminal 3: Run commands
./dist/app/cli.js <command>
```

### 2. **Test Each Feature Category**

#### Day 1: Core Commands
- [ ] Memory: remember, recall
- [ ] Tasks: add, list, done
- [ ] Files: read, write, list
- [ ] Git: status, diff, log

#### Day 2: New Features
- [ ] Explain mode with various commands
- [ ] Router/executor alignment (agentless)
- [ ] Agent kind security
- [ ] JSONL atomic writes

#### Day 3: Edge Cases
- [ ] Error handling
- [ ] Permission errors
- [ ] Invalid inputs
- [ ] Performance (profile command)

### 3. **Verify Output**

For each command, check:
- ✅ Exit code (0 for success, non-zero for error)
- ✅ JSON output structure (if JSON mode)
- ✅ Human-readable output (if --human flag)
- ✅ Error messages are clear
- ✅ No crashes or hangs

---

## Smoke Test

Run the automated smoke test:

```bash
./scripts/smoke-test.sh
```

This tests:
1. CLI starts
2. Basic tool execution (run_cmd)
3. Memory operations (remember/recall)
4. Task operations (add/list)
5. No data leakage

---

## Debugging Failed Tests

### Enable Verbose Mode

```bash
# See routing decisions
./dist/app/cli.js explain "remember: test" --verbose

# See executor decisions
./dist/app/cli.js remember "test" --verbose
```

### Check Logs

```bash
# Audit log
cat ~/.assistant-data/audit.jsonl | tail -20

# Check for errors
cat ~/.assistant-data/audit.jsonl | jq 'select(.ok == false)'
```

### Test in Isolation

```bash
# Use mock provider (no API calls)
./dist/app/cli.js remember "test" --mock

# Use isolated data directory
export ASSISTANT_DATA_DIR=/tmp/test-data
./dist/app/cli.js remember "test"
```

---

## What to Test Next

### High Priority
1. ✅ **Explain mode** - New debugging feature
2. ✅ **Router/executor alignment** - Security fix
3. ✅ **Agent kind enum** - Security improvement
4. ⏳ **Plugin system** - If you use plugins
5. ⏳ **Web dashboard** - If you use web UI

### Medium Priority
1. ⏳ **Performance** - Profile command, caching
2. ⏳ **Error recovery** - JSONL corruption handling
3. ⏳ **Concurrent operations** - Multiple commands at once

### Low Priority
1. ⏳ **Edge cases** - Very long inputs, special characters
2. ⏳ **Stress testing** - Many commands in sequence
3. ⏳ **Integration** - With external tools/plugins

---

## Quick Reference

### Test Commands Cheat Sheet

```bash
# Explain mode
./dist/app/cli.js explain "<command>"

# Profile performance
./dist/app/cli.js profile "<command>"

# Check cache
./dist/app/cli.js cache stats
./dist/app/cli.js cache clear

# List plugins
./dist/app/cli.js plugins list

# Run demo
./dist/app/cli.js demo --human

# REPL mode
./dist/app/cli.js repl

# Web dashboard
./dist/app/cli.js web
```

### Test Utilities

```bash
# Run all tests
npm test

# Run single test
npm run test:single <test-file>

# Run E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## Next Steps

1. **Run explain mode** on a few commands to see routing decisions
2. **Test agentless behavior** - verify only SAFE_TOOLS work
3. **Add automated tests** for explain mode (see example above)
4. **Test edge cases** - invalid inputs, permission errors
5. **Profile performance** - use profile command on common operations

For more details, see:
- `docs/TESTING.md` - Full testing documentation
- `docs/ARCHITECTURE.md` - Architecture overview
- `CODE_REVIEW.md` - Code review with test coverage gaps

