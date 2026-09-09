"use client";

import { Gamepad2, Hash, Laptop, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Room = { id: string; slug: string; name: string; description: string; is_active: boolean; unread_count: number };
const icons = { general: Hash, gaming: Gamepad2, technology: Laptop, random: Sparkles } as const;
export function RoomsDirectory() {
  const supabase = useMemo(() => createClient(), []); const [rooms, setRooms] = useState<Room[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!supabase) { setLoading(false); return; } void supabase.rpc("get_room_summaries").then(({ data }) => { setRooms((data as Room[]) ?? []); setLoading(false); }); }, [supabase]);
  if (loading) return <div className="state-card"><LoaderCircle className="spin" /> Loading rooms…</div>;
  if (!supabase) return <div className="state-card error-state"><Hash /><strong>Rooms are ready for Supabase.</strong><p>Add the environment variables and run the included database schema to bring them online.</p></div>;
  return <div className="directory-grid">{rooms.map((room) => { const Icon = icons[room.slug as keyof typeof icons] ?? Hash; return <a href={`/rooms/${room.slug}`} className="directory-card" key={room.id}><span className="room-icon room-active"><Icon size={20} /></span><div><h2>{room.name}</h2><p>{room.description}</p></div><span>{room.unread_count > 0 ? `${room.unread_count} unread` : "Join room →"}</span></a>; })}{!rooms.length && <div className="state-card">No public rooms are active yet.</div>}</div>;
}
