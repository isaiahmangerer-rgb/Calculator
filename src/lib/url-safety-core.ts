import { isIP } from "node:net";

export function hostnameIsAllowed(hostname: string, allowlist: string[]) {
  const value = hostname.toLowerCase().replace(/\.$/, "");
  return allowlist.some((entry) => {
    const normalized = entry.toLowerCase().replace(/\.$/, "");
    if (normalized.startsWith("*.")) return value.endsWith(normalized.slice(1)) && value !== normalized.slice(2);
    return value === normalized;
  });
}

function privateV4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) || (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) || a >= 224;
}

export function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (isIP(normalized) === 4) return privateV4(normalized);
  if (isIP(normalized) !== 6) return true;
  const mapped = normalized.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized.startsWith("ff") || normalized.startsWith("2001:db8:") || normalized.startsWith("2001:db8::");
}
