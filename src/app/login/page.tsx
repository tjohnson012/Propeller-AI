"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();
  const isConfigured = !!supabase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for the confirmation link.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
  };

  // If Supabase isn't configured, show a bypass option
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-text-primary mb-2">Propeller</h1>
            <p className="text-sm text-text-secondary">Export operations, powered by AI</p>
          </div>
          <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
            <p className="text-sm text-text-secondary mb-4">
              Authentication is not configured. Add Supabase credentials to <code className="text-accent">.env.local</code> to enable user accounts.
            </p>
            <a
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Continue to Dashboard
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-text-primary mb-2">Propeller</h1>
          <p className="text-sm text-text-secondary">Export operations, powered by AI</p>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-bg-primary rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                mode === "login"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                mode === "signup"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted font-medium mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field w-full px-3 py-2.5 text-sm"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field w-full px-3 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2 rounded-lg bg-red-400/10">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="text-agent-outreach text-xs px-3 py-2 rounded-lg bg-agent-outreach-muted">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
