/**
 * Application Configuration
 * 
 * Handles loading and saving of unified configuration.
 * Configuration is loaded from:
 *   1. Config file (~/.assistant/config.json)
 *   2. Environment variables (override file settings)
 * 
 * Supported providers: groq, openrouter
 * 
 * @module config
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';
import { Permissions, PermissionsSchema, Limits } from './types';

/**
 * Load permissions from file.
 * Priority: ASSISTANT_PERMISSIONS_PATH env var -> customPath (if provided) -> {baseDir}/permissions.json -> ~/.assistant/permissions.json
 * Defaults to DENY ALL if missing or invalid.
 */
export function loadPermissions(baseDir: string, customPath?: string): Permissions {
    // Default: Deny All
    const denyAll: Permissions = {
        version: 1,
        allow_paths: [],
        allow_commands: [],
        require_confirmation_for: [],
        deny_tools: []
    };

    const localPath = path.join(baseDir, 'permissions.json');
    const globalPath = path.join(os.homedir(), '.assistant', 'permissions.json');

    let fileToLoad: string | null = null;

    // Priority 1: Environment variable (wins over everything)
    const envPath = process.env.ASSISTANT_PERMISSIONS_PATH;
    if (envPath) {
        const resolvedEnvPath = path.isAbsolute(envPath) ? envPath : path.resolve(baseDir, envPath);
        if (fs.existsSync(resolvedEnvPath)) {
            fileToLoad = resolvedEnvPath;
        }
    }

    // Priority 2: Custom path parameter (if provided and env var not set)
    if (!fileToLoad && customPath) {
        if (path.isAbsolute(customPath)) {
            // Already resolved absolute path from CLI
            if (fs.existsSync(customPath)) {
                fileToLoad = customPath;
            }
        } else {
            // Relative path - resolve relative to baseDir
            const resolved = path.resolve(baseDir, customPath);
            if (resolved.startsWith(baseDir + path.sep) && fs.existsSync(resolved)) {
                fileToLoad = resolved;
            }
        }
    }

    // Priority 3: Standard locations if env var and custom path not found
    if (!fileToLoad) {
        if (fs.existsSync(localPath)) {
            fileToLoad = localPath;
        } else if (fs.existsSync(globalPath)) {
            fileToLoad = globalPath;
        }
    }

    if (!fileToLoad) {
        const checked = envPath ? 'env var, custom, local and global' : 'custom, local and global';
        console.warn(`[Permissions] No permissions.json found (checked ${checked}). Defaulting to DENY ALL.`);
        return denyAll;
    }

    try {
        const content = fs.readFileSync(fileToLoad, 'utf8');
        const raw = JSON.parse(content);
        const result = PermissionsSchema.safeParse(raw);

        if (result.success) {
            const perms = result.data;
            console.log(`[Permissions] Loaded from ${fileToLoad}: allow_paths=${perms.allow_paths.length}, allow_commands=${perms.allow_commands.length}, deny_tools=${perms.deny_tools.length}, require_confirmation_for=${perms.require_confirmation_for.length}`);
            return perms;
        } else {
            console.error(`[Permissions] Schema validation failed for ${fileToLoad}:`, result.error.issues);
            return denyAll;
        }
    } catch (e) {
        console.error(`[Permissions] Failed to load permissions from ${fileToLoad}:`, e);
        return denyAll;
    }
}

/**
 * Storage paths configuration
 */
export interface StorageConfig {
    /** Base directory for all data files */
    baseDir: string;
    /** Memory file path (relative to baseDir) */
    memory: string;
    /** Tasks file path (relative to baseDir) */
    tasks: string;
    /** Reminders file path (relative to baseDir) */
    reminders: string;
    /** Memory log path (relative to baseDir) */
    memoryLog: string;
}

/**
 * Main application configuration
 */
export interface AppConfig {
    /** Config format version */
    version?: number;

    /** Default LLM provider to use */
    defaultProvider: 'groq' | 'openrouter' | 'mock';

    /** API keys for each provider */
    apiKeys: {
        groq?: string;
        openrouter?: string;
        mock?: string;
    };

    /** Custom model overrides per provider */
    models?: {
        groq?: string;
        openrouter?: string;
        mock?: string;
    };

    /** Storage paths configuration */
    storage?: StorageConfig;

    /** File operation base directory (for sandboxing) */
    fileBaseDir?: string;

    /** Maximum history messages to send to LLM (default: 10, max: 50) */
    historyLimit?: number;

    /** Enable compact tool schemas to reduce token usage */
    compactToolSchemas?: boolean;

