"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

// Account settings: profile, email, password and deletion. Each section saves on its own,
// unlike the flipbook settings, because these changes are rarer and need confirmation.

const inputClass =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-[11px] text-[13px] outline-none placeholder:text-muted-3 focus:border-ink aria-invalid:border-danger";

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

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface px-[22px] py-5">
      <h2 className="text-[13.5px] font-semibold">{title}</h2>
      <p className="mt-1 mb-4 max-w-[520px] text-[12.5px] leading-[1.55] text-pretty text-muted">{description}</p>
      {children}
    </section>
  );
}

function Feedback({ state }: { state: State }) {
  if (state.error) {
    return (
      <p role="alert" className="text-[12.5px] text-danger">
        {state.error}
      </p>
    );
  }
  if (state.status === "done" && state.message) {
    return (
      <p role="status" className="text-[12.5px] text-success">
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
    <div className="mx-auto flex max-w-[760px] flex-col gap-[18px]">
      <div>
        <h1 className="mt-1 mb-1.5 font-serif text-[34px] leading-[1.1] tracking-[-0.6px]">Settings</h1>
        <p className="text-[13.5px] text-muted">Your profile, how you sign in, and closing your account.</p>
      </div>

      <Section title="Profile" description="The name we use in emails and in your workspace.">
        <form onSubmit={saveProfile} className="flex flex-wrap items-end gap-2.5">
          <label className="min-w-[240px] flex-1">
            <div className="mb-1.5 text-[11.5px] font-semibold">Name</div>
            <input name="name" defaultValue={user.name} maxLength={80} autoComplete="name" className={inputClass} />
          </label>
          <Button type="submit" disabled={profile.status === "saving"} className="px-4 py-[11px] text-[13px]">
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
        <form onSubmit={changeEmail} className="flex flex-wrap items-end gap-2.5">
          <label className="min-w-[240px] flex-1">
            <div className="mb-1.5 flex items-baseline gap-2 text-[11.5px] font-semibold">
              New email
              <span className="font-normal text-muted-2">
                currently {user.email}
                {user.emailVerified ? "" : " · unverified"}
              </span>
            </div>
            <input name="email" type="email" autoComplete="email" placeholder="you@studio.co" className={inputClass} />
          </label>
          <Button type="submit" variant="secondary" disabled={email.status === "saving"} className="px-4 py-[11px] text-[13px]">
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
          <form onSubmit={changePassword} className="flex flex-wrap items-end gap-2.5">
            <label className="min-w-[200px] flex-1">
              <div className="mb-1.5 text-[11.5px] font-semibold">Current password</div>
              <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
            </label>
            <label className="min-w-[200px] flex-1">
              <div className="mb-1.5 text-[11.5px] font-semibold">New password</div>
              <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} />
            </label>
            <Button type="submit" variant="secondary" disabled={password.status === "saving"} className="px-4 py-[11px] text-[13px]">
              {password.status === "saving" ? "Saving…" : "Change password"}
            </Button>
            <div className="w-full">
              <Feedback state={password} />
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button variant="secondary" onClick={sendPasswordSetup} disabled={password.status === "saving"} className="self-start px-4 py-[11px] text-[13px]">
              {password.status === "saving" ? "Sending…" : "Email me a link"}
            </Button>
            <Feedback state={password} />
          </div>
        )}
      </Section>

      <section className={cn("rounded-2xl border bg-surface px-[22px] py-5", "border-danger-line")}>
        <h2 className="text-[13.5px] font-semibold text-danger">Delete account</h2>
        <p className="mt-1 mb-4 max-w-[520px] text-[12.5px] leading-[1.55] text-pretty text-muted">
          This removes your flipbooks, their pages and images, and their analytics. Public links and embeds stop working, and any
          subscription is cancelled. It can&apos;t be undone.
        </p>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="min-w-[240px] flex-1">
            <div className="mb-1.5 text-[11.5px] font-semibold">
              Type <span className="font-mono">DELETE</span> to confirm
            </div>
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              aria-label="Type DELETE to confirm"
              className={inputClass}
            />
          </label>
          <Button
            variant="danger"
            onClick={deleteAccount}
            disabled={confirmDelete.trim().toUpperCase() !== "DELETE" || deletion.status !== "idle"}
            className="px-4 py-[11px] text-[13px]"
          >
            {deletion.status === "saving" ? "Sending…" : "Delete my account"}
          </Button>
          <div className="w-full">
            <Feedback state={deletion} />
          </div>
        </div>
      </section>
    </div>
  );
}
