import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().min(3).max(24).regex(/^[a-z0-9_]+$/, "Use only letters, numbers, and underscores");
export const displayNameSchema = z.string().trim().min(1).max(50);
export const bioSchema = z.string().trim().max(240);
export const uuidSchema = z.string().uuid();
export const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  replyToId: z.string().uuid().nullable().optional(),
});
export const roomMessageSchema = messageSchema.extend({ roomId: uuidSchema });
export const directMessageSchema = messageSchema.extend({ conversationId: uuidSchema });
export const reactionSchema = z.object({ messageId: uuidSchema, messageType: z.enum(["room", "direct"]), emoji: z.string().trim().min(1).max(16) });
export const profileUpdateSchema = z.object({ username: usernameSchema, displayName: displayNameSchema, bio: bioSchema, avatarUrl: z.string().url().max(500).refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Avatar URL must use HTTP or HTTPS").or(z.literal("")) });
export const reportSchema = z.object({ reportedUserId: uuidSchema, messageId: uuidSchema.nullable().optional(), messageType: z.enum(["room", "direct"]).nullable().optional(), reason: z.string().trim().min(10).max(1000) });
export const searchQuerySchema = z.string().trim().min(1).max(200);
export const previewRequestSchema = z.object({ url: z.string().url().max(2048) });