    /** Maximum file read size in bytes */
    maxReadSize?: number;

    /** Maximum file write size in bytes */
    maxWriteSize?: number;

    /** Maximum number of retries for LLM calls (default: 3) */
    maxRetries?: number;
}

/**
 * Fully resolved configuration with all defaults applied.
 * Entrypoints load config once and pass this to runtime modules.
 */
export interface ResolvedConfig {
    /** Config format version */
    version: number;

    /** Default LLM provider to use */
    defaultProvider: 'groq' | 'openrouter' | 'mock';

    /** API keys for each provider */
    apiKeys: {
        groq?: string;
        openrouter?: string;
        mock?: string;
    };

    /** Custom model overrides per provider */
    models: {
        groq?: string;
        openrouter?: string;
        mock?: string;
    };

    /** Resolved storage paths configuration */
    storage: StorageConfig;

    /** File operation base directory (for sandboxing) - resolved absolute path */
    fileBaseDir: string;

    /** Maximum history messages to send to LLM */
    historyLimit: number;

    /** Enable compact tool schemas to reduce token usage */
    compactToolSchemas: boolean;

    /** Maximum number of retries for LLM calls */
    maxRetries: number;

    /** File operation size limits */
    limits: Limits;
}

/** Canonical config directory */
const CONFIG_DIR_NAME = '.assistant';

/**
 * Resolve ~ to home directory
 */
function expandHome(p: string): string {
    if (p.startsWith('~/') || p === '~') {
        return path.join(os.homedir(), p.slice(1));
    }
    return p;
}

/**
 * Get the configuration directory and file paths.
 * Uses ASSISTANT_CONFIG_DIR env var if set, otherwise ~/.assistant/
 */
function getConfigPaths() {
    let dir = path.join(os.homedir(), CONFIG_DIR_NAME);

    // Allow override via environment variable
    if (process.env.ASSISTANT_CONFIG_DIR) {
        dir = expandHome(process.env.ASSISTANT_CONFIG_DIR);
        if (!path.isAbsolute(dir)) {
            dir = path.join(os.homedir(), dir);
        }
    }

    return {
        dir,
        file: path.join(dir, 'config.json'),
        dataDir: path.join(dir, 'data')
    };
}

/**
 * Get default storage configuration
 * Defaults to packages/personal-assistant/data relative to this file's package root.
 */
function getDefaultStorage(): StorageConfig {
    // Determine package root relative to this file (src/core/config.ts or dist/core/config.js)
    // Up 2 levels: core -> src/dist -> package root
    const packageRoot = path.resolve(__dirname, '..', '..');
    const defaultDataDir = path.join(packageRoot, 'data');

    // Use configured directory if set via env var, otherwise package-relative default
    let baseDir = defaultDataDir;

    // Allow override via environment variable (legacy support, though usually handled in loadConfig)
    if (process.env.ASSISTANT_DATA_DIR) {
        baseDir = expandHome(process.env.ASSISTANT_DATA_DIR);
        if (!path.isAbsolute(baseDir)) {
             // If env var is relative, it should probably be relative to cwd or home?
             // Standard convention: relative env vars are relative to CWD.
             // But let's stick to previous behavior: absolute or home-relative.
             if (!baseDir.startsWith(path.sep)) {
                 baseDir = path.join(os.homedir(), baseDir);
             }
        }
    } else {
        // Fallback: check if we are in a monorepo structure and try to find the right place?
        // For now, the package-relative path is the deterministic anchor requested.
    }

    return {
        baseDir,
        memory: 'memory.json',
        tasks: 'tasks.jsonl',
        reminders: 'reminders.jsonl',
        memoryLog: 'memory.jsonl'
    };
}

/**
 * Resolve a storage path to an absolute path
 */
export function resolveStoragePath(relativePath: string, config?: AppConfig): string {
    const storage = config?.storage || getDefaultStorage();
    const baseDir = expandHome(storage.baseDir);
    return path.resolve(baseDir, relativePath);
}

/**
 * Get all resolved storage paths
 */
export function getStoragePaths(config?: AppConfig): {
    memory: string;
    tasks: string;
    reminders: string;
    memoryLog: string;
    baseDir: string;
} {
    const storage = config?.storage || getDefaultStorage();
    const baseDir = expandHome(storage.baseDir);

    return {
        baseDir,
        memory: path.resolve(baseDir, storage.memory),
        tasks: path.resolve(baseDir, storage.tasks),
        reminders: path.resolve(baseDir, storage.reminders),
        memoryLog: path.resolve(baseDir, storage.memoryLog)
    };
}

