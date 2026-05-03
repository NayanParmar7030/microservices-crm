import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2",
        className
      )}
      {...props}
    />
  );
}
