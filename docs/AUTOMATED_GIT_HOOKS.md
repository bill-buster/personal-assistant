# Automated Git Hooks

## ✅ What's Set Up

### Pre-Commit Hook (`.husky/pre-commit`)

**Runs automatically** when you run `git commit`:

1. **Cleanup** - Removes generated test files
2. **Auto-fix** - Fixes formatting and linting issues
3. **Format check** - Verifies formatting is correct
4. **Lint check** - Verifies no linting errors
5. **Type check** - Verifies TypeScript compiles

**If any check fails**, the commit is blocked and you'll see what needs to be fixed.

### Pre-Push Hook (`.husky/pre-push`)

**Runs automatically** when you run `git push`:

- **Full preflight** - Runs all checks including build, leak check, and smoke test

**If checks fail**, the push is blocked.

## How It Works

### Automatic Behavior

```bash
# When you commit
git commit -m "feat: new feature"

# Hook automatically runs:
# ✅ Cleanup generated files
# ✅ Fix formatting/linting
# ✅ Check everything
# ✅ Commit proceeds if all pass
```

### If Checks Fail

```bash
git commit -m "feat: new feature"

# Hook runs and finds issues:
# ❌ Formatting issues found
#
# You'll see:
# - What failed
# - How to fix it
# - Commit is blocked until fixed
```

## Manual Override

If you need to skip hooks (not recommended):

```bash
# Skip pre-commit hook
git commit --no-verify -m "message"

# Skip pre-push hook
git push --no-verify
```

## What Gets Fixed Automatically

### Pre-Commit Hook Fixes

- ✅ Removes generated test files (`test_tool*.ts`, etc.)
- ✅ Fixes ESLint errors (where possible)
- ✅ Formats code with Prettier
- ✅ Checks TypeScript types

### What You Still Need to Fix Manually

- ❌ Type errors (need code changes)
- ❌ Logic errors (need code changes)
- ❌ Test failures (need test fixes)

## Workflow

### Normal Workflow

```bash
# 1. Make changes
# ... edit files ...

# 2. Stage files
git add src/tools/my_tool.ts

# 3. Commit (hook runs automatically)
git commit -m "feat: add new tool"

# Hook automatically:
# - Cleans up generated files
# - Fixes formatting
# - Checks everything
# - Commits if all pass
```

### If Hook Fails

```bash
git commit -m "feat: new feature"

# Hook fails with:
# ❌ Type errors found

# 1. Fix the errors
# ... edit code ...

# 2. Try again
git commit -m "feat: new feature"

# Hook passes ✅
```

## Configuration

### Hook Files

- `.husky/pre-commit` - Runs before commit
- `.husky/pre-push` - Runs before push

### Setup

Hooks are installed via `husky` (runs on `npm install`).

To reinstall:

```bash
npm run prepare
```

## Benefits

### ✅ Automatic

- No need to remember to run cleanup
- No need to remember to fix formatting
- No need to remember to check types

### ✅ Consistent

- Everyone gets the same checks
- Prevents bad commits from entering repo
- Ensures code quality

### ✅ Fast

- Only runs on changed files (via lint-staged)
- Fails fast if issues found
- Doesn't slow down workflow

## Troubleshooting

### Hook Not Running

```bash
# Reinstall hooks
npm run prepare

# Check hook exists
ls -la .husky/pre-commit
```

### Hook Too Slow

The hook is designed to be fast:

- Cleanup: < 1s
- Fix: < 5s
- Checks: < 10s

If it's slow, check:

- Large number of files changed
- TypeScript compilation issues
- Network issues (if checking remote)

### Hook Blocks Everything

If hook is too strict:

1. Fix the issues (recommended)
2. Use `--no-verify` (not recommended)

## Integration

- **Husky**: Git hooks manager
- **lint-staged**: Only runs on staged files (if configured)
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **TypeScript**: Type checking

## Status

✅ **Pre-commit hook**: Active
✅ **Pre-push hook**: Active
✅ **Auto-cleanup**: Enabled
✅ **Auto-fix**: Enabled

**Everything runs automatically!** 🎉
