import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, any> = {
    env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing",
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing",
      service: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ? "ok" : "missing",
    },
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asistentes")
      .select("id")
      .limit(1);

    checks.supabase = {
      ok: !error,
      error: error?.message || null,
      rows: data?.length ?? 0,
    };
  } catch (err: any) {
    checks.supabase = {
      ok: false,
      error: err?.message || "Unknown error",
    };
  }

  return NextResponse.json(checks);
}
