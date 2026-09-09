import "server-only";
import type { SearchProvider, SearchResult } from "./types";

type BraveResponse = { web?: { results?: Array<{ title?: string; url?: string; description?: string; profile?: { long_name?: string } }> } };

export class BraveSearchProvider implements SearchProvider {
  constructor(private readonly apiKey: string) {}
  async search(query: string, signal: AbortSignal): Promise<SearchResult[]> {
    const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
    endpoint.searchParams.set("q", query); endpoint.searchParams.set("count", "10"); endpoint.searchParams.set("safesearch", "moderate");
    const response = await fetch(endpoint, { signal, headers: { Accept: "application/json", "X-Subscription-Token": this.apiKey }, cache: "no-store" });
    if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
    const payload = await response.json() as BraveResponse;
    return (payload.web?.results ?? []).flatMap((result) => {
      if (!result.url || !result.title) return [];
      try {
        const url = new URL(result.url);
        return [{ title: result.title, url: url.toString(), domain: result.profile?.long_name || url.hostname.replace(/^www\./, ""), description: result.description ?? "", favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64` }];
      } catch { return []; }
    });
  }
}
