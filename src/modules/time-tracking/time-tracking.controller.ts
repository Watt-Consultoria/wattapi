import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { TimeTrackingService } from './time-tracking.service';
import type {
  ClockInResponse,
  ClockOutResponse,
  SummaryResponse,
  TimeEntriesListResponse,
} from './dto/time-tracking.dto';

type PolicyRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('time-entries')
@UseGuards(RoutePolicyGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  listWeeklySummary(
    @Req() req: PolicyRequest,
    @Query('week') week = '0',
  ): Promise<TimeEntriesListResponse> {
    if (!isSuperuser(req.user.role)) {
      throw new ForbiddenException(
        'Acesso negado: apenas superusuários podem acessar a listagem geral',
      );
    }

    const weekOffset = parseInt(week, 10);
    if (!Number.isInteger(weekOffset) || isNaN(weekOffset) || weekOffset < 0) {
      throw new BadRequestException(
        'O parâmetro week deve ser um inteiro >= 0',
      );
    }

    return this.timeTrackingService.getWeeklySummaryList(weekOffset);
  }

  @Post('clock-in')
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  clockIn(@Req() req: PolicyRequest): Promise<ClockInResponse> {
    return this.timeTrackingService.clockIn(req.jwtData.sub);
  }

  @Post('clock-out')
  @HttpCode(200)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  clockOut(@Req() req: PolicyRequest): Promise<ClockOutResponse> {
    return this.timeTrackingService.clockOut(req.jwtData.sub);
  }

  @Get('summary/me')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  summaryMe(@Req() req: PolicyRequest): Promise<SummaryResponse> {
    const requesterId = req.jwtData.sub;
    const requesterRole = req.user.role;
    return this.timeTrackingService.getSummary(
      requesterId,
      requesterRole,
      requesterId,
    );
  }

  @Get('summary/:userId')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  summaryByUserId(
    @Req() req: PolicyRequest,
    @Param('userId') userId: string,
  ): Promise<SummaryResponse> {
    const requesterId = req.jwtData.sub;
    const requesterRole = req.user.role;

    if (!isSuperuser(requesterRole)) {
      throw new ForbiddenException(
        'Acesso negado: apenas superusuários podem ver o resumo de outros usuários',
      );
    }

    return this.timeTrackingService.getSummary(
      requesterId,
      requesterRole,
      userId,
    );
  }
}
