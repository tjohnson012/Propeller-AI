import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
}

export function GradientText({ children, className, as: Tag = "span" }: GradientTextProps) {
  return <Tag className={cn("text-accent", className)}>{children}</Tag>;
}
