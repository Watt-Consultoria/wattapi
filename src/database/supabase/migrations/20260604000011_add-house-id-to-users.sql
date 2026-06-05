alter table users
  add column if not exists house_id uuid references houses(id) on delete set null;
