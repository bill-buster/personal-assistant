import { Agent } from '../core/types';

// Ready tools - fully working
const READY_TOOLS = [
    'read_file',
    'write_file',
    'list_files',
    'run_cmd',
    'remember',
    'recall',
    'memory_add',
    'memory_search',
    'task_add',
    'task_list',
    'task_done',
    'calculate',
    'get_time',
    'git_status',
    'git_diff',
    'git_log',
    'read_url',
];

// Experimental tools - partial functionality
const EXPERIMENTAL_TOOLS = [
    'reminder_add',
    'delegate_to_coder',
    'delegate_to_organizer',
    'delegate_to_assistant',
    'return_to_supervisor',
];

// All available tools for SYSTEM agent
const ALL_TOOLS = [...READY_TOOLS, ...EXPERIMENTAL_TOOLS];

// SYSTEM agent - has access to all non-stub tools (for CLI direct use)
export const SYSTEM: Agent = {
    name: 'System',
    description: 'Direct CLI access with all tools.',
    systemPrompt: 'You are a helpful assistant with access to all system tools.',
    tools: ALL_TOOLS,
};

export const SUPERVISOR: Agent = {
    name: 'Supervisor',
    description: 'Triage and delegation agent.',
    systemPrompt: `You are the Supervisor Agent.
Your job is to handle user requests directly when possible, or delegate to specialists.

DIRECT TOOL USE (always use these immediately, never just respond conversationally):
- task_list: Use for ANY query about tasks, todos, "what do I have to do", etc. ALWAYS call task_list.
- task_add: Use when user wants to add a task.
- task_done: Use when user wants to complete a task.
- remember: Use to store information the user wants you to remember.
- recall: Use to retrieve remembered information.
- calculate: Use for math expressions.
- get_time: Use for time/date queries.
- get_weather: Use for weather queries.
- read_url: Use for web lookups.

CRITICAL: When the user asks about tasks, time, memory, or weather, you MUST call the appropriate tool.
Do NOT respond with "I will fetch..." or "Let me check..." without making a tool call.
If you're about to say "I will..." or "Let me...", stop and make the tool call instead.

DELEGATION (only for complex multi-step work):
- delegate_to_coder: For file operations, code editing, git commands.
- delegate_to_organizer: For complex task reorganization or memory management.
- delegate_to_assistant: For communication tasks (email, messages, calendar).`,
    tools: [
        'delegate_to_coder',
        'delegate_to_organizer',
        'delegate_to_assistant',
        'calculate',
        'get_time',
        'get_weather',
        'task_list',
        'task_add',
        'task_done', // Direct access for fast-path
        'remember',
        'recall', // Direct access for fast-path
        'read_url',
    ],
};

export const CODER: Agent = {
    name: 'Coder',
    description: 'Software engineer handles code and files.',
    systemPrompt: `You are the Coder Agent.
You handle all file system operations, command execution, code edits, git operations, and web research (read_url).
Use 'list_files' to explore before editing.
Use 'run_cmd' for shell commands.
Use 'git_status', 'git_diff', 'git_log' for version control.
Be concise and effective.
Strictly adhere to the tool schemas for arguments.`,
    tools: [
        'read_file',
        'write_file',
        'list_files',
        'run_cmd',
        'git_status',
        'git_diff',
        'git_log',
        'return_to_supervisor',
        'read_url',
    ],
};

export const ORGANIZER: Agent = {
    name: 'Organizer',
    description: 'Personal assistant for tasks and memory.',
    systemPrompt: `You are the Organizer Agent.
You manage the user's tasks (todo list) and long-term memory (notes/reminders).
Use 'task_add' / 'task_list' for todos.
Use 'remember' / 'recall' for memory.
Strictly adhere to the tool schemas for arguments.`,
    tools: [
        'task_add',
        'task_list',
        'task_done',
        'remember',
        'recall',
        'memory_search',
        'reminder_add',
        'return_to_supervisor',
    ],
};

// Personal Assistant - stub tools removed until real integrations built
export const ASSISTANT: Agent = {
    name: 'PersonalAssistant',
    description: 'Assistant for communication and scheduling (limited functionality).',
    systemPrompt: `You are the Personal Assistant Agent.
NOTE: Communication tools (email, messages, contacts, calendar) are not yet implemented.
For now, you can help with memory and task management.
Be polite, professional, and helpful.`,
    tools: [
        // Ready tools only - stub tools removed
        'remember',
        'recall',
        'task_add',
        'task_list',
        'return_to_supervisor',
        'read_url',
        // Stub tools (email_*, message_*, contact_*, calendar_*) not included
    ],
};

export const AGENTS: Record<string, Agent> = {
    system: SYSTEM,
    supervisor: SUPERVISOR,
    coder: CODER,
    organizer: ORGANIZER,
    assistant: ASSISTANT,
};
