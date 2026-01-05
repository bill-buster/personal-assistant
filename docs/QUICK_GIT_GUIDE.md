# Quick Git Guide

## 🚀 Automatic (Recommended)

**Git hooks run automatically** when you commit:

```bash
git commit -m "feat: description"
```

The pre-commit hook automatically:

1. ✅ Cleans up generated files
2. ✅ Fixes formatting/linting
3. ✅ Checks everything
4. ✅ Commits if all pass

**No manual steps needed!** 🎉

## 🔧 Manual (If Needed)

**If hooks are disabled or you want to run manually**:

```bash
npm run cleanup && npm run fix && npm run preflight
```

This will:

1. ✅ Clean up generated test files
2. ✅ Auto-fix formatting and linting
3. ✅ Run all preflight checks

## 📋 Step-by-Step

### 1. Check What Changed

```bash
git status
```

### 2. Clean Up Generated Files

```bash
npm run cleanup
```

Removes:

- `test_tool*.ts`
- `e2e_test*.ts`
- `TestTool*.ts`

### 3. Fix Formatting & Linting

```bash
npm run fix
```

Auto-fixes:

- ESLint errors
- Prettier formatting

### 4. Verify Everything

```bash
npm run preflight
```

Runs:

- Format check
- Lint check
- Type check
- Build
- Leak check
- Smoke test

### 5. Commit

```bash
git add <files>
git commit -m "feat: description"
```

## 🎯 Common Commands

```bash
# Fix everything
npm run fix

# Format all files
npm run format:all

# Check without fixing
npm run check

# Clean up
npm run cleanup
```

## 📝 Commit Message Format

```
<type>(<scope>): <subject>
```

**Examples**:

- `feat(tools): add generate tests command`
- `fix(router): handle empty queries`
- `docs: update git workflow`
- `test(executor): add permission tests`

## ❌ What NOT to Commit

These are auto-ignored (in `.gitignore`):

- Generated test files (`test_tool*.ts`, `e2e_test*.ts`)
- Build artifacts (`dist/`)
- Test artifacts (`coverage/`, `.test-results/`)
- Runtime data (`*.jsonl`, `.assistant-data/`)

## ✅ What TO Commit

- Source code (`src/**/*.ts`)
- Documentation (`docs/**/*.md`)
- Configuration (`package.json`, `.prettierrc`)
- Cursor rules (`.cursor/rules/**/*.mdc`)
- Scripts (`scripts/**/*.sh`)

## 🔧 Troubleshooting

### "Too many files"

```bash
npm run cleanup
git status
```

### "Formatting errors"

```bash
npm run fix
```

### "Preflight fails"

```bash
npm run fix
npm run preflight
```

## 📚 More Info

- **Full Guide**: `docs/GIT_WORKFLOW.md`
- **Cursor Rules**: `.cursor/rules/git.mdc`
- **Setup Summary**: `docs/GIT_SETUP_SUMMARY.md`
