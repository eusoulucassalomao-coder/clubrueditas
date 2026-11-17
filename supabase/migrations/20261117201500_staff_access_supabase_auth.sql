create table if not exists public.staff_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role text not null check (role in ('panel','caja')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id),
  unique (restaurant_id, role)
);

alter table public.staff_access enable row level security;
revoke all privileges on table public.staff_access from public, anon, authenticated;
grant all privileges on table public.staff_access to service_role;

insert into public.staff_access (user_id, restaurant_id, role, active)
values
  ('8234a845-e14d-4cb5-a154-68f2c712f3d7', 'daa47d07-af80-4e68-bc82-61a91aa976bd', 'panel', true),
  ('e5bf6af0-768e-4492-8ce4-cde718bda439', 'daa47d07-af80-4e68-bc82-61a91aa976bd', 'caja', true)
on conflict (user_id, restaurant_id)
do update set role = excluded.role, active = excluded.active;
