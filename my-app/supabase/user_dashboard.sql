-- User dashboard: interests and saved events. (The editable name uses the existing users.name column.)
-- Run once in the Supabase dashboard (SQL Editor). Safe to run again.

-- Profile field on the existing users table.
alter table public.users add column if not exists interests text[] not null default '{}';

-- One row per event a user saved. event_id matches the ids in src/lib/events.ts.
create table if not exists public.saved_events (
  user_id text not null references public.users (id) on delete cascade,
  event_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- NOTE: the app talks to Supabase with the publishable key, so saved_events needs the same
-- access rules (RLS off, or the same policies) as the users table for the dashboard to work.
