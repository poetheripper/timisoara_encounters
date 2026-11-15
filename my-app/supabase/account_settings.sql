-- Account settings: lets an account delete itself.
-- Run in the Supabase dashboard (SQL Editor), after user_dashboard.sql.
-- Safe to run again.

-- The app talks to Supabase with the publishable key (logins go through Auth0, not Supabase),
-- so that key has to be allowed to delete rows. Who may delete which account is checked by the
-- app's server action (src/lib/account-actions.ts). These policies only matter where row level
-- security is turned on; they change nothing for a table that has it off.
drop policy if exists "accounts are deleted by the app" on public.users;
create policy "accounts are deleted by the app"
  on public.users for delete
  to anon, authenticated
  using (true);

drop policy if exists "saved events are deleted by the app" on public.saved_events;
create policy "saved events are deleted by the app"
  on public.saved_events for delete
  to anon, authenticated
  using (true);

-- The other half of the setup is in Auth0: see the note at the top of src/lib/auth0-management.ts.
