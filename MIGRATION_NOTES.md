# Migration Notes

Notes on what changed during the extraction from the monorepo.

## Migration Date
2026-01-05

## What Changed

### Directory Structure
- Extracted from `packages/personal-assistant/` to standalone `personal-assistant/`
- Removed `@repo/` package scope
- Added new provider interfaces: `src/llm/ChatModel.ts`, `src/embeddings/EmbeddingModel.ts`

### Configuration
- Package name changed from `@repo/personal-assistant` to `personal-assistant`
- Version set to `0.1.0` (fresh start)
- Removed workspace dependencies

### New Files
- `MIGRATION_PLAN.md` - Migration strategy
- `NEW_REPO_COMMANDS.md` - Git initialization commands
- `docs/DECISIONS.md` - Repo-specific decisions (D015, D016, D017)
- `docs/STACK_DECISION.md` - TypeScript vs Python analysis
- `docs/QUICKSTART.md` - 5-minute onboarding guide
- `scripts/smoke-test.sh` - Acceptance test
- `src/llm/ChatModel.ts` - New chat model interface
- `src/embeddings/EmbeddingModel.ts` - New embedding model interface

### Preserved
- All source files from `packages/personal-assistant/src/`
- All test files (colocated with source)
- Existing `LLMProvider` interface (for backward compatibility)
- tsconfig.json settings

## Known Issues After Migration

### 1. permissions.test.ts Failure (Pre-existing)
The test `T1: default deny if no permissions.json` fails because the error structure doesn't match expectations.

**Details:**
- Test expects `error.code` to be `DENIED_COMMAND_ALLOWLIST`
- Actual error returns as string message, not structured object

**Status:** Pre-existing issue, not caused by migration.

**Fix:** Update test to match current error structure, or update executor to return structured errors consistently.

### 2. Data Directory Policy
The config system now prefers `~/.assistant-data/` over repo-local `data/`.

**Action needed:** Update any references to `data/` in docs or tests.

## What's Left Behind (Not Migrated)

- `packages/workflow-engine/` - Multi-agent orchestration
- `AGENTS.md` - Orchestrator rules
- `HANDOFF.md`, `HANDOFF_OUT/` - Handoff artifacts
- `REVIEW_FEEDBACK.md` - Review agent output
- `tests/` (root) - Orchestrator smoke tests
- `docs/AGENT_CHAIN.md`, `docs/MULTI_AGENT_WORKFLOW.md` - Orchestrator docs

## Next Steps

1. [ ] Fix `permissions.test.ts` error structure issue
2. [ ] Initialize git in `personal-assistant/` directory
3. [ ] Run full test suite, fix any remaining issues
4. [ ] Consider removing ts-node dev dependency if not needed
5. [ ] Add GitHub Actions CI (see `NEW_REPO_COMMANDS.md`)

## Verification Completed

- ✅ Build succeeds (`npm run build`)
- ✅ Smoke test passes (`./scripts/smoke-test.sh`)
- ⚠️ Test suite: 1 failure (pre-existing)
- ✅ CLI commands work
- ✅ No root leakage detected

