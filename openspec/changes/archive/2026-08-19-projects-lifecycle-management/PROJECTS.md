# Etapa 1:

**GERENTE:** Cria o projeto usando o endpoint `POST /projects` especificando as seguintes características do projeto:

- Lead que contratou o projeto (deve estar registrado na tabela de leads),
- o tipo de projeto (deve estar registrado na tabela de portifólio),
- o nome do projeto
- uma descrição opcional do projeto
- a data de entrega do projeto

Tabela sugerida:

```sql
CREATE TYPE project_status AS ENUM ('em_andamento', 'em_revisao', 'revisado', 'finalizado');
-- em_andamento -> Criado e em execução
-- em_revisao -> O gerente o marcou como "pronto para a revisão", agora o diretor vai revisar
-- Revisado -> O diretor aprovou, mas o projeto ainda está aberto para modificaçõe
-- finalizado -> O diretor o marcou como finalizado, o projeto não recebe mais modificações

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- GERENTE ESPECIFICA NA CRIAÇÃO ----------------
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  project_type_id NOT NULL REFERENCES public.portfolio_items(id),
  name text NOT NULL,
  description TEXT,
  delivery_date DATE NOT NULL,
  -------------------------------------------------
  -- DIRETOR FECHA O PROJETO ----------------------
  closing_notes TEXT,
  closed_by uuid REFERENCES public.users(id),
  closed_at timestamptz,
  -------------------------------------------------
  status project_status NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

# Etapa 2:

**GERENTE**: Cria uma etapa do projeto em `POST /projects/:id/stages`, por exemplo, "Diagnóstico Técnico" especificando as seguintes informações:

- Data de entrega ótima (A data de entrega da etapa conforme planejamento)
- Data de entrega última (A data de entrega máxima que não atrapalhe a execução do projeto)
- Um nome para a etapa
- Uma descrição para a etapa
- A posição da etapa no planejamento do projeto
- Os entregáveis do projeto, documentos que deverão ser entregues pelo consultor para finalizar a etapa
- O consultor responsável pela entrega

OBS: Após um estágio ser criado tendo como target um consultor, esse consultor deve receber uma notificação alertando sobre.

Tabela sugerida:

```SQL
CREATE TYPE project_stage_status AS ENUM ('pendente', 'em_revisao', 'concluida')
-- 'pendente' -> Criada pelo gerente e ainda não entregue pelo consultor
-- 'em revisão' -> Entregue pelo consultor mas ainda não aprovada pelo gerente
-- 'concluida' -> Entregue pelo consultor e aprovada pelo gerente

CREATE TABLE public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- GERENTE ESPECIFICA NA CRIAÇÃO ----------------
  delivery_date DATE NOT NULL, -- Menor que que a delivery_date do projeto e que a deadline_date
  deadline_date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
  consultant_id UUID NOT NULL REFERENCES public.users(id),
  -------------------------------------------------
  status project_stage_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.users(id),
)

CREATE TABLE public.project_stage_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  -- GERENTE ESPECIFICA NA CRIAÇÃO ----------------
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  -------------------------------------------------
)
```

# Etapa 3

**CONSULTOR**: Realiza a entrega da tarefa atribuída como etapa de um projeto no endpoint `POST /projects/:id/stages/:id/submissions` especificando:

- Notas de conclusão, qualquer observação que ele achar válida
- O caminho para cada arquivo entregável especificado

Após a submissão, o status da etapa muda para em_revisao

OBS: Após um consultor realizar uma entrega o gerente responsável deve ser alertado através de uma notificação

Tabela sugerida:

```SQL
CREATE TABLE public.stage_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  notes text,
  attempt integer NOT NULL CHECK (attempt > 0),
  submitted_by UUID NOT NULL REFERENCES public.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stage_id, attempt)
);

CREATE TABLE public.stage_submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.stage_submissions(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.project_stage_deliverables(id) NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

# Etapa 4:

**GERENTE**: Revisa os entregáveis e as notas de conclusão descritas pelo consultor e verifica a validade e integridade de tudo, especificando no endpoint `POST /projects/:id/stages/:id/reviews` informações válidas e se será ou não necessária uma revisão da etapa:

- Observações sobre a execução ou solicitações de alterações do conteúdo entregue
- Uma nova data de entrega para a etapa, caso reprovada
- Os entregáveis que devem ser reenviados, caso reprovada

Se aprovado a etapa muda para concluída e caso reprovada muda para pendente

OBS: O consultor deve ser notificado tanto se for aprovada quanto se for reprovada sua submissão

Tabela sugerida:

```SQL
CREATE TABLE public.stage_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE REFERENCES public.stage_submissions(id) ON DELETE CASCADE,
  approved boolean NOT NULL,
  notes text, -- observações/solicitações de alteração
  new_delivery_date date, -- obrigatória se reprovado
  reviewed_by uuid NOT NULL REFERENCES public.users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_rework_date CHECK (approved OR new_delivery_date IS NOT NULL)
);

-- itens a re-entregar
CREATE TABLE public.stage_review_reworks (
  review_id uuid NOT NULL REFERENCES public.stage_reviews(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES public.stage_deliverables(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, checklist_item_id)
);
```

# Etapa 5

O **GERENTE**, no endpoint `PATCH /projects/:id` considerando que todas as etapas do projeto foram executadas, atualiza o status do projeto para `em_revisao` o que dispara uma notificação para o diretor de projetos (Todos role=director e sector=projetos) que então pode entrar no endpoint `PATCH /projects/:id/reviews` e revisar o projeto especificando:

- Se foi aprovado ou não (Se foi, marca automaticamente o projeto com o status `revisado`, caso contrário, marca de volta como `em_andamento`)
- Notas e observações ou solicitações de modificação

OBS: O gerente deve ser notificado tanto se a entrega for aprovada quanto se ela for reprovada

Tabela sugerida:

```sql
CREATE TABLE public.project_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  round integer NOT NULL CHECK (round > 0), approved boolean NOT NULL, notes text,   reviewer_id uuid NOT NULL REFERENCES public.users(id),
  approved boolean NOT NULL,
  notes TEXT NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, round)
);
```

# Etapa 6

O diretor acessa o endpoint `PATCH /projects/:id` e pode fechar o projeto, marcando-o como `finalizado` e especificando as informações

- Notas de fechamento sobre a execução do projeto

OBS: Após o fechamento, todos os consultores que foram listados em algum dos estágios do projeto recebem uma notificação para responder ao feedback do projeto.

# Etapa 7

No endpoint `POST /projects/:id/feedback` os consultores listados em algum dos estágios do projeto devem responder um feedback sobre a sua execução.

Tabela sugerida:

```sql
CREATE TABLE public.project_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  consultor_id uuid NOT NULL REFERENCES public.users(id),
  answers jsonb NOT NULL, submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, consultor_id)
);
```

# Endpoints que devem ser criados

1. `GET /projects`
2. `POST /projects`

3. `GET /projects/:id`
4. `PATCH /projects/:id`

5. `GET/projects/:id/stages`
6. `POST /projects/:id/stages`
7. `GET /projects/:id/stages/:id`
8. `PATCH /projects/:id/stages/:id`
9. `GET /projects/:id/stages/:id/submissions`
10. `POST /projects/:id/stages/:id/submissions`
11. `GET /projects/:id/stages/:id/submissions/:id`
12. `POST /projects/:id/stages/:id/reviews`
13. `GET /projects/:id/stages/:id/reviews`

14. `PATCH /projects/:id/reviews`
15. `POST /projects/:id/feedback
