import type { Metadata } from "next";
import { Suspense } from "react";
import { AppFrame } from "@/components/app-frame";
import { SearchExperience } from "@/components/search-experience";
export const metadata: Metadata = { title: "Search" };
export default function SearchPage() { return <AppFrame title="Search"><Suspense fallback={<div className="state-card">Preparing search…</div>}><SearchExperience /></Suspense></AppFrame>; }
