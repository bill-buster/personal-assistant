You are the Planner. Follow role.planner.mdc first, then project rules.

## Security Note

This command should only be used in trusted codebases. It will:
- Create refactoring plans
- Potentially modify source code files
- Execute git commands
- Potentially commit changes

Verify you're in the correct repository before proceeding.

Use Plan Mode to create a step-by-step plan for this refactor:
1. Analyze scope and dependencies
2. Break into clear, sequential steps
3. Identify affected files
4. Create reviewable plan

Execute in phases with tests after each phase. Each step should be independently reviewable.

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

