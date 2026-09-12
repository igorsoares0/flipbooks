import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";

export type Email = { to: string; subject: string; html: string; text: string };

/**
 * Sends through Resend when RESEND_API_KEY is set. Otherwise writes to
 * EMAIL_OUTBOX_DIR/outbox.jsonl (read by the e2e tests) and prints to the console,
 * so sign-up, verification and password reset work locally without an account.
 */
export async function sendEmail(email: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM || "Flipbook <hello@flipbook.co>",
      ...email,
    });
    if (error) throw new Error(`Resend failed: ${error.message}`);
    return;
  }

  const outbox = process.env.EMAIL_OUTBOX_DIR;
  if (!outbox && process.env.NODE_ENV === "production") {
    throw new Error("RESEND_API_KEY is not set; refusing to drop an email in production.");
  }
  if (outbox) {
    await mkdir(outbox, { recursive: true });
    const entry = { ...email, sentAt: new Date().toISOString() };
    await appendFile(path.join(outbox, "outbox.jsonl"), JSON.stringify(entry) + "\n");
  }
  console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`);
}
