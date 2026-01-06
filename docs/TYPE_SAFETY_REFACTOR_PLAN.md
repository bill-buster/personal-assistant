# Type Safety Refactoring Plan

**Created**: 2025-01-06  
**Status**: In Progress  
**Goal**: Complete migration from `any` to `unknown` with proper type guards

## Current State

### ✅ Completed (Phase 1)
- Core types (`src/core/types.ts`) - replaced `any` with `unknown`
- Core utilities (`src/core/cache.ts`, `src/core/executor.ts`, `src/core/output.ts`, etc.)
- Tool registry type compatibility
- Some tool files (`comms_tools.ts`, `memory_tools.ts`)

### ❌ Remaining Issues

#### Production Code (Critical - Must Fix)
1. **`src/tools/task_tools.ts`** - 27 type errors
   - `readJsonl` validators need proper type guards
   - Pattern: `entry => entry && typeof entry.id === 'number'` → needs `(entry: unknown) => ...`

2. **`src/tools/productivity_tools.ts`** - 5 type errors
   - `readJsonl` validators need proper type guards
   - Pattern: `c => !!c.name` → needs `(c: unknown) => ...`

#### Test Files (Can be fixed incrementally)
- `src/tools/*.test.ts` - ~200+ errors accessing properties on `unknown` types
- Pattern: `result.result?.property` → needs type guards

## Refactoring Strategy

### Phase 1: Create Type Guard Helpers (Foundation)

**Goal**: Create reusable type guard functions to reduce duplication

**Files to create/modify**:
- `src/core/type_guards.ts` (new file)

**Helper functions to create**:
```typescript
// Type guards for common patterns
export function isTask(entry: unknown): entry is Task { ... }
export function isReminder(entry: unknown): entry is Reminder { ... }
export function isContact(entry: unknown): entry is Contact { ... }
export function isMemoryEntry(entry: unknown): entry is MemoryEntry { ... }
export function isEmailEntry(entry: unknown): entry is EmailEntry { ... }
export function isMessageEntry(entry: unknown): entry is MessageEntry { ... }

// Type guards for tool results
export function isCalculateResult(result: unknown): result is { expression: string; value: number } { ... }
export function isGetTimeResult(result: unknown): result is { time: string; timestamp: number } { ... }
export function isDelegateResult(result: unknown): result is { task: string; delegated_to: string } { ... }
// ... more result type guards
```

**Benefits**:
- Reusable across tool files and test files
- Single source of truth for type validation
- Easier to maintain

### Phase 2: Fix Tool Files (Production Code)

**Priority**: High - These are production code paths

#### Step 2.1: Fix `task_tools.ts`
- Replace all `readJsonl` validators with proper type guards
- Use `isTask()` and `isReminder()` helpers
- Test after each function fix

**Files to modify**:
- `src/tools/task_tools.ts`

**Functions to fix**:
1. `handleTaskAdd` - line 66
2. `handleReminderList` - line 127
3. `handleTaskList` - line 170
4. `handleTaskDone` - line 209
5. `handleReminderAdd` - line 283

#### Step 2.2: Fix `productivity_tools.ts`
- Replace all `readJsonl` validators with proper type guards
- Use `isContact()` and calendar event helpers
- Test after each function fix

**Files to modify**:
- `src/tools/productivity_tools.ts`

**Functions to fix**:
1. `handleContactSearch` - line 22
2. `handleContactAdd` - line 43
3. `handleContactUpdate` - line 71
4. `handleCalendarList` - line 100
5. `handleCalendarEventAdd` - line 166

### Phase 3: Fix Test Files (Incremental)

**Priority**: Medium - These don't block production but improve code quality

**Strategy**: Fix one test file at a time, run tests after each

#### Step 3.1: Fix `utility_tools.test.ts`
- Add type guards for `handleCalculate` results
- Add type guards for `handleGetTime` results
- Add type guards for `handleDelegate*` results
- Add type guards for `handleGetWeather` results

