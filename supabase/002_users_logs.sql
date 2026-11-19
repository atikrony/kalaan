-- Run in Supabase SQL editor after schema.sql
create table users (
  id bigserial primary key,
  username text unique not null,
  name text,
  pass_hash text not null,
  role text not null default 'moderator',  -- admin | moderator
  active boolean not null default true,
  created_at timestamptz default now()
);
create table logs (
  id bigserial primary key,
  username text not null,
  action text not null,     -- create | update | delete | status | login ...
  entity text not null,     -- order | payment | shipment | purchase | user
  entity_id text,
  details jsonb,
  created_at timestamptz default now()
);
create index on logs (created_at desc);
alter table users enable row level security;
alter table logs enable row level security;
