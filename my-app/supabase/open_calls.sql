-- Open calls page: applications from artists, and when an account last read its notifications.
-- Run in the Supabase dashboard (SQL Editor), after venue_posts.sql. Safe to run again.

-- One row per artist that applied to an open call. An artist applies to a call at most once.
create table if not exists public.open_call_applications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.venue_posts (id) on delete cascade,
  artist_id text not null references public.users (id) on delete cascade,
  -- Optional note from the artist to the venue.
  message text,
  created_at timestamptz not null default now(),
  unique (post_id, artist_id)
);

create index if not exists open_call_applications_artist on public.open_call_applications (artist_id);

-- Everything newer than this counts as a new notification on the dashboard:
-- applications for a venue, open calls for an artist. Null until the first "Mark all as read".
alter table public.users add column if not exists notifications_seen_at timestamptz;

-- The app talks to Supabase with the publishable key (logins go through Auth0, not Supabase),
-- so that key has to be allowed to read and write this table. Who may apply to what is checked
-- by the app's server actions (src/lib/open-calls-actions.ts).
alter table public.open_call_applications enable row level security;
drop policy if exists "open call applications are managed by the app" on public.open_call_applications;
create policy "open call applications are managed by the app"
  on public.open_call_applications for all
  to anon, authenticated
  using (true)
  with check (true);

-- The venue's answer to an application. The artist is notified when it is given.
alter table public.open_call_applications
  add column if not exists status text not null default 'pending';
alter table public.open_call_applications drop constraint if exists open_call_applications_status_check;
alter table public.open_call_applications add constraint open_call_applications_status_check
  check (status in ('pending', 'accepted', 'declined'));
alter table public.open_call_applications add column if not exists responded_at timestamptz;

-- The event an open call looks for artists for (optional). Accepted artists are listed on that event.
alter table public.venue_posts
  add column if not exists event_id uuid references public.venue_posts (id) on delete set null;
create index if not exists venue_posts_event on public.venue_posts (event_id);
