import "server-only";
import { env } from "@/lib/env";
import { LangSearchProvider } from "./langsearch";
import type { SearchProvider } from "./types";

export function getSearchProvider(): SearchProvider {
  if (env.SEARCH_API_PROVIDER === "langsearch" && env.LANGSEARCH_API_KEY) return new LangSearchProvider(env.LANGSEARCH_API_KEY);
  throw new Error("Search is not configured. Add LANGSEARCH_API_KEY to enable live web results.");
}
