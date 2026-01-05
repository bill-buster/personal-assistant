# Review Tool Enhancements

## Summary

Enhanced `code_review.ts` with semantic pattern checks to catch common logic bugs that were previously only found in manual/AI reviews.

## Changes Made

### 1. Added Semantic Pattern Checks

Added two new pattern checks to the `quality` category:

#### Pattern 1: Symlink Detection Anti-Pattern

**Issue**: Using `fs.statSync()` with `isSymbolicLink()` check - `statSync()` follows symlinks, so `isSymbolicLink()` will always return false.

**Pattern**: Detects `fs.statSync()` when `isSymbolicLink()` is used in the same function.

**Suggestion**: Use `fs.lstatSync()` to detect symlinks without following them.

**Example**:
```typescript
// ❌ Wrong
stats = fs.statSync(targetPath);
if (stats.isSymbolicLink()) { // This will never be true!

// ✅ Correct
stats = fs.lstatSync(targetPath);
if (stats.isSymbolicLink()) { // Now this works!
```

#### Pattern 2: String Formatting Without Padding

**Issue**: Using `toString(8).slice(-3)` may not produce consistent 3-digit format (e.g., `64` instead of `064`).

**Pattern**: Detects `toString(8).slice(-3)` without `padStart()`.

**Suggestion**: Use `padStart(3, '0')` for consistent formatting.

**Example**:
```typescript
// ❌ Wrong
mode = stats.mode.toString(8).slice(-3); // May be "64" instead of "064"

// ✅ Correct
const modeNum = stats.mode & 0o777;
mode = modeNum.toString(8).padStart(3, '0'); // Always "064"
```

### 2. Updated Documentation

- Created `docs/REVIEW_STRATEGY.md` explaining tiered review approach
- Updated help text in `code_review.ts` to mention semantic checks
- Documented limitations and when to use AI-assisted review

## How It Works

The enhanced review tool now has three tiers:

1. **Tier 1: Fast, Narrow Checks** (`/fix_todos`)
   - Only explicit TODO/FIXME/HACK markers
   - Very fast, low false positives

2. **Tier 2: Pattern-Based Checks** (`code_review.ts`)
   - Regex patterns for common issues
   - **NEW**: Semantic patterns for logic bugs
   - Medium speed, catches common issues

3. **Tier 3: AI-Assisted Review**
   - Context-aware, catches everything
   - Use for complex logic bugs

## Testing

The patterns are designed to:
- Match common bug patterns
- Avoid false positives with whitelist patterns
- Use context checks to ensure patterns are relevant

**Note**: Patterns may need refinement based on actual usage. Monitor review output and adjust patterns as needed.

## Future Enhancements

As more semantic bugs are discovered in manual reviews, add them to the pattern checks:

1. Document the bug pattern
2. Create a regex pattern to detect it
3. Add whitelist patterns to avoid false positives
4. Add context checks if needed
5. Test on real codebase

## Related Files

- `src/scripts/code_review.ts` - Enhanced with semantic patterns
- `docs/REVIEW_STRATEGY.md` - Strategy document
- `.cursor/rules/code_review.mdc` - Review checklist patterns

