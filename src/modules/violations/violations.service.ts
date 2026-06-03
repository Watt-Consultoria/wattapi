import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  getRank,
  getVisibleSectors,
  ROLE_RANK,
} from '../../common/guards/role-hierarchy';
import { EmailService } from '../email/email.service';
import { newViolationEmail } from '../../common/email/NewViolationEmail';
import { canceledViolationEmail } from '../../common/email/CanceledViolationEmail';
import type { UserResponse } from '../users/users.service';
import type { NormSeverity } from '../norms/dto/norm.dto';
import type {
  CreateViolationDto,
  MeViolationsResponse,
  MemberViolationsResponse,
  ViolationResponse,
  ViolationResponseWithAppliedBy,
  ViolationRow,
  ViolationStatus,
  ViolationSummary,
} from './dto/violation.dto';

const SEVERITY_POINTS: Record<NormSeverity, number> = {
  leve: 1,
  moderada: 2,
  grave: 6,
  desligamento: 18,
};

const VIOLATION_SELECT = `
  mv.id, mv.user_id, mv.norm_id, mv.applied_by, mv.reason,
  mv.expires_at, mv.cancelled_at, mv.cancelled_by, mv.applied_at, mv.created_at,
  cn.code AS norm_code, cn.description AS norm_description, cn.severity AS norm_severity
`;

function getStatus(row: ViolationRow): ViolationStatus {
  if (row.cancelled_at !== null) return 'cancelled';
  if (row.expires_at < new Date()) return 'expired';
  return 'active';
}

function toResponse(
  row: ViolationRow,
  includeAppliedBy: false,
): ViolationResponse;
function toResponse(
  row: ViolationRow,
  includeAppliedBy: true,
): ViolationResponseWithAppliedBy;
function toResponse(
  row: ViolationRow,
  includeAppliedBy: boolean,
): ViolationResponse | ViolationResponseWithAppliedBy {
  const base: ViolationResponse = {
    id: row.id,
    user_id: row.user_id,
    norm: {
      id: row.norm_id,
      code: row.norm_code,
      description: row.norm_description,
      severity: row.norm_severity,
      points: SEVERITY_POINTS[row.norm_severity],
    },
    reason: row.reason,
    status: getStatus(row),
    expires_at: row.expires_at.toISOString(),
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
    applied_at: row.applied_at.toISOString(),
    created_at: row.created_at.toISOString(),
  };
  if (includeAppliedBy) {
    return { ...base, applied_by: row.applied_by };
  }
  return base;
}

function buildSummary(rows: ViolationRow[]): ViolationSummary {
  const now = new Date();
  const counts: Record<NormSeverity, number> = {
    leve: 0,
    moderada: 0,
    grave: 0,
    desligamento: 0,
  };
  for (const row of rows) {
    if (row.cancelled_at === null && row.expires_at > now) {
      counts[row.norm_severity]++;
    }
  }
  const score =
    counts.leve * SEVERITY_POINTS.leve +
    counts.moderada * SEVERITY_POINTS.moderada +
    counts.grave * SEVERITY_POINTS.grave +
    counts.desligamento * SEVERITY_POINTS.desligamento;
  return {
    score,
    active_leves: counts.leve,
    active_moderadas: counts.moderada,
    active_graves: counts.grave,
    active_desligamentos: counts.desligamento,
    at_risk: score >= 18,
  };
}

function canApplyViolation(
  caller: UserResponse,
  target: UserResponse,
): boolean {
  const callerRank = getRank(caller.role);
  const targetRank = getRank(target.role);
  if (callerRank >= 3) return true;
  if (callerRank <= targetRank) return false;
  return getVisibleSectors(caller.sector, caller.role).includes(target.sector);
}

function canCancelViolation(
  callerId: string,
  callerRole: string,
  appliedById: string,
  appliedByRole: string,
): boolean {
  const callerRank = getRank(callerRole);
  if (callerRank >= 3) return true;
  if (callerId === appliedById) return true;
  return callerRank > getRank(appliedByRole);
}

@Injectable()
export class ViolationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  private async getSubordinateIds(caller: UserResponse): Promise<string[]> {
    const callerRank = getRank(caller.role);

