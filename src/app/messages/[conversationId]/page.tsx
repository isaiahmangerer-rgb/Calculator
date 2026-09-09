import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { DirectChat } from "@/components/direct-chat";
export const metadata: Metadata = { title: "Conversation" };
export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) { const { conversationId } = await params; return <AppFrame title="Direct message"><DirectChat conversationId={conversationId} /></AppFrame>; }
