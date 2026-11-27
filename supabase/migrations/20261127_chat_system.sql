-- SOLE MARKET PH chat foundation
-- Run in Supabase SQL Editor after reviewing. This creates group chat and
-- participant-scoped direct conversations. It does not alter existing tables.

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  room text not null default 'general' check (room in ('general','legit-check','wts-wtb')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (conversation_id,user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create or replace function public.is_chat_member(p_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $
  select exists (select 1 from public.direct_conversation_members m
    where m.conversation_id = p_conversation_id and m.user_id = auth.uid());
$;
revoke all on function public.is_chat_member(uuid) from public;
grant execute on function public.is_chat_member(uuid) to authenticated;

alter table public.community_messages enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_conversation_members enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Members can read community chat" on public.community_messages;
create policy "Members can read community chat" on public.community_messages
for select to authenticated using (true);
drop policy if exists "Members can send community chat" on public.community_messages;
create policy "Members can send community chat" on public.community_messages
for insert to authenticated with check (auth.uid() = sender_id);

drop policy if exists "Participants can read conversations" on public.direct_conversations;
create policy "Participants can read conversations" on public.direct_conversations
for select to authenticated using (
  public.is_chat_member(id)
);
drop policy if exists "Users can create conversations" on public.direct_conversations;
create policy "Users can create conversations" on public.direct_conversations
for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "Members can see conversation members" on public.direct_conversation_members;
create policy "Members can see conversation members" on public.direct_conversation_members
for select to authenticated using (
  user_id = auth.uid()
);
drop policy if exists "Conversation creator can add participants" on public.direct_conversation_members;
create policy "Conversation creator can add participants" on public.direct_conversation_members
for insert to authenticated with check (
  exists (select 1 from public.direct_conversations c
          where c.id = conversation_id and c.created_by = auth.uid())
  or user_id = auth.uid()
);

drop policy if exists "Participants can read direct messages" on public.direct_messages;
create policy "Participants can read direct messages" on public.direct_messages
for select to authenticated using (
  public.is_chat_member(conversation_id)
);
drop policy if exists "Participants can send direct messages" on public.direct_messages;
create policy "Participants can send direct messages" on public.direct_messages
for insert to authenticated with check (
  auth.uid() = sender_id and
  exists (select 1 from public.direct_conversation_members m
          where m.conversation_id = conversation_id and m.user_id = auth.uid())
);

grant select, insert on public.community_messages to authenticated;
grant select, insert on public.direct_conversations to authenticated;
grant select, insert on public.direct_conversation_members to authenticated;
grant select, insert on public.direct_messages to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.community_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
end $$;


-- Securely start or reuse a one-to-one conversation. A caller can only add
-- themselves and the explicitly supplied other user; no arbitrary member edits.
create or replace function public.start_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_me is null then
    raise exception 'You must be logged in.';
  end if;
  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'Choose another valid user.';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_other_user_id) then
    raise exception 'User not found.';
  end if;

  select mine.conversation_id into v_conversation_id
  from public.direct_conversation_members mine
  join public.direct_conversation_members theirs
    on theirs.conversation_id = mine.conversation_id
  where mine.user_id = v_me and theirs.user_id = p_other_user_id
    and (select count(*) from public.direct_conversation_members all_members
         where all_members.conversation_id = mine.conversation_id) = 2
  limit 1;

  if v_conversation_id is null then
    insert into public.direct_conversations(created_by)
    values (v_me) returning id into v_conversation_id;
    insert into public.direct_conversation_members(conversation_id,user_id)
    values (v_conversation_id,v_me),(v_conversation_id,p_other_user_id);
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.start_direct_conversation(uuid) from public;
grant execute on function public.start_direct_conversation(uuid) to authenticated;


-- Only the SECURITY DEFINER RPC may create membership rows. This prevents
-- authenticated users from adding arbitrary people to conversations.
drop policy if exists "Conversation creator can add participants" on public.direct_conversation_members;
revoke insert on public.direct_conversation_members from authenticated;
revoke insert on public.direct_conversations from authenticated;
