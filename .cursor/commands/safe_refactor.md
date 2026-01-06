You are the Planner. Follow role.planner.mdc first, then project rules.

## Security Note

This command should only be used in trusted codebases. It will:
- Create refactoring plans
- Potentially modify source code files (only if user confirms execution)

Verify you're in the correct repository before proceeding.

## Inputs

- Refactoring goal: (what needs to be refactored)
- Scope: (files or areas to refactor)

## Steps

### [STEP 1/6] Create plan (plan-only by default)
Use Plan Mode to create a step-by-step plan:
1. Analyze scope and dependencies
2. Break into clear, sequential steps
3. Identify affected files
4. Create reviewable plan

**Output**: Detailed plan with numbered steps, file paths, and specific changes

### [STEP 2/6] Confirm scope (wait for user approval)
- Present plan to user
- Wait for explicit "execute" confirmation
- If user says "plan only" or doesn't confirm, stop here

### [STEP 3/6] Execute phase 1
- Execute first phase of refactoring
- Make minimal, targeted changes
- Log: "Phase 1 complete: [what changed]"

### [STEP 4/6] Run tests after phase 1
- Run tests: `npm test` or targeted test run
- Record: commands run, pass/fail status
- If tests fail: Stop and report, do not proceed to phase 2

### [STEP 5/6] Execute phase 2 (if phase 1 passed)
- Execute second phase of refactoring
- Make minimal, targeted changes
- Log: "Phase 2 complete: [what changed]"

### [STEP 6/6] Run tests and generate summary
- Run tests: `npm test` or targeted test run
- Record: commands run, pass/fail status
- Generate summary:
  - What changed (files + intent)
  - Test commands run + results
  - Any tradeoffs / followups

## Stop Conditions

- Plan created: Stop and wait for user confirmation before executing
- Execution complete: Provide summary with test results
- Stop after summary - do not commit or stage files
- Let the user decide whether to commit based on refactoring results

## Phased Gate Pattern

Each phase follows: Execute → Test → Verify → Next phase

- Each step should be independently reviewable
- Tests must pass after each phase before proceeding
- If any phase fails, stop and report

