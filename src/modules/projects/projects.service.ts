import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import type { UserResponse } from '../users/users.service';
import type {
  CreateProjectDto,
  ProjectListQuery,
  ProjectRow,
  UpdateProjectDto,
} from './dto/project.dto';
import type { ProjectResponse } from './dto/project.response.dto';
import type {
  CreateStageDto,
  DeliverableRow,
  StageListQuery,
  StageRow,
  UpdateStageDto,
} from './dto/stage.dto';
import type { StageResponse } from './dto/stage.response.dto';
import type {
  CreateSubmissionDto,
  SubmissionFileRow,
  SubmissionRow,
} from './dto/submission.dto';
import type { SubmissionResponse } from './dto/submission.response.dto';
import type {
  CreateStageReviewDto,
  StageReviewRow,
} from './dto/stage-review.dto';
import type { StageReviewResponse } from './dto/stage-review.response.dto';
import type {
  ProjectReviewDto,
  ProjectReviewRow,
} from './dto/project-review.dto';
import type { ProjectReviewResponse } from './dto/project-review.response.dto';
import type { ProjectFeedbackRow, SubmitFeedbackDto } from './dto/feedback.dto';
import type {
  PendingFeedbacksResponse,
  ProjectFeedbackResponse,
} from './dto/feedback.response.dto';
import type { ProjectLookupsResponse } from './dto/lookups.response.dto';

const STAGE_FILES_BUCKET = 'project-stage-files';

function toDateString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().split('T')[0]
    : String(value);
}

