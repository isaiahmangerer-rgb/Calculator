"use client";

import { Bell, Hash, Home, LogOut, MessageCircle, Search, Settings, UserRound, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const links = [
  ["Home", "/", Home], ["Search", "/search", Search], ["Messages", "/messages", MessageCircle],
  ["Rooms", "/rooms", Hash], ["Friends", "/friends", Users], ["Profile", "/profile", UserRound], ["Settings", "/settings", Settings],
] as const;
type PresenceUser = { user_id: string; username: string; display_name: string; status: "online" | "away"; avatar_url?: string };
type Viewer = { username: string; display_name: string; avatar_url: string | null } | null;

export function AppFrame({ children, title, aside }: { children: ReactNode; title: string; aside?: ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [viewer, setViewer] = useState<Viewer>(null); const [online, setOnline] = useState<PresenceUser[]>([]);
  useEffect(() => {
    if (!supabase) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("username,display_name,avatar_url,status").eq("id", data.user.id).maybeSingle();
      if (!profile) return;
      setViewer(profile);
      channel = supabase.channel("nexus-presence", { config: { presence: { key: data.user.id } } });
      channel.on("presence", { event: "sync" }, () => {
        const values = Object.values(channel!.presenceState()).flat() as unknown as PresenceUser[];
        setOnline(values.filter((item, index, all) => all.findIndex((other) => other.user_id === item.user_id) === index));
      }).subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel!.track({ user_id: data.user!.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url, status: "online" });
      });
    });
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, [supabase]);

  async function signOut() { if (supabase) await supabase.auth.signOut(); router.push("/"); router.refresh(); }
  return (
    <main className="app-canvas inner-app">
      <aside className="left-rail" aria-label="Primary navigation">
        <a className="brand" href="/"><span className="brand-mark"><span /></span><span>Nexus</span></a>
        <nav className="nav-stack">{links.map(([label, href, Icon]) => <a className={`nav-item ${path === href || (href !== "/" && path.startsWith(`${href}/`)) ? "is-active" : ""}`} href={href} key={href}><Icon size={18} /><span>{label}</span></a>)}</nav>
        <div className="rail-account">{viewer ? <><Avatar name={viewer.display_name} image={viewer.avatar_url} /><div><strong>{viewer.display_name}</strong><span>@{viewer.username}</span></div><button onClick={signOut} aria-label="Sign out"><LogOut size={17} /></button></> : <><div className="avatar avatar-me">N</div><div><strong>Guest</strong><a href="/sign-in">Sign in to connect</a></div></>}</div>
      </aside>
      <section className="main-stage"><header className="topbar"><div className="page-title"><span className="brand-mark mobile-brand"><span /></span><strong>{title}</strong></div><div className="top-actions"><a className="icon-button" href="/messages" aria-label="Notifications"><Bell size={18} /></a>{!viewer && <a className="primary-button" href="/sign-in">Sign in</a>}</div></header><div className="page-scroll">{children}</div></section>
      <aside className="right-rail">{aside ?? <><div className="right-title"><div><span className="presence-dot" /><strong>Users online</strong></div><span>{online.length}</span></div><div className="friend-list">{online.length ? online.slice(0, 8).map((person) => <a href={`/profile/${person.username}`} className="friend-row" key={person.user_id}><Avatar name={person.display_name} image={person.avatar_url ?? null} /><span><strong>{person.display_name}</strong><small>@{person.username}</small></span><span className={`status-dot ${person.status}`} /></a>) : <div className="empty-mini">{supabase ? "No one else is online yet." : "Connect Supabase to enable live presence."}</div>}</div></>}</aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">{links.slice(0, 5).map(([label, href, Icon]) => <a href={href} className={path === href || (href !== "/" && path.startsWith(`${href}/`)) ? "is-active" : ""} key={href}><Icon size={20} /><span>{label}</span></a>)}</nav>
    </main>
  );
}

export function Avatar({ name, image }: { name: string; image: string | null }) {
  return <span className="avatar avatar-live" style={image ? { backgroundImage: `url(${image})` } : undefined}>{image ? "" : name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>;
}