#### Step 3.2: Fix `file_tools.test.ts`
- Add type guards for file operation results
- Pattern: Check `result.ok && typeof result.result === 'object'` before accessing properties

#### Step 3.3: Fix `git_tools.test.ts`
- Add type guards for git operation results
- Pattern: Check result structure before accessing properties

#### Step 3.4: Fix `grep_tools.test.ts`
- Add type guards for grep results
- Pattern: Check `matches` array structure

#### Step 3.5: Fix remaining test files
- `fetch_tools.test.ts`
- `comms_tools.test.ts`
- `capability_api.test.ts`
- `extended_system.test.ts`

## Implementation Steps

### Step 1: Create Type Guard Helpers
1. Create `src/core/type_guards.ts`
2. Implement type guards for all domain types (Task, Reminder, Contact, etc.)
3. Implement type guards for tool result types
4. Export all helpers
5. Run typecheck to verify
6. Commit: `feat(core): add type guard helpers for domain types`

### Step 2: Fix task_tools.ts
1. Import type guard helpers
2. Replace validator in `handleTaskAdd` (line 66)
3. Run typecheck
4. Replace validator in `handleReminderList` (line 127)
5. Run typecheck
6. Replace validator in `handleTaskList` (line 170)
7. Run typecheck
8. Replace validator in `handleTaskDone` (line 209)
9. Run typecheck
10. Replace validator in `handleReminderAdd` (line 283)
11. Run typecheck and tests
12. Commit: `fix(tools): add type guards to task_tools readJsonl validators`

### Step 3: Fix productivity_tools.ts
1. Import type guard helpers
2. Replace validator in `handleContactSearch` (line 22)
3. Run typecheck
4. Replace validator in `handleContactAdd` (line 43)
5. Run typecheck
6. Replace validator in `handleContactUpdate` (line 71)
7. Run typecheck
8. Replace validator in `handleCalendarList` (line 100)
9. Run typecheck
10. Replace validator in `handleCalendarEventAdd` (line 166)
11. Run typecheck and tests
12. Commit: `fix(tools): add type guards to productivity_tools readJsonl validators`

### Step 4: Fix Test Files (Incremental)
For each test file:
1. Identify all `result.result?.property` accesses
2. Add type guards using helper functions
3. Run typecheck
4. Run tests for that file
5. Commit: `fix(tests): add type guards to <file>_test.ts`

## Testing Strategy

### After Each Phase
- Run `npm run typecheck` - must pass
- Run `npm test` - all tests must pass
- Run `npm run preflight` - all checks must pass

### Test Coverage
- Each tool function should have tests
- Type guards should be tested with invalid inputs
- Edge cases (null, undefined, wrong types) should be covered

## Risk Assessment

### Low Risk
- Creating type guard helpers (new code, no breaking changes)
- Fixing test files (tests only, no production impact)

### Medium Risk
- Fixing tool files (production code, but type guards are defensive)

### Mitigation
- Fix one function at a time
- Run tests after each change
- Commit frequently
- Review each commit before proceeding

## Success Criteria

1. ✅ `npm run typecheck` passes with 0 errors
2. ✅ All tests pass (`npm test`)
3. ✅ Preflight checks pass (`npm run preflight`)
4. ✅ No `any` types remain in production code
5. ✅ All `readJsonl` validators use proper type guards
6. ✅ All test files use type guards for result access

## Estimated Effort

- Phase 1 (Type Guard Helpers): 1-2 hours
- Phase 2 (Tool Files): 2-3 hours
- Phase 3 (Test Files): 4-6 hours
- **Total**: 7-11 hours

## Dependencies

- TypeScript strict mode enabled
- Zod schemas for runtime validation (already in place)
- Test infrastructure (already in place)

## Notes

- Type guards are runtime checks, so they add minimal overhead
- Type guards improve both type safety and runtime safety
- This refactoring makes the codebase more maintainable long-term
- Can be done incrementally without blocking other work

