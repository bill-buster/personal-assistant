# Quick Code Review Guide

## 🚀 One-Command Review

```bash
# Review entire codebase
npm run review
```

**Output**: Score (0-100) + categorized issues + critical issues list

## 📊 Current Status

**Baseline Review**:
- Files reviewed: 72
- Total issues: 775
- Critical issues: 34 (security)
- Average score: 73.3/100

**Top Issues**:
- Security: 34 critical (path traversal, shell injection, secrets)
- Performance: 67 high (sync I/O, sequential async)
- Quality: 373 medium (any types, missing docs)
- Error handling: 123 (throw statements, empty catch)

## 🎯 Quick Start: Fix Critical Issues

### Step 1: Review Critical Issues

```bash
npm run review | grep -A 5 "Critical Issues"
```

### Step 2: Fix Each Issue with Cursor

**Open file in Cursor, use this prompt**:

```markdown
"Review [file] for security vulnerabilities.
The code review tool found [specific issue] at line [N].
Fix this issue following code_review.mdc security patterns.
Review the file in isolation (no context of other files)."
```

**Example**:
```markdown
"Review src/core/config.ts for security vulnerabilities.
The code review tool found potential path traversal at line 45.
Fix this issue following code_review.mdc security patterns.
Use context.paths.resolveAllowed() for safe path resolution."
```

### Step 3: Verify Fix

```bash
npm run review [file]
# Check score improved
```

## 🔄 Systematic Improvement Workflow

### Daily (5 min)

```bash
# Review changed files
git diff --name-only | grep '\.ts$' | xargs npm run review
```

### Weekly (30 min)

```bash
# 1. Review new code
git log --since="1 week ago" --name-only --pretty=format: | sort -u | grep '\.ts$' | xargs npm run review

# 2. Fix critical issues
npm run review | grep -A 10 "Critical Issues"

# 3. Improve one low-scoring file
npm run review | grep "Score: [0-6][0-9]" | head -1
# Open file, review with Cursor, fix
```

### Monthly (2 hours)

```bash
# 1. Full review
npm run review > reviews/$(date +%Y%m%d).txt

# 2. Compare progress
diff reviews/20250101.txt reviews/20250201.txt

# 3. Fix all critical issues
# 4. Improve top 10 files
```

## 🎨 Cursor Prompts for Review

### Isolated Review (Recommended)

```markdown
"Review [file] systematically using code_review.mdc checklist.
Review it as if you have NO knowledge of other files in the codebase.
This ensures we catch issues that rely on implicit context.

Check each category:
1. Security: Path validation, command validation, secrets
2. Performance: Sync I/O, sequential async, regex
3. Quality: Type safety, naming, complexity
4. Error Handling: Throw statements, empty catch
5. Testing: Missing tests
6. Documentation: Missing JSDoc

For each issue:
- Line number
- Explanation
- Specific fix
- Code example"
```

### Fix Issues

```markdown
"Fix all issues found in the review of [file].
Apply fixes following code_review.mdc patterns.
Maintain existing functionality."
```

### Category-Focused

```markdown
"Review [file] specifically for [security/performance/quality] issues.
Provide detailed analysis with line numbers and fixes."
```

## 📈 Measuring Progress

### Track Scores

```bash
# Save review
npm run review > reviews/$(date +%Y%m%d).txt

# Extract metrics
grep "Average score" reviews/*.txt
grep "Critical issues" reviews/*.txt
```

### Goals

- **Week 1**: Fix all 34 critical issues
- **Week 2-4**: Improve average score 73 → 80+
- **Month 2**: Maintain 80+ with 0 critical issues

## 🛠️ Commands

```bash
npm run review          # Review entire codebase
npm run review src/     # Review directory
npm run review file.ts   # Review single file
npm run review:fix       # Auto-fix simple issues (experimental)
```

## 📚 Full Guides

- **Complete Strategy**: `docs/CONTINUOUS_IMPROVEMENT.md`
- **Cursor Prompts**: `docs/CURSOR_IMPROVEMENT_STRATEGY.md`
- **Code Review Rules**: `.cursor/rules/code_review.mdc`

## 🎯 Priority Order

1. **Critical Security** (34 issues) - Fix first!
2. **High Performance** (67 issues) - Fix next
3. **High Error Handling** (27 issues) - Then these
4. **Medium Quality** (373 issues) - Improve over time
5. **Documentation** (141 issues) - Add as you go

**Start with critical security issues today!** 🔒

