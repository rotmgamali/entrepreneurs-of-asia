-- ============================================================
-- 007_payments.sql
-- Stripe payment records for sponsor packages, memberships,
-- and event tickets.
-- ============================================================

create table if not exists payments (
  id                     uuid primary key default gen_random_uuid(),
  stripe_session_id      text unique not null,
  stripe_payment_intent  text,
  stripe_subscription    text,
  customer_email         text,
  amount_total           integer not null default 0, -- in smallest currency unit (satang for THB)
  currency               text not null default 'thb',
  product                text not null,              -- e.g. 'sponsor_gold', 'membership_monthly'
  partner_id             uuid references partners(id) on delete set null,
  status                 text not null default 'completed' check (status in ('completed', 'refunded', 'cancelled')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Index for partner lookups and subscription cancellations
create index if not exists payments_partner_id_idx    on payments(partner_id);
create index if not exists payments_subscription_idx  on payments(stripe_subscription) where stripe_subscription is not null;
create index if not exists payments_customer_idx      on payments(customer_email);

-- Auto-update updated_at
create or replace function update_payments_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payments_updated_at
  before update on payments
  for each row execute function update_payments_updated_at();

-- RLS: service-role only (payments are server-side)
alter table payments enable row level security;

create policy "service role full access" on payments
  using (true)
  with check (true);
