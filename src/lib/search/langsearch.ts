import "server-only";
import { parseLangSearchResults, type LangSearchResponse } from "./langsearch-response";
import type { SearchProvider, SearchResult } from "./types";

export class LangSearchProvider implements SearchProvider {
  constructor(private readonly apiKey: string) {}

  async search(query: string, signal: AbortSignal): Promise<SearchResult[]> {
    const response = await fetch("https://api.langsearch.com/v1/web-search", {
      method: "POST",
      signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, freshness: "noLimit", summary: false, count: 10 }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Search provider returned ${response.status}.`);
    return parseLangSearchResults(await response.json() as LangSearchResponse);
  }
}