/**
 * Ensure storage directories exist.
 * Accepts ResolvedConfig, AppConfig, or just a baseDir string.
 */
export function ensureStorageExists(configOrPath: ResolvedConfig | AppConfig | string): void {
    let baseDir: string;

    if (typeof configOrPath === 'string') {
        baseDir = configOrPath;
    } else {
        // Handle both ResolvedConfig and AppConfig
        // ResolvedConfig has storage.baseDir as absolute path
        // AppConfig might need resolution
        if ('storage' in configOrPath && configOrPath.storage) {
             baseDir = expandHome(configOrPath.storage.baseDir);
        } else {
             baseDir = getDefaultStorage().baseDir;
        }
    }

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
}

/**
 * Zod schema for storage configuration validation
 */
const StorageConfigSchema = z.object({
    baseDir: z.string(),
    memory: z.string(),
    tasks: z.string(),
    reminders: z.string(),
    memoryLog: z.string()
}).partial();

/**
 * Zod schema for full application configuration validation
 */
const AppConfigSchema = z.object({
    version: z.number().optional(),
    defaultProvider: z.enum(['groq', 'openrouter', 'mock']).optional(),
    apiKeys: z.object({
        groq: z.string().optional(),
        openrouter: z.string().optional(),
        mock: z.string().optional()
    }).optional(),
    models: z.object({
        groq: z.string().optional(),
        openrouter: z.string().optional(),
        mock: z.string().optional()
    }).optional(),
    storage: StorageConfigSchema.optional(),
    fileBaseDir: z.string().optional(),
    historyLimit: z.number().min(1).max(50).optional(),
    compactToolSchemas: z.boolean().optional(),
    maxReadSize: z.number().int().positive().optional(),
    maxWriteSize: z.number().int().positive().optional(),
    maxRetries: z.number().min(1).max(10).optional()
});

/**
 * Load application configuration.
 * Merges file config with environment variable overrides.
 * 
 * Environment variables:
 *   - GROQ_API_KEY: Groq API key
 *   - OPENROUTER_API_KEY: OpenRouter API key
 *   - DEFAULT_PROVIDER: Override default provider
 *   - ASSISTANT_CONFIG_DIR: Override config directory
 *   - ASSISTANT_DATA_DIR: Override data directory
 */
export function loadConfig(): AppConfig {
    const { file: configFile } = getConfigPaths();

    // Default configuration
    let config: AppConfig = {
        version: 1,
        defaultProvider: 'groq',
        apiKeys: {},
        models: {},
        storage: getDefaultStorage(),
        maxReadSize: 1 * 1024 * 1024,
        maxWriteSize: 10 * 1024 * 1024
    };

    // 1. Load from file if exists (with Zod validation)
    if (fs.existsSync(configFile)) {
        try {
            const rawConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            const validated = AppConfigSchema.safeParse(rawConfig);

            if (validated.success) {
                const fileConfig = validated.data;
                // Merge validated config with defaults (keep defaults for missing fields)
                if (fileConfig.version !== undefined) config.version = fileConfig.version;
                if (fileConfig.defaultProvider) config.defaultProvider = fileConfig.defaultProvider;
                if (fileConfig.apiKeys) config.apiKeys = { ...config.apiKeys, ...fileConfig.apiKeys };
                if (fileConfig.models) config.models = { ...config.models, ...fileConfig.models };
                if (fileConfig.storage) config.storage = { ...config.storage!, ...fileConfig.storage } as StorageConfig;
                if (fileConfig.fileBaseDir) config.fileBaseDir = fileConfig.fileBaseDir;
                if (fileConfig.historyLimit !== undefined) config.historyLimit = fileConfig.historyLimit;
                if (fileConfig.compactToolSchemas !== undefined) config.compactToolSchemas = fileConfig.compactToolSchemas;
                if (fileConfig.maxReadSize !== undefined) config.maxReadSize = fileConfig.maxReadSize;
                if (fileConfig.maxWriteSize !== undefined) config.maxWriteSize = fileConfig.maxWriteSize;
                if (fileConfig.maxRetries !== undefined) config.maxRetries = fileConfig.maxRetries;
            } else {
                // Validation failed - log warning but continue with defaults
                console.warn('[WARN] Config validation failed, using defaults:', validated.error.issues.map((e: z.ZodIssue) => e.message).join(', '));
            }
        } catch (e) {
            // Ignore corrupted config, use defaults
        }
    }

    // 2. Override with environment variables
    if (process.env.GROQ_API_KEY) config.apiKeys.groq = process.env.GROQ_API_KEY;
    if (process.env.OPENROUTER_API_KEY) config.apiKeys.openrouter = process.env.OPENROUTER_API_KEY;

    if (process.env.DEFAULT_PROVIDER) {
        const provider = process.env.DEFAULT_PROVIDER as 'groq' | 'openrouter';
        if (['groq', 'openrouter'].includes(provider)) {
            config.defaultProvider = provider;
        }
    }

    // Override data directory if set
    if (process.env.ASSISTANT_DATA_DIR && config.storage) {
        let dataDir = expandHome(process.env.ASSISTANT_DATA_DIR);
        if (!path.isAbsolute(dataDir)) {
            dataDir = path.join(os.homedir(), dataDir);
        }
        config.storage.baseDir = dataDir;
    }

    return config;
}

