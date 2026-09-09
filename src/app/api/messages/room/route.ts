import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { moderateMessage } from "@/lib/moderation";
import { rateLimit } from "@/lib/rate-limit";
import { roomMessageSchema } from "@/lib/schemas";
import { createClient, getViewer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  const limited = rateLimit(`message:${viewer.id}`, env.MESSAGE_RATE_LIMIT_PER_MINUTE); if (!limited.allowed) return NextResponse.json({ error: "You’re sending messages too quickly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  const parsed = roomMessageSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid message." }, { status: 400 });
  const moderation = moderateMessage(parsed.data.content); if (!moderation.allowed) return NextResponse.json({ error: moderation.reason }, { status: 422 });
  const supabase = await createClient(); if (!supabase) return NextResponse.json({ error: "Chat is not configured." }, { status: 503 });
  const { data: profile } = await supabase.from("profiles").select("moderation_status,muted_until").eq("id", viewer.id).single();
  if (profile?.moderation_status === "suspended") return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  if (profile?.muted_until && new Date(profile.muted_until) > new Date()) return NextResponse.json({ error: "This account is temporarily muted." }, { status: 403 });
  await supabase.from("room_members").upsert({ room_id: parsed.data.roomId, user_id: viewer.id }, { onConflict: "room_id,user_id" });
  const { data, error } = await supabase.from("room_messages").insert({ room_id: parsed.data.roomId, sender_id: viewer.id, content: moderation.content, reply_to_id: parsed.data.replyToId ?? null }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
