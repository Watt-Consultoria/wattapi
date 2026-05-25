## Context

Atualmente `src/modules/auth/` contém dois tipos de artefatos misturados: o recurso de domínio (`auth.controller.ts`, `auth.service.ts`) e infraestrutura de segurança transversal (`JwtGuard`, `RoutePolicyGuard`, `RoleSerializerInterceptor`, `role-hierarchy.ts`, decorators). O `UsersModule` já importa `AuthModule` para ter acesso a essa infraestrutura — um acoplamento que crescerá com cada novo módulo de domínio adicionado.

## Goals / Non-Goals

**Goals:**
- Criar `src/common/` com subpastas `guards/`, `interceptors/`, `decorators/`
- Mover toda infraestrutura de segurança para `common/`
- Manter `AuthModule` como o ponto de registro NestJS dessa infraestrutura (sem quebrar módulos existentes)
- Zero mudança de comportamento — todos os testes devem continuar passando

**Non-Goals:**
- Criar um `CommonModule` NestJS separado — `AuthModule` continua sendo o provider
- Reorganizar `config/`, `database/` ou qualquer outro diretório
- Alterar lógica de qualquer guard, interceptor ou decorator

## Decisions

### 1. `common/` como diretório de código, não como módulo NestJS

**Decisão:** `src/common/` é apenas uma organização de pastas. Os providers continuam registrados e exportados pelo `AuthModule`. Nenhum `CommonModule` é criado.

**Alternativa considerada:** criar um `CommonModule` NestJS que registra os providers e é importado por quem precisar. Descartada — adiciona boilerplate e indireção sem benefício imediato. O `AuthModule` já serve esse papel.

### 2. `role-hierarchy.ts` vai para `common/guards/`

**Decisão:** `role-hierarchy.ts` é um utilitário puro usado pelo `RoutePolicyGuard` e pelo `RoleSerializerInterceptor`. Fica em `common/guards/` por proximidade com seu principal consumidor.

**Alternativa considerada:** `common/utils/`. Descartada — é específico do domínio de segurança/roles, não um utilitário genérico.

### 3. `AuthModule` mantém todos os imports e exports

**Decisão:** `AuthModule` continua importando `DatabaseModule`, `JwtModule` e continua exportando `JwtGuard`, `RoutePolicyGuard`, `RoleSerializerInterceptor`, `AuthService` e `JwtModule`. Apenas os caminhos dos imports internos mudam.

**Razão:** qualquer módulo que hoje importa `AuthModule` continua funcionando sem alteração.

## Risks / Trade-offs

- **Imports quebrados silenciosamente** → TypeScript e o compilador NestJS vão capturar qualquer import desatualizado em tempo de build. Mitigação: rodar `npm run lint` e `npm test` ao final.
- **Confusão futura sobre onde adicionar novos guards** → Por convenção, guards/interceptors transversais vão para `common/`; guards específicos de um recurso ficam no módulo daquele recurso.
