import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-ink text-white hover:bg-ink-2",
  accent: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-line bg-surface text-ink hover:border-ink",
  danger: "border border-danger-line bg-surface text-danger hover:bg-danger-tint",
  outline: "border border-line-strong bg-transparent text-ink hover:border-ink",
  light: "bg-on-dark text-ink hover:bg-white",
  "dark-outline": "border border-line-dark bg-transparent text-on-dark-dim hover:border-on-dark hover:text-on-dark",
} as const;

const sizes = {
  xs: "rounded-[7px] px-[11px] py-1.5 text-[11.5px]",
  sm: "rounded-lg px-3.5 py-2 text-[12.5px]",
  md: "rounded-[9px] px-[15px] py-[9px] text-[12.5px]",
  lg: "rounded-[10px] px-[22px] py-[13px] text-sm",
  icon: "size-[30px] rounded-lg",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-[7px] font-semibold leading-[1.3] whitespace-nowrap transition-none",
    "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
}

type Styling = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & Styling) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Styling) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
