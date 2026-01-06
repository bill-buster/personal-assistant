You are the Implementer. Follow role.impl.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Potentially remove or change code comments
- Run npm scripts

Verify you're in the correct repository before proceeding.

## Inputs

- Code to scan: (selected file or specified path)

## Steps

### [STEP 1/5] Find TODO/FIXME/HACK comments
- Scan code for TODO/FIXME/HACK comments
- Extract: comment text, location, context

### [STEP 2/5] Categorize TODOs
For each TODO/FIXME/HACK:
- **Implementable**: Can be implemented now
- **Deferred**: Needs to be tracked elsewhere (issue tracker, docs, task file)
- **Preserve**: Should be kept as documentation

**Strong caution**: Don't delete TODOs that represent real work without migrating them to:
- Issue tracker
- Docs rationale
- Tracked task file

### [STEP 3/5] Process TODOs
- **TODO**: Either implement it or migrate to issue tracker/docs/task file
- **FIXME**: Fix the issue or document why it's deferred (migrate to tracker)
- **HACK**: Refactor properly or document the workaround (migrate to tracker)
- **Preserve**: Convert to proper documentation explaining why

### [STEP 4/5] Run tests
- Run tests: `npm test [test_file]` or `npm run test:single [test_name]` (if available)
- Record: commands run, pass/fail status
- If tests fail: Revert changes, log error, mark TODO as needs investigation

### [STEP 5/5] Generate summary
- Files modified
- TODOs processed (N implemented, M migrated, K preserved)
- Migrations made (list where TODOs were migrated)
- Test results

## Edge Cases

1. **No TODOs found**: Log "No TODOs found" and exit successfully
2. **TODOs in documentation**: Convert to proper documentation format (not code comments)
3. **TODOs referencing external deps**: Document dependency requirement clearly
4. **TODOs in test files**: May indicate missing test cases - evaluate carefully before removing
5. **TODOs with dates/deadlines**: Check if deadline passed - implement or remove
6. **TODOs in comments that should be preserved**: Convert to proper documentation

## Error Handling

If errors occur:
- **File read errors**: Log error and skip file, continue with others
- **Implementation failures**: Log error with context, mark TODO as deferred with explanation (migrate to tracker)
- **Test failures after changes**: Revert changes, log error, mark TODO as needs investigation

## Stop Conditions

- TODOs processed: Provide summary with migrations and test results
- Stop after summary - do not commit or stage files
- Let the user decide whether to commit based on TODO cleanup results

