import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const sql = readFileSync(resolve("supabase/migrations/202609080001_nexus_schema.sql"), "utf8");
describe("database security contract", () => {
  it("enables RLS on direct messaging tables", () => { expect(sql).toContain("alter table public.direct_messages enable row level security"); expect(sql).toContain("direct messages only for members"); });
  it("blocks messages across a block relationship", () => { expect(sql).toContain("members send unblocked direct messages"); expect(sql).toContain("public.is_blocked_between"); });
  it("authorizes administrative operations through a server-verifiable role", () => { expect(sql).toContain("public.is_admin"); expect(sql).toContain("admins review reports"); });
});
