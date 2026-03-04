import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] bg-bg-tertiary",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-pulse" />
    </div>
  );
}
