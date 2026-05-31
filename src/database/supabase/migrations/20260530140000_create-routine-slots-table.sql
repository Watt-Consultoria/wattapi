create table if not exists routine_slots (
  user_id uuid not null references users(id) on delete cascade,
  day     smallint not null check (day between 0 and 6),
  hour    smallint not null check (hour between 8 and 21),
  primary key (user_id, day, hour)
);
