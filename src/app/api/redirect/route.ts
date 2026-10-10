import { NextResponse, type NextRequest } from "next/server";
import { sampleEsimPlans } from "@/lib/sample-esim";
import { samplePlans } from "@/lib/sample-plans";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PLAN_ID = /^(sample-\d+|esim-sample-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("plan_id");
  if (!planId || !PLAN_ID.test(planId)) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  const db = getAdminClient();
  let target: string | null = null;

  if (!db) {
    const sample = samplePlans.find((p) => p.id === planId) ?? sampleEsimPlans.find((p) => p.id === planId);
    target = safeUrl(sample?.affiliate_url);
  } else {
    const { data: plan } = await db
      .from("plans")
      .select("id, affiliate_url, provider:providers(website_url)")
      .eq("id", planId)
      .maybeSingle();
    // Not a telco plan: it may be a travel eSIM plan.
    const esim = plan
      ? null
      : (await db.from("esim_plans").select("id, affiliate_url, provider:providers(website_url)").eq("id", planId).maybeSingle()).data;
    const found = plan ?? esim;
    if (!found) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const provider = found.provider as unknown as { website_url: string | null } | null;
    target = safeUrl(found.affiliate_url) ?? safeUrl(provider?.website_url);

    // Log the click; never block the redirect on a logging failure.
    const { error } = await db.from("affiliate_clicks").insert({
      ...(plan ? { plan_id: plan.id } : { esim_plan_id: found.id }),
      user_agent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
    });
    if (error) console.error("[redirect] click log failed:", error.message);
  }

  if (!target) return NextResponse.json({ error: "No destination for this plan" }, { status: 404 });
  return NextResponse.redirect(target, 302);
}
