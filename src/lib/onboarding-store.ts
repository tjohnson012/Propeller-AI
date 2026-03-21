/**
 * Onboarding state management — tour progress and getting-started hub.
 * Separate from the main app store to keep concerns isolated.
 * Persisted to localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tourSteps, onboardingTasks } from "./onboarding-constants";

interface OnboardingState {
  // Tour
  tourCompleted: boolean;
  currentTourStep: number | null; // null = inactive
  tourStartedAt: string | null;

  // Hub
  hubExpanded: boolean;
  hubDismissed: boolean;

  // Tour actions
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;

  // Hub actions
  toggleHub: () => void;
  dismissHub: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      tourCompleted: false,
      currentTourStep: null,
      tourStartedAt: null,
      hubExpanded: false,
      hubDismissed: false,

      startTour: () =>
        set({
          currentTourStep: 0,
          tourStartedAt: new Date().toISOString(),
        }),

      nextStep: () => {
        const { currentTourStep } = get();
        if (currentTourStep === null) return;
        if (currentTourStep >= tourSteps.length - 1) {
          get().completeTour();
        } else {
          set({ currentTourStep: currentTourStep + 1 });
        }
      },

      prevStep: () => {
        const { currentTourStep } = get();
        if (currentTourStep === null || currentTourStep <= 0) return;
        set({ currentTourStep: currentTourStep - 1 });
      },

      skipTour: () =>
        set({
          tourCompleted: true,
          currentTourStep: null,
        }),

      completeTour: () =>
        set({
          tourCompleted: true,
          currentTourStep: null,
        }),

      toggleHub: () => set((s) => ({ hubExpanded: !s.hubExpanded })),
      dismissHub: () => set({ hubDismissed: true }),
    }),
    {
      name: "propeller_onboarding",
      partialize: (state) => ({
        tourCompleted: state.tourCompleted,
        tourStartedAt: state.tourStartedAt,
        hubDismissed: state.hubDismissed,
      }),
    },
  ),
);

/**
 * Check if an onboarding task is completed.
 * Called from components that have access to app state.
 */
export function isTaskCompleted(
  taskId: string,
  appState: {
    setupComplete: boolean;
    watchlistEntities: Array<unknown>;
  },
): boolean {
  if (typeof window === "undefined") return false;

  switch (taskId) {
    case "profile":
      return appState.setupComplete;
    case "first-analysis":
      return localStorage.getItem("propeller_first_analysis") === "true";
    case "watchlist":
      return appState.watchlistEntities.length > 0;
    case "trade-events":
      return localStorage.getItem("propeller_visited_trade_events") === "true";
    case "integration":
      return localStorage.getItem("propeller_connected_integration") === "true";
    default:
      return false;
  }
}

/**
 * Get completion count and percentage.
 */
export function getOnboardingProgress(appState: {
  setupComplete: boolean;
  watchlistEntities: Array<unknown>;
}): { completed: number; total: number; percentage: number } {
  const total = onboardingTasks.length;
  const completed = onboardingTasks.filter((t) =>
    isTaskCompleted(t.id, appState),
  ).length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}
