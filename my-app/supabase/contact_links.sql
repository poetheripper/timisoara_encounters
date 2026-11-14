-- Contact links for artist and venue profiles (email, Instagram, Facebook, website, ...).
-- Run in the Supabase dashboard (SQL Editor), after user_dashboard.sql. Safe to run again.

-- A list of { "type": "...", "value": "..." } objects. The kinds of link are defined in src/lib/contact.ts.
alter table public.users add column if not exists contact_links jsonb not null default '[]'::jsonb;
