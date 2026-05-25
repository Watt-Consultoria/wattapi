## ADDED Requirements

### Requirement: Infraestrutura de segurança reside em src/common/
Guards, interceptors e decorators de segurança transversal SHALL residir em `src/common/` e não dentro de módulos de domínio. Módulos de domínio que necessitem dessa infraestrutura SHALL importar `AuthModule`, que continua sendo o provider NestJS responsável por registrá-la e exportá-la.

#### Scenario: Novo guard transversal adicionado ao projeto
- **WHEN** um guard ou interceptor de segurança que se aplica a múltiplos módulos é criado
- **THEN** o arquivo SHALL ser criado em `src/common/guards/` ou `src/common/interceptors/`, e registrado/exportado via `AuthModule`

#### Scenario: Guard específico de um recurso adicionado ao projeto
- **WHEN** um guard que se aplica exclusivamente a um único módulo de domínio é criado
- **THEN** o arquivo SHALL residir dentro do próprio módulo de domínio correspondente
