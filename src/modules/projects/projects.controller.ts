import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  ProjectResponseDto,
  type ProjectResponse,
} from './dto/project.response.dto';
import { CreateStageDto, UpdateStageDto } from './dto/stage.dto';
import { StageResponseDto, type StageResponse } from './dto/stage.response.dto';
import { CreateSubmissionDto } from './dto/submission.dto';
import {
  SubmissionResponseDto,
  type SubmissionResponse,
} from './dto/submission.response.dto';
import { CreateStageReviewDto } from './dto/stage-review.dto';
import {
  StageReviewResponseDto,
  type StageReviewResponse,
} from './dto/stage-review.response.dto';
import { ProjectReviewDto } from './dto/project-review.dto';
import {
  ProjectReviewResponseDto,
  type ProjectReviewResponse,
} from './dto/project-review.response.dto';
import { SubmitFeedbackDto } from './dto/feedback.dto';
import {
  PendingFeedbacksResponseDto,
  ProjectFeedbackResponseDto,
  type PendingFeedbacksResponse,
  type ProjectFeedbackResponse,
} from './dto/feedback.response.dto';
import {
  ProjectLookupsResponseDto,
  type ProjectLookupsResponse,
} from './dto/lookups.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

const MANAGER_ACCESS = {
  mode: 'authenticated' as const,
  rba: [
    ['role', ['assessor', 'presidente']] as ['role', string[]],
    ['role', ['gerente']] as ['role', string[]],
  ],
};

const PROJECT_DIRECTOR_ACCESS = {
  mode: 'authenticated' as const,
  rba: [
    ['role', ['assessor', 'presidente']] as ['role', string[]],
    ['role AND sector', { roles: ['diretor'], sectors: ['projetos'] }] as [
      'role AND sector',
      { roles: string[]; sectors: string[] },
    ],
  ],
};

const ANY_AUTH = { mode: 'authenticated' as const };

const CONSULTANT_ACCESS = {
  mode: 'authenticated' as const,
  rba: [['role', ['consultor']] as ['role', string[]]],
};

// PATCH /projects/:id performs two distinct transitions (manager submits for
// review, director closes) — the route accepts either role, fine-grained
// enforcement happens in ProjectsService.transitionProject.
const PROJECT_TRANSITION_ACCESS = {
  mode: 'authenticated' as const,
  rba: [...MANAGER_ACCESS.rba, ...PROJECT_DIRECTOR_ACCESS.rba],
};

// GET /projects/:id/feedback: manager or project-director sector, NOT ANY_AUTH —
// feedback answers are a consultant's opinion, not procedural data.
const FEEDBACK_READ_ACCESS = {
  mode: 'authenticated' as const,
  rba: [...MANAGER_ACCESS.rba, ...PROJECT_DIRECTOR_ACCESS.rba],
};

