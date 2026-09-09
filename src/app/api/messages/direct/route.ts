import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { moderateMessage } from "@/lib/moderation";
import { rateLimit } from "@/lib/rate-limit";
import { directMessageSchema } from "@/lib/schemas";
import { createClient, getViewer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  const limited = rateLimit(`dm:${viewer.id}`, env.MESSAGE_RATE_LIMIT_PER_MINUTE); if (!limited.allowed) return NextResponse.json({ error: "You’re sending messages too quickly." }, { status: 429 });
  const parsed = directMessageSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid message." }, { status: 400 });
  const moderation = moderateMessage(parsed.data.content); if (!moderation.allowed) return NextResponse.json({ error: moderation.reason }, { status: 422 });
  const supabase = await createClient(); if (!supabase) return NextResponse.json({ error: "Messages are not configured." }, { status: 503 });
  const { data: profile } = await supabase.from("profiles").select("moderation_status,muted_until").eq("id", viewer.id).single();
  if (profile?.moderation_status === "suspended" || (profile?.muted_until && new Date(profile.muted_until) > new Date())) return NextResponse.json({ error: "This account cannot send messages right now." }, { status: 403 });
  const { data, error } = await supabase.from("direct_messages").insert({ conversation_id: parsed.data.conversationId, sender_id: viewer.id, content: moderation.content, reply_to_id: parsed.data.replyToId ?? null }).select("id").single();
  if (error) return NextResponse.json({ error: error.message.includes("policy") ? "You cannot send a message to this conversation." : error.message }, { status: 403 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
