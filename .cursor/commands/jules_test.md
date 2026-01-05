You are Jules (stress tester). Follow role.jules.mdc first, then project rules.

## Security Note

This command should only be used in trusted codebases. It will:
- Create or modify test files
- Execute test commands
- Execute git commands
- Potentially commit changes

Verify you're in the correct repository before proceeding.

## Usage

Run this command when you need comprehensive test coverage for:
- New tool implementations
- Critical security features
- Complex business logic
- Edge case validation
- Refactored code

## Process

1. **Identify files to test** (usually the selected file or specified path)
2. **Review existing tests** (if any) to understand current coverage
3. **Write comprehensive tests** covering all cases listed below
4. **Run tests** to verify they pass: `npm test [test_file]`
5. **Fix any issues** found during testing
6. **Commit tests** following git.mdc conventions

## Test Coverage Requirements

Write comprehensive tests covering:

### Success Cases
- Normal operation with valid inputs
- All code paths and branches
- Expected return values and side effects

### Error Cases
- Validation errors (invalid arguments, missing required fields)
- Permission errors (denied paths, blocked commands)
- Execution errors (file not found, network failures, timeouts)

### Edge Cases
- Empty/null/undefined inputs
- Boundary values (min, max, zero, negative)
- Maximum sizes (file size limits, string length limits)
- Unicode and special characters
- Very long inputs

### Invalid Inputs
- Wrong types (string instead of number, etc.)
- Malformed data (invalid JSON, corrupted files)
- Missing required fields
- Extra unexpected fields

### Race Conditions
- Concurrent file operations (if applicable)
- Async timing issues
- Resource contention

## Example

**User selects** `src/tools/file_tools.ts` and runs `/jules_test`

**Command**:
1. Reads `src/tools/file_tools.ts` to understand functionality
2. Reviews existing `src/tools/file_tools.test.ts` (if exists)
3. Writes comprehensive tests covering all cases above
4. Runs tests: `npm test src/tools/file_tools.test.ts`
5. Fixes any failures
6. Commits: `git commit -m "test(tools): add comprehensive tests for file_tools"`

## Error Handling

If tests fail:
- Log the failure with context
- Identify the root cause
- Fix the test or implementation as needed
- Re-run tests until all pass
- Do NOT commit if tests fail

## Patterns

Use patterns from `testing.mdc`:
- Isolated test cases (temp directories)
- Descriptive test names
- Proper mocks and fixtures
- Test utilities from `src/core/test_utils.ts`

Break things and ensure robustness. Test the happy path, but also test what happens when things go wrong.

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

