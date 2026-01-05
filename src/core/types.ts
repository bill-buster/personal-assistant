import { z } from 'zod';

/**
 * File operation size limits (in bytes).
 * All limits are enforced at runtime via ExecutorContext.
 */
export type Limits = Readonly<{
    maxReadSize: number;
    maxWriteSize: number;
}>;

export interface ToolCall {
    tool_name: string;
    args: Record<string, any>;
    _debug?: DebugInfo | null;
}

/**
 * Token usage statistics from LLM API response.
 * Used for monitoring costs and optimizing prompts.
 */
export interface TokenUsage {
    prompt_tokens: number; // Tokens in the request (system + history + tools)
    completion_tokens: number; // Tokens in the response
    total_tokens: number; // Sum of above
}

export interface DebugInfo {
    path: string;
    duration_ms?: number | null;
    model: string | null;
    memory_read: boolean;
    memory_write: boolean;
    manual_parse?: boolean;
    start?: number;
}

export interface ToolSpec {
    /** Tool status: ready (works), stub (not implemented), experimental */
    status?: 'ready' | 'stub' | 'experimental';
    description?: string;
    required: string[]; // Array of required parameter names
    parameters: Record<
        string,
        {
            type: 'string' | 'integer' | 'boolean' | 'number';
            description: string;
            enum?: string[];
        }
    >;
}

export interface ToolResult {
    ok: boolean;
    tool_name?: string | null;
    result?: any;
    error?: ToolError | null;
    _debug?: DebugInfo | null;
    value?: {
        // Used in internal validation
        tool_name: string;
        args: any;
        _debug?: DebugInfo | null;
    };
}

export interface ToolError {
    code: string;
    message: string;
    details?: any;
}

export interface MemoryEntry {
    ts: string;
    text: string;
}

export interface Task {
    id: number;
    text: string;
    done: boolean;
    created_at: string;
    done_at?: string | null;
    due?: string | null;
    priority?: 'low' | 'medium' | 'high' | null;
}

export interface Reminder {
    id: number;
    text: string;
    due_at: string;
    done: boolean;
    created_at: string;
}

// Permission Configuration Types
export const PermissionsSchema = z.object({
    version: z.number().optional(),
    allow_paths: z.array(z.string()).default([]),
    allow_commands: z.array(z.string()).default([]),
    require_confirmation_for: z.array(z.string()).default([]),
    deny_tools: z.array(z.string()).default([]),
});

export type Permissions = z.infer<typeof PermissionsSchema>;

/**
 * Path operation type for permission checks.
 */
export type PathOp = 'read' | 'write' | 'list';

/**
 * Path capability helpers - throw-based API for path operations.
 * Tools should use these instead of raw safeResolve/isAllowedPath.
 */
export interface PathCapabilities {
    /**
     * Resolve a relative path to a canonical absolute path within baseDir.
     * Throws if path is invalid, absolute, contains '..', or resolves outside baseDir.
     */
    resolve(requestedPath: string): string;

    /**
     * Assert that a path is allowed for the given operation.
     * Throws if path is blocked or not in allowlist.
     */
    assertAllowed(path: string, op: PathOp): void;

    /**
     * Convenience: resolve then assert allowed.
     * Throws if path cannot be resolved or is not allowed.
     */
    resolveAllowed(requestedPath: string, op: PathOp): string;
}

/**
 * Command capability helpers - throw-based API for command execution.
 */
export interface CommandCapabilities {
    /**
     * Run a command if it's in the allowlist.
     * Throws if command is not allowed.
     * Returns execution result on success.
     */
    runAllowed(
        cmd: string,
        args?: string[],
        opts?: { confirm?: boolean }
    ): { ok: boolean; result?: string; error?: string; errorCode?: string };
}

export interface ExecutorContext {
    start: number;
    baseDir: string;
    memoryPath: string;
    memoryLimit: number | null;
    tasksPath: string;
    memoryLogPath: string;
    remindersPath: string;
    emailsPath: string;
    messagesPath: string;
    contactsPath: string;
    calendarPath: string;
    permissionsPath: string;
    auditPath: string;
    auditEnabled: boolean;
    permissions: Permissions;
    agent?: Agent;
    limits: Limits;

