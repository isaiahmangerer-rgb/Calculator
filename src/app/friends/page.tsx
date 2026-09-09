import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { FriendsManager } from "@/components/friends-manager";
export const metadata: Metadata = { title: "Friends" };
export default function FriendsPage() { return <AppFrame title="Friends"><div className="page-intro compact"><span className="kicker">Your people</span><h1>Stay close.</h1><p>Requests are mutual, private, and duplicate-safe.</p></div><FriendsManager /></AppFrame>; }
