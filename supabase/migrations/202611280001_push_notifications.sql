-- SOLE MARKET PH: announcements and web push subscriptions.
-- Run this migration once in Supabase SQL Editor.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 240),
  url text not null default '/announcements',
  published boolean not null default true,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Public can read published announcements" on public.announcements;
create policy "Public can read published announcements"
on public.announcements for select to anon, authenticated
using (published = true);

drop policy if exists "Admins can read all announcements" on public.announcements;
create policy "Admins can read all announcements"
on public.announcements for select to authenticated
using (public.is_sole_market_admin());

drop policy if exists "Admins can update announcement delivery counts" on public.announcements;
create policy "Admins can update announcement delivery counts"
on public.announcements for update to authenticated
using (public.is_sole_market_admin())
with check (public.is_sole_market_admin());

grant select on public.announcements to anon, authenticated;
grant update (sent_count, failed_count) on public.announcements to authenticated;

create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if p_endpoint is null or left(p_endpoint, 8) <> 'https://' or length(p_endpoint) > 2048
     or p_p256dh is null or length(p_p256dh) > 200
     or p_auth is null or length(p_auth) > 200 then
    raise exception 'Invalid push subscription.';
  end if;
  insert into public.push_subscriptions(endpoint,p256dh,auth,user_agent)
  values (p_endpoint,p_p256dh,p_auth,left(p_user_agent,500))
  on conflict (endpoint) do update
    set p256dh=excluded.p256dh, auth=excluded.auth,
        user_agent=excluded.user_agent, updated_at=now()
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint;
  return found;
end;
$$;

create or replace function public.admin_list_push_subscriptions()
returns table(id uuid, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_sole_market_admin() then raise exception 'Admin access required.'; end if;
  return query select s.id,s.endpoint,s.p256dh,s.auth from public.push_subscriptions s;
end;
$$;

create or replace function public.admin_remove_push_subscription(p_endpoint text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_sole_market_admin() then raise exception 'Admin access required.'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  return found;
end;
$$;

create or replace function public.admin_create_announcement(
  p_title text, p_body text, p_url text default '/announcements'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_sole_market_admin() then raise exception 'Admin access required.'; end if;
  if length(trim(p_title)) not between 1 and 80 or length(trim(p_body)) not between 1 and 240 then
    raise exception 'Title or message length is invalid.';
  end if;
  insert into public.announcements(title,body,url,published)
  values (trim(p_title),trim(p_body),coalesce(nullif(p_url,''),'/announcements'),true)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.register_push_subscription(text,text,text,text) from public;
grant execute on function public.register_push_subscription(text,text,text,text) to anon, authenticated;
revoke all on function public.unregister_push_subscription(text) from public;
grant execute on function public.unregister_push_subscription(text) to anon, authenticated;
revoke all on function public.admin_list_push_subscriptions() from public;
grant execute on function public.admin_list_push_subscriptions() to authenticated;
revoke all on function public.admin_remove_push_subscription(text) from public;
grant execute on function public.admin_remove_push_subscription(text) to authenticated;
revoke all on function public.admin_create_announcement(text,text,text) from public;
grant execute on function public.admin_create_announcement(text,text,text) to authenticated;

comment on table public.push_subscriptions is 'Browser push endpoints for SOLE MARKET PH announcement delivery.';
comment on table public.announcements is 'Public SOLE MARKET PH announcements and push delivery results.';
