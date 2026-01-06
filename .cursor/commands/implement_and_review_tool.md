# /implement_and_review_tool
A single end-to-end workflow to add or update a tool: implement → tests → review → fix loop → commit → summary.

> Design goals:
> - Idempotent: safe to re-run after partial completion
> - Explicit quality gates: tests + review must be green before commit
> - Clear ownership: Jules is used specifically for "try to break it" testing

---

## Inputs (fill these in at the top of the run)
- Tool name: <tool_name>
- Goal: <one sentence>
- Files expected to change: <list>

---

## Phase 0 — Preflight

### [STEP 0/16] Baseline green check (NEW)
- Run `npm run preflight` to check if repo is already in a broken state.
- Record baseline status:
  - If baseline passes: Continue normally.
  - If baseline fails: Log warning but allow implementation/testing to proceed.
    - **IMPORTANT**: Block Step 15 (commit) unless baseline is fixed or explicitly accepted.
    - This prevents claiming "ready to commit" when repo is already red.
- Log: "Baseline check: [passed/failed]"

### [STEP 1/16] Decide if tool generation is needed (optional)
- If the tool does not exist yet, run the generator:
  - `assistant generate tool <tool_name>`
- If it exists, skip generation and continue.

**Guardrails**
- Don't overwrite existing tool files unless explicitly intended.
- If generation created placeholders, keep going and replace them with real logic.

---

## Phase 1 — Implementation (same spirit as impl_add_tool)

### [STEP 2/16] Read the tool checklist + repo conventions
- Open the project's "add tool" checklist / docs (whatever your repo uses).
- Identify:
  - tool contract shape
  - registration location
  - permissions model
  - logging/error conventions

### [STEP 3/16] Define the schema + types (fail-closed)
- Add/modify in `src/core/types.ts`:
  - Create Zod schema: `export const [ToolName]Schema = z.object({ /* fields */ })`
  - Export type: `export type [ToolName]Args = z.infer<typeof [ToolName]Schema>`
  - Add to `ToolSchemas` export at bottom: `[tool_name]: [ToolName]Schema,`
- Ensure:
  - validation at boundaries
  - descriptive error codes/messages
  - least-privilege defaults

### [STEP 4/16] Implement handler logic
- Keep the handler:
  - small functions
  - clear error paths
  - no root leakage / no hidden side-effects
- Ensure "safe paths" / allowlists are respected if applicable.

### [STEP 5/16] Register the tool end-to-end
- In `src/core/tool_registry.ts`:
  - Import handler: `import { handle[ToolName] } from '../tools/[tool_file]';`
  - Add to `TOOL_HANDLERS` map: `[tool_name]: handle[ToolName],`
- In `src/agents/index.ts`:
  - Add `'[tool_name]'` to appropriate agent's `tools` array (e.g., `READY_TOOLS` or specific agent)
- Verify it is discoverable by the runtime/agent.

### [STEP 6/16] Create the test file *during* implementation (Agent 3 improvement)
- Create or update: `src/tools/[tool_file].test.ts` (match the tool file name)
- Include at least:
  - happy path
  - invalid input
  - permission denied path (if applicable)
  - edge-case or regression case
- Use `createMockContext()` from test utils for isolated tests

### [STEP 7/16] Update any required docs/checklists
- Update `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`:
  - Mark tool as done: change `- [ ]` to `- [x]` for the tool line
- Update any other docs if your system expects:
  - tool catalog entry (if you have one)
  - README snippets (if you maintain them)

---

## Phase 2 — "Try to break it" testing

### [STEP 8/16] Switch to Jules role for test hardening
Jules tasks:
- Read the implementation + tests.
- Add adversarial tests:
  - boundary values
  - weird strings / unicode / empty values
  - permission edge cases
  - concurrency or repeated runs (idempotency)
- Ensure tests are deterministic and isolated.

### [STEP 9/16] Run tests (must be green)
Run the narrowest tests first, then full suite if needed:
- `npm test` (runs all tests - the test runner will find the new test file)
- Or run specific file: `npm test` and it will auto-discover `src/tools/[tool_file].test.ts`

Record:
- commands run
- pass/fail
- any skipped tests and why

---

## Phase 3 — Review gates

### [STEP 10/16] Automated review pass
Run your repo's standard review command/workflow:
- `npm run review src/tools/[tool_file].ts` (automated code review)
- Or: `npm run lint`, `npm run typecheck` if review script not available
- Fix any lint/types immediately (don't defer).

### [STEP 11/16] Manual review pass (human-style)
Checklist:
- Security: validation, allowlists, no path traversal
- Correctness: error cases, return types, invariants
- DX: logs readable, error codes consistent
- No root leakage / no unintended file writes
- Tests: meaningful assertions (not just "no throw")

---

## Phase 4 — Fix loop (explicit and repeatable)

### [STEP 12/16] Fix issues found in tests or review
- Make minimal, targeted fixes.
- If changes affect behavior, add/adjust tests in the same step.

### [STEP 13/16] Re-run tests after fixes (required)
- Re-run the same commands from Step 9 until green.

### [STEP 14/16] Re-run review after fixes (required)
- Re-run the same checks from Step 10–11 until clean.

> Rule: no commit until Steps 9–11 are green (and 13–14 if you entered the fix loop).

---

## Phase 5 — Commit + summary

### [STEP 15/16] Commit + post-commit sanity check
- **CRITICAL**: If baseline check (Step 0) failed, do NOT commit unless:
  - Baseline issues are fixed, OR
  - User explicitly accepts committing with baseline failures
- Write a conventional commit message (or repo standard).
- Confirm working tree is clean.
- Do a final quick scan for:
  - stray debug prints
  - temporary files
  - TODOs introduced

### [STEP 16/16] Produce a short summary (Agent 3 UX improvement)
Include:
- What changed (files + intent)
- Test commands run + results
- Any tradeoffs / followups
- Risk level (low/med/high) and why
