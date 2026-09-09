import { describe, expect, it } from "vitest";
import { parseLangSearchResults } from "../src/lib/search/langsearch-response";

describe("LangSearch response mapping", () => {
  it("maps valid web results into the provider contract", () => {
    expect(parseLangSearchResults({
      code: 200,
      data: { webPages: { value: [{ name: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/", snippet: "Resources for developers." }] } },
    })).toEqual([expect.objectContaining({
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org/en-US/",
      domain: "developer.mozilla.org",
      description: "Resources for developers.",
    })]);
  });

  it("drops malformed and unsupported result URLs", () => {
    expect(parseLangSearchResults({
      code: 200,
      data: { webPages: { value: [
        { name: "Unsafe", url: "javascript:alert(1)", snippet: "" },
        { name: "Malformed", url: "not a URL", snippet: "" },
        { url: "https://example.com", snippet: "Missing title" },
      ] } },
    })).toEqual([]);
  });

  it("rejects provider-level errors even when HTTP succeeded", () => {
    expect(() => parseLangSearchResults({ code: 429, msg: "Rate limit reached" })).toThrow("Rate limit reached");
  });
});
