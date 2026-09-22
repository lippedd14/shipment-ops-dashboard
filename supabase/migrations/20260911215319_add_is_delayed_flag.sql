-- Separates "where the shipment is" from "something is wrong with it".
--
-- 'delayed' used to be a status, which made it impossible to say that a late
-- shipment was still in transit: the stage was overwritten by the exception.
-- Stage and delay are now independent, so the board can place a card in its
-- real column and flag it at the same time.

alter table public.shipments
  add column is_delayed boolean not null default false;

-- Existing late shipments were in transit; that is the stage the value hid.
-- The trigger is held back so the migration does not rewrite updated_at and
-- claim the rows changed today.
alter table public.shipments disable trigger shipments_set_updated_at;

update public.shipments
set is_delayed = true,
    status = 'in_transit'
where status = 'delayed';

alter table public.shipments enable trigger shipments_set_updated_at;

-- Partial: only the late rows are ever looked up this way, and they are few.
create index shipments_user_id_is_delayed_idx
  on public.shipments (user_id)
  where is_delayed;

-- The 'delayed' label stays in the enum because Postgres cannot drop a value
-- from a type in use. Nothing writes it any more.
comment on column public.shipments.status is
  'Stage of the shipment. Never ''delayed'' - see is_delayed.';

comment on column public.shipments.is_delayed is
  'Exception flag, independent of stage.';
