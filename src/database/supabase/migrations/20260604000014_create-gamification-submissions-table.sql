create table if not exists gamification_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references gamification_tasks(id),
  user_id uuid not null references users(id),
  house_id uuid not null references houses(id),
  cycle_id uuid not null references gamification_cycles(id),
  description text not null,
  file_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
