# Architecture Decisions Log

> **Purpose:** Record significant design decisions for this repo.  
> **Scope:** Personal Assistant only (not the parent monorepo).

---

## Active Decisions

### D015: Personal Assistant Extraction to Standalone Repo
**Date:** 2026-01-05  
**Status:** Accepted

**Context:** The monorepo contains both a personal assistant (`packages/personal-assistant/`) and a multi-agent orchestration layer (`packages/workflow-engine/`, handoff protocols). These serve different purposes and have become entangled.

**Decision:** Extract the personal assistant into a standalone repo at `/personal-assistant/` within the workspace. Leave orchestration code behind.

**Rationale:**
- Personal assistant is feature-complete and independently useful
- Orchestration layer adds complexity without benefit for single-user CLI
- Clean separation enables focused development and simpler onboarding
- No code rewrite—just extraction and cleanup

**Stack Decision:** Stay TypeScript (see [STACK_DECISION.md](./STACK_DECISION.md))

**Consequences:**
- ✅ Standalone repo can be versioned/released independently
- ✅ Orchestration experiments won't destabilize assistant
- ⚠️ Two repos to maintain (but orchestration may be archived)

**Migration Plan:** See [../MIGRATION_PLAN.md](../MIGRATION_PLAN.md)

---

### D016: Data Directory Policy
**Date:** 2026-01-05  
**Status:** Accepted

**Context:** Previous defaults wrote data files inside the repo (`data/`) or dist (`dist/memory.jsonl`), risking accidental commits and "root leakage."

**Decision:** 
- Default data location: `~/.assistant-data/` (outside repo)
- Configurable via `ASSISTANT_DATA_DIR` or `ASSISTANT_BASE_DIR` env vars
- For development: allow `./.assistant-data/` via `ASSISTANT_BASE_DIR=.` (gitignored)
- Never write data files to repo root or dist/

**Consequences:**
- ✅ No accidental data commits
- ✅ Repo can live anywhere without data pollution
- ⚠️ Users must understand data is stored outside repo by default

---

### D017: Provider Interface Architecture
**Date:** 2026-01-05  
**Status:** Accepted

**Context:** Current `LLMProvider` interface works but conflates chat completion and embeddings. Future local inference (Ollama, llama.cpp) needs clean swap points.

**Decision:** Refactor into two explicit ports:
- `ChatModel` interface for text completion/tool calling
- `EmbeddingModel` interface for vector embeddings

Adapters implement these interfaces:
- `src/llm/providers/groq.ts`
- `src/llm/providers/openrouter.ts`
- `src/llm/providers/ollama.ts` (future)
- `src/embeddings/providers/openrouter.ts`

**Consequences:**
- ✅ Clear swap points for future providers
- ✅ ChatModel can be Groq while EmbeddingModel is local
- ✅ Code outside providers is agnostic to backend

---

## Pending Decisions

*None currently.*

---

## Superseded Decisions

*None yet.*

