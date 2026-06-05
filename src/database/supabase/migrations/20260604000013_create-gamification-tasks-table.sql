create table if not exists gamification_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  points integer not null check (points > 0),
  is_active boolean not null default true,
  created_by uuid not null references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