    // Functions
    requiresConfirmation: (toolName: string) => boolean;

    // Capability-based API
    paths: PathCapabilities;
    commands: CommandCapabilities;

    // Storage accessors
    readMemory: (path: string) => { entries: MemoryEntry[] };
    writeMemory: (path: string, data: { entries: MemoryEntry[] }) => void;
    readJsonl: <T>(path: string, isValid: (entry: any) => boolean) => T[];
    writeJsonl: <T>(path: string, entries: T[]) => void;
    appendJsonl: <T>(path: string, entry: T) => void;
    scoreEntry: (entry: MemoryEntry, needle: string, terms: string[]) => number;
    sortByScoreAndRecency: (
        entries: MemoryEntry[],
        needle: string,
        terms?: string[]
    ) => MemoryEntry[];
}

/**
 * Agent kind for privilege determination.
 * 'system' = full access (trusted, created by runtime)
 * 'user' = standard agent with explicit tool allowlist
 * 'worker' = specialized agent (coder, organizer, etc.)
 */
export type AgentKind = 'system' | 'user' | 'worker';

export interface Agent {
    name: string;
    description: string;
    systemPrompt: string;
    tools: string[];
    /** Agent kind for privilege checks. Defaults to 'user' if not specified. */
    kind?: AgentKind;
}

/**
 * Safe tools that can be used without agent context.
 * These are informational only - no filesystem, shell, or network access.
 */
export const SAFE_TOOLS = [
    'calculate', // Math only
    'get_time', // Time query only
    'delegate_to_coder', // Delegation only
    'delegate_to_organizer', // Delegation only
    'delegate_to_assistant', // Delegation only
] as const;

/**
 * Tool handler function type.
 * Each handler receives validated args and executor context.
 */
export type ToolHandler<T = any> = (
    args: T,
    context: ExecutorContext
) => ToolResult | Promise<ToolResult>;

/**
 * Tool Registry interface for dependency injection.
 * Provides tool schemas and handlers without direct imports.
 */
export interface ToolRegistry {
    /**
     * Get the handler function for a tool.
     * Returns undefined if tool doesn't exist.
     */
    getHandler(toolName: string): ToolHandler | undefined;

    /**
     * Get the Zod schema for validating tool arguments.
     * Returns undefined if no schema exists.
     */
    getSchema(toolName: string): z.ZodTypeAny | undefined;

    /**
     * List all registered tool names.
     */
    listTools(): string[];
}

export interface Message {
    role: 'user' | 'assistant' | 'tool' | 'system';
    content?: string | null;
    tool_calls?: {
        id: string; // Used by OpenAI
        type: 'function';
        function: {
            name: string;
            arguments: string; // JSON string
        };
    }[];
    tool_call_id?: string; // Used by OpenAI for 'tool' role
    name?: string; // Used by OpenAI for 'tool' role (function name)
}

/**
 * Discriminated union for route function return values.
 * Provides type safety for different routing outcomes.
 */
export type RouteResult = RouteError | RouteToolCall | RouteReply;

/**
 * Error result from route function.
 */
export interface RouteError {
    error: string;
    code: number;
}

/**
 * Successful route result with a tool call.
 */
export interface RouteToolCall {
    version: 1;
    intent: string;
    mode: 'tool_call';
    tool_call: ToolCall;
    reply: null;
    usage?: TokenUsage | null;
    _debug: DebugInfo;
}

/**
 * Successful route result with a conversational reply.
 */
export interface RouteReply {
    version: 1;
    intent: string;
    mode: 'reply';
    tool_call: null;
    reply: {
        instruction: string;
        content: string;
        prompt: string;
    };
    usage?: TokenUsage | null;
    _debug: DebugInfo;
}

/**
 * Type guard to check if RouteResult is a RouteError.
 */
