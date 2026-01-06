**Status**: Reference-only  
**Canonical**: [docs/HOW_WE_WORK.md](HOW_WE_WORK.md) for current workflow, `.cursor/rules/workflow.mdc` for workflow patterns

---

# Automation Opportunities

*This document is kept for historical reference. Current workflow information is in [HOW_WE_WORK.md](HOW_WE_WORK.md) and `.cursor/rules/workflow.mdc`.*

## ✅ Already Automated

### 1. Code Formatting & Linting
- ✅ **Format on Save** - Auto-formats TypeScript files with Prettier
- ✅ **ESLint Auto-fix** - Fixes linting issues on save
- ✅ **Pre-commit Hook** - Auto-fixes formatting/linting before commit
- ✅ **Pre-push Hook** - Runs full preflight checks before push

### 2. Build Automation
- ✅ **Auto-build on Folder Open** - `build:watch` runs automatically when workspace opens
- ✅ **Watch Mode** - Continuous TypeScript compilation
- ✅ **Hot Reload** - REPL and web dashboard auto-reload on changes

### 3. Testing Automation
- ✅ **Test Caching** - Tests skip automatically if unchanged
- ✅ **Parallel Execution** - Tests run in parallel (4 workers)
- ✅ **Test Watch Mode** - Auto-rerun tests on file changes

### 4. Git Hooks
- ✅ **Pre-commit** - Cleanup, auto-fix, format check, lint check, type check
- ✅ **Pre-push** - Full preflight (build, leak check, smoke test)

### 5. Cursor/VS Code Integration
- ✅ **Custom Commands** - 10 reusable commands (`.cursor/commands/`)
- ✅ **Role Packs** - AI role definitions for consistent behavior
- ✅ **Auto-run Tasks** - Build watch runs on folder open

---

## 🚀 New Automation Opportunities

### High Priority (Do First)

#### 1. Auto-Run Tests on File Save ⚡⚡⚡

**What**: Automatically run relevant tests when you save a file

**Impact**: Catch bugs immediately, no need to manually run tests

**Setup**:

Add to `.vscode/settings.json`:

```json
{
  // Auto-run tests on save for test files
  "files.watcherExclude": {
    "**/dist/**": true,
    "**/coverage/**": true,
    "**/node_modules/**": true
  },
  
  // Run tests automatically when test files are saved
  "typescript.preferences.includePackageJsonAutoImports": "on",
  
  // Task to run tests for current file
  "task.autoDetect": "on"
}
```

Add to `.vscode/tasks.json`:

```json
{
  "label": "test:current",
  "type": "shell",
  "command": "npm run test:single -- ${fileBasenameNoExtension}",
  "problemMatcher": [],
  "runOptions": {
    "runOn": "default"
  }
}
```

**Alternative**: Use VS Code extension like "Jest" or "Test Explorer" for better integration.

**Impact**: High - Immediate feedback on test failures

---

#### 2. GitHub Actions CI/CD ⚡⚡⚡

**What**: Automatically run tests, build, and checks on every push/PR

**Impact**: Catch issues before merge, ensure code quality

**Setup**:

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Build
        run: npm run build
      
      - name: Test
        run: npm test
      
      - name: Coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

**Additional Workflows**:

- **`.github/workflows/release.yml`** - Auto-release on version tags
- **`.github/workflows/dependency-review.yml`** - Security scanning
- **`.github/workflows/codeql.yml`** - Code security analysis

**Impact**: Very High - Prevents broken code from merging

---

#### 3. Dependabot for Dependency Updates ⚡⚡

**What**: Automatically create PRs for dependency updates

**Impact**: Keep dependencies up-to-date, security patches

**Setup**:

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "jwalinshah"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore"
      include: "scope"
  
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Impact**: High - Automatic security updates, less maintenance

---

#### 4. Auto-Generate Changelog on Release ⚡⚡

**What**: Automatically generate changelog from commits

**Impact**: No manual changelog maintenance

**Setup**:

