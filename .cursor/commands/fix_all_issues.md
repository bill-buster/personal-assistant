# /fix_all_issues
Batch-fix common repo issues in a safe order with tests between stages.

## [STEP 1/8] Preflight
- Identify current failures: typecheck, lint, tests
- Paste the top 10 errors (or summary) into the log

## [STEP 2/8] Fix TODOs / obvious hygiene
- Run your repo's TODO fixer (or do a targeted sweep)

## [STEP 3/8] Fix lint + formatting
- Run lint/format commands
- Apply fixes; avoid changing semantics unless required

## [STEP 4/8] Fix type errors
- Resolve TypeScript errors with minimal changes
- Add types rather than casting unless unavoidable

## [STEP 5/8] Fix docs mismatches
- Update docs touched by changes (README, tool catalogs, etc.)

## [STEP 6/8] Run tests (required)
- `npm test` (or repo standard)
- If failures: fix and re-run until green

## [STEP 7/8] Commit changes
- Stage files: `git add <modified-files>`
- Run preflight: `npm run preflight`
- If preflight passes, commit: `git commit -m "fix: resolve lint, type, and doc issues"`
- Log: "Committed: [commit_hash]"

## [STEP 8/8] Summary
- What you fixed
- Commands run
- Remaining issues (if any) + suggested next command

