create table if not exists gamification_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid not null references users(id),
  created_at timestamptz default now()
);
