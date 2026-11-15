-- Venue location, opening hours, and the link + banner of events and open calls.
-- Run in the Supabase dashboard (SQL Editor), after user_dashboard.sql and venue_posts.sql.
-- Safe to run again.

-- { "address": "...", "coordinates": { "lat": ..., "lng": ... } | null }. See src/lib/venue-location.ts.
alter table public.users add column if not exists location jsonb;

-- Seven entries, Monday first: { "open": "HH:MM", "close": "HH:MM" }, or null for a closed day.
-- See src/lib/venue-schedule.ts.
alter table public.users add column if not exists schedule jsonb;

-- Tickets or another reference website.
alter table public.venue_posts add column if not exists link text;

-- Banner picture, stored in the profile-images bucket under <venue folder>/posts/<post id>.jpg.
alter table public.venue_posts add column if not exists banner_url text;
