-- Shipments schema: enum, table, indexes, updated_at trigger and RLS policies.

create type public.shipment_status as enum (
  'pending',
  'in_transit',
  'delivered',
  'delayed'
);

create table public.shipments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  tracking_code text not null,
  origin        text not null,
  destination   text not null,
  status        public.shipment_status not null default 'pending',
  carrier       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint shipments_user_id_tracking_code_key unique (user_id, tracking_code)
);

-- Serves the dashboard's "my shipments filtered by status" query.
create index shipments_user_id_status_idx on public.shipments (user_id, status);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row
  execute function public.set_updated_at();

alter table public.shipments enable row level security;

create policy "Users can view their own shipments"
  on public.shipments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own shipments"
  on public.shipments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own shipments"
  on public.shipments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own shipments"
  on public.shipments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Data API grants (necessário pois "expose new tables" está desabilitado)
grant select, insert, update, delete on public.shipments to authenticated;

-- Realtime
alter table public.shipments replica identity full;
alter publication supabase_realtime add table public.shipments;
