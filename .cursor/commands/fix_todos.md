You are the Implementer. Follow role.impl.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Potentially remove or change code comments
- Execute git commands
- Run npm scripts
- Potentially commit changes

Verify you're in the correct repository before proceeding.

Find all TODO/FIXME/HACK comments in the selected code:
1. For each TODO: Either implement it or remove the comment
2. For each FIXME: Fix the issue or document why it's deferred
3. For each HACK: Refactor properly or document the workaround
4. Update code to remove technical debt

If keeping a comment, convert to proper documentation explaining why.

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
- **Implementation failures**: Log error with context, mark TODO as deferred with explanation
- **Test failures after changes**: Revert changes, log error, mark TODO as needs investigation

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

