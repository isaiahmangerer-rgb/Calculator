import { NextResponse } from "next/server";
import { moderateMessage } from "@/lib/moderation";
import { messageSchema, uuidSchema } from "@/lib/schemas";
import { createClient, getViewer } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 }); const { messageId } = await params;
  if (!uuidSchema.safeParse(messageId).success) return NextResponse.json({ error: "Invalid message." }, { status: 400 }); const parsed = messageSchema.pick({ content: true }).safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  const moderation = moderateMessage(parsed.data.content); if (!moderation.allowed) return NextResponse.json({ error: moderation.reason }, { status: 422 });
  const supabase = await createClient(); const { error } = await supabase!.from("direct_messages").update({ content: moderation.content, updated_at: new Date().toISOString() }).eq("id", messageId).eq("sender_id", viewer.id).is("deleted_at", null);
  return error ? NextResponse.json({ error: error.message }, { status: 403 }) : NextResponse.json({ ok: true });
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 }); const { messageId } = await params; if (!uuidSchema.safeParse(messageId).success) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  const supabase = await createClient(); const { error } = await supabase!.from("direct_messages").update({ deleted_at: new Date().toISOString(), content: "" }).eq("id", messageId).eq("sender_id", viewer.id);
  return error ? NextResponse.json({ error: error.message }, { status: 403 }) : NextResponse.json({ ok: true });
}
