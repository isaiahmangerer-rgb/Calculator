import type { SearchResult } from "./types";

export type LangSearchResponse = {
  code?: number;
  msg?: string | null;
  data?: {
    webPages?: {
      value?: Array<{
        name?: string;
        url?: string;
        snippet?: string;
        summary?: string;
      }>;
    };
  };
};

export function parseLangSearchResults(payload: LangSearchResponse): SearchResult[] {
  if (payload.code !== 200) {
    throw new Error(payload.msg || "Search provider rejected the request.");
  }

  return (payload.data?.webPages?.value ?? []).flatMap((result) => {
    if (!result.url || !result.name) return [];

    try {
      const url = new URL(result.url);
      if (url.protocol !== "https:" && url.protocol !== "http:") return [];

      return [{
        title: result.name,
        url: url.toString(),
        domain: url.hostname.replace(/^www\./, ""),
        description: result.snippet || result.summary || "",
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`,
      }];
    } catch {
      return [];
    }
  });
}