    if (callerRank >= 3) {
      const result = await this.db.query<{ id: string }>(
        `SELECT id FROM users WHERE inactive = false AND id != $1`,
        [caller.id],
      );
      return result.rows.map((r) => r.id);
    }

    if (callerRank === 0) return [];

    const visibleSectors = getVisibleSectors(caller.sector, caller.role);
    const maxRank = callerRank - 1;
    const eligibleRoles = Object.entries(ROLE_RANK)
      .filter(([, r]) => r <= maxRank)
      .map(([role]) => role);

    const result = await this.db.query<{ id: string }>(
      `SELECT id FROM users
       WHERE inactive = false
         AND role = ANY($1::text[])
         AND sector = ANY($2::text[])`,
      [eligibleRoles, visibleSectors],
    );
    return result.rows.map((r) => r.id);
  }

  async findMine(callerId: string): Promise<MeViolationsResponse> {
    const result = await this.db.query<ViolationRow>(
      `SELECT ${VIOLATION_SELECT}
       FROM member_violations mv
       JOIN company_norms cn ON cn.id = mv.norm_id
       WHERE mv.user_id = $1
       ORDER BY
         CASE WHEN mv.cancelled_at IS NULL AND mv.expires_at > now() THEN 0 ELSE 1 END,
         mv.applied_at DESC`,
      [callerId],
    );
    const rows = result.rows;
    return {
      violations: rows.map((r) => toResponse(r, false)),
      summary: buildSummary(rows),
    };
  }

  async findSubordinates(
    caller: UserResponse,
    userId?: string,
  ): Promise<MemberViolationsResponse[]> {
    const subordinateIds = await this.getSubordinateIds(caller);

    let targetIds: string[];
    if (userId) {
      if (!subordinateIds.includes(userId)) {
        throw new ForbiddenException(
          "Access denied to this member's violations",
        );
      }
      targetIds = [userId];
    } else {
      targetIds = subordinateIds;
    }

    if (targetIds.length === 0) return [];

    const result = await this.db.query<ViolationRow>(
      `SELECT ${VIOLATION_SELECT}
       FROM member_violations mv
       JOIN company_norms cn ON cn.id = mv.norm_id
       WHERE mv.user_id = ANY($1::uuid[])
       ORDER BY mv.user_id, mv.applied_at DESC`,
      [targetIds],
    );

    const byUser = new Map<string, ViolationRow[]>();
    for (const id of targetIds) byUser.set(id, []);
    for (const row of result.rows) {
      byUser.get(row.user_id)?.push(row);
    }

    return targetIds.map((uid) => {
      const rows = byUser.get(uid) ?? [];
      return {
        user_id: uid,
        violations: rows.map((r) => toResponse(r, false)),
        summary: buildSummary(rows),
      };
    });
  }

  async findOne(
    id: string,
    caller: UserResponse,
  ): Promise<ViolationResponseWithAppliedBy> {
    const result = await this.db.query<
      ViolationRow & { owner_role: string; owner_sector: string }
    >(
      `SELECT ${VIOLATION_SELECT},
              u.role AS owner_role, u.sector AS owner_sector
       FROM member_violations mv
       JOIN company_norms cn ON cn.id = mv.norm_id
       JOIN users u ON u.id = mv.user_id
       WHERE mv.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Violation with id ${id} not found`);
    }

    const row = result.rows[0];
    const isOwner = row.user_id === caller.id;
    const fakeTarget = {
      role: row.owner_role,
      sector: row.owner_sector,
    } as UserResponse;
    if (!isOwner && !canApplyViolation(caller, fakeTarget)) {
      throw new ForbiddenException('Access denied to this violation');
    }

    return toResponse(row, true);
  }

  async create(
    caller: UserResponse,
    dto: CreateViolationDto,
  ): Promise<ViolationResponseWithAppliedBy> {
    const targetResult = await this.db.query<{
      id: string;
      email: string;
      name: string;
      role: string;
      sector: string;
    }>(
      `SELECT id, email, name, role, sector FROM users WHERE id = $1 AND inactive = false`,
      [dto.user_id],
    );
    if (targetResult.rows.length === 0) {
      throw new NotFoundException(`User with id ${dto.user_id} not found`);
    }
    const target = targetResult.rows[0];

    const normResult = await this.db.query<{
      id: string;
      code: string;
      description: string;
      severity: NormSeverity;
    }>(
      `SELECT id, code, description, severity FROM company_norms WHERE id = $1`,
      [dto.norm_id],
    );
    if (normResult.rows.length === 0) {
      throw new NotFoundException(`Norm with id ${dto.norm_id} not found`);
    }
    const norm = normResult.rows[0];

    if (!canApplyViolation(caller, target as UserResponse)) {
      throw new ForbiddenException(
        'You are not authorized to apply violations to this member',
      );
    }

    const insertResult = await this.db.query<
      Pick<
        ViolationRow,
        | 'id'
        | 'user_id'
        | 'norm_id'
        | 'applied_by'
        | 'reason'
        | 'expires_at'
        | 'cancelled_at'
        | 'cancelled_by'
        | 'applied_at'
        | 'created_at'
      >
    >(
      `INSERT INTO member_violations (user_id, norm_id, applied_by, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, norm_id, applied_by, reason, expires_at, cancelled_at, cancelled_by, applied_at, created_at`,
      [dto.user_id, dto.norm_id, caller.id, dto.reason ?? null],
    );

    const inserted = insertResult.rows[0];
    const fakeRow: ViolationRow = {
      ...inserted,
      norm_code: norm.code,
      norm_description: norm.description,
      norm_severity: norm.severity,
    };

    const summaryResult = await this.db.query<{
      severity: NormSeverity;
      count: string;
    }>(
      `SELECT cn.severity, COUNT(*) AS count
       FROM member_violations mv
       JOIN company_norms cn ON cn.id = mv.norm_id
       WHERE mv.user_id = $1 AND mv.cancelled_at IS NULL AND mv.expires_at > now()
       GROUP BY cn.severity`,
      [dto.user_id],
    );
    const counts: Record<NormSeverity, number> = {
      leve: 0,
      moderada: 0,
      grave: 0,
      desligamento: 0,
    };
    for (const row of summaryResult.rows) {
      counts[row.severity] = parseInt(row.count, 10);
    }
    const currentScore =
      counts.leve * 1 +
      counts.moderada * 2 +
      counts.grave * 6 +
      counts.desligamento * 18;

    void this.emailService.send({
      to: target.email,
      ...newViolationEmail({
        memberName: target.name,
        normCode: norm.code,
        normDescription: norm.description,
        severity: norm.severity,
        points: SEVERITY_POINTS[norm.severity],
        reason: dto.reason ?? null,
        expiresAt: inserted.expires_at.toISOString(),
        currentScore,
        atRisk: currentScore >= 18,
      }),
    });

    return toResponse(fakeRow, true);
  }

  async cancel(id: string, caller: UserResponse): Promise<void> {
    const result = await this.db.query<{
      id: string;
      applied_by: string;
      cancelled_at: Date | null;
      applied_by_role: string;
      target_email: string;
      target_name: string;
      norm_code: string;
      norm_description: string;
      norm_severity: NormSeverity;
    }>(
      `SELECT mv.id, mv.applied_by, mv.cancelled_at,
              u_applier.role AS applied_by_role,
              u_target.email AS target_email, u_target.name AS target_name,
              cn.code AS norm_code, cn.description AS norm_description, cn.severity AS norm_severity
       FROM member_violations mv
       JOIN users u_applier ON u_applier.id = mv.applied_by
       JOIN users u_target ON u_target.id = mv.user_id
       JOIN company_norms cn ON cn.id = mv.norm_id
       WHERE mv.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Violation with id ${id} not found`);
    }

    const row = result.rows[0];

    if (row.cancelled_at !== null) {
      throw new ConflictException('Violation is already cancelled');
    }

    if (
      !canCancelViolation(
        caller.id,
        caller.role,
        row.applied_by,
        row.applied_by_role,
      )
    ) {
      throw new ForbiddenException(
        'You are not authorized to cancel this violation',
      );
    }

    await this.db.query(
      `UPDATE member_violations SET cancelled_at = now(), cancelled_by = $1 WHERE id = $2`,
      [caller.id, id],
    );

    void this.emailService.send({
      to: row.target_email,
      ...canceledViolationEmail({
        memberName: row.target_name,
        normCode: row.norm_code,
        normDescription: row.norm_description,
        severity: row.norm_severity,
        cancelledByName: caller.name,
      }),
    });
  }
}
