import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="label-mono text-muted-2">404</div>
      <h1 className="mt-2 font-serif text-[34px] leading-[1.1] tracking-[-0.6px]">This page turned out blank</h1>
      <p className="mt-2 max-w-[340px] text-[13px] leading-[1.55] text-muted">
        The flipbook or page you are looking for does not exist, or it is not published yet.
      </p>
      <div className="mt-6 flex gap-2">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">
          Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
