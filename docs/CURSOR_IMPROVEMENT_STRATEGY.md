# Cursor AI Improvement Strategy

## How to Make Your Codebase Insane (In a Good Way)

This guide shows you how to leverage Cursor AI to continuously improve your codebase, making it better with each iteration.

## Core Strategy

**Systematic Review → AI-Powered Fixes → Measure Progress → Repeat**

### The Loop

```
1. Review codebase systematically (no context)
   ↓
2. Identify issues (automated + AI)
   ↓
3. Fix issues with Cursor (AI-assisted)
   ↓
4. Measure improvement (scores, coverage)
   ↓
5. Repeat (continuous improvement)
```

## Step-by-Step Workflow

### 1. Initial Review

**Goal**: Establish baseline, find all issues

```bash
# Review entire codebase
npm run review > review-baseline.txt

# See summary
cat review-baseline.txt | head -30
```

**What you'll get**:

- Files reviewed
- Total issues by category
- Critical issues list
- Average score

### 2. Fix Critical Issues First

**Priority**: Security > Performance > Quality

**For each critical issue**:

```markdown
# Open file in Cursor

# Use this prompt:

"Review [file] for [issue_type] issues.
The code review tool found: [specific issue]
Fix this issue following the patterns in code_review.mdc.
Review the file in isolation (no context of other files)."
```

**Example**:

```markdown
"Review src/tools/file_tools.ts for security issues.
The code review tool found: Potential path traversal at line 45.
Fix this issue following the patterns in code_review.mdc.
Use context.paths.resolveAllowed() for safe path resolution."
```

### 3. Systematic File-by-File Review

**Goal**: Improve each file to 80+ score

**Workflow**:

```bash
# 1. Get files sorted by score (lowest first)
npm run review | grep "Score:" | sort -t: -k2 -n

# 2. For each low-scoring file:
#    Open in Cursor
#    Use systematic review prompt
```

**Cursor Prompt**:

```markdown
"Review [file] systematically using code_review.mdc checklist.
Review it as if you have NO knowledge of other files in the codebase.
This ensures we catch issues that rely on implicit context.

Check each category:

1. Security: Path validation, command validation, secrets
2. Performance: Sync I/O, sequential async, regex compilation
3. Quality: Type safety, naming, complexity, unused code
4. Error Handling: Throw statements, empty catch, error context
5. Testing: Missing tests, test quality
6. Documentation: Missing JSDoc, unclear comments

For each issue found:

- Provide line number
- Explain the issue
- Suggest specific fix
- Show code example

Prioritize by severity (critical > high > medium > low)."
```

### 4. Fix Issues with Cursor

**After review, fix issues**:

```markdown
"Fix all issues found in the review of [file].
Apply fixes following code_review.mdc patterns.
Maintain existing functionality.
Ensure all fixes are correct."
```

**Or fix individually**:

```markdown
"Fix [specific issue] at line [N] in [file].
Use the pattern from code_review.mdc:
[pattern example]
Ensure the fix is correct and tested."
```

### 5. Verify Improvements

```bash
# Re-run review
npm run review [file]

# Check score improved
# Fix remaining issues
# Repeat until score > 80
```

## Advanced Patterns

### Pattern 1: Isolated Review (Best for Systematic Review)

**Why**: Reviews file without context bias, catches implicit dependencies

```markdown
"Review [file] in complete isolation.
Pretend you have NO knowledge of:

- Other files in the codebase
- How other modules work
- Implicit conventions

Review it as if it's the first time you've seen it.
This will help catch:

- Missing documentation
- Implicit dependencies
- Unclear code
- Missing error handling

Use code_review.mdc checklist."
```

### Pattern 2: Category Deep Dive

**Why**: Focused improvement in specific areas

```markdown
"Review [file] specifically for [category]:

- Security vulnerabilities
- Performance bottlenecks
- Type safety issues
- Error handling patterns
- Test coverage gaps

Provide detailed analysis with:

- Specific line numbers
- Code examples
- Impact assessment
- Prioritized fixes"
```

### Pattern 3: Pattern Consistency

**Why**: Ensures consistency across codebase

```markdown
"Compare [file1] and [file2] for consistency:

- Do they follow the same error handling patterns?
- Do they use the same validation approach?
- Are naming conventions consistent?
- Are they structured similarly?

Identify inconsistencies and suggest how to standardize.
Prefer the better pattern and apply it to both."
```

### Pattern 4: Architecture Review

**Why**: High-level improvements

```markdown
"Review the architecture of [directory]:

- Are responsibilities clear?
- Is coupling low?
- Is cohesion high?
- Are there circular dependencies?
- Can we simplify?

Suggest architectural improvements.
Prioritize by impact and effort."
```

## Continuous Improvement Cycles

### Daily (5 minutes)

```bash
# Review changed files
git diff --name-only | grep '\.ts$' | xargs npm run review
```

### Weekly (30 minutes)

