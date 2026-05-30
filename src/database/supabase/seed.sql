insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change)

values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'joao.silva@wattconsultoria.com.br',     crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'yanlima@wattconsultoria.com.br',       crypt('Watt@2026',   gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'ana.costa@wattconsultoria.com.br',      crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'marcos.lima@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'fernanda.souza@wattconsultoria.com.br', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'carlos.mendes@wattconsultoria.com.br',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'lucia.ferreira@wattconsultoria.com.br', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0007-0007-0007-000000000007', 'pedro.alves@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0008-0008-0008-000000000008', 'bianca.rocha@wattconsultoria.com.br',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0009-0009-0009-000000000009', 'rafael.nunes@wattconsultoria.com.br',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0010-0010-0010-000000000010', 'camila.dias@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0011-0011-0011-000000000011', 'thiago.santos@wattconsultoria.com.br',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0012-0012-0012-000000000012', 'juliana.reis@wattconsultoria.com.br',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', '')
on conflict (id) do nothing;

insert into users (id, email, name, role, sector, cpf) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'joao.silva@wattconsultoria.com.br',     'João Silva',         'presidente', 'executivo',     '000.000.000-01'),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'yangclima@wattconsultoria.com.br',       'Yan Lima',           'presidente', 'executivo',     '000.000.000-13'),
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

insert into activities (id, user_id, name, description, date, time_start, time_end, priority) values
  -- João Silva (presidente, executivo)
  ('b0000000-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'Reunião de diretoria',        'Alinhamento mensal com diretores',          '2026-05-29', '09:00', '11:00', 'alta'),
  ('b0000000-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'Revisão orçamento anual',     null,                                        '2026-05-30', '14:00', '16:00', 'alta'),

  -- Marcos Lima (diretor, projetos)
  ('b0000000-0003-0003-0003-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', 'Sprint planning Q3',          'Planejamento do trimestre com o time',      '2026-05-29', '10:00', '12:00', 'alta'),
  ('b0000000-0003-0003-0003-000000000002', 'a1b2c3d4-0003-0003-0003-000000000003', 'Revisão de escopo do projeto','Levantar requisitos pendentes',             '2026-06-02', '13:00', '14:00', 'media'),

  -- Lúcia Ferreira (gerente, projetos)
  ('b0000000-0006-0006-0006-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', 'Daily standup',               'Sincronização diária do time de projetos',  '2026-05-29', '08:30', '09:00', 'media'),
  ('b0000000-0006-0006-0006-000000000002', 'a1b2c3d4-0006-0006-0006-000000000006', 'Code review sprint 12',       null,                                        '2026-05-29', '15:00', '16:30', 'baixa'),

  -- Carlos Mendes (gerente, comercial)
  ('b0000000-0005-0005-0005-000000000001', 'a1b2c3d4-0005-0005-0005-000000000005', 'Apresentação para cliente',   'Pitch comercial para novo contrato',        '2026-05-30', '10:00', '11:30', 'alta'),

  -- Rafael Nunes (consultor, comercial)
  ('b0000000-0009-0009-0009-000000000001', 'a1b2c3d4-0009-0009-0009-000000000009', 'Pesquisa de mercado',         'Levantamento de concorrentes do setor',     '2026-05-29', '09:00', '12:00', 'media'),
  ('b0000000-0009-0009-0009-000000000002', 'a1b2c3d4-0009-0009-0009-000000000009', 'Atualizar CRM',               null,                                        '2026-05-29', '14:00', '15:00', 'baixa'),

  -- Camila Dias (consultor, projetos)
  ('b0000000-0010-0010-0010-000000000001', 'a1b2c3d4-0010-0010-0010-000000000010', 'Documentar API de integração','Escrever docs do módulo de notificações',   '2026-05-29', '13:00', '17:00', 'alta'),

  -- Thiago Santos (consultor, marketing)
  ('b0000000-0011-0011-0011-000000000001', 'a1b2c3d4-0011-0011-0011-000000000011', 'Criar relatório de métricas', 'Consolidar dados de campanhas do mês',      '2026-06-02', '09:00', '11:00', 'media'),
  ('b0000000-0011-0011-0011-000000000002', 'a1b2c3d4-0011-0011-0011-000000000011', 'Reunião de briefing',         'Briefing para nova campanha institucional', '2026-06-03', '14:00', '15:00', 'baixa')
on conflict (id) do nothing;

-- Trigger: auto-promove yan.lima para presidente independente do UUID (cobre login via Google OAuth)
create or replace function promote_bootstrap_superusers()
returns trigger language plpgsql as $$
begin
  if new.email = 'yan.lima@wattconsultoria.com.br' then
    new.role := 'presidente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_promote_bootstrap_superusers on users;
create trigger trg_promote_bootstrap_superusers
  before insert on users
  for each row execute function promote_bootstrap_superusers();
