import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { RoomChat } from "@/components/room-chat";
export const metadata: Metadata = { title: "Room" };
export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <AppFrame title={`# ${slug}`}><RoomChat slug={slug} /></AppFrame>; }
