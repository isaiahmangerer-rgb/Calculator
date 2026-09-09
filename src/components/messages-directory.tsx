"use client";

import { MessageCircle, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/app-frame";
import { createClient } from "@/lib/supabase/client";

type Summary = { conversation_id: string; other_user_id: string; username: string; display_name: string; avatar_url: string | null; last_message: string | null; last_message_at: string | null; unread_count: number };
export function MessagesDirectory() {
  const supabase = useMemo(() => createClient(), []); const [items, setItems] = useState<Summary[]>([]); const [filter, setFilter] = useState("");
  useEffect(() => { if (!supabase) return; void supabase.rpc("get_direct_conversation_summaries").then(({ data }) => setItems((data as Summary[]) ?? [])); }, [supabase]);
  if (!supabase) return <div className="state-card error-state"><MessageCircle /><strong>Private messages are ready for Supabase.</strong><p>Connect the database to activate participant-only conversations.</p></div>;
  const visible = items.filter((item) => `${item.display_name} ${item.username}`.toLowerCase().includes(filter.toLowerCase()));
  return <div className="messages-directory"><div className="directory-toolbar"><label><Search size={16} /><input aria-label="Filter conversations" placeholder="Find a conversation" value={filter} onChange={(event) => setFilter(event.target.value)} /></label><a className="primary-button" href="/friends"><Plus size={15} /> New message</a></div><div className="conversation-list">{visible.map((item) => <a href={`/messages/${item.conversation_id}`} className="conversation-row" key={item.conversation_id}><Avatar name={item.display_name} image={item.avatar_url} /><div><strong>{item.display_name}</strong><p>{item.last_message || "Start a conversation"}</p></div><span>{item.last_message_at ? new Date(item.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}{item.unread_count > 0 && <i>{item.unread_count}</i>}</span></a>)}{!visible.length && <div className="state-card"><MessageCircle /><strong>No conversations yet.</strong><p>Visit Friends or a member profile to start one.</p></div>}</div></div>;
}
