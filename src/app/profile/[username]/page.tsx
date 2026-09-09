import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { ProfileView } from "@/components/profile-view";
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> { const { username } = await params; return { title: `@${username}`, description: `View @${username} on Nexus.`, openGraph: { images: [] }, twitter: { images: [] } }; }
export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; return <AppFrame title={`@${username}`}><ProfileView username={username} /></AppFrame>; }
