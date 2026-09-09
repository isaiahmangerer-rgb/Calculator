# Nexus security model

Nexus treats the browser as untrusted. Authentication comes from Supabase Auth; authorization is re-checked in route handlers and enforced again by Postgres Row Level Security. Direct conversations and messages can only be read by conversation members. A block relationship prevents new direct messages at the database layer.

The preview endpoint is metadata-only and deny-by-default. It accepts HTTP/HTTPS, exact allowlisted domains or explicit wildcard subdomains, default ports only, no credentials, a maximum of three redirects, a five-second timeout, and a bounded response body. Every redirect is revalidated. DNS answers are rejected if any resolve to localhost, private, link-local, documentation, reserved, multicast, or cloud-metadata-capable ranges; outbound requests are pinned to the validated public address.

Message writes are validated with Zod, normalized as plain text, filtered through a configurable basic language policy, limited in both the application and database, and rejected for muted or suspended accounts. Nexus never renders user messages as HTML.

Report vulnerabilities privately through the repository security contact. Do not include secrets, access tokens, private messages, or personal data in a public issue.
