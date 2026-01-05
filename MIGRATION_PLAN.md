# Migration Plan: Personal Assistant Extraction

> **Purpose:** Document what will be migrated from the current monorepo into a standalone personal-assistant repo.  
> **Created:** 2026-01-05  
> **Status:** GROUND TRUTH — Follow this document exactly; do not expand scope.

## Executive Summary

We are extracting the personal assistant code from `/packages/personal-assistant/` into a new standalone repo at `/personal-assistant/`. The orchestration layer (`/packages/workflow-engine/`, multi-agent handoff system) will be left behind.

---

## What Will Be Migrated

### Core Source (`packages/personal-assistant/src/` → `personal-assistant/src/`)

| Directory/File | Description | Notes |
|----------------|-------------|-------|
| `core/` | Config, executor, types, validation, tool registry | Foundation layer |
| `app/cli.ts` | CLI entrypoint | Main user interface |
| `app/repl.ts` | Interactive REPL | Session management |
| `app/router.ts` | Intent routing | Heuristic + LLM fallback |
| `app/executor.ts` | Tool execution wrapper | Thin adapter |
| `app/web/` | Web dashboard server | **Included in v1** (see Web Dashboard section) |
| `agents/` | Agent definitions (System, Supervisor, Coder, Organizer, Assistant) | Role-based tool access |
| `parsers/` | Heuristic, task, memory parsers | NLP patterns |
| `providers/llm/` | LLM provider interface + adapters | Groq, OpenRouter, Mock |
| `storage/` | JSONL, memory store | Persistence layer |
| `runtime/` | Composition root, bootstrap | Dependency wiring |
| `tools/` | All tool implementations | File, memory, task, git, etc. |
| `dispatcher.ts` | Intent-based auto-dispatch | Fast-path routing |
| `evals/` | Evaluation datasets | Keep for quality assurance |

### Tests (`packages/personal-assistant/src/*.test.ts` → `personal-assistant/src/*.test.ts`)

All test files colocated with source:
- `executor.test.ts`
- `router.test.ts`
- `permissions.test.ts`
- `memory_store.test.ts`
- `jsonl_*.test.ts`
- `calendar.test.ts`, `contacts.test.ts`, etc.
- `run_tests.ts` (test runner)

### Configuration & Build

| File | Notes |
|------|-------|
| `package.json` | New standalone package (no `@repo/` scope, no `workspace:*`) |
| `tsconfig.json` | Self-contained, no TS paths to sibling packages |
| `eslint.config.mjs` | Copied from root |

---

## What Will Be Left Behind

### Orchestration Layer (DO NOT MIGRATE)

| Path | Reason |
|------|--------|
| `packages/workflow-engine/` | Multi-agent orchestration scripts |
| `AGENTS.md` | Orchestrator rules for agent handoffs |
| `HANDOFF.md` | Ephemeral handoff file |
| `HANDOFF_OUT/` | Archived handoffs |
| `REVIEW_FEEDBACK.md` | Review agent output |
| `tests/` (root) | Orchestrator smoke tests |
| `docs/AGENT_CHAIN.md` | Orchestrator workflow guide |
| `docs/MULTI_AGENT_WORKFLOW.md` | Orchestrator protocol |

### Root-Level Files (DO NOT MIGRATE)

| Path | Reason |
|------|--------|
| `AGENT_LOG.md` | Orchestrator logs |
| `STATUS.md` | Monorepo health status |
| `test_retry_logic.sh` | Orchestrator test |
| `docs/historical/` | Historical design docs for orchestrator |

### Cut Line Rule

> **If a file is referenced by `packages/personal-assistant/` runtime or tests, it MUST be migrated even if it feels "orchestrator-ish," unless we explicitly replace the dependency.**

---

## Data Directory Policy

### ❌ DO NOT use `data/` inside the repo as default

Having `personal-assistant/data/` increases risk of "root-ish leakage" and accidental commits.

### ✅ Use configurable data directory

| Variable | Default | Description |
|----------|---------|-------------|
| `ASSISTANT_BASE_DIR` | `~` (home) | Base directory for all assistant data |
| Data location | `<baseDir>/.assistant-data/` | Derived; never inside repo by default |

**For development only:** Set `ASSISTANT_BASE_DIR=.` to use `./.assistant-data/` inside repo (gitignored).

### Config Resolution Order

1. `ASSISTANT_DATA_DIR` env var (explicit override)
2. `ASSISTANT_BASE_DIR` + `/.assistant-data/`
3. `~/.assistant-data/` (fallback)

---

## Web Dashboard Decision

**Status:** Included in v1

The web dashboard (`app/web/`) will be migrated fully:
- `npm run web` starts the dashboard
- Dashboard shares the same runtime/executor as CLI
- If issues arise, we can stub it out in v1.1

---

## Provider Architecture (Interfaces + Adapters)

To enable future provider swaps, use explicit separation:

```
src/
├── llm/
│   ├── ChatModel.ts              # Interface
│   └── providers/
│       ├── groq.ts               # Adapter
│       ├── openrouter.ts         # Adapter
│       └── mock.ts               # Adapter (testing)
└── embeddings/
    ├── EmbeddingModel.ts         # Interface
    └── providers/
        └── openrouter.ts         # Adapter
```

