import { describe, expect, it } from "vitest";
import { messageSchema, profileUpdateSchema, usernameSchema } from "../src/lib/schemas";
describe("input validation", () => {
  it("normalizes safe usernames and rejects unsafe ones", () => { expect(usernameSchema.parse(" Nexus_User ")).toBe("nexus_user"); expect(usernameSchema.safeParse("../admin").success).toBe(false); });
  it("enforces message length", () => { expect(messageSchema.safeParse({ content: "hello" }).success).toBe(true); expect(messageSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false); });
  it("rejects non-URL avatars", () => { expect(profileUpdateSchema.safeParse({ username: "member", displayName: "Member", bio: "", avatarUrl: "javascript:alert(1)" }).success).toBe(false); });
});
