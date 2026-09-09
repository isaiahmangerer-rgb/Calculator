# Nexus

Nexus is a production-oriented social search website built with Next.js 16, TypeScript, Tailwind CSS, Supabase, and Vercel. It combines a calm search homepage with public chat rooms, participant-only direct messages, profiles, friends, realtime presence, moderation, and deny-by-default public webpage previews.

## What is implemented

- Supabase email/password sign-up, sign-in, sign-out, session refresh, unique usernames, profiles, and avatar uploads.
- Default General, Gaming, Technology, and Random rooms with realtime messages, edits, soft deletion, replies, reactions, typing broadcasts, read state, and unread counts.
- Private two-person conversations with realtime history, last-message previews, typing-ready channels, read state, and database-enforced participant access.
- Friend requests, accept/decline, removal, online presence, user blocking, local muting, and private reports.
- Admin-only reports, account mutes/suspensions, message removal, room management, statistics, and an audit log. Access is checked in the route handler and Postgres.
- Provider-based web search using the official LangSearch Web Search API. Results open the original website.
- Allowlisted metadata previews with protocol, port, DNS/IP, redirect, timeout, content-type, and response-size protections. Nexus is not a web proxy.
- Dark and light themes, responsive sidebars/bottom navigation, loading/empty/error states, keyboard-friendly native controls, and social metadata.

## Local development

Requirements: Node.js 20+, npm, and a Supabase project.

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Open the Supabase SQL editor and run `supabase/migrations/202609080001_nexus_schema.sql` once.
3. In Supabase Authentication URL Configuration, set the Site URL to your local or production origin and add `/auth/callback` as an allowed redirect path.
4. Run `npm install`, then `npm run dev`.
5. Open `http://localhost:3000`.

Use `npm run check` for linting, TypeScript, unit/security contract tests, and the production build.

## Environment variables

| Name | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe | Supabase anonymous key; RLS is still required |
| `NEXT_PUBLIC_SITE_URL` | Browser-safe | Canonical deployed origin |
| `LANGSEARCH_API_KEY` | Server secret | Free LangSearch Web Search API credential |
| `SEARCH_API_PROVIDER` | Server | Currently `langsearch`; provider interface remains replaceable |
| `ALLOWED_PREVIEW_DOMAINS` | Server | Comma-separated exact domains or `*.subdomain` rules |
| `PREVIEW_TIMEOUT_MS` | Server | Metadata fetch timeout, capped at 10 seconds |
| `PREVIEW_MAX_BYTES` | Server | Maximum metadata response size, capped at 2 MB |
| `PROFANITY_FILTER_ENABLED` | Server | Enables the basic configurable language filter |
| `MESSAGE_RATE_LIMIT_PER_MINUTE` | Server | Application message throttle; database also caps writes |

Never commit `.env.local`, service-role keys, search keys, or Vercel tokens. The browser does not need a Supabase service-role key.

## Supabase setup

Apply the migration through the Supabase SQL editor or CLI. It creates the schema, indexes, triggers, helper functions, default rooms, Storage avatar bucket, Realtime publication entries, and RLS policies.

To appoint the first administrator, replace the UUID and run this once from the SQL editor (service-role context):

```sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict do nothing;
```

Do not expose an admin-creation endpoint. Subsequent role changes can be performed in a trusted database/admin context.

## Deployment to Vercel

Import the GitHub repository into Vercel as a Next.js project. Add every variable from `.env.example` to the correct Vercel environments, using Secret storage for `LANGSEARCH_API_KEY`. Create a free key from the [LangSearch API dashboard](https://langsearch.com/api-keys); LangSearch currently advertises free access without a credit card. Apply the Supabase migration before inviting users. Set `NEXT_PUBLIC_SITE_URL` to the production URL and add `https://YOUR_DOMAIN/auth/callback` to Supabase’s redirect allowlist.

The default Vercel build command is `npm run build`. No desktop runtime, browser extension, unrestricted proxy, or filtering-bypass behavior is included.

## Architecture

- `src/app`: App Router pages and server route handlers.
- `src/components`: responsive product surfaces and realtime clients.
- `src/lib/supabase`: cookie-safe browser/server Supabase clients.
- `src/lib/search`: replaceable search-provider contract and LangSearch implementation.
- `src/lib/url-safety.ts`: pinned-IP, redirect-aware preview fetcher.
- `supabase/migrations`: canonical Postgres schema, functions, triggers, and RLS.
- `tests`: URL-safety, validation, and database security contract tests.

See `SECURITY.md` for the threat model and preview protections.
