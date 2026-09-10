"use client";

import Image from "next/image";
import { ExternalLink, Globe2, LoaderCircle, PanelRightClose, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchResult } from "@/lib/search/types";

type Preview = { url: string; title: string; description: string; image: string | null; siteName: string | null };

export function SearchExperience() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");

  const search = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setResults(payload.results);
    } catch (reason) {
      setResults([]);
      setError(reason instanceof Error ? reason.message : "Search is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) void search(initial);
  }, [initial, search]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    router.replace(`/search?q=${encodeURIComponent(next)}`);
    void search(next);
  }

  async function showPreview(url: string) {
    setPreview(null);
    setPreviewError("Loading safe preview…");

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setPreview(payload);
      setPreviewError("");
    } catch (reason) {
      setPreviewError(reason instanceof Error ? reason.message : "Preview unavailable.");
    }
  }

  return (
    <div className={`search-layout ${preview || previewError ? "with-preview" : ""}`}>
      <section className="search-main">
        <form className="results-search" onSubmit={submit}>
          <Search size={20} />
          <input aria-label="Search the web" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the open web" />
          <button>Search</button>
        </form>
        <div className="results-meta">
          <span>{initial ? <>Results for <strong>“{initial}”</strong></> : "Search with a trusted provider"}</span>
          <span><ShieldCheck size={14} /> Original sites only</span>
        </div>
        {loading && <div className="state-card"><LoaderCircle className="spin" /> Searching the web…</div>}
        {error && <div className="state-card error-state"><Globe2 /><strong>Search needs one final connection.</strong><p>{error}</p></div>}
        {!loading && !error && initial && !results.length && <div className="state-card">No results found. Try a broader query.</div>}
        <div className="result-list">
          {results.map((result) => (
            <article className="result-card" key={result.url}>
              <div className="result-domain">
                {result.favicon && <Image src={result.favicon} alt="" width={18} height={18} unoptimized />}
                <span>{result.domain}</span>
              </div>
              <a href={result.url} target="_blank" rel="noopener noreferrer"><h2>{result.title}</h2></a>
              <p>{result.description}</p>
              <div className="result-actions">
                <a href={result.url} target="_blank" rel="noopener noreferrer">Open website <ExternalLink size={14} /></a>
                <button onClick={() => void showPreview(result.url)}>Safe preview</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {(preview || previewError) && (
        <aside className="preview-panel">
          <button className="preview-close" onClick={() => { setPreview(null); setPreviewError(""); }} aria-label="Close preview"><PanelRightClose size={18} /></button>
          {preview ? <>
            <span className="kicker">Allowlisted preview</span>
            {preview.image && <Image className="preview-image" src={preview.image} alt="" width={640} height={360} unoptimized />}
            <h2>{preview.title}</h2>
            <p>{preview.description || "No description was provided by this page."}</p>
            <small>{preview.siteName || new URL(preview.url).hostname}</small>
            <a className="primary-button" href={preview.url} target="_blank" rel="noopener noreferrer">Open original <ExternalLink size={14} /></a>
          </> : <div className="preview-message"><ShieldCheck /><p>{previewError}</p><small>Previews only work for explicitly approved public domains.</small></div>}
        </aside>
      )}
    </div>
  );
}
