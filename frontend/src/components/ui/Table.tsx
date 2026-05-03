import type { HTMLAttributes, TableHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {}
interface TableSectionProps extends HTMLAttributes<HTMLTableSectionElement> {}
interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}
interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {}
interface TableHeadCellProps extends HTMLAttributes<HTMLTableCellElement> {}

export function Table({ className, ...props }: TableProps) {
  return <table className={cn("w-full border-collapse", className)} {...props} />;
}

export function TableHead({ className, ...props }: TableSectionProps) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className, ...props }: TableSectionProps) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn("border-b border-slate-200", className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: TableHeadCellProps) {
  return <th className={cn("px-3 py-2 text-left text-sm font-semibold text-slate-700", className)} {...props} />;
}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn("px-3 py-2 text-sm text-slate-600", className)} {...props} />;
}
