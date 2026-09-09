import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { MessagesDirectory } from "@/components/messages-directory";
export const metadata: Metadata = { title: "Messages" };
export default function MessagesPage() { return <AppFrame title="Messages"><div className="page-intro compact"><span className="kicker">Private conversations</span><h1>Your inbox.</h1><p>Only conversation participants can retrieve these messages.</p></div><MessagesDirectory /></AppFrame>; }
