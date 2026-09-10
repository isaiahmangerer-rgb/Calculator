import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { AdminDashboard } from "@/components/admin-dashboard";
import { createClient, getPermanentViewer } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Admin" };
export default async function AdminPage() {
  const viewer = await getPermanentViewer(); const supabase = await createClient();
  if (!viewer || !supabase) return <AppFrame title="Admin"><div className="state-card"><strong>Administrator sign-in required.</strong><a className="primary-button" href="/sign-in">Sign in</a></div></AppFrame>;
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", viewer.id).eq("role", "admin").maybeSingle();
  if (!role) return <AppFrame title="Admin"><div className="state-card error-state"><strong>Access denied.</strong><p>Administrator permissions are verified on the server and in the database.</p></div></AppFrame>;
  const [reports, rooms, profiles, roomMessages, directMessages] = await Promise.all([supabase.from("reports").select("id,reason,status,created_at,reported_user_id,room_message_id,direct_message_id,reporter:profiles!reports_reporter_id_fkey(username,display_name),reported:profiles!reports_reported_user_id_fkey(username,display_name),room_message:room_messages!reports_room_message_id_fkey(content,created_at),direct_message:direct_messages!reports_direct_message_id_fkey(content,created_at)").order("created_at", { ascending: false }).limit(100), supabase.from("rooms").select("id,name,slug,is_active").order("name"), supabase.from("profiles").select("id", { count: "exact", head: true }), supabase.from("room_messages").select("id", { count: "exact", head: true }), supabase.from("direct_messages").select("id", { count: "exact", head: true })]);
  return <AppFrame title="Admin"><div className="page-intro compact"><span className="kicker">Protected operations</span><h1>Community care.</h1><p>Every action is re-authorized server-side and recorded in the audit log.</p></div><AdminDashboard reports={(reports.data as never[]) ?? []} rooms={rooms.data ?? []} stats={{ users: profiles.count ?? 0, roomMessages: roomMessages.count ?? 0, directMessages: directMessages.count ?? 0 }} /></AppFrame>;
}