@Controller('projects')
@UseGuards(RoutePolicyGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  // ─── Projects ─────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: MANAGER_ACCESS })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  create(
    @Body() body: CreateProjectDto,
    @Req() req: AuthRequest,
  ): Promise<ProjectResponse> {
    return this.service.create(req.jwtData.sub, body);
  }

  @Get()
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [ProjectResponseDto] })
  findAll(
    @Query('status') status?: string,
    @Query('lead_id') leadId?: string,
    @Query('created_by') createdBy?: string,
    @Query('consultant_id') consultantId?: string,
  ): Promise<ProjectResponse[]> {
    return this.service.findAll({
      status,
      lead_id: leadId,
      created_by: createdBy,
      consultant_id: consultantId,
    });
  }

  // NOTE: must stay registered before `@Get(':id')` — otherwise NestJS/Express
  // matches the dynamic `:id` segment against the literal path "lookups" first.
  @Get('lookups')
  @RoutePolicy({ access: MANAGER_ACCESS })
  @ApiResponse({ status: 200, type: ProjectLookupsResponseDto })
  getLookups(): Promise<ProjectLookupsResponse> {
    return this.service.getCreateLookups();
  }

  // GET /projects/feedback-status: consultants only — lists the ids of projects
  // where the caller has a stage assigned and hasn't submitted feedback yet.
  // NOTE: must stay registered before `@Get(':id')` — same reasoning as `lookups`.
  @Get('feedback-status')
  @RoutePolicy({ access: CONSULTANT_ACCESS })
  @ApiResponse({ status: 200, type: PendingFeedbacksResponseDto })
  getPendingFeedbacks(
    @Req() req: AuthRequest,
  ): Promise<PendingFeedbacksResponse> {
    return this.service.getPendingFeedbacks(req.jwtData.sub);
  }

  @Get(':id')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  findById(@Param('id') id: string): Promise<ProjectResponse> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RoutePolicy({ access: PROJECT_TRANSITION_ACCESS })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  transitionProject(
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
    @Req() req: AuthRequest,
  ): Promise<ProjectResponse> {
    return this.service.transitionProject(id, req.user, body);
  }

  // ─── Stages ───────────────────────────────────────────────────────────────

  @Post(':id/stages')
  @HttpCode(201)
  @RoutePolicy({ access: MANAGER_ACCESS })
  @ApiResponse({ status: 201, type: StageResponseDto })
  createStage(
    @Param('id') projectId: string,
    @Body() body: CreateStageDto,
    @Req() req: AuthRequest,
  ): Promise<StageResponse> {
    return this.service.createStage(projectId, req.user, body);
  }

  @Get(':id/stages')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [StageResponseDto] })
  findStages(
    @Param('id') projectId: string,
    @Query('consultant_id') consultantId?: string,
    @Query('status') status?: string,
  ): Promise<StageResponse[]> {
    return this.service.findStages(projectId, {
      consultant_id: consultantId,
      status,
    });
  }

  @Get(':id/stages/:stageId')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: StageResponseDto })
  findStageById(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
  ): Promise<StageResponse> {
    return this.service.findStageById(projectId, stageId);
  }

  @Patch(':id/stages/:stageId')
  @RoutePolicy({ access: MANAGER_ACCESS })
  @ApiResponse({ status: 200, type: StageResponseDto })
  updateStage(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
    @Body() body: UpdateStageDto,
    @Req() req: AuthRequest,
  ): Promise<StageResponse> {
    return this.service.updateStage(projectId, stageId, req.user, body);
  }

  // ─── Stage Submissions ────────────────────────────────────────────────────

  @Post(':id/stages/:stageId/submissions')
  @HttpCode(201)
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 201, type: SubmissionResponseDto })
  createSubmission(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
    @Body() body: CreateSubmissionDto,
    @Req() req: AuthRequest,
  ): Promise<SubmissionResponse> {
    return this.service.createSubmission(projectId, stageId, req.user, body);
  }

  @Get(':id/stages/:stageId/submissions')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [SubmissionResponseDto] })
  findSubmissions(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
  ): Promise<SubmissionResponse[]> {
    return this.service.findSubmissions(projectId, stageId);
  }

  @Get(':id/stages/:stageId/submissions/:submissionId')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  findSubmissionById(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
    @Param('submissionId') submissionId: string,
  ): Promise<SubmissionResponse> {
    return this.service.findSubmissionById(projectId, stageId, submissionId);
  }

  // ─── Stage Reviews ────────────────────────────────────────────────────────

  @Post(':id/stages/:stageId/reviews')
  @HttpCode(201)
  @RoutePolicy({ access: MANAGER_ACCESS })
  @ApiResponse({ status: 201, type: StageReviewResponseDto })
  createStageReview(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
    @Body() body: CreateStageReviewDto,
    @Req() req: AuthRequest,
  ): Promise<StageReviewResponse> {
    return this.service.createStageReview(projectId, stageId, req.user, body);
  }

  @Get(':id/stages/:stageId/reviews')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [StageReviewResponseDto] })
  findStageReviews(
    @Param('id') projectId: string,
    @Param('stageId') stageId: string,
  ): Promise<StageReviewResponse[]> {
    return this.service.findStageReviews(projectId, stageId);
  }

  // ─── Project Reviews ──────────────────────────────────────────────────────

  @Patch(':id/reviews')
  @RoutePolicy({ access: PROJECT_DIRECTOR_ACCESS })
  @ApiResponse({ status: 200, type: ProjectReviewResponseDto })
  reviewProject(
    @Param('id') projectId: string,
    @Body() body: ProjectReviewDto,
    @Req() req: AuthRequest,
  ): Promise<ProjectReviewResponse> {
    return this.service.reviewProject(projectId, req.user, body);
  }

  @Get(':id/reviews')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [ProjectReviewResponseDto] })
  findProjectReviews(
    @Param('id') projectId: string,
  ): Promise<ProjectReviewResponse[]> {
    return this.service.findProjectReviews(projectId);
  }

  // ─── Project Feedback ─────────────────────────────────────────────────────

  @Post(':id/feedback')
  @HttpCode(201)
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 201, type: ProjectFeedbackResponseDto })
  submitFeedback(
    @Param('id') projectId: string,
    @Body() body: SubmitFeedbackDto,
    @Req() req: AuthRequest,
  ): Promise<ProjectFeedbackResponse> {
    return this.service.submitFeedback(projectId, req.user, body);
  }

  @Get(':id/feedback')
  @RoutePolicy({ access: FEEDBACK_READ_ACCESS })
  @ApiResponse({ status: 200, type: [ProjectFeedbackResponseDto] })
  findProjectFeedback(
    @Param('id') projectId: string,
  ): Promise<ProjectFeedbackResponse[]> {
    return this.service.findProjectFeedback(projectId);
  }
}
