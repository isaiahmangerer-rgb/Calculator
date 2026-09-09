"use client";

import {
  Bell, ChevronRight, Compass, Gamepad2, Hash, Home, Laptop, MessageCircle,
  MoreHorizontal, Plus, Search, Settings, Sparkles, UserRound, Users,
} from "lucide-react";
import { FormEvent, useState } from "react";

const nav = [
  ["Home", Home], ["Search", Search], ["Messages", MessageCircle], ["Rooms", Hash],
  ["Friends", Users], ["Profile", UserRound], ["Settings", Settings],
] as const;
const rooms = [
  { name: "General", icon: Hash, active: true },
  { name: "Gaming", icon: Gamepad2, active: false },
  { name: "Technology", icon: Laptop, active: false },
  { name: "Random", icon: Sparkles, active: false },
];

export function NexusShell() {
  const [query, setQuery] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) window.location.href = `/search?q=${encodeURIComponent(trimmed)}`;
  }
  return (
    <main className="app-canvas">
      <aside className="left-rail" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Nexus home"><span className="brand-mark"><span /></span><span>Nexus</span></a>
        <nav className="nav-stack">
          {nav.map(([label, Icon], index) => (
            <a className={`nav-item ${index === 0 ? "is-active" : ""}`} href={index === 0 ? "/" : `/${label.toLowerCase()}`} key={label}>
              <Icon size={18} strokeWidth={2} /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="rail-account"><div className="avatar avatar-me">IS</div><div><strong>Guest</strong><span>Sign in to connect</span></div><MoreHorizontal size={18} /></div>
      </aside>

      <section className="main-stage">
        <header className="topbar">
          <div className="crumb"><Compass size={17} /><span>Your calm corner of the internet</span></div>
          <div className="top-actions"><a className="icon-button" href="/messages" aria-label="Notifications"><Bell size={18} /></a><a className="secondary-button" href="/sign-in">Sign in</a><a className="primary-button" href="/sign-up">Join Nexus</a></div>
        </header>
        <div className="home-scroll">
          <section className="welcome-panel">
            <div className="ambient ambient-one" /><div className="ambient ambient-two" />
            <div className="welcome-copy"><span className="eyebrow"><Sparkles size={14} /> Search. Talk. Belong.</span><h1>Where curiosity<br /><em>meets community.</em></h1><p>Search the open web, discover great spaces, and stay close to your people—all in one thoughtful place.</p></div>
            <form className="search-box" onSubmit={submit}><Search size={21} /><input aria-label="Search the web" placeholder="What are you looking for?" value={query} onChange={(event) => setQuery(event.target.value)} /><span className="shortcut">⌘ K</span><button type="submit" aria-label="Search"><ChevronRight size={20} /></button></form>
            <div className="search-hints"><span>Try</span><button onClick={() => setQuery("Best tools for focused work")}>Focused work</button><button onClick={() => setQuery("What happened in technology today?")}>Tech today</button><button onClick={() => setQuery("Creative communities")}>Creative communities</button></div>
          </section>
          <section className="content-grid">
            <div className="rooms-card card">
              <div className="section-heading"><div><span className="kicker">Live now</span><h2>Public rooms</h2></div><a href="/rooms">Explore all <ChevronRight size={15} /></a></div>
              <div className="room-list">{rooms.map(({ name, icon: Icon, active }) => <a className="room-row" href={`/rooms/${name.toLowerCase()}`} key={name}><span className={`room-icon ${active ? "room-active" : ""}`}><Icon size={18} /></span><span className="room-copy"><strong>{name}</strong><small>Join the conversation</small></span><ChevronRight className="row-chevron" size={17} /></a>)}</div>
            </div>
            <div className="dispatch-card card"><div className="dispatch-art"><span className="orbit orbit-a" /><span className="orbit orbit-b" /><span className="orb orb-a" /><span className="orb orb-b" /><span className="core"><span /></span></div><span className="kicker">Nexus dispatch</span><h2>Good internet,<br />curated daily.</h2><p>A quiet view of useful links and thoughtful conversations from across the community.</p><a href="/rooms">Explore the community<ChevronRight size={15} /></a></div>
          </section>
        </div>
      </section>

      <aside className="right-rail">
        <div className="right-title"><div><span className="presence-dot" /><strong>Live presence</strong></div></div>
        <div className="friend-list"><div className="empty-mini">Sign in to see which friends are online and receive live conversation updates.</div></div>
        <div className="invite-card"><span className="invite-icon"><Users size={20} /></span><h3>It’s better together.</h3><p>Invite someone you know and start a private conversation.</p><a href="/friends"><Plus size={16} /> Add a friend</a></div>
        <div className="community-note"><span>Community status</span><strong><i /> All systems are peaceful</strong></div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">{nav.slice(0, 5).map(([label, Icon], index) => <a href={index === 0 ? "/" : `/${label.toLowerCase()}`} className={index === 0 ? "is-active" : ""} key={label}><Icon size={20} /><span>{label}</span></a>)}</nav>
    </main>
  );
}
