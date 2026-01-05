## Security Note

This command should only be used in trusted codebases. It will:
- Modify test files
- Change test execution patterns
- Execute git commands
- Potentially commit changes

Verify you're in the correct repository before proceeding.

Convert spawn-based tests to direct imports where safe.

Follow performance.mdc patterns:
- Use direct imports instead of spawnSync when possible
- Keep spawnSync only for actual command execution tests
- Verify tests still pass after conversion
- Update test documentation if needed

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

