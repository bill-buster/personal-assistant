## Security Note

This command should only be used in trusted codebases. It will:
- Modify test files
- Change test execution patterns

Verify you're in the correct repository before proceeding.

## Inputs

- Test files to convert: (selected files or specified paths)

## Steps

### [STEP 1/4] Identify spawnSync usage
- Find all `spawnSync` calls in test files
- Categorize:
  - Safe to convert: Tests that can use direct imports
  - Keep spawn: Tests that need actual command execution (CLI/integration behavior)

### [STEP 2/4] Convert safe cases (batch 1)
- Convert first batch of safe spawnSync calls to direct imports
- Follow performance.mdc patterns:
  - Use direct imports instead of spawnSync when possible
  - Keep spawnSync only for actual command execution tests
- Log: "Converted [N] spawnSync calls to direct imports"

### [STEP 3/4] Run targeted tests after batch 1
- Run tests for converted files: `npm run test:single [test_name]` (if available) or `npm test [test_file]`
- Record: commands run, pass/fail status
- If tests fail: Revert batch 1 changes, log error, stop

### [STEP 4/4] Convert remaining safe cases and generate summary
- Convert remaining safe cases (batch 2, 3, etc.)
- Run full test suite: `npm test`
- Record: commands run, pass/fail status
- Generate summary:
  - Files modified
  - Conversions made (N spawnSync → direct imports)
  - Tests kept as spawnSync (and why)
  - Test results

## Keep spawnSync carveout

Only keep spawnSync for:
- True CLI/integration behavior tests (testing actual command execution)
- Tests that verify spawnSync behavior itself
- Tests that need to test command-line interface

## Stop Conditions

- Conversion complete: Provide summary with test results
- Stop after summary - do not commit or stage files
- Let the user decide whether to commit based on conversion results

