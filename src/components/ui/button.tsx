import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Hover darkens the fill by about 6%.
const variants = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  dark: "bg-ink text-white hover:bg-[color-mix(in_oklch,#111,black_6%)]",
  outline: "border border-ink bg-surface text-ink hover:bg-hover",
  /** Quiet outline for secondary utilities (Google sign-in, row actions). */
  secondary: "border border-line-2 bg-surface text-ink hover:border-ink",
  danger: "border border-danger-line bg-surface text-danger hover:bg-danger-bg",
  /** Reader chrome. */
  light: "bg-on-dark text-ink hover:bg-white",
  ghost: "border border-line-dark bg-transparent text-on-dark hover:border-on-dark-dim",
  /** White pill on the solid accent Pro column. */
  inverse: "bg-white text-accent hover:bg-[color-mix(in_oklch,white,black_6%)]",
} as const;

// Pills: the radius is always half the height.
const sizes = {
  xs: "h-[30px] rounded-full px-3 text-[12.5px]",
  sm: "h-9 rounded-full px-4 text-[13px]",
  md: "h-10 rounded-full px-[18px] text-[13.5px]",
  lg: "h-12 rounded-full px-5 text-[14.5px]",
  icon: "size-[34px] rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses({
  variant = "dark",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 font-semibold leading-none whitespace-nowrap",
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