export function isRouteError(result: RouteResult): result is RouteError {
    return 'error' in result;
}

/**
 * Type guard to check if RouteResult is a RouteToolCall.
 */
export function isRouteToolCall(result: RouteResult): result is RouteToolCall {
    return 'mode' in result && result.mode === 'tool_call';
}

/**
 * Type guard to check if RouteResult is a RouteReply.
 */
export function isRouteReply(result: RouteResult): result is RouteReply {
    return 'mode' in result && result.mode === 'reply';
}

// --- Zod Schemas & Types ---

export const WriteFileSchema = z.object({
    path: z.string().min(1),
    content: z.string(), // Content can be empty
    confirm: z.boolean().optional(),
});
export type WriteFileArgs = z.infer<typeof WriteFileSchema>;

export const ReadFileSchema = z.object({
    path: z.string().min(1),
    offset: z.number().int().min(0).optional().default(0),
    limit: z.number().int().min(1).max(65536).optional().default(8192),
});
export type ReadFileArgs = z.infer<typeof ReadFileSchema>;

export const ListFilesSchema = z.object({
    path: z.string().optional(),
});
export type ListFilesArgs = z.infer<typeof ListFilesSchema>;

export const DeleteFileSchema = z.object({
    path: z.string().min(1),
    confirm: z.boolean().optional(),
});
export type DeleteFileArgs = z.infer<typeof DeleteFileSchema>;

export const RunCmdSchema = z.object({
    command: z.string().min(1),
    confirm: z.boolean().optional(),
});
export type RunCmdArgs = z.infer<typeof RunCmdSchema>;

export const RememberSchema = z.object({
    text: z.string().min(1),
});
export type RememberArgs = z.infer<typeof RememberSchema>;

export const RecallSchema = z.object({
    query: z.string().min(1),
});
export type RecallArgs = z.infer<typeof RecallSchema>;

export const MemoryAddSchema = z.object({
    text: z.string().min(1),
});
export type MemoryAddArgs = z.infer<typeof MemoryAddSchema>;

export const MemorySearchSchema = z.object({
    query: z.string().min(1),
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
});
export type MemorySearchArgs = z.infer<typeof MemorySearchSchema>;

export const TaskAddSchema = z.object({
    text: z.string().min(1),
    due: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
});
export type TaskAddArgs = z.infer<typeof TaskAddSchema>;

export const TaskListSchema = z.object({
    status: z.enum(['open', 'done', 'all']).optional(),
});
export type TaskListArgs = z.infer<typeof TaskListSchema>;

export const TaskDoneSchema = z.object({
    id: z.number().int(),
});
export type TaskDoneArgs = z.infer<typeof TaskDoneSchema>;

export const ReminderAddSchema = z.object({
    text: z.string().min(1),
    in_seconds: z.number().int().positive(),
});
export type ReminderAddArgs = z.infer<typeof ReminderAddSchema>;

export const ReminderListSchema = z.object({
    start_time: z.string().optional(),
});
export type ReminderListArgs = z.infer<typeof ReminderListSchema>;

export const CalculateSchema = z.object({
    expression: z.string().min(1),
});
export type CalculateArgs = z.infer<typeof CalculateSchema>;

export const GetTimeSchema = z.object({
    format: z.string().optional(),
});
export type GetTimeArgs = z.infer<typeof GetTimeSchema>;

export const GetWeatherSchema = z.object({
    location: z.string().min(1),
});
export type GetWeatherArgs = z.infer<typeof GetWeatherSchema>;

export const DelegateSchema = z.object({
    task: z.string().min(1),
});
export type DelegateArgs = z.infer<typeof DelegateSchema>;

export const EmailListSchema = z.object({
    limit: z.number().int().optional(),
});
export type EmailListArgs = z.infer<typeof EmailListSchema>;

export const EmailSendSchema = z.object({
    to: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
});
export type EmailSendArgs = z.infer<typeof EmailSendSchema>;

