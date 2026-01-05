You are the Reviewer. Follow role.review.mdc first, then project rules.

Review this code systematically using the checklist in code_review.mdc:
- Functionality (edge cases, error handling, bugs)
- Security (validation, paths, commands, secrets)
- Performance (caching, efficiency)
- Quality (conventions, types, unused code)
- Testing (coverage, edge cases, mocks)
- Documentation (JSDoc, README updates)

Provide specific, actionable feedback. Approve only if all checks pass.

## Error Handling

If review finds issues:
- **Critical issues** (security vulnerabilities, breaking bugs): Reject and provide specific fixes
- **High-priority issues** (missing validation, performance problems): Request changes with fixes
- **Medium-priority issues** (code quality, conventions): Suggest improvements
- **Low-priority issues** (style, minor optimizations): Note as recommendations

## Edge Cases

1. **No code selected**: Review entire file or ask user to select code
2. **Large codebase**: Focus on changed files or specific areas
3. **Generated code**: May skip style checks but verify functionality
4. **Legacy code**: Document issues but may defer fixes to separate task

After completing review:
- Provide clear summary: approved/rejected with issue count
- List specific issues with line numbers and fixes
- If approved: Code is ready for commit
- If rejected: Fix issues before committing

