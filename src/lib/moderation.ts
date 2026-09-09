import "server-only";
import { env } from "@/lib/env";

const DEFAULT_BLOCKED_TERMS = ["slur_placeholder", "doxx", "kill yourself"];

export function normalizeMessage(input: string) {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s{4,}/g, "   ").trim();
}

export function moderateMessage(input: string) {
  const content = normalizeMessage(input);
  if (!env.PROFANITY_FILTER_ENABLED) return { allowed: true as const, content };
  const lowered = content.toLocaleLowerCase();
  const blocked = DEFAULT_BLOCKED_TERMS.find((term) => lowered.includes(term));
  return blocked ? { allowed: false as const, reason: "This message was blocked by the community language filter." } : { allowed: true as const, content };
}
