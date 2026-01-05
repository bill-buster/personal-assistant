# Code Review Strategy: Narrow vs Broad Scope

## Problem Statement

We have review tools that catch different types of issues:

1. **`/fix_todos`** - Only finds TODO/FIXME/HACK comments (very narrow)
2. **`code_review.ts`** - Finds pattern-based issues (regex patterns for security, performance, etc.)
3. **Manual/AI Review** - Catches semantic/logic bugs (like using `fs.statSync()` instead of `fs.lstatSync()` for symlinks)

**Question**: Should we make review commands more versatile to catch semantic issues, or keep them narrow?

## Answer: Tiered Approach

We should have **both** narrow and broad checks, each serving different purposes:

### Tier 1: Fast, Narrow Checks (Technical Debt Markers)

**Purpose**: Quick scans for explicit technical debt markers

**Tools**:
- `/fix_todos` - Finds TODO/FIXME/HACK comments
- `grep` patterns for specific markers

**Scope**: Very narrow, fast, low false positives

**When to use**: 
- Before committing
- Quick cleanup passes
- CI/CD checks

**Limitations**: Only finds explicit markers, not logic bugs

### Tier 2: Pattern-Based Checks (Anti-Patterns)

**Purpose**: Systematic detection of common anti-patterns

**Tools**:
- `code_review.ts` - Regex-based pattern matching
- ESLint rules
- TypeScript compiler

**Scope**: Medium, catches common issues

**What it catches**:
- Security issues (path traversal, shell injection)
- Performance issues (sync I/O, sequential async)
- Code quality (any types, missing docs)
- Error handling (throw statements)

**Limitations**: 
- Can't catch logic bugs that require understanding context
- Can't detect semantic issues (e.g., wrong function choice)
- May have false positives

**When to use**:
- Before PRs
- Regular codebase scans
- CI/CD integration

### Tier 3: Semantic/Logic Checks (Context-Aware)

**Purpose**: Detect bugs that require understanding code intent

**Tools**:
- AI-assisted review (Cursor)
- Manual code review
- Static analysis tools (TypeScript, ESLint with semantic rules)

**Scope**: Broad, catches logic bugs

**What it catches**:
- Using `fs.statSync()` instead of `fs.lstatSync()` for symlink detection
- Missing padding in string formatting
- Logic bugs (wrong condition, missing edge case)
- Architecture issues

**Limitations**:
- Requires understanding context
- Slower than pattern-based checks
- May require human judgment

**When to use**:
- Before major releases
- When adding new features
- When fixing bugs (review related code)
- Periodic deep reviews

## Current Gaps

### What We're Missing

1. **Semantic checks for common patterns**:
   - `fs.statSync()` + `isSymbolicLink()` check (should use `lstatSync()`)
   - String formatting without padding (e.g., `toString(8).slice(-3)` should pad)
   - Missing null checks before property access
   - Wrong function choice (e.g., `readFile` vs `readFileSync` in wrong context)

2. **Context-aware checks**:
   - Function used incorrectly for its purpose
   - Missing edge case handling
   - Logic bugs

### Solution: Enhance Pattern-Based Checks

We can add **semantic pattern checks** to `code_review.ts` that look for common bug patterns:

```typescript
// Example: Detect fs.statSync() + isSymbolicLink() anti-pattern
{
    pattern: /fs\.statSync\([^)]+\)[\s\S]{0,200}isSymbolicLink\(\)/,
    issue: 'statSync() follows symlinks - use lstatSync() to detect symlinks',
    category: 'quality',
    severity: 'medium',
}

// Example: Detect missing padding in string formatting
{
    pattern: /\.toString\(8\)\.slice\(-3\)/,
    issue: 'String formatting may be missing padding - use padStart(3, "0")',
    category: 'quality',
    severity: 'low',
}
```

**Benefits**:
- Catches common semantic bugs automatically
- Still fast (pattern-based)
- Can be expanded as we find more patterns

**Limitations**:
- Only catches known patterns
- May have false positives
- Requires maintenance as patterns evolve

## Recommended Strategy

### 1. Keep Narrow Checks Fast

**Don't expand `/fix_todos`** - it's meant to be fast and focused. Keep it for explicit technical debt markers only.

### 2. Enhance Pattern-Based Checks

**Expand `code_review.ts`** with semantic pattern checks for common bugs:

- ✅ Add checks for known anti-patterns (like symlink detection)
- ✅ Add checks for formatting issues (padding, etc.)
- ✅ Document limitations clearly
- ✅ Make it easy to add new patterns

### 3. Use AI-Assisted Review for Complex Issues

