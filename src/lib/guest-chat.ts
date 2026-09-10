"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export const guestChatEnabled = process.env.NEXT_PUBLIC_GUEST_CHAT_ENABLED === "true";

type ChatIdentity = { user: User; created: boolean };

export async function getOrCreateChatIdentity(supabase: SupabaseClient): Promise<ChatIdentity> {
  const { data: existing, error: getUserError } = await supabase.auth.getUser();
  if (getUserError) throw getUserError;
  if (existing.user) return { user: existing.user, created: false };
  if (!guestChatEnabled) throw new Error("Guest chat is not enabled yet.");

  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        username: `guest_${suffix}`,
        display_name: `Guest ${suffix.slice(0, 4).toUpperCase()}`,
      },
    },
  });

  if (error || !data.user) throw error ?? new Error("A guest session could not be created.");
  return { user: data.user, created: true };
}
