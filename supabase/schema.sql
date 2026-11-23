-- SOLE MARKET PH: initial database schema
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'seller' check (role in ('seller', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  brand text,
  category text,
  size text,
  price numeric(12,2) not null check (price > 0),
  description text,
  image_url text,
  messenger_url text not null,
  seller_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists products_status_created_idx on public.products(status, created_at desc);
create index if not exists products_seller_id_idx on public.products(seller_id);

alter table public.profiles enable row level security;
alter table public.products enable row level security;

drop policy if exists "Public can read approved products" on public.products;
create policy "Public can read approved products"
on public.products for select
using (status = 'approved' or auth.uid() = seller_id);

drop policy if exists "Sellers can insert their own products" on public.products;
create policy "Sellers can insert their own products"
on public.products for insert
to authenticated
with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update their own pending products" on public.products;
create policy "Sellers can update their own pending products"
on public.products for update
to authenticated
using (auth.uid() = seller_id and status = 'pending')
with check (auth.uid() = seller_id and status = 'pending');

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Public image bucket. Uploads are limited to authenticated users' own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Sellers can upload images to own folder" on storage.objects;
create policy "Sellers can upload images to own folder"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Sellers can update images in own folder" on storage.objects;
create policy "Sellers can update images in own folder"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- IMPORTANT: Admin moderation UI is not included yet.
-- For initial testing only, an administrator can approve a listing in Table Editor.
-- First assign your own profile role='admin' manually in the profiles table.