**For semantic/logic bugs** that require context:
- Use Cursor AI with review prompts
- Use `/review_pr` command for systematic review
- Document patterns found in manual reviews to add to automated checks

### 4. Document Limitations

**Be clear about what each tool catches**:
- `/fix_todos`: Only explicit TODO/FIXME/HACK markers
- `code_review.ts`: Pattern-based issues + common semantic bugs
- AI review: Everything, including complex logic bugs

## Implementation Plan

### Phase 1: Document Current State ✅

- [x] Create this document
- [x] Document what each tool catches
- [x] Document limitations

### Phase 2: Enhance Pattern-Based Checks

- [ ] Add semantic pattern checks to `code_review.ts`:
  - [ ] `fs.statSync()` + `isSymbolicLink()` pattern
  - [ ] String formatting without padding
  - [ ] Other common patterns from manual reviews
- [ ] Add category for "semantic" issues
- [ ] Document new checks

### Phase 3: Improve Workflow

- [ ] Update documentation to explain when to use each tool
- [ ] Add examples of issues each tool catches
- [ ] Create review checklist that combines all tools

## Examples

### Example 1: Symlink Detection Bug

**Issue**: Using `fs.statSync()` to detect symlinks (it follows them)

**Current tools**:
- ❌ `/fix_todos`: Doesn't catch (not a TODO comment)
- ❌ `code_review.ts`: Doesn't catch (requires understanding intent)
- ✅ AI review: Catches it

**After enhancement**:
- ❌ `/fix_todos`: Still doesn't catch (by design)
- ✅ `code_review.ts`: Catches it (new semantic pattern check)
- ✅ AI review: Still catches it

### Example 2: Permission Formatting Bug

**Issue**: `stats.mode.toString(8).slice(-3)` may not pad to 3 digits

**Current tools**:
- ❌ `/fix_todos`: Doesn't catch
- ❌ `code_review.ts`: Doesn't catch
- ✅ AI review: Catches it

**After enhancement**:
- ❌ `/fix_todos`: Still doesn't catch
- ✅ `code_review.ts`: Catches it (new pattern check)
- ✅ AI review: Still catches it

### Example 3: Complex Logic Bug

**Issue**: Missing edge case handling that requires understanding business logic

**Current tools**:
- ❌ `/fix_todos`: Doesn't catch
- ❌ `code_review.ts`: Doesn't catch (too complex for patterns)
- ✅ AI review: Catches it

**After enhancement**:
- ❌ `/fix_todos`: Still doesn't catch
- ❌ `code_review.ts`: Still doesn't catch (too complex)
- ✅ AI review: Still the only way to catch it

## Limitations

### What Automated Tools Can't Catch

Even with enhanced semantic pattern checks, some issues require human/AI judgment:

1. **Complex logic bugs**: Missing edge cases that require understanding business logic
2. **Architecture issues**: Design problems that span multiple files
3. **Performance issues**: Inefficient algorithms that aren't obvious patterns
4. **Test coverage gaps**: Missing tests for specific scenarios
5. **Documentation gaps**: Missing or unclear documentation

### When to Use AI-Assisted Review

Use AI-assisted review (Cursor with `/review_pr` or manual prompts) for:

- **Before major releases**: Deep review of critical paths
- **When adding new features**: Review new code and related changes
- **When fixing bugs**: Review related code to prevent regressions
- **Periodic deep reviews**: Systematic review of entire codebase
- **Complex refactors**: When making architectural changes

### How to Use AI-Assisted Review

1. **Use `/review_pr` command**: Systematic review using code_review.mdc checklist
2. **Use specific prompts**: "Review [file] for [category] issues"
3. **Use isolated review**: Review files without context to catch implicit dependencies
4. **Document findings**: Add new patterns to automated checks when found

## Conclusion

**Recommendation**: Enhance pattern-based checks with semantic patterns, but keep narrow checks focused. Use AI-assisted review for complex issues.

**Key Principle**: Each tool should do one thing well:
- `/fix_todos`: Fast, focused on explicit markers
- `code_review.ts`: Systematic pattern-based checks (including semantic patterns)
- AI review: Context-aware, catches everything

**Trade-off**: We can't catch everything automatically, but we can catch more common issues with enhanced pattern checks while keeping tools fast and maintainable.

**Current Status**:
- ✅ Tier 1 (narrow checks): `/fix_todos` - working as designed
- ✅ Tier 2 (pattern-based): `code_review.ts` - enhanced with semantic patterns
- ✅ Tier 3 (semantic): AI-assisted review - use when needed

**Next Steps**:
- Monitor review tool output for new patterns to add
- Document common issues found in AI reviews
- Add more semantic patterns as they're discovered

