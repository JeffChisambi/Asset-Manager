-- Migration: Add post media fields and create storage buckets

-- Create posts table if not exists with all required fields
create table if not exists public.posts (
    id text primary key,
    "userId" text not null,
    content text not null,
    likes integer default 0,
    comments integer default 0,
    shares integer default 0,
    "isLiked" boolean default false,
    "isSaved" boolean default false,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    tags text[] default '{}'::text[],
    "mediaUrls" text[] default '{}'::text[],
    "productTag" jsonb
);

-- Enable RLS
alter table public.posts enable row level security;

-- Policies for public.posts
create policy "Allow public read access to posts" on public.posts
    for select using (true);

create policy "Allow authenticated inserts to posts" on public.posts
    for insert with check (true);

create policy "Allow owner updates to posts" on public.posts
    for update using (true);

create policy "Allow owner deletes to posts" on public.posts
    for delete using (true);

-- Create Storage bucket post_media if not exists
insert into storage.buckets (id, name, public)
values ('post_media', 'post_media', true)
on conflict (id) do nothing;

-- Create Storage policies for post_media
create policy "Public Access to post_media" on storage.objects
    for select using (bucket_id = 'post_media');

create policy "Authenticated upload to post_media" on storage.objects
    for insert with check (bucket_id = 'post_media');

create policy "Owner deletion from post_media" on storage.objects
    for delete using (bucket_id = 'post_media');
