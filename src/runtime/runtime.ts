/**
 * Runtime Composition Root
 *
 * This module is the SINGLE place that wires the runtime graph.
 * Entrypoints call buildRuntime(resolvedConfig) to get all dependencies.
 *
 * Dependencies constructed:
 *   - ToolRegistry (handlers + schemas)
 *   - LLMProvider (if API keys configured)
 *   - Executor (tool execution with security)
 *   - Tool schemas for Router
 *   - Default agent (SYSTEM)
 *
 * @module runtime
 */

import * as path from 'node:path';
import {
    ResolvedConfig,
    getStoragePaths,
    AppConfig,
    loadConfig,
    resolveConfig,
    ensureStorageExists,
} from '../core/config';
import { ToolRegistry, Agent } from '../core/types';
import { Executor, ExecutorConfig } from '../core/executor';
import { createNodeToolRegistry } from '../core/tool_registry';
import { createProvider, LLMProvider } from '../providers/llm';
import { TOOL_SCHEMAS } from '../tools/schemas';
import { SYSTEM } from '../agents';
import { CommandLogger } from '../core/command_log';

/**
 * Runtime object containing all constructed dependencies.
 * This is the dependency graph for the application.
 */
export interface Runtime {
    /** Fully resolved configuration */
    config: ResolvedConfig;

    /** Tool registry with handlers and schemas */
    registry: ToolRegistry;

    /** Tool executor with security enforcement */
    executor: Executor;

    /** LLM provider (undefined if no API keys configured) */
    provider: LLMProvider | undefined;

    /** Tool schemas for LLM tool calling */
    toolSchemas: typeof TOOL_SCHEMAS;

    /** Default agent for CLI/direct usage */
    defaultAgent: Agent;

    /** Command logger for tracking queries and outcomes */
    commandLogger: CommandLogger;
}

/**
 * Options for buildRuntime to customize construction.
 */
export interface BuildRuntimeOptions {
    /** Custom storage paths (for CLI with custom paths) */
    storagePaths?: {
        memory?: string;
        tasks?: string;
        reminders?: string;
        memoryLog?: string;
    };

    /** Custom permissions path */
    permissionsPath?: string;

    /** Override agent for executor (defaults to SYSTEM) */
    agent?: Agent;

    /** Memory limit for executor */
    memoryLimit?: number;

    /** Disable audit logging */
    auditEnabled?: boolean;

    /** Whether to create LLM provider (default: true). Set to false for executor-only usage. */
    includeProvider?: boolean;
}

/**
 * Build the complete runtime graph from resolved configuration.
 *
 * This is the composition root - the single place that wires dependencies.
 * All entrypoints should call this once after resolving config.
 *
 * @param config - Fully resolved configuration (from resolveConfig)
 * @param options - Optional customization for paths and agents
 * @returns Runtime object with all dependencies
 */
export function buildRuntime(config: ResolvedConfig, options: BuildRuntimeOptions = {}): Runtime {
    // 1. Build tool registry (handlers + schemas)
    const registry = createNodeToolRegistry();

    // 2. Build executor config
    // If specific storage paths aren't provided in options, use the ones from resolved config.
    // ResolvedConfig.storage already contains absolute paths.
    const executorConfig: ExecutorConfig = {
        baseDir: config.fileBaseDir,
        limits: config.limits,
        registry,
        agent: options.agent ?? SYSTEM,
        memoryPath:
            options.storagePaths?.memory ??
            path.resolve(config.storage.baseDir, config.storage.memory),
        tasksPath:
            options.storagePaths?.tasks ??
            path.resolve(config.storage.baseDir, config.storage.tasks),
        remindersPath:
            options.storagePaths?.reminders ??
            path.resolve(config.storage.baseDir, config.storage.reminders),
        memoryLogPath:
            options.storagePaths?.memoryLog ??
            path.resolve(config.storage.baseDir, config.storage.memoryLog),
        permissionsPath: options.permissionsPath,
        memoryLimit: options.memoryLimit,
        auditEnabled: options.auditEnabled,
    };

    // 3. Create executor
    const executor = new Executor(executorConfig);

    // 4. Create LLM provider if requested and API keys are configured
    let provider: LLMProvider | undefined;
    const includeProvider = options.includeProvider ?? true;
    if (includeProvider) {
        const hasApiKeys = Object.values(config.apiKeys).some(key => !!key);
        if (hasApiKeys) {
            const providerResult = createProvider(config);
            if (providerResult.ok) {
                provider = providerResult.provider;
            } else {
                // Provider creation failed (e.g., missing key for selected provider)
                // This is OK - we just won't have LLM fallback
                provider = undefined;
            }
        }
    }

    // 5. Create command logger
    const commandLogPath = path.resolve(config.storage.baseDir, 'command_log.jsonl');
    const commandLogger = new CommandLogger(commandLogPath, true);

    // 6. Return runtime with all dependencies
    return {
        config,
        registry,
        executor,
        provider,
        toolSchemas: TOOL_SCHEMAS,
        defaultAgent: SYSTEM,
        commandLogger,
    };
}

/**
 * Initialize the runtime with standard bootstrap sequence.
 *
 * Steps:
 * 1. Load config (file + env)
 * 2. Ensure storage directories exist
 * 3. Resolve config (paths, limits)
 * 4. Build runtime graph
 *
 * @param options - Build options
 */
export function initializeRuntime(options: BuildRuntimeOptions & { mock?: boolean } = {}): Runtime {
    const rawConfig = loadConfig();

    // Support --mock flag override
    if (options.mock) {
        rawConfig.defaultProvider = 'mock';
    }

    const resolveResult = resolveConfig(rawConfig);
    if (!resolveResult.ok) {
        throw new Error(`Failed to resolve config: ${resolveResult.error}`);
    }
    const resolvedConfig = resolveResult.config;
    ensureStorageExists(resolvedConfig);

    return buildRuntime(resolvedConfig, options);
}

/**
 * Build runtime with storage paths from raw config.
 * Convenience function that handles storage path resolution.
 *
 * @param config - Fully resolved configuration
 * @param rawConfig - Original AppConfig for storage path resolution
 * @param options - Additional build options
 */
export function buildRuntimeWithStorage(
    config: ResolvedConfig,
    rawConfig: AppConfig,
    options: BuildRuntimeOptions = {}
): Runtime {
    const storagePaths = getStoragePaths(rawConfig);
    return buildRuntime(config, {
        ...options,
        storagePaths: {
            memory: storagePaths.memory,
            tasks: storagePaths.tasks,
            reminders: storagePaths.reminders,
            memoryLog: storagePaths.memoryLog,
        },
    });
}

// Re-export commonly needed types and values for convenience
export { TOOL_SCHEMAS } from '../tools/schemas';
export { SYSTEM, AGENTS } from '../agents';
export type { LLMProvider } from '../providers/llm';
