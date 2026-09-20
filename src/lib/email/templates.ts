import type { Email } from "./send";

// Inline styles only: email clients ignore stylesheets. Colors come from the design tokens.
const INK = "#17150F";
const MUTED = "#6E6A5E";
const PAPER = "#F3F1EC";
const LINE = "#E4E0D6";

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout({ heading, body, cta, url, footnote }: { heading: string; body: string; cta: string; url: string; footnote: string }) {
  return `<!doctype html>
<html><body style="margin:0;background:${PAPER};font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid ${LINE};border-radius:16px">
        <tr><td style="padding:32px 32px 8px;font-size:15px;font-weight:600">Flipbook</td></tr>
        <tr><td style="padding:8px 32px 0;font-family:Georgia,serif;font-size:28px;line-height:1.15">${escape(heading)}</td></tr>
        <tr><td style="padding:12px 32px 24px;font-size:14px;line-height:1.6;color:${MUTED}">${escape(body)}</td></tr>
        <tr><td style="padding:0 32px 28px">
          <a href="${escape(url)}" style="display:inline-block;background:${INK};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">${escape(cta)}</a>
        </td></tr>
        <tr><td style="padding:0 32px 32px;font-size:12px;line-height:1.5;color:#A5A091">${escape(footnote)}<br>${escape(url)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function verifyEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  const body = `Hi ${name}, confirm your email address so you can publish flipbooks.`;
  const footnote = "If you didn't create a Flipbook account, you can ignore this email.";
  return {
    to,
    subject: "Verify your email for Flipbook",
    html: layout({ heading: "Confirm your email", body, cta: "Verify email", url, footnote }),
    text: `${body}\n\nVerify: ${url}\n\n${footnote}`,
  };
}

export function resetPasswordEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  const body = `Hi ${name}, we got a request to reset your password. The link expires in 30 minutes.`;
  const footnote = "If you didn't ask for this, your password stays the same.";
  return {
    to,
    subject: "Reset your Flipbook password",
    html: layout({ heading: "Reset your password", body, cta: "Choose a new password", url, footnote }),
    text: `${body}\n\nReset: ${url}\n\n${footnote}`,
  };
}

export function processingDoneEmail({ to, name, title, url }: { to: string; name: string; title: string; url: string }): Email {
  const body = `Hi ${name}, "${title}" is rendered and ready. Check the pages, then publish it when you're happy.`;
  const footnote = "You get this email when a PDF upload finishes processing.";
  return {
    to,
    subject: `"${title}" is ready`,
    html: layout({ heading: "Your flipbook is ready", body, cta: "Open flipbook", url, footnote }),
    text: `${body}\n\nOpen: ${url}\n\n${footnote}`,
  };
}

export function processingFailedEmail({
  to,
  name,
  title,
  reason,
  url,
}: {
  to: string;
  name: string;
  title: string;
  reason: string;
  url: string;
}): Email {
  const body = `Hi ${name}, we couldn't turn "${title}" into a flipbook: ${reason}. You can retry, or upload a new copy of the PDF.`;
  const footnote = "Nothing was published. Your other flipbooks are not affected.";
  return {
    to,
    subject: `We couldn't process "${title}"`,
    html: layout({ heading: "Processing failed", body, cta: "See details", url, footnote }),
    text: `${body}\n\nDetails: ${url}\n\n${footnote}`,
  };
}

export function welcomeEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  const body = `Hi ${name}, welcome to Flipbook. Upload a PDF or start from a template, then publish a link you can share or embed anywhere.`;
  const footnote = "You get this email once, when you create an account.";
  return {
    to,
    subject: "Welcome to Flipbook",
    html: layout({ heading: "Make your first flipbook", body, cta: "Open your dashboard", url, footnote }),
    text: `${body}\n\nDashboard: ${url}\n\n${footnote}`,
  };
}

export function changeEmailConfirmation({ to, name, newEmail, url }: { to: string; name: string; newEmail: string; url: string }): Email {
  const body = `Hi ${name}, you asked to sign in to Flipbook with ${newEmail} from now on. Confirm here, and we'll email ${newEmail} to verify it. Your current address works until then.`;
  const footnote = "If you didn't ask to change your email, ignore this and nothing changes.";
  return {
    to,
    subject: "Confirm changing your email address",
    html: layout({ heading: "Change your email?", body, cta: "Confirm the change", url, footnote }),
    text: `${body}\n\nConfirm: ${url}\n\n${footnote}`,
  };
}

export function deleteAccountEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  const body = `Hi ${name}, confirm that you want to delete your Flipbook account. This removes your flipbooks, their pages and images, and their analytics, and public links stop working. It can't be undone.`;
  const footnote = "The link expires in 24 hours. If you didn't ask for this, ignore this email and your account stays as it is.";
  return {
    to,
    subject: "Confirm deleting your Flipbook account",
    html: layout({ heading: "Delete your account?", body, cta: "Delete my account", url, footnote }),
    text: `${body}\n\nConfirm: ${url}\n\n${footnote}`,
  };
}

export function welcomeToProEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  const body = `Hi ${name}, thanks for subscribing. Pro is active on your account: no Flipbook badge, custom addresses, reader analytics and room for 100 flipbooks.`;
  const footnote = "Paddle, our payment provider, emails your receipt separately. Manage your plan from the billing page.";
  return {
    to,
    subject: "Welcome to Flipbook Pro",
    html: layout({ heading: "You're on Pro", body, cta: "Go to your dashboard", url, footnote }),
    text: `${body}\n\nDashboard: ${url}\n\n${footnote}`,
  };
}
