insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'luis.cardoso@wattconsultoria.com.br',        crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'yanlima@wattconsultoria.com.br',            crypt('Watt@2026',   gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'sandro.filho@wattconsultoria.com.br',        crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'danilo.silva@wattconsultoria.com.br',        crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'julius.cesar@wattconsultoria.com.br',        crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'dante.lourenco@wattconsultoria.com.br',      crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'tauan.barros@wattconsultoria.com.br',        crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0007-0007-0007-000000000007', 'guilherme.albuquerque@wattconsultoria.com.br', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0008-0008-0008-000000000008', 'gustavo.araujo@wattconsultoria.com.br',      crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0009-0009-0009-000000000009', 'luiz.araujo@wattconsultoria.com.br',         crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0010-0010-0010-000000000010', 'edgar.nascimento@wattconsultoria.com.br',    crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', ''),
  ('a1b2c3d4-0011-0011-0011-000000000011', 'julia.vieira@wattconsultoria.com.br',        crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', '', '', '', '')
on conflict (id) do nothing;

insert into users (id, email, name, role, sector, cpf) values
  ('a1b2c3d4-0001-0001-0001-000000000001', 'luis.cardoso@wattconsultoria.com.br',        'Luís Henrique Amorim Cardoso',            'diretor',   'executivo', '000.000.000-01'),
  ('a1b2c3d4-0001-0001-0001-000000000015', 'yanlima@wattconsultoria.com.br',            'Yan Guilherme Cavalcante Lima',           'assessor',  'executivo', '000.000.000-13'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'sandro.filho@wattconsultoria.com.br',        'Sandro José da Hora Filho',               'gerente',   'projetos',  '000.000.000-02'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'danilo.silva@wattconsultoria.com.br',        'Danilo Lopes da Silva',                   'gerente',   'projetos',  '000.000.000-03'),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'julius.cesar@wattconsultoria.com.br',        'Julius César',                            'gerente',   'projetos',  '000.000.000-04'),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'dante.lourenco@wattconsultoria.com.br',      'Dante José de França Lourenço',           'gerente',   'projetos',  '000.000.000-05'),
  ('a1b2c3d4-0006-0006-0006-000000000006', 'tauan.barros@wattconsultoria.com.br',        'Tauan Henrique da Silva Barros',          'consultor', 'projetos',  '000.000.000-06'),
  ('a1b2c3d4-0007-0007-0007-000000000007', 'guilherme.albuquerque@wattconsultoria.com.br', 'Guilherme Bezerra de Araújo Albuquerque', 'consultor', 'projetos',  '000.000.000-07'),
  ('a1b2c3d4-0008-0008-0008-000000000008', 'gustavo.araujo@wattconsultoria.com.br',      'Gustavo Henrique Cavalcante de Araújo',   'consultor', 'projetos',  '000.000.000-08'),
  ('a1b2c3d4-0009-0009-0009-000000000009', 'luiz.araujo@wattconsultoria.com.br',         'Luiz Felipe Martins de Araujo',           'consultor', 'comercial', '000.000.000-09'),
  ('a1b2c3d4-0010-0010-0010-000000000010', 'edgar.nascimento@wattconsultoria.com.br',    'Edgar da Silva Nascimento',               'consultor', 'projetos',  '000.000.000-10'),
  ('a1b2c3d4-0011-0011-0011-000000000011', 'julia.vieira@wattconsultoria.com.br',        'Júlia Camilly da Silva Vieira',           'consultor', 'marketing', '000.000.000-11')
on conflict (id) do nothing;

