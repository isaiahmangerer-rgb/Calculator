import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import { ProfileView } from "@/components/profile-view";
export const metadata: Metadata = { title: "Profile" };
export default function ProfilePage() { return <AppFrame title="Your profile"><ProfileView /></AppFrame>; }
