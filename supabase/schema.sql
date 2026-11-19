-- Run once in Supabase SQL editor
create table shipments (
  id bigserial primary key,
  name text not null,
  status text not null default 'collecting',   -- collecting | purchasing | in_transit | arrived | closed
  rate numeric not null default 0,              -- BDT per 1 RM
  cargo_cost numeric not null default 0,        -- BDT (shipping/cargo/customs)
  note text,
  created_at timestamptz default now()
);
create table orders (
  id bigserial primary key,
  shipment_id bigint references shipments on delete set null,
  order_date date default current_date,
  source text default 'Page',
  customer text not null,
  phone text, address text,
  product text not null,
  qty int default 1,
  images text[] not null default '{}',
  buy_rm numeric default 0,          -- buying price in Malaysia (RM)
  bill numeric default 0,            -- total bill to customer (BDT)
  delivery_charge numeric default 0, -- charged to customer
  cod_charge numeric default 0,      -- courier COD cost (our expense)
  status text not null default 'pending',
  note text,
  created_at timestamptz default now()
);
create table payments (
  id bigserial primary key,
  order_id bigint not null references orders on delete cascade,
  amount numeric not null,
  kind text not null default 'advance',  -- advance | payment | refund
  method text default 'bKash',
  paid_on date default current_date,
  note text
);
create table purchases (               -- money spent in Malaysia
  id bigserial primary key,
  shipment_id bigint not null references shipments on delete cascade,
  item text not null,
  amount_rm numeric not null default 0,
  bought_on date default current_date
);
create view order_view as
select o.*, s.name as shipment_name,
  coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0) as paid
from orders o
left join shipments s on s.id = o.shipment_id
left join payments p on p.order_id = o.id
group by o.id, s.name;

create index on orders (shipment_id);
create index on payments (order_id);
alter table shipments enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table purchases enable row level security;
-- (no policies: only the server's service-role key can access)

insert into storage.buckets (id, name, public) values ('orders', 'orders', true)
on conflict do nothing;
