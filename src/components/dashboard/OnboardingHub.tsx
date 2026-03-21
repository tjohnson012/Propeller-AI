"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import {
  useOnboardingStore,
  isTaskCompleted,
  getOnboardingProgress,
} from "@/lib/onboarding-store";
import { onboardingTasks } from "@/lib/onboarding-constants";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Sparkles } from "lucide-react";

export function OnboardingHub() {
  const { setupComplete, watchlistEntities } = useAppStore();
  const { hubExpanded, hubDismissed, toggleHub, dismissHub } =
    useOnboardingStore();

  const appState = useMemo(
    () => ({ setupComplete, watchlistEntities }),
    [setupComplete, watchlistEntities],
  );

  const { completed, total, percentage } = useMemo(
    () => getOnboardingProgress(appState),
    [appState],
  );

  // Don't show if dismissed or all tasks complete
  if (hubDismissed || completed === total) return null;

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="border-t border-border-primary px-2 pt-2 pb-1">
      {/* Toggle bar */}
      <button
        onClick={toggleHub}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-primary transition-colors"
      >
        {/* Progress ring */}
        <svg width="22" height="22" className="shrink-0 -rotate-90">
          <circle
            cx="11"
            cy="11"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-bg-tertiary"
          />
          <circle
            cx="11"
            cy="11"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-accent transition-all duration-500"
          />
        </svg>
        <span className="text-xs text-text-secondary flex-1 text-left">
          Getting Started
        </span>
        <span className="text-[10px] text-text-muted font-mono">
          {completed}/{total}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-text-muted transition-transform duration-200",
            hubExpanded && "rotate-180",
          )}
        />
      </button>

      {/* Expanded task list */}
      {hubExpanded && (
        <div className="mt-1.5 space-y-0.5 pb-1">
          {onboardingTasks.map((task) => {
            const done = isTaskCompleted(task.id, appState);
            const content = (
              <div
                className={cn(
                  "flex items-start gap-2.5 px-2 py-1.5 rounded-lg transition-colors",
                  done
                    ? "opacity-60"
                    : "hover:bg-bg-primary cursor-pointer",
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                    done
                      ? "border-accent bg-accent"
                      : "border-border-hover",
                  )}
                >
                  {done && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      done
                        ? "text-text-muted line-through"
                        : "text-text-secondary",
                    )}
                  >
                    {task.label}
                  </p>
                  <p className="text-[10px] text-text-muted leading-snug">
                    {task.subtitle}
                  </p>
                </div>
              </div>
            );

            if (done || !task.href) {
              return <div key={task.id}>{content}</div>;
            }

            return (
              <Link key={task.id} href={task.href}>
                {content}
              </Link>
            );
          })}

          {/* Dismiss */}
          <button
            onClick={dismissHub}
            className="w-full text-center text-[10px] text-text-muted hover:text-text-secondary transition-colors pt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
