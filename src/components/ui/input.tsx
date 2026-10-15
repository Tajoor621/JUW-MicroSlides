import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-sm border border-border bg-elevated px-3 text-sm text-fg",
        "placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