This keeps the rest of the code unaware of Groq/OpenRouter specifics.

---

## Target Repo Structure

```
personal-assistant/
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── .gitignore
├── README.md
├── MIGRATION_PLAN.md
├── src/
│   ├── app/
│   │   ├── cli.ts
│   │   ├── repl.ts
│   │   ├── router.ts
│   │   ├── executor.ts
│   │   └── web/
│   ├── core/
│   │   ├── config.ts
│   │   ├── executor.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   └── ...
│   ├── agents/
│   ├── parsers/
│   ├── llm/
│   │   ├── ChatModel.ts          # Interface
│   │   └── providers/
│   ├── embeddings/
│   │   ├── EmbeddingModel.ts     # Interface
│   │   └── providers/
│   ├── storage/
│   ├── runtime/
│   ├── tools/
│   ├── evals/
│   └── *.test.ts
├── docs/
│   ├── STACK_DECISION.md
│   ├── ARCHITECTURE.md
│   └── QUICKSTART.md
├── scripts/
│   └── smoke-test.sh
└── .assistant-data/
    └── (gitignored, created at runtime)
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path breakage | Build failure | Search/replace all `../..` imports; run tsc |
| Missing dependencies | Runtime crash | Copy exact deps from source package.json |
| Root leakage regression | Data in wrong location | Enhanced smoke test (see below) |
| Config path divergence | Confusion | Use same `~/.assistant/` for config, `~/.assistant-data/` for data |
| Test failures post-migration | Unknown state | Run full test suite before/after |
| Workspace deps / TS path aliases | Build fails standalone | Remove `workspace:*`, no `@repo/*` imports, self-contained tsconfig |

---

## Dependency & Import Detangling

Before migration is complete, verify:

- [ ] No `workspace:*` in package.json
- [ ] No `@repo/*` imports in source
- [ ] `tsconfig.json` has no `paths` mapping to sibling packages
- [ ] All imports are relative (`../core/`, etc.) or npm packages
- [ ] `run_tests.ts` uses `__dirname` relative to itself (✅ verified)

---

## Verification Commands

Run these after migration to confirm success:

```bash
# 1. Build
cd personal-assistant
npm install
npm run build

# 2. Type check (implicit in build, but explicit)
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Test
npm test

# 5. Smoke test (CLI works)
node dist/app/cli.js --help
node dist/app/cli.js task list --mock --human
node dist/app/cli.js remember "test migration" --mock
node dist/app/cli.js recall "migration" --mock --human

# 6. Enhanced root leakage check
find . -maxdepth 3 -type f \( -name "*.jsonl" -o -name "memory.json" \) \
  ! -path "./.assistant-data/*" ! -path "./node_modules/*" ! -path "./dist/*" \
  && echo "FAIL: data file leakage detected" && exit 1 \
  || echo "PASS: no leakage"

# 7. Check dist for leakage too
ls dist/*.jsonl dist/memory.json 2>/dev/null && echo "FAIL: dist leakage" || echo "PASS: no dist leakage"
```

---

## Minimum Runnable Demo (Acceptance Test)

This proves the assistant runs without orchestrator:

```bash
#!/bin/bash
# scripts/smoke-test.sh
set -e

export ASSISTANT_BASE_DIR="$(pwd)"
export ASSISTANT_DATA_DIR="$(pwd)/.assistant-data"
mkdir -p "$ASSISTANT_DATA_DIR"

echo "1. CLI starts"
node dist/app/cli.js --help > /dev/null

echo "2. Run one tool (get time)"
node dist/app/cli.js run pwd --mock

echo "3. Write one memory"
node dist/app/cli.js remember "Smoke test memory" --mock

echo "4. Read it back"
RESULT=$(node dist/app/cli.js recall "smoke test" --mock)
echo "$RESULT" | grep -q "Smoke test memory" || (echo "FAIL: memory not found" && exit 1)

echo "5. Write one task"
node dist/app/cli.js task add "Smoke test task" --mock

echo "6. Read it back"
node dist/app/cli.js task list --mock | grep -q "Smoke test task" || (echo "FAIL: task not found" && exit 1)

echo "✅ NEW REPO IS ALIVE"

# Cleanup
rm -rf "$ASSISTANT_DATA_DIR"
```

---

## Migration Steps

1. ✅ **Create directory structure** - `personal-assistant/` with subdirs
2. ✅ **Copy source files** - Preserve directory layout
3. ✅ **Update package.json** - Remove scope, no workspace deps
4. ✅ **Fix imports** - Verify no @repo/* imports
5. ✅ **Copy tests** - Keep colocated structure
6. ⏳ **Refactor provider structure** - ChatModel/EmbeddingModel interfaces
7. ⏳ **Add new docs** - README, QUICKSTART, ARCHITECTURE
8. ⏳ **Run verification** - All commands above
9. ⏳ **Create smoke-test.sh** - Acceptance test
10. ⏳ **Update .gitignore** - Exclude `.assistant-data/`, dist/, node_modules/
