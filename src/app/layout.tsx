import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Nexus — Search. Talk. Belong.", template: "%s · Nexus" },
  description: "A calm place to search the web, join public rooms, and stay close to your people.",
  applicationName: "Nexus",
  openGraph: { title: "Nexus — Search. Talk. Belong.", description: "A calm place to search the web, join public rooms, and stay close to your people.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Nexus — Search. Talk. Belong." }] },
  twitter: { card: "summary_large_image", title: "Nexus — Search. Talk. Belong.", description: "Search the web, join public rooms, and stay close to your people.", images: ["/og.png"] },
};
export const viewport: Viewport = { colorScheme: "dark light", themeColor: "#10110f" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
