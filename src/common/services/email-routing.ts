import type { EmailMessage } from './email.service';

/**
 * Outside production, every email can be sent to one test mailbox instead of the real recipient, so nobody
 * gets mail from a development or test copy of the application. The original recipient is shown in the
 * subject and at the top of the message. In production the redirect is never applied.
 */
export function routeEmail(message: EmailMessage, nodeEnv: string, redirectTo: string): EmailMessage {
  const target = redirectTo.trim();
  if (nodeEnv === 'production' || !target) return message;

  const original = (Array.isArray(message.to) ? message.to : [message.to]).join(', ');
  const note = `Development mode: this email was meant for ${original}.`;
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    ...message,
    to: target,
    subject: `[DEV → ${original}] ${message.subject}`,
    text: message.text === undefined ? undefined : `${note}\n\n${message.text}`,
    html: message.html === undefined ? undefined : `<p style="background:#fff7e6;border:1px solid #f5c26b;padding:8px;font-size:12px">${escape(note)}</p>${message.html}`,
  };
}
