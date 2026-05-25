import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
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
} from './dto/time-tracking.dto';

type PolicyRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('time-tracking')
@UseGuards(RoutePolicyGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

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

  @Get('summary')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  summary(
    @Req() req: PolicyRequest,
    @Query('user_id') userId?: string,
  ): Promise<SummaryResponse> {
    const requesterId = req.jwtData.sub;
    const requesterRole = req.user.role;
    const targetUserId = userId ?? requesterId;

    if (targetUserId !== requesterId && !isSuperuser(requesterRole)) {
      throw new ForbiddenException(
        'Acesso negado: apenas superusuários podem ver o resumo de outros usuários',
      );
    }

    return this.timeTrackingService.getSummary(
      requesterId,
      requesterRole,
      targetUserId,
    );
  }
}
