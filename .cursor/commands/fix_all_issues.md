# /fix_all_issues
Batch-fix common repo issues in a safe order with tests between stages.

## [STEP 1/7] Preflight
- Identify current failures: typecheck, lint, tests
- Paste the top 10 errors (or summary) into the log

## [STEP 2/7] Fix TODOs / obvious hygiene
- Run your repo's TODO fixer (or do a targeted sweep)

## [STEP 3/7] Fix lint + formatting
- Run lint/format commands
- Apply fixes; avoid changing semantics unless required

## [STEP 4/7] Fix type errors
- Resolve TypeScript errors with minimal changes
- Add types rather than casting unless unavoidable

## [STEP 5/7] Fix docs mismatches
- Update docs touched by changes (README, tool catalogs, etc.)

## [STEP 6/7] Run tests (required)
- `npm test` (or repo standard)
- If failures: fix and re-run until green

## [STEP 7/7] Summary
- What you fixed
- Commands run
- Remaining issues (if any) + suggested next command

