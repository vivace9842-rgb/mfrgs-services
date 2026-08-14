-- Orders contain customer/payment data and are written by the server with
-- the Supabase service-role key. Remove legacy public policies that allowed
-- anonymous SELECT/UPDATE/DELETE access to the table.
drop policy if exists "libera delete admin" on public.orders;
drop policy if exists "libera leitura admin" on public.orders;
drop policy if exists "libera update admin" on public.orders;
