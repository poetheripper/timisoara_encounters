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

-- The app talks to Supabase with the publishable key (logins go through Auth0, not Supabase),
-- so that key has to be allowed to read and write this table. Who may change which post is
-- checked by the app's server actions (src/lib/venue-posts-actions.ts).
alter table public.venue_posts enable row level security;
drop policy if exists "venue posts are managed by the app" on public.venue_posts;
create policy "venue posts are managed by the app"
  on public.venue_posts for all
  to anon, authenticated
  using (true)
  with check (true);
