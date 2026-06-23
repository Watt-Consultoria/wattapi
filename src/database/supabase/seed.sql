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

-- =============================================================
-- PROCESSO SELETIVO — MOCKS PARA TESTES MANUAIS
-- =============================================================
-- PS 2026.2 (ativo):   d1000000-0000-0000-0000-000000000001
-- PS 2026.1 (fechado): d1000000-0000-0000-0000-000000000002
--
-- Candidatos PS 2026.2 (na etapa de Entrevista Individual):
--   Ana Beatriz    → active, agendamento confirmado (Tauan 24/06 09:00)
--   Carlos Eduardo → active, agendamento confirmado (Guilherme 24/06 14:00)
--   Fernanda Costa → active, token válido, sem agendamento ainda
--   Pedro Alves    → eliminated
--
-- Slots disponíveis: Tauan (5), Guilherme (4), Danilo (3) — datas 24–26/06
-- =============================================================

insert into selection_processes (id, title, starts_at, ends_at) values
  ('d1000000-0000-0000-0000-000000000001', 'Processo Seletivo 2026.2', '2026-06-01T00:00:00Z', '2026-08-31T23:59:59Z'),
  ('d1000000-0000-0000-0000-000000000002', 'Processo Seletivo 2026.1', '2026-01-15T00:00:00Z', '2026-03-30T23:59:59Z')
on conflict (id) do nothing;

