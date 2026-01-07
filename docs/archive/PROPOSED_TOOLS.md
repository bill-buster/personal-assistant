# Proposed Tools for Implementation

This file contains all proposed tools organized by category. Use `/impl_add_tool` with the tool name and description to implement them one by one.

## Format
When using `/impl_add_tool`, reference tools like this:
```
/impl_add_tool [tool_name] - [description]
```

---

## File Operations

### Basic File Operations
- `delete_file` - Delete a file (requires confirmation if configured). ✅ **IMPLEMENTED**
- `move_file` - Move or rename a file from one path to another.
- `copy_file` - Copy a file from source to destination path.
- `file_info` - Get file metadata (size, modified date, permissions, type).

### Advanced File Operations
- `create_directory` - Create a directory (with parent directories if needed).
- `delete_directory` - Delete a directory and its contents (requires confirmation).
- `find_files` - Search for files by name pattern (supports glob patterns).
- `grep` - Search for text patterns in files (fast regex search across files).
- `search_replace` - Find and replace text across multiple files (requires confirmation).
- `find_by_content` - Find files containing specific text content.
- `find_duplicates` - Find duplicate files by content hash.

### File Viewing and Processing
- `view_file` - View file with syntax highlighting (like bat command).
- `edit_file` - Edit file content in-place (simple text replacement).
- `diff_files` - Compare two files and show differences.
- `merge_files` - Merge multiple files intelligently.
- `count_words` - Count words, lines, and characters in a file.
- `extract_lines` - Extract specific line ranges from a file.

---

## Git Operations

### Read-Only Git Operations
- `git_branch` - List, create, or switch git branches.
- `git_remote` - Show git remote information.
- `git_tag` - List or create git tags.
- `git_blame` - Show who last modified lines in a file.
- `git_stats` - Show repository statistics and insights.

### Write Git Operations (require confirmation)
- `git_add` - Stage files for commit (requires confirmation).
- `git_commit` - Create a git commit with message (requires confirmation).
- `git_stash` - Stash or unstash git changes (requires confirmation).

### Intelligent Git Operations
- `git_suggest` - Suggest next git command based on repository state.
- `git_auto_commit` - Auto-generate commit message from changes (requires confirmation).
- `git_smart_add` - Intelligently stage related files (requires confirmation).
- `git_find_author` - Find commits by author or pattern.

---

## Text Processing

- `grep` - Fast regex search across files (see File Operations).
- `count_words` - Count words, lines, characters (see File Operations).
- `format_json` - Format and validate JSON content.
- `format_code` - Format code using available formatters (if configured).
- `parse_csv` - Parse CSV files and return structured data.
- `convert_format` - Convert between formats (JSON ↔ YAML, etc.).

---

## Search and Discovery

- `fuzzy_find` - Fuzzy file search (like fzf - finds files by name pattern).
- `grep` - Text search in files (see File Operations).
- `search_codebase` - Semantic search across codebase (if embeddings available).
- `find_duplicates` - Find duplicate files (see File Operations).
- `file_tree` - Generate directory tree structure.
- `find_large_files` - Find files above a specified size threshold.

---

## System Information

- `disk_usage` - Check disk space usage for current directory or specified path.
- `process_list` - List running processes (filtered, safe subset).
- `system_info` - Get OS, memory, CPU information.
- `environment_vars` - List or get environment variables.

---

## Package Management (Node.js)

- `npm_list` - List installed npm packages in current directory.
- `npm_search` - Search npm packages (read-only, no install).
- `npm_install` - Install npm packages (requires confirmation).
- `check_updates` - Check for outdated packages in package.json.
- `audit_security` - Run npm audit for security vulnerabilities.

---

## Notes and Documentation

- `note_add` - Create structured notes (separate from memory system).
- `note_search` - Search notes by content or tags.
- `note_list` - List notes by tag, category, or date.
- `generate_readme` - Generate README from codebase analysis.
- `generate_docs` - Auto-generate documentation from code comments.
- `update_readme` - Update README with current project state.
- `create_changelog` - Generate changelog from git commits.

---

## Time and Productivity

- `time_track` - Track time spent on tasks or projects.
- `pomodoro` - Start a pomodoro timer (25-minute work session).
- `journal_entry` - Create daily journal entries.
- `habit_tracker` - Track habits with daily check-ins.

---

## Data Processing

- `parse_csv` - Parse CSV files (see Text Processing).
- `convert_format` - Convert between data formats (see Text Processing).
- `merge_files` - Merge multiple files (see File Operations).
- `split_file` - Split large files into smaller chunks.

---

## Backup and Sync

- `backup_files` - Create backup of files or directories.
- `sync_directory` - Sync directories (compare and copy differences).
- `archive_create` - Create zip/tar archives from files.
- `archive_extract` - Extract zip/tar archives.

---

## Network Utilities

- `ping` - Ping a host to check connectivity.
- `check_port` - Check if a network port is open.
- `download_file` - Download files from URLs to local path.
- `curl` - Make HTTP requests (safe subset, read-only by default).

---

## Clipboard Operations (macOS/Linux)

- `clipboard_read` - Read current clipboard content.
- `clipboard_write` - Write text to clipboard.

