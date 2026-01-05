
import { ToolSpec } from '../core/types';

export const TOOL_SCHEMAS: Record<string, ToolSpec> = {
    // === READY TOOLS (fully working) ===
    remember: {
        status: 'ready',
        description: "Store a piece of information in long-term memory.",
        required: ['text'],
        parameters: {
            text: { type: 'string', description: "The information to remember." }
        }
    },
    recall: {
        status: 'ready',
        description: "Search for information in long-term memory.",
        required: ['query'],
        parameters: {
            query: { type: 'string', description: "The topic or keywords to search for." }
        }
    },
    task_add: {
        status: 'ready',
        description: "Add a new task to the todo list.",
        required: ['text'],
        parameters: {
            text: { type: 'string', description: "The task description." },
            due: { type: 'string', description: "Optional due date (YYYY-MM-DD)." },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], description: "Optional priority level." }
        }
    },
    task_list: {
        status: 'ready',
        description: "List tasks from the todo list.",
        required: [],
        parameters: {
            status: { type: 'string', enum: ['open', 'done', 'all'], description: "Filter by status: 'open', 'done', or 'all'. Defaults to 'all'." }
        }
    },
    task_done: {
        status: 'ready',
        description: "Mark a task as completed.",
        required: ['id'],
        parameters: {
            id: { type: 'integer', description: "The ID of the task to complete." }
        }
    },
    write_file: {
        status: 'ready',
        description: "Create or overwrite a file with specific content.",
        required: ['path', 'content'],
        parameters: {
            path: { type: 'string', description: "File path to write to." },
            content: { type: 'string', description: "Content to write." }
        }
    },
    read_file: {
        status: 'ready',
        description: "Read the full content of a file.",
        required: ['path'],
        parameters: {
            path: { type: 'string', description: "File path to read." }
        }
    },
    list_files: {
        status: 'ready',
        description: "List files in the current working directory.",
        required: [],
        parameters: {}
    },
    run_cmd: {
        status: 'ready',
        description: "Execute a safe shell command (ls, pwd, cat, du).",
        required: ['command'],
        parameters: {
            command: { type: 'string', description: "The shell command to run." }
        }
    },
    memory_add: {
        status: 'ready',
        description: "Append a piece of information to the memory log.",
        required: ['text'],
        parameters: {
            text: { type: 'string', description: "The information to add." }
        }
    },
    memory_search: {
        status: 'ready',
        description: "Search the memory log for matching entries.",
        required: ['query'],
        parameters: {
            query: { type: 'string', description: "The search query." },
            limit: { type: 'integer', description: "Maximum number of results (default: 5)." },
            offset: { type: 'integer', description: "Number of results to skip (default: 0)." }
        }
    },
    calculate: {
        status: 'ready',
        description: 'Evaluate a mathematical expression (e.g., "125 * 8", "Math.sqrt(144)").',
        required: ['expression'],
        parameters: {
            expression: { type: 'string', description: "The mathematical expression to evaluate" }
        }
    },
    get_time: {
        status: 'ready',
        description: 'Get the current date and time.',
        required: [],
        parameters: {}
    },
    get_weather: {
        status: 'ready',
        description: 'Get weather information for a location.',
        required: ['location'],
        parameters: {
            location: { type: 'string', description: 'City name or location (e.g., "Fremont, CA")' }
        }
    },
    git_status: {
        status: 'ready',
        description: 'Show git working tree status (modified, staged, untracked files).',
        required: [],
        parameters: {}
    },
    git_diff: {
        status: 'ready',
        description: 'Show git diff summary (staged or unstaged changes).',
        required: [],
        parameters: {
            staged: { type: 'boolean', description: 'Show staged changes only.' },
            path: { type: 'string', description: 'Specific file path to diff.' }
        }
    },
    git_log: {
        status: 'ready',
        description: 'Show recent git commits.',
        required: [],
        parameters: {
            limit: { type: 'integer', description: 'Number of commits to show (default: 10, max: 50).' }
        }
    },
    read_url: {
        status: 'ready',
        description: 'Fetch and extract text content from a URL.',
        required: ['url'],
        parameters: {
            url: { type: 'string', description: 'The URL to fetch.' }
        }
    },

    // === EXPERIMENTAL TOOLS (partial functionality) ===
    reminder_add: {
        status: 'experimental',
        description: "[EXPERIMENTAL] Add a reminder (stored but does not trigger).",
        required: ['text', 'in_seconds'],
        parameters: {
            text: { type: 'string', description: "The reminder text." },
            in_seconds: { type: 'integer', description: "Seconds until the reminder triggers." }
        }
    },
    reminder_list: {
        status: 'experimental',
        description: "[EXPERIMENTAL] List reminders (stored but do not trigger).",
        required: [],
        parameters: {
            start_time: { type: 'string', description: "Optional start time filter (ISO format)." }
        }
    },
    delegate_to_coder: {
        status: 'experimental',
        description: "[EXPERIMENTAL] Handoff a technical task to the Coder agent.",
        required: ['task'],
        parameters: {
            task: { type: 'string', description: "The coding task to delegate. Be specific." }
        }
    },
    delegate_to_organizer: {
        status: 'experimental',
        description: "[EXPERIMENTAL] Handoff a task to the Organizer agent.",
        required: ['task'],
        parameters: {
            task: { type: 'string', description: "The organization task to delegate." }
        }
    },
    delegate_to_assistant: {
        status: 'experimental',
        description: '[EXPERIMENTAL] Delegate to the Personal Assistant agent.',
        required: ['task'],
        parameters: {
            task: { type: 'string', description: 'The personal assistant task to delegate.' }
        }
    },
    return_to_supervisor: {
        status: 'experimental',
        description: 'Return control to the Supervisor agent.',
        required: [],
        parameters: {}
    },

    // === STUB TOOLS (now implemented via local files) ===
    email_list: {
        status: 'ready',
        description: 'List recent emails (local simulation).',
        required: [],
        parameters: {
            limit: { type: 'integer', description: 'Maximum number of emails to return.' }
        }
    },
    email_send: {
        status: 'ready',
        description: 'Send a new email (local simulation).',
        required: ['to', 'subject', 'body'],
        parameters: {
            to: { type: 'string', description: 'Recipient email address.' },
            subject: { type: 'string', description: 'Email subject.' },
            body: { type: 'string', description: 'Email body content.' }
        }
    },
    email_get_details: {
        status: 'ready',
        description: 'Get email details (local simulation).',
        required: ['id'],
        parameters: {
            id: { type: 'string', description: 'The unique ID of the email.' }
        }
    },
    message_list: {
        status: 'ready',
        description: 'List recent messages (local simulation).',
        required: [],
        parameters: {
            limit: { type: 'integer', description: 'Max messages to show.' }
        }
    },
    message_send: {
        status: 'ready',
        description: 'Send an iMessage (macOS only).',
        required: ['to', 'body'],
        parameters: {
            to: { type: 'string', description: 'Recipient name, email, or phone number.' },
            body: { type: 'string', description: 'Message content.' }
        }
    },
    contact_search: {
        status: 'ready',
        description: 'Search contacts.',
        required: ['query'],
        parameters: {
            query: { type: 'string', description: 'Search keywords.' }
        }
    },
    contact_add: {
        status: 'ready',
        description: 'Add a new contact.',
        required: ['name'],
        parameters: {
            name: { type: 'string', description: 'Full name of the contact.' },
            email: { type: 'string', description: 'Email address.' },
            phone: { type: 'string', description: 'Phone number.' }
        }
    },
    contact_update: {
        status: 'ready',
        description: 'Update an existing contact.',
        required: ['name'],
        parameters: {
            name: { type: 'string', description: 'Name of the contact to update.' },
            email: { type: 'string', description: 'New email address.' },
            phone: { type: 'string', description: 'New phone number.' }
        }
    },
    calendar_list: {
        status: 'ready',
        description: 'List calendar events.',
        required: [],
        parameters: {
            days: { type: 'integer', description: 'Number of days to look ahead (default: 7).' }
        }
    },
    calendar_event_add: {
        status: 'ready',
        description: 'Add calendar event.',
        required: ['title', 'start_time'],
        parameters: {
            title: { type: 'string', description: 'Event title.' },
            start_time: { type: 'string', description: 'Start time (ISO format or relative).' },
            duration_minutes: { type: 'integer', description: 'Duration in minutes.' }
        }
    },
    calendar_event_update: {
        status: 'ready',
        description: 'Update calendar event.',
        required: ['id'],
        parameters: {
            id: { type: 'string', description: 'ID of the event to update.' },
            title: { type: 'string', description: 'New title.' },
            start_time: { type: 'string', description: 'New start time.' }
        }
    }
};

/**
 * Get only tools that are ready for production use
 */
export function getReadyTools(): Record<string, ToolSpec> {
    const ready: Record<string, ToolSpec> = {};
    for (const [name, spec] of Object.entries(TOOL_SCHEMAS)) {
        if (spec.status === 'ready' || spec.status === 'experimental') {
            ready[name] = spec;
        }
    }
    return ready;
}

/**
 * Check if a tool is a stub (not implemented)
 */
export function isStubTool(toolName: string): boolean {
    return TOOL_SCHEMAS[toolName]?.status === 'stub';
}

/**
 * Get production tools only (excludes all stubs)
 * Use this when you want to ensure no stub tools are exposed
 */
export function getProductionTools(): Record<string, ToolSpec> {
    const result: Record<string, ToolSpec> = {};
    for (const [name, spec] of Object.entries(TOOL_SCHEMAS)) {
        if (spec.status !== 'stub') {
            result[name] = spec;
        }
    }
    return result;
}

/**
 * Get stub tool names for informational purposes
 */
export function getStubToolNames(): string[] {
    return Object.entries(TOOL_SCHEMAS)
        .filter(([_, spec]) => spec.status === 'stub')
        .map(([name]) => name);
}