export const EmailGetDetailsSchema = z.object({
    id: z.string().min(1),
});
export type EmailGetDetailsArgs = z.infer<typeof EmailGetDetailsSchema>;

export const MessageListSchema = z.object({
    limit: z.number().int().optional(),
});
export type MessageListArgs = z.infer<typeof MessageListSchema>;

export const MessageSendSchema = z.object({
    to: z.string().min(1),
    body: z.string().min(1),
});
export type MessageSendArgs = z.infer<typeof MessageSendSchema>;

export const ContactSearchSchema = z.object({
    query: z.string().min(1),
});
export type ContactSearchArgs = z.infer<typeof ContactSearchSchema>;

export const ContactAddSchema = z.object({
    name: z.string().min(1),
    email: z.string().optional(),
    phone: z.string().optional(),
});
export type ContactAddArgs = z.infer<typeof ContactAddSchema>;

export const ContactUpdateSchema = z.object({
    name: z.string().min(1),
    email: z.string().optional(),
    phone: z.string().optional(),
});
export type ContactUpdateArgs = z.infer<typeof ContactUpdateSchema>;

export const CalendarListSchema = z.object({
    days: z.number().int().optional(),
});
export type CalendarListArgs = z.infer<typeof CalendarListSchema>;

export const CalendarEventAddSchema = z.object({
    title: z.string().min(1),
    start_time: z.string().min(1),
    duration_minutes: z.number().int().optional(),
});
export type CalendarEventAddArgs = z.infer<typeof CalendarEventAddSchema>;

export const CalendarEventUpdateSchema = z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    start_time: z.string().optional(),
});
export type CalendarEventUpdateArgs = z.infer<typeof CalendarEventUpdateSchema>;

export const GitStatusSchema = z.object({}).optional();
export type GitStatusArgs = z.infer<typeof GitStatusSchema>;

export const GitDiffSchema = z.object({
    staged: z.boolean().optional(),
    path: z.string().optional(),
});
export type GitDiffArgs = z.infer<typeof GitDiffSchema>;

export const GitLogSchema = z.object({
    limit: z.number().int().optional(),
});
export type GitLogArgs = z.infer<typeof GitLogSchema>;

export const ReadUrlSchema = z.object({
    url: z.string().url(),
});
export type ReadUrlArgs = z.infer<typeof ReadUrlSchema>;

export const ReturnToSupervisorSchema = z.object({});
export type ReturnToSupervisorArgs = z.infer<typeof ReturnToSupervisorSchema>;

export const ToolSchemas: Record<string, z.ZodTypeAny> = {
    write_file: WriteFileSchema,
    read_file: ReadFileSchema,
    list_files: ListFilesSchema,
    delete_file: DeleteFileSchema,
    run_cmd: RunCmdSchema,
    remember: RememberSchema,
    recall: RecallSchema,
    memory_add: MemoryAddSchema,
    memory_search: MemorySearchSchema,
    task_add: TaskAddSchema,
    task_list: TaskListSchema,
    task_done: TaskDoneSchema,
    reminder_add: ReminderAddSchema,
    reminder_list: ReminderListSchema,
    calculate: CalculateSchema,
    get_time: GetTimeSchema,
    get_weather: GetWeatherSchema,
    delegate_to_coder: DelegateSchema,
    delegate_to_organizer: DelegateSchema,
    delegate_to_assistant: DelegateSchema,
    email_list: EmailListSchema,
    email_send: EmailSendSchema,
    email_get_details: EmailGetDetailsSchema,
    message_list: MessageListSchema,
    message_send: MessageSendSchema,
    contact_search: ContactSearchSchema,
    contact_add: ContactAddSchema,
    contact_update: ContactUpdateSchema,
    calendar_list: CalendarListSchema,
    calendar_event_add: CalendarEventAddSchema,
    calendar_event_update: CalendarEventUpdateSchema,
    git_status: GitStatusSchema,
    git_diff: GitDiffSchema,
    git_log: GitLogSchema,
    read_url: ReadUrlSchema,
    return_to_supervisor: ReturnToSupervisorSchema,
};
