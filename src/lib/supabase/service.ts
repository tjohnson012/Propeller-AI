/**
 * Service-role Supabase client for server-side operations
 * that don't have a user session (e.g., cron jobs).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function createServiceSupabase(): SupabaseClient | null {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  serviceClient = createClient(url, key);
  return serviceClient;
}
