-- SOLE MARKET PH: App Store safety, blocking, support and account deletion requests.
-- Apply this migration in the linked Supabase project's SQL migration workflow.

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocker_id <> blocked_user_id),
  constraint user_blocks_unique_pair unique (blocker_id, blocked_user_id)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker_id, created_at desc);
alter table public.user_blocks enable row level security;
drop policy if exists "Users manage their own blocks" on public.user_blocks;
create policy "Users manage their own blocks" on public.user_blocks
  for all to authenticated
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id and blocker_id <> blocked_user_id);

-- Deliberately no FK to auth.users: the request record must remain available
-- to admins while an account is being deleted.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  reason text,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index if not exists one_open_deletion_request_per_user
  on public.account_deletion_requests(user_id)
  where status in ('pending','processing');
create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests(status, created_at desc);
alter table public.account_deletion_requests enable row level security;
drop policy if exists "Users can request their own account deletion" on public.account_deletion_requests;
create policy "Users can request their own account deletion"
  on public.account_deletion_requests for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "Users can view their own deletion requests" on public.account_deletion_requests;
create policy "Users can view their own deletion requests"
  on public.account_deletion_requests for select to authenticated
  using (auth.uid() = user_id or public.is_sole_market_admin());

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  email text not null check (char_length(trim(email)) between 3 and 254),
  subject text not null check (char_length(trim(subject)) between 3 and 120),
  message text not null check (char_length(trim(message)) between 10 and 3000),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_requests_status_created_idx
  on public.support_requests(status, created_at desc);
alter table public.support_requests enable row level security;
drop policy if exists "Anyone can submit a support request" on public.support_requests;
create policy "Anyone can submit a support request"
  on public.support_requests for insert to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

create or replace function public.admin_list_account_deletion_requests()
returns table(id uuid,user_id uuid,user_email text,reason text,status text,admin_notes text,created_at timestamptz,processed_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_sole_market_admin() then
    raise exception 'Not authorized';
  end if;
  return query
    select r.id,r.user_id,r.user_email,r.reason,r.status,r.admin_notes,r.created_at,r.processed_at
    from public.account_deletion_requests r
    order by case when r.status='pending' then 0 when r.status='processing' then 1 else 2 end, r.created_at asc;
end;
$$;

create or replace function public.admin_update_account_deletion_request(p_request_id uuid,p_status text,p_notes text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_sole_market_admin() then raise exception 'Not authorized'; end if;
  if p_status not in ('processing','completed','rejected') then raise exception 'Invalid request status'; end if;
  update public.account_deletion_requests
    set status=p_status, admin_notes=nullif(trim(p_notes),''), processed_at=case when p_status in ('completed','rejected') then now() else null end
    where id=p_request_id;
  if not found then raise exception 'Deletion request not found'; end if;
end;
$$;

create or replace function public.admin_list_support_requests()
returns table(id uuid,user_id uuid,name text,email text,subject text,message text,status text,admin_notes text,created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_sole_market_admin() then raise exception 'Not authorized'; end if;
  return query
    select s.id,s.user_id,s.name,s.email,s.subject,s.message,s.status,s.admin_notes,s.created_at
    from public.support_requests s
    order by case when s.status='open' then 0 when s.status='in_progress' then 1 else 2 end, s.created_at desc;
end;
$$;

create or replace function public.admin_update_support_request(p_request_id uuid,p_status text,p_notes text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_sole_market_admin() then raise exception 'Not authorized'; end if;
  if p_status not in ('in_progress','resolved','closed','open') then raise exception 'Invalid support status'; end if;
  update public.support_requests
    set status=p_status,admin_notes=nullif(trim(p_notes),''),updated_at=now()
    where id=p_request_id;
  if not found then raise exception 'Support request not found'; end if;
end;
$$;

revoke all on function public.admin_list_account_deletion_requests() from public,anon;
revoke all on function public.admin_update_account_deletion_request(uuid,text,text) from public,anon;
revoke all on function public.admin_list_support_requests() from public,anon;
revoke all on function public.admin_update_support_request(uuid,text,text) from public,anon;
grant execute on function public.admin_list_account_deletion_requests() to authenticated;
grant execute on function public.admin_update_account_deletion_request(uuid,text,text) to authenticated;
grant execute on function public.admin_list_support_requests() to authenticated;
grant execute on function public.admin_update_support_request(uuid,text,text) to authenticated;

grant insert,select on public.account_deletion_requests to authenticated;
grant insert on public.support_requests to anon,authenticated;
grant select,insert,delete on public.user_blocks to authenticated;

comment on table public.user_blocks is 'Per-user blocks; blocked sellers listings are hidden from the blocking user.';
comment on table public.account_deletion_requests is 'In-app account deletion requests; admins must delete the auth user and eligible associated data before marking completed.';
comment on table public.support_requests is 'Public support contact form submissions.';
