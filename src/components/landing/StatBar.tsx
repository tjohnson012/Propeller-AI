"use client";

import { useState, useEffect, useRef } from "react";
import { stats } from "@/lib/constants";
import { FadeUp } from "@/components/ui/FadeUp";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, value]);

  return (
    <div ref={ref} className="font-mono text-4xl md:text-5xl font-bold tracking-[-0.04em] text-text-primary tabular-nums">
      {started ? count.toLocaleString() : "0"}
      {suffix}
    </div>
  );
}

const parsedStats = [
  { value: 12000, suffix: "+", label: "OFAC SDN entries screened in real-time" },
  { value: 190, suffix: "+", label: "Countries with UN Comtrade trade data" },
  { value: 5200, suffix: "+", label: "HS codes in our tariff database" },
  { value: 30, suffix: "s", label: "Full compliance screening per entity", prefix: "<" },
];

export function StatBar() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          {parsedStats.map((stat, i) => (
            <FadeUp key={stat.label} delay={i * 0.08}>
              <div>
                <div className="flex items-baseline gap-0.5">
                  {stat.prefix && (
                    <span className="font-mono text-4xl md:text-5xl font-bold tracking-[-0.04em] text-text-primary">
                      {stat.prefix}
                    </span>
                  )}
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-text-tertiary text-sm leading-snug mt-2">{stat.label}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
