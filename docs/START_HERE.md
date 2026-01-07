# Start Here: Documentation Map

Welcome to the Personal Assistant project. This is a local-first, deterministic AI agent runtime designed for safety and extensibility.

Because this project prioritizes reliability and tooling, the documentation is extensive. **You do not need to read everything.**

Use this map to navigate based on your current goal.

---

## 🧭 I want to...

### 1. Use the Assistant

If you just want to run the CLI and use the agent:

1.  **[QUICKSTART.md](02-guides/QUICKSTART.md)**: Setup, installation, and your first command.
2.  **[COMMANDS.md](04-reference/COMMANDS.md)**: The reference manual for CLI commands (remember, recall, tasks).
3.  **[CONFIGURATION.md](01-concepts/CONFIGURATION.md)**: How to configure LLM providers and data paths.

### 2. Contribute Code

If you are modifying the core or fixing bugs:

1.  **[ARCHITECTURE.md](01-concepts/ARCHITECTURE.md)**: **Must Read.** Explains the "Loop," the Router, and the Executor.
2.  **[BUILD_AND_RUN.md](03-workflow/BUILD_AND_RUN.md)**: The cheatsheet for `npm` scripts (build, run, watch).
3.  **[TESTING.md](03-workflow/TESTING.md)**: How to run the test suite (Unit vs. E2E).
4.  **[GIT.md](03-workflow/GIT.md)**: Branch naming and commit standards.

### 3. Add New Capabilities (Tools)

If you want the agent to do something new (e.g., "Check Jira" or "Send Slack DM"):

1.  **[ADDING_TOOLS_GUIDE.md](02-guides/ADDING_TOOLS_GUIDE.md)**: The comprehensive guide to adding tools.
2.  **[TOOL_IMPLEMENTATION_CHECKLIST.md](02-guides/TOOL_IMPLEMENTATION_CHECKLIST.md)**: Copy this checklist to ensure your tool is production-ready.
3.  **[PLUGINS.md](04-reference/PLUGINS.md)**: If your tool needs to be loaded dynamically.

---

## 📚 Encyclopedia & Deep Dives

Everything else in this directory is for specific reference or historical context. You can safely ignore these until you hit a specific problem.

| Topic           | Document                                                                                                                   |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Security**    | **[SECURITY.md](01-concepts/SECURITY.md)** - Permissions model, path/command confinement.                                  |
| **Debugging**   | **[DEBUGGING.md](02-guides/DEBUGGING.md)** - Techniques for debugging the agent loop.                                      |
| **Performance** | **[CACHING.md](04-reference/CACHING.md)** & **[PERFORMANCE_OPTIMIZATIONS.md](04-reference/PERFORMANCE_OPTIMIZATIONS.md)**. |
| **IDE Setup**   | **[CURSOR_SETUP.md](02-guides/CURSOR_SETUP.md)** - Recommended settings for Cursor/VS Code.                                |
| **Decisions**   | **[DECISIONS.md](meta/DECISIONS.md)** & **[STACK_DECISION.md](meta/STACK_DECISION.md)** - Why we built it this way.        |

---

## ❓ Common Questions

**Where is the "Single Source of Truth"?**

- For **System Design**: [ARCHITECTURE.md](01-concepts/ARCHITECTURE.md)
- For **Team Process**: [HOW_WE_WORK.md](meta/HOW_WE_WORK.md) (covers code review, philosophy)
- For **Dev Commands**: [BUILD_AND_RUN.md](03-workflow/BUILD_AND_RUN.md)

**I found a file not listed here.**
If it's in `docs/` and not listed above, it is likely a niche reference doc (e.g., `MDC_RULES_PORTABILITY.md`) or a draft status log (`STATUS_SUMMARY.md`).
