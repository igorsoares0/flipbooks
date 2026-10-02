import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-4 px-6 md:px-24">
      <span className="text-[13px] font-semibold text-accent">404</span>
      <h1 className="max-w-[640px] font-serif text-[44px] leading-none tracking-[-1.4px] md:text-[64px] md:tracking-[-2px]">This page turned out blank</h1>
      <p className="max-w-[440px] text-base leading-[1.55] text-ink-2">
        The flipbook or page you are looking for does not exist, or it is not published yet.
      </p>
      <div className="mt-2 flex gap-2.5">
        <ButtonLink href="/" variant="primary">
          Go home
        </ButtonLink>
        <ButtonLink href="/dashboard" variant="outline">
          Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
