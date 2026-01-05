/**
 * Tool Registry implementation.
 *
 * This is the ONLY module that imports concrete tool implementations.
 * All tool dispatch goes through the registry interface.
 *
 * @module tool_registry
 */

import { z } from 'zod';
import {
    ToolRegistry,
    ToolHandler,
    ToolSchemas,
} from './types';

// Tool handlers - all concrete implementations imported here
import {
    handleWriteFile,
    handleReadFile,
    handleListFiles,
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
import {
    handleGitStatus,
    handleGitDiff,
    handleGitLog,
} from '../tools/git_tools';
import { handleReadUrl } from '../tools/fetch_tools';

/**
 * Node.js implementation of ToolRegistry.
 * Provides tool handlers and schemas for the executor.
 */
class NodeToolRegistry implements ToolRegistry {
    private handlers: Record<string, ToolHandler>;
    private schemas: Record<string, z.ZodTypeAny>;

    constructor(
        handlers: Record<string, ToolHandler>,
        schemas: Record<string, z.ZodTypeAny>
    ) {
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
 */
const TOOL_HANDLERS: Record<string, ToolHandler> = {
    write_file: handleWriteFile,
    read_file: handleReadFile,
    list_files: handleListFiles,
    run_cmd: handleRunCmd,
    remember: handleRemember,
    recall: handleRecall,
    memory_add: handleMemoryAdd,
    memory_search: handleMemorySearch,
    task_add: handleTaskAdd,
    task_list: handleTaskList,
    task_done: handleTaskDone,
    reminder_add: handleReminderAdd,
    reminder_list: handleReminderList,
    calculate: handleCalculate,
    get_time: handleGetTime,
    get_weather: handleGetWeather,
    delegate_to_coder: handleDelegateToCoder,
    delegate_to_organizer: handleDelegateToOrganizer,
    delegate_to_assistant: handleDelegateToAssistant,
    email_list: handleEmailList,
    email_send: handleEmailSend,
    email_get_details: handleEmailGetDetails,
    message_list: handleMessageList,
    message_send: handleMessageSend,
    contact_search: handleContactSearch,
    contact_add: handleContactAdd,
    contact_update: handleContactUpdate,
    calendar_list: handleCalendarList,
    calendar_event_add: handleCalendarEventAdd,
    calendar_event_update: handleCalendarEventUpdate,
    git_status: handleGitStatus,
    git_diff: handleGitDiff,
    git_log: handleGitLog,
    read_url: handleReadUrl,
};

/**
 * Create a NodeToolRegistry with all registered tools.
 * This is the factory function used by entrypoints.
 */
export function createNodeToolRegistry(): ToolRegistry {
    return new NodeToolRegistry(TOOL_HANDLERS, ToolSchemas);
}

/**
 * Export the default registry for convenience.
 * Entrypoints should prefer using createNodeToolRegistry() for explicit construction.
 */
export const defaultRegistry = createNodeToolRegistry();
