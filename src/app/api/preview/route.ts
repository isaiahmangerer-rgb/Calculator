import { NextRequest, NextResponse } from "next/server";
import { previewRequestSchema } from "@/lib/schemas";
import { fetchPagePreview } from "@/lib/url-safety";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const limit = rateLimit(`preview:${key}`, 20);
  if (!limit.allowed) return NextResponse.json({ error: "Preview limit reached. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = previewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid public URL." }, { status: 400 });
  try { return NextResponse.json(await fetchPagePreview(parsed.data.url)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "This page cannot be previewed." }, { status: 400 }); }
}