/**
 * Save configuration updates to file.
 * Merges updates with existing config.
 */
export function saveConfig(updates: Partial<AppConfig>): void {
    const current = loadConfig();
    const newConfig = { ...current, ...updates };

    // Deep merge
    if (updates.apiKeys) newConfig.apiKeys = { ...current.apiKeys, ...updates.apiKeys };
    if (updates.models) newConfig.models = { ...current.models, ...updates.models };
    if (updates.storage) newConfig.storage = { ...current.storage, ...updates.storage };

    const { dir, file } = getConfigPaths();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(newConfig, null, 2), 'utf8');
}

/**
 * Get the file operation base directory
 * Priority: fileBaseDir > storage.baseDir > default storage baseDir
 * Respects ASSISTANT_DATA_DIR environment variable via getStoragePaths
 */
export function getFileBaseDir(config: AppConfig): string {
    // 1. Explicit fileBaseDir takes precedence
    if (config.fileBaseDir) {
        return expandHome(config.fileBaseDir);
    }
    // 2. Use getStoragePaths which respects ASSISTANT_DATA_DIR override
    return getStoragePaths(config).baseDir;
}

/**
 * Resolve an AppConfig into a fully resolved ResolvedConfig.
 * Applies all defaults and resolves paths.
 * Entrypoints should call this once after loadConfig().
 */
export function resolveConfig(config: AppConfig): ResolvedConfig {
    const storage = config.storage || getDefaultStorage();
    const resolvedStorage: StorageConfig = {
        baseDir: expandHome(storage.baseDir),
        memory: storage.memory,
        tasks: storage.tasks,
        reminders: storage.reminders,
        memoryLog: storage.memoryLog,
    };

    // Resolve limits with defaults and validate
    const maxReadSize = config.maxReadSize ?? 1 * 1024 * 1024;
    const maxWriteSize = config.maxWriteSize ?? 10 * 1024 * 1024;

    // Validate limits are sane
    if (maxReadSize <= 0) {
        throw new Error(`Invalid maxReadSize: ${maxReadSize} (must be > 0)`);
    }
    if (maxWriteSize <= 0) {
        throw new Error(`Invalid maxWriteSize: ${maxWriteSize} (must be > 0)`);
    }
    if (maxWriteSize < maxReadSize) {
        throw new Error(`Invalid limits: maxWriteSize (${maxWriteSize}) must be >= maxReadSize (${maxReadSize})`);
    }

    const limits: Limits = {
        maxReadSize,
        maxWriteSize
    };

    return {
        version: config.version ?? 1,
        defaultProvider: config.defaultProvider,
        apiKeys: config.apiKeys,
        models: config.models || {},
        storage: resolvedStorage,
        fileBaseDir: getFileBaseDir(config),
        historyLimit: config.historyLimit ?? 10,
        compactToolSchemas: config.compactToolSchemas ?? false,
        maxRetries: config.maxRetries ?? 3,
        limits,
    };
}

/**
 * Get package version using direct path lookup.
 * The package.json is at the package root:
 *   - From src/core/config.ts: ../../package.json
 *   - From dist/core/config.js: ../../package.json
 */
export function getPackageVersion(): string {
    try {
        // __dirname is src/core or dist/core, package.json is 2 levels up
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        if (fs.existsSync(pkgPath)) {
            return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '0.0.0';
        }
        // Fallback: try 3 levels up (in case of nested dist structure)
        const fallbackPath = path.join(__dirname, '..', '..', '..', 'package.json');
        if (fs.existsSync(fallbackPath)) {
            return JSON.parse(fs.readFileSync(fallbackPath, 'utf8')).version || '0.0.0';
        }
    } catch {
        // Ignore errors
    }
    return '0.0.0';
}