function toProjectResponse(row: ProjectRow): ProjectResponse {
  return {
    id: row.id,
    lead_id: row.lead_id,
    project_type_id: row.project_type_id,
    name: row.name,
    description: row.description,
    delivery_date: toDateString(row.delivery_date),
    closing_notes: row.closing_notes,
    closed_by: row.closed_by,
    closed_at: row.closed_at ? row.closed_at.toISOString() : null,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const PROJECT_COLUMNS = `
  p.id, p.lead_id, p.project_type_id, p.name, p.description,
  p.delivery_date, p.closing_notes, p.closed_by, p.closed_at,
  p.status, p.created_by, p.created_at, p.updated_at
`;

const STAGE_COLUMNS = `
  ps.id, ps.project_id, ps.delivery_date, ps.deadline_date, ps.name, ps.description,
  ps.position, ps.consultant_id, ps.status, ps.created_by, ps.created_at, ps.updated_at
`;

function toStageResponse(
  row: StageRow,
  deliverables: DeliverableRow[],
): StageResponse {
  return {
    id: row.id,
    project_id: row.project_id,
    delivery_date: toDateString(row.delivery_date),
    deadline_date: toDateString(row.deadline_date),
    name: row.name,
    description: row.description,
    position: row.position,
    consultant_id: row.consultant_id,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    deliverables: deliverables.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
    })),
  };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Lookups ──────────────────────────────────────────────────────────────

  async getCreateLookups(): Promise<ProjectLookupsResponse> {
    const [leadsResult, portfolioResult, consultantsResult] = await Promise.all(
      [
        this.db.query<{ id: string; company_name: string; status: string }>(
          `SELECT id, company_name, status FROM leads
         WHERE status = 'em_progresso'
         ORDER BY company_name ASC`,
        ),
        this.db.query<{ id: string; name: string; description: string | null }>(
          `SELECT id, name, description FROM portfolio_items ORDER BY name ASC`,
        ),
        this.db.query<{ id: string; name: string; email: string }>(
          `SELECT id, name, email FROM users
         WHERE role = 'consultor' AND sector = 'projetos' AND inactive = false
         ORDER BY name ASC`,
        ),
      ],
    );

    return {
      leads: leadsResult.rows,
      portfolio_items: portfolioResult.rows,
      consultants: consultantsResult.rows,
    };
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  async create(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponse> {
    const lead = await this.db.query(`SELECT id FROM leads WHERE id = $1`, [
      dto.lead_id,
    ]);
    if (lead.rows.length === 0) {
      throw new NotFoundException(`Lead ${dto.lead_id} não encontrado`);
    }

    const portfolioItem = await this.db.query(
      `SELECT id FROM portfolio_items WHERE id = $1`,
      [dto.project_type_id],
    );
    if (portfolioItem.rows.length === 0) {
      throw new NotFoundException(
        `Tipo de projeto ${dto.project_type_id} não encontrado`,
      );
    }

    const { rows } = await this.db.query<ProjectRow>(
      `INSERT INTO projects (lead_id, project_type_id, name, description, delivery_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'em_andamento', $6)
       RETURNING id, lead_id, project_type_id, name, description, delivery_date,
                 closing_notes, closed_by, closed_at, status, created_by, created_at, updated_at`,
      [
        dto.lead_id,
        dto.project_type_id,
        dto.name,
        dto.description ?? null,
        dto.delivery_date,
        userId,
      ],
    );

    return toProjectResponse(rows[0]);
  }

  async findAll(query: ProjectListQuery): Promise<ProjectResponse[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (query.lead_id) {
      params.push(query.lead_id);
      conditions.push(`p.lead_id = $${params.length}`);
    }
    if (query.created_by) {
      params.push(query.created_by);
      conditions.push(`p.created_by = $${params.length}`);
    }
    if (query.consultant_id) {
      params.push(query.consultant_id);
      conditions.push(
        `EXISTS (SELECT 1 FROM project_stages ps WHERE ps.project_id = p.id AND ps.consultant_id = $${params.length})`,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await this.db.query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS}
       FROM projects p
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params,
    );

    return rows.map(toProjectResponse);
  }

  async findById(id: string): Promise<ProjectResponse> {
    const row = await this.findProjectRowOrThrow(id);
    return toProjectResponse(row);
  }

  async transitionProject(
    id: string,
    caller: UserResponse,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.findProjectRowOrThrow(id);

    if (project.status === 'finalizado') {
      throw new ConflictException('Projeto finalizado não pode ser modificado');
    }

    if (dto.status === 'em_revisao') {
      return this.submitForReview(project, caller);
    }

    return this.closeProject(project, caller, dto.closing_notes!);
  }

  private async submitForReview(
    project: ProjectRow,
    caller: UserResponse,
  ): Promise<ProjectResponse> {
    if (project.created_by !== caller.id && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas o gerente responsável pelo projeto pode submetê-lo para revisão',
      );
    }

    if (project.status !== 'em_andamento') {
      throw new ConflictException(
        'Projeto precisa estar em_andamento para ser submetido à revisão',
      );
    }

    const stageStats = await this.db.query<{
      total: string;
      incomplete: string;
    }>(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE status <> 'concluida') AS incomplete
       FROM project_stages WHERE project_id = $1`,
      [project.id],
    );
    const { total, incomplete } = stageStats.rows[0];
    if (Number(total) === 0 || Number(incomplete) > 0) {
      throw new ConflictException(
        'Todas as etapas do projeto precisam estar concluídas antes da revisão',
      );
    }

    const { rows } = await this.db.query<ProjectRow>(
      `UPDATE projects SET status = 'em_revisao', updated_at = now()
       WHERE id = $1
       RETURNING id, lead_id, project_type_id, name, description, delivery_date,
                 closing_notes, closed_by, closed_at, status, created_by, created_at, updated_at`,
      [project.id],
    );

    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin)
       SELECT id, 'Projeto pronto para revisão', $1, 'automatic'
       FROM users WHERE role = 'diretor' AND sector = 'projetos'`,
      [`O projeto "${project.name}" foi submetido para sua revisão.`],
    );

    return toProjectResponse(rows[0]);
  }

  private async closeProject(
    project: ProjectRow,
    caller: UserResponse,
    closingNotes: string,
  ): Promise<ProjectResponse> {
    const isProjectDirector =
      caller.role === 'diretor' && caller.sector === 'projetos';
    if (!isProjectDirector && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas um diretor de projetos pode finalizar o projeto',
      );
    }

    if (project.status !== 'revisado') {
      throw new ConflictException(
        'Projeto precisa estar revisado para ser finalizado',
      );
    }

    const { rows } = await this.db.query<ProjectRow>(
      `UPDATE projects
       SET status = 'finalizado', closing_notes = $1, closed_by = $2, closed_at = now(), updated_at = now()
       WHERE id = $3
       RETURNING id, lead_id, project_type_id, name, description, delivery_date,
                 closing_notes, closed_by, closed_at, status, created_by, created_at, updated_at`,
      [closingNotes, caller.id, project.id],
    );

    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin)
       SELECT DISTINCT ps.consultant_id, 'Projeto finalizado — responda o feedback', $2, 'automatic'::notification_origin
       FROM project_stages ps WHERE ps.project_id = $1`,
      [
        project.id,
        `O projeto "${project.name}" foi finalizado. Sua opinião sobre a execução é importante.`,
      ],
    );

    return toProjectResponse(rows[0]);
  }

  private async findProjectRowOrThrow(id: string): Promise<ProjectRow> {
    const { rows } = await this.db.query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS} FROM projects p WHERE p.id = $1`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Projeto ${id} não encontrado`);
    }
    return rows[0];
  }

  // ─── Stages ───────────────────────────────────────────────────────────────

  async createStage(
    projectId: string,
    caller: UserResponse,
    dto: CreateStageDto,
  ): Promise<StageResponse> {
    const project = await this.findProjectRowOrThrow(projectId);

    if (project.created_by !== caller.id && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas o gerente responsável pelo projeto pode criar etapas',
      );
    }

    if (project.status !== 'em_andamento') {
      throw new ConflictException(
        'Projeto precisa estar em_andamento para receber novas etapas',
      );
    }

    if (dto.delivery_date >= dto.deadline_date) {
      throw new BadRequestException(
        'delivery_date precisa ser anterior a deadline_date',
      );
    }

    if (dto.delivery_date > toDateString(project.delivery_date)) {
      throw new BadRequestException(
        'delivery_date da etapa não pode ser posterior à delivery_date do projeto',
      );
    }

    const consultant = await this.db.query(
      `SELECT id FROM users WHERE id = $1`,
      [dto.consultant_id],
    );
    if (consultant.rows.length === 0) {
      throw new NotFoundException(
        `Consultor ${dto.consultant_id} não encontrado`,
      );
    }

    const { stage, deliverables } = await this.db.withTransaction(
      async (client) => {
        const { rows: stageRows } = await client.query<StageRow>(
          `INSERT INTO project_stages (project_id, delivery_date, deadline_date, name, description, position, consultant_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, project_id, delivery_date, deadline_date, name, description,
                     position, consultant_id, status, created_by, created_at, updated_at`,
          [
            projectId,
            dto.delivery_date,
            dto.deadline_date,
            dto.name,
            dto.description,
            dto.position,
            dto.consultant_id,
            caller.id,
          ],
        );
        const createdStage = stageRows[0];

        const createdDeliverables: DeliverableRow[] = [];
        for (const d of dto.deliverables) {
          const { rows: dRows } = await client.query<DeliverableRow>(
            `INSERT INTO project_stage_deliverables (stage_id, name, description)
             VALUES ($1, $2, $3)
             RETURNING id, stage_id, name, description`,
            [createdStage.id, d.name, d.description],
          );
          createdDeliverables.push(dRows[0]);
        }

        return { stage: createdStage, deliverables: createdDeliverables };
      },
    );

    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin)
       VALUES ($1, 'Nova tarefa atribuída', $2, 'automatic')`,
      [
        dto.consultant_id,
        `A tarefa "${dto.name}" do projeto "${project.name}" foi atribuída a você.`,
      ],
    );

    return toStageResponse(stage, deliverables);
  }

  async findStages(
    projectId: string,
    query: StageListQuery,
  ): Promise<StageResponse[]> {
    await this.findProjectRowOrThrow(projectId);

    const conditions: string[] = ['ps.project_id = $1'];
    const params: unknown[] = [projectId];

    if (query.consultant_id) {
      params.push(query.consultant_id);
      conditions.push(`ps.consultant_id = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      conditions.push(`ps.status = $${params.length}`);
    }

    const { rows } = await this.db.query<StageRow>(
      `SELECT ${STAGE_COLUMNS}
       FROM project_stages ps
       WHERE ${conditions.join(' AND ')}
       ORDER BY ps.position ASC`,
      params,
    );

    return Promise.all(
      rows.map(async (row) => {
        const deliverables = await this.findDeliverables(row.id);
        return toStageResponse(row, deliverables);
      }),
    );
  }

  async findStageById(
    projectId: string,
    stageId: string,
  ): Promise<StageResponse> {
    const stage = await this.findStageRowOrThrow(projectId, stageId);
    const deliverables = await this.findDeliverables(stage.id);
    return toStageResponse(stage, deliverables);
  }

  async updateStage(
    projectId: string,
    stageId: string,
    caller: UserResponse,
    dto: UpdateStageDto,
  ): Promise<StageResponse> {
    const project = await this.findProjectRowOrThrow(projectId);
    const stage = await this.findStageRowOrThrow(projectId, stageId);

    if (project.created_by !== caller.id && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas o gerente responsável pelo projeto pode atualizar etapas',
      );
    }

    if (stage.status !== 'pendente' || project.status === 'finalizado') {
      throw new ConflictException(
        'Apenas etapas pendentes de projetos não finalizados podem ser atualizadas',
      );
    }

    const nextDeliveryDate =
      dto.delivery_date ?? toDateString(stage.delivery_date);
    const nextDeadlineDate =
      dto.deadline_date ?? toDateString(stage.deadline_date);
    if (nextDeliveryDate >= nextDeadlineDate) {
      throw new BadRequestException(
        'delivery_date precisa ser anterior a deadline_date',
      );
    }
    if (nextDeliveryDate > toDateString(project.delivery_date)) {
      throw new BadRequestException(
        'delivery_date da etapa não pode ser posterior à delivery_date do projeto',
      );
    }

    if (dto.consultant_id) {
      const consultant = await this.db.query(
        `SELECT id FROM users WHERE id = $1`,
        [dto.consultant_id],
      );
      if (consultant.rows.length === 0) {
        throw new NotFoundException(
          `Consultor ${dto.consultant_id} não encontrado`,
        );
      }
    }

    const fields = Object.keys(dto) as (keyof UpdateStageDto)[];
    const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
    const values = fields.map((field) => dto[field]);

    const { rows } = await this.db.query<StageRow>(
      `UPDATE project_stages SET ${setClauses.join(', ')}, updated_at = now()
       WHERE id = $1
       RETURNING id, project_id, delivery_date, deadline_date, name, description,
                 position, consultant_id, status, created_by, created_at, updated_at`,
      [stageId, ...values],
    );
    const updatedStage = rows[0];

    if (dto.consultant_id && dto.consultant_id !== stage.consultant_id) {
      await this.db.query(
        `INSERT INTO notifications (user_id, title, description, origin)
         VALUES ($1, 'Você foi atribuído a uma etapa', $2, 'automatic')`,
        [
          dto.consultant_id,
          `A tarefa "${dto.name}" do projeto "${project.name}" foi atribuída a você.`,
        ],
      );
    }

    const deliverables = await this.findDeliverables(stageId);
    return toStageResponse(updatedStage, deliverables);
  }

  private async findStageRowOrThrow(
    projectId: string,
    stageId: string,
  ): Promise<StageRow> {
    const { rows } = await this.db.query<StageRow>(
      `SELECT ${STAGE_COLUMNS} FROM project_stages ps WHERE ps.id = $1 AND ps.project_id = $2`,
      [stageId, projectId],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Etapa ${stageId} não encontrada`);
    }
    return rows[0];
  }

  private async findDeliverables(stageId: string): Promise<DeliverableRow[]> {
    const { rows } = await this.db.query<DeliverableRow>(
      `SELECT id, stage_id, name, description
       FROM project_stage_deliverables WHERE stage_id = $1`,
      [stageId],
    );
    return rows;
  }

  // ─── Stage Submissions ────────────────────────────────────────────────────

  async createSubmission(
    projectId: string,
    stageId: string,
    caller: UserResponse,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionResponse> {
    const project = await this.findProjectRowOrThrow(projectId);
    const stage = await this.findStageRowOrThrow(projectId, stageId);

    if (stage.consultant_id !== caller.id && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas o consultor responsável pela etapa pode submeter entregáveis',
      );
    }

    if (stage.status !== 'pendente') {
      throw new ConflictException(
        'Etapa precisa estar pendente para receber uma submissão',
      );
    }

    const deliverables = await this.findDeliverables(stageId);
    const deliverableIds = new Set(deliverables.map((d) => d.id));
    const fileDeliverableIds = new Set(dto.files.map((f) => f.deliverable_id));

    for (const deliverable of deliverables) {
      if (!fileDeliverableIds.has(deliverable.id)) {
        throw new BadRequestException(
          `Arquivo obrigatório ausente para o entregável: ${deliverable.name}`,
        );
      }
    }
    for (const file of dto.files) {
      if (!deliverableIds.has(file.deliverable_id)) {
        throw new BadRequestException(
          `Entregável ${file.deliverable_id} não pertence ao checklist da etapa`,
        );
      }
    }

    for (const file of dto.files) {
      const parts = file.path.split('/');
      const filename = parts.pop()!;
      const dir = parts.join('/');
      const { data, error } = await this.db.client.storage
        .from(STAGE_FILES_BUCKET)
        .list(dir, { search: filename });
      if (error || !data?.find((f) => f.name === filename)) {
        throw new BadRequestException(
          `Arquivo não encontrado no storage: ${file.name}`,
        );
      }
    }

    const { rows: attemptRows } = await this.db.query<{ next_attempt: string }>(
      `SELECT COALESCE(MAX(attempt), 0) + 1 AS next_attempt FROM stage_submissions WHERE stage_id = $1`,
      [stageId],
    );
    const attempt = Number(attemptRows[0].next_attempt);

    const { submission, files } = await this.db.withTransaction(
      async (client) => {
        const { rows: subRows } = await client.query<SubmissionRow>(
          `INSERT INTO stage_submissions (stage_id, notes, attempt, submitted_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id, stage_id, notes, attempt, submitted_by, submitted_at`,
          [stageId, dto.notes ?? null, attempt, caller.id],
        );
        const createdSubmission = subRows[0];

        const createdFiles: SubmissionFileRow[] = [];
        for (const file of dto.files) {
          const { rows: fileRows } = await client.query<SubmissionFileRow>(
            `INSERT INTO stage_submission_files (submission_id, deliverable_id, path, name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, submission_id, deliverable_id, path, name, created_at`,
            [createdSubmission.id, file.deliverable_id, file.path, file.name],
          );
          createdFiles.push(fileRows[0]);
        }

        await client.query(
          `UPDATE project_stages SET status = 'em_revisao', updated_at = now() WHERE id = $1`,
          [stageId],
        );

        return { submission: createdSubmission, files: createdFiles };
      },
    );

    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin)
       VALUES ($1, 'Nova submissão de etapa recebida', $2, 'automatic')`,
      [
        project.created_by,
        `O consultor ${caller.name} submeteu a tarefa "${stage.name}" do projeto "${project.name}" para revisão.`,
      ],
    );

    return {
      id: submission.id,
      stage_id: submission.stage_id,
      notes: submission.notes,
      attempt: submission.attempt,
      submitted_by: submission.submitted_by,
      submitted_at: submission.submitted_at.toISOString(),
      files: files.map((f) => ({
        id: f.id,
        deliverable_id: f.deliverable_id,
        name: f.name,
        path: f.path,
      })),
    };
  }

  async findSubmissions(
    projectId: string,
    stageId: string,
  ): Promise<SubmissionResponse[]> {
    await this.findStageRowOrThrow(projectId, stageId);

    const { rows } = await this.db.query<SubmissionRow>(
      `SELECT id, stage_id, notes, attempt, submitted_by, submitted_at
       FROM stage_submissions WHERE stage_id = $1
       ORDER BY attempt DESC`,
      [stageId],
    );

    return Promise.all(
      rows.map(async (row) => {
        const files = await this.findSubmissionFiles(row.id);
        return {
          id: row.id,
          stage_id: row.stage_id,
          notes: row.notes,
          attempt: row.attempt,
          submitted_by: row.submitted_by,
          submitted_at: row.submitted_at.toISOString(),
          files: files.map((f) => ({
            id: f.id,
            deliverable_id: f.deliverable_id,
            name: f.name,
            path: f.path,
          })),
        };
      }),
    );
  }

  async findSubmissionById(
    projectId: string,
    stageId: string,
    submissionId: string,
  ): Promise<SubmissionResponse> {
    await this.findStageRowOrThrow(projectId, stageId);

    const { rows } = await this.db.query<SubmissionRow>(
      `SELECT id, stage_id, notes, attempt, submitted_by, submitted_at
       FROM stage_submissions WHERE id = $1 AND stage_id = $2`,
      [submissionId, stageId],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Submissão ${submissionId} não encontrada`);
    }
    const submission = rows[0];

    const files = await this.findSubmissionFiles(submission.id);
    const filesWithSignedUrls = await Promise.all(
      files.map(async (f) => {
        const { data } = await this.db.client.storage
          .from(STAGE_FILES_BUCKET)
          .createSignedUrl(f.path, 3600);
        return {
          id: f.id,
          deliverable_id: f.deliverable_id,
          name: f.name,
          signed_url: data?.signedUrl ?? '',
        };
      }),
    );

    return {
      id: submission.id,
      stage_id: submission.stage_id,
      notes: submission.notes,
      attempt: submission.attempt,
      submitted_by: submission.submitted_by,
      submitted_at: submission.submitted_at.toISOString(),
      files: filesWithSignedUrls,
    };
  }

  private async findSubmissionFiles(
    submissionId: string,
  ): Promise<SubmissionFileRow[]> {
    const { rows } = await this.db.query<SubmissionFileRow>(
      `SELECT id, submission_id, deliverable_id, path, name, created_at
       FROM stage_submission_files WHERE submission_id = $1`,
      [submissionId],
    );
    return rows;
  }

  // ─── Stage Reviews ────────────────────────────────────────────────────────

  async createStageReview(
    projectId: string,
    stageId: string,
    caller: UserResponse,
    dto: CreateStageReviewDto,
  ): Promise<StageReviewResponse> {
    const project = await this.findProjectRowOrThrow(projectId);
    const stage = await this.findStageRowOrThrow(projectId, stageId);

    if (project.created_by !== caller.id && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas o gerente responsável pelo projeto pode revisar submissões',
      );
    }

    if (stage.status !== 'em_revisao') {
      throw new ConflictException('Etapa não está aguardando revisão');
    }

    const { rows: submissionRows } = await this.db.query<SubmissionRow>(
      `SELECT id, stage_id, notes, attempt, submitted_by, submitted_at
       FROM stage_submissions WHERE stage_id = $1
       ORDER BY attempt DESC LIMIT 1`,
      [stageId],
    );
    if (submissionRows.length === 0) {
      throw new ConflictException('Etapa não possui submissão para revisar');
    }
    const submission = submissionRows[0];

    const existingReview = await this.db.query(
      `SELECT id FROM stage_reviews WHERE submission_id = $1`,
      [submission.id],
    );
    if (existingReview.rows.length > 0) {
      throw new ConflictException('Esta submissão já foi revisada');
    }

    let reworkDeliverableIds: string[] = [];
    if (!dto.approved) {
      const deliverables = await this.findDeliverables(stageId);
      const deliverableIds = new Set(deliverables.map((d) => d.id));
      for (const id of dto.deliverable_ids!) {
        if (!deliverableIds.has(id)) {
          throw new BadRequestException(
            `Entregável ${id} não pertence ao checklist da etapa`,
          );
        }
      }
      reworkDeliverableIds = dto.deliverable_ids!;
    }

    const review = await this.db.withTransaction(async (client) => {
      const { rows: reviewRows } = await client.query<StageReviewRow>(
        `INSERT INTO stage_reviews (submission_id, approved, notes, new_delivery_date, reviewed_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, submission_id, approved, notes, new_delivery_date, reviewed_by, reviewed_at`,
        [
          submission.id,
          dto.approved,
          dto.notes ?? null,
          dto.approved ? null : dto.new_delivery_date,
          caller.id,
        ],
      );
      const createdReview = reviewRows[0];

      for (const deliverableId of reworkDeliverableIds) {
        await client.query(
          `INSERT INTO stage_review_reworks (review_id, deliverable_id) VALUES ($1, $2)`,
          [createdReview.id, deliverableId],
        );
      }

      if (dto.approved) {
        await client.query(
          `UPDATE project_stages SET status = 'concluida', updated_at = now() WHERE id = $1`,
          [stageId],
        );
      } else {
        await client.query(
          `UPDATE project_stages SET status = 'pendente', delivery_date = $2, updated_at = now() WHERE id = $1`,
          [stageId, dto.new_delivery_date],
        );
      }

      return createdReview;
    });

    const notificationTitle = dto.approved
      ? 'Submissão de etapa aprovada'
      : 'Submissão de etapa reprovada — reenvio necessário';
    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin)
       VALUES ($1, $2, $3, 'automatic')`,
      [
        submission.submitted_by,
        notificationTitle,
        `A sua entrega da tarefa "${stage.name}" teve sua submissão ${dto.approved ? 'aprovada' : 'reprovada'}.`,
      ],
    );

    return this.toStageReviewResponse(review, reworkDeliverableIds);
  }

  async findStageReviews(
    projectId: string,
    stageId: string,
  ): Promise<StageReviewResponse[]> {
    await this.findStageRowOrThrow(projectId, stageId);

    const { rows } = await this.db.query<StageReviewRow>(
      `SELECT sr.id, sr.submission_id, sr.approved, sr.notes, sr.new_delivery_date, sr.reviewed_by, sr.reviewed_at
       FROM stage_reviews sr
       JOIN stage_submissions ss ON ss.id = sr.submission_id
       WHERE ss.stage_id = $1
       ORDER BY sr.reviewed_at DESC`,
      [stageId],
    );

    return Promise.all(
      rows.map(async (row) => {
        if (row.approved) {
          return this.toStageReviewResponse(row, []);
        }
        const { rows: reworkRows } = await this.db.query<{
          deliverable_id: string;
        }>(
          `SELECT deliverable_id FROM stage_review_reworks WHERE review_id = $1`,
          [row.id],
        );
        return this.toStageReviewResponse(
          row,
          reworkRows.map((r) => r.deliverable_id),
        );
      }),
    );
  }

  private toStageReviewResponse(
    row: StageReviewRow,
    reworkDeliverableIds: string[],
  ): StageReviewResponse {
    return {
      id: row.id,
      submission_id: row.submission_id,
      approved: row.approved,
      notes: row.notes,
      new_delivery_date: row.new_delivery_date
        ? toDateString(row.new_delivery_date)
        : null,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at.toISOString(),
      rework_deliverable_ids: row.approved ? undefined : reworkDeliverableIds,
    };
  }

  // ─── Project Reviews ──────────────────────────────────────────────────────

  async reviewProject(
    projectId: string,
    caller: UserResponse,
    dto: ProjectReviewDto,
  ): Promise<ProjectReviewResponse> {
    const project = await this.findProjectRowOrThrow(projectId);

    const isProjectDirector =
      caller.role === 'diretor' && caller.sector === 'projetos';
    if (!isProjectDirector && !isSuperuser(caller.role)) {
      throw new ForbiddenException(
        'Apenas um diretor de projetos pode revisar o projeto',
      );
    }

    if (project.status !== 'em_revisao') {
      throw new ConflictException('Projeto não está aguardando revisão');
    }

    const { rows: roundRows } = await this.db.query<{ next_round: string }>(
      `SELECT COALESCE(MAX(round), 0) + 1 AS next_round FROM project_reviews WHERE project_id = $1`,
      [projectId],
    );
    const round = Number(roundRows[0].next_round);

    const nextStatus = dto.approved ? 'revisado' : 'em_andamento';

    const review = await this.db.withTransaction(async (client) => {
      const { rows } = await client.query<ProjectReviewRow>(
        `INSERT INTO project_reviews (project_id, round, approved, notes, reviewer_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, project_id, round, approved, notes, reviewer_id, reviewed_at`,
        [projectId, round, dto.approved, dto.notes, caller.id],
      );

      await client.query(
        `UPDATE projects SET status = $2, updated_at = now() WHERE id = $1`,
        [projectId, nextStatus],
      );

      return rows[0];
    });

    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin)
       VALUES ($1, $2, $3, 'automatic')`,
      [
        project.created_by,
        dto.approved
          ? 'Projeto aprovado pela diretoria'
          : 'Projeto reprovado pela diretoria',
        `O projeto "${project.name}" foi ${dto.approved ? 'aprovado' : 'reprovado'} na revisão.`,
      ],
    );

    return toProjectReviewResponse(review);
  }

  async findProjectReviews(
    projectId: string,
  ): Promise<ProjectReviewResponse[]> {
    await this.findProjectRowOrThrow(projectId);

    const { rows } = await this.db.query<ProjectReviewRow>(
      `SELECT id, project_id, round, approved, notes, reviewer_id, reviewed_at
       FROM project_reviews WHERE project_id = $1
       ORDER BY round DESC`,
      [projectId],
    );

    return rows.map(toProjectReviewResponse);
  }

  // ─── Project Feedback ─────────────────────────────────────────────────────

  async submitFeedback(
    projectId: string,
    caller: UserResponse,
    dto: SubmitFeedbackDto,
  ): Promise<ProjectFeedbackResponse> {
    const project = await this.findProjectRowOrThrow(projectId);

    if (project.status !== 'finalizado') {
      throw new ConflictException(
        'Feedback só pode ser enviado após o projeto ser finalizado',
      );
    }

    const assigned = await this.db.query(
      `SELECT 1 FROM project_stages WHERE project_id = $1 AND consultant_id = $2 LIMIT 1`,
      [projectId, caller.id],
    );
    if (assigned.rows.length === 0) {
      throw new ForbiddenException(
        'Apenas consultores atribuídos a alguma etapa do projeto podem enviar feedback',
      );
    }

    const existing = await this.db.query(
      `SELECT id FROM project_feedback WHERE project_id = $1 AND consultor_id = $2`,
      [projectId, caller.id],
    );
    if (existing.rows.length > 0) {
      throw new ConflictException('Feedback já enviado para este projeto');
    }

    const { rows } = await this.db.query<ProjectFeedbackRow>(
      `INSERT INTO project_feedback (project_id, consultor_id, answers)
       VALUES ($1, $2, $3)
       RETURNING id, project_id, consultor_id, answers, submitted_at`,
      [projectId, caller.id, JSON.stringify(dto.answers)],
    );

    return toFeedbackResponse(rows[0]);
  }

  async findProjectFeedback(
    projectId: string,
  ): Promise<ProjectFeedbackResponse[]> {
    await this.findProjectRowOrThrow(projectId);

    const { rows } = await this.db.query<ProjectFeedbackRow>(
      `SELECT id, project_id, consultor_id, answers, submitted_at
       FROM project_feedback WHERE project_id = $1
       ORDER BY submitted_at DESC`,
      [projectId],
    );

    return rows.map(toFeedbackResponse);
  }

  async getPendingFeedbacks(
    consultantId: string,
  ): Promise<PendingFeedbacksResponse> {
    const { rows } = await this.db.query<{ project_id: string }>(
      `SELECT p.id AS project_id
       FROM projects p
       WHERE p.status = 'finalizado'
         AND EXISTS (
           SELECT 1 FROM project_stages ps
           WHERE ps.project_id = p.id AND ps.consultant_id = $1
         )
         AND NOT EXISTS (
           SELECT 1 FROM project_feedback pf
           WHERE pf.project_id = p.id AND pf.consultor_id = $1
         )
       ORDER BY p.closed_at DESC`,
      [consultantId],
    );

    return { pending_feedbacks: rows.map((row) => row.project_id) };
  }
}

function toFeedbackResponse(row: ProjectFeedbackRow): ProjectFeedbackResponse {
  return {
    id: row.id,
    project_id: row.project_id,
    consultor_id: row.consultor_id,
    answers: row.answers,
    submitted_at: row.submitted_at.toISOString(),
  };
}

function toProjectReviewResponse(row: ProjectReviewRow): ProjectReviewResponse {
  return {
    id: row.id,
    project_id: row.project_id,
    round: row.round,
    approved: row.approved,
    notes: row.notes,
    reviewer_id: row.reviewer_id,
    reviewed_at: row.reviewed_at.toISOString(),
  };
}
