export type SearchResult = { title: string; url: string; domain: string; description: string; favicon: string | null };
export interface SearchProvider { search(query: string, signal: AbortSignal): Promise<SearchResult[]> }
