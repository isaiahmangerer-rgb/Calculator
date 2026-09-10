"use client";

import { CornerUpLeft, Edit3, Flag, Hash, LoaderCircle, MoreHorizontal, Send, SmilePlus, Trash2, Users } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/app-frame";
import { getOrCreateChatIdentity, guestChatEnabled } from "@/lib/guest-chat";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null };
type Message = { id: string; room_id: string; sender_id: string; content: string; created_at: string; updated_at: string; reply_to_id: string | null; profiles: Profile | null; message_reactions?: Array<{ id: string; emoji: string; user_id: string }> };
type Room = { id: string; name: string; slug: string; description: string };

export function RoomChat({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [guestError, setGuestError] = useState("");

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true;
    void getOrCreateChatIdentity(supabase)
      .then(() => { if (active) setReady(true); })
      .catch((reason) => {
        if (!active) return;
        setGuestError(reason instanceof Error ? reason.message : "Guest chat is unavailable.");
        setReady(true);
      });
    return () => { active = false; };
  }, [supabase]);

  if (!ready) return <div className="state-card"><LoaderCircle className="spin" /> Creating your guest chat session…</div>;
  if (guestError) return <div className="state-card error-state"><Hash /><strong>Guest chat needs one setting.</strong><p>{guestError}</p>{!guestChatEnabled && <a className="primary-button" href="/sign-in">Sign in instead</a>}</div>;
  return <AuthenticatedRoomChat slug={slug} />;
}

