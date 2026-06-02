## Context

A tabela `leads` armazena prospectos comerciais da Watt. Atualmente não há campo de identificação jurídica (CNPJ), o que impede o correto cadastro e qualificação de empresas.

## Goals / Non-Goals

**Goals:**

- Adicionar coluna `cnpj VARCHAR(18) NOT NULL` à tabela `leads`
- Validar formato CNPJ brasileiro (`XX.XXX.XXX/XXXX-XX`) no backend
- Atualizar DTOs, entity, testes de integração e documentação OpenAPI para `/leads` e `/portfolio`

**Non-Goals:**

- Validação de CNPJ na Receita Federal (apenas formato)
- Migração de dados legados (os registros existentes receberão um valor default provisório na migration)
- Deduplicação de leads por CNPJ

## Decisions

### 1. Formato de armazenamento: string formatada vs dígitos brutos

Armazenar como string formatada (`XX.XXX.XXX/XXXX-XX`) no banco.
**Alternativa**: armazenar só os 14 dígitos e formatar on-the-fly.
**Rationale**: Simplicidade. A API já retorna o CNPJ no formato legível; não há necessidade de busca por dígitos parciais. Evita lógica de formatação em todo lugar.

### 2. Validação: formato + dígitos verificadores no backend

Validar em duas etapas: (1) regex `^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$` para formato, (2) algoritmo de dígitos verificadores para garantir que o CNPJ é matematicamente válido.
**Alternativa**: apenas regex de formato.
**Rationale**: CNPJ com formato correto mas dígitos inválidos (ex.: `00.000.000/0000-00`) passaria pela validação de formato e seria persistido. A validação por dígitos verificadores é o padrão da Receita Federal e garante que apenas CNPJs reais são aceitos. A implementação é simples (função pura de ~20 linhas) e não adiciona dependências externas.

### 3. Migration: default temporário `'00.000.000/0000-00'`

Para não bloquear deploy em registros existentes, a coluna recebe `DEFAULT '00.000.000/0000-00'` somente durante a migration. O default é removido após o alter.
**Alternativa**: tornar nullable e depois NOT NULL.
**Rationale**: Evita dois deploys. O default sentinela é identificável e pode ser auditado posteriormente.

## Risks / Trade-offs

- **Registros existentes com CNPJ sentinela** → Equipe comercial deve atualizar dados legados manualmente após deploy
- **Regex não valida dígitos verificadores** → CNPJ sintaticamente correto mas inválido pode ser salvo; aceitável no MVP
- **Migration em produção com tabela populada** → ALTER TABLE com DEFAULT é operação rápida no PostgreSQL para tabelas não gigantes; sem risco de lock prolongado

## Migration Plan

1. Executar migration: `ALTER TABLE leads ADD COLUMN cnpj VARCHAR(18) NOT NULL DEFAULT '00.000.000/0000-00'`
2. Remover default: `ALTER TABLE leads ALTER COLUMN cnpj DROP DEFAULT`
3. Deploy da nova versão do serviço
4. Rollback: remover coluna (se migração ainda não foi para prod com dados reais de CNPJ)
