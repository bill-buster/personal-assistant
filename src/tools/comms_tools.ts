import { ToolResult, ExecutorContext, EmailListArgs, EmailSendArgs, EmailGetDetailsArgs, MessageListArgs, MessageSendArgs } from '../core/types';
import { makeError, ErrorCode } from '../core/tool_contract';
import { spawnSync } from 'node:child_process';

/**
 * Handle listing recent emails.
 * Uses context.emailsPath which is already resolved by the Executor.
 */
export function handleEmailList(args: EmailListArgs, context: ExecutorContext): ToolResult {
    const limit = args.limit || 5;
    // Use the pre-resolved path from ExecutorContext
    const emailsPath = context.emailsPath;

    const emails = context.readJsonl<{ id: string, from: string, subject: string, snippet: string }>(emailsPath, (e) => !!e.id);
    return { ok: true, result: emails.slice(-limit).reverse() };
}

/**
 * Handle sending an email.
 * Uses context.emailsPath which is already resolved by the Executor.
 */
export function handleEmailSend(args: EmailSendArgs, context: ExecutorContext): ToolResult {
    const { to, subject, body } = args;
    // Use the pre-resolved path from ExecutorContext
    const emailsPath = context.emailsPath;

    const newEmail = {
        id: `msg_${Date.now()}`,
        to,
        from: 'me@example.com',
        subject,
        body,
        ts: new Date().toISOString()
    };

    context.appendJsonl(emailsPath, newEmail);
    return { ok: true, result: { message: `Email sent to ${to}`, id: newEmail.id } };
}

/**
 * Handle getting email details.
 * Uses context.emailsPath which is already resolved by the Executor.
 */
export function handleEmailGetDetails(args: EmailGetDetailsArgs, context: ExecutorContext): ToolResult {
    const { id } = args;
    // Use the pre-resolved path from ExecutorContext
    const emailsPath = context.emailsPath;

    const emails = context.readJsonl<any>(emailsPath, (e) => !!e.id);
    const email = emails.find(e => e.id === id);

    if (!email) return { ok: false, error: makeError(ErrorCode.VALIDATION_ERROR, `Email with ID ${id} not found.`) };
    return { ok: true, result: email };
}

/**
 * Handle listing recent messages/texts.
 * Uses context.messagesPath which is already resolved by the Executor.
 */
export function handleMessageList(args: MessageListArgs, context: ExecutorContext): ToolResult {
    const limit = args.limit || 5;
    // Use the pre-resolved path from ExecutorContext
    const messagesPath = context.messagesPath;

    const messages = context.readJsonl<any>(messagesPath, (m) => !!m.ts);
    return { ok: true, result: messages.slice(-limit).reverse() };
}

/**
 * Handle sending a message/text.
 * Uses context.messagesPath which is already resolved by the Executor.
 */
export function handleMessageSend(args: MessageSendArgs, context: ExecutorContext): ToolResult {
    const { to, body } = args;

    const platform = process.env._TEST_PLATFORM_OVERRIDE || process.platform;
    if (platform !== 'darwin') {
        return { ok: false, error: makeError(ErrorCode.EXEC_ERROR, 'iMessage integration is only available on macOS.') };
    }

    // AppleScript command to send iMessage safely using arguments
    // We use 'on run argv' to accept arguments and avoid shell injection
    const script = `
        on run argv
            set targetTo to item 1 of argv
            set targetBody to item 2 of argv
            tell application "Messages"
                send targetBody to participant targetTo
            end tell
        end run
    `;

    // Pass arguments after '--' for safety (osascript passes them to 'on run argv')
    const result = spawnSync('osascript', ['-e', script, '--', to, body], { encoding: 'utf8' });

    if (result.error) {
        return { ok: false, error: makeError(ErrorCode.EXEC_ERROR, `Failed to execute osascript: ${result.error.message}`) };
    }

    if (result.status !== 0) {
        const errorMsg = result.stderr?.trim() || 'Unknown error sending iMessage';
        return { ok: false, error: makeError(ErrorCode.EXEC_ERROR, `iMessage failed: ${errorMsg}`) };
    }

    // Use the pre-resolved path from ExecutorContext
    const messagesPath = context.messagesPath;
    const newMessage = {
        id: `sms_${Date.now()}`,
        to,
        body,
        ts: new Date().toISOString(),
        sent_via: 'iMessage'
    };
    context.appendJsonl(messagesPath, newMessage);

    return { ok: true, result: { message: `Message sent to ${to} via iMessage` } };
}
