-- =====================================================================
-- Migration: Fix post_media bucket RLS so uploads actually reach storage
-- =====================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- OR via CLI:  supabase db push
-- =====================================================================

-- 1. Ensure the bucket exists and is public (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post_media',
  'post_media',
  true,
  52428800,   -- 50 MB max per file
  array['image/jpeg','image/png','image/webp','image/gif','audio/x-m4a','audio/mp4','audio/mpeg','video/mp4','text/plain']
)
on conflict (id) do update
  set public           = excluded.public,
      file_size_limit  = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Enable Row Level Security on storage.objects
--    (required for ANY policy on storage to take effect)
alter table storage.objects enable row level security;

-- 3. Drop & recreate policies (safe to re-run)

-- Public read: anyone can read files in post_media
drop policy if exists "Public Access to post_media" on storage.objects;
create policy "Public Access to post_media"
  on storage.objects
  for select
  using (bucket_id = 'post_media');

-- Insert: any authenticated user can upload
drop policy if exists "Authenticated upload to post_media" on storage.objects;
create policy "Authenticated upload to post_media"
  on storage.objects
  for insert
  with check (bucket_id = 'post_media' and auth.role() = 'authenticated');

-- Insert fallback for anon during development (remove in production)
drop policy if exists "Anon upload to post_media (dev)" on storage.objects;
create policy "Anon upload to post_media (dev)"
  on storage.objects
  for insert
  with check (bucket_id = 'post_media' and auth.role() = 'anon');

-- Update: owners can replace their own files
drop policy if exists "Owner update in post_media" on storage.objects;
create policy "Owner update in post_media"
  on storage.objects
  for update
  using (bucket_id = 'post_media');

-- Delete: owners can delete their own files
drop policy if exists "Owner deletion from post_media" on storage.objects;
create policy "Owner deletion from post_media"
  on storage.objects
  for delete
  using (bucket_id = 'post_media');
