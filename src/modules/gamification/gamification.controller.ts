import {
  BadRequestException,
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
import { GamificationService } from './gamification.service';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import {
  CreateCycleDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateSubmissionDto,
  ReviewSubmissionDto,
} from './dto/gamification.dto';
import {
  CycleResponseDto,
  TaskResponseDto,
  SubmissionResponseDto,
  LeaderboardEntryDto,
  PodiumEntryDto,
} from './dto/gamification.response.dto';
import type {
  CycleResponse,
  TaskResponse,
  SubmissionResponse,
  LeaderboardEntry,
  PodiumEntry,
} from './dto/gamification.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

// ─── Cycles ───────────────────────────────────────────────────────────────────

@Controller('gamification/cycles')
@UseGuards(RoutePolicyGuard)
export class GamificationCyclesController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 201, type: CycleResponseDto })
  create(
    @Body() body: CreateCycleDto,
    @Req() req: AuthRequest,
  ): Promise<CycleResponse> {
    return this.gamificationService.createCycle(req.jwtData.sub, body);
  }

  @Patch(':id/close')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: CycleResponseDto })
  close(@Param('id') id: string): Promise<CycleResponse> {
    return this.gamificationService.closeCycle(id);
  }

  @Get('active')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: CycleResponseDto })
  getActive(): Promise<CycleResponse> {
    return this.gamificationService.getActiveCycle();
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [CycleResponseDto] })
  list(): Promise<CycleResponse[]> {
    return this.gamificationService.listCycles();
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

@Controller('gamification/tasks')
@UseGuards(RoutePolicyGuard)
export class GamificationTasksController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  create(
    @Body() body: CreateTaskDto,
    @Req() req: AuthRequest,
  ): Promise<TaskResponse> {
    return this.gamificationService.createTask(req.jwtData.sub, body);
  }

  @Patch(':id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.gamificationService.updateTask(id, body);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  list(
    @Query('include_inactive') includeInactive: string,
    @Req() req: AuthRequest,
  ): Promise<TaskResponse[]> {
    const canSeeInactive =
      isSuperuser(req.user.role) && includeInactive === 'true';
    return this.gamificationService.listTasks(canSeeInactive);
  }
}

// ─── Submissions ─────────────────────────────────────────────────────────────

@Controller('gamification/submissions')
@UseGuards(RoutePolicyGuard)
export class GamificationSubmissionsController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 201, type: SubmissionResponseDto })
  create(
    @Body() body: CreateSubmissionDto,
    @Req() req: AuthRequest,
  ): Promise<SubmissionResponse> {
    return this.gamificationService.createSubmission(req.jwtData.sub, body);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [SubmissionResponseDto] })
  list(
    @Query('status') status: string,
    @Query('user_id') userId: string,
    @Req() req: AuthRequest,
  ): Promise<SubmissionResponse[]> {
    return this.gamificationService.listSubmissions(
      req.jwtData.sub,
      req.user.role,
      status,
      userId,
    );
  }

  @Patch(':id/review')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: SubmissionResponseDto })
  review(
    @Param('id') id: string,
    @Body() body: ReviewSubmissionDto,
    @Req() req: AuthRequest,
  ): Promise<SubmissionResponse> {
    return this.gamificationService.reviewSubmission(id, req.jwtData.sub, body);
  }
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

@Controller('gamification/leaderboard')
@UseGuards(RoutePolicyGuard)
export class GamificationLeaderboardController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('podium')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [PodiumEntryDto] })
  getPodium(
    @Query('house_id') houseId: string,
    @Query('cycle_id') cycleId: string,
  ): Promise<PodiumEntry[]> {
    if (!houseId) throw new BadRequestException('house_id is required');
    return this.gamificationService.getPodium(houseId, cycleId);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [LeaderboardEntryDto] })
  getLeaderboard(
    @Query('cycle_id') cycleId: string,
  ): Promise<LeaderboardEntry[]> {
    return this.gamificationService.getLeaderboard(cycleId);
  }
}
