import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "destructive";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "border-transparent bg-primary text-primary-foreground":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground":
            variant === "secondary",
          "text-foreground": variant === "outline",
          "border-transparent bg-emerald-100 text-emerald-700":
            variant === "success",
          "border-transparent bg-amber-100 text-amber-700":
            variant === "warning",
          "border-transparent bg-red-100 text-red-700":
            variant === "destructive",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
