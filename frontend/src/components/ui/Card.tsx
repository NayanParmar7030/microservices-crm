import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLElement> {}

export function Card({ className, ...props }: CardProps) {
  return <article className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)} {...props} />;
}