-- Etapas — PS 2026.2
insert into selection_process_stages (id, selection_process_id, name, position) values
  ('d2000000-0001-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Inscrição',             1),
  ('d2000000-0001-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Dinâmica de Grupo',     2),
  ('d2000000-0001-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'Entrevista Individual',  3),
  ('d2000000-0001-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'Aprovação Final',       4)
on conflict (id) do nothing;

-- Etapas — PS 2026.1
insert into selection_process_stages (id, selection_process_id, name, position) values
  ('d2000000-0002-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'Inscrição',             1),
  ('d2000000-0002-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'Dinâmica de Grupo',     2),
  ('d2000000-0002-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'Entrevista Individual',  3),
  ('d2000000-0002-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 'Aprovação Final',       4)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Inscrições — PS 2026.2 (4 aprovadas → candidatos, 3 reprovadas, 2 pendentes)
-- -------------------------------------------------------------
insert into selection_process_applications (
  id, selection_process_id, name, course, period, phone, email, instagram,
  how_heard, motivation, why_watt, shirt_size,
  resume_path, transcript_path, photo_path, status
) values
  (
    'd3000000-0001-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
    'Ana Beatriz Santos Ferreira', 'Engenharia Elétrica', 4,
    '+55 81 99123-4501', 'ana.ferreira.2026.2@gmail.com', '@anabsferreira',
    'Instagram da Watt',
    'Sempre quis unir a teoria da engenharia com projetos reais. A Watt parece o ambiente ideal para isso.',
    'Vi os projetos que a Watt entregou e fiquei impressionada com o impacto real.',
    'M',
    'psel-2026-2/d3000000-0001-0000-0000-000000000001/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000001/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000001/photo.jpg',
    'approved'
  ),
  (
    'd3000000-0001-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001',
    'Carlos Eduardo Moura Ribeiro', 'Engenharia de Computação', 5,
    '+55 81 99234-5602', 'carlos.moura.2026.2@gmail.com', '@carlosemoura',
    'Indicação de um membro',
    'Meu amigo da Watt me falou muito bem da experiência. Quero desenvolver competências em projetos reais.',
    'A Watt tem um histórico sólido e uma cultura de equipe que me atrai muito.',
    'G',
    'psel-2026-2/d3000000-0001-0000-0000-000000000002/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000002/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000002/photo.jpg',
    'approved'
  ),
  (
    'd3000000-0001-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001',
    'Fernanda Cristina Oliveira Costa', 'Sistemas de Informação', 3,
    '+55 81 98345-6703', 'fernanda.costa.2026.2@gmail.com', '@fercostasi',
    'Banner físico no campus',
    'Quero sair da zona de conforto da sala de aula e aplicar meu conhecimento em sistemas reais.',
    'A Watt é reconhecida na UFPE e parece um lugar onde posso crescer muito.',
    'P',
    'psel-2026-2/d3000000-0001-0000-0000-000000000003/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000003/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000003/photo.jpg',
    'approved'
  ),
  (
    'd3000000-0001-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001',
    'Pedro Henrique Alves Neto', 'Engenharia Elétrica', 6,
    '+55 81 97456-7804', 'pedro.alves.2026.2@gmail.com', '@pedrohneto',
    'Evento de engajamento na UFPE',
    'Busco experiência prática antes de me formar. A Watt é a melhor EJ de elétrica que conheço.',
    'Quero aprender gestão de projetos e ampliar minha rede de contatos na área de energia.',
    'GG',
    'psel-2026-2/d3000000-0001-0000-0000-000000000004/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000004/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000004/photo.jpg',
    'approved'
  ),
  (
    'd3000000-0001-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001',
    'Mariana Souza Lima', 'Engenharia Mecatrônica', 2,
    '+55 81 96567-8905', 'mariana.slim.2026.2@gmail.com', '@marianasouzalima',
    'Instagram da Watt',
    'Tenho interesse em automação e a Watt seria uma ótima porta de entrada.',
    'Gostei muito dos projetos que vi no perfil de vocês no Instagram.',
    'P',
    'psel-2026-2/d3000000-0001-0000-0000-000000000005/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000005/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000005/photo.jpg',
    'reproved'
  ),
  (
    'd3000000-0001-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000001',
    'Rafael Augusto Pereira de Souza', 'Ciência da Computação', 7,
    '+55 81 95678-9006', 'rafael.souza.2026.2@gmail.com', '@rafaelaps',
    'LinkedIn',
    'Estou no final do curso e quero uma experiência diferenciada antes de me formar.',
    'A Watt tem projetos desafiadores que me permitiriam aplicar conhecimentos de análise de dados.',
    'G',
    'psel-2026-2/d3000000-0001-0000-0000-000000000006/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000006/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000006/photo.jpg',
    'reproved'
  ),
  (
    'd3000000-0001-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000001',
    'João Vitor Nascimento Araújo', 'Engenharia Elétrica', 3,
    '+55 81 94789-0107', 'joao.araujo.2026.2@gmail.com', '@joaovnaraujo',
    'Indicação de um membro',
    'Ouvi muito bem da experiência dos membros atuais e quero vivenciar isso também.',
    'Me identifico com a missão da Watt de conectar universidade e mercado.',
    'M',
    'psel-2026-2/d3000000-0001-0000-0000-000000000007/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000007/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000007/photo.jpg',
    'reproved'
  ),
  (
    'd3000000-0001-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000001',
    'Isabela Rodrigues Martins', 'Engenharia de Computação', 4,
    '+55 81 93890-1208', 'isabela.martins.2026.2@gmail.com', '@isabelarmartins',
    'Palestra na universidade',
    'A palestra da Watt me inspirou muito. Quero contribuir com projetos de automação e software.',
    'A Watt representa exatamente o que busco: desafios reais, equipe engajada e impacto mensurável.',
    'P',
    'psel-2026-2/d3000000-0001-0000-0000-000000000008/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000008/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000008/photo.jpg',
    'pending'
  ),
  (
    'd3000000-0001-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000001',
    'Thiago Fernandes Cruz Andrade', 'Sistemas de Informação', 2,
    '+55 81 92901-2309', 'thiago.andrade.2026.2@gmail.com', '@thiagofcandrade',
    'Instagram da Watt',
    'Quero desenvolver habilidades práticas em gestão e tecnologia desde cedo na faculdade.',
    'A Watt é conhecida como a melhor EJ da minha área na UFPE. Seria uma honra fazer parte.',
    'M',
    'psel-2026-2/d3000000-0001-0000-0000-000000000009/resume.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000009/transcript.pdf',
    'psel-2026-2/d3000000-0001-0000-0000-000000000009/photo.jpg',
    'pending'
  )
on conflict (id) do nothing;

-- Inscrições — PS 2026.1 (2 aprovadas, 1 reprovada)
insert into selection_process_applications (
  id, selection_process_id, name, course, period, phone, email, instagram,
  how_heard, motivation, why_watt, shirt_size,
  resume_path, transcript_path, photo_path, status
) values
  (
    'd3000000-0002-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002',
    'Luísa Carvalho Mendes', 'Engenharia Elétrica', 5,
    '+55 81 91234-5601', 'luisa.mendes.2026.1@gmail.com', '@luisacmendes',
    'Evento de engajamento na UFPE',
    'Queria uma experiência prática complementar à graduação e a Watt era a escolha certa.',
    'A Watt tem projetos reais na área de energia que são exatamente o que eu buscava.',
    'P',
    'psel-2026-1/d3000000-0002-0000-0000-000000000001/resume.pdf',
    'psel-2026-1/d3000000-0002-0000-0000-000000000001/transcript.pdf',
    'psel-2026-1/d3000000-0002-0000-0000-000000000001/photo.jpg',
    'approved'
  ),
  (
    'd3000000-0002-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002',
    'Bruno Machado Ferreira', 'Engenharia de Computação', 3,
    '+55 81 90123-4502', 'bruno.ferreira.2026.1@gmail.com', '@brunomferreira',
    'Indicação de um membro',
    'Meu colega de curso entrou na Watt e falou muito bem. Quero tentar também.',
    'Acredito que a Watt pode me ajudar a desenvolver as habilidades que não aprendo em sala.',
    'M',
    'psel-2026-1/d3000000-0002-0000-0000-000000000002/resume.pdf',
    'psel-2026-1/d3000000-0002-0000-0000-000000000002/transcript.pdf',
    'psel-2026-1/d3000000-0002-0000-0000-000000000002/photo.jpg',
    'reproved'
  ),
  (
    'd3000000-0002-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002',
    'Camila Torres Nunes', 'Engenharia Mecânica', 4,
    '+55 81 89012-3403', 'camila.nunes.2026.1@gmail.com', '@camilatnunes',
    'Banner físico no campus',
    'Busco desenvolver gestão de projetos e liderança em um ambiente real.',
    'A Watt é reconhecida como uma das melhores EJs do Nordeste. Quero crescer aqui.',
    'P',
    'psel-2026-1/d3000000-0002-0000-0000-000000000003/resume.pdf',
    'psel-2026-1/d3000000-0002-0000-0000-000000000003/transcript.pdf',
    'psel-2026-1/d3000000-0002-0000-0000-000000000003/photo.jpg',
    'approved'
  )
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Candidatos — PS 2026.2 (todos na etapa Entrevista Individual)
-- -------------------------------------------------------------
insert into candidates (
  id, application_id, selection_process_id, current_stage_id,
  name, course, period, phone, email, photo_path, shirt_size, status
) values
  (
    'd4000000-0001-0000-0000-000000000001',
    'd3000000-0001-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'd2000000-0001-0000-0000-000000000003',
    'Ana Beatriz Santos Ferreira', 'Engenharia Elétrica', 4,
    '+55 81 99123-4501', 'ana.ferreira.2026.2@gmail.com',
    'psel-2026-2/d3000000-0001-0000-0000-000000000001/photo.jpg',
    'M', 'active'
  ),
  (
    'd4000000-0001-0000-0000-000000000002',
    'd3000000-0001-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'd2000000-0001-0000-0000-000000000003',
    'Carlos Eduardo Moura Ribeiro', 'Engenharia de Computação', 5,
    '+55 81 99234-5602', 'carlos.moura.2026.2@gmail.com',
    'psel-2026-2/d3000000-0001-0000-0000-000000000002/photo.jpg',
    'G', 'active'
  ),
  (
    'd4000000-0001-0000-0000-000000000003',
    'd3000000-0001-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'd2000000-0001-0000-0000-000000000003',
    'Fernanda Cristina Oliveira Costa', 'Sistemas de Informação', 3,
    '+55 81 98345-6703', 'fernanda.costa.2026.2@gmail.com',
    'psel-2026-2/d3000000-0001-0000-0000-000000000003/photo.jpg',
    'P', 'active'
  ),
  (
    'd4000000-0001-0000-0000-000000000004',
    'd3000000-0001-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000001',
    'd2000000-0001-0000-0000-000000000003',
    'Pedro Henrique Alves Neto', 'Engenharia Elétrica', 6,
    '+55 81 97456-7804', 'pedro.alves.2026.2@gmail.com',
    'psel-2026-2/d3000000-0001-0000-0000-000000000004/photo.jpg',
    'GG', 'eliminated'
  )
on conflict (id) do nothing;

-- Candidatos — PS 2026.1 (aprovados na etapa Aprovação Final)
insert into candidates (
  id, application_id, selection_process_id, current_stage_id,
  name, course, period, phone, email, photo_path, shirt_size, status
) values
  (
    'd4000000-0002-0000-0000-000000000001',
    'd3000000-0002-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    'd2000000-0002-0000-0000-000000000004',
    'Luísa Carvalho Mendes', 'Engenharia Elétrica', 5,
    '+55 81 91234-5601', 'luisa.mendes.2026.1@gmail.com',
    'psel-2026-1/d3000000-0002-0000-0000-000000000001/photo.jpg',
    'P', 'approved'
  ),
  (
    'd4000000-0002-0000-0000-000000000002',
    'd3000000-0002-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000002',
    'd2000000-0002-0000-0000-000000000004',
    'Camila Torres Nunes', 'Engenharia Mecânica', 4,
    '+55 81 89012-3403', 'camila.nunes.2026.1@gmail.com',
    'psel-2026-1/d3000000-0002-0000-0000-000000000003/photo.jpg',
    'P', 'approved'
  )
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Agendamentos confirmados (Ana e Carlos já escolheram horário)
-- -------------------------------------------------------------
insert into psel_interview_bookings (id, selection_process_id, candidate_id, starts_at, ends_at) values
  (
    'd6000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'd4000000-0001-0000-0000-000000000001',
    '2026-06-24T09:00:00Z', '2026-06-24T09:30:00Z'
  ),
  (
    'd6000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'd4000000-0001-0000-0000-000000000002',
    '2026-06-24T14:00:00Z', '2026-06-24T14:30:00Z'
  )
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Slots de entrevista — PS 2026.2 (datas 24–26/06/2026)
-- Consultores: Tauan (5 slots), Guilherme (4 slots), Danilo (3 slots)
-- -------------------------------------------------------------
insert into psel_interview_slots (id, selection_process_id, consultant_id, starts_at, ends_at, booking_id) values
  -- Tauan: 24/06
  ('d5000000-0001-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', '2026-06-24T09:00:00Z', '2026-06-24T09:30:00Z', 'd6000000-0000-0000-0000-000000000001'),
  ('d5000000-0001-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', '2026-06-24T09:30:00Z', '2026-06-24T10:00:00Z', NULL),
  ('d5000000-0001-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', '2026-06-24T10:00:00Z', '2026-06-24T10:30:00Z', NULL),
  -- Tauan: 25/06
  ('d5000000-0001-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', '2026-06-25T14:00:00Z', '2026-06-25T14:30:00Z', NULL),
  ('d5000000-0001-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0006-0006-0006-000000000006', '2026-06-25T14:30:00Z', '2026-06-25T15:00:00Z', NULL),
  -- Guilherme: 24/06
  ('d5000000-0001-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0007-0007-0007-000000000007', '2026-06-24T14:00:00Z', '2026-06-24T14:30:00Z', 'd6000000-0000-0000-0000-000000000002'),
  ('d5000000-0001-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0007-0007-0007-000000000007', '2026-06-24T14:30:00Z', '2026-06-24T15:00:00Z', NULL),
  -- Guilherme: 25/06
  ('d5000000-0001-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0007-0007-0007-000000000007', '2026-06-25T09:00:00Z', '2026-06-25T09:30:00Z', NULL),
  ('d5000000-0001-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0007-0007-0007-000000000007', '2026-06-25T09:30:00Z', '2026-06-25T10:00:00Z', NULL),
  -- Danilo: 26/06
  ('d5000000-0001-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', '2026-06-26T10:00:00Z', '2026-06-26T10:30:00Z', NULL),
  ('d5000000-0001-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', '2026-06-26T10:30:00Z', '2026-06-26T11:00:00Z', NULL),
  ('d5000000-0001-0000-0000-000000000012', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', '2026-06-26T14:00:00Z', '2026-06-26T14:30:00Z', NULL)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Tokens de agendamento
--   Fernanda: token válido (expira 01/07) — ainda não agendou
--   Pedro:    token expirado (era eliminado antes de agendar)
-- -------------------------------------------------------------
insert into psel_interview_tokens (id, candidate_id, token, expires_at) values
  (
    'd7000000-0000-0000-0000-000000000001',
    'd4000000-0001-0000-0000-000000000003',
    'psel2026-2-fernanda-mock-token-abc123',
    '2026-07-01T23:59:59Z'
  ),
  (
    'd7000000-0000-0000-0000-000000000002',
    'd4000000-0001-0000-0000-000000000004',
    'psel2026-2-pedro-mock-token-xyz789',
    '2026-06-15T23:59:59Z'
  )
on conflict (id) do nothing;
