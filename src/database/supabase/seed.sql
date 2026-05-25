insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'joao.silva@wattconsultoria.com.br',     crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'yan.lima@wattconsultoria.com.br',       crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'ana.costa@wattconsultoria.com.br',      crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'marcos.lima@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'fernanda.souza@wattconsultoria.com.br', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'carlos.mendes@wattconsultoria.com.br',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'lucia.ferreira@wattconsultoria.com.br', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0007-0007-0007-000000000007', 'pedro.alves@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0008-0008-0008-000000000008', 'bianca.rocha@wattconsultoria.com.br',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0009-0009-0009-000000000009', 'rafael.nunes@wattconsultoria.com.br',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0010-0010-0010-000000000010', 'camila.dias@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0011-0011-0011-000000000011', 'thiago.santos@wattconsultoria.com.br',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a1b2c3d4-0012-0012-0012-000000000012', 'juliana.reis@wattconsultoria.com.br',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into users (id, email, name, role, sector, cpf) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'joao.silva@wattconsultoria.com.br',     'João Silva',         'presidente', 'executivo',     '000.000.000-01'),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'yan.lima@wattconsultoria.com.br',       'Yan Lima',           'assessor',   'executivo',     '000.000.000-13'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'ana.costa@wattconsultoria.com.br',      'Ana Lima',           'diretor',    'executivo',     '000.000.000-02'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'marcos.lima@wattconsultoria.com.br',    'Marcos Lima',        'diretor',    'projetos',      '000.000.000-03'),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'fernanda.souza@wattconsultoria.com.br', 'Fernanda Souza',     'gerente',    'marketing',     '000.000.000-04'),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'carlos.mendes@wattconsultoria.com.br',  'Carlos Mendes',      'gerente',    'comercial',     '000.000.000-05'),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'lucia.ferreira@wattconsultoria.com.br', 'Lúcia Ferreira',     'gerente',    'projetos',      '000.000.000-06'),
  ('a1b2c3d4-0007-0007-0007-000000000007', 'pedro.alves@wattconsultoria.com.br',    'Pedro Alves',        'assessor',   'institucional', '000.000.000-07'),
  ('a1b2c3d4-0008-0008-0008-000000000008', 'bianca.rocha@wattconsultoria.com.br',   'Bianca Rocha',       'assessor',   'executivo',     '000.000.000-08'),
  ('a1b2c3d4-0009-0009-0009-000000000009', 'rafael.nunes@wattconsultoria.com.br',   'Rafael Nunes',       'consultor',  'comercial',     '000.000.000-09'),
  ('a1b2c3d4-0010-0010-0010-000000000010', 'camila.dias@wattconsultoria.com.br',    'Camila Dias',        'consultor',  'projetos',      '000.000.000-10'),
  ('a1b2c3d4-0011-0011-0011-000000000011', 'thiago.santos@wattconsultoria.com.br',  'Thiago Santos',      'consultor',  'marketing',     '000.000.000-11'),
  ('a1b2c3d4-0012-0012-0012-000000000012', 'juliana.reis@wattconsultoria.com.br',   'Juliana Reis',       'consultor',  'institucional', '000.000.000-12')
on conflict (id) do nothing;
