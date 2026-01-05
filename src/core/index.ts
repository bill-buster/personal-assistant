/**
 * Core module exports
 *
 * This is the public API for core functionality.
 * Import from here instead of deep paths.
 *
 * @module core
 */

// Executor
export { Executor, ExecutorConfig } from './executor';

// Types
export type {
    ToolResult,
    ToolError,
    ToolRegistry,
    ToolHandler,
    ToolSpec,
    ToolCall,
    Agent,
    Message,
    TokenUsage,
    Permissions,
    PermissionsSchema,
    Limits,
    MemoryEntry,
    DebugInfo,
    ExecutorContext,
    PathOp,
    PathCapabilities,
    CommandCapabilities,
    RouteResult,
    RouteError,
    RouteToolCall,
    RouteReply,
} from './types';
export { isRouteError, isRouteToolCall, isRouteReply } from './types';

// Config
export {
    loadConfig,
    saveConfig,
    resolveConfig,
    getPackageVersion,
    getStoragePaths,
    getFileBaseDir,
    ensureStorageExists,
    loadPermissions,
} from './config';
export type { AppConfig, ResolvedConfig } from './config';

// Tool contract
export {
    makeError,
    makePermissionError,
    makeConfirmationError,
    validateToolCall,
    makeToolCall,
    DENIED_COMMAND_ALLOWLIST,
    DENIED_PATH_ALLOWLIST,
    DENIED_TOOL_BLOCKLIST,
    DENIED_AGENT_TOOLSET,
} from './tool_contract';
export type { ErrorCode } from './tool_contract';

// Debug utilities
export { makeDebug, nowMs } from './debug';

// Output formatting
export { formatOutput, printResult, setHumanMode } from './output';
export type { CLIResult } from './output';

// Argument parsing
export { parseArgs } from './arg_parser';

// Validation
export { validateInput, validatePath, validateCommand, formatValidationError } from './validation';

// Logger
export { logger, createChildLogger, generateCorrelationId, LogLevel, setLogLevel } from './logger';

// Tool registry
export { createNodeToolRegistry } from './tool_registry';

// Cache utilities
export { FileCache, createCacheKey } from './cache';
export type { CacheEntry, CacheOptions } from './cache';

// Test cache
export { TestCache } from './test_cache';
export type { TestResult, TestSummary } from './test_cache';

// Parallel test execution
export { runTestsInParallel, runTestAsync } from './test_worker';
export type { TestResult as ParallelTestResult } from './test_worker';

// Plugin loader
export { discoverPlugins, loadPlugin, loadAllPlugins, mergePluginTools } from './plugin_loader';
export type { PluginManifest, LoadedPlugin } from './plugin_loader';
