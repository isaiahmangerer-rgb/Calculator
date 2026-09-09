-- Nexus production schema for Supabase/Postgres.
create extension if not exists pgcrypto;

do $$ begin create type public.presence_status as enum ('online','away','offline'); exception when duplicate_object then null; end $$;
do $$ begin create type public.moderation_status as enum ('active','muted','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.friend_request_status as enum ('pending','accepted','declined'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open','reviewing','resolved','dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_role as enum ('admin','moderator'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  bio text check (bio is null or char_length(bio) <= 240),
  status public.presence_status not null default 'offline',
  moderation_status public.moderation_status not null default 'active',
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_status_idx on public.profiles(status) where status <> 'offline';
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index if not exists friend_requests_pending_pair_idx on public.friend_requests (least(requester_id, addressee_id), greatest(requester_id, addressee_id)) where status = 'pending';
create index if not exists friend_requests_addressee_idx on public.friend_requests(addressee_id, status, created_at desc);

create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a::text < user_b::text)
);
create index if not exists friendships_user_b_idx on public.friendships(user_b);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

create table if not exists public.user_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 240),
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members(user_id);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 0 and 2000),
  reply_to_id uuid references public.room_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists room_messages_room_created_idx on public.room_messages(room_id, created_at desc) where deleted_at is null;
create index if not exists room_messages_sender_idx on public.room_messages(sender_id, created_at desc);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists direct_members_user_idx on public.direct_conversation_members(user_id, conversation_id);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 0 and 2000),
  reply_to_id uuid references public.direct_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists direct_messages_conversation_created_idx on public.direct_messages(conversation_id, created_at desc) where deleted_at is null;
create index if not exists direct_messages_sender_idx on public.direct_messages(sender_id, created_at desc);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  room_message_id uuid references public.room_messages(id) on delete cascade,
  direct_message_id uuid references public.direct_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  check ((room_message_id is not null)::int + (direct_message_id is not null)::int = 1)
);
create unique index if not exists room_reaction_unique_idx on public.message_reactions(room_message_id, user_id, emoji) where room_message_id is not null;
create unique index if not exists direct_reaction_unique_idx on public.message_reactions(direct_message_id, user_id, emoji) where direct_message_id is not null;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  room_message_id uuid references public.room_messages(id) on delete set null,
  direct_message_id uuid references public.direct_messages(id) on delete set null,
  reason text not null check (char_length(reason) between 10 and 1000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);
create index if not exists reports_status_created_idx on public.reports(status, created_at desc);
create index if not exists reports_reported_user_idx on public.reports(reported_user_id);

create table if not exists public.moderation_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.message_rate_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bucket_started_at timestamptz not null default date_trunc('minute', now()),
  message_count integer not null default 0
);

create or replace function public.is_admin(candidate uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = candidate and role = 'admin');
$$;
create or replace function public.is_conversation_member(conversation uuid, candidate uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.direct_conversation_members where conversation_id = conversation and user_id = candidate);
$$;
create or replace function public.is_room_member(room uuid, candidate uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.room_members where room_id = room and user_id = candidate);
$$;
create or replace function public.is_blocked_between(first_user uuid, second_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.blocks where (blocker_id = first_user and blocked_id = second_user) or (blocker_id = second_user and blocked_id = first_user));
$$;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base_username text; final_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, 'member'), '@', 1)), '[^a-z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then base_username := 'member'; end if;
  base_username := left(base_username, 24); final_username := base_username;
  if exists(select 1 from public.profiles where username = final_username) then final_username := left(base_username, 17) || '_' || left(new.id::text, 6); end if;
  insert into public.profiles(id, username, display_name) values (new.id, final_username, left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), final_username), 50));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.accept_friend_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships(user_a, user_b) values (least(new.requester_id, new.addressee_id), greatest(new.requester_id, new.addressee_id)) on conflict do nothing;
  end if; return new;
end $$;
drop trigger if exists friend_request_accepted on public.friend_requests;
create trigger friend_request_accepted after update on public.friend_requests for each row execute function public.accept_friend_request();