insert into activities (id, user_id, name, description, date, time_start, time_end, priority) values
  -- Luís Henrique Amorim Cardoso
  ('b0000000-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'Prova de Eletromagnetismo', 'Revisar equações de Maxwell e leis de Faraday para a 2ª unidade', '2026-05-29', '14:00', '16:00', 'alta'),
  ('b0000000-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'Aniversário da mãe', 'Comprar o presente e ir para o jantar em família', '2026-05-30', '19:00', '23:00', 'alta'),

  -- Danilo Lopes da Silva
  ('b0000000-0003-0003-0003-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', 'Projeto de Sistemas Embarcados', 'Finalizar o código do ESP32 com integração WiFi e testar os sensores', '2026-05-29', '10:00', '12:00', 'alta'),
  ('b0000000-0003-0003-0003-000000000002', 'a1b2c3d4-0003-0003-0003-000000000003', 'Futebol na UFPE', 'Pelada semanal com o pessoal do curso', '2026-06-02', '16:00', '18:00', 'baixa'),

  -- Tauan Henrique da Silva Barros
  ('b0000000-0006-0006-0006-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', 'Apresentação de Lab de Digitais', 'Apresentar o circuito lógico na FPGA para o professor', '2026-05-29', '08:00', '10:00', 'media'),
  ('b0000000-0006-0006-0006-000000000002', 'a1b2c3d4-0006-0006-0006-000000000006', 'Estudar Controle Linear', 'Fazer listas sobre o lugar das raízes e critério de Nyquist', '2026-05-29', '15:00', '17:00', 'media'),

  -- Dante José de França Lourenço
  ('b0000000-0005-0005-0005-000000000001', 'a1b2c3d4-0005-0005-0005-000000000005', 'Prova de Conversão de Energia', 'Foco na parte de máquinas síncronas e ensaios de transformadores', '2026-05-30', '10:00', '12:00', 'alta'),

  -- Luiz Felipe Martins de Araujo
  ('b0000000-0009-0009-0009-000000000001', 'a1b2c3d4-0009-0009-0009-000000000009', 'Consulta no dentista', 'Manutenção do aparelho', '2026-05-29', '09:00', '10:00', 'media'),
  ('b0000000-0009-0009-0009-000000000002', 'a1b2c3d4-0009-0009-0009-000000000009', 'Trabalho de Eletrônica de Potência', 'Reunião no Discord para montar a simulação no MATLAB/Simulink', '2026-05-29', '14:00', '16:00', 'alta'),

  -- Edgar da Silva Nascimento
  ('b0000000-0010-0010-0010-000000000001', 'a1b2c3d4-0010-0010-0010-000000000010', 'Relatório de Lab de Física 3', 'Terminar de formatar o documento no LaTeX (padrão ABNT) e enviar', '2026-05-29', '18:00', '21:00', 'alta'),

  -- Júlia Camilly da Silva Vieira
  ('b0000000-0011-0011-0011-000000000001', 'a1b2c3d4-0011-0011-0011-000000000011', 'Prova de Cálculo 4', 'Equações diferenciais parciais e transformadas de Laplace', '2026-06-02', '10:00', '12:00', 'alta'),
  ('b0000000-0011-0011-0011-000000000002', 'a1b2c3d4-0011-0011-0011-000000000011', 'Show no Recife Antigo', 'Encontrar o pessoal no Marco Zero antes do show começar', '2026-06-03', '20:00', '23:59', 'baixa')
on conflict (id) do nothing;

-- Rotinas fictícias para ambiente de desenvolvimento
-- Luiz Felipe Martins de Araujo: seg-sex, manhã 8h-12h
insert into routine_slots (user_id, day, hour)
select 'a1b2c3d4-0009-0009-0009-000000000009', d, h
from generate_series(0, 4) as d,
     generate_series(8, 11) as h
on conflict do nothing;

-- Edgar da Silva Nascimento: seg, ter, qui — dia inteiro 8h-17h
insert into routine_slots (user_id, day, hour)
select 'a1b2c3d4-0010-0010-0010-000000000010', d, h
from unnest(array[0, 1, 3]) as d,
     generate_series(8, 16) as h
on conflict do nothing;

-- Júlia Camilly da Silva Vieira: ter, qui, sex — tarde 13h-18h
insert into routine_slots (user_id, day, hour)
select 'a1b2c3d4-0011-0011-0011-000000000011', d, h
from unnest(array[1, 3, 4]) as d,
     generate_series(13, 17) as h
on conflict do nothing;

-- Tauan Henrique da Silva Barros: seg, qua, sex — 9h-17h
insert into routine_slots (user_id, day, hour)
select 'a1b2c3d4-0006-0006-0006-000000000006', d, h
from unnest(array[0, 2, 4]) as d,
     generate_series(9, 16) as h
on conflict do nothing;

-- Dante José de França Lourenço: seg, qua, sex — 9h-17h
insert into routine_slots (user_id, day, hour)
select 'a1b2c3d4-0005-0005-0005-000000000005', d, h
from unnest(array[0, 2, 4]) as d,
     generate_series(9, 20) as h
on conflict do nothing;

-- Atribuição de casas Hogwatts para usuários de dev
update users set house_id = (select id from houses where name = 'Lumina')
where email in (
  'luis.cardoso@wattconsultoria.com.br',
  'sandro.filho@wattconsultoria.com.br',
  'danilo.silva@wattconsultoria.com.br',
  'tauan.barros@wattconsultoria.com.br'
);

update users set house_id = (select id from houses where name = 'Voltus')
where email in (
  'julius.cesar@wattconsultoria.com.br',
  'guilherme.albuquerque@wattconsultoria.com.br',
  'luiz.araujo@wattconsultoria.com.br'
);

update users set house_id = (select id from houses where name = 'Nexus')
where email in (
  'dante.lourenco@wattconsultoria.com.br',
  'gustavo.araujo@wattconsultoria.com.br',
  'edgar.nascimento@wattconsultoria.com.br',
  'julia.vieira@wattconsultoria.com.br',
  'yanlima@wattconsultoria.com.br'
);

-- Trigger: auto-promove yan.lima para presidente independente do UUID (cobre login via Google OAuth) (Para conta de desenvolvimento)
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
