"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

// Account settings: profile, email, password and deletion. Each section saves on its own,
// unlike the flipbook settings, because these changes are rarer and need confirmation.

const inputClass = "input-line aria-invalid:border-danger";
const labelText = "flex items-baseline justify-between gap-3 text-[13px] font-semibold";

const ERRORS: Record<string, string> = {
  INVALID_PASSWORD: "That current password isn't right.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters.",
  USER_ALREADY_EXISTS: "Another account already uses that email.",
  COULDNT_UPDATE_YOUR_EMAIL: "We couldn't change your email. Try again.",
};

function errorMessage(error: { code?: string; message?: string; status?: number }) {
  if (error.code && ERRORS[error.code]) return ERRORS[error.code];
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error.message || "Something went wrong. Try again.";
}

type State = { status: "idle" | "saving" | "done"; message?: string; error?: string };

/** Description on the left, fields on the right, each section on its own rule. */
function Section({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("grid gap-x-14 gap-y-4 border-t pt-7 pb-9 md:grid-cols-[280px_minmax(0,1fr)]", danger ? "border-danger-line" : "border-line")}>
      <div>
        <h2 className={cn("font-serif text-[24px] leading-tight tracking-[-0.5px]", danger && "text-danger")}>{title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-pretty text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Feedback({ state }: { state: State }) {
  if (state.error) {
    return (
      <p role="alert" className="text-[13px] text-danger">
        {state.error}
      </p>
    );
  }
  if (state.status === "done" && state.message) {
    return (
      <p role="status" className="text-[13px] text-success">
        {state.message}
      </p>
    );
  }
  return null;
}

export function AccountSettings({ user, hasPassword }: { user: { name: string; email: string; emailVerified: boolean }; hasPassword: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<State>({ status: "idle" });
  const [email, setEmail] = useState<State>({ status: "idle" });
  const [password, setPassword] = useState<State>({ status: "idle" });
  const [deletion, setDeletion] = useState<State>({ status: "idle" });
  const [confirmDelete, setConfirmDelete] = useState("");

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return setProfile({ status: "idle", error: "Your name can't be empty." });
    setProfile({ status: "saving" });
    const { error } = await authClient.updateUser({ name });
    if (error) return setProfile({ status: "idle", error: errorMessage(error) });
    setProfile({ status: "done", message: "Name saved." });
    router.refresh();
  };

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newEmail = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!newEmail || newEmail === user.email) return setEmail({ status: "idle", error: "Enter a different address." });
    setEmail({ status: "saving" });
    const { error } = await authClient.changeEmail({ newEmail, callbackURL: "/dashboard/settings" });
    if (error) return setEmail({ status: "idle", error: errorMessage(error) });
    setEmail({
      status: "done",
      message: user.emailVerified
        ? `Check ${user.email} and confirm the change. We'll then email ${newEmail} to verify it.`
        : `Check ${newEmail} to confirm the new address.`,
    });
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPassword({ status: "saving" });
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("currentPassword") ?? ""),
      newPassword: String(form.get("newPassword") ?? ""),
      revokeOtherSessions: true,
    });
    if (error) return setPassword({ status: "idle", error: errorMessage(error) });
    (event.target as HTMLFormElement).reset();
    setPassword({ status: "done", message: "Password changed. Other devices were signed out." });
  };

  /** Google-only accounts get a password through the usual reset email. */
  const sendPasswordSetup = async () => {
    setPassword({ status: "saving" });
    const { error } = await authClient.requestPasswordReset({ email: user.email, redirectTo: "/reset-password" });
    if (error) return setPassword({ status: "idle", error: errorMessage(error) });
    setPassword({ status: "done", message: `We emailed ${user.email} a link to set a password.` });
  };

  const deleteAccount = async () => {
    setDeletion({ status: "saving" });
    const { error } = await authClient.deleteUser({ callbackURL: "/login?deleted=1" });
    if (error) return setDeletion({ status: "idle", error: errorMessage(error) });
    setDeletion({ status: "done", message: `Check ${user.email} and confirm to delete your account. The link expires in 24 hours.` });
  };

  return (
    <div className="flex max-w-[1000px] flex-col">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-serif text-[40px] leading-none tracking-[-1.2px] md:text-[52px] md:tracking-[-1.6px]">Settings</h1>
        <p className="text-[15px] text-ink-2">Your profile, how you sign in, and closing your account.</p>
      </div>

      <Section title="Profile" description="The name we use in emails and in your workspace.">
        <form onSubmit={saveProfile} className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="min-w-[240px] flex-1">
            <div className={labelText}>Name</div>
            <input name="name" defaultValue={user.name} maxLength={80} autoComplete="name" placeholder="Your name" className={inputClass} />
          </label>
          <Button type="submit" variant="dark" disabled={profile.status === "saving"}>
            {profile.status === "saving" ? "Saving…" : "Save"}
          </Button>
          <div className="w-full">
            <Feedback state={profile} />
          </div>
        </form>
      </Section>

      <Section
        title="Email"
        description={
          user.emailVerified
            ? "Changing it takes two steps: confirm from your current address, then verify the new one."
            : "Your address isn't verified yet. Changing it sends a verification link to the new address."
        }
      >
        <form onSubmit={changeEmail} className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="min-w-[240px] flex-1">
            <div className={labelText}>
              New email
              <span className="text-[12.5px] font-normal text-muted">
                currently {user.email}
                {user.emailVerified ? "" : " · unverified"}
              </span>
            </div>
            <input name="email" type="email" autoComplete="email" placeholder="you@studio.co" className={inputClass} />
          </label>
          <Button type="submit" variant="outline" disabled={email.status === "saving"}>
            {email.status === "saving" ? "Sending…" : "Change email"}
          </Button>
          <div className="w-full">
            <Feedback state={email} />
          </div>
        </form>
      </Section>

      <Section
        title="Password"
        description={
          hasPassword
            ? "Changing your password signs you out everywhere else."
            : "You sign in with Google. Set a password if you'd also like to sign in with your email."
        }
      >
        {hasPassword ? (
          <form onSubmit={changePassword} className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <label className="min-w-[200px] flex-1">
              <div className={labelText}>Current password</div>
              <input name="currentPassword" type="password" autoComplete="current-password" required placeholder=" " className={inputClass} />
            </label>
            <label className="min-w-[200px] flex-1">
              <div className={labelText}>New password</div>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </label>
            <Button type="submit" variant="outline" disabled={password.status === "saving"}>
              {password.status === "saving" ? "Saving…" : "Change password"}
            </Button>
            <div className="w-full">
              <Feedback state={password} />
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button variant="outline" onClick={sendPasswordSetup} disabled={password.status === "saving"} className="self-start">
              {password.status === "saving" ? "Sending…" : "Email me a link"}
            </Button>
            <Feedback state={password} />
          </div>
        )}
      </Section>

      <Section
        title="Delete account"
        danger
        description={
          <>
            This removes your flipbooks, their pages and images, and their analytics. Public links and embeds stop working, and any
            subscription is cancelled. It can&apos;t be undone.
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="min-w-[240px] flex-1">
            <div className={labelText}>Type DELETE to confirm</div>
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              aria-label="Type DELETE to confirm"
              placeholder="DELETE"
              className={inputClass}
            />
          </label>
          <Button
            variant="danger"
            onClick={deleteAccount}
            disabled={confirmDelete.trim().toUpperCase() !== "DELETE" || deletion.status !== "idle"}
          >
            {deletion.status === "saving" ? "Sending…" : "Delete my account"}
          </Button>
          <div className="w-full">
            <Feedback state={deletion} />
          </div>
        </div>
      </Section>
    </div>
  );
}
