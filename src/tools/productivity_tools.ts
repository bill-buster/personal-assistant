
import { ToolResult, ExecutorContext, ContactSearchArgs, ContactAddArgs, ContactUpdateArgs, CalendarListArgs, CalendarEventAddArgs, CalendarEventUpdateArgs } from '../core/types';
import { makeError } from '../core/tool_contract';

/**
 * Handle searching for contacts.
 */
export function handleContactSearch(args: ContactSearchArgs, context: ExecutorContext): ToolResult {
    const { query } = args;
    const contactsPath = context.contactsPath;
    if (!contactsPath) return { ok: false, error: makeError('EXEC_ERROR', 'Contacts path not configured.') };

    const contacts = context.readJsonl<any>(contactsPath, (c) => !!c.name);
    const results = contacts.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(query.toLowerCase())) ||
        (c.phone && c.phone.includes(query))
    );

    return { ok: true, result: results };
}

/**
 * Handle adding a new contact.
 */
export function handleContactAdd(args: ContactAddArgs, context: ExecutorContext): ToolResult {
    const { name, email, phone } = args;
    const contactsPath = context.contactsPath;
    if (!contactsPath) return { ok: false, error: makeError('EXEC_ERROR', 'Contacts path not configured.') };

    // Check for duplicates
    const contacts = context.readJsonl<any>(contactsPath, (c) => !!c.name);
    const existing = contacts.find(c => c.name.toLowerCase() === name.toLowerCase());

    if (existing) {
        return { ok: false, error: makeError('VALIDATION_ERROR', `Contact '${name}' already exists. Use contact_update to modify.`) };
    }

    const newContact = { name, email, phone, ts: new Date().toISOString() };
    context.appendJsonl(contactsPath, newContact);

    return { ok: true, result: { message: `Contact ${name} added.`, contact: newContact } };
}

/**
 * Handle updating a contact.
 */
export function handleContactUpdate(args: ContactUpdateArgs, context: ExecutorContext): ToolResult {
    const { name, email, phone } = args;
    const contactsPath = context.contactsPath;
    if (!contactsPath) return { ok: false, error: makeError('EXEC_ERROR', 'Contacts path not configured.') };

    let contacts = context.readJsonl<any>(contactsPath, (c) => !!c.name);
    const index = contacts.findIndex(c => c.name.toLowerCase() === name.toLowerCase());

    if (index === -1) return { ok: false, error: makeError('NOT_FOUND', `Contact ${name} not found.`) };

    if (email) contacts[index].email = email;
    if (phone) contacts[index].phone = phone;
    contacts[index].ts = new Date().toISOString();

    context.writeJsonl(contactsPath, contacts);
    return { ok: true, result: { message: `Contact ${name} updated.`, contact: contacts[index] } };
}

/**
 * Handle listing calendar events.
 */
export function handleCalendarList(args: CalendarListArgs, context: ExecutorContext): ToolResult {
    const days = args.days || 7;
    let calendarPath: string;
    try {
        calendarPath = context.paths.resolve('calendar.jsonl');
    } catch {
        return { ok: false, error: makeError('EXEC_ERROR', 'Could not resolve calendar.jsonl path.') };
    }

    const events = context.readJsonl<any>(calendarPath, (e) => !!e.start_time);
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const filtered = events.filter(e => {
        const start = new Date(e.start_time);
        return start >= now && start <= future;
    }).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { ok: true, result: filtered };
}

/**
 * Handle adding a calendar event.
 */
export function handleCalendarEventAdd(args: CalendarEventAddArgs, context: ExecutorContext): ToolResult {
    const { title, start_time } = args;
    const duration_minutes = args.duration_minutes || 30;
    let calendarPath: string;
    try {
        calendarPath = context.paths.resolve('calendar.jsonl');
    } catch {
        return { ok: false, error: makeError('EXEC_ERROR', 'Could not resolve calendar.jsonl path.') };
    }

    const newEvent = {
        id: `evt_${Date.now()}`,
        title,
        start_time,
        duration_minutes,
        ts: new Date().toISOString()
    };

    context.appendJsonl(calendarPath, newEvent);
    return { ok: true, result: { message: `Event '${title}' added.`, event: newEvent } };
}

/**
 * Handle updating a calendar event.
 */
export function handleCalendarEventUpdate(args: CalendarEventUpdateArgs, context: ExecutorContext): ToolResult {
    const { id, title, start_time } = args;
    let calendarPath: string;
    try {
        calendarPath = context.paths.resolve('calendar.jsonl');
    } catch {
        return { ok: false, error: makeError('EXEC_ERROR', 'Could not resolve calendar.jsonl path.') };
    }

    let events = context.readJsonl<any>(calendarPath, (e) => !!e.id);
    const index = events.findIndex(e => e.id === id);

    if (index === -1) return { ok: false, error: makeError('NOT_FOUND', `Event with ID ${id} not found.`) };

    if (title) events[index].title = title;
    if (start_time) events[index].start_time = start_time;
    events[index].ts = new Date().toISOString();

    context.writeJsonl(calendarPath, events);
    return { ok: true, result: { message: `Event updated.`, event: events[index] } };
}
