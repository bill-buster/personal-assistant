/**
 * Plugin loader for external tools.
 * Loads tools from ~/.assistant/plugins/
 *
 * @module plugin_loader
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';
import type { ToolHandler, ToolSpec } from './types';

/**
 * Plugin metadata schema.
 */
const PluginManifestSchema = z.object({
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    tools: z.array(
        z.object({
            name: z.string(),
            handler: z.string(), // Path to handler function export
            schema: z.any(), // ToolSpec
        })
    ),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

/**
 * Loaded plugin with handlers.
 */
export interface LoadedPlugin {
    name: string;
    version: string;
    description?: string;
    tools: Map<string, { handler: ToolHandler; schema: ToolSpec }>;
}

/**
 * Discover plugins in the plugins directory.
 */
export function discoverPlugins(
    pluginsDir: string = path.join(os.homedir(), '.assistant', 'plugins')
): string[] {
    if (!fs.existsSync(pluginsDir)) {
        return [];
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const pluginDirs: string[] = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const pluginPath = path.join(pluginsDir, entry.name);
            const manifestPath = path.join(pluginPath, 'package.json');
            if (fs.existsSync(manifestPath)) {
                pluginDirs.push(pluginPath);
            }
        }
    }

    return pluginDirs;
}

/**
 * Load a single plugin.
 */
export function loadPlugin(pluginPath: string): LoadedPlugin | null {
    try {
        const manifestPath = path.join(pluginPath, 'package.json');
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifestJson = JSON.parse(manifestContent);

        // Validate manifest
        const manifest = PluginManifestSchema.parse(manifestJson);

        // Load the plugin module
        const indexPath = path.join(pluginPath, 'index.js');
        if (!fs.existsSync(indexPath)) {
            console.warn(`[Plugin] ${manifest.name}: index.js not found, skipping`);
            return null;
        }

        // Use require to load the plugin (CommonJS)

        const pluginModule = require(indexPath);

        const tools = new Map<string, { handler: ToolHandler; schema: ToolSpec }>();

        for (const toolDef of manifest.tools) {
            const handler = pluginModule[toolDef.handler];
            if (!handler || typeof handler !== 'function') {
                console.warn(
                    `[Plugin] ${manifest.name}: Handler "${toolDef.handler}" not found, skipping tool "${toolDef.name}"`
                );
                continue;
            }

            tools.set(toolDef.name, {
                handler: handler as ToolHandler,
                schema: toolDef.schema,
            });
        }

        return {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            tools,
        };
    } catch (err: any) {
        console.error(`[Plugin] Failed to load plugin from ${pluginPath}: ${err.message}`);
        return null;
    }
}

/**
 * Load all plugins from the plugins directory.
 */
export function loadAllPlugins(pluginsDir?: string): LoadedPlugin[] {
    const pluginPaths = discoverPlugins(pluginsDir);
    const loaded: LoadedPlugin[] = [];

    for (const pluginPath of pluginPaths) {
        const plugin = loadPlugin(pluginPath);
        if (plugin) {
            loaded.push(plugin);
            console.log(
                `[Plugin] Loaded ${plugin.name} v${plugin.version} (${plugin.tools.size} tools)`
            );
        }
    }

    return loaded;
}

/**
 * Merge plugin tools into a tool registry.
 * Returns maps of handlers and schemas that can be merged with existing registry.
 */
export function mergePluginTools(plugins: LoadedPlugin[]): {
    handlers: Record<string, ToolHandler>;
    schemas: Record<string, ToolSpec>;
} {
    const handlers: Record<string, ToolHandler> = {};
    const schemas: Record<string, ToolSpec> = {};

    for (const plugin of plugins) {
        for (const [toolName, tool] of plugin.tools.entries()) {
            // Prefix tool name with plugin name to avoid conflicts
            const prefixedName = `${plugin.name}_${toolName}`;
            handlers[prefixedName] = tool.handler;
            schemas[prefixedName] = tool.schema;
        }
    }

    return { handlers, schemas };
}
