/**
 * Tool Registry implementation.
 *
 * This is the ONLY module that imports concrete tool implementations.
 * All tool dispatch goes through the registry interface.
 *
 * @module tool_registry
 */

import { z } from 'zod';
import { ToolRegistry, ToolHandler, ToolSchemas, ToolSpec } from './types';
import { loadAllPlugins, mergePluginTools } from './plugin_loader';

// Tool handlers - all concrete implementations imported here
import {
    handleWriteFile,
    handleReadFile,
    handleListFiles,
    handleDeleteFile,
    handleMoveFile,
    handleCopyFile,
    handleFileInfo,
    handleCountWords,
    handleCreateDirectory,
    handleDeleteDirectory,
    handleRunCmd,
    handleRemember,
    handleRecall,
    handleMemoryAdd,
    handleMemorySearch,
    handleTaskAdd,
    handleTaskList,
    handleTaskDone,
    handleReminderAdd,
    handleReminderList,
} from '../tools';
import {
    handleCalculate,
    handleGetTime,
    handleGetWeather,
    handleDelegateToCoder,
    handleDelegateToOrganizer,
    handleDelegateToAssistant,
} from '../tools/utility_tools';
import {
    handleEmailList,
    handleEmailSend,
    handleEmailGetDetails,
    handleMessageList,
    handleMessageSend,
} from '../tools/comms_tools';
import {
    handleContactSearch,
    handleContactAdd,
    handleContactUpdate,
    handleCalendarList,
    handleCalendarEventAdd,
    handleCalendarEventUpdate,
} from '../tools/productivity_tools';
import { handleGitStatus, handleGitDiff, handleGitLog } from '../tools/git_tools';
import { handleReadUrl } from '../tools/fetch_tools';
import { handleCursorCommandEval } from '../tools/cursor_command_eval';
import { handleGrep } from '../tools/grep_tools';

/**
 * Node.js implementation of ToolRegistry.
 * Provides tool handlers and schemas for the executor.
 */
class NodeToolRegistry implements ToolRegistry {
    private handlers: Record<string, ToolHandler>;
    private schemas: Record<string, z.ZodTypeAny>;

    constructor(handlers: Record<string, ToolHandler>, schemas: Record<string, z.ZodTypeAny>) {
        this.handlers = handlers;
        this.schemas = schemas;
    }

    getHandler(toolName: string): ToolHandler | undefined {
        return this.handlers[toolName];
    }

    getSchema(toolName: string): z.ZodTypeAny | undefined {
        return this.schemas[toolName];
    }

    listTools(): string[] {
        return Object.keys(this.handlers);
    }
}

/**
 * Tool handler dispatch map.
 * Maps tool names to their handler implementations.
 * Note: Handlers have specific arg types, but we use ToolHandler<unknown> for the map.
 * Type assertions are used because handlers are validated at runtime via Zod schemas.
 */