```bash
# 1. Review new code
git log --since="1 week ago" --name-only --pretty=format: | sort -u | grep '\.ts$' | xargs npm run review

# 2. Fix critical issues
npm run review | grep -A 5 "Critical Issues"

# 3. Improve one low-scoring file
npm run review | grep "Score: [0-6][0-9]" | head -1
# Open file, review with Cursor, fix issues
```

### Monthly (2 hours)

```bash
# 1. Full codebase review
npm run review > reviews/$(date +%Y%m%d).txt

# 2. Compare with previous month
diff reviews/20250101.txt reviews/20250201.txt

# 3. Fix all critical issues
# 4. Improve top 10 lowest-scoring files
# 5. Update patterns based on learnings
```

## Cursor Prompts Library

### Review Prompts

```markdown
# Basic review

"Review [file] using code_review.mdc checklist"

# Isolated review (recommended)

"Review [file] in isolation (no context of other files) using code_review.mdc"

# Security-focused

"Review [file] for security vulnerabilities. Check for path traversal, shell injection, secrets in logs."

# Performance-focused

"Review [file] for performance issues. Check for sync I/O, sequential async, regex compilation."

# Quality-focused

"Review [file] for code quality. Check types, naming, complexity, documentation."
```

### Fix Prompts

```markdown
# Fix specific issue

"Fix [issue] at line [N] in [file] using code_review.mdc patterns"

# Fix all issues

"Fix all code review issues in [file]. Apply fixes from code_review.mdc"

# Fix category

"Fix all [security/performance/quality] issues in [file]"
```

### Improvement Prompts

```markdown
# Suggest improvements

"What are 5 ways to improve [file]? Prioritize by impact."

# Refactor

"Refactor [file] to improve type safety, error handling, and readability"

# Simplify

"How can [file] be simplified? What can be removed?"

# Extract patterns

"What patterns can be extracted from [file]? How can we reuse them?"
```

## Measuring Success

### Key Metrics

1. **Review Score**: Average file score (target: 80+)
2. **Critical Issues**: Count (target: 0)
3. **Test Coverage**: Percentage (target: 80%+)
4. **Documentation**: Percentage with JSDoc (target: 100%)

### Tracking

```bash
# Save reviews
mkdir -p reviews
npm run review > reviews/$(date +%Y%m%d).txt

# Extract metrics
grep "Average score" reviews/*.txt
grep "Critical issues" reviews/*.txt
```

### Goals

**Week 1**: Fix all critical issues
**Week 2-4**: Improve average score by 5 points
**Month 2**: Reach 80+ average score
**Month 3**: Maintain 80+ with 0 critical issues

## Pro Tips

### 1. Review in Isolation

**Why**: Catches issues that rely on "magic" context
**How**: Tell Cursor "Review this file as if you have no knowledge of other files"

### 2. Fix Immediately

**Why**: Prevents accumulation of technical debt
**How**: Fix issues as you find them, don't defer

### 3. Measure Progress

**Why**: Shows improvement over time
**How**: Save reviews, compare scores monthly

### 4. Use Systematic Approach

**Why**: Ensures nothing is missed
**How**: Use code_review.mdc checklist every time

### 5. Prioritize by Impact

**Why**: Maximizes improvement per effort
**How**: Fix critical > high > medium > low severity

## Example: Improving a File

### Before

```bash
npm run review src/tools/file_tools.ts
# Score: 65/100
# Issues: 12 (2 critical, 4 high, 6 medium)
```

### Review with Cursor

```markdown
"Review src/tools/file_tools.ts in isolation using code_review.mdc.
Review it as if you have no knowledge of other files.
Check all categories and provide specific fixes."
```

### Fix Issues

```markdown
"Fix all issues found in the review.
Apply fixes following code_review.mdc patterns.
Ensure all fixes are correct."
```

### After

```bash
npm run review src/tools/file_tools.ts
# Score: 85/100
# Issues: 2 (0 critical, 0 high, 2 medium)
```

### Verify

```bash
npm test
npm run preflight
```

## Applying to Other Projects

### 1. Copy Tools

```bash
# Copy review tools
cp src/scripts/code_review.ts [other-project]/scripts/
cp src/scripts/code_review_fix.ts [other-project]/scripts/

# Copy Cursor rules
cp .cursor/rules/code_review.mdc [other-project]/.cursor/rules/
```

### 2. Adapt Checklist

**Update `code_review.mdc`** for project-specific patterns:

- Language-specific issues
- Framework-specific patterns
- Project conventions

### 3. Set Up Workflow

```bash
# Add npm scripts
npm run review
npm run review:fix

# Set up weekly reviews
# Track progress
```

## Conclusion

**The Secret**:

1. Review systematically (no context)
2. Fix with Cursor (AI-powered)
3. Measure progress (track scores)
4. Repeat (continuous improvement)

**Result**: Codebase that gets better every week! 🚀

Start with one file today, fix issues, measure improvement, repeat tomorrow.
