-- The category a venue picks for an event, so the event can be found in the search and on the map.
-- Run in the Supabase dashboard (SQL Editor), after venue_posts.sql. Safe to run again.

-- One of the categories in src/lib/events.ts. Null for open calls, and for events posted before this existed.
alter table public.venue_posts add column if not exists category text;
