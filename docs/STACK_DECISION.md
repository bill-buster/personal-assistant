# Stack Decision: TypeScript vs Python vs Hybrid

> **Decision:** Stay TypeScript (Option A)  
> **Date:** 2026-01-05  
> **Status:** Accepted

---

## Recommendation

**Stay TypeScript (Option A)** — The codebase is already stable and well-tested. Migration to Python would require a complete rewrite with no material benefit for our use case.

---

## Why TypeScript (5 Bullets)

1. **Already Stable and Tested:** ~80 TypeScript files with Zod runtime validation at boundaries and a comprehensive test suite. This is not a prototype.

2. **Provider Architecture Exists:** `LLMProvider` interface with Groq/OpenRouter adapters already works. Week 2 refactors it into explicit `ChatModel` + `EmbeddingModel` ports for cleaner future swaps.

3. **Ecosystem Fit:** CLI tools, REPL, web dashboard all native to Node.js. No Python runtime distribution headaches.

4. **Validation at Boundaries:** Zod schemas already guard config, tool args, API responses, and persistence. No need for Pydantic.

5. **Single Codebase Simplicity:** One language, one build system, one test runner. Hybrid adds maintenance overhead for marginal benefit.

---

## Costs/Risks of Staying TypeScript (5 Bullets)

1. **No Native ML/Vector Libraries:** If we need local embeddings beyond the simple TF-IDF fallback, we'd need to call out to Python or use a service.

2. **Local Inference Harder:** llama.cpp bindings exist for Node (node-llama-cpp) but are less mature than Python's llama-cpp-python.

3. **LLM Framework Gap:** LangChain/LlamaIndex are Python-first. TypeScript equivalents (LangChain.js) are secondary citizens.

4. **Native Performance & Tokenization:** Some tokenization utilities and performance-critical paths are more mature in Python. Not a blocker, but an ongoing friction point.

5. **Team Skills:** If future maintainers are Python-primary, onboarding has a learning curve.

---

## Why NOT Python (Option B)

| Factor           | Assessment                                           |
| ---------------- | ---------------------------------------------------- |
| Rewrite effort   | ~3k LOC estimate (run `cloc src/` to verify)         |
| Feature parity   | Months to reach current functionality                |
| Dependencies     | Would need FastAPI, Typer, Pydantic, httpx — heavier |
| Distribution     | Python versioning/venv is user-hostile for CLI tools |
| Current velocity | We're shipping features now; rewrite = full stop     |

**Verdict:** The costs massively outweigh benefits. We have working software.

---

## Why NOT Hybrid (Option C)

A hybrid approach (TypeScript core + Python inference sidecar) was considered for local inference support.

| Scenario              | Approach                      | Effort  |
| --------------------- | ----------------------------- | ------- |
| Use Groq/OpenRouter   | Already works                 | 0       |
| Add Ollama support    | HTTP API from TS              | ~50 LOC |
| Add llama.cpp support | node-llama-cpp or HTTP server | Medium  |
| Add local embeddings  | Python sidecar OR Ollama      | Medium  |

**Current constraint:** 8GB RAM limits local model options anyway. When we have more resources, HTTP-based local adapters are the path forward.

**Verdict:** Defer hybrid until we have concrete local inference requirements beyond what Ollama provides.

---

## Local LLM Strategy (Future)

When local inference becomes a priority:

1. **Prefer HTTP-based adapters** (Ollama, llama-server) to avoid native bindings complexity
2. **Keep local LLM optional:** If not available, fall back to Groq/OpenRouter
3. **Same validation layer:** Structured-output validation applies regardless of provider
4. **No Python required in main codebase:** Local services can be any runtime

This means adding Ollama is just another adapter implementing `ChatModel`, not a stack change.

---

## Revisit Triggers

We will reconsider Python or a hybrid architecture if any of the following become true:

- We require local embeddings/RAG at scale (high doc volume, low latency) and Node options become limiting
- We must run local inference with stable tool-calling + structured outputs and Node integrations prove unreliable
- We adopt a Python-first maintainer base or integrate deeply with Python-first ML tooling
- An adapter-based approach becomes materially more complex than a Python-native implementation for a concrete feature

---

## 30-Day Plan

### Week 1: Extraction & Hardening

- [ ] Complete migration to `/personal-assistant/`
- [ ] Verify all tests pass
- [ ] Add missing smoke tests (root leakage, CLI commands)
- [ ] Write QUICKSTART.md (5-minute onboarding)

### Week 2: Provider Abstraction

- [ ] Formalize `ChatModel` interface in `src/llm/ChatModel.ts`
- [ ] Formalize `EmbeddingModel` interface in `src/embeddings/EmbeddingModel.ts`
- [ ] Add spend/limits hooks (stubs) for usage tracking
- [ ] Add Ollama adapter (if Ollama is installed, use it)

### Week 3: Reliability

- [ ] Unify bootstrap across CLI/REPL/server (single `initializeRuntime()`)
- [ ] Ensure all storage paths flow through config
- [ ] Add integration test: full remember → recall flow
- [ ] Add integration test: task add → list → done flow

### Week 4: Documentation & Polish

- [ ] Architecture doc updated for new repo
- [ ] Known limitations updated
- [ ] README with badges, examples, troubleshooting
- [ ] Optional: GitHub Actions CI for test + lint

---

## If We Ever Reconsider Python

The migration path would be:

1. **Interfaces First:** Define Python equivalents of `ChatModel`, `EmbeddingModel`, `Executor`
2. **Minimal Slice:** Port `memory_tools.py` + `task_tools.py` first (smallest scope)
3. **Parallel Operation:** Run both TS and Python versions, compare outputs
4. **Cutover by Feature:** Replace tool-by-tool, not big-bang
5. **Test Parity:** Each ported module must pass equivalent tests
6. **Rollback:** Keep TS version until Python is proven in production for 2 weeks

This is **not recommended** given current state. Documenting for completeness.

---

## Appendix: Current Provider Interface

```typescript
// src/providers/llm/provider.ts (current)
export interface LLMProvider {
    complete(
        prompt: string,
        tools: Record<string, ToolSpec>,
        history?: Message[],
        verbose?: boolean,
        systemPrompt?: string,
        options?: { toolFormat?: 'standard' | 'compact' }
    ): Promise<CompletionResult>;

    completeStream?(
        prompt: string,
        history?: Message[],
        verbose?: boolean,
        systemPrompt?: string
    ): AsyncGenerator<StreamChunk, void, unknown>;
}
```

**Week 2 refactors this into:**

```typescript
// src/llm/ChatModel.ts (proposed)
export interface ChatModel {
    chat(request: ChatRequest): Promise<ChatResponse>;
    chatStream?(request: ChatRequest): AsyncGenerator<ChatChunk>;
}

// src/embeddings/EmbeddingModel.ts (proposed)
export interface EmbeddingModel {
    embed(text: string): Promise<number[]>;
    embedBatch?(texts: string[]): Promise<number[][]>;
}
```

Adding Ollama requires only implementing `ChatModel`:

```typescript
// src/llm/providers/ollama.ts (proposed)
export class OllamaAdapter implements ChatModel {
    constructor(private baseUrl: string = 'http://localhost:11434') {}

    async chat(request: ChatRequest): Promise<ChatResponse> {
        // POST to /api/chat
    }
}
```

This is the correct abstraction level. No Python needed.
