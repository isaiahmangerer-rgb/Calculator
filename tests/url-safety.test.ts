import { describe, expect, it } from "vitest";
import { hostnameIsAllowed, isPrivateAddress } from "../src/lib/url-safety-core";

describe("preview domain allowlist", () => {
  const allowlist = ["example.com", "*.wikipedia.org"];
  it("accepts exact domains and explicit subdomains", () => {
    expect(hostnameIsAllowed("example.com", allowlist)).toBe(true);
    expect(hostnameIsAllowed("en.wikipedia.org", allowlist)).toBe(true);
  });
  it("rejects suffix tricks and wildcard roots", () => {
    expect(hostnameIsAllowed("example.com.evil.test", allowlist)).toBe(false);
    expect(hostnameIsAllowed("wikipedia.org", allowlist)).toBe(false);
    expect(hostnameIsAllowed("evilwikipedia.org", allowlist)).toBe(false);
  });
});

describe("private network detection", () => {
  it.each(["127.0.0.1", "10.0.0.1", "172.16.0.5", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1"])("blocks %s", (address) => expect(isPrivateAddress(address)).toBe(true));
  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])("allows public %s", (address) => expect(isPrivateAddress(address)).toBe(false));
});