create or replace function public.handle_block() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships where (user_a = least(new.blocker_id,new.blocked_id) and user_b = greatest(new.blocker_id,new.blocked_id));
  update public.friend_requests set status='declined', responded_at=now() where status='pending' and ((requester_id=new.blocker_id and addressee_id=new.blocked_id) or (requester_id=new.blocked_id and addressee_id=new.blocker_id));
  return new;
end $$;
drop trigger if exists block_cleanup on public.blocks;
create trigger block_cleanup after insert on public.blocks for each row execute function public.handle_block();

create or replace function public.validate_message_reply() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'room_messages' and new.reply_to_id is not null and not exists(select 1 from public.room_messages where id=new.reply_to_id and room_id=new.room_id) then raise exception 'Reply must belong to the same room'; end if;
  if tg_table_name = 'direct_messages' and new.reply_to_id is not null and not exists(select 1 from public.direct_messages where id=new.reply_to_id and conversation_id=new.conversation_id) then raise exception 'Reply must belong to the same conversation'; end if;
  return new;
end $$;
drop trigger if exists room_reply_scope on public.room_messages; create trigger room_reply_scope before insert or update on public.room_messages for each row execute function public.validate_message_reply();
drop trigger if exists direct_reply_scope on public.direct_messages; create trigger direct_reply_scope before insert or update on public.direct_messages for each row execute function public.validate_message_reply();

create or replace function public.enforce_message_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare current_count integer;
begin
  insert into public.message_rate_limits(user_id,bucket_started_at,message_count) values(new.sender_id,date_trunc('minute',now()),1)
  on conflict(user_id) do update set bucket_started_at=case when message_rate_limits.bucket_started_at < date_trunc('minute',now()) then date_trunc('minute',now()) else message_rate_limits.bucket_started_at end, message_count=case when message_rate_limits.bucket_started_at < date_trunc('minute',now()) then 1 else message_rate_limits.message_count+1 end returning message_count into current_count;
  if current_count > 30 then raise exception 'Message rate limit exceeded'; end if; return new;
end $$;
drop trigger if exists room_message_rate_limit on public.room_messages; create trigger room_message_rate_limit before insert on public.room_messages for each row execute function public.enforce_message_rate_limit();
drop trigger if exists direct_message_rate_limit on public.direct_messages; create trigger direct_message_rate_limit before insert on public.direct_messages for each row execute function public.enforce_message_rate_limit();

