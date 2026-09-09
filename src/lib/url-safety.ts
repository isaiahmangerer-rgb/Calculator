import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { env } from "@/lib/env";
import { hostnameIsAllowed, isPrivateAddress } from "@/lib/url-safety-core";

export { hostnameIsAllowed, isPrivateAddress } from "@/lib/url-safety-core";

const MAX_REDIRECTS = 3;
type ResolvedAddress = { address: string; family: 4 | 6 };
export type PagePreview = { url: string; title: string; description: string; image: string | null; siteName: string | null };

export function configuredPreviewDomains() {
  return env.ALLOWED_PREVIEW_DOMAINS.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

async function validateAndResolve(input: string): Promise<{ url: URL; address: ResolvedAddress }> {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  if (!hostnameIsAllowed(url.hostname, configuredPreviewDomains())) throw new Error("This domain is not on the preview allowlist.");
  const allowedPort = !url.port || (url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443");
  if (!allowedPort) throw new Error("Custom ports are not supported.");
  if (isIP(url.hostname)) throw new Error("IP-address URLs are not supported.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) throw new Error("The destination does not resolve to a public address.");
  const selected = addresses[0];
  return { url, address: { address: selected.address, family: selected.family as 4 | 6 } };
}

function getPage(url: URL, address: ResolvedAddress, signal: AbortSignal) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)({
      protocol: url.protocol,
      hostname: address.address,
      family: address.family,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: "GET",
      servername: url.hostname,
      headers: { Host: url.host, Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity", "User-Agent": "NexusPreview/1.0 (+metadata-only)" },
      timeout: env.PREVIEW_TIMEOUT_MS,
    }, (response) => {
      const length = Number(response.headers["content-length"] ?? 0);
      if (length > env.PREVIEW_MAX_BYTES) { response.destroy(); reject(new Error("The response is too large to preview.")); return; }
      const chunks: Buffer[] = []; let size = 0;
      response.on("data", (chunk: Buffer) => { size += chunk.length; if (size > env.PREVIEW_MAX_BYTES) response.destroy(new Error("The response is too large to preview.")); else chunks.push(chunk); });
      response.on("end", () => resolve({ status: response.statusCode ?? 500, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    const abort = () => request.destroy(new Error("Preview request aborted."));
    signal.addEventListener("abort", abort, { once: true });
    request.on("close", () => signal.removeEventListener("abort", abort));
    request.on("timeout", () => request.destroy(new Error("Preview request timed out.")));
    request.on("error", reject); request.end();
  });
}

function entityDecode(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim();
}
function meta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const a = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"));
    const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"));
    if (a?.[1] || b?.[1]) return entityDecode((a?.[1] || b?.[1])!);
  }
  return null;
}

export async function fetchPagePreview(input: string, redirectCount = 0): Promise<PagePreview> {
  if (redirectCount > MAX_REDIRECTS) throw new Error("Too many redirects.");
  const { url, address } = await validateAndResolve(input);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), env.PREVIEW_TIMEOUT_MS);
  try {
    const response = await getPage(url, address, controller.signal);
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      const location = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
      return fetchPagePreview(new URL(location, url).toString(), redirectCount + 1);
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`Preview destination returned ${response.status}.`);
    const type = String(response.headers["content-type"] ?? "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("Only HTML pages can be previewed.");
    const html = response.body.toString("utf8");
    const rawTitle = meta(html, ["og:title", "twitter:title"]) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname;
    const description = meta(html, ["og:description", "twitter:description", "description"]) || "";
    const image = meta(html, ["og:image", "twitter:image"]);
    return { url: url.toString(), title: entityDecode(rawTitle).slice(0, 200), description: description.slice(0, 500), image: image ? new URL(image, url).toString() : null, siteName: meta(html, ["og:site_name"]) };
  } finally { clearTimeout(timeout); }
}
