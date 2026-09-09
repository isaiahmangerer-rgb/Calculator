import "server-only";
import { env } from "@/lib/env";
import { BraveSearchProvider } from "./brave";
import type { SearchProvider } from "./types";

export function getSearchProvider(): SearchProvider {
  if (env.SEARCH_API_PROVIDER === "brave" && env.BRAVE_SEARCH_API_KEY) return new BraveSearchProvider(env.BRAVE_SEARCH_API_KEY);
  throw new Error("Search is not configured. Add BRAVE_SEARCH_API_KEY to enable live web results.");
}
