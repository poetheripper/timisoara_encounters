-- Lets accounts be saved with the "venue" role.
-- Run in the Supabase dashboard (SQL Editor). Safe to run again.

-- The original rule on users.role did not include "venue", so signing up as a venue failed.
-- "provider" is the old name for venues; it stays allowed so older rows remain valid.
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('user', 'artist', 'venue', 'provider'));
 