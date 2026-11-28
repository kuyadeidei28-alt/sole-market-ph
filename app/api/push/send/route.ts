import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "Please log in as an administrator." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + accessToken } },
  });

  try {
    const { data: admin, error: adminError } = await supabase.rpc("is_sole_market_admin");
    if (adminError || admin !== true) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const input = await request.json();
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const body = typeof input.body === "string" ? input.body.trim() : "";
    const url = typeof input.url === "string" && input.url.startsWith("/") ? input.url : "/announcements";
    if (!title || title.length > 80 || !body || body.length > 240) {
      return NextResponse.json({ error: "Title (1–80 characters) and message (1–240 characters) are required." }, { status: 400 });
    }

    const { data: announcementId, error: createError } = await supabase.rpc("admin_create_announcement", {
      p_title: title, p_body: body, p_url: url,
    });
    if (createError) throw createError;

    const { data: subscriptions, error: subscriptionsError } = await supabase.rpc("admin_list_push_subscriptions");
    if (subscriptionsError) throw subscriptionsError;
    const targets = (subscriptions || []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;

    let sent = 0, failed = 0;
    const expired: string[] = [];
    await Promise.all(targets.map(async (subscription) => {
      try {
        const result = await sendWebPush(subscription, { title, body, url });
        if (result.ok) sent++;
        else {
          failed++;
          if (result.status === 404 || result.status === 410) expired.push(subscription.endpoint);
        }
      } catch { failed++; }
    }));

    if (expired.length) {
      await Promise.all(expired.map((endpoint) => supabase.rpc("admin_remove_push_subscription", { p_endpoint: endpoint })));
    }
    const { error: updateError } = await supabase.from("announcements")
      .update({ sent_count: sent, failed_count: failed }).eq("id", announcementId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, announcementId, total: targets.length, sent, failed, expired: expired.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send announcement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
