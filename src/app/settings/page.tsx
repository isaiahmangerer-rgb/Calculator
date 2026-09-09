import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { SettingsPanel } from "@/components/settings-panel";
export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() { return <AppFrame title="Settings"><div className="page-intro compact"><span className="kicker">Your Nexus</span><h1>Make it yours.</h1><p>Personal preferences stay on this device.</p></div><SettingsPanel /></AppFrame>; }
