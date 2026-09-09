import { NextRequest, NextResponse } from "next/server";
import { searchQuerySchema } from "@/lib/schemas";
import { getSearchProvider } from "@/lib/search";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const parsed = searchQuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "Enter a search between 1 and 200 characters." }, { status: 400 });
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const limit = rateLimit(`search:${key}`, 30);
  if (!limit.allowed) return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const results = await getSearchProvider().search(parsed.data, controller.signal);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: message.includes("not configured") ? 503 : 502 });
  } finally { clearTimeout(timeout); }
}