const TOOL_HANDLERS: Record<string, ToolHandler<unknown>> = {
    write_file: handleWriteFile as ToolHandler<unknown>,
    read_file: handleReadFile as ToolHandler<unknown>,
    list_files: handleListFiles as ToolHandler<unknown>,
    delete_file: handleDeleteFile as ToolHandler<unknown>,
    move_file: handleMoveFile as ToolHandler<unknown>,
    copy_file: handleCopyFile as ToolHandler<unknown>,
    file_info: handleFileInfo as ToolHandler<unknown>,
    count_words: handleCountWords as ToolHandler<unknown>,
    create_directory: handleCreateDirectory as ToolHandler<unknown>,
    delete_directory: handleDeleteDirectory as ToolHandler<unknown>,
    run_cmd: handleRunCmd as ToolHandler<unknown>,
    remember: handleRemember as ToolHandler<unknown>,
    recall: handleRecall as ToolHandler<unknown>,
    memory_add: handleMemoryAdd as ToolHandler<unknown>,
    memory_search: handleMemorySearch as ToolHandler<unknown>,
    task_add: handleTaskAdd as ToolHandler<unknown>,
    task_list: handleTaskList as ToolHandler<unknown>,
    task_done: handleTaskDone as ToolHandler<unknown>,
    reminder_add: handleReminderAdd as ToolHandler<unknown>,
    reminder_list: handleReminderList as ToolHandler<unknown>,
    calculate: handleCalculate as ToolHandler<unknown>,
    get_time: handleGetTime as ToolHandler<unknown>,
    get_weather: handleGetWeather as ToolHandler<unknown>,
    delegate_to_coder: handleDelegateToCoder as ToolHandler<unknown>,
    delegate_to_organizer: handleDelegateToOrganizer as ToolHandler<unknown>,
    delegate_to_assistant: handleDelegateToAssistant as ToolHandler<unknown>,
    email_list: handleEmailList as ToolHandler<unknown>,
    email_send: handleEmailSend as ToolHandler<unknown>,
    email_get_details: handleEmailGetDetails as ToolHandler<unknown>,
    message_list: handleMessageList as ToolHandler<unknown>,
    message_send: handleMessageSend as ToolHandler<unknown>,
    contact_search: handleContactSearch as ToolHandler<unknown>,
    contact_add: handleContactAdd as ToolHandler<unknown>,
    contact_update: handleContactUpdate as ToolHandler<unknown>,
    calendar_list: handleCalendarList as ToolHandler<unknown>,
    calendar_event_add: handleCalendarEventAdd as ToolHandler<unknown>,
    calendar_event_update: handleCalendarEventUpdate as ToolHandler<unknown>,
    git_status: handleGitStatus as ToolHandler<unknown>,
    git_diff: handleGitDiff as ToolHandler<unknown>,
    git_log: handleGitLog as ToolHandler<unknown>,
    read_url: handleReadUrl as ToolHandler<unknown>,
    cursor_command_eval: handleCursorCommandEval as ToolHandler<unknown>,
    grep: handleGrep as ToolHandler<unknown>,
};

/**
 * Create a NodeToolRegistry with all registered tools.
 * This is the factory function used by entrypoints.
 * Automatically loads plugins from ~/.assistant/plugins/ if they exist.
 */
export function createNodeToolRegistry(): ToolRegistry {
    // Load plugins and merge with built-in tools
    const plugins = loadAllPlugins();
    const pluginTools = mergePluginTools(plugins);

    // Merge built-in tools with plugin tools (built-in take precedence)
    const allHandlers: Record<string, ToolHandler> = {
        ...pluginTools.handlers, // Plugins first (lower priority)
        ...TOOL_HANDLERS, // Built-in tools override plugins
    };

    // Merge schemas (convert ToolSpec to Zod schema)
    const allSchemas: Record<string, z.ZodTypeAny> = {
        ...ToolSchemas, // Built-in schemas
    };

    // Add plugin schemas (plugins use ToolSpec format, need conversion)
    for (const [name, spec] of Object.entries(pluginTools.schemas)) {
        // Convert ToolSpec to Zod schema
        const zodSchema = convertToolSpecToZod(spec, name);
        if (zodSchema) {
            allSchemas[name] = zodSchema;
        }
    }

    return new NodeToolRegistry(allHandlers, allSchemas);
}

/**
 * Convert a ToolSpec to a Zod schema.
 * This is a simplified conversion - full conversion would need more logic.
 * @param spec - ToolSpec to convert
 * @param toolName - Tool name for error reporting
 * @returns Zod schema or null if conversion fails
 */
function convertToolSpecToZod(spec: ToolSpec, toolName: string): z.ZodTypeAny | null {
    try {
        const shape: Record<string, z.ZodTypeAny> = {};

        if (spec.parameters) {
            for (const [key, param] of Object.entries(spec.parameters)) {
                let zodType: z.ZodTypeAny;

                switch (param.type) {
                    case 'string':
                        zodType = z.string();
                        break;
                    case 'integer':
                        zodType = z.number().int();
                        break;
                    case 'number':
                        zodType = z.number();
                        break;
                    case 'boolean':
                        zodType = z.boolean();
                        break;
                    default:
                        zodType = z.any();
                }

                if (param.enum) {
                    zodType = z.enum(param.enum as [string, ...string[]]);
                }

                if (!spec.required?.includes(key)) {
                    zodType = zodType.optional();
                }

                shape[key] = zodType;
            }
        }

        return z.object(shape);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn(
            `[Plugin Warning] Failed to convert schema for plugin tool '${toolName}': ${message}. Tool will load without schema validation.`
        );
        return null;
    }
}

/**
 * Export the default registry for convenience.
 * Entrypoints should prefer using createNodeToolRegistry() for explicit construction.
 */
export const defaultRegistry = createNodeToolRegistry();
