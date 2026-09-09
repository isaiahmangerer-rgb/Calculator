import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { RoomsDirectory } from "@/components/rooms-directory";
export const metadata: Metadata = { title: "Rooms" };
export default function RoomsPage() { return <AppFrame title="Public rooms"><div className="page-intro"><span className="kicker">Open conversations</span><h1>Find your room.</h1><p>Four public spaces for questions, discoveries, and the wonderfully unexpected.</p></div><RoomsDirectory /></AppFrame>; }
