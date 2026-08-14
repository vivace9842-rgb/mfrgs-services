-- Enforce webhook idempotency at the database boundary.
-- NULL session IDs are preserved for legacy/manual records.
create unique index if not exists orders_session_id_unique_idx
  on public.orders (session_id)
  where session_id is not null;
