"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { navLinks } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg-primary/80 backdrop-blur-md border-b border-border-primary"
          : "border-b border-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-serif text-xl text-text-primary tracking-[-0.02em]">
            Propeller
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link href="/dashboard">
          <Button size="sm">Open App</Button>
        </Link>
      </div>
    </nav>
  );
}
