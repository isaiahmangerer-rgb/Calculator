import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  LANGSEARCH_API_KEY: z.string().min(10).optional(),
  SEARCH_API_PROVIDER: z.enum(["langsearch"]).default("langsearch"),
  ALLOWED_PREVIEW_DOMAINS: z.string().default(""),
  PREVIEW_TIMEOUT_MS: z.coerce.number().int().min(1000).max(10000).default(5000),
  PREVIEW_MAX_BYTES: z.coerce.number().int().min(1024).max(2_000_000).default(750_000),
  PROFANITY_FILTER_ENABLED: z.enum(["true", "false"]).default("true"),
  MESSAGE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(2).max(120).default(24),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = serverSchema.parse(process.env);
export const isSupabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
