"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { useAppStore } from "@/lib/store";
import { tourSteps } from "@/lib/onboarding-constants";
import { ArrowRight, ArrowLeft, X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const { currentTourStep, nextStep, prevStep, skipTour } =
    useOnboardingStore();
  const { setSidebarExpanded, setTourLockSidebar } = useAppStore();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step =
    currentTourStep !== null ? tourSteps[currentTourStep] : null;

  // Calculate target element position
  const updatePosition = useCallback(() => {
    if (!step) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [step]);

  // Update position on step change and resize
  useEffect(() => {
    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [updatePosition]);

  // Lock sidebar open for sidebar steps
  useEffect(() => {
    if (step?.lockSidebar) {
      setSidebarExpanded(true);
      setTourLockSidebar(true);
      // Recalculate position after sidebar animation
      const timer = setTimeout(updatePosition, 250);
      return () => clearTimeout(timer);
    } else {
      setTourLockSidebar(false);
    }
  }, [step, setSidebarExpanded, setTourLockSidebar, updatePosition]);

  // Clean up sidebar lock when tour ends
  useEffect(() => {
    if (currentTourStep === null) {
      setTourLockSidebar(false);
    }
  }, [currentTourStep, setTourLockSidebar]);

  if (currentTourStep === null || !step) return null;

  // Calculate popover position
  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const popoverWidth = 340;

    switch (step.position) {
      case "bottom":
        return {
          top: targetRect.top + targetRect.height + padding,
          left: Math.min(
            targetRect.left + targetRect.width / 2 - popoverWidth / 2,
            window.innerWidth - popoverWidth - padding,
          ),
        };
      case "top":
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.min(
            targetRect.left + targetRect.width / 2 - popoverWidth / 2,
            window.innerWidth - popoverWidth - padding,
          ),
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - 80,
          left: targetRect.left + targetRect.width + padding,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - 80,
          right: window.innerWidth - targetRect.left + padding,
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]" key="tour-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={nextStep}
        >
          {/* Dark overlay with cutout for spotlight */}
          {targetRect && step.position !== "center" ? (
            <div className="absolute inset-0">
              {/* The spotlight hole */}
              <div
                className="absolute rounded-lg"
                style={{
                  top: targetRect.top - 4,
                  left: targetRect.left - 4,
                  width: targetRect.width + 8,
                  height: targetRect.height + 8,
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
                }}
              />
              {/* Pulse ring around spotlight */}
              <div
                className="absolute rounded-lg border-2 border-accent/40 animate-pulse pointer-events-none"
                style={{
                  top: targetRect.top - 6,
                  left: targetRect.left - 6,
                  width: targetRect.width + 12,
                  height: targetRect.height + 12,
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/65" />
          )}
        </motion.div>

        {/* Popover card */}
        <motion.div
          key={`popover-${currentTourStep}`}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute z-[101] w-[340px]"
          style={getPopoverStyle()}
        >
          <div className="bg-bg-secondary border border-border-primary rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-[11px] text-text-muted font-mono">
                {currentTourStep + 1} of {tourSteps.length}
              </span>
              <button
                onClick={skipTour}
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
              <h3 className="text-base font-medium text-text-primary mb-1.5">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {step.description}
              </p>

              {/* Value proposition callout */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-accent/5 border border-accent/10 mb-4">
                <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {step.valueProp}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={skipTour}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip tour
                </button>

                <div className="flex items-center gap-2">
                  {currentTourStep > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevStep();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-bg-primary transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextStep();
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    {currentTourStep === tourSteps.length - 1
                      ? "Get Started"
                      : "Next"}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === currentTourStep ? "bg-accent" : "bg-bg-tertiary",
                  )}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
