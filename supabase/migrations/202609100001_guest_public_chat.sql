-- Allow Supabase anonymous Auth users to participate in public rooms while
-- keeping account features restricted to permanent identities.

create or replace function public.is_permanent_user()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;

grant execute on function public.is_permanent_user() to authenticated;

create policy "permanent users update profiles"
on public.profiles as restrictive for update to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users access roles"
on public.user_roles as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users manage friend requests"
on public.friend_requests as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users manage friendships"
on public.friendships as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users manage blocks"
on public.blocks as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users access direct conversations"
on public.direct_conversations as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users access direct memberships"
on public.direct_conversation_members as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users access direct messages"
on public.direct_messages as restrictive for all to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users upload avatars"
on storage.objects as restrictive for insert to authenticated
with check (public.is_permanent_user());

create policy "permanent users update avatars"
on storage.objects as restrictive for update to authenticated
using (public.is_permanent_user())
with check (public.is_permanent_user());

create policy "permanent users delete avatars"
on storage.objects as restrictive for delete to authenticated
using (public.is_permanent_user());

create or replace function public.get_or_create_direct_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare viewer uuid := auth.uid(); result uuid; key text;
begin
  if not public.is_permanent_user() then raise exception 'A permanent account is required'; end if;
  if viewer is null or viewer = other_user then raise exception 'Invalid participant'; end if;
  if not exists(select 1 from public.profiles where id=other_user and moderation_status <> 'suspended') then raise exception 'Member unavailable'; end if;
  if public.is_blocked_between(viewer, other_user) then raise exception 'Conversation blocked'; end if;
  key := least(viewer::text,other_user::text)||':'||greatest(viewer::text,other_user::text);
  insert into public.direct_conversations(pair_key,created_by) values(key,viewer) on conflict(pair_key) do update set updated_at=public.direct_conversations.updated_at returning id into result;
  insert into public.direct_conversation_members(conversation_id,user_id) values(result,viewer),(result,other_user) on conflict do nothing;
  return result;
end $$;

-- This is intentionally not scheduled automatically. Operators can invoke it
-- from a trusted database context after choosing an appropriate retention period.
create or replace function public.cleanup_guest_accounts(retention interval default interval '30 days')
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare removed bigint;
begin
  delete from auth.users where is_anonymous is true and created_at < now() - retention;
  get diagnostics removed = row_count;
  return removed;
end $$;

revoke all on function public.cleanup_guest_accounts(interval) from public, anon, authenticated;
