import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getPermanentViewer } from "@/lib/supabase/server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resolve_report"), reportId: z.string().uuid() }), z.object({ action: z.literal("mute_user"), userId: z.string().uuid(), hours: z.number().int().min(1).max(720) }), z.object({ action: z.literal("suspend_user"), userId: z.string().uuid() }), z.object({ action: z.literal("delete_room_message"), messageId: z.string().uuid() }), z.object({ action: z.literal("delete_direct_message"), messageId: z.string().uuid() }), z.object({ action: z.literal("toggle_room"), roomId: z.string().uuid(), active: z.boolean() }), z.object({ action: z.literal("create_room"), name: z.string().trim().min(2).max(60), slug: z.string().regex(/^[a-z0-9-]{2,40}$/), description: z.string().trim().max(240) }),
]);
export async function POST(request: Request) {
  const viewer = await getPermanentViewer(); const supabase = await createClient(); if (!viewer || !supabase) return NextResponse.json({ error: "Unauthorized." }, { status: 401 }); const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", viewer.id).eq("role", "admin").maybeSingle(); if (!role) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 }); const value = parsed.data; let error: { message: string } | null = null;
  if (value.action === "resolve_report") ({ error } = await supabase.from("reports").update({ status: "resolved", reviewed_by: viewer.id, reviewed_at: new Date().toISOString() }).eq("id", value.reportId));
  if (value.action === "mute_user") ({ error } = await supabase.rpc("admin_set_moderation", { target_user: value.userId, new_status: "muted", new_muted_until: new Date(Date.now() + value.hours * 3_600_000).toISOString() }));
  if (value.action === "suspend_user") ({ error } = await supabase.rpc("admin_set_moderation", { target_user: value.userId, new_status: "suspended", new_muted_until: null }));
  if (value.action === "delete_room_message") ({ error } = await supabase.from("room_messages").update({ content: "", deleted_at: new Date().toISOString() }).eq("id", value.messageId));
  if (value.action === "delete_direct_message") ({ error } = await supabase.from("direct_messages").update({ content: "", deleted_at: new Date().toISOString() }).eq("id", value.messageId));
  if (value.action === "toggle_room") ({ error } = await supabase.from("rooms").update({ is_active: value.active }).eq("id", value.roomId));
  if (value.action === "create_room") ({ error } = await supabase.from("rooms").insert({ name: value.name, slug: value.slug, description: value.description, created_by: viewer.id }));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 }); await supabase.from("moderation_audit_log").insert({ admin_id: viewer.id, action: value.action, target_user_id: "userId" in value ? value.userId : null, metadata: value }); return NextResponse.json({ ok: true });
}
