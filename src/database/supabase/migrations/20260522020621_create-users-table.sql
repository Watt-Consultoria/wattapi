create table if not exists users (
  id uuid primary key default gen_random_uuid(),

  email text not null unique,

  name text not null,

  role text not null
    check (role in (
      'consultor',
      'gerente',
      'diretor',
      'presidente',
      'assessor'
    ))
    default 'consultor',

  sector text not null
    check (sector in (
      'projetos',
      'comercial',
      'marketing',
      'executivo',
      'institucional'
    )),

  cpf text not null unique
    check (
      cpf ~ '^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$'
    ),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