create or replace function public.get_or_create_direct_conversation(other_user uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare viewer uuid := auth.uid(); result uuid; key text;
begin
  if viewer is null or viewer = other_user then raise exception 'Invalid participant'; end if;
  if not exists(select 1 from public.profiles where id=other_user and moderation_status <> 'suspended') then raise exception 'Member unavailable'; end if;
  if public.is_blocked_between(viewer, other_user) then raise exception 'Conversation blocked'; end if;
  key := least(viewer::text,other_user::text)||':'||greatest(viewer::text,other_user::text);
  insert into public.direct_conversations(pair_key,created_by) values(key,viewer) on conflict(pair_key) do update set updated_at=public.direct_conversations.updated_at returning id into result;
  insert into public.direct_conversation_members(conversation_id,user_id) values(result,viewer),(result,other_user) on conflict do nothing;
  return result;
end $$;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create or replace function public.get_friends() returns table(id uuid,username text,display_name text,avatar_url text,status public.presence_status) language sql stable security definer set search_path = public as $$
  select p.id,p.username,p.display_name,p.avatar_url,p.status from public.friendships f join public.profiles p on p.id = case when f.user_a=auth.uid() then f.user_b else f.user_a end where auth.uid() in (f.user_a,f.user_b) and not public.is_blocked_between(auth.uid(),p.id) order by p.display_name;
$$;
grant execute on function public.get_friends() to authenticated;

create or replace function public.get_room_summaries() returns table(id uuid,slug text,name text,description text,is_active boolean,unread_count bigint) language sql stable security definer set search_path = public as $$
  select r.id,r.slug,r.name,r.description,r.is_active,(select count(*) from public.room_messages m where m.room_id=r.id and m.deleted_at is null and m.created_at>coalesce(member.last_read_at,'epoch'::timestamptz))
  from public.rooms r left join public.room_members member on member.room_id=r.id and member.user_id=auth.uid() where r.is_active order by r.name;
$$;
grant execute on function public.get_room_summaries() to authenticated;

create or replace function public.get_direct_conversation_summaries() returns table(conversation_id uuid,other_user_id uuid,username text,display_name text,avatar_url text,last_message text,last_message_at timestamptz,unread_count bigint) language sql stable security definer set search_path = public as $$
  select c.id,p.id,p.username,p.display_name,p.avatar_url,l.content,l.created_at,(select count(*) from public.direct_messages m where m.conversation_id=c.id and m.sender_id<>auth.uid() and m.created_at>me.last_read_at and m.deleted_at is null)
  from public.direct_conversations c join public.direct_conversation_members me on me.conversation_id=c.id and me.user_id=auth.uid() join public.direct_conversation_members them on them.conversation_id=c.id and them.user_id<>auth.uid() join public.profiles p on p.id=them.user_id
  left join lateral (select content,created_at from public.direct_messages where conversation_id=c.id and deleted_at is null order by created_at desc limit 1) l on true
  where not public.is_blocked_between(auth.uid(),p.id) order by l.created_at desc nulls last;
$$;
grant execute on function public.get_direct_conversation_summaries() to authenticated;

create or replace function public.admin_set_moderation(target_user uuid, new_status public.moderation_status default null, new_muted_until timestamptz default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Administrator access required'; end if;
  update public.profiles set moderation_status=coalesce(new_status,moderation_status), muted_until=coalesce(new_muted_until,muted_until), updated_at=now() where id=target_user;
end $$;
grant execute on function public.admin_set_moderation(uuid,public.moderation_status,timestamptz) to authenticated;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger friend_requests_updated_at before update on public.friend_requests for each row execute function public.set_updated_at();
create trigger rooms_updated_at before update on public.rooms for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();

alter table public.profiles enable row level security; alter table public.user_roles enable row level security; alter table public.friend_requests enable row level security; alter table public.friendships enable row level security; alter table public.blocks enable row level security; alter table public.user_mutes enable row level security; alter table public.rooms enable row level security; alter table public.room_members enable row level security; alter table public.room_messages enable row level security; alter table public.direct_conversations enable row level security; alter table public.direct_conversation_members enable row level security; alter table public.direct_messages enable row level security; alter table public.message_reactions enable row level security; alter table public.reports enable row level security; alter table public.moderation_audit_log enable row level security; alter table public.message_rate_limits enable row level security;

create policy "profiles readable by members" on public.profiles for select to authenticated using (moderation_status <> 'suspended' or id=auth.uid() or public.is_admin());
create policy "users edit safe profile fields" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "roles visible to owner or admin" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "roles managed by admins" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "requests visible to participants" on public.friend_requests for select to authenticated using (auth.uid() in (requester_id,addressee_id));
create policy "members send requests" on public.friend_requests for insert to authenticated with check (requester_id=auth.uid() and status='pending' and not public.is_blocked_between(requester_id,addressee_id));
create policy "addressee responds" on public.friend_requests for update to authenticated using (addressee_id=auth.uid() and status='pending') with check (addressee_id=auth.uid() and status in ('accepted','declined'));
create policy "friendships visible to members" on public.friendships for select to authenticated using (auth.uid() in (user_a,user_b));
create policy "friends remove themselves" on public.friendships for delete to authenticated using (auth.uid() in (user_a,user_b));
create policy "blocker manages blocks" on public.blocks for all to authenticated using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());
create policy "muter manages mutes" on public.user_mutes for all to authenticated using (muter_id=auth.uid()) with check (muter_id=auth.uid());
create policy "active rooms readable" on public.rooms for select to authenticated using (is_active or public.is_admin());
create policy "rooms managed by admins" on public.rooms for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "memberships visible in joined rooms" on public.room_members for select to authenticated using (public.is_room_member(room_id));
create policy "members join self" on public.room_members for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.rooms where id=room_id and is_active));
create policy "members update own read state" on public.room_members for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "members leave rooms" on public.room_members for delete to authenticated using (user_id=auth.uid());
create policy "room messages readable" on public.room_messages for select to authenticated using (public.is_admin() or (deleted_at is null and exists(select 1 from public.rooms where id=room_id and is_active) and not exists(select 1 from public.user_mutes where muter_id=auth.uid() and muted_id=sender_id)));
create policy "active users send room messages" on public.room_messages for insert to authenticated with check (sender_id=auth.uid() and deleted_at is null and exists(select 1 from public.profiles where id=auth.uid() and moderation_status<>'suspended' and (muted_until is null or muted_until<=now())) and exists(select 1 from public.rooms where id=room_id and is_active));
create policy "owners or admins update room messages" on public.room_messages for update to authenticated using (sender_id=auth.uid() or public.is_admin()) with check (sender_id=auth.uid() or public.is_admin());
create policy "conversation metadata for members" on public.direct_conversations for select to authenticated using (public.is_conversation_member(id));
create policy "conversation members see membership" on public.direct_conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "members update own read state" on public.direct_conversation_members for update to authenticated using (user_id=auth.uid() and public.is_conversation_member(conversation_id)) with check (user_id=auth.uid());
create policy "direct messages only for members" on public.direct_messages for select to authenticated using (public.is_admin() or (deleted_at is null and public.is_conversation_member(conversation_id)));
create policy "members send unblocked direct messages" on public.direct_messages for insert to authenticated with check (sender_id=auth.uid() and public.is_conversation_member(conversation_id) and not exists(select 1 from public.direct_conversation_members other where other.conversation_id=direct_messages.conversation_id and other.user_id<>auth.uid() and public.is_blocked_between(auth.uid(),other.user_id)) and exists(select 1 from public.profiles where id=auth.uid() and moderation_status<>'suspended' and (muted_until is null or muted_until<=now())));
create policy "owners or admins update direct messages" on public.direct_messages for update to authenticated using (sender_id=auth.uid() or public.is_admin()) with check (sender_id=auth.uid() or public.is_admin());
create policy "reactions readable with message" on public.message_reactions for select to authenticated using ((room_message_id is not null and exists(select 1 from public.room_messages where id=room_message_id)) or (direct_message_id is not null and exists(select 1 from public.direct_messages where id=direct_message_id)));
create policy "members react to visible messages" on public.message_reactions for insert to authenticated with check (user_id=auth.uid() and ((room_message_id is not null and exists(select 1 from public.room_messages where id=room_message_id)) or (direct_message_id is not null and exists(select 1 from public.direct_messages where id=direct_message_id))));
create policy "users remove reactions" on public.message_reactions for delete to authenticated using (user_id=auth.uid());
create policy "reporters and admins read reports" on public.reports for select to authenticated using (reporter_id=auth.uid() or public.is_admin());
create policy "members create reports" on public.reports for insert to authenticated with check (reporter_id=auth.uid());
create policy "admins review reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit log" on public.moderation_audit_log for select to authenticated using (public.is_admin());
create policy "admins write audit log" on public.moderation_audit_log for insert to authenticated with check (public.is_admin() and admin_id=auth.uid());

revoke update on public.profiles from authenticated;
grant update (username,display_name,avatar_url,bio,status,updated_at) on public.profiles to authenticated;

insert into public.rooms(slug,name,description) values ('general','General','The community commons for everyday conversation.'),('gaming','Gaming','Games, worlds, strategies, and people to play with.'),('technology','Technology','Builds, breakthroughs, questions, and practical help.'),('random','Random','The delightfully uncategorized corner of Nexus.') on conflict(slug) do update set name=excluded.name,description=excluded.description;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
create policy "public avatar reads" on storage.objects for select using (bucket_id='avatars');
create policy "users upload own avatars" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users update own avatars" on storage.objects for update to authenticated using (bucket_id='avatars' and owner_id=auth.uid()::text) with check (bucket_id='avatars' and owner_id=auth.uid()::text);
create policy "users delete own avatars" on storage.objects for delete to authenticated using (bucket_id='avatars' and owner_id=auth.uid()::text);

do $$ begin
  alter publication supabase_realtime add table public.room_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; end $$;
