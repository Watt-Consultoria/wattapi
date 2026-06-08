## Why

A Watt realiza processos seletivos periódicos para novos membros e precisa de uma forma estruturada de receber candidaturas. Hoje não há nenhum mecanismo na API para isso, forçando o uso de ferramentas externas (Google Forms, planilhas) sem integração com o sistema interno.

## What Changes

- Novo módulo `selection-process` com endpoints públicos e autenticados
- Endpoint público (`POST /selection-process/active/applications`) para submissão de candidaturas sem autenticação
- Endpoints autenticados para gestão interna de processos e candidaturas
- Bucket privado no Supabase Storage (`selection-process-files`) com policy de insert para usuários anônimos
- Duas novas tabelas: `selection_processes` e `selection_process_applications`

## Capabilities

### New Capabilities

- `selection-process-management`: CRUD de processos seletivos com janela de tempo ativa (`starts_at`/`ends_at`), acessível por usuários autenticados com perfil admin
- `selection-process-applications`: Submissão pública de candidaturas com validação de processo ativo, bloqueio de email duplicado por processo, upload de arquivos (currículo, histórico, foto) via Supabase Storage, e listagem interna com URLs assinadas

### Modified Capabilities

## Impact

- Novo módulo NestJS: `src/modules/selection-process/`
- Duas novas migrações SQL
- Novo bucket Supabase Storage: `selection-process-files`
- Registro do módulo em `app.module.ts`
- Sem alteração em módulos existentes
- Sem novos CORS (formulário roda em `wattdash.wattconsultoria.com.br`, já permitido)
