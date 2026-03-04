"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none tracking-[-0.01em]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white rounded-lg hover:bg-accent-hover active:scale-[0.98]",
        secondary:
          "bg-transparent border border-border-hover text-text-primary rounded-lg hover:bg-bg-tertiary",
        ghost:
          "bg-transparent text-text-secondary rounded-lg hover:bg-bg-tertiary hover:text-text-primary",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
