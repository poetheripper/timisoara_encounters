-- User dashboard: profile fields, profile pictures and saved events.
-- Run in the Supabase dashboard (SQL Editor). Safe to run again after it changes.

-- Profile fields on the existing users table. (The editable name uses the existing users.name column.)
alter table public.users add column if not exists interests text[] not null default '{}';
alter table public.users add column if not exists username text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists cover_url text;

-- Usernames are unique regardless of letter case.
create unique index if not exists users_username_unique on public.users (lower(username));

-- One row per event a user saved. event_id matches the ids in src/lib/events.ts.
create table if not exists public.saved_events (
  user_id text not null references public.users (id) on delete cascade,
  event_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- Public bucket for profile and cover pictures (one folder per user).
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- The app talks to Supabase with the publishable key (logins go through Auth0, not Supabase),
-- so the bucket has to accept uploads from that key.
drop policy if exists "profile images are managed by the app" on storage.objects;
create policy "profile images are managed by the app"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id = 'profile-images')
  with check (bucket_id = 'profile-images');

-- NOTE: for the same reason, saved_events needs the same access rules (RLS off, or the same
-- policies) as the users table for the dashboard to work.
