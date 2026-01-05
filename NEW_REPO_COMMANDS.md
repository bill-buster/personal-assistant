# New Repo Commands

Commands to initialize this as an independent git repository.

## Option 1: Fresh Start (Recommended)

If you don't need history from the parent monorepo:

```bash
cd personal-assistant

# Initialize new git repo
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Personal Assistant extracted from monorepo

- CLI, REPL, and web dashboard
- Multi-stage routing (regex → heuristic → LLM fallback)
- Tools: memory, tasks, reminders, file ops, git (read-only)
- Providers: Groq, OpenRouter, Mock
- Runtime validation with Zod
- Comprehensive test suite"

# Optional: Create main branch
git branch -M main
```

## Option 2: Preserve History (Advanced)

If you want to keep git history from the parent monorepo:

### Using git filter-repo (Recommended)

```bash
# From the parent monorepo root
cd /path/to/monorepo

# Clone to a new location
git clone . ../personal-assistant-with-history
cd ../personal-assistant-with-history

# Install git-filter-repo if needed
# pip install git-filter-repo

# Filter to only packages/personal-assistant/
git filter-repo --subdirectory-filter packages/personal-assistant/

# Rename branch
git branch -M main
```

### Using git subtree split

```bash
# From the parent monorepo root
git subtree split -P packages/personal-assistant -b personal-assistant-branch

# Create new repo
mkdir ../personal-assistant-with-history
cd ../personal-assistant-with-history
git init
git pull /path/to/monorepo personal-assistant-branch
```

**Note:** These commands modify history. Do NOT run them in the original monorepo if you want to preserve it.

## Verification

After initializing:

```bash
# Build
npm install
npm run build

# Run smoke test
./scripts/smoke-test.sh

# Run full tests
npm test

# CLI works
./dist/app/cli.js --help
./dist/app/cli.js demo
```

## Remote Setup

```bash
# Add remote (GitHub example)
git remote add origin git@github.com:username/personal-assistant.git

# Push
git push -u origin main
```

## CI/CD (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm run lint
    - run: npm test
```

