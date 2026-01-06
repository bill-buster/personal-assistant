You are the Reviewer. Follow role.review.mdc first, then project rules.

## Inputs

- Code to review: (selected file or specified path)
- Review scope: (entire file, specific function, or diff)

## Steps

### [STEP 1/3] Read code and context
- Read the code to be reviewed
- Understand the purpose and context
- Check related files if needed for context

### [STEP 2/3] Systematic review
Review using the checklist in code_review.mdc:
- Functionality (edge cases, error handling, bugs)
- Security (validation, paths, commands, secrets)
- Performance (caching, efficiency)
- Quality (conventions, types, unused code)
- Testing (coverage, edge cases, mocks)
- Documentation (JSDoc, README updates)

### [STEP 3/3] Generate review output
Provide review in the following format:

**Verdict**: Approve / Request changes

**Blocking issues** (must fix):
- File: `path/to/file.ts`
  - Line X: Issue description
  - Fix: Specific fix suggestion

**Non-blocking issues** (nits/recommendations):
- File: `path/to/file.ts`
  - Line Y: Issue description
  - Suggestion: Improvement recommendation

## Output Format

```
Verdict: [Approve | Request changes]

Blocking issues:
- [File path]:[Line] - [Issue] → [Fix]

Non-blocking issues:
- [File path]:[Line] - [Issue] → [Suggestion]
```

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

## Stop Conditions

- Review complete: Provide verdict and issue list
- Stop after review output - do not commit or stage files
- Let the user decide whether to commit based on review results

