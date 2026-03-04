import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
