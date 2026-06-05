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
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { GamificationService } from './gamification.service';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import {
  createCycleSchema,
  createTaskSchema,
  updateTaskSchema,
  createSubmissionSchema,
  reviewSubmissionSchema,
} from './dto/gamification.dto';
import type {
  CycleResponse,
  TaskResponse,
  SubmissionResponse,
  LeaderboardEntry,
  PodiumEntry,
} from './dto/gamification.dto';

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
  create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<CycleResponse> {
    const result = createCycleSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.gamificationService.createCycle(req.jwtData.sub, result.data);
  }

  @Patch(':id/close')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  close(@Param('id') id: string): Promise<CycleResponse> {
    return this.gamificationService.closeCycle(id);
  }

  @Get('active')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  getActive(): Promise<CycleResponse> {
    return this.gamificationService.getActiveCycle();
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
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
  create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<TaskResponse> {
    const result = createTaskSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.gamificationService.createTask(req.jwtData.sub, result.data);
  }

  @Patch(':id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<TaskResponse> {
    const result = updateTaskSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.gamificationService.updateTask(id, result.data);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
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
  create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<SubmissionResponse> {
    const result = createSubmissionSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.gamificationService.createSubmission(
      req.jwtData.sub,
      result.data,
    );
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
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
  review(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<SubmissionResponse> {
    const result = reviewSubmissionSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.gamificationService.reviewSubmission(
      id,
      req.jwtData.sub,
      result.data,
    );
  }
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

@Controller('gamification/leaderboard')
@UseGuards(RoutePolicyGuard)
export class GamificationLeaderboardController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('podium')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  getPodium(
    @Query('house_id') houseId: string,
    @Query('cycle_id') cycleId: string,
  ): Promise<PodiumEntry[]> {
    if (!houseId) throw new BadRequestException('house_id is required');
    return this.gamificationService.getPodium(houseId, cycleId);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  getLeaderboard(
    @Query('cycle_id') cycleId: string,
  ): Promise<LeaderboardEntry[]> {
    return this.gamificationService.getLeaderboard(cycleId);
  }
}
