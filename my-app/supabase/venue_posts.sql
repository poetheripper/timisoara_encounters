-- Events and open calls that venues publish on their profile.
-- Run in the Supabase dashboard (SQL Editor). Safe to run again.

create table if not exists public.venue_posts (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('event', 'open_call')),
  title text not null,
  description text not null,
  -- The day of an event, or the deadline of an open call.
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists venue_posts_venue on public.venue_posts (venue_id, kind, date);

-- NOTE: the app talks to Supabase with the publishable key (logins go through Auth0, not Supabase),
-- so venue_posts needs the same access rules (RLS off, or the same policies) as the users table.