---

## Task Management (Extensions)

- `task_update` - Update task details (text, due date, priority).
- `task_delete` - Delete a task (requires confirmation).
- `task_search` - Search tasks by text or filters.
- `task_stats` - Show task statistics (completed, pending, by priority).

---

## Memory Management (Extensions)

- `memory_delete` - Delete memory entries by ID or query.
- `memory_update` - Update existing memory entries.
- `memory_export` - Export memories to file.
- `memory_import` - Import memories from file.

---

## AI-Powered Code Assistance

- `explain_code` - Explain what code does in plain language (uses LLM).
- `generate_code` - Generate code snippets from natural language (uses LLM).
- `refactor_code` - Suggest and apply code refactoring (uses LLM).
- `add_comments` - Automatically add comments/docstrings to code (uses LLM).
- `generate_tests` - Generate test files for existing code (uses LLM).
- `code_review` - Automated code review with suggestions (uses LLM).
- `find_bugs` - Static analysis to find potential bugs.
- `suggest_improvements` - Suggest code improvements based on best practices.

---

## Code Understanding

- `codebase_summary` - Generate summary of codebase structure.
- `find_usage` - Find where functions/classes are used.
- `dependency_graph` - Visualize code dependencies.
- `complexity_analysis` - Analyze code complexity metrics.

---

## Secret and Environment Management

- `secret_store` - Securely store secrets locally (encrypted).
- `secret_retrieve` - Retrieve secrets (with permission checks).
- `env_manage` - Manage environment variables (get, set, list).
- `config_validate` - Validate configuration files against schema.
- `credential_rotate` - Rotate API keys/credentials.

---

## Project Scaffolding

- `scaffold_project` - Generate project from templates.
- `create_component` - Generate component boilerplate.
- `add_feature` - Scaffold new feature structure.
- `template_list` - List available project templates.
- `template_create` - Create custom project templates.

---

## Build and Dependency Management

- `build_project` - Run build commands with error detection.
- `check_dependencies` - Check for outdated/vulnerable packages.
- `update_dependencies` - Update packages (requires confirmation).
- `lockfile_analyze` - Analyze lockfile for issues.

---

## Workflow Automation

- `workflow_create` - Create automated workflows (save command sequences).
- `workflow_run` - Execute saved workflows.
- `schedule_task` - Schedule recurring tasks.
- `watch_files` - Watch files and trigger actions on changes.
- `auto_test` - Run tests automatically on file changes.

---

## Performance and Monitoring

- `profile_code` - Profile code execution (if profiler available).
- `benchmark` - Run performance benchmarks.
- `memory_usage` - Analyze memory usage of processes.
- `cpu_usage` - Monitor CPU usage.
- `disk_analyze` - Analyze disk usage by directory.

---

## Terminal Enhancements

- `command_history` - Search and reuse command history.
- `command_suggest` - Suggest commands based on context.
- `alias_manage` - Manage command aliases.
- `session_save` - Save and restore terminal sessions.

---

## Communication and Collaboration

- `generate_email` - Draft emails from context (uses LLM).
- `summarize_changes` - Summarize code changes for reviews (uses LLM).
- `create_issue` - Create GitHub/GitLab issues (if API configured).
- `comment_code` - Add code comments for team collaboration.

---

## Priority Recommendations

### Phase 1: Core Utilities (High Value, Easy)
1. `delete_file` ✅ **IMPLEMENTED**
2. `move_file` - Move or rename files
3. `copy_file` - Copy files
4. `file_info` - Get file metadata
5. `grep` - Fast text search
6. `fuzzy_find` - Fuzzy file search
7. `create_directory` - Create directories

### Phase 2: Git Extensions (Medium Value, Medium Effort)
1. `git_add` - Stage files
2. `git_commit` - Create commits
3. `git_branch` - Branch operations
4. `git_auto_commit` - Auto-generate commit messages

### Phase 3: Productivity Boosters (High Value, Medium Effort)
1. `note_add` - Structured notes
2. `note_search` - Search notes
3. `time_track` - Time tracking
4. `task_update` - Update tasks
5. `task_search` - Search tasks

### Phase 4: Advanced Features (High Value, High Effort)
1. `code_explain` - Explain code (uses LLM)
2. `generate_tests` - Generate tests (uses LLM)
3. `code_review` - Code review (uses LLM)
4. `search_codebase` - Semantic search
5. `format_json` - JSON formatting

---

## Implementation Notes

- Tools marked with "requires confirmation" should check `requiresConfirmation()` before execution
- Tools marked with "uses LLM" require LLM provider to be configured
- All file operations must use `context.paths.resolveAllowed()` for security
- All tools must return `ToolResult` (never throw)
- All tools must validate args with Zod schemas
- Destructive operations (delete, move, etc.) should require confirmation by default

---

## Quick Reference: How to Implement

1. Pick a tool from this list
2. Use `/impl_add_tool` with the tool name and description
3. Example: `/impl_add_tool move_file - Move or rename a file from one path to another`
4. The implementer will follow the 5-step process automatically

See `docs/ADDING_TOOLS_GUIDE.md` for detailed implementation patterns.

