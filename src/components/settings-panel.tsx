"use client";

import { Check, Moon, ShieldCheck, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export function SettingsPanel() {
  const [theme, setTheme] = useState("dark"); const [saved, setSaved] = useState(false);
  useEffect(() => { const value = localStorage.getItem("nexus-theme") || "dark"; setTheme(value); document.documentElement.dataset.theme = value; }, []);
  function choose(value: string) { setTheme(value); localStorage.setItem("nexus-theme", value); document.documentElement.dataset.theme = value; setSaved(true); setTimeout(() => setSaved(false), 1600); }
  return <div className="settings-grid"><section className="manager-section"><div className="manager-heading"><div><span className="kicker">Appearance</span><h2>Choose your atmosphere</h2></div>{saved && <span><Check size={13} /> Saved</span>}</div><div className="theme-choices"><button className={theme === "dark" ? "selected" : ""} onClick={() => choose("dark")}><Moon /><strong>Night</strong><span>Deep charcoal and soft light</span></button><button className={theme === "light" ? "selected" : ""} onClick={() => choose("light")}><Sun /><strong>Daylight</strong><span>Warm paper and crisp ink</span></button></div></section><section className="manager-section"><div className="manager-heading"><div><span className="kicker">Privacy</span><h2>Your safety controls</h2></div><ShieldCheck size={19} /></div><div className="setting-lines"><div><strong>Direct messages</strong><span>Only conversation members can read them.</span></div><div><strong>Blocked accounts</strong><span>Manage blocks from any member profile.</span></div><div><strong>Reports</strong><span>Reports are private and visible only to moderators.</span></div></div></section></div>;
}
