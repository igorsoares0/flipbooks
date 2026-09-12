"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth/client";

export type AuthMode = "login" | "register" | "forgot" | "reset";

const COPY: Record<AuthMode, { title: string; sub: string; cta: string; switchText: string; switchCta: string; switchHref: string }> = {
  login: {
    title: "Welcome back",
    sub: "Log in to your workspace and pick up where you left off.",
    cta: "Log in",
    switchText: "New here?",
    switchCta: "Create an account",
    switchHref: "/register",
  },
  register: {
    title: "Start your first flipbook",
    sub: "Free to try. The Lifetime Deal unlocks the canvas editor and analytics.",
    cta: "Create account",
    switchText: "Already have an account?",
    switchCta: "Log in",
    switchHref: "/login",
  },
  forgot: {
    title: "Reset your password",
    sub: "Enter your email and we will send a reset link. It expires in 30 minutes.",
    cta: "Send reset link",
    switchText: "Remembered it?",
    switchCta: "Back to log in",
    switchHref: "/login",
  },
  reset: {
    title: "Choose a new password",
    sub: "Use at least 8 characters. You will be signed out on your other devices.",
    cta: "Save new password",
    switchText: "Remembered it?",
    switchCta: "Back to log in",
    switchHref: "/login",
  },
};

// Better Auth error codes → copy that tells people what to do next.
const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Try logging in.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Try logging in.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters.",
  INVALID_TOKEN: "This reset link has expired or was already used. Request a new one.",
};

function errorMessage(error: { code?: string; message?: string; status?: number }) {
  if (error.code && ERRORS[error.code]) return ERRORS[error.code];
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error.message || "Something went wrong. Try again.";
}

// False during server render and hydration, true once React owns the form. Submitting
// before that would be a native form post, which must never carry credentials.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const inputClass =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-[11px] text-[13px] outline-none placeholder:text-muted-3 focus:border-ink aria-invalid:border-danger";

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.6z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}

export function AuthForm({
  mode,
  googleEnabled = false,
  next = "/dashboard",
  token,
  notice,
}: {
  mode: AuthMode;
  googleEnabled?: boolean;
  /** Where to go after signing in; already validated as a same-site path. */
  next?: string;
  /** Password reset token from the emailed link. */
  token?: string;
  notice?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const copy = COPY[mode];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);

    let result: { error: { code?: string; message?: string; status?: number } | null };
    if (mode === "login") {
      result = await authClient.signIn.email({ email, password });
    } else if (mode === "register") {
      result = await authClient.signUp.email({ name: String(form.get("name") ?? "").trim(), email, password, callbackURL: "/dashboard" });
    } else if (mode === "forgot") {
      result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      // Same answer whether or not the account exists, so the form can't be used to probe emails.
      if (!result.error || result.error.status !== 429) {
        setSentTo(email);
        setPending(false);
        return;
      }
    } else {
      result = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
      if (!result.error) {
        router.push("/login?reset=1");
        return;
      }
    }

    if (result.error) {
      setError(errorMessage(result.error));
      setPending(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  const google = async () => {
    setPending(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (error) {
      setError(errorMessage(error));
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-[360px]">
      <Link href="/" className="mb-[34px] inline-flex text-ink hover:text-ink">
        <Logo />
      </Link>

      <h1 className="mb-2 font-serif text-[34px] leading-[1.1] tracking-[-0.7px]">{sentTo ? "Check your inbox" : copy.title}</h1>
      <p className="mb-6 text-[13px] leading-[1.55] text-pretty text-muted">
        {sentTo
          ? `If an account exists for ${sentTo}, a reset link is on its way. It expires in 30 minutes.`
          : copy.sub}
      </p>

      {notice && !sentTo && (
        <p role="status" className="mb-5 rounded-[10px] border border-success/30 bg-success-soft px-3 py-2.5 text-[12.5px] text-success">
          {notice}
        </p>
      )}

      {mode === "reset" && !token && (
        <p role="alert" className="mb-5 text-[12.5px] text-danger">
          This reset link is incomplete. Open the link from the email again, or request a new one.
        </p>
      )}

      {googleEnabled && (mode === "login" || mode === "register") && (
        <>
          <Button variant="secondary" className="w-full rounded-[10px] p-[11px] text-[13px]" onClick={google} disabled={pending}>
            <GoogleMark />
            Continue with Google
          </Button>
          <div className="my-[18px] flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10px] font-medium text-muted-3">OR</span>
            <div className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {/* method="post": if JS ever fails to load, a native submit must not put the password in the URL. */}
      {!sentTo && (
        <form method="post" className="flex flex-col gap-3" onSubmit={submit}>
          {mode === "register" && (
            <label className="block">
              <div className="mb-1.5 text-[11.5px] font-semibold">Name</div>
              <input name="name" autoComplete="name" required maxLength={80} placeholder="Marina Rocha" className={inputClass} />
            </label>
          )}
          {mode !== "reset" && (
            <label className="block">
              <div className="mb-1.5 text-[11.5px] font-semibold">Email</div>
              <input
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="you@studio.co"
                aria-invalid={Boolean(error) || undefined}
                className={inputClass}
              />
            </label>
          )}
          {mode !== "forgot" && (
            <div>
              <div className="mb-1.5 flex items-baseline gap-2">
                <label htmlFor="password" className="text-[11.5px] font-semibold">
                  {mode === "reset" ? "New password" : "Password"}
                </label>
                {mode === "login" && (
                  <Link href="/forgot-password" className="ml-auto text-[11.5px] text-accent hover:text-accent-hover">
                    Forgot?
                  </Link>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                autoFocus={mode === "reset"}
                required
                minLength={8}
                maxLength={128}
                placeholder="••••••••••"
                aria-invalid={Boolean(error) || undefined}
                className={inputClass}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-[12.5px] leading-normal text-danger">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="mt-1 w-full rounded-[10px] p-3 text-[13px]"
            disabled={!hydrated || pending || (mode === "reset" && !token)}
          >
            {pending ? "One moment…" : copy.cta}
          </Button>
        </form>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-1 text-[12.5px] text-muted">
        <span>{copy.switchText}</span>
        <Link href={copy.switchHref} className="font-semibold whitespace-nowrap text-accent hover:text-accent-hover">
          {copy.switchCta}
        </Link>
      </div>
      <p className="mt-[26px] text-[11px] leading-normal text-muted-3">
        By continuing you agree to the Terms and Privacy Policy. We send a verification email before your first publish.
      </p>
    </div>
  );
}
