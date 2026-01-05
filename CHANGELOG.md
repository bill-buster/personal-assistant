# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Streaming responses in REPL mode (enabled by default)
- Plugin system for loading external tools from `~/.assistant/plugins/`
- VS Code extension for inline commands (Cmd+Shift+A)
- Test result caching for faster test runs
- Parallel test execution (4 workers by default)
- LLM response caching in dev mode
- Comprehensive documentation (CONFIGURATION.md, PLUGINS.md, PARALLEL_TESTS.md)
- Cursor rules for better AI assistance (10 rule files)

### Changed
- REPL now streams responses by default
- Tests run in parallel by default
- Plugin tools are automatically loaded on startup

### Fixed
- Documentation gaps filled per documentation.mdc requirements

## [0.1.0] - 2025-01-05

### Added
- Initial release
- CLI interface
- REPL mode
- Web dashboard
- Multi-stage routing (Regex → Heuristic → Parsers → LLM)
- Tool execution system
- Memory and task management
- Git integration (read-only)
- File operations (sandboxed)