Already configured with `semantic-release`! Just ensure `.releaserc.json` exists:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git"
  ]
}
```

**Usage**: Just commit with conventional commits, release happens automatically.

**Impact**: Medium - Saves time on releases

---

#### 5. Auto-TypeCheck on File Save ⚡

**What**: Show TypeScript errors immediately as you type

**Impact**: Faster feedback, catch errors before commit

**Setup**:

Already enabled! VS Code TypeScript extension does this automatically.

**Enhancement**: Add to `.vscode/settings.json`:

```json
{
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": ["**/node_modules", "**/dist"]
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true
}
```

**Impact**: Medium - Already working, just optimize

---

### Medium Priority

#### 6. Auto-Run Linter on File Save ⚡

**What**: Show linting errors immediately

**Impact**: Catch style issues before commit

**Status**: ✅ Already enabled via `editor.codeActionsOnSave`

**Enhancement**: Add real-time linting:

```json
{
  "eslint.validate": ["javascript", "typescript"],
  "eslint.lintTask.enable": true,
  "eslint.run": "onType"
}
```

**Impact**: Low - Already working well

---

#### 7. Auto-Organize Imports on Save ⚡

**What**: Automatically organize and remove unused imports

**Impact**: Cleaner code, fewer merge conflicts

**Setup**:

Add to `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  }
}
```

**Impact**: Medium - Cleaner imports automatically

---

#### 8. Auto-Update Documentation ⚡

**What**: Automatically update API docs when code changes

**Impact**: Documentation stays in sync

**Setup**:

Add to `.vscode/tasks.json`:

```json
{
  "label": "docs:api:watch",
  "type": "shell",
  "command": "npm run docs:api",
  "problemMatcher": [],
  "runOptions": {
    "runOn": "folderOpen"
  },
  "isBackground": true
}
```

Or use a file watcher to regenerate docs on changes.

**Impact**: Low - Nice to have, but manual is fine

---

#### 9. Auto-Cleanup Generated Files ⚡

**What**: Automatically remove generated test files

**Impact**: Cleaner repo, no accidental commits

**Status**: ✅ Already in pre-commit hook

**Enhancement**: Add file watcher to clean up immediately:

Create `.vscode/tasks.json` entry:

```json
{
  "label": "cleanup:watch",
  "type": "shell",
  "command": "npm run cleanup",
  "problemMatcher": [],
  "runOptions": {
    "runOn": "folderOpen"
  },
  "isBackground": true
}
```

**Impact**: Low - Pre-commit hook is sufficient

---

#### 10. Auto-Sync Package Versions ⚡

**What**: Keep package.json and package-lock.json in sync

**Impact**: Prevent version conflicts

**Setup**:

Add to `.vscode/settings.json`:

```json
{
  "npm.enableScriptExplorer": true,
  "npm.packageManager": "npm"
}
```

Or use `npm ci` in CI/CD (already recommended).

**Impact**: Low - Manual `npm install` is fine

---

### Low Priority (Nice to Have)

#### 11. Auto-Generate Test Files ⚡

**What**: Automatically create test file when creating new source file

**Impact**: Encourages test writing

**Setup**: Use Cursor custom command `/jules_test` or create template.

**Impact**: Low - Manual creation is fine

---

#### 12. Auto-Format Markdown Files ⚡

**What**: Format markdown files on save

**Impact**: Consistent documentation formatting

**Setup**:

Add to `.vscode/settings.json`:

```json
{
  "[markdown]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.wordWrap": "on"
  }
}
```

**Impact**: Low - Nice to have

---

#### 13. Auto-Update Version Numbers ⚡

**What**: Automatically bump version on release

**Impact**: No manual version management

**Status**: ✅ Already handled by `semantic-release`

**Impact**: Low - Already automated

---

#### 14. Auto-Run Performance Benchmarks ⚡

**What**: Run benchmarks on every commit

**Impact**: Catch performance regressions

**Setup**: Add to CI/CD workflow or pre-push hook.

**Impact**: Low - Manual is fine for now

---

## 🎯 Recommended Implementation Order

### Phase 1: Immediate (This Week)
1. ✅ **GitHub Actions CI/CD** - Set up basic CI workflow
2. ✅ **Dependabot** - Enable automatic dependency updates
3. ✅ **Auto-organize imports** - Add to settings.json

### Phase 2: Short Term (This Month)
4. ✅ **Auto-run tests on save** - Configure test watcher
5. ✅ **Enhanced TypeScript settings** - Optimize TS server
6. ✅ **Auto-format markdown** - Enable for docs

### Phase 3: Long Term (Future)
7. ✅ **Auto-generate docs** - Set up doc watcher
8. ✅ **Performance benchmarks** - Add to CI/CD
9. ✅ **Advanced test automation** - Test Explorer integration

---

## 📋 Quick Setup Checklist

### GitHub Actions CI/CD
- [ ] Create `.github/workflows/ci.yml`
- [ ] Test workflow on a branch
- [ ] Add status badge to README

### Dependabot
- [ ] Create `.github/dependabot.yml`
- [ ] Configure update schedule
- [ ] Set up PR labels

### VS Code Settings
- [ ] Add `source.organizeImports` to codeActionsOnSave
- [ ] Enable markdown formatting
- [ ] Optimize TypeScript settings

### Test Automation
- [ ] Configure test watcher (optional)
- [ ] Set up test explorer (optional)
- [ ] Add test:current task

---

## 🔧 Implementation Examples

### Example: GitHub Actions CI

See `.github/workflows/ci.yml.example` (create this file):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npm run test:coverage
```

### Example: Enhanced VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "[markdown]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

---

## 📊 Impact Summary

| Automation | Priority | Impact | Effort | Status |
|------------|----------|--------|--------|--------|
| GitHub Actions CI/CD | ⚡⚡⚡ | Very High | Medium | ❌ Not set up |
| Dependabot | ⚡⚡ | High | Low | ❌ Not set up |
| Auto-organize imports | ⚡⚡ | Medium | Low | ❌ Not set up |
| Auto-run tests on save | ⚡⚡ | High | Medium | ❌ Not set up |
| Auto-format markdown | ⚡ | Low | Low | ❌ Not set up |
| Format on save | ✅ | High | Done | ✅ Done |
| ESLint auto-fix | ✅ | High | Done | ✅ Done |
| Pre-commit hooks | ✅ | High | Done | ✅ Done |
| Build watch | ✅ | High | Done | ✅ Done |
| Test caching | ✅ | High | Done | ✅ Done |

---

## 🎉 Next Steps

1. **Set up GitHub Actions** - Start with basic CI workflow
2. **Enable Dependabot** - Automatic dependency updates
3. **Enhance VS Code settings** - Auto-organize imports, markdown formatting
4. **Configure test watcher** - Optional, but nice for TDD workflow

**Total Estimated Time**: 2-3 hours for high-priority items

**Expected Impact**: 
- Catch bugs before merge (CI/CD)
- Keep dependencies updated (Dependabot)
- Cleaner code (auto-organize imports)
- Faster feedback (test watcher)

---

## 📚 Related Documentation

- [Git Workflow](./GIT_WORKFLOW.md) - Git hooks and automation
- [Cursor Optimization Guide](./CURSOR_OPTIMIZATION_GUIDE.md) - Cursor-specific automation
- [10x Improvements](./10X_IMPROVEMENTS.md) - Performance optimizations
- [Contributing Guide](../CONTRIBUTING.md) - Development workflow

