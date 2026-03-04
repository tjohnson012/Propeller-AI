import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  badge: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeading({ badge, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("text-center max-w-2xl mx-auto mb-16", className)}>
      <span className="inline-block text-xs font-medium text-text-muted tracking-widest uppercase mb-4">
        {badge}
      </span>
      <h2 className="font-serif text-3xl md:text-4xl text-text-primary mt-2 mb-4 tracking-[-0.02em]">
        {title}
      </h2>
      {description && (
        <p className="text-text-secondary text-base leading-relaxed tracking-[-0.01em]">{description}</p>
      )}
    </div>
  );
}
