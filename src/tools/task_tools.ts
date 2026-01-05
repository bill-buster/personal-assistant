/**
 * Task management tool handlers.
 * @module tools/task_tools
 */

import { makeError } from '../core/tool_contract';
import { makeDebug } from '../core/debug';
import { ExecutorContext, ToolResult, Task, Reminder, TaskAddArgs, TaskListArgs, TaskDoneArgs, ReminderAddArgs, ReminderListArgs } from '../core/types';

/**
 * Generate a unique task ID.
 * Uses max existing ID + 1 to maintain sequential ordering.
 * Note: For true thread-safety in concurrent scenarios, consider using
 * a database with auto-increment or file locking.
 */
function generateTaskId(existingTasks: Task[]): number {
    return existingTasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
}

/**
 * Generate a unique reminder ID using the same strategy.
 */
function generateReminderId(existingReminders: Reminder[]): number {
    return existingReminders.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

/**
 * Handle task_add tool.
 * @param {TaskAddArgs} args - Tool arguments containing text, due, priority.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleTaskAdd(args: TaskAddArgs, context: ExecutorContext): ToolResult {
    const { readJsonl, writeJsonl, tasksPath, start } = context;
    const text = args.text.trim();

    if (args.due && !/^\d{4}-\d{2}-\d{2}$/.test(args.due)) {
        return {
            ok: false,
            result: null,
            error: makeError('VALIDATION_ERROR', 'Invalid due date.'),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    // Priority enum check is handled by Zod

    const tasks = readJsonl<Task>(
        tasksPath,
        (entry) => entry && typeof entry.id === 'number' && typeof entry.text === 'string' && typeof entry.done === 'boolean'
    );

    const task: Task = {
        id: generateTaskId(tasks),
        text,
        done: false,
        created_at: new Date().toISOString(),
        done_at: null,
        due: args.due || null,
        priority: args.priority || null,
    };
    tasks.push(task);

    try {
        writeJsonl(tasksPath, tasks);
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError('EXEC_ERROR', `Failed to write tasks: ${err.message}`),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    return {
        ok: true,
        result: { task },
        error: null,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}

/**
 * Handle reminder_list tool.
 * @param {ReminderListArgs} args - Tool arguments containing startTime filter.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleReminderList(args: ReminderListArgs, context: ExecutorContext): ToolResult {
    const { readJsonl, remindersPath, start } = context;
    const startTime = args.start_time;

    const reminders = readJsonl<Reminder>(
        remindersPath,
        (entry) =>
            entry &&
            typeof entry.id === 'number' &&
            typeof entry.text === 'string' &&
            typeof entry.due_at === 'string' &&
            typeof entry.done === 'boolean'
    );

    const filtered = reminders.filter((reminder) => {
        if (startTime) {
            return new Date(reminder.due_at) >= new Date(startTime);
        }
        return true;
    });

    return {
        ok: true,
        result: { entries: filtered },
        error: null,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}

/**
 * Handle task_list tool.
 * @param {TaskListArgs} args - Tool arguments containing status filter.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleTaskList(args: TaskListArgs, context: ExecutorContext): ToolResult {
    const { readJsonl, tasksPath, start } = context;
    const status = args.status || 'all';

    // Status enum check is handled by Zod

    const tasks = readJsonl<Task>(
        tasksPath,
        (entry) => entry && typeof entry.id === 'number' && typeof entry.text === 'string' && typeof entry.done === 'boolean'
    );

    const filtered = tasks.filter((task) => {
        if (status === 'open') return !task.done;
        if (status === 'done') return task.done;
        return true;
    });

    return {
        ok: true,
        result: { entries: filtered },
        error: null,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}

/**
 * Handle task_done tool.
 * @param {TaskDoneArgs} args - Tool arguments containing task id.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleTaskDone(args: TaskDoneArgs, context: ExecutorContext): ToolResult {
    const { readJsonl, writeJsonl, tasksPath, start } = context;
    const id = args.id;

    const tasks = readJsonl<Task>(
        tasksPath,
        (entry) => entry && typeof entry.id === 'number' && typeof entry.text === 'string' && typeof entry.done === 'boolean'
    );

    const task = tasks.find((entry) => entry.id === id);
    if (!task) {
        return {
            ok: false,
            result: null,
            error: makeError('VALIDATION_ERROR', 'Task not found.'),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    if (!task.done) {
        task.done = true;
        task.done_at = new Date().toISOString();
    }

    try {
        writeJsonl(tasksPath, tasks);
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError('EXEC_ERROR', `Failed to update task: ${err.message}`),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    return {
        ok: true,
        result: { task },
        error: null,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}

/**
 * Handle reminder_add tool.
 * @param {ReminderAddArgs} args - Tool arguments containing text and in_seconds.
 * @param {Object} context - Execution context.
 * @returns {Object} Result object with ok, result, error, debug.
 */
export function handleReminderAdd(args: ReminderAddArgs, context: ExecutorContext): ToolResult {
    const { readJsonl, writeJsonl, remindersPath, start } = context;
    const text = args.text.trim();
    const inSeconds = args.in_seconds;

    // Validation handled by Zod

    const reminders = readJsonl<Reminder>(
        remindersPath,
        (entry) =>
            entry &&
            typeof entry.id === 'number' &&
            typeof entry.text === 'string' &&
            typeof entry.due_at === 'string' &&
            typeof entry.done === 'boolean'
    );

    const entry = {
        id: generateReminderId(reminders),
        text,
        due_at: new Date(Date.now() + inSeconds * 1000).toISOString(),
        done: false,
        created_at: new Date().toISOString(),
    };
    reminders.push(entry);

    try {
        writeJsonl(remindersPath, reminders);
    } catch (err: any) {
        return {
            ok: false,
            result: null,
            error: makeError('EXEC_ERROR', `Failed to write reminder: ${err.message}`),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }

    return {
        ok: true,
        result: { reminder: entry },
        error: null,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}
