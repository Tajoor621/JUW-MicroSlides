import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "accent" | "success" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "muted" && "bg-elevated text-muted",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "success" && "bg-success/15 text-success",
        tone === "danger" && "bg-danger/15 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}