function AuthenticatedRoomChat({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), []); const bottomRef = useRef<HTMLDivElement>(null); const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [room, setRoom] = useState<Room | null>(null); const [messages, setMessages] = useState<Message[]>([]); const [viewerId, setViewerId] = useState(""); const [content, setContent] = useState(""); const [reply, setReply] = useState<Message | null>(null); const [typing, setTyping] = useState<string[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const loadMessages = useCallback(async (roomId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("room_messages").select("id,room_id,sender_id,content,created_at,updated_at,reply_to_id,profiles!room_messages_sender_id_fkey(id,username,display_name,avatar_url),message_reactions(id,emoji,user_id)").eq("room_id", roomId).is("deleted_at", null).order("created_at", { ascending: true }).limit(100);
    setMessages((data as unknown as Message[]) ?? []); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
  }, [supabase]);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    void Promise.all([supabase.auth.getUser(), supabase.from("rooms").select("id,name,slug,description").eq("slug", slug).eq("is_active", true).maybeSingle()]).then(async ([auth, roomResult]) => {
      if (!active) return; const found = roomResult.data as Room | null; setViewerId(auth.data.user?.id ?? ""); setRoom(found); setLoading(false); if (!found) return;
      await loadMessages(found.id);
      if (auth.data.user) await supabase.from("room_members").upsert({ room_id: found.id, user_id: auth.data.user.id, last_read_at: new Date().toISOString() }, { onConflict: "room_id,user_id" });
      const channel = supabase.channel(`room:${found.id}`); channelRef.current = channel;
      channel.on("postgres_changes", { event: "*", schema: "public", table: "room_messages", filter: `room_id=eq.${found.id}` }, () => void loadMessages(found.id)).on("broadcast", { event: "typing" }, ({ payload }) => { if (payload.user_id !== auth.data.user?.id) { setTyping((list) => Array.from(new Set([...list, payload.name]))); setTimeout(() => setTyping((list) => list.filter((name) => name !== payload.name)), 2200); } }).subscribe();
    });
    return () => { active = false; if (channelRef.current && supabase) void supabase.removeChannel(channelRef.current); };
  }, [loadMessages, slug, supabase]);
  function announceTyping() { if (!channelRef.current || !viewerId) return; if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => {}, 900); void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: viewerId, name: "Someone" } }); }
  async function send(event: FormEvent) { event.preventDefault(); if (!room || !content.trim()) return; setError(""); const response = await fetch("/api/messages/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: room.id, content, replyToId: reply?.id ?? null }) }); const payload = await response.json(); if (!response.ok) setError(payload.error); else { setContent(""); setReply(null); await loadMessages(room.id); } }
  async function remove(message: Message) { if (!confirm("Delete this message?")) return; await fetch(`/api/messages/room/${message.id}`, { method: "DELETE" }); if (room) await loadMessages(room.id); }
  async function edit(message: Message) { const next = prompt("Edit your message", message.content); if (!next || next.trim() === message.content) return; const response = await fetch(`/api/messages/room/${message.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: next }) }); if (!response.ok) setError((await response.json()).error); else if (room) await loadMessages(room.id); }
  async function react(message: Message, emoji = "✨") { if (!supabase || !viewerId) { setError("Sign in to react."); return; } await supabase.from("message_reactions").upsert({ room_message_id: message.id, user_id: viewerId, emoji }, { onConflict: "room_message_id,user_id,emoji" }); if (room) await loadMessages(room.id); }
  async function report(message: Message) { if (!supabase || !viewerId) return setError("Sign in to report a message."); const reason = prompt("Why should moderators review this message? (at least 10 characters)"); if (!reason || reason.trim().length < 10) return; const { error: reportError } = await supabase.from("reports").insert({ reporter_id: viewerId, reported_user_id: message.sender_id, room_message_id: message.id, reason }); setError(reportError?.message || "Report sent privately to moderators."); }
  if (loading) return <div className="state-card"><LoaderCircle className="spin" /> Joining room…</div>;
  if (!supabase) return <div className="state-card error-state"><Hash /><strong>Realtime chat is waiting for Supabase.</strong><p>Configure the project credentials to activate rooms.</p></div>;
  if (!room) return <div className="state-card">This room does not exist or is no longer active.</div>;
  return <div className="chat-surface"><header className="chat-heading"><span className="room-icon room-active"><Hash size={19} /></span><div><h1>{room.name}</h1><p>{room.description}</p></div><span><Users size={15} /> Public room</span></header><div className="message-stream">{messages.map((message) => <article className="message" key={message.id}><Avatar name={message.profiles?.display_name || "Nexus user"} image={message.profiles?.avatar_url ?? null} /><div className="message-body">{message.reply_to_id && <span className="reply-label"><CornerUpLeft size={12} /> Replying to a message</span>}<div className="message-meta"><a href={`/profile/${message.profiles?.username}`}>{message.profiles?.display_name || "Nexus user"}</a><span>@{message.profiles?.username || "member"}</span><time>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>{message.updated_at !== message.created_at && <small>(edited)</small>}</div><p>{message.content}</p>{Boolean(message.message_reactions?.length) && <div className="reaction-list">{Object.entries(Object.groupBy(message.message_reactions!, (item) => item.emoji)).map(([emoji, items]) => <button key={emoji} onClick={() => void react(message, emoji)}>{emoji} {items?.length}</button>)}</div>}</div><div className="message-actions"><button onClick={() => setReply(message)} aria-label="Reply"><CornerUpLeft size={14} /></button><button onClick={() => void react(message)} aria-label="React"><SmilePlus size={14} /></button><button onClick={() => void report(message)} aria-label="Report"><Flag size={14} /></button>{message.sender_id === viewerId && <><button onClick={() => void edit(message)} aria-label="Edit"><Edit3 size={14} /></button><button onClick={() => void remove(message)} aria-label="Delete"><Trash2 size={14} /></button></>}<MoreHorizontal size={14} /></div></article>)}{!messages.length && <div className="empty-chat"><Hash /><h2>Start the {room.name} conversation</h2><p>Be welcoming, stay curious, and follow the community guidelines.</p></div>}<div ref={bottomRef} /></div><footer className="composer">{reply && <div className="reply-banner"><span>Replying to {reply.profiles?.display_name}</span><button onClick={() => setReply(null)}>Cancel</button></div>}{typing.length > 0 && <span className="typing-note">{typing[0]} is typing…</span>}{error && <p className="composer-error">{error}</p>}<form onSubmit={send}><textarea aria-label={`Message ${room.name}`} placeholder={viewerId ? `Message #${room.slug}` : "Sign in to send a message"} value={content} onChange={(event) => { setContent(event.target.value); announceTyping(); }} maxLength={2000} disabled={!viewerId} rows={1} /><span>{content.length}/2000</span><button className="send-button" disabled={!viewerId || !content.trim()} aria-label="Send message"><Send size={17} /></button></form></footer></div>;
}
