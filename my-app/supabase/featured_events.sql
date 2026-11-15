-- Lets the website administrator choose which events are featured in the homepage carousel.
-- Run in the Supabase dashboard (SQL Editor), after venue_posts.sql. Safe to run again.

-- Empty (null) = not featured. A number = featured; lower numbers come first in the carousel.
alter table public.venue_posts add column if not exists featured smallint;

-- To feature an event: open the venue_posts table in the Supabase Table Editor and type a number
-- in its "featured" cell (1 = first slide), or run for example:
--   update public.venue_posts set featured = 1 where title = 'Name of the event';
-- To stop featuring it, clear the cell (set it back to null).
