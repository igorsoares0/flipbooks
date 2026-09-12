"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export type AuthMode = "login" | "register" | "forgot";

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
};

const inputClass =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-[11px] text-[13px] outline-none placeholder:text-muted-3 focus:border-ink";

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

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const copy = COPY[mode];

  // Auth.js arrives in phase 2; until then every path signs straight into the demo workspace.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(mode === "forgot" ? "/login" : "/dashboard");
  };

  return (
    <div className="w-full max-w-[360px]">
      <Link href="/" className="mb-[34px] inline-flex text-ink hover:text-ink">
        <Logo />
      </Link>

      <h1 className="mb-2 font-serif text-[34px] leading-[1.1] tracking-[-0.7px]">{copy.title}</h1>
      <p className="mb-6 text-[13px] leading-[1.55] text-pretty text-muted">{copy.sub}</p>

      {mode !== "forgot" && (
        <>
          <Button variant="secondary" className="w-full rounded-[10px] p-[11px] text-[13px]" onClick={() => router.push("/dashboard")}>
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

      <form className="flex flex-col gap-3" onSubmit={submit}>
        {mode === "register" && (
          <label className="block">
            <div className="mb-1.5 text-[11.5px] font-semibold">Name</div>
            <input name="name" autoComplete="name" placeholder="Marina Rocha" className={inputClass} />
          </label>
        )}
        <label className="block">
          <div className="mb-1.5 text-[11.5px] font-semibold">Email</div>
          <input
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            placeholder="you@studio.co"
            className={inputClass}
          />
        </label>
        {mode !== "forgot" && (
          <div>
            <div className="mb-1.5 flex items-baseline gap-2">
              <label htmlFor="password" className="text-[11.5px] font-semibold">
                Password
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
              required
              minLength={8}
              placeholder="••••••••••"
              className={inputClass}
            />
          </div>
        )}
        <Button type="submit" className="mt-1 w-full rounded-[10px] p-3 text-[13px]">
          {copy.cta}
        </Button>
      </form>

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
